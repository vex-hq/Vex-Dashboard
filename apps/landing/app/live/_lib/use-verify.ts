'use client';

import { useCallback, useState } from 'react';

import type { Scenario } from './scenarios';
import { verifyAction } from './verify-action';

export interface CheckResult {
  check_type: string;
  score: number;
  passed: boolean;
  details: Record<string, unknown>;
}

export interface VerifyResult {
  execution_id: string;
  confidence: number | null;
  action: 'pass' | 'flag' | 'block';
  output: unknown;
  checks: Record<string, CheckResult>;
  corrected: boolean;
  original_output: unknown | null;
  correction_attempts: Array<{
    layer: number;
    layer_name: string;
    corrected_output: unknown;
    confidence: number | null;
    action: string;
    success: boolean;
    latency_ms: number;
  }> | null;
}

export type VerifyState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: VerifyResult }
  | { status: 'error'; error: string };

export function useVerify() {
  const [state, setState] = useState<VerifyState>({ status: 'idle' });

  const verify = useCallback(async (scenario: Scenario) => {
    setState({ status: 'loading' });

    try {
      const data: VerifyResult = await verifyAction({
        agentOutput: scenario.agentOutput,
        groundTruth: scenario.groundTruth,
        correction: scenario.correction,
      });
      setState({ status: 'success', data });
    } catch (err) {
      setState({
        status: 'error',
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }, []);

  const reset = useCallback(() => {
    setState({ status: 'idle' });
  }, []);

  return { state, verify, reset };
}
