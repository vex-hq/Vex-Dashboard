import { resolveOrgId } from '~/lib/agentguard/resolve-org-id';
import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';

import { LinearPanel } from '../_components/linear-panel';
import { loadAccountViewer } from '../_lib/server/account-viewer';
import { loadContextStream } from '../_lib/server/context-stream.loader';
import { InboxFeed } from './_components/inbox-feed';

const INBOX_DAYS = 7;
const INBOX_LIMIT = 50;

interface InboxPageProps {
  params: Promise<{ account: string }>;
}

export const generateMetadata = async () => {
  const i18n = await createI18nServerInstance();

  return { title: i18n.t('agentguard:inbox.pageTitle') };
};

/**
 * What just happened: recent writes the viewer may read.
 *
 * Not the old mixed inbox. No project aggregates. A row is a memory.
 */
async function InboxPage({ params }: InboxPageProps) {
  const { account } = await params;

  const [orgId, viewer] = await Promise.all([
    resolveOrgId(account),
    loadAccountViewer(account),
  ]);

  const items = await loadContextStream(
    orgId,
    viewer.userId,
    { days: INBOX_DAYS },
    INBOX_LIMIT,
  );

  return (
    <LinearPanel>
      <InboxFeed items={items} accountSlug={account} />
    </LinearPanel>
  );
}

export default withI18n(InboxPage);
