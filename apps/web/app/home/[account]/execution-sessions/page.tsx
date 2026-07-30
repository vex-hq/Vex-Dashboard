import { AppBreadcrumbs } from '@kit/ui/app-breadcrumbs';
import { PageBody } from '@kit/ui/page';
import { Trans } from '@kit/ui/trans';

import { getAgentGuardPool } from '~/lib/agentguard/db';
import { resolveOrgId } from '~/lib/agentguard/resolve-org-id';
import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';

import { TeamAccountLayoutPageHeader } from '../_components/team-account-layout-page-header';
import { ExecutionSessionsDashboard } from './_components/execution-sessions-dashboard';
import { loadSessionList } from './_lib/server/execution-sessions.loader';

interface SessionsPageProps {
  params: Promise<{ account: string }>;
  searchParams: Promise<{
    agent?: string;
    status?: string;
    timeRange?: string;
    page?: string;
  }>;
}

export const generateMetadata = async () => {
  const i18n = await createI18nServerInstance();
  const title = i18n.t('agentguard:executionSessions.pageTitle');

  return {
    title,
  };
};

async function SessionsPage({ params, searchParams }: SessionsPageProps) {
  const { account } = await params;
  const filters = await searchParams;
  const orgId = await resolveOrgId(account);

  const page = Math.max(1, parseInt(filters.page ?? '1', 10) || 1);

  const [sessionsResult, agentsResult] = await Promise.all([
    loadSessionList(orgId, {
      agentId: filters.agent,
      status: filters.status as 'healthy' | 'degraded' | 'risky' | undefined,
      timeRange: filters.timeRange as '24h' | '7d' | '30d' | undefined,
      page,
    }),
    getAgentGuardPool().query<{ agent_id: string; name: string }>(
      'SELECT agent_id, name FROM agents WHERE org_id = $1 ORDER BY name',
      [orgId],
    ),
  ]);

  return (
    <>
      <TeamAccountLayoutPageHeader
        account={account}
        title={<Trans i18nKey={'agentguard:executionSessions.pageTitle'} />}
        description={<AppBreadcrumbs />}
      />

      <PageBody>
        <ExecutionSessionsDashboard
          sessions={sessionsResult.rows}
          accountSlug={account}
          agents={agentsResult.rows}
          page={page}
          pageCount={sessionsResult.pageCount}
        />
      </PageBody>
    </>
  );
}

export default withI18n(SessionsPage);
