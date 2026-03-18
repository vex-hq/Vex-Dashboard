import 'server-only';

import { cache } from 'react';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { getAgentGuardPool } from '~/lib/agentguard/db';

/**
 * Resolve a MakerKit account slug to an AgentGuard org_id.
 *
 * Lookup order:
 *  1. Match on `organizations.account_slug`
 *  2. Fallback: match on `organizations.org_id` directly
 *  3. Auto-provision: look up account UUID from Supabase by slug,
 *     then create a new organization using that UUID as org_id
 *
 * The result is memoised per request via React's `cache()`.
 */
export const resolveOrgId = cache(
  async (accountSlug: string): Promise<string> => {
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
  },
);
