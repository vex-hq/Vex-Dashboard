import Link from 'next/link';

/**
 * The bridge section — memory → reliability. The single causal story:
 * forgetting is the root cause; give the agent its context back and the
 * downstream failures fall. Links into the (Phase-2) reliability hub.
 */
const EFFECTS = [
  { cause: 'No memory of the codebase’s conventions', effect: 'Drift' },
  { cause: 'No memory of what’s true about the system', effect: 'Hallucination' },
  { cause: 'No memory of decisions already made', effect: 'Repeated mistakes' },
] as const;

export function Reliability() {
  return (
    <section id="reliability" className="k-section">
      <div className="k-container">
        <p className="k-eyebrow">Why it matters</p>
        <h2 className="k-h2 mt-4 max-w-[24ch] text-balance">
          Memory is why agents stay reliable.
        </h2>
        <p className="k-lede mt-5">
          Drift, hallucination, and repeated mistakes are all downstream of the
          same thing — the agent forgot. Observability tools flag these after
          they happen. Klio prevents them by giving the agent its context back
          before it acts.
        </p>

        <div className="border-border mt-12 grid gap-px overflow-hidden rounded-lg border md:grid-cols-3">
          {EFFECTS.map((e) => (
            <div key={e.effect} className="bg-card p-7">
              <span className="text-muted-foreground text-[14px] leading-relaxed">
                {e.cause}
              </span>
              <div className="text-foreground mt-4 font-mono text-[15px]">
                → {e.effect}
              </div>
            </div>
          ))}
        </div>

        <p className="mt-8 text-[15px]">
          <Link href="/learn" className="k-link">
            See why agents fail — and how memory fixes it
          </Link>
        </p>
      </div>
    </section>
  );
}
