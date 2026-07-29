# Onboarding Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild onboarding as a five-screen activation flow that drives a user to their first stored memory, without ever blocking their exit.

**Architecture:** Client wizard (`onboarding-wizard.tsx`) renders steps 0–4 and persists progress via existing server actions. Two screens are deleted, one is absorbed, one is new, and the never-imported progress indicator is finally wired. All copy moves to `public/locales/en/agentguard.json`.

**Tech Stack:** Next.js App Router, React client components, `motion/react`, `react-i18next`, Tailwind + `@kit/ui`, Vitest.

**Spec:** `docs/superpowers/specs/2026-07-29-onboarding-rebuild-design.md`

---

## Ground rules for every task

1. **Never re-introduce a gate.** Every screen keeps a working skip/continue. `step-verify-connection.tsx`'s finish button stays enabled regardless of connection state.
2. **No invented product claims.** Do not mention Notion, Jira, or any pull-based ingestion. There are no such connectors.
3. Run `npx tsc --noEmit -p tsconfig.json` from `apps/web` after each task; it must be clean.
4. Work only inside `apps/web`. Do not touch `apps/landing`.

---

## File structure

| Path | Action |
| --- | --- |
| `lib/agentguard/onboarding.constants.ts` | Modify — 6 → 5 steps |
| `lib/agentguard/mcp.constants.ts` | Modify — correct stale ChatGPT comment |
| `public/locales/en/agentguard.json` | Modify — new keys, delete orphans |
| `app/onboarding/_components/step-welcome.tsx` | Modify — copy to locale |
| `app/onboarding/_components/step-run-local.tsx` | **Create** — key card + command |
| `app/onboarding/_components/step-connect-cloud.tsx` | **Create** — OAuth-first |
| `app/onboarding/_components/step-verify-connection.tsx` | Modify — instruction copy |
| `app/onboarding/_components/step-done.tsx` | **Create** — congratulation |
| `app/onboarding/_components/onboarding-wizard.tsx` | Modify — new step map + progress |
| `app/onboarding/_components/step-api-key.tsx` | **Delete** — absorbed |
| `app/onboarding/_components/step-connect-agents.tsx` | **Delete** — replaced |
| `app/onboarding/_components/step-install-sdk.tsx` | **Delete** — wrong product |
| `app/onboarding/_components/step-invite-team.tsx` | **Delete** — duplicates /members |
| `app/onboarding/_lib/server-actions.ts` | Modify — remove `sendInvitesAction` (conditional) |
| `app/onboarding/_lib/server-actions.test.ts` | Modify — drop its tests (conditional) |

---

## Task 1: Foundation — constants and copy

**Files:**
- Modify: `apps/web/lib/agentguard/onboarding.constants.ts`
- Modify: `apps/web/lib/agentguard/mcp.constants.ts`
- Modify: `apps/web/public/locales/en/agentguard.json`

- [ ] **Step 1: Reduce the step count**

In `onboarding.constants.ts`, change the value and rewrite the doc comment's step list:

```ts
export const TOTAL_ONBOARDING_STEPS = 5;
```

The comment currently enumerates `0 Welcome · 1 InviteTeam · 2 ApiKey · 3 ConnectAgents · 4 InstallSdk · 5 VerifyConnection`. Replace with:

```
 *   0 Welcome · 1 RunLocal · 2 ConnectCloud · 3 VerifyConnection · 4 Done
```

- [ ] **Step 2: Correct the stale ChatGPT comment**

In `mcp.constants.ts` the comment says consumer ChatGPT "cannot add an arbitrary remote MCP server with a custom auth header, so they are NOT part of this path." That describes the header path only and now reads as a blanket exclusion. OAuth discovery is live (`/.well-known/oauth-protected-resource` returns 200). Rewrite that passage to say: header-based auth is unavailable in the consumer ChatGPT and Gemini apps, but they can reach the same URL through the OAuth custom-connector flow, as Claude.ai does. Keep surrounding constants untouched.

