/**
 * Single source of truth for landing-site pricing data.
 *
 * Consumed by `app/pricing/page.tsx`, `app/_components/home/survey/plate-schedule.tsx`,
 * `lib/seo/llms-txt.ts`, `lib/seo/schemas.ts` (JSON-LD) and `app/api/pricing/route.ts`.
 *
 * ## Why seats, and why nothing else is metered
 *
 * Klio is free and unlimited for one person. You pay when a SECOND person's
 * agents need to see what the first person's agents learned. That is the whole
 * product, and it is the whole gate.
 *
 * The previous model metered memories-captured and recalls per month, with
 * retention as the escalating lever. Real usage killed it:
 *
 *   - July 2026 in the `vex` org: 19,685 memories from 4 agents — one developer.
 *     Free allowed 1,000/mo (~36 hours of real use) and Starter 25,000/mo, so a
 *     single active developer nearly capped the $29 tier. There was no viable
 *     Starter customer.
 *   - 82% of writes come from passive hooks, not deliberate tool calls. Metering
 *     memories charges the customer for volume they neither control nor can
 *     predict — the mechanic that produces support tickets, not revenue.
 *   - Retention was the cruelest lever: Free purged after 1 day while the README
 *     sells "memory-that-survives-the-window-close". Every trial user learned the
 *     product does not work, on day two, by design.
 *
 * Seats scale with delivered value (more teammates sharing one brain = more
 * value), cannot be gamed, and match how this buyer already purchases Cursor,
 * Claude Code and GitHub. Abuse is handled by the rate limit, not by quotas.
 *
 * There is deliberately no middle paid tier. With a linear per-seat metric the
 * seats ARE the ladder — a 3-person team pays $60, a 20-person team pays $400.
 * Inventing a middle column to satisfy good-better-best would add a decision
 * without adding information.
 *
 * PRICE POINT IS AN ANCHOR, NOT RESEARCH. $20/seat comes from the band this
 * buyer already pays (Cursor, Copilot and Linear all sit at $15-25). Nobody has
 * priced team-memory-for-coding-agents because nobody has won it, so there is no
 * market rate to read. Replace this with a real number after customer discovery.
 *
 * Data shape is `readonly` end-to-end; use `[...PLANS]` for a mutable copy.
 *
 * ## 2026-08-13 revision — retention and projects become real levers
 *
 * `services/shared/shared/plan_limits.py` (the engine) previously enforced
 * `-1` (forever) retention for every plan while this file said the same
 * thing, so the two agreed — but the engine's own docstring records an
 * EARLIER drift where the site promised "unlimited memories, retention
 * forever" while the code actually enforced 1,000/month and a one-day
 * window: people who signed up on the published terms lost their history
 * after a day. That is the failure mode this file exists to prevent, and it
 * is exactly the kind of change being made now — so the two numbers below
 * are copied verbatim from the approved spec, not re-derived:
 *
 *   - Free retention: forever → **30 days**. 46% of all memories in
 *     production are already older than 30 days, so this binds immediately
 *     for real accounts (existing orgs are grandfathered via
 *     `plan_overrides`, not retroactively deleted).
 *   - Free projects: **3**, newly published. The heaviest real account has
 *     102 projects; three is generous for evaluating and confining for real
 *     use.
 *   - Team rate limit: 5,000 RPM (engine) → **1,000 RPM**, matching what
 *     this file already claimed. The engine was the one out of sync here.
 *   - The intelligence layer (knowledge graph, hybrid lexical search, the
 *     curator, compression) moves from "given to every Cloud user" to
 *     **Team-only**. It is the actual COGS and the value story for paying;
 *     Free stores and retrieves, Team reasons over it.
 *
 * `apps/landing/__tests__/lib/pricing-spec-contract.test.ts` pins these
 * numbers so this file cannot silently drift from the spec a third time.
 */

export const LAST_UPDATED = '2026-07-31' as const;
export const CURRENCY = 'USD' as const;

export interface PlanFeature {
  readonly label: string;
  readonly value: string;
}

