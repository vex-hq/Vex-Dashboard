import { AppBreadcrumbs } from '@kit/ui/app-breadcrumbs';
import { PageBody } from '@kit/ui/page';
import { Trans } from '@kit/ui/trans';

import { resolveOrgId } from '~/lib/agentguard/resolve-org-id';
import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';

import { TeamAccountLayoutPageHeader } from '../_components/team-account-layout-page-header';
import { CreateExperimentDialog } from './_components/create-experiment-dialog';
import { ExperimentsTable } from './_components/experiments-table';
import {
  loadDatasets,
  loadExperiments,
} from './_lib/server/experiments.loader';

export const generateMetadata = async () => {
  const i18n = await createI18nServerInstance();
  const title = i18n.t('agentguard:experiments.pageTitle');

  return { title };
};

interface ExperimentsPageProps {
  params: Promise<{ account: string }>;
}

async function ExperimentsPage(props: ExperimentsPageProps) {
  const { account } = await props.params;
  const orgId = await resolveOrgId(account);

  const [experiments, datasets] = await Promise.all([
    loadExperiments(orgId),
    loadDatasets(orgId),
  ]);

  return (
    <>
      <TeamAccountLayoutPageHeader
        account={account}
        title={<Trans i18nKey={'agentguard:experiments.pageTitle'} />}
        description={<AppBreadcrumbs />}
      />

      <PageBody>
        <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col space-y-8">
          <ExperimentsTable experiments={experiments} accountSlug={account} />

          <CreateExperimentDialog accountSlug={account} datasets={datasets} />
        </div>
      </PageBody>
    </>
  );
}

export default withI18n(ExperimentsPage);
