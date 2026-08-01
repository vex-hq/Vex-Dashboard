import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Trans } from '@kit/ui/trans';

import {
  loadAgentActivity,
  loadMemoryVolume,
  loadSpaces,
} from '../_lib/server/memory.loader';
import {
  loadOrgStorageTotal,
  loadTeamArtifacts,
  loadTeamMemories,
} from '../_lib/server/team-memory.loader';
import { AgentActivity } from './agent-activity';
import { ArtifactCards } from './artifact-cards';
import { MemoryBrowser } from './memory-browser';
import { MemoryVolumeChart } from './memory-volume-chart';

/**
 * The **Team** tab: `scope = 'org'` — the shared brain, readable by everyone
 * in the org, admins and members alike.
 *
 * The only admin-only element is the org-wide storage total. It is a single
 * aggregate over the whole organisation with no per-member breakdown, because
 * billing needs one number and a per-person count would disclose who is active
 * and who went quiet.
 */
export async function TeamTab({
  orgId,
  accountSlug,
  isOrgAdmin,
  filters,
  page,
}: {
  orgId: string;
  accountSlug: string;
  isOrgAdmin: boolean;
  filters: {
    agent?: string;
    type?: string;
    source?: string;
    provenance?: string;
    project?: string;
    space?: string;
    q?: string;
  };
  page: number;
}) {
  const [agentActivity, memoryVolume, memories, spaceRows, artifacts, storage] =
    await Promise.all([
      loadAgentActivity(orgId),
      loadMemoryVolume(orgId, 30),
      loadTeamMemories(
        orgId,
        {
          agent_id: filters.agent,
          memory_type: filters.type,
          source: filters.source,
          provenance: filters.provenance,
          project_id: filters.project,
          space_id: filters.space,
          q: filters.q,
        },
        page,
      ),
      loadSpaces(orgId),
      loadTeamArtifacts(orgId),
      isOrgAdmin ? loadOrgStorageTotal(orgId) : Promise.resolve(null),
    ]);

  const agentOptions = agentActivity
    .map((agent) => ({ value: agent.agent_id, label: agent.agent_id }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const memoryTypes = distinctSorted(memories.rows.map((r) => r.memory_type));
  const sources = distinctSorted(memories.rows.map((r) => r.source));
  const projects = distinctSorted(memories.rows.map((r) => r.project_id)).map(
    (value) => ({ value, label: value }),
  );
  const spaces = spaceRows.map((space) => ({
    value: space.id,
    label: space.name,
  }));

  return (
    <div className="flex flex-col gap-6">
      {storage ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              <Trans i18nKey="agentguard:memory.storageTitle" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4 md:grid-cols-3">
              <div className="flex flex-col gap-1">
                <dt className="text-muted-foreground text-xs">
                  <Trans i18nKey="agentguard:memory.storageMemories" />
                </dt>
                <dd className="text-lg font-medium">
                  {storage.memories.toLocaleString()}
                </dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="text-muted-foreground text-xs">
                  <Trans i18nKey="agentguard:memory.storageContent" />
                </dt>
                <dd className="text-lg font-medium">
                  {formatBytes(storage.content_bytes)}
                </dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="text-muted-foreground text-xs">
                  <Trans i18nKey="agentguard:memory.storageArtifacts" />
                </dt>
                <dd className="text-lg font-medium">
                  {formatBytes(storage.artifact_bytes)}
                </dd>
              </div>
            </dl>

            <p className="text-muted-foreground mt-4 text-xs">
              <Trans i18nKey="agentguard:memory.storageHint" />
            </p>
          </CardContent>
        </Card>
      ) : null}

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-base font-medium">
            <Trans i18nKey="agentguard:memory.activityTitle" />
          </h2>
          <p className="text-muted-foreground text-sm">
            <Trans i18nKey="agentguard:memory.activityDescription" />
          </p>
        </div>

        <AgentActivity agents={agentActivity} accountSlug={accountSlug} />
      </section>

      <MemoryVolumeChart volume={memoryVolume} />

      <MemoryBrowser
        rows={memories.rows}
        accountSlug={accountSlug}
        agents={agentOptions}
        memoryTypes={memoryTypes}
        sources={sources}
        projects={projects}
        spaces={spaces}
        page={page}
        pageCount={memories.pageCount}
      />

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-base font-medium">
            <Trans i18nKey="agentguard:memory.artifactsTitle" />
          </h2>
          <p className="text-muted-foreground text-sm">
            <Trans i18nKey="agentguard:memory.artifactsTeamDescription" />
          </p>
        </div>

        <ArtifactCards artifacts={artifacts} accountSlug={accountSlug} />
      </section>
    </div>
  );
}

/**
 * Distinct, sorted, non-empty values — used to populate the filter dropdowns
 * from the rows actually returned, so the UI never offers an option the data
 * cannot satisfy.
 */
function distinctSorted(values: Array<string | null | undefined>): string[] {
  return [
    ...new Set(values.filter((value): value is string => Boolean(value))),
  ].sort((a, b) => a.localeCompare(b));
}

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;

  return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
