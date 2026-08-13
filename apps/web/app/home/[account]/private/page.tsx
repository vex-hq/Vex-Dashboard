import { resolveOrgId } from '~/lib/agentguard/resolve-org-id';
import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';

import { LinearPanel } from '../_components/linear-panel';
import { loadAccountViewer } from '../_lib/server/account-viewer';
import { ProjectIssues } from '../projects/[projectId]/_components/project-issues';
import { toProjectArtifacts } from '../projects/[projectId]/_lib/project-issues-model';
import {
  loadPrivateContextArtifacts,
  loadPrivateContextView,
} from './_lib/server/private-context.loader';

interface PrivateContextPageProps {
  params: Promise<{ account: string }>;
}

export const generateMetadata = async () => {
  const i18n = await createI18nServerInstance();

  return { title: i18n.t('agentguard:private.pageTitle') };
};

/**
 * Personal context that is not filed on a project.
 *
 * The user id comes from the session (`loadAccountViewer`), never from
 * the URL. Project-tagged private rows stay on the project pane; this
 * page is only `scope='private' AND project_id IS NULL`.
 */
async function PrivateContextPage({ params }: PrivateContextPageProps) {
  const { account } = await params;
  const i18n = await createI18nServerInstance();

  const [orgId, viewer] = await Promise.all([
    resolveOrgId(account),
    loadAccountViewer(account),
  ]);

  const [view, artifactRows] = await Promise.all([
    loadPrivateContextView(orgId, viewer.userId),
    loadPrivateContextArtifacts(orgId, viewer.userId),
  ]);

  return (
    <LinearPanel>
      <ProjectIssues
        view={view}
        artifacts={toProjectArtifacts(artifactRows)}
        projectName={i18n.t('agentguard:private.pageTitle', 'Private')}
        accountSlug={account}
        backHref={`/home/${account}`}
        backLabel={i18n.t('agentguard:private.backToHub', 'Back to Hub')}
        memoriesHref={`/home/${account}/memory?tab=mine`}
        memoriesLabel={i18n.t(
          'agentguard:private.viewMemories',
          'View private memories',
        )}
      />
    </LinearPanel>
  );
}

export default withI18n(PrivateContextPage);
