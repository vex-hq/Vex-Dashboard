BEGIN;
create extension "basejump-supabase_test_helpers" version '0.0.6';

select no_plan();

-- -------------------------------------------------------------------------
-- Fixtures
-- -------------------------------------------------------------------------

select tests.create_supabase_user('grant_user1', 'grant_user1@example.test');
select tests.create_supabase_user('grant_user2', 'grant_user2@example.test');

-- Create a team account owned by user1 so the INSERT policy membership
-- check has a real slug to match.
set local role service_role;
select public.create_team_account('Test Workspace', tests.get_supabase_uid('grant_user1'), 'test-workspace-abc');
set local role postgres;

-- -------------------------------------------------------------------------
-- Table structure
-- -------------------------------------------------------------------------

select has_table('public', 'oauth_grants', 'oauth_grants table exists');
select tests.rls_enabled('public', 'oauth_grants');

select has_index(
  'public', 'oauth_grants', 'uq_oauth_grants_active',
  'Partial unique index uq_oauth_grants_active exists'
);

select has_index(
  'public', 'oauth_grants', 'ix_oauth_grants_user',
  'Listing index ix_oauth_grants_user exists'
);

-- -------------------------------------------------------------------------
-- RLS: users can only see their own rows
-- -------------------------------------------------------------------------

-- Insert a row directly as service_role so we can test SELECT isolation.
set local role service_role;

insert into public.oauth_grants (user_id, oauth_client_id, account_slug)
values (
  tests.get_supabase_uid('grant_user1'),
  'client_fake_abc',
  'test-workspace-abc'
);

-- user1 can see their own grant.
select makerkit.authenticate_as('grant_user1');

select isnt_empty(
  $$ select * from public.oauth_grants where oauth_client_id = 'client_fake_abc' $$,
  'grant_user1 can see their own grant'
);

-- user2 cannot see user1 grants.
select makerkit.authenticate_as('grant_user2');

select is_empty(
  $$ select * from public.oauth_grants where oauth_client_id = 'client_fake_abc' $$,
  'grant_user2 cannot see grant_user1 grants'
);

-- -------------------------------------------------------------------------
-- Unique-active invariant: at most one active grant per (user, client)
-- -------------------------------------------------------------------------

-- Insert the first grant as service_role (already present above).
-- Attempt a second active grant for the same (user, client) — must fail.
set local role service_role;

select throws_ok(
  $$ insert into public.oauth_grants (user_id, oauth_client_id, account_slug)
     values (
       tests.get_supabase_uid('grant_user1'),
       'client_fake_abc',
       'test-workspace-abc'
     ) $$,
  'duplicate key value violates unique constraint "uq_oauth_grants_active"',
  'Inserting a second active grant for the same (user, client) is rejected'
);

-- Revoking the first grant (set revoked_at) allows a new active one.
update public.oauth_grants
set revoked_at = now()
where user_id = tests.get_supabase_uid('grant_user1')
  and oauth_client_id = 'client_fake_abc'
  and revoked_at is null;

select lives_ok(
  $$ insert into public.oauth_grants (user_id, oauth_client_id, account_slug)
     values (
       tests.get_supabase_uid('grant_user1'),
       'client_fake_abc',
       'test-workspace-abc'
     ) $$,
  'A new active grant is allowed once the previous one is revoked'
);

-- Revoked rows are not constrained: two revoked rows for the same (user, client)
-- must coexist (they are part of the audit trail).
update public.oauth_grants
set revoked_at = now()
where user_id = tests.get_supabase_uid('grant_user1')
  and oauth_client_id = 'client_fake_abc'
  and revoked_at is null;

select is(
  (select count(*)::int from public.oauth_grants
   where user_id = tests.get_supabase_uid('grant_user1')
     and oauth_client_id = 'client_fake_abc'),
  2,
  'Revoked rows accumulate as audit trail'
);

-- -------------------------------------------------------------------------
-- RLS INSERT: user cannot insert a grant for another user
-- -------------------------------------------------------------------------

select makerkit.authenticate_as('grant_user1');

select throws_ok(
  $$ insert into public.oauth_grants (user_id, oauth_client_id, account_slug)
     values (
       tests.get_supabase_uid('grant_user2'),
       'client_fake_abc',
       'test-workspace-abc'
     ) $$,
  'new row violates row-level security policy for table "oauth_grants"',
  'Authenticated user cannot insert a grant on behalf of another user'
);

-- -------------------------------------------------------------------------
-- RLS INSERT: personal-account slug is rejected
-- -------------------------------------------------------------------------
-- Even if a caller supplies the user's own UUID as a text slug (mimicking
-- how personal accounts were historically identified), the INSERT policy
-- must reject it because personal workspaces are not supported.

select makerkit.authenticate_as('grant_user1');

select throws_ok(
  format(
    $$ insert into public.oauth_grants (user_id, oauth_client_id, account_slug)
       values ('%s', 'client_fake_abc', '%s') $$,
    tests.get_supabase_uid('grant_user1'),
    tests.get_supabase_uid('grant_user1')
  ),
  'new row violates row-level security policy for table "oauth_grants"',
  'INSERT with a personal-account UUID as slug is rejected by the INSERT policy'
);

-- -------------------------------------------------------------------------
-- RLS UPDATE: user cannot revoke another user grant
-- -------------------------------------------------------------------------

-- Insert a grant for user2 via service_role.
set local role service_role;
insert into public.oauth_grants (user_id, oauth_client_id, account_slug)
values (
  tests.get_supabase_uid('grant_user2'),
  'client_fake_xyz',
  'test-workspace-abc'
);

-- Attempt revoke as user1 — must silently match 0 rows (RLS filters the row).
select makerkit.authenticate_as('grant_user1');

update public.oauth_grants
set revoked_at = now()
where oauth_client_id = 'client_fake_xyz';

-- The UPDATE is silently a no-op (RLS filters the row out; 0 rows touched).
-- The grant for user2 must still be active (revoked_at IS NULL) — confirmed
-- by querying as service_role which bypasses RLS.
set local role service_role;

select is(
  (select count(*)::int from public.oauth_grants
   where oauth_client_id = 'client_fake_xyz'
     and user_id = tests.get_supabase_uid('grant_user2')
     and revoked_at is null),
  1,
  'grant_user1 UPDATE of grant_user2 row is a silent no-op: row remains active'
);

SELECT * FROM finish();
ROLLBACK;
