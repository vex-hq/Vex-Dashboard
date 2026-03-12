import type { Metadata } from 'next';

import { notFound } from 'next/navigation';

import { Breadcrumbs } from '~/app/_components/pseo/breadcrumbs';
import { GuideRenderer } from '~/app/_components/pseo/guide-renderer';
import { RelatedPages } from '~/app/_components/pseo/related-pages';
import { getAllGuides, getGuideBySlug, getFrameworks } from '~/lib/pseo/content';

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
                {meta.language === 'both' ? 'Python & TypeScript' : meta.language}
              </span>
              <span className="rounded-full bg-[#252525] px-2 py-0.5 text-[10px] font-medium text-[#a2a2a2]">
                {meta.popularity}
              </span>
            </div>
          )}
          <GuideRenderer guide={guide} />
          <RelatedPages pages={related} heading="More Framework Guides" />
        </div>
      </div>
    </>
  );
}
