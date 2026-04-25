import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import PricingPage from '~/pricing/page';

describe('app/pricing/page.tsx', () => {
  it('renders one Product JSON-LD with 4 Offers', () => {
    const { container } = render(<PricingPage />);
    const scripts = container.querySelectorAll(
      'script[type="application/ld+json"]',
    );
    const blobs = Array.from(scripts).map((s) =>
      JSON.parse(s.textContent ?? 'null'),
    );
    const products = blobs.filter((b) => b && b['@type'] === 'Product');
    expect(products).toHaveLength(1);
    expect(products[0].offers).toHaveLength(4);
  });

  it('does not contain OSS claims in user-visible FAQ copy', () => {
    // Scoped to FAQ + plan/hero/enterprise sections owned by this page.
    // The competitor ComparisonTable is a separate component with its own
    // feature-row data ("Open source" as a head-to-head fact) and is not
    // part of Task 1.5's scrub scope.
    const { container } = render(<PricingPage />);
    const faqHeading = Array.from(container.querySelectorAll('h2')).find(
      (h) => h.textContent === 'Frequently Asked Questions',
    );
    expect(faqHeading).toBeDefined();
    const faqSection = faqHeading?.parentElement;
    const faqText = faqSection?.textContent ?? '';
    expect(faqText).not.toMatch(/open[\s-]?source/i);
    expect(faqText).not.toMatch(/apache 2\.0/i);
    expect(faqText).not.toMatch(/AGPLv3/i);
  });

  it('renders all 4 plan names', () => {
    const { container } = render(<PricingPage />);
    const text = container.textContent ?? '';
    for (const name of ['Free', 'Starter', 'Pro', 'Team']) {
      expect(text).toContain(name);
    }
  });
});
