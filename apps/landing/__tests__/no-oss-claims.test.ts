import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, it } from 'vitest';

const LANDING_ROOT = join(import.meta.dirname, '..');

const FORBIDDEN_PATTERNS: ReadonlyArray<{ name: string; pattern: RegExp }> = [
  { name: 'open source', pattern: /open[\s-]?source/i },
  { name: 'apache 2.0', pattern: /apache 2\.0/i },
  { name: 'agplv3', pattern: /agplv3/i },
  { name: 'mit license', pattern: /\bmit licen[cs]e\b/i },
];

const SCAN_DIRS: ReadonlyArray<string> = ['app', 'lib'];

const SKIP_DIRS = new Set(['node_modules', '.next', 'venv', '__tests__']);

const ALLOW_FILES = new Set<string>([
  // Legal text about the (still-Apache-2.0) SDK. Confirmed by user 2026-04-25.
  'app/terms/page.tsx',
]);

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

describe('no OSS claims in user-facing source', () => {
  for (const scanDir of SCAN_DIRS) {
    const absDir = join(LANDING_ROOT, scanDir);
    for (const absFile of walk(absDir)) {
      const relFile = relative(LANDING_ROOT, absFile);
      if (ALLOW_FILES.has(relFile)) continue;

      it(`${relFile}: contains no forbidden OSS phrases`, () => {
        const stripped = stripComments(readFileSync(absFile, 'utf8'));
        for (const { name, pattern } of FORBIDDEN_PATTERNS) {
          const match = stripped.match(pattern);
          if (match) {
            const lineNumber = stripped
              .slice(0, match.index ?? 0)
              .split('\n').length;
            throw new Error(
              `Forbidden phrase "${name}" found at ${relFile}:${lineNumber} → "${match[0]}"`,
            );
          }
        }
      });
    }
  }
});
