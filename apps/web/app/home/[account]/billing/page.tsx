import { AppBreadcrumbs } from '@kit/ui/app-breadcrumbs';
import { PageBody } from '@kit/ui/page';
import { Trans } from '@kit/ui/trans';

import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';

// local imports
import { BillingPlanSummaryCard } from '../../_components/billing-plan-summary-card';
import { derivePlanLabel } from '../../_lib/billing-plan-label';
import { TeamAccountLayoutPageHeader } from '../_components/team-account-layout-page-header';
import { loadTeamAccountBillingPage } from '../_lib/server/team-account-billing-page.loader';
import { loadTeamWorkspace } from '../_lib/server/team-account-workspace.loader';

interface TeamAccountBillingPageProps {
  params: Promise<{ account: string }>;
}

export const generateMetadata = async () => {
  const i18n = await createI18nServerInstance();
  const title = i18n.t('teams:billing.pageTitle');

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
 * just aren't reachable from this page anymore. This page renders only a
 * plan-summary card; the Stripe checkout form, current-subscription card and
 * billing-portal form that used to live here are gone from the render tree
 * (their components/actions still exist in the codebase, unreferenced).
 */
async function TeamAccountBillingPage({ params }: TeamAccountBillingPageProps) {
  const account = (await params).account;
  const workspace = await loadTeamWorkspace(account);
  const accountId = workspace.account.id;

  const [subscription, order, , membersCount] =
    await loadTeamAccountBillingPage(accountId);

  const planLabel = derivePlanLabel({
    subscriptionStatus: subscription?.status ?? null,
    hasOrder: Boolean(order),
  });

  return (
    <>
      <TeamAccountLayoutPageHeader
        account={account}
        title={<Trans i18nKey={'common:routes.billing'} />}
        description={<AppBreadcrumbs />}
      />

      <PageBody>
        <div className="animate-in fade-in flex flex-col space-y-6 pb-36 duration-500">
          <BillingPlanSummaryCard
            planLabel={planLabel}
            seatCount={membersCount ?? undefined}
          />
        </div>
      </PageBody>
    </>
  );
}

export default withI18n(TeamAccountBillingPage);
