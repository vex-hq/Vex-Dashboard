-- When a subscription row is deleted, downgrade the owning account to 'free'
-- IF it has no remaining active/trialing subscription. This covers the
-- hard-delete / end-of-period cancellation that the Stripe webhook cannot
-- (its onSubscriptionDeleted callback receives only a subscription id, never
-- an account). Upgrade/downgrade/cancel-at-period-end are handled by the
-- webhook (apps/web/app/api/billing/webhook/route.ts).
--
-- Upgrade-safe by construction: it ONLY ever writes 'free', and only when no
-- active subscription remains, so it never clobbers an active paid plan or a
-- manually-granted enterprise/override.

create or replace function public.reset_vex_plan_on_subscription_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.subscriptions s
    where s.account_id = old.account_id
      and s.status in ('active', 'trialing')
  ) then
    update public.accounts
      set vex_plan = 'free'
      where id = old.account_id
        and vex_plan is distinct from 'free';
  end if;

  return old;
end;
$$;

drop trigger if exists reset_vex_plan_after_subscription_delete on public.subscriptions;

create trigger reset_vex_plan_after_subscription_delete
  after delete on public.subscriptions
  for each row
  execute function public.reset_vex_plan_on_subscription_delete();
