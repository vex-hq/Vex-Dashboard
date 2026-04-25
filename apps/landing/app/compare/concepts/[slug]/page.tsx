import type { Metadata } from 'next';

import { notFound } from 'next/navigation';

import { Breadcrumbs } from '~/_components/pseo/breadcrumbs';
import { ConceptComparisonRenderer } from '~/_components/pseo/concept-comparison-renderer';
import { RelatedPages } from '~/_components/pseo/related-pages';
import {
  getAllConceptComparisons,
  getConceptComparisonBySlug,
} from '~/lib/pseo/content';
import { breadcrumbSchema, softwareApplicationSchema } from '~/lib/seo/schemas';

const SITE_URL = 'https://tryvex.dev';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const comparisons = getAllConceptComparisons();
  return comparisons.map((c) => ({ slug: c.meta.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const comparison = getConceptComparisonBySlug(slug);
  if (!comparison) return {};

  return {
    title: `${comparison.seo.title} — Vex`,
    description: comparison.seo.description,
    keywords: comparison.seo.keywords,
    alternates: { canonical: `https://tryvex.dev/compare/concepts/${slug}` },
    openGraph: {
      title: comparison.seo.title,
      description: comparison.seo.description,
      type: 'article',
    },
  };
}

export default async function ConceptComparisonPage({ params }: Props) {
  const { slug } = await params;
  const comparison = getConceptComparisonBySlug(slug);
  if (!comparison) notFound();

  const all = getAllConceptComparisons();
  const related = all
    .filter((c) => c.meta.slug !== slug)
    .slice(0, 5)
    .map((c) => ({
      title: c.seo.title,
      href: `/compare/concepts/${c.meta.slug}`,
    }));

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: comparison.seo.title,
      description: comparison.seo.description,
      publisher: {
        '@type': 'Organization',
        name: 'Vex',
        url: SITE_URL,
      },
    },
    softwareApplicationSchema(),
    breadcrumbSchema([
      { name: 'Home', url: SITE_URL },
      { name: 'Compare', url: `${SITE_URL}/compare` },
      {
        name: comparison.seo.title,
        url: `${SITE_URL}/compare/concepts/${slug}`,
      },
    ]),
  ];

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
              { label: 'Comparisons', href: '/compare' },
              { label: comparison.seo.title },
            ]}
          />
          <div className="mb-4 text-[13px] font-medium tracking-widest text-emerald-500 uppercase">
            Comparison
          </div>
          <h1 className="mb-4 text-3xl font-bold text-white sm:text-4xl">
            {comparison.seo.title}
          </h1>
          <ConceptComparisonRenderer comparison={comparison} />
          <RelatedPages pages={related} heading="More Comparisons" />
        </div>
      </div>
    </>
  );
}
