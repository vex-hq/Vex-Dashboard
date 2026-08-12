import { AppBreadcrumbs } from '@kit/ui/app-breadcrumbs';
import { PageBody } from '@kit/ui/page';
import { Trans } from '@kit/ui/trans';

import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';
import { requireUserInServerComponent } from '~/lib/server/require-user-in-server-component';

// local imports
import { BillingPlanSummaryCard } from '../../_components/billing-plan-summary-card';
import { derivePlanLabel } from '../../_lib/billing-plan-label';
import { HomeLayoutPageHeader } from '../_components/home-page-header';
import { loadPersonalAccountBillingPageData } from './_lib/server/personal-account-billing-page.loader';

export const generateMetadata = async () => {
  const i18n = await createI18nServerInstance();
  const title = i18n.t('account:billingTab');

  return {
    title,
  };
};

/**
 * Billing guard: no Klio user may ever be shown a Vex price.
 *
 * `billing.config.ts` still describes the retired Vex Starter/Pro/Team tiers
 * and their monthly prices, and the checkout server actions built on it
 * (`./_lib/server/server-actions.ts`) are deliberately left untouched — they
 * just aren't reachable from this page anymore. Personal accounts have no
 * seat concept, so the summary card is rendered without a `seatCount` and
 * shows its "not applicable" note instead.
 */
async function PersonalAccountBillingPage() {
  const user = await requireUserInServerComponent();

  const [subscription, order] = await loadPersonalAccountBillingPageData(
    user.id,
  );

  const planLabel = derivePlanLabel({
    subscriptionStatus: subscription?.status ?? null,
    hasOrder: Boolean(order),
  });

  return (
    <>
      <HomeLayoutPageHeader
        title={<Trans i18nKey={'common:routes.billing'} />}
        description={<AppBreadcrumbs />}
      />

      <PageBody>
        <div className={'flex max-w-2xl flex-col space-y-4'}>
          <BillingPlanSummaryCard planLabel={planLabel} />
        </div>
      </PageBody>
    </>
  );
}

export default withI18n(PersonalAccountBillingPage);