- [ ] **Step 3: Replace the onboarding copy block**

In `public/locales/en/agentguard.json`, replace the entire `onboarding` object with exactly this, preserving 2-space indentation and key order:

```json
  "onboarding": {
    "pageTitle": "Get Started with Klio",

    "welcomeTitle": "Welcome to Klio",
    "welcomeDescription": "One shared memory for every AI agent your team uses. What one learns, the others know — so nobody re-explains the same decision to a second tool.",
    "getStarted": "Get started",

    "localTitle": "Start on your machine",
    "localDescription": "One command wires every AI coding agent on this machine to your shared memory.",
    "localKeyLabel": "Your API key",
    "localKeyWarning": "Shown once. Paste it when the command asks for it.",
    "localKeyRetry": "Retry",
    "localKeyFailed": "Couldn't create a key.",
    "localCommandLabel": "Run this in your terminal",
    "localNote": "Detects and wires Claude Code, Claude Desktop, Cursor, Codex, OpenCode and OpenClaw — no config files to edit.",

    "cloudTitle": "Connect the agents that aren't on your machine",
    "cloudDescription": "Anything that speaks MCP can join the same memory. Sign in and approve — no key to paste.",
    "cloudOauthLabel": "Add as a connector",
    "cloudOauthUrlLabel": "Connector URL",
    "cloudOauthSteps": "In ChatGPT, Claude.ai, or any MCP client: add a custom connector, paste the URL above, then approve access.",
    "cloudManualLabel": "Client doesn't support sign-in?",
    "cloudManualDescription": "Authenticate with your API key instead.",
    "cloudEndpointLabel": "MCP endpoint",
    "cloudHeaderLabel": "Auth header",
    "cloudConfigLabel": "Or paste into your MCP client config",
    "cloudKeyMissing": "Get your key from API Keys settings",
    "cloudGuide": "Full setup guide",

    "verifyTitle": "Try it now",
    "verifyDescription": "Open Claude Code, Cursor, or any agent you just connected, and ask it something about your work. We're watching for the first memory to arrive.",
    "verifyWaiting": "Waiting for your first memory…",
    "verifyArrived": "First memory stored",
    "verifyAgentDetected": "From: {{agentId}}",
    "verifySkip": "Skip for now — go to dashboard",
    "verifySkipHint": "You can connect agents anytime from the dashboard.",

    "doneTitle": "You're set",
    "doneDescription": "Everything your agents learn from here is shared. Any agent you connect can read it.",
    "doneCta": "Go to dashboard",

    "next": "Continue",
    "back": "Back",
    "skip": "Skip for now",
    "copy": "Copy",
    "copied": "Copied!",
    "stepOf": "Step {{current}} of {{total}}"
  },
```

- [ ] **Step 4: Verify JSON and types**

Run from `apps/web`:

```bash
python3 -c "import json; json.load(open('public/locales/en/agentguard.json')); print('valid json')"
npx tsc --noEmit -p tsconfig.json
```

Expected: `valid json`, and tsc produces no output. Existing components still reference deleted keys at this point — that is fine, they are typed as plain strings and will be replaced in later tasks.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/agentguard/onboarding.constants.ts apps/web/lib/agentguard/mcp.constants.ts apps/web/public/locales/en/agentguard.json
git commit -m "refactor(onboarding): five-step constants and activation copy"
```

---

## Task 2: Screens 0 and 1 — welcome and run-local

**Files:**
- Modify: `apps/web/app/onboarding/_components/step-welcome.tsx`
- Create: `apps/web/app/onboarding/_components/step-run-local.tsx`

- [ ] **Step 1: Move welcome copy into the locale file**

In `step-welcome.tsx`, the `<p>` currently contains hardcoded JSX describing "Observe, detect, and auto-correct hallucinations and drift…" — the reliability product. Replace that whole paragraph element with:

```tsx
        <p className="text-muted-foreground mx-auto mt-3 max-w-md text-center text-base leading-relaxed">
          {t('onboarding.welcomeDescription')}
        </p>
