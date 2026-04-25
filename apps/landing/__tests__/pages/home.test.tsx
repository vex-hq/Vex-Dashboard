import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import HomePage from '~/page';

describe('app/page.tsx (home)', () => {
  it('renders the positioning sentence', () => {
    const { container } = render(<HomePage />);
    expect(container.textContent ?? '').toContain(
      'Vex helps founders shipping AI agents',
    );
  });
});
