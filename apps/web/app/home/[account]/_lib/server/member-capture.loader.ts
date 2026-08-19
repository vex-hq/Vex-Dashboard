import 'server-only';

import { cache } from 'react';

import { getAgentGuardPool } from '~/lib/agentguard/db';

/** One teammate, and whether their agents have actually captured anything. */
export interface MemberCapture {
  userId: string;
  /** Memories attributed to this person, all scopes. */
  memories: number;
  /** Newest capture, or null when they have never captured. */
  lastCaptureAt: string | null;
  /** Distinct agents that have written as them. */
  agents: number;
}

/**
 * Per-member capture activity for the whole org.
 *
 * WHY THIS EXISTS. Adding somebody to a workspace and their agents actually
 * sending anything are two different events, and until now nothing showed the
 * gap between them. Two people were added on consecutive days, both completed
 * onboarding, both hold working keys — and neither had ever captured a single
 * memory. There was no way to see that in the product: it took a hand-written
 * query against production to find out.
 *
 * "Onboarded" and "capturing" must be separately visible, because the failure
 * mode is silent by construction — a key that authenticates but whose hooks
 * were never wired looks exactly like a key in healthy use.
 *
 * Counts every scope deliberately, including `private`. This is a COUNT and a
 * TIMESTAMP, never content: it answers "is their agent working", which a
 * teammate is entitled to know, without exposing a single word of what they
 * captured. No private content crosses this boundary and none may be added.
 */
export const loadMemberCapture = cache(
  async (orgId: string): Promise<Map<string, MemberCapture>> => {
    if (!orgId) return new Map();

    const pool = getAgentGuardPool();

    const result = await pool.query<{
      user_id: string;
      memories: string;
      last_capture: string | null;
      agents: string;
    }>(
      `
      SELECT
        m.user_id,
        COUNT(*) AS memories,
        MAX(m.created_at)::text AS last_capture,
        COUNT(DISTINCT m.agent_id) AS agents
      FROM session_memories m
      WHERE m.org_id = $1
        AND m.user_id IS NOT NULL
      GROUP BY m.user_id
      `,
      [orgId],
    );

    const out = new Map<string, MemberCapture>();

    for (const row of result.rows) {
      out.set(row.user_id, {
        userId: row.user_id,
        memories: Number(row.memories) || 0,
        lastCaptureAt: row.last_capture,
        agents: Number(row.agents) || 0,
      });
    }

    return out;
  },
);
