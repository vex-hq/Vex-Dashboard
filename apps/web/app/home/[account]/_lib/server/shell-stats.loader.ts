import 'server-only';

import { cache } from 'react';

import { getAgentGuardPool } from '~/lib/agentguard/db';

import {
  SHELL_SCOPE_ORG,
  SHELL_SCOPE_PRIVATE,
  SHELL_STATUS_ACTIVE,
  type ShellHomeStats,
  type ShellNavCounts,
} from './shell-context.types';

/**
 * The four Home stat cards and the scope mix behind the note under them.
 *
 * The prototype's Home reads:
 *
 *     context items · recalls across top N · recalls served · projects
 *
 * and then a note stating the private/org split. Every one of those was a
 * literal in the prototype's fixture; here every one is a query. No number on
 * this screen may come from a constant — the spec is explicit that the
 * prototype's fixtures are shapes, not values.
 *
 * `recallsAcrossLoaded` is summed by the caller from the rows it actually
 * loaded, because the prototype's card says "recalls across top N" and means
 * exactly that: the recalls belonging to the rows on screen, not org-wide.
 * Computing it here would make the card disagree with the list beneath it.
 */
export const loadShellHomeStats = cache(
  async (
    orgId: string,
    userId: string,
  ): Promise<Omit<ShellHomeStats, 'recallsAcrossLoaded'>> => {
    const pool = getAgentGuardPool();

    if (!userId) {
      throw new Error('loadShellHomeStats requires a signed-in user id');
    }

    const [visible, recalls, scopeMix] = await Promise.all([
      pool.query<{ items: string; projects: string }>(
        `
        SELECT
          COUNT(*) AS items,
          COUNT(DISTINCT m.project_id) AS projects
        FROM session_memories m
        WHERE m.org_id = $1
          AND m.status = $3
          AND m.recall_hidden = FALSE
          AND (
            m.scope = $4
            OR (m.scope = $5 AND m.user_id = $2)
          )
        `,
        [orgId, userId, SHELL_STATUS_ACTIVE, SHELL_SCOPE_ORG, SHELL_SCOPE_PRIVATE],
      ),
      pool.query<{ served: string }>(
        `SELECT COUNT(*) AS served FROM brain_recall_events WHERE org_id = $1`,
        [orgId],
      ),
      // The note under the cards states the private/org split. `private` is
      // counted for THIS caller only — the org-wide private total would be a
      // count of everyone's private context, which is not this user's to see.
      pool.query<{ private_active: string; org_active: string }>(
        `
        SELECT
          COUNT(*) FILTER (WHERE m.scope = $4 AND m.user_id = $2) AS private_active,
          COUNT(*) FILTER (WHERE m.scope = $3) AS org_active
        FROM session_memories m
        WHERE m.org_id = $1
          AND m.status = $5
          AND m.recall_hidden = FALSE
        `,
        [
          orgId,
          userId,
          SHELL_SCOPE_ORG,
          SHELL_SCOPE_PRIVATE,
          SHELL_STATUS_ACTIVE,
        ],
      ),
    ]);

    return {
      contextItems: count(visible.rows[0]?.items),
      projects: count(visible.rows[0]?.projects),
      recallsServed: count(recalls.rows[0]?.served),
      privateActive: count(scopeMix.rows[0]?.private_active),
      orgActive: count(scopeMix.rows[0]?.org_active),
    };
  },
);

/**
 * The counts beside each nav item.
 *
 * A count that cannot be resolved is `null`, and the nav renders nothing for
 * it. Rendering `0` instead would be a claim — "you have no proposals" — made
 * on the strength of a failed query, and this nav is the first thing a user
 * reads. Absent is honest; zero is not.
 */
export const loadShellNavCounts = cache(
  async (orgId: string, userId: string): Promise<ShellNavCounts> => {
    const empty: ShellNavCounts = {
      projects: null,
      context: null,
      shared: null,
      proposals: null,
      agents: null,
    };

    if (!userId) return empty;

    const pool = getAgentGuardPool();

    try {
      const [memories, proposals, agents] = await Promise.all([
        pool.query<{
          context: string;
          projects: string;
          shared: string;
        }>(
          `
          SELECT
            COUNT(*) AS context,
            COUNT(DISTINCT m.project_id) AS projects,
            COUNT(*) FILTER (WHERE m.scope = $4) AS shared
          FROM session_memories m
          WHERE m.org_id = $1
            AND m.status = $3
            AND m.recall_hidden = FALSE
            AND (
              m.scope = $4
              OR (m.scope = $5 AND m.user_id = $2)
            )
          `,
          [
            orgId,
            userId,
            SHELL_STATUS_ACTIVE,
            SHELL_SCOPE_ORG,
            SHELL_SCOPE_PRIVATE,
          ],
        ),
        pool.query<{ open: string }>(
          `SELECT COUNT(*) AS open FROM memory_proposals WHERE org_id = $1 AND status = 'open'`,
          [orgId],
        ),
        pool.query<{ sources: string }>(
          `
          SELECT COUNT(DISTINCT COALESCE(NULLIF(source, ''), 'unknown')) AS sources
          FROM brain_recall_events
          WHERE org_id = $1
          `,
          [orgId],
        ),
      ]);

      return {
        context: count(memories.rows[0]?.context),
        projects: count(memories.rows[0]?.projects),
        shared: count(memories.rows[0]?.shared),
        proposals: count(proposals.rows[0]?.open),
        agents: count(agents.rows[0]?.sources),
      };
    } catch (error) {
      // The nav renders on every page. A cold Neon resume must degrade to a
      // nav with no counts, never to an error boundary swallowing the app.
      console.error('[shell] nav counts failed; rendering without counts', {
        error: error instanceof Error ? error.message : String(error),
      });

      return empty;
    }
  },
);

function count(value: string | undefined): number {
  const parsed = Number(value ?? 0);

  return Number.isFinite(parsed) ? parsed : 0;
}
