import { AppBreadcrumbs } from '@kit/ui/app-breadcrumbs';
import { PageBody } from '@kit/ui/page';
import { Trans } from '@kit/ui/trans';

import { resolveOrgId } from '~/lib/agentguard/resolve-org-id';
import { parseTimeRange } from '~/lib/agentguard/time-range';
import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';

import { HomepageDashboard } from './_components/homepage-dashboard';
import { TeamAccountLayoutPageHeader } from './_components/team-account-layout-page-header';
import {
  loadAgentHealth,
  loadAlertSummary,
  loadAnomalyAlerts,
  loadFailurePatterns,
  loadHomepageKpis,
  loadHomepageTrend,
  loadPlanUsage,
} from './_lib/server/homepage.loader';
import {
  loadAgentActivity,
  loadMemoryVolume,
} from './memory/_lib/server/memory.loader';

interface TeamAccountHomePageProps {
  params: Promise<{ account: string }>;
  searchParams: Promise<{ timeRange?: string }>;
}

/** Matches the Memory page's volume window so both read the same series. */
const MEMORY_VOLUME_DAYS = 30;

export const generateMetadata = async () => {
  const i18n = await createI18nServerInstance();
  const title = i18n.t('agentguard:homepage.pageTitle');

  return {
    title,
  };
};

async function TeamAccountHomePage({
  params,
  searchParams,
}: TeamAccountHomePageProps) {
  const { account } = await params;
  const { timeRange: rawTimeRange } = await searchParams;
  const timeRange = parseTimeRange(rawTimeRange);
  const orgId = await resolveOrgId(account);

  // Memory reuses the Memory page's own loaders (no duplicated SQL). It is not
  // scoped by `timeRange`: the volume window is fixed at 30 days and the
  // per-agent rollup is all-time, exactly as the Memory page renders them.
  const [
    kpis,
    agentHealth,
    alertSummary,
    trend,
    planUsage,
    failurePatterns,
    anomalyAlerts,
    memoryActivity,
    memoryVolume,
  ] = await Promise.all([
    loadHomepageKpis(orgId, timeRange),
    loadAgentHealth(orgId, timeRange),
    loadAlertSummary(orgId, timeRange),
    loadHomepageTrend(orgId, timeRange),
    loadPlanUsage(orgId, account),
    loadFailurePatterns(orgId, timeRange),
    loadAnomalyAlerts(orgId, timeRange),
    loadAgentActivity(orgId),
    loadMemoryVolume(orgId, MEMORY_VOLUME_DAYS),
  ]);

  return (
    <>
      <TeamAccountLayoutPageHeader
        account={account}
        title={<Trans i18nKey={'agentguard:homepage.pageTitle'} />}
        description={<AppBreadcrumbs />}
      />

      <PageBody>
        <HomepageDashboard
          kpis={kpis}
          agentHealth={agentHealth}
          alertSummary={alertSummary}
          trend={trend}
          accountSlug={account}
          planUsage={planUsage}
          failurePatterns={failurePatterns}
          anomalyAlerts={anomalyAlerts}
          memoryActivity={memoryActivity}
          memoryVolume={memoryVolume}
        />
      </PageBody>
    </>
  );
}

export default withI18n(TeamAccountHomePage);
