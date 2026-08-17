import { resolveOrgId } from '~/lib/agentguard/resolve-org-id';
import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';

import { EmptyState } from '../_components/shell/context-table';
import { ShellPage } from '../_components/shell/shell-page';
import { L } from '../_components/shell/shell-tokens';
import {
  displayRecallSource,
  loadShellRecallSources,
} from '../_lib/server/shell-agents.loader';
import type { ShellRecallSource } from '../_lib/server/shell-context.types';
import { orFallback } from '../_lib/server/shell-data';
import { SHELL_COPY } from '../_lib/shell/shell-copy';
import { relativeAge } from '../_lib/shell/relative-age';

export const generateMetadata = async () => {
  const i18n = await createI18nServerInstance();

  return { title: i18n.t('agentguard:agents.pageTitle') };
};

/**
 * Agents — "who is connected and what they claimed".
 *
 * Recall traffic grouped by source, then the claims state.
 *
 * The claims block says "no active claims" as a statement of fact, not as a
 * placeholder: `work_claims` holds two rows and neither is active. When agents
 * start claiming work this becomes a list; until then the honest thing is to
 * say what the table contains and explain what would put something in it.
 */
async function AgentsPage({
  params,
}: {
  params: Promise<{ account: string }>;
}) {
  const { account } = await params;
  const orgId = await resolveOrgId(account);

  const sources = await orFallback('agents', [] as ShellRecallSource[], () =>
    loadShellRecallSources(orgId),
  );

  return (
    <ShellPage
      title={SHELL_COPY.agents.title}
      subtitle={SHELL_COPY.agents.subtitle}
    >
      <div className="flex flex-col gap-4">
        {sources.length === 0 ? (
          <EmptyState
            title="No agent has recalled yet"
            body="Connect an agent and its first recall appears here, with what it asked through."
          />
        ) : (
          <div
            className="overflow-hidden rounded-[6px] border"
            style={{ borderColor: L.line }}
          >
            <div
              className="grid h-8 items-center gap-3 border-b px-3 text-[11px] tracking-wide uppercase"
              style={{
                borderColor: L.line,
                color: L.muted,
                gridTemplateColumns: '1fr 140px 100px 80px',
              }}
            >
              <span>Agent</span>
              <span>Source</span>
              <span className="text-right">Recalls</span>
              <span className="text-right">Last</span>
            </div>

            <ul className="divide-y" style={{ borderColor: L.line }}>
              {sources.map((row) => (
                <li
                  key={row.source}
                  className="grid h-9 items-center gap-3 px-3 text-[13px]"
                  style={{
                    borderColor: L.line,
                    gridTemplateColumns: '1fr 140px 100px 80px',
                    color: L.ink,
                  }}
                >
                  <span className="truncate">
                    {displayRecallSource(row.source)}
                  </span>
                  <span className="truncate" style={{ color: L.muted }}>
                    {row.source}
                  </span>
                  <span
                    className="text-right tabular-nums"
                    style={{ color: L.muted }}
                  >
                    {row.recalls.toLocaleString()}
                  </span>
                  <span
                    className="text-right tabular-nums"
                    style={{ color: L.muted }}
                  >
                    {row.last ? relativeAge(row.last) : '—'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <EmptyState
          title="No active claims"
          body="When an agent claims work, it appears here so others don't duplicate it."
        />
      </div>
    </ShellPage>
  );
}

export default withI18n(AgentsPage);
