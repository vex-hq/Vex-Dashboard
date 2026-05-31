-- One-time backfill: set vex_plan for accounts that ALREADY have an active
-- (or trialing) subscription, so existing paying customers get their
-- entitlements immediately instead of waiting for their next Stripe event.
--
-- Ongoing sync is handled by the billing webhook using billing.config as the
-- single source of truth (apps/web/config/billing.config.ts). The price-id ->
-- plan pairs below mirror that config as a one-time historical snapshot — if
-- prices change later, this migration is NOT re-run; the webhook stays correct.
--
-- UPGRADE-ONLY by design: it only writes rows for accounts WITH an active paid
-- subscription, never downgrading others — so it cannot clobber manual
-- enterprise grants or free users.

with price_plan(variant_id, plan, rank) as (
  values
    ('price_1T3eAO2R0WSf5z7SEQKjage3', 'starter', 1),  -- starter monthly
    ('price_1T3eAO2R0WSf5z7SeC3piJTM', 'starter', 1),  -- starter yearly
    ('price_1T3eAI2R0WSf5z7Svg2YEAoU', 'pro',     2),  -- pro monthly
    ('price_1T3eAI2R0WSf5z7SPI8JtuRV', 'pro',     2),  -- pro yearly
    ('price_1T3eA72R0WSf5z7SZuQmJTnk', 'team',    3),  -- team monthly
    ('price_1T3eA72R0WSf5z7SCHZr3Y2F', 'team',    3)   -- team yearly
),
account_plan as (
  -- one row per account: the highest-ranked plan among its active subscriptions
  select distinct on (s.account_id)
    s.account_id,
    pp.plan
  from public.subscriptions s
  join public.subscription_items si on si.subscription_id = s.id
  join price_plan pp on pp.variant_id = si.variant_id
  where s.status in ('active', 'trialing')
  order by s.account_id, pp.rank desc
)
update public.accounts a
  set vex_plan = ap.plan
  from account_plan ap
  where a.id = ap.account_id
    and a.vex_plan is distinct from ap.plan;
