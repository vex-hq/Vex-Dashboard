import type { Metadata } from 'next';

import Link from 'next/link';

import { LAST_UPDATED, PLANS } from '~/lib/pricing';
import { productOfferSchema } from '~/lib/seo/schemas';
import { POSITIONING_SENTENCE } from '~/lib/site-meta';

import { ComparisonTable } from '../_components/comparison-table';

export const metadata: Metadata = {
  title: 'Pricing — Klio',
  description:
    'Free forever for one person. $20 per user per month when your team shares one memory across Claude Code, Cursor and Codex.',
  keywords: [
    'Klio pricing',
    'AI agent memory pricing',
    'shared agent memory',
    'MCP memory server pricing',
  ],
};

const USD = new Intl.NumberFormat('en-US');

function formatYearlyAnnotation(priceYearly: number, perSeat: boolean): string {
  //   priceYearly=200, perSeat  → "$200/user/yr ($17/user/mo)"
  //   priceYearly=990           → "$990/yr ($83/mo)"
  const monthlyEquivalent = Math.round(priceYearly / 12);
  const unit = perSeat ? '/user' : '';
  return `$${USD.format(priceYearly)}${unit}/yr ($${USD.format(monthlyEquivalent)}${unit}/mo)`;
}

const faqs = [
  {
    question: 'What am I actually paying for?',
    answer:
      'People. Klio is free for one person — unlimited memories, all your agents, synced across your own devices. You pay when a second person joins, because that is when their agents start sharing one brain with yours.',
  },
  {
    question: 'Are memories or recalls metered?',
    answer:
      'No. Memories, recalls and connected agents are unlimited on every plan. Most memories are captured automatically by hooks rather than deliberate tool calls, so metering them would charge you for volume you neither choose nor can predict. A per-minute rate limit guards against abuse instead.',
  },
  {
    question: 'Is anything deleted after a while?',
    answer:
      'On Team, no — memory retention is forever. On Free, memories older than 30 days are cleared out; upgrade to Team before the 30-day mark if you need to keep them past that. A memory layer that forgets on a timer by surprise is not a memory layer, so this is published up front, not discovered on day 31.',
  },
  {
    question: 'Can I self-host instead?',
    answer:
      'Yes, on every plan including Free. The engine is AGPL-3.0 and the MCP shim is Apache-2.0 — run it on your own hardware and pay nothing. Self-hosting gives you the core memory engine: capture, recall, spaces, the curator, encryption you hold the keys to, and a hash-chained audit trail.',
  },
  {
    question: 'What does Klio Cloud have that self-hosting does not?',
    answer:
      'The parts built on top of the store. Cloud runs the knowledge graph that links memories to the entities they are about, hybrid recall that matches exact identifiers as well as meaning, compression, and the curator pass that judges when a new fact contradicts an older one and retires it. Self-hosting is the memory engine; Cloud is the memory engine plus everything that reasons over it. The intelligence layer ships on Team; Free stores and retrieves so you can evaluate the core engine before paying for anything.',
  },
  {
    question: 'Then why would I self-host?',
    answer:
      'Custody. On your own hardware the encryption keys are yours and writes are hash-chained, which Cloud does not offer — we hold the keys there and encrypt at the infrastructure level instead. If your constraint is that memory cannot leave your network, self-host. If your constraint is getting the most out of it, use Cloud.',
  },
  {
    question: 'Can I switch plans at any time?',
    answer:
      'Yes. Upgrades take effect immediately with prorated billing; downgrades take effect at the start of your next billing cycle. Adding or removing a teammate adjusts your bill the same way.',
  },
  {
    question: 'Do you offer annual billing?',
    answer:
      'Yes. Annual billing is $200 per user per year, which works out to about $17 per user per month.',
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
        <div className="text-foreground mb-4 text-[13px] font-medium tracking-widest uppercase">
          Pricing
        </div>
        <h1 className="text-foreground mb-4 text-3xl font-bold sm:text-4xl">
          Simple, transparent pricing
        </h1>
        <p className="text-muted-foreground mb-2 text-xs">
          Last reviewed: {LAST_UPDATED}
        </p>
        <p className="text-muted-foreground mx-auto mb-4 max-w-[520px] text-lg">
          Start free. Scale as your agents go to production. No hidden fees.
        </p>
        <p className="text-muted-foreground mx-auto mb-12 max-w-[640px] text-sm leading-relaxed">
          {POSITIONING_SENTENCE}
        </p>
      </div>

      {/* Plan cards */}
      <ul
        role="list"
        className="mx-auto mb-20 grid max-w-[820px] list-none gap-4 p-0 sm:grid-cols-2"
      >
        {PLANS.map((plan) => (
          <li
            key={plan.id}
            aria-labelledby={`plan-${plan.id}-name`}
            className={`relative flex flex-col rounded-xl border p-8 ${
              plan.highlighted
                ? 'border-border/40 bg-foreground/5'
                : 'border-border bg-card'
            }`}
          >
            {plan.highlighted && (
              <div className="bg-foreground text-background absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-0.5 text-xs font-semibold">
                Most Popular
              </div>
            )}

            <h2
              id={`plan-${plan.id}-name`}
              className="text-foreground mb-1 text-xl font-semibold"
            >
              {plan.name}
            </h2>
            <div className="mb-1 flex items-baseline gap-1">
              <span className="text-foreground text-3xl font-bold">
                ${plan.priceMonthly}
              </span>
              <span className="text-muted-foreground text-sm">
                {plan.priceUnit === 'seat' ? '/user/mo' : '/mo'}
              </span>
            </div>
            {plan.priceYearly !== undefined && (
              <p className="text-muted-foreground mb-3 text-xs">
                or{' '}
                {formatYearlyAnnotation(
                  plan.priceYearly,
                  plan.priceUnit === 'seat',
                )}{' '}
                billed annually
              </p>
            )}
            <p className="text-muted-foreground mb-6 text-sm">
              {plan.description}
            </p>

            <Link
              href={plan.cta.href}
              className={`mb-8 inline-flex h-11 items-center justify-center rounded-lg text-sm font-semibold transition-colors ${
                plan.highlighted
                  ? 'bg-foreground text-background hover:bg-[var(--klio-foreground-strong)]'
                  : 'border-border text-muted-foreground hover:border-muted-foreground hover:text-foreground border'
              }`}
            >
              {plan.cta.label}
            </Link>

            <ul className="flex flex-1 flex-col gap-3">
              {plan.features.map((f) => (
                <li
                  key={f.label}
                  className="border-border/60 flex items-start justify-between gap-4 border-t pt-3 text-sm"
                >
                  <span className="text-muted-foreground">{f.label}</span>
                  <span className="text-muted-foreground text-right">
                    {f.value}
                  </span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>

      {/* Enterprise CTA */}
      <div className="mx-auto mb-20 max-w-[1200px]">
        <div className="border-border bg-card rounded-xl border p-10 text-center">
          <h2 className="text-foreground mb-2 text-2xl font-semibold">
            Enterprise
          </h2>
          <p className="text-muted-foreground mx-auto mb-6 max-w-[480px] text-sm">
            Need custom limits, SLAs, SSO, or on-prem deployment? Let&apos;s
            talk.
          </p>
          <a
            href="mailto:hello@klio.tech"
            className="border-border text-muted-foreground hover:border-muted-foreground hover:text-foreground inline-flex h-11 items-center rounded-lg border px-7 text-sm font-semibold transition-colors"
          >
            Contact Sales
          </a>
        </div>
      </div>

      {/* Competitor comparison */}
      <div className="mx-auto mb-20 max-w-[1100px]">
        <h2 className="text-foreground mb-2 text-center text-2xl font-semibold">
          How Vex Compares
        </h2>
        <p className="text-muted-foreground mx-auto mb-2 max-w-[520px] text-center text-sm">
          See how Vex stacks up against other AI agent reliability tools.
        </p>
        <ComparisonTable />
      </div>

      {/* FAQ */}
      <section aria-labelledby="faq-heading" className="mx-auto max-w-[800px]">
        <h2
          id="faq-heading"
          className="text-foreground mb-8 text-center text-2xl font-semibold"
        >
          Frequently Asked Questions
        </h2>
        <div className="grid gap-4">
          {faqs.map((faq) => (
            <details
              key={faq.question}
              className="border-border bg-background rounded-xl border p-6 [&>summary]:cursor-pointer"
            >
              <summary className="text-foreground text-[15px] font-medium">
                {faq.question}
              </summary>
              <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
