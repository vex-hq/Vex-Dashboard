'use client';

import { useState } from 'react';

import Link from 'next/link';

import { formatDistanceToNow } from 'date-fns';
import { Brain, Terminal } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@kit/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';

import { encodeAgentIdPath } from '~/lib/agentguard/agent-id-path';

import type { AgentActivityRow } from '../_lib/server/memory.loader';

interface AgentActivityProps {
  agents: AgentActivityRow[];
  accountSlug: string;
}

const ACTIVE_WINDOW_MS = 24 * 60 * 60 * 1000;

const INIT_COMMAND = 'npx @klio-tech/klio@latest init';

/**
 * Map a raw `tool` slug (e.g. `claude-code`) to a friendly display label.
 * Unknown tools fall back to a title-cased version of the slug.
 */
const TOOL_LABELS: Record<string, string> = {
  'claude-code': 'Claude Code',
  'claude-desktop': 'Claude Desktop',
  cursor: 'Cursor',
  codex: 'Codex',
  opencode: 'OpenCode',
  openclaw: 'OpenClaw',
  windsurf: 'Windsurf',
  cline: 'Cline',
};

function friendlyToolLabel(tool: string): string {
  const known = TOOL_LABELS[tool];

  if (known) {
    return known;
  }

  return tool
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/**
 * The machine identifier is the segment before the last `/` in `agent_id`.
 * Returns null when the id has no machine prefix.
 */
function deriveMachine(agentId: string): string | null {
  const lastSlash = agentId.lastIndexOf('/');

  if (lastSlash <= 0) {
    return null;
  }

  return agentId.slice(0, lastSlash);
}

function mostRecentActivity(row: AgentActivityRow): Date | null {
  const candidates = [row.last_captured, row.last_recalled]
    .filter((value): value is string => value != null)
    .map((value) => new Date(value))
    .filter((date) => !Number.isNaN(date.getTime()));

  if (candidates.length === 0) {
    return null;
  }

  return candidates.reduce((latest, current) =>
    current.getTime() > latest.getTime() ? current : latest,
  );
}

export function AgentActivity({ agents, accountSlug }: AgentActivityProps) {
  const { t } = useTranslation('agentguard');

  // Capture "now" once per mount so the active-window comparison stays pure
  // across re-renders (React forbids calling Date.now() during render).
  const [now] = useState(() => Date.now());

  if (agents.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <div className="bg-muted flex h-12 w-12 items-center justify-center rounded-full">
            <Brain className="text-muted-foreground h-6 w-6" />
          </div>
          <div className="space-y-1">
            <p className="text-foreground text-sm font-medium">
              {t('memory.noAgentsTitle')}
            </p>
            <p className="text-muted-foreground mx-auto max-w-sm text-sm">
              {t('memory.noAgentsDescription')}
            </p>
          </div>
          <p className="text-muted-foreground text-xs">
            {t('memory.noAgentsHint')}
          </p>
          <code className="bg-muted text-foreground inline-flex items-center gap-2 rounded-md px-3 py-1.5 font-mono text-sm">
            <Terminal className="text-muted-foreground h-3.5 w-3.5" />
            {INIT_COMMAND}
          </code>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {agents.map((agent) => {
        const lastActive = mostRecentActivity(agent);
        const isActive =
          lastActive != null && now - lastActive.getTime() < ACTIVE_WINDOW_MS;
        const machine = deriveMachine(agent.agent_id);

        return (
          <Link
            key={agent.agent_id}
            href={`/home/${accountSlug}/memory/agent/${encodeAgentIdPath(agent.agent_id)}`}
            aria-label={`Memory for ${agent.agent_id}`}
            className="group block rounded-xl transition-colors"
          >
            <Card className="hover:border-primary/40 hover:bg-card flex h-full cursor-pointer flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 space-y-1">
                    <CardTitle
                      className="truncate text-base"
                      title={agent.tool}
                    >
                      {friendlyToolLabel(agent.tool)}
                    </CardTitle>
                    {machine ? (
                      <p
                        className="text-muted-foreground truncate font-mono text-xs"
                        title={machine}
                      >
                        {machine}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {isActive ? (
                      <span
                        className="h-2 w-2 rounded-full bg-green-500"
                        aria-hidden
                      />
                    ) : null}
                    <span className="text-muted-foreground text-xs">
                      {lastActive
                        ? formatDistanceToNow(lastActive, { addSuffix: true })
                        : t('memory.lastActiveNever')}
                    </span>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex flex-1 flex-col justify-between gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-foreground text-2xl font-semibold">
                      {agent.captured.toLocaleString()}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {t('memory.captured')}
                    </p>
                  </div>
                  <div>
                    <p className="text-foreground text-2xl font-semibold">
                      {agent.recalled.toLocaleString()}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {t('memory.recalled')}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="secondary" className="font-normal">
                    {agent.facts.toLocaleString()} {t('memory.facts')}
                  </Badge>
                  <Badge variant="secondary" className="font-normal">
                    {agent.via_hook.toLocaleString()} {t('memory.viaHook')}
                  </Badge>
                  <Badge variant="secondary" className="font-normal">
                    {agent.via_mcp.toLocaleString()} {t('memory.viaMcp')}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
