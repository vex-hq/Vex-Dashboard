import type { Metadata } from 'next';

import Link from 'next/link';

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
  { name: 'Open source', vex: true, competitor: false },
];

export default function CompareBraintrust() {
  return (
    <div className="container py-24">
      <div className="mx-auto max-w-[800px]">
        <div className="mb-4 text-[13px] font-medium tracking-widest text-emerald-500 uppercase">
          Comparison
        </div>
        <h1 className="mb-4 text-3xl font-bold text-white sm:text-4xl">
          Vex vs Braintrust
        </h1>
        <p className="mb-12 max-w-[600px] text-lg text-[#a2a2a2]">
          Braintrust is an eval-first observability platform ($80M Series B,
          $800M valuation). Vex is a runtime reliability layer that verifies and
          corrects agent output before it reaches users.
        </p>

        {/* Feature table */}
        <div className="mb-16 overflow-hidden rounded-xl border border-[#252525]">
          <div className="grid grid-cols-[1fr_80px_80px] bg-[#161616] px-6 py-3 text-sm font-medium">
            <span className="text-[#585858]">Feature</span>
            <span className="text-center text-emerald-500">Vex</span>
            <span className="text-center text-[#585858]">Braintrust</span>
          </div>
          {features.map((f) => (
            <div
              key={f.name}
              className="grid grid-cols-[1fr_80px_80px] border-t border-[#252525] px-6 py-3 text-sm"
            >
              <span className="text-[#a2a2a2]">{f.name}</span>
              <span className="text-center">
                {f.vex ? (
                  <span className="text-emerald-500">&#10003;</span>
                ) : (
                  <span className="text-[#585858]">&mdash;</span>
                )}
              </span>
              <span className="text-center">
                {f.competitor ? (
                  <span className="text-white">&#10003;</span>
                ) : (
                  <span className="text-[#585858]">&mdash;</span>
                )}
              </span>
            </div>
          ))}
        </div>

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
              before they reach users. Fully open source.
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
