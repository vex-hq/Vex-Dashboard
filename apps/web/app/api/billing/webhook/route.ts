import { getPlanTypesMap } from '@kit/billing';
import { getBillingEventHandlerService } from '@kit/billing-gateway';
import { UpsertSubscriptionParams } from '@kit/billing/types';
import { enhanceRouteHandler } from '@kit/next/routes';
import { getLogger } from '@kit/shared/logger';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import billingConfig from '~/config/billing.config';
import { resolvePlanFromSubscriptionItems } from '~/lib/agentguard/plan-limits';

/**
 * Sync the `accounts.vex_plan` column whenever a subscription changes.
 * This keeps the engine, dashboard, and all consumers in sync with Stripe.
 */
async function syncVexPlan(
  subscription: UpsertSubscriptionParams,
): Promise<void> {
  const logger = await getLogger();
  const client = getSupabaseServerAdminClient();

  // Only resolve from line items if the subscription is active.
  // Otherwise reset to free (canceled, past_due, unpaid, etc.).
  const plan = subscription.active
    ? resolvePlanFromSubscriptionItems(subscription.line_items)
    : 'free';

  const { error } = await client
    .from('accounts')
    .update({ vex_plan: plan })
    .eq('id', subscription.target_account_id);

  if (error) {
    logger.error(
      { error, accountId: subscription.target_account_id, plan },
      'Failed to sync vex_plan on subscription change',
    );
  } else {
    logger.info(
      { accountId: subscription.target_account_id, plan },
      'Synced vex_plan from subscription',
    );
  }
}

/**
 * Reset `accounts.vex_plan` to 'free' when a subscription is deleted.
 */
async function resetVexPlan(subscriptionId: string): Promise<void> {
  const logger = await getLogger();
  const client = getSupabaseServerAdminClient();

  // Look up which account owned this subscription
  const { data: sub } = await client
    .from('subscriptions')
    .select('account_id')
    .eq('id', subscriptionId)
    .single();

  if (!sub?.account_id) {
    logger.warn(
      { subscriptionId },
      'Could not find account for deleted subscription — vex_plan not reset',
    );
    return;
  }

  const { error } = await client
    .from('accounts')
    .update({ vex_plan: 'free' })
    .eq('id', sub.account_id);

  if (error) {
    logger.error(
      { error, accountId: sub.account_id },
      'Failed to reset vex_plan on subscription deletion',
    );
  } else {
    logger.info(
      { accountId: sub.account_id },
      'Reset vex_plan to free on subscription deletion',
    );
  }
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
        onSubscriptionUpdated: syncVexPlan,
        onCheckoutSessionCompleted: async (payload) => {
          if ('target_subscription_id' in payload) {
            await syncVexPlan(payload as UpsertSubscriptionParams);
          }
        },
        onSubscriptionDeleted: resetVexPlan,
        onInvoicePaid: syncVexPlan,
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
