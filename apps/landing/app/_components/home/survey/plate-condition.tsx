import { OBSERVATIONS } from './survey-data';

/**
 * Plate II — the condition.
 *
 * The reframe. Not "agents forget" (a memory problem, and a crowded category)
 * but "every vendor built memory for its own agent, so you became the
 * integration layer" — which is a collaboration problem, and the one Klio is
 * actually shaped to solve.
 */
export function PlateCondition() {
  return (
    <section className="k-plate">
      <p className="k-pnum">
        <b>Plate II</b> &nbsp;— the condition
      </p>

      <div className="k-cond" style={{ marginTop: '38px' }}>
        <div>
          <p className="k-lede">Every agent keeps a private notebook.</p>
          <p className="k-copy" style={{ marginTop: '22px' }}>
            Each vendor built memory for its own agent, inside its own product.
            Your Claude context stays in Claude. Your editor&rsquo;s context
            stays in your editor. No vendor has any reason to hand your work to
            a competitor&rsquo;s agent.
          </p>
          <p className="k-copy" style={{ marginTop: '14px' }}>
            So you become the integration layer.
          </p>
        </div>

        <div>
          {OBSERVATIONS.map((observation) => (
            <div className="k-obs" key={observation.ordinal}>
              <h2>{observation.ordinal}</h2>
              <p>{observation.text}</p>
            </div>
          ))}
          <p className="k-marg" style={{ marginTop: '34px' }}>
            The re-explaining is the symptom.
            <br />
            <b>Rework is the bill.</b>
          </p>
        </div>
      </div>
    </section>
  );
}
