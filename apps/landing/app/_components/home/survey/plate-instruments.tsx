/**
 * Plate V·B — the instruments.
 *
 * The seven MCP tools, kept from the previous home page because they are the
 * page's most concrete proof: any MCP client already knows how to call these
 * verbs, so "no vendor owns the door" is checkable rather than asserted.
 */
const INSTRUMENTS = [
  { call: 'recall(query)', purpose: 'Pull the relevant prior context before acting.' },
  { call: 'remember(fact)', purpose: 'Persist something worth keeping across sessions.' },
  { call: 'observe(event)', purpose: 'Log what happened — raw session activity.' },
  { call: 'plan(intent)', purpose: 'Record the plan so the next agent builds on it.' },
  { call: 'decide(choice)', purpose: 'Capture a decision so it is not re-litigated.' },
  { call: 'note(text)', purpose: 'Jot a durable note scoped to the project.' },
  { call: 'space(name)', purpose: 'Open or switch a scoped memory store.' },
] as const;

export function PlateInstruments() {
  return (
    <section className="k-plate" id="tools">
      <p className="k-pnum">
        <b>Plate V·B</b> &nbsp;— the instruments &nbsp;·&nbsp; seven verbs
      </p>
      <p className="k-lede" style={{ margin: '26px 0 34px' }}>
        Seven MCP tools your agents already know how to call.
      </p>

      <div className="k-led">
        <div className="k-led__hd">
          <span>call · purpose</span>
          <span>mcp-native</span>
        </div>
        {INSTRUMENTS.map((instrument) => (
          <div className="k-instrument" key={instrument.call}>
            <code>{instrument.call}</code>
            <span>{instrument.purpose}</span>
          </div>
        ))}
      </div>

      <p className="k-marg" style={{ marginTop: '26px', maxWidth: '60ch' }}>
        No SDK to wire, no framework lock-in. Any MCP client gets these verbs
        out of the box.
      </p>
    </section>
  );
}
