import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

import { ORG } from '~/lib/site-meta';

/**
 * Guards against the rename debt this test was written to clear.
 *
 * The landing site moved from tryvex.dev to klio.tech, but 62 hardcoded
 * references survived across 28 files — including `sitemap.ts` and
 * `robots.ts`, which were telling search engines the canonical domain was
 * still the old one, and `/llms.txt`, which was handing agents dead docs and
 * app URLs. None of it was caught, because the suite asserted the old brand.
 *
 * This replaces `no-oss-claims.test.ts`, a Vex-era guard that forbade the
 * phrase "open source" — a rule reversed when Klio went open-core, and one
 * that had been failing on seven files for long enough to be noise.
 *
 * Wire-protocol identifiers (`X-Vex-Key`, `vex_plan`, `VEX_*` env vars) are
 * deliberately NOT covered: they live in code, not copy, and renaming them
 * would break live clients.
 */
const STALE_DOMAIN = /\btryvex\.dev\b/i;
const STALE_HANDLE = /@tryvex\b/i;

const SCAN_DIRS = ['app', 'lib'] as const;
const SKIP_DIRS = new Set(['node_modules', '.next', 'venv', '__tests__']);
const FILE_EXTS = ['.ts', '.tsx', '.mdx'];

const LANDING_ROOT = join(import.meta.dirname, '..');

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      yield* walk(join(dir, entry.name));
    } else if (FILE_EXTS.some((ext) => entry.name.endsWith(ext))) {
      yield join(dir, entry.name);
    }
  }
}

describe('no stale domains in user-facing source', () => {
  const files = SCAN_DIRS.flatMap((dir) => [...walk(join(LANDING_ROOT, dir))]);

  it('scans a non-trivial number of files', () => {
    // A walk that silently matched nothing would make every assertion vacuous.
    expect(files.length).toBeGreaterThan(50);
  });

  for (const absFile of files) {
    const relFile = relative(LANDING_ROOT, absFile);

    it(`${relFile}: points at live domains only`, () => {
      const source = readFileSync(absFile, 'utf8');
      expect(source, `${relFile} still references the retired domain`).not.toMatch(
        STALE_DOMAIN,
      );
      expect(source, `${relFile} still references the retired X handle`).not.toMatch(
        STALE_HANDLE,
      );
    });
  }

  it('the canonical origin is the one everything derives from', () => {
    expect(ORG.url).toBe('https://klio.tech');
  });
});
