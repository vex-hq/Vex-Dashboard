import { Trans } from '@kit/ui/trans';

import { resolveOrgId } from '~/lib/agentguard/resolve-org-id';
import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';

import { LinearPanel } from '../../_components/linear-panel';
import { loadAccountViewer } from '../../_lib/server/account-viewer';
import { loadContextUsage } from '../../_lib/server/context-usage.loader';
import { loadWorkspacePeople } from '../../_lib/server/workspace-people.loader';
import {
  loadProjectArtifacts,
  loadVisibleProject,
} from '../../memory/_lib/server/project-memory.loader';
import {
  loadMyProjectRole,
  loadProjectMembers,
} from '../_lib/server/projects.loader';
import type { ProjectAccess } from './_components/project-access-dialog';
import { ProjectIssues } from './_components/project-issues';
import { toProjectArtifacts } from './_lib/project-issues-model';
import { loadContextView } from './_lib/server/context-view.loader';

/** Artifacts are a first-class tab, so load more than the Memory card grid. */
const ARTIFACT_LIST_LIMIT = 100;

interface ProjectDetailPageProps {
  params: Promise<{ account: string; projectId: string }>;
}

export const generateMetadata = async () => {
  const i18n = await createI18nServerInstance();

  return { title: i18n.t('agentguard:projects.detailTitle') };
};

/**
 * One project as a Linear issue list. Issues are decisions and plans;
 * Activity is the fact log; Artifacts are files agents stored on the
 * project. Membership is decided in `loadVisibleProject` /
 * `loadContextView` — a non-member probing ids learns nothing either way.
 *
 * MEMBERSHIP-ONLY, NO ADMIN BYPASS (2026-08-12 ruling): `project_members` is
 * the only gate. An org admin who is not a member of this project gets the
 * same `ProjectNotFound` as anyone else — there is no `ProjectAccess.admin`
 * branch left to widen it.
 */
async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { account, projectId } = await params;

  const [orgId, viewer] = await Promise.all([
    resolveOrgId(account),
    loadAccountViewer(account),
  ]);

  const project = await loadVisibleProject(orgId, projectId, viewer.userId);

  if (!project) {
    return <ProjectNotFound />;
  }

  const [contextView, usage, artifactRows, memberRows, myRole, people] =
    await Promise.all([
      loadContextView(orgId, project.id, viewer.userId),
      loadContextUsage(orgId),
      loadProjectArtifacts(
        orgId,
        project.id,
        viewer.userId,
        ARTIFACT_LIST_LIMIT,
      ),
      loadProjectMembers(project.id),
      loadMyProjectRole(project.id, viewer.userId),
      loadWorkspacePeople(account),
    ]);

  // `loadVisibleProject` already gated on the same `access`, so a null here
  // should not happen in practice — but `loadContextView` runs its own
  // independent membership probe (see that file's header), and this page
  // mirrors its existing not-found behavior rather than inventing a new one
  // if the two ever disagree.
  if (!contextView) {
    return <ProjectNotFound />;
  }

  const recalled30d =
    usage.find((row) => row.projectId === project.id)?.recalls30d ?? 0;

  const access: ProjectAccess = {
    canManage: myRole === 'admin' || viewer.isOrgAdmin,
    members: memberRows.map((row) => {
      const person = people.get(row.user_id);
      const role = row.role === 'admin' ? 'admin' : 'member';

      return {
        userId: row.user_id,
        role,
        name: person?.name || person?.email || row.user_id,
        email: person?.email || null,
      };
    }),
    candidates: [...people.values()].map((person) => ({
      userId: person.userId,
      name: person.name,
      email: person.email,
    })),
  };

  return (
    <LinearPanel>
      <ProjectIssues
        view={contextView}
        artifacts={toProjectArtifacts(artifactRows)}
        projectName={project.display_name}
        accountSlug={account}
        projectId={project.id}
        recalled30d={recalled30d}
        access={access}
      />
    </LinearPanel>
  );
}

function ProjectNotFound() {
  return (
    <LinearPanel>
      <p className="text-muted-foreground px-5 py-8 text-sm">
        <Trans i18nKey="agentguard:projects.notFound" />
      </p>
    </LinearPanel>
  );
}

export default withI18n(ProjectDetailPage);
