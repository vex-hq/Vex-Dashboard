'use client';

import { useState } from 'react';

import { Check, Copy } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@kit/ui/accordion';
import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@kit/ui/tabs';

import { CodeBlock } from './code-block';

interface StepInstallSdkProps {
  apiKey: string | null;
  onNext: () => void;
  onBack: () => void;
}

export function StepInstallSdk({
  apiKey,
  onNext,
  onBack,
}: StepInstallSdkProps) {
  const { t } = useTranslation('agentguard');
  const [agentCopied, setAgentCopied] = useState(false);
  const [lang, setLang] = useState<'python' | 'typescript'>('python');

  const key = apiKey ?? 'your-api-key';

  const pythonAgentInstructions = `# Vex Integration Instructions (Python)

## Installation
pip install vex-sdk

## Quick Start
from vex import Vex

guard = Vex(api_key="${apiKey ?? 'YOUR_API_KEY'}")

## Pattern 1: Watch Decorator (simplest)
@guard.watch(agent_id="my-agent", task="Describe what the agent does")
def your_agent(query: str) -> str:
    # Your existing agent code — no changes needed
    return llm.generate(query)

## Pattern 2: Trace Context Manager (more control)
with guard.trace(agent_id="my-agent", task="Answer questions") as ctx:
    response = llm.generate(query)
    ctx.set_ground_truth(reference_data)  # Optional: improves accuracy
    ctx.record(response)

result = ctx.result
print(result.action)      # "pass", "flag", or "block"
print(result.confidence)   # 0.0 - 1.0
print(result.output)       # The verified (or corrected) output

## Pattern 3: Run Wrapper
result = guard.run(
    agent_id="my-agent",
    task="Summarize document",
    output=agent_response,
    ground_truth=reference_text,  # Optional
)

## Auto-Correction (Cascade)
from vex import Vex, VexConfig

guard = Vex(
    api_key="${apiKey ?? 'YOUR_API_KEY'}",
    config=VexConfig(
        mode="sync",               # Verify inline before returning
        correction="cascade",      # Auto-fix flagged outputs
        transparency="transparent", # Include correction details in response
    ),
)

# Flagged outputs are automatically corrected through 3 layers:
#   Layer 1: Repair (fast, minor fixes)
#   Layer 2: Constrained Regeneration (re-generate with constraints)
#   Layer 3: Full Re-prompt (complete regeneration)

## Multi-Turn Sessions
session = guard.session(agent_id="my-agent", window_size=5)

with session.turn(task="First question") as ctx:
    ctx.record(llm.generate("What is X?"))

with session.turn(task="Follow-up") as ctx:
    ctx.record(llm.generate("Tell me more about X"))
    # Vex automatically checks for contradictions and drift across turns

## Error Handling
from vex import VexBlockError

try:
    result = guard.run(agent_id="my-agent", task="task", output=response)
except VexBlockError as e:
    # Output was blocked — confidence too low
    print(f"Blocked: {e}")

## Confidence Thresholds (defaults)
# confidence >= 0.7 → pass
# 0.4 <= confidence < 0.7 → flag (warning)
# confidence < 0.4 → block (raises VexBlockError)

## Requirements
# Python 3.9+
# pip install vex-sdk
# Import as: from vex import Vex, VexConfig, VexBlockError
`;

  const typescriptAgentInstructions = `// Vex Integration Instructions (TypeScript)

// Installation
// npm install @vex_dev/sdk

// Quick Start
import { Vex, VexBlockError } from '@vex_dev/sdk';

const vex = new Vex({ apiKey: '${apiKey ?? 'YOUR_API_KEY'}' });

// Async trace (fire-and-forget telemetry)
const result = await vex.trace(
  { agentId: 'my-agent', task: 'Describe what the agent does' },
  (ctx) => {
    ctx.record(agentOutput);
  },
);

// Sync verification (inline scoring)
const vexSync = new Vex({
  apiKey: '${apiKey ?? 'YOUR_API_KEY'}',
  config: { mode: 'sync' },
});

try {
  const result = await vexSync.trace(
    { agentId: 'my-agent', task: 'Answer questions' },
    (ctx) => {
      ctx.setGroundTruth(referenceData);
      ctx.record(response);
    },
  );
  console.log(result.action);      // 'pass' | 'flag' | 'block'
  console.log(result.confidence);   // 0.0 - 1.0
  console.log(result.output);       // The verified (or corrected) output
} catch (err) {
  if (err instanceof VexBlockError) {
    console.log('Blocked:', err.result.confidence);
  }
}

// Auto-Correction (Cascade)
const guard = new Vex({
  apiKey: '${apiKey ?? 'YOUR_API_KEY'}',
  config: {
    mode: 'sync',
    correction: 'cascade',
    transparency: 'transparent',
  },
});

// Flagged outputs are automatically corrected through 3 layers:
//   Layer 1: Repair (fast, minor fixes)
//   Layer 2: Constrained Regeneration (re-generate with constraints)
//   Layer 3: Full Re-prompt (complete regeneration)

// Multi-Turn Sessions
import { Session } from '@vex_dev/sdk';

const session = new Session(vexSync, 'my-agent');

await session.trace({ task: 'First question', input: 'What is X?' }, (ctx) => {
  ctx.record('X is ...');
});

await session.trace({ task: 'Follow-up', input: 'Tell me more' }, (ctx) => {
  ctx.record('More about X ...');
  // Vex automatically checks for contradictions and drift across turns
});

await vexSync.close();

// Requirements
// Node.js 18+ / Deno / Bun
// npm install @vex_dev/sdk
// Import: import { Vex, VexBlockError, Session } from '@vex_dev/sdk'
`;

  const handleCopyAgentInstructions = async () => {
    const instructions =
      lang === 'python' ? pythonAgentInstructions : typescriptAgentInstructions;

    await navigator.clipboard.writeText(instructions);
    setAgentCopied(true);
    setTimeout(() => setAgentCopied(false), 2000);
  };

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h1 className="text-center text-3xl font-bold tracking-tight">
          {t('onboarding.step4Title')}
        </h1>
        <p className="text-muted-foreground mx-auto mt-2 max-w-md text-center">
          {t('onboarding.step4Description')}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="mb-4 flex items-center justify-between">
          <Tabs
            value={lang}
            onValueChange={(v) => setLang(v as 'python' | 'typescript')}
          >
            <TabsList>
              <TabsTrigger value="python">Python</TabsTrigger>
              <TabsTrigger value="typescript">TypeScript</TabsTrigger>
            </TabsList>
          </Tabs>

          <button
            type="button"
            onClick={handleCopyAgentInstructions}
            className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-sm transition-colors"
          >
            {agentCopied ? (
              <>
                <Check className="h-4 w-4 text-green-400" />
                <span className="text-green-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                <span>Copy instructions for AI agent</span>
              </>
            )}
          </button>
        </div>

        <Accordion type="single" collapsible defaultValue="install">
          <AccordionItem value="install" className="border-border/50">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <Badge
                  variant="outline"
                  className="h-6 w-6 shrink-0 items-center justify-center rounded-full p-0 text-xs"
                >
                  1
                </Badge>
                <span className="font-semibold">
                  {t('onboarding.step4InstallTitle')}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pl-9">
              {lang === 'python' ? (
                <>
                  <CodeBlock code="pip install vex-sdk" />
                  <p className="text-muted-foreground mt-2 text-xs">
                    Requires Python 3.9+. Import as{' '}
                    <code className="bg-muted rounded px-1 py-0.5">
                      from vex import ...
                    </code>
                  </p>
                </>
              ) : (
                <>
                  <CodeBlock code="npm install @vex_dev/sdk" />
                  <p className="text-muted-foreground mt-2 text-xs">
                    Requires Node.js 18+. Also works with Deno and Bun. Import
                    as{' '}
                    <code className="bg-muted rounded px-1 py-0.5">
                      {"import { Vex } from '@vex_dev/sdk'"}
                    </code>
                  </p>
                </>
              )}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="init" className="border-border/50">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <Badge
                  variant="outline"
                  className="h-6 w-6 shrink-0 items-center justify-center rounded-full p-0 text-xs"
                >
                  2
                </Badge>
                <span className="font-semibold">
                  {t('onboarding.step4InitTitle')}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pl-9">
              {lang === 'python' ? (
                <>
                  <CodeBlock
                    code={`from vex import Vex

guard = Vex(api_key="${key}")

@guard.watch(agent_id="my-agent", task="Describe the task")
def your_agent(query: str) -> str:
    # Your existing agent code — no changes needed
    ...`}
                  />
                  <p className="text-muted-foreground mt-2 text-xs">
                    Wrap any function with{' '}
                    <code className="bg-muted rounded px-1 py-0.5">
                      @guard.watch
                    </code>{' '}
                    to start monitoring.
                  </p>
                </>
              ) : (
                <>
                  <CodeBlock
                    code={`import { Vex } from '@vex_dev/sdk';

const vex = new Vex({ apiKey: '${key}' });

const result = await vex.trace(
  { agentId: 'my-agent', task: 'Describe the task' },
  (ctx) => {
    const output = yourAgent(query);
    ctx.record(output);
  },
);

await vex.close();`}
                  />
                  <p className="text-muted-foreground mt-2 text-xs">
                    Use{' '}
                    <code className="bg-muted rounded px-1 py-0.5">
                      vex.trace()
                    </code>{' '}
                    with a callback to capture agent output.
                  </p>
                </>
              )}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="correction" className="border-border/50">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <Badge
                  variant="outline"
                  className="h-6 w-6 shrink-0 items-center justify-center rounded-full p-0 text-xs"
                >
                  3
                </Badge>
                <span className="font-semibold">
                  {t('onboarding.step4CorrectionTitle')}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pl-9">
              {lang === 'python' ? (
                <CodeBlock
                  code={`from vex import Vex, VexConfig

guard = Vex(
    api_key="${key}",
    config=VexConfig(
        mode="sync",               # Verify inline before returning
        correction="cascade",      # Auto-fix flagged outputs
        transparency="transparent", # See what was corrected
    ),
)

with guard.trace(agent_id="my-agent", task="Answer questions") as ctx:
    response = llm.generate(query)
    ctx.set_ground_truth(reference_data)  # Optional: improve accuracy
    ctx.record(response)

# If output was flagged, Vex auto-corrects through 3 layers:
#   Layer 1: Repair → Layer 2: Regenerate → Layer 3: Re-prompt
output = ctx.result.output  # Always the best available output`}
                />
              ) : (
                <CodeBlock
                  code={`import { Vex, VexBlockError } from '@vex_dev/sdk';

const vex = new Vex({
  apiKey: '${key}',
  config: {
    mode: 'sync',                // Verify inline before returning
    correction: 'cascade',      // Auto-fix flagged outputs
    transparency: 'transparent', // See what was corrected
  },
});

const result = await vex.trace(
  { agentId: 'my-agent', task: 'Answer questions' },
  (ctx) => {
    ctx.setGroundTruth(referenceData);
    ctx.record(response);
  },
);

// If output was flagged, Vex auto-corrects through 3 layers:
//   Layer 1: Repair → Layer 2: Regenerate → Layer 3: Re-prompt
console.log(result.output);     // Always the best available output
console.log(result.corrected);  // true if correction was applied

await vex.close();`}
                />
              )}
              <p className="text-muted-foreground mt-2 text-xs">
                Flagged outputs are automatically corrected through 3 graduated
                layers before reaching your users.
              </p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </motion.div>

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
