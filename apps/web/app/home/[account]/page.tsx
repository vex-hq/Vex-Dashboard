import { AppBreadcrumbs } from '@kit/ui/app-breadcrumbs';
import { PageBody } from '@kit/ui/page';
import { Trans } from '@kit/ui/trans';

import { resolveOrgId } from '~/lib/agentguard/resolve-org-id';
import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';

import { ConnectFirstAgent } from './_components/connect-first-agent';
import { ContextStream } from './_components/context-stream';
import { ProjectsRail } from './_components/projects-rail';
import { TeamAccountLayoutPageHeader } from './_components/team-account-layout-page-header';
import { UsageStrip } from './_components/usage-strip';
import {
  type RawStreamSearchParams,
  parseStreamFilters,
} from './_lib/parse-stream-filters';
import { loadAccountViewer } from './_lib/server/account-viewer';
import {
  loadContextStream,
  loadProjectPulse,
} from './_lib/server/context-stream.loader';
import { loadContextUsage } from './_lib/server/context-usage.loader';
import { loadMemoryVolume } from './memory/_lib/server/memory.loader';

interface TeamAccountHomePageProps {
  params: Promise<{ account: string }>;
  searchParams: Promise<RawStreamSearchParams>;
}

/** Matches the Memory page's volume window so both read the same series. */
const MEMORY_VOLUME_DAYS = 30;

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

async function TeamAccountHomePage({
  params,
  searchParams,
}: TeamAccountHomePageProps) {
  const { account } = await params;
  const rawParams = await searchParams;
  const filters = parseStreamFilters(rawParams);

  const [orgId, viewer] = await Promise.all([
    resolveOrgId(account),
    loadAccountViewer(account),
  ]);
  const viewerUserId = viewer.userId;

  const [stream, projectPulse, usage, memoryVolume] = await Promise.all([
    orFallback('contextStream', [], () =>
      loadContextStream(orgId, viewerUserId, filters),
    ),
    orFallback('projectPulse', [], () => loadProjectPulse(orgId, viewerUserId)),
    orFallback('contextUsage', [], () => loadContextUsage(orgId)),
    // Memory reuses the Memory page's own loader (no duplicated SQL). It is
    // not scoped by the stream filters: the volume window is fixed at 30
    // days, exactly as the Memory page renders it — this is only used below
    // to decide whether the connect-first-agent card should show.
    orFallback('memoryVolume', [], () =>
      loadMemoryVolume(orgId, MEMORY_VOLUME_DAYS),
    ),
  ]);

  const projects = projectPulse.map((pulse) => ({
    id: pulse.projectId,
    name: pulse.name,
  }));

  // Derived from the already-loaded (filtered) stream rather than a second,
  // agent-filter-free query: cheaper (one fewer round trip against a
  // pool that already had a cold-Neon-resume incident on this page), at the
  // cost that selecting an agent narrows this list to just that agent until
  // the filter is cleared. Acceptable — the dropdown still always contains
  // whatever is currently on screen, and "all agents seen in the current
  // view" degrades gracefully rather than silently, unlike a stale list.
  const agents = Array.from(
    new Set(
      stream
        .map((item) => item.agentId)
        .filter((agentId): agentId is string => agentId !== null),
    ),
  );

  return (
    <>
      <TeamAccountLayoutPageHeader
        account={account}
        title={<Trans i18nKey={'agentguard:homepage.pageTitle'} />}
        description={<AppBreadcrumbs />}
      />

      <PageBody>
        {/* First-run: an org with zero memory writes in the volume window has
            no working agent connection — either brand new or a setup that
            never finished. Both want the same thing: the connect command,
            here, with the key already in it. Disappears on the first write.
            (A long-idle but genuinely connected org sees it too; for them it
            reads as a reconnect helper, which is not wrong.) */}
        {memoryVolume.every((point) => point.captured === 0) ? (
          <div className="mb-6">
            <ConnectFirstAgent accountSlug={account} />
          </div>
        ) : null}

        <div className="mb-6">
          <UsageStrip usage={usage} />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ContextStream items={stream} projects={projects} agents={agents} />
          </div>
          <div>
            <ProjectsRail pulses={projectPulse} accountSlug={account} />
          </div>
        </div>
      </PageBody>
    </>
  );
}

export default withI18n(TeamAccountHomePage);
