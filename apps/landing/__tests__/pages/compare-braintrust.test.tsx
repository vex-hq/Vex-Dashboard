import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import CompareBraintrust from '~/compare/braintrust/page';

describe('app/compare/braintrust/page.tsx', () => {
  it('renders feature comparison as a real <table>', () => {
    const { container } = render(<CompareBraintrust />);
    const table = container.querySelector('table');
    expect(table).not.toBeNull();
    expect(table?.querySelector('caption')).not.toBeNull();
    expect(
      table?.querySelectorAll('th[scope="col"]').length,
    ).toBeGreaterThanOrEqual(3);
    expect(table?.querySelectorAll('th[scope="row"]').length).toBeGreaterThan(
      0,
    );
  });
});
