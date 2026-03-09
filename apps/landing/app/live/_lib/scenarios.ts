export interface Scenario {
  id: number;
  label: string;
  description: string;
  customerMessage: string;
  agentOutput: string;
  groundTruth: string;
  correction: 'none' | 'cascade';
  expectedAction: 'pass' | 'flag' | 'block';
}

const GROUND_TRUTH = `Company Refund Policy:
- 30-day refund window from date of purchase
- Product must be unused and in original packaging
- Digital products are non-refundable after download
- Refund processed within 5-7 business days
- Shipping costs are non-refundable
- No exceptions beyond the 30-day window`;

export const SCENARIOS: Scenario[] = [
  {
    id: 1,
    label: 'Correct Response',
    description: 'The agent answers accurately — Vex verifies and passes it through.',
    customerMessage: 'Hi, what is your refund policy? I bought something last week.',
    agentOutput:
      'We offer a 30-day refund policy from the date of purchase. The product must be unused and in its original packaging. Digital products are non-refundable after download. Once approved, refunds are processed within 5-7 business days. Please note that shipping costs are non-refundable.',
    groundTruth: GROUND_TRUTH,
    correction: 'none',
    expectedAction: 'pass',
  },
  {
    id: 2,
    label: 'Hallucination Detected',
    description: 'The agent fabricates a policy that doesn\'t exist — Vex catches it.',
    customerMessage: 'Hi, what is your refund policy? I bought something last week.',
    agentOutput:
      'Great news! We have a generous 90-day refund policy with absolutely no questions asked. You can return any product, even if it has been opened and used. Digital products can also be refunded within 60 days. We\'ll process your refund instantly and also cover return shipping costs. As a loyalty bonus, you\'ll receive a 15% credit on your next purchase.',
    groundTruth: GROUND_TRUTH,
    correction: 'none',
    expectedAction: 'block',
  },
  {
    id: 3,
    label: 'Auto-Corrected',
    description: 'Same hallucination — but Vex auto-corrects it before the customer sees it.',
    customerMessage: 'Hi, what is your refund policy? I bought something last week.',
    agentOutput:
      'Great news! We have a generous 90-day refund policy with absolutely no questions asked. You can return any product, even if it has been opened and used. Digital products can also be refunded within 60 days. We\'ll process your refund instantly and also cover return shipping costs. As a loyalty bonus, you\'ll receive a 15% credit on your next purchase.',
    groundTruth: GROUND_TRUTH,
    correction: 'cascade',
    expectedAction: 'pass',
  },
];
