import 'server-only';

import { cache } from 'react';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

/**
 * Single, stable message for every membership rejection.
 *
 * Deliberately opaque: it never distinguishes "this workspace does not exist"
 * from "you are not a member of it", so the guard cannot be used to enumerate
 * workspace slugs.
 */
export const ACCOUNT_MEMBERSHIP_FORBIDDEN_MESSAGE =
  'Forbidden: not a member of this account';

/**
 * Thrown when the caller is not an authorised member of the requested account.
 *
 * Typed so call sites (route handlers, server actions) can map it to a 403
 * instead of a generic 500 without string-matching the message.
 */
export class AccountMembershipError extends Error {
  constructor(detail?: string, options?: { cause?: unknown }) {
    const message = detail
      ? `${ACCOUNT_MEMBERSHIP_FORBIDDEN_MESSAGE} (${detail})`
      : ACCOUNT_MEMBERSHIP_FORBIDDEN_MESSAGE;

    super(message, options);

    this.name = 'AccountMembershipError';
  }
}

type MembershipLookup =
  | { readonly ok: true; readonly accountId: string }
  | { readonly ok: false; readonly detail: string; readonly cause?: unknown };

/**
 * Read the account row for `accountSlug` through the RLS-scoped USER client.
 *
 * Why this is a sufficient membership check for team accounts:
 *
 *  - The `accounts_read` policy is
 *      `auth.uid() = primary_owner_user_id
 *       OR has_role_on_account(id)
 *       OR is_account_team_member(id)`.
 *  - `slug` is `NOT NULL` only for team accounts — the
 *    `accounts_slug_null_if_personal_account_true` constraint forces personal
 *    accounts to `slug IS NULL` — so filtering by slug can only ever match a
 *    team account.
 *  - `is_account_team_member(id)` compares `id` against membership *user* ids,
 *    so it is never true for a team account id.
 *
 * The policy therefore collapses to "primary owner OR has a membership row",
 * i.e. exactly the membership check we want. A non-member gets zero rows.
 *
 * Every failure mode is folded into a not-ok result so the caller can fail
 * CLOSED — a transport error must never read as "authorised".
 */
async function lookupMembership(
  accountSlug: string,
): Promise<MembershipLookup> {
  try {
    const client = getSupabaseServerClient();

    const { data, error } = await client
      .from('accounts')
      .select('id')
      .eq('slug', accountSlug)
      .maybeSingle();

    if (error) {
      return { ok: false, detail: 'membership lookup failed', cause: error };
    }

    if (!data) {
      return { ok: false, detail: 'no readable account for this slug' };
    }

    return { ok: true, accountId: data.id };
  } catch (cause) {
    return { ok: false, detail: 'membership lookup errored', cause };
  }
}

/**
 * Assert that the CURRENT USER is a member of the team account identified by
 * `accountSlug`, and return that account's UUID.
 *
 * Use this when the account id is needed for a follow-up authorisation check
 * (permission RPCs, role-hierarchy checks). Use {@link requireAccountMembership}
 * when only the assertion is needed.
 *
 * Memoised per request via React's `cache()`.
 *
 * @throws {AccountMembershipError} when the caller is not a member, the slug is
 *   blank/unknown, or the check could not be completed (fail closed).
 */
export const requireMemberAccountId = cache(
  async (accountSlug: string): Promise<string> => {
    if (accountSlug.trim().length === 0) {
      throw new AccountMembershipError('blank account slug');
    }

    const result = await lookupMembership(accountSlug);

    if (!result.ok) {
      throw new AccountMembershipError(result.detail, { cause: result.cause });
    }

    return result.accountId;
  },
);

/**
 * Assert that the CURRENT USER is a member of the team account identified by
 * `accountSlug`.
 *
 * This is the authorisation choke point for every code path that accepts an
 * account slug from the client. It must be called before any query that
 * bypasses RLS (e.g. the raw AgentGuard pg pool) or that runs under the
 * service-role admin client.
 *
 * @throws {AccountMembershipError} when the caller is not a member, the slug is
 *   blank/unknown, or the check could not be completed (fail closed).
 */
export async function requireAccountMembership(
  accountSlug: string,
): Promise<void> {
  await requireMemberAccountId(accountSlug);
}
