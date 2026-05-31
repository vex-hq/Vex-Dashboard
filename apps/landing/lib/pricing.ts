/**
 * Single source of truth for landing-site pricing data.
 *
 * Consumed by `app/pricing/page.tsx`, `app/_components/home/pricing.tsx`, and
 * `lib/seo/schemas.ts` (JSON-LD). Klio meters the *use of the shared memory*
 * — memories captured + recalls per month, with memory retention and
 * real-time cross-agent sync as the escalating levers. Connected agents are
 * UNLIMITED on every tier: connecting agents is the wedge, never gated.
 *
 * Prices are unchanged from the original tiers. The per-unit limits below are
 * a starting point sized for memory access patterns (recalls are
 * high-frequency) — tune with real usage data before launch.
 *
 * Data shape is `readonly` end-to-end; use `[...PLANS]` for a mutable copy.
 */

export const LAST_UPDATED = '2026-05-31' as const;
export const CURRENCY = 'USD' as const;

export interface PlanFeature {
  readonly label: string;
  readonly value: string;
}

export interface Plan {
  readonly id: 'free' | 'starter' | 'pro' | 'team';
  readonly name: string;
  readonly priceMonthly: number;
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
    description: 'Start sharing memory across your agents.',
    audience: 'Solo developers giving their agents one shared memory',
    highlighted: false,
    cta: { label: 'Get Started Free', href: CLOUD_SIGNUP },
    features: [
      { label: 'Memories captured', value: '1,000 / mo' },
      { label: 'Recalls', value: '10,000 / mo' },
      { label: 'Cross-agent sync', value: 'Local only' },
      { label: 'Connected agents', value: 'Unlimited' },
      { label: 'Memory retention', value: '1 day' },
      { label: 'Rate limit', value: '100 RPM' },
      { label: 'Overage', value: 'Hard limit' },
      { label: 'Support', value: 'Community' },
    ],
  },
  {
    id: 'starter',
    name: 'Starter',
    priceMonthly: 29,
    description: 'For solo devs running a few agents together.',
    audience: 'Founders running 1–2 agents in production',
    highlighted: false,
    cta: { label: 'Start Starter', href: CLOUD_SIGNUP },
    features: [
      { label: 'Memories captured', value: '25,000 / mo' },
      { label: 'Recalls', value: '100,000 / mo' },
      { label: 'Cross-agent sync', value: 'Real-time' },
      { label: 'Connected agents', value: 'Unlimited' },
      { label: 'Memory retention', value: '7 days' },
      { label: 'Rate limit', value: '500 RPM' },
      { label: 'Overage', value: 'Hard limit' },
      { label: 'Support', value: 'Email' },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    priceMonthly: 99,
    priceYearly: 990,
    description: 'For teams whose agents work together daily.',
    audience: 'Teams shipping agents to production',
    highlighted: true,
    cta: { label: 'Start Pro', href: CLOUD_SIGNUP },
    features: [
      { label: 'Memories captured', value: '150,000 / mo' },
      { label: 'Recalls', value: '1,000,000 / mo' },
      { label: 'Cross-agent sync', value: 'Real-time' },
      { label: 'Connected agents', value: 'Unlimited' },
      { label: 'Memory retention', value: '30 days' },
      { label: 'Rate limit', value: '1,000 RPM' },
      { label: 'Overage', value: '$0.0005 / memory, $0.0001 / recall' },
      { label: 'Support', value: 'Email (48h)' },
    ],
  },
  {
    id: 'team',
    name: 'Team',
    priceMonthly: 349,
    priceYearly: 3490,
    description: 'For organizations running many agents at scale.',
    audience: 'Organizations running agents at scale',
    highlighted: false,
    cta: { label: 'Start Team', href: CLOUD_SIGNUP },
    features: [
      { label: 'Memories captured', value: '1,500,000 / mo' },
      { label: 'Recalls', value: '10,000,000 / mo' },
      { label: 'Cross-agent sync', value: 'Real-time + priority' },
      { label: 'Connected agents', value: 'Unlimited' },
      { label: 'Memory retention', value: '90 days' },
      { label: 'Rate limit', value: '5,000 RPM' },
      { label: 'Overage', value: '$0.0004 / memory, $0.00008 / recall' },
      { label: 'Support', value: 'Priority (24h)' },
    ],
  },
] as const;

/**
 * The B2B2C / embed lane — agent-builder companies embedding Klio so each of
 * THEIR end-users gets private, isolated memory. Priced per end-user; sales-led
 * (not a self-serve tier), so it renders as a separate banner, not a column.
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
