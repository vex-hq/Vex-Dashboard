/**
 * Decides which "what happened" sentence the Hub's Band 1 answer line
 * renders, from the same {@link HubSummary} rollup the loader already
 * produces. Pure and framework-free so the decision table is unit-testable
 * without mounting React — `activity-answer.tsx` only turns the result into
 * markup.
 *
 * PRIORITY: decisions and plans are the deliberate writes the founder wants
 * foregrounded ("make it give the user the answer easily"); a workspace that
 * only accumulated facts or notes this week still gets an honest sentence
 * rather than a misleading "0 decisions" headline, and a workspace with
 * nothing at all gets a neutral empty case instead of a sentence built from
 * zeros.
 */

export interface HubAnswerLineInput {
  decisions7d: number;
  plans7d: number;
  facts7d: number;
  notes7d: number;
  projectsActive7d: number;
}

export type HubAnswerLineCase =
  | {
      kind: 'decisionsAndPlans';
      decisions: number;
      plans: number;
      projects: number;
    }
  | { kind: 'decisionsOnly'; decisions: number; projects: number }
  | { kind: 'plansOnly'; plans: number; projects: number }
  | { kind: 'factsOnly'; facts: number }
  | { kind: 'notesOnly'; notes: number }
  | { kind: 'empty' };

export function buildHubAnswerLineCase(
  input: HubAnswerLineInput,
): HubAnswerLineCase {
  const {
    decisions7d: decisions,
    plans7d: plans,
    facts7d: facts,
    notes7d: notes,
    projectsActive7d: projects,
  } = input;

  if (decisions > 0 && plans > 0) {
    return { kind: 'decisionsAndPlans', decisions, plans, projects };
  }
  if (decisions > 0) {
    return { kind: 'decisionsOnly', decisions, projects };
  }
  if (plans > 0) {
    return { kind: 'plansOnly', plans, projects };
  }
  if (facts > 0) {
    return { kind: 'factsOnly', facts };
  }
  if (notes > 0) {
    return { kind: 'notesOnly', notes };
  }

  return { kind: 'empty' };
}
