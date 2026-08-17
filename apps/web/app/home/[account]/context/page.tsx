import { resolveOrgId } from '~/lib/agentguard/resolve-org-id';
import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';

import { LinearPanel } from '../_components/linear-panel';
import { loadAccountViewer } from '../_lib/server/account-viewer';
import { ContextSplit } from './_components/context-split';
import type {
  ContextGroup,
  ContextItemDetail,
} from './_lib/server/context-surfaces.types';
import { loadContextItemDetail } from './_lib/server/item-evidence.loader';
import { loadMyPrivateContext } from './_lib/server/my-private-context.loader';
import { loadSharedContext } from './_lib/server/shared-context.loader';

interface ContextPageProps {
  params: Promise<{ account: string }>;
  searchParams: Promise<{ item?: string }>;
}

export const generateMetadata = async () => {
  const i18n = await createI18nServerInstance();

  return { title: i18n.t('agentguard:context.pageTitle') };
};

/**
 * Run one loader, degrading to `fallback` if it fails.
 *
 * Copied from the home page's own `orFallback` and kept identical on purpose.
 * The reason is documented there at length: a cold Neon resume blowing the
 * connect budget used to throw out of a server component and turn the whole
 * page into an error screen (production digests 1176364607 / 1376536570). A
 * group that renders its empty state is worth strictly more than a crash page,
 * so each loader fails alone.
 *
 * NOTE what the fallbacks are: an empty group with total 0, and a `null`
 * detail. Both are indistinguishable from "you have nothing here", which is
 * the SAFE direction to be wrong in on this particular screen — the failure
 * mode that matters is a loader error somehow widening what is shown, and an
 * empty fallback cannot do that.
 */
async function orFallback<T>(
  label: string,
  fallback: T,
  run: () => Promise<T>,
): Promise<T> {
  try {
    return await run();
  } catch (error) {
    console.error(`[context] loader "${label}" failed; rendering fallback`, {
      error: error instanceof Error ? error.message : String(error),
    });

    return fallback;
  }
}

const EMPTY_GROUP: ContextGroup = { items: [], total: 0 };

/**
 * The context split.
 *
 * Two loaders, two predicates, two groups — never one parameterised query. The
 * viewer is resolved from the session; the account slug in the URL is
 * authorised by `resolveOrgId`, which asserts membership before it hands back
 * an org id.
 *
 * The selected item's detail is loaded through the ladder-gated evidence
 * loader, so an `?item=` naming somebody else's private row renders an empty
 * peek pane rather than anything about that row.
 */
async function ContextPage({ params, searchParams }: ContextPageProps) {
  const { account } = await params;
  const { item } = await searchParams;

  const [orgId, viewer] = await Promise.all([
    resolveOrgId(account),
    loadAccountViewer(account),
  ]);

  const [shared, privateGroup, detail] = await Promise.all([
    orFallback('sharedContext', EMPTY_GROUP, () => loadSharedContext(orgId)),
    orFallback('privateContext', EMPTY_GROUP, () =>
      loadMyPrivateContext(orgId, viewer.userId),
    ),
    orFallback<ContextItemDetail | null>('itemDetail', null, () =>
      item
        ? loadContextItemDetail(orgId, item, { userId: viewer.userId })
        : Promise.resolve(null),
    ),
  ]);

  return (
    <LinearPanel>
      <ContextSplit
        accountSlug={account}
        shared={shared}
        privateGroup={privateGroup}
        detail={detail}
      />
    </LinearPanel>
  );
}

export default withI18n(ContextPage);
