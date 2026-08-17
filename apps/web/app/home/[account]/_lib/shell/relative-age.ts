/**
 * Relative age, in the approved prototype's format.
 *
 * `klio-v4.html` renders every timestamp through one function and shows a
 * single unit with no suffix: `4m`, `7h`, `12d`. This is NOT the same as the
 * repo's existing `formatRelativeTime`, which produces "4 minutes ago" — the
 * prototype's columns are narrow and its rows are dense, and the spec is a
 * transcription, so the prototype's format is the one that ships.
 *
 * Transcribed from the prototype verbatim:
 *
 *     const ago=iso=>{const m=(Date.now()-new Date(iso))/6e4;
 *       if(m<60)return Math.max(1,Math.round(m))+'m';
 *       if(m<1440)return Math.round(m/60)+'h';
 *       return Math.round(m/1440)+'d';};
 *
 * The `Math.max(1, …)` floor matters: a row captured seconds ago reads `1m`,
 * never `0m`. Zero would read as "no age recorded" rather than "just now".
 *
 * `now` is injected rather than read from the clock so the behaviour is
 * testable without freezing time globally.
 */
export function relativeAge(iso: string, now: Date = new Date()): string {
  const then = new Date(iso).getTime();

  // An unparseable timestamp must not render "NaNd". Callers get an em dash,
  // which reads as "not known" instead of as a broken number.
  if (Number.isNaN(then)) return '—';

  const minutes = (now.getTime() - then) / 60_000;

  // A clock skew between the database and the renderer can put a row in the
  // future. Clamping to the floor keeps it at `1m` rather than `-3m`.
  if (minutes < 60) return `${Math.max(1, Math.round(minutes))}m`;
  if (minutes < 1440) return `${Math.round(minutes / 60)}h`;

  return `${Math.round(minutes / 1440)}d`;
}
