import 'server-only';

import { cache } from 'react';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

export interface OnboardingState {
  completed: boolean;
  currentStep: number;
}

/**
 * Load onboarding state for a team account by slug.
 *
 * Returns { completed: true, currentStep: 0 } if the account is not found
 * (treat unknown accounts as onboarded to avoid blocking).
 */
export const loadOnboardingState = cache(
  async (accountSlug: string): Promise<OnboardingState> => {
    const client = getSupabaseServerClient();

    const { data } = await client
      .from('accounts')
      .select('onboarding_completed, onboarding_step')
      .eq('slug', accountSlug)
      .single();

    if (!data) {
      return { completed: true, currentStep: 0 };
    }

    return {
      completed: data.onboarding_completed,
      currentStep: data.onboarding_step,
    };
  },
);

/**
 * Update onboarding progress for a team account.
 */
export async function updateOnboardingStep(
  accountSlug: string,
  step: number,
): Promise<void> {
  const client = getSupabaseServerClient();

  await client
    .from('accounts')
    .update({ onboarding_step: step })
    .eq('slug', accountSlug);
}

/**
 * Mark onboarding as completed for a team account.
 */
export async function completeOnboarding(accountSlug: string): Promise<void> {
  const client = getSupabaseServerClient();

  await client
    .from('accounts')
    .update({ onboarding_completed: true, onboarding_step: 5 })
    .eq('slug', accountSlug);
}
