-- Per-member Klio connect onboarding.
--
-- Workspace onboarding (`accounts.onboarding_completed`) is the creator's
-- job. Invitees were skipping connect because that flag was already true.
-- This timestamp is on the membership row: this human, this workspace.

alter table public.accounts_memberships
  add column if not exists klio_onboarded_at timestamptz;

comment on column public.accounts_memberships.klio_onboarded_at is
  'When this member finished or skipped Klio connect onboarding. Null means they have not seen the join connect flow.';

-- People already in a workspace are not locked out by this ship.
update public.accounts_memberships
set klio_onboarded_at = coalesce(klio_onboarded_at, created_at)
where klio_onboarded_at is null;

-- Only the signed-in user can mark their own membership. The function
-- never touches account_role. A non-member is a no-op raise.
create or replace function public.mark_membership_klio_onboarded (
  target_account_id uuid
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  updated integer;
begin
  update public.accounts_memberships
  set klio_onboarded_at = coalesce(klio_onboarded_at, now())
  where account_id = target_account_id
    and user_id = auth.uid ();

  get diagnostics updated = row_count;

  if updated = 0 then
    raise exception 'Not a member of this account';
  end if;
end;
$$;

revoke all on function public.mark_membership_klio_onboarded (uuid)
from
  public;

grant
execute on function public.mark_membership_klio_onboarded (uuid) to authenticated;
