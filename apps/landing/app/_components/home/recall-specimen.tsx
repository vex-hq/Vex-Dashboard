/**
 * A real-looking `recall()` specimen — the hero's proof object. Shows an
 * agent asking Klio for context and getting back prior decisions/notes/
 * observations across sessions. Static markup (no JS): the point is the
 * shape of the output, rendered in Klio's paper-and-ink mono aesthetic.
 *
 * Wire identifiers (X-Vex-Key) are kept verbatim — they are the real
 * protocol, not brand copy.
 */
const MEMORIES = [
  {
    kind: 'decided',
    text: 'Auth is magic-link only (Supabase). No password login in prod.',
  },
  {
    kind: 'noted',
    text: 'API base is mcp.klio.tech; key travels in the X-Vex-Key header.',
  },
  {
    kind: 'observed',
    text: 'Cross-project recall was siloed by org → project in migration 023.',
  },
] as const;

export function RecallSpecimen() {
  return (
    <div className="border-border bg-card overflow-hidden rounded-lg border">
      {/* window bar */}
      <div className="border-border flex items-center gap-2 border-b px-4 py-2.5">
        <span className="bg-foreground/20 h-2.5 w-2.5 rounded-full" />
        <span className="bg-foreground/15 h-2.5 w-2.5 rounded-full" />
        <span className="bg-foreground/10 h-2.5 w-2.5 rounded-full" />
        <span className="text-muted-foreground ml-2 font-mono text-[12px]">
          claude-code · klio
        </span>
      </div>

      <div className="space-y-3 p-5 font-mono text-[13px] leading-relaxed">
        <div>
          <span className="text-muted-foreground">{'> '}</span>
          <span className="text-foreground">
            recall(<span className="text-muted-foreground">&quot;auth config&quot;</span>)
          </span>
        </div>

        <div className="text-muted-foreground text-[12px]">
          → 3 memories · agent: claude-code · 4ms
        </div>

        <div className="border-border space-y-2.5 border-l pl-4">
          {MEMORIES.map((m) => (
            <div key={m.text} className="flex gap-2.5">
              <span className="text-muted-foreground w-[4.5rem] shrink-0 uppercase">
                {m.kind}
              </span>
              <span className="text-foreground">{m.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
