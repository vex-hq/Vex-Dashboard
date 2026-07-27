/**
 * Private by default — answers the top objection ("does my data leave my
 * machine?") and carries the local-first / encrypted / auditable
 * differentiators with concrete mechanisms, not adjectives.
 *
 * Key ownership and the hash chain are properties of the SELF-HOSTED engine.
 * Klio Cloud does not hold user-supplied keys and does not hash-chain writes
 * today, so any card naming either one has to say which deployment it means.
 * `__tests__/security-claims.test.ts` enforces that.
 */
const GUARANTEES = [
  {
    title: 'Local-first',
    desc: 'The engine runs on your machine. Nothing leaves it unless you opt into Klio Cloud.',
  },
  {
    title: 'User-owned key (self-hosted)',
    desc: 'Self-host and memory is encrypted at rest under a key you hold — we never see it. On Klio Cloud the keys are ours: TLS in transit, encryption at rest, one isolated store per org.',
  },
  {
    title: 'Hash-chained audit (self-hosted)',
    desc: 'The self-hosted engine chains every write with SHA-256, so the history is tamper-evident and inspectable. Cloud writes are not chained yet.',
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
          A memory layer sees everything your agents do. So Klio is built to
          keep it yours. Self-host it and the encryption key is yours alone, end
          to end. Use Klio Cloud and we hold the keys — encrypted in transit and
          at rest, secrets redacted before storage, every org isolated.
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
