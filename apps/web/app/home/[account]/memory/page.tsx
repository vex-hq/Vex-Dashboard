import { AppBreadcrumbs } from '@kit/ui/app-breadcrumbs';
import { PageBody } from '@kit/ui/page';
import { Trans } from '@kit/ui/trans';

import { resolveOrgId } from '~/lib/agentguard/resolve-org-id';
import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';

import { TeamAccountLayoutPageHeader } from '../_components/team-account-layout-page-header';
import { AgentActivity } from './_components/agent-activity';
import { MemoryBrowser } from './_components/memory-browser';
import {
  MEMORY_SEARCH_MAX_LENGTH,
} from './_components/memory-table';
import { MemoryVolumeChart } from './_components/memory-volume-chart';
import {
  loadAgentActivity,
  loadMemoryList,
  loadMemoryVolume,
} from './_lib/server/memory.loader';

interface MemoryPageProps {
  params: Promise<{ account: string }>;
  searchParams: Promise<{
    agent?: string;
    type?: string;
    source?: string;
    project?: string;
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
 * Build the distinct, sorted set of values present for a row key. Used to
 * populate the filter dropdowns from whatever the loader returned so the UI
 * never offers an option the data can't satisfy.
 */
function distinctSorted(values: Array<string | null | undefined>): string[] {
  return [
    ...new Set(values.filter((value): value is string => Boolean(value))),
  ].sort((a, b) => a.localeCompare(b));
}

async function MemoryPage({ params, searchParams }: MemoryPageProps) {
  const { account } = await params;
  const filters = await searchParams;
  const orgId = await resolveOrgId(account);

  const page = Math.max(1, parseInt(filters.page ?? '1', 10) || 1);

  // Clamp the search term before it reaches the loader (reviewer hardening).
  const query = filters.q?.trim().slice(0, MEMORY_SEARCH_MAX_LENGTH) || undefined;

  const [agentActivity, memoryVolume, memoryResult] = await Promise.all([
    loadAgentActivity(orgId),
    loadMemoryVolume(orgId, 30),
    loadMemoryList(
      orgId,
      {
        agent_id: filters.agent,
        memory_type: filters.type,
        source: filters.source,
        project_id: filters.project,
        q: query,
      },
      page,
    ),
  ]);

  // Filter options. Agents come from the activity rollup (authoritative set of
  // agents that have written memory); type/source/project are derived from the
  // current page of rows so the dropdowns reflect real data without an extra
  // query.
  const agentOptions = agentActivity
    .map((agent) => ({ value: agent.agent_id, label: agent.agent_id }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const memoryTypes = distinctSorted(memoryResult.rows.map((r) => r.memory_type));
  const sources = distinctSorted(memoryResult.rows.map((r) => r.source));
  const projects = distinctSorted(
    memoryResult.rows.map((r) => r.project_id),
  ).map((value) => ({ value, label: value }));

  return (
    <>
      <TeamAccountLayoutPageHeader
        account={account}
        title={<Trans i18nKey={'agentguard:memory.pageTitle'} />}
        description={<AppBreadcrumbs />}
      />

      <PageBody>
        <div className="animate-in fade-in flex flex-col gap-6 pb-36 duration-500">
          {/* Overview: agent activity + volume chart */}
          <section className="flex flex-col gap-3">
            <div>
              <h2 className="text-base font-medium">
                <Trans i18nKey="agentguard:memory.activityTitle" />
              </h2>
              <p className="text-muted-foreground text-sm">
                <Trans i18nKey="agentguard:memory.activityDescription" />
              </p>
            </div>

            <AgentActivity agents={agentActivity} />
          </section>

          <MemoryVolumeChart volume={memoryVolume} />

          {/* Browser */}
          <MemoryBrowser
            rows={memoryResult.rows}
            accountSlug={account}
            agents={agentOptions}
            memoryTypes={memoryTypes}
            sources={sources}
            projects={projects}
            page={page}
            pageCount={memoryResult.pageCount}
          />
        </div>
      </PageBody>
    </>
  );
}

export default withI18n(MemoryPage);
