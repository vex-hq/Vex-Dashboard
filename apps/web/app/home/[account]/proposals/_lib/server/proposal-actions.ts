'use server';

import { revalidatePath } from 'next/cache';

import { enhanceAction } from '@kit/next/actions';
import { getLogger } from '@kit/shared/logger';

import { loadAccountViewer } from '~/home/[account]/_lib/server/account-viewer';
import {
  approveProposal,
  rejectProposal,
} from '~/lib/agentguard/proposal-decisions';
import { resolveOrgId } from '~/lib/agentguard/resolve-org-id';

import { DecideProposalSchema } from '../../../context/_lib/schema/context.schema';

/**
 * Approve and reject: the two writes the proposals queue makes.
 *
 * Same two guards as the context actions, in the same order:
 * `resolveOrgId(accountSlug)` asserts account membership (tenancy), then
 * `loadAccountViewer` resolves the acting user from the session. The decider's
 * id is never taken from the payload — it is recorded in `decided_by`, and a
 * client-supplied one would make the review queue's accountability trail
 * forgeable.
 *
 * The check-and-set claim and the revert-on-failed-apply live in
 * `lib/agentguard/proposal-decisions.ts`, not here. An action-layer "is it
 * still open?" would be a TOCTOU check; the guard has to be the UPDATE itself.
 */

export const approveProposalAction = enhanceAction(
  async (data) => {
    const [orgId, viewer] = await Promise.all([
      resolveOrgId(data.accountSlug),
      loadAccountViewer(data.accountSlug),
    ]);

    const result = await approveProposal({
      orgId,
      proposalId: data.proposalId,
      userId: viewer.userId,
    });

    const logger = await getLogger();

    logger.info(
      {
        name: 'proposals.approve',
        orgId,
        proposalId: data.proposalId,
        actorUserId: viewer.userId,
        decided: result.decided,
        surface: 'dashboard',
      },
      'Proposal approval attempted',
    );

    revalidatePath(`/home/${data.accountSlug}/proposals`);

    return result;
  },
  { schema: DecideProposalSchema },
);

export const rejectProposalAction = enhanceAction(
  async (data) => {
    const [orgId, viewer] = await Promise.all([
      resolveOrgId(data.accountSlug),
      loadAccountViewer(data.accountSlug),
    ]);

    const result = await rejectProposal({
      orgId,
      proposalId: data.proposalId,
      userId: viewer.userId,
    });

    const logger = await getLogger();

    logger.info(
      {
        name: 'proposals.reject',
        orgId,
        proposalId: data.proposalId,
        actorUserId: viewer.userId,
        decided: result.decided,
        surface: 'dashboard',
      },
      'Proposal rejection attempted',
    );

    revalidatePath(`/home/${data.accountSlug}/proposals`);

    return result;
  },
  { schema: DecideProposalSchema },
);
