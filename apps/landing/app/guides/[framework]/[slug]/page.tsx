import type { Metadata } from 'next';

import { notFound } from 'next/navigation';

import { Breadcrumbs } from '~/_components/pseo/breadcrumbs';
import { FrameworkIndustryRenderer } from '~/_components/pseo/framework-industry-renderer';
import { FrameworkUseCaseRenderer } from '~/_components/pseo/framework-usecase-renderer';
import { RelatedPages } from '~/_components/pseo/related-pages';
import {
  getAllFrameworkIndustryGuides,
  getAllFrameworkUseCaseGuides,
  getFrameworkIndustryGuide,
  getFrameworkUseCaseGuide,
  getFrameworks,
  getIndustries,
  getUseCases,
} from '~/lib/pseo/content';

interface Props {
  params: Promise<{ framework: string; slug: string }>;
}

export async function generateStaticParams() {
  const useCaseGuides = getAllFrameworkUseCaseGuides();
  const industryGuides = getAllFrameworkIndustryGuides();

  const useCaseParams = useCaseGuides.map((g) => ({
    framework: g.meta.framework,
    slug: g.meta.useCase,
  }));

  const industryParams = industryGuides.map((g) => ({
    framework: g.meta.framework,
    slug: g.meta.industry,
  }));

  return [...useCaseParams, ...industryParams];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { framework, slug } = await params;

  const useCaseGuide = getFrameworkUseCaseGuide(framework, slug);
  const guide = useCaseGuide ?? getFrameworkIndustryGuide(framework, slug);

  if (!guide) return {};

  return {
    title: `${guide.seo.title} — Vex`,
    description: guide.seo.description,
    keywords: guide.seo.keywords,
    alternates: { canonical: `https://tryvex.dev/guides/${framework}/${slug}` },
    openGraph: {
      title: guide.seo.title,
      description: guide.seo.description,
      type: 'article',
    },
  };
}

export default async function FrameworkCrossProductPage({ params }: Props) {
  const { framework, slug } = await params;

  const useCaseGuide = getFrameworkUseCaseGuide(framework, slug);
  const industryGuide = useCaseGuide
    ? undefined
    : getFrameworkIndustryGuide(framework, slug);

  if (!useCaseGuide && !industryGuide) notFound();

  const frameworks = getFrameworks();
  const frameworkMeta = frameworks.find((f) => f.slug === framework);
  const frameworkName = frameworkMeta?.name ?? framework;

  let slugName: string;
  let subtitleBadge: string;
  let relatedPages: { title: string; href: string; description?: string }[];

  if (useCaseGuide) {
    const useCases = getUseCases();
    const useCaseMeta = useCases.find((u) => u.slug === slug);
    slugName = useCaseMeta?.name ?? slug;
    subtitleBadge = 'Framework × Use Case Guide';

    const allUseCaseGuides = getAllFrameworkUseCaseGuides();
    relatedPages = allUseCaseGuides
      .filter(
        (g) =>
          g.meta.framework === framework && g.meta.useCase !== slug,
      )
      .slice(0, 5)
      .map((g) => {
        const uc = getUseCases().find((u) => u.slug === g.meta.useCase);
        return {
          title: g.seo.title,
          href: `/guides/${g.meta.framework}/${g.meta.useCase}`,
          description: uc?.typicalArchitecture,
        };
      });
  } else {
    const industries = getIndustries();
    const industryMeta = industries.find((i) => i.slug === slug);
    slugName = industryMeta?.name ?? slug;
    subtitleBadge = 'Framework × Industry Guide';

    const allIndustryGuides = getAllFrameworkIndustryGuides();
    relatedPages = allIndustryGuides
      .filter(
        (g) =>
          g.meta.framework === framework && g.meta.industry !== slug,
      )
      .slice(0, 5)
      .map((g) => {
        const ind = getIndustries().find((i) => i.slug === g.meta.industry);
        return {
          title: g.seo.title,
          href: `/guides/${g.meta.framework}/${g.meta.industry}`,
          description: ind?.failureConsequences,
        };
      });
  }

  const guide = useCaseGuide ?? industryGuide!;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: guide.seo.title,
    description: guide.seo.description,
    publisher: {
      '@type': 'Organization',
      name: 'Vex',
      url: 'https://tryvex.dev',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="container py-24">
        <div className="mx-auto max-w-[800px]">
          <Breadcrumbs
            items={[
              { label: 'Home', href: '/' },
              { label: 'Guides', href: '/guides' },
              { label: frameworkName, href: `/guides/${framework}` },
              { label: slugName },
            ]}
          />
          <div className="mb-4 text-[13px] font-medium tracking-widest text-emerald-500 uppercase">
            {subtitleBadge}
          </div>
          <h1 className="mb-4 text-3xl font-bold text-white sm:text-4xl">
            {guide.seo.title}
          </h1>
          {frameworkMeta && (
            <div className="mb-8 flex flex-wrap gap-2">
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-500">
                {frameworkMeta.language === 'both'
                  ? 'Python & TypeScript'
                  : frameworkMeta.language}
              </span>
              <span className="rounded-full bg-[#252525] px-2 py-0.5 text-[10px] font-medium text-[#a2a2a2]">
                {frameworkMeta.popularity}
              </span>
            </div>
          )}
          {useCaseGuide ? (
            <FrameworkUseCaseRenderer guide={useCaseGuide} />
          ) : (
            <FrameworkIndustryRenderer guide={industryGuide!} />
          )}
          <RelatedPages
            pages={relatedPages}
            heading={
              useCaseGuide
                ? 'More Use Case Guides'
                : 'More Industry Guides'
            }
          />
        </div>
      </div>
    </>
  );
}
