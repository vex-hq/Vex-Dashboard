/**
 * Cross-agent shared memory — the wedge vs mem0/Zep/Supermemory, SHOWN not
 * told. One agent writes a decision; a different agent, in a different tool,
 * recalls it. Rendered as a specimen so the claim is provable at a glance.
 */
export function SharedBrain() {
  return (
    <section id="shared" className="k-section">
      <div className="k-container">
        <p className="k-eyebrow">Cross-agent</p>
        <h2 className="k-h2 mt-4 max-w-[24ch] text-balance">
          What one agent learns, the others know.
        </h2>
        <p className="k-lede mt-5">
          Memory in Klio isn’t locked to one agent. A decision Cursor makes is
          there when Claude Code asks — same project, same brain, no re-pasting.
        </p>

        <div className="mt-12 grid items-stretch gap-4 lg:grid-cols-[1fr_auto_1fr]">
          {/* Agent A writes */}
          <div className="border-border bg-card flex flex-col rounded-lg border p-6">
            <span className="text-muted-foreground font-mono text-[12px]">
              Cursor · 2:14pm
            </span>
            <code className="text-foreground mt-3 font-mono text-[13px] leading-relaxed">
              decide(
              <span className="text-muted-foreground">
                &quot;use Postgres + pgvector for storage&quot;
              </span>
              )
            </code>
            <span className="text-muted-foreground mt-auto pt-4 font-mono text-[12px]">
              → written to project memory
            </span>
          </div>

          {/* Klio in the middle */}
          <div className="flex items-center justify-center">
            <div className="bg-background flex items-center gap-2 rounded-full border border-[color:var(--klio-border-strong)] px-4 py-2">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <rect x="3" y="6" width="18" height="2" fill="currentColor" />
                <rect x="8" y="11" width="13" height="2" fill="currentColor" />
                <rect x="3" y="16" width="18" height="2" fill="currentColor" />
              </svg>
              <span className="font-mono text-[12px]">Klio</span>
            </div>
          </div>

          {/* Agent B reads */}
          <div className="border-border bg-card flex flex-col rounded-lg border p-6">
            <span className="text-muted-foreground font-mono text-[12px]">
              Claude Code · next day
            </span>
            <code className="text-foreground mt-3 font-mono text-[13px] leading-relaxed">
              recall(
              <span className="text-muted-foreground">&quot;storage&quot;</span>
              )
            </code>
            <span className="text-foreground mt-3 font-mono text-[13px] leading-relaxed">
              ← decided: Postgres + pgvector
            </span>
            <span className="text-muted-foreground mt-auto pt-4 font-mono text-[12px]">
              no context re-pasted
            </span>
          </div>
        </div>

        <p className="text-muted-foreground mt-6 font-mono text-[12px]">
          Real-time across agents and machines via Redis pub/sub — scoped to the
          project, never leaking across them.
        </p>
      </div>
    </section>
  );
}
