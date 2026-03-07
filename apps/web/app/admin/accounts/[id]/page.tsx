import { cache } from 'react';

import { AdminAccountPage } from '@kit/admin/components/admin-account-page';
import { AdminGuard } from '@kit/admin/components/admin-guard';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { PlanManagement } from './_components/plan-management';

interface Params {
  params: Promise<{
    id: string;
  }>;
}

export const generateMetadata = async (props: Params) => {
  const params = await props.params;
  const account = await loadAccount(params.id);

  return {
    title: `Admin | ${account.name}`,
  };
};

async function AccountPage(props: Params) {
  const params = await props.params;
  const account = await loadAccount(params.id);

  return (
    <>
      <AdminAccountPage account={account} />
      <div className="mx-auto max-w-4xl px-4 py-6">
        <PlanManagement
          accountId={account.id}
          currentPlan={(account.vex_plan ?? 'free') as 'free' | 'starter' | 'pro' | 'team' | 'enterprise'}
          currentOverrides={
            account.vex_plan_overrides as Record<string, number> | null
          }
        />
      </div>
    </>
  );
}

export default AdminGuard(AccountPage);

const loadAccount = cache(accountLoader);

async function accountLoader(id: string) {
  const client = getSupabaseServerClient();

  const { data, error } = await client
    .from('accounts')
    .select('*, memberships: accounts_memberships (*)')
    .eq('id', id)
    .single();

  if (error) {
    throw error;
  }

  return data;
}
