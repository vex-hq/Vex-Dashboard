'use client';

import { useState } from 'react';

import Link from 'next/link';

import { ArrowRight, Check, Copy, Network, Terminal } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';

import { Button } from '@kit/ui/button';

import {
  KLIO_MCP_KEY_HEADER,
  KLIO_MCP_KEY_PLACEHOLDER,
  KLIO_MCP_URL,
  buildKlioMcpConfig,
} from '~/lib/agentguard/mcp.constants';

import { CodeBlock } from './code-block';

interface StepConnectAgentsProps {
  accountSlug: string;
  apiKey: string | null;
  onNext: () => void;
  onBack: () => void;
}

const INIT_COMMAND = 'npx @klio-tech/klio@latest init';

export function StepConnectAgents({
  accountSlug,
  apiKey,
  onNext,
  onBack,
}: StepConnectAgentsProps) {
  const { t } = useTranslation('agentguard');
  const [copied, setCopied] = useState(false);

  const copyCommand = async () => {
    await navigator.clipboard.writeText(INIT_COMMAND);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const keyValue = apiKey ?? KLIO_MCP_KEY_PLACEHOLDER;

  return (
    <div className="space-y-8">
      {/* Heading */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h1 className="text-center text-3xl font-bold tracking-tight">
          {t('onboarding.connectAgentsTitle')}
        </h1>
        <p className="text-muted-foreground mx-auto mt-2 max-w-md text-center">
          {t('onboarding.connectAgentsDescription')}
        </p>
      </motion.div>

      {/* Card 1 — local coding agents (one command) */}
      <motion.div
        className="border-border/50 bg-card/50 space-y-4 rounded-xl border p-6 md:p-8"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center gap-2">
          <Terminal className="text-muted-foreground h-4 w-4 shrink-0" />
          <h2 className="text-sm font-semibold">
            {t('onboarding.connectAgentsLocalLabel')}
          </h2>
        </div>

        <div className="bg-muted/50 flex items-center gap-3 rounded-lg border p-4">
          <code className="flex-1 truncate font-mono text-sm">
            {INIT_COMMAND}
          </code>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={copyCommand}
            className="shrink-0"
            aria-label={t('onboarding.connectAgentsCopy')}
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>

        <p className="text-muted-foreground text-sm">
          {t('onboarding.connectAgentsNote')}
        </p>

        <Link
          href={`/home/${accountSlug}/memory`}
          className="text-primary inline-flex items-center gap-1 text-sm hover:underline"
        >
          {t('onboarding.connectAgentsViewMemory')}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </motion.div>

      {/* Card 2 — connect any other MCP agent (remote) */}
      <motion.div
        className="border-border/50 bg-card/50 space-y-4 rounded-xl border p-6 md:p-8"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center gap-2">
          <Network className="text-muted-foreground h-4 w-4 shrink-0" />
          <h2 className="text-sm font-semibold">
            {t('onboarding.connectAgentsRemoteLabel')}
          </h2>
        </div>

        <p className="text-muted-foreground text-sm">
          {t('onboarding.connectAgentsRemoteDescription')}
        </p>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <p className="text-muted-foreground text-xs font-medium">
              {t('onboarding.connectAgentsRemoteEndpointLabel')}
            </p>
            <CodeBlock code={KLIO_MCP_URL} ariaLabel="Copy MCP endpoint" />
          </div>

          <div className="space-y-1.5">
            <p className="text-muted-foreground text-xs font-medium">
              {t('onboarding.connectAgentsRemoteHeaderLabel')}
            </p>
            <CodeBlock
              code={`${KLIO_MCP_KEY_HEADER}: ${keyValue}`}
              ariaLabel="Copy auth header"
            />
          </div>

          <div className="space-y-1.5">
            <p className="text-muted-foreground text-xs font-medium">
              {t('onboarding.connectAgentsRemoteConfigLabel')}
            </p>
            <CodeBlock
              code={buildKlioMcpConfig(apiKey)}
              ariaLabel="Copy MCP client config"
            />
          </div>
        </div>

        <p className="text-muted-foreground text-sm">
          {t('onboarding.connectAgentsRemoteNote')}
        </p>

        <div className="flex flex-col gap-2">
          {!apiKey ? (
            <Link
              href={`/home/${accountSlug}/settings/api-keys`}
              className="text-primary inline-flex items-center gap-1 text-sm hover:underline"
            >
              {t('onboarding.connectAgentsRemoteKeyMissing')}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ) : null}

          <Link
            href={`/home/${accountSlug}/docs`}
            className="text-primary inline-flex items-center gap-1 text-sm hover:underline"
          >
            {t('onboarding.connectAgentsRemoteGuide')}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </motion.div>

      {/* CTA + back */}
      <motion.div
        className="flex flex-col items-center gap-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Button onClick={onNext} className="rounded-lg px-8" size="lg">
          {t('onboarding.next')}
        </Button>

        <button
          type="button"
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground text-sm transition-colors"
        >
          {t('onboarding.back')}
        </button>
      </motion.div>
    </div>
  );
}
