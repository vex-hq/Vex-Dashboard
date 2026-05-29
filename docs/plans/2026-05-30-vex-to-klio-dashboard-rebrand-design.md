# Vex → Klio Dashboard Rebrand — Design

**Date:** 2026-05-30
**Status:** Approved (brainstorming complete; ready for implementation plan)
**Repo:** `vex_public/Dashboard` (Next.js Makerkit monorepo)
**Scope:** `apps/web` only

---

## Goal

Rebrand the **cloud dashboard** (`apps/web`) from "Vex" to "Klio" and serve it at
`app.klio.tech`, as the first step of consolidating the product under a single
brand. Klio is now positioned as **memory + reliability** for AI agents (the
reliability/verification features are kept, not dropped).

This is a **brand-surface + domain** change, not a redesign and not a backend
change. It is intentionally the smallest safe diff (the "env-first" approach).

## Strategic context (decisions already made — do not re-litigate)

- **One brand: Klio.** "Vex" as a *product brand* is being retired; the cloud
  dashboard becomes **Klio Cloud**.
- **Klio = memory + reliability.** The Hub / Sessions / Agents / Alerts /
  Guardrails (reliability/verification) features stay in the app under the Klio
  brand. Memory is the already-shipped section.
- **`apps/web` only.** The marketing site (`apps/landing`, tryvex.dev) is **out
  of scope** for now; the klio.tech *root* landing is a separate, later decision.
- **Local Klio (`klio` repo `trust-app`) is untouched.**
- **Wire protocol stays "Vex".** `X-Vex-Key`, `X-Vex-Agent`, `org_id='vex'`,
  `VEX_API_URL`, the `vex_engine` backend, and published SDK package names are
  invisible plumbing. Renaming them would break every live integration
  (MoonForge, the CLI, existing keys) for zero user-visible benefit. They stay.

## Non-goals

- No change to `apps/landing` or the tryvex.dev marketing domain.
- No visual re-theme (colors/typography unchanged — that would be a redesign).
- No backend, MCP, capture, or SDK changes (`mcp.klio.tech` is already Klio).
- No GitHub org/repo rename, no asset-filename purge outside the two references
  we repoint.
- No redirect from the old dashboard domain (see Domain section).

---

## Architecture / approach

The dashboard's brand is **almost entirely env-driven**: `app.config.ts` parses
`NEXT_PUBLIC_PRODUCT_NAME`, `NEXT_PUBLIC_SITE_TITLE`,
`NEXT_PUBLIC_SITE_DESCRIPTION`, `NEXT_PUBLIC_SITE_URL` and the rest of the UI
reads from `appConfig`. So most of the rebrand is configuration, plus a handful
of hardcoded surfaces (the logo component, two locale files, the favicon assets).

The Klio mark already exists and is purpose-built for this: `docs/klio-mark.svg`
and `trust-app/src/components/landing/KlioMark.tsx` in the `klio` repo — pure
geometry, `currentColor` (auto-adapts to light/dark, no dual-asset hack),
legible from 16px favicon to display size. We reuse it.

---

## Brand-surface map (the complete footprint, all inside `apps/web`)

| # | Surface | File(s) | Change |
|---|---------|---------|--------|
| 1 | Brand env vars | Vercel prod env + `apps/web/.env` | `NEXT_PUBLIC_PRODUCT_NAME`, `NEXT_PUBLIC_SITE_TITLE`, `NEXT_PUBLIC_SITE_DESCRIPTION` → Klio values; `NEXT_PUBLIC_SITE_URL` → `https://app.klio.tech` (prod) |
| 2 | New shared component | `apps/web/components/klio-mark.tsx` | Inline `currentColor` Klio mark — single source for all icon usages |
| 3 | App logo | `apps/web/components/app-logo.tsx` | Use `<KlioMark>` + text "Klio"; **remove** the two light/dark `<Image>` tags |
| 4 | Auth (login/signup) logo | `apps/web/app/auth/layout.tsx` | Stacked Klio lockup (mark + "Klio"); drop dual `<Image>` |
| 5 | Onboarding welcome icon | `apps/web/app/onboarding/_components/step-welcome.tsx` | `<KlioMark>`; drop dual `<Image>` (keep animation) |
| 6 | Create-workspace icon | `apps/web/app/home/addworkspace/_components/create-workspace-form.tsx` | `<KlioMark>`; drop dual `<Image>` |
| 7 | Metadata icon | `apps/web/lib/root-metadata.ts` (icon url, ~line 37) | Repoint to `/images/klio-mark.svg` |
| 8 | Favicon set + manifest | `apps/web/public/images/favicon/*` (16/32, android-chrome 192/512, apple-touch, mstile, `.ico`, safari-pinned-tab) + `site.webmanifest` | Regenerate from the Klio mark via `sharp`; manifest `name`/`short_name` → "Klio" |
| 9 | In-app copy | `apps/web/public/locales/en/agentguard.json` (7 strings), `apps/web/public/locales/en/auth.json` (1 string) | Prose "Vex" → "Klio". **Keep literal `X-Vex-Key`** in any integration snippet |
| 10 | New static asset | `apps/web/public/images/klio-mark.svg` | Canonical Klio mark (metadata + favicon source) |
| 11 | Delete | 8 × `apps/web/public/images/vex-{icon,stacked}-*.svg` | Remove orphaned Vex assets after all refs repointed |

