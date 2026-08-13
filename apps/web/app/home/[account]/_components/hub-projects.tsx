'use client';

import { useCallback, useMemo, useState } from 'react';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import {
  Hexagon,
  MoreHorizontal,
  PanelRight,
  SlidersHorizontal,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Avatar, AvatarFallback, AvatarImage } from '@kit/ui/avatar';
import { cn } from '@kit/ui/utils';

import {
  type HealthFilter,
  type HubProjectLead,
  type HubProjectRow,
  filterHubProjectRows,
  healthFacetCounts,
  leadFacetCounts,
  parseHealthFilter,
} from '../_lib/hub-projects-model';

/**
 * Linear Projects tokens from the live app (dark):
 * sidebar #09090a · panel #121213 · border #212224 · muted #6b6f76
 */
const L = {
  muted: '#6b6f76',
  ink: '#e2e3e5',
  line: '#212224',
  orange: '#fc7840',
  yellow: '#f2c94c',
  green: '#27a644',
  spark: '#5e6ad2',
} as const;

const AVATARS = [
  '#26b5ce',
  '#eb5757',
  '#f2994a',
  '#bb87fc',
  '#4ea7fc',
  '#27a644',
];

type RailTab = 'health' | 'teams' | 'leads';

export interface HubProjectsProps {
  rows: HubProjectRow[];
  accountSlug: string;
}

