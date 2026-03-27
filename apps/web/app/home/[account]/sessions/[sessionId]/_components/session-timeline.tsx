'use client';

import { useState } from 'react';

import Link from 'next/link';

import { formatDistanceStrict } from 'date-fns';
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Shield,
  User,
  Wrench,
  XCircle,
} from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { Badge } from '@kit/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import { Trans } from '@kit/ui/trans';

import {
  formatConfidence,
  formatCost,
  formatLatency,
  formatTimestamp,
  formatTokens,
} from '~/lib/agentguard/formatters';
import type {
  CheckResult,
  SessionDetailHeader,
  SessionTurn,
  TracePayload,
} from '~/lib/agentguard/types';

interface SessionTimelineProps {
  header: SessionDetailHeader;
  turns: SessionTurn[];
  tracePayloads?: Record<string, TracePayload>;
  checkResults?: Record<string, CheckResult[]>;
  accountSlug: string;
}

function ActionIcon({ action }: { action: string }) {
  if (action === 'pass') {
    return <CheckCircle2 className="h-5 w-5 text-green-500" />;
  }

  if (action === 'flag') {
    return <AlertTriangle className="h-5 w-5 text-amber-500" />;
  }

  return <XCircle className="h-5 w-5 text-red-500" />;
}

function ActionBadge({ action }: { action: string }) {
  const styles: Record<string, string> = {
    pass: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    flag: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
    block: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  };

  return (
    <Badge variant="outline" className={styles[action] ?? ''}>
      <Trans i18nKey={`agentguard:common.${action}`} />
    </Badge>
  );
}

function StatPill({ label, value }: { label: React.ReactNode; value: string }) {
  return (
    <div className="bg-muted/50 flex flex-col gap-1 rounded-md px-3 py-2">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="text-sm font-semibold">{value}</span>
    </div>
  );
}

function formatPayloadContent(value: unknown): string {
  if (value === null || value === undefined) return '';

  if (typeof value === 'string') return value;

  return JSON.stringify(value, null, 2);
}

function ContentBubble({
  children,
  variant,
}: {
  children: React.ReactNode;
  variant: 'user' | 'agent';
}) {
  const isUser = variant === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? '' : 'flex-row-reverse'}`}>
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isUser
            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
            : 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
        }`}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div
        className={`max-w-[80%] rounded-lg px-4 py-3 ${
          isUser
            ? 'bg-blue-50 dark:bg-blue-950/50'
            : 'bg-purple-50 dark:bg-purple-950/50'
        }`}
      >
        {children}
      </div>
    </div>
  );
}

