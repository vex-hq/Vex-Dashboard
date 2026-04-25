'use client';

import { useState } from 'react';

import Link from 'next/link';

type Support = 'yes' | 'no' | 'partial' | 'paid' | 'oss';

interface Competitor {
  name: string;
  slug: string;
  tagline: string;
}

interface FeatureRow {
  feature: string;
  tooltip?: string;
  vex: Support;
  values: Record<string, Support>;
}

const competitors: Competitor[] = [
  {
    name: 'Guardrails AI',
    slug: 'guardrails-ai',
    tagline: 'Schema validation',
  },
  { name: 'Galileo', slug: 'galileo', tagline: 'Eval platform' },
  { name: 'Braintrust', slug: 'braintrust', tagline: 'Observability' },
  { name: 'Langfuse', slug: 'langfuse', tagline: 'OSS tracing' },
  { name: 'LangSmith', slug: 'langsmith', tagline: 'LangChain tracing' },
  { name: 'Sentrial', slug: 'sentrial', tagline: 'Agent monitoring' },
];

const categories: { label: string; rows: FeatureRow[] }[] = [
  {
    label: 'Runtime Verification',
    rows: [
      {
        feature: 'Hallucination detection',
        tooltip:
          'Detects fabricated facts by comparing agent output against ground truth data in real-time',
        vex: 'yes',
        values: {
          'guardrails-ai': 'partial',
          galileo: 'yes',
          braintrust: 'partial',
          langfuse: 'no',
          langsmith: 'no',
          sentrial: 'no',
        },
      },
      {
        feature: 'Behavioral drift detection',
        tooltip:
          'Detects when an agent gradually goes off-task over time, even without errors',
        vex: 'yes',
        values: {
          'guardrails-ai': 'no',
          galileo: 'partial',
          braintrust: 'no',
          langfuse: 'no',
          langsmith: 'no',
          sentrial: 'partial',
        },
      },
      {
        feature: 'Schema validation',
        tooltip:
          'Validates agent output against JSON Schema to ensure structural correctness',
        vex: 'yes',
        values: {
          'guardrails-ai': 'yes',
          galileo: 'no',
          braintrust: 'no',
          langfuse: 'no',
          langsmith: 'no',
          sentrial: 'no',
        },
      },
      {
        feature: 'Multi-turn coherence',
        tooltip:
          'Detects contradictions across conversation turns — catches agents that flip-flop on facts',
        vex: 'yes',
        values: {
          'guardrails-ai': 'no',
          galileo: 'no',
          braintrust: 'no',
          langfuse: 'no',
          langsmith: 'no',
          sentrial: 'no',
        },
      },
      {
        feature: 'Sync verify (real-time)',
        tooltip:
          'Blocks bad output before it reaches users — not just logging after the fact',
        vex: 'yes',
        values: {
          'guardrails-ai': 'yes',
          galileo: 'yes',
          braintrust: 'no',
          langfuse: 'no',
          langsmith: 'no',
          sentrial: 'no',
        },
      },
    ],
  },
  {
    label: 'Auto-Correction',
    rows: [
      {
        feature: 'Auto-correction cascade',
        tooltip:
          '3-layer automatic fix: L1 Repair → L2 Constrained Regen → L3 Full Reprompt',
        vex: 'yes',
        values: {
          'guardrails-ai': 'partial',
          galileo: 'no',
          braintrust: 'no',
          langfuse: 'no',
          langsmith: 'no',
          sentrial: 'no',
        },
      },
      {
        feature: 'Graduated correction layers',
        tooltip:
          'Starts with minimal edits, escalates to full regeneration only when needed',
        vex: 'yes',
        values: {
          'guardrails-ai': 'no',
          galileo: 'no',
          braintrust: 'no',
          langfuse: 'no',
          langsmith: 'no',
          sentrial: 'no',
        },
      },
      {
        feature: 'Transparent / opaque modes',
        tooltip:
          'Choose whether callers see the correction process or just get the fixed output',
        vex: 'yes',
        values: {
          'guardrails-ai': 'no',
          galileo: 'no',
          braintrust: 'no',
          langfuse: 'no',
          langsmith: 'no',
          sentrial: 'no',
        },
      },
    ],
  },
  {
    label: 'Observability',
    rows: [
      {
        feature: 'Async telemetry ingestion',
        tooltip:
          'Fire-and-forget event recording with zero impact on agent latency',
        vex: 'yes',
        values: {
          'guardrails-ai': 'no',
          galileo: 'yes',
          braintrust: 'yes',
          langfuse: 'yes',
          langsmith: 'yes',
          sentrial: 'yes',
        },
      },
      {
        feature: 'LLM call tracing',
        tooltip:
          'Detailed traces of every LLM call, tool use, and decision in production',
        vex: 'yes',
        values: {
          'guardrails-ai': 'no',
          galileo: 'yes',
          braintrust: 'yes',
          langfuse: 'yes',
          langsmith: 'yes',
          sentrial: 'yes',
        },
      },
      {
        feature: 'Cost & token tracking',
        tooltip: 'Track token usage and cost per agent, per model, per session',
        vex: 'yes',
        values: {
          'guardrails-ai': 'no',
          galileo: 'yes',
          braintrust: 'yes',
          langfuse: 'yes',
          langsmith: 'yes',
          sentrial: 'partial',
        },
      },
      {
        feature: 'Dashboard & analytics',
        tooltip:
          'Visual dashboards showing agent health, confidence trends, and alert summaries',
        vex: 'yes',
        values: {
          'guardrails-ai': 'paid',
          galileo: 'yes',
          braintrust: 'yes',
          langfuse: 'yes',
          langsmith: 'yes',
          sentrial: 'yes',
        },
      },
    ],
  },
  {
    label: 'Developer Experience',
    rows: [
      {
        feature: 'Python SDK',
        vex: 'yes',
        values: {
          'guardrails-ai': 'yes',
          galileo: 'yes',
          braintrust: 'yes',
          langfuse: 'yes',
          langsmith: 'yes',
          sentrial: 'no',
        },
      },
      {
        feature: 'TypeScript SDK',
        vex: 'yes',
        values: {
          'guardrails-ai': 'no',
          galileo: 'partial',
          braintrust: 'yes',
          langfuse: 'yes',
          langsmith: 'yes',
          sentrial: 'no',
        },
      },
      {
        feature: 'Setup complexity',
        tooltip: 'How many lines of code and config to get started',
        vex: 'yes',
        values: {
          'guardrails-ai': 'partial',
          galileo: 'partial',
          braintrust: 'partial',
          langfuse: 'partial',
          langsmith: 'partial',
          sentrial: 'partial',
        },
      },
      {
        feature: 'Framework agnostic',
        tooltip:
          'Works with any LLM framework — LangChain, CrewAI, OpenAI, or raw API calls',
        vex: 'yes',
        values: {
          'guardrails-ai': 'yes',
          galileo: 'yes',
          braintrust: 'yes',
          langfuse: 'yes',
          langsmith: 'partial',
          sentrial: 'partial',
        },
      },
    ],
  },
  {
    label: 'Pricing & Plans',
    rows: [
      {
        feature: 'Free tier',
        tooltip: 'Usable free plan with real limits, not just a trial',
        vex: 'yes',
        values: {
          'guardrails-ai': 'oss',
          galileo: 'yes',
          braintrust: 'yes',
          langfuse: 'oss',
          langsmith: 'yes',
          sentrial: 'yes',
        },
      },
      {
        feature: 'Self-hosted option',
        vex: 'yes',
        values: {
          'guardrails-ai': 'yes',
          galileo: 'no',
          braintrust: 'paid',
          langfuse: 'yes',
          langsmith: 'no',
          sentrial: 'no',
        },
      },
    ],
  },
];

