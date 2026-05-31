import type { Metadata } from 'next';

import Link from 'next/link';

import {
  getAllProblemFrameworkGuides,
  getAllProblemGuides,
} from '~/lib/pseo/content';

export const metadata: Metadata = {
  title: 'AI Agent Problem Guides — Vex',
  description:
    'Deep-dive guides on common AI agent problems: hallucination detection, drift monitoring, prompt injection prevention, and more.',
};

export default function LearnIndexPage() {
  const guides = getAllProblemGuides();
  const frameworkGuides = getAllProblemFrameworkGuides();

  return (
    <div className="container py-24">
      <div className="mb-16 border-b border-border pb-12">
        <div className="mb-4 text-[13px] font-medium tracking-widest text-foreground uppercase">
          Learn
        </div>
        <h1 className="mb-4 text-3xl font-bold text-foreground sm:text-4xl lg:text-5xl">
          AI Agent Problem Guides
        </h1>
        <p className="max-w-[520px] text-[17px] leading-relaxed text-muted-foreground">
          Deep-dive guides covering detection, diagnosis, and remediation for
          common AI agent failure modes in production.
        </p>
      </div>

      {guides.length === 0 ? (
        <p className="text-muted-foreground">No guides yet. Check back soon.</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {guides.map((guide) => (
            <Link
              key={guide.meta.slug}
              href={`/learn/${guide.meta.slug}`}
              className="group rounded-xl border border-border bg-background p-6 transition-colors hover:border-border/30 hover:bg-card"
            >
              <h2 className="mb-2 text-lg font-semibold text-foreground group-hover:text-foreground">
                {guide.seo.title}
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {guide.seo.description}
              </p>
            </Link>
          ))}
        </div>
      )}

      {frameworkGuides.length > 0 && (
        <div className="mt-20">
          <h2 className="mb-3 text-2xl font-bold text-foreground">
            Framework-Specific Guides
          </h2>
          <p className="max-w-[520px] text-[15px] leading-relaxed text-muted-foreground">
            {frameworkGuides.length} framework-specific versions are available
            with tailored detection code, fix snippets, and Vex integration
            steps. Browse them from each problem guide page above.
          </p>
        </div>
      )}
    </div>
  );
}
