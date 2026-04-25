import type { Metadata } from 'next';

import Link from 'next/link';

import { LAST_UPDATED } from '~/lib/pricing';
import { compareSchema } from '~/lib/seo/schemas';

export const metadata: Metadata = {
  title: 'Vex vs Braintrust — Runtime Guardrails vs Eval-First Observability',
  description:
    'Braintrust scores after the fact. Vex verifies and corrects in real-time. Compare AI agent reliability approaches.',
  keywords: [
    'Braintrust alternatives',
    'Vex vs Braintrust',
    'AI observability',
    'LLM guardrails',
  ],
};

const features = [
  { name: 'Hallucination detection', vex: true, competitor: false },
  { name: 'Behavioral drift detection', vex: true, competitor: false },
  { name: 'Schema validation', vex: true, competitor: false },
  { name: 'Multi-turn coherence', vex: true, competitor: false },
  { name: 'Auto-correction cascade', vex: true, competitor: false },
  { name: 'Real-time sync verification', vex: true, competitor: false },
  { name: 'LLM call tracing', vex: true, competitor: true },
  { name: 'Evaluation scorers', vex: true, competitor: true },
  { name: 'Prompt playground', vex: false, competitor: true },
  { name: 'Dataset management', vex: false, competitor: true },
  { name: 'Cost analytics', vex: true, competitor: true },
  { name: 'Framework agnostic', vex: true, competitor: true },
  { name: 'Python SDK', vex: true, competitor: true },
  { name: 'TypeScript SDK', vex: true, competitor: true },
  { name: 'Free tier', vex: true, competitor: true },
];

export default function CompareBraintrust() {
  return (
    <div className="container py-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            ...compareSchema({
              vendorSlug: 'braintrust',
              vendorName: 'Braintrust',
              vendorUrl: 'https://www.braintrust.dev',
            }),
          ]),
        }}
      />
      <div className="mx-auto max-w-[800px]">
        <div className="mb-4 text-[13px] font-medium tracking-widest text-emerald-500 uppercase">
          Comparison
        </div>
        <h1 className="mb-4 text-3xl font-bold text-white sm:text-4xl">
          Vex vs Braintrust
        </h1>
        <p className="mb-2 text-xs text-[#585858]">
          Last reviewed: {LAST_UPDATED}
        </p>
        <p className="mb-12 max-w-[600px] text-lg text-[#a2a2a2]">
          Braintrust is an eval-first observability platform ($80M Series B,
          $800M valuation). Vex is a runtime reliability layer that verifies and
          corrects agent output before it reaches users.
        </p>

        {/* Feature table */}
        <table className="mb-16 w-full table-fixed overflow-hidden rounded-xl border border-[#252525] text-sm">
          <caption className="sr-only">
            Vex vs Braintrust feature comparison
          </caption>
          <colgroup>
            <col />
            <col className="w-20" />
            <col className="w-20" />
          </colgroup>
          <thead className="bg-[#161616]">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left font-medium text-[#585858]"
              >
                Feature
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-center font-medium text-emerald-500"
              >
                Vex
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-center font-medium text-[#585858]"
              >
                Braintrust
              </th>
            </tr>
          </thead>
          <tbody>
            {features.map((f) => (
              <tr key={f.name} className="border-t border-[#252525]">
                <th
                  scope="row"
                  className="px-6 py-3 text-left font-normal text-[#a2a2a2]"
                >
                  {f.name}
                </th>
                <td className="px-6 py-3 text-center">
                  {f.vex ? (
                    <span aria-label="yes" className="text-emerald-500">
                      &#10003;
                    </span>
                  ) : (
                    <span aria-label="no" className="text-[#585858]">
                      &mdash;
                    </span>
                  )}
                </td>
                <td className="px-6 py-3 text-center">
                  {f.competitor ? (
                    <span aria-label="yes" className="text-white">
                      &#10003;
                    </span>
                  ) : (
                    <span aria-label="no" className="text-[#585858]">
                      &mdash;
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Key differences */}
        <h2 className="mb-6 text-2xl font-semibold text-white">
          Key Differences
        </h2>
        <div className="mb-16 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-[#252525] bg-[#0a0a0a] p-6">
            <h3 className="mb-2 font-mono text-sm font-medium text-emerald-500">
              Vex
            </h3>
            <p className="text-sm leading-relaxed text-[#a2a2a2]">
              Runtime reliability layer. Verifies every agent output in
              real-time against hallucination, drift, schema, and coherence
              checks. Auto-corrects failing outputs with a 3-layer cascade
              before they reach users.
            </p>
          </div>
          <div className="rounded-xl border border-[#252525] bg-[#0a0a0a] p-6">
            <h3 className="mb-2 font-mono text-sm font-medium text-[#a2a2a2]">
              Braintrust
            </h3>
            <p className="text-sm leading-relaxed text-[#a2a2a2]">
              Eval-first observability platform. Scores agent performance using
              custom evaluators, turns production traces into test cases, and
              provides comprehensive cost analytics. Strong at catching
              regressions across deployments. Pro plan at $249/month.
            </p>
          </div>
        </div>

        {/* Verdict */}
        <h2 className="mb-4 text-2xl font-semibold text-white">The Verdict</h2>
        <p className="mb-8 text-[15px] leading-relaxed text-[#a2a2a2]">
          Braintrust tells you how your agent performed after the fact. Vex
          prevents bad output from reaching users in the first place. Braintrust
          excels at eval workflows, prompt engineering, and regression
          detection. Vex excels at runtime safety, real-time blocking, and
          auto-correction. Use Braintrust for development iteration. Use Vex for
          production guardrails.
        </p>

        {/* CTA */}
        <div className="flex items-center gap-3">
          <Link
            href="https://app.tryvex.dev"
            className="inline-flex h-12 items-center rounded-lg bg-emerald-500 px-7 text-[15px] font-semibold text-white transition-colors hover:bg-emerald-400"
          >
            Try Vex Free
          </Link>
          <Link
            href="/pricing"
            className="inline-flex h-12 items-center rounded-lg border border-[#252525] px-7 text-[15px] font-medium text-[#a2a2a2] transition-colors hover:border-[#585858] hover:text-white"
          >
            Compare Plans&ensp;&rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
