export function PostCta() {
  return (
    <section className="mt-10 border-t border-border py-12">
      <div className="mb-4 text-[13px] font-medium tracking-widest text-foreground uppercase">
        Get Started
      </div>
      <h2 className="mb-3 text-2xl leading-tight font-semibold text-foreground">
        Start monitoring your AI agents for free.
      </h2>
      <p className="mb-8 max-w-[480px] text-[15px] leading-relaxed text-muted-foreground">
        Free tier includes 10k events/month. Detects drift, hallucinations, and
        policy violations in production — 5-minute setup.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <a
          href="https://app.tryvex.dev"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-11 items-center rounded-lg bg-foreground px-6 text-[15px] font-semibold text-background transition-colors hover:bg-[var(--klio-foreground-strong)]"
        >
          Try Vex Free
        </a>
        <iframe
          src="https://ghbtns.com/github-btn.html?user=Vex-AI-Dev&repo=Vex&type=star&count=true&size=large&color=dark"
          width="150"
          height="30"
          title="GitHub Stars"
        />
      </div>
    </section>
  );
}
