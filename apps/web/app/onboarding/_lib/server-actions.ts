'use server';

import { z } from 'zod';

import { enhanceAction } from '@kit/next/actions';
import { requireUser } from '@kit/supabase/require-user';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { checkInvitationPermissions } from '@kit/team-accounts/permissions/invitation-permissions';
import { createAccountInvitationsService } from '@kit/team-accounts/services/account-invitations.service';

import { createKey, listKeys, revokeKey } from '~/lib/agentguard/api-keys';
import { FINAL_ONBOARDING_STEP } from '~/lib/agentguard/onboarding.constants';
import {
  completeOnboarding,
  updateOnboardingStep,
} from '~/lib/agentguard/onboarding.loader';
import {
  requireAccountMembership,
  requireMemberAccountId,
} from '~/lib/agentguard/require-account-membership';
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
  // The wizard's goNext persists every non-terminal transition, so the highest
  // value sent is the final step index. Bound derives from the shared
  // onboarding step count so this can't drift when the wizard length changes.
  step: z.number().min(0).max(FINAL_ONBOARDING_STEP),
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

    // SECURITY: `accountSlug` comes from the client and the invitations below
    // are written with the SERVICE-ROLE admin client, which bypasses RLS.
    // Authorise in two stages before touching that client — mirroring
    // MakerKit's own `createInvitationsAction`:
    //
    //   1. Membership: resolve the slug to an account id under the RLS-scoped
    //      user client. A non-member cannot read the row, so this fails closed.
    //   2. Permission + role hierarchy: the caller must hold `invites.manage`
    //      on that account and may not invite anyone to a role more elevated
    //      than their own (otherwise a plain member could invite themselves as
    //      an owner).
    const accountId = await requireMemberAccountId(data.accountSlug);

    const permissions = await checkInvitationPermissions(
      accountId,
      user.id,
      data.invites,
    );

    if (!permissions.allowed) {
      throw new Error(
        permissions.reason ?? 'You do not have permission to invite members',
      );
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

    return { success: true };
  },
  {
    schema: CompleteOnboardingSchema,
  },
);
