import type { Metadata } from 'next';

import { notFound } from 'next/navigation';

import { Breadcrumbs } from '~/app/_components/pseo/breadcrumbs';
import { ChecklistRenderer } from '~/app/_components/pseo/checklist-renderer';
import { RelatedPages } from '~/app/_components/pseo/related-pages';
import { getAllChecklists, getChecklistBySlug } from '~/lib/pseo/content';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const checklists = getAllChecklists();
  return checklists.map((c) => ({
    slug: `${c.meta.industry}-${c.meta.useCase}`,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const checklist = getChecklistBySlug(slug);
  if (!checklist) return {};

  return {
    title: `${checklist.seo.title} — Vex`,
    description: checklist.seo.description,
    keywords: checklist.seo.keywords,
    alternates: { canonical: `https://tryvex.dev/checklists/${slug}` },
    openGraph: {
      title: checklist.seo.title,
      description: checklist.seo.description,
      type: 'article',
    },
  };
}

export default async function ChecklistPage({ params }: Props) {
  const { slug } = await params;
  const checklist = getChecklistBySlug(slug);
  if (!checklist) notFound();

  const allChecklists = getAllChecklists();
  const related = allChecklists
    .filter((c) => `${c.meta.industry}-${c.meta.useCase}` !== slug)
    .slice(0, 5)
    .map((c) => ({
      title: c.seo.title,
      href: `/checklists/${c.meta.industry}-${c.meta.useCase}`,
    }));

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: checklist.seo.title,
    description: checklist.seo.description,
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
              { label: 'Checklists', href: '/checklists' },
              { label: checklist.seo.title },
            ]}
          />
          <div className="mb-4 text-[13px] font-medium tracking-widest text-emerald-500 uppercase">
            Checklist
          </div>
          <h1 className="mb-4 text-3xl font-bold text-white sm:text-4xl">
            {checklist.seo.title}
          </h1>
          <ChecklistRenderer checklist={checklist} />
          <RelatedPages pages={related} heading="More Checklists" />
        </div>
      </div>
    </>
  );
}
