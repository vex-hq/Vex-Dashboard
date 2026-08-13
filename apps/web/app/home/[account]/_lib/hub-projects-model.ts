import type { ProjectPulse } from './server/context-stream.loader';
import type { ProjectUsage } from './server/context-usage.loader';
import type { DayPoint, ProjectSpark } from './server/hub-summary.loader';

/**
 * Linear Projects row for the Hub.
 *
 * Health is recency of WRITES, the same job Linear's Health column does
 * ("No updates" vs "On track"). Whether anyone RECALLED the notes is Status
 * (completion ring) plus the extra "Not recalled" facet. Those two questions
 * used to be mixed into "Live" / "Never asked" list groups, which is why
 * they did not parse.
 */
export const HEALTH_STALE_MS = 7 * 24 * 60 * 60 * 1000;

export const HEALTH_FILTERS = [
  'all',
  'on-track',
  'no-updates',
  'not-recalled',
] as const;

export type HealthFilter = (typeof HEALTH_FILTERS)[number];

export type ProjectHealth = 'on-track' | 'no-updates';

export interface HubProjectRow {
  id: string;
  name: string;
  notes: number;
  recalled: number;
  lastActivityAt: string | null;
  leadAgent: string | null;
  series: readonly DayPoint[];
  health: ProjectHealth;
  notRecalled: boolean;
  statusPercent: number;
}

export function parseHealthFilter(raw: string | undefined): HealthFilter {
  if (raw === 'on-track' || raw === 'no-updates' || raw === 'not-recalled') {
    return raw;
  }
  return 'all';
}

export function projectHealth(
  lastActivityAt: string | null,
  now: Date,
): ProjectHealth {
  if (!lastActivityAt) return 'no-updates';
  const at = new Date(lastActivityAt).getTime();
  if (Number.isNaN(at)) return 'no-updates';
  return now.getTime() - at < HEALTH_STALE_MS ? 'on-track' : 'no-updates';
}

export function statusPercent(notes: number, recalled: number): number {
  if (notes <= 0 || recalled <= 0) return 0;
  return Math.min(100, Math.round((recalled / notes) * 100));
}

export function buildHubProjectRows(
  usage: readonly ProjectUsage[],
  pulses: readonly ProjectPulse[],
  sparks: readonly ProjectSpark[],
  now: Date = new Date(),
): HubProjectRow[] {
  const usageById = new Map(
    usage
      .filter((row): row is ProjectUsage & { projectId: string } =>
        Boolean(row.projectId),
      )
      .map((row) => [row.projectId, row]),
  );
  const pulseById = new Map(pulses.map((row) => [row.projectId, row]));
  const sparkById = new Map(sparks.map((row) => [row.projectId, row]));

  const ids = new Set<string>([
    ...usageById.keys(),
    ...pulseById.keys(),
    ...sparkById.keys(),
  ]);

  const rows: HubProjectRow[] = [];

  for (const id of ids) {
    const used = usageById.get(id);
    const pulse = pulseById.get(id);
    const spark = sparkById.get(id);
    const name = spark?.name ?? pulse?.name ?? used?.projectName;
    if (!name) continue;

    const notes = used?.memories30d ?? 0;
    const recalled = used?.recalls30d ?? 0;
    const lastActivityAt = pulse?.lastItemAt ?? lastSparkDay(spark?.series);
    const leadAgent = pulse?.agentsActive[0] ?? null;

    rows.push({
      id,
      name,
      notes,
      recalled,
      lastActivityAt,
      leadAgent,
      series: spark?.series ?? [],
      health: projectHealth(lastActivityAt, now),
      notRecalled: notes > 0 && recalled === 0,
      statusPercent: statusPercent(notes, recalled),
    });
  }

  return rows.sort((left, right) => {
    if (!left.lastActivityAt && !right.lastActivityAt) return 0;
    if (!left.lastActivityAt) return 1;
    if (!right.lastActivityAt) return -1;
    return right.lastActivityAt.localeCompare(left.lastActivityAt);
  });
}

export function filterHubProjectRows(
  rows: readonly HubProjectRow[],
  health: HealthFilter,
): HubProjectRow[] {
  switch (health) {
    case 'on-track':
      return rows.filter((row) => row.health === 'on-track');
    case 'no-updates':
      return rows.filter((row) => row.health === 'no-updates');
    case 'not-recalled':
      return rows.filter((row) => row.notRecalled);
    default:
      return [...rows];
  }
}

export function healthFacetCounts(rows: readonly HubProjectRow[]): {
  onTrack: number;
  noUpdates: number;
  notRecalled: number;
} {
  return {
    onTrack: rows.filter((row) => row.health === 'on-track').length,
    noUpdates: rows.filter((row) => row.health === 'no-updates').length,
    notRecalled: rows.filter((row) => row.notRecalled).length,
  };
}

export function leadFacetCounts(
  rows: readonly HubProjectRow[],
): Array<{ agent: string; count: number }> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    if (!row.leadAgent) continue;
    counts.set(row.leadAgent, (counts.get(row.leadAgent) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([agent, count]) => ({ agent, count }))
    .sort(
      (left, right) =>
        right.count - left.count || left.agent.localeCompare(right.agent),
    );
}

function lastSparkDay(series: readonly DayPoint[] | undefined): string | null {
  if (!series) return null;
  for (let index = series.length - 1; index >= 0; index -= 1) {
    const point = series[index];
    if (point && point.count > 0) return `${point.day}T00:00:00.000Z`;
  }
  return null;
}
