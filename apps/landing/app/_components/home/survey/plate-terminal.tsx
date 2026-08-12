'use client';

import { useEffect, useRef, useState } from 'react';

import { prefersReducedMotion } from './motion';

/**
 * Plate I·B — the instrument, running.
 *
 * The one thing a developer landing from a launch post wants before reading a
 * word of copy: proof the product works. This plate plays the whole thesis in
 * ten seconds — one agent sets a decision down, its session dies, a different
 * vendor's agent recalls it — using the real tool names and the real connect
 * command, because this audience checks.
 *
 * Implementation notes, in the spirit of the survey:
 * - Lines reveal on an interval once the plate is in view, then the loop
 *   holds and restarts. Under `prefers-reduced-motion` the finished transcript
 *   is shown statically — the content is the demo, not the typing.
 * - Every line is real: `decide` and `recall` are the shipped MCP tools, the
 *   connect command is the docs' quickstart verbatim. Nothing here is set
 *   dressing that an agent (or a sceptic) could catch out.
 * - The terminal is drawn in the survey's own ink rather than a stock
 *   neon-on-black: this site is a document that contains terminals, not a
 *   terminal wearing a website.
 */

interface Line {
  kind: 'agent' | 'call' | 'result' | 'gap' | 'plain';
  text: string;
}

const SCRIPT: Line[] = [
  { kind: 'agent', text: '● cursor — tuesday, 18:42' },
  {
    kind: 'call',
    text: '› decide("Error responses use RFC 7807 problem+json.",',
  },
  {
    kind: 'call',
    text: '         rationale: "Three handlers already do; the rest now match.")',
  },
  { kind: 'result', text: '✓ kept · decision · project api-gateway' },
  { kind: 'gap', text: '— session ends. the context window is gone. —' },
  { kind: 'agent', text: '● claude code — wednesday, 09:04' },
  { kind: 'call', text: '› recall("error response shape")' },
  {
    kind: 'result',
    text: '1 · Error responses use RFC 7807 problem+json. (decided yesterday, cursor)',
  },
  {
    kind: 'result',
    text: '✓ the new session starts from the decision — not from zero',
  },
];

const CONNECT_CMD = `claude mcp add --transport http klio https://mcp.klio.tech/mcp \\
  --header "X-Klio-Key: YOUR_KEY" \\
  --header "X-Klio-Agent: claude-code"`;

const LINE_MS = 620;
const HOLD_MS = 4200;

export function PlateTerminal() {
  const [shown, setShown] = useState(0);
  const [copied, setCopied] = useState(false);
  const rootRef = useRef<HTMLElement>(null);
  const started = useRef(false);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setShown(SCRIPT.length);
      return;
    }
    const root = rootRef.current;
    if (!root) return;

    let interval: ReturnType<typeof setInterval> | undefined;
    let hold: ReturnType<typeof setTimeout> | undefined;

    const play = () => {
      setShown(0);
      let i = 0;
      interval = setInterval(() => {
        i += 1;
        setShown(i);
        if (i >= SCRIPT.length && interval) {
          clearInterval(interval);
          hold = setTimeout(play, HOLD_MS);
        }
      }, LINE_MS);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && !started.current) {
          started.current = true;
          play();
          observer.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    observer.observe(root);

    return () => {
      observer.disconnect();
      if (interval) clearInterval(interval);
      if (hold) clearTimeout(hold);
    };
  }, []);

  const copyConnect = async () => {
    try {
      await navigator.clipboard.writeText(CONNECT_CMD.replace(/\\\n\s*/g, ''));
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Clipboard can be denied; the command is selectable either way.
    }
  };

  return (
    <section className="k-plate" ref={rootRef} aria-label="The instrument, running">
      <div className="k-pnum">
        <b>Plate I·B</b>&ensp;The instrument, running
      </div>

      <div className="mx-auto mt-10 max-w-[820px]">
        {/* The transcript */}
        <div
          className="overflow-hidden rounded-xl border border-[color:var(--klio-border-strong)] bg-[color:var(--klio-foreground)] shadow-[0_2px_24px_rgba(31,29,26,0.18)]"
          role="img"
          aria-label="A terminal transcript: Cursor records a decision with Klio's decide tool; the session ends; Claude Code recalls the same decision the next morning and continues from it."
        >
          <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-2.5">
            <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-white/20" />
            <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-white/20" />
            <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-white/20" />
            <span className="ml-3 font-mono text-[11px] tracking-widest text-white/40 uppercase">
              two agents, one memory
            </span>
          </div>
          <div className="min-h-[280px] px-5 py-5 font-mono text-[12.5px] leading-[1.9] sm:text-[13.5px]">
            {SCRIPT.slice(0, shown).map((line, i) => (
              <div
                key={i}
                className={
                  line.kind === 'agent'
                    ? 'mt-3 text-white first:mt-0'
                    : line.kind === 'call'
                      ? 'whitespace-pre-wrap text-white/75'
                      : line.kind === 'result'
                        ? 'text-[color:#e8b492]'
                        : 'my-3 text-center text-white/35 italic'
                }
              >
                {line.text}
              </div>
            ))}
            {shown < SCRIPT.length && (
              <span
                aria-hidden
                className="ml-0.5 inline-block h-[1.1em] w-[7px] translate-y-[3px] animate-pulse bg-white/60"
              />
            )}
          </div>
        </div>

        {/* The connect command */}
        <div className="mt-6 rounded-xl border border-border bg-card p-4 sm:p-5">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
              connect an agent
            </span>
            <button
              type="button"
              onClick={copyConnect}
              className="k-act k-act--line cursor-pointer font-mono text-[11px] tracking-widest uppercase"
              aria-live="polite"
            >
              {copied ? 'copied' : 'copy'}
            </button>
          </div>
          <pre className="overflow-x-auto font-mono text-[12px] leading-relaxed text-foreground sm:text-[12.5px]">
            <code>{CONNECT_CMD}</code>
          </pre>
          <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
            Works with Claude Code, Cursor, Codex and any MCP client. Free for
            one person — unlimited memories, kept forever.
          </p>
        </div>
      </div>
    </section>
  );
}
