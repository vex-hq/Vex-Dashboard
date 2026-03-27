import { notFound } from 'next/navigation';

import { AppBreadcrumbs } from '@kit/ui/app-breadcrumbs';
import { PageBody } from '@kit/ui/page';
import { Trans } from '@kit/ui/trans';

import { resolveOrgId } from '~/lib/agentguard/resolve-org-id';
import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';

import { TeamAccountLayoutPageHeader } from '../../_components/team-account-layout-page-header';
import {
  loadCheckScores,
  loadExperiment,
  loadVariantMetrics,
} from '../_lib/server/experiments.loader';
import { ExperimentComparison } from './_components/experiment-comparison';
import { ExperimentDetailHeader } from './_components/experiment-detail-header';

interface ExperimentDetailPageProps {
  params: Promise<{ account: string; id: string }>;
}

export const generateMetadata = async () => {
  const i18n = await createI18nServerInstance();
  const title = i18n.t('agentguard:experiments.detailTitle');

  return { title };
};

async function ExperimentDetailPage({ params }: ExperimentDetailPageProps) {
  const { account, id } = await params;
  const orgId = await resolveOrgId(account);

  const [experiment, metrics, checkScores] = await Promise.all([
    loadExperiment(orgId, id),
    loadVariantMetrics(orgId, id),
    loadCheckScores(orgId, id),
  ]);

  if (!experiment) {
    notFound();
  }

  return (
    <>
      <TeamAccountLayoutPageHeader
        account={account}
        title={<Trans i18nKey={'agentguard:experiments.detailTitle'} />}
        description={<AppBreadcrumbs />}
      />

      <PageBody>
        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col space-y-8">
          <ExperimentDetailHeader
            experiment={experiment}
            accountSlug={account}
          />

          <ExperimentComparison
            experiment={experiment}
            metrics={metrics}
            checkScores={checkScores}
            accountSlug={account}
          />
        </div>
      </PageBody>
    </>
  );
}

export default withI18n(ExperimentDetailPage);
