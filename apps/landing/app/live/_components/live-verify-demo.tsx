'use client';

import { useCallback, useState } from 'react';

import { RotateCcw } from 'lucide-react';

import { SCENARIOS } from '../_lib/scenarios';
import { useVerify } from '../_lib/use-verify';
import { ChatBubble } from './chat-bubble';
import { GroundTruthPanel } from './ground-truth-panel';
import { ScenarioStepper } from './scenario-stepper';
import { VerificationCard } from './verification-card';

type Phase = 'ready' | 'customer' | 'agent' | 'verifying' | 'result';

export function LiveVerifyDemo() {
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('ready');
  const { state, verify, reset: resetVerify } = useVerify();

  const scenario = SCENARIOS[scenarioIndex]!;
  const isLastScenario = scenarioIndex === SCENARIOS.length - 1;

  const runScenario = useCallback(async () => {
    setPhase('customer');

    await delay(800);
    setPhase('agent');

    await delay(1200);
    setPhase('verifying');

    await verify(scenario);
    setPhase('result');
  }, [scenario, verify]);

  const nextScenario = useCallback(() => {
    resetVerify();
    setScenarioIndex((i) => i + 1);
    setPhase('ready');
  }, [resetVerify]);

  const restart = useCallback(() => {
    resetVerify();
    setScenarioIndex(0);
    setPhase('ready');
  }, [resetVerify]);

  const actionStatus =
    state.status === 'success'
      ? state.data.corrected
        ? 'corrected'
        : state.data.action
      : undefined;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Stepper */}
      <ScenarioStepper
        steps={SCENARIOS.map((s) => ({
          label: s.label,
          description: s.description,
        }))}
        currentStep={scenarioIndex}
      />

      {/* Scenario description */}
      <p className="text-center text-sm text-[#888]">{scenario.description}</p>

      {/* Ground Truth */}
      <GroundTruthPanel content={scenario.groundTruth} />

      {/* Chat Area */}
      <div className="min-h-[200px] space-y-4">
        {/* Customer bubble */}
        <ChatBubble
          role="customer"
          message={scenario.customerMessage}
          visible={phase !== 'ready'}
        />

        {/* Agent bubble */}
        <ChatBubble
          role="agent"
          message={scenario.agentOutput}
          status={actionStatus}
          visible={
            phase === 'agent' || phase === 'verifying' || phase === 'result'
          }
        />

        {/* Loading state */}
        {phase === 'verifying' && (
          <div className="animate-in fade-in flex items-center justify-center gap-2 py-4 duration-300">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
            <span className="text-sm text-[#888]">Verifying with Vex...</span>
          </div>
        )}

        {/* Error state */}
        {state.status === 'error' && (
          <div className="animate-in fade-in rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-center text-sm text-red-400 duration-300">
            {state.error}
          </div>
        )}

        {/* Verification Result */}
        {state.status === 'success' && phase === 'result' && (
          <VerificationCard result={state.data} visible={true} />
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center gap-3 pt-4">
        {phase === 'ready' && (
          <button
            onClick={runScenario}
            className="inline-flex items-center rounded-lg bg-emerald-500 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-400"
          >
            {scenarioIndex === 0 ? 'Start Demo' : 'Run Scenario'}
          </button>
        )}

        {phase === 'result' && !isLastScenario && (
          <button
            onClick={nextScenario}
            className="inline-flex items-center rounded-lg bg-emerald-500 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-400"
          >
            Next Scenario →
          </button>
        )}

        {phase === 'result' && isLastScenario && (
          <button
            onClick={restart}
            className="inline-flex items-center gap-2 rounded-lg border border-[#333] px-6 py-2.5 text-sm font-medium text-[#ccc] transition-colors hover:border-[#555] hover:text-white"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Replay Demo
          </button>
        )}
      </div>
    </div>
  );
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
