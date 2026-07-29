'use client';

import { useCallback, useEffect, useState } from 'react';

import { Check, Copy, Key } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';

import { Button } from '@kit/ui/button';

import { createOnboardingKeyAction } from '../_lib/server-actions';

interface StepApiKeyProps {
  accountSlug: string;
  onNext: () => void;
  onBack: () => void;
  onKeyCreated: (key: string) => void;
}

export function StepApiKey({
  accountSlug,
  onNext,
  onBack,
  onKeyCreated,
}: StepApiKeyProps) {
  const { t } = useTranslation('agentguard');
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  const generateKey = useCallback(async () => {
    try {
      const result = await createOnboardingKeyAction({ accountSlug });

      if (result.key) {
        setApiKey(result.key);
        onKeyCreated(result.key);
      }
    } catch {
      // Key creation failed
    } finally {
      setLoading(false);
    }
  }, [accountSlug, onKeyCreated]);

  useEffect(() => {
    generateKey();
  }, [generateKey]);

  const copyToClipboard = async () => {
    if (!apiKey) return;

    await navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Heading + description centered */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h1 className="text-center text-3xl font-bold tracking-tight">
          {t('onboarding.step3Title')}
        </h1>
        <p className="text-muted-foreground mx-auto mt-2 max-w-md text-center">
          {t('onboarding.step3Description')}
        </p>
      </motion.div>

      {/* Card with key display + warning */}
      <motion.div
        className="border-border/50 bg-card/50 space-y-4 rounded-xl border p-6 md:p-8"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {loading ? (
          <div className="bg-muted/50 flex h-14 items-center justify-center rounded-lg border">
            <motion.div
              className="border-primary h-5 w-5 rounded-full border-2 border-t-transparent"
              animate={{ rotate: 360 }}
              transition={{
                duration: 1,
                repeat: Infinity,
                ease: 'linear',
              }}
            />
          </div>
        ) : apiKey ? (
          <div className="bg-muted/50 flex items-center gap-3 rounded-lg border p-4">
            <Key className="text-muted-foreground h-5 w-5 shrink-0" />
            <code className="flex-1 truncate font-mono text-sm">{apiKey}</code>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={copyToClipboard}
              className="shrink-0"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        ) : (
          <div className="bg-destructive/10 text-destructive flex h-14 items-center justify-between gap-3 rounded-lg border px-4">
            <span>Failed to generate key.</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={generateKey}
              className="shrink-0"
            >
              Retry
            </Button>
          </div>
        )}

        {/* Warning inside card */}
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
          {t('onboarding.step3Warning')}
        </div>
      </motion.div>

      {/* CTA + back */}
      <motion.div
        className="flex flex-col items-center gap-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        {/* Disabled only while minting. If generation failed, the user can
            still continue — the later steps render a placeholder key, and a
            real one can be created from the dashboard. A failed mint must
            never trap someone inside onboarding. */}
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
