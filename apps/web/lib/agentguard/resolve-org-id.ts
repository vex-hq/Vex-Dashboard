import 'server-only';

import { cache } from 'react';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { getAgentGuardPool } from '~/lib/agentguard/db';
import { requireAccountMembership } from '~/lib/agentguard/require-account-membership';

/**
 * Resolve a MakerKit account slug to an AgentGuard org_id — WITHOUT any
 * authorisation check.
 *
 * The AgentGuard pool is a raw pg connection: it does not run under Supabase
 * RLS, so nothing here constrains the result to workspaces the caller may see.
 * Never call this with a client-supplied slug.
 *
 * Lookup order:
 *  1. Match on `organizations.account_slug`
 *  2. Fallback: match on `organizations.org_id` directly
 *  3. Auto-provision: look up account UUID from Supabase by slug,
 *     then create a new organization using that UUID as org_id
 */
async function resolveOrgIdUnchecked(accountSlug: string): Promise<string> {
  const pool = getAgentGuardPool();

  // Try account_slug first
  const result = await pool.query<{ org_id: string }>(
    'SELECT org_id FROM organizations WHERE account_slug = $1',
    [accountSlug],
  );

  if (result.rows.length > 0) {
    return result.rows[0]!.org_id;
  }

  // Fallback: try using the slug as org_id directly (only if it looks like a UUID)
  const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (UUID_RE.test(accountSlug)) {
    const fallback = await pool.query<{ org_id: string }>(
      'SELECT org_id FROM organizations WHERE org_id = $1',
      [accountSlug],
    );

    if (fallback.rows.length > 0) {
      return fallback.rows[0]!.org_id;
    }
  }

  // Auto-provision: look up the Supabase account UUID by slug
  const supabase = getSupabaseServerClient();
  const { data: account } = await supabase
    .from('accounts')
    .select('id')
    .eq('slug', accountSlug)
    .single();

  if (!account) {
    throw new Error(`No Supabase account found for slug: ${accountSlug}`);
  }

  const orgId = account.id;
  const inserted = await pool.query<{ org_id: string }>(
    `INSERT INTO organizations (org_id, name, api_keys, account_slug)
     VALUES ($1, $2, '[]'::jsonb, $3)
     ON CONFLICT (org_id) DO UPDATE SET account_slug = EXCLUDED.account_slug
     RETURNING org_id`,
    [orgId, accountSlug, accountSlug],
  );

  return inserted.rows[0]!.org_id;
}

/**
 * Resolve a MakerKit account slug to an AgentGuard org_id, after asserting the
 * CURRENT USER is a member of that account.
 *
 * SECURITY: the membership guard lives inside this function on purpose. Account
 * slugs arrive from the client (URL segments, server-action payloads, query
 * params) and the org lookup runs on the raw pg pool, which bypasses RLS. If
 * the guard were left to individual call sites it would eventually be missed;
 * here every caller is protected by default.
 *
 * The result is memoised per request via React's `cache()`, so the membership
 * check costs at most one extra query per request per slug.
 *
 * @throws {import('./require-account-membership').AccountMembershipError} when
 *   the caller is not a member of `accountSlug` (fails closed).
 */
export const resolveOrgId = cache(
  async (accountSlug: string): Promise<string> => {
    await requireAccountMembership(accountSlug);

    return resolveOrgIdUnchecked(accountSlug);
  },
);

/**
 * Resolve a MakerKit account slug to an AgentGuard org_id with NO membership
 * check.
 *
 * SERVER-TRUSTED CONTEXTS ONLY: use this only where there is no user session to
 * authorise against — Stripe/billing webhooks, database webhooks, cron jobs and
 * super-admin flows. Callers MUST have established authorisation by other means
 * (verified webhook signature, shared secret, admin-only route guard) BEFORE
 * calling this.
 *
 * If a user session is available, use {@link resolveOrgId} instead.
 *
 * As of this change there are no call sites: every current caller runs with an
 * authenticated user session and uses the guarded {@link resolveOrgId}.
 */
export const resolveOrgIdAsSystem = cache(
  async (accountSlug: string): Promise<string> =>
    resolveOrgIdUnchecked(accountSlug),
);
