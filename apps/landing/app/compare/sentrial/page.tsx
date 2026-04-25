import type { Metadata } from 'next';

import Link from 'next/link';

import { LAST_UPDATED } from '~/lib/pricing';
import { compareSchema } from '~/lib/seo/schemas';

export const metadata: Metadata = {
  title: 'Vex vs Sentrial — Runtime Verification vs Agent Monitoring',
  description:
    'Sentrial monitors AI agent metrics. Vex verifies output correctness and auto-corrects failures. Compare approaches to agent reliability.',
  keywords: [
    'Sentrial alternatives',
    'Vex vs Sentrial',
    'AI agent monitoring',
    'agent reliability',
  ],
};

const features: {
  name: string;
  vex: boolean | string;
  competitor: boolean | string;
}[] = [
  { name: 'Hallucination detection', vex: true, competitor: false },
  { name: 'Behavioral drift detection', vex: true, competitor: 'partial' },
  { name: 'Schema validation', vex: true, competitor: false },
  { name: 'Multi-turn coherence', vex: true, competitor: false },
  { name: 'Auto-correction cascade', vex: true, competitor: false },
  { name: 'Real-time sync verification', vex: true, competitor: false },
  { name: 'Agent metrics dashboard', vex: true, competitor: true },
  { name: 'Success rate tracking', vex: true, competitor: true },
  { name: 'ROI measurement', vex: false, competitor: true },
  { name: 'Async telemetry', vex: true, competitor: true },
  { name: 'Framework agnostic', vex: true, competitor: 'partial' },
  { name: 'Python SDK', vex: true, competitor: false },
  { name: 'TypeScript SDK', vex: true, competitor: false },
  { name: 'Free tier', vex: true, competitor: true },
  { name: 'Self-hosted option', vex: true, competitor: false },
];

export default function CompareSentrial() {
  return (
    <div className="container py-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            ...compareSchema({
              vendorSlug: 'sentrial',
              vendorName: 'Sentrial',
              vendorUrl: 'https://www.sentrial.com/',
            }),
          ]),
        }}
      />
      <div className="mx-auto max-w-[800px]">
        <div className="mb-4 text-[13px] font-medium tracking-widest text-emerald-500 uppercase">
          Comparison
        </div>
        <h1 className="mb-4 text-3xl font-bold text-white sm:text-4xl">
          Vex vs Sentrial
        </h1>
        <p className="mb-2 text-xs text-[#585858]">
          Last reviewed: {LAST_UPDATED}
        </p>
        <p className="mb-12 max-w-[600px] text-lg text-[#a2a2a2]">
          Sentrial monitors AI agent metrics, tracks success rates, and measures
          ROI. Vex verifies output correctness in real-time and auto-corrects
          failures before they reach users.
        </p>

        {/* Feature table */}
        <table className="mb-16 w-full table-fixed overflow-hidden rounded-xl border border-[#252525] text-sm">
          <caption className="sr-only">
            Vex vs Sentrial feature comparison
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
                Sentrial
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
                  {f.vex === true ? (
                    <span aria-label="yes" className="text-emerald-500">
                      &#10003;
                    </span>
                  ) : f.vex === 'partial' ? (
                    <span aria-label="partial" className="text-amber-400">
                      ~
                    </span>
                  ) : (
                    <span aria-label="no" className="text-[#585858]">
                      &mdash;
                    </span>
                  )}
                </td>
                <td className="px-6 py-3 text-center">
                  {f.competitor === true ? (
                    <span aria-label="yes" className="text-white">
                      &#10003;
                    </span>
                  ) : f.competitor === 'partial' ? (
                    <span aria-label="partial" className="text-amber-400">
                      ~
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
              Runtime verification and correction engine. Every agent output is
              scored against hallucination, drift, schema, and coherence checks.
              Failing outputs are automatically corrected through a 3-layer
              cascade. Python and TypeScript SDKs.
            </p>
          </div>
          <div className="rounded-xl border border-[#252525] bg-[#0a0a0a] p-6">
            <h3 className="mb-2 font-mono text-sm font-medium text-[#a2a2a2]">
              Sentrial
            </h3>
            <p className="text-sm leading-relaxed text-[#a2a2a2]">
              Agent monitoring and analytics platform. Tracks agent metrics,
              success rates, and ROI in a visual dashboard. Focuses on
              understanding whether AI agents are delivering business value
              rather than verifying individual output correctness.
            </p>
          </div>
        </div>

        {/* Verdict */}
        <h2 className="mb-4 text-2xl font-semibold text-white">The Verdict</h2>
        <p className="mb-8 text-[15px] leading-relaxed text-[#a2a2a2]">
          Sentrial answers &ldquo;are my agents delivering ROI?&rdquo; Vex
          answers &ldquo;is this specific output correct?&rdquo; Sentrial
          operates at the business metrics layer — success rates, costs, and
          outcomes. Vex operates at the output layer — catching hallucinations,
          drift, and incoherence in real-time. Use Sentrial for executive
          visibility. Use Vex for production safety. They solve different
          problems.
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
