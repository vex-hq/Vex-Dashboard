import { PGlite } from '@electric-sql/pglite';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * THE KEY CAP IS A SQL PREDICATE, so this runs against a real Postgres
 * (PGlite, in-process — no Docker, no network) rather than a mocked pool.
 * A mock would prove the TypeScript and nothing about whether the count
 * actually excludes revoked keys.
 *
 * THE BUG THIS PINS. `MAX_KEYS_PER_ORG` was compared against
 * `jsonb_array_length(api_keys)` — the length of the WHOLE array, revoked
 * entries included. Revoking therefore never freed a slot, and onboarding is
 * the biggest producer of revoked keys: `createJoinKeyAction` revokes the
 * caller's previous key and mints a new one every time they open the connect
 * screen. So the onboarding flow reliably bricked itself — after ten visits
 * over a workspace's life, nobody in that org could ever mint a key again,
 * and the screen said only "Couldn't create a key."
 *
 * Observed in production on `klio-internal` (10 stored / 6 active) and, most
 * plainly, on `test-2`: 7 stored, 1 active, six slots held by tombstones.
 */

const db = new PGlite();

vi.mock('~/lib/agentguard/db', () => ({
  getAgentGuardPool: () => ({
    query: (sql: string, params?: unknown[]) => db.query(sql, params),
  }),
}));

const ORG = 'org-keycap';
const USER = '11111111-1111-1111-1111-111111111111';

const SCHEMA = `
CREATE TABLE organizations (
  org_id varchar PRIMARY KEY,
  account_slug varchar,
  api_keys jsonb NOT NULL DEFAULT '[]'::jsonb
);
`;

let createKey: typeof import('./api-keys').createKey;
let listKeys: typeof import('./api-keys').listKeys;
let revokeKey: typeof import('./api-keys').revokeKey;
let MAX_KEYS_PER_ORG: number;
let MAX_REVOKED_KEYS_KEPT: number;

beforeEach(async () => {
  const mod = await import('./api-keys');
  createKey = mod.createKey;
  listKeys = mod.listKeys;
  revokeKey = mod.revokeKey;
  MAX_KEYS_PER_ORG = mod.MAX_KEYS_PER_ORG;
  MAX_REVOKED_KEYS_KEPT = mod.MAX_REVOKED_KEYS_KEPT;

  await db.exec(`DROP TABLE IF EXISTS organizations; ${SCHEMA}`);
  await db.query(
    `INSERT INTO organizations (org_id, account_slug) VALUES ($1, $2)`,
    [ORG, 'keycap'],
  );
});

function mint(name: string) {
  return createKey({
    orgId: ORG,
    name,
    scopes: ['memory'],
    rateLimitRpm: 60,
    expiresAt: null,
    createdBy: USER,
  });
}

async function storedCount() {
  const { rows } = await db.query<{ n: number }>(
    `SELECT jsonb_array_length(api_keys) AS n FROM organizations WHERE org_id = $1`,
    [ORG],
  );

  return Number(rows[0]!.n);
}

describe('createKey — the cap counts live keys, not tombstones', () => {
  it('lets you mint again after revoking, at the cap', async () => {
    const minted = [];

    for (let i = 0; i < MAX_KEYS_PER_ORG; i++) {
      minted.push(await mint(`key-${i}`));
    }

    await expect(mint('one-too-many')).rejects.toThrow(/Maximum/);

    // Free exactly one slot. Under the bug this changed nothing, because the
    // revoked entry still occupied its place in the array.
    await revokeKey(ORG, minted[0]!.entry.id);

    const after = await mint('after-revoke');
    expect(after.key).toMatch(/^ag_live_/);
  });

  it('still refuses when every stored key is live', async () => {
    for (let i = 0; i < MAX_KEYS_PER_ORG; i++) {
      await mint(`key-${i}`);
    }

    // The positive control for the test above: if the cap were simply removed
    // rather than corrected, that test would pass and this one would fail.
    await expect(mint('one-too-many')).rejects.toThrow(/Maximum/);
  });

  it('keeps revoked keys visible for audit', async () => {
    const first = await mint('will-be-revoked');
    await revokeKey(ORG, first.entry.id);
    await mint('replacement');

    const keys = await listKeys(ORG);
    const revoked = keys.find((k) => k.id === first.entry.id);

    expect(revoked).toBeDefined();
    expect(revoked!.revoked).toBe(true);
  });

  it('bounds the array so tombstones cannot grow without limit', async () => {
    // The revoke-then-mint cycle the onboarding screen performs on every
    // visit. Without pruning this array grows forever, and every read of the
    // org row pays for it.
    const cycles = MAX_REVOKED_KEYS_KEPT + 5;

    for (let i = 0; i < cycles; i++) {
      const k = await mint(`cycle-${i}`);
      await revokeKey(ORG, k.entry.id);
    }

    expect(await storedCount()).toBeLessThanOrEqual(
      MAX_KEYS_PER_ORG + MAX_REVOKED_KEYS_KEPT,
    );
  });

  it('prunes the OLDEST tombstones, keeping the most recent', async () => {
    const ids: string[] = [];

    for (let i = 0; i < MAX_REVOKED_KEYS_KEPT + 3; i++) {
      const k = await mint(`cycle-${i}`);
      await revokeKey(ORG, k.entry.id);
      ids.push(k.entry.id);
      // created_at has second-and-finer resolution but these run inside one
      // millisecond; nudge the stored timestamp so ordering is unambiguous.
      await db.query(
        `UPDATE organizations
         SET api_keys = (
           SELECT jsonb_agg(
             CASE WHEN e->>'id' = $2
                  THEN jsonb_set(e, '{created_at}', to_jsonb($3::text))
                  ELSE e END)
           FROM jsonb_array_elements(api_keys) e)
         WHERE org_id = $1`,
        [ORG, k.entry.id, new Date(Date.now() + i * 1000).toISOString()],
      );
    }

    const keys = await listKeys(ORG);
    const survivingIds = new Set(keys.map((k) => k.id));

    expect(survivingIds.has(ids.at(-1)!)).toBe(true);
    expect(survivingIds.has(ids[0]!)).toBe(false);
  });
});
