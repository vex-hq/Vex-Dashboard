import { describe, expect, it } from 'vitest';

import { PLANS } from '~/lib/pricing';
import { buildLlmsTxt } from '~/lib/seo/llms-txt';
import { APP_URL, DOCS_URL, ORG, POSITIONING_SENTENCE } from '~/lib/site-meta';

/**
 * These assertions deliberately derive from `site-meta` and `pricing` rather
 * than repeating brand strings. The previous version hardcoded "Vex" and
 * "tryvex.dev", so it kept asserting an identity the product had already left
 * behind — the test rotted instead of catching the drift.
 */
describe('lib/seo/llms-txt', () => {
  const body = buildLlmsTxt();

  it('starts with the canonical product header', () => {
    expect(body.startsWith(`# ${ORG.name}\n`)).toBe(true);
  });

  it('includes the positioning sentence verbatim', () => {
    expect(body).toContain(POSITIONING_SENTENCE);
  });

  it('includes every plan name', () => {
    for (const plan of PLANS) {
      expect(body).toContain(plan.name);
    }
    expect(body).toContain('Enterprise');
  });

  it('quotes a real lever for every plan', () => {
    // Guards the bug this file shipped with: the quoted lever was looked up by
    // a label no plan carried, so every line rendered an empty field between
    // two separators. The lever is now who the memory is shared with, since
    // nothing is metered — if that label is renamed in PLANS without renaming
    // QUOTED_LEVER here, this fails rather than silently emitting blanks.
    expect(body).not.toMatch(/·\s+·/);
    for (const plan of PLANS) {
      const line = body
        .split('\n')
        .find((l) => l.startsWith(`- ${plan.name} —`));
      expect(line, `no line for plan ${plan.name}`).toBeDefined();
      expect(line).toContain('shared with:');
    }
  });

  it('marks per-seat plans with a per-user unit', () => {
    // "$20/mo" for a team plan reads as $20 for the whole team.
    for (const plan of PLANS.filter((p) => p.priceUnit === 'seat')) {
      const line = body
        .split('\n')
        .find((l) => l.startsWith(`- ${plan.name} —`));
      expect(line).toContain('/user/mo');
    }
  });

  it('points to the machine-readable pricing endpoint', () => {
    expect(body).toContain(`${ORG.url}/api/pricing`);
  });

  it('only advertises URLs on live product domains', () => {
    const urls = body.match(/https:\/\/[^\s)]+/g) ?? [];
    expect(urls.length).toBeGreaterThan(0);
    for (const url of urls) {
      expect(new URL(url).hostname).toMatch(/(^|\.)klio\.tech$/);
    }
    expect(body).toContain(DOCS_URL);
    expect(body).toContain(APP_URL);
  });

  it('matches snapshot', () => {
    expect(body).toMatchSnapshot();
  });
});
