'use server';

import { z } from 'zod';

import { enhanceAction } from '@kit/next/actions';
import { requireUser } from '@kit/supabase/require-user';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { createKey, listKeys, revokeKey } from '~/lib/agentguard/api-keys';
import { FINAL_ONBOARDING_STEP } from '~/lib/agentguard/onboarding.constants';
import {
  completeOnboarding,
  updateOnboardingStep,
} from '~/lib/agentguard/onboarding.loader';
import { requireAccountMembership } from '~/lib/agentguard/require-account-membership';
import { resolveOrgId } from '~/lib/agentguard/resolve-org-id';

import { activationHref } from './activation-landing';
import { loadLatestVisibleWrite } from './server/activation-landing.loader';

const CreateOnboardingKeySchema = z.object({
  accountSlug: z.string().min(1),
});

const UpdateStepSchema = z.object({
  accountSlug: z.string().min(1),
  // The wizard's goNext persists every non-terminal transition, so the highest
  // value sent is the final step index. Bound derives from the shared
  // onboarding step count so this can't drift when the wizard length changes.
  step: z.number().min(0).max(FINAL_ONBOARDING_STEP),
});

const CompleteOnboardingSchema = z.object({
  accountSlug: z.string().min(1),
});

export const createOnboardingKeyAction = enhanceAction(
  async (data) => {
    const client = getSupabaseServerClient();
    const { data: user } = await requireUser(client);

    if (!user) {
      throw new Error('Authentication required');
    }

    // SECURITY: `resolveOrgId` asserts the caller is a member of
    // `accountSlug` and throws otherwise, so the destructive revoke loop below
    // can never run against a workspace the caller does not belong to.
    const orgId = await resolveOrgId(data.accountSlug);

    // Revoke old onboarding keys to avoid hitting the limit
    const existingKeys = await listKeys(orgId);
    const oldOnboardingKeys = existingKeys.filter(
      (k) => k.name === 'Onboarding Key' && !k.revoked,
    );

    for (const old of oldOnboardingKeys) {
      await revokeKey(orgId, old.id);
    }

    const result = await createKey({
      orgId,
      name: 'Onboarding Key',
      scopes: ['ingest', 'verify', 'memory'],
      rateLimitRpm: 60,
      expiresAt: null,
      createdBy: user.id,
    });

    // Index of the RunLocal screen, where the key is minted. Persisting it here
    // means a user who mints a key and then refreshes resumes on RunLocal and
    // still sees the terminal command that screen exists to hand them. If the
    // screen order ever changes, this index must move with it.
    await updateOnboardingStep(data.accountSlug, 1);

    return { key: result.key, entry: result.entry };
  },
  {
    schema: CreateOnboardingKeySchema,
  },
);

export const updateOnboardingStepAction = enhanceAction(
  async (data) => {
    const client = getSupabaseServerClient();
    const { data: user } = await requireUser(client);

    if (!user) {
      throw new Error('Authentication required');
    }

    // `updateOnboardingStep` writes through the RLS-scoped user client, so a
    // non-member's write is already a silent no-op. Assert membership first so
    // the attempt fails loudly instead of appearing to succeed.
    await requireAccountMembership(data.accountSlug);

    await updateOnboardingStep(data.accountSlug, data.step);

    return { success: true };
  },
  {
    schema: UpdateStepSchema,
  },
);

export const completeOnboardingAction = enhanceAction(
  async (data) => {
    const client = getSupabaseServerClient();
    const { data: user } = await requireUser(client);

    if (!user) {
      throw new Error('Authentication required');
    }

    // See `updateOnboardingStepAction`: RLS already blocks the write, this
    // makes a non-member's attempt fail loudly rather than silently.
    await requireAccountMembership(data.accountSlug);

    await completeOnboarding(data.accountSlug);

    const hub = `/home/${data.accountSlug}`;

    try {
      const orgId = await resolveOrgId(data.accountSlug);
      const write = await loadLatestVisibleWrite(orgId, user.id);

      return { success: true, href: activationHref(data.accountSlug, write) };
    } catch {
      // Completing onboarding must not fail because the landing probe did.
      return { success: true, href: hub };
    }
  },
  {
    schema: CompleteOnboardingSchema,
  },
);
