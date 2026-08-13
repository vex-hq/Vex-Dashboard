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
  loadProjectArtifacts,
  loadProjectMemories,
  loadVisibleProjects,
} from '../_lib/server/project-memory.loader';
import { ArtifactCards } from './artifact-cards';
import { MemoryBrowser } from './memory-browser';

/**
 * The **Projects** tab: a picker over the projects the caller may open,
 * then the memories and artifacts on that project this viewer may read
 * (`scope = 'project'` they are entitled to, plus their own private rows
 * tagged with the project id).
 *
 * MEMBERSHIP-ONLY, NO ADMIN BYPASS (2026-08-12 ruling): the picker shows
 * only projects `viewerUserId` holds a `project_members` row for — org
 * admins included. There is no wider listing to fall back to.
 *
 * The picked project id arrives from the query string, which is
 * client-controlled, so it is never trusted: `loadProjectMemories`
 * re-applies membership (and the own-private arm keyed on
 * `viewerUserId`) to whatever id it is given. Picking an id you are not
 * entitled to returns nothing rather than someone else's rows.
 */
export async function ProjectsTab({
  orgId,
  viewerUserId,
  accountSlug,
  selectedProjectId,
  page,
}: {
  orgId: string;
  viewerUserId: string;
  accountSlug: string;
  selectedProjectId?: string;
  page: number;
}) {
  const projects = await loadVisibleProjects(orgId, viewerUserId);

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
            <Trans i18nKey="agentguard:memory.noProjectsDescription" />
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const [memories, artifacts] = await Promise.all([
    loadProjectMemories(orgId, selected.id, viewerUserId, page),
    loadProjectArtifacts(orgId, selected.id, viewerUserId),
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
