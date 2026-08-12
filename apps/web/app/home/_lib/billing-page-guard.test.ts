import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Both billing pages are Server Components that call Supabase, so rendering
 * them end-to-end in this suite would need a live DB (see
 * `app/home/_components/billing-plan-summary-card.test.tsx` and
 * `app/home/_lib/billing-plan-label.test.ts` for the rendered-output and
 * pure-logic coverage of what they actually display). This test instead
 * source-scans both page files — a deliberate, cheap regression guard: if
 * anyone re-adds a checkout render to either page (the exact mutation this
 * guard exists to catch), it fails immediately without needing a DB.
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

      it('contains no literal Vex-era price', () => {
        expect(source).not.toMatch(/\$29|\$99|\$349/);
      });
    });
  }

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
