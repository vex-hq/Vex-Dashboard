import { BookOpen, MessageSquareHeart } from 'lucide-react';

import { JWTUserData } from '@kit/supabase/types';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from '@kit/ui/shadcn-sidebar';

import { ProfileAccountDropdownContainer } from '~/components//personal-account-dropdown-container';
import { FeaturebaseMessenger } from '~/components/featurebase-messenger';
import { LiveSupportButton } from '~/components/live-support-button';
import featureFlagsConfig from '~/config/feature-flags.config';
import pathsConfig from '~/config/paths.config';
import { getTeamAccountSidebarConfig } from '~/config/team-account-navigation.config';
import { TeamAccountAccountsSelector } from '../_components/team-account-accounts-selector';
import { TeamAccountLayoutSidebarNavigation } from './team-account-layout-sidebar-navigation';

type AccountModel = {
  label: string | null;
  value: string | null;
  image: string | null;
};

export function TeamAccountLayoutSidebar(props: {
  account: string;
  accountId: string;
  accounts: AccountModel[];
  user: JWTUserData;
}) {
  return (
    <SidebarContainer
      account={props.account}
      accountId={props.accountId}
      accounts={props.accounts}
      user={props.user}
    />
  );
}

function getDropdownLinks(account: string) {
  const links: Array<{ label: string; href: string; icon: string }> = [
    {
      label: 'common:routes.settings',
      href: pathsConfig.app.accountSettings.replace('[account]', account),
      icon: 'settings',
    },
    {
      label: 'common:routes.members',
      href: pathsConfig.app.accountMembers.replace('[account]', account),
      icon: 'users',
    },
    {
      label: 'agentguard:nav.apiKeys',
      href: pathsConfig.app.accountApiKeys.replace('[account]', account),
      icon: 'key',
    },
  ];

  if (featureFlagsConfig.enableTeamAccountBilling) {
    links.push({
      label: 'common:routes.billing',
      href: pathsConfig.app.accountBilling.replace('[account]', account),
      icon: 'credit-card',
    });
  }

  return links;
}

function SidebarContainer(props: {
  account: string;
  accountId: string;
  accounts: AccountModel[];
  user: JWTUserData;
}) {
  const { account, accounts, user } = props;
  const userId = user.id;

  const config = getTeamAccountSidebarConfig(account);
  const collapsible = config.sidebarCollapsedStyle;
  const dropdownLinks = getDropdownLinks(account);

  return (
    <Sidebar collapsible={collapsible}>
      <SidebarHeader>
        <div className={'flex items-center justify-between gap-x-1'}>
          <TeamAccountAccountsSelector
            userId={userId}
            selectedAccount={account}
            accounts={accounts}
          />

          {/* <div className={'group-data-[minimized=true]/sidebar:hidden'}>
            <TeamAccountNotifications
              userId={userId}
              accountId={props.accountId}
            />
          </div> */}
        </div>
      </SidebarHeader>

      <SidebarContent className={'flex-1 overflow-y-auto'}>
        <TeamAccountLayoutSidebarNavigation config={config} />
      </SidebarContent>

      <SidebarFooter>
        <SidebarContent>
          <FeaturebaseMessenger
            email={user.email}
            userId={userId}
            userName={
              (user.user_metadata?.display_name as string) ?? user.email
            }
          />

          <a
            href="https://docs.tryvex.dev/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:bg-secondary hover:text-foreground flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors group-data-[minimized=true]/sidebar:justify-center"
          >
            <BookOpen className="h-5 w-5" />
            <span className="group-data-[minimized=true]/sidebar:hidden">
              Docs
            </span>
          </a>

          <LiveSupportButton />

          <a
            href="https://vex.featurebase.app"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:bg-secondary hover:text-foreground flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors group-data-[minimized=true]/sidebar:justify-center"
          >
            <MessageSquareHeart className="h-5 w-5" />
            <span className="group-data-[minimized=true]/sidebar:hidden">
              Feedback
            </span>
          </a>

          <ProfileAccountDropdownContainer
            user={props.user}
            links={dropdownLinks}
          />
        </SidebarContent>
      </SidebarFooter>
    </Sidebar>
  );
}
