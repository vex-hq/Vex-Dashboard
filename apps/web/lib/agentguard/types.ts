/**
 * TypeScript interfaces for AgentGuard dashboard data.
 * These map to the TimescaleDB schema defined in the AgentGuard migrations.
 */

export interface Agent {
  agent_id: string;
  org_id: string;
  name: string;
  task: string | null;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Execution {
  execution_id: string;
  agent_id: string;
  org_id: string;
  session_id: string | null;
  parent_execution_id: string | null;
  sequence_number: number | null;
  timestamp: string;
  confidence: number | null;
  action: 'pass' | 'flag' | 'block';
  latency_ms: number | null;
  token_count: number | null;
  cost_estimate: number | null;
  corrected: boolean;
  correction_layers_used: unknown[] | null;
  trace_payload_ref: string | null;
  status: string;
  task: string | null;
  metadata: Record<string, unknown>;
}

export interface CheckResult {
  id: number;
  execution_id: string;
  check_type: string;
  score: number | null;
  passed: boolean;
  details: Record<string, unknown>;
  timestamp: string;
}

export interface Alert {
  alert_id: string;
  execution_id: string;
  agent_id: string;
  org_id: string;
  alert_type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  delivered: boolean;
  webhook_response: Record<string, unknown> | null;
  webhook_url: string | null;
  delivery_attempts: number;
  last_attempt_at: string | null;
  response_status: number | null;
  created_at: string;
  /** Joined from agents table */
  agent_name?: string;
}

export interface HumanReview {
  id: number;
  execution_id: string;
  reviewer: string;
  verdict: string;
  notes: string | null;
  created_at: string;
}

export interface AgentHealthHourly {
  agent_id: string;
  bucket: string;
  execution_count: number;
  avg_confidence: number | null;
  pass_count: number;
  flag_count: number;
  block_count: number;
  total_tokens: number | null;
  total_cost: number | null;
  avg_latency: number | null;
}

export interface FleetKpis {
  total_agents: number;
  executions_24h: number;
  avg_confidence: number | null;
  pass_rate: number | null;
  correction_rate: number | null;
}

export interface AgentFleetRow {
  agent_id: string;
  name: string;
  executions_24h: number;
  avg_confidence: number | null;
  pass_rate: number | null;
  last_active: string | null;
}

export interface ExecutionsOverTime {
  bucket: string;
  pass_count: number;
  flag_count: number;
  block_count: number;
}

export interface AgentKpis {
  total_executions: number;
  avg_confidence: number | null;
  avg_latency: number | null;
  total_tokens: number | null;
  total_cost: number | null;
}

export interface ConfidenceOverTime {
  bucket: string;
  avg_confidence: number | null;
}

export interface ActionDistribution {
  action: string;
  count: number;
}

export interface SessionSummary {
  session_id: string;
  agent_id: string;
  turn_count: number;
  first_timestamp: string;
  last_timestamp: string;
  total_tokens: number | null;
  total_cost: number | null;
}

/**
 * A single correction attempt recorded during verification.
 */
export interface CorrectionAttempt {
  layer: number;
  layer_name: 'repair' | 'constrained_regen' | 'full_reprompt';
  confidence: number | null;
  action: string;
  success: boolean;
  latency_ms: number;
  corrected_output: string | null;
}

/**
 * Correction metadata stored on an execution.
 */
export interface CorrectionMetadata {
  corrected: boolean;
  original_output: string | null;
  corrected_output: string | null;
  correction_attempts: CorrectionAttempt[];
}

/**
 * A single API key entry stored in organizations.api_keys JSONB.
 * The full plaintext key is never stored — only the SHA-256 hash.
 */
export interface ApiKeyEntry {
  id: string;
  prefix: string;
  key_hash: string;
  name: string;
  scopes: string[];
  rate_limit_rpm: number;
  expires_at: string | null;
  created_at: string;
  created_by: string;
  last_used_at: string | null;
  revoked: boolean;
}

/**
 * Per-agent recent session summary for the fleet page agent cards.
 */
export interface FleetSessionSummary {
  session_id: string;
  agent_id: string;
  turn_count: number;
  avg_confidence: number | null;
  last_timestamp: string;
}

/**
 * Homepage KPIs — value-oriented metrics for the dashboard overview.
 */
export interface HomepageKpis {
  total_verifications: number;
  avg_confidence: number | null;
  issues_caught: number;
  auto_corrected: number;
}

/**
 * Per-agent health summary for homepage tiles.
 */
export interface AgentHealthTile {
  agent_id: string;
  name: string;
  avg_confidence: number | null;
  executions_24h: number;
  last_active: string | null;
}

/**
 * Alert severity counts for homepage summary pills.
 */
export interface AlertSeveritySummary {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

/**
 * Hourly execution bucket for homepage 24h mini chart.
 */
export interface HomepageTrendBucket {
  bucket: string;
  pass_count: number;
  flag_count: number;
  block_count: number;
}

/**
 * Recent execution for homepage activity feed.
 */
export interface RecentActivityItem {
  execution_id: string;
  agent_id: string;
  agent_name: string;
  action: 'pass' | 'flag' | 'block';
  confidence: number | null;
  task: string | null;
  timestamp: string;
}

/**
 * API key as displayed in the dashboard (no hash).
 */
export interface ApiKeyDisplay {
  id: string;
  prefix: string;
  name: string;
  scopes: string[];
  rate_limit_rpm: number;
  expires_at: string | null;
  created_at: string;
  last_used_at: string | null;
  revoked: boolean;
}

/**
 * A session row for the sessions list page.
 */
export interface SessionListRow {
  session_id: string;
  agent_id: string;
  agent_name: string;
  turn_count: number;
  avg_confidence: number | null;
  first_timestamp: string;
  last_timestamp: string;
  has_block: boolean;
  has_flag: boolean;
}

/**
 * A single turn (execution) in a session detail view.
 */
export interface SessionTurn {
  execution_id: string;
  sequence_number: number | null;
  task: string | null;
  confidence: number | null;
  action: 'pass' | 'flag' | 'block';
  latency_ms: number | null;
  timestamp: string;
  corrected: boolean;
  token_count: number | null;
  cost_estimate: number | null;
  metadata: Record<string, unknown>;
  trace_payload_ref: string | null;
}

/**
 * Trace payload stored in S3 for a single execution.
 */
export interface TracePayload {
  input: unknown;
  output: unknown;
  ground_truth?: unknown;
  steps: Array<{
    step_type: string;
    /** Tool/step name — the actual S3 payload uses `name`, not `step_name`. */
    name: string;
    input: unknown;
    output: unknown;
    duration_ms?: number;
    timestamp: string;
  }>;
}

/**
 * Session detail header aggregates.
 */
export interface SessionDetailHeader {
  session_id: string;
  agent_id: string;
  agent_name: string;
  turn_count: number;
  avg_confidence: number | null;
  first_timestamp: string;
  last_timestamp: string;
  total_tokens: number | null;
  total_cost: number | null;
}

/**
 * Per-check score trend data point (from check_score_hourly view).
 */
export interface CheckScoreBucket {
  bucket: string;
  check_type: string;
  avg_score: number | null;
  check_count: number;
}

/**
 * Correction effectiveness stats for a time period.
 */
export interface CorrectionStatsBucket {
  bucket: string;
  corrected_count: number;
  failed_count: number;
  total_count: number;
}

/**
 * Layer usage breakdown for correction cascade.
 */
export interface CorrectionLayerUsage {
  layer_name: string;
  count: number;
}

/**
 * Tool usage analytics row.
 */
export interface ToolUsageRow {
  tool_name: string;
  call_count: number;
  avg_duration_ms: number | null;
  agents_using: number;
  flag_rate: number | null;
  block_rate: number | null;
}

/**
 * KPI aggregates for the tool usage dashboard.
 */
export interface ToolUsageKpis {
  total_calls: number;
  unique_tools: number;
  anomaly_count: number;
  active_policies: number;
}

/**
 * Daily time-series bucket for tool call volume chart.
 */
export interface ToolCallDailyBucket {
  bucket: string;
  tool_name: string;
  call_count: number;
}

/**
 * Tool × agent risk matrix cell for heatmap.
 */
export interface ToolRiskCell {
  tool_name: string;
  agent_id: string;
  call_count: number;
  block_rate: number;
}

/**
 * Detected anomaly for a tool.
 */
export interface ToolAnomaly {
  severity: 'critical' | 'high' | 'medium';
  tool_name: string;
  agent_id: string | null;
  anomaly_type: string;
  description: string;
  current_value: number;
  baseline_value: number;
}

/**
 * Cost or latency anomaly alert from z-score detection.
 */
export interface AnomalyAlert {
  alert_id: string;
  agent_id: string;
  agent_name: string;
  alert_type: 'cost_anomaly' | 'latency_anomaly';
  severity: 'high' | 'medium';
  execution_id: string;
  created_at: string;
}

/**
 * Failure pattern row for homepage widget.
 */
export interface FailurePattern {
  agent_id: string;
  agent_name: string;
  check_type: string;
  failure_count: number;
}

/**
 * A Nango-managed OAuth integration connection.
 */
export interface IntegrationConnection {
  id: string;
  org_id: string;
  provider: string;
  nango_connection_id: string;
  workspace_name: string | null;
  status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

/**
 * A user-defined alert threshold rule.
 */
export interface AlertRule {
  id: string;
  account_id: string;
  name: string;
  confidence_threshold: number;
  enabled: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

/**
 * A delivery channel attached to an alert rule.
 */
export interface AlertRuleChannel {
  id: string;
  alert_rule_id: string;
  channel_type: string;
  connection_id: string | null;
  slack_channel_id: string | null;
  slack_channel_name: string | null;
  created_at: string;
}

/**
 * Alert rule with joined channel info for display.
 */
export interface AlertRuleWithChannel extends AlertRule {
  channel_type: string | null;
  slack_channel_name: string | null;
}

/**
 * A variant configuration within an A/B experiment.
 */
export interface ExperimentVariant {
  key: string;
  label: string;
  config?: Record<string, unknown>;
}

/**
 * An A/B testing experiment that compares agent variants.
 */
export interface Experiment {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  mode: 'offline' | 'live';
  status: 'draft' | 'running' | 'completed';
  variants: ExperimentVariant[];
  dataset_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

/**
 * A dataset used for offline experiment evaluation.
 */
export interface Dataset {
  id: string;
  org_id: string;
  name: string;
  items: DatasetItem[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

/**
 * A single item within a dataset.
 */
export interface DatasetItem {
  input: string;
  expected_output?: string;
  ground_truth?: unknown;
  metadata?: Record<string, unknown>;
}

/**
 * Aggregated metrics for a single experiment variant.
 */
export interface VariantMetrics {
  variant: string;
  execution_count: number;
  avg_confidence: number | null;
  pass_count: number;
  flag_count: number;
  block_count: number;
  avg_latency: number | null;
  avg_cost: number | null;
  corrected_count: number;
}

/**
 * Per-check-type score breakdown by variant for experiment comparison.
 */
export interface CheckScoreByVariant {
  variant: string;
  check_type: string;
  avg_score: number | null;
}
