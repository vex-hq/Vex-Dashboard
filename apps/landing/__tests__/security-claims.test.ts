/**
 * Guard: security claims must name the deployment they are true of.
 *
 * The self-hosted engine encrypts memory at rest under a key the operator
 * owns and chains every write with SHA-256. Klio Cloud does neither: it
 * encrypts in transit and at rest at the infrastructure level under keys we
 * manage, redacts secrets/PII before storage, and isolates per org — there is
 * no user-held key and no hash chain. Stating either claim unqualified is
 * false for every Cloud user.
 *
 * So: any user-facing string that mentions a user-held encryption key or the
 * hash chain must carry a self-host qualifier nearby. Sibling of
 * `no-oss-claims.test.ts`, same walk/scan shape.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, it } from 'vitest';

const LANDING_ROOT = join(import.meta.dirname, '..');

/** Claims that are only true of the self-hosted engine. */
const QUALIFIED_CLAIM_PATTERNS: ReadonlyArray<{
  name: string;
  pattern: RegExp;
}> = [
  {
    name: 'user-held encryption key',
    pattern:
      /(?:key you (?:hold|own)|user-owned key|user-held key|encrypted[^.!?]{0,40}under (?:a |the |your )?(?:own )?key|under your own key)/gi,
  },
  {
    name: 'SHA-256 hash chain',
    pattern:
      /(?:hash[\s-]?chain|chained with sha-?256|sha-?256|tamper-evident)/gi,
  },
];

/**
 * Phrasings that scope a claim to the self-hosted engine. "Local-first" alone
 * is NOT enough — Cloud users read the same sentence.
 */
const SELF_HOST_QUALIFIER = /self[\s-]?host/i;

/**
 * Characters of surrounding text searched for a qualifier. Wide enough to span
 * an adjacent object property (`{ value: 'SHA-256', label: '… (self-hosted)' }`)
 * but not a whole file.
 */
const QUALIFIER_WINDOW = 240;

/**
 * A *denied* mention ("Cloud writes are not hash-chained today") is a
 * disclaimer, not a claim, and needs no self-host qualifier. Matched against
 * the text immediately before the phrase, within the same clause.
 */
const NEGATION_BEFORE =
  /\b(?:not|never|no|isn't|aren't|without)\b[^.!?]{0,40}$/i;

const NEGATION_WINDOW = 60;

const SCAN_DIRS: ReadonlyArray<string> = ['app', 'lib'];

const SKIP_DIRS = new Set(['node_modules', '.next', 'venv', '__tests__']);

const FILE_EXTS = ['.ts', '.tsx', '.mdx'];

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

function stripComments(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|\s)\/\/[^\n]*/g, '$1');
}

function lineOf(text: string, index: number): number {
  return text.slice(0, index).split('\n').length;
}

function isQualified(text: string, index: number, length: number): boolean {
  const window = text.slice(
    Math.max(0, index - QUALIFIER_WINDOW),
    index + length + QUALIFIER_WINDOW,
  );

  return SELF_HOST_QUALIFIER.test(window);
}

function isNegated(text: string, index: number): boolean {
  const before = text.slice(Math.max(0, index - NEGATION_WINDOW), index);

  return NEGATION_BEFORE.test(before);
}

describe('security claims are scoped to the deployment they hold for', () => {
  for (const scanDir of SCAN_DIRS) {
    const absDir = join(LANDING_ROOT, scanDir);

    for (const absFile of walk(absDir)) {
      const relFile = relative(LANDING_ROOT, absFile);

      it(`${relFile}: no unqualified user-key or hash-chain claim`, () => {
        const stripped = stripComments(readFileSync(absFile, 'utf8'));

        for (const { name, pattern } of QUALIFIED_CLAIM_PATTERNS) {
          for (const match of stripped.matchAll(pattern)) {
            const index = match.index ?? 0;

            if (isQualified(stripped, index, match[0].length)) continue;
            if (isNegated(stripped, index)) continue;

            throw new Error(
              `Unqualified "${name}" claim at ${relFile}:${lineOf(stripped, index)} → "${match[0]}". ` +
                `This is only true of the self-hosted engine; Klio Cloud has neither a ` +
                `user-held key nor a hash chain. Say "self-hosted" in the same copy, or ` +
                `state what Klio Cloud actually does.`,
            );
          }
        }
      });
    }
  }
});
