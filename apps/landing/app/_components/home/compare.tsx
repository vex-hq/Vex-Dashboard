/**
 * How Klio compares — the true axes against the memory shelf (mem0, Zep,
 * Supermemory). Monochrome matrix; a filled dot means "has it", a dash
 * means "doesn't". Klio's wedge is cross-agent + local-first + open.
 */
const COLUMNS = ['Klio', 'mem0', 'Zep', 'Supermemory'] as const;

const ROWS: { feature: string; cells: boolean[] }[] = [
  { feature: 'Cross-agent shared memory', cells: [true, false, false, false] },
  { feature: 'Local-first (runs on your machine)', cells: [true, false, false, false] },
  { feature: 'Encrypted under a user-owned key', cells: [true, false, false, false] },
  { feature: 'MCP-native', cells: [true, false, false, false] },
  { feature: 'Open source', cells: [true, false, true, false] },
];

function Cell({ on }: { on: boolean }) {
  return on ? (
    <span className="bg-foreground inline-block h-2 w-2 rounded-full" aria-label="yes" />
  ) : (
    <span className="bg-foreground/20 inline-block h-px w-3" aria-label="no" />
  );
}

export function Compare() {
  return (
    <section id="compare" className="k-section">
      <div className="k-container">
        <p className="k-eyebrow">How Klio compares</p>
        <h2 className="k-h2 mt-4 max-w-[26ch] text-balance">
          Most memory tools recall for one agent. Klio is the shared brain.
        </h2>

        <div className="mt-12 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse">
            <thead>
              <tr className="border-border border-b">
                <th className="text-muted-foreground py-4 pr-4 text-left font-mono text-[12px] font-medium tracking-[0.12em] uppercase">
                  Capability
                </th>
                {COLUMNS.map((c, i) => (
                  <th
                    key={c}
                    className={`px-4 py-4 text-left font-mono text-[13px] ${
                      i === 0 ? 'text-foreground font-semibold' : 'text-muted-foreground font-medium'
                    }`}
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.feature} className="border-border border-b">
                  <td className="text-foreground py-4 pr-4 text-[15px]">
                    {row.feature}
                  </td>
                  {row.cells.map((on, i) => (
                    <td key={i} className="px-4 py-4">
                      <Cell on={on} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
