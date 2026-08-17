import { resolveOrgId } from '~/lib/agentguard/resolve-org-id';
import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';

import { SharedView } from '../_components/shell/shared-view';
import { ShellPage } from '../_components/shell/shell-page';
import { loadAccountViewer } from '../_lib/server/account-viewer';
import { loadShellContext } from '../_lib/server/shell-context.loader';
import type { ShellContextItem } from '../_lib/server/shell-context.types';
import { orFallback } from '../_lib/server/shell-data';
import { SHELL_COPY } from '../_lib/shell/shell-copy';

export const generateMetadata = async () => {
  const i18n = await createI18nServerInstance();

  return { title: i18n.t('agentguard:shared.pageTitle') };
};

/**
 * Shared — "what your team can see, and what only you can".
 *
 * The split is derived from `scope` on rows the loader already gated. The
 * grouping is presentational; whether a row may appear here at all was decided
 * in SQL by `loadShellContext`, whose two hard-coded branches are the boundary.
 *
 * This is the highest-value screen in the product: it is the only place a human
 * turns private context into team context.
 */
async function SharedPage({ params }: { params: Promise<{ account: string }> }) {
  const { account } = await params;

  const [orgId, viewer] = await Promise.all([
    resolveOrgId(account),
    loadAccountViewer(account),
  ]);

  const items = await orFallback('shared', [] as ShellContextItem[], () =>
    loadShellContext(orgId, viewer.userId),
  );

  return (
    <ShellPage
      title={SHELL_COPY.shared.title}
      subtitle={SHELL_COPY.shared.subtitle}
    >
      <SharedView
        shared={items.filter((i) => i.scope === 'org')}
        mine={items.filter((i) => i.scope !== 'org')}
        accountSlug={account}
      />
    </ShellPage>
  );
}

export default withI18n(SharedPage);
