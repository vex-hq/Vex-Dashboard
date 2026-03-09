'use server';

const VEX_API_URL = 'https://api.tryvex.dev/v1/verify';
const VEX_DEMO_KEY = process.env.NEXT_PUBLIC_VEX_DEMO_KEY ?? '';

interface VerifyPayload {
  agentOutput: string;
  groundTruth: string;
  correction: 'none' | 'cascade';
}

export async function verifyAction(payload: VerifyPayload) {
  const response = await fetch(VEX_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Vex-Key': VEX_DEMO_KEY,
    },
    body: JSON.stringify({
      agent_id: 'demo-support-bot',
      task: 'Answer customer support questions about company refund policy',
      output: payload.agentOutput,
      ground_truth: payload.groundTruth,
      metadata: {
        correction: payload.correction,
        transparency: 'transparent',
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}
