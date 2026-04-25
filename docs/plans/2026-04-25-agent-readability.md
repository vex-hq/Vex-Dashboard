# Agent Readability for Vex Landing Site — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Make the Vex landing site machine-readable to AI agents (schema, APIs, semantic HTML, freshness signals) and remove all stale "open source" claims, without changing the visual design.

**Architecture:** Single source of truth in `lib/pricing.ts` and `lib/site-meta.ts`. Typed JSON-LD generators in `lib/seo/schemas.ts` are reused by pages, the new `/api/pricing` route handler, and the new `/llms.txt` route handler. Existing `dangerouslySetInnerHTML` JSON-LD pattern preserved — only the *data* is centralized.

**Tech Stack:** Next.js 15 App Router · TypeScript 5.9 · Tailwind · vitest (added in Task 1.0) · `@testing-library/react` + `jsdom` · Zod (for API contract test)

**Workspace:** All work in `/Users/thakurg/Hive/Research/AgentGuard/vex_public/Dashboard`. Branch off `main` (not `feat/pseo-system`) — separate concern. New branch: `feat/agent-readability`.

**Reference:** [docs/plans/2026-04-25-agent-readability-design.md](2026-04-25-agent-readability-design.md) — locked design.

---

## Pre-Flight (one-time, before PR1)

### Task 0: Branch + clean working tree check

**Files:** None — git operations only.

**Step 1:** Verify current branch and working tree.

Run:
```bash
cd /Users/thakurg/Hive/Research/AgentGuard/vex_public/Dashboard
git status --short
```

Expected: many WIP modified files exist. **Do not stash or touch them.** Plan only commits files we explicitly add.

**Step 2:** Create new branch off `main`.

Run:
```bash
git fetch origin main
git switch -c feat/agent-readability origin/main
```

Expected: clean tree on new branch.

**Step 3:** Verify landing app builds at the baseline.

Run:
```bash
cd apps/landing && pnpm install --frozen-lockfile && pnpm typecheck && pnpm lint && pnpm build
```

Expected: all four green. If not, stop and resolve baseline issues first.

**Step 4:** Commit nothing yet.

---

# PR1 — Schema additions + OSS scrub

**Branch:** `feat/agent-readability` → eventually `feat/agent-readability-pr1`
**Goal:** Centralize pricing data, emit Product/Offer JSON-LD, add comparison-page schema, add Breadcrumb + dateModified to guides/blog, scrub all OSS claims, add forbidden-phrase guard.

---

### Task 1.0: Bootstrap vitest in `apps/landing`

**Files:**
- Create: `apps/landing/vitest.config.ts`
- Modify: `apps/landing/package.json`
- Create: `apps/landing/__tests__/smoke.test.ts`

**Step 1:** Add dev dependencies.

Run from repo root:
```bash
cd apps/landing
pnpm add -D vitest @testing-library/react @testing-library/jest-dom jsdom @vitejs/plugin-react zod
```

Expected: `package.json` updated, `pnpm-lock.yaml` updated, install succeeds.

**Step 2:** Create `apps/landing/vitest.config.ts`.

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['__tests__/**/*.test.ts', '__tests__/**/*.test.tsx'],
  },
  resolve: {
    alias: {
      '~': path.resolve(__dirname, './app'),
      '~/lib': path.resolve(__dirname, './lib'),
    },
  },
});
```

**Step 3:** Add scripts to `apps/landing/package.json` under `"scripts"`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

**Step 4:** Write smoke test `apps/landing/__tests__/smoke.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

