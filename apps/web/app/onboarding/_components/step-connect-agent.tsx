'use client';

import { useCallback, useEffect, useState } from 'react';

import { Bot, Check, Copy, Key, Terminal } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';

import { Button } from '@kit/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';

import {
  KLIO_INIT_COMMAND,
  buildKlioAgentPrompt,
} from '~/lib/agentguard/mcp.constants';

import { CodeBlock } from './code-block';

/**
 * Connect this person's own coding agents.
 *
 * TWO DOORS, ONE ENGINE. The agent tab hands over a prompt to paste into
 * Claude Code / Cursor; the terminal tab hands over the same setup as a
 * command. Both end in `klio init --cloud`, which is the only tested path
 * that installs the MCP server, the four capture hooks and the tool
 * allow-list together. Neither door describes the config, because a partial
 * install looks connected and captures nothing.
 *
 * The agent tab leads because most people who reach this screen already have
 * a coding agent open — that agent is the thing being connected, and it is
 * better at running a command than they are at finding a terminal.
 *
 * Shared by BOTH wizards. The workspace creator and an invitee have the same
 * job here (wire the agents on *this* laptop) and differ only in which key
 * they hold, so they get the same screen rather than two that drift.
 */
interface StepConnectAgentProps {
  /** Mints the key for whoever this is — onboarding key or join key. */
  mintKey: () => Promise<string | null>;
  onNext: () => void;
  onBack: () => void;
  /**
   * Lifted so the wizard can pass the key to the next screen's manual MCP
   * config. Must be a stable reference: it sits in the mint effect's
   * dependency chain, and an inline arrow would re-fire it every render —
   * which revokes the key just minted.
   */
  onKeyCreated: (key: string) => void;
}

export function StepConnectAgent({
  mintKey,
  onNext,
  onBack,
  onKeyCreated,
}: StepConnectAgentProps) {
  const { t } = useTranslation('agentguard');
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState(false);

  const generateKey = useCallback(async () => {
    setLoading(true);

    try {
      const key = await mintKey();

      if (key) {
        setApiKey(key);
        onKeyCreated(key);
      }
    } catch {
      // Surfaced as the retry state below; never blocks Continue.
    } finally {
      setLoading(false);
    }
  }, [mintKey, onKeyCreated]);

  useEffect(() => {
    generateKey();
  }, [generateKey]);

  const copyKey = async () => {
    if (!apiKey) return;

    await navigator.clipboard.writeText(apiKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h1 className="text-center text-3xl font-bold tracking-tight">
          {t('onboarding.connectAgentTitle')}
        </h1>
        <p className="text-muted-foreground mx-auto mt-2 max-w-md text-center">
          {t('onboarding.connectAgentDescription')}
        </p>
      </motion.div>

      {/* The key. Both doors need it, so it sits above the choice. */}
      <motion.div
        className="border-border/50 bg-card/50 space-y-4 rounded-xl border p-6 md:p-8"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center gap-2">
          <Key className="text-muted-foreground h-4 w-4 shrink-0" />
          <h2 className="text-sm font-semibold">
            {t('onboarding.localKeyLabel')}
          </h2>
        </div>

        {loading ? (
          <div
            className="bg-muted/50 flex h-14 items-center justify-center rounded-lg border"
            data-testid="connect-agent-key-loading"
          >
            <motion.div
              className="border-primary h-5 w-5 rounded-full border-2 border-t-transparent"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
          </div>
        ) : apiKey ? (
          <div className="bg-muted/50 flex items-center gap-3 rounded-lg border p-4">
            <code className="flex-1 truncate font-mono text-sm">{apiKey}</code>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={copyKey}
              className="shrink-0"
              aria-label={t('onboarding.copy')}
            >
              {copiedKey ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        ) : (
          <div className="bg-destructive/10 text-destructive flex h-14 items-center justify-between gap-3 rounded-lg border px-4">
            <span>{t('onboarding.localKeyFailed')}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={generateKey}
              className="shrink-0"
            >
              {t('onboarding.localKeyRetry')}
            </Button>
          </div>
        )}

        <p className="text-muted-foreground text-sm">
          {t('onboarding.localKeyWarning')}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Tabs defaultValue="agent" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="agent" className="gap-2">
              <Bot className="h-3.5 w-3.5" />
              {t('onboarding.connectAgentTab')}
            </TabsTrigger>
            <TabsTrigger value="terminal" className="gap-2">
              <Terminal className="h-3.5 w-3.5" />
              {t('onboarding.connectTerminalTab')}
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="agent"
            className="border-border/50 bg-card/50 mt-4 space-y-4 rounded-xl border p-6 md:p-8"
          >
            <p className="text-muted-foreground text-sm">
              {t('onboarding.connectAgentHint')}
            </p>

            <CodeBlock
              code={buildKlioAgentPrompt(apiKey)}
              ariaLabel={t('onboarding.connectAgentCopyLabel')}
            />

            <p className="text-muted-foreground text-sm">
              {t('onboarding.connectAgentNote')}
            </p>
          </TabsContent>

          <TabsContent
            value="terminal"
            className="border-border/50 bg-card/50 mt-4 space-y-4 rounded-xl border p-6 md:p-8"
          >
            <p className="text-muted-foreground text-sm">
              {t('onboarding.connectTerminalHint')}
            </p>

            <CodeBlock
              code={KLIO_INIT_COMMAND}
              ariaLabel={t('onboarding.connectTerminalCopyLabel')}
            />

            <p className="text-muted-foreground text-sm">
              {t('onboarding.localNote')}
            </p>
          </TabsContent>
        </Tabs>
      </motion.div>

      <motion.div
        className="flex flex-col items-center gap-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        {/* Disabled only while minting — a failed key must never trap anyone. */}
        <Button
          onClick={onNext}
          disabled={loading}
          className="rounded-lg px-8"
          size="lg"
        >
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