function ToolCallCard({
  step,
}: {
  step: { name: string; input: unknown; output: unknown };
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-muted mx-11 rounded-md border">
      <button
        type="button"
        className="text-muted-foreground hover:bg-muted/50 flex w-full items-center gap-2 px-3 py-2 text-left text-xs"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? (
          <ChevronDown className="h-3 w-3 shrink-0" />
        ) : (
          <ChevronRight className="h-3 w-3 shrink-0" />
        )}
        <Wrench className="h-3 w-3 shrink-0" />
        <span className="font-mono font-medium">{step.name}</span>
      </button>
      {expanded && (
        <div className="border-muted space-y-2 border-t px-3 py-2">
          {step.input != null && step.input !== '' && (
            <div>
              <span className="text-muted-foreground text-xs font-medium">
                Input
              </span>
              <pre className="bg-muted/50 mt-1 max-h-40 overflow-auto rounded p-2 text-xs">
                {formatPayloadContent(step.input)}
              </pre>
            </div>
          )}
          {step.output != null && step.output !== '' && (
            <div>
              <span className="text-muted-foreground text-xs font-medium">
                Output
              </span>
              <pre className="bg-muted/50 mt-1 max-h-40 overflow-auto rounded p-2 text-xs">
                {formatPayloadContent(step.output)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const CHECK_TYPE_LABELS: Record<string, string> = {
  schema: 'Schema',
  hallucination: 'Hallucination',
  drift: 'Drift',
  coherence: 'Coherence',
  tool_loop: 'Tool Loop',
  guardrails: 'Guardrails',
};

function CheckBreakdown({ checks }: { checks: CheckResult[] }) {
  const [expanded, setExpanded] = useState(false);
  const [expandedDetail, setExpandedDetail] = useState<number | null>(null);

  if (checks.length === 0) return null;

  return (
    <div className="mx-11">
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground flex w-full items-center gap-1.5 px-3 py-1.5 text-left text-xs transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? (
          <ChevronDown className="h-3 w-3 shrink-0" />
        ) : (
          <ChevronRight className="h-3 w-3 shrink-0" />
        )}
        <Shield className="h-3 w-3 shrink-0" />
        <span className="font-medium">
          Verification Checks ({checks.filter((c) => c.passed).length}/
          {checks.length} passed)
        </span>
      </button>
      {expanded && (
        <div className="border-muted mt-1 space-y-1 rounded-md border px-3 py-2">
          {checks.map((check) => (
            <div key={check.id}>
              <button
                type="button"
                className="hover:bg-muted/50 flex w-full items-center gap-3 rounded px-2 py-1.5 text-left text-xs"
                onClick={() =>
                  setExpandedDetail(
                    expandedDetail === check.id ? null : check.id,
                  )
                }
              >
                {expandedDetail === check.id ? (
                  <ChevronDown className="text-muted-foreground h-3 w-3 shrink-0" />
                ) : (
                  <ChevronRight className="text-muted-foreground h-3 w-3 shrink-0" />
                )}
                <span className="w-24 font-medium">
                  {CHECK_TYPE_LABELS[check.check_type] ?? check.check_type}
                </span>
                <Badge
                  variant="outline"
                  className={
                    check.passed
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  }
                >
                  {check.passed ? 'Pass' : 'Fail'}
                </Badge>
                {check.score != null && (
                  <span
                    className={`ml-auto font-mono text-xs font-semibold ${
                      check.score >= 0.8
                        ? 'text-green-600 dark:text-green-400'
                        : check.score >= 0.5
                          ? 'text-yellow-600 dark:text-yellow-400'
                          : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {(check.score * 100).toFixed(0)}%
                  </span>
                )}
              </button>
              {expandedDetail === check.id &&
                check.details &&
                Object.keys(check.details).length > 0 && (
                  <pre className="bg-muted/50 mx-2 mt-1 mb-2 max-h-40 overflow-auto rounded p-2 text-xs">
                    {JSON.stringify(check.details, null, 2)}
                  </pre>
                )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatCorrectionValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value || null;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function CorrectionInline({ turn }: { turn: SessionTurn }) {
  const [expanded, setExpanded] = useState(false);

  if (!turn.corrected) return null;

  const meta = turn.metadata ?? {};
  const originalOutput = formatCorrectionValue(meta.original_output);
  const correctedOutput = formatCorrectionValue(meta.corrected_output);

  if (!originalOutput && !correctedOutput) return null;

  return (
    <div className="mx-11">
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground flex w-full items-center gap-1.5 px-3 py-1.5 text-left text-xs transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? (
          <ChevronDown className="h-3 w-3 shrink-0" />
        ) : (
          <ChevronRight className="h-3 w-3 shrink-0" />
        )}
        <Wrench className="h-3 w-3 shrink-0" />
        <span className="font-medium">
          <Trans i18nKey="agentguard:sessions.correctionDetails" defaults="Correction Details" />
        </span>
        <ArrowRight className="h-3 w-3 shrink-0" />
        <span className="text-green-600 dark:text-green-400">
          <Trans i18nKey="agentguard:sessions.outputCorrected" defaults="Output was corrected" />
        </span>
      </button>
      {expanded && (
        <div className="mt-1 grid grid-cols-1 gap-3 md:grid-cols-2">
          {originalOutput && (
            <div className="flex flex-col gap-1.5">
              <span className="px-1 text-xs font-medium text-red-700 dark:text-red-400">
                <Trans i18nKey="agentguard:correction.original" defaults="Original" />
              </span>
              <div className="prose prose-sm dark:prose-invert prose-p:my-1 prose-pre:my-2 prose-ul:my-1 prose-ol:my-1 prose-headings:my-2 prose-code:before:content-none prose-code:after:content-none max-h-64 max-w-none overflow-auto rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/50">
                <Markdown remarkPlugins={[remarkGfm]}>{originalOutput}</Markdown>
              </div>
            </div>
          )}
          {correctedOutput && (
            <div className="flex flex-col gap-1.5">
              <span className="px-1 text-xs font-medium text-green-700 dark:text-green-400">
                <Trans i18nKey="agentguard:correction.corrected" defaults="Corrected" />
              </span>
              <div className="prose prose-sm dark:prose-invert prose-p:my-1 prose-pre:my-2 prose-ul:my-1 prose-ol:my-1 prose-headings:my-2 prose-code:before:content-none prose-code:after:content-none max-h-64 max-w-none overflow-auto rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-900 dark:bg-green-950/50">
                <Markdown remarkPlugins={[remarkGfm]}>
                  {correctedOutput}
                </Markdown>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function VerificationBar({
  turn,
  accountSlug,
}: {
  turn: SessionTurn;
  accountSlug: string;
}) {
  return (
    <div className="bg-muted/30 mx-11 flex items-center justify-between rounded-md px-3 py-2">
      <div className="flex items-center gap-2">
        <ActionIcon action={turn.action} />
        <Link
          href={`/home/${accountSlug}/executions/${turn.execution_id}`}
          className="text-primary text-xs font-medium hover:underline"
        >
          Turn {turn.sequence_number ?? 0}
        </Link>
        <ActionBadge action={turn.action} />
        {turn.corrected && (
          <Badge
            variant="outline"
            className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
          >
            <Wrench className="mr-1 h-3 w-3" />
            <Trans i18nKey="agentguard:sessions.corrected" />
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-3">
        <span
          className={`text-sm font-semibold ${
            turn.confidence != null
              ? turn.confidence >= 0.8
                ? 'text-green-600 dark:text-green-400'
                : turn.confidence >= 0.5
                  ? 'text-yellow-600 dark:text-yellow-400'
                  : 'text-red-600 dark:text-red-400'
              : 'text-muted-foreground'
          }`}
        >
          {formatConfidence(turn.confidence)}
        </span>
        <span className="text-muted-foreground flex items-center gap-1 text-xs">
          <Clock className="h-3 w-3" />
          {formatLatency(turn.latency_ms)}
        </span>
      </div>
    </div>
  );
}

function ConversationTurnView({
  turn,
  payload,
  accountSlug,
  checks,
}: {
  turn: SessionTurn;
  payload: TracePayload;
  accountSlug: string;
  checks?: CheckResult[];
}) {
  const inputText = formatPayloadContent(payload.input);
  const outputText = formatPayloadContent(payload.output);
  const toolCalls = (payload.steps ?? []).filter(
    (s) => s.step_type === 'tool_call',
  );

  return (
    <div className="space-y-3">
      {/* User input */}
      {inputText && (
        <ContentBubble variant="user">
          <div className="prose prose-sm dark:prose-invert prose-p:my-1 prose-pre:my-2 prose-ul:my-1 prose-ol:my-1 prose-headings:my-2 prose-code:before:content-none prose-code:after:content-none max-w-none">
            <Markdown remarkPlugins={[remarkGfm]}>{inputText}</Markdown>
          </div>
        </ContentBubble>
      )}

      {/* Tool calls */}
      {toolCalls.map((step, i) => (
        <ToolCallCard key={`${turn.execution_id}-tool-${i}`} step={step} />
      ))}

      {/* Agent response */}
      {outputText && (
        <ContentBubble variant="agent">
          <div className="prose prose-sm dark:prose-invert prose-p:my-1 prose-pre:my-2 prose-ul:my-1 prose-ol:my-1 prose-headings:my-2 prose-code:before:content-none prose-code:after:content-none max-w-none">
            <Markdown remarkPlugins={[remarkGfm]}>{outputText}</Markdown>
          </div>
        </ContentBubble>
      )}

      {/* Verification bar */}
      <VerificationBar turn={turn} accountSlug={accountSlug} />
      {checks && checks.length > 0 && <CheckBreakdown checks={checks} />}
      <CorrectionInline turn={turn} />
    </div>
  );
}

function FallbackTurnView({
  turn,
  index,
  accountSlug,
  checks,
}: {
  turn: SessionTurn;
  index: number;
  accountSlug: string;
  checks?: CheckResult[];
}) {
  return (
    <div className="relative flex gap-4">
      <div className="z-10 mt-1 shrink-0">
        <ActionIcon action={turn.action} />
      </div>
      <div className="mb-6 flex-1 rounded-lg border p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Link
                href={`/home/${accountSlug}/executions/${turn.execution_id}`}
                className="text-primary text-sm font-medium hover:underline"
              >
                Turn {turn.sequence_number ?? index}
              </Link>
              <ActionBadge action={turn.action} />
              {turn.corrected && (
                <Badge
                  variant="outline"
                  className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                >
                  <Wrench className="mr-1 h-3 w-3" />
                  <Trans i18nKey="agentguard:sessions.corrected" />
                </Badge>
              )}
            </div>
            {turn.task && (
              <p className="text-muted-foreground text-sm">{turn.task}</p>
            )}
          </div>
          <span
            className={`text-sm font-semibold ${
              turn.confidence != null
                ? turn.confidence >= 0.8
                  ? 'text-green-600 dark:text-green-400'
                  : turn.confidence >= 0.5
                    ? 'text-yellow-600 dark:text-yellow-400'
                    : 'text-red-600 dark:text-red-400'
                : 'text-muted-foreground'
            }`}
          >
            {formatConfidence(turn.confidence)}
          </span>
        </div>
        <div className="text-muted-foreground mt-3 flex flex-wrap gap-4 text-xs">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatLatency(turn.latency_ms)}
          </span>
          {turn.token_count != null && (
            <span>{formatTokens(turn.token_count)} tokens</span>
          )}
          {turn.cost_estimate != null && (
            <span>{formatCost(turn.cost_estimate)}</span>
          )}
          <span>{formatTimestamp(turn.timestamp)}</span>
        </div>
        {checks && checks.length > 0 && (
          <div className="mt-2">
            <CheckBreakdown checks={checks} />
          </div>
        )}
        {turn.corrected && (
          <div className="mt-2">
            <CorrectionInline turn={turn} />
          </div>
        )}
      </div>
    </div>
  );
}

export default function SessionTimeline({
  header,
  turns,
  tracePayloads = {},
  checkResults = {},
  accountSlug,
}: SessionTimelineProps) {
  const duration = formatDistanceStrict(
    new Date(header.first_timestamp),
    new Date(header.last_timestamp),
  );

  const hasAnyPayloads = Object.keys(tracePayloads).length > 0;

  return (
    <div
      className={
        'animate-in fade-in flex flex-col space-y-4 pb-36 duration-500'
      }
    >
      {/* Header Stats */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="font-mono text-base">
                {header.session_id}
              </CardTitle>
              <CardDescription>
                <Link
                  href={`/home/${accountSlug}/agents/${header.agent_id}`}
                  className="text-primary hover:underline"
                >
                  {header.agent_name}
                </Link>
                {' · '}
                {duration}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            <StatPill
              label={<Trans i18nKey="agentguard:sessions.turns" />}
              value={header.turn_count.toString()}
            />
            <StatPill
              label={<Trans i18nKey="agentguard:sessions.avgConfidence" />}
              value={formatConfidence(header.avg_confidence)}
            />
            <StatPill
              label={<Trans i18nKey="agentguard:sessions.duration" />}
              value={duration}
            />
            <StatPill
              label={<Trans i18nKey="agentguard:sessions.totalTokens" />}
              value={formatTokens(header.total_tokens)}
            />
            <StatPill
              label={<Trans i18nKey="agentguard:sessions.totalCost" />}
              value={formatCost(header.total_cost)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Conversation / Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>
            <Trans i18nKey="agentguard:sessions.turnTimeline" />
          </CardTitle>
          <CardDescription>
            <Trans i18nKey="agentguard:sessions.detailDescription" />
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasAnyPayloads ? (
            <div className="space-y-6">
              {turns.map((turn, index) => {
                const payload = tracePayloads[turn.execution_id];

                if (payload) {
                  return (
                    <ConversationTurnView
                      key={turn.execution_id}
                      turn={turn}
                      payload={payload}
                      accountSlug={accountSlug}
                      checks={checkResults[turn.execution_id]}
                    />
                  );
                }

                return (
                  <FallbackTurnView
                    key={turn.execution_id}
                    turn={turn}
                    index={index}
                    accountSlug={accountSlug}
                    checks={checkResults[turn.execution_id]}
                  />
                );
              })}
            </div>
          ) : (
            <div className="relative space-y-0">
              {turns.map((turn, index) => (
                <div key={turn.execution_id} className="relative">
                  {index < turns.length - 1 && (
                    <div className="bg-border absolute top-10 left-[11px] h-[calc(100%-16px)] w-px" />
                  )}
                  <FallbackTurnView
                    turn={turn}
                    index={index}
                    accountSlug={accountSlug}
                    checks={checkResults[turn.execution_id]}
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
