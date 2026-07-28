import { describe, expect, it } from 'vitest';

import { FAQ, ORG, POSITIONING_SENTENCE, SAME_AS } from '~/lib/site-meta';

describe('lib/site-meta', () => {
  // Klio is positioned on collaboration, not recall — see the header comment
  // in lib/site-meta.ts. These markers guard that reframe: if the sentence
  // drifts back to being about memory alone, it is on the crowded shelf again.
  it('positioning sentence carries the collaboration reframe', () => {
    expect(POSITIONING_SENTENCE).toMatch(/workplace/i);
    expect(POSITIONING_SENTENCE).toMatch(/agents/i);
    expect(POSITIONING_SENTENCE).toMatch(/MCP/i);
  });

  it('organization has stable identity fields', () => {
    expect(ORG.name).toBe('Klio');
    expect(ORG.url).toBe('https://klio.tech');
    expect(ORG.logo).toMatch(/^https:\/\//);
    expect(ORG.contactEmail).toMatch(/^[^@]+@[^@]+\.[^@]+$/);
  });

  it('sameAs is a non-empty array of https URLs', () => {
    expect(SAME_AS.length).toBeGreaterThan(0);
    for (const url of SAME_AS) {
      expect(url).toMatch(/^https:\/\//);
      expect(() => new URL(url)).not.toThrow();
    }
  });

  // A hardcoded count rots every time an answer is added, and the old
  // open-source prohibition was reversed when Klio went open-core. What
  // actually matters is that every entry is real and none is a placeholder.
  it('FAQ is non-empty and free of placeholder answers', () => {
    expect(FAQ.length).toBeGreaterThan(0);
    for (const entry of FAQ) {
      expect(entry.question).toMatch(/\?$/);
      expect(entry.answer).not.toMatch(/\b(TBD|TODO|lorem ipsum)\b/i);
    }
  });

  it('FAQ entries have non-trivial content', () => {
    for (const entry of FAQ) {
      expect(entry.question.length).toBeGreaterThan(5);
      expect(entry.answer.length).toBeGreaterThan(20);
    }
  });

  it('FAQ questions and sameAs URLs are unique', () => {
    expect(new Set(FAQ.map((e) => e.question)).size).toBe(FAQ.length);
    expect(new Set(SAME_AS).size).toBe(SAME_AS.length);
  });
});
