# Klio Landing Merge — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. The **home rebuild (Task 7)** should be executed with the **frontend-design** skill for visual craft. Steps use checkbox (`- [ ]`).

**Goal:** Re-skin `apps/landing` from Vex's dark/Inter look to Klio's cream/mono editorial system, rebrand the chrome, rebuild the home around memory→reliability with the HUMAN/MACHINE dual-mode, and cut klio.tech over — preserving the ~1,200 pSEO pages (they inherit the new tokens).

**Architecture:** Retokenize the global design system (one change re-skins the whole app), sweep the hard-coded dark/emerald classes the tokens can't reach, rebrand global chrome, port Klio's dual-mode trio, rebuild the home, then repoint klio.tech.

**Tech Stack:** Next.js (App Router) + Tailwind v4 (`@theme`), pnpm, next/font. Klio aesthetic from `/Users/thakurg/Me/klio/trust-app`.

**Repo / branch:** `/Users/thakurg/Hive/Research/AgentGuard/vex_public/Dashboard`, app `apps/landing`, branch `feat/klio-landing-merge`. **Local commits only — NO push.** Positioning: `.agents/product-marketing.md`.

---

## File map (Phase 1)
- Modify: `apps/landing/styles/globals.css` (tokens, `@theme`, `.k-*` utilities, dot-grid)
- Modify: `apps/landing/lib/fonts.ts` (IBM Plex Mono; drop `'dark'`)
- Modify: `apps/landing/app/layout.tsx` (metadata → Klio)
- Modify: `apps/landing/components/app-logo.tsx` (KlioMark + "Klio")
- Modify: `apps/landing/app/_components/site-header.tsx`, `site-footer.tsx`, `nav/*` (links, CTA color)
- Create: `apps/landing/lib/view-mode.ts`, `apps/landing/app/_components/view-toggle.tsx`, `apps/landing/components/klio-mark.tsx`, `apps/landing/app/_components/machine-view.tsx`
- Modify: `apps/landing/app/page.tsx` + home `_components/*` (re-skin + re-tell; dual-mode)
- Sweep: components with hard-coded dark/emerald classes (Task 4)

---

## Task 1: Retokenize the design system (cream/mono)

**Files:** Modify `apps/landing/styles/globals.css`

- [ ] **Step 1:** Replace the `:root` token values (keep variable NAMES so `@theme` + components keep resolving) with Klio's palette:
```css
:root {
  --font-sans: var(--font-mono), "SF Mono", Menlo, Consolas, monospace;
  --font-heading: var(--font-mono), "SF Mono", Menlo, Consolas, monospace;

  --background: #fbfaf6;            /* klio cream */
  --foreground: #1f1d1a;            /* warm soft-dark ink */
  --card: #f3f0e7;                  /* paper */
  --card-foreground: #1f1d1a;
  --popover: #f3f0e7;
  --popover-foreground: #1f1d1a;
  --primary: #1f1d1a;
  --primary-foreground: #fbfaf6;
  --secondary: #f3f0e7;
  --secondary-foreground: #6f6b62;
  --muted: #f3f0e7;
  --muted-foreground: #6f6b62;      /* klio muted */
  --accent: #f3f0e7;
  --accent-foreground: #1f1d1a;
  --destructive: #b4453a;           /* muted brick, not bright red */
  --destructive-foreground: #fbfaf6;
  --border: #e8e6e0;                /* hairline */
  --input: #e8e6e0;
  --ring: #1f1d1a;
  --radius: 0.375rem;

  /* Klio extras used by ported components */
  --klio-faint: #a8a395;
  --klio-border-strong: #c8c5bc;
  --klio-dot: #d2cec4;
}
```
Leave the existing Tailwind `@theme { --color-*: var(--*) }` mapping AS-IS — it now points at Klio values.

- [ ] **Step 2:** Append the Klio `.k-*` utilities + dot-grid to `globals.css` — paste **verbatim** the `.k-eyebrow/.k-display/.k-h2/.k-h3/.k-lede`, `.k-mono/.k-btn(/--primary/--ghost)/.k-link/.k-divider`, `@keyframes k-rise` + `.k-rise[data-stagger]`, `.k-toggle*`, `.k-container`, `.k-section`, and the `.landing` + `.landing::before` dot-grid blocks from `/Users/thakurg/Me/klio/trust-app/src/app/globals.css` (the Explore output captured them).

