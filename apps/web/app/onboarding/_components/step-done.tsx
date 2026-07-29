'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { Loader2, PartyPopper } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';

import { Button } from '@kit/ui/button';

import { completeOnboardingAction } from '../_lib/server-actions';

interface StepDoneProps {
  accountSlug: string;
}

export function StepDone({ accountSlug }: StepDoneProps) {
  const { t } = useTranslation('agentguard');
  const router = useRouter();
  const [completing, setCompleting] = useState(false);

  const handleFinish = async () => {
    setCompleting(true);

    try {
      await completeOnboardingAction({ accountSlug });
      router.push(`/home/${accountSlug}`);
    } catch {
      setCompleting(false);
    }
  };

  return (
    <div className="space-y-8">
      <motion.div
        className="flex flex-col items-center gap-4"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
      >
        <PartyPopper className="h-16 w-16 text-green-500" />
        <h1 className="text-center text-3xl font-bold tracking-tight">
          {t('onboarding.doneTitle')}
        </h1>
        <p className="text-muted-foreground mx-auto max-w-md text-center">
          {t('onboarding.doneDescription')}
        </p>
      </motion.div>

      <motion.div
        className="flex flex-col items-center gap-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Button
          onClick={handleFinish}
          disabled={completing}
          className="rounded-lg px-8"
          size="lg"
        >
          {completing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {t('onboarding.doneCta')}
        </Button>
      </motion.div>
    </div>
  );
}
