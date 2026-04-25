import type { Metadata } from 'next';

import Link from 'next/link';

import { compareSchema } from '~/lib/seo/schemas';

export const metadata: Metadata = {
  title: 'Vex vs Galileo — Lightweight Guardrails vs Enterprise Eval Platform',
  description:
    'Galileo offers enterprise eval-to-guardrail lifecycle. Vex offers lightweight runtime verification with auto-correction. Compare approaches.',
  keywords: [
    'Galileo AI alternatives',
    'Vex vs Galileo',
    'AI guardrails',
    'agent reliability',
  ],
};

const features: {
  name: string;
  vex: boolean | string;
  competitor: boolean | string;
}[] = [
  { name: 'Hallucination detection', vex: true, competitor: true },
  { name: 'Behavioral drift detection', vex: true, competitor: 'partial' },
  { name: 'Schema validation', vex: true, competitor: false },
  { name: 'Multi-turn coherence', vex: true, competitor: false },
  { name: 'Auto-correction cascade', vex: true, competitor: false },
  { name: 'Real-time sync verification', vex: true, competitor: true },
  { name: 'Eval-to-guardrail lifecycle', vex: false, competitor: true },
  { name: 'Custom evaluators (Luna-2)', vex: false, competitor: true },
  { name: 'Agent tracing', vex: true, competitor: true },
  { name: 'Multi-agent support', vex: true, competitor: true },
  { name: 'Framework agnostic', vex: true, competitor: true },
  { name: 'Python SDK', vex: true, competitor: true },
  { name: 'TypeScript SDK', vex: true, competitor: 'partial' },
  { name: 'Free tier', vex: true, competitor: true },
  { name: 'Self-hosted option', vex: true, competitor: false },
];

export default function CompareGalileo() {
  return (
    <div className="container py-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            ...compareSchema({
              vendorSlug: 'galileo',
              vendorName: 'Galileo',
              vendorUrl: 'https://www.rungalileo.io',
            }),
          ]),
        }}
      />
      <div className="mx-auto max-w-[800px]">
        <div className="mb-4 text-[13px] font-medium tracking-widest text-emerald-500 uppercase">
          Comparison
        </div>
        <h1 className="mb-4 text-3xl font-bold text-white sm:text-4xl">
          Vex vs Galileo
        </h1>
        <p className="mb-12 max-w-[600px] text-lg text-[#a2a2a2]">
          Galileo is an enterprise AI reliability platform ($68M raised) with
          eval-to-guardrail lifecycle. Vex is a lightweight runtime verification
          layer with auto-correction.
        </p>

        {/* Feature table */}
        <div className="mb-16 overflow-hidden rounded-xl border border-[#252525]">
          <div className="grid grid-cols-[1fr_80px_80px] bg-[#161616] px-6 py-3 text-sm font-medium">
            <span className="text-[#585858]">Feature</span>
            <span className="text-center text-emerald-500">Vex</span>
            <span className="text-center text-[#585858]">Galileo</span>
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
              Lightweight runtime layer. 3 lines of code to integrate. Verifies
              every output against 4 checks (schema, hallucination, drift,
              coherence) and auto-corrects failures with a graduated cascade.
            </p>
          </div>
          <div className="rounded-xl border border-[#252525] bg-[#0a0a0a] p-6">
            <h3 className="mb-2 font-mono text-sm font-medium text-[#a2a2a2]">
              Galileo
            </h3>
            <p className="text-sm leading-relaxed text-[#a2a2a2]">
              Enterprise eval platform. Custom Luna-2 evaluators adapt with
              minimal labeled data. Pre-production evals automatically become
              production guardrails. Strong multi-agent support with CrewAI,
              LangGraph, and OpenAI Agent SDK integrations. Free tier with 5K
              traces/month.
            </p>
          </div>
        </div>

        {/* Verdict */}
        <h2 className="mb-4 text-2xl font-semibold text-white">The Verdict</h2>
        <p className="mb-8 text-[15px] leading-relaxed text-[#a2a2a2]">
          Galileo is the enterprise choice for teams that need custom evaluators
          and a full eval-to-guardrail pipeline. Vex is the developer choice for
          teams that want runtime verification and auto-correction with minimal
          setup. Galileo requires more configuration but offers deeper
          customization. Vex works out of the box with sensible defaults. Both
          detect hallucinations — only Vex auto-corrects them.
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
