import Link from 'next/link';

import { ArrowLeft } from 'lucide-react';

import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { AppBreadcrumbs } from '@kit/ui/app-breadcrumbs';
import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { PageBody } from '@kit/ui/page';
import { Trans } from '@kit/ui/trans';

import { formatTimestamp } from '~/lib/agentguard/formatters';
import { resolveOrgId } from '~/lib/agentguard/resolve-org-id';
import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';

import { TeamAccountLayoutPageHeader } from '../../_components/team-account-layout-page-header';
import { loadAccountViewer } from '../../_lib/server/account-viewer';
import {
  type ProjectAccess,
  loadVisibleProject,
} from '../../memory/_lib/server/project-memory.loader';
import {
  type ProjectMemberView,
  ProjectMembersCard,
} from '../_components/project-members-card';
import {
  loadMyProjectRole,
  loadProjectMembers,
} from '../_lib/server/projects.loader';
import { ProjectContextView } from './_components/context-view';
import { loadContextView } from './_lib/server/context-view.loader';

interface ProjectDetailPageProps {
  params: Promise<{ account: string; projectId: string }>;
}

export const generateMetadata = async () => {
  const i18n = await createI18nServerInstance();

  return { title: i18n.t('agentguard:projects.detailTitle') };
};

/**
 * One project: its origin, its counts and its members.
 *
 * `loadVisibleProject` returns null both for "no such project" and for "not
 * yours", so a non-member probing project ids learns nothing either way. The
 * page renders the same not-found state in both cases.
 *
 * Member emails come from Supabase (`get_account_members`) and are joined to
 * the engine's `project_members` rows in TypeScript. That join is display-only:
 * a project member whose org membership has since been removed still shows,
 * with their raw user id, rather than silently disappearing from the list an
 * admin needs in order to revoke them.
 */
async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { account, projectId } = await params;

  const [orgId, viewer] = await Promise.all([
    resolveOrgId(account),
    loadAccountViewer(account),
  ]);

  const access: ProjectAccess = viewer.isOrgAdmin
    ? { kind: 'admin' }
    : { kind: 'member', userId: viewer.userId };

  const project = await loadVisibleProject(orgId, projectId, access);

  if (!project) {
    return <ProjectNotFound account={account} />;
  }

  const client = getSupabaseServerClient();

  const [members, orgMembersResult, myRole, contextView] = await Promise.all([
    loadProjectMembers(project.id),
    client.rpc('get_account_members', { account_slug: account }),
    loadMyProjectRole(project.id, viewer.userId),
    loadContextView(orgId, project.id, access, viewer.userId),
  ]);

  // `loadVisibleProject` already gated on the same `access`, so a null here
  // should not happen in practice — but `loadContextView` runs its own
  // independent membership probe (see that file's header), and this page
  // mirrors its existing not-found behavior rather than inventing a new one
  // if the two ever disagree.
  if (!contextView) {
    return <ProjectNotFound account={account} />;
  }

  const orgMembers = (orgMembersResult.data ?? []).map((member) => ({
    user_id: member.user_id,
    email: member.email,
    name: member.name,
  }));

  const byUserId = new Map(
    orgMembers.map((member) => [member.user_id, member]),
  );

  const memberViews: ProjectMemberView[] = members.map((member) => ({
    user_id: member.user_id,
    role: member.role,
    email: byUserId.get(member.user_id)?.email ?? null,
    name: byUserId.get(member.user_id)?.name ?? null,
    granted_at: member.granted_at,
  }));

  // Org admins administer every project; otherwise you must be an admin ON the
  // project. The server actions repeat this check — this only hides controls.
  const canManage = viewer.isOrgAdmin || myRole === 'admin';

  return (
    <>
      <TeamAccountLayoutPageHeader
        account={account}
        title={project.display_name}
        description={<AppBreadcrumbs />}
      />

      <PageBody>
        <div className="animate-in fade-in flex flex-col gap-6 pb-36 duration-500">
          <BackLink account={account} />

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                <Trans i18nKey="agentguard:projects.overview" />
              </CardTitle>
            </CardHeader>

            <CardContent>
              <dl className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <Meta
                  labelKey="agentguard:projects.colOrigin"
                  value={project.git_remote ?? project.repo_root_path ?? '—'}
                  mono
                />
                <Meta
                  labelKey="agentguard:projects.colMembers"
                  value={String(project.member_count)}
                />
                <Meta
                  labelKey="agentguard:projects.colMemories"
                  // Visible to this viewer (org + own-private + project),
                  // not `project.memory_count` which only counts
                  // scope='project'. Auto-created repos land captures as
                  // private-with-project_id, so that column reads 0 here.
                  value={contextView.header.itemsTotal.toLocaleString()}
                />
                <Meta
                  labelKey="agentguard:projects.lastSeen"
                  value={
                    project.last_seen_at
                      ? formatTimestamp(project.last_seen_at)
                      : '—'
                  }
                />
              </dl>

              <div className="mt-4">
                <Button asChild variant="outline" size="sm">
                  <Link
                    href={`/home/${account}/memory?tab=projects&project=${project.id}`}
                  >
                    <Trans i18nKey="agentguard:projects.viewMemories" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <ProjectContextView view={contextView} />

          <ProjectMembersCard
            accountSlug={account}
            projectId={project.id}
            members={memberViews}
            orgMembers={orgMembers}
            canManage={canManage}
          />
        </div>
      </PageBody>
    </>
  );
}

function ProjectNotFound({ account }: { account: string }) {
  return (
    <>
      <TeamAccountLayoutPageHeader
        account={account}
        title={<Trans i18nKey={'agentguard:projects.detailTitle'} />}
        description={<AppBreadcrumbs />}
      />

      <PageBody>
        <BackLink account={account} />

        <p className="text-muted-foreground text-sm">
          <Trans i18nKey="agentguard:projects.notFound" />
        </p>
      </PageBody>
    </>
  );
}

function BackLink({ account }: { account: string }) {
  return (
    <div>
      <Button asChild variant="ghost" size="sm">
        <Link href={`/home/${account}/projects`}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          <Trans i18nKey="agentguard:projects.backToProjects" />
        </Link>
      </Button>
    </div>
  );
}

function Meta({
  labelKey,
  value,
  mono = false,
}: {
  labelKey: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-muted-foreground text-xs">
        <Trans i18nKey={labelKey} />
      </dt>
      <dd
        className={`text-foreground text-sm break-all ${mono ? 'font-mono text-xs' : ''}`}
      >
        {value}
      </dd>
    </div>
  );
}

export default withI18n(ProjectDetailPage);
