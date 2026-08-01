'use server';

import { revalidatePath } from 'next/cache';

import { enhanceAction } from '@kit/next/actions';
import { getLogger } from '@kit/shared/logger';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { loadAccountViewer } from '~/home/[account]/_lib/server/account-viewer';
import {
  createProject,
  grantProjectMember,
  revokeProjectMember,
} from '~/lib/agentguard/projects';
import { resolveOrgId } from '~/lib/agentguard/resolve-org-id';

import {
  AddProjectMemberSchema,
  CreateProjectSchema,
  RemoveProjectMemberSchema,
} from '../schema/project.schema';
import { loadMyProjectRole } from './projects.loader';

/**
 * Project write actions.
 *
 * Three guards apply to every membership change, in this order:
 *
 *  1. `resolveOrgId` asserts the caller is a member of the account. The slug
 *     arrives from the client, so this is the tenancy gate.
 *  2. The caller must ADMINISTER the project — either an org admin, or holding
 *     `project_members.role = 'admin'` on that project. Granting is not a
 *     general-purpose ACL tool; a caller can only widen access to something
 *     they already control.
 *  3. The grantee must already be a member of the ORG. Resolved against
 *     Supabase account membership and failing closed, so a project grant can
 *     never pull an outsider into an org's data.
 *
 * Every grant and revoke is audit-logged with who, what, when and via which
 * surface. NOTE: this writes to the application log, not to a durable audit
 * table — the engine has no audit table today, and adding one is an engine-side
 * change rather than something the dashboard should invent unilaterally.
 */

class ProjectPermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProjectPermissionError';
  }
}

/**
 * Assert the caller administers `projectId`, returning the org id.
 *
 * Org admins qualify by role. Everyone else must hold an `admin` membership
 * row on that specific project.
 */
async function requireProjectAdmin(accountSlug: string, projectId: string) {
  const [orgId, viewer] = await Promise.all([
    resolveOrgId(accountSlug),
    loadAccountViewer(accountSlug),
  ]);

  if (viewer.isOrgAdmin) {
    return { orgId, viewer };
  }

  const role = await loadMyProjectRole(projectId, viewer.userId);

  if (role !== 'admin') {
    throw new ProjectPermissionError(
      'Forbidden: you do not administer this project',
    );
  }

  return { orgId, viewer };
}

/**
 * Assert `userId` is a member of the team account, and return their email for
 * the audit line. Fails closed: an unknown user, an RPC error or a user in a
 * different account all reject.
 */
async function requireOrgMember(accountSlug: string, userId: string) {
  const client = getSupabaseServerClient();

  const { data, error } = await client.rpc('get_account_members', {
    account_slug: accountSlug,
  });

  if (error) {
    throw new ProjectPermissionError('Could not verify org membership');
  }

  const member = (data ?? []).find((row) => row.user_id === userId);

  if (!member) {
    throw new ProjectPermissionError(
      'Forbidden: that user is not a member of this workspace',
    );
  }

  return member;
}

export const createProjectAction = enhanceAction(
  async (data) => {
    const [orgId, viewer] = await Promise.all([
      resolveOrgId(data.accountSlug),
      loadAccountViewer(data.accountSlug),
    ]);

    const project = await createProject({
      orgId,
      displayName: data.displayName,
      gitRemote: data.gitRemote,
      repoRootPath: data.repoRootPath,
      createdByUserId: viewer.userId,
    });

    const logger = await getLogger();

    logger.info(
      {
        name: 'projects.create',
        orgId,
        projectId: project.id,
        actorUserId: viewer.userId,
        surface: 'dashboard',
      },
      'Project created',
    );

    revalidatePath(`/home/${data.accountSlug}/projects`);

    return { project };
  },
  { schema: CreateProjectSchema },
);

export const addProjectMemberAction = enhanceAction(
  async (data) => {
    const { orgId, viewer } = await requireProjectAdmin(
      data.accountSlug,
      data.projectId,
    );

    await requireOrgMember(data.accountSlug, data.userId);

    const granted = await grantProjectMember({
      orgId,
      projectId: data.projectId,
      userId: data.userId,
      role: data.role,
      grantedByUserId: viewer.userId,
    });

    if (!granted) {
      throw new Error('Project not found');
    }

    const logger = await getLogger();

    logger.info(
      {
        name: 'projects.grant',
        orgId,
        projectId: data.projectId,
        actorUserId: viewer.userId,
        targetUserId: data.userId,
        role: data.role,
        surface: 'dashboard',
      },
      'Project access granted',
    );

    revalidatePath(`/home/${data.accountSlug}/projects/${data.projectId}`);

    return { success: true };
  },
  { schema: AddProjectMemberSchema },
);

export const removeProjectMemberAction = enhanceAction(
  async (data) => {
    const { orgId, viewer } = await requireProjectAdmin(
      data.accountSlug,
      data.projectId,
    );

    const revoked = await revokeProjectMember({
      orgId,
      projectId: data.projectId,
      userId: data.userId,
    });

    if (!revoked) {
      throw new Error('Membership not found');
    }

    const logger = await getLogger();

    logger.info(
      {
        name: 'projects.revoke',
        orgId,
        projectId: data.projectId,
        actorUserId: viewer.userId,
        targetUserId: data.userId,
        surface: 'dashboard',
      },
      'Project access revoked',
    );

    revalidatePath(`/home/${data.accountSlug}/projects/${data.projectId}`);

    return { success: true };
  },
  { schema: RemoveProjectMemberSchema },
);
