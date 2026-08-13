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

/** The human who created the project. Lead is a person, never an agent. */
export interface HubProjectLead {
  userId: string;
  name: string;
  pictureUrl: string | null;
}

export interface HubProjectRow {
  id: string;
  name: string;
  notes: number;
  recalled: number;
  lastActivityAt: string | null;
  lead: HubProjectLead | null;
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
  people: ReadonlyMap<string, HubProjectLead> = new Map(),
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
    const createdBy = pulse?.createdBy ?? spark?.createdBy ?? null;
    const lead = createdBy ? (people.get(createdBy) ?? null) : null;

    rows.push({
      id,
      name,
      notes,
      recalled,
      lastActivityAt,
      lead,
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
): Array<{ lead: HubProjectLead; count: number }> {
  const counts = new Map<string, { lead: HubProjectLead; count: number }>();
  for (const row of rows) {
    if (!row.lead) continue;
    const existing = counts.get(row.lead.userId);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(row.lead.userId, { lead: row.lead, count: 1 });
    }
  }
  return [...counts.values()].sort(
    (left, right) =>
      right.count - left.count || left.lead.name.localeCompare(right.lead.name),
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
