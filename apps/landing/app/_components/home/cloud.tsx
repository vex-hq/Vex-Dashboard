import { CLOUD_SIGNIN_URL, CLOUD_SIGNUP_URL } from '../nav/nav-config';

/**
 * Klio Cloud — the hosted path. Self-host is free forever; Cloud is the
 * opt-in managed layer (live now, magic-link auth) with the sign-up / sign-in
 * conversion CTAs. Memory stays the wedge; Cloud is "don't want to run it
 * yourself?".
 */
const CLOUD_POINTS = [
  {
    title: 'Managed & backed up',
    desc: 'Hosted memory with no Postgres or Redis to run. Start in seconds.',
  },
  {
    title: 'Cross-agent sync',
    desc: 'Shared memory across every agent and machine on a project, in real time.',
  },
  {
    title: 'Per-end-user memory',
    desc: 'Embedding Klio in your own product? Give every user private, isolated memory (priced per end-user).',
  },
  {
    title: 'SSO & audit',
    desc: 'Team access, single sign-on, and a cryptographic audit trail.',
  },
] as const;

export function Cloud() {
  return (
    <section id="cloud" className="k-section">
      <div className="k-container">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.05fr] lg:items-start">
          <div>
            <p className="k-eyebrow">Klio Cloud</p>
            <h2 className="k-h2 mt-4 max-w-[20ch] text-balance">
              Don’t want to self-host? Klio Cloud is live.
            </h2>
            <p className="k-lede mt-5">
              The same memory layer, fully managed — zero infrastructure,
              cross-agent sync, and per-end-user memory for teams embedding Klio.
              Free to start; you only pay when we host at scale.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <a href={CLOUD_SIGNUP_URL} className="k-btn k-btn--primary">
                Sign up — free to start
              </a>
              <a href={CLOUD_SIGNIN_URL} className="k-btn k-btn--ghost">
                Sign in
              </a>
            </div>
          </div>

          <div className="border-border grid gap-px overflow-hidden rounded-lg border sm:grid-cols-2">
            {CLOUD_POINTS.map((p) => (
              <div key={p.title} className="bg-card p-6">
                <h3 className="k-h3 text-[15px]">{p.title}</h3>
                <p className="text-muted-foreground mt-2 text-[14px] leading-relaxed">
                  {p.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
