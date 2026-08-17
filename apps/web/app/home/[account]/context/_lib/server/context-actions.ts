'use server';

import { revalidatePath } from 'next/cache';

import { enhanceAction } from '@kit/next/actions';
import { getLogger } from '@kit/shared/logger';

import { loadAccountViewer } from '~/home/[account]/_lib/server/account-viewer';
import { demoteMemory, promoteMemory } from '~/lib/agentguard/memory-promotion';
import { resolveOrgId } from '~/lib/agentguard/resolve-org-id';

import {
  ShareMemorySchema,
  UnshareMemorySchema,
} from '../schema/context.schema';

/**
 * Share and un-share: the two writes the context split makes.
 *
 * Two guards apply to both, in this order and always in this order:
 *
 *  1. `resolveOrgId(accountSlug)` asserts the caller is a member of the
 *     account. The slug arrives from the client, so this is the tenancy gate
 *     and it runs before anything reads or writes a memory row.
 *  2. `loadAccountViewer(accountSlug)` resolves WHO is acting, from the
 *     Supabase session. The user id is never taken from the payload — see
 *     `context.schema.ts`.
 *
 * The ownership check itself is NOT here. It lives in the SQL of
 * `lib/agentguard/memory-promotion.ts`, where the predicate is part of the
 * SELECT and repeated in the UPDATE, so a row belonging to somebody else is
 * never fetched, let alone modified. An action-layer `if` would be a second
 * place the rule lives and a second place it can be forgotten.
 *
 * Both actions return the primitive's own result rather than throwing on a
 * refusal: `not_found` is the answer for "not yours" AND for "no such id", and
 * turning it into an exception would make the two distinguishable by timing
 * and stack shape. The client renders a single "couldn't share that" line for
 * every refusal.
 */

export const shareMemoryAction = enhanceAction(
  async (data) => {
    const [orgId, viewer] = await Promise.all([
      resolveOrgId(data.accountSlug),
      loadAccountViewer(data.accountSlug),
    ]);

    const result = await promoteMemory({
      orgId,
      memoryId: data.memoryId,
      userId: viewer.userId,
      to: data.to,
    });

    const logger = await getLogger();

    logger.info(
      {
        name: 'context.share',
        orgId,
        memoryId: data.memoryId,
        to: data.to,
        actorUserId: viewer.userId,
        shared: result.shared,
        surface: 'dashboard',
      },
      'Memory share attempted',
    );

    revalidatePath(`/home/${data.accountSlug}/context`);

    return result;
  },
  { schema: ShareMemorySchema },
);

export const unshareMemoryAction = enhanceAction(
  async (data) => {
    const [orgId, viewer] = await Promise.all([
      resolveOrgId(data.accountSlug),
      loadAccountViewer(data.accountSlug),
    ]);

    const result = await demoteMemory({
      orgId,
      memoryId: data.memoryId,
      userId: viewer.userId,
    });

    const logger = await getLogger();

    logger.info(
      {
        name: 'context.unshare',
        orgId,
        memoryId: data.memoryId,
        actorUserId: viewer.userId,
        reversed: result.reversed,
        surface: 'dashboard',
      },
      'Memory un-share attempted',
    );

    revalidatePath(`/home/${data.accountSlug}/context`);

    return result;
  },
  { schema: UnshareMemorySchema },
);
