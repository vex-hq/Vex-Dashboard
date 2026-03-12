import type { Metadata } from 'next';

import { notFound } from 'next/navigation';

import { Breadcrumbs } from '~/_components/pseo/breadcrumbs';
import { ProblemGuideRenderer } from '~/_components/pseo/problem-guide-renderer';
import { RelatedPages } from '~/_components/pseo/related-pages';
import { getAllProblemGuides, getProblemGuideBySlug } from '~/lib/pseo/content';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const guides = getAllProblemGuides();
  return guides.map((g) => ({ slug: g.meta.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const guide = getProblemGuideBySlug(slug);
  if (!guide) return {};

  return {
    title: `${guide.seo.title} — Vex`,
    description: guide.seo.description,
    keywords: guide.seo.keywords,
    alternates: { canonical: `https://tryvex.dev/learn/${slug}` },
    openGraph: {
      title: guide.seo.title,
      description: guide.seo.description,
      type: 'article',
    },
  };
}

export default async function ProblemGuidePage({ params }: Props) {
  const { slug } = await params;
  const guide = getProblemGuideBySlug(slug);
  if (!guide) notFound();

  const all = getAllProblemGuides();
  const related = all
    .filter((g) => g.meta.slug !== slug)
    .slice(0, 5)
    .map((g) => ({ title: g.seo.title, href: `/learn/${g.meta.slug}` }));

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: guide.seo.title,
    description: guide.seo.description,
    publisher: { '@type': 'Organization', name: 'Vex', url: 'https://tryvex.dev' },
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
              { label: 'Learn', href: '/learn' },
              { label: guide.seo.title },
            ]}
          />
          <div className="mb-4 text-[13px] font-medium tracking-widest text-emerald-500 uppercase">
            Guide
          </div>
          <h1 className="mb-4 text-3xl font-bold text-white sm:text-4xl">
            {guide.seo.title}
          </h1>
          <ProblemGuideRenderer guide={guide} />
          <RelatedPages pages={related} heading="More Guides" />
        </div>
      </div>
    </>
  );
}
