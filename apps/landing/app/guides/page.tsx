import type { Metadata } from 'next';

import Link from 'next/link';

import {
  getAllFrameworkIndustryGuides,
  getAllFrameworkUseCaseGuides,
  getAllGuides,
  getFrameworks,
} from '~/lib/pseo/content';

export const metadata: Metadata = {
  title: 'Framework Guides — Vex',
  description:
    'Step-by-step guides for adding runtime guardrails to AI agent frameworks. LangChain, CrewAI, AutoGen, and more.',
};

export default function GuidesIndexPage() {
  const guides = getAllGuides();
  const frameworks = getFrameworks();
  const useCaseGuides = getAllFrameworkUseCaseGuides();
  const industryGuides = getAllFrameworkIndustryGuides();

  const frameworkMap = new Map(frameworks.map((f) => [f.slug, f]));

  return (
    <div className="container py-24">
      <div className="mb-16 border-b border-[#252525] pb-12">
        <div className="mb-4 text-[13px] font-medium tracking-widest text-emerald-500 uppercase">
          Guides
        </div>
        <h1 className="mb-4 text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
          Framework Integration Guides
        </h1>
        <p className="max-w-[520px] text-[17px] leading-relaxed text-[#a2a2a2]">
          Learn how to add runtime guardrails to your AI agent framework.
          Each guide covers failure modes, integration steps, and best
          practices specific to the framework.
        </p>
      </div>

      {guides.length === 0 ? (
        <p className="text-[#a2a2a2]">No guides yet. Check back soon.</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {guides.map((guide) => {
            const fw = frameworkMap.get(guide.meta.framework);

            return (
              <Link
                key={guide.meta.framework}
                href={`/guides/${guide.meta.framework}`}
                className="group rounded-xl border border-[#252525] bg-[#0a0a0a] p-6 transition-colors hover:border-emerald-500/30 hover:bg-[#161616]"
              >
                <div className="mb-3 flex items-center gap-2">
                  {fw && (
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-500">
                      {fw.language}
                    </span>
                  )}
                  {fw && (
                    <span className="rounded-full border border-[#333] px-2 py-0.5 text-[10px] font-medium text-[#a2a2a2]">
                      {fw.popularity}
                    </span>
                  )}
                </div>
                <h2 className="mb-2 text-lg font-semibold text-white group-hover:text-emerald-400">
                  {guide.seo.title}
                </h2>
                <p className="text-sm leading-relaxed text-[#a2a2a2]">
                  {guide.seo.description}
                </p>
              </Link>
            );
          })}
        </div>
      )}

      {useCaseGuides.length > 0 && (
        <div className="mt-20">
          <h2 className="mb-3 text-2xl font-bold text-white">
            Framework × Use Case Guides
          </h2>
          <p className="mb-6 max-w-[520px] text-[15px] leading-relaxed text-[#a2a2a2]">
            {useCaseGuides.length} guides covering how to build specific use
            cases with each framework, including architecture patterns and Vex
            integration.
          </p>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {frameworks.map((fw) => {
              const count = useCaseGuides.filter(
                (g) => g.meta.framework === fw.slug,
              ).length;
              if (count === 0) return null;
              return (
                <Link
                  key={fw.slug}
                  href={`/guides/${fw.slug}`}
                  className="rounded-lg border border-[#252525] bg-[#0a0a0a] px-5 py-4 transition-colors hover:border-emerald-500/30 hover:bg-[#161616]"
                >
                  <span className="font-medium text-white">{fw.name}</span>
                  <span className="ml-2 text-sm text-[#a2a2a2]">
                    {count} use case {count === 1 ? 'guide' : 'guides'}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {industryGuides.length > 0 && (
        <div className="mt-16">
          <h2 className="mb-3 text-2xl font-bold text-white">
            Framework × Industry Guides
          </h2>
          <p className="mb-6 max-w-[520px] text-[15px] leading-relaxed text-[#a2a2a2]">
            {industryGuides.length} guides covering industry-specific compliance
            requirements and guardrail configurations for each framework.
          </p>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {frameworks.map((fw) => {
              const count = industryGuides.filter(
                (g) => g.meta.framework === fw.slug,
              ).length;
              if (count === 0) return null;
              return (
                <Link
                  key={fw.slug}
                  href={`/guides/${fw.slug}`}
                  className="rounded-lg border border-[#252525] bg-[#0a0a0a] px-5 py-4 transition-colors hover:border-emerald-500/30 hover:bg-[#161616]"
                >
                  <span className="font-medium text-white">{fw.name}</span>
                  <span className="ml-2 text-sm text-[#a2a2a2]">
                    {count} industry {count === 1 ? 'guide' : 'guides'}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
