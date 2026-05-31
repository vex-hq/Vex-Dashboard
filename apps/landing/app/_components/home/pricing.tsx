import { PLANS, PLATFORM } from '~/lib/pricing';

import { GITHUB_REPO_URL } from '../nav/nav-config';

/**
 * Home pricing — renders the canonical PLANS (lib/pricing.ts), the same tiers
 * shown on /pricing and in the JSON-LD. A condensed teaser (price + a few
 * headline features + CTA) that links to the full comparison. Self-host stays
 * free (open-core), noted under the grid.
 */
function priceLabel(priceMonthly: number): string {
  return priceMonthly === 0 ? 'Free' : `$${priceMonthly}`;
}

export function Pricing() {
  return (
    <section id="pricing" className="k-section">
      <div className="k-container">
        <p className="k-eyebrow">Pricing</p>
        <h2 className="k-h2 mt-4 max-w-[22ch] text-balance">
          Start free. Scale when your agents do.
        </h2>

        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`flex flex-col rounded-lg border p-6 ${
                plan.highlighted
                  ? 'border-foreground/30 bg-card'
                  : 'border-border bg-transparent'
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="k-h3">{plan.name}</h3>
                {plan.highlighted && (
                  <span className="bg-foreground text-background rounded-full px-2.5 py-0.5 font-mono text-[11px] tracking-tight">
                    Popular
                  </span>
                )}
              </div>

              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-foreground font-mono text-[28px] font-bold tracking-tight">
                  {priceLabel(plan.priceMonthly)}
                </span>
                {plan.priceMonthly > 0 && (
                  <span className="text-muted-foreground font-mono text-[13px]">
                    /mo
                  </span>
                )}
              </div>
              {plan.priceYearly !== undefined && (
                <span className="text-muted-foreground mt-1 font-mono text-[12px]">
                  or ${plan.priceYearly}/yr
                </span>
              )}

              <p className="text-muted-foreground mt-4 text-[14px] leading-relaxed">
                {plan.description}
              </p>

              <ul className="mt-6 space-y-2.5">
                {plan.features.slice(0, 4).map((f) => (
                  <li
                    key={f.label}
                    className="flex items-baseline justify-between gap-3 text-[13px]"
                  >
                    <span className="text-muted-foreground">{f.label}</span>
                    <span className="text-foreground text-right font-mono">
                      {f.value}
                    </span>
                  </li>
                ))}
              </ul>

              <a
                href={plan.cta.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`mt-8 ${
                  plan.highlighted
                    ? 'k-btn k-btn--primary'
                    : 'k-btn k-btn--ghost'
                } justify-center`}
              >
                {plan.cta.label}
              </a>
            </div>
          ))}
        </div>

        {/* B2B2C / embed lane — per-end-user, sales-led */}
        <div className="border-border bg-card mt-6 flex flex-col gap-5 rounded-lg border p-7 md:flex-row md:items-center md:justify-between">
          <div className="md:max-w-[60ch]">
            <div className="flex items-baseline gap-3">
              <h3 className="k-h3">{PLATFORM.name}</h3>
              <span className="text-muted-foreground font-mono text-[13px]">
                {PLATFORM.priceLabel}
              </span>
            </div>
            <p className="text-muted-foreground mt-2 text-[14px] leading-relaxed">
              {PLATFORM.description}
            </p>
          </div>
          <a
            href={PLATFORM.cta.href}
            className="k-btn k-btn--primary shrink-0 justify-center"
          >
            {PLATFORM.cta.label}
          </a>
        </div>

        <p className="text-muted-foreground mt-8 text-[14px]">
          Or self-host the open-source engine — free, forever, on your own
          machine.{' '}
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="k-link"
          >
            Get it on GitHub
          </a>
          .{' '}
          <a href="/pricing" className="k-link">
            See full pricing
          </a>
          .
        </p>
      </div>
    </section>
  );
}
