'use client';

import { useState } from 'react';

import { useTranslation } from 'react-i18next';

import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Trans } from '@kit/ui/trans';
import { cn } from '@kit/ui/utils';

import { formatTokens } from '~/lib/agentguard/formatters';

import type { ProjectUsage } from '../_lib/server/context-usage.loader';

/**
 * Minimum interactive tap target (44px) — matches `context-stream.tsx`'s
 * mobile-tap lesson.
 */
const MIN_TAP_TARGET_CLASS = 'min-h-11';

/**
 * Carried near-verbatim from `context-usage.loader.ts`'s HONESTY NOTE:
 * result ids are not logged, so exact served-tokens is impossible without an
 * engine change. This copy is the one place a viewer learns why the number
 * next to it says "estimated" instead of a bare count.
 */
const ESTIMATE_TOOLTIP_COPY =
  "Klio doesn't see your agents' own token bills; this is recalls × results × average memory size.";

/**
 * Human-readable byte size. Mirrors the local `formatBytes` helper already
 * duplicated in `memory/_components/team-tab.tsx` and `artifact-cards.tsx`
 * — same ladder, same rounding — rather than introducing a shared export
 * this task wasn't asked to create.
 */
function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 * 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export interface UsageStripProps {
  usage: ProjectUsage[];
}

/**
 * Per-project usage strip: measured captures/recalls/storage rendered
 * plainly, alongside a context-token figure that is ALWAYS labeled
 * "estimated" — the honesty canary from `context-usage.loader.ts`'s module
 * doc. Never strip that word from the estimate, and never add it to a
 * measured figure.
 *
 * Purely presentational — `usage` is already the org-scoped result of
 * `loadContextUsage`.
 */
export function UsageStrip({ usage }: UsageStripProps) {
  const { t } = useTranslation('agentguard');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          <Trans i18nKey="agentguard:usageStrip.title">Usage</Trans>
        </CardTitle>
      </CardHeader>

      <CardContent>
        {usage.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {t('usageStrip.empty', 'No usage yet in the last 30 days.')}
          </p>
        ) : (
          <ul className="flex flex-col divide-y">
            {usage.map((row) => (
              <UsageRow
                key={row.projectId ?? 'unscoped'}
                usage={row}
              />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function UsageRow({ usage }: { usage: ProjectUsage }) {
  const { t } = useTranslation('agentguard');
  const key = usage.projectId ?? 'unscoped';

  return (
    <li className="flex flex-wrap items-center justify-between gap-4 py-3">
      <span className="font-medium">
        {usage.projectName ??
          t('usageStrip.unscoped', 'Org-scoped (no project)')}
      </span>

      <div className="text-muted-foreground flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <Metric
          testId={`memories-30d-${key}`}
          label={t('usageStrip.memories30d', 'Memories (30d)')}
          value={usage.memories30d.toLocaleString('en-US')}
        />
        <Metric
          testId={`recalls-30d-${key}`}
          label={t('usageStrip.recalls30d', 'Recalls (30d)')}
          value={usage.recalls30d.toLocaleString('en-US')}
        />
        <Metric
          testId={`storage-bytes-${key}`}
          label={t('usageStrip.storage', 'Storage')}
          value={formatBytes(usage.storageBytes)}
        />

        <EstimatedTokens
          testId={`est-context-tokens-${key}`}
          tokens={usage.estContextTokens30d}
        />
      </div>
    </li>
  );
}

function Metric({
  testId,
  label,
  value,
}: {
  testId: string;
  label: string;
  value: string;
}) {
  return (
    <span data-testid={testId} className="flex flex-col">
      <span className="text-foreground font-mono text-sm">{value}</span>
      <span className="text-muted-foreground text-xs">{label}</span>
    </span>
  );
}

/**
 * The honesty canary: "estimated" sits directly next to the token figure,
 * every render, with no path that omits it. The `?` disclosure explains why
 * — via a click-toggled panel rather than a hover-only tooltip, so it works
 * on a tap the same as `context-stream.tsx`'s expandable row content.
 */
function EstimatedTokens({
  testId,
  tokens,
}: {
  testId: string;
  tokens: number;
}) {
  const { t } = useTranslation('agentguard');
  const [open, setOpen] = useState(false);

  return (
    <span data-testid={testId} className="relative flex flex-col">
      <span className="flex items-center gap-1">
        <span className="text-foreground font-mono text-sm">
          {formatTokens(tokens)}
        </span>
        <button
          type="button"
          aria-expanded={open}
          aria-label={t(
            'usageStrip.estimateDisclosureLabel',
            'What does estimated mean?',
          )}
          onClick={() => setOpen((current) => !current)}
          className={cn(
            'text-muted-foreground hover:text-foreground flex items-center justify-center rounded-full text-xs',
            MIN_TAP_TARGET_CLASS,
            'w-11',
          )}
        >
          ?
        </button>
      </span>

      <span className="text-muted-foreground text-xs">
        {t('usageStrip.estimatedTokens', 'estimated context tokens')}
      </span>

      {open ? (
        <span
          role="note"
          className="bg-popover text-popover-foreground absolute top-full left-0 z-10 mt-1 w-64 rounded-md border p-2 text-xs shadow-md"
        >
          {t('usageStrip.estimateTooltip', ESTIMATE_TOOLTIP_COPY)}
        </span>
      ) : null}
    </span>
  );
}
