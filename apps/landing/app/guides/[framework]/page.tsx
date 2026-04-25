import type { Metadata } from 'next';

import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Breadcrumbs } from '~/_components/pseo/breadcrumbs';
import { GuideRenderer } from '~/_components/pseo/guide-renderer';
import { RelatedPages } from '~/_components/pseo/related-pages';
import {
  getAllFrameworkIndustryGuides,
  getAllFrameworkUseCaseGuides,
  getAllGuides,
  getFrameworks,
  getGuideBySlug,
  getIndustries,
  getUseCases,
} from '~/lib/pseo/content';
import { articleSchema, breadcrumbSchema } from '~/lib/seo/schemas';

interface Props {
  params: Promise<{ framework: string }>;
}

export async function generateStaticParams() {
  const guides = getAllGuides();
  return guides.map((g) => ({ framework: g.meta.framework }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { framework } = await params;
  const guide = getGuideBySlug(framework);
  if (!guide) return {};

  return {
    title: `${guide.seo.title} — Vex`,
    description: guide.seo.description,
    keywords: guide.seo.keywords,
    alternates: { canonical: `https://tryvex.dev/guides/${framework}` },
    openGraph: {
      title: guide.seo.title,
      description: guide.seo.description,
      type: 'article',
    },
  };
}

export default async function GuidePage({ params }: Props) {
  const { framework } = await params;
  const guide = getGuideBySlug(framework);
  if (!guide) notFound();

  const frameworks = getFrameworks();
  const meta = frameworks.find((f) => f.slug === framework);
  const allGuides = getAllGuides();
  const related = allGuides
    .filter((g) => g.meta.framework !== framework)
    .slice(0, 5)
    .map((g) => {
      const fm = frameworks.find((f) => f.slug === g.meta.framework);
      return {
        title: g.seo.title,
        href: `/guides/${g.meta.framework}`,
        description: fm?.description,
      };
    });

  const canonicalUrl = `https://tryvex.dev/guides/${framework}`;
  const article = articleSchema({
    headline: guide.seo.title,
    description: guide.seo.description,
    datePublished: guide.meta.generatedAt,
    dateModified: guide.meta.generatedAt,
    url: canonicalUrl,
  });
  const breadcrumbs = breadcrumbSchema([
    { name: 'Home', url: 'https://tryvex.dev' },
    { name: 'Guides', url: 'https://tryvex.dev/guides' },
    { name: meta?.name ?? framework, url: canonicalUrl },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([article, breadcrumbs]),
        }}
      />
      <div className="container py-24">
        <div className="mx-auto max-w-[800px]">
          <Breadcrumbs
            items={[
              { label: 'Home', href: '/' },
              { label: 'Guides', href: '/guides' },
              { label: meta?.name ?? framework },
            ]}
          />
          <div className="mb-4 text-[13px] font-medium tracking-widest text-emerald-500 uppercase">
            Framework Guide
          </div>
          <h1 className="mb-4 text-3xl font-bold text-white sm:text-4xl">
            {guide.seo.title}
          </h1>
          {meta && (
            <div className="mb-8 flex flex-wrap gap-2">
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-500">
                {meta.language === 'both'
                  ? 'Python & TypeScript'
                  : meta.language}
              </span>
              <span className="rounded-full bg-[#252525] px-2 py-0.5 text-[10px] font-medium text-[#a2a2a2]">
                {meta.popularity}
              </span>
            </div>
          )}
          <GuideRenderer guide={guide} />
          <RelatedPages pages={related} heading="More Framework Guides" />

          {(() => {
            const useCaseGuides = getAllFrameworkUseCaseGuides().filter(
              (g) => g.meta.framework === framework,
            );
            const industryGuides = getAllFrameworkIndustryGuides().filter(
              (g) => g.meta.framework === framework,
            );
            const useCases = getUseCases();
            const industries = getIndustries();
            const ucMap = new Map(useCases.map((uc) => [uc.slug, uc.name]));
            const indMap = new Map(industries.map((i) => [i.slug, i.name]));

            if (useCaseGuides.length === 0 && industryGuides.length === 0) {
              return null;
            }

            return (
              <div className="mt-16 border-t border-[#252525] pt-12">
                {useCaseGuides.length > 0 && (
                  <div className="mb-12">
                    <h2 className="mb-6 text-xl font-bold text-white">
                      {meta?.name ?? framework} Use Case Guides
                    </h2>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {useCaseGuides.map((g) => (
                        <Link
                          key={g.meta.useCase}
                          href={`/guides/${framework}/${g.meta.useCase}`}
                          className="rounded-lg border border-[#252525] bg-[#0a0a0a] px-4 py-3 text-sm text-white transition-colors hover:border-emerald-500/30 hover:bg-[#161616]"
                        >
                          Building{' '}
                          <span className="text-emerald-400">
                            {ucMap.get(g.meta.useCase) ?? g.meta.useCase}
                          </span>{' '}
                          with {meta?.name ?? framework}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
                {industryGuides.length > 0 && (
                  <div>
                    <h2 className="mb-6 text-xl font-bold text-white">
                      {meta?.name ?? framework} Industry Guides
                    </h2>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {industryGuides.map((g) => (
                        <Link
                          key={g.meta.industry}
                          href={`/guides/${framework}/${g.meta.industry}`}
                          className="rounded-lg border border-[#252525] bg-[#0a0a0a] px-4 py-3 text-sm text-white transition-colors hover:border-emerald-500/30 hover:bg-[#161616]"
                        >
                          {meta?.name ?? framework} Guardrails for{' '}
                          <span className="text-emerald-400">
                            {indMap.get(g.meta.industry) ?? g.meta.industry}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>
    </>
  );
}