```

Leave the `KlioMark` animation, heading, and CTA untouched. The CTA already uses `t('onboarding.getStarted')`.

- [ ] **Step 2: Create the run-local screen**

Create `step-run-local.tsx`. It merges the old `step-api-key.tsx` (key minting, copy, retry) with the local-command card from `step-connect-agents.tsx`. Key behaviour that must be preserved from the shipped fix: **Continue is disabled only while minting, never because minting failed.**

```tsx
'use client';

import { useCallback, useEffect, useState } from 'react';

import { Check, Copy, Key, Terminal } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';

import { Button } from '@kit/ui/button';

import { KLIO_INIT_COMMAND } from '~/lib/agentguard/mcp.constants';

import { createOnboardingKeyAction } from '../_lib/server-actions';

interface StepRunLocalProps {
  accountSlug: string;
  onNext: () => void;
  onBack: () => void;
  onKeyCreated: (key: string) => void;
}

export function StepRunLocal({
  accountSlug,
  onNext,
  onBack,
  onKeyCreated,
}: StepRunLocalProps) {
  const { t } = useTranslation('agentguard');
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);

  const generateKey = useCallback(async () => {
    setLoading(true);

    try {
      const result = await createOnboardingKeyAction({ accountSlug });

      if (result.key) {
        setApiKey(result.key);
        onKeyCreated(result.key);
      }
    } catch {
      // Surfaced as the retry state below; never blocks Continue.
    } finally {
      setLoading(false);
    }
  }, [accountSlug, onKeyCreated]);

  useEffect(() => {
    generateKey();
  }, [generateKey]);

  const copy = async (value: string, mark: (v: boolean) => void) => {
    await navigator.clipboard.writeText(value);
    mark(true);
    setTimeout(() => mark(false), 2000);
  };

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h1 className="text-center text-3xl font-bold tracking-tight">
          {t('onboarding.localTitle')}
        </h1>
        <p className="text-muted-foreground mx-auto mt-2 max-w-md text-center">
          {t('onboarding.localDescription')}
        </p>
      </motion.div>

      {/* Key — the CLI's cloud mode prompts for this, so it sits beside the
          command rather than on a screen of its own. */}
      <motion.div
        className="border-border/50 bg-card/50 space-y-4 rounded-xl border p-6 md:p-8"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center gap-2">
          <Key className="text-muted-foreground h-4 w-4 shrink-0" />
          <h2 className="text-sm font-semibold">
            {t('onboarding.localKeyLabel')}
          </h2>
        </div>

        {loading ? (
          <div className="bg-muted/50 flex h-14 items-center justify-center rounded-lg border">
            <motion.div
              className="border-primary h-5 w-5 rounded-full border-2 border-t-transparent"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
          </div>
        ) : apiKey ? (
          <div className="bg-muted/50 flex items-center gap-3 rounded-lg border p-4">
            <code className="flex-1 truncate font-mono text-sm">{apiKey}</code>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => copy(apiKey, setCopiedKey)}
              className="shrink-0"
              aria-label={t('onboarding.copy')}
            >
              {copiedKey ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        ) : (
          <div className="bg-destructive/10 text-destructive flex h-14 items-center justify-between gap-3 rounded-lg border px-4">
            <span>{t('onboarding.localKeyFailed')}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={generateKey}
              className="shrink-0"
            >
              {t('onboarding.localKeyRetry')}
            </Button>
          </div>
        )}

        <p className="text-muted-foreground text-sm">
          {t('onboarding.localKeyWarning')}
        </p>
      </motion.div>

      {/* The one command */}
      <motion.div
        className="border-border/50 bg-card/50 space-y-4 rounded-xl border p-6 md:p-8"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center gap-2">
          <Terminal className="text-muted-foreground h-4 w-4 shrink-0" />
          <h2 className="text-sm font-semibold">
            {t('onboarding.localCommandLabel')}
          </h2>
        </div>

        <div className="bg-muted/50 flex items-center gap-3 rounded-lg border p-4">
          <code className="flex-1 truncate font-mono text-sm">
            {KLIO_INIT_COMMAND}
          </code>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => copy(KLIO_INIT_COMMAND, setCopiedCmd)}
            className="shrink-0"
            aria-label={t('onboarding.copy')}
          >
            {copiedCmd ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>

        <p className="text-muted-foreground text-sm">
          {t('onboarding.localNote')}
        </p>
      </motion.div>

      <motion.div
        className="flex flex-col items-center gap-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        {/* Disabled only while minting — a failed key must never trap anyone. */}
        <Button
          onClick={onNext}
          disabled={loading}
          className="rounded-lg px-8"
          size="lg"
        >
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
```

- [ ] **Step 3: Typecheck**

```bash
cd apps/web && npx tsc --noEmit -p tsconfig.json
```

Expected: no output. (The wizard still imports the old steps; that is fixed in Task 4.)

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/onboarding/_components/step-welcome.tsx apps/web/app/onboarding/_components/step-run-local.tsx
git commit -m "feat(onboarding): Klio welcome copy and a single run-local screen"
```

---

## Task 3: Screens 2, 3 and 4 — cloud, verify, done

**Files:**
- Create: `apps/web/app/onboarding/_components/step-connect-cloud.tsx`
- Modify: `apps/web/app/onboarding/_components/step-verify-connection.tsx`
- Create: `apps/web/app/onboarding/_components/step-done.tsx`

- [ ] **Step 1: Create the cloud-connect screen**

Leads with OAuth (no key to paste), with the API-key header path demoted to secondary. Reuses the existing `CodeBlock` component.

```tsx
'use client';

import Link from 'next/link';

import { ArrowRight, KeyRound, Plug } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';

import { Button } from '@kit/ui/button';

import {
  KLIO_DOCS_MCP_ANCHOR,
  KLIO_MCP_KEY_HEADER,
  KLIO_MCP_KEY_PLACEHOLDER,
  KLIO_MCP_URL,
  buildKlioMcpConfig,
} from '~/lib/agentguard/mcp.constants';

import { CodeBlock } from './code-block';

interface StepConnectCloudProps {
  accountSlug: string;
  apiKey: string | null;
  onNext: () => void;
  onBack: () => void;
}

export function StepConnectCloud({
  accountSlug,
  apiKey,
  onNext,
  onBack,
}: StepConnectCloudProps) {
  const { t } = useTranslation('agentguard');
  const keyValue = apiKey ?? KLIO_MCP_KEY_PLACEHOLDER;

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h1 className="text-center text-3xl font-bold tracking-tight">
          {t('onboarding.cloudTitle')}
        </h1>
        <p className="text-muted-foreground mx-auto mt-2 max-w-md text-center">
          {t('onboarding.cloudDescription')}
        </p>
      </motion.div>

      {/* OAuth first: the endpoint advertises
          /.well-known/oauth-protected-resource, so any MCP client implementing
          the authorization spec joins with no key at all. */}
      <motion.div
        className="border-border/50 bg-card/50 space-y-4 rounded-xl border p-6 md:p-8"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center gap-2">
          <Plug className="text-muted-foreground h-4 w-4 shrink-0" />
          <h2 className="text-sm font-semibold">
            {t('onboarding.cloudOauthLabel')}
          </h2>
        </div>

        <div className="space-y-1.5">
          <p className="text-muted-foreground text-xs font-medium">
            {t('onboarding.cloudOauthUrlLabel')}
          </p>
          <CodeBlock code={KLIO_MCP_URL} ariaLabel="Copy connector URL" />
        </div>

        <p className="text-muted-foreground text-sm">
          {t('onboarding.cloudOauthSteps')}
        </p>
      </motion.div>

      {/* Secondary: clients without the OAuth flow */}
      <motion.div
        className="border-border/50 bg-card/50 space-y-4 rounded-xl border p-6 md:p-8"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center gap-2">
          <KeyRound className="text-muted-foreground h-4 w-4 shrink-0" />
          <h2 className="text-sm font-semibold">
            {t('onboarding.cloudManualLabel')}
          </h2>
        </div>

        <p className="text-muted-foreground text-sm">
          {t('onboarding.cloudManualDescription')}
        </p>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <p className="text-muted-foreground text-xs font-medium">
              {t('onboarding.cloudEndpointLabel')}
            </p>
            <CodeBlock code={KLIO_MCP_URL} ariaLabel="Copy MCP endpoint" />
          </div>

          <div className="space-y-1.5">
            <p className="text-muted-foreground text-xs font-medium">
              {t('onboarding.cloudHeaderLabel')}
            </p>
            <CodeBlock
              code={`${KLIO_MCP_KEY_HEADER}: ${keyValue}`}
              ariaLabel="Copy auth header"
            />
          </div>

          <div className="space-y-1.5">
            <p className="text-muted-foreground text-xs font-medium">
              {t('onboarding.cloudConfigLabel')}
            </p>
            <CodeBlock
              code={buildKlioMcpConfig(apiKey)}
              ariaLabel="Copy MCP client config"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {!apiKey ? (
            <Link
              href={`/home/${accountSlug}/settings/api-keys`}
              className="text-primary inline-flex items-center gap-1 text-sm hover:underline"
            >
              {t('onboarding.cloudKeyMissing')}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ) : null}

          <Link
            href={`/home/${accountSlug}/docs#${KLIO_DOCS_MCP_ANCHOR}`}
            className="text-primary inline-flex items-center gap-1 text-sm hover:underline"
          >
            {t('onboarding.cloudGuide')}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </motion.div>

      <motion.div
        className="flex flex-col items-center gap-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
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
```

- [ ] **Step 2: Rework the verify screen**

Edit `step-verify-connection.tsx`:

1. Change the props interface to add `onNext`:

```tsx
interface StepVerifyConnectionProps {
  accountSlug: string;
  onNext: () => void;
  onBack: () => void;
}
```

and destructure `onNext` alongside the others.

2. Replace every locale key: `step5Title` → `verifyTitle`, `step5Description` → `verifyDescription`, `step5Waiting` → `verifyWaiting`, `step5Connected` → `verifyArrived`, `step5AgentDetected` → `verifyAgentDetected`, `step5SkipFinish` → `verifySkip`, `step5SkipHint` → `verifySkipHint`.

3. When a connection is detected, hold ~2s so the user sees *what* arrived, then advance to the done screen. Add inside the existing `poll` success branch, after `setAgentId(...)` and clearing the interval:

```tsx
            // Hold briefly so the arriving memory is visible — the proof is the
            // point of this screen — then move to the closing screen.
            setTimeout(onNext, 2000);
```

`onNext` must be in the `useEffect` dependency array alongside `accountSlug`.

4. The finish button keeps `disabled={completing}` (never `!connected`) and keeps `handleFinish`. Its label becomes `t('onboarding.verifySkip')` when not connected, and it can keep `t('onboarding.doneCta')` when connected.

**Do not remove `handleFinish` or `completeOnboardingAction`** — a user who skips must still complete onboarding server-side.

- [ ] **Step 3: Create the done screen**

```tsx
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
```

- [ ] **Step 4: Typecheck and commit**

```bash
cd apps/web && npx tsc --noEmit -p tsconfig.json
git add apps/web/app/onboarding/_components/
git commit -m "feat(onboarding): OAuth-first cloud connect, activation prompt, done screen"
```

---

## Task 4: Wire the wizard, wire progress, delete the rest

**Files:**
- Modify: `apps/web/app/onboarding/_components/onboarding-wizard.tsx`
- Delete: `step-api-key.tsx`, `step-connect-agents.tsx`, `step-install-sdk.tsx`, `step-invite-team.tsx`
- Conditionally modify: `app/onboarding/_lib/server-actions.ts`, `server-actions.test.ts`

- [ ] **Step 1: Rewrite the wizard's step map**

In `onboarding-wizard.tsx`, replace the imports of the four deleted steps with `StepRunLocal`, `StepConnectCloud`, `StepDone`, and add `ProgressIndicator` from `./progress-indicator`. Replace `renderStep` with:

```tsx
  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <StepWelcome key="step-0" onNext={goNext} />;
      case 1:
        return (
          <StepRunLocal
            key="step-1"
            accountSlug={accountSlug}
            onNext={goNext}
            onBack={goBack}
            onKeyCreated={setApiKey}
          />
        );
      case 2:
        return (
          <StepConnectCloud
            key="step-2"
            accountSlug={accountSlug}
            apiKey={apiKey}
            onNext={goNext}
            onBack={goBack}
          />
        );
      case 3:
        return (
          <StepVerifyConnection
            key="step-3"
            accountSlug={accountSlug}
            onNext={goNext}
            onBack={goBack}
          />
        );
      case 4:
        return <StepDone key="step-4" accountSlug={accountSlug} />;
      default:
        return null;
    }
  };
