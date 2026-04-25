import { describe, expect, it } from 'vitest';

import { FAQ, ORG, POSITIONING_SENTENCE, SAME_AS } from '~/lib/site-meta';

describe('lib/site-meta', () => {
  it('positioning sentence contains who/outcome/approach markers', () => {
    expect(POSITIONING_SENTENCE).toMatch(/founders/i);
    expect(POSITIONING_SENTENCE).toMatch(/hallucinations/i);
    expect(POSITIONING_SENTENCE).toMatch(/auto-correction/i);
  });

  it('positioning sentence contains no OSS claims', () => {
    expect(POSITIONING_SENTENCE).not.toMatch(/open[\s-]?source/i);
    expect(POSITIONING_SENTENCE).not.toMatch(/apache 2\.0/i);
  });

  it('organization has stable identity fields', () => {
    expect(ORG.name).toBe('Vex');
    expect(ORG.url).toBe('https://tryvex.dev');
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

  it('FAQ has 5 entries (no open-source question)', () => {
    expect(FAQ).toHaveLength(5);
    for (const entry of FAQ) {
      expect(entry.question).not.toMatch(/open[\s-]?source/i);
      expect(entry.answer).not.toMatch(/open[\s-]?source/i);
      expect(entry.answer).not.toMatch(/apache 2\.0/i);
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
