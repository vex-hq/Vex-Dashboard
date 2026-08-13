'use client';

import { useCallback, useMemo } from 'react';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { useTranslation } from 'react-i18next';

import { formatRelativeTime } from '~/lib/agentguard/formatters';

import { displayAgent } from '../../_lib/display-agent';
import { displayMemory } from '../../_lib/display-memory';
import type { ContextItem } from '../../_lib/server/context-stream.loader';
import { inboxProjectHref, pickInboxItem } from '../_lib/inbox-model';

const L = {
  muted: '#6b6f76',
  ink: '#e2e3e5',
  line: '#212224',
  indigo: '#5e6ad2',
  ease: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
} as const;

export interface InboxFeedProps {
  items: readonly ContextItem[];
  accountSlug: string;
}

export function InboxFeed({ items, accountSlug }: InboxFeedProps) {
  const { t } = useTranslation('agentguard');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requested = searchParams.get('item')?.trim() || undefined;
  const selectedId = pickInboxItem(items, requested);
  const selected = items.find((item) => item.id === selectedId) ?? null;

  const replaceItem = useCallback(
    (itemId: string | undefined) => {
      const params = new URLSearchParams(searchParams.toString());
      if (itemId) params.set('item', itemId);
      else params.delete('item');
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams],
  );

  const title = useMemo(() => t('inbox.pageTitle', 'Inbox'), [t]);

  return (
    <section aria-label={title} className="flex min-h-0 flex-1 flex-col">
      <style>{`
        .klio-row:hover { background: rgba(255,255,255,0.035) !important; }
        .klio-row[aria-current="true"] { background: rgba(255,255,255,0.045) !important; }
        @media (prefers-reduced-motion: no-preference) {
          .klio-soft { transition: background-color 160ms ${L.ease}, border-color 160ms ${L.ease}, color 160ms ${L.ease}, opacity 180ms ${L.ease}, transform 180ms ${L.ease}; }
          .klio-peek { animation: klioPeek 200ms ${L.ease} both; }
          .klio-list { animation: klioList 180ms ${L.ease} both; }
        }
        @keyframes klioPeek {
          from { opacity: 0; transform: translateX(10px); }
          to { opacity: 1; transform: none; }
        }
        @keyframes klioList {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: none; }
        }
      `}</style>

      <header className="flex h-12 shrink-0 items-center justify-between gap-3 px-4">
        <h1 className="truncate text-[15px] font-[510] tracking-[-0.01em] text-[#f7f8f8]">
          {title}
        </h1>
        <span className="shrink-0 text-[12px]" style={{ color: L.muted }}>
          {items.length}
        </span>
      </header>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
        <div className="klio-list min-w-0 overflow-auto">
          {items.length === 0 ? (
            <p className="px-4 py-10 text-[13px]" style={{ color: L.muted }}>
              {t('inbox.empty', 'Nothing written yet.')}
            </p>
          ) : (
            <ul>
              {items.map((item) => (
                <InboxRow
                  key={item.id}
                  item={item}
                  selected={item.id === selectedId}
                  onSelect={() => replaceItem(item.id)}
                />
              ))}
            </ul>
          )}
        </div>

        <InboxPeek
          key={selected?.id ?? 'empty'}
          item={selected}
          accountSlug={accountSlug}
        />
      </div>
    </section>
  );
}

function InboxRow({
  item,
  selected,
  onSelect,
}: {
  item: ContextItem;
  selected: boolean;
  onSelect: () => void;
}) {
  const replaced = item.supersededBy !== null;

  return (
    <li>
      <button
        type="button"
        data-testid={`inbox-item-${item.id}`}
        aria-current={selected ? 'true' : undefined}
        onClick={onSelect}
        className="klio-soft klio-row flex h-9 w-full items-center gap-3 border-l-2 px-3 text-left text-[13px]"
        style={{
          borderLeftColor: selected ? L.indigo : 'transparent',
          background: selected ? 'rgba(255,255,255,0.04)' : 'transparent',
          color: replaced ? L.muted : L.ink,
        }}
      >
        <span
          aria-hidden="true"
          className="size-3.5 shrink-0 rounded-full border"
          style={{
            borderColor: replaced ? '#3a3c40' : L.indigo,
            background: replaced ? 'transparent' : 'rgba(94,106,210,0.18)',
          }}
        />
        <span
          className={`min-w-0 flex-1 truncate ${replaced ? 'line-through opacity-60' : ''}`}
        >
          {displayMemory(item.content)}
        </span>
        <span className="hidden shrink-0 sm:inline" style={{ color: L.muted }}>
          {item.projectName ?? item.kind}
        </span>
        <span className="hidden shrink-0 md:inline" style={{ color: L.muted }}>
          {item.agentId ? displayAgent(item.agentId) : '---'}
        </span>
        <span className="shrink-0 tabular-nums" style={{ color: L.muted }}>
          {formatRelativeTime(item.createdAt)}
        </span>
      </button>
    </li>
  );
}

function InboxPeek({
  item,
  accountSlug,
}: {
  item: ContextItem | null;
  accountSlug: string;
}) {
  const { t } = useTranslation('agentguard');

  if (!item) {
    return (
      <aside
        className="hidden border-l lg:block"
        style={{ borderColor: L.line }}
      />
    );
  }

  const replaced = item.supersededBy !== null;
  const projectHref = inboxProjectHref(accountSlug, item);

  return (
    <aside
      data-testid="inbox-peek"
      className="klio-peek border-t px-5 py-5 lg:border-t-0 lg:border-l"
      style={{ borderColor: L.line }}
    >
      <p className="mb-2 text-[12px]" style={{ color: L.muted }}>
        {item.kind}
        {item.projectName ? ` · ${item.projectName}` : ''}
      </p>
      <h2
        className={`text-[16px] leading-snug font-[560] tracking-[-0.02em] ${replaced ? 'line-through opacity-60' : ''}`}
        style={{ color: L.ink }}
      >
        {displayMemory(item.content)}
      </h2>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {item.agentId ? (
          <span
            className="inline-flex items-center rounded-md border px-2 py-0.5 text-[12px]"
            style={{ borderColor: L.line, color: L.muted }}
          >
            {displayAgent(item.agentId)}
          </span>
        ) : null}
        <span
          className="inline-flex items-center rounded-md border px-2 py-0.5 text-[12px]"
          style={{ borderColor: L.line, color: L.muted }}
        >
          {formatRelativeTime(item.createdAt)}
        </span>
      </div>

      <div className="mt-6 flex flex-wrap gap-4 text-[13px]">
        <Link
          href={`/home/${accountSlug}/memory/${item.id}`}
          className="klio-soft"
          style={{ color: L.ink }}
        >
          {t('inbox.openMemory', 'Open memory')}
        </Link>
        {projectHref ? (
          <Link
            href={projectHref}
            className="klio-soft"
            style={{ color: L.muted }}
          >
            {t('inbox.openProject', 'Open project')}
          </Link>
        ) : null}
      </div>
    </aside>
  );
}
