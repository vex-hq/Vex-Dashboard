import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * A single active OAuth grant row as returned by the loader.
 *
 * `revoked_at` is excluded from the select — the query filters it out via
 * `.is('revoked_at', null)`, so every row returned is guaranteed active.
 */
export interface ConnectedApp {
  id: string;
  oauth_client_id: string;
  account_slug: string;
  created_at: string;
}

/**
 * Load all active OAuth grants for the authenticated user.
 *
 * RLS on `public.oauth_grants` automatically scopes the query to the
 * signed-in user's rows — no manual `user_id` filter is required here.
 * The `.is('revoked_at', null)` call ensures only active grants are returned.
 *
 * Results are ordered newest-first so that the most recently connected app
 * appears at the top of the settings table.
 */
export async function loadConnectedApps(
  client: SupabaseClient,
): Promise<ConnectedApp[]> {
  const { data, error } = await client
    .from('oauth_grants')
    .select('id, oauth_client_id, account_slug, created_at')
    .is('revoked_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to load connected apps: ${error.message}`);
  }

  return (data ?? []) as ConnectedApp[];
}
