// @vitest-environment jsdom
import { fireEvent, render } from '@testing-library/react';
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import { describe, expect, it, vi } from 'vitest';

import { AppEventsProvider } from '@kit/shared/events';

import { TeamAccountCheckoutForm } from './team-account-checkout-form';

/**
 * `PlanPicker` (via `PlanCostDisplay`, `@kit/billing-gateway/components`)
 * calls `useTranslation()` and reads `i18n.language` to format currency —
 * with no i18next instance registered, `formatCurrency` blows up on
 * `undefined.split('-')` before any assertion runs. No other test in this
 * app renders `PlanPicker`, so there's no existing i18n test harness to
 * reuse; this is the minimal instance needed for `i18n.language` to exist.
 * No resource bundles are loaded, so every `Trans`/`t()` call falls back to
 * its `defaults` prop (or the raw key when none is given) — see the
 * `billing:billingInterval.year` key match below.
 */
void i18next.use(initReactI18next).init({
  lng: 'en',
  resources: {},
  interpolation: { escapeValue: false },
});

/**
 * jsdom has no `ResizeObserver`; Radix's `RadioGroup` (via
 * `@radix-ui/react-use-size`) reads it on mount to track the indicator
 * size. No other test in this app renders a Radix `RadioGroup`, so there's
 * no shared polyfill to reuse — this is the minimal stub needed to avoid
 * `ResizeObserver is not defined` on mount.
 */
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).ResizeObserver ??= ResizeObserverStub;

/**
 * Coverage for restoring real checkout on the team billing page
 * (2026-08-13, `fix(billing): restore team checkout now that Klio prices
 * exist`). `billing.config.ts` now carries Klio's own per-seat prices
 * (`price_1U447h0Zh9jGFkLDlVHfozmx` — $20/seat/month,
 * `price_1U448X0Zh9jGFkLDWa5X17aL` — $200/seat/year), replacing the retired
 * Vex flat tiers that the 2026-08-12 guard was written to hide. This form
 * is the actual checkout entry point (`PlanPicker` from `billing.config`) —
 * these tests assert it renders both Klio plans, one per billing interval,
 * rather than the guard's static summary card.
 */
vi.mock('next/navigation', () => ({
  useParams: () => ({ account: 'acme-team' }),
}));

vi.mock('../_lib/server/server-actions', () => ({
  createTeamAccountCheckoutSession: vi.fn(),
}));

function renderForm(customerId: string | null = null) {
  return render(
    <AppEventsProvider>
      <TeamAccountCheckoutForm accountId="account-1" customerId={customerId} />
    </AppEventsProvider>,
  );
}

describe('<TeamAccountCheckoutForm />', () => {
  it('renders the Klio monthly plan ($20/seat) by default', () => {
    const { container } = renderForm();

    const monthlyRadio = container.querySelector(
      '[data-test-plan="team-monthly"]',
    );

    expect(monthlyRadio).toBeInTheDocument();
    expect(container.textContent).toContain('20');
  });

  it('switches to the Klio yearly plan ($200/seat) when the year interval is selected', () => {
    const { container, getByRole } = renderForm();

    // The interval radio items are keyed by `id={interval}` (see
    // `plan-picker.tsx`), so `role=radio` with accessible name matching the
    // raw i18n key (no i18next instance is initialized in this test, so
    // `Trans` falls back to rendering the key itself).
    const yearIntervalRadio = getByRole('radio', {
      name: 'billing:billingInterval.year',
    });

    fireEvent.click(yearIntervalRadio);

    const yearlyRadio = container.querySelector(
      '[data-test-plan="team-yearly"]',
    );
    const monthlyRadio = container.querySelector(
      '[data-test-plan="team-monthly"]',
    );

    expect(yearlyRadio).toBeInTheDocument();
    expect(monthlyRadio).not.toBeInTheDocument();

    // `PlanCostDisplay` is given `alwaysDisplayMonthlyPrice`, so the $200
    // yearly line item renders as its monthly-equivalent ($200 / 12).
    expect(container.textContent).toContain('16.67');
  });

  it('never renders a Vex-era price', () => {
    const { container } = renderForm();

    const text = container.textContent ?? '';

    expect(text).not.toContain('$29');
    expect(text).not.toContain('$99');
    expect(text).not.toContain('$349');
  });
});
