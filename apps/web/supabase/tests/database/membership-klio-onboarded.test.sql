begin;
create extension "basejump-supabase_test_helpers" version '0.0.6';

select no_plan();

select makerkit.set_identifier('primary_owner', 'test@makerkit.dev');
select makerkit.set_identifier('member', 'member@makerkit.dev');

select makerkit.authenticate_as('member');

select lives_ok(
  $$
    select public.mark_membership_klio_onboarded(
      makerkit.get_account_id_by_slug('makerkit')
    )
  $$,
  'A member can mark their own membership as Klio-onboarded'
);

select isnt(
  (
    select klio_onboarded_at
    from public.accounts_memberships
    where user_id = tests.get_supabase_uid('member')
      and account_id = makerkit.get_account_id_by_slug('makerkit')
  ),
  null,
  'The member timestamp is set'
);

select makerkit.authenticate_as('primary_owner');

select throws_ok(
  $$
    select public.mark_membership_klio_onboarded(
      '00000000-0000-0000-0000-000000000099'::uuid
    )
  $$,
  'Not a member of this account',
  'A caller with no membership cannot mark a random account'
);

-- The field-guard still blocks identity rewrites. Use service_role so we
-- hit the trigger, not RLS.
set local role service_role;

select lives_ok(
  $$
    update public.accounts_memberships
    set account_role = 'member'
    where user_id = tests.get_supabase_uid('member')
      and account_id = makerkit.get_account_id_by_slug('makerkit')
  $$,
  'Role updates still pass the membership field guard'
);

select throws_ok(
  $$
    update public.accounts_memberships
    set user_id = tests.get_supabase_uid('primary_owner')
    where user_id = tests.get_supabase_uid('member')
      and account_id = makerkit.get_account_id_by_slug('makerkit')
  $$,
  'Only the account_role and klio_onboarded_at can be updated',
  'Membership identity cannot be rewritten'
);

select throws_ok(
  $$
    update public.accounts_memberships
    set created_at = now()
    where user_id = tests.get_supabase_uid('member')
      and account_id = makerkit.get_account_id_by_slug('makerkit')
  $$,
  'Only the account_role and klio_onboarded_at can be updated',
  'Membership created_at cannot be rewritten'
);

select * from finish();
rollback;
