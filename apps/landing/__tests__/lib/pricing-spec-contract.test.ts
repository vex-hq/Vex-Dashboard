import { describe, expect, it } from 'vitest';

import { PLANS } from '~/lib/pricing';

/**
 * Pins the 2026-08-13 pricing spec's Free/Team numbers
 * (`2026-08-13-klio-pricing-spec.md`) against the published `PLANS` array.
 *
 * `plan_limits.py`'s own docstring records that these two sources — the
 * marketing site and the engine's enforced limits — drifted once already:
 * the site promised "unlimited memories, retention forever" while the
 * engine enforced 1,000/month and a one-day retention window, and people who
 * signed up on the published terms lost their history after a day. This
 * file is the trip-wire so `lib/pricing.ts` cannot silently drift from the
 * approved spec a third time. It does not reach into the engine repo (out
 * of scope here) — it only pins what THIS repo publishes.
 */
function featureValue(plan: (typeof PLANS)[number], label: string): string {
  const feature = plan.features.find((f) => f.label === label);
  if (!feature) {
    throw new Error(`Plan "${plan.id}" has no "${label}" feature row`);
  }
  return feature.value;
}

describe('pricing spec contract (2026-08-13)', () => {
  const free = PLANS.find((p) => p.id === 'free')!;
  const team = PLANS.find((p) => p.id === 'team')!;

  it('publishes Free memory retention as 30 days', () => {
    expect(featureValue(free, 'Memory retention')).toBe('30 days');
  });

  it('publishes Free projects as 3', () => {
    expect(featureValue(free, 'Projects')).toBe('3');
  });

  it('publishes Team rate limit as 1,000 RPM', () => {
    expect(featureValue(team, 'Rate limit')).toBe('1,000 RPM');
  });

  it('publishes Team memory retention as Forever', () => {
    expect(featureValue(team, 'Memory retention')).toBe('Forever');
  });

  it('publishes Team projects as Unlimited', () => {
    expect(featureValue(team, 'Projects')).toBe('Unlimited');
  });

  it('prices Team at $20/seat/month and $200/seat/year', () => {
    expect(team.priceMonthly).toBe(20);
    expect(team.priceUnit).toBe('seat');
    expect(team.priceYearly).toBe(200);
  });

  it('marks the intelligence layer (graph/hybrid/curator/compression) as Team-only, not Cloud-wide', () => {
    // Regression guard for the specific drift this spec fixes: the row used
    // to read "Cloud only" for BOTH tiers, which implied Free had it too.
    const freeValue = featureValue(free, 'Graph, hybrid search, curator');
    const teamValue = featureValue(team, 'Graph, hybrid search, curator');

    expect(freeValue).not.toBe('Cloud only');
    expect(freeValue.toLowerCase()).not.toContain('cloud only');
    expect(teamValue.toLowerCase()).toContain('team');
  });
});
