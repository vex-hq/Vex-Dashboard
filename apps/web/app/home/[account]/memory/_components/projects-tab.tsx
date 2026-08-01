import Link from 'next/link';

import { FolderGit2 } from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import { Trans } from '@kit/ui/trans';
import { cn } from '@kit/ui/utils';

import {
  type ProjectAccess,
  loadProjectArtifacts,
  loadProjectMemories,
  loadVisibleProjects,
} from '../_lib/server/project-memory.loader';
import { ArtifactCards } from './artifact-cards';
import { MemoryBrowser } from './memory-browser';

/**
 * The **Projects** tab: a picker over the projects the caller may open,
 * then that project's `scope = 'project'` memories and artifacts.
 *
 * `access` decides the picker AND the memory query. A member sees only
 * projects they hold a `project_members` row for; an org admin sees every
 * project in the org, including ones they are not a member of. Both facts are
 * enforced in SQL — the admin branch is a different SQL predicate, not a
 * TypeScript short-circuit over a wider result set.
 *
 * The picked project id arrives from the query string, which is
 * client-controlled, so it is never trusted: `loadProjectMemories` re-applies
 * the membership predicate to whatever id it is given. Picking an id you are
 * not entitled to returns nothing rather than someone else's rows.
 */
export async function ProjectsTab({
  orgId,
  access,
  accountSlug,
  selectedProjectId,
  page,
}: {
  orgId: string;
  access: ProjectAccess;
  accountSlug: string;
  selectedProjectId?: string;
  page: number;
}) {
  const projects = await loadVisibleProjects(orgId, access);

  const selected =
    projects.find((project) => project.id === selectedProjectId) ??
    projects[0] ??
    null;

  if (!selected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            <Trans i18nKey="agentguard:memory.noProjectsTitle" />
          </CardTitle>
          <CardDescription>
            <Trans
              i18nKey={
                access.kind === 'admin'
                  ? 'agentguard:memory.noProjectsAdminDescription'
                  : 'agentguard:memory.noProjectsDescription'
              }
            />
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const [memories, artifacts] = await Promise.all([
    loadProjectMemories(orgId, selected.id, access, page),
    loadProjectArtifacts(orgId, selected.id, access),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            <Trans i18nKey="agentguard:memory.projectPicker" />
          </CardTitle>
        </CardHeader>

        <CardContent className="flex flex-wrap gap-2">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/home/${accountSlug}/memory?tab=projects&project=${project.id}`}
              className={cn(
                'flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors',
                project.id === selected.id
                  ? 'border-primary bg-primary/5 text-foreground'
                  : 'border-border text-muted-foreground hover:text-foreground',
              )}
            >
              <FolderGit2 className="h-3.5 w-3.5" aria-hidden />
              {project.display_name}
              <span className="text-muted-foreground text-xs">
                {project.memory_count}
              </span>
            </Link>
          ))}
        </CardContent>
      </Card>

      <MemoryBrowser
        rows={memories.rows}
        accountSlug={accountSlug}
        agents={[]}
        memoryTypes={[]}
        sources={[]}
        projects={[]}
        spaces={[]}
        page={page}
        pageCount={memories.pageCount}
        hideFilters
        emptyMessageKey="agentguard:memory.noProjectMemories"
        titleKey="agentguard:memory.projectBrowserTitle"
        descriptionKey="agentguard:memory.projectBrowserDescription"
      />

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-base font-medium">
            <Trans i18nKey="agentguard:memory.artifactsTitle" />
          </h2>
          <p className="text-muted-foreground text-sm">
            <Trans i18nKey="agentguard:memory.artifactsProjectDescription" />
          </p>
        </div>

        <ArtifactCards artifacts={artifacts} accountSlug={accountSlug} />
      </section>
    </div>
  );
}
