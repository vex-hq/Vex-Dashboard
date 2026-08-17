/**
 * Row shapes for the prototype shell (Home, Projects, Context, Agents).
 *
 * TYPES ONLY. No query helpers and no predicate builders, for the reason
 * `context-surfaces.types.ts` states and which holds just as hard here: the
 * moment a shared helper takes a `scope` argument, one wrong default renders
 * one person's private context on another person's screen. Sharing a shape
 * costs nothing; sharing a query builder costs the boundary.
 */

/** How many rows any context list loads. The prototype's lists are capped. */
export const SHELL_LIST_LIMIT = 200;

/** Only active rows are listed. */
export const SHELL_STATUS_ACTIVE = 'active';

export const SHELL_SCOPE_ORG = 'org';
export const SHELL_SCOPE_PRIVATE = 'private';

/**
 * One row of the Kind · Context · Project · Recalled · Age table.
 *
 * `recalls` and `servedStale` are evidence, and the schema constrains what may
 * be said about them: `brain_recall_events.memory_ids` gives recall counts and
 * `recall_outcomes.served_stale` gives the stale count. There is NO verdict
 * column and NO per-outcome agent attribution, so no field here may imply
 * pass/fail grading or name the agent that used a memory.
 */
export interface ShellContextItem {
  id: string;
  kind: string;
  content: string;
  projectName: string | null;
  /** `org` or `private`. Drives the `shared` badge. */
  scope: string;
  /** True when a later memory replaced this one. Drives the strikethrough. */
  superseded: boolean;
  createdAt: string;
  recalls: number;
  servedStale: number;
  /** Times an agent reported using this memory (`recall_outcomes.used`). */
  used: number;
}

/** One row of the Project · Items · Last table. */
export interface ShellProject {
  id: string | null;
  name: string;
  items: number;
  /** ISO timestamp of the newest item, or null when the project has none. */
  last: string | null;
}

/** One row of the Agent · Source · Recalls · Last table. */
export interface ShellRecallSource {
  source: string;
  recalls: number;
  last: string | null;
}

/** The four Home stat cards, plus the scope mix behind the note under them. */
export interface ShellHomeStats {
  contextItems: number;
  recallsAcrossLoaded: number;
  recallsServed: number;
  projects: number;
  privateActive: number;
  orgActive: number;
}

/** The nav counts. A count that could not be resolved is null, never 0. */
export interface ShellNavCounts {
  projects: number | null;
  context: number | null;
  shared: number | null;
  proposals: number | null;
  agents: number | null;
}
