import { resolveOrgId } from '~/lib/agentguard/resolve-org-id';
import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';

import { ShellNote, StatCards } from './_components/shell/shell-chrome';
import { ShellList } from './_components/shell/shell-list';
import { ShellPage } from './_components/shell/shell-page';
import { loadAccountViewer } from './_lib/server/account-viewer';
import { orFallback, loadShellContextData } from './_lib/server/shell-data';
import { loadShellHomeStats } from './_lib/server/shell-stats.loader';
import { SHELL_COPY } from './_lib/shell/shell-copy';

interface TeamAccountHomePageProps {
  params: Promise<{ account: string }>;
}

export const generateMetadata = async () => {
  const i18n = await createI18nServerInstance();

  return { title: i18n.t('common:routes.dashboard') };
};

const ZERO_STATS = {
  contextItems: 0,
  projects: 0,
  recallsServed: 0,
  privateActive: 0,
  orgActive: 0,
};

/**
 * Home — "what your agents are working from".
 *
 * Four numbers, one uncomfortable fact, then the context itself.
 *
 * This replaces the Hub's projects table. That table was styled after Linear's
 * Projects page and carried its column set — Health, Priority, Lead, Target
 * date, Issues, Status — of which two had no backing field at all and one
 * ("Issues") labelled the memory count. None of it is in the approved
 * prototype; the projects list lives at /projects now, with three columns.
 *
 * `recallsAcrossLoaded` is summed from the rows actually loaded because the
 * card says "recalls across top N" and must agree with the list beneath it.
 */
async function TeamAccountHomePage({ params }: TeamAccountHomePageProps) {
  const { account } = await params;

  const [orgId, viewer] = await Promise.all([
    resolveOrgId(account),
    loadAccountViewer(account),
  ]);

  const [data, stats] = await Promise.all([
    loadShellContextData(account),
    orFallback('homeStats', ZERO_STATS, () =>
      loadShellHomeStats(orgId, viewer.userId),
    ),
  ]);

  const recallsAcrossLoaded = data.items.reduce(
    (total, item) => total + item.recalls,
    0,
  );

  return (
    <ShellPage
      title={SHELL_COPY.home.title}
      subtitle={SHELL_COPY.home.subtitle}
    >
      <ShellList
        items={data.items}
        kinds={data.kinds}
        projects={data.projects.map((p) => ({ name: p.name, count: p.items }))}
        accountSlug={account}
        above={
          <div className="flex flex-col gap-3">
            <StatCards
              stats={[
                {
                  value: stats.contextItems.toLocaleString(),
                  label: 'context items',
                },
                {
                  value: recallsAcrossLoaded.toLocaleString(),
                  label: `recalls across top ${data.items.length}`,
                },
                {
                  value: stats.recallsServed.toLocaleString(),
                  label: 'recalls served',
                },
                {
                  value: stats.projects.toLocaleString(),
                  label: 'projects',
                },
              ]}
            />

            <ShellNote>
              Scope reality: {stats.privateActive.toLocaleString()} private ·{' '}
              {stats.orgActive.toLocaleString()} org-scoped.{' '}
              {stats.orgActive === 0
                ? 'Nothing has been shared yet — a team stream would be empty.'
                : 'Sharing is what makes this a team brain.'}
            </ShellNote>
          </div>
        }
      />
    </ShellPage>
  );
}

export default withI18n(TeamAccountHomePage);
