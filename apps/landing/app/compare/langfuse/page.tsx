import type { Metadata } from 'next';

import Link from 'next/link';

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
        <div className="mb-4 text-[13px] font-medium tracking-widest text-emerald-500 uppercase">
          Comparison
        </div>
        <h1 className="mb-4 text-3xl font-bold text-white sm:text-4xl">
          Vex vs Langfuse
        </h1>
        <p className="mb-12 max-w-[600px] text-lg text-[#a2a2a2]">
          Langfuse traces and evaluates. Vex detects drift and auto-corrects.
          Here&apos;s how they compare.
        </p>

        {/* Feature table */}
        <div className="mb-16 overflow-hidden rounded-xl border border-[#252525]">
          <div className="grid grid-cols-[1fr_80px_80px] bg-[#161616] px-6 py-3 text-sm font-medium">
            <span className="text-[#585858]">Feature</span>
            <span className="text-center text-emerald-500">Vex</span>
            <span className="text-center text-[#585858]">Langfuse</span>
          </div>
          {features.map((f) => (
            <div
              key={f.name}
              className="grid grid-cols-[1fr_80px_80px] border-t border-[#252525] px-6 py-3 text-sm"
            >
              <span className="text-[#a2a2a2]">{f.name}</span>
              <span className="text-center">
                {f.vex ? (
                  <span className="text-emerald-500">✓</span>
                ) : (
                  <span className="text-[#585858]">—</span>
                )}
              </span>
              <span className="text-center">
                {f.competitor ? (
                  <span className="text-white">✓</span>
                ) : (
                  <span className="text-[#585858]">—</span>
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
              Runtime reliability layer. Monitors agent behavior continuously,
              detects drift from learned baselines, and auto-corrects
              hallucinations before they reach users. Works with any framework.
            </p>
          </div>
          <div className="rounded-xl border border-[#252525] bg-[#0a0a0a] p-6">
            <h3 className="mb-2 font-mono text-sm font-medium text-[#a2a2a2]">
              Langfuse
            </h3>
            <p className="text-sm leading-relaxed text-[#a2a2a2]">
              LLM observability platform. Traces, evaluates, and manages
              prompts. Strong integration with LangChain and OpenAI.
              Community-driven with self-hosted option.
            </p>
          </div>
        </div>

        {/* Verdict */}
        <h2 className="mb-4 text-2xl font-semibold text-white">The Verdict</h2>
        <p className="mb-8 text-[15px] leading-relaxed text-[#a2a2a2]">
          Langfuse excels at observability and prompt management. Vex excels at
          runtime safety and auto-correction. Use Langfuse for development
          visibility. Use Vex for production guardrails. They complement each
          other perfectly.
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
            href="/blog/vex-vs-langsmith"
            className="inline-flex h-12 items-center rounded-lg border border-[#252525] px-7 text-[15px] font-medium text-[#a2a2a2] transition-colors hover:border-[#585858] hover:text-white"
          >
            Read Full Comparison&ensp;&rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
