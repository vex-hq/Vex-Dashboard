import { GITHUB_REPO_URL } from '../../nav/nav-config';
import { PLANS, type Plan } from '~/lib/pricing';

/**
 * Plate VII — the schedule.
 *
 * Rendered from the canonical PLANS in `lib/pricing.ts`, which also feeds
 * /pricing, the pricing API and the JSON-LD offers — so the plate can never
 * drift from the price a visitor is actually charged.
 *
 * The plate shows three columns; Starter is a four-column tier that would
 * crowd them, so it is named in the margin note instead of dropped. Editing
 * PLANS changes both.
 */
const SHOWN: ReadonlyArray<Plan['id']> = ['free', 'pro', 'team'];

/** The four escalating levers, in the order they matter on a schedule. */
const LEVERS = [
  'Memories captured',
  'Recalls',
  'Cross-agent sync',
  'Memory retention',
] as const;

function money(amount: number) {
  return `$${amount.toLocaleString('en-US')}`;
}

function terms(plan: Plan) {
  if (plan.priceMonthly === 0) return 'per month';
  if (plan.priceYearly) {
    return `per month · ${money(plan.priceYearly)} yearly`;
  }
  return 'per month';
}

export function PlateSchedule() {
  const shown = SHOWN.map(
    (id) => PLANS.find((plan) => plan.id === id) as Plan,
  ).filter(Boolean);

  const starter = PLANS.find((plan) => plan.id === 'starter');

  return (
    <section className="k-plate k-plate--deep" id="pricing">
      <p className="k-pnum">
        <b>Plate VII</b> &nbsp;— the schedule &nbsp;·&nbsp; rates
      </p>
      <p className="k-lede" style={{ margin: '26px 0 34px' }}>
        Free for one pair of hands. Paid when the shift has a crew.
      </p>

      <div className="k-rates">
        {shown.map((plan) => (
          <div
            key={plan.id}
            className={`k-rate ${plan.highlighted ? 'k-rate--pick' : ''}`.trim()}
          >
            <p className="k-rate__nm">{plan.name}</p>
            <p className="k-rate__amt">{money(plan.priceMonthly)}</p>
            <p className="k-rate__per">{terms(plan)}</p>
            <ul>
              {LEVERS.map((label) => {
                const feature = plan.features.find((f) => f.label === label);
                if (!feature) return null;
                return (
                  <li key={label}>
                    {label} — {feature.value}
                  </li>
                );
              })}
            </ul>
            <a className="k-rate__go" href={plan.cta.href}>
              {plan.cta.label} →
            </a>
          </div>
        ))}
      </div>

      <p className="k-marg" style={{ marginTop: '26px', maxWidth: '68ch' }}>
        {starter ? (
          <>
            Starter sits between Free and Pro at{' '}
            <b>{money(starter.priceMonthly)}</b>.{' '}
          </>
        ) : null}
        Connected agents are unlimited on every tier. Self-hosting the
        open-source engine on your own hardware is <b>free</b> — the source is
        at{' '}
        <a href={GITHUB_REPO_URL} style={{ color: 'inherit' }}>
          github.com/klio-tech/klio
        </a>
        . The full schedule is published at{' '}
        <a href="/pricing" style={{ color: 'inherit' }}>
          klio.tech/pricing
        </a>
        .
      </p>
    </section>
  );
}
