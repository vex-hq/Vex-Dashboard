/**
 * Private by default — answers the top objection ("does my data leave my
 * machine?") and carries the local-first / encrypted / auditable
 * differentiators with concrete mechanisms, not adjectives.
 */
const GUARANTEES = [
  {
    title: 'Local-first',
    desc: 'The engine runs on your machine. Nothing leaves it unless you opt into Klio Cloud.',
  },
  {
    title: 'User-owned key',
    desc: 'Memory is encrypted at rest under a key you hold — not us, not a shared cloud tenant.',
  },
  {
    title: 'Cryptographic audit',
    desc: 'Every write is chained with SHA-256. The history is inspectable — “trust us” isn’t in the design.',
  },
  {
    title: 'Zero telemetry',
    desc: 'No usage phone-home. What your agents remember stays between you and your agents.',
  },
] as const;

export function Security() {
  return (
    <section id="security" className="k-section">
      <div className="k-container">
        <p className="k-eyebrow">Private by default</p>
        <h2 className="k-h2 mt-4 max-w-[24ch] text-balance">
          Your agents’ memory never leaves unless you say so.
        </h2>
        <p className="k-lede mt-5">
          A memory layer sees everything your agents do. So Klio is built to keep
          it yours — local-first, encrypted under your own key, and auditable end
          to end.
        </p>

        <div className="border-border mt-12 grid gap-px overflow-hidden rounded-lg border sm:grid-cols-2 lg:grid-cols-4">
          {GUARANTEES.map((g) => (
            <div key={g.title} className="bg-card p-7">
              <h3 className="k-h3 text-[15px]">{g.title}</h3>
              <p className="text-muted-foreground mt-3 text-[14px] leading-relaxed">
                {g.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
