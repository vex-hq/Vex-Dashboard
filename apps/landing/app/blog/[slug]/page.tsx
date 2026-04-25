import type { Metadata } from 'next';

import Link from 'next/link';
import { notFound } from 'next/navigation';

import { MDXRemote } from 'next-mdx-remote/rsc';
import remarkGfm from 'remark-gfm';

import { getAllPosts, getPostBySlug } from '~/lib/blog';
import { articleSchema, breadcrumbSchema } from '~/lib/seo/schemas';

import { AuthorByline } from '../_components/author-byline';
import { mdxComponents } from '../_components/mdx-components';
import { PostCta } from '../_components/post-cta';
import { ReadingProgressBar } from '../_components/reading-progress-bar';
import { ShareOnX } from '../_components/share-button';
import { TableOfContents } from '../_components/table-of-contents';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const posts = getAllPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};

  return {
    title: `${post.title} — Vex Blog`,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      type: 'article',
      publishedTime: post.date,
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const canonicalUrl = `https://tryvex.dev/blog/${slug}`;
  const article = articleSchema({
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.date,
    url: canonicalUrl,
  });
  const breadcrumbs = breadcrumbSchema([
    { name: 'Home', url: 'https://tryvex.dev' },
    { name: 'Blog', url: 'https://tryvex.dev/blog' },
    { name: post.title, url: canonicalUrl },
  ]);

  return (
    <>
      <ReadingProgressBar />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([article, breadcrumbs]),
        }}
      />

      <div className="container py-24">
        <article className="mx-auto max-w-[720px]">
          {/* Back link */}
          <Link
            href="/blog"
            className="mb-8 inline-flex items-center gap-1.5 text-sm text-[#585858] transition-colors hover:text-white"
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
            Back to Blog
          </Link>

          {/* Post header */}
          <header className="mb-8">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <time className="text-sm text-[#585858]">{post.date}</time>
              <span className="text-[#585858]">&middot;</span>
              <span className="font-mono text-sm text-[#585858]">
                {post.readingTime} min read
              </span>
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-500"
                >
                  {tag}
                </span>
              ))}
            </div>
            <h1 className="text-3xl leading-tight font-bold text-white sm:text-4xl">
              {post.title}
            </h1>
            <p className="mt-4 text-lg text-[#a2a2a2]">{post.description}</p>
          </header>

          {/* Table of contents */}
          <TableOfContents headings={post.headings} />

          {/* Article body */}
          <div className="prose prose-invert prose-lg prose-headings:text-white prose-headings:font-bold prose-h2:text-2xl prose-h2:mt-14 prose-h2:mb-6 prose-h3:text-xl prose-h3:mt-10 prose-h3:mb-4 prose-p:text-[16px] prose-p:leading-[1.8] prose-p:text-[#a2a2a2] prose-li:text-[16px] prose-li:text-[#a2a2a2] prose-li:marker:text-emerald-500/50 prose-ul:my-4 prose-ol:my-4 prose-strong:text-white prose-a:text-emerald-500 prose-a:no-underline hover:prose-a:text-emerald-400 prose-code:text-emerald-400 prose-code:bg-[#161616] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none prose-pre:bg-[#0a0a0a] prose-pre:border prose-pre:border-[#252525] prose-pre:rounded-xl prose-pre:my-6 prose-pre:p-5 prose-pre:text-sm prose-hr:border-[#252525] prose-hr:my-10 prose-blockquote:border-l-emerald-500/40 prose-blockquote:text-[#a2a2a2] prose-blockquote:not-italic prose-img:rounded-lg prose-img:border prose-img:border-[#252525] max-w-none text-[#a2a2a2]">
            <MDXRemote
              source={post.content}
              components={mdxComponents}
              options={{ mdxOptions: { remarkPlugins: [remarkGfm] } }}
            />
          </div>

          {/* Post footer: author + share */}
          <AuthorByline
            author={post.author}
            date={post.date}
            readingTime={post.readingTime}
          />

          <div className="mt-6 flex items-center justify-between">
            <Link
              href="/blog"
              className="text-sm text-[#585858] transition-colors hover:text-white"
            >
              &larr; All posts
            </Link>
            <ShareOnX title={post.title} slug={post.slug} />
          </div>

          {/* Post CTA */}
          <PostCta />
        </article>
      </div>
    </>
  );
}
