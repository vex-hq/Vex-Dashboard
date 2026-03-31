import billingConfig from '~/config/billing.config';

/**
 * TypeScript mirror of services/shared/shared/plan_limits.py
 *
 * These constants define the quotas, rate limits, and feature flags
 * for each Vex pricing plan. Keep in sync with the Python backend.
 */

export interface PlanLimits {
  /** Monthly observation quota */
  observationsPerMonth: number;
  /** Monthly verification quota */
  verificationsPerMonth: number;
  /** Monthly corrections quota (-1 = unlimited, full cascade) */
  correctionsPerMonth: number;
  /** Maximum requests per minute (overrides per-key RPM if lower) */
  maxRpm: number;
  /** Maximum number of registered agents (-1 = unlimited) */
  maxAgents: number;
  /** Maximum number of team seats */
  maxSeats: number;
  /** Whether correction layers are enabled */
  correctionsEnabled: boolean;
  /** Whether webhook alert delivery is enabled */
  webhookAlerts: boolean;
  /** Whether Slack alert delivery is enabled */
  slackAlerts: boolean;
  /** Data retention in days */
  retentionDays: number;
  /** If true, requests beyond quota are allowed (billed). If false, rejected (429). */
  overageAllowed: boolean;
}

export const PLAN_LIMITS: Record<string, PlanLimits> = {
  free: {
    observationsPerMonth: 1_000,
    verificationsPerMonth: 50,
    correctionsPerMonth: 0,
    maxRpm: 100,
    maxAgents: -1,
    maxSeats: 1,
    correctionsEnabled: false,
    webhookAlerts: false,
    slackAlerts: false,
    retentionDays: 1,
    overageAllowed: false,
  },
  starter: {
    observationsPerMonth: 25_000,
    verificationsPerMonth: 1_000,
    correctionsPerMonth: 100,
    maxRpm: 500,
    maxAgents: -1,
    maxSeats: 3,
    correctionsEnabled: true,
    webhookAlerts: false,
    slackAlerts: false,
    retentionDays: 7,
    overageAllowed: false,
  },
  pro: {
    observationsPerMonth: 150_000,
    verificationsPerMonth: 15_000,
    correctionsPerMonth: -1,
    maxRpm: 1_000,
    maxAgents: -1,
    maxSeats: 5,
    correctionsEnabled: true,
    webhookAlerts: true,
    slackAlerts: false,
    retentionDays: 30,
    overageAllowed: true,
  },
  team: {
    observationsPerMonth: 1_500_000,
    verificationsPerMonth: 150_000,
    correctionsPerMonth: -1,
    maxRpm: 5_000,
    maxAgents: -1,
    maxSeats: 15,
    correctionsEnabled: true,
    webhookAlerts: true,
    slackAlerts: true,
    retentionDays: 90,
    overageAllowed: true,
  },
  enterprise: {
    observationsPerMonth: 10_000_000,
    verificationsPerMonth: 1_000_000,
    correctionsPerMonth: -1,
    maxRpm: 10_000,
    maxAgents: -1,
    maxSeats: -1, // unlimited
    correctionsEnabled: true,
    webhookAlerts: true,
    slackAlerts: true,
    retentionDays: 365,
    overageAllowed: true,
  },
};

/**
 * Build a lookup map from Stripe price ID (variant_id) to internal
 * product name (starter / pro / team) using the billing config.
 */
function buildPriceToProductMap(): Map<string, string> {
  const map = new Map<string, string>();

  for (const product of billingConfig.products) {
    for (const plan of product.plans) {
      for (const lineItem of plan.lineItems) {
        map.set(lineItem.id, product.id);
      }
    }
  }

  return map;
}

const priceToProductMap = buildPriceToProductMap();

/**
 * Resolve the internal plan name from a subscription's line items.
 *
 * The Supabase `subscription_items` table stores the Stripe price ID
 * as `variant_id`. This function maps that back to the internal product
 * name (`starter`, `pro`, `team`) via the billing config.
 *
 * Returns `"free"` if no matching price ID is found.
 */
export function resolvePlanFromSubscriptionItems(
  items: ReadonlyArray<{ variant_id: string }> | null | undefined,
): string {
  if (!items?.length) {
    return 'free';
  }

  for (const item of items) {
    const productId = priceToProductMap.get(item.variant_id);
    if (productId) {
      return productId;
    }
  }

  return 'free';
}

/**
 * Return the PlanLimits for the given plan name.
 * Falls back to "free" for unknown plan values.
 * Optional overrides (non-null values only) are merged on top of the base limits.
 */
export function getPlanLimits(
  plan: string,
  overrides?: Partial<PlanLimits> | null,
): PlanLimits {
  const base = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free!;
  if (!overrides) return base;
  return {
    ...base,
    ...Object.fromEntries(
      Object.entries(overrides).filter(([, v]) => v != null),
    ),
  } as PlanLimits;
}

/**
 * Check whether a seat can be added given the current member count and plan.
 * Returns `{ allowed: true }` or `{ allowed: false, reason: string }`.
 * Pass overrides to apply per-account custom limits on top of the base plan.
 */
export function canAddSeat(
  plan: string,
  currentMemberCount: number,
  seatsToAdd = 1,
  overrides?: Partial<PlanLimits> | null,
): { allowed: true } | { allowed: false; reason: string } {
  const limits = getPlanLimits(plan, overrides);

  if (limits.maxSeats === -1) {
    return { allowed: true };
  }

  if (currentMemberCount + seatsToAdd > limits.maxSeats) {
    return {
      allowed: false,
      reason: `Your ${plan} plan allows up to ${limits.maxSeats} seat${limits.maxSeats === 1 ? '' : 's'}. You currently have ${currentMemberCount} member${currentMemberCount === 1 ? '' : 's'}.`,
    };
  }

  return { allowed: true };
}

/**
 * Check whether an agent can be added given the current agent count and plan.
 * Returns `{ allowed: true }` or `{ allowed: false, reason: string }`.
 * Pass overrides to apply per-account custom limits on top of the base plan.
 */
export function canAddAgent(
  plan: string,
  currentAgentCount: number,
  agentsToAdd = 1,
  overrides?: Partial<PlanLimits> | null,
): { allowed: true } | { allowed: false; reason: string } {
  const limits = getPlanLimits(plan, overrides);

  // -1 means unlimited
  if (limits.maxAgents === -1) {
    return { allowed: true };
  }

  if (currentAgentCount + agentsToAdd > limits.maxAgents) {
    return {
      allowed: false,
      reason: `Your ${plan} plan allows up to ${limits.maxAgents} agent${limits.maxAgents === 1 ? '' : 's'}. You currently have ${currentAgentCount} agent${currentAgentCount === 1 ? '' : 's'}.`,
    };
  }

  return { allowed: true };
}
