import { use } from 'react';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { z } from 'zod';

import { TeamAccountWorkspaceContextProvider } from '@kit/team-accounts/components';
import { Page, PageMobileNavigation, PageNavigation } from '@kit/ui/page';
import { SidebarProvider } from '@kit/ui/shadcn-sidebar';

import { AppLogo } from '~/components/app-logo';
import { getTeamAccountSidebarConfig } from '~/config/team-account-navigation.config';
import { loadWorkspaceEntryRedirect } from '~/lib/agentguard/member-onboarding.loader';
import { withI18n } from '~/lib/i18n/with-i18n';

import { PersistLastAccount } from './_components/persist-last-account';
// local imports
import { TeamAccountLayoutMobileNavigation } from './_components/team-account-layout-mobile-navigation';
import { resolveOrgId } from '~/lib/agentguard/resolve-org-id';

import { TeamAccountLayoutSidebar } from './_components/team-account-layout-sidebar';
import { loadShellNavCounts } from './_lib/server/shell-stats.loader';
import { TeamAccountNavigationMenu } from './_components/team-account-navigation-menu';
import { loadTeamWorkspace } from './_lib/server/team-account-workspace.loader';

type TeamWorkspaceLayoutProps = React.PropsWithChildren<{
  params: Promise<{ account: string }>;
}>;

function TeamWorkspaceLayout({ children, params }: TeamWorkspaceLayoutProps) {
  const account = use(params).account;

  const entry = use(checkWorkspaceEntry(account));

  if (entry) {
    redirect(entry);
  }

  const state = use(getLayoutState(account));

  if (state.style === 'sidebar') {
    return (
      <>
        <PersistLastAccount account={account} />
        <SidebarLayout account={account}>{children}</SidebarLayout>
      </>
    );
  }

  return (
    <>
      <PersistLastAccount account={account} />
      <HeaderLayout account={account}>{children}</HeaderLayout>
    </>
  );
}

async function checkWorkspaceEntry(account: string) {
  return loadWorkspaceEntryRedirect(account);
}

async function SidebarLayout({
  account,
  children,
}: React.PropsWithChildren<{
  account: string;
}>) {
  const [data, state] = await Promise.all([
    loadTeamWorkspace(account),
    getLayoutState(account),
  ]);

  if (!data) {
    redirect('/');
  }

  const accounts = data.accounts.map(({ name, slug, picture_url }) => ({
    label: name,
    value: slug,
    image: picture_url,
  }));

  return (
    <TeamAccountWorkspaceContextProvider value={data}>
      <SidebarProvider defaultOpen={state.open}>
        <Page style={'sidebar'}>
          <PageNavigation>
            <TeamAccountLayoutSidebar
              account={account}
              accountId={data.account.id}
              accounts={accounts}
              user={data.user}
              counts={await loadSidebarCounts(account, data.user.id)}
            />
          </PageNavigation>

          <PageMobileNavigation className={'flex items-center justify-between'}>
            <AppLogo />

            <div className={'flex space-x-4'}>
              <TeamAccountLayoutMobileNavigation
                userId={data.user.id}
                accounts={accounts}
                account={account}
              />
            </div>
          </PageMobileNavigation>

          {children}
        </Page>
      </SidebarProvider>
    </TeamAccountWorkspaceContextProvider>
  );
}

function HeaderLayout({
  account,
  children,
}: React.PropsWithChildren<{
  account: string;
}>) {
  const data = use(loadTeamWorkspace(account));

  const accounts = data.accounts.map(({ name, slug, picture_url }) => ({
    label: name,
    value: slug,
    image: picture_url,
  }));

  return (
    <TeamAccountWorkspaceContextProvider value={data}>
      <Page style={'header'}>
        <PageNavigation>
          <TeamAccountNavigationMenu workspace={data} />
        </PageNavigation>

        <PageMobileNavigation className={'flex items-center justify-between'}>
          <AppLogo />

          <div className={'group-data-[mobile:hidden]'}>
            <TeamAccountLayoutMobileNavigation
              userId={data.user.id}
              accounts={accounts}
              account={account}
            />
          </div>
        </PageMobileNavigation>

        {children}
      </Page>
    </TeamAccountWorkspaceContextProvider>
  );
}

/**
 * The nav counts, resolved once per request.
 *
 * Wrapped so a failure degrades to a nav with no badges rather than an error
 * boundary swallowing every page in the account — the sidebar renders on all
 * of them. `loadShellNavCounts` already catches its own query errors; this
 * catches everything upstream of them, org resolution included.
 */
async function loadSidebarCounts(account: string, userId: string) {
  try {
    const orgId = await resolveOrgId(account);

    return await loadShellNavCounts(orgId, userId);
  } catch (error) {
    console.error('[shell] sidebar counts failed; rendering without badges', {
      error: error instanceof Error ? error.message : String(error),
    });

    return undefined;
  }
}

async function getLayoutState(account: string) {
  const cookieStore = await cookies();
  const config = getTeamAccountSidebarConfig(account);

  const LayoutStyleSchema = z
    .enum(['sidebar', 'header', 'custom'])
    .default(config.style);

  const sidebarOpenCookie = cookieStore.get('sidebar:state');
  const layoutCookie = cookieStore.get('layout-style');

  const layoutStyle = LayoutStyleSchema.safeParse(layoutCookie?.value);

  const sidebarOpenCookieValue = sidebarOpenCookie
    ? sidebarOpenCookie.value === 'false'
    : !config.sidebarCollapsed;

  const style = layoutStyle.success ? layoutStyle.data : config.style;

  return {
    open: sidebarOpenCookieValue,
    style,
  };
}

export default withI18n(TeamWorkspaceLayout);
