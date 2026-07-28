import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { HumanHome } from '~/_components/home/human-home';

/**
 * This suite previously rendered `<HomePage />` directly. That component is an
 * async server component (it awaits `searchParams` and `headers()`), so
 * `render` returned an empty container and every assertion compared `''`
 * against a string. It could not fail for the right reason — and it did not
 * notice when the entire home page was rebuilt underneath it.
 *
 * `HumanHome` is the synchronous component that actually holds the content, so
 * that is what gets asserted here.
 */
describe('app/_components/home/human-home', () => {
  const text = () => render(<HumanHome />).container.textContent ?? '';

  it('leads with the positioning claim', () => {
    expect(text()).toContain('somewhere to work together');
  });

  it('names the agents it interoperates with', () => {
    const body = text().toLowerCase();
    for (const agent of ['claude-code', 'cursor', 'codex']) {
      expect(body).toContain(agent);
    }
  });

  it('states the scope refusals, which are the load-bearing claim', () => {
    const body = text();
    expect(body).toContain('Never kept');
    expect(body).toMatch(/redaction runs/i);
  });

  it('renders every plate in order', () => {
    const body = text();
    const plates = [
      'Plate I',
      'Plate II',
      'Plate III',
      'Plate IV',
      'Plate V',
      'Plate VI',
      'Plate VII',
      'Plate VIII',
    ];
    let cursor = -1;
    for (const plate of plates) {
      const at = body.indexOf(plate, cursor + 1);
      expect(at, `${plate} missing or out of order`).toBeGreaterThan(cursor);
      cursor = at;
    }
  });
});
