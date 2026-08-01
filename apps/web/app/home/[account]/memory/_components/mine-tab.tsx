import { Lock } from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import { Trans } from '@kit/ui/trans';

import { formatTimestamp } from '~/lib/agentguard/formatters';

import {
  loadMyPrivateArtifacts,
  loadMyPrivateMemories,
  loadMyPrivateSummary,
} from '../_lib/server/private-memory.loader';
import { ArtifactCards } from './artifact-cards';
import { MemoryBrowser } from './memory-browser';

/**
 * The **Mine** tab: `scope = 'private' AND user_id = <the signed-in user>`.
 *
 * `userId` comes from `loadAccountViewer`, i.e. from the Supabase session —
 * never from a route param. It is identical for admins: an org admin looking
 * at this tab sees their OWN private memories, exactly as everyone else does,
 * and there is no control anywhere on this page that switches it to somebody
 * else's.
 */
export async function MineTab({
  orgId,
  userId,
  accountSlug,
  page,
}: {
  orgId: string;
  userId: string;
  accountSlug: string;
  page: number;
}) {
  const [summary, memories, artifacts] = await Promise.all([
    loadMyPrivateSummary(orgId, userId),
    loadMyPrivateMemories(orgId, userId, page),
    loadMyPrivateArtifacts(orgId, userId),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lock className="h-4 w-4" aria-hidden />
            <Trans i18nKey="agentguard:memory.privateTitle" />
          </CardTitle>
          <CardDescription>
            <Trans i18nKey="agentguard:memory.privateDescription" />
          </CardDescription>
        </CardHeader>

        <CardContent>
          <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Stat
              labelKey="agentguard:memory.privateTotal"
              value={summary.total.toLocaleString()}
            />
            <Stat
              labelKey="agentguard:memory.provenanceInferred"
              value={summary.inferred.toLocaleString()}
            />
            <Stat
              labelKey="agentguard:memory.artifactsTitle"
              value={summary.artifacts.toLocaleString()}
            />
            <Stat
              labelKey="agentguard:memory.lastActive"
              value={
                summary.last_captured
                  ? formatTimestamp(summary.last_captured)
                  : '—'
              }
            />
          </dl>
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
        emptyMessageKey="agentguard:memory.noPrivateMemories"
        titleKey="agentguard:memory.privateBrowserTitle"
        descriptionKey="agentguard:memory.privateBrowserDescription"
      />

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-base font-medium">
            <Trans i18nKey="agentguard:memory.artifactsTitle" />
          </h2>
          <p className="text-muted-foreground text-sm">
            <Trans i18nKey="agentguard:memory.artifactsPrivateDescription" />
          </p>
        </div>

        <ArtifactCards artifacts={artifacts} accountSlug={accountSlug} />
      </section>
    </div>
  );
}

function Stat({ labelKey, value }: { labelKey: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-muted-foreground text-xs">
        <Trans i18nKey={labelKey} />
      </dt>
      <dd className="text-foreground text-lg font-medium">{value}</dd>
    </div>
  );
}
