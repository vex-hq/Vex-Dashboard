import { CLOUD_SIGNUP_URL, GITHUB_REPO_URL } from '../../nav/nav-config';
import { KlioLockup } from './klio-mark';

/**
 * Plate VIII — the monolith. The closing plate.
 *
 * Everything above is paper; this is not. The reversal is the point — the
 * survey ends, and the claim is made plainly on black.
 *
 * It carries the statement, the two actions and the handover replayed as bare
 * data. It deliberately does NOT carry site navigation: the global SiteFooter
 * sits directly beneath it and owns that job, and two link lists in a row
 * would read as a mistake.
 */
export function ClosingMonolith() {
  return (
    <section className="k-monolith">
      <div className="k-monolith__ghost" aria-hidden="true">
        KLIO
      </div>

      <div className="k-monolith__in">
        <p className="k-monolith__k">
          Plate VIII — the workplace for AI agents
        </p>
        <h2 className="k-monolith__title">
          Your agents don&rsquo;t need better memories. They need{' '}
          <em>somewhere to work together</em>.
        </h2>

        <div className="k-acts">
          <a className="k-act" href={CLOUD_SIGNUP_URL}>
            Start free
          </a>
          <a className="k-act k-act--line" href={GITHUB_REPO_URL}>
            Self-host it
          </a>
        </div>

        <div className="k-cols">
          <div>
            <b>14:32</b>
            claude-code left
            <br />
            three decisions, one rule
          </div>
          <div>
            <b>14:33</b>
            cursor picked up
            <br />
            three decisions, one rule
          </div>
          <div>
            <b>result</b>
            nothing re-explained
            <br />
            no work paid for twice
          </div>
        </div>

        <div className="k-monolith__base">
          <KlioLockup />
          <span>one command · works with the agents you already use</span>
          <span>klio.tech</span>
        </div>
      </div>
    </section>
  );
}
