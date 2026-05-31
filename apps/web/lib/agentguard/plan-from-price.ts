import billingConfig from '~/config/billing.config';

/**
 * The set of valid `accounts.vex_plan` values. This MUST stay in sync with the
 * DB CHECK constraint defined in
 * `apps/web/supabase/migrations/20260219000000_add_vex_plan_columns.sql`
 * (extended by `20260220100000_add_starter_plan.sql`). Deriving `VexPlan` from
 * this single array, and cross-checking `product.id` against it in
 * `planFromPriceId`, guarantees we never emit a value the constraint rejects.
 */
export const VEX_PLAN_VALUES = [
  'free',
  'starter',
  'pro',
  'team',
  'enterprise',
] as const;

export type VexPlan = (typeof VEX_PLAN_VALUES)[number];

const VEX_PLAN_SET: ReadonlySet<string> = new Set(VEX_PLAN_VALUES);

function isVexPlan(value: string): value is VexPlan {
  return VEX_PLAN_SET.has(value);
}

/**
 * Relative tier ordering, used to pick the HIGHEST plan when a subscription (or
 * an account, in the backfill) is associated with more than one plan-granting
 * price. Mirrors the `rank` column in the backfill migration
 * (`20260601000100_backfill_vex_plan.sql`) so the webhook and the backfill
 * always agree on which plan wins.
 */
const PLAN_RANK: Record<VexPlan, number> = {
  free: 0,
  starter: 1,
  pro: 2,
  team: 3,
  enterprise: 4,
};

// A subscription only grants its paid plan while in one of these statuses;
// anything else (canceled, past_due, unpaid, incomplete*, paused) → free.
const PLAN_GRANTING_STATUSES = new Set(['active', 'trialing']);

/**
 * Resolve a Stripe price id (stored as subscription_items.variant_id) to the
 * Klio plan via billing.config. Unknown/empty → 'free'. This is the single
 * source of truth for price→plan; keep it config-driven (price ids differ
 * between Stripe test/live, and live in billing.config).
 *
 * If a billing.config product id is ever not a known `VexPlan` (a new tier
 * added to the config before this union and the DB CHECK constraint are
 * updated), this returns 'free' rather than emitting a value the database
 * would reject — fail safe instead of triggering a write error.
 */
export function planFromPriceId(priceId: string | null | undefined): VexPlan {
  if (!priceId) return 'free';
  for (const product of billingConfig.products) {
    for (const plan of product.plans) {
      for (const item of plan.lineItems) {
        if (item.id === priceId) {
          return isVexPlan(product.id) ? product.id : 'free';
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

export interface SubscriptionLineItemLike {
  variant_id?: string | null;
}

export interface SubscriptionLike {
  status?: string | null;
  line_items?: ReadonlyArray<SubscriptionLineItemLike> | null;
}

/**
 * Resolve the plan a subscription grants. Returns 'free' when the status is
 * not plan-granting (canceled/past_due/unpaid/incomplete/paused) or when no
 * line item maps to a known plan. When multiple line items map to plans, the
 * HIGHEST tier wins (matching the backfill migration), so an add-on or a
 * multi-item subscription can never silently downgrade the account.
 */
export function resolvePlanFromSubscription(
  subscription: SubscriptionLike,
): VexPlan {
  if (!statusGrantsPlan(subscription.status)) return 'free';

  const items = subscription.line_items ?? [];

  let best: VexPlan = 'free';

  for (const item of items) {
    const plan = planFromPriceId(item.variant_id);

    if (PLAN_RANK[plan] > PLAN_RANK[best]) {
      best = plan;
    }
  }

  return best;
}
