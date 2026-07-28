import { LEDGER } from './survey-data';

/**
 * Plate III — the ledger.
 *
 * The product demonstrated rather than described: one hour of one project, three
 * agents from three vendors, and nothing explained twice. The 14:33 row is the
 * whole pitch — it is printed in the oxide so the eye lands on the handover.
 */
export function PlateLedger() {
  return (
    <section className="k-plate k-plate--deep" id="ledger">
      <p className="k-pnum">
        <b>Plate III</b> &nbsp;— the ledger &nbsp;·&nbsp; repo/api
        &nbsp;·&nbsp; shift 14:00–15:00
      </p>
      <p className="k-lede" style={{ margin: '26px 0 30px' }}>
        Work belongs to the job, not to the tool that happened to do it.
      </p>

      <div className="k-led">
        <div className="k-led__hd">
          <span>entry · agent · disposition</span>
          <span>shared workplace</span>
        </div>

        {LEDGER.map((entry) => (
          <div
            key={`${entry.time}-${entry.agent}`}
            className={`k-led__row ${entry.handover ? 'k-led__row--in' : ''}`.trim()}
          >
            <span className="k-led__t">{entry.time}</span>
            <span className="k-led__who">{entry.agent}</span>
            <span className="k-led__what">{entry.what}</span>
            <span className="k-led__st">{entry.disposition}</span>
          </div>
        ))}

        <p className="k-led__note">
          <b>Nothing was re-explained.</b> Three agents, three vendors, one job
          — each opened the same workplace and continued from the last entry.
        </p>
      </div>
    </section>
  );
}
