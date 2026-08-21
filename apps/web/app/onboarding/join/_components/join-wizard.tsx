'use client';

import { useCallback, useState } from 'react';

import { useRouter } from 'next/navigation';

import { AnimatePresence, motion } from 'motion/react';

import { ProgressIndicator } from '../../_components/progress-indicator';
import { StepConnectAgent } from '../../_components/step-connect-agent';
import { StepConnectCloud } from '../../_components/step-connect-cloud';
import { StepVerifyConnection } from '../../_components/step-verify-connection';
import {
  completeJoinOnboardingAction,
  createJoinKeyAction,
} from '../../_lib/server-actions';
import { JoinWelcome } from './join-welcome';

/**
 * Welcome · ConnectAgent · ConnectCloud · Verify.
 *
 * ConnectAgent was missing here until now, and its absence is the reason an
 * invitee could hold a valid key and capture nothing: they were shown a raw
 * MCP config block and never told how to wire the agents on their own laptop.
 * The creator had that screen from the start. An invitee's job on this
 * machine is identical, so they get the identical screen.
 */
const JOIN_STEPS = 4;

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

  /**
   * Mint THIS member's key — never the creator's.
   *
   * `useCallback` because `StepConnectAgent` mints from an effect keyed on
   * this reference; an inline arrow would re-fire it every render, and each
   * mint revokes this user's previous join key.
   */
  const mintJoinKey = useCallback(async () => {
    const minted = await createJoinKeyAction({ accountSlug });

    return minted.key ?? null;
  }, [accountSlug]);

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <JoinWelcome
            workspaceName={workspaceName}
            onNext={() => setStep(1)}
            onSkip={skip}
            skipping={skipping}
          />
        );
      case 1:
        return (
          <StepConnectAgent
            mintKey={mintJoinKey}
            onNext={() => setStep(2)}
            onBack={() => setStep(0)}
            // Bare setter, not an arrow — see `mintJoinKey`.
            onKeyCreated={setApiKey}
          />
        );
      case 2:
        return (
          <StepConnectCloud
            accountSlug={accountSlug}
            apiKey={apiKey}
            onNext={() => setStep(3)}
            onBack={() => setStep(1)}
          />
        );
      case 3:
        return (
          <StepVerifyConnection
            accountSlug={accountSlug}
            onNext={() => {
              void skip();
            }}
            onBack={() => setStep(2)}
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
