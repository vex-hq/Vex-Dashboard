import { GITHUB_REPO_URL } from '../nav/nav-config';
import { RecallSpecimen } from './recall-specimen';

/**
 * Home hero — the memory wedge. Leads with the one-line truth ("your agents
 * forget") and the fix (shared, persistent memory), proves it with a live
 * recall() specimen, and offers the one-command install as the primary CTA.
 */
export function Hero() {
  return (
    <section className="relative pt-24 pb-20 lg:pt-32">
      <div className="k-container">
        <div className="hero-grid grid items-center gap-14 lg:grid-cols-[1fr_1.05fr]">
          {/* Copy */}
          <div>
            <p className="k-eyebrow k-rise" data-stagger="1">
              Memory for AI agents
            </p>

            <h1 className="k-display k-rise mt-5" data-stagger="2">
              Your agents forget.
              <br />
              Klio remembers.
            </h1>

            <p className="k-lede k-rise mt-6" data-stagger="3">
              Klio gives Claude Code, Cursor, and Codex shared, persistent
              memory — what one agent learns, the others know. So they stop
              forgetting context, drifting off-task, and re-making decisions
              you already made.
            </p>

            <div
              className="k-rise mt-9 flex flex-col gap-4 sm:flex-row sm:items-center"
              data-stagger="4"
            >
              <code className="border-border bg-card text-foreground inline-flex items-center rounded-md border px-4 py-3 font-mono text-[14px]">
                <span className="text-muted-foreground mr-2 select-none">$</span>
                npx @klio-tech/klio init
              </code>
              <a
                href={GITHUB_REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="k-btn k-btn--ghost"
              >
                View on GitHub
              </a>
            </div>

            <p className="text-muted-foreground mt-5 font-mono text-[12px]">
              Local-first · encrypted under your key · open source
            </p>
          </div>

          {/* Specimen */}
          <div className="k-rise" data-stagger="3">
            <RecallSpecimen />
          </div>
        </div>
      </div>
    </section>
  );
}
