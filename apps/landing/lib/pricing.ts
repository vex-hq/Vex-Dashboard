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
      { label: 'Memory retention', value: 'Forever' },
      { label: 'Sync', value: 'Across your own devices' },
      { label: 'Artifacts', value: '100 MB' },
      { label: 'Self-hosting', value: 'Full, AGPL-3.0' },
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
      { label: 'Sync', value: 'Real-time, across the team' },
      { label: 'Artifacts', value: '5 GB pool' },
      { label: 'Self-hosting', value: 'Full, AGPL-3.0' },
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
