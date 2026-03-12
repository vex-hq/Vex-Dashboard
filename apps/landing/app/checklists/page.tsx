import type { Metadata } from 'next';

import Link from 'next/link';

import { getAllChecklists, getIndustries, getUseCases } from '~/lib/pseo/content';

export const metadata: Metadata = {
  title: 'AI Agent Compliance Checklists — Vex',
  description:
    'Production readiness checklists for AI agents by industry and use case. Healthcare, Fintech, Legal, and more.',
};

export default function ChecklistsIndexPage() {
  const checklists = getAllChecklists();
  const industries = getIndustries();
  const useCases = getUseCases();

  const industryMap = new Map(industries.map((i) => [i.slug, i]));
  const useCaseMap = new Map(useCases.map((u) => [u.slug, u]));

  // Group checklists by industry
  const grouped = new Map<string, typeof checklists>();
  for (const cl of checklists) {
    const key = cl.meta.industry;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(cl);
  }

  return (
    <div className="container py-24">
      <div className="mb-16 border-b border-[#252525] pb-12">
        <div className="mb-4 text-[13px] font-medium tracking-widest text-emerald-500 uppercase">
          Checklists
        </div>
        <h1 className="mb-4 text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
          AI Agent Compliance Checklists
        </h1>
        <p className="max-w-[520px] text-[17px] leading-relaxed text-[#a2a2a2]">
          Production readiness checklists for deploying AI agents across
          regulated industries. Interactive, printable, and actionable.
        </p>
      </div>

      {checklists.length === 0 ? (
        <p className="text-[#a2a2a2]">No checklists yet. Check back soon.</p>
      ) : (
        <div className="space-y-12">
          {[...grouped.entries()].map(([industrySlug, items]) => {
            const industry = industryMap.get(industrySlug);

            return (
              <div key={industrySlug}>
                <h2 className="mb-2 text-xl font-bold text-white">
                  {industry?.name ?? industrySlug}
                </h2>
                <p className="mb-6 text-sm text-[#a2a2a2]">
                  {industry?.failureConsequences}
                </p>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {items.map((cl) => {
                    const slug = `${cl.meta.industry}-${cl.meta.useCase}`;
                    const uc = useCaseMap.get(cl.meta.useCase);

                    return (
                      <Link
                        key={slug}
                        href={`/checklists/${slug}`}
                        className="group rounded-lg border border-[#252525] bg-[#0a0a0a] p-4 transition-colors hover:border-emerald-500/30 hover:bg-[#161616]"
                      >
                        <div className="mb-2 text-[10px] font-medium tracking-widest text-emerald-500 uppercase">
                          {uc?.name ?? cl.meta.useCase}
                        </div>
                        <h3 className="text-sm font-semibold text-white group-hover:text-emerald-400">
                          {cl.seo.title}
                        </h3>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
