/*
 * MCP OAuth grants: which team workspace a user connected to an OAuth client.
 *
 * A row binds (user, oauth_client_id) → one team workspace (account_slug).
 * Personal workspaces are not supported by the consent flow — users who want
 * to connect an OAuth client must create a team workspace first. The engine
 * treats `revoked_at IS NULL` as active; revoking from the Connected-apps
 * settings page sets `revoked_at` and takes effect within the engine's
 * auth-cache TTL. At most one ACTIVE grant per (user, client): re-consenting
 * to a different workspace revokes the previous grant first (handled by the
 * approve server action; the partial unique index enforces the invariant).
 */
create table if not exists public.oauth_grants (
  id            uuid        primary key default extensions.uuid_generate_v4(),
  user_id       uuid        not null references auth.users (id) on delete cascade,
  oauth_client_id text      not null,
  account_slug  text        not null,
  created_at    timestamptz not null default now(),
  revoked_at    timestamptz
);

comment on table public.oauth_grants is
  'Workspace consents for OAuth-connected MCP clients (active when revoked_at is null)';

comment on column public.oauth_grants.user_id is
  'The authenticated user who granted consent';

comment on column public.oauth_grants.oauth_client_id is
  'The OAuth client identifier (from the OAuth server)';

comment on column public.oauth_grants.account_slug is
  'The team workspace slug; personal workspaces are not supported by the consent flow';

comment on column public.oauth_grants.revoked_at is
  'Set to now() when the user revokes; null means the grant is active';

-- One ACTIVE grant per (user, client); a new consent revokes the previous
-- row before inserting (handled by the approve server action).
create unique index if not exists uq_oauth_grants_active
  on public.oauth_grants (user_id, oauth_client_id)
  where revoked_at is null;

-- Settings page lists a user's grants newest-first.
create index if not exists ix_oauth_grants_user
  on public.oauth_grants (user_id, created_at desc);

alter table public.oauth_grants enable row level security;

-- Revoke blanket privileges then re-grant only what each role needs.
revoke all on public.oauth_grants from authenticated, service_role;

-- Authenticated users: read, create, and soft-delete (update) their own rows.
grant select, insert, update on table public.oauth_grants to authenticated;

-- Service role: full access so the engine can read grants server-side.
grant select, insert, update, delete on table public.oauth_grants to service_role;

-- Users see only their own grants.
create policy oauth_grants_select on public.oauth_grants
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Users may insert a grant only for a team workspace they belong to.
-- The slug must resolve to a non-personal account that the user can read
-- under the accounts RLS (member or owner via has_role_on_account / owner
-- check). Personal workspaces are never eligible: the consent flow requires
-- users to select a team workspace.
create policy oauth_grants_insert on public.oauth_grants
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.accounts a
      where a.slug = account_slug
        and a.is_personal_account = false
    )
  );

-- Users may update (soft-revoke) only their own rows.
create policy oauth_grants_update on public.oauth_grants
  for update
  to authenticated
  using  ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
