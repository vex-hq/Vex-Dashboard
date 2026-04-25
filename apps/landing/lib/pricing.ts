/**
 * Single source of truth for landing-site pricing data.
 *
 * IMPORTANT: Plan field values (name, description, feature labels/values,
 * cta.label, cta.href) are mirrored from the original inline `plans` array
 * in `app/pricing/page.tsx`. Any change here is user-visible — keep
 * descriptive copy and feature strings in sync with the marketing source.
 *
 * Data shape is intentionally `readonly` end-to-end so consumers cannot
 * mutate the catalog at runtime. Use `[...PLANS]` if a mutable copy is
 * required for sorting/filtering.
 */

export const LAST_UPDATED = '2026-04-25' as const;
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

export const PLANS: ReadonlyArray<Plan> = [
  {
    id: 'free',
    name: 'Free',
    priceMonthly: 0,
    description: 'Sandbox for exploring agent reliability.',
    audience: 'Developers exploring AI agent reliability',
    highlighted: false,
    cta: { label: 'Get Started Free', href: 'https://app.tryvex.dev' },
    features: [
      { label: 'Observations', value: '1,000 / mo' },
      { label: 'Verifications', value: '50 / mo' },
      { label: 'Corrections', value: 'None' },
      { label: 'Agents', value: 'Unlimited' },
      { label: 'Data retention', value: '1 day' },
      { label: 'Rate limit', value: '100 RPM' },
      { label: 'Overage', value: 'Hard limit' },
      { label: 'Support', value: 'Community' },
    ],
  },
  {
    id: 'starter',
    name: 'Starter',
    priceMonthly: 29,
    description: 'For founders running 1-2 agents in production.',
    audience: 'Founders running 1-2 agents in production',
    highlighted: false,
    cta: { label: 'Start Starter', href: 'https://app.tryvex.dev' },
    features: [
      { label: 'Observations', value: '25,000 / mo' },
      { label: 'Verifications', value: '1,000 / mo' },
      { label: 'Corrections', value: '100 / mo' },
      { label: 'Agents', value: 'Unlimited' },
      { label: 'Data retention', value: '7 days' },
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
    description: 'For teams shipping agents to production.',
    audience: 'Teams shipping agents to production',
    highlighted: true,
    cta: { label: 'Start Pro', href: 'https://app.tryvex.dev' },
    features: [
      { label: 'Observations', value: '150,000 / mo' },
      { label: 'Verifications', value: '15,000 / mo' },
      { label: 'Corrections', value: 'Full cascade' },
      { label: 'Agents', value: 'Unlimited' },
      { label: 'Data retention', value: '30 days' },
      { label: 'Rate limit', value: '1,000 RPM' },
      { label: 'Overage', value: '$0.0005/obs, $0.005/verify' },
      { label: 'Support', value: 'Email (48h)' },
    ],
  },
  {
    id: 'team',
    name: 'Team',
    priceMonthly: 349,
    priceYearly: 3490,
    description: 'For organizations running agents at scale.',
    audience: 'Organizations running agents at scale',
    highlighted: false,
    cta: { label: 'Start Team', href: 'https://app.tryvex.dev' },
    features: [
      { label: 'Observations', value: '1,500,000 / mo' },
      { label: 'Verifications', value: '150,000 / mo' },
      { label: 'Corrections', value: 'Full cascade + priority' },
      { label: 'Agents', value: 'Unlimited' },
      { label: 'Data retention', value: '90 days' },
      { label: 'Rate limit', value: '5,000 RPM' },
      { label: 'Overage', value: '$0.0004/obs, $0.004/verify' },
      { label: 'Support', value: 'Priority (24h)' },
    ],
  },
] as const;
