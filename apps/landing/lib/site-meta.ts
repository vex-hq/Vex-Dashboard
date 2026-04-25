/**
 * Single source of truth for landing-site identity, positioning, and FAQ.
 *
 * Consumed by:
 * - `lib/schemas.ts` (JSON-LD generators for Organization + FAQPage)
 * - `app/layout.tsx` (root JSON-LD)
 * - `app/_components/faq-accordion.tsx` (FAQ UI)
 * - `/llms.txt` route (positioning sentence)
 *
 * Positioning facts locked during brainstorm: Vex is no longer marketed as
 * open source. Do not introduce the strings "open source", "Apache 2.0",
 * "AGPLv3", or "MIT" anywhere in this module.
 *
 * Data shape is intentionally `readonly` end-to-end so consumers cannot
 * mutate the catalog at runtime. Use `[...FAQ]` if a mutable copy is
 * required for sorting/filtering.
 */

export const POSITIONING_SENTENCE =
  'Vex helps founders shipping AI agents prevent hallucinations, drift, and policy violations from reaching customers through continuous runtime verification with 3-layer auto-correction.' as const;

export interface Organization {
  readonly name: string;
  readonly url: string;
  readonly logo: string;
  readonly contactEmail: string;
}

export const ORG = {
  name: 'Vex',
  url: 'https://tryvex.dev',
  logo: 'https://tryvex.dev/images/og-image.png',
  contactEmail: 'hello@tryvex.dev',
} as const satisfies Organization;

export const SAME_AS = [
  'https://github.com/Vex-AI-Dev',
  'https://x.com/tryvex',
  // Placeholders — uncomment after listings exist:
  // 'https://www.g2.com/products/vex',
  // 'https://www.producthunt.com/products/vex',
  // 'https://www.linkedin.com/company/tryvex',
] as const satisfies ReadonlyArray<string>;

export interface FaqEntry {
  readonly question: string;
  readonly answer: string;
}

export const FAQ = [
  {
    question: 'What is Vex?',
    answer:
      "Vex is a runtime reliability layer for AI agents. It detects when your agent's behavior silently changes in production — hallucinations, drift, schema violations — and auto-corrects before your users notice.",
  },
  {
    question: 'How is Vex different from evals or tracing?',
    answer:
      "Evals test your agent before deployment. Tracing shows you what happened after something breaks. Vex runs continuously in production, catching behavioral drift in real-time and auto-correcting on the fly. They're complementary — Vex fills the gap between pre-deploy testing and post-mortem analysis.",
  },
  {
    question: 'How long does it take to set up?',
    answer:
      'About 5 minutes. Install the SDK (pip install vex-sdk or npm install @vex_dev/sdk), add 3 lines of code to wrap your agent function, and deploy. Vex starts learning from the first request.',
  },
  {
    question: 'What frameworks does Vex support?',
    answer:
      'Vex works with LangChain, CrewAI, OpenAI Assistants, and any custom Python or TypeScript agent. If your code calls an LLM, Vex can watch it.',
  },
  {
    question: 'Does Vex add latency?',
    answer:
      'In async mode (default), Vex adds zero latency — verification happens in the background. In sync mode, Vex adds a verification step before returning the output, which typically takes 200-500ms depending on the checks enabled.',
  },
] as const satisfies ReadonlyArray<FaqEntry>;
