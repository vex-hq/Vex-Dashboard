'use client';

import { useCallback, useEffect, useState } from 'react';

import { Check, Copy, Key, Terminal } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';

import { Button } from '@kit/ui/button';

import { KLIO_INIT_COMMAND } from '~/lib/agentguard/mcp.constants';

import { createOnboardingKeyAction } from '../_lib/server-actions';

interface StepRunLocalProps {
  accountSlug: string;
  onNext: () => void;
  onBack: () => void;
  onKeyCreated: (key: string) => void;
}

export function StepRunLocal({
  accountSlug,
  onNext,
  onBack,
  onKeyCreated,
}: StepRunLocalProps) {
  const { t } = useTranslation('agentguard');
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);

  const generateKey = useCallback(async () => {
    setLoading(true);

    try {
      const result = await createOnboardingKeyAction({ accountSlug });

      if (result.key) {
        setApiKey(result.key);
        onKeyCreated(result.key);
      }
    } catch {
      // Surfaced as the retry state below; never blocks Continue.
    } finally {
      setLoading(false);
    }
  }, [accountSlug, onKeyCreated]);

  useEffect(() => {
    generateKey();
  }, [generateKey]);

  const copy = async (value: string, mark: (v: boolean) => void) => {
    await navigator.clipboard.writeText(value);
    mark(true);
    setTimeout(() => mark(false), 2000);
  };

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h1 className="text-center text-3xl font-bold tracking-tight">
          {t('onboarding.localTitle')}
        </h1>
        <p className="text-muted-foreground mx-auto mt-2 max-w-md text-center">
          {t('onboarding.localDescription')}
        </p>
      </motion.div>

      {/* Key — the CLI's cloud mode prompts for this, so it sits beside the
          command rather than on a screen of its own. */}
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
          <div className="bg-muted/50 flex h-14 items-center justify-center rounded-lg border">
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
              onClick={() => copy(apiKey, setCopiedKey)}
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

      {/* The one command */}
      <motion.div
        className="border-border/50 bg-card/50 space-y-4 rounded-xl border p-6 md:p-8"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center gap-2">
          <Terminal className="text-muted-foreground h-4 w-4 shrink-0" />
          <h2 className="text-sm font-semibold">
            {t('onboarding.localCommandLabel')}
          </h2>
        </div>

        <div className="bg-muted/50 flex items-center gap-3 rounded-lg border p-4">
          <code className="flex-1 truncate font-mono text-sm">
            {KLIO_INIT_COMMAND}
          </code>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => copy(KLIO_INIT_COMMAND, setCopiedCmd)}
            className="shrink-0"
            aria-label={t('onboarding.copy')}
          >
            {copiedCmd ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>

        <p className="text-muted-foreground text-sm">
          {t('onboarding.localNote')}
        </p>
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
