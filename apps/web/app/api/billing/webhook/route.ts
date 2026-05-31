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
 * manually by an admin). Covers create/upgrade/downgrade and
 * cancel-at-period-end (which arrives as a status change, not a delete).
 *
 * The hard-delete case (subscription removed entirely) is handled separately
 * by a DB trigger and is intentionally NOT covered here — the
 * `onSubscriptionDeleted` callback only receives an id, never an account.
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
    // Log with context and rethrow so Stripe retries the event. The default
    // subscription upsert is idempotent, so a retry is safe.
    logger.error(
      { accountId, plan, error },
      'Failed to sync accounts.vex_plan from Stripe subscription',
    );

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
        // Upgrade/downgrade/cancel-at-period-end all arrive as updates.
        onSubscriptionUpdated: syncAccountPlanFromSubscription,
        // Initial checkout. May be a one-time order (no account/subscription
        // fields); the helper's guard makes that a safe no-op.
        onCheckoutSessionCompleted: (subscription) =>
          syncAccountPlanFromSubscription(
            subscription as SubscriptionLike & { target_account_id?: string },
          ),
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
