import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ComparisonTable } from '~/_components/comparison-table';

describe('<ComparisonTable />', () => {
  it('does not render any "open source" claim attributable to Vex', () => {
    const { container } = render(<ComparisonTable />);
    const text = container.textContent ?? '';

    // Source-level guard already catches OSS strings in the file. This
    // render-time check is defense-in-depth: if a future refactor pipes
    // competitor-tagline data through Vex's columns, or reintroduces an
    // Open-source feature row, this test fails before merge.
    expect(text).not.toMatch(/open[\s-]?source/i);
    expect(text).not.toMatch(/apache 2\.0/i);
  });
});
