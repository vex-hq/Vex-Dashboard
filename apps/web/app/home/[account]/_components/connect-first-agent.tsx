'use client';

import { useState, useTransition } from 'react';

import { useRouter } from 'next/navigation';

import { useTranslation } from 'react-i18next';

import { Button } from '@kit/ui/button';
import { Trans } from '@kit/ui/trans';
import { cn } from '@kit/ui/utils';

import { createApiKeyAction } from '../settings/api-keys/_lib/server/api-keys-actions';

/**
 * Minimum interactive tap target (44px) — matches context-stream.tsx's
 * MIN_TAP_TARGET_CLASS convention: nothing here is hover-only or smaller
 * than a thumb.
 */
const MIN_TAP_TARGET_CLASS = 'min-h-11';

/**
 * First-run: connect an agent without leaving this screen.
 *
 * The funnel this replaces lost people at every hop: sign up → find
 * Settings → API keys → create a key → read the "shown once" warning →
 * assemble a command from the docs → paste. Every hop is a place to give
 * up, and the key being shown once meant a wrong copy sent people around
 * the loop again.
 *
 * Here the whole handoff is one screen: one button mints a `memory`-scope
 * key and renders the COMPLETE connect command with the key already in
 * place. Shown when the org has no memories yet, because that is the
 * definition of "not connected" that matters — a key with no memories is a
 * setup that did not finish.
 *
 * The key is still shown exactly once (it is hashed at rest; we could not
 * re-display it if we wanted to). The difference is that the once happens
 * at the moment of use, inside the command, instead of in a table the
 * user has already navigated away from.
 */
export function ConnectFirstAgent({ accountSlug }: { accountSlug: string }) {
  const [command, setCommand] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();
  const [checking, startCheckTransition] = useTransition();
  const [hasChecked, setHasChecked] = useState(false);
  // Previous-render snapshot of `checking`, compared during render (not in
  // an effect) to catch the falling edge — see React's "adjusting state
  // when a prop changes" pattern. Guarded by the `!==` check so it settles
  // in one extra render instead of looping.
  const [previousChecking, setPreviousChecking] = useState(checking);
  const router = useRouter();
  const { t } = useTranslation('agentguard');

  const mint = () => {
    setError(null);
    startTransition(async () => {
      try {
        const result = await createApiKeyAction({
          accountSlug,
          name: 'first-agent',
          scopes: ['memory'],
          // Matches the Free tier's ceiling so the key never outruns the plan.
          rateLimitRpm: 100,
          // Never-expiring, like the dialog's default: a first key that dies
          // quietly would look like the product breaking.
          expiresAt: null,
        });
        setCommand(
          `claude mcp add --transport http klio https://mcp.klio.tech/mcp \\\n` +
            `  --header "X-Klio-Key: ${result.key}" \\\n` +
            `  --header "X-Klio-Agent: claude-code"`,
        );
      } catch (event) {
        setError(
          event instanceof Error
            ? event.message
            : 'Could not create the key. Try again, or use Settings → API keys.',
        );
      }
    });
  };

  const copy = async () => {
    if (!command) return;
    try {
      await navigator.clipboard.writeText(command.replace(/\\\n\s*/g, ''));
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Clipboard denied — the command is selectable either way.
    }
  };

  /**
   * Same shape as `mint` above: an async callback inside `startTransition`.
   * `router.refresh()` returns void, not a promise, but `await`-ing it still
   * keeps `checking` true for as long as the refreshed server payload is
   * being fetched and applied, not just until this call returns
   * synchronously.
   */
  const checkForMemory = () => {
    startCheckTransition(async () => {
      await router.refresh();
    });
  };

  /**
   * `checking` flips back to `false` once the transition above has fully
   * committed. That falling edge — not the click itself — is "the check
   * finished." If this component is still mounted after that, the parent
   * server component looked and found no memory yet: unmounting the whole
   * card is how it reports success, so still being here means "not yet."
   */
  if (checking !== previousChecking) {
    setPreviousChecking(checking);

    if (previousChecking && !checking) {
      setHasChecked(true);
    }
  }

  const reloadPage = () => {
    // router.refresh() only refetches the server payload for THIS tab. A
    // tab left open across a deploy can keep rendering an older build, so
    // for anyone who thinks the card is stuck, a hard reload of the whole
    // page is the reliable last resort.
    window.location.reload();
  };

  return (
    <section className="border-border flex flex-col gap-4 border-y py-6">
      <h2 className="text-foreground text-[length:var(--text-large)] font-[590]">
        Connect your first agent
      </h2>
      {!command ? (
          <>
            <p className="text-muted-foreground text-sm leading-relaxed">
              One command connects Claude Code, Cursor, Codex or any MCP client
              to this workspace. The button creates an API key and fills it into
              the command for you.
            </p>
            <Button onClick={mint} disabled={pending}>
              {pending ? 'Creating your key…' : 'Create key & show my command'}
            </Button>
            {error ? (
              <p className="text-destructive text-sm" role="alert">
                {error}
              </p>
            ) : null}
          </>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3">
              <p className="text-muted-foreground text-sm">
                Paste this in your terminal. The key appears{' '}
                <b>only this once</b>. It is stored hashed, so copy the command
                before leaving this page.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={copy}
                aria-live="polite"
              >
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
            <pre className="bg-muted overflow-x-auto rounded-lg border p-4 font-mono text-xs leading-relaxed">
              <code>{command}</code>
            </pre>
            <ol className="text-muted-foreground list-decimal space-y-1 pl-5 text-sm">
              <li>Run the command, then restart your agent.</li>
              <li>
                Ask it something like{' '}
                <span className="font-mono">
                  &ldquo;remember that we deploy on Tuesdays&rdquo;
                </span>
                .
              </li>
              <li>Refresh here. The first memory dismisses this panel.</li>
            </ol>
            <Button
              variant="outline"
              size="sm"
              className={cn(MIN_TAP_TARGET_CLASS)}
              onClick={checkForMemory}
              disabled={checking}
            >
              {checking
                ? t('connectFirstAgent.checking', 'Checking…')
                : t(
                    'connectFirstAgent.checkButton',
                    'I ran it — check for my first memory',
                  )}
            </Button>
            {hasChecked && !checking ? (
              <div
                className="border-input bg-muted/40 flex flex-col gap-2 rounded-lg border p-3"
                role="status"
                aria-live="polite"
              >
                <p className="text-foreground text-sm font-medium">
                  <Trans i18nKey="agentguard:connectFirstAgent.notCapturedTitle">
                    No memory captured yet.
                  </Trans>
                </p>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  <Trans i18nKey="agentguard:connectFirstAgent.notCapturedHint">
                    Two things worth checking: that the command ran in your
                    terminal without an error, and that you restarted your agent
                    afterward.
                  </Trans>
                </p>
                <button
                  type="button"
                  onClick={reloadPage}
                  className={cn(
                    'text-primary flex w-fit items-center text-left text-xs hover:underline',
                    MIN_TAP_TARGET_CLASS,
                  )}
                >
                  <Trans i18nKey="agentguard:connectFirstAgent.reload">
                    Reload the page
                  </Trans>
                </button>
              </div>
            ) : null}
          </>
        )}
    </section>
  );
}
