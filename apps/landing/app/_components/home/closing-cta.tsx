import { CLOUD_SIGNUP_URL, GITHUB_REPO_URL } from '../nav/nav-config';

/**
 * Closing CTA — the one command, restated. Quiet confidence, no hard sell.
 */
export function ClosingCta() {
  return (
    <section className="k-section text-center">
      <div className="k-container">
        <h2 className="k-h2 mx-auto max-w-[20ch] text-balance">
          Give your agents a memory.
        </h2>
        <p className="k-lede mx-auto mt-5 text-center">
          One command wires Klio into Claude Code, Cursor, or Codex. It starts
          remembering from the next session — and never ships your data out.
        </p>

        <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <code className="border-border bg-card text-foreground inline-flex items-center rounded-md border px-4 py-3 font-mono text-[14px]">
            <span className="text-muted-foreground mr-2 select-none">$</span>
            npx @klio-tech/klio init
          </code>
          <a href={CLOUD_SIGNUP_URL} className="k-btn k-btn--primary">
            Or sign up for Klio Cloud
          </a>
        </div>

        <p className="text-muted-foreground mt-6 text-[13px]">
          Prefer the source?{' '}
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="k-link"
          >
            Star it on GitHub
          </a>
        </p>
      </div>
    </section>
  );
}
