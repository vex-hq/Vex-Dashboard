import { getPlanTypesMap } from '@kit/billing';
import { getBillingEventHandlerService } from '@kit/billing-gateway';
import { enhanceRouteHandler } from '@kit/next/routes';
import { getLogger } from '@kit/shared/logger';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import billingConfig from '~/config/billing.config';
import {
  type SubscriptionLike,
  resolvePlanFromSubscription,
} from '~/lib/agentguard/plan-from-price';

/**
 * @description Sync `accounts.vex_plan` from a Stripe subscription payload.
 *
 * Runs AFTER the gateway's default subscription upsert, so the
 * `subscriptions`/`subscription_items` rows are already current. This closes
 * the gap where paid Stripe plans never drove `vex_plan` (previously only set
 * manually by an admin). Covers checkout, upgrades, downgrades, and
 * cancellations that arrive as a status change (e.g. status → canceled).
 *
 * A cancel-at-period-end keeps the subscription 'active' until the period
 * ends, so the account correctly retains its plan until Stripe finally removes
 * the subscription. That removal is a hard delete, handled separately by a DB
 * trigger — the `onSubscriptionDeleted` callback only receives an id, never an
 * account, so it cannot perform the downgrade itself.
 */
async function syncAccountPlanFromSubscription(
  subscription: SubscriptionLike & { target_account_id?: string },
) {
  const accountId = subscription.target_account_id;

  // Not a subscription payload (e.g. a one-time order from checkout) — there
  // is no account plan to sync, so this is a safe no-op.
  if (!accountId) return;

  const logger = await getLogger();
  const plan = resolvePlanFromSubscription(subscription);
  const client = getSupabaseServerAdminClient();

  const { error } = await client
    .from('accounts')
    .update({ vex_plan: plan })
    .eq('id', accountId);

  if (error) {
    logger.error(
      { accountId, plan, error },
      'Failed to sync accounts.vex_plan from Stripe subscription',
    );

    // A CHECK-constraint violation (Postgres 23514) is permanent: retrying it
    // would only trigger Stripe's retry storm (~87 attempts over 72h) and risk
    // the webhook endpoint being auto-disabled. Stop here. Every other error is
    // treated as transient — rethrow so the route returns 500 and Stripe
    // retries (the default subscription upsert is idempotent, so retry is safe).
    if (error.code === '23514') return;

    throw new Error(
      `vex_plan sync failed for account ${accountId}: ${error.message}`,
    );
  }

  logger.info(
    { accountId, plan, status: subscription.status },
    'Synced accounts.vex_plan from Stripe subscription',
  );
}

/**
 * @description Handle the webhooks from Stripe related to checkouts
 */
export const POST = enhanceRouteHandler(
  async ({ request }) => {
    const provider = billingConfig.provider;
    const logger = await getLogger();

    const ctx = {
      name: 'billing.webhook',
      provider,
    };

    logger.info(ctx, `Received billing webhook. Processing...`);

    const supabaseClientProvider = () => getSupabaseServerAdminClient();

    const service = await getBillingEventHandlerService(
      supabaseClientProvider,
      provider,
      getPlanTypesMap(billingConfig),
    );

    try {
      await service.handleWebhookEvent(request, {
        // Upgrades, downgrades, and status-change cancellations arrive here.
        onSubscriptionUpdated: syncAccountPlanFromSubscription,
        // Initial checkout. The payload is either a subscription or a one-time
        // order — and an order ALSO carries a (required) target_account_id, so
        // the `!accountId` guard alone is not enough to exclude it. Discriminate
        // positively on the subscription id: only subscriptions have a plan to
        // sync. Syncing an order here would resolve to 'free' and clobber a
        // paying customer's plan.
        onCheckoutSessionCompleted: (payload) => {
          if (!('target_subscription_id' in payload)) {
            return Promise.resolve();
          }

          return syncAccountPlanFromSubscription(
            payload as SubscriptionLike & { target_account_id?: string },
          );
        },
        // Hard-delete (subscription fully removed) downgrades to free, but the
        // callback only receives an id — no account to write. That case is
        // handled by a DB trigger (a separate task); here we only log.
        onSubscriptionDeleted: async (subscriptionId) => {
          logger.info(
            { ...ctx, subscriptionId },
            'Subscription deleted; vex_plan downgrade handled by DB trigger',
          );
        },
      });

      logger.info(ctx, `Successfully processed billing webhook`);

      return new Response('OK', { status: 200 });
    } catch (error) {
      logger.error({ ...ctx, error }, `Failed to process billing webhook`);

      return new Response('Failed to process billing webhook', {
        status: 500,
      });
    }
  },
  {
    auth: false,
  },
);
