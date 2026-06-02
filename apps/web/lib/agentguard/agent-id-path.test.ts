import { describe, expect, it } from 'vitest';

import { decodeAgentIdPath, encodeAgentIdPath } from './agent-id-path';

describe('agent-id-path encode/decode', () => {
  const cases = [
    'spike-userB-gameY',
    'klio-host/claude-code',
    'machine name/with spaces',
    'weird/id?with=chars&x=1',
    'unicode/路径/é',
    'trailing/',
    'a/b/c/d',
  ];

  it('round-trips every id through encode → URL path → decode', () => {
    for (const id of cases) {
      const encoded = encodeAgentIdPath(id); // a URL path string, e.g. "klio-host/claude-code"
      // Simulate Next.js catch-all param parsing: split the path on '/'.
      const segments = encoded.split('/');
      expect(decodeAgentIdPath(segments)).toBe(id);
    }
  });

  it('percent-encodes each segment but keeps the slash separators', () => {
    expect(encodeAgentIdPath('a b/c')).toBe('a%20b/c');
    expect(encodeAgentIdPath('plain')).toBe('plain');
  });

  it('decodes a multi-segment catch-all array back to a slash-joined id', () => {
    expect(decodeAgentIdPath(['klio-host', 'claude-code'])).toBe(
      'klio-host/claude-code',
    );
  });
});
