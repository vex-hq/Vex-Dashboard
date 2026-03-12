import type { Metadata } from 'next';

import Link from 'next/link';

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

const features: { name: string; vex: boolean | string; competitor: boolean | string }[] = [
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
  { name: 'Open source', vex: true, competitor: false },
  { name: 'Self-hosted option', vex: true, competitor: false },
];

export default function CompareSentrial() {
  return (
    <div className="container py-24">
      <div className="mx-auto max-w-[800px]">
        <div className="mb-4 text-[13px] font-medium tracking-widest text-emerald-500 uppercase">
          Comparison
        </div>
        <h1 className="mb-4 text-3xl font-bold text-white sm:text-4xl">
          Vex vs Sentrial
        </h1>
        <p className="mb-12 max-w-[600px] text-lg text-[#a2a2a2]">
          Sentrial monitors AI agent metrics, tracks success rates, and measures
          ROI. Vex verifies output correctness in real-time and auto-corrects
          failures before they reach users.
        </p>

        {/* Feature table */}
        <div className="mb-16 overflow-hidden rounded-xl border border-[#252525]">
          <div className="grid grid-cols-[1fr_80px_80px] bg-[#161616] px-6 py-3 text-sm font-medium">
            <span className="text-[#585858]">Feature</span>
            <span className="text-center text-emerald-500">Vex</span>
            <span className="text-center text-[#585858]">Sentrial</span>
          </div>
          {features.map((f) => (
            <div
              key={f.name}
              className="grid grid-cols-[1fr_80px_80px] border-t border-[#252525] px-6 py-3 text-sm"
            >
              <span className="text-[#a2a2a2]">{f.name}</span>
              <span className="text-center">
                {f.vex === true ? (
                  <span className="text-emerald-500">&#10003;</span>
                ) : f.vex === 'partial' ? (
                  <span className="text-amber-400">~</span>
                ) : (
                  <span className="text-[#585858]">&mdash;</span>
                )}
              </span>
              <span className="text-center">
                {f.competitor === true ? (
                  <span className="text-white">&#10003;</span>
                ) : f.competitor === 'partial' ? (
                  <span className="text-amber-400">~</span>
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
              Runtime verification and correction engine. Every agent output is
              scored against hallucination, drift, schema, and coherence checks.
              Failing outputs are automatically corrected through a 3-layer
              cascade. Python and TypeScript SDKs. Open source.
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
