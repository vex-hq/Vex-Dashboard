import { resolveOrgId } from '~/lib/agentguard/resolve-org-id';
import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';

import { ShellPage } from '../_components/shell/shell-page';
import { L } from '../_components/shell/shell-tokens';
import {
  displayRecallSource,
  loadShellRecallSources,
} from '../_lib/server/shell-agents.loader';
import type { ShellRecallSource } from '../_lib/server/shell-context.types';
import { orFallback } from '../_lib/server/shell-data';
import { SHELL_COPY } from '../_lib/shell/shell-copy';

export const generateMetadata = async () => {
  const i18n = await createI18nServerInstance();

  return { title: i18n.t('agentguard:setup.pageTitle') };
};

/** The memory endpoint every client connects through. */
const MEMORY_ENDPOINT = 'mcp.klio.tech';

/**
 * Setup — "keys and agents".
 *
 * The Connected card: which agents have actually reached this org, and how
 * each one is wired.
 *
 * The subtitle lists what HAS connected, taken from recall traffic, rather
 * than a fixed list of what could. A hardcoded roster would claim Cursor is
 * connected on an account that has never seen it.
 */
async function SetupPage({ params }: { params: Promise<{ account: string }> }) {
  const { account } = await params;
  const orgId = await resolveOrgId(account);

  const sources = await orFallback('setup', [] as ShellRecallSource[], () =>
    loadShellRecallSources(orgId),
  );

  return (
    <ShellPage
      title={SHELL_COPY.setup.title}
      subtitle={SHELL_COPY.setup.subtitle}
    >
      <div
        className="rounded-[6px] border px-4 py-4"
        style={{ borderColor: L.line }}
      >
        <h3 className="text-[13px] font-[590]" style={{ color: L.ink }}>
          Connected
        </h3>
        <p className="mt-1 text-[12px]" style={{ color: L.muted }}>
          {sources.length === 0
            ? 'Nothing has connected yet.'
            : sources.map((s) => displayRecallSource(s.source)).join(' · ')}
        </p>

        <dl
          className="mt-3 divide-y rounded-[6px] border"
          style={{ borderColor: L.line }}
        >
          <Row label="Claude Code" value="hooks — inject + capture" />
          <Row label="Codex" value="proxy — inject + capture" />
          <Row label="Memory endpoint" value={MEMORY_ENDPOINT} />
        </dl>
      </div>
    </ShellPage>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex items-center justify-between gap-3 px-3 py-2 text-[12px]"
      style={{ borderColor: L.line }}
    >
      <dt style={{ color: L.muted }}>{label}</dt>
      <dd style={{ color: L.ink }}>{value}</dd>
    </div>
  );
}

export default withI18n(SetupPage);