describe('vitest harness', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

**Step 5:** Run it.

```bash
pnpm test
```

Expected: 1 test passes.

**Step 6:** Commit.

```bash
git add apps/landing/vitest.config.ts apps/landing/package.json apps/landing/__tests__/smoke.test.ts pnpm-lock.yaml
git commit -m "test: bootstrap vitest in apps/landing"
```

---

### Task 1.1: Extract pricing to `lib/pricing.ts`

**Files:**
- Create: `apps/landing/lib/pricing.ts`
- Test: `apps/landing/__tests__/lib/pricing.test.ts`

**Step 1:** Write failing test `apps/landing/__tests__/lib/pricing.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { PLANS, LAST_UPDATED, CURRENCY, type Plan } from '~/lib/pricing';

describe('lib/pricing', () => {
  it('exports four plans with stable ids', () => {
    expect(PLANS).toHaveLength(4);
    expect(PLANS.map((p) => p.id)).toEqual(['free', 'starter', 'pro', 'team']);
  });

  it('all plan prices are non-negative integers', () => {
    for (const plan of PLANS) {
      expect(Number.isInteger(plan.priceMonthly)).toBe(true);
      expect(plan.priceMonthly).toBeGreaterThanOrEqual(0);
    }
  });

  it('every plan has at least one feature row', () => {
    for (const plan of PLANS) {
      expect(plan.features.length).toBeGreaterThan(0);
    }
  });

  it('LAST_UPDATED is an ISO date', () => {
    expect(LAST_UPDATED).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('CURRENCY is USD', () => {
    expect(CURRENCY).toBe('USD');
  });
});
```

**Step 2:** Run test, expect import failure.

```bash
pnpm test -- pricing
```

Expected: FAIL — module `~/lib/pricing` not found.

**Step 3:** Create `apps/landing/lib/pricing.ts`. Source the values from existing `apps/landing/app/pricing/page.tsx:19-98` exactly — do not change any user-visible numbers.

```ts
export const LAST_UPDATED = '2026-04-25' as const;
export const CURRENCY = 'USD' as const;

export interface PlanFeature {
  readonly label: string;
  readonly value: string;
}

export interface Plan {
  readonly id: 'free' | 'starter' | 'pro' | 'team';
  readonly name: string;
  readonly priceMonthly: number;
  readonly priceYearly: number | null;
  readonly description: string;
  readonly audience: string;
  readonly features: ReadonlyArray<PlanFeature>;
  readonly highlighted: boolean;
  readonly cta: { readonly label: string; readonly href: string };
}

export const PLANS: ReadonlyArray<Plan> = [
  {
    id: 'free',
    name: 'Free',
    priceMonthly: 0,
    priceYearly: null,
    description: 'Sandbox for exploring agent reliability.',
    audience: 'Developers exploring AI agent reliability',
    highlighted: false,
    cta: { label: 'Get Started Free', href: 'https://app.tryvex.dev' },
    features: [
      { label: 'Observations', value: '1,000 / mo' },
      { label: 'Verifications', value: '50 / mo' },
      { label: 'Corrections', value: 'None' },
      { label: 'Agents', value: 'Unlimited' },
      { label: 'Data retention', value: '1 day' },
      { label: 'Rate limit', value: '100 RPM' },
      { label: 'Overage', value: 'Hard limit' },
      { label: 'Support', value: 'Community' },
    ],
  },
  {
    id: 'starter',
    name: 'Starter',
    priceMonthly: 29,
    priceYearly: null,
    description: 'For founders running 1-2 agents in production.',
    audience: 'Founders running 1-2 agents in production',
    highlighted: false,
    cta: { label: 'Start Starter', href: 'https://app.tryvex.dev' },
    features: [
      { label: 'Observations', value: '25,000 / mo' },
      { label: 'Verifications', value: '1,000 / mo' },
      { label: 'Corrections', value: '100 / mo' },
      { label: 'Agents', value: 'Unlimited' },
      { label: 'Data retention', value: '7 days' },
      { label: 'Rate limit', value: '500 RPM' },
      { label: 'Overage', value: 'Hard limit' },
      { label: 'Support', value: 'Email' },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    priceMonthly: 99,
    priceYearly: 990,
    description: 'For teams shipping agents to production.',
    audience: 'Teams shipping agents to production',
    highlighted: true,
    cta: { label: 'Start Pro', href: 'https://app.tryvex.dev' },
    features: [
      { label: 'Observations', value: '150,000 / mo' },
      { label: 'Verifications', value: '15,000 / mo' },
      { label: 'Corrections', value: 'Full cascade' },
      { label: 'Agents', value: 'Unlimited' },
      { label: 'Data retention', value: '30 days' },
      { label: 'Rate limit', value: '1,000 RPM' },
      { label: 'Overage', value: '$0.0005/obs, $0.005/verify' },
      { label: 'Support', value: 'Email (48h)' },
    ],
  },
  {
    id: 'team',
    name: 'Team',
    priceMonthly: 349,
    priceYearly: 3490,
    description: 'For organizations running agents at scale.',
    audience: 'Organizations running agents at scale',
    highlighted: false,
    cta: { label: 'Start Team', href: 'https://app.tryvex.dev' },
    features: [
      { label: 'Observations', value: '1,500,000 / mo' },
      { label: 'Verifications', value: '150,000 / mo' },
      { label: 'Corrections', value: 'Full cascade + priority' },
      { label: 'Agents', value: 'Unlimited' },
      { label: 'Data retention', value: '90 days' },
      { label: 'Rate limit', value: '5,000 RPM' },
      { label: 'Overage', value: '$0.0004/obs, $0.004/verify' },
      { label: 'Support', value: 'Priority (24h)' },
    ],
  },
] as const;
```

**Step 4:** Run test.

```bash
pnpm test -- pricing
```

Expected: PASS, 5/5.

**Step 5:** Commit.

```bash
git add apps/landing/lib/pricing.ts apps/landing/__tests__/lib/pricing.test.ts
git commit -m "feat(landing): extract pricing data to lib/pricing.ts"
```

---

### Task 1.2: Create `lib/site-meta.ts`

**Files:**
- Create: `apps/landing/lib/site-meta.ts`
- Test: `apps/landing/__tests__/lib/site-meta.test.ts`

**Step 1:** Write failing test:

```ts
import { describe, expect, it } from 'vitest';
import { POSITIONING_SENTENCE, ORG, SAME_AS, FAQ } from '~/lib/site-meta';

describe('lib/site-meta', () => {
  it('positioning sentence contains who/outcome/approach markers', () => {
    expect(POSITIONING_SENTENCE).toMatch(/founders/i);
    expect(POSITIONING_SENTENCE).toMatch(/hallucinations/i);
    expect(POSITIONING_SENTENCE).toMatch(/auto-correction/i);
  });

  it('positioning sentence does not mention open source', () => {
    expect(POSITIONING_SENTENCE).not.toMatch(/open[\s-]?source/i);
  });

  it('organization has stable identity fields', () => {
    expect(ORG.name).toBe('Vex');
    expect(ORG.url).toBe('https://tryvex.dev');
  });

  it('sameAs is a non-empty array of https URLs', () => {
    expect(SAME_AS.length).toBeGreaterThan(0);
    for (const url of SAME_AS) {
      expect(url).toMatch(/^https:\/\//);
    }
  });

  it('FAQ has 5 entries (no open-source question)', () => {
    expect(FAQ).toHaveLength(5);
    for (const entry of FAQ) {
      expect(entry.question).not.toMatch(/open[\s-]?source/i);
      expect(entry.answer).not.toMatch(/open[\s-]?source/i);
    }
  });
});
```

**Step 2:** Run test, expect FAIL.

```bash
pnpm test -- site-meta
```

**Step 3:** Create `apps/landing/lib/site-meta.ts`:

```ts
export const POSITIONING_SENTENCE =
  'Vex helps founders shipping AI agents prevent hallucinations, drift, and policy violations from reaching customers through continuous runtime verification with 3-layer auto-correction.';

export const ORG = {
  name: 'Vex',
  url: 'https://tryvex.dev',
  logo: 'https://tryvex.dev/images/og-image.png',
  contactEmail: 'hello@tryvex.dev',
} as const;

export const SAME_AS: ReadonlyArray<string> = [
  'https://github.com/Vex-AI-Dev',
  'https://x.com/tryvex',
  // Placeholders ready when listings exist:
  // 'https://www.g2.com/products/vex',
  // 'https://www.producthunt.com/products/vex',
  // 'https://www.linkedin.com/company/tryvex',
];

export interface FaqEntry {
  readonly question: string;
  readonly answer: string;
}

export const FAQ: ReadonlyArray<FaqEntry> = [
  {
    question: 'What is Vex?',
    answer:
      "Vex is a runtime reliability layer for AI agents. It detects when your agent's behavior silently changes in production — hallucinations, drift, schema violations — and auto-corrects before your users notice.",
  },
  {
    question: 'How is Vex different from evals or tracing?',
    answer:
      "Evals test your agent before deployment. Tracing shows you what happened after something breaks. Vex runs continuously in production, catching behavioral drift in real-time and auto-correcting on the fly. They're complementary — Vex fills the gap between pre-deploy testing and post-mortem analysis.",
  },
  {
    question: 'How long does it take to set up?',
    answer:
      'About 5 minutes. Install the SDK (pip install vex-sdk or npm install @vex_dev/sdk), add 3 lines of code to wrap your agent function, and deploy. Vex starts learning from the first request.',
  },
  {
    question: 'What frameworks does Vex support?',
    answer:
      'Vex works with LangChain, CrewAI, OpenAI Assistants, and any custom Python or TypeScript agent. If your code calls an LLM, Vex can watch it.',
  },
  {
    question: 'Does Vex add latency?',
    answer:
      'In async mode (default), Vex adds zero latency — verification happens in the background. In sync mode, Vex adds a verification step before returning the output, which typically takes 200-500ms depending on the checks enabled.',
  },
];
```

**Step 4:** Run test.

```bash
pnpm test -- site-meta
```

Expected: PASS.

**Step 5:** Commit.

```bash
git add apps/landing/lib/site-meta.ts apps/landing/__tests__/lib/site-meta.test.ts
git commit -m "feat(landing): add lib/site-meta with positioning sentence + org + FAQ"
```

---

### Task 1.3: Create JSON-LD generators in `lib/seo/schemas.ts`

**Files:**
- Create: `apps/landing/lib/seo/schemas.ts`
- Test: `apps/landing/__tests__/lib/seo/schemas.test.ts`

**Step 1:** Write failing test:

```ts
import { describe, expect, it } from 'vitest';
import {
  softwareApplicationSchema,
  organizationSchema,
  faqPageSchema,
  productOfferSchema,
  breadcrumbSchema,
  compareSchema,
  articleSchema,
} from '~/lib/seo/schemas';

describe('lib/seo/schemas', () => {
  it('softwareApplicationSchema includes Vex identity and price', () => {
    const s = softwareApplicationSchema();
    expect(s['@type']).toBe('SoftwareApplication');
    expect(s.name).toBe('Vex');
    expect(s.applicationCategory).toBe('DeveloperApplication');
    expect(s.offers).toBeDefined();
    expect(s.description).not.toMatch(/open[\s-]?source/i);
  });

  it('organizationSchema includes sameAs', () => {
    const s = organizationSchema();
    expect(s['@type']).toBe('Organization');
    expect(Array.isArray(s.sameAs)).toBe(true);
  });

  it('faqPageSchema mirrors FAQ entries from site-meta', () => {
    const s = faqPageSchema();
    expect(s['@type']).toBe('FAQPage');
    expect(s.mainEntity).toHaveLength(5);
  });

  it('productOfferSchema emits one Product with one Offer per plan', () => {
    const s = productOfferSchema();
    expect(s['@type']).toBe('Product');
    expect(s.offers).toHaveLength(4);
    for (const offer of s.offers) {
      expect(offer['@type']).toBe('Offer');
      expect(offer.priceCurrency).toBe('USD');
      expect(typeof offer.price).toBe('string');
    }
  });

  it('breadcrumbSchema generates ItemList with positions', () => {
    const s = breadcrumbSchema([
      { name: 'Home', url: 'https://tryvex.dev' },
      { name: 'Pricing', url: 'https://tryvex.dev/pricing' },
    ]);
    expect(s['@type']).toBe('BreadcrumbList');
    expect(s.itemListElement[0].position).toBe(1);
    expect(s.itemListElement[1].position).toBe(2);
  });

  it('compareSchema returns Vex SoftwareApplication + competitor SoftwareApplication + breadcrumb', () => {
    const s = compareSchema({
      vendorSlug: 'braintrust',
      vendorName: 'Braintrust',
      vendorUrl: 'https://www.braintrust.dev',
    });
    expect(Array.isArray(s)).toBe(true);
    expect(s).toHaveLength(3);
    expect(s.some((n) => n.name === 'Vex')).toBe(true);
    expect(s.some((n) => n.name === 'Braintrust')).toBe(true);
  });

  it('articleSchema includes dateModified', () => {
    const s = articleSchema({
      headline: 'Test',
      description: 'Test description',
      datePublished: '2026-01-01',
      dateModified: '2026-04-25',
      url: 'https://tryvex.dev/test',
    });
    expect(s.dateModified).toBe('2026-04-25');
  });
});
```

**Step 2:** Run, expect FAIL (no module).

**Step 3:** Create `apps/landing/lib/seo/schemas.ts`:

```ts
import { PLANS, LAST_UPDATED, CURRENCY } from '~/lib/pricing';
import { ORG, SAME_AS, FAQ, POSITIONING_SENTENCE } from '~/lib/site-meta';

const CONTEXT = 'https://schema.org' as const;

export function softwareApplicationSchema() {
  return {
    '@context': CONTEXT,
    '@type': 'SoftwareApplication',
    name: ORG.name,
    description: POSITIONING_SENTENCE,
    url: ORG.url,
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: CURRENCY,
      description: 'Free tier available',
    },
    softwareHelp: {
      '@type': 'WebPage',
      url: 'https://docs.tryvex.dev',
    },
    downloadUrl: 'https://pypi.org/project/vex-sdk/',
  } as const;
}

export function organizationSchema() {
  return {
    '@context': CONTEXT,
    '@type': 'Organization',
    name: ORG.name,
    url: ORG.url,
    logo: ORG.logo,
    sameAs: SAME_AS,
  } as const;
}

export function faqPageSchema() {
  return {
    '@context': CONTEXT,
    '@type': 'FAQPage',
    mainEntity: FAQ.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  };
}

export function productOfferSchema() {
  return {
    '@context': CONTEXT,
    '@type': 'Product',
    name: ORG.name,
    description: POSITIONING_SENTENCE,
    brand: { '@type': 'Brand', name: ORG.name },
    dateModified: LAST_UPDATED,
    offers: PLANS.map((plan) => ({
      '@type': 'Offer',
      name: plan.name,
      description: plan.description,
      price: String(plan.priceMonthly),
      priceCurrency: CURRENCY,
      category: 'SaaS subscription',
      eligibleCustomerType: plan.audience,
      url: plan.cta.href,
      ...(plan.priceYearly !== null && {
        priceSpecification: {
          '@type': 'UnitPriceSpecification',
          price: String(plan.priceYearly),
          priceCurrency: CURRENCY,
          unitCode: 'ANN',
          referenceQuantity: { '@type': 'QuantitativeValue', value: 1, unitCode: 'ANN' },
        },
      }),
    })),
  };
}

export interface BreadcrumbItem {
  readonly name: string;
  readonly url: string;
}

export function breadcrumbSchema(items: ReadonlyArray<BreadcrumbItem>) {
  return {
    '@context': CONTEXT,
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export interface CompareInput {
  readonly vendorSlug: string;
  readonly vendorName: string;
  readonly vendorUrl: string;
}

export function compareSchema(input: CompareInput) {
  return [
    softwareApplicationSchema(),
    {
      '@context': CONTEXT,
      '@type': 'SoftwareApplication',
      name: input.vendorName,
      url: input.vendorUrl,
      applicationCategory: 'DeveloperApplication',
    },
    breadcrumbSchema([
      { name: 'Home', url: 'https://tryvex.dev' },
      { name: 'Compare', url: 'https://tryvex.dev/compare' },
      { name: input.vendorName, url: `https://tryvex.dev/compare/${input.vendorSlug}` },
    ]),
  ];
}

