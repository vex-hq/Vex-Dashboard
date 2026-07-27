import { describe, expect, it } from 'vitest';

import { PLAN_LIMITS, canAddSeat, getPlanLimits } from './plan-limits';

describe('getPlanLimits', () => {
  it('gives enterprise unlimited seats', () => {
    expect(getPlanLimits('enterprise').maxSeats).toBe(-1);
  });

  it('falls back to the free tier for an unknown plan', () => {
    expect(getPlanLimits('not-a-plan').maxSeats).toBe(
      getPlanLimits('free').maxSeats,
    );
  });

  it('merges non-null overrides on top of the base plan', () => {
    expect(getPlanLimits('free', { maxSeats: 25 }).maxSeats).toBe(25);
  });

  it('ignores null override values', () => {
    expect(getPlanLimits('team', { maxSeats: null as never }).maxSeats).toBe(
      getPlanLimits('team').maxSeats,
    );
  });
});

describe('memory value metrics', () => {
  // The engine hard-blocks memory writes/recalls with HTTP 402 once the monthly
  // counter hits these numbers (vex_engine services/shared/shared/usage.py ->
  // check_memory_quota, reading services/shared/shared/plan_limits.py). The
  // dashboard must meter the SAME metrics with the SAME numbers, otherwise a
  // user hits a 402 while the UI still reports headroom.
  const ENGINE_MEMORY_LIMITS = {
    free: { memoriesPerMonth: 1_000, recallsPerMonth: 10_000 },
    starter: { memoriesPerMonth: 25_000, recallsPerMonth: 100_000 },
    pro: { memoriesPerMonth: 150_000, recallsPerMonth: 1_000_000 },
    team: { memoriesPerMonth: 1_500_000, recallsPerMonth: 10_000_000 },
    enterprise: { memoriesPerMonth: -1, recallsPerMonth: -1 },
  } as const;

  it('exposes the memory metrics on every plan', () => {
    for (const limits of Object.values(PLAN_LIMITS)) {
      expect(typeof limits.memoriesPerMonth).toBe('number');
      expect(typeof limits.recallsPerMonth).toBe('number');
    }
  });

  it('defines every plan the engine defines, and no extras', () => {
    expect(Object.keys(PLAN_LIMITS).sort()).toEqual(
      Object.keys(ENGINE_MEMORY_LIMITS).sort(),
    );
  });

  it.each(Object.entries(ENGINE_MEMORY_LIMITS))(
    'mirrors the engine memory quotas for the %s plan',
    (plan, expected) => {
      const limits = getPlanLimits(plan);

      expect(limits.memoriesPerMonth).toBe(expected.memoriesPerMonth);
      expect(limits.recallsPerMonth).toBe(expected.recallsPerMonth);
    },
  );

  it('gives enterprise unlimited memory and recalls', () => {
    // -1 is the shared "unlimited" sentinel; a meter must not render it as a cap.
    expect(getPlanLimits('enterprise').memoriesPerMonth).toBe(-1);
    expect(getPlanLimits('enterprise').recallsPerMonth).toBe(-1);
  });

  it('falls back to the free memory quotas for an unknown plan', () => {
    const unknown = getPlanLimits('not-a-plan');
    const free = getPlanLimits('free');

    expect(unknown.memoriesPerMonth).toBe(free.memoriesPerMonth);
    expect(unknown.recallsPerMonth).toBe(free.recallsPerMonth);
  });

  it('merges per-account memory overrides on top of the base plan', () => {
    const limits = getPlanLimits('free', {
      memoriesPerMonth: 50_000,
      recallsPerMonth: 500_000,
    });

    expect(limits.memoriesPerMonth).toBe(50_000);
    expect(limits.recallsPerMonth).toBe(500_000);
    // Overriding memory must not disturb the reliability quotas.
    expect(limits.observationsPerMonth).toBe(
      getPlanLimits('free').observationsPerMonth,
    );
  });

  it('ignores null memory override values', () => {
    const limits = getPlanLimits('pro', {
      memoriesPerMonth: null as never,
      recallsPerMonth: null as never,
    });

    expect(limits.memoriesPerMonth).toBe(getPlanLimits('pro').memoriesPerMonth);
    expect(limits.recallsPerMonth).toBe(getPlanLimits('pro').recallsPerMonth);
  });

  it('leaves the existing reliability quotas untouched', () => {
    // Regression guard for the additive-only constraint on this change.
    expect(getPlanLimits('free').observationsPerMonth).toBe(1_000);
    expect(getPlanLimits('free').verificationsPerMonth).toBe(50);
    expect(getPlanLimits('enterprise').observationsPerMonth).toBe(10_000_000);
    expect(getPlanLimits('enterprise').verificationsPerMonth).toBe(1_000_000);
  });
});

describe('canAddSeat', () => {
  // Regression guard: an enterprise account was blocked at the free tier's one
  // seat because the members seat gate read `organizations.plan` (never
  // written, always 'free') instead of `accounts.vex_plan`. The plan table was
  // always correct — these assert the entitlement side stays that way.
  it('never blocks an enterprise account, however many members it has', () => {
    expect(canAddSeat('enterprise', 0).allowed).toBe(true);
    expect(canAddSeat('enterprise', 500).allowed).toBe(true);
  });

  it('blocks a free account that already has its single seat', () => {
    const result = canAddSeat('free', 1);

    expect(result.allowed).toBe(false);
    expect(result.allowed === false && result.reason).toContain('free');
  });

  it('allows a free account with no members yet', () => {
    expect(canAddSeat('free', 0).allowed).toBe(true);
  });

  it('respects a per-account seat override without changing the plan', () => {
    // The exact escape hatch for "this customer needs more seats".
    expect(canAddSeat('free', 1).allowed).toBe(false);
    expect(canAddSeat('free', 1, 1, { maxSeats: 10 }).allowed).toBe(true);
  });

  it('accounts for the number of seats being added', () => {
    expect(canAddSeat('team', 14, 1).allowed).toBe(true);
    expect(canAddSeat('team', 14, 5).allowed).toBe(false);
  });

  it('treats an unknown plan as free rather than unlimited', () => {
    expect(canAddSeat('not-a-plan', 1).allowed).toBe(false);
  });
});
