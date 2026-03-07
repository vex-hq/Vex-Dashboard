import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { PageBody } from '@kit/ui/page';
import { Trans } from '@kit/ui/trans';

import pathsConfig from '~/config/paths.config';
import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';

// local imports
import { HomeLayoutPageHeader } from './_components/home-page-header';
import { loadUserWorkspace } from './_lib/server/load-user-workspace';

export const generateMetadata = async () => {
  const i18n = await createI18nServerInstance();
  const title = i18n.t('account:homePage');

  return {
    title,
  };
};

async function UserHomePage() {
  const [cookieStore, workspace] = await Promise.all([
    cookies(),
    loadUserWorkspace(),
  ]);

  // No team accounts exist — send user to create one
  if (workspace.accounts.length === 0) {
    redirect('/home/addworkspace');
  }

  // Redirect to last-visited account, or first account as fallback
  const lastAccount = cookieStore.get('last-account')?.value;
  const targetAccount =
    lastAccount ?? workspace.accounts[0]?.value ?? workspace.accounts[0]?.label;

  if (targetAccount) {
    redirect(pathsConfig.app.accountHome.replace('[account]', targetAccount));
  }

  // Should never reach here, but just in case
  redirect('/home/addworkspace');

  return null;
}

export default withI18n(UserHomePage);
