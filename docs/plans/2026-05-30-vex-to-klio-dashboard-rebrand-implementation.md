# Vex → Klio Dashboard Rebrand — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebrand the cloud dashboard (`apps/web`) from "Vex" to "Klio" and serve it at `app.klio.tech` (keeping `app.tryvex.dev` live), with Klio positioned as memory + reliability.

**Architecture:** The dashboard brand is env-driven (`app.config.ts` reads `NEXT_PUBLIC_*`), plus a handful of hardcoded surfaces: the Vex logo (rendered on 5 screens via dual light/dark `<Image>` tags), the favicon set + web manifest, and 8 prose strings in two locale files. We introduce one shared `KlioMark` component (`currentColor`, ported from the klio repo's purpose-built mark) and repoint all five usages to it, regenerate the favicon set from a single `klio-mark.svg` via `sharp`, flip the env brand vars, rewrite the prose, then delete the orphaned `vex-*.svg` assets. Wire-protocol identifiers (`X-Vex-Key` etc.), `apps/landing`, the backend, and SDK package names are untouched.

**Tech Stack:** Next.js (App Router) + Makerkit monorepo, pnpm, TypeScript, `sharp@0.34.5` (favicon raster), `png-to-ico` (devDep, `.ico` assembly), Vercel (hosting), Supabase (auth).

**Repo / branch:** `/Users/thakurg/Hive/Research/AgentGuard/vex_public/Dashboard`, branch `feat/klio-dashboard-rebrand` (local commits only — no push until the user approves).

**Reference spec:** `docs/plans/2026-05-30-vex-to-klio-dashboard-rebrand-design.md`

---

## File Structure

**Create:**
- `apps/web/components/klio-mark.tsx` — shared inline `currentColor` Klio mark (single source for all icon usages).
- `apps/web/public/images/klio-mark.svg` — canonical static mark (for `<link icon>` metadata + favicon raster source).
- `apps/web/scripts/generate-favicons.mjs` — reproducible favicon generator (sharp + png-to-ico).

**Modify (code):**
- `apps/web/components/app-logo.tsx` — KlioMark + "Klio"; drop dual `<Image>`.
- `apps/web/app/auth/layout.tsx` — stacked Klio lockup; drop dual `<Image>`.
- `apps/web/app/onboarding/_components/step-welcome.tsx` — KlioMark; drop dual `<Image>`.
- `apps/web/app/home/addworkspace/_components/create-workspace-form.tsx` — KlioMark; drop dual `<Image>`.
- `apps/web/lib/root-metadata.ts` — icon → `/images/klio-mark.svg`.
- `apps/web/.env` — brand vars (PRODUCT_NAME / SITE_TITLE / SITE_DESCRIPTION).
- `apps/web/public/locales/en/agentguard.json` — 7 prose strings.
- `apps/web/public/locales/en/auth.json` — 1 prose string.
- `apps/web/public/images/favicon/site.webmanifest` — name/short_name.
- `apps/web/package.json` — add `png-to-ico` + `sharp` devDeps.

**Regenerate (binary assets, via script):**
- `apps/web/public/images/favicon/{favicon-16x16,favicon-32x32,android-chrome-192x192,android-chrome-512x512,apple-touch-icon,mstile-150x150}.png`, `favicon.ico`, `safari-pinned-tab.svg`.

**Delete (orphaned after repoint):**
- `apps/web/public/images/vex-icon-{black-transparent,white-transparent,dark,light}.svg`
- `apps/web/public/images/vex-stacked-{black-transparent,white-transparent,dark,light}.svg`

**Operational (no code — run with CLIs/tokens, tracked as tasks 13–15):**
- Vercel: add `app.klio.tech` domain + production brand env vars.
- Supabase: add `app.klio.tech` redirect URLs + Site URL (keep tryvex).
- Live verification on both domains.

---

## Phase 1 — Klio mark (asset + shared component)

### Task 1: Add the canonical static Klio mark SVG

**Files:**
- Create: `apps/web/public/images/klio-mark.svg`

- [ ] **Step 1: Create the static mark**

The Klio mark is three stacked horizontal bars (middle indented). Near-black fill so it reads on light surfaces (browser tab, OG). This is the static asset for metadata + favicon raster source.

```svg
<?xml version="1.0" encoding="UTF-8"?>
<!--
  The Klio mark — three stacked horizontal bars with the middle bar
  indented from the left. Canonical static asset for the dashboard's
  favicon/metadata. The currentColor component lives in
  apps/web/components/klio-mark.tsx — keep the geometry in sync.
-->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="48" height="48" role="img" aria-label="Klio">
  <title>Klio</title>
  <rect x="3" y="6"  width="18" height="2" fill="#1f1d1a"/>
  <rect x="8" y="11" width="13" height="2" fill="#1f1d1a"/>
  <rect x="3" y="16" width="18" height="2" fill="#1f1d1a"/>
</svg>
```

- [ ] **Step 2: Verify it exists and is valid**

Run: `head -1 apps/web/public/images/klio-mark.svg && grep -c '<rect' apps/web/public/images/klio-mark.svg`
Expected: prints the XML declaration and `3`.

- [ ] **Step 3: Commit**

```bash
git add apps/web/public/images/klio-mark.svg
git commit -m "feat(web): add canonical Klio mark SVG asset"
```

---

### Task 2: Create the shared `KlioMark` React component

**Files:**
- Create: `apps/web/components/klio-mark.tsx`

- [ ] **Step 1: Write the component**

Inline SVG using `currentColor` so it inherits the parent's text ink (works in light + dark with no dual-asset toggle). Accepts `size` and `className`. Geometry identical to Task 1.

```tsx
import { cn } from '@kit/ui/utils';

/**
 * The Klio mark — three stacked horizontal bars with the middle bar
 * indented from the left. Geometry only, no letterforms. Renders with
 * `currentColor` so it inherits whatever ink the parent sets — one asset
 * for light and dark surfaces. Legible from 16px (favicon) to display size.
 *
 * Keep the geometry in sync with apps/web/public/images/klio-mark.svg.
 */
export function KlioMark({
  size = 28,
  title = 'Klio',
  className,
}: {
  size?: number;
  title?: string;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role="img"
      aria-label={title}
      className={cn('block shrink-0', className)}
    >
      <title>{title}</title>
      <rect x="3" y="6" width="18" height="2" fill="currentColor" />
      <rect x="8" y="11" width="13" height="2" fill="currentColor" />
      <rect x="3" y="16" width="18" height="2" fill="currentColor" />
    </svg>
  );
}
```

- [ ] **Step 2: Typecheck the new module**

Run: `pnpm --filter web exec tsc --noEmit -p tsconfig.json`
Expected: PASS (no errors). *(If the app uses a different typecheck script, use `pnpm --filter web typecheck`.)*

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/klio-mark.tsx
git commit -m "feat(web): add shared currentColor KlioMark component"
```

---

## Phase 2 — Repoint all logo usages to KlioMark

### Task 3: Rebrand the app logo (`app-logo.tsx`)

**Files:**
- Modify: `apps/web/components/app-logo.tsx`

- [ ] **Step 1: Replace the dual-image + "Vex" with KlioMark + "Klio"**

Replace the entire file with:

```tsx
import Link from 'next/link';

import { cn } from '@kit/ui/utils';

import { KlioMark } from './klio-mark';

export function AppLogo({
  href,
  label,
  className,
}: {
  href?: string | null;
  className?: string;
  label?: string;
}) {
  const logo = (
    <div className={cn('flex items-center gap-2', className)}>
      <KlioMark size={28} />
      <span className="text-foreground text-lg font-semibold tracking-tight">
        Klio
      </span>
    </div>
  );

  if (href === null) {
    return logo;
  }

  return (
    <Link aria-label={label ?? 'Home Page'} href={href ?? '/'} prefetch={true}>
      {logo}
    </Link>
  );
}
```

- [ ] **Step 2: Verify no Vex asset references remain in the file**

Run: `grep -nE "vex|Vex|next/image" apps/web/components/app-logo.tsx || echo "CLEAN"`
Expected: `CLEAN`.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/app-logo.tsx
git commit -m "refactor(web): app logo uses KlioMark + 'Klio'"
```

---

### Task 4: Rebrand the auth (login/signup) layout logo

**Files:**
- Modify: `apps/web/app/auth/layout.tsx`

Context: lines 19–37 currently render a 160×160 stacked Vex logo via two `<Image>` tags. Replace with a stacked Klio lockup (mark above the wordmark). Leave the decorative chevron background and the rest of the file unchanged.

- [ ] **Step 1: Replace the logo block (lines 19–37)**

Find this block:

```tsx
          {/* Logo — stacked V + Vex */}
          <div className="mb-8">
            <Image
              src="/images/vex-stacked-black-transparent.svg"
              alt="Vex"
              width={160}
              height={160}
              className="block dark:hidden"
              priority
            />
            <Image
              src="/images/vex-stacked-white-transparent.svg"
              alt="Vex"
              width={160}
              height={160}
              className="hidden dark:block"
              priority
            />
          </div>
```

Replace it with:

```tsx
          {/* Logo — stacked Klio mark + wordmark */}
          <div className="text-foreground mb-8 flex flex-col items-start gap-3">
            <KlioMark size={56} />
            <span className="text-3xl font-semibold tracking-tight">Klio</span>
          </div>
```

- [ ] **Step 2: Fix imports**

At the top of the file, remove the now-unused `next/image` import:

```tsx
import Image from 'next/image';
```

and add the KlioMark import alongside the existing imports:

```tsx
import { KlioMark } from '~/components/klio-mark';
```

*(Note: `~/` is the `apps/web` path alias used elsewhere in this app — verify by `grep -rn "from '~/components" apps/web/app | head -1`. If the app uses a different alias for `apps/web/components`, match it.)*

- [ ] **Step 3: Verify**

Run: `grep -nE "vex-stacked|next/image" apps/web/app/auth/layout.tsx || echo "CLEAN"`
Expected: `CLEAN` (the only `Image` usage in this file was the logo).

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/auth/layout.tsx
git commit -m "refactor(web): auth layout uses stacked Klio lockup"
```

---

### Task 5: Rebrand the onboarding welcome icon

**Files:**
- Modify: `apps/web/app/onboarding/_components/step-welcome.tsx`

Context: lines 26–41 render a 160×160 animated Vex icon via two `<Image>` tags inside a `motion.div`. Keep the animation; swap the icon.

- [ ] **Step 1: Replace the two `<Image>` tags with one KlioMark**

Find:

```tsx
        <Image
          src="/images/vex-icon-black-transparent.svg"
          alt="Vex"
          width={160}
          height={160}
          className="block dark:hidden"
          priority
        />
        <Image
          src="/images/vex-icon-white-transparent.svg"
          alt="Vex"
          width={160}
          height={160}
          className="hidden dark:block"
          priority
        />
```

Replace with:

```tsx
        <KlioMark size={160} className="text-foreground" />
```

- [ ] **Step 2: Fix imports**

Remove `import Image from 'next/image';` and add:

```tsx
import { KlioMark } from '~/components/klio-mark';
```

- [ ] **Step 3: Verify**

Run: `grep -nE "vex-icon|next/image" apps/web/app/onboarding/_components/step-welcome.tsx || echo "CLEAN"`
Expected: `CLEAN`.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/onboarding/_components/step-welcome.tsx
git commit -m "refactor(web): onboarding welcome uses KlioMark"
```

---

### Task 6: Rebrand the create-workspace icon

**Files:**
- Modify: `apps/web/app/home/addworkspace/_components/create-workspace-form.tsx`

Context: lines 51–74 render a 120×120 Vex icon via two `<Image>` tags inside a `motion.div`.

- [ ] **Step 1: Replace the two `<Image>` tags with one KlioMark**

Find:

```tsx
      {/* Vex logo */}
      <motion.div
        className="flex justify-center"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Image
          src="/images/vex-icon-black-transparent.svg"
          alt="Vex"
          width={120}
          height={120}
          className="block dark:hidden"
          priority
        />
        <Image
          src="/images/vex-icon-white-transparent.svg"
          alt="Vex"
          width={120}
          height={120}
          className="hidden dark:block"
          priority
        />
      </motion.div>
```

Replace with:

```tsx
      {/* Klio logo */}
      <motion.div
        className="flex justify-center"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <KlioMark size={120} className="text-foreground" />
      </motion.div>
```

- [ ] **Step 2: Fix imports**

Remove `import Image from 'next/image';` and add:

```tsx
import { KlioMark } from '~/components/klio-mark';
```

- [ ] **Step 3: Verify**

Run: `grep -nE "vex-icon|next/image" apps/web/app/home/addworkspace/_components/create-workspace-form.tsx || echo "CLEAN"`
Expected: `CLEAN`.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/home/addworkspace/_components/create-workspace-form.tsx
git commit -m "refactor(web): create-workspace form uses KlioMark"
```

---

### Task 7: Repoint metadata icon

**Files:**
- Modify: `apps/web/lib/root-metadata.ts` (line ~37)

- [ ] **Step 1: Change the SVG icon url**

Find:

```ts
          url: '/images/vex-icon-black-transparent.svg',
```

Replace with:

```ts
          url: '/images/klio-mark.svg',
```

- [ ] **Step 2: Verify**

Run: `grep -nE "vex-icon" apps/web/lib/root-metadata.ts || echo "CLEAN"`
Expected: `CLEAN`.

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/root-metadata.ts
git commit -m "refactor(web): metadata icon points to Klio mark"
```

---

## Phase 3 — Copy & positioning

### Task 8: Flip the brand env vars (local `.env`)

**Files:**
- Modify: `apps/web/.env` (lines 9–11)

Note: `NEXT_PUBLIC_SITE_URL` (line 8) stays `http://localhost:3000` for local dev — the production value is set in Vercel (Task 13).

- [ ] **Step 1: Update the three brand vars**

Find:

```
NEXT_PUBLIC_PRODUCT_NAME=Vex
NEXT_PUBLIC_SITE_TITLE="Vex - Runtime Reliability for AI Agents"
NEXT_PUBLIC_SITE_DESCRIPTION="Vex is the runtime reliability layer for AI agents in production. Monitor, verify, and secure every agent output before it reaches your users."
```

Replace with:

```
NEXT_PUBLIC_PRODUCT_NAME=Klio
NEXT_PUBLIC_SITE_TITLE="Klio — Memory & Reliability for AI Agents"
NEXT_PUBLIC_SITE_DESCRIPTION="Klio is the memory and reliability layer for AI agents. Persistent cross-session memory plus runtime verification — so your agents remember what matters and you catch bad output before it ships."
```

- [ ] **Step 2: Verify**

Run: `grep -nE "PRODUCT_NAME|SITE_TITLE|SITE_DESCRIPTION" apps/web/.env`
Expected: all three show "Klio".

- [ ] **Step 3: Commit**

```bash
git add apps/web/.env
git commit -m "chore(web): brand env vars → Klio (local)"
```

---

### Task 9: Rewrite prose strings in locale files

**Files:**
- Modify: `apps/web/public/locales/en/agentguard.json` (lines 53, 305, 345, 350, 351, 371, 381)
- Modify: `apps/web/public/locales/en/auth.json` (line 4)

Replace "Vex" → "Klio" in these exact values (do NOT touch any `X-Vex-Key` token — none of these strings contain it, but verify in Step 2):

- [ ] **Step 1: agentguard.json — apply these replacements**

| Key path | New value |
|----------|-----------|
| `...pageDescription` (L53) | `"Learn how to integrate Klio into your AI agents"` |
| `...pageDescription` (L305) | `"Manage API keys for authenticating your agents with Klio"` |
| `...noKeysDescription` (L345) | `"Create an API key to authenticate your agents with Klio."` |
| `...pageTitle` (L350) | `"Get Started with Klio"` |
| `...welcomeTitle` (L351) | `"Welcome to Klio"` |
| `...step3Description` (L371) | `"Use this key to authenticate your agents with Klio. Copy it now — you won't see it again."` |
| `...step5Description` (L381) | `"Run your agent. Klio will detect it automatically."` |

- [ ] **Step 2: auth.json — line 4**

Find: `"signUpSubheading": "Start monitoring your AI agents with Vex.",`
Replace: `"signUpSubheading": "Start monitoring your AI agents with Klio.",`

- [ ] **Step 3: Verify no user-facing Vex prose remains, and JSON is valid**

Run:
```bash
grep -rnE "\bVex\b" apps/web/public/locales/en/ || echo "NO VEX PROSE"
node -e "JSON.parse(require('fs').readFileSync('apps/web/public/locales/en/agentguard.json','utf8')); JSON.parse(require('fs').readFileSync('apps/web/public/locales/en/auth.json','utf8')); console.log('JSON OK')"
```
Expected: `NO VEX PROSE` and `JSON OK`.

- [ ] **Step 4: Commit**

```bash
git add apps/web/public/locales/en/agentguard.json apps/web/public/locales/en/auth.json
git commit -m "chore(web): rebrand in-app copy Vex → Klio (keep X-Vex-Key token)"
```

---

## Phase 4 — Favicons & web manifest

### Task 10: Regenerate the favicon set from the Klio mark

**Files:**
- Modify: `apps/web/package.json` (add devDeps)
- Create: `apps/web/scripts/generate-favicons.mjs`
- Regenerate: `apps/web/public/images/favicon/*` (PNGs + ico) and `safari-pinned-tab.svg`
- Modify: `apps/web/public/images/favicon/site.webmanifest`

- [ ] **Step 1: Add the generation deps**

Run: `pnpm --filter web add -D sharp png-to-ico`
Expected: both added to `apps/web/package.json` devDependencies; lockfile updated.

- [ ] **Step 2: Write the generator script**

Create `apps/web/scripts/generate-favicons.mjs`:

```js
// Regenerate the favicon set from public/images/klio-mark.svg.
// Run: node apps/web/scripts/generate-favicons.mjs (from apps/web or repo root).
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import pngToIco from 'png-to-ico';
import sharp from 'sharp';

const appRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const svg = readFileSync(join(appRoot, 'public/images/klio-mark.svg'));
const outDir = join(appRoot, 'public/images/favicon');

// Render the mark centered on a solid-white square with ~18% padding so it
// reads on both light and dark browser chrome.
async function render(size) {
  const pad = Math.round(size * 0.18);
  const inner = size - pad * 2;
  const mark = await sharp(svg)
    .resize(inner, inner, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    })
    .png()
    .toBuffer();
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite([{ input: mark, gravity: 'center' }])
    .png()
    .toBuffer();
}

const targets = [
  ['favicon-16x16.png', 16],
  ['favicon-32x32.png', 32],
  ['android-chrome-192x192.png', 192],
  ['android-chrome-512x512.png', 512],
  ['apple-touch-icon.png', 180],
  ['mstile-150x150.png', 150],
];

for (const [name, size] of targets) {
  writeFileSync(join(outDir, name), await render(size));
  console.log('wrote', name);
}

writeFileSync(
  join(outDir, 'favicon.ico'),
  await pngToIco(await Promise.all([16, 32, 48].map(render))),
);
console.log('wrote favicon.ico');

// safari-pinned-tab is a monochrome mask SVG — reuse the mark geometry.
writeFileSync(join(outDir, 'safari-pinned-tab.svg'), svg);
console.log('wrote safari-pinned-tab.svg');
```

- [ ] **Step 3: Run the generator**

Run: `node apps/web/scripts/generate-favicons.mjs`
Expected: prints `wrote favicon-16x16.png` … through `wrote safari-pinned-tab.svg` with no errors.

- [ ] **Step 4: Update the web manifest name**

In `apps/web/public/images/favicon/site.webmanifest`, change:

```json
  "name": "Vex",
  "short_name": "Vex",
```

to:

```json
  "name": "Klio",
  "short_name": "Klio",
```

(Leave `theme_color`/`background_color`/icon paths as-is.)

- [ ] **Step 5: Verify**

Run:
```bash
grep -c '"Klio"' apps/web/public/images/favicon/site.webmanifest
file apps/web/public/images/favicon/favicon.ico
```
Expected: `2` and `favicon.ico` reported as an MS Windows icon resource.

- [ ] **Step 6: Commit**

```bash
git add apps/web/package.json ../../pnpm-lock.yaml apps/web/scripts/generate-favicons.mjs apps/web/public/images/favicon/
git commit -m "feat(web): regenerate favicon set from Klio mark + manifest name"
```

*(If `pnpm-lock.yaml` is at the repo root, adjust the path; run `git status` to confirm what changed.)*

---

## Phase 5 — Cleanup & verification

### Task 11: Delete orphaned Vex assets

**Files:**
- Delete: 8 `apps/web/public/images/vex-*.svg`

- [ ] **Step 1: Confirm zero remaining references before deleting**

Run: `grep -rnE "vex-(icon|stacked)" apps/web --include="*.ts" --include="*.tsx" --include="*.json" | grep -v node_modules || echo "NO REFS"`
Expected: `NO REFS`. **If any reference prints, fix it before continuing — do not delete a referenced asset.**

- [ ] **Step 2: Delete the assets**

```bash
git rm apps/web/public/images/vex-icon-black-transparent.svg \
       apps/web/public/images/vex-icon-white-transparent.svg \
       apps/web/public/images/vex-icon-dark.svg \
       apps/web/public/images/vex-icon-light.svg \
       apps/web/public/images/vex-stacked-black-transparent.svg \
       apps/web/public/images/vex-stacked-white-transparent.svg \
       apps/web/public/images/vex-stacked-dark.svg \
       apps/web/public/images/vex-stacked-light.svg
```

- [ ] **Step 3: Verify they're gone**

Run: `find apps/web/public -iname "*vex*" || echo "NO VEX ASSETS"`
Expected: `NO VEX ASSETS`.

- [ ] **Step 4: Commit**

```bash
git commit -m "chore(web): delete orphaned Vex logo assets"
```

---

### Task 12: Full verification (typecheck + builds + residual-brand sweep)

**Files:** none (verification only)

- [ ] **Step 1: Typecheck the web app**

Run: `pnpm --filter web typecheck`
Expected: PASS. *(If no `typecheck` script exists, run `pnpm --filter web exec tsc --noEmit`.)*

- [ ] **Step 2: Build the web app**

Run: `NEXT_PUBLIC_CI=true pnpm --filter web build`
Expected: build succeeds. *(`NEXT_PUBLIC_CI=true` satisfies the `app.config.ts` https-URL refinement for the local `http://localhost:3000` value; production uses the real https URL from Vercel.)*

- [ ] **Step 3: Confirm the landing app is untouched and still builds**

Run:
```bash
git diff --name-only main...HEAD -- apps/landing | grep . && echo "LANDING TOUCHED — INVESTIGATE" || echo "LANDING UNTOUCHED"
NEXT_PUBLIC_CI=true pnpm --filter landing build
```
Expected: `LANDING UNTOUCHED` and a successful landing build.

- [ ] **Step 4: Residual user-facing brand sweep**

Run:
```bash
grep -rnE "\bVex\b" apps/web/public/locales apps/web/components apps/web/app/auth apps/web/app/onboarding apps/web/app/home/addworkspace apps/web/lib/root-metadata.ts | grep -v "X-Vex" || echo "NO RESIDUAL VEX BRAND"
```
Expected: `NO RESIDUAL VEX BRAND`. (Any `X-Vex-Key`/`X-Vex-Agent` hits elsewhere are wire protocol and must remain.)

- [ ] **Step 5: Confirm wire-protocol tokens are intact (regression guard)**

Run: `grep -rn "X-Vex-Key" apps/web --include="*.ts" --include="*.tsx" | grep -v node_modules | head`
Expected: any integration/API-key code still references `X-Vex-Key` verbatim (NOT renamed). If this prints nothing, that's also fine (means the dashboard didn't reference it); the point is we did not rename it.

