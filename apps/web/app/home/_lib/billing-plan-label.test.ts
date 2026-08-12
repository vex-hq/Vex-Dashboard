import { describe, expect, it } from 'vitest';

import { derivePlanLabel } from './billing-plan-label';

describe('derivePlanLabel', () => {
  it('returns "Free Plan" when there is no subscription or order', () => {
    expect(derivePlanLabel({ subscriptionStatus: null, hasOrder: false })).toBe(
      'Free Plan',
    );
  });

  it('returns "Lifetime" when there is an order but no subscription', () => {
    expect(derivePlanLabel({ subscriptionStatus: null, hasOrder: true })).toBe(
      'Lifetime',
    );
  });

  it('maps a known subscription status to its label', () => {
    expect(
      derivePlanLabel({ subscriptionStatus: 'active', hasOrder: false }),
    ).toBe('Active');

    expect(
      derivePlanLabel({ subscriptionStatus: 'trialing', hasOrder: false }),
    ).toBe('Trial');

    expect(
      derivePlanLabel({ subscriptionStatus: 'past_due', hasOrder: false }),
    ).toBe('Past Due');
  });

  it('falls back to the raw status string for an unrecognized status', () => {
    expect(
      derivePlanLabel({
        subscriptionStatus: 'some_future_status',
        hasOrder: false,
      }),
    ).toBe('some_future_status');
  });

  it('never returns a string containing a Vex-era price or tier name', () => {
    const labels = [
      derivePlanLabel({ subscriptionStatus: null, hasOrder: false }),
      derivePlanLabel({ subscriptionStatus: null, hasOrder: true }),
      derivePlanLabel({ subscriptionStatus: 'active', hasOrder: false }),
    ];

    for (const label of labels) {
      expect(label).not.toMatch(/starter|pro|team|\$\d/i);
    }
  });
});
