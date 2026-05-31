import { APP_URL, GITHUB_REPO_URL } from '../nav/nav-config';

/**
 * Home pricing — scales to zero. Self-host is free forever (OSS); Klio Cloud
 * is the opt-in managed + cross-agent layer, including per-end-user memory
 * for teams embedding Klio (B2B2C). The full /pricing page keeps the detail.
 */
const TIERS = [
  {
    name: 'Self-host',
    price: 'Free forever',
    desc: 'The open-source engine on your machine. Local-first, encrypted under your key, all seven MCP tools.',
    points: ['Unlimited memory, local', 'Encrypted at rest', 'No telemetry', 'AGPL + Apache shim'],
    cta: { label: 'Install', href: GITHUB_REPO_URL, external: true },
    primary: true,
  },
  {
    name: 'Klio Cloud',
    price: 'Opt-in',
    desc: 'Managed hosting, SSO, and the cross-agent intelligence layer — including per-end-user memory for products that embed Klio.',
    points: ['Managed + backed up', 'Cross-agent sync', 'Per-end-user isolation', 'SSO & audit'],
    cta: { label: 'Join the waitlist', href: APP_URL, external: true },
    primary: false,
  },
] as const;

export function Pricing() {
  return (
    <section id="pricing" className="k-section">
      <div className="k-container">
        <p className="k-eyebrow">Pricing</p>
        <h2 className="k-h2 mt-4 max-w-[22ch] text-balance">
          Free where it runs on your machine. Paid only when we host it.
        </h2>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {TIERS.map((t) => (
            <div
              key={t.name}
              className={`flex flex-col rounded-lg border p-8 ${
                t.primary
                  ? 'border-foreground/30 bg-card'
                  : 'border-border bg-transparent'
              }`}
            >
              <div className="flex items-baseline justify-between">
                <h3 className="k-h3">{t.name}</h3>
                <span className="text-muted-foreground font-mono text-[13px]">
                  {t.price}
                </span>
              </div>
              <p className="text-muted-foreground mt-3 text-[15px] leading-relaxed">
                {t.desc}
              </p>
              <ul className="mt-6 space-y-2.5">
                {t.points.map((p) => (
                  <li
                    key={p}
                    className="text-foreground flex items-center gap-3 text-[14px]"
                  >
                    <span className="bg-foreground inline-block h-1.5 w-1.5 shrink-0 rounded-full" />
                    {p}
                  </li>
                ))}
              </ul>
              <a
                href={t.cta.href}
                target={t.cta.external ? '_blank' : undefined}
                rel={t.cta.external ? 'noopener noreferrer' : undefined}
                className={`mt-8 ${t.primary ? 'k-btn k-btn--primary' : 'k-btn k-btn--ghost'}`}
              >
                {t.cta.label}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
