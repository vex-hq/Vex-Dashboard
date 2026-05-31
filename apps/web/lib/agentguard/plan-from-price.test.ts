import { describe, expect, it } from 'vitest';

import billingConfig from '~/config/billing.config';

import {
  VEX_PLAN_VALUES,
  planFromPriceId,
  resolvePlanFromSubscription,
  statusGrantsPlan,
} from './plan-from-price';

// Real known Stripe price ids from billing.config (monthly line items).
// These are public, non-sensitive Stripe price identifiers (not secrets);
// the allowlist pragmas suppress detect-secrets' high-entropy false positives.
const STARTER_MONTHLY = 'price_1T3eAO2R0WSf5z7SEQKjage3'; // pragma: allowlist secret
const PRO_MONTHLY = 'price_1T3eAI2R0WSf5z7Svg2YEAoU'; // pragma: allowlist secret
const TEAM_MONTHLY = 'price_1T3eA72R0WSf5z7SZuQmJTnk'; // pragma: allowlist secret

describe('planFromPriceId', () => {
  it('maps a known starter price id to "starter"', () => {
    expect(planFromPriceId(STARTER_MONTHLY)).toBe('starter');
  });

  it('maps a known pro price id to "pro"', () => {
    expect(planFromPriceId(PRO_MONTHLY)).toBe('pro');
  });

  it('maps a known team price id to "team"', () => {
    expect(planFromPriceId(TEAM_MONTHLY)).toBe('team');
  });

  it('returns "free" for an unknown price id', () => {
    expect(planFromPriceId('price_unknown')).toBe('free');
  });

  it('returns "free" for null', () => {
    expect(planFromPriceId(null)).toBe('free');
  });

  it('returns "free" for undefined', () => {
    expect(planFromPriceId(undefined)).toBe('free');
  });
});

describe('statusGrantsPlan', () => {
  it('returns true for "active"', () => {
    expect(statusGrantsPlan('active')).toBe(true);
  });

  it('returns true for "trialing"', () => {
    expect(statusGrantsPlan('trialing')).toBe(true);
  });

  it('returns false for "canceled"', () => {
    expect(statusGrantsPlan('canceled')).toBe(false);
  });

  it('returns false for "past_due"', () => {
    expect(statusGrantsPlan('past_due')).toBe(false);
  });

  it('returns false for null', () => {
    expect(statusGrantsPlan(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(statusGrantsPlan(undefined)).toBe(false);
  });
});

describe('resolvePlanFromSubscription', () => {
  it('resolves an active subscription with a pro line item to "pro"', () => {
    expect(
      resolvePlanFromSubscription({
        status: 'active',
        line_items: [{ variant_id: PRO_MONTHLY }],
      }),
    ).toBe('pro');
  });

  it('resolves a trialing subscription with a starter line item to "starter"', () => {
    expect(
      resolvePlanFromSubscription({
        status: 'trialing',
        line_items: [{ variant_id: STARTER_MONTHLY }],
      }),
    ).toBe('starter');
  });

  it('returns "free" when the status does not grant a plan', () => {
    expect(
      resolvePlanFromSubscription({
        status: 'canceled',
        line_items: [{ variant_id: PRO_MONTHLY }],
      }),
    ).toBe('free');
  });

  it('returns "free" when no line item maps to a known plan', () => {
    expect(
      resolvePlanFromSubscription({
        status: 'active',
        line_items: [{ variant_id: 'price_unknown' }],
      }),
    ).toBe('free');
  });

  it('returns "free" when there are no line items', () => {
    expect(
      resolvePlanFromSubscription({
        status: 'active',
        line_items: [],
      }),
    ).toBe('free');
  });

  it('skips null/free line items and picks the plan-granting one', () => {
    expect(
      resolvePlanFromSubscription({
        status: 'active',
        line_items: [{ variant_id: null }, { variant_id: TEAM_MONTHLY }],
      }),
    ).toBe('team');
  });

  it('picks the HIGHEST tier when multiple line items map to plans', () => {
    // Order must not matter: team outranks starter and pro either way.
    expect(
      resolvePlanFromSubscription({
        status: 'active',
        line_items: [
          { variant_id: STARTER_MONTHLY },
          { variant_id: TEAM_MONTHLY },
        ],
      }),
    ).toBe('team');

    expect(
      resolvePlanFromSubscription({
        status: 'active',
        line_items: [{ variant_id: TEAM_MONTHLY }, { variant_id: PRO_MONTHLY }],
      }),
    ).toBe('team');
  });

  it('returns "free" when line_items is null', () => {
    expect(
      resolvePlanFromSubscription({
        status: 'active',
        line_items: null,
      }),
    ).toBe('free');
  });

  it('returns "free" when status is null', () => {
    expect(
      resolvePlanFromSubscription({
        status: null,
        line_items: [{ variant_id: PRO_MONTHLY }],
      }),
    ).toBe('free');
  });
});

describe('billing.config ↔ VexPlan consistency', () => {
  // Guards against drift: every product id in billing.config must be a value
  // the DB CHECK constraint accepts (mirrored by VEX_PLAN_VALUES). If a new
  // tier is added to billing.config without updating VexPlan + the migration,
  // planFromPriceId would silently fall back to 'free'; this test fails first.
  it('maps every billing.config product id to a known plan', () => {
    for (const product of billingConfig.products) {
      expect(VEX_PLAN_VALUES).toContain(product.id);
    }
  });
});
