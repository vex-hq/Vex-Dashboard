import { resolveOrgId } from '~/lib/agentguard/resolve-org-id';
import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';

import { SharedView } from '../_components/shell/shared-view';
import { ShellPage } from '../_components/shell/shell-page';
import { loadAccountViewer } from '../_lib/server/account-viewer';
import {
  loadShellPrivateGroup,
  loadShellSharedGroup,
} from '../_lib/server/shell-groups.loader';
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

  // TWO LOADERS, NOT ONE FILTERED LIST. Partitioning a capped "newest N" list
  // on scope loses a shared row that is older than the cap — which is this
  // org's exact shape (5,196 private, 1 shared, the shared one old), and would
  // render "Nothing shared yet" when something is. See shell-groups.loader.
  const [shared, mine] = await Promise.all([
    orFallback('sharedGroup', [] as ShellContextItem[], () =>
      loadShellSharedGroup(orgId),
    ),
    orFallback('privateGroup', [] as ShellContextItem[], () =>
      loadShellPrivateGroup(orgId, viewer.userId),
    ),
  ]);

  return (
    <ShellPage
      title={SHELL_COPY.shared.title}
      subtitle={SHELL_COPY.shared.subtitle}
    >
      <SharedView shared={shared} mine={mine} accountSlug={account} />
    </ShellPage>
  );
}

export default withI18n(SharedPage);
