'use server';

import { enhanceAction } from '@kit/next/actions';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import {
  approveAuthorization,
  denyAuthorization,
  getAuthorizationDetails,
} from '~/lib/oauth/consent-service';

import { ConsentDecisionSchema } from '../schema/consent.schema';

/**
 * Submit the user's consent decision (approve or deny).
 *
 * Security design:
 * - Client identity is always re-fetched server-side from the authorization id;
 *   it is never taken from the form submission (prevents a forged clientId from
 *   binding a grant to a different OAuth client).
 * - Workspace membership is validated server-side under RLS before any grant
 *   is written; a forged or inaccessible slug is rejected with a clear error.
 * - Only team accounts (`is_personal_account = false`) are accepted; a slug
 *   that resolves to a personal account is rejected.
 * - Grant writes follow a strict revoke-then-insert order so a single active
 *   grant per (user, client) is maintained.
 * - If `approveAuthorization` throws after the grant row is inserted, a
 *   compensating revoke is applied before re-throwing, ensuring no orphaned
 *   active grant is left behind.
 */
export const submitConsentAction = enhanceAction(
  async (data, user) => {
    const client = getSupabaseServerClient();

    // ── Deny path ──────────────────────────────────────────────────────────
    if (data.decision === 'deny') {
      const { redirectTo } = await denyAuthorization(
        client,
        data.authorizationId,
      );
      return { redirectTo };
    }

    // ── Approve path ────────────────────────────────────────────────────────

    // accountSlug is required for approve (enforced by the Zod refine).
    // The non-null assertion is safe here because the schema guarantees it.
    const accountSlug = data.accountSlug!;

    // 1. Re-fetch authorization details server-side to obtain the clientId.
    //    Never trust form data for client identity.
    const consentResult = await getAuthorizationDetails(
      client,
      data.authorizationId,
    );

    if (consentResult.kind === 'already_consented') {
      return { redirectTo: consentResult.redirectTo };
    }

    const { clientId } = consentResult.details;

    // 2. Validate workspace membership under RLS.
    //    The query returns no rows if the user cannot read the account, which
    //    also covers the case of an invalid slug.
    const { data: account, error: accountError } = await client
      .from('accounts')
      .select('id, slug, is_personal_account')
      .eq('slug', accountSlug)
      .maybeSingle();

    if (accountError) {
      throw new Error(
        `Failed to validate workspace membership: ${accountError.message}`,
      );
    }

    if (!account) {
      throw new Error(
        'The selected workspace is not accessible. Please choose a workspace you are a member of.',
      );
    }

    if (account.is_personal_account) {
      throw new Error(
        'OAuth grants cannot be issued to personal accounts. Please select a team workspace.',
      );
    }

    // 3. Revoke any existing active grant for (user, client).
    //    This ensures the partial unique index constraint is satisfied before
    //    the new insert.
    const { error: revokeError } = await client
      .from('oauth_grants')
      .update({ revoked_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('oauth_client_id', clientId)
      .is('revoked_at', null);

    if (revokeError) {
      throw new Error(
        `Failed to revoke existing grant: ${revokeError.message}`,
      );
    }

    // 4. Insert the new grant row.
    const { data: insertedGrant, error: insertError } = await client
      .from('oauth_grants')
      .insert({
        user_id: user.id,
        oauth_client_id: clientId,
        account_slug: accountSlug,
      })
      .select('id')
      .single();

    if (insertError || !insertedGrant) {
      throw new Error(`Failed to record grant: ${insertError?.message ?? 'unknown error'}`);
    }

    // 5. Approve the authorization via Supabase OAuth.
    //    If this throws, perform a compensating revoke of the just-inserted
    //    grant so no orphaned active grant is left behind.
    let redirectTo: string;

    try {
      const result = await approveAuthorization(client, data.authorizationId);
      redirectTo = result.redirectTo;
    } catch (approvalError) {
      // Compensating revoke: mark the inserted grant as revoked.
      await client
        .from('oauth_grants')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', insertedGrant.id)
        .is('revoked_at', null);

      throw approvalError;
    }

    return { redirectTo };
  },
  {
    schema: ConsentDecisionSchema,
  },
);