const setupLabels: Record<string, string> = {
  vex: '3 lines',
  'guardrails-ai': 'Moderate',
  galileo: 'Moderate',
  braintrust: 'Moderate',
  langfuse: 'Moderate',
  langsmith: 'Moderate',
  sentrial: 'Moderate',
};

const supportAriaLabel: Record<Support, string> = {
  yes: 'yes',
  no: 'no',
  partial: 'partial',
  paid: 'paid only',
  oss: 'yes',
};

function Badge({
  value,
  slug,
  feature,
}: {
  value: Support;
  slug?: string;
  feature?: string;
}) {
  if (feature === 'Setup complexity') {
    const label = slug ? (setupLabels[slug] ?? 'Moderate') : '3 lines';
    const isVex = !slug;
    return (
      <span
        className={`font-mono text-xs ${isVex ? 'text-emerald-500' : 'text-[#a2a2a2]'}`}
      >
        {label}
      </span>
    );
  }

  const ariaLabel = supportAriaLabel[value];

  switch (value) {
    case 'yes':
      return (
        <span aria-label={ariaLabel} className="text-emerald-500">
          &#10003;
        </span>
      );
    case 'partial':
      return (
        <span aria-label={ariaLabel} className="text-amber-400">
          ~
        </span>
      );
    case 'paid':
      return (
        <span
          aria-label={ariaLabel}
          className="font-mono text-xs text-amber-400"
        >
          $
        </span>
      );
    case 'oss':
      return (
        <span aria-label={ariaLabel} className="text-emerald-500">
          &#10003;
        </span>
      );
    case 'no':
    default:
      return (
        <span aria-label={ariaLabel} className="text-[#383838]">
          &mdash;
        </span>
      );
  }
}

