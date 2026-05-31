/**
 * The seven MCP tools. Klio's surface is small and legible — one verb per
 * job. Rendered as call → purpose rows in mono, specimen-style.
 */
const TOOLS = [
  { call: 'recall(query)', purpose: 'Pull the relevant prior context before acting.' },
  { call: 'remember(fact)', purpose: 'Persist something worth keeping across sessions.' },
  { call: 'observe(event)', purpose: 'Log what happened — raw session activity.' },
  { call: 'plan(intent)', purpose: 'Record the plan so the next agent builds on it.' },
  { call: 'decide(choice)', purpose: 'Capture a decision so it isn’t re-litigated.' },
  { call: 'note(text)', purpose: 'Jot a durable note scoped to the project.' },
  { call: 'space(name)', purpose: 'Open or switch a scoped memory store.' },
] as const;

export function Tools() {
  return (
    <section id="tools" className="k-section">
      <div className="k-container">
        <p className="k-eyebrow">The toolkit</p>
        <h2 className="k-h2 mt-4 max-w-[24ch] text-balance">
          Seven MCP tools your agents already know how to call.
        </h2>
        <p className="k-lede mt-5">
          MCP-native — no SDK to wire, no framework lock-in. Any MCP client
          gets these verbs out of the box.
        </p>

        <div className="border-border mt-12 overflow-hidden rounded-lg border">
          {TOOLS.map((t, i) => (
            <div
              key={t.call}
              className={`grid grid-cols-1 gap-1 px-6 py-4 sm:grid-cols-[16rem_1fr] sm:items-baseline sm:gap-6 ${
                i > 0 ? 'border-border border-t' : ''
              }`}
            >
              <code className="text-foreground font-mono text-[14px]">
                {t.call}
              </code>
              <span className="text-muted-foreground text-[15px] leading-relaxed">
                {t.purpose}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
