import { AppBreadcrumbs } from '@kit/ui/app-breadcrumbs';
import { PageBody } from '@kit/ui/page';
import { Trans } from '@kit/ui/trans';

import { resolveOrgId } from '~/lib/agentguard/resolve-org-id';
import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';

import { TeamAccountLayoutPageHeader } from '../../_components/team-account-layout-page-header';
import AlertRulesTable from './_components/alert-rules-table';
import IntegrationsTable from './_components/integrations-table';
import {
  loadAlertRules,
  loadConnections,
} from './_lib/server/integrations.loader';

export const generateMetadata = async () => {
  const i18n = await createI18nServerInstance();
  const title = i18n.t('agentguard:integrations.pageTitle');

  return { title };
};

interface IntegrationsPageProps {
  params: Promise<{ account: string }>;
}

async function IntegrationsPage(props: IntegrationsPageProps) {
  const { account } = await props.params;
  const orgId = await resolveOrgId(account);

  const [connections, alertRules] = await Promise.all([
    loadConnections(orgId),
    loadAlertRules(orgId),
  ]);

  return (
    <>
      <TeamAccountLayoutPageHeader
        account={account}
        title={<Trans i18nKey={'agentguard:integrations.pageTitle'} />}
        description={<AppBreadcrumbs />}
      />

      <PageBody>
        <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col space-y-8">
          <IntegrationsTable connections={connections} accountSlug={account} />

          <AlertRulesTable
            alertRules={alertRules}
            connections={connections}
            accountSlug={account}
          />
        </div>
      </PageBody>
    </>
  );
}

export default withI18n(IntegrationsPage);
