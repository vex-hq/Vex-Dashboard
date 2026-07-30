import 'server-only';

import { cache } from 'react';

import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';

import { getAgentGuardPool } from '~/lib/agentguard/db';
import type {
  CheckResult,
  SessionDetailHeader,
  SessionListRow,
  SessionTurn,
  TracePayload,
} from '~/lib/agentguard/types';

export const SESSIONS_PAGE_SIZE = 25;

export interface SessionFilters {
  agentId?: string;
  status?: 'healthy' | 'degraded' | 'risky';
  timeRange?: '24h' | '7d' | '30d';
  page?: number;
}

const TIME_RANGE_INTERVALS: Record<string, string> = {
  '24h': '24 hours',
  '7d': '7 days',
  '30d': '30 days',
};

/**
 * Load paginated session list for an organization with optional filters.
 */
export interface SessionListResult {
  rows: SessionListRow[];
  pageCount: number;
}

export const loadSessionList = cache(
  async (
    orgId: string,
    filters?: SessionFilters,
  ): Promise<SessionListResult> => {
    const pool = getAgentGuardPool();
    const page = Math.max(1, filters?.page ?? 1);
    const offset = (page - 1) * SESSIONS_PAGE_SIZE;

    const conditions: string[] = ['e.org_id = $1', 'e.session_id IS NOT NULL'];
    const params: unknown[] = [orgId];
    let paramIndex = 2;

    if (filters?.agentId) {
      conditions.push(`e.agent_id = $${paramIndex}`);
      params.push(filters.agentId);
      paramIndex++;
    }

    if (filters?.timeRange) {
      const interval = TIME_RANGE_INTERVALS[filters.timeRange];

      if (interval) {
        conditions.push(`e.timestamp >= NOW() - INTERVAL '${interval}'`);
      }
    }

    const whereClause = conditions.join(' AND ');

    let statusFilter = '';

    if (filters?.status === 'risky') {
      statusFilter = "HAVING BOOL_OR(e.action = 'block') = TRUE";
    } else if (filters?.status === 'degraded') {
      statusFilter =
        "HAVING BOOL_OR(e.action = 'block') = FALSE AND BOOL_OR(e.action = 'flag') = TRUE";
    } else if (filters?.status === 'healthy') {
      statusFilter =
        "HAVING BOOL_OR(e.action = 'block') = FALSE AND BOOL_OR(e.action = 'flag') = FALSE";
    }

    const result = await pool.query<{
      session_id: string;
      agent_id: string;
      agent_name: string;
      turn_count: string;
      avg_confidence: number | null;
      first_timestamp: string;
      last_timestamp: string;
      has_block: boolean;
      has_flag: boolean;
      total_count: string;
    }>(
      `
      WITH filtered AS (
        SELECT
          e.session_id,
          e.agent_id,
          a.name AS agent_name,
          COUNT(*) AS turn_count,
          AVG(e.confidence) AS avg_confidence,
          MIN(e.timestamp) AS first_timestamp,
          MAX(e.timestamp) AS last_timestamp,
          BOOL_OR(e.action = 'block') AS has_block,
          BOOL_OR(e.action = 'flag') AS has_flag
        FROM executions e
        JOIN agents a ON e.agent_id = a.agent_id AND e.org_id = a.org_id
        WHERE ${whereClause}
        GROUP BY e.session_id, e.agent_id, a.name
        ${statusFilter}
      )
      SELECT *, COUNT(*) OVER() AS total_count
      FROM filtered
      ORDER BY last_timestamp DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `,
      [...params, SESSIONS_PAGE_SIZE, offset],
    );

    const totalCount = parseInt(result.rows[0]?.total_count ?? '0', 10);
    const pageCount =
      totalCount === 0 ? 0 : Math.ceil(totalCount / SESSIONS_PAGE_SIZE);

    return {
      rows: result.rows.map((row) => ({
        session_id: row.session_id,
        agent_id: row.agent_id,
        agent_name: row.agent_name,
        turn_count: parseInt(row.turn_count, 10),
        avg_confidence: row.avg_confidence,
        first_timestamp: row.first_timestamp,
        last_timestamp: row.last_timestamp,
        has_block: row.has_block,
        has_flag: row.has_flag,
      })),
      pageCount,
    };
  },
);

/**
 * Load session detail header (aggregates).
 */
