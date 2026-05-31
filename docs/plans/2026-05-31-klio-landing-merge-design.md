# Klio Landing Merge — Design (Phase 1: Foundation + Home + Cutover)

**Date:** 2026-05-31
**Status:** Approved direction; Phase-1 design for review → plan.
**Repo:** `vex_public/Dashboard` (`apps/landing`). Branch `feat/klio-landing-merge`.
**Positioning source of truth:** `.agents/product-marketing.md`.

## Goal (overall)

Re-skin and rebrand the content-rich Vex marketing landing (`apps/landing`, ~35
routes + ~1,200 pSEO pages + interactive demoware) into the **Klio** landing for
**klio.tech**, repositioned as **memory → reliability** (lead with cross-agent
shared memory; reliability is the result). Keep the SEO/content moat; adopt
Klio's premium cream/mono editorial aesthetic + the HUMAN/MACHINE dual-mode. The
lean `trust-app` landing is retired in favor of this; `trust-app` stays the OSS
local dashboard.

## Decided direction (why)

- **Lead with memory, sell reliability as the result** — one causal story, not
  two pillars. (See `.agents/product-marketing.md`.) Differentiates against
  Supermemory/mem0/Zep (cloud, closed, single-agent) on local-first + encrypted +
  open-core + dev-first + reliability.
- **Re-skin in place** beats porting 1,200 files into trust-app — the content,
  renderers, and demoware already work in `apps/landing`.

## Phasing (decomposition)

| Phase | Scope | Outcome |
|---|---|---|
| **1 (this spec)** | Design-system re-skin + global chrome rebrand + **home** redesign (memory→reliability + dual-mode) + **klio.tech cutover** | klio.tech is on-brand + repositioned; whole site inherits the Klio look |
| 2 | pSEO copy/URL rebrand sweep (Vex→Klio) across the ~1,200 guides/checklists/comparisons; reframe as the "Agent Reliability" hub | Content moat rebranded, SEO preserved |
| 3 | Interactive demoware (code editor, /demo, /live, agent-health-score, comparison tables) re-skinned + re-told around memory | Demos on-brand |

Each phase = its own plan. This spec covers **Phase 1**.

---

## Phase 1 design

### 1. Design-system re-skin (the leverage point)
Swap the global tokens so the *entire* app (home + 1,200 pages + components)
re-skins at once. In `apps/landing/styles/globals.css` (+ `lib/fonts.ts`):
- **Color:** replace the Vex dark palette (`--background:#0a0a0a`, emerald accent,
  `--border:#252525`, white-on-black) with Klio's warm editorial palette
  (`--background` cream `#fbfaf6`, `--foreground` warm-dark `#1f1d1a`,
  `--muted` `#6f6b62`, hairline borders `#e8e6e0`, **no chromatic accent** — accent
  aliases to ink). Light, not dark.
- **Type:** replace Inter + JetBrains Mono with **IBM Plex Mono** as the single
  family (display/body/code/labels by weight+size), matching the Klio look.
- **Signature:** add the letterpress dot-grid + hairline-border rhythm.
- **Reconcile hard-coded styles:** components that hard-code `#0a0a0a`/`#252525`/
  `emerald-500` (not the CSS vars) must be migrated to the tokens. The plan will
  enumerate these; most chrome uses vars and re-skins for free.

### 2. Global chrome + brand rebrand
- **Logo/wordmark:** the Vex mark → the **Klio mark** (`KlioMark`, currentColor) +
  "Klio" wordmark, in the nav header + footer.
- **Metadata:** site title/description → the memory-led one-liner ("Klio — the
  memory layer that keeps AI agents reliable"); OG/twitter; favicons from the Klio
  mark.
- **Copy/links sweep (chrome only in Phase 1):** header/footer/nav copy and links
  (tryvex.dev → klio.tech, GitHub → klio-tech/klio, social). Deep page copy =
  Phase 2.
- **Keep verbatim (wire protocol / plumbing):** `X-Vex-Key`/`X-Vex-Agent`,
  `org_id='vex'`, backend, published SDK package names — invisible, unchanged.

### 3. Home redesign (memory → reliability) + dual-mode
Rebuild `apps/landing/app/page.tsx` (and its `_components/`) into the merged home,
re-skinned to Klio and re-told around memory→reliability. Section order:
1. **Hero** — memory wedge: *"Your agents forget. Klio remembers."* lede on
   cross-agent shared memory; right side a real `recall()` specimen (port the
   trust-app hero idea); CTA = `npx @klio-tech/klio init` + Cloud waitlist.
2. **Problem** — reuse Vex's strong framing, re-told as forgetting→drift: "passes
   evals, ships, then quietly drifts" → because it has no memory.
3. **How it works** — memory loop (capture → recall across sessions/agents) and
   the reliability payoff.
4. **The 7 MCP tools / specimen** — bring Klio's specimen-driven BuiltFor.
5. **Reliability** — the bridge section: memory → fewer drift/hallucination/
   repeat errors; link into the (Phase-2) Agent Reliability hub.
6. **Compare** — re-skinned comparison (vs mem0/Zep/Supermemory on the true axes:
   cross-agent, local-first, encrypted, open-source, MCP-native).
7. **Pricing** — free self-host / Klio Cloud (reuse Vex's pricing structure,
   re-skinned).
8. **FAQ** — Klio's honest FAQ merged with Vex's depth.
9. **CTA + Footer.**
- **Dual-mode:** port the **HUMAN/MACHINE `ViewToggle`** + a `MachineView` for the
  home (server-resolved from `?view=`/User-Agent) — Klio's signature. Scope: the
  home (other pages stay single-mode in Phase 1).

### 4. klio.tech cutover
- Point **klio.tech** at this app's deploy (the landing currently deploys where
  the Vex landing does — confirm the service/Vercel project in the plan). Retire
  the `trust-app` public `(public)` landing as klio.tech's source (redirect or
  leave trust-app local-only); the Railway `klio` service either swaps to this app
  or klio.tech repoints. **This is the one step needing a deploy decision** — the
  plan will lay out the exact target + a no-downtime cutover, gated on user OK.
- `trust-app` keeps serving the OSS **local** dashboard (unchanged).

### 5. Out of scope (Phase 1)
- Deep pSEO page copy rebrand (Phase 2) — pages inherit the new tokens but keep
  Vex copy until swept.
- Demoware re-skin/re-tell (Phase 3).
- Backend, wire protocol, SDK names, trust-app local dashboard.

## Testing / verification (Phase 1)
- `pnpm --filter landing build` green; typecheck green.
- Visual: home renders in Klio cream/mono; logo = Klio mark; HUMAN view = the
  memory→reliability marketing page; `?view=machine` / bot UA = MachineView;
  toggle flips. Spot-check a few pSEO pages inherited the new look (no dark
  remnants from hard-coded classes).
- No residual Vex *brand* in chrome/home (X-Vex-Key etc. excepted).
- Post-cutover: klio.tech serves the new home; no downtime.

## Risks
- **Hard-coded dark/emerald classes** in components won't re-skin via tokens alone
  — the plan enumerates + migrates them (bounded sweep).
- **Cutover** changes the public apex — gated on explicit user approval, reversible
  (repoint back to trust-app).
