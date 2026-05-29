'use client';

import { useState } from 'react';

import Link from 'next/link';

import { ArrowRight, Check, Copy, Terminal } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';

import { Button } from '@kit/ui/button';

interface StepConnectAgentsProps {
  accountSlug: string;
  onNext: () => void;
  onBack: () => void;
}

const INIT_COMMAND = 'npx @klio-tech/klio@latest init';

export function StepConnectAgents({
  accountSlug,
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

  return (
    <div className="space-y-8">
      {/* Heading + description centered */}
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

      {/* Command card with copy button */}
      <motion.div
        className="border-border/50 bg-card/50 space-y-4 rounded-xl border p-6 md:p-8"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="bg-muted/50 flex items-center gap-3 rounded-lg border p-4">
          <Terminal className="text-muted-foreground h-5 w-5 shrink-0" />
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

      {/* CTA + back */}
      <motion.div
        className="flex flex-col items-center gap-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
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
