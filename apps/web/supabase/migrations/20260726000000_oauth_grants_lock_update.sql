/*
 * Lock down UPDATE on public.oauth_grants.
 *
 * PROBLEM
 * -------
 * `20260611000000_oauth_grants.sql` granted table-wide UPDATE to
 * `authenticated`, and the `oauth_grants_update` policy only checks
 * `auth.uid() = user_id` on both USING and WITH CHECK. A row's `user_id` never
 * changes under that policy, so a user could PATCH their OWN row and repoint
 * `account_slug` at any workspace — including one they are not a member of —
 * silently re-binding an active OAuth/MCP grant to a victim's workspace. The
 * INSERT policy validates the slug against readable (RLS-scoped) accounts, but
 * UPDATE re-validated nothing.
 *
 * FIX (defence in depth, two independent layers)
 * ----------------------------------------------
 *  1. Privilege: `authenticated` loses table-wide UPDATE and regains it on the
 *     `revoked_at` column only — the sole field the product ever lets a user
 *     mutate (soft-revoke from the Connected-apps settings page). RLS WITH
 *     CHECK cannot reference OLD, so column privileges do the structural work.
 *  2. Trigger: `account_slug`, `user_id`, `oauth_client_id` and `id` are
 *     immutable on UPDATE for EVERY role, including `service_role`. This holds
 *     even if a future migration re-grants table-wide UPDATE.
 *
 * Nothing legitimately rewrites those columns: re-consenting to a different
 * workspace revokes the old row and INSERTs a new one (see
 * `app/oauth/consent/_lib/server/consent-actions.ts`), and the settings page
 * only sets `revoked_at`.
 *
 * The SELECT and INSERT policies from the original migration are intentionally
 * left untouched — the INSERT policy is already safe. This migration is
 * re-runnable.
 */

-- ── Layer 1: column-level UPDATE privilege ──────────────────────────────────
-- Drop the table-wide grant, then re-grant only `revoked_at`. Re-running is a
-- no-op: `revoke` on an absent privilege and `grant` of an existing one both
-- succeed silently.
revoke update on public.oauth_grants from authenticated;

grant update (revoked_at) on public.oauth_grants to authenticated;

-- `service_role` keeps table-wide UPDATE (the engine and server-side flows run
-- as service_role); the trigger below is what constrains it.

-- ── Layer 2: immutability trigger ───────────────────────────────────────────
create or replace function public.oauth_grants_prevent_identity_change ()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id is distinct from old.id
     or new.user_id is distinct from old.user_id
     or new.oauth_client_id is distinct from old.oauth_client_id
     or new.account_slug is distinct from old.account_slug
  then
    raise exception
      'oauth_grants: id, user_id, oauth_client_id and account_slug are immutable; revoke the grant and create a new one instead'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

comment on function public.oauth_grants_prevent_identity_change () is
  'Blocks UPDATEs that would re-point an OAuth grant at a different user, client or workspace';

revoke all on function public.oauth_grants_prevent_identity_change () from public;

drop trigger if exists oauth_grants_prevent_identity_change on public.oauth_grants;

create trigger oauth_grants_prevent_identity_change
  before update on public.oauth_grants
  for each row
  execute function public.oauth_grants_prevent_identity_change ();
