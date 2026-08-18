import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';

import { ProjectStrip } from '../_components/shell/project-strip';
import { ShellList } from '../_components/shell/shell-list';
import { ShellPage } from '../_components/shell/shell-page';
import { loadAccountViewer } from '../_lib/server/account-viewer';
import { loadProjectStrip } from '../_lib/server/project-strip.loader';
import { loadShellContextData, orFallback } from '../_lib/server/shell-data';
import { SHELL_COPY } from '../_lib/shell/shell-copy';
import { resolveOrgId } from '~/lib/agentguard/resolve-org-id';

interface ContextPageProps {
  params: Promise<{ account: string }>;
  searchParams: Promise<{ project?: string }>;
}

export const generateMetadata = async () => {
  const i18n = await createI18nServerInstance();

  return { title: i18n.t('agentguard:context.pageTitle') };
};

/**
 * Context — "every item, freshest first".
 *
 * The flat list. The shared/private split is its own screen (`/shared`),
 * because that is the prototype's structure: Context answers "what is in
 * here", Shared answers "who can see it".
 *
 * `?project=` arrives from the Projects screen, which filters on click.
 */
async function ContextPage({ params, searchParams }: ContextPageProps) {
  const [{ account }, { project }] = await Promise.all([params, searchParams]);
  const data = await loadShellContextData(account);

  // The sharing strip, only when a project is named. `loadProjectStrip`
  // returns null for a non-member, an unknown name and an ambiguous one
  // alike, so a missing strip never tells you which of those it was.
  const strip = project
    ? await orFallback('projectStrip', null, async () => {
        const [orgId, viewer] = await Promise.all([
          resolveOrgId(account),
          loadAccountViewer(account),
        ]);

        return loadProjectStrip(orgId, project, viewer.userId);
      })
    : null;

  return (
    <ShellPage
      title={SHELL_COPY.context.title}
      subtitle={SHELL_COPY.context.subtitle}
    >
      <ShellList
        above={strip ? <ProjectStrip data={strip} accountSlug={account} /> : undefined}
        items={data.items}
        kinds={data.kinds}
        projects={data.projects.map((p) => ({ name: p.name, count: p.items }))}
        accountSlug={account}
        initialProject={project ?? null}
      />
    </ShellPage>
  );
}

export default withI18n(ContextPage);
