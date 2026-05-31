import type { Metadata } from 'next';

import Link from 'next/link';
import { notFound } from 'next/navigation';

import { MDXRemote } from 'next-mdx-remote/rsc';
import remarkGfm from 'remark-gfm';

import { getAllChangelogs, getChangelogBySlug } from '~/lib/changelog';
import { mdxComponents } from '../../blog/_components/mdx-components';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const entries = getAllChangelogs();
  return entries.map((entry) => ({ slug: entry.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const entry = getChangelogBySlug(slug);
  if (!entry) return {};

  return {
    title: `${entry.title} — Vex Changelog`,
    description: entry.description,
    openGraph: {
      title: entry.title,
      description: entry.description,
      type: 'article',
      publishedTime: entry.date,
    },
  };
}

export default async function ChangelogEntryPage({ params }: Props) {
  const { slug } = await params;
  const entry = getChangelogBySlug(slug);
  if (!entry) notFound();

  return (
    <div className="container py-24">
      <article className="mx-auto max-w-[720px]">
        {/* Back link */}
        <Link
          href="/changelog"
          className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10 4l-4 4 4 4" />
          </svg>
          Back to Changelog
        </Link>

        {/* Entry header */}
        <header className="mb-8">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-border/30 bg-foreground/10 px-2.5 py-1 text-[11px] font-medium tracking-widest text-foreground uppercase">
              v{entry.version}
            </span>
            <time className="text-sm text-muted-foreground">{entry.date}</time>
            {entry.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-foreground/10 px-2 py-0.5 text-[10px] font-medium text-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
          <h1 className="text-3xl leading-tight font-bold text-foreground sm:text-4xl">
            {entry.title}
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">{entry.description}</p>
        </header>

        {/* Article body */}
        <div className="prose prose-invert prose-lg prose-headings:text-foreground prose-headings:font-bold prose-h2:text-2xl prose-h2:mt-14 prose-h2:mb-6 prose-h3:text-xl prose-h3:mt-10 prose-h3:mb-4 prose-p:text-[16px] prose-p:leading-[1.8] prose-p:text-muted-foreground prose-li:text-[16px] prose-li:text-muted-foreground prose-li:marker:text-foreground/50 prose-ul:my-4 prose-ol:my-4 prose-strong:text-foreground prose-a:text-foreground prose-a:no-underline hover:prose-a:text-foreground prose-code:text-foreground prose-code:bg-card prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none prose-pre:bg-background prose-pre:border prose-pre:border-border prose-pre:rounded-xl prose-pre:my-6 prose-pre:p-5 prose-pre:text-sm prose-hr:border-border prose-hr:my-10 prose-blockquote:border-l-border/40 prose-blockquote:text-muted-foreground prose-blockquote:not-italic prose-img:rounded-lg prose-img:border prose-img:border-border max-w-none text-muted-foreground">
          <MDXRemote
            source={entry.content}
            components={mdxComponents}
            options={{ mdxOptions: { remarkPlugins: [remarkGfm] } }}
          />
        </div>

        {/* Footer */}
        <div className="mt-12 border-t border-border pt-8">
          <Link
            href="/changelog"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            &larr; All updates
          </Link>
        </div>
      </article>
    </div>
  );
}
