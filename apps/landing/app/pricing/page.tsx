import type { Metadata } from 'next';

import Link from 'next/link';

import { ComparisonTable } from '../_components/comparison-table';

export const metadata: Metadata = {
  title: 'Pricing — Vex',
  description:
    'Simple, transparent pricing for AI agent runtime reliability. Start free, scale as you grow.',
  keywords: [
    'Vex pricing',
    'AI agent monitoring pricing',
    'runtime reliability pricing',
    'AI observability plans',
  ],
};

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: '/mo',
    description: 'Sandbox for exploring agent reliability.',
    cta: 'Get Started Free',
    href: 'https://app.tryvex.dev',
    highlighted: false,
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
    name: 'Starter',
    price: '$29',
    period: '/mo',
    description: 'For founders running 1-2 agents in production.',
    cta: 'Start Starter',
    href: 'https://app.tryvex.dev',
    highlighted: false,
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
    name: 'Pro',
    price: '$99',
    period: '/mo',
    yearly: '$990/yr ($83/mo)',
    description: 'For teams shipping agents to production.',
    cta: 'Start Pro',
    href: 'https://app.tryvex.dev',
    highlighted: true,
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
    name: 'Team',
    price: '$349',
    period: '/mo',
    yearly: '$3,490/yr ($291/mo)',
    description: 'For organizations running agents at scale.',
    cta: 'Start Team',
    href: 'https://app.tryvex.dev',
    highlighted: false,
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
];

const faqs = [
  {
    question: 'What counts as an observation?',
    answer:
      'An observation is any LLM call, tool invocation, or agent action that Vex monitors. Each individual event in your agent pipeline counts as one observation.',
  },
  {
    question: 'What counts as a verification?',
    answer:
      'A verification occurs when Vex actively checks an agent output against your defined policies, behavioral baselines, or factual constraints. Verifications consume more compute than passive observations.',
  },
  {
    question: 'What happens when I exceed my plan limits?',
    answer:
      'On Free and Starter plans, monitoring pauses until the next billing cycle. On Pro and Team plans, you can continue beyond your included quota at the listed overage rates. You will receive alerts as you approach your limits.',
  },
  {
    question: 'Can I switch plans at any time?',
    answer:
      'Yes. You can upgrade or downgrade your plan at any time. Upgrades take effect immediately with prorated billing. Downgrades take effect at the start of your next billing cycle.',
  },
  {
    question: 'Do you offer annual billing?',
    answer:
      'Yes. Annual billing saves you roughly two months compared to monthly pricing. Pro is $990/yr ($83/mo) and Team is $3,490/yr ($291/mo). Contact us to switch to annual billing.',
  },
  {
    question: 'Is Vex open source?',
    answer:
      'Yes. Vex is fully open source. The SDKs (Python, TypeScript) are Apache 2.0. The core engine and dashboard are AGPLv3. The managed platform (app.tryvex.dev) provides hosted infrastructure and zero-ops on top of the open-source foundation.',
  },
];

export default function PricingPage() {
  return (
    <div className="container py-24">
      {/* Hero */}
      <div className="mx-auto max-w-[1200px] text-center">
        <div className="mb-4 text-[13px] font-medium tracking-widest text-emerald-500 uppercase">
          Pricing
        </div>
        <h1 className="mb-4 text-3xl font-bold text-white sm:text-4xl">
          Simple, transparent pricing
        </h1>
        <p className="mx-auto mb-16 max-w-[520px] text-lg text-[#a2a2a2]">
          Start free. Scale as your agents go to production. No hidden fees.
        </p>
      </div>

      {/* Plan cards */}
      <div className="mx-auto mb-20 grid max-w-[1200px] gap-4 lg:grid-cols-4">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`relative flex flex-col rounded-xl border p-8 ${
              plan.highlighted
                ? 'border-emerald-500/40 bg-emerald-500/5'
                : 'border-[#252525] bg-[#161616]'
            }`}
          >
            {plan.highlighted && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500 px-3 py-0.5 text-xs font-semibold text-white">
                Most Popular
              </div>
            )}

            <h2 className="mb-1 text-xl font-semibold text-white">
              {plan.name}
            </h2>
            <div className="mb-1 flex items-baseline gap-1">
              <span className="text-3xl font-bold text-white">
                {plan.price}
              </span>
              <span className="text-sm text-[#a2a2a2]">{plan.period}</span>
            </div>
            {plan.yearly && (
              <p className="mb-3 text-xs text-[#585858]">
                or {plan.yearly} billed annually
              </p>
            )}
            <p className="mb-6 text-sm text-[#a2a2a2]">{plan.description}</p>

            <Link
              href={plan.href}
              className={`mb-8 inline-flex h-11 items-center justify-center rounded-lg text-sm font-semibold transition-colors ${
                plan.highlighted
                  ? 'bg-emerald-500 text-white hover:bg-emerald-400'
                  : 'border border-[#252525] text-[#a2a2a2] hover:border-[#585858] hover:text-white'
              }`}
            >
              {plan.cta}
            </Link>

            <ul className="flex flex-1 flex-col gap-3">
              {plan.features.map((f) => (
                <li
                  key={f.label}
                  className="flex items-start justify-between gap-4 border-t border-[#252525]/60 pt-3 text-sm"
                >
                  <span className="text-[#585858]">{f.label}</span>
                  <span className="text-right text-[#a2a2a2]">{f.value}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Enterprise CTA */}
      <div className="mx-auto mb-20 max-w-[1200px]">
        <div className="rounded-xl border border-[#252525] bg-[#161616] p-10 text-center">
          <h2 className="mb-2 text-2xl font-semibold text-white">Enterprise</h2>
          <p className="mx-auto mb-6 max-w-[480px] text-sm text-[#a2a2a2]">
            Need custom limits, SLAs, SSO, or on-prem deployment? Let&apos;s
            talk.
          </p>
          <a
            href="mailto:hello@tryvex.dev"
            className="inline-flex h-11 items-center rounded-lg border border-[#252525] px-7 text-sm font-semibold text-[#a2a2a2] transition-colors hover:border-[#585858] hover:text-white"
          >
            Contact Sales
          </a>
        </div>
      </div>

      {/* Competitor comparison */}
      <div className="mx-auto mb-20 max-w-[1100px]">
        <h2 className="mb-2 text-center text-2xl font-semibold text-white">
          How Vex Compares
        </h2>
        <p className="mx-auto mb-2 max-w-[520px] text-center text-sm text-[#a2a2a2]">
          See how Vex stacks up against other AI agent reliability tools.
        </p>
        <ComparisonTable />
      </div>

      {/* FAQ */}
      <div className="mx-auto max-w-[800px]">
        <h2 className="mb-8 text-center text-2xl font-semibold text-white">
          Frequently Asked Questions
        </h2>
        <div className="grid gap-4">
          {faqs.map((faq) => (
            <div
              key={faq.question}
              className="rounded-xl border border-[#252525] bg-[#0a0a0a] p-6"
            >
              <h3 className="mb-2 text-[15px] font-medium text-white">
                {faq.question}
              </h3>
              <p className="text-sm leading-relaxed text-[#a2a2a2]">
                {faq.answer}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
