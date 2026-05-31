/**
 * How Klio works — the memory loop. Capture activity → recall it across
 * sessions and agents → the agent acts with continuity. Memory is the
 * cause; reliability is the effect.
 */
const STEPS = [
  {
    n: '01',
    title: 'Capture',
    desc: 'Klio records what happens in a session — decisions, observations, notes — over MCP and a few lightweight hooks. No copy-paste.',
  },
  {
    n: '02',
    title: 'Recall',
    desc: 'Before acting, the agent calls recall() and gets the relevant prior context back — scoped to the project, shared across every agent on it.',
  },
  {
    n: '03',
    title: 'Stay reliable',
    desc: 'With continuity, the agent stops re-deriving, re-deciding, and re-breaking. Drift and repeated mistakes fall because the context never left.',
  },
] as const;

export function HowMemoryWorks() {
  return (
    <section id="how-it-works" className="k-section">
      <div className="k-container">
        <p className="k-eyebrow">How it works</p>
        <h2 className="k-h2 mt-4 max-w-[22ch] text-balance">
          Capture once. Recall everywhere. Drift goes down.
        </h2>

        <div className="border-border mt-12 grid gap-px overflow-hidden rounded-lg border md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="bg-card flex flex-col p-7">
              <span className="text-muted-foreground font-mono text-[13px]">
                {s.n}
              </span>
              <h3 className="k-h3 mt-4">{s.title}</h3>
              <p className="text-muted-foreground mt-3 text-[15px] leading-relaxed">
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
