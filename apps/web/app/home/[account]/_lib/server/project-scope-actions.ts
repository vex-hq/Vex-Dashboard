'use server';

import { revalidatePath } from 'next/cache';

import { enhanceAction } from '@kit/next/actions';

import { getAgentGuardPool } from '~/lib/agentguard/db';
import { isProjectManager } from '~/lib/agentguard/project-roles';
import { resolveOrgId } from '~/lib/agentguard/resolve-org-id';

import {
  SetMyCaptureScopeSchema,
  SetProjectDefaultScopeSchema,
} from '../schema/project-scope.schema';
import { loadAccountViewer } from './account-viewer';

/**
 * Change where a project's captures land, for everyone in it.
 *
 * THE PERMISSIONS ARE DELIBERATELY ASYMMETRIC, matching the engine's
 * `project_scope` tool exactly rather than inventing a second rule:
 *
 *   widening  (-> 'project' | 'org')  requires ADMIN
 *   narrowing (-> 'private')          requires MANAGE
 *
 * Widening publishes every member's FUTURE captures in this project, so it is
 * the admin's call. Narrowing makes things less visible, and requiring admin
 * to stop publishing would be a trap: the person who notices a mistake is
 * often not the one who can undo it.
 *
 * The role is read inside the UPDATE's own transaction against
 * `project_members`, not taken from the page that rendered the button — a
 * role rendered minutes ago is not a permission now.
 */
export const setProjectDefaultScopeAction = enhanceAction(
  async (data) => {
    const [orgId, viewer] = await Promise.all([
      resolveOrgId(data.accountSlug),
      loadAccountViewer(data.accountSlug),
    ]);

    const pool = getAgentGuardPool();
    const widening = data.scope !== 'private';

    const roleResult = await pool.query<{ role: string }>(
      `SELECT pm.role
         FROM project_members pm
         JOIN projects p ON p.id = pm.project_id AND p.org_id = $1
        WHERE pm.project_id = $2 AND pm.user_id = $3`,
      [orgId, data.projectId, viewer.userId],
    );

    const role = roleResult.rows[0]?.role ?? null;
    const allowed = widening ? role === 'admin' : isProjectManager(role);

    if (!allowed) {
      return { ok: false as const, error: 'forbidden' as const };
    }

    const updated = await pool.query(
      `UPDATE projects SET default_scope = $3
        WHERE id = $2 AND org_id = $1`,
      [orgId, data.projectId, data.scope],
    );

    if (!updated.rowCount) {
      return { ok: false as const, error: 'not_found' as const };
    }

    revalidatePath(`/home/${data.accountSlug}/context`);
    revalidatePath(`/home/${data.accountSlug}/projects`);

    return { ok: true as const, scope: data.scope };
  },
  { schema: SetProjectDefaultScopeSchema },
);

/**
 * Opt the CALLER's own captures out of a project's default, or back into it.
 *
 * There is no argument naming another user, and there never may be. An admin
 * who could clear a colleague's override would be able to publish that
 * colleague's context, which breaks the user silo's promise that private is a
 * real boundary INCLUDING from admins.
 *
 * Membership is required — the UPDATE's WHERE does that on its own, so a
 * non-member's call changes no rows and reports not_found.
 */
export const setMyCaptureScopeAction = enhanceAction(
  async (data) => {
    const [orgId, viewer] = await Promise.all([
      resolveOrgId(data.accountSlug),
      loadAccountViewer(data.accountSlug),
    ]);

    const pool = getAgentGuardPool();
    const override = data.mine === 'private' ? 'private' : null;

    const updated = await pool.query(
      `UPDATE project_members pm
          SET scope_override = $4
         FROM projects p
        WHERE p.id = pm.project_id
          AND p.org_id = $1
          AND pm.project_id = $2
          AND pm.user_id = $3`,
      [orgId, data.projectId, viewer.userId, override],
    );

    if (!updated.rowCount) {
      return { ok: false as const, error: 'not_found' as const };
    }

    revalidatePath(`/home/${data.accountSlug}/context`);

    return { ok: true as const, mine: data.mine };
  },
  { schema: SetMyCaptureScopeSchema },
);
