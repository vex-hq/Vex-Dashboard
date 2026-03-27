import { AppBreadcrumbs } from '@kit/ui/app-breadcrumbs';
import { PageBody } from '@kit/ui/page';
import { Trans } from '@kit/ui/trans';

import { resolveOrgId } from '~/lib/agentguard/resolve-org-id';
import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';

import { TeamAccountLayoutPageHeader } from '../_components/team-account-layout-page-header';
import { loadDatasets } from '../experiments/_lib/server/experiments.loader';
import CreateDatasetDialog from './_components/create-dataset-dialog';
import DatasetsTable from './_components/datasets-table';

export const generateMetadata = async () => {
  const i18n = await createI18nServerInstance();
  const title = i18n.t('agentguard:datasets.pageTitle');

  return { title };
};

interface DatasetsPageProps {
  params: Promise<{ account: string }>;
}

async function DatasetsPage(props: DatasetsPageProps) {
  const { account } = await props.params;
  const orgId = await resolveOrgId(account);

  const datasets = await loadDatasets(orgId);

  return (
    <>
      <TeamAccountLayoutPageHeader
        account={account}
        title={<Trans i18nKey={'agentguard:datasets.pageTitle'} />}
        description={<AppBreadcrumbs />}
      />

      <PageBody>
        <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col space-y-8">
          <DatasetsTable datasets={datasets} accountSlug={account} />

          <div className="flex justify-end">
            <CreateDatasetDialog accountSlug={account} />
          </div>
        </div>
      </PageBody>
    </>
  );
}

export default withI18n(DatasetsPage);