- [ ] **Step 6: No commit needed** (verification only). If any step failed, return to the relevant task and fix before proceeding.

---

## Phase 6 — Operational cutover (no code; run with CLIs/tokens)

> These are infra steps performed against Vercel and Supabase, not repo edits. They can run in parallel with code review. The Vercel token is read from `~/Library/Application Support/com.vercel.cli/auth.json`; project `dashboard-web`, team `Oppla` (`team_A2Q7cmIG9eUwcT05ZCJdkqH7`), projectId `prj_GC1eaem3ugCtnJFTwvdy7e19WpRJ`.

### Task 13: Vercel — add `app.klio.tech` + production brand env

- [ ] **Step 1: Add the domain to the project**

Run: `vercel domains add app.klio.tech dashboard-web --scope Oppla` (or via the Vercel dashboard → Project → Settings → Domains). Keep `app.tryvex.dev` attached.

- [ ] **Step 2: Configure DNS**

At the klio.tech DNS provider, add a CNAME: `app` → `cname.vercel-dns.com` (follow the exact target Vercel shows for the project). Wait for verification (`vercel domains inspect app.klio.tech`).

- [ ] **Step 3: Set production brand env vars**

Set on the project (Production environment):
```
NEXT_PUBLIC_PRODUCT_NAME=Klio
NEXT_PUBLIC_SITE_TITLE=Klio — Memory & Reliability for AI Agents
NEXT_PUBLIC_SITE_DESCRIPTION=Klio is the memory and reliability layer for AI agents. Persistent cross-session memory plus runtime verification — so your agents remember what matters and you catch bad output before it ships.
NEXT_PUBLIC_SITE_URL=https://app.klio.tech
```
via `vercel env add ...` or the dashboard. `NEXT_PUBLIC_SITE_URL` becomes the canonical URL (OG/sitemap/auth base); `app.tryvex.dev` keeps serving the same build.

