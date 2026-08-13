/**
 * Klio per-seat billing config — 2026-08-13.
 *
 * Live Stripe price ids, created 2026-08-13 on product `prod_V4CWX3bALwggox`
 * ("Klio Team") in the **Klio / MoonForge, Inc.** Stripe account:
 *
 *   - `price_1U447h0Zh9jGFkLDlVHfozmx` — $20 / seat / month
 *   - `price_1U448X0Zh9jGFkLDWa5X17aL` — $200 / seat / year
 *
 * ⚠️ These live in a DIFFERENT Stripe account from the one this app was
 * previously configured against (`acct_1T3dsn…`, "Vex"), which is where the
 * commented-out Vex prices below belong. Checkout resolves these ids only once
 * `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` and
 * `STRIPE_WEBHOOK_SECRET` on Railway point at the Klio account. Until then
 * Stripe answers "No such price" — the ids are correct, the credentials are not.
 *
 * Prices are per-unit; Makerkit passes the seat count as the quantity, so a
 * 5-seat team is billed 5 × $20. Do not pre-multiply.
 *
 * The Free plan intentionally has no Stripe price — see the `free` product
 * below for why it still needs a $0 line item.
 */
import { BillingProviderSchema, createBillingSchema } from '@kit/billing';

const provider = BillingProviderSchema.parse(
  process.env.NEXT_PUBLIC_BILLING_PROVIDER,
);

