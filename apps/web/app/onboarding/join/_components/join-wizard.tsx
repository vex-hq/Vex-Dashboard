'use client';

import { useCallback, useState } from 'react';

import { useRouter } from 'next/navigation';

import { AnimatePresence, motion } from 'motion/react';

import { ProgressIndicator } from '../../_components/progress-indicator';
import { StepConnectCloud } from '../../_components/step-connect-cloud';
import { StepVerifyConnection } from '../../_components/step-verify-connection';
import {
  completeJoinOnboardingAction,
  createJoinKeyAction,
} from '../../_lib/server-actions';
import { JoinWelcome } from './join-welcome';

const JOIN_STEPS = 3;

interface JoinWizardProps {
  accountSlug: string;
  workspaceName: string;
}

export function JoinWizard({ accountSlug, workspaceName }: JoinWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [skipping, setSkipping] = useState(false);

  const finish = useCallback(async () => {
    return completeJoinOnboardingAction({ accountSlug });
  }, [accountSlug]);

  const skip = useCallback(async () => {
    setSkipping(true);

    try {
      const result = await finish();
      router.push(result.href ?? `/home/${accountSlug}`);
    } catch {
      setSkipping(false);
    }
  }, [accountSlug, finish, router]);

  const goConnect = useCallback(async () => {
    try {
      const minted = await createJoinKeyAction({ accountSlug });
      setApiKey(minted.key);
    } catch {
      setApiKey(null);
    }

    setStep(1);
  }, [accountSlug]);

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <JoinWelcome
            workspaceName={workspaceName}
            onNext={goConnect}
            onSkip={skip}
            skipping={skipping}
          />
        );
      case 1:
        return (
          <StepConnectCloud
            accountSlug={accountSlug}
            apiKey={apiKey}
            onNext={() => setStep(2)}
            onBack={() => setStep(0)}
          />
        );
      case 2:
        return (
          <StepVerifyConnection
            accountSlug={accountSlug}
            onNext={() => {
              void skip();
            }}
            onBack={() => setStep(1)}
            finish={finish}
            skipTestId="join-onboarding-skip"
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-xl">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>

        <ProgressIndicator currentStep={step} totalSteps={JOIN_STEPS} />
      </div>
    </div>
  );
}
