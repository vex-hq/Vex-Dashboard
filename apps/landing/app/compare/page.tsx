import type { Metadata } from 'next';

import Link from 'next/link';

import { getAllConceptComparisons } from '~/lib/pseo/content';

export const metadata: Metadata = {
  title: 'AI Agent Comparisons — Vex',
  description:
    'Compare approaches and tools for AI agent reliability. Guardrails vs Fine-Tuning, Runtime Verification vs Prompt Engineering, and more.',
};

const TOOL_COMPARISONS = [
  { slug: 'langsmith', name: 'LangSmith' },
  { slug: 'langfuse', name: 'Langfuse' },
  { slug: 'guardrails-ai', name: 'Guardrails AI' },
  { slug: 'braintrust', name: 'Braintrust' },
  { slug: 'galileo', name: 'Galileo' },
  { slug: 'sentrial', name: 'Sentrial' },
];

export default function CompareIndexPage() {
  const conceptComparisons = getAllConceptComparisons();

  return (
    <div className="container py-24">
      <div className="mb-16 border-b border-[#252525] pb-12">
        <div className="mb-4 text-[13px] font-medium tracking-widest text-emerald-500 uppercase">
          Compare
        </div>
        <h1 className="mb-4 text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
          Comparisons
        </h1>
        <p className="max-w-[520px] text-[17px] leading-relaxed text-[#a2a2a2]">
          Understand trade-offs between different approaches and tools for AI
          agent reliability.
        </p>
      </div>

      {/* Tool comparisons */}
      <section className="mb-16">
        <h2 className="mb-6 text-xl font-bold text-white">Vex vs Alternatives</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {TOOL_COMPARISONS.map((tool) => (
            <Link
              key={tool.slug}
              href={`/compare/${tool.slug}`}
              className="group rounded-lg border border-[#252525] bg-[#0a0a0a] p-5 transition-colors hover:border-emerald-500/30 hover:bg-[#161616]"
            >
              <h3 className="text-base font-semibold text-white group-hover:text-emerald-400">
                Vex vs {tool.name}
              </h3>
            </Link>
          ))}
        </div>
      </section>

      {/* Concept comparisons */}
      {conceptComparisons.length > 0 && (
        <section>
          <h2 className="mb-6 text-xl font-bold text-white">Approach Comparisons</h2>
          <div className="grid gap-6 md:grid-cols-2">
            {conceptComparisons.map((comp) => (
              <Link
                key={comp.meta.slug}
                href={`/compare/concepts/${comp.meta.slug}`}
                className="group rounded-xl border border-[#252525] bg-[#0a0a0a] p-6 transition-colors hover:border-emerald-500/30 hover:bg-[#161616]"
              >
                <h3 className="mb-2 text-lg font-semibold text-white group-hover:text-emerald-400">
                  {comp.seo.title}
                </h3>
                <p className="text-sm leading-relaxed text-[#a2a2a2]">
                  {comp.seo.description}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
