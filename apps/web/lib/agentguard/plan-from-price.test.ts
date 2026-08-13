import { describe, expect, it } from 'vitest';

import billingConfig from '~/config/billing.config';

import {
  VEX_PLAN_VALUES,
  planFromPriceId,
  resolvePlanFromSubscription,
  statusGrantsPlan,
} from './plan-from-price';

// Real known Stripe price ids from billing.config (monthly/yearly line
// items). TEAM_MONTHLY / TEAM_YEARLY are the 2026-08-13 Klio per-seat
// live ids from the Klio Stripe account, mirrored from billing.config.ts;
// see the header comment in `billing.config.ts` for why. These are public,
// non-sensitive identifiers (not secrets); the allowlist pragmas suppress
// detect-secrets' high-entropy false positives.
const TEAM_MONTHLY = 'price_1U447h0Zh9jGFkLDlVHfozmx'; // pragma: allowlist secret
const TEAM_YEARLY = 'price_1U448X0Zh9jGFkLDWa5X17aL'; // pragma: allowlist secret

// The old Vex "starter"/"pro" prices are commented out of billing.config as
// of 2026-08-13 (hidden-not-deleted, see that file's header comment). They
// must now resolve to 'free' like any other unrecognized price id — this is
// the regression guard for "commenting out a product silently changes what
// its price ids resolve to.
const FORMER_STARTER_MONTHLY = 'price_1T3eAO2R0WSf5z7SEQKjage3'; // pragma: allowlist secret
const FORMER_PRO_MONTHLY = 'price_1T3eAI2R0WSf5z7Svg2YEAoU'; // pragma: allowlist secret

describe('planFromPriceId', () => {
  it('maps the Klio team-monthly price id to "team"', () => {
    expect(planFromPriceId(TEAM_MONTHLY)).toBe('team');
  });

  it('maps the Klio team-yearly price id to "team"', () => {
    expect(planFromPriceId(TEAM_YEARLY)).toBe('team');
  });

  it('returns "free" for the commented-out former Vex starter price id', () => {
    expect(planFromPriceId(FORMER_STARTER_MONTHLY)).toBe('free');
  });

  it('returns "free" for the commented-out former Vex pro price id', () => {
    expect(planFromPriceId(FORMER_PRO_MONTHLY)).toBe('free');
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
  it('resolves an active subscription with a team line item to "team"', () => {
    expect(
      resolvePlanFromSubscription({
        status: 'active',
        line_items: [{ variant_id: TEAM_MONTHLY }],
      }),
    ).toBe('team');
  });

  it('resolves a trialing subscription with a team-yearly line item to "team"', () => {
    expect(
      resolvePlanFromSubscription({
        status: 'trialing',
        line_items: [{ variant_id: TEAM_YEARLY }],
      }),
    ).toBe('team');
  });

  it('returns "free" when the status does not grant a plan', () => {
    expect(
      resolvePlanFromSubscription({
        status: 'canceled',
        line_items: [{ variant_id: TEAM_MONTHLY }],
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
    // Order must not matter: team outranks free either way.
    expect(
      resolvePlanFromSubscription({
        status: 'active',
        line_items: [
          { variant_id: 'klio-free-plan' },
          { variant_id: TEAM_MONTHLY },
        ],
      }),
    ).toBe('team');

    expect(
      resolvePlanFromSubscription({
        status: 'active',
        line_items: [
          { variant_id: TEAM_MONTHLY },
          { variant_id: 'klio-free-plan' },
        ],
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
        line_items: [{ variant_id: TEAM_MONTHLY }],
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

  it('only exposes free and team products (Vex tiers are commented out)', () => {
    expect(billingConfig.products.map((p) => p.id).sort()).toEqual([
      'free',
      'team',
    ]);
  });
});
