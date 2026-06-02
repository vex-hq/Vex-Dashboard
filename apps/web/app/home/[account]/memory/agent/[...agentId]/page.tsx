import Link from 'next/link';

import { ArrowLeft } from 'lucide-react';

import { AppBreadcrumbs } from '@kit/ui/app-breadcrumbs';
import { Button } from '@kit/ui/button';
import { PageBody } from '@kit/ui/page';
import { Trans } from '@kit/ui/trans';

import { decodeAgentIdPath } from '~/lib/agentguard/agent-id-path';
import { resolveOrgId } from '~/lib/agentguard/resolve-org-id';
import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';

import { TeamAccountLayoutPageHeader } from '../../../_components/team-account-layout-page-header';
import { MemoryBrowser } from '../../_components/memory-browser';
import {
  loadAgentMemorySummary,
  loadAgentRecalls,
  loadMemoryList,
} from '../../_lib/server/memory.loader';
import { AgentMemoryHeader } from './_components/agent-memory-header';
import { RecallActivity } from './_components/recall-activity';

interface AgentMemoryPageProps {
  params: Promise<{ account: string; agentId: string[] }>;
  searchParams: Promise<{ capturesPage?: string; recallsPage?: string }>;
}

/** Parse a 1-based page number from a search param, clamping to >= 1. */
function parsePage(value: string | undefined): number {
  return Math.max(1, parseInt(value ?? '1', 10) || 1);
}

export const generateMetadata = async (props: {
  params: Promise<{ account: string; agentId: string[] }>;
}) => {
  const { agentId } = await props.params;
  const id = decodeAgentIdPath(agentId);
  const i18n = await createI18nServerInstance();

  return { title: i18n.t('agentguard:memory.memoryForTitle', { agent: id }) };
};

async function AgentMemoryPage({ params, searchParams }: AgentMemoryPageProps) {
  const { account, agentId } = await params;
  const id = decodeAgentIdPath(agentId);

  const { capturesPage: capturesPageParam, recallsPage: recallsPageParam } =
    await searchParams;
  const capturesPage = parsePage(capturesPageParam);
  const recallsPage = parsePage(recallsPageParam);

  const orgId = await resolveOrgId(account);

  const [summary, captures, recalls] = await Promise.all([
    loadAgentMemorySummary(orgId, id),
    loadMemoryList(orgId, { agent_id: id, page: capturesPage }),
    loadAgentRecalls(orgId, id, recallsPage),
  ]);

  const i18n = await createI18nServerInstance();

  return (
    <>
      <TeamAccountLayoutPageHeader
        account={account}
        title={i18n.t('agentguard:memory.memoryForTitle', { agent: id })}
        description={<AppBreadcrumbs />}
      />

      <PageBody>
        <div className="flex flex-col gap-6">
          <div>
            <Button asChild variant="ghost" size="sm">
              <Link href={`/home/${account}/memory`}>
                <ArrowLeft className="mr-1 h-4 w-4" />
                <Trans i18nKey="agentguard:memory.backToMemory" />
              </Link>
            </Button>
          </div>

          <AgentMemoryHeader summary={summary} />

          {/* Captured memories */}
          <section className="flex flex-col gap-3">
            <h2 className="text-base font-medium">
              <Trans i18nKey="agentguard:memory.capturedMemoriesTitle" />
            </h2>

            <MemoryBrowser
              rows={captures.rows}
              accountSlug={account}
              agents={[]}
              memoryTypes={[]}
              sources={[]}
              projects={[]}
              page={capturesPage}
              pageCount={captures.pageCount}
              hideFilters
              hideTitle
              pageParam="capturesPage"
            />
          </section>

          {/* Recall activity */}
          <section className="flex flex-col gap-3">
            <div>
              <h2 className="text-base font-medium">
                <Trans i18nKey="agentguard:memory.recallActivityTitle" />
              </h2>
              <p className="text-muted-foreground text-sm">
                <Trans i18nKey="agentguard:memory.recallActivityDescription" />
              </p>
            </div>

            <RecallActivity
              rows={recalls.rows}
              page={recallsPage}
              pageCount={recalls.pageCount}
            />
          </section>
        </div>
      </PageBody>
    </>
  );
}

export default withI18n(AgentMemoryPage);
