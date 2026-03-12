import type { Metadata } from 'next';

import { notFound } from 'next/navigation';

import { Breadcrumbs } from '~/_components/pseo/breadcrumbs';
import { ProblemFrameworkRenderer } from '~/_components/pseo/problem-framework-renderer';
import { RelatedPages } from '~/_components/pseo/related-pages';
import {
  getAllProblemFrameworkGuides,
  getFrameworks,
  getProblemFrameworkGuide,
  getProblems,
} from '~/lib/pseo/content';

interface Props {
  params: Promise<{ slug: string; framework: string }>;
}

export async function generateStaticParams() {
  const guides = getAllProblemFrameworkGuides();
  return guides.map((g) => ({
    slug: g.meta.problem,
    framework: g.meta.framework,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, framework } = await params;
  const guide = getProblemFrameworkGuide(slug, framework);

  if (!guide) return {};

  return {
    title: `${guide.seo.title} — Vex`,
    description: guide.seo.description,
    keywords: guide.seo.keywords,
    alternates: {
      canonical: `https://tryvex.dev/learn/${slug}/${framework}`,
    },
    openGraph: {
      title: guide.seo.title,
      description: guide.seo.description,
      type: 'article',
    },
  };
}

export default async function ProblemFrameworkPage({ params }: Props) {
  const { slug, framework } = await params;
  const guide = getProblemFrameworkGuide(slug, framework);

  if (!guide) notFound();

  const frameworks = getFrameworks();
  const frameworkMeta = frameworks.find((f) => f.slug === framework);
  const frameworkName = frameworkMeta?.name ?? framework;

  const problems = getProblems();
  const problemMeta = problems.find((p) => p.slug === slug);
  const problemTitle = problemMeta?.title ?? slug;

  const allGuides = getAllProblemFrameworkGuides();
  const relatedPages = allGuides
    .filter(
      (g) => g.meta.problem === slug && g.meta.framework !== framework,
    )
    .slice(0, 5)
    .map((g) => {
      const fm = frameworks.find((f) => f.slug === g.meta.framework);
      return {
        title: g.seo.title,
        href: `/learn/${g.meta.problem}/${g.meta.framework}`,
        description: fm?.description,
      };
    });

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
              { label: 'Learn', href: '/learn' },
              { label: problemTitle, href: `/learn/${slug}` },
              { label: frameworkName },
            ]}
          />
          <div className="mb-4 text-[13px] font-medium tracking-widest text-emerald-500 uppercase">
            Problem × Framework Guide
          </div>
          <h1 className="mb-4 text-3xl font-bold text-white sm:text-4xl">
            {guide.seo.title}
          </h1>
          <ProblemFrameworkRenderer guide={guide} />
          <RelatedPages
            pages={relatedPages}
            heading="Same Problem, Other Frameworks"
          />
        </div>
      </div>
    </>
  );
}