export interface Plan {
  readonly id: 'free' | 'team';
  readonly name: string;
  /** Monthly price. For `seat` plans this is the price PER SEAT. */
  readonly priceMonthly: number;
  /** How `priceMonthly` should be read on the page. */
  readonly priceUnit: 'flat' | 'seat';
  /** Per-seat when `priceUnit` is `seat`. */
  readonly priceYearly?: number;
  readonly description: string;
  readonly audience: string;
  readonly features: ReadonlyArray<PlanFeature>;
  readonly highlighted: boolean;
  readonly cta: { readonly label: string; readonly href: string };
}

const CLOUD_SIGNUP = 'https://app.klio.tech/auth/sign-up' as const;

export const PLANS: ReadonlyArray<Plan> = [
  {
    id: 'free',
    name: 'Free',
    priceMonthly: 0,
    priceUnit: 'flat',
    description: 'Everything, for one person, forever.',
    audience: 'One developer whose agents should stop forgetting',
    highlighted: false,
    cta: { label: 'Start free', href: CLOUD_SIGNUP },
    features: [
      { label: 'People sharing a brain', value: 'Just you' },
      { label: 'Connected agents', value: 'Unlimited' },
      { label: 'Memories', value: 'Unlimited' },
      { label: 'Memory retention', value: '30 days' },
      { label: 'Projects', value: '3' },
      { label: 'Sync', value: 'Across your own devices' },
      { label: 'Artifacts', value: '100 MB' },
      { label: 'Graph, hybrid search, curator', value: 'Team only' },
      { label: 'Self-hosting', value: 'Core engine, AGPL-3.0' },
      { label: 'Rate limit', value: '100 RPM' },
      { label: 'Support', value: 'Community + Discord' },
    ],
  },
  {
    id: 'team',
    name: 'Team',
    priceMonthly: 20,
    priceUnit: 'seat',
    priceYearly: 200,
    description:
      'One shared brain. What any teammate’s agent learns, every other agent knows.',
    audience: 'Teams running Claude Code, Cursor and Codex on one codebase',
    highlighted: true,
    cta: { label: 'Start a team', href: CLOUD_SIGNUP },
    features: [
      { label: 'People sharing a brain', value: 'Everyone you invite' },
      { label: 'Connected agents', value: 'Unlimited' },
      { label: 'Memories', value: 'Unlimited' },
      { label: 'Memory retention', value: 'Forever' },
      { label: 'Projects', value: 'Unlimited' },
      { label: 'Sync', value: 'Real-time, across the team' },
      { label: 'Artifacts', value: '5 GB pool' },
      {
        label: 'Graph, hybrid search, curator',
        value: 'Included — Team only',
      },
      { label: 'Self-hosting', value: 'Core engine, AGPL-3.0' },
      { label: 'Rate limit', value: '1,000 RPM' },
      { label: 'Support', value: 'Priority' },
    ],
  },
] as const;

/**
 * The B2B2C / embed lane — agent-builder companies embedding Klio so each of
 * THEIR end-users gets private, isolated memory. Priced per end-user; sales-led
 * (not a self-serve tier), so it renders as a separate banner, not a column.
 *
 * Enterprise conversations also land here for now: SSO, audit trail and a DPA
 * live behind this contact rather than in a self-serve column. A product with
 * two GitHub stars does not need an Enterprise tier on its pricing page; it
 * needs a way for the first interested enterprise to start a conversation.
 */
export interface EmbedTier {
  readonly name: string;
  readonly priceLabel: string;
  readonly description: string;
  readonly cta: { readonly label: string; readonly href: string };
}

export const PLATFORM: EmbedTier = {
  name: 'Platform',
  priceLabel: 'Per end-user',
  description:
    'Embed Klio in your own product and give every one of your users their own private, isolated memory. Cross-agent sync, per-user isolation, SSO, and a cryptographic audit trail.',
  cta: { label: 'Talk to us', href: 'mailto:contact@klio.tech' },
} as const;