export interface ArticleInput {
  readonly headline: string;
  readonly description: string;
  readonly datePublished: string;
  readonly dateModified: string;
  readonly url: string;
}

export function articleSchema(input: ArticleInput) {
  return {
    '@context': CONTEXT,
    '@type': 'Article',
    headline: input.headline,
    description: input.description,
    datePublished: input.datePublished,
    dateModified: input.dateModified,
    url: input.url,
    publisher: { '@type': 'Organization', name: ORG.name, url: ORG.url },
  };
}
```

**Step 4:** Run.

```bash
pnpm test -- schemas
```

Expected: PASS, 7/7.

**Step 5:** Commit.

```bash
git add apps/landing/lib/seo/schemas.ts apps/landing/__tests__/lib/seo/schemas.test.ts
git commit -m "feat(landing): typed JSON-LD generators in lib/seo/schemas"
```

---

### Task 1.4: Refactor `app/layout.tsx` to use generators + scrub OSS

**Files:**
- Modify: `apps/landing/app/layout.tsx`

**Step 1:** Read the current file end-to-end. Identify the inline JSON-LD block (lines 88–183) and OSS strings on lines 21, 97, 136, 165–170.

**Step 2:** Replace the inline JSON-LD block with calls to the generators:

```tsx
import {
  softwareApplicationSchema,
  organizationSchema,
  faqPageSchema,
} from '~/lib/seo/schemas';

