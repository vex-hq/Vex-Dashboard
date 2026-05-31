/**
 * The problem — reframed from Vex's strong "passes evals, then drifts"
 * framing to the memory root cause: agents are stateless and siloed.
 */
const SYMPTOMS = [
  {
    title: 'Forgets between sessions',
    desc: 'Every session starts from zero. You re-paste the same context, the same conventions, the same decisions — again.',
  },
  {
    title: 'Agents don’t share what they learn',
    desc: 'Cursor figures something out; Claude Code has no idea. Two agents on one project, two separate blank slates.',
  },
  {
    title: 'Re-makes decisions you already made',
    desc: 'It re-introduces a bug you fixed last week and contradicts an architecture call from yesterday. No memory, no continuity.',
  },
] as const;

export function Problem() {
  return (
    <section id="problem" className="k-section">
      <div className="k-container">
        <p className="k-eyebrow">The problem</p>
        <h2 className="k-h2 mt-4 max-w-[20ch] text-balance">
          Passes every eval. Ships. Then quietly drifts.
        </h2>
        <p className="k-lede mt-5">
          No crash, no alert — the agent just starts doing 90% of the job
          instead of 100%. The root cause isn’t the model. It’s that the agent
          has <em className="text-foreground not-italic">no memory</em>: it
          can’t remember across sessions and can’t share context across tools.
        </p>

        <div className="border-border mt-12 grid gap-px overflow-hidden rounded-lg border md:grid-cols-3">
          {SYMPTOMS.map((s) => (
            <div key={s.title} className="bg-card p-7">
              <h3 className="k-h3">{s.title}</h3>
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
