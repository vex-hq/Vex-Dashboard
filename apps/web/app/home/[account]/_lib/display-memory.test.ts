import { describe, expect, it } from 'vitest';

import { displayMemory } from './display-memory';

describe('displayMemory', () => {
  it('strips the curator lead-in and capitalizes the payload', () => {
    expect(
      displayMemory(
        'The user wants the author identity persisted in memory for all future project work.',
      ),
    ).toBe(
      'Author identity persisted in memory for all future project work.',
    );
  });

  it('strips "The user requested"', () => {
    expect(displayMemory('The user requested running gh repo create.')).toBe(
      'Running gh repo create.',
    );
  });

  it('leaves a clean sentence alone', () => {
    expect(displayMemory('Auth errors return 404.')).toBe(
      'Auth errors return 404.',
    );
  });

  it('returns the original when stripping would empty the string', () => {
    expect(displayMemory('The user wants')).toBe('The user wants');
  });
});
