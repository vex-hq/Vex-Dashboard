import type { Metadata } from 'next';

import Link from 'next/link';

import { LAST_UPDATED } from '~/lib/pricing';
import { compareSchema } from '~/lib/seo/schemas';

export const metadata: Metadata = {
  title: 'Vex vs LangSmith — Runtime Reliability vs Tracing',
  description:
    'Compare Vex and LangSmith for AI agent monitoring. LangSmith traces what happened. Vex prevents bad output from reaching users.',
  keywords: [
    'LangSmith alternatives',
    'Vex vs LangSmith',
    'AI agent monitoring',
    'LangChain monitoring',
  ],
};

const features = [
  { name: 'LLM call tracing', vex: true, competitor: true },
  { name: 'Production monitoring', vex: true, competitor: true },
  { name: 'Behavioral drift detection', vex: true, competitor: false },
  { name: 'Auto-correction', vex: true, competitor: false },
  { name: 'Hallucination blocking', vex: true, competitor: false },
  { name: 'Pre-deploy evals', vex: true, competitor: true },
  { name: 'Framework agnostic', vex: true, competitor: false },
  { name: 'Zero-latency async mode', vex: true, competitor: false },
  { name: 'Self-hosted option', vex: true, competitor: true },
];

export default function CompareLangSmith() {
  return (
    <div className="container py-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            ...compareSchema({
              vendorSlug: 'langsmith',
              vendorName: 'LangSmith',
              vendorUrl: 'https://www.langchain.com/langsmith',
            }),
          ]),
        }}
      />
      <div className="mx-auto max-w-[800px]">
        <div className="mb-4 text-[13px] font-medium tracking-widest text-foreground uppercase">
          Comparison
        </div>
        <h1 className="mb-4 text-3xl font-bold text-foreground sm:text-4xl">
          Vex vs LangSmith
        </h1>
        <p className="mb-2 text-xs text-muted-foreground">
          Last reviewed: {LAST_UPDATED}
        </p>
        <p className="mb-12 max-w-[600px] text-lg text-muted-foreground">
          LangSmith traces what happened. Vex prevents bad output from reaching
          users. Here&apos;s how they compare.
        </p>

        {/* Feature table */}
        <table className="mb-16 w-full table-fixed overflow-hidden rounded-xl border border-border text-sm">
          <caption className="sr-only">
            Vex vs LangSmith feature comparison
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
                LangSmith
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
              LangSmith
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Tracing and evaluation platform. Deep visibility into LangChain
              execution chains. Best for debugging during development and
              running pre-deploy evaluations. Best with LangChain.
            </p>
          </div>
        </div>

        {/* Verdict */}
        <h2 className="mb-4 text-2xl font-semibold text-foreground">The Verdict</h2>
        <p className="mb-8 text-[15px] leading-relaxed text-muted-foreground">
          Use LangSmith for development debugging and pre-deploy evals. Use Vex
          for production monitoring and real-time guardrails. For the strongest
          setup, use both — LangSmith tells you what your agent did, Vex makes
          sure it keeps doing it correctly.
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
