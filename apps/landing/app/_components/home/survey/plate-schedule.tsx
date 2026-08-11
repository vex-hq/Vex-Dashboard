import { PLANS, PLATFORM, type Plan } from '~/lib/pricing';

import { GITHUB_REPO_URL } from '../../nav/nav-config';

/**
 * Plate VII — the schedule.
 *
 * Rendered from the canonical PLANS + PLATFORM in `lib/pricing.ts`, which
 * also feed /pricing, the pricing API and the JSON-LD offers — so the plate
 * can never drift from the price a visitor is actually charged.
 *
 * Three columns: free for one person, per-seat when a team shares one brain,
 * and the sales-led Platform lane (enterprise + embed). Platform was
 * originally left to /pricing only; that read as a hole in the schedule — an
 * enterprise visitor scanning rates found no door to knock on (2026-08-11).
 */
const SHOWN: ReadonlyArray<Plan['id']> = ['free', 'team'];

/** The levers that actually differ between the two tiers. */
const LEVERS = [
  'People sharing a brain',
  'Sync',
  'Artifacts',
  'Memory retention',
] as const;

function money(amount: number) {
  return `$${amount.toLocaleString('en-US')}`;
}

function terms(plan: Plan) {
  if (plan.priceMonthly === 0) return 'forever';
  const per = plan.priceUnit === 'seat' ? 'per user / month' : 'per month';
  if (plan.priceYearly) {
    return `${per} · ${money(plan.priceYearly)} yearly`;
  }
  return per;
}

export function PlateSchedule() {
  const shown = SHOWN.map(
    (id) => PLANS.find((plan) => plan.id === id) as Plan,
  ).filter(Boolean);

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

        {/* The sales-led lane, from the same canonical source as /pricing. */}
        <div className="k-rate">
          <p className="k-rate__nm">{PLATFORM.name} · Enterprise</p>
          <p className="k-rate__amt">Custom</p>
          <p className="k-rate__per">{PLATFORM.priceLabel.toLowerCase()}</p>
          <ul>
            <li>Embed Klio in your own product</li>
            <li>Isolated memory — per end-user</li>
            <li>SSO — audit trail — DPA</li>
            <li>Support — a person, not a queue</li>
          </ul>
          <a className="k-rate__go" href={PLATFORM.cta.href}>
            {PLATFORM.cta.label} →
          </a>
        </div>
      </div>

      <p className="k-marg" style={{ marginTop: '26px', maxWidth: '68ch' }}>
        Connected agents, memories and retention are unlimited on every tier —
        you pay for people, not volume. Self-hosting the open-source engine on
        your own hardware is <b>free</b> — the source is at{' '}
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
