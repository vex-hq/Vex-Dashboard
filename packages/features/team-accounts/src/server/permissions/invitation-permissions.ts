import 'server-only';

import { getLogger } from '@kit/shared/logger';
import { Database } from '@kit/supabase/database';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

/**
 * The minimum shape an invitation needs for a permission decision.
 *
 * Structural on purpose so any caller (the team-members invite form, the
 * onboarding wizard, …) can pass its own narrower invitation type.
 */
export interface InvitationPermissionInput {
  readonly email: string;
  readonly role: string;
}

export interface InvitationPermissionResult {
  readonly allowed: boolean;
  readonly reason?: string;
}

const INVITES_MANAGE_PERMISSION =
  'invites.manage' as Database['public']['Enums']['app_permissions'];

/**
 * @name checkInvitationPermissions
 * @description Checks if the user has permission to invite members and
 * validates role hierarchy for each invitation.
 *
 * This is the authorisation gate that MUST run before any invitation is written
 * with the service-role admin client (which bypasses RLS). It answers two
 * questions:
 *
 *  1. Does the caller hold `invites.manage` on this account?
 *  2. For every distinct role being invited, is the caller's own role at least
 *     as elevated? (Stops a member from inviting themselves — or anyone — as
 *     an owner.)
 *
 * Optimized to batch all checks in parallel.
 *
 * @param accountId - The target account UUID. Resolve this from a slug under
 *   RLS (or another trusted source) BEFORE calling — this function does not
 *   validate that the caller can see the account.
 * @param userId - The authenticated caller.
 * @param invitations - The invitations being requested.
 */
export async function checkInvitationPermissions(
  accountId: string,
  userId: string,
  invitations: readonly InvitationPermissionInput[],
): Promise<InvitationPermissionResult> {
  const client = getSupabaseServerClient();
  const logger = await getLogger();

  const ctx = {
    name: 'checkInvitationPermissions',
    userId,
    accountId,
  };

  // Get unique roles from invitations to minimize RPC calls
  const uniqueRoles = [...new Set(invitations.map((inv) => inv.role))];

  // Run all checks in parallel: permission check + role hierarchy checks for each unique role
  const [permissionResult, ...roleResults] = await Promise.all([
    client.rpc('has_permission', {
      user_id: userId,
      account_id: accountId,
      permission_name: INVITES_MANAGE_PERMISSION,
    }),
    ...uniqueRoles.map((role) =>
      Promise.all([
        client.rpc('has_more_elevated_role', {
          target_user_id: userId,
          target_account_id: accountId,
          role_name: role,
        }),
        client.rpc('has_same_role_hierarchy_level', {
          target_user_id: userId,
          target_account_id: accountId,
          role_name: role,
        }),
      ]).then(([elevated, sameLevel]) => ({
        role,
        allowed: elevated.data || sameLevel.data,
      })),
    ),
  ]);

  // Check permission first
  if (!permissionResult.data) {
    logger.info(ctx, 'User does not have invites.manage permission');

    return {
      allowed: false,
      reason: 'You do not have permission to invite members',
    };
  }

  // Check role hierarchy results
  const failedRole = roleResults.find((result) => !result.allowed);

  if (failedRole) {
    logger.info(
      { ...ctx, role: failedRole.role },
      'User cannot invite to a role higher than their own',
    );

    return {
      allowed: false,
      reason: `You cannot invite members with the "${failedRole.role}" role`,
    };
  }

  return { allowed: true };
}
