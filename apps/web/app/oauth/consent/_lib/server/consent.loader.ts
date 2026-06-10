import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import type { AuthorizationDetails } from '~/lib/oauth/consent-service';
import { getAuthorizationDetails } from '~/lib/oauth/consent-service';

export interface WorkspaceOption {
  slug: string;
  name: string;
}

export interface ConsentLoaderResult {
  kind: 'consent_required';
  details: AuthorizationDetails;
  workspaces: WorkspaceOption[];
}

/**
 * Load the authorization details and the user's available team workspaces.
 *
 * Only team accounts (`is_personal_account = false`) are returned — the
 * product decision is that OAuth grants are scoped to team workspaces only.
 * RLS on the `accounts` table scopes the query to the authenticated user's
 * memberships automatically.
 *
 * Throws `ConsentServiceError` if the authorization id is invalid or expired.
 * Returns `null` in the `already_consented` case so the page can redirect
 * immediately; the caller is responsible for handling that branch.
 */
export async function loadConsentPage(
  client: SupabaseClient,
  authorizationId: string,
): Promise<
  ConsentLoaderResult | { kind: 'already_consented'; redirectTo: string }
> {
  const consentResult = await getAuthorizationDetails(client, authorizationId);

  if (consentResult.kind === 'already_consented') {
    return consentResult;
  }

  const { data: accounts, error } = await client
    .from('accounts')
    .select('slug, name')
    .eq('is_personal_account', false)
    .order('name', { ascending: true });

  if (error) {
    throw new Error(`Failed to load team workspaces: ${error.message}`);
  }

  const workspaces: WorkspaceOption[] = (accounts ?? [])
    .filter(
      (a): a is { slug: string; name: string } => typeof a.slug === 'string',
    )
    .map((a) => ({ slug: a.slug, name: a.name }));

  return {
    kind: 'consent_required' as const,
    details: consentResult.details,
    workspaces,
  };
}