/* ─── Mobile: "Vex vs X" picker with 3-column layout ─── */
function MobileComparison() {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const selected = competitors[selectedIdx]!;

  return (
    <div className="md:hidden">
      {/* Competitor picker */}
      <div className="scrollbar-none mb-4 flex gap-2 overflow-x-auto pb-2">
        {competitors.map((c, i) => (
          <button
            key={c.slug}
            onClick={() => setSelectedIdx(i)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
              i === selectedIdx
                ? 'bg-emerald-500/15 text-emerald-500 ring-1 ring-emerald-500/30'
                : 'bg-[#161616] text-[#a2a2a2] hover:text-white'
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* 3-column table: Feature | Vex | Competitor */}
      <table className="w-full table-fixed overflow-hidden rounded-xl border border-[#252525] bg-[#0a0a0a]">
        <caption className="sr-only">
          Vex vs {selected.name} feature comparison
        </caption>
        <colgroup>
          <col />
          <col className="w-14" />
          <col className="w-14" />
        </colgroup>
        <thead className="bg-[#111111] text-[11px] font-semibold tracking-wider uppercase">
          <tr>
            <th scope="col" className="px-4 py-2.5 text-left text-[#585858]">
              Feature
            </th>
            <th
              scope="col"
              className="px-4 py-2.5 text-center text-emerald-500"
            >
              Vex
            </th>
            <th
              scope="col"
              className="truncate px-4 py-2.5 text-center text-[#a2a2a2]"
            >
              {selected.name.split(' ')[0]}
            </th>
          </tr>
        </thead>
        {categories.map((cat) => (
          <tbody key={cat.label}>
            {/* Category label */}
            <tr>
              <th
                scope="colgroup"
                colSpan={3}
                className="bg-[#0f0f0f] px-4 py-2 text-left text-[10px] font-semibold tracking-widest text-[#444] uppercase"
              >
                {cat.label}
              </th>
            </tr>
            {cat.rows.map((row) => (
              <tr
                key={row.feature}
                className="border-t border-[#1a1a1a] text-[13px]"
              >
                <th
                  scope="row"
                  className="px-4 py-2.5 pr-2 text-left font-normal text-[#a2a2a2]"
                >
                  {row.feature}
                </th>
                <td className="px-4 py-2.5 text-center">
                  <Badge value={row.vex} feature={row.feature} />
                </td>
                <td className="px-4 py-2.5 text-center">
                  <Badge
                    value={row.values[selected.slug] ?? 'no'}
                    slug={selected.slug}
                    feature={row.feature}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        ))}
      </table>

      {/* Deep-dive link */}
      <Link
        href={`/compare/${selected.slug}`}
        className="mt-4 flex items-center justify-center rounded-lg border border-[#252525] py-2.5 text-sm font-medium text-[#a2a2a2] transition-colors hover:border-[#585858] hover:text-white"
      >
        Full Vex vs {selected.name} breakdown&ensp;&rarr;
      </Link>

      {/* All compare links */}
      <div className="mt-4 flex flex-wrap gap-2">
        {competitors.map((c) => (
          <Link
            key={c.slug}
            href={`/compare/${c.slug}`}
            className="inline-flex items-center rounded-md border border-[#252525] px-2.5 py-1 text-[11px] text-[#585858] transition-colors hover:border-[#585858] hover:text-white"
          >
            vs {c.name}
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ─── Desktop: full table ─── */
function DesktopComparison() {
  return (
    <div className="hidden md:block">
      <div className="overflow-x-auto rounded-xl border border-[#252525] bg-[#0a0a0a]">
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <caption className="sr-only">
            Vex vs {competitors.map((c) => c.name).join(', ')} feature
            comparison
          </caption>
          <thead>
            <tr>
              <th
                scope="col"
                className="sticky left-0 z-10 border-b border-[#252525] bg-[#0a0a0a] px-5 py-3.5 text-left text-[13px] font-semibold text-[#585858]"
              >
                Feature
              </th>
              <th
                scope="col"
                className="border-b border-l border-[#252525] border-l-emerald-500/40 bg-emerald-500/[0.08] px-4 py-3.5 text-center text-[13px] font-bold text-emerald-500"
              >
                Vex
              </th>
              {competitors.map((c) => (
                <th
                  key={c.slug}
                  scope="col"
                  className="border-b border-[#252525] px-4 py-3.5 text-center"
                >
                  <Link href={`/compare/${c.slug}`} className="group">
                    <div className="text-[13px] font-semibold text-[#a2a2a2] transition-colors group-hover:text-white">
                      {c.name}
                    </div>
                    <div className="text-[10px] text-[#585858]">
                      {c.tagline}
                    </div>
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          {categories.map((cat) => (
            <tbody key={cat.label}>
              <tr>
                <th
                  scope="colgroup"
                  colSpan={2 + competitors.length}
                  className="border-b border-[#252525] bg-[#111111] px-5 py-2.5 text-left text-[11px] font-semibold tracking-widest text-[#585858] uppercase"
                >
                  {cat.label}
                </th>
              </tr>
              {cat.rows.map((row) => (
                <tr
                  key={row.feature}
                  className="transition-colors hover:bg-[#161616]"
                >
                  <th
                    scope="row"
                    className="sticky left-0 z-10 border-b border-[#252525] bg-[#0a0a0a] px-5 py-3 text-left font-medium text-white"
                  >
                    <span>{row.feature}</span>
                    {row.tooltip && (
                      <span
                        className="ml-1.5 inline-block cursor-help text-[#585858]"
                        title={row.tooltip}
                      >
                        ?
                      </span>
                    )}
                  </th>
                  <td className="border-b border-l border-[#252525] border-l-emerald-500/40 bg-emerald-500/[0.08] px-4 py-3 text-center font-semibold">
                    <Badge value={row.vex} feature={row.feature} />
                  </td>
                  {competitors.map((c) => (
                    <td
                      key={c.slug}
                      className="border-b border-[#252525] px-4 py-3 text-center"
                    >
                      <Badge
                        value={row.values[c.slug] ?? 'no'}
                        slug={c.slug}
                        feature={row.feature}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>

      {/* Bottom links */}
      <div className="mt-6 flex flex-wrap gap-3">
        {competitors.map((c) => (
          <Link
            key={c.slug}
            href={`/compare/${c.slug}`}
            className="inline-flex items-center rounded-md border border-[#252525] px-3 py-1.5 text-xs text-[#a2a2a2] transition-colors hover:border-[#585858] hover:text-white"
          >
            Vex vs {c.name}&ensp;&rarr;
          </Link>
        ))}
      </div>
    </div>
  );
}

export function ComparisonTable() {
  return (
    <div className="mt-12">
      {/* Legend */}
      <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[#585858]">
        <span className="flex items-center gap-1.5">
          <span className="text-emerald-500">&#10003;</span> Supported
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-amber-400">~</span> Partial
        </span>
        <span className="flex items-center gap-1.5">
          <span className="font-mono text-amber-400">$</span> Paid only
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-[#383838]">&mdash;</span> Not available
        </span>
      </div>

      <MobileComparison />
      <DesktopComparison />
    </div>
  );
}
