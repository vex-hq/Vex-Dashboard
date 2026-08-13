import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The personal-account billing page is a Server Component that calls
 * Supabase, so rendering it end-to-end in this suite would need a live DB
 * (see `app/home/_components/billing-plan-summary-card.test.tsx` and
 * `app/home/_lib/billing-plan-label.test.ts` for the rendered-output and
 * pure-logic coverage of what it actually displays). This test instead
 * source-scans the page file — a deliberate, cheap regression guard: if
 * anyone re-adds a checkout render to it (the exact mutation this guard
 * exists to catch), it fails immediately without needing a DB.
 *
 * `NEXT_PUBLIC_ENABLE_PERSONAL_ACCOUNT_BILLING` is `false` and personal
 * accounts do not buy seats, so this guard stays in force for the
 * personal-account page only.
 *
 * The team-account billing page's guard was lifted on 2026-08-13 once
 * Klio's own Stripe prices ($20/seat/month, $200/seat/year) existed to
 * replace the retired Vex tiers — see
 * `app/home/[account]/billing/_components/team-account-checkout-form.test.tsx`
 * for its rendered-output coverage (checkout form present, both Klio plans
 * offered). The one assertion that still applies to it is "no literal
 * Vex-era price can render", which is about Vex prices specifically, not
 * about checkout being disabled, so it is kept below for both pages.
 */
const webRoot = path.resolve(import.meta.dirname, '../../..');

const pages = [
  {
    name: 'team-account billing page',
    file: 'app/home/[account]/billing/page.tsx',
  },
  {
    name: 'personal-account billing page',
    file: 'app/home/(user)/billing/page.tsx',
  },
];

describe('billing page guard (source scan)', () => {
  for (const page of pages) {
    describe(page.name, () => {
      const source = readFileSync(path.join(webRoot, page.file), 'utf-8');

      it('contains no literal Vex-era price', () => {
        expect(source).not.toMatch(/\$29|\$99|\$349/);
      });
    });
  }

  describe('personal-account billing page', () => {
    const source = readFileSync(
      path.join(webRoot, 'app/home/(user)/billing/page.tsx'),
      'utf-8',
    );

    it('renders the plan-summary card', () => {
      expect(source).toContain('BillingPlanSummaryCard');
    });

    it('does not import a checkout form component', () => {
      expect(source).not.toMatch(/import.*CheckoutForm/);
    });

    it('does not import billing.config (the Vex tier/price source)', () => {
      expect(source).not.toMatch(/config\/billing\.config/);
    });

    it('does not reference resolveProductPlan', () => {
      expect(source).not.toContain('resolveProductPlan');
    });
  });

  /**
   * Positive counterpart to the personal-account block above: this is the
   * page the 2026-08-12 guard covered up and that was restored on
   * 2026-08-13 now that `billing.config.ts` carries Klio's own prices. If
   * someone reintroduces the guard (deletes the checkout import, swaps back
   * to `BillingPlanSummaryCard`), this fails.
   */
  describe('team-account billing page renders real checkout', () => {
    const source = readFileSync(
      path.join(webRoot, 'app/home/[account]/billing/page.tsx'),
      'utf-8',
    );

    it('imports and renders TeamAccountCheckoutForm', () => {
      expect(source).toMatch(/import.*TeamAccountCheckoutForm/);
      expect(source).toContain('<TeamAccountCheckoutForm');
    });

    it('imports billing.config and resolves the current plan through it', () => {
      expect(source).toMatch(/config\/billing\.config/);
      expect(source).toContain('resolveProductPlan');
    });
  });

  /**
   * `app/home/[account]/billing/return/page.tsx` is a third render path:
   * Stripe's checkout-return redirect target. It used to render a live
   * embedded Stripe Checkout form (real prices/products) whenever the
   * `session_id` in the URL pointed at a still-open session, and it's
   * directly navigable by URL with any `session_id` — no in-app link
   * points at it, but nothing stops a request from reaching it. The
   * `(user)` variant re-exports this same component, so covering this one
   * file covers both routes.
   */
  describe('checkout-return page ([account]/billing/return)', () => {
    const source = readFileSync(
      path.join(webRoot, 'app/home/[account]/billing/return/page.tsx'),
      'utf-8',
    );

    it('does not import EmbeddedCheckoutForm', () => {
      expect(source).not.toMatch(/import.*EmbeddedCheckoutForm/);
    });

    it('does not import billing.config (the Vex tier/price source)', () => {
      expect(source).not.toMatch(/config\/billing\.config/);
    });

    it('redirects instead of rendering when the checkout session is still open', () => {
      // The `checkoutToken` branch is the one that used to render a live
      // embedded checkout. It must redirect, not return JSX.
      const checkoutTokenBranch = source.match(
        /if \(checkoutToken\) \{([\s\S]*?)\n {2}\}/,
      )?.[1];

      expect(checkoutTokenBranch).toBeDefined();
      expect(checkoutTokenBranch).toMatch(/redirect\(/);
      expect(checkoutTokenBranch).not.toMatch(/return\s*\(/);
    });
  });
});