- [ ] **Step 4: Verify**

Run: `vercel domains inspect app.klio.tech` → shows verified + assigned to `dashboard-web`.

### Task 14: Supabase — redirect allow-list + Site URL

- [ ] **Step 1: Add klio redirect URLs (keep tryvex)**

In Supabase → Authentication → URL Configuration:
- Add `https://app.klio.tech/**` and `https://app.klio.tech/auth/callback` to **Redirect URLs** (do NOT remove the existing `app.tryvex.dev` entries).
- Set **Site URL** to `https://app.klio.tech`.

- [ ] **Step 2: Verify config saved** (re-open the page; both domains present).

### Task 15: Live verification on both domains

- [ ] **Step 1: Trigger a production deploy** (push of the merged branch, or `vercel --prod` per the existing deploy flow once the branch is merged — merge/push is gated on user approval).

- [ ] **Step 2: Verify Klio branding live**

- `https://app.klio.tech` loads the dashboard; tab favicon is the Klio mark; page `<title>` reads "Klio …".
- Logo, auth/login screen, onboarding welcome, and create-workspace all show the Klio mark.

- [ ] **Step 3: Verify auth on both domains**

- Complete a login round-trip starting from `https://app.klio.tech`.
- Complete a login round-trip starting from `https://app.tryvex.dev` (still serves; may land on klio post-login — expected).

---

## Self-Review (author checklist)

**Spec coverage:** every design-doc surface maps to a task — env (T8), logo (T3), favicon (T10), locale copy (T9), delete orphaned assets (T11), domain+auth (T13–15), build/landing green (T12). **Added beyond the design doc** (discovered during planning): the Vex logo also appears on auth/login (T4), onboarding (T5), and create-workspace (T6) — required for a coherent rebrand and so asset deletion (T11) doesn't break the build. The design doc's footprint section should be updated to reflect these three extra screens + the full favicon set.

**Placeholder scan:** no TBD/TODO; every code step shows exact before/after.

**Type/name consistency:** `KlioMark` (import name, props `size`/`title`/`className`) is identical across T2–T6; `~/components/klio-mark` alias flagged for verification in T4.

**Out of scope (unchanged):** `apps/landing`, `X-Vex-Key`/`X-Vex-Agent`/`org_id='vex'`/`VEX_API_URL`, backend, SDK packages, GitHub org/repo names, the decorative chevron background in `auth/layout.tsx` (abstract geometry; optional later cosmetic pass).
