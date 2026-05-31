import type { Metadata } from 'next';

import Link from 'next/link';

import { getAllChangelogs } from '~/lib/changelog';

export const metadata: Metadata = {
  title: 'Changelog — Vex',
  description:
    'New features, improvements, and updates to the Vex platform.',
};

export default function ChangelogPage() {
  const entries = getAllChangelogs();

  return (
    <div className="container py-24">
      {/* Hero */}
      <div className="mb-16 border-b border-border pb-12">
        <div className="mb-4 text-[13px] font-medium tracking-widest text-foreground uppercase">
          Changelog
        </div>
        <h1 className="mb-4 text-3xl font-bold text-foreground sm:text-4xl lg:text-5xl">
          What&apos;s New
        </h1>
        <p className="max-w-[520px] text-[17px] leading-relaxed text-muted-foreground">
          New features, improvements, and updates to the Vex platform. Follow
          along as we ship.
        </p>
      </div>

      {entries.length === 0 ? (
        <p className="text-muted-foreground">No updates yet. Check back soon.</p>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute top-0 bottom-0 left-[7px] w-px bg-border md:left-[120px]" />

          <div className="space-y-12">
            {entries.map((entry) => (
              <div key={entry.slug} className="relative flex gap-8">
                {/* Date column (desktop) */}
                <div className="hidden w-[100px] shrink-0 pt-1 text-right md:block">
                  <time className="text-sm text-muted-foreground">{entry.date}</time>
                </div>

                {/* Timeline dot */}
                <div className="relative shrink-0">
                  <div className="mt-2 h-[14px] w-[14px] rounded-full border-2 border-border bg-[#0c0c0c]" />
                </div>

                {/* Content card */}
                <Link
                  href={`/changelog/${entry.slug}`}
                  className="group flex-1 rounded-xl border border-border bg-background p-6 transition-colors hover:border-border/30 hover:bg-card sm:p-8"
                >
                  <div className="mb-3 flex flex-wrap items-center gap-3">
                    <span className="rounded-full border border-border/30 bg-foreground/10 px-2.5 py-1 text-[11px] font-medium tracking-widest text-foreground uppercase">
                      v{entry.version}
                    </span>
                    <time className="text-xs text-muted-foreground md:hidden">
                      {entry.date}
                    </time>
                    {entry.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-foreground/10 px-2 py-0.5 text-[10px] font-medium text-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <h2 className="mb-2 text-xl font-bold text-foreground transition-colors group-hover:text-foreground sm:text-2xl">
                    {entry.title}
                  </h2>
                  <p className="text-[15px] leading-relaxed text-muted-foreground">
                    {entry.description}
                  </p>
                  <div className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-foreground transition-colors group-hover:text-foreground">
                    Read more
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
                      <path d="M3 8h10M9 4l4 4-4 4" />
                    </svg>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