export function HubProjects({ rows, accountSlug }: HubProjectsProps) {
  const { t } = useTranslation('agentguard');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const health = parseHealthFilter(searchParams.get('health') ?? undefined);
  const [rail, setRail] = useState<RailTab>('health');
  const [railOpen, setRailOpen] = useState(false);

  const visible = useMemo(
    () => filterHubProjectRows(rows, health),
    [health, rows],
  );
  const facets = useMemo(() => healthFacetCounts(rows), [rows]);
  const leads = useMemo(() => leadFacetCounts(rows), [rows]);

  const setHealth = useCallback(
    (next: HealthFilter) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next === 'all') params.delete('health');
      else params.set('health', next);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    },
    [pathname, router, searchParams],
  );

  return (
    <section
      aria-label={t('hub.projects.sectionLabel', 'Projects')}
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="flex h-12 shrink-0 items-center px-4">
        <h1 className="text-[15px] font-[510] tracking-[-0.01em] text-[#f7f8f8]">
          {t('hub.projects.sectionLabel', 'Projects')}
        </h1>
      </div>

      <div className="flex h-10 shrink-0 items-center justify-between px-3">
        <span
          className="inline-flex h-6 items-center rounded-full px-2 text-[13px] font-[510]"
          style={{ background: 'rgba(255,255,255,0.06)', color: '#f7f8f8' }}
        >
          {t('hub.projects.allProjects', 'All projects')}
        </span>
        <div className="flex items-center gap-0.5">
          <IconBtn
            label={t('hub.projects.toggleInsights', 'Insights')}
            pressed={railOpen}
            onClick={() => setRailOpen((open) => !open)}
          >
            <PanelRight className="size-3.5" strokeWidth={1.75} />
          </IconBtn>
          <IconBtn label="Display">
            <SlidersHorizontal className="size-3.5" strokeWidth={1.75} />
          </IconBtn>
          <IconBtn label="More">
            <MoreHorizontal className="size-3.5" strokeWidth={1.75} />
          </IconBtn>
        </div>
      </div>

      <div
        className={cn(
          'grid min-h-0 flex-1',
          railOpen ? 'xl:grid-cols-[minmax(0,1fr)_260px]' : 'grid-cols-1',
        )}
      >
        <div className="min-w-0 overflow-auto">
          <table className="w-full min-w-[820px] border-collapse text-[13px]">
            <colgroup>
              <col />
              <col className="w-[148px]" />
              <col className="w-[88px]" />
              <col className="w-[72px]" />
              <col className="w-[108px]" />
              <col className="w-[64px]" />
              <col className="w-[108px]" />
            </colgroup>
            <thead>
              <tr className="text-left" style={{ color: L.muted }}>
                <th className="px-4 py-1.5 text-[12px] font-[500]">
                  {t('hub.projects.colName', 'Name')}
                </th>
                <th className="px-2 py-1.5 text-[12px] font-[500]">
                  {t('hub.projects.colHealth', 'Health')}
                </th>
                <th className="px-2 py-1.5 text-[12px] font-[500]">
                  {t('hub.projects.colPriority', 'Priority')}
                </th>
                <th className="px-2 py-1.5 text-[12px] font-[500]">
                  {t('hub.projects.colLead', 'Lead')}
                </th>
                <th className="px-2 py-1.5 text-[12px] font-[500]">
                  {t('hub.projects.colTarget', 'Target date')}
                </th>
                <th className="px-2 py-1.5 text-right text-[12px] font-[500]">
                  {t('hub.projects.colIssues', 'Issues')}
                </th>
                <th className="px-4 py-1.5 text-[12px] font-[500]">
                  {t('hub.projects.colStatus', 'Status')}
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10"
                    style={{ color: L.muted }}
                  >
                    {t('hub.projects.empty', 'No projects yet.')}
                  </td>
                </tr>
              ) : (
                visible.map((row) => (
                  <ProjectRow
                    key={row.id}
                    row={row}
                    href={`/home/${accountSlug}/projects/${row.id}`}
                    t={t}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {railOpen ? (
          <InsightsRail
            rail={rail}
            onRail={setRail}
            health={health}
            onHealth={setHealth}
            facets={facets}
            leads={leads}
            t={t}
          />
        ) : null}
      </div>
    </section>
  );
}

function ProjectRow({
  row,
  href,
  t,
}: {
  row: HubProjectRow;
  href: string;
  t: ReturnType<typeof useTranslation<'agentguard'>>['t'];
}) {
  return (
    <tr
      className="hover:bg-[rgba(255,255,255,0.035)]"
      style={{ color: L.muted }}
    >
      <td className="px-4">
        <Link
          href={href}
          className="flex h-9 items-center gap-2 font-[510] group-hover:bg-transparent"
          style={{ color: L.ink }}
        >
          <Hexagon
            aria-hidden="true"
            className="size-3.5 shrink-0"
            strokeWidth={1.75}
            style={{ color: L.muted }}
          />
          <span className="truncate">{row.name}</span>
        </Link>
      </td>
      <td className="px-2">
        <span className="inline-flex h-9 items-center gap-2">
          <span
            aria-hidden="true"
            className="size-3.5 rounded-full border"
            style={{
              borderColor: row.health === 'on-track' ? L.green : '#3a3c40',
              background:
                row.health === 'on-track'
                  ? 'rgba(39,166,68,0.18)'
                  : 'transparent',
            }}
          />
          {row.health === 'on-track'
            ? t('hub.projects.healthOnTrack', 'On track')
            : t('hub.projects.healthNoUpdates', 'No updates')}
        </span>
      </td>
      <td className="px-2">---</td>
      <td className="px-2">
        {row.lead ? <LeadAvatar lead={row.lead} /> : <span>---</span>}
      </td>
      <td className="px-2" />
      <td className="px-2 text-right tabular-nums">{row.notes}</td>
      <td className="px-4">
        <span className="inline-flex h-9 items-center gap-2">
          <StatusRing percent={row.statusPercent} />
          <span className="tabular-nums">{row.statusPercent}%</span>
          <MiniSpark series={row.series} />
        </span>
      </td>
    </tr>
  );
}

function StatusRing({ percent }: { percent: number }) {
  const radius = 5.5;
  const circ = 2 * Math.PI * radius;
  const tone = percent === 0 ? L.orange : percent < 50 ? L.yellow : L.green;
  const dash = percent === 0 ? circ * 0.88 : circ - (percent / 100) * circ;

  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <circle
        cx="7"
        cy="7"
        r={radius}
        fill="none"
        stroke="#2a2c30"
        strokeWidth="1.5"
      />
      <circle
        cx="7"
        cy="7"
        r={radius}
        fill="none"
        stroke={tone}
        strokeWidth="1.5"
        strokeDasharray={circ}
        strokeDashoffset={dash}
        strokeLinecap="round"
        transform="rotate(-90 7 7)"
      />
    </svg>
  );
}

