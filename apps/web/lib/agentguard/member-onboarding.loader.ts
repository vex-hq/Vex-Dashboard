import 'server-only';

import { cache } from 'react';

import { requireUser } from '@kit/supabase/require-user';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { requireMemberAccountId } from './require-account-membership';
import { workspaceEntryPath } from './workspace-entry-path';

/**
 * This member's Klio connect state for one workspace.
 *
 * Independent of `accounts.onboarding_completed`. An invitee must be able
 * to connect after the creator already finished workspace onboarding.
 */
export const loadMemberOnboarded = cache(
  async (accountSlug: string): Promise<boolean> => {
    const client = getSupabaseServerClient();
    const { data: user } = await requireUser(client);

    if (!user) {
      return false;
    }

    const accountId = await requireMemberAccountId(accountSlug);

    const { data, error } = await client
      .from('accounts_memberships')
      .select('klio_onboarded_at')
      .eq('account_id', accountId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (error || !data) {
      return false;
    }

    return data.klio_onboarded_at !== null;
  },
);

/**
 * Mark the signed-in member as finished with join connect.
 * Idempotent. Uses a SECURITY DEFINER RPC so we never open a general
 * UPDATE on `accounts_memberships` (that table also holds `account_role`).
 */
export async function markMemberOnboarded(accountSlug: string): Promise<void> {
  const accountId = await requireMemberAccountId(accountSlug);
  const client = getSupabaseServerClient();

  const { error } = await client.rpc('mark_membership_klio_onboarded', {
    target_account_id: accountId,
  });

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Redirect a member to the wizard they still owe, or null if they can
 * stay on Hub.
 */
export const loadWorkspaceEntryRedirect = cache(
  async (accountSlug: string): Promise<string | null> => {
    const client = getSupabaseServerClient();
    const { data: user } = await requireUser(client);

    if (!user) {
      return '/auth/sign-in';
    }

    const { data: account, error } = await client
      .from('accounts')
      .select('id, onboarding_completed, primary_owner_user_id')
      .eq('slug', accountSlug)
      .maybeSingle();

    if (error || !account) {
      return null;
    }

    const { data: membership } = await client
      .from('accounts_memberships')
      .select('klio_onboarded_at')
      .eq('account_id', account.id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!membership) {
      return null;
    }

    return workspaceEntryPath(accountSlug, {
      workspaceCompleted: account.onboarding_completed,
      memberOnboarded: membership.klio_onboarded_at !== null,
      isPrimaryOwner: account.primary_owner_user_id === user.id,
    });
  },
);
