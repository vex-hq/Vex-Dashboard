import 'server-only';

import { cache } from 'react';

import { loadTeamWorkspace } from './team-account-workspace.loader';

/**
 * Who is looking at this workspace.
 *
 * One place resolves "the signed-in user" and "is that user an org admin", so
 * no page re-derives either. Every memory surface takes its user id from here
 * and never from a URL segment, query string or form field — a user id that
 * arrives from the client is an attacker-chosen user id.
 *
 * `userId` is the Supabase auth UUID, which is exactly what the engine stores
 * in `session_memories.user_id` (it resolves the OAuth principal's user id, or
 * an API key's `created_by`). No mapping table is needed.
 */
export interface AccountViewer {
  readonly userId: string;
  readonly isOrgAdmin: boolean;
  readonly accountSlug: string;
}

/**
 * Admin means "can manage this account's members".
 *
 * That widens the Projects tab to every project in the org and unlocks the
 * org-wide storage total. It grants NOTHING in the private scope — see
 * `private-memory.loader`, which has no admin path at all.
 */
const ADMIN_PERMISSION = 'members.manage';

export const loadAccountViewer = cache(
  async (accountSlug: string): Promise<AccountViewer> => {
    const workspace = await loadTeamWorkspace(accountSlug);

    return {
      userId: workspace.user.id,
      isOrgAdmin: workspace.account.permissions.includes(ADMIN_PERMISSION),
      accountSlug,
    };
  },
);
