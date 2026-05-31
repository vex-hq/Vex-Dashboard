import billingConfig from '~/config/billing.config';

export type VexPlan = 'free' | 'starter' | 'pro' | 'team' | 'enterprise';

// A subscription only grants its paid plan while in one of these statuses;
// anything else (canceled, past_due, unpaid, incomplete*, paused) → free.
const PLAN_GRANTING_STATUSES = new Set(['active', 'trialing']);

/**
 * Resolve a Stripe price id (stored as subscription_items.variant_id) to the
 * Klio plan via billing.config. Unknown/empty → 'free'. This is the single
 * source of truth for price→plan; keep it config-driven (price ids differ
 * between Stripe test/live, and live in billing.config).
 */
export function planFromPriceId(priceId: string | null | undefined): VexPlan {
  if (!priceId) return 'free';
  for (const product of billingConfig.products) {
    for (const plan of product.plans) {
      for (const item of plan.lineItems) {
        if (item.id === priceId) {
          return product.id as VexPlan;
        }
      }
    }
  }
  return 'free';
}

/** Whether a subscription in this status should grant its paid plan. */
export function statusGrantsPlan(status: string | null | undefined): boolean {
  return !!status && PLAN_GRANTING_STATUSES.has(status);
}
