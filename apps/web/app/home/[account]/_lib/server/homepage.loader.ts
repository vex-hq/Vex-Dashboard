import 'server-only';

import { cache } from 'react';

import { createAccountsApi } from '@kit/accounts/api';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { getAgentGuardPool } from '~/lib/agentguard/db';
import { resolvePlanFromSubscriptionItems } from '~/lib/agentguard/plan-limits';
import {
  TIME_RANGE_INTERVALS,
  type TimeRange,
} from '~/lib/agentguard/time-range';
import type {
  AgentHealthTile,
  AlertSeveritySummary,
  AnomalyAlert,
  FailurePattern,
  HomepageKpis,
  HomepageTrendBucket,
  RecentActivityItem,
} from '~/lib/agentguard/types';

/**
 * Load value-oriented KPIs for the homepage (last 24 hours).
 */
export const loadHomepageKpis = cache(
  async (orgId: string, timeRange?: TimeRange): Promise<HomepageKpis> => {
    const pool = getAgentGuardPool();
    const interval = TIME_RANGE_INTERVALS[timeRange ?? '24h'];

    const result = await pool.query<{
      total_verifications: string;
      avg_confidence: number | null;
      issues_caught: string;
      auto_corrected: string;
    }>(
      `
      SELECT
        COUNT(*) AS total_verifications,
        AVG(confidence) AS avg_confidence,
        COUNT(*) FILTER (WHERE action IN ('flag', 'block')) AS issues_caught,
        COUNT(*) FILTER (WHERE corrected = TRUE) AS auto_corrected
      FROM executions
      WHERE org_id = $1
        AND timestamp >= NOW() - INTERVAL '${interval}'
      `,
      [orgId],
    );

    const row = result.rows[0];

    return {
      total_verifications: parseInt(row?.total_verifications ?? '0', 10),
      avg_confidence: row?.avg_confidence ?? null,
      issues_caught: parseInt(row?.issues_caught ?? '0', 10),
      auto_corrected: parseInt(row?.auto_corrected ?? '0', 10),
    };
  },
);

/**
 * Load per-agent health summaries for the homepage tiles (last 24 hours).
 */
export const loadAgentHealth = cache(
  async (orgId: string, timeRange?: TimeRange): Promise<AgentHealthTile[]> => {
    const pool = getAgentGuardPool();
    const interval = TIME_RANGE_INTERVALS[timeRange ?? '24h'];

    const result = await pool.query<{
      agent_id: string;
      name: string;
      avg_confidence: number | null;
      executions_24h: string;
      last_active: string | null;
    }>(
      `
      SELECT
        a.agent_id,
        a.name,
        AVG(e.confidence) AS avg_confidence,
        COUNT(e.execution_id) AS executions_24h,
        MAX(e.timestamp) AS last_active
      FROM agents a
      LEFT JOIN executions e
        ON a.agent_id = e.agent_id
        AND e.timestamp >= NOW() - INTERVAL '${interval}'
      WHERE a.org_id = $1
      GROUP BY a.agent_id, a.name
      ORDER BY COUNT(e.execution_id) DESC
      `,
      [orgId],
    );

    return result.rows.map((row) => ({
      agent_id: row.agent_id,
      name: row.name,
      avg_confidence: row.avg_confidence,
      executions_24h: parseInt(row.executions_24h, 10),
      last_active: row.last_active,
    }));
  },
);

/**
 * Load alert severity counts for the homepage summary (last 24 hours).
 */
export const loadAlertSummary = cache(
  async (
    orgId: string,
    timeRange?: TimeRange,
  ): Promise<AlertSeveritySummary> => {
    const pool = getAgentGuardPool();
    const interval = TIME_RANGE_INTERVALS[timeRange ?? '24h'];

    const result = await pool.query<{
      critical: string;
      high: string;
      medium: string;
      low: string;
    }>(
      `
      SELECT
        COUNT(*) FILTER (WHERE severity = 'critical') AS critical,
        COUNT(*) FILTER (WHERE severity = 'high') AS high,
        COUNT(*) FILTER (WHERE severity = 'medium') AS medium,
        COUNT(*) FILTER (WHERE severity = 'low') AS low
      FROM alerts
      WHERE org_id = $1
        AND created_at >= NOW() - INTERVAL '${interval}'
      `,
      [orgId],
    );

    const row = result.rows[0];

    return {
      critical: parseInt(row?.critical ?? '0', 10),
      high: parseInt(row?.high ?? '0', 10),
      medium: parseInt(row?.medium ?? '0', 10),
      low: parseInt(row?.low ?? '0', 10),
    };
  },
);

