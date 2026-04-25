/**
 * Builder for the agent-friendly summary served at `/llms.txt`.
 *
 * Sourced exclusively from the typed catalogs in `lib/pricing` and
 * `lib/site-meta` so the plain-text view stays in lockstep with the
 * marketing site, JSON-LD, and `/api/pricing`.
 *
 * Positioning facts locked during brainstorm: do not introduce the
 * strings "open source", "Apache 2.0", "AGPLv3", or "MIT" anywhere
 * downstream of this builder. A render-time guard test enforces this.
 */

import { LAST_UPDATED, PLANS } from '~/lib/pricing';
import { ORG, POSITIONING_SENTENCE } from '~/lib/site-meta';

export function buildLlmsTxt(): string {
  const planLines = PLANS.map((p) => {
    const obs = p.features.find((f) => f.label === 'Observations')?.value;
    const audience = p.audience;
    return `- ${p.name} — $${p.priceMonthly}/mo · ${obs ?? ''} · ${audience}`;
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
- Docs: https://docs.tryvex.dev
- App: https://app.tryvex.dev
- Compare: ${ORG.url}/compare

## Frameworks supported
LangChain, CrewAI, OpenAI Assistants, custom Python/TypeScript agents

## Categories
- AI agent observability
- Runtime guardrails
- LLM reliability
- Hallucination detection
`;
}
