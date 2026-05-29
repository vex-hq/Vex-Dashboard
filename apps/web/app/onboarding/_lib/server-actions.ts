'use server';

import { z } from 'zod';

import { enhanceAction } from '@kit/next/actions';
import { requireUser } from '@kit/supabase/require-user';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { createAccountInvitationsService } from '@kit/team-accounts/services/account-invitations.service';

import { createKey, listKeys, revokeKey } from '~/lib/agentguard/api-keys';
import {
  completeOnboarding,
  updateOnboardingStep,
} from '~/lib/agentguard/onboarding.loader';
import { resolveOrgId } from '~/lib/agentguard/resolve-org-id';

const SendInvitesSchema = z.object({
  accountSlug: z.string().min(1),
  invites: z.array(
    z.object({
      email: z.string().email(),
      role: z.enum(['owner', 'member']),
    }),
  ),
});

const CreateOnboardingKeySchema = z.object({
  accountSlug: z.string().min(1),
});

const UpdateStepSchema = z.object({
  accountSlug: z.string().min(1),
  step: z.number().min(0).max(3),
});

const CompleteOnboardingSchema = z.object({
  accountSlug: z.string().min(1),
});

export const sendInvitesAction = enhanceAction(
  async (data) => {
    const client = getSupabaseServerClient();
    const { data: user } = await requireUser(client);

    if (!user) {
      throw new Error('Authentication required');
    }

    // Use MakerKit's invitations service with admin client
    const adminClient = getSupabaseServerAdminClient();
    const service = createAccountInvitationsService(adminClient);

    await service.sendInvitations({
      accountSlug: data.accountSlug,
      invitations: data.invites.map((inv) => ({
        email: inv.email,
        role: inv.role,
      })),
      invitedBy: user.id,
    });

    await updateOnboardingStep(data.accountSlug, 1);

    return { success: true, count: data.invites.length };
  },
  {
    schema: SendInvitesSchema,
  },
);

export const createOnboardingKeyAction = enhanceAction(
  async (data) => {
    const client = getSupabaseServerClient();
    const { data: user } = await requireUser(client);

    if (!user) {
      throw new Error('Authentication required');
    }

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

    await updateOnboardingStep(data.accountSlug, 2);

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

    await completeOnboarding(data.accountSlug);

    return { success: true };
  },
  {
    schema: CompleteOnboardingSchema,
  },
);
