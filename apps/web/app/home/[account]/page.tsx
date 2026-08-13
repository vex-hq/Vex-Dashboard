import { AppBreadcrumbs } from '@kit/ui/app-breadcrumbs';
import { PageBody } from '@kit/ui/page';
import { Trans } from '@kit/ui/trans';

import { resolveOrgId } from '~/lib/agentguard/resolve-org-id';
import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';

import { ActivityAnswer } from './_components/activity-answer';
import { ConnectFirstAgent } from './_components/connect-first-agent';
import { ContextStream } from './_components/context-stream';
import { ProjectTiles } from './_components/project-tiles';
import { TeamAccountLayoutPageHeader } from './_components/team-account-layout-page-header';
import {
  type RawStreamSearchParams,
  parseStreamFilters,
} from './_lib/parse-stream-filters';
import { loadAccountViewer } from './_lib/server/account-viewer';
import { loadContextStream } from './_lib/server/context-stream.loader';
import { loadContextUsage } from './_lib/server/context-usage.loader';
import { loadHubSummary } from './_lib/server/hub-summary.loader';
import { loadHasAnyMemory } from './_lib/server/workspace-activity.loader';

interface TeamAccountHomePageProps {
  params: Promise<{ account: string }>;
  searchParams: Promise<RawStreamSearchParams>;
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

  const [stream, hubSummary, usage, hasAnyMemory] = await Promise.all([
    orFallback('contextStream', [], () =>
      loadContextStream(orgId, viewerUserId, filters),
    ),
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
  ]);

  // Both derived from the already-loaded (filtered) stream rather than
  // second, filter-free queries: cheaper (fewer round trips against a pool
  // that already had a cold-Neon-resume incident on this page), at the cost
  // that selecting a project/agent narrows these lists to just that value
  // until the filter is cleared. Acceptable — the dropdowns still always
  // contain whatever is currently on screen, and "everything seen in the
  // current view" degrades gracefully rather than silently, unlike a stale
  // list. (Band 2's project tiles — driven by `hubSummary.projectSparks`,
  // capped and gated independently by the loader — replaced the old
  // project-pulse sidebar that used to source this list, so it is derived
  // from the stream here instead of a second loader call.)
  const projects = Array.from(
    new Map(
      stream
        .filter(
          (
            item,
          ): item is typeof item & { projectId: string; projectName: string } =>
            item.projectId !== null && item.projectName !== null,
        )
        .map((item) => [
          item.projectId,
          { id: item.projectId, name: item.projectName },
        ]),
    ).values(),
  );
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

      <PageBody className="gap-8 pb-16">
        {/* First-run: an org that has NEVER captured a single memory, of any
            scope or status, has no working agent connection — either brand
            new or a setup that never finished. Both want the same thing: the
            connect command, here, with the key already in it. Disappears the
            moment the workspace captures its first memory, forever after
            (this is an existence probe, not a recency window — see
            loadHasAnyMemory's docstring for why a 30-day/org-scope volume
            check does not belong here: it falsely flagged active
            private-scope-only workspaces as disconnected in production). */}
        {hasAnyMemory === false ? (
          <ConnectFirstAgent accountSlug={account} />
        ) : null}

        <ActivityAnswer
          summary={hubSummary}
          recalls={usage.reduce((sum, row) => sum + row.recalls30d, 0)}
        />

        <section className="flex flex-col gap-3">
          <h2 className="text-muted-foreground font-mono text-[length:var(--text-tiny)] tracking-[0.06em] uppercase">
            <Trans i18nKey="agentguard:hub.projectsHeading">Projects</Trans>
          </h2>
          <ProjectTiles
            sparks={hubSummary.projectSparks}
            usage={usage}
            accountSlug={account}
          />
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-muted-foreground font-mono text-[length:var(--text-tiny)] tracking-[0.06em] uppercase">
            <Trans i18nKey="agentguard:hub.activityHeading">Now</Trans>
          </h2>
          <ContextStream items={stream} projects={projects} agents={agents} />
        </section>
      </PageBody>
    </>
  );
}

export default withI18n(TeamAccountHomePage);