export const loadSessionDetail = cache(
  async (
    sessionId: string,
    orgId: string,
  ): Promise<SessionDetailHeader | null> => {
    const pool = getAgentGuardPool();

    const result = await pool.query<{
      session_id: string;
      agent_id: string;
      agent_name: string;
      turn_count: string;
      avg_confidence: number | null;
      first_timestamp: string;
      last_timestamp: string;
      total_tokens: string | null;
      total_cost: number | null;
    }>(
      `
      SELECT
        e.session_id,
        e.agent_id,
        a.name AS agent_name,
        COUNT(*) AS turn_count,
        AVG(e.confidence) AS avg_confidence,
        MIN(e.timestamp) AS first_timestamp,
        MAX(e.timestamp) AS last_timestamp,
        SUM(e.token_count) AS total_tokens,
        SUM(e.cost_estimate) AS total_cost
      FROM executions e
      JOIN agents a ON e.agent_id = a.agent_id AND e.org_id = a.org_id
      WHERE e.session_id = $1 AND e.org_id = $2
      GROUP BY e.session_id, e.agent_id, a.name
      `,
      [sessionId, orgId],
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0]!;

    return {
      session_id: row.session_id,
      agent_id: row.agent_id,
      agent_name: row.agent_name,
      turn_count: parseInt(row.turn_count, 10),
      avg_confidence: row.avg_confidence,
      first_timestamp: row.first_timestamp,
      last_timestamp: row.last_timestamp,
      total_tokens: row.total_tokens ? parseInt(row.total_tokens, 10) : null,
      total_cost: row.total_cost,
    };
  },
);

/**
 * Load all turns (executions) for a session, ordered by sequence.
 */
export const loadSessionTurns = cache(
  async (sessionId: string, orgId: string): Promise<SessionTurn[]> => {
    const pool = getAgentGuardPool();

    const result = await pool.query<SessionTurn>(
      `
      SELECT
        e.execution_id,
        e.sequence_number,
        e.task,
        e.confidence,
        e.action,
        e.latency_ms,
        e.timestamp,
        e.corrected,
        e.token_count,
        e.cost_estimate,
        e.metadata,
        e.trace_payload_ref
      FROM executions e
      WHERE e.session_id = $1 AND e.org_id = $2
      ORDER BY e.sequence_number ASC, e.timestamp ASC
      `,
      [sessionId, orgId],
    );

    return result.rows;
  },
);

function getS3Client(): S3Client {
  return new S3Client({
    endpoint: process.env.AGENTGUARD_S3_ENDPOINT,
    region: process.env.AGENTGUARD_S3_REGION ?? 'us-east-1',
    credentials: {
      accessKeyId: process.env.AGENTGUARD_S3_ACCESS_KEY_ID ?? '',
      secretAccessKey: process.env.AGENTGUARD_S3_SECRET_ACCESS_KEY ?? '',
    },
    forcePathStyle: true,
  });
}

function extractS3Key(ref: string): string {
  if (ref.startsWith('s3://')) {
    const withoutProtocol = ref.slice(5);
    const slashIndex = withoutProtocol.indexOf('/');

    if (slashIndex !== -1) {
      return withoutProtocol.slice(slashIndex + 1);
    }
  }

  return ref;
}

/**
 * Load trace payloads from S3 for all turns that have a trace_payload_ref.
 * Returns a map of execution_id → TracePayload.
 * Failures are silently skipped (the UI falls back to the minimal view).
 */
export async function loadSessionTracePayloads(
  turns: SessionTurn[],
): Promise<Record<string, TracePayload>> {
  const turnsWithRefs = turns.filter((t) => t.trace_payload_ref);

  if (turnsWithRefs.length === 0) return {};

  const bucket = process.env.AGENTGUARD_S3_BUCKET ?? 'agentguard-traces';
  const s3 = getS3Client();

  const results = await Promise.allSettled(
    turnsWithRefs.map(async (turn) => {
      const key = extractS3Key(turn.trace_payload_ref!);

      const response = await s3.send(
        new GetObjectCommand({ Bucket: bucket, Key: key }),
      );

      const body = await response.Body?.transformToString();

      if (!body) return null;

      return {
        executionId: turn.execution_id,
        payload: JSON.parse(body) as TracePayload,
      };
    }),
  );

  const payloads: Record<string, TracePayload> = {};

  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) {
      payloads[result.value.executionId] = result.value.payload;
    }
  }

  return payloads;
}

/**
 * Load check results for all turns in a session.
 * Returns a map of execution_id → CheckResult[].
 */
export async function loadSessionCheckResults(
  turns: SessionTurn[],
): Promise<Record<string, CheckResult[]>> {
  if (turns.length === 0) return {};

  const executionIds = turns.map((t) => t.execution_id);
  const pool = getAgentGuardPool();

  const result = await pool.query<CheckResult>(
    `
    SELECT id, execution_id, check_type, score, passed, details, timestamp
    FROM check_results
    WHERE execution_id = ANY($1)
    ORDER BY id ASC
    `,
    [executionIds],
  );

  const grouped: Record<string, CheckResult[]> = {};

  for (const row of result.rows) {
    if (!grouped[row.execution_id]) {
      grouped[row.execution_id] = [];
    }

    grouped[row.execution_id]!.push(row);
  }

  return grouped;
}