function MiniSpark({ series }: { series: HubProjectRow['series'] }) {
  const counts = series.map((point) => point.count);
  const max = Math.max(0, ...counts);
  if (max <= 0 || counts.every((count) => count === 0)) {
    return <span className="inline-block w-10" />;
  }

  const w = 40;
  const h = 14;
  const step = counts.length > 1 ? w / (counts.length - 1) : w;
  const d = counts
    .map((count, index) => {
      const x = index * step;
      const y = h - (count / max) * (h - 2) - 1;
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <path d={d} fill="none" stroke={L.spark} strokeWidth="1.25" />
    </svg>
  );
}

function LeadAvatar({ lead }: { lead: HubProjectLead }) {
  const initials = initialsFor(lead.name);
  const color = AVATARS[hash(lead.userId) % AVATARS.length] ?? AVATARS[0]!;
  return (
    <span title={lead.name} className="inline-flex">
      <Avatar className="size-[22px]">
        <AvatarImage src={lead.pictureUrl ?? undefined} alt="" />
        <AvatarFallback
          className="text-[10px] font-[590] text-white"
          style={{ background: color }}
        >
          {initials}
        </AvatarFallback>
      </Avatar>
    </span>
  );
}

function initialsFor(label: string): string {
  const parts = label.split(/[\s/_-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
  }
  return label.slice(0, 2).toUpperCase();
}

function hash(value: string): number {
  return [...value].reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

function IconBtn({
  label,
  pressed,
  onClick,
  children,
}: {
  label: string;
  pressed?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      onClick={onClick}
      className="inline-flex size-7 items-center justify-center rounded-md"
      style={{
        color: L.muted,
        background: pressed ? 'rgba(255,255,255,0.06)' : 'transparent',
      }}
    >
      {children}
    </button>
  );
}

function InsightsRail({
  rail,
  onRail,
  health,
  onHealth,
  facets,
  leads,
  t,
}: {
  rail: RailTab;
  onRail: (tab: RailTab) => void;
  health: HealthFilter;
  onHealth: (next: HealthFilter) => void;
  facets: ReturnType<typeof healthFacetCounts>;
  leads: ReturnType<typeof leadFacetCounts>;
  t: ReturnType<typeof useTranslation<'agentguard'>>['t'];
}) {
  return (
    <aside className="border-l px-3 pt-2" style={{ borderColor: L.line }}>
      <div className="mb-3 flex gap-1">
        {(['health', 'teams', 'leads'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => onRail(tab)}
            className="rounded-full px-2.5 py-1 text-[12px]"
            style={{
              color: rail === tab ? '#f7f8f8' : L.muted,
              background:
                rail === tab ? 'rgba(255,255,255,0.08)' : 'transparent',
            }}
          >
            {tab === 'health'
              ? t('hub.projects.railHealth', 'Health')
              : tab === 'teams'
                ? t('hub.projects.railTeams', 'Teams')
                : t('hub.projects.railLeads', 'Leads')}
          </button>
        ))}
      </div>

      {rail === 'health' ? (
        <ul className="flex flex-col">
          <FacetRow
            active={health === 'no-updates'}
            onClick={() =>
              onHealth(health === 'no-updates' ? 'all' : 'no-updates')
            }
            label={t('hub.projects.healthNoUpdates', 'No updates')}
            count={facets.noUpdates}
            swatch="empty"
          />
          <FacetRow
            active={health === 'on-track'}
            onClick={() => onHealth(health === 'on-track' ? 'all' : 'on-track')}
            label={t('hub.projects.healthOnTrack', 'On track')}
            count={facets.onTrack}
            swatch="green"
          />
          <FacetRow
            active={health === 'not-recalled'}
            onClick={() =>
              onHealth(health === 'not-recalled' ? 'all' : 'not-recalled')
            }
            label={t('hub.projects.healthNotRecalled', 'Not recalled')}
            count={facets.notRecalled}
            swatch="orange"
          />
        </ul>
      ) : null}

      {rail === 'teams' ? (
        <p className="px-1 py-4 text-[13px]" style={{ color: L.muted }}>
          {t('hub.projects.noTeams', 'No teams.')}
        </p>
      ) : null}

      {rail === 'leads' ? (
        leads.length === 0 ? (
          <p className="px-1 py-4 text-[13px]" style={{ color: L.muted }}>
            {t('hub.projects.noLeads', 'No leads yet.')}
          </p>
        ) : (
          <ul className="flex flex-col">
            {leads.map(({ lead, count }) => (
              <li
                key={lead.userId}
                className="flex items-center justify-between px-1 py-1.5 text-[13px]"
                style={{ color: L.ink }}
              >
                <span className="inline-flex items-center gap-2">
                  <LeadAvatar lead={lead} />
                  {lead.name}
                </span>
                <span style={{ color: L.muted }}>{count}</span>
              </li>
            ))}
          </ul>
        )
      ) : null}
    </aside>
  );
}

function FacetRow({
  active,
  onClick,
  label,
  count,
  swatch,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  swatch: 'empty' | 'green' | 'orange';
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center justify-between rounded-md px-1.5 py-1.5 text-left text-[13px]"
        style={{
          background: active ? 'rgba(255,255,255,0.05)' : 'transparent',
          color: L.muted,
        }}
      >
        <span className="inline-flex items-center gap-2">
          <span
            aria-hidden="true"
            className="size-3.5 rounded-full border"
            style={{
              borderColor:
                swatch === 'green'
                  ? L.green
                  : swatch === 'orange'
                    ? L.orange
                    : '#3a3c40',
              background:
                swatch === 'green'
                  ? 'rgba(39,166,68,0.18)'
                  : swatch === 'orange'
                    ? 'rgba(252,120,64,0.15)'
                    : 'transparent',
            }}
          />
          {label}
        </span>
        <span>{count}</span>
      </button>
    </li>
  );
}
