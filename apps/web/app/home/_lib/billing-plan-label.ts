/**
 * Derives the "current plan" label shown on {@link BillingPlanSummaryCard}.
 *
 * Deliberately does not go through `billing.config.ts` / `resolveProductPlan`
 * — those describe the retired Vex Starter/Pro/Team tiers and their prices.
 * This only ever looks at the account's raw subscription/order status, so it
 * can never surface a Vex tier name or price.
 */

const SUBSCRIPTION_STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  trialing: 'Trial',
  past_due: 'Past Due',
  canceled: 'Canceled',
  unpaid: 'Unpaid',
  incomplete: 'Incomplete',
  incomplete_expired: 'Expired',
  paused: 'Paused',
};

export interface DerivePlanLabelParams {
  /** The account's subscription status, if it has one. */
  subscriptionStatus?: string | null;
  /** Whether the account has a (non-subscription) lifetime order. */
  hasOrder: boolean;
}

export function derivePlanLabel({
  subscriptionStatus,
  hasOrder,
}: DerivePlanLabelParams): string {
  if (subscriptionStatus) {
    return SUBSCRIPTION_STATUS_LABELS[subscriptionStatus] ?? subscriptionStatus;
  }

  if (hasOrder) {
    return 'Lifetime';
  }

  return 'Free Plan';
}
