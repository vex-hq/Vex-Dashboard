import type { Metadata } from 'next';

import Link from 'next/link';

import { LAST_UPDATED, PLANS } from '~/lib/pricing';
import { productOfferSchema } from '~/lib/seo/schemas';

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

const USD = new Intl.NumberFormat('en-US');

function formatYearlyAnnotation(priceYearly: number): string {
  // Mirrors the prior inline strings:
  //   priceYearly=990  → "$990/yr ($83/mo)"
  //   priceYearly=3490 → "$3,490/yr ($291/mo)"
  const monthlyEquivalent = Math.round(priceYearly / 12);
  return `$${USD.format(priceYearly)}/yr ($${USD.format(monthlyEquivalent)}/mo)`;
}

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
];

export default function PricingPage() {
  return (
    <div className="container py-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(productOfferSchema()),
        }}
      />
      {/* Hero */}
      <div className="mx-auto max-w-[1200px] text-center">
        <div className="mb-4 text-[13px] font-medium tracking-widest text-emerald-500 uppercase">
          Pricing
        </div>
        <h1 className="mb-4 text-3xl font-bold text-white sm:text-4xl">
          Simple, transparent pricing
        </h1>
        <p className="mb-2 text-xs text-[#585858]">
          Last reviewed: {LAST_UPDATED}
        </p>
        <p className="mx-auto mb-16 max-w-[520px] text-lg text-[#a2a2a2]">
          Start free. Scale as your agents go to production. No hidden fees.
        </p>
      </div>

      {/* Plan cards */}
      <ul
        role="list"
        className="mx-auto mb-20 grid max-w-[1200px] list-none gap-4 p-0 lg:grid-cols-4"
      >
        {PLANS.map((plan) => (
          <li
            key={plan.id}
            aria-labelledby={`plan-${plan.id}-name`}
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

            <h2
              id={`plan-${plan.id}-name`}
              className="mb-1 text-xl font-semibold text-white"
            >
              {plan.name}
            </h2>
            <div className="mb-1 flex items-baseline gap-1">
              <span className="text-3xl font-bold text-white">
                ${plan.priceMonthly}
              </span>
              <span className="text-sm text-[#a2a2a2]">/mo</span>
            </div>
            {plan.priceYearly !== undefined && (
              <p className="mb-3 text-xs text-[#585858]">
                or {formatYearlyAnnotation(plan.priceYearly)} billed annually
              </p>
            )}
            <p className="mb-6 text-sm text-[#a2a2a2]">{plan.description}</p>

            <Link
              href={plan.cta.href}
              className={`mb-8 inline-flex h-11 items-center justify-center rounded-lg text-sm font-semibold transition-colors ${
                plan.highlighted
                  ? 'bg-emerald-500 text-white hover:bg-emerald-400'
                  : 'border border-[#252525] text-[#a2a2a2] hover:border-[#585858] hover:text-white'
              }`}
            >
              {plan.cta.label}
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
          </li>
        ))}
      </ul>

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
      <section aria-labelledby="faq-heading" className="mx-auto max-w-[800px]">
        <h2
          id="faq-heading"
          className="mb-8 text-center text-2xl font-semibold text-white"
        >
          Frequently Asked Questions
        </h2>
        <div className="grid gap-4">
          {faqs.map((faq) => (
            <details
              key={faq.question}
              className="rounded-xl border border-[#252525] bg-[#0a0a0a] p-6 [&>summary]:cursor-pointer"
            >
              <summary className="text-[15px] font-medium text-white">
                {faq.question}
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-[#a2a2a2]">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