- [ ] **Step 3:** `pnpm --filter landing build` → expect PASS (build won't visually validate, but must compile). Commit.
```bash
git add apps/landing/styles/globals.css && git commit -m "feat(landing): Klio cream/mono design tokens + .k-* utilities"
```

## Task 2: Fonts → IBM Plex Mono

**Files:** Modify `apps/landing/lib/fonts.ts`

- [ ] **Step 1:** Replace contents:
```typescript
import { IBM_Plex_Mono } from 'next/font/google';
import { cn } from '@kit/ui/utils';

const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-mono',
  display: 'swap',
  preload: true,
});

export function getFontsClassName() {
  return cn(mono.variable); // NOTE: 'dark' removed — Klio is a light theme
}
```
- [ ] **Step 2:** Build + commit (`feat(landing): single IBM Plex Mono family; drop dark class`).

## Task 3: Klio mark + KlioMark component

**Files:** Create `apps/landing/components/klio-mark.tsx`; Modify `apps/landing/components/app-logo.tsx`

- [ ] **Step 1:** Create `klio-mark.tsx` — paste the `KlioMark` component verbatim from `/Users/thakurg/Me/klio/trust-app/src/components/landing/KlioMark.tsx` (currentColor 3-bar SVG).
- [ ] **Step 2:** Rewrite `app-logo.tsx` to render `<KlioMark size={28} />` + `<span>Klio</span>` (drop the `vex-icon-*.svg` `<Image>` + "Vex" text). Keep the `href`/`Link` wrapper.
- [ ] **Step 3:** Regenerate favicons from the mark (reuse the approach from the dashboard rebrand: a `klio-mark.svg` + `sharp` script, or copy the dashboard's generated favicon set). Update `app/layout.tsx` `icons`.
- [ ] **Step 4:** Build + commit.

## Task 4: Sweep hard-coded dark/emerald classes (the re-skin reconciliation)

**Files:** components flagged below. This is the bulk of the visual re-skin (~228 emerald + ~400 hex/white occurrences).

- [ ] **Step 1:** Enumerate:
```bash
cd apps/landing && grep -rnoE "emerald-[0-9/]+|#0a0a0a|#161616|#252525|#a2a2a2|#585858|text-white|bg-black" app components | grep -v node_modules | sed -E 's/:[0-9]+:/: /' | sort | uniq -c | sort -rn > /tmp/skin_sweep.txt && head -40 /tmp/skin_sweep.txt
```
- [ ] **Step 2:** Apply this mapping (token-first; replace hard-coded hex/emerald with the Klio token classes):

| Vex (hard-coded) | Klio replacement |
|---|---|
| `bg-[#0a0a0a]` | `bg-background` |
| `bg-[#161616]` | `bg-card` |
| `bg-[#252525]` / `border-[#252525]` | `border-border` / `bg-card` |
| `text-white` | `text-foreground` |
| `text-[#a2a2a2]` | `text-muted-foreground` |
| `text-[#585858]` | `text-[color:var(--klio-faint)]` |
| `text-emerald-*` / `bg-emerald-*` / `border-emerald-*` | `text-foreground` / `bg-foreground text-background` (for CTAs) / `border-border` — **no chromatic accent** |
| `emerald-500/10` tint backgrounds | `bg-card` or remove |

Work top-offender files first (from `/tmp/skin_sweep.txt`): `app/page.tsx` (rebuilt in Task 7 — skip here), `comparison-table.tsx`, `hero-code-editor.tsx`, `pricing/page.tsx`, the `compare/*` pages, `site-header.tsx`/`site-footer.tsx` CTA buttons.
- [ ] **Step 3:** After each batch of files: `pnpm --filter landing build`; commit per logical group (e.g. `chore(landing): reskin comparison-table to Klio tokens`).
- [ ] **Step 4:** Final grep — `grep -rnE "emerald-|#0a0a0a|#161616|#252525|text-white" app components | grep -v node_modules` → expect only intentional leftovers (none in chrome/home). Commit.

## Task 5: Global chrome rebrand (header / footer / metadata / links)

**Files:** Modify `app/layout.tsx`, `app/_components/site-header.tsx`, `site-footer.tsx`, `nav/*`

- [ ] **Step 1:** `layout.tsx` metadata → Klio (memory-led):
```typescript
export const metadata: Metadata = {
  metadataBase: new URL('https://klio.tech'),
  title: 'Klio — the memory layer that keeps AI agents reliable',
  description:
    'Klio gives your AI agents shared, persistent memory — what one learns, the others know — so they stop forgetting, drifting, and contradicting themselves. Local-first, encrypted, open source.',
  alternates: { canonical: 'https://klio.tech' },
  openGraph: {
    title: 'Klio — memory for AI agents',
    description: 'Shared, persistent memory for AI agents. Local-first, encrypted, open source.',
    url: 'https://klio.tech', siteName: 'Klio', type: 'website',
    images: [{ url: '/images/og-image.png', width: 1200, height: 630 }],
  },
  twitter: { card: 'summary_large_image', site: '@klio_tech',
    title: 'Klio — memory for AI agents',
    description: 'Shared, persistent memory for AI agents.' },
  icons: { icon: '/favicon.ico' },
};
```
(Replace the keyword list with memory/agent terms; regenerate `/images/og-image.png` to Klio — or leave the file and reskin later, flag in commit.)
- [ ] **Step 2:** `site-header.tsx` + `site-footer.tsx`: rebrand link targets — `tryvex.dev`→`klio.tech`, `docs.tryvex.dev`→`docs.klio.tech` (or `/docs`), `app.tryvex.dev`→`app.klio.tech`, `github.com/Vex-AI-Dev/Vex`→`github.com/klio-tech/klio`, `x.com/tryvex`→the Klio handle, `info@tryvex.dev`→`contact@klio.tech`. CTA button: emerald → `.k-btn--primary` (ink-on-cream). Footer tagline → "Memory for AI agents."
- [ ] **Step 3:** **KEEP verbatim** anywhere they appear (do not rebrand): `X-Vex-Key`, `X-Vex-Agent`, `org_id='vex'`, `@vex_dev/sdk`/`vex-sdk` package names, `api.vex...` wire endpoints. (Phase 1 chrome shouldn't touch these; flagged so the sweep doesn't.)
- [ ] **Step 4:** Build + commit.

## Task 6: Port the dual-mode infrastructure

**Files:** Create `apps/landing/lib/view-mode.ts`, `apps/landing/app/_components/view-toggle.tsx`

- [ ] **Step 1:** Create `lib/view-mode.ts` — paste **verbatim** the full source from `/Users/thakurg/Me/klio/trust-app/src/lib/view-mode.ts` (the `ViewMode` type, `BOT_UA_PATTERN`, `isBotUserAgent`, `detectViewMode`).
- [ ] **Step 2:** Create `app/_components/view-toggle.tsx` — paste **verbatim** the `ViewToggle` client component from trust-app (`"use client"`, `useRouter`/`useSearchParams`/`useTransition`, the `.k-toggle` markup). Fix the import path to `~/lib/view-mode` (or relative) per apps/landing's alias.
- [ ] **Step 3:** Build + commit (`feat(landing): port HUMAN/MACHINE view-mode + ViewToggle`).

## Task 7: Rebuild the home (memory → reliability) + dual-mode  — **use frontend-design**

**Files:** Modify `apps/landing/app/page.tsx`; Create `app/_components/machine-view.tsx`; modify/rebuild home `_components/*`.

This is the creative task — execute with the **frontend-design** skill, holding the Klio aesthetic (cream/mono, dot-grid, hairlines, `.k-*` classes) and the `.agents/product-marketing.md` positioning.

- [ ] **Step 1:** Convert `page.tsx` to a server component that resolves the mode and renders dual-mode:
```tsx
import { headers } from 'next/headers';
import { detectViewMode } from '~/lib/view-mode';
import { ViewToggle } from './_components/view-toggle';
import { MachineView } from './_components/machine-view';
// ...HumanView sections imported below

export const dynamic = 'force-dynamic';

export default async function HomePage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view } = await searchParams;
  const ua = (await headers()).get('user-agent');
  const mode = detectViewMode(view, ua);
  return (
    <div className="landing">
      {mode === 'machine' ? <MachineView /> : <HumanHome />}
      <ViewToggle initialMode={mode} />
    </div>
  );
}
```
- [ ] **Step 2:** Build `HumanHome` — the re-skinned, re-told sections in this order (reuse existing `_components` where possible, re-skinned to `.k-*`; author copy from the PMM doc):
  1. **Hero** — *"Your agents forget. Klio remembers."* lede on cross-agent shared memory; right column a real `recall()` specimen (port the trust-app Hero idea); CTA `npx @klio-tech/klio init` (copy snippet) + "Klio Cloud" waitlist.
  2. **Problem** — reuse Vex's "passes evals, ships, then drifts" framing, re-told: drift because the agent has **no memory**.
  3. **How it works** — capture → recall across sessions/agents → reliability payoff.
  4. **The 7 MCP tools** — recall/remember/observe/plan/decide/note/space as call→response specimens.
  5. **Reliability bridge** — memory → fewer drift/hallucination/repeat errors; link to the (Phase-2) reliability hub.
  6. **Compare** — re-skinned vs mem0/Zep/Supermemory on true axes (cross-agent, local-first, encrypted, open-source, MCP-native).
  7. **Pricing** — reuse Vex's structure, re-skinned: free self-host / Klio Cloud.
  8. **FAQ** — Klio's honest FAQ ∪ Vex's depth.
  9. **CTA + Footer.**
- [ ] **Step 3:** Build `app/_components/machine-view.tsx` — a single `<article className="k-machine">` of structured facts (identity key-values, what-it-is, how-it-works bullets, the 7 tools as a `<table>`, compare matrix, links) mirroring trust-app's `MachineView` shape, content from the PMM doc. Add the `.k-machine*` CSS to globals.css (from trust-app).
- [ ] **Step 4:** `pnpm --filter landing typecheck && pnpm --filter landing build` → green. Manual: home renders cream/mono; `?view=machine` + a bot UA → MachineView; toggle flips. Commit.

## Task 8: Cutover to klio.tech — **OPERATIONAL, gated on user approval (do NOT push/deploy without it)**

- [ ] **Step 1:** Determine the target: confirm where `apps/landing` deploys (Vercel project? a Railway service?) and how `klio.tech` currently routes (it serves the `klio`/trust-app Railway service today). Decide: (a) point `klio.tech` at the `apps/landing` deploy, or (b) host apps/landing as the `klio` service. Document the exact DNS/domain change.
- [ ] **Step 2:** Present the cutover (target + DNS + reversibility) to the user; get explicit approval. Keep trust-app reachable as a rollback.
- [ ] **Step 3:** On approval: merge the branch (PR), deploy `apps/landing`, repoint `klio.tech`, and keep `trust-app` as the OSS local dashboard. Verify klio.tech serves the new home (human + `?view=machine`); no downtime.

## Task 9: Final verification
- [ ] `pnpm --filter landing build` + `typecheck` green.
- [ ] Residual-Vex sweep on chrome + home: `grep -rnE "\bVex\b|tryvex" apps/landing/app/page.tsx apps/landing/app/layout.tsx apps/landing/app/_components/site-* apps/landing/components/app-logo.tsx | grep -v "X-Vex"` → none.
- [ ] Spot-check 2–3 pSEO pages (e.g. a guide, a checklist) render in the Klio cream/mono look (tokens inherited) — confirming the Phase-2 sweep is copy-only, not re-skin.

---

## Self-Review
**Spec coverage:** design-system re-skin → T1–T2; hard-coded reconcile → T4; chrome rebrand → T3,T5; home + dual-mode → T6,T7; cutover (gated) → T8; verification → T9. All Phase-1 spec items covered. pSEO copy + demoware correctly excluded (Phase 2/3).
**Placeholders:** token values, font config, view-mode/ViewToggle/KlioMark (verbatim from trust-app), metadata, and the sweep mapping table are concrete. The home *copy* is directional by design — Task 7 is a frontend-design execution task (creative), with sections + sources specified.
**Consistency:** `--font-mono` variable name matches between fonts.ts and the token stack; `detectViewMode(searchParam, userAgent)` signature matches the page call; `.k-*`/`.landing` classes used in Task 7 are added in Task 1/T7-S3.
