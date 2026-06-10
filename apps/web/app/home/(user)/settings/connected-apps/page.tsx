import { use } from 'react';

import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { PageBody } from '@kit/ui/page';

import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';
import { requireUserInServerComponent } from '~/lib/server/require-user-in-server-component';

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

  // The (user)/settings layout already renders the page header; this page
  // contributes body content only (same pattern as the settings root page).
  return (
    <PageBody>
      <div className="animate-in fade-in flex flex-col space-y-6 pb-36 duration-500">
        <ConnectedAppsTable apps={apps} />
      </div>
    </PageBody>
  );
}

export default withI18n(ConnectedAppsPage);