/**
 * Load hourly execution trend for the homepage mini chart (last 24 hours).
 */
export const loadHomepageTrend = cache(
  async (
    orgId: string,
    timeRange?: TimeRange,
  ): Promise<HomepageTrendBucket[]> => {
    const pool = getAgentGuardPool();
    const interval = TIME_RANGE_INTERVALS[timeRange ?? '24h'];

    const result = await pool.query<{
      bucket: string;
      pass_count: string;
      flag_count: string;
      block_count: string;
    }>(
      `
      SELECT
        date_trunc('hour', timestamp) AS bucket,
        COUNT(*) FILTER (WHERE action = 'pass') AS pass_count,
        COUNT(*) FILTER (WHERE action = 'flag') AS flag_count,
        COUNT(*) FILTER (WHERE action = 'block') AS block_count
      FROM executions
      WHERE org_id = $1
        AND timestamp >= NOW() - INTERVAL '${interval}'
      GROUP BY bucket
      ORDER BY bucket ASC
      `,
      [orgId],
    );

    return result.rows.map((row) => ({
      bucket: row.bucket,
      pass_count: parseInt(row.pass_count, 10),
      flag_count: parseInt(row.flag_count, 10),
      block_count: parseInt(row.block_count, 10),
    }));
  },
);

/**
 * Load recent executions for the homepage activity feed (last 8).
 */
export const loadRecentActivity = cache(
  async (orgId: string): Promise<RecentActivityItem[]> => {
    const pool = getAgentGuardPool();

    const result = await pool.query<{
      execution_id: string;
      agent_id: string;
      agent_name: string;
      action: 'pass' | 'flag' | 'block';
      confidence: number | null;
      task: string | null;
      timestamp: string;
    }>(
      `
      SELECT
        e.execution_id,
        e.agent_id,
        a.name AS agent_name,
        e.action,
        e.confidence,
        e.task,
        e.timestamp
      FROM executions e
      INNER JOIN agents a ON e.agent_id = a.agent_id
      WHERE e.org_id = $1
      ORDER BY e.timestamp DESC
      LIMIT 8
      `,
      [orgId],
    );

    return result.rows;
  },
);

/**
 * Load current month usage counts and plan info for the usage meters.
 * Plan data: Supabase accounts table (source of truth).
 * Usage data: TimescaleDB hourly_agent_stats (analytics).
 */
