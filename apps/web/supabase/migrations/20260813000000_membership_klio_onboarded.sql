-- Per-member Klio connect onboarding.
--
-- Workspace onboarding (`accounts.onboarding_completed`) is the creator's
-- job. Invitees were skipping connect because that flag was already true.
-- This timestamp is on the membership row: this human, this workspace.
--
-- Makerkit's membership field-guard (`kit.prevent_memberships_update`) only
-- allowed `account_role` to change. That blocks this backfill and the mark
-- RPC — SECURITY DEFINER does not skip BEFORE UPDATE triggers. Widen the
-- allow-list before any UPDATE of `klio_onboarded_at`.
-- Identity columns (user_id, account_id, created_at, created_by) stay
-- immutable. Timestamp/tracking columns may still move because the other
-- BEFORE UPDATE triggers write them.

create or replace function kit.prevent_memberships_update () returns trigger
set
  search_path = '' as $$
begin
    if new.user_id is distinct from old.user_id
       or new.account_id is distinct from old.account_id
       or new.created_at is distinct from old.created_at
       or new.created_by is distinct from old.created_by
    then
        raise exception 'Only the account_role and klio_onboarded_at can be updated';
    end if;

    return new;
end;
$$ language plpgsql;

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
