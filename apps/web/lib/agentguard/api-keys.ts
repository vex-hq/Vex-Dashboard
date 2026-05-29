import 'server-only';

import { createHash, randomBytes } from 'crypto';

import { getAgentGuardPool } from '~/lib/agentguard/db';
import type { ApiKeyDisplay, ApiKeyEntry } from '~/lib/agentguard/types';

const KEY_PREFIX = 'ag_live_';
const RANDOM_LENGTH = 32;
const MAX_KEYS_PER_ORG = 10;
const DISPLAY_PREFIX_LENGTH = 12; // "ag_live_k7xR"
const ALLOWED_SCOPES = new Set(['ingest', 'verify', 'read', 'memory']);

/**
 * Generate a cryptographically random API key.
 *
 * Format: `ag_live_` + 32 alphanumeric characters = 40 chars total.
 */
function generateRawKey(): string {
  const chars =
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const bytes = randomBytes(RANDOM_LENGTH);
  let result = '';

  for (let i = 0; i < RANDOM_LENGTH; i++) {
    result += chars[bytes[i]! % chars.length];
  }

  return KEY_PREFIX + result;
}

/**
 * SHA-256 hash a plaintext API key.
 */
function hashKey(plaintext: string): string {
  return createHash('sha256').update(plaintext, 'utf8').digest('hex');
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface CreateKeyParams {
  orgId: string;
  name: string;
  scopes: string[];
  rateLimitRpm: number;
  expiresAt: string | null;
  createdBy: string;
}

export interface CreateKeyResult {
  /** The full plaintext key — shown exactly once. */
  key: string;
  /** The key entry (without hash) for display. */
  entry: ApiKeyDisplay;
}

/**
 * Create a new API key for an organization.
 *
 * 1. Validates input (name, scopes, org key count).
 * 2. Generates a random key and SHA-256 hashes it.
 * 3. Appends the key entry to the `organizations.api_keys` JSONB array.
 * 4. Returns the full plaintext key (show-once) and the display entry.
 */
export async function createKey(
  params: CreateKeyParams,
): Promise<CreateKeyResult> {
  const { orgId, name, scopes, rateLimitRpm, expiresAt, createdBy } = params;

  // --- Validation ---
  if (!name || name.length > 100) {
    throw new Error('Key name must be 1-100 characters');
  }

  if (!scopes.length || !scopes.every((s) => ALLOWED_SCOPES.has(s))) {
    throw new Error(
      `Invalid scopes. Allowed: ${[...ALLOWED_SCOPES].join(', ')}`,
    );
  }

  if (rateLimitRpm < 1 || rateLimitRpm > 100_000) {
    throw new Error('Rate limit must be between 1 and 100,000 RPM');
  }

  const pool = getAgentGuardPool();

  // Check current key count
  const countResult = await pool.query<{ key_count: string }>(
    `SELECT COALESCE(jsonb_array_length(api_keys), 0) AS key_count
     FROM organizations WHERE org_id = $1`,
    [orgId],
  );

  if (!countResult.rows.length) {
    throw new Error('Organization not found');
  }

  const currentCount = parseInt(countResult.rows[0]!.key_count, 10);

  if (currentCount >= MAX_KEYS_PER_ORG) {
    throw new Error(
      `Maximum ${MAX_KEYS_PER_ORG} API keys per organization reached`,
    );
  }

  // --- Generate key ---
  const plaintext = generateRawKey();
  const keyHash = hashKey(plaintext);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const entry: ApiKeyEntry = {
    id,
    prefix: plaintext.slice(0, DISPLAY_PREFIX_LENGTH),
    key_hash: keyHash,
    name,
    scopes,
    rate_limit_rpm: rateLimitRpm,
    expires_at: expiresAt,
    created_at: now,
    created_by: createdBy,
    last_used_at: null,
    revoked: false,
  };

  // Append to JSONB array
  await pool.query(
    `UPDATE organizations
     SET api_keys = COALESCE(api_keys, '[]'::jsonb) || $2::jsonb
     WHERE org_id = $1`,
    [orgId, JSON.stringify([entry])],
  );

  // Return plaintext (show-once) and display-safe entry
  const { key_hash: _, ...displayEntry } = entry;

  return {
    key: plaintext,
    entry: displayEntry,
  };
}

/**
 * List all API keys for an organization (display-safe — no hashes).
 *
 * Returns keys sorted by created_at descending (newest first).
 */
export async function listKeys(orgId: string): Promise<ApiKeyDisplay[]> {
  const pool = getAgentGuardPool();

  const result = await pool.query<{ api_keys: ApiKeyEntry[] | null }>(
    `SELECT api_keys FROM organizations WHERE org_id = $1`,
    [orgId],
  );

  if (!result.rows.length) {
    return [];
  }

  const keys = result.rows[0]!.api_keys ?? [];

  return keys
    .map(({ key_hash: _, ...display }) => display)
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
}

/**
 * Revoke an API key by setting `revoked: true` in the JSONB array.
 *
 * Uses a JSONB path update to find the key by ID and set the flag.
 */
export async function revokeKey(
  orgId: string,
  keyId: string,
): Promise<boolean> {
  const pool = getAgentGuardPool();

  // Find the key's index in the JSONB array and set revoked=true
  const result = await pool.query(
    `UPDATE organizations
     SET api_keys = (
       SELECT jsonb_agg(
         CASE
           WHEN elem->>'id' = $2
           THEN jsonb_set(elem, '{revoked}', 'true'::jsonb)
           ELSE elem
         END
       )
       FROM jsonb_array_elements(COALESCE(api_keys, '[]'::jsonb)) AS elem
     )
     WHERE org_id = $1
       AND api_keys @> $3::jsonb
     RETURNING org_id`,
    [orgId, keyId, JSON.stringify([{ id: keyId }])],
  );

  return (result.rowCount ?? 0) > 0;
}
