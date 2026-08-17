import { resolveOrgId } from '~/lib/agentguard/resolve-org-id';
import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';

import { LinearPanel } from '../_components/linear-panel';
import { ProposalsReview } from './_components/proposals-review';
import {
  type OpenProposal,
  loadOpenProposals,
} from './_lib/server/proposals.loader';

interface ProposalsPageProps {
  params: Promise<{ account: string }>;
}

export const generateMetadata = async () => {
  const i18n = await createI18nServerInstance();

  return { title: i18n.t('agentguard:proposals.pageTitle') };
};

/**
 * The proposals review queue.
 *
 * Degradation follows the home page's `orFallback` pattern — a slow Neon
 * resume must not error the page. The fallback here is an empty list, which
 * renders as *nothing needs your attention*: on this surface that is the
 * TRUTHFUL default, because zero open proposals is the normal state, and a
 * transient loader failure showing "nothing to review" is a far smaller lie
 * than a crash page.
 *
 * No viewer is resolved for the READ: `memory_proposals` has no per-user scope
 * — a proposal is a claim about the org's brain, and the engine's own
 * `GET /proposals` is org-scoped too. Attribution appears on the WRITE path
 * (`decided_by`), where the actions resolve it from the session.
 */
async function ProposalsPage({ params }: ProposalsPageProps) {
  const { account } = await params;
  const orgId = await resolveOrgId(account);

  let proposals: OpenProposal[] = [];

  try {
    proposals = await loadOpenProposals(orgId);
  } catch (error) {
    console.error('[proposals] loader failed; rendering empty queue', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return (
    <LinearPanel>
      <ProposalsReview accountSlug={account} proposals={proposals} />
    </LinearPanel>
  );
}

export default withI18n(ProposalsPage);
