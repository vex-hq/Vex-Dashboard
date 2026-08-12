import { describe, expect, it } from 'vitest';

import { displayAgent } from './display-agent';

describe('displayAgent', () => {
  it('keeps a short human name', () => {
    expect(displayAgent('claude-code')).toBe('claude-code');
  });

  it('uses the last path segment of a machine-local id', () => {
    expect(displayAgent('klio-abhisheks-macbook-pro-local/claude-code')).toBe(
      'claude-code',
    );
  });

  it('strips the klio- prefix from curator ids', () => {
    expect(displayAgent('klio-curator')).toBe('curator');
  });

  it('shortens a UUID', () => {
    expect(displayAgent('a1b2c3d4-e5f6-7890-abcd-ef1234567890')).toBe(
      'a1b2c3d4…',
    );
  });
});