// inside <body> ...
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify([
      softwareApplicationSchema(),
      organizationSchema(),
      faqPageSchema(),
    ]),
  }}
/>
```

**Step 3:** Update `metadata.description` (line 21) to drop the "open-source" prefix:

```ts
description:
  "Vex is the runtime reliability layer that detects when your AI agent's behavior silently changes in production. Before your customers notice.",
```

Same for `openGraph.description` and `twitter.description` if they reference OSS.

**Step 4:** Add `<link rel="alternate" type="text/plain" href="/llms.txt" />` inside `<head>`. (PR2 implements the route; the link can ship now — agents that hit a 404 in PR1 just retry next crawl.)

**Step 5:** Type-check + lint.

```bash
cd apps/landing && pnpm typecheck && pnpm lint
```

**Step 6:** Build.

```bash
pnpm build
```

Expected: green.

**Step 7:** Commit.

```bash
git add apps/landing/app/layout.tsx
git commit -m "refactor(landing): root layout uses typed JSON-LD generators; scrub OSS claims"
```

---

### Task 1.5: Refactor `app/pricing/page.tsx` — import PLANS, add Product/Offer JSON-LD, scrub FAQ

**Files:**
- Modify: `apps/landing/app/pricing/page.tsx`
- Test: `apps/landing/__tests__/pages/pricing.test.tsx`

**Step 1:** Write integration test asserting the rendered page contains `Product` JSON-LD and does NOT contain OSS strings.

```tsx
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import PricingPage from '~/pricing/page';

