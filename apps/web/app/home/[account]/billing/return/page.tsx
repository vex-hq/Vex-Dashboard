import { notFound, redirect } from 'next/navigation';

import { getBillingGatewayProvider } from '@kit/billing-gateway';
import { BillingSessionStatus } from '@kit/billing-gateway/components';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { withI18n } from '~/lib/i18n/with-i18n';
import { requireUserInServerComponent } from '~/lib/server/require-user-in-server-component';

interface SessionPageProps {
  searchParams: Promise<{
    session_id: string;
  }>;
}

/**
 * Billing guard: no Klio user may ever be shown a Vex price.
 *
 * This route is a leftover checkout-return landing page: Stripe redirects
 * here after a checkout session, and it used to render either a success
 * screen or — if the session was still open — a live embedded Stripe
 * Checkout form (`EmbeddedCheckoutForm`), which renders real Stripe
 * prices/products. Neither of the two billing pages initiates checkout
 * anymore, but this route is still directly navigable by URL with any
 * `session_id`, so the open-session branch is neutralized: instead of
 * rendering checkout, it redirects to the guarded billing page, exactly like
 * the missing-`session_id` case already does below.
 *
 * The completed-session branch (`BillingSessionStatus`) is left rendering:
 * it's a post-purchase confirmation with no price/product content (email +
 * a "back to billing" link), not a checkout surface, so it doesn't violate
 * the guard.
 *
 * `EmbeddedCheckoutForm` and `billing.config.ts` are intentionally not
 * imported here anymore — same "guard is at the render layer, not deletion"
 * treatment as the two billing pages.
 */
async function ReturnCheckoutSessionPage({ searchParams }: SessionPageProps) {
  const sessionId = (await searchParams).session_id;

  if (!sessionId) {
    redirect('../');
  }

  const { customerEmail, checkoutToken } = await loadCheckoutSession(sessionId);

  if (checkoutToken) {
    redirect('../');
  }

  return (
    <>
      <div className={'fixed top-48 left-0 z-50 mx-auto w-full'}>
        <BillingSessionStatus
          redirectPath={'../billing'}
          customerEmail={customerEmail ?? ''}
        />
      </div>

      <BlurryBackdrop />
    </>
  );
}

export default withI18n(ReturnCheckoutSessionPage);

function BlurryBackdrop() {
  return (
    <div
      className={
        'bg-background/30 fixed top-0 left-0 w-full backdrop-blur-sm' +
        ' !m-0 h-full'
      }
    />
  );
}

async function loadCheckoutSession(sessionId: string) {
  await requireUserInServerComponent();

  const client = getSupabaseServerClient();
  const gateway = await getBillingGatewayProvider(client);

  const session = await gateway.retrieveCheckoutSession({
    sessionId,
  });

  if (!session) {
    notFound();
  }

  const checkoutToken = session.isSessionOpen ? session.checkoutToken : null;

  // otherwise - we show the user the return page
  // and display the details of the session
  return {
    status: session.status,
    customerEmail: session.customer.email,
    checkoutToken,
  };
}
