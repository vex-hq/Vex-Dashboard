import type { Metadata } from 'next';

import Link from 'next/link';
import { notFound } from 'next/navigation';

import { CLOUD_SIGNUP_URL, DOCS_URL } from '~/_components/nav/nav-config';
import { GROUPS, getUseCase, USE_CASES } from '~/lib/use-cases';

import { HandoverStrip } from '../_components/handover-strip';

export function generateStaticParams() {
  return USE_CASES.map((u) => ({ slug: u.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const useCase = getUseCase(slug);
  if (!useCase) return {};
  return {
    title: `${useCase.title} — Klio Use Cases`,
    description: useCase.tagline,
  };
}

export default async function UseCasePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const useCase = getUseCase(slug);
  if (!useCase) notFound();

  const related = useCase.related
    .map((s) => getUseCase(s))
    .filter((u): u is NonNullable<typeof u> => Boolean(u));

  return (
    <div className="container py-24">
      <div className="mx-auto max-w-[860px]">
        {/* Breadcrumb + kicker */}
        <div className="mb-4 flex items-center gap-2 text-[13px]">
          <Link
            href="/use-cases"
            className="font-medium tracking-widest text-muted-foreground uppercase hover:text-foreground"
          >
            Use cases
          </Link>
          <span aria-hidden className="text-muted-foreground">
            /
          </span>
          <span className="font-medium tracking-widest text-foreground uppercase">
            {GROUPS[useCase.group].label}
          </span>
        </div>

        {/* Hero */}
        <h1 className="mb-4 text-3xl font-bold text-foreground sm:text-4xl">
          {useCase.title}
        </h1>
        <p className="mb-10 max-w-[640px] text-[17px] leading-relaxed text-muted-foreground">
          {useCase.tagline}
        </p>

        {/* The visual, first */}
        <div className="mb-12 rounded-2xl border border-border bg-card p-6 sm:p-8">
          <HandoverStrip spec={useCase.diagram} />
        </div>

        {/* The problem */}
        <section className="mb-10">
          <h2 className="mb-3 text-xl font-semibold text-foreground">
            Without Klio
          </h2>
          <p className="text-[15px] leading-relaxed text-muted-foreground">
            {useCase.problem}
          </p>
        </section>

        {/* The loop */}
        <section className="mb-10">
          <h2 className="mb-4 text-xl font-semibold text-foreground">
            With Klio in the loop
          </h2>
          <ol className="space-y-3">
            {useCase.steps.map((step, i) => (
              <li key={step} className="flex gap-4">
                <span
                  aria-hidden
                  className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border font-mono text-[12px] text-muted-foreground"
                >
                  {i + 1}
                </span>
                <p className="text-[15px] leading-relaxed text-muted-foreground">
                  {step}
                </p>
              </li>
            ))}
          </ol>
        </section>

        {/* The call an agent makes */}
        <section className="mb-10">
          <h2 className="mb-3 text-xl font-semibold text-foreground">
            The call an agent makes
          </h2>
          <div className="overflow-x-auto rounded-xl border border-border bg-foreground p-5 text-background">
            <pre className="font-mono text-[13px] leading-relaxed">
              <code>
                {useCase.example.tool}(
                {'\n'}
                {JSON.stringify(useCase.example.payload, null, 2)
                  .split('\n')
                  .map((line) => `  ${line}`)
                  .join('\n')}
                {'\n'})
              </code>
            </pre>
          </div>
          <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
            Real tool, illustrative payload. The full contract for every tool is
            in{' '}
            <a
              href={`${DOCS_URL}/tools/overview`}
              className="text-foreground underline underline-offset-2"
            >
              the docs
            </a>
            .
          </p>
        </section>

        {/* Outcome */}
        <section className="mb-14">
          <h2 className="mb-3 text-xl font-semibold text-foreground">
            What changes
          </h2>
          <p className="text-[15px] leading-relaxed text-muted-foreground">
            {useCase.outcome}
          </p>
        </section>

        {/* Related */}
        {related.length > 0 && (
          <section className="mb-14 border-t border-border pt-10">
            <h2 className="mb-5 text-[13px] font-medium tracking-widest text-foreground uppercase">
              Related use cases
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {related.map((r) => (
                <Link
                  key={r.slug}
                  href={`/use-cases/${r.slug}`}
                  className="rounded-xl border border-border bg-background p-5 transition-colors hover:border-[color:var(--klio-border-strong)] hover:bg-card"
                >
                  <div className="mb-1 text-[15px] font-semibold text-foreground">
                    {r.title}
                  </div>
                  <div className="text-[13px] leading-relaxed text-muted-foreground">
                    {r.tagline}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* CTA */}
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <p className="mx-auto mb-5 max-w-[440px] text-[15px] leading-relaxed text-muted-foreground">
            Free and unlimited for one person. Connect an agent and try this
            walkthrough on your own project.
          </p>
          <div className="flex items-center justify-center gap-3">
            <a href={CLOUD_SIGNUP_URL} className="k-btn k-btn--primary">
              Start free
            </a>
            <Link href="/use-cases" className="k-btn k-btn--ghost">
              All use cases
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
