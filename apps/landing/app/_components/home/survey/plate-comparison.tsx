/**
 * Plate VI·B — the comparison.
 *
 * Positioned against the old way, never against a named competitor's quality:
 * every one of these tools recalls well for the agent it was built for. The
 * axis that separates them is whether the memory is shared across vendors —
 * which is a shape difference, not a better-or-worse claim.
 */
const COLUMNS = ['Klio', 'mem0', 'Zep', 'Supermemory'] as const;

const ROWS: ReadonlyArray<{ feature: string; cells: readonly boolean[] }> = [
  { feature: 'Cross-agent shared memory', cells: [true, false, false, false] },
  {
    feature: 'Local-first (runs on your machine)',
    cells: [true, false, false, false],
  },
  {
    feature: 'Encrypted under a user-owned key (self-hosted)',
    cells: [true, false, false, false],
  },
  { feature: 'MCP-native', cells: [true, false, false, false] },
  { feature: 'Open source', cells: [true, false, true, false] },
];

export function PlateComparison() {
  return (
    <section className="k-plate" id="compare">
      <p className="k-pnum">
        <b>Plate VI·B</b> &nbsp;— the comparison &nbsp;·&nbsp; the shelf
      </p>
      <p className="k-lede" style={{ margin: '26px 0 34px' }}>
        Most memory tools recall for one agent. Klio is the shared workplace.
      </p>

      <div className="k-matrix-scroll">
        <table className="k-matrix">
          <thead>
            <tr>
              <th scope="col">Capability</th>
              {COLUMNS.map((column) => (
                <th scope="col" key={column}>
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.feature}>
                <th scope="row">{row.feature}</th>
                {row.cells.map((on, index) => (
                  <td key={COLUMNS[index]}>
                    {on ? (
                      <span className="k-dot" aria-label="yes" />
                    ) : (
                      <span className="k-dash" aria-label="no" />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
