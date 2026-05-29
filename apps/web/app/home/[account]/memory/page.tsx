import { AppBreadcrumbs } from '@kit/ui/app-breadcrumbs';
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
import {
  loadAgentActivity,
  loadMemoryList,
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

const CONTENT_PREVIEW_LENGTH = 120;

function truncate(value: string, max: number): string {
  if (value.length <= max) {
    return value;
  }

  return `${value.slice(0, max)}…`;
}

export const generateMetadata = async () => {
  const i18n = await createI18nServerInstance();
  const title = i18n.t('agentguard:nav.memory');

  return {
    title,
  };
};

async function MemoryPage({ params, searchParams }: MemoryPageProps) {
  const { account } = await params;
  const filters = await searchParams;
  const orgId = await resolveOrgId(account);

  const page = Math.max(1, parseInt(filters.page ?? '1', 10) || 1);

  const [memoryResult, agentActivity] = await Promise.all([
    loadMemoryList(
      orgId,
      {
        agent_id: filters.agent,
        memory_type: filters.type,
        source: filters.source,
        project_id: filters.project,
        q: filters.q,
      },
      page,
    ),
    loadAgentActivity(orgId),
  ]);

  return (
    <>
      <TeamAccountLayoutPageHeader
        account={account}
        title={<Trans i18nKey={'agentguard:nav.memory'} />}
        description={<AppBreadcrumbs />}
      />

      <PageBody>
        <div className="flex flex-col gap-8">
          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-medium">Agent Activity</h2>

            {agentActivity.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No agent activity yet.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tool</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Captured</TableHead>
                    <TableHead>Facts</TableHead>
                    <TableHead>Recalled</TableHead>
                    <TableHead>Last Captured</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agentActivity.map((row) => (
                    <TableRow key={row.agent_id}>
                      <TableCell>{row.tool}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {row.agent_id}
                      </TableCell>
                      <TableCell>{row.captured}</TableCell>
                      <TableCell>{row.facts}</TableCell>
                      <TableCell>{row.recalled}</TableCell>
                      <TableCell>
                        {row.last_captured
                          ? new Date(row.last_captured).toLocaleString()
                          : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-medium">Memories</h2>

            {memoryResult.rows.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No memories found.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Content</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {memoryResult.rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.memory_type}</TableCell>
                      <TableCell className="max-w-md">
                        {truncate(row.content, CONTENT_PREVIEW_LENGTH)}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {row.agent_id}
                      </TableCell>
                      <TableCell>{row.source ?? '—'}</TableCell>
                      <TableCell>
                        {new Date(row.created_at).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            <p className="text-muted-foreground text-xs">
              Page {page} of {Math.max(1, memoryResult.pageCount)}
            </p>
          </section>
        </div>
      </PageBody>
    </>
  );
}

export default withI18n(MemoryPage);