export default createBillingSchema({
  provider,
  products: [
    {
      id: 'free',
      name: 'Free',
      description: 'Everything, for one person.',
      currency: 'USD',
      // Free is a plan GATE, not a checkout — there is no Stripe price behind
      // it and no user should ever hit the checkout flow for this product.
      // It still needs one line item: `createBillingSchema`'s PlanSchema
      // requires every non-custom plan to have >= 1 lineItems, and `custom:
      // true` plans are required to have EXACTLY ZERO — which forces a
      // `label`/`href`-driven "contact us" style plan, wrong shape for a
      // real self-serve $0 tier that still needs a stable plan id for
      // `planFromPriceId` / `resolvePlanFromSubscription`
      // (`apps/web/lib/agentguard/plan-from-price.ts`) to fall back to. So:
      // one flat line item, cost 0, id is NOT a Stripe price (nothing is
      // ever charged, so there is nothing to reconcile against a Stripe
      // catalog) — matches `billing.sample.config.ts`'s "Starter"-shaped
      // plan structure with cost driven to zero.
      plans: [
        {
          name: 'Free',
          id: 'free',
          paymentType: 'recurring',
          interval: 'month',
          lineItems: [
            {
              id: 'klio-free-plan',
              name: 'Free',
              cost: 0,
              type: 'flat',
            },
          ],
        },
      ],
      features: [
        'Just you',
        'Unlimited memories',
        '30-day memory retention',
        '3 projects',
        'Unlimited connected agents',
        '100 MB artifacts',
        '100 RPM',
        'Community support',
      ],
    },
    {
      id: 'team',
      name: 'Team',
      badge: 'Most Popular',
      highlighted: true,
      description: 'One shared brain for everyone you invite.',
      currency: 'USD',
      plans: [
        {
          name: 'Team Monthly',
          id: 'team-monthly',
          paymentType: 'recurring',
          interval: 'month',
          lineItems: [
            {
              id: 'price_1U447h0Zh9jGFkLDlVHfozmx', // pragma: allowlist secret
              name: 'Team',
              cost: 20,
              type: 'per_seat',
              unit: 'seat',
            },
          ],
        },
        {
          name: 'Team Yearly',
          id: 'team-yearly',
          paymentType: 'recurring',
          interval: 'year',
          lineItems: [
            {
              id: 'price_1U448X0Zh9jGFkLDWa5X17aL', // pragma: allowlist secret
              name: 'Team',
              cost: 200,
              type: 'per_seat',
              unit: 'seat',
            },
          ],
        },
      ],
      features: [
        'Everyone you invite',
        'Unlimited memories',
        'Forever memory retention',
        'Unlimited projects',
        'Knowledge graph, hybrid search, curator, compression',
        'Unlimited connected agents',
        '5 GB artifacts pool',
        '1,000 RPM',
        'Priority support',
      ],
    },

    // ── Vex products — hidden, not removed ────────────────────────────────
    // Replaced by the Klio Free/Team tiers above on 2026-08-13
    // (`2026-08-13-klio-pricing-spec.md`). Kept here, commented out, per this
    // repo's standing hidden-not-deleted convention (see the equivalent
    // treatment in `team-account-navigation.config.tsx`): the Vex reliability
    // product these prices belonged to is still live for orgs fed via the Vex
    // SDK, its Stripe prices still exist and may still have active
    // subscribers, and `planFromPriceId` / `resolvePlanFromSubscription`
    // (`apps/web/lib/agentguard/plan-from-price.ts`) resolve unknown price
    // ids to `'free'` rather than erroring — so removing these outright would
    // silently downgrade any Vex subscriber still on one of these prices the
    // next time their subscription state is resolved. Do not restore by
    // uncommenting without first confirming no active Stripe subscription
    // still references these price ids.
    //
    // {
    //   id: 'starter',
    //   name: 'Starter',
    //   description: 'For founders running 1-2 agents in production',
    //   currency: 'USD',
    //   plans: [
    //     {
    //       name: 'Starter Monthly',
    //       id: 'starter-monthly',
    //       paymentType: 'recurring',
    //       interval: 'month',
    //       lineItems: [
    //         {
    //           id: 'price_1T3eAO2R0WSf5z7SEQKjage3',
    //           name: 'Starter',
    //           cost: 29,
    //           type: 'flat',
    //         },
    //       ],
    //     },
    //     {
    //       name: 'Starter Yearly',
    //       id: 'starter-yearly',
    //       paymentType: 'recurring',
    //       interval: 'year',
    //       lineItems: [
    //         {
    //           id: 'price_1T3eAO2R0WSf5z7SeC3piJTM',
    //           name: 'Starter',
    //           cost: 290,
    //           type: 'flat',
    //         },
    //       ],
    //     },
    //   ],
    //   features: [
    //     '25,000 observations/mo',
    //     '1,000 verifications/mo',
    //     '100 corrections/mo',
    //     'Unlimited agents',
    //     '7-day retention',
    //     'Email support',
    //   ],
    // },
    // {
    //   id: 'pro',
    //   name: 'Pro',
    //   badge: 'Most Popular',
    //   highlighted: true,
    //   description: 'For teams shipping agents to production',
    //   currency: 'USD',
    //   plans: [
    //     {
    //       name: 'Pro Monthly',
    //       id: 'pro-monthly',
    //       paymentType: 'recurring',
    //       interval: 'month',
    //       lineItems: [
    //         {
    //           id: 'price_1T3eAI2R0WSf5z7Svg2YEAoU',
    //           name: 'Pro',
    //           cost: 99,
    //           type: 'flat',
    //         },
    //       ],
    //     },
    //     {
    //       name: 'Pro Yearly',
    //       id: 'pro-yearly',
    //       paymentType: 'recurring',
    //       interval: 'year',
    //       lineItems: [
    //         {
    //           id: 'price_1T3eAI2R0WSf5z7SPI8JtuRV',
    //           name: 'Pro',
    //           cost: 990,
    //           type: 'flat',
    //         },
    //       ],
    //     },
    //   ],
    //   features: [
    //     '150,000 observations/mo',
    //     '15,000 verifications/mo',
    //     'Full correction cascade',
    //     'Unlimited agents',
    //     '30-day retention',
    //     'Email + webhook alerts',
    //     'Email support (48h SLA)',
    //   ],
    // },
    // {
    //   id: 'team',
    //   name: 'Team',
    //   description: 'For organizations running agents at scale',
    //   currency: 'USD',
    //   plans: [
    //     {
    //       name: 'Team Monthly',
    //       id: 'team-monthly',
    //       paymentType: 'recurring',
    //       interval: 'month',
    //       lineItems: [
    //         {
    //           id: 'price_1T3eA72R0WSf5z7SZuQmJTnk',
    //           name: 'Team',
    //           cost: 349,
    //           type: 'flat',
    //         },
    //       ],
    //     },
    //     {
    //       name: 'Team Yearly',
    //       id: 'team-yearly',
    //       paymentType: 'recurring',
    //       interval: 'year',
    //       lineItems: [
    //         {
    //           id: 'price_1T3eA72R0WSf5z7SCHZr3Y2F',
    //           name: 'Team',
    //           cost: 3490,
    //           type: 'flat',
    //         },
    //       ],
    //     },
    //   ],
    //   features: [
    //     '1,500,000 observations/mo',
    //     '150,000 verifications/mo',
    //     'Full correction cascade + priority',
    //     'Unlimited agents',
    //     '90-day retention',
    //     'Email + webhook + Slack alerts',
    //     'Priority support (24h SLA)',
    //   ],
    // },
  ],
});
