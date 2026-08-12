'use client';

import { useState, useTransition } from 'react';

import { useRouter } from 'next/navigation';

import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';

import { createApiKeyAction } from '../settings/api-keys/_lib/server/api-keys-actions';

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
  const router = useRouter();

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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Connect your first agent</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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
                <b>only this once</b> — it is stored hashed, so copy the command
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
              <li>Refresh here — the first memory flips this card.</li>
            </ol>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.refresh()}
            >
              I ran it — check for my first memory
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
