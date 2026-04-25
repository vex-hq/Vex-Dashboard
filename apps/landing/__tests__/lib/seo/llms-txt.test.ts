import { describe, expect, it } from 'vitest';
import { buildLlmsTxt } from '~/lib/seo/llms-txt';

describe('lib/seo/llms-txt', () => {
  const body = buildLlmsTxt();

  it('starts with Vex header', () => {
    expect(body.startsWith('# Vex\n')).toBe(true);
  });

  it('includes the positioning sentence', () => {
    expect(body).toContain('Vex helps founders shipping AI agents');
  });

  it('includes every plan name', () => {
    for (const name of ['Free', 'Starter', 'Pro', 'Team', 'Enterprise']) {
      expect(body).toContain(name);
    }
  });

  it('points to the machine-readable pricing endpoint', () => {
    expect(body).toContain('https://tryvex.dev/api/pricing');
  });

  it('contains no OSS claims', () => {
    expect(body).not.toMatch(/open[\s-]?source/i);
    expect(body).not.toMatch(/apache 2\.0/i);
  });

  it('matches snapshot', () => {
    expect(body).toMatchSnapshot();
  });
});
