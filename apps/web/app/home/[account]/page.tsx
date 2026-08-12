import { AppBreadcrumbs } from '@kit/ui/app-breadcrumbs';
import { PageBody } from '@kit/ui/page';
import { Trans } from '@kit/ui/trans';

import { resolveOrgId } from '~/lib/agentguard/resolve-org-id';
import { parseTimeRange } from '~/lib/agentguard/time-range';
import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';

import { ConnectFirstAgent } from './_components/connect-first-agent';
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

/**
 * Run one dashboard loader, degrading to `fallback` if it fails.
 *
 * The homepage fans out to nine loaders against the engine database. They used
 * to share fate through Promise.all: one cold Neon resume blowing the connect
 * budget threw an AggregateError(ETIMEDOUT) out of the server component and
 * the whole page became an error screen (seen in production, digests
 * 1176364607 / 1376536570). A dashboard tile with no data is worth strictly
 * more than a crash page, so each loader now fails alone: the error is logged
 * with its label and the tile renders its empty state.
 */
async function orFallback<T>(
  label: string,
  fallback: T,
  run: () => Promise<T>,
): Promise<T> {
  try {
    return await run();
  } catch (error) {
    console.error(`[homepage] loader "${label}" failed; rendering fallback`, {
      error: error instanceof Error ? error.message : String(error),
    });

    return fallback;
  }
}

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
    orFallback(
      'kpis',
      {
        total_verifications: 0,
        avg_confidence: null,
        issues_caught: 0,
        auto_corrected: 0,
      },
      () => loadHomepageKpis(orgId, timeRange),
    ),
    orFallback('agentHealth', [], () => loadAgentHealth(orgId, timeRange)),
    orFallback(
      'alertSummary',
      { critical: 0, high: 0, medium: 0, low: 0 },
      () => loadAlertSummary(orgId, timeRange),
    ),
    orFallback('trend', [], () => loadHomepageTrend(orgId, timeRange)),
    orFallback(
      'planUsage',
      {
        plan: 'free',
        planOverrides: null,
        observationsUsed: 0,
        verificationsUsed: 0,
        memoriesUsed: null,
        recallsUsed: null,
        agentCount: 0,
      },
      () => loadPlanUsage(orgId, account),
    ),
    orFallback('failurePatterns', [], () =>
      loadFailurePatterns(orgId, timeRange),
    ),
    orFallback('anomalyAlerts', [], () => loadAnomalyAlerts(orgId, timeRange)),
    orFallback('memoryActivity', [], () => loadAgentActivity(orgId)),
    orFallback('memoryVolume', [], () =>
      loadMemoryVolume(orgId, MEMORY_VOLUME_DAYS),
    ),
  ]);

  return (
    <>
      <TeamAccountLayoutPageHeader
        account={account}
        title={<Trans i18nKey={'agentguard:homepage.pageTitle'} />}
        description={<AppBreadcrumbs />}
      />

      <PageBody>
        {/* First-run: an org with zero memory writes in the volume window has
            no working agent connection — either brand new or a setup that
            never finished. Both want the same thing: the connect command,
            here, with the key already in it. Disappears on the first write.
            (A long-idle but genuinely connected org sees it too; for them it
            reads as a reconnect helper, which is not wrong.) */}
        {memoryVolume.every((point) => point.captured === 0) ? (
          <div className="mb-6">
            <ConnectFirstAgent accountSlug={account} />
          </div>
        ) : null}
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