describe('app/pricing/page.tsx', () => {
  it('renders one Product JSON-LD with 4 Offers', () => {
    const { container } = render(<PricingPage />);
    const scripts = container.querySelectorAll('script[type="application/ld+json"]');
    const found = Array.from(scripts).map((s) => JSON.parse(s.textContent ?? 'null'));
    const product = found.find((n) => n && n['@type'] === 'Product');
    expect(product).toBeDefined();
    expect(product.offers).toHaveLength(4);
  });

  it('does not contain OSS claims in user-visible text', () => {
    const { container } = render(<PricingPage />);
    expect(container.textContent ?? '').not.toMatch(/open[\s-]?source/i);
    expect(container.textContent ?? '').not.toMatch(/apache 2\.0/i);
  });
});
```

**Step 2:** Run, expect FAIL.

**Step 3:** Edit `app/pricing/page.tsx`:

- Replace the inline `plans` array with `import { PLANS } from '~/lib/pricing';` and adapt the JSX to the new `Plan` shape (e.g. `plan.priceMonthly` → render as `$${plan.priceMonthly}`, `plan.cta.label` / `plan.cta.href`).
- Drop the `faqs` entry whose `question` is `'Is Vex open source?'`.
- Add the JSON-LD `<script>` rendering `productOfferSchema()` (import from `~/lib/seo/schemas`).

**Step 4:** Run.

```bash
pnpm test -- pricing
pnpm typecheck && pnpm lint && pnpm build
```

Expected: all green.

**Step 5:** Commit.

```bash
git add apps/landing/app/pricing/page.tsx apps/landing/__tests__/pages/pricing.test.tsx
git commit -m "feat(landing): pricing page emits Product+Offer JSON-LD; sources from lib/pricing"
```

---

### Task 1.6: Scrub `_components/faq-accordion.tsx`

**Files:**
- Modify: `apps/landing/app/_components/faq-accordion.tsx`

**Step 1:** Open the file. Drop the FAQ entry whose `q` is `'Is Vex open source?'`. Edit the `'What is Vex?'` answer to remove "open-source" prefix.

**Step 2:** Build + grep guard.

```bash
cd apps/landing && pnpm build
grep -i "open.source\|apache 2" app/_components/faq-accordion.tsx
```

Expected: build green; grep returns no matches.

**Step 3:** Commit.

```bash
git add apps/landing/app/_components/faq-accordion.tsx
git commit -m "chore(landing): scrub OSS claims from faq-accordion"
```

---

### Task 1.7: Scrub `_components/install-box.tsx`

**Files:**
- Modify: `apps/landing/app/_components/install-box.tsx:81`

**Step 1:** Replace `Open source · Apache 2.0 · Zero vendor lock-in · ...` with non-OSS framing, e.g. `Zero vendor lock-in · Self-hostable · ...` (or whatever the new chip line should be). If unclear, use `Zero vendor lock-in` only.

**Step 2:** Build.

```bash
pnpm build
```

**Step 3:** Commit.

```bash
git add apps/landing/app/_components/install-box.tsx
git commit -m "chore(landing): scrub OSS chip from install-box"
```

---

### Task 1.8: Scrub `_components/comparison-table.tsx`

**Files:**
- Modify: `apps/landing/app/_components/comparison-table.tsx:291`

**Step 1:** Remove the `{ feature: 'Open source', ... }` row from the comparison data array.

**Step 2:** Build.

**Step 3:** Commit.

```bash
git add apps/landing/app/_components/comparison-table.tsx
git commit -m "chore(landing): remove Open source row from comparison-table"
```

---

### Task 1.9–1.15: Add `compareSchema` + scrub OSS in each compare page

**Files (one task each):**
- `apps/landing/app/compare/braintrust/page.tsx`
- `apps/landing/app/compare/langfuse/page.tsx`
- `apps/landing/app/compare/langsmith/page.tsx`
- `apps/landing/app/compare/galileo/page.tsx`
- `apps/landing/app/compare/guardrails-ai/page.tsx`
- `apps/landing/app/compare/sentrial/page.tsx`
- `apps/landing/app/compare/concepts/[slug]/page.tsx` (verify shape — uses dynamic slug)

**Per file, identical pattern:**

**Step 1:** Add JSON-LD `<script>` at the top of the JSX rendering `compareSchema({ vendorSlug, vendorName, vendorUrl })`. Vendor URLs:

| Slug | URL |
|---|---|
| braintrust | `https://www.braintrust.dev` |
| langfuse | `https://langfuse.com` |
| langsmith | `https://www.langchain.com/langsmith` |
| galileo | `https://www.rungalileo.io` |
| guardrails-ai | `https://www.guardrailsai.com` |
| sentrial | `https://sentrial.ai` *(verify)* |

For `compare/concepts/[slug]`: schema generation per slug; if no real vendor URL, omit the second `SoftwareApplication` and just render the Vex one + breadcrumb.

**Step 2:** Drop the `{ name: 'Open source', ... }` row from the local `features` array.

**Step 3:** Edit the prose paragraph that says "Open source (Apache 2.0)." or similar — remove the parenthetical.

**Step 4:** Update meta description if it mentions "open source".

**Step 5:** Build, commit per file:

```bash
git add apps/landing/app/compare/<vendor>/page.tsx
git commit -m "feat(landing): add compareSchema + scrub OSS on compare/<vendor>"
```

---

### Task 1.16: Add BreadcrumbList + dateModified to `guides/[framework]/page.tsx`

**Files:**
- Modify: `apps/landing/app/guides/[framework]/page.tsx:66-76` (existing `jsonLd` const)

**Step 1:** Update the inline `jsonLd` to include `dateModified` (use `guide.meta.generatedAt`) and add a separate breadcrumb script:

```tsx
import { breadcrumbSchema, articleSchema } from '~/lib/seo/schemas';

const article = articleSchema({
  headline: guide.seo.title,
  description: guide.seo.description,
  datePublished: guide.meta.generatedAt,
  dateModified: guide.meta.generatedAt,
  url: `https://tryvex.dev/guides/${framework}`,
});
const breadcrumbs = breadcrumbSchema([
  { name: 'Home', url: 'https://tryvex.dev' },
  { name: 'Guides', url: 'https://tryvex.dev/guides' },
  { name: meta?.name ?? framework, url: `https://tryvex.dev/guides/${framework}` },
]);
```

Render both in a single `<script type="application/ld+json">` as an array.

**Step 2:** Build.

**Step 3:** Commit.

```bash
git add apps/landing/app/guides/[framework]/page.tsx
git commit -m "feat(landing): add BreadcrumbList + dateModified to guide pages"
```

---

### Task 1.17: Same pattern for `blog/[slug]/page.tsx`

**Files:**
- Modify: `apps/landing/app/blog/[slug]/page.tsx`

**Step 1:** Add `dateModified` (use post date or post `updated` field if present; otherwise reuse `datePublished`) and add `breadcrumbSchema([{name:'Home',...},{name:'Blog',...},{name: post.title, ...}])`.

**Step 2:** Build, commit.

---

### Task 1.18: Forbidden-phrase guard

**Files:**
- Create: `apps/landing/__tests__/no-oss-claims.test.ts`

**Step 1:** Write the test:

```ts
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..');
const FORBIDDEN = [
  /open[\s-]?source/i,
  /apache 2\.0/i,
  /agplv3/i,
  /\bmit licen[cs]e\b/i,
];
const SCAN_DIRS = ['app', 'lib'];
const ALLOW_FILES = new Set<string>([
  // Terms page is legal text — handled separately by Task 1.19.
  'app/terms/page.tsx',
]);

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === 'node_modules' || entry === '.next') continue;
      yield* walk(full);
    } else if (entry.endsWith('.tsx') || entry.endsWith('.ts') || entry.endsWith('.mdx')) {
      yield full;
    }
  }
}

