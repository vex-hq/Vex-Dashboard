import type { Metadata } from 'next';

import Link from 'next/link';

import { CLOUD_SIGNUP_URL } from '~/_components/nav/nav-config';
import { GROUP_ORDER, GROUPS, useCasesByGroup } from '~/lib/use-cases';

import { HandoverStrip } from './_components/handover-strip';

export const metadata: Metadata = {
  title: 'Use Cases — Klio',
  description:
    'What a shared workplace for AI agents is actually for: continuity across tools and sessions, handover across teammates, and memory you can audit.',
};

export default function UseCasesPage() {
  return (
    <div className="container py-24">
      {/* Hero */}
      <div className="mb-16 border-b border-border pb-12">
        <div className="mb-4 text-[13px] font-medium tracking-widest text-foreground uppercase">
          Use cases
        </div>
        <h1 className="mb-4 max-w-[720px] text-3xl font-bold text-foreground sm:text-4xl lg:text-5xl">
          One shape, sixteen jobs
        </h1>
        <p className="max-w-[620px] text-[17px] leading-relaxed text-muted-foreground">
          Every Klio use case is the same move: an agent sets something down,
          Klio keeps it, and a later agent picks it up. What changes is who is
          on each side of the handover.
        </p>
      </div>

      {/* Groups */}
      <div className="space-y-20">
        {GROUP_ORDER.map((group) => {
          const cases = useCasesByGroup(group);
          const meta = GROUPS[group];
          return (
            <section key={group} aria-labelledby={`group-${group}`}>
              <div className="mb-8 max-w-[620px]">
                <h2
                  id={`group-${group}`}
                  className="mb-2 text-2xl font-semibold text-foreground"
                >
                  {meta.label}
                </h2>
                <p className="text-[15px] leading-relaxed text-muted-foreground">
                  {meta.blurb}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                {cases.map((useCase) => (
                  <Link
                    key={useCase.slug}
                    href={`/use-cases/${useCase.slug}`}
                    className="group flex flex-col rounded-xl border border-border bg-background p-6 transition-colors hover:border-[color:var(--klio-border-strong)] hover:bg-card"
                  >
                    <h3 className="mb-1.5 text-[17px] font-semibold text-foreground">
                      {useCase.title}
                    </h3>
                    <p className="mb-5 text-[14px] leading-relaxed text-muted-foreground">
                      {useCase.tagline}
                    </p>
                    <div className="mt-auto">
                      <HandoverStrip spec={useCase.diagram} compact />
                    </div>
                    <div className="mt-4 text-[13px] font-medium text-foreground opacity-0 transition-opacity group-hover:opacity-100">
                      Read the walkthrough →
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {/* CTA */}
      <div className="mt-24 rounded-2xl border border-border bg-card p-10 text-center">
        <h2 className="mb-3 text-2xl font-semibold text-foreground">
          All of it is on the Free plan
        </h2>
        <p className="mx-auto mb-6 max-w-[480px] text-[15px] leading-relaxed text-muted-foreground">
          Unlimited memories, kept forever, for one person. You pay when a
          second person&apos;s agents share the workplace.
        </p>
        <div className="flex items-center justify-center gap-3">
          <a href={CLOUD_SIGNUP_URL} className="k-btn k-btn--primary">
            Start free
          </a>
          <Link href="/pricing" className="k-btn k-btn--ghost">
            See pricing
          </Link>
        </div>
      </div>
    </div>
  );
}
