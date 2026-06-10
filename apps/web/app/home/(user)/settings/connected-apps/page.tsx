import { use } from 'react';

import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { PageBody } from '@kit/ui/page';
import { Trans } from '@kit/ui/trans';

import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';
import { requireUserInServerComponent } from '~/lib/server/require-user-in-server-component';

import { HomeLayoutPageHeader } from '../../_components/home-page-header';
import ConnectedAppsTable from './_components/connected-apps-table';
import { loadConnectedApps } from './_lib/server/connected-apps.loader';

export const generateMetadata = async () => {
  const i18n = await createI18nServerInstance();
  const title = i18n.t('agentguard:connectedApps.pageTitle');

  return { title };
};

function ConnectedAppsPage() {
  // requireUserInServerComponent redirects to sign-in if unauthenticated.
  // RLS on oauth_grants scopes the query to this user automatically.
  use(requireUserInServerComponent());

  const client = getSupabaseServerClient();
  const apps = use(loadConnectedApps(client));

  return (
    <>
      <HomeLayoutPageHeader
        title={<Trans i18nKey="agentguard:connectedApps.pageTitle" />}
        description={
          <Trans i18nKey="agentguard:connectedApps.pageDescription" />
        }
      >
        <Trans i18nKey="agentguard:connectedApps.pageTitle" />
      </HomeLayoutPageHeader>

      <PageBody>
        <div className="animate-in fade-in flex flex-col space-y-6 pb-36 duration-500">
          <ConnectedAppsTable apps={apps} />
        </div>
      </PageBody>
    </>
  );
}

export default withI18n(ConnectedAppsPage);