```

- [ ] **Step 2: Render the progress indicator**

It has existed unused since the flow was built. Inside the outer `div`, after the `AnimatePresence` block's closing `</div>`, add:

```tsx
        <ProgressIndicator
          currentStep={currentStep}
          totalSteps={TOTAL_STEPS}
        />
```

Keep the existing clamp on `initialStep` exactly as it is — it is what lets a user with a stale persisted step of 5 land safely on the final screen.

- [ ] **Step 3: Delete the replaced screens**

```bash
cd apps/web/app/onboarding/_components
git rm step-api-key.tsx step-connect-agents.tsx step-install-sdk.tsx step-invite-team.tsx
```

- [ ] **Step 4: Decide on `sendInvitesAction` — verify before deleting**

Its only non-test caller was `step-invite-team.tsx`, now gone. It carries four authorisation tests from the tenancy campaign, so removing it removes that coverage. Check whether `/members` has its own guarded invite path:

```bash
cd apps/web
grep -rn "InviteMembersDialogContainer" app/home/\[account\]/members/page.tsx
```

- If `/members` uses Makerkit's own invite container (it does at time of writing), delete `sendInvitesAction` from `_lib/server-actions.ts` and remove its `describe` block from `server-actions.test.ts`, leaving all other tests intact.
- If that is not true, **keep the action and its tests** and note it in the commit message.

- [ ] **Step 5: Full verification**

```bash
cd apps/web
npx tsc --noEmit -p tsconfig.json
npx vitest run
grep -rn "step1Title\|step2Title\|step3Title\|step4Title\|step5Title\|InstallSdk\|InviteTeam\|StepApiKey\|ConnectAgents" app/onboarding lib/agentguard || echo "no stale references"
```

Expected: tsc silent; vitest all pass (baseline was 140 before removing invite tests — a lower total is expected and correct if those were removed); the grep prints `no stale references`.

- [ ] **Step 6: Commit**

```bash
git add -A apps/web
git commit -m "feat(onboarding): five-screen activation flow, progress wired, dead screens removed"
```

---

## Self-review notes

- **Spec coverage:** all five screens specified, deletions enumerated, escape hatch preserved in Tasks 2–3, progress indicator wired in Task 4, stale ChatGPT comment corrected in Task 1, Notion/Jira excluded throughout.
- **Type consistency:** `StepRunLocal` takes `onKeyCreated`; the wizard's `apiKey` state and `setApiKey` are unchanged, so `StepConnectCloud` receives the same `string | null` the old screen did. `StepVerifyConnection` gains `onNext`, supplied by the wizard.
- **Known risk:** users mid-flow with a persisted step of 5. The existing clamp maps them to step 4 (`StepDone`), which can still complete onboarding. Called out in Task 4 Step 2.
