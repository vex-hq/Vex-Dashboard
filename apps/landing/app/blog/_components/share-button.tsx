interface ShareOnXProps {
  title: string;
  slug: string;
}

export function ShareOnX({ title, slug }: ShareOnXProps) {
  const pageUrl = `https://tryvex.dev/blog/${slug}`;
  const tweetText = encodeURIComponent(`${title}\n\nvia @tryvex`);
  const href = `https://x.com/intent/tweet?text=${tweetText}&url=${encodeURIComponent(pageUrl)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-muted-foreground hover:text-foreground"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
      Share on X
    </a>
  );
}
