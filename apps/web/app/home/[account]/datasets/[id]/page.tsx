import Link from 'next/link';
import { notFound } from 'next/navigation';

import { AppBreadcrumbs } from '@kit/ui/app-breadcrumbs';
import { Button } from '@kit/ui/button';
import { PageBody } from '@kit/ui/page';
import { Trans } from '@kit/ui/trans';

import { resolveOrgId } from '~/lib/agentguard/resolve-org-id';
import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';

import { TeamAccountLayoutPageHeader } from '../../_components/team-account-layout-page-header';
import { loadDataset } from '../../experiments/_lib/server/experiments.loader';
import { DatasetItemsTable } from './_components/dataset-items-table';
import { DeleteDatasetButton } from './_components/delete-dataset-button';

export const generateMetadata = async () => {
  const i18n = await createI18nServerInstance();
  const title = i18n.t('agentguard:datasets.pageTitle');

  return { title };
};

interface DatasetDetailPageProps {
  params: Promise<{ account: string; id: string }>;
}

async function DatasetDetailPage(props: DatasetDetailPageProps) {
  const { account, id } = await props.params;
  const orgId = await resolveOrgId(account);

  const dataset = await loadDataset(orgId, id);

  if (!dataset) {
    notFound();
  }

  const createdDate = new Date(dataset.created_at).toLocaleDateString();

  return (
    <>
      <TeamAccountLayoutPageHeader
        account={account}
        title={
          <Trans
            i18nKey="agentguard:datasets.detailTitle"
            values={{ name: dataset.name }}
          />
        }
        description={<AppBreadcrumbs />}
      />

      <PageBody>
        <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col space-y-6">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/home/${account}/datasets`}>
                <Trans i18nKey="agentguard:datasets.backToDatasets" />
              </Link>
            </Button>

            <div className="flex items-center gap-4">
              <p className="text-muted-foreground text-sm">
                <Trans
                  i18nKey="agentguard:datasets.detailDescription"
                  values={{
                    count: dataset.items.length,
                    date: createdDate,
                  }}
                />
              </p>

              <DeleteDatasetButton
                datasetId={dataset.id}
                datasetName={dataset.name}
                accountSlug={account}
              />
            </div>
          </div>

          <DatasetItemsTable items={dataset.items} datasetName={dataset.name} />
        </div>
      </PageBody>
    </>
  );
}

export default withI18n(DatasetDetailPage);