export const loadPlanUsage = cache(
  async (
    orgId: string,
    accountSlug: string,
  ): Promise<{
    plan: string;
    planOverrides: Record<string, number> | null;
    observationsUsed: number;
    verificationsUsed: number;
    correctionsUsed: number;
    agentCount: number;
  }> => {
    const pool = getAgentGuardPool();
    const supabase = getSupabaseServerClient();

    const [
      accountResult,
      usageResult,
      verificationResult,
      correctionResult,
      agentResult,
    ] = await Promise.all([
      supabase
        .from('accounts')
        .select('id, vex_plan, vex_plan_overrides')
        .eq('slug', accountSlug)
        .single(),
      pool.query<{ total_executions: string }>(
        `SELECT COUNT(*) AS total_executions
         FROM executions
         WHERE org_id = $1
           AND timestamp >= date_trunc('month', NOW())`,
        [orgId],
      ),
      pool
        .query<{ total_verifications: string }>(
          `SELECT COUNT(*) AS total_verifications
           FROM executions
           WHERE org_id = $1
             AND action IS NOT NULL
             AND timestamp >= date_trunc('month', NOW())`,
          [orgId],
        )
        .catch(() => ({ rows: [{ total_verifications: '0' }] })),
      pool
        .query<{ total_corrections: string }>(
          `SELECT COUNT(*) AS total_corrections
           FROM executions
           WHERE org_id = $1
             AND corrected = TRUE
             AND timestamp >= date_trunc('month', NOW())`,
          [orgId],
        )
        .catch(() => ({ rows: [{ total_corrections: '0' }] })),
      pool.query<{ agent_count: string }>(
        'SELECT COUNT(*) AS agent_count FROM agents WHERE org_id = $1',
        [orgId],
      ),
    ]);

    const account = accountResult.data;
    const totalExecs = parseInt(
      usageResult.rows[0]?.total_executions ?? '0',
      10,
    );
    const totalVerifications = parseInt(
      verificationResult.rows[0]?.total_verifications ?? '0',
      10,
    );
    const totalCorrections = parseInt(
      correctionResult.rows[0]?.total_corrections ?? '0',
      10,
    );
    const agentCount = parseInt(agentResult.rows[0]?.agent_count ?? '0', 10);

    // Resolve plan from active Makerkit subscription (source of truth).
    // Fall back to admin-managed vex_plan for enterprise overrides.
    let plan = 'free';

    if (account?.id) {
      const api = createAccountsApi(supabase);
      const subscription = await api.getSubscription(account.id);

      if (subscription?.status === 'active') {
        plan = resolvePlanFromSubscriptionItems(subscription.items);
      }
    }

    // Admin override: if vex_plan is explicitly set to a non-free value
    // (e.g. enterprise), it takes precedence over subscription resolution.
    const adminOverride = account?.vex_plan;

    if (adminOverride && adminOverride !== 'free') {
      plan = adminOverride;
    }

    return {
      plan,
      planOverrides:
        (account?.vex_plan_overrides as Record<string, number>) ?? null,
      observationsUsed: totalExecs,
      verificationsUsed: totalVerifications,
      correctionsUsed: totalCorrections,
      agentCount,
    };
  },
);

/**
 * Load top failure patterns for the homepage widget (last 7 days).
 */
export const loadFailurePatterns = cache(
  async (orgId: string, timeRange?: TimeRange): Promise<FailurePattern[]> => {
    const pool = getAgentGuardPool();
    const interval = TIME_RANGE_INTERVALS[timeRange ?? '7d'];

    const result = await pool.query<{
      agent_id: string;
      agent_name: string;
      check_type: string;
      failure_count: string;
    }>(
      `
      SELECT
        e.agent_id,
        a.name AS agent_name,
        cr.check_type,
        COUNT(*) AS failure_count
      FROM check_results cr
      JOIN executions e ON cr.execution_id = e.execution_id
      JOIN agents a ON e.agent_id = a.agent_id
      WHERE e.org_id = $1
        AND cr.passed = false
        AND cr.timestamp >= NOW() - INTERVAL '${interval}'
      GROUP BY e.agent_id, a.name, cr.check_type
      ORDER BY failure_count DESC
      LIMIT 10
      `,
      [orgId],
    );

    return result.rows.map((row) => ({
      agent_id: row.agent_id,
      agent_name: row.agent_name,
      check_type: row.check_type,
      failure_count: parseInt(row.failure_count, 10),
    }));
  },
);

/**
 * Load recent cost/latency anomaly alerts for the homepage (last 7 days).
 */
export const loadAnomalyAlerts = cache(
  async (orgId: string, timeRange?: TimeRange): Promise<AnomalyAlert[]> => {
    const pool = getAgentGuardPool();
    const interval = TIME_RANGE_INTERVALS[timeRange ?? '7d'];

    const result = await pool.query<AnomalyAlert>(
      `
      SELECT
        al.alert_id,
        al.agent_id,
        COALESCE(ag.name, al.agent_id) AS agent_name,
        al.alert_type,
        al.severity,
        al.execution_id,
        al.created_at
      FROM alerts al
      LEFT JOIN agents ag ON al.agent_id = ag.agent_id
      WHERE al.org_id = $1
        AND al.alert_type IN ('cost_anomaly', 'latency_anomaly')
        AND al.created_at >= NOW() - INTERVAL '${interval}'
      ORDER BY al.created_at DESC
      LIMIT 10
      `,
      [orgId],
    );

    return result.rows;
  },
);
