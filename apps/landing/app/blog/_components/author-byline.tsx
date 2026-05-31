interface AuthorBylineProps {
  author: string;
  date: string;
  readingTime: number;
}

export function AuthorByline({ author, date, readingTime }: AuthorBylineProps) {
  return (
    <div className="mt-12 flex items-center gap-4 border-t border-border pt-8">
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-border bg-card font-mono text-sm font-medium text-foreground">
        {author
          .split(' ')
          .map((w) => w[0])
          .join('')
          .slice(0, 2)
          .toUpperCase()}
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">{author}</p>
        <p className="text-xs text-muted-foreground">
          {date} &middot; {readingTime} min read
        </p>
      </div>
    </div>
  );
}
