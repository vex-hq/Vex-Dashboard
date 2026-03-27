import 'server-only';

import { getAgentGuardPool } from '~/lib/agentguard/db';
import type {
  CheckScoreByVariant,
  Dataset,
  DatasetItem,
  Experiment,
  ExperimentVariant,
  VariantMetrics,
} from '~/lib/agentguard/types';

// ─── Experiments ─────────────────────────────────

export async function listExperiments(orgId: string): Promise<Experiment[]> {
  const pool = getAgentGuardPool();
  const result = await pool.query<Experiment>(
    `SELECT id, org_id, name, description, mode, status, variants, dataset_id, created_by, created_at, updated_at
     FROM experiments
     WHERE org_id = $1
     ORDER BY created_at DESC`,
    [orgId],
  );
  return result.rows;
}

export async function getExperiment(
  orgId: string,
  experimentId: string,
): Promise<Experiment | null> {
  const pool = getAgentGuardPool();
  const result = await pool.query<Experiment>(
    `SELECT id, org_id, name, description, mode, status, variants, dataset_id, created_by, created_at, updated_at
     FROM experiments
     WHERE id = $1 AND org_id = $2`,
    [experimentId, orgId],
  );
  return result.rows[0] ?? null;
}

export interface CreateExperimentParams {
  orgId: string;
  name: string;
  description?: string;
  mode: 'offline' | 'live';
  variants: ExperimentVariant[];
  datasetId?: string;
  createdBy: string;
}

export async function createExperiment(
  params: CreateExperimentParams,
): Promise<Experiment> {
  const pool = getAgentGuardPool();
  const id = crypto.randomUUID();
  const result = await pool.query<Experiment>(
    `INSERT INTO experiments (id, org_id, name, description, mode, variants, dataset_id, created_by)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)
     RETURNING id, org_id, name, description, mode, status, variants, dataset_id, created_by, created_at, updated_at`,
    [
      id,
      params.orgId,
      params.name,
      params.description ?? null,
      params.mode,
      JSON.stringify(params.variants),
      params.datasetId ?? null,
      params.createdBy,
    ],
  );
  return result.rows[0]!;
}

export async function updateExperimentStatus(
  orgId: string,
  experimentId: string,
  status: 'draft' | 'running' | 'completed',
): Promise<boolean> {
  const pool = getAgentGuardPool();
  const result = await pool.query(
    `UPDATE experiments SET status = $3, updated_at = now() WHERE id = $1 AND org_id = $2`,
    [experimentId, orgId, status],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function deleteExperiment(
  orgId: string,
  experimentId: string,
): Promise<boolean> {
  const pool = getAgentGuardPool();
  const result = await pool.query(
    `DELETE FROM experiments WHERE id = $1 AND org_id = $2`,
    [experimentId, orgId],
  );
  return (result.rowCount ?? 0) > 0;
}

// ─── Datasets ────────────────────────────────────

export async function listDatasets(orgId: string): Promise<Dataset[]> {
  const pool = getAgentGuardPool();
  const result = await pool.query<Dataset>(
    `SELECT id, org_id, name, items, created_by, created_at, updated_at
     FROM datasets
     WHERE org_id = $1
     ORDER BY created_at DESC`,
    [orgId],
  );
  return result.rows;
}

export async function getDataset(
  orgId: string,
  datasetId: string,
): Promise<Dataset | null> {
  const pool = getAgentGuardPool();
  const result = await pool.query<Dataset>(
    `SELECT id, org_id, name, items, created_by, created_at, updated_at
     FROM datasets
     WHERE id = $1 AND org_id = $2`,
    [datasetId, orgId],
  );
  return result.rows[0] ?? null;
}

export interface CreateDatasetParams {
  orgId: string;
  name: string;
  items: DatasetItem[];
  createdBy: string;
}

export async function createDataset(
  params: CreateDatasetParams,
): Promise<Dataset> {
  const pool = getAgentGuardPool();
  const id = crypto.randomUUID();
  const result = await pool.query<Dataset>(
    `INSERT INTO datasets (id, org_id, name, items, created_by)
     VALUES ($1, $2, $3, $4::jsonb, $5)
     RETURNING id, org_id, name, items, created_by, created_at, updated_at`,
    [id, params.orgId, params.name, JSON.stringify(params.items), params.createdBy],
  );
  return result.rows[0]!;
}

export async function deleteDataset(
  orgId: string,
  datasetId: string,
): Promise<boolean> {
  const pool = getAgentGuardPool();
  const result = await pool.query(
    `DELETE FROM datasets WHERE id = $1 AND org_id = $2`,
    [datasetId, orgId],
  );
  return (result.rowCount ?? 0) > 0;
}

// ─── Comparison Metrics ──────────────────────────

export async function getVariantMetrics(
  orgId: string,
  experimentId: string,
): Promise<VariantMetrics[]> {
  const pool = getAgentGuardPool();
  const result = await pool.query<VariantMetrics>(
    `SELECT
       variant,
       COUNT(*)::int as execution_count,
       AVG(confidence) as avg_confidence,
       COUNT(*) FILTER (WHERE action = 'pass')::int as pass_count,
       COUNT(*) FILTER (WHERE action = 'flag')::int as flag_count,
       COUNT(*) FILTER (WHERE action = 'block')::int as block_count,
       AVG(latency_ms) as avg_latency,
       AVG(cost_estimate) as avg_cost,
       COUNT(*) FILTER (WHERE corrected = true)::int as corrected_count
     FROM executions
     WHERE experiment_id = $1
       AND org_id = $2
       AND variant IS NOT NULL
     GROUP BY variant
     ORDER BY variant`,
    [experimentId, orgId],
  );
  return result.rows;
}

export async function getCheckScoresByVariant(
  orgId: string,
  experimentId: string,
): Promise<CheckScoreByVariant[]> {
  const pool = getAgentGuardPool();
  const result = await pool.query<CheckScoreByVariant>(
    `SELECT
       e.variant,
       cr.check_type,
       AVG(cr.score) as avg_score
     FROM check_results cr
     JOIN executions e ON e.execution_id = cr.execution_id
       AND e.timestamp = cr.timestamp
     WHERE e.experiment_id = $1
       AND e.org_id = $2
       AND e.variant IS NOT NULL
     GROUP BY e.variant, cr.check_type
     ORDER BY e.variant, cr.check_type`,
    [experimentId, orgId],
  );
  return result.rows;
}
