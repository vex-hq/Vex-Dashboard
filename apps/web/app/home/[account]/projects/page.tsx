import Link from 'next/link';

import { AppBreadcrumbs } from '@kit/ui/app-breadcrumbs';
import { Badge } from '@kit/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import { PageBody } from '@kit/ui/page';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';
import { Trans } from '@kit/ui/trans';

import { resolveOrgId } from '~/lib/agentguard/resolve-org-id';
import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';

import { TeamAccountLayoutPageHeader } from '../_components/team-account-layout-page-header';
import { loadAccountViewer } from '../_lib/server/account-viewer';
import {
  type ProjectAccess,
  loadVisibleProjects,
} from '../memory/_lib/server/project-memory.loader';
import { CreateProjectDialog } from './_components/create-project-dialog';

interface ProjectsPageProps {
  params: Promise<{ account: string }>;
}

export const generateMetadata = async () => {
  const i18n = await createI18nServerInstance();

  return { title: i18n.t('agentguard:projects.pageTitle') };
};

/**
 * `/home/[account]/projects` — the projects the caller may open.
 *
 * Members see the projects they hold a `project_members` row for; org admins
 * see every project in the org. Both come from `loadVisibleProjects`, whose
 * SQL differs per branch — the admin case is a different predicate, not a
 * post-filter.
 */
async function ProjectsPage({ params }: ProjectsPageProps) {
  const { account } = await params;

  const [orgId, viewer] = await Promise.all([
    resolveOrgId(account),
    loadAccountViewer(account),
  ]);

  const access: ProjectAccess = viewer.isOrgAdmin
    ? { kind: 'admin' }
    : { kind: 'member', userId: viewer.userId };

  const projects = await loadVisibleProjects(orgId, access);

  return (
    <>
      <TeamAccountLayoutPageHeader
        account={account}
        title={<Trans i18nKey={'agentguard:projects.pageTitle'} />}
        description={<AppBreadcrumbs />}
      />

      <PageBody>
        <div className="animate-in fade-in flex flex-col gap-4 pb-36 duration-500">
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-sm">
              <Trans
                i18nKey={
                  viewer.isOrgAdmin
                    ? 'agentguard:projects.pageDescriptionAdmin'
                    : 'agentguard:projects.pageDescription'
                }
              />
            </p>

            <CreateProjectDialog accountSlug={account} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                <Trans i18nKey="agentguard:projects.listTitle" />
              </CardTitle>
              <CardDescription>
                <Trans i18nKey="agentguard:projects.listDescription" />
              </CardDescription>
            </CardHeader>

            <CardContent>
              {projects.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  <Trans i18nKey="agentguard:projects.empty" />
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <Trans i18nKey="agentguard:projects.colName" />
                      </TableHead>
                      <TableHead>
                        <Trans i18nKey="agentguard:projects.colOrigin" />
                      </TableHead>
                      <TableHead className="text-right">
                        <Trans i18nKey="agentguard:projects.colMembers" />
                      </TableHead>
                      <TableHead className="text-right">
                        <Trans i18nKey="agentguard:projects.colMemories" />
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {projects.map((project) => (
                      <TableRow key={project.id}>
                        <TableCell>
                          <Link
                            href={`/home/${account}/projects/${project.id}`}
                            className="hover:text-primary font-medium"
                          >
                            {project.display_name}
                          </Link>
                        </TableCell>
                        <TableCell
                          className="text-muted-foreground max-w-md truncate font-mono text-xs"
                          title={
                            project.git_remote ??
                            project.repo_root_path ??
                            undefined
                          }
                        >
                          {project.git_remote ?? project.repo_root_path ?? '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary" className="font-normal">
                            {project.member_count}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {project.memory_count.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </PageBody>
    </>
  );
}

export default withI18n(ProjectsPage);