describe('no OSS claims in user-facing source', () => {
  for (const scanDir of SCAN_DIRS) {
    for (const file of walk(join(ROOT, scanDir))) {
      const rel = file.replace(`${ROOT}/`, '');
      if (ALLOW_FILES.has(rel)) continue;
      it(`${rel} contains no forbidden OSS phrases`, () => {
        const text = readFileSync(file, 'utf8');
        // Strip line comments and block comments before scanning.
        const stripped = text
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/^\s*\/\/.*$/gm, '');
        for (const pattern of FORBIDDEN) {
          expect(stripped, `pattern ${pattern} matched`).not.toMatch(pattern);
        }
      });
    }
  }
});
```

**Step 2:** Run.

```bash
pnpm test -- no-oss-claims
```

Expected: all files pass (because Tasks 1.4–1.17 scrubbed them). If any file fails, identify and scrub it.

**Step 3:** Commit.

```bash
git add apps/landing/__tests__/no-oss-claims.test.ts
git commit -m "test(landing): forbidden-phrase guard for OSS claims"
```

---

### Task 1.19: Decide & handle `terms/page.tsx`

**Files:**
- Modify: `apps/landing/app/terms/page.tsx`

**Step 1:** Read [terms/page.tsx](/Users/thakurg/Hive/Research/AgentGuard/vex_public/Dashboard/apps/landing/app/terms/page.tsx) fully. Lines 54, 60, 62, 63, 70 reference open-source SDK / Apache 2.0.

**Step 2:** **STOP and confirm with user:** is the SDK *itself* still licensed under Apache 2.0, or has the SDK license also changed? Terms text must match the actual SDK license. **Do not edit until confirmed.** If confirmed unchanged, leave terms text but verify it doesn't bleed into product positioning.

**Step 3:** If terms text needs editing, do it; otherwise update `ALLOW_FILES` in `__tests__/no-oss-claims.test.ts` only if the legal text genuinely needs to stay. Bump `LAST_UPDATED` to the current date and add a short note in the body.

**Step 4:** Commit (only if changed).

---

### Task 1.20: Open PR1

**Step 1:** Push branch.

```bash
git push -u origin feat/agent-readability
```

**Step 2:** Open PR with body summarizing scope:
- Centralized pricing data
- Product/Offer JSON-LD on pricing
- compareSchema on 7 compare pages
- BreadcrumbList + dateModified on guides + blog
- Scrubbed OSS claims (layout, FAQ, install-box, comparison-table, all compare pages, pricing FAQ)
- Forbidden-phrase guard test

**Step 3:** Manual production validation steps (run after deploy):

| # | Command | Expected |
|---|---|---|
| 1 | `curl -s https://tryvex.dev/pricing \| grep -c 'application/ld+json'` | ≥ 1 |
| 2 | Pricing HTML through https://validator.schema.org/ | zero errors |
| 3 | Pricing through https://search.google.com/test/rich-results | Product + FAQ eligible |
| 4 | `curl -s https://tryvex.dev/compare/braintrust \| grep -c 'SoftwareApplication'` | ≥ 2 |
| 5 | `curl -s https://tryvex.dev/ \| grep -ic 'open source'` | 0 |

---

# PR2 — Agent API surface

**Branch:** `feat/agent-readability-pr2` (off PR1 branch after PR1 merges to `main`)
**Goal:** Ship `/api/pricing` and `/llms.txt` as static, CDN-cached endpoints.

---

### Task 2.1: `/api/pricing` route handler

**Files:**
- Create: `apps/landing/app/api/pricing/route.ts`
- Test: `apps/landing/__tests__/api/pricing.test.ts`

**Step 1:** Write the contract test:

```ts
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { GET } from '~/api/pricing/route';

const PlanZ = z.object({
  id: z.enum(['free', 'starter', 'pro', 'team']),
  name: z.string(),
  priceMonthly: z.number().int().nonnegative(),
  priceYearly: z.number().nullable(),
  description: z.string(),
  audience: z.string(),
  highlighted: z.boolean(),
  features: z.array(z.object({ label: z.string(), value: z.string() })).min(1),
  cta: z.object({ label: z.string(), href: z.string().url() }),
});

const ResponseZ = z.object({
  product: z.literal('Vex'),
  currency: z.literal('USD'),
  lastUpdated: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  plans: z.array(PlanZ).length(4),
  enterprise: z.object({ contact: z.string().email() }),
});

describe('GET /api/pricing', () => {
  it('returns valid JSON matching the contract', async () => {
    const res = GET();
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toContain('public');
    const body = await res.json();
    ResponseZ.parse(body); // throws on mismatch
  });
});
```

**Step 2:** Run, expect FAIL.

**Step 3:** Create `apps/landing/app/api/pricing/route.ts`:

```ts
import { NextResponse } from 'next/server';

import { CURRENCY, LAST_UPDATED, PLANS } from '~/lib/pricing';
import { ORG } from '~/lib/site-meta';

export const dynamic = 'force-static';

export function GET() {
  return NextResponse.json(
    {
      product: ORG.name,
      currency: CURRENCY,
      lastUpdated: LAST_UPDATED,
      plans: PLANS,
      enterprise: { contact: ORG.contactEmail },
    },
    { headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=86400' } },
  );
}
```

**Step 4:** Run.

```bash
pnpm test -- api/pricing
pnpm build
```

Expected: green; build output should show `/api/pricing` as a static route.

**Step 5:** Commit.

```bash
git add apps/landing/app/api/pricing/route.ts apps/landing/__tests__/api/pricing.test.ts
git commit -m "feat(landing): add static /api/pricing route"
```

---

### Task 2.2: `lib/seo/llms-txt.ts` body builder

**Files:**
- Create: `apps/landing/lib/seo/llms-txt.ts`
- Test: `apps/landing/__tests__/lib/seo/llms-txt.test.ts`

**Step 1:** Write test (snapshot + structural assertions):

```ts
import { describe, expect, it } from 'vitest';
import { buildLlmsTxt } from '~/lib/seo/llms-txt';

describe('lib/seo/llms-txt', () => {
  const body = buildLlmsTxt();

  it('starts with Vex header', () => {
    expect(body.startsWith('# Vex\n')).toBe(true);
  });

  it('includes positioning sentence', () => {
    expect(body).toContain('Vex helps founders shipping AI agents');
  });

  it('includes every plan name', () => {
    for (const name of ['Free', 'Starter', 'Pro', 'Team', 'Enterprise']) {
      expect(body).toContain(name);
    }
  });

  it('points to machine-readable endpoint', () => {
    expect(body).toContain('https://tryvex.dev/api/pricing');
  });

  it('does not contain OSS claims', () => {
    expect(body).not.toMatch(/open[\s-]?source/i);
  });

  it('matches snapshot', () => {
    expect(body).toMatchSnapshot();
  });
});
```

**Step 2:** Run, expect FAIL.

**Step 3:** Create `apps/landing/lib/seo/llms-txt.ts`:

