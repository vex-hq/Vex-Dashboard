'use client';

import { useCallback, useEffect, useState } from 'react';

import { Check, ChevronDown, Copy, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';

import { Button } from '@kit/ui/button';

import {
  KLIO_INIT_COMMAND,
  buildKlioAgentPrompt,
} from '~/lib/agentguard/mcp.constants';

import { CodeBlock } from './code-block';

/**
 * Connect this person's own coding agents.
 *
 * ONE BUTTON. The prompt is written for a machine, not for a human — nobody
 * reads it, they copy it. Rendering it in full turned this screen into a wall
 * of monospace with the real action buried underneath, so it is behind a
 * single copy button and the terminal route is a disclosure below it.
 *
 * The key is not shown on the agent path either: it is already inside the
 * copied prompt, and a key box the user does not need is just more to read.
 * It appears only under the terminal disclosure, where the CLI really does
 * stop and ask for it.
 *
 * Both routes end in `klio init --cloud`, the only tested path that installs
 * the MCP server, the four capture hooks and the tool allow-list together.
 * Neither describes the config, because a partial install looks connected and
 * captures nothing.
 *
 * Shared by BOTH wizards. The workspace creator and an invitee have the same
 * job here — wire the agents on *this* laptop — so they get the same screen
 * rather than two that drift.
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
  const [copied, setCopied] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);

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

  const copyPrompt = async () => {
    await navigator.clipboard.writeText(buildKlioAgentPrompt(apiKey));
    setCopied(true);
    setTimeout(() => setCopied(false), 4000);
  };

  const failed = !loading && !apiKey;

  return (
    <div className="space-y-10">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h1 className="text-center text-3xl font-bold tracking-tight">
          {t('onboarding.connectAgentTitle')}
        </h1>
        <p className="text-muted-foreground mx-auto mt-3 max-w-sm text-center">
          {t('onboarding.connectAgentDescription')}
        </p>
      </motion.div>

      <motion.div
        className="flex flex-col items-center gap-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Button
          type="button"
          size="lg"
          onClick={copyPrompt}
          disabled={loading}
          className="w-full max-w-sm rounded-lg"
          data-testid="copy-agent-prompt"
        >
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : copied ? (
            <Check className="mr-2 h-4 w-4" />
          ) : (
            <Copy className="mr-2 h-4 w-4" />
          )}
          {copied
            ? t('onboarding.connectAgentCopied')
            : t('onboarding.connectAgentCta')}
        </Button>

        <p
          aria-live="polite"
          className="text-muted-foreground max-w-sm text-center text-sm"
        >
          {copied
            ? t('onboarding.connectAgentPasteHint')
            : t('onboarding.connectAgentHint')}
        </p>

        {failed ? (
          <div className="bg-destructive/10 text-destructive flex w-full max-w-sm items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm">
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
        ) : null}
      </motion.div>

      {/* The terminal route, for people who would rather not hand it to an
          agent. Collapsed, because it is the minority path. */}
      <motion.div
        className="flex flex-col items-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
      >
        <button
          type="button"
          onClick={() => setShowTerminal((open) => !open)}
          aria-expanded={showTerminal}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm transition-colors"
        >
          {t('onboarding.connectTerminalToggle')}
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform ${
              showTerminal ? 'rotate-180' : ''
            }`}
          />
        </button>

        {showTerminal ? (
          <div className="mt-4 w-full space-y-3">
            <CodeBlock
              code={KLIO_INIT_COMMAND}
              ariaLabel={t('onboarding.connectTerminalCopyLabel')}
            />

            {apiKey ? (
              <>
                <p className="text-muted-foreground text-xs font-medium">
                  {t('onboarding.localKeyLabel')}
                </p>
                <CodeBlock code={apiKey} ariaLabel={t('onboarding.copy')} />
              </>
            ) : null}

            <p className="text-muted-foreground text-sm">
              {t('onboarding.connectTerminalHint')}
            </p>
          </div>
        ) : null}
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
          variant="outline"
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
