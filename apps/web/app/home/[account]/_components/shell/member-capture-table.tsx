import type { MemberCapture } from '../../_lib/server/member-capture.loader';
import type { WorkspacePerson } from '../../_lib/server/workspace-people.loader';
import { relativeAge } from '../../_lib/shell/relative-age';
import { L } from './shell-tokens';

/**
 * Who on the team is actually capturing, and who only appears to be.
 *
 * THE ZERO ROW IS THE POINT. A teammate who has been added, signed in and
 * holds a working key looks completely healthy everywhere else in the product;
 * the only thing that distinguishes them from a working setup is that nothing
 * has ever arrived. So the row for a person with no captures is written to be
 * read as a state that needs an action, not as an empty cell.
 *
 * Counts and timestamps only. This says whether somebody's agent is working —
 * never a word of what it captured, including for a viewer who is an admin.
 */
export function MemberCaptureTable({
  people,
  capture,
}: {
  people: WorkspacePerson[];
  capture: Map<string, MemberCapture>;
}) {
  if (people.length === 0) return null;

  const rows = people
    .map((person) => ({ person, stats: capture.get(person.userId) ?? null }))
    .sort((a, b) => (b.stats?.memories ?? 0) - (a.stats?.memories ?? 0));

  const silent = rows.filter((r) => !r.stats || r.stats.memories === 0).length;

  return (
    <section className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-[13px] font-[590]" style={{ color: L.ink }}>
          People
        </h3>
        {silent > 0 ? (
          <p className="text-[12px]" style={{ color: L.warn }}>
            {silent === 1
              ? '1 person has not captured anything yet'
              : `${silent} people have not captured anything yet`}
          </p>
        ) : null}
      </div>

      <div
        className="overflow-hidden rounded-[6px] border"
        style={{ borderColor: L.line }}
      >
        <div
          className="grid h-8 items-center gap-3 border-b px-3 text-[11px] tracking-wide uppercase"
          style={{
            borderColor: L.line,
            color: L.muted,
            gridTemplateColumns: '1fr 110px 90px 110px',
          }}
        >
          <span>Person</span>
          <span className="text-right">Captured</span>
          <span className="text-right">Agents</span>
          <span className="text-right">Last capture</span>
        </div>

        <ul className="divide-y" style={{ borderColor: L.line }}>
          {rows.map(({ person, stats }) => {
            const quiet = !stats || stats.memories === 0;

            return (
              <li
                key={person.userId}
                className="grid h-9 items-center gap-3 px-3 text-[13px]"
                style={{
                  borderColor: L.line,
                  gridTemplateColumns: '1fr 110px 90px 110px',
                  color: L.ink,
                }}
              >
                <span className="truncate">
                  {person.name}
                  {person.email && person.email !== person.name ? (
                    <span className="ml-2" style={{ color: L.muted }}>
                      {person.email}
                    </span>
                  ) : null}
                </span>

                <span
                  className="text-right tabular-nums"
                  style={{ color: quiet ? L.warn : L.muted }}
                >
                  {quiet ? 'nothing yet' : stats.memories.toLocaleString()}
                </span>

                <span
                  className="text-right tabular-nums"
                  style={{ color: L.muted }}
                >
                  {stats?.agents ? stats.agents : '—'}
                </span>

                <span
                  className="text-right tabular-nums"
                  style={{ color: L.muted }}
                >
                  {stats?.lastCaptureAt
                    ? relativeAge(stats.lastCaptureAt)
                    : '—'}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {silent > 0 ? (
        <p
          className="border-l-2 py-0.5 pl-2 text-[12px] leading-relaxed"
          style={{ borderColor: L.warn, color: L.muted }}
        >
          Being added to the workspace does not start capture. Their agent has
          to be wired with{' '}
          <code style={{ color: L.ink }}>npx @klio-tech/klio@latest init</code>{' '}
          — the scoped name matters, <code>klio</code> alone is an unrelated
          package. Capture begins on their next session.
        </p>
      ) : null}
    </section>
  );
}
