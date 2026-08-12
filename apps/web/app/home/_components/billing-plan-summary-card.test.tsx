// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { BillingPlanSummaryCard } from './billing-plan-summary-card';

/**
 * Guards the billing-guard promise: no Klio user may ever be shown a Vex
 * price. `billing.config.ts` still describes the retired Vex Starter/Pro/Team
 * tiers ($29/$99/$349) because the checkout server actions built on it stay
 * in the tree untouched — but this card is what actually renders on both
 * billing pages now, and it must never echo those numbers.
 */
describe('<BillingPlanSummaryCard />', () => {
  it('never renders a Vex-era price, regardless of props', () => {
    const { container } = render(
      <BillingPlanSummaryCard planLabel="Active" seatCount={7} />,
    );

    const text = container.textContent ?? '';

    expect(text).not.toContain('$29');
    expect(text).not.toContain('$99');
    expect(text).not.toContain('$349');
    expect(text).not.toContain('290');
    expect(text).not.toContain('990');
    expect(text).not.toContain('3490');
  });

  it('renders the verbatim Klio pricing/contact copy, mailto-linked at the email', () => {
    render(<BillingPlanSummaryCard planLabel="Free Plan" />);

    const container = screen.getByTestId('billing-klio-pricing-notice');

    expect(container.textContent).toBe(
      'Team pricing is $20 per seat at klio.tech/pricing. Billing setup for Klio is in progress — talk to us at contact@klio.tech.',
    );

    const link = screen.getByRole('link', { name: 'contact@klio.tech' });
    expect(link).toHaveAttribute('href', 'mailto:contact@klio.tech');
  });

  it('renders the current plan label passed in', () => {
    render(<BillingPlanSummaryCard planLabel="Lifetime" />);

    expect(screen.getByTestId('billing-current-plan')).toHaveTextContent(
      'Lifetime',
    );
  });

  it('renders a numeric seat count when provided (team accounts)', () => {
    render(<BillingPlanSummaryCard planLabel="Active" seatCount={12} />);

    expect(screen.getByTestId('billing-seat-count')).toHaveTextContent('12');
  });

  it('renders a not-applicable note instead of a seat count when omitted (personal accounts)', () => {
    render(<BillingPlanSummaryCard planLabel="Free Plan" />);

    expect(screen.getByTestId('billing-seat-count')).toHaveTextContent(
      /not applicable/i,
    );
  });

  it('never renders a checkout affordance', () => {
    render(<BillingPlanSummaryCard planLabel="Free Plan" />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /checkout|upgrade|subscribe/i }),
    ).not.toBeInTheDocument();
  });
});
