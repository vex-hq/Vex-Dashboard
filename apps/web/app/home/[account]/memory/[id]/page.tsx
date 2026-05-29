import Link from 'next/link';

import { ArrowLeft } from 'lucide-react';

import { AppBreadcrumbs } from '@kit/ui/app-breadcrumbs';
import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import { PageBody } from '@kit/ui/page';
import { Separator } from '@kit/ui/separator';
import { Trans } from '@kit/ui/trans';

import { resolveOrgId } from '~/lib/agentguard/resolve-org-id';
import { formatTimestamp } from '~/lib/agentguard/formatters';
import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';

import { TeamAccountLayoutPageHeader } from '../../_components/team-account-layout-page-header';
import { loadMemoryDetail } from '../_lib/server/memory.loader';

interface MemoryDetailPageProps {
  params: Promise<{ account: string; id: string }>;
}

export const generateMetadata = async () => {
  const i18n = await createI18nServerInstance();
  const title = i18n.t('agentguard:memory.detailTitle');

  return {
    title,
  };
};

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="text-foreground text-sm break-all">{value}</dd>
    </div>
  );
}

async function MemoryDetailPage({ params }: MemoryDetailPageProps) {
  const { account, id } = await params;
  const orgId = await resolveOrgId(account);

  const memory = await loadMemoryDetail(orgId, id);

  const i18n = await createI18nServerInstance();

  return (
    <>
      <TeamAccountLayoutPageHeader
        account={account}
        title={<Trans i18nKey={'agentguard:memory.detailTitle'} />}
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

          {!memory ? (
            <p className="text-muted-foreground text-sm">
              <Trans i18nKey="agentguard:memory.memoryNotFound" />
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Content */}
              <Card className="lg:col-span-2">
                <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                  <CardTitle className="text-base">
                    <Trans i18nKey="agentguard:memory.content" />
                  </CardTitle>
                  <Badge variant="secondary" className="font-normal">
                    {memory.memory_type}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground text-sm leading-relaxed whitespace-pre-wrap">
                    {memory.content}
                  </p>
                </CardContent>
              </Card>

              {/* Metadata */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    <Trans i18nKey="agentguard:memory.metadata" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="space-y-4">
                    <MetaRow
                      label={i18n.t('agentguard:memory.agent')}
                      value={
                        <span className="font-mono text-xs">
                          {memory.agent_id}
                        </span>
                      }
                    />
                    <Separator />
                    <MetaRow
                      label={i18n.t('agentguard:memory.scope')}
                      value={memory.scope}
                    />
                    <MetaRow
                      label={i18n.t('agentguard:memory.status')}
                      value={memory.status}
                    />
                    <MetaRow
                      label={i18n.t('agentguard:memory.project')}
                      value={
                        memory.project_id ? (
                          <span className="font-mono text-xs">
                            {memory.project_id}
                          </span>
                        ) : (
                          i18n.t('agentguard:memory.none')
                        )
                      }
                    />
                    <Separator />
                    <MetaRow
                      label={i18n.t('agentguard:memory.createdAt')}
                      value={formatTimestamp(memory.created_at)}
                    />
                    <MetaRow
                      label={i18n.t('agentguard:memory.memoryId')}
                      value={
                        <span className="font-mono text-xs">{memory.id}</span>
                      }
                    />
                  </dl>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </PageBody>
    </>
  );
}

export default withI18n(MemoryDetailPage);
