import { PageBody } from '@kit/ui/page';
import { Trans } from '@kit/ui/trans';

import { withI18n } from '~/lib/i18n/with-i18n';

import { TeamAccountLayoutPageHeader } from '../_components/team-account-layout-page-header';
import { DocsContent } from './_components/docs-content';

interface DocsPageProps {
  params: Promise<{ account: string }>;
}

export const generateMetadata = () => ({
  title: 'Documentation',
});

async function DocsPage({ params }: DocsPageProps) {
  const { account } = await params;

  return (
    <>
      <TeamAccountLayoutPageHeader
        account={account}
        title={<Trans i18nKey="agentguard:docs.pageTitle" />}
        description={<Trans i18nKey="agentguard:docs.pageDescription" />}
      />

      <PageBody>
        <DocsContent accountSlug={account} />
      </PageBody>
    </>
  );
}

export default withI18n(DocsPage);