**Footprint correction (discovered during planning):** the Vex logo is rendered
on **five screens**, not one — the nav logo (#3), the auth/login page (#4),
onboarding welcome (#5), create-workspace (#6), and the metadata favicon (#7) —
and the favicon set is a full set, not a single icon (#8). All are repointed to
the one shared `KlioMark` component / `klio-mark.svg`. `app.config.ts` itself
needs no code change (only the env values it reads). The decorative chevron-"V"
background in `auth/layout.tsx` is abstract geometry (not a "Vex" string) and is
left as-is — a redesign of it would be out of this Approach-A rename scope.

---

## Component design

### Logo (`app-logo.tsx`)

Replace the current implementation (an `<Image>` for the black mark, a second
`<Image>` for the white mark toggled by `dark:`, and `<span>Vex</span>`) with a
single inline SVG using the Klio mark geometry and `fill="currentColor"`, plus
`<span>Klio</span>`. Because the mark inherits text ink, the light/dark dual-image
branching is deleted — the component gets simpler, not more complex.

The mark geometry (viewBox `0 0 24 24`): three horizontal bars —
`rect x=3 y=6 w=18 h=2`, `rect x=8 y=11 w=13 h=2`, `rect x=3 y=16 w=18 h=2` —
each `fill="currentColor"`.

### Favicon

Generate from the mark using `sharp` (already a monorepo dependency):
`favicon.ico`, `favicon-16x16.png`, `favicon-32x32.png`, `apple-touch-icon.png`,
and an `icon.svg`. The mark renders near-black on transparent. Update the icon
reference in `apps/web/lib/root-metadata.ts` to the new asset.

### Copy & positioning

- **Product name:** `Klio`
- **Title:** `Klio — Memory & Reliability for AI Agents`
- **Description:** `Klio is the memory and reliability layer for AI agents.
  Persistent cross-session memory plus runtime verification — so your agents
  remember what matters and you catch bad output before it ships.`
- **Locale prose:** replace "Vex" with "Klio" throughout `agentguard.json` and
  `auth.json` (e.g. "Welcome to Klio", "authenticate your agents with Klio",
  "Run your agent. Klio will detect it automatically"). The header **token**
  `X-Vex-Key` is wire protocol and stays verbatim wherever it appears in a
  code/integration string.

### Orphaned-asset cleanup (decided: delete)

After repointing the logo and metadata references, the old Vex assets
(`vex-icon-*.svg`, `vex-stacked-*.svg`, the Vex favicons) are unreferenced. We
**delete them in the same PR** — every reference is under our control, so this is
low-risk and keeps the repo honest.

---

## Domain + auth cutover (keep both live, no redirect)

- **Vercel** (project `dashboard-web`, team Oppla): add custom domain
  `app.klio.tech` (DNS CNAME per Vercel's instructions). Keep `app.tryvex.dev`
  attached and serving.
- **Canonical URL:** set `NEXT_PUBLIC_SITE_URL=https://app.klio.tech` in Vercel
  production env. This drives `metadataBase`, OG/canonical, sitemap, and the
  auth callback base. `app.tryvex.dev` continues to serve the same build; its
  canonical/OG tags will point at klio.
- **Supabase auth:** add `https://app.klio.tech/**` and the `/auth/callback`
  URL to the redirect allow-list and set `app.klio.tech` as the Site URL.
  **Keep** the existing `app.tryvex.dev` redirect entries so logins initiated on
  the old domain still complete.
- **Known, accepted nuance:** with canonical = klio, an auth flow *started* on
  `app.tryvex.dev` may land the user on `app.klio.tech` after login. This is
  acceptable under the "keep both live" decision and is documented behavior, not
  a bug. (A future hard cutover would remove tryvex entirely.)

---

## Error handling / risk

- **Build-time env validation:** `app.config.ts` fails the build if
  `NEXT_PUBLIC_SITE_URL` is `http:` in production. The new value is `https://`,
  so this guard is satisfied. Local `.env` keeps `http://localhost:3000`.
- **Favicon generation:** if `sharp` rasterization is unavailable in the build
  environment, fall back to shipping `icon.svg` (Next.js serves it as the
  favicon) so the task never blocks on binary asset generation.
- **Auth lockout risk:** the only way this breaks login is a missing Supabase
  redirect entry. Mitigation: add klio **without removing** tryvex, and verify a
  full login round-trip on both domains before considering the cutover done.
- **Reversibility:** every change is an env value, a small component edit, asset
  swaps, and a Vercel/Supabase config addition. Fully reversible.

---

## Testing & verification

1. **Static:** `pnpm --filter web typecheck && pnpm --filter web build` stays green.
2. **Landing untouched:** `pnpm --filter landing build` still green; no `apps/landing` diff.
3. **Manual / visual:**
   - Klio mark + "Klio" render in both light and dark themes.
   - Favicon appears in the browser tab.
   - Page `<title>` and OG tags read "Klio …".
   - Onboarding / API-key copy reads "Klio" while the integration snippet still
     shows `X-Vex-Key`.
4. **Domain + auth:**
   - `https://app.klio.tech` loads the dashboard.
   - Login round-trips successfully from **both** `app.klio.tech` and
     `app.tryvex.dev`.
   - `app.tryvex.dev` still serves the build (no redirect).

---

## Out of scope (stays "Vex" — explicit)

`apps/landing` and tryvex.dev marketing · wire protocol (`X-Vex-Key`,
`X-Vex-Agent`, `org_id='vex'`, `VEX_API_URL`) · `vex_engine` backend, MCP &
capture (already on klio.tech) · published SDK package names (`@vex_dev/sdk`,
`vex-sdk`) · GitHub org/repo names (`Vex-AI-Dev`, `Vex-Dashboard`) · asset
filenames outside the two references we repoint.
