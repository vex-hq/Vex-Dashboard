import { resolveOrgId } from '~/lib/agentguard/resolve-org-id';
import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';

import { ConnectFirstAgent } from './_components/connect-first-agent';
import { ConnectYourAgent } from './_components/connect-your-agent';
import { HubProjects } from './_components/hub-projects';
import { LinearPanel } from './_components/linear-panel';
import { buildHubProjectRows } from './_lib/hub-projects-model';
import { loadAccountViewer } from './_lib/server/account-viewer';
import { loadProjectPulse } from './_lib/server/context-stream.loader';
import { loadContextUsage } from './_lib/server/context-usage.loader';
import { loadHubSummary } from './_lib/server/hub-summary.loader';
import {
  loadHasAnyMemory,
  loadViewerHasWritten,
} from './_lib/server/workspace-activity.loader';
import { loadWorkspacePeople } from './_lib/server/workspace-people.loader';

interface TeamAccountHomePageProps {
  params: Promise<{ account: string }>;
}

/**
 * Run one dashboard loader, degrading to `fallback` if it fails.
 *
 * The homepage fans out to several loaders against the engine database. They
 * used to share fate through Promise.all: one cold Neon resume blowing the
 * connect budget threw an AggregateError(ETIMEDOUT) out of the server
 * component and the whole page became an error screen (seen in production,
 * digests 1176364607 / 1376536570). A dashboard tile with no data is worth
 * strictly more than a crash page, so each loader now fails alone: the error
 * is logged with its label and the tile renders its empty state.
 */
async function orFallback<T>(
  label: string,
  fallback: T,
  run: () => Promise<T>,
): Promise<T> {
  try {
    return await run();
  } catch (error) {
    console.error(`[homepage] loader "${label}" failed; rendering fallback`, {
      error: error instanceof Error ? error.message : String(error),
    });

    return fallback;
  }
}

export const generateMetadata = async () => {
  const i18n = await createI18nServerInstance();
  const title = i18n.t('agentguard:homepage.pageTitle');

  return {
    title,
  };
};

async function TeamAccountHomePage({ params }: TeamAccountHomePageProps) {
  const { account } = await params;

  const [orgId, viewer] = await Promise.all([
    resolveOrgId(account),
    loadAccountViewer(account),
  ]);
  const viewerUserId = viewer.userId;

  const [hubSummary, usage, pulses, hasAnyMemory, viewerHasWritten, people] =
    await Promise.all([
      orFallback(
        'hubSummary',
        {
          decisions7d: 0,
          plans7d: 0,
          facts7d: 0,
          notes7d: 0,
          projectsActive7d: 0,
          agentsActive7d: [],
          lastActivityAt: null,
          volume30d: [],
          projectSparks: [],
        },
        () => loadHubSummary(orgId, viewerUserId),
      ),
      orFallback('contextUsage', [], () => loadContextUsage(orgId)),
      orFallback('projectPulse', [], () =>
        loadProjectPulse(orgId, viewerUserId),
      ),
      // Fallback is `true` (assume connected), the INVERSE of every other
      // loader's fallback on this page. This is deliberate: the second
      // production fault here was that a FAILED probe used to fall back to
      // `[]`, and `[].every(...)` is vacuously true, so a query failure and a
      // genuinely empty workspace were indistinguishable and both nagged the
      // user with the connect card. Assuming "connected" on failure means a
      // transient DB error never shows the card to an active user — the worst
      // case is a truly new workspace briefly not seeing the card, which is
      // far cheaper than nagging someone mid-incident.
      orFallback('hasAnyMemory', true, () => loadHasAnyMemory(orgId)),
      orFallback('viewerHasWritten', true, () =>
        loadViewerHasWritten(orgId, viewerUserId),
      ),
      orFallback('workspacePeople', new Map(), () =>
        loadWorkspacePeople(account),
      ),
    ]);

  // Usage is org-wide. Pulse and sparks are visibility-gated. Only count
  // usage for projects the viewer can already see.
  const visibleProjectIds = new Set<string>([
    ...hubSummary.projectSparks.map((spark) => spark.projectId),
    ...pulses.map((pulse) => pulse.projectId),
  ]);
  const visibleUsage = usage.filter(
    (row) => row.projectId !== null && visibleProjectIds.has(row.projectId),
  );
  const projectRows = buildHubProjectRows(
    visibleUsage,
    pulses,
    hubSummary.projectSparks,
    new Date(),
    people,
  );

  return (
    <LinearPanel>
      {hasAnyMemory === false ? (
        <div className="px-4 pt-4">
          <ConnectFirstAgent accountSlug={account} />
        </div>
      ) : viewerHasWritten === false ? (
        <div className="px-4 pt-4">
          <ConnectYourAgent accountSlug={account} />
        </div>
      ) : null}
      <HubProjects rows={projectRows} accountSlug={account} />
    </LinearPanel>
  );
}

export default withI18n(TeamAccountHomePage);
