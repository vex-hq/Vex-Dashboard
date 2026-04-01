import 'server-only';

import { SupabaseClient } from '@supabase/supabase-js';

import { loadTeamWorkspace } from '~/home/[account]/_lib/server/team-account-workspace.loader';
import { canAddSeat } from '~/lib/agentguard/plan-limits';
import { Database } from '~/lib/database.types';

/**
 * Load data for the members page
 * @param client
 * @param slug
 */
export async function loadMembersPageData(
  client: SupabaseClient<Database>,
  slug: string,
) {
  return Promise.all([
    loadAccountMembers(client, slug),
    loadInvitations(client, slug),
    checkCanAddMember(client, slug),
    loadTeamWorkspace(slug),
  ]);
}

/**
 * Check if the account can add another member based on the active
 * subscription plan and current seat count.
 */
async function checkCanAddMember(
  client: SupabaseClient<Database>,
  slug: string,
): Promise<boolean> {
  // vex_plan is kept in sync with Stripe by the billing webhook.
  const { data: accountRow } = await client
    .from('accounts')
    .select('id, vex_plan')
    .eq('slug', slug)
    .single();

  if (!accountRow) {
    return false;
  }

  const plan = accountRow.vex_plan ?? 'free';

  const { count: memberCount } = await client
    .from('accounts_memberships')
    .select('*', { count: 'exact', head: true })
    .eq('account_id', accountRow.id);

  const seatCheck = canAddSeat(plan, memberCount ?? 0);

  return seatCheck.allowed;
}

/**
 * Load account members
 * @param client
 * @param account
 */
async function loadAccountMembers(
  client: SupabaseClient<Database>,
  account: string,
) {
  const { data, error } = await client.rpc('get_account_members', {
    account_slug: account,
  });

  if (error) {
    console.error(error);
    throw error;
  }

  return data ?? [];
}

/**
 * Load account invitations
 * @param client
 * @param account
 */
async function loadInvitations(
  client: SupabaseClient<Database>,
  account: string,
) {
  const { data, error } = await client.rpc('get_account_invitations', {
    account_slug: account,
  });

  if (error) {
    console.error(error);
    throw error;
  }

  return data ?? [];
}
