import type { TocHeading } from '~/lib/blog';

interface TableOfContentsProps {
  headings: TocHeading[];
}

export function TableOfContents({ headings }: TableOfContentsProps) {
  if (headings.length < 2) return null;

  return (
    <nav
      aria-label="Table of contents"
      className="mb-10 rounded-xl border border-border bg-card p-5"
    >
      <p className="mb-3 font-mono text-[11px] font-medium tracking-widest text-muted-foreground uppercase">
        On this page
      </p>
      <ol className="space-y-2">
        {headings.map((heading) => (
          <li key={heading.id} className={heading.level === 3 ? 'pl-4' : ''}>
            <a
              href={`#${heading.id}`}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
