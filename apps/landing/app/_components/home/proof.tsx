/**
 * Trust + proof band — sits directly under the hero. Two quiet signals a
 * skeptical developer scans for: what Klio works with, and hard numbers.
 * All figures come from the product-marketing proof points (kept honest /
 * approximate where appropriate).
 */
const WORKS_WITH = [
  'Claude Code',
  'Cursor',
  'Codex',
  'Ollama',
  'any MCP client',
];

const METRICS = [
  { value: '~4ms', label: 'recall latency' },
  { value: '768-dim', label: 'embeddings' },
  { value: 'SHA-256', label: 'audit chain' },
  { value: '0', label: 'telemetry' },
];

export function Proof() {
  return (
    <section className="border-border border-t">
      <div className="k-container py-10">
        <p className="k-eyebrow text-center">Works with</p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          {WORKS_WITH.map((name) => (
            <span
              key={name}
              className="text-foreground font-mono text-[15px] tracking-tight"
            >
              {name}
            </span>
          ))}
        </div>

        <div className="border-border mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-lg border md:grid-cols-4">
          {METRICS.map((m) => (
            <div
              key={m.label}
              className="bg-card flex flex-col items-center px-4 py-6 text-center"
            >
              <span className="text-foreground font-mono text-[26px] font-bold tracking-tight">
                {m.value}
              </span>
              <span className="text-muted-foreground mt-1 text-[13px]">
                {m.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
