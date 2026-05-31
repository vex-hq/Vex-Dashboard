import type { Metadata } from 'next';

import Link from 'next/link';

import { LAST_UPDATED } from '~/lib/pricing';
import { compareSchema } from '~/lib/seo/schemas';

export const metadata: Metadata = {
  title: 'Vex vs Langfuse — Observability vs Runtime Reliability',
  description:
    'Langfuse traces and evaluates. Vex detects drift and auto-corrects. Compare features side by side.',
  keywords: [
    'Langfuse alternatives',
    'Vex vs Langfuse',
    'Langfuse vs LangSmith',
    'LLM observability',
  ],
};

const features = [
  { name: 'LLM call tracing', vex: true, competitor: true },
  { name: 'Production monitoring', vex: true, competitor: true },
  { name: 'Prompt management', vex: false, competitor: true },
  { name: 'Dataset management', vex: false, competitor: true },
  { name: 'Behavioral drift detection', vex: true, competitor: false },
  { name: 'Auto-correction', vex: true, competitor: false },
  { name: 'Hallucination blocking', vex: true, competitor: false },
  { name: 'Framework agnostic', vex: true, competitor: true },
  { name: 'Zero-latency async mode', vex: true, competitor: false },
  { name: 'Self-hosted option', vex: true, competitor: true },
];

export default function CompareLangfuse() {
  return (
    <div className="container py-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            ...compareSchema({
              vendorSlug: 'langfuse',
              vendorName: 'Langfuse',
              vendorUrl: 'https://langfuse.com',
            }),
          ]),
        }}
      />
      <div className="mx-auto max-w-[800px]">
        <div className="mb-4 text-[13px] font-medium tracking-widest text-foreground uppercase">
          Comparison
        </div>
        <h1 className="mb-4 text-3xl font-bold text-foreground sm:text-4xl">
          Vex vs Langfuse
        </h1>
        <p className="mb-2 text-xs text-muted-foreground">
          Last reviewed: {LAST_UPDATED}
        </p>
        <p className="mb-12 max-w-[600px] text-lg text-muted-foreground">
          Langfuse traces and evaluates. Vex detects drift and auto-corrects.
          Here&apos;s how they compare.
        </p>

        {/* Feature table */}
        <table className="mb-16 w-full table-fixed overflow-hidden rounded-xl border border-border text-sm">
          <caption className="sr-only">
            Vex vs Langfuse feature comparison
          </caption>
          <colgroup>
            <col />
            <col className="w-20" />
            <col className="w-20" />
          </colgroup>
          <thead className="bg-card">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left font-medium text-muted-foreground"
              >
                Feature
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-center font-medium text-foreground"
              >
                Vex
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-center font-medium text-muted-foreground"
              >
                Langfuse
              </th>
            </tr>
          </thead>
          <tbody>
            {features.map((f) => (
              <tr key={f.name} className="border-t border-border">
                <th
                  scope="row"
                  className="px-6 py-3 text-left font-normal text-muted-foreground"
                >
                  {f.name}
                </th>
                <td className="px-6 py-3 text-center">
                  {f.vex ? (
                    <span aria-label="yes" className="text-foreground">
                      ✓
                    </span>
                  ) : (
                    <span aria-label="no" className="text-muted-foreground">
                      —
                    </span>
                  )}
                </td>
                <td className="px-6 py-3 text-center">
                  {f.competitor ? (
                    <span aria-label="yes" className="text-foreground">
                      ✓
                    </span>
                  ) : (
                    <span aria-label="no" className="text-muted-foreground">
                      —
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Key differences */}
        <h2 className="mb-6 text-2xl font-semibold text-foreground">
          Key Differences
        </h2>
        <div className="mb-16 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-border bg-background p-6">
            <h3 className="mb-2 font-mono text-sm font-medium text-foreground">
              Vex
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Runtime reliability layer. Monitors agent behavior continuously,
              detects drift from learned baselines, and auto-corrects
              hallucinations before they reach users. Works with any framework.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-background p-6">
            <h3 className="mb-2 font-mono text-sm font-medium text-muted-foreground">
              Langfuse
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              LLM observability platform. Traces, evaluates, and manages
              prompts. Strong integration with LangChain and OpenAI.
              Community-driven with self-hosted option.
            </p>
          </div>
        </div>

        {/* Verdict */}
        <h2 className="mb-4 text-2xl font-semibold text-foreground">The Verdict</h2>
        <p className="mb-8 text-[15px] leading-relaxed text-muted-foreground">
          Langfuse excels at observability and prompt management. Vex excels at
          runtime safety and auto-correction. Use Langfuse for development
          visibility. Use Vex for production guardrails. They complement each
          other perfectly.
        </p>

        {/* CTA */}
        <div className="flex items-center gap-3">
          <Link
            href="https://app.tryvex.dev"
            className="inline-flex h-12 items-center rounded-lg bg-foreground px-7 text-[15px] font-semibold text-background transition-colors hover:bg-[var(--klio-foreground-strong)]"
          >
            Try Vex Free
          </Link>
          <Link
            href="/blog/vex-vs-langsmith"
            className="inline-flex h-12 items-center rounded-lg border border-border px-7 text-[15px] font-medium text-muted-foreground transition-colors hover:border-muted-foreground hover:text-foreground"
          >
            Read Full Comparison&ensp;&rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
