import { describe, expect, it } from 'vitest';

import { CURRENCY, LAST_UPDATED, PLANS, type Plan } from '~/lib/pricing';

describe('lib/pricing', () => {
  it('exports four plans with stable ids', () => {
    expect(PLANS).toHaveLength(4);
    expect(PLANS.map((p) => p.id)).toEqual(['free', 'starter', 'pro', 'team']);
  });

  it('all plan prices are non-negative integers', () => {
    for (const plan of PLANS) {
      expect(Number.isInteger(plan.priceMonthly)).toBe(true);
      expect(plan.priceMonthly).toBeGreaterThanOrEqual(0);
    }
  });

  it('every plan has at least one feature row', () => {
    for (const plan of PLANS) {
      expect(plan.features.length).toBeGreaterThan(0);
    }
  });

  it('LAST_UPDATED is an ISO date', () => {
    expect(LAST_UPDATED).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('CURRENCY is USD', () => {
    expect(CURRENCY).toBe('USD');
  });

  it('Plan type exhausts the id union (compile-time check)', () => {
    // Compile-time: assigning a Plan with an unknown id would fail tsc.
    const sample: Plan = PLANS[0]!;
    expect(['free', 'starter', 'pro', 'team']).toContain(sample.id);
  });

  it('all plan ids are unique', () => {
    expect(new Set(PLANS.map((p) => p.id)).size).toBe(PLANS.length);
  });

  it('every cta.href is an absolute URL', () => {
    for (const plan of PLANS) {
      expect(() => new URL(plan.cta.href)).not.toThrow();
    }
  });
});
