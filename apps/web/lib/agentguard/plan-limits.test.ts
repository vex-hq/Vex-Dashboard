import { describe, expect, it } from 'vitest';

import { canAddSeat, getPlanLimits } from './plan-limits';

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
