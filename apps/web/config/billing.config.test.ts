import { describe, expect, it } from 'vitest';

import billingConfig from './billing.config';

/**
 * Guards the 2026-08-13 Klio per-seat pricing shape
 * (`2026-08-13-klio-pricing-spec.md`, "The shape" + "Configuration changes →
 * 2"). `billingConfig` is validated by `createBillingSchema` at import time
 * (a Zod `.parse`), so a merely-importable config already proves the schema
 * accepts per-seat line items; these tests pin the actual numbers so nobody
 * can quietly change $20/$200 or drop the placeholder-id trip-wire.
 */
describe('billing.config', () => {
  it('exposes exactly the free and team products', () => {
    expect(billingConfig.products.map((p) => p.id)).toEqual([
      'free',
      'team',
    ]);
  });

  describe('free product', () => {
    const free = billingConfig.products.find((p) => p.id === 'free')!;

    it('has a single $0 flat plan (a gate, not a checkout)', () => {
      expect(free.plans).toHaveLength(1);
      const [plan] = free.plans;
      expect(plan!.lineItems).toHaveLength(1);
      expect(plan!.lineItems[0]!.type).toBe('flat');
      expect(plan!.lineItems[0]!.cost).toBe(0);
    });

    it('does not use a real Stripe price id', () => {
      const [plan] = free.plans;
      expect(plan!.lineItems[0]!.id).not.toMatch(/^price_/);
    });
  });

  describe('team product', () => {
    const team = billingConfig.products.find((p) => p.id === 'team')!;

    it('has monthly and yearly plans', () => {
      expect(team.plans.map((p) => p.id).sort()).toEqual([
        'team-monthly',
        'team-yearly',
      ]);
    });

    it('prices team-monthly at $20/seat/month', () => {
      const plan = team.plans.find((p) => p.id === 'team-monthly')!;
      expect(plan.interval).toBe('month');
      expect(plan.lineItems).toHaveLength(1);
      expect(plan.lineItems[0]!.type).toBe('per_seat');
      expect(plan.lineItems[0]!.cost).toBe(20);
    });

    it('prices team-yearly at $200/seat/year', () => {
      const plan = team.plans.find((p) => p.id === 'team-yearly')!;
      expect(plan.interval).toBe('year');
      expect(plan.lineItems).toHaveLength(1);
      expect(plan.lineItems[0]!.type).toBe('per_seat');
      expect(plan.lineItems[0]!.cost).toBe(200);
    });

    it('flags both team price ids as unreplaced placeholders', () => {
      // Trip-wire: these MUST be swapped for real Stripe price ids before
      // checkout works (see the header comment in billing.config.ts). This
      // assertion documents the exact placeholder strings a reader — or a
      // future "why is checkout failing" investigation — should grep for.
      const monthly = team.plans.find((p) => p.id === 'team-monthly')!;
      const yearly = team.plans.find((p) => p.id === 'team-yearly')!;

      expect(monthly.lineItems[0]!.id).toBe('price_REPLACE_ME_TEAM_MONTHLY');
      expect(yearly.lineItems[0]!.id).toBe('price_REPLACE_ME_TEAM_YEARLY');
    });
  });

  it('keeps the former Vex flat products out of the active config', () => {
    // They are retained in the file as comments (hidden-not-deleted), not as
    // active entries — this fails loudly if someone uncomments them without
    // also updating this test deliberately.
    const ids = billingConfig.products.map((p) => p.id);
    expect(ids).not.toContain('starter');
    expect(ids).not.toContain('pro');
  });
});
