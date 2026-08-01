/**
 * Builder for the agent-friendly summary served at `/llms.txt`.
 *
 * Sourced exclusively from the typed catalogs in `lib/pricing` and
 * `lib/site-meta` so the plain-text view stays in lockstep with the marketing
 * site, JSON-LD, and `/api/pricing`.
 *
 * This file is read by agents, not people. Every line should be a checkable
 * fact, and every URL should be one that resolves.
 */

import { LAST_UPDATED, PLANS } from '~/lib/pricing';
import { APP_URL, DOCS_URL, ORG, POSITIONING_SENTENCE } from '~/lib/site-meta';

/**
 * The metered lever quoted per plan. Klio meters use of the shared memory, so
 * captured memories is the number that actually separates the tiers.
 *
 * Must match a `label` in the plan's `features`. This previously read
 * 'Observations' — a Vex-era label no Klio plan carries — so `find` returned
 * undefined and every plan line rendered an empty field between separators.
 */
const QUOTED_LEVER = 'People sharing a brain';

export function buildLlmsTxt(): string {
  const planLines = PLANS.map((plan) => {
    const lever = plan.features.find((f) => f.label === QUOTED_LEVER)?.value;
    const shared = lever ? ` · shared with: ${lever}` : '';
    const unit = plan.priceUnit === 'seat' ? '/user/mo' : '/mo';
    return `- ${plan.name} — $${plan.priceMonthly}${unit}${shared} · ${plan.audience}`;
  }).join('\n');

  return `# ${ORG.name}

> ${POSITIONING_SENTENCE}

Last updated: ${LAST_UPDATED}

## Pricing
${planLines}
- Enterprise — custom (${ORG.contactEmail})

Machine-readable: ${ORG.url}/api/pricing

## Key URLs
- Home: ${ORG.url}
- Pricing: ${ORG.url}/pricing
- Docs: ${DOCS_URL}
- App: ${APP_URL}
- Compare: ${ORG.url}/compare

## Agents supported
Any MCP client — Claude Code, Cursor, Codex, and custom Python/TypeScript
agents. Connecting agents is never gated: every plan allows unlimited
connected agents.

## Categories
- Shared memory for AI agents
- Cross-agent collaboration
- Agent context handover
- MCP memory server
`;
}
