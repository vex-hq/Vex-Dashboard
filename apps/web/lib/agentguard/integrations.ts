import 'server-only';

import { getAgentGuardPool } from '~/lib/agentguard/db';
import type {
  AlertRule,
  AlertRuleWithChannel,
  IntegrationConnection,
} from '~/lib/agentguard/types';

export interface CreateConnectionParams {
  orgId: string;
  provider: string;
  nangoConnectionId: string;
  workspaceName: string | null;
  createdBy: string;
}

export interface CreateAlertRuleParams {
  orgId: string;
  name: string;
  confidenceThreshold: number;
  createdBy: string;
  channelType: string;
  connectionId: string;
  slackChannelId: string;
  slackChannelName: string;
}

export async function listConnections(
  orgId: string,
): Promise<IntegrationConnection[]> {
  const pool = getAgentGuardPool();
  const result = await pool.query<IntegrationConnection>(
    `SELECT id, org_id, provider, nango_connection_id, workspace_name, status, created_by, created_at, updated_at
     FROM integration_connections
     WHERE org_id = $1
     ORDER BY created_at DESC`,
    [orgId],
  );
  return result.rows;
}

export async function createConnection(
  params: CreateConnectionParams,
): Promise<IntegrationConnection> {
  const pool = getAgentGuardPool();
  const id = crypto.randomUUID();
  const result = await pool.query<IntegrationConnection>(
    `INSERT INTO integration_connections (id, org_id, provider, nango_connection_id, workspace_name, status, created_by)
     VALUES ($1, $2, $3, $4, $5, 'connected', $6)
     RETURNING id, org_id, provider, nango_connection_id, workspace_name, status, created_by, created_at, updated_at`,
    [
      id,
      params.orgId,
      params.provider,
      params.nangoConnectionId,
      params.workspaceName,
      params.createdBy,
    ],
  );
  return result.rows[0]!;
}

export async function deleteConnection(
  orgId: string,
  connectionId: string,
): Promise<boolean> {
  const pool = getAgentGuardPool();
  const result = await pool.query(
    `DELETE FROM integration_connections WHERE id = $1 AND org_id = $2`,
    [connectionId, orgId],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function getConnectionNangoId(
  orgId: string,
  connectionId: string,
): Promise<string | null> {
  const pool = getAgentGuardPool();
  const result = await pool.query<{ nango_connection_id: string }>(
    `SELECT nango_connection_id FROM integration_connections WHERE id = $1 AND org_id = $2`,
    [connectionId, orgId],
  );
  return result.rows[0]?.nango_connection_id ?? null;
}

export async function listAlertRules(
  orgId: string,
): Promise<AlertRuleWithChannel[]> {
  const pool = getAgentGuardPool();
  const result = await pool.query<AlertRuleWithChannel>(
    `SELECT r.id, r.account_id, r.name, r.confidence_threshold, r.enabled, r.created_by, r.created_at, r.updated_at,
            c.channel_type, c.slack_channel_name
     FROM alert_rules r
     LEFT JOIN alert_rule_channels c ON c.alert_rule_id = r.id
     WHERE r.account_id = $1
     ORDER BY r.created_at DESC`,
    [orgId],
  );
  return result.rows;
}

export async function createAlertRule(
  params: CreateAlertRuleParams,
): Promise<AlertRule> {
  const pool = getAgentGuardPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const ruleId = crypto.randomUUID();
    const ruleResult = await client.query<AlertRule>(
      `INSERT INTO alert_rules (id, account_id, name, confidence_threshold, enabled, created_by)
       VALUES ($1, $2, $3, $4, true, $5)
       RETURNING id, account_id, name, confidence_threshold, enabled, created_by, created_at, updated_at`,
      [
        ruleId,
        params.orgId,
        params.name,
        params.confidenceThreshold,
        params.createdBy,
      ],
    );

    const channelId = crypto.randomUUID();
    await client.query(
      `INSERT INTO alert_rule_channels (id, alert_rule_id, channel_type, connection_id, slack_channel_id, slack_channel_name)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        channelId,
        ruleId,
        params.channelType,
        params.connectionId,
        params.slackChannelId,
        params.slackChannelName,
      ],
    );

    await client.query('COMMIT');

    return ruleResult.rows[0]!;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteAlertRule(
  orgId: string,
  ruleId: string,
): Promise<boolean> {
  const pool = getAgentGuardPool();
  const result = await pool.query(
    `DELETE FROM alert_rules WHERE id = $1 AND account_id = $2`,
    [ruleId, orgId],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function toggleAlertRule(
  orgId: string,
  ruleId: string,
  enabled: boolean,
): Promise<boolean> {
  const pool = getAgentGuardPool();
  const result = await pool.query(
    `UPDATE alert_rules SET enabled = $3, updated_at = now() WHERE id = $1 AND account_id = $2`,
    [ruleId, orgId, enabled],
  );
  return (result.rowCount ?? 0) > 0;
}
