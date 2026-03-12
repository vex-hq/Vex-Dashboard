import type { Metadata } from 'next';

import Link from 'next/link';

import { getAllProblemGuides } from '~/lib/pseo/content';

export const metadata: Metadata = {
  title: 'AI Agent Problem Guides — Vex',
  description:
    'Deep-dive guides on common AI agent problems: hallucination detection, drift monitoring, prompt injection prevention, and more.',
};

export default function LearnIndexPage() {
  const guides = getAllProblemGuides();

  return (
    <div className="container py-24">
      <div className="mb-16 border-b border-[#252525] pb-12">
        <div className="mb-4 text-[13px] font-medium tracking-widest text-emerald-500 uppercase">
          Learn
        </div>
        <h1 className="mb-4 text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
          AI Agent Problem Guides
        </h1>
        <p className="max-w-[520px] text-[17px] leading-relaxed text-[#a2a2a2]">
          Deep-dive guides covering detection, diagnosis, and remediation for
          common AI agent failure modes in production.
        </p>
      </div>

      {guides.length === 0 ? (
        <p className="text-[#a2a2a2]">No guides yet. Check back soon.</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {guides.map((guide) => (
            <Link
              key={guide.meta.slug}
              href={`/learn/${guide.meta.slug}`}
              className="group rounded-xl border border-[#252525] bg-[#0a0a0a] p-6 transition-colors hover:border-emerald-500/30 hover:bg-[#161616]"
            >
              <h2 className="mb-2 text-lg font-semibold text-white group-hover:text-emerald-400">
                {guide.seo.title}
              </h2>
              <p className="text-sm leading-relaxed text-[#a2a2a2]">
                {guide.seo.description}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
