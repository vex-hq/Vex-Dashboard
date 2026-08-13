import { AppBreadcrumbs } from '@kit/ui/app-breadcrumbs';
import { PageBody } from '@kit/ui/page';
import { Trans } from '@kit/ui/trans';

import { resolveOrgId } from '~/lib/agentguard/resolve-org-id';
import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';

import { TeamAccountLayoutPageHeader } from '../_components/team-account-layout-page-header';
import { loadAccountViewer } from '../_lib/server/account-viewer';
import { MEMORY_SEARCH_MAX_LENGTH } from './_components/memory-table';
import { MemoryTabs, parseMemoryTab } from './_components/memory-tabs';
import { MineTab } from './_components/mine-tab';
import { ProjectsTab } from './_components/projects-tab';
import { TeamTab } from './_components/team-tab';

interface MemoryPageProps {
  params: Promise<{ account: string }>;
  searchParams: Promise<{
    tab?: string;
    project?: string;
    agent?: string;
    type?: string;
    source?: string;
    provenance?: string;
    space?: string;
    q?: string;
    page?: string;
  }>;
}

export const generateMetadata = async () => {
  const i18n = await createI18nServerInstance();
  const title = i18n.t('agentguard:memory.pageTitle');

  return {
    title,
  };
};

/**
 * Three tabs, three loaders, one page.
 *
 * The page picks exactly ONE tab component per render and each component calls
 * only its own loader. Nothing here passes a scope to a shared loader, and
 * nothing renders a tab the caller did not ask for — a hidden-but-loaded
 * private tab would mean fetching private rows on every visit.
 *
 * `viewer` is resolved from the session (`loadAccountViewer`). The account slug
 * in the URL is authorised by `resolveOrgId`, which asserts membership before
 * it will hand back an org id.
 */
async function MemoryPage({ params, searchParams }: MemoryPageProps) {
  const { account } = await params;
  const filters = await searchParams;

  const [orgId, viewer] = await Promise.all([
    resolveOrgId(account),
    loadAccountViewer(account),
  ]);

  const tab = parseMemoryTab(filters.tab);
  const page = Math.max(1, parseInt(filters.page ?? '1', 10) || 1);

  // Clamp the search term before it reaches the loader (defense in depth).
  const query =
    filters.q?.trim().slice(0, MEMORY_SEARCH_MAX_LENGTH) || undefined;

  return (
    <>
      <TeamAccountLayoutPageHeader
        account={account}
        title={<Trans i18nKey={'agentguard:memory.pageTitle'} />}
        description={<AppBreadcrumbs />}
      />

      <PageBody>
        <div className="animate-in fade-in flex flex-col gap-6 pb-36 duration-500">
          <MemoryTabs accountSlug={account} active={tab} />

          {tab === 'mine' ? (
            <MineTab
              orgId={orgId}
              userId={viewer.userId}
              accountSlug={account}
              page={page}
            />
          ) : null}

          {tab === 'projects' ? (
            <ProjectsTab
              orgId={orgId}
              viewerUserId={viewer.userId}
              accountSlug={account}
              selectedProjectId={filters.project}
              page={page}
            />
          ) : null}

          {tab === 'team' ? (
            <TeamTab
              orgId={orgId}
              accountSlug={account}
              isOrgAdmin={viewer.isOrgAdmin}
              filters={{
                agent: filters.agent,
                type: filters.type,
                source: filters.source,
                provenance: filters.provenance,
                project: filters.project,
                space: filters.space,
                q: query,
              }}
              page={page}
            />
          ) : null}
        </div>
      </PageBody>
    </>
  );
}

export default withI18n(MemoryPage);