```ts
import { LAST_UPDATED, PLANS } from '~/lib/pricing';
import { ORG, POSITIONING_SENTENCE } from '~/lib/site-meta';

export function buildLlmsTxt(): string {
  const planLines = PLANS.map(
    (p) =>
      `- ${p.name} — $${p.priceMonthly}/mo · ${p.features[0]?.value ?? ''} · ${p.audience}`,
  ).join('\n');

  return `# ${ORG.name}

> ${POSITIONING_SENTENCE}

Last updated: ${LAST_UPDATED}

## Pricing
${planLines}
- Enterprise — custom (${ORG.contactEmail})

Machine-readable: ${ORG.url}/api/pricing

## Key URLs
- Home: ${ORG.url}
- Pricing: ${ORG.url}/pricing
- Docs: https://docs.tryvex.dev
- App: https://app.tryvex.dev
- Compare: ${ORG.url}/compare

## Frameworks supported
LangChain, CrewAI, OpenAI Assistants, custom Python/TypeScript agents

## Categories
- AI agent observability
- Runtime guardrails
- LLM reliability
- Hallucination detection
`;
}
```

**Step 4:** Run.

```bash
pnpm test -- llms-txt
```

Expected: snapshot generated on first run, passes thereafter.

**Step 5:** Commit.

```bash
git add apps/landing/lib/seo/llms-txt.ts apps/landing/__tests__/lib/seo/llms-txt.test.ts apps/landing/__tests__/lib/seo/__snapshots__/
git commit -m "feat(landing): build llms.txt body from typed sources"
```

---

### Task 2.3: `/llms.txt` route handler

**Files:**
- Create: `apps/landing/app/llms.txt/route.ts`
- Test: `apps/landing/__tests__/api/llms-txt.test.ts`

**Step 1:** Write contract test:

```ts
import { describe, expect, it } from 'vitest';
import { GET } from '~/llms.txt/route';

describe('GET /llms.txt', () => {
  it('returns text/plain', async () => {
    const res = GET();
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/plain');
  });

  it('body contains positioning sentence and pricing', async () => {
    const res = GET();
    const text = await res.text();
    expect(text).toContain('Vex helps founders');
    expect(text).toContain('Free');
    expect(text).toContain('Pro');
  });
});
```

**Step 2:** Create `apps/landing/app/llms.txt/route.ts`:

```ts
import { buildLlmsTxt } from '~/lib/seo/llms-txt';

export const dynamic = 'force-static';

export function GET() {
  return new Response(buildLlmsTxt(), {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  });
}
```

**Step 3:** Run.

```bash
pnpm test -- llms-txt
pnpm build
```

Expected: `/llms.txt` shows in build output as a static route.

**Step 4:** Commit.

```bash
git add apps/landing/app/llms.txt/route.ts apps/landing/__tests__/api/llms-txt.test.ts
git commit -m "feat(landing): add static /llms.txt route"
```

---

### Task 2.4: Open PR2

**Step 1:** Push, open PR. Body lists the two new endpoints and links to https://llmstxt.org for `/llms.txt` standard.

**Step 2:** Manual validation post-deploy:

```bash
curl -sS https://tryvex.dev/api/pricing | jq '.plans | length'   # → 4
curl -sS https://tryvex.dev/api/pricing -I | grep -i cache       # public, max-age set
curl -sS https://tryvex.dev/llms.txt | head -3                   # # Vex / blank / quoted positioning
```

---

# PR3 — Semantic HTML + dates + positioning sentence

**Branch:** `feat/agent-readability-pr3` (off `main` after PR2 merges)
**Goal:** Convert pricing FAQ + comparison tables to semantic HTML, add visible "Last reviewed" lines, add positioning sentence to home + pricing.

---

### Task 3.1: Pricing FAQ → `<details>`/`<summary>`

**Files:**
- Modify: `apps/landing/app/pricing/page.tsx` (FAQ section near line 237)
- Test: `apps/landing/__tests__/pages/pricing.test.tsx` (extend)

**Step 1:** Add to existing test:

```ts
it('renders FAQ as <details> elements', () => {
  const { container } = render(<PricingPage />);
  const details = container.querySelectorAll('details');
  expect(details.length).toBeGreaterThanOrEqual(5);
  for (const d of details) {
    expect(d.querySelector('summary')).not.toBeNull();
  }
});
```

**Step 2:** Run, expect FAIL.

**Step 3:** Replace the FAQ `.map((faq) => <div>...)` with:

```tsx
{faqs.map((faq) => (
  <details
    key={faq.question}
    className="rounded-xl border border-[#252525] bg-[#0a0a0a] p-6 [&>summary]:cursor-pointer"
  >
    <summary className="text-[15px] font-medium text-white">{faq.question}</summary>
    <p className="mt-2 text-sm leading-relaxed text-[#a2a2a2]">{faq.answer}</p>
  </details>
))}
```

**Step 4:** Test, build, commit.

---

### Task 3.2: Comparison tables → `<table>`

**Files:**
- Modify each: `apps/landing/app/compare/{braintrust,langfuse,langsmith,galileo,guardrails-ai,sentrial}/page.tsx`
- Modify: `apps/landing/app/_components/comparison-table.tsx`
- Test: `apps/landing/__tests__/pages/compare-braintrust.test.tsx`

**Step 1:** Add test asserting one compare page renders a real `<table>`:

```ts
import { render } from '@testing-library/react';
import CompareBraintrust from '~/compare/braintrust/page';

it('renders feature comparison as a <table>', () => {
  const { container } = render(<CompareBraintrust />);
  const table = container.querySelector('table');
  expect(table).not.toBeNull();
  expect(table?.querySelector('caption')).not.toBeNull();
  expect(table?.querySelectorAll('th[scope="col"]').length).toBeGreaterThanOrEqual(3);
});
```

**Step 2:** Run, expect FAIL.

**Step 3:** Per file, replace the CSS-grid feature table with:

