import { redirect } from 'next/navigation';

import { requireUser } from '@kit/supabase/require-user';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { loadMemberOnboarded } from '~/lib/agentguard/member-onboarding.loader';
import { loadOnboardingState } from '~/lib/agentguard/onboarding.loader';
import { requireMemberAccountId } from '~/lib/agentguard/require-account-membership';
import { withI18n } from '~/lib/i18n/with-i18n';

import { JoinWizard } from './_components/join-wizard';

interface JoinOnboardingPageProps {
  searchParams: Promise<{ account?: string }>;
}

async function JoinOnboardingPage({ searchParams }: JoinOnboardingPageProps) {
  const { account } = await searchParams;

  if (!account) {
    redirect('/home');
  }

  const client = getSupabaseServerClient();
  const { data: user } = await requireUser(client);

  if (!user) {
    redirect('/auth/sign-in');
  }

  await requireMemberAccountId(account);

  const [workspace, memberOnboarded, accountRow] = await Promise.all([
    loadOnboardingState(account),
    loadMemberOnboarded(account),
    client
      .from('accounts')
      .select('name, primary_owner_user_id')
      .eq('slug', account)
      .maybeSingle(),
  ]);

  if (
    !workspace.completed &&
    accountRow.data?.primary_owner_user_id === user.id
  ) {
    redirect(`/onboarding?account=${account}`);
  }

  if (memberOnboarded) {
    redirect(`/home/${account}`);
  }

  return (
    <JoinWizard
      accountSlug={account}
      workspaceName={accountRow.data?.name ?? account}
    />
  );
}

export default withI18n(JoinOnboardingPage);