```tsx
<table className="w-full overflow-hidden rounded-xl border border-[#252525] text-sm">
  <caption className="sr-only">Vex vs <Vendor> feature comparison</caption>
  <thead className="bg-[#161616]">
    <tr>
      <th scope="col" className="px-6 py-3 text-left text-[#585858]">Feature</th>
      <th scope="col" className="px-6 py-3 text-center text-emerald-500">Vex</th>
      <th scope="col" className="px-6 py-3 text-center text-[#585858]">{vendorName}</th>
    </tr>
  </thead>
  <tbody>
    {features.map((f) => (
      <tr key={f.name} className="border-t border-[#252525]">
        <th scope="row" className="px-6 py-3 text-left font-normal text-[#a2a2a2]">{f.name}</th>
        <td className="px-6 py-3 text-center">
          <span aria-label={f.vex ? 'yes' : 'no'} className={f.vex ? 'text-emerald-500' : 'text-[#585858]'}>
            {f.vex ? '✓' : '—'}
          </span>
        </td>
        <td className="px-6 py-3 text-center">
          <span aria-label={f.competitor ? 'yes' : 'no'} className={f.competitor ? 'text-white' : 'text-[#585858]'}>
            {f.competitor ? '✓' : '—'}
          </span>
        </td>
      </tr>
    ))}
  </tbody>
</table>
```

Apply the same pattern to `comparison-table.tsx` (the homepage comparison component).

**Step 4:** After each file, build + visual check via `pnpm dev` (port 3001) and confirm no layout regression.

**Step 5:** Commit per file (or batch the 6 compare pages + 1 component as one commit if visually verified together).

---

### Task 3.3: Pricing plan grid → `<ul role="list">`

**Files:**
- Modify: `apps/landing/app/pricing/page.tsx` (lines 150–206)

**Step 1:** Wrap the `plans.map(...)` output in `<ul role="list">`. Each card becomes `<li aria-labelledby="plan-${plan.id}-name">` with the plan name `<h2 id="plan-${plan.id}-name">`.

**Step 2:** Build, dev visual check, commit.

---

### Task 3.4: Visible "Last reviewed" line

**Files:**
- Modify: `apps/landing/app/pricing/page.tsx`
- Modify: each `apps/landing/app/compare/<vendor>/page.tsx`
- Modify: `apps/landing/app/guides/[framework]/page.tsx`

**Step 1:** Add small caption directly under the H1 on each page:

```tsx
import { LAST_UPDATED } from '~/lib/pricing';
// ...
<p className="text-xs text-[#585858]">Last reviewed: {LAST_UPDATED}</p>
```

For compare pages and guides: `LAST_UPDATED` should reflect that page's last review. Acceptable to use the global `LAST_UPDATED` for all (single bump bumps everything). If finer granularity is wanted later, extract per-page constants. Out of scope for this PR.

**Step 2:** Build, commit.

---

### Task 3.5: Positioning sentence on home + pricing

**Files:**
- Modify: `apps/landing/app/page.tsx` (hero, after the existing `<p>` lede on line ~23)
- Modify: `apps/landing/app/pricing/page.tsx` (after the existing lede on line ~144)

**Step 1:** Import and render:

```tsx
import { POSITIONING_SENTENCE } from '~/lib/site-meta';
// ...
<p className="mb-6 max-w-[560px] text-sm leading-relaxed text-[#585858]">
  {POSITIONING_SENTENCE}
</p>
```

Place it directly under the existing hero subhead, above the CTA. On pricing, place under "Start free. Scale as your agents go to production."

**Step 2:** Add test that home page contains the sentence:

```ts
it('home page renders positioning sentence', () => {
  const { container } = render(<HomePage />);
  expect(container.textContent ?? '').toContain('Vex helps founders shipping AI agents');
});
```

**Step 3:** Build, dev visual check, commit.

---

### Task 3.6: Open PR3

**Step 1:** Push, open PR. Body summarizes the semantic HTML upgrades + positioning sentence + visible dates.

**Step 2:** Manual validation post-deploy:

| # | Check |
|---|---|
| 1 | `pricing` page in browser → FAQ items toggle natively (no JS required) |
| 2 | Inspector shows `<table>` with `<caption>`, `<th scope="col/row">` on `/compare/braintrust` |
| 3 | `axe-core` browser extension → zero violations on `/pricing` and `/compare/braintrust` |
| 4 | Visual diff: no regressions vs main |
| 5 | View source — positioning sentence appears once on home, once on pricing |

---

## Cross-PR Reference Tables

### Files touched per PR

| File | PR1 | PR2 | PR3 |
|---|---|---|---|
| `lib/pricing.ts` | ✚ create | — | — |
| `lib/site-meta.ts` | ✚ create | — | — |
| `lib/seo/schemas.ts` | ✚ create | — | — |
| `lib/seo/llms-txt.ts` | — | ✚ create | — |
| `app/api/pricing/route.ts` | — | ✚ create | — |
| `app/llms.txt/route.ts` | — | ✚ create | — |
| `app/layout.tsx` | ✎ schema + scrub + `<link rel="alternate">` | — | — |
| `app/pricing/page.tsx` | ✎ PLANS + Product schema + scrub | — | ✎ `<details>`, `<ul role="list">`, last-reviewed, positioning |
| `app/page.tsx` | — | — | ✎ positioning sentence |
| `app/_components/faq-accordion.tsx` | ✎ scrub | — | — |
| `app/_components/install-box.tsx` | ✎ scrub | — | — |
| `app/_components/comparison-table.tsx` | ✎ scrub | — | ✎ → `<table>` |
| `app/compare/{braintrust,langfuse,langsmith,galileo,guardrails-ai,sentrial}/page.tsx` | ✎ schema + scrub | — | ✎ → `<table>` + last-reviewed |
| `app/compare/concepts/[slug]/page.tsx` | ✎ schema | — | — |
| `app/guides/[framework]/page.tsx` | ✎ Breadcrumb + dateModified | — | ✎ last-reviewed |
| `app/blog/[slug]/page.tsx` | ✎ Breadcrumb + dateModified | — | — |
| `app/terms/page.tsx` | ⚠ confirm SDK license first | — | — |

### Out of scope (explicit, per design)

- `Review` / `AggregateRating` schema — no real reviews
- `HowTo` schema on guides
- Hero copy rewrites (option C in brainstorm)
- MCP server, OpenAPI, `/api/compare`, `/api/faqs`
- pSEO `learn/`, `checklists/`, `tools/` page schema enhancements — same pattern as guides; trivial follow-up if desired
- Distribution work (G2, ProductHunt, HN, podcast outreach) — separate brainstorm

### Open questions (block specific tasks)

| # | Question | Blocks |
|---|---|---|
| 1 | Is the SDK still Apache 2.0? `terms/page.tsx` legal text depends on the answer. | Task 1.19 |
| 2 | Sentrial public URL? | Task 1.13 (compare/sentrial schema) |
