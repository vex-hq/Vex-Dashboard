'use client';

import { useState, useTransition } from 'react';

import { useRouter } from 'next/navigation';

import { useTranslation } from 'react-i18next';

import { Button } from '@kit/ui/button';

import { createJoinKeyAction } from '../../../onboarding/_lib/server-actions';

const MIN_TAP_TARGET_CLASS = 'min-h-11';

/**
 * Invitee landed on a workspace that already has memories, but their
 * agent has never written. Not the empty-org first-agent card.
 */
export function ConnectYourAgent({ accountSlug }: { accountSlug: string }) {
  const { t } = useTranslation('agentguard');
  const [command, setCommand] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const mint = () => {
    setError(null);
    startTransition(async () => {
      try {
        const result = await createJoinKeyAction({ accountSlug });
        setCommand(
          `claude mcp add --transport http klio https://mcp.klio.tech/mcp \\\n` +
            `  --header "X-Klio-Key: ${result.key}" \\\n` +
            `  --header "X-Klio-Agent: claude-code"`,
        );
      } catch (event) {
        setError(
          event instanceof Error
            ? event.message
            : t('onboarding.joinKeyFailed', 'Could not create your key.'),
        );
      }
    });
  };

  const copy = async () => {
    if (!command) return;
    try {
      await navigator.clipboard.writeText(command.replace(/\\\n\s*/g, ' '));
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // selectable either way
    }
  };

  return (
    <section className="border-border flex flex-col gap-4 border-y py-6">
      <h2 className="text-foreground text-[length:var(--text-large)] font-[590]">
        {t('onboarding.joinHubTitle', 'Connect your agent')}
      </h2>
      {!command ? (
        <>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {t(
              'onboarding.joinHubDescription',
              'This workspace already has a shared brain. Connect Claude Code or Cursor so your agent writes into it.',
            )}
          </p>
          <Button
            onClick={mint}
            disabled={pending}
            className={MIN_TAP_TARGET_CLASS}
          >
            {pending
              ? t('onboarding.joinMinting', 'Creating your key…')
              : t('onboarding.joinMint', 'Create my key')}
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
              {t(
                'onboarding.joinKeyOnce',
                'Paste this in your terminal. The key appears only this once.',
              )}
            </p>
            <Button variant="outline" size="sm" onClick={copy}>
              {copied ? t('onboarding.copied') : t('onboarding.copy')}
            </Button>
          </div>
          <pre className="bg-muted overflow-x-auto rounded-lg border p-4 font-mono text-xs leading-relaxed">
            <code>{command}</code>
          </pre>
          <Button
            variant="outline"
            size="sm"
            className={MIN_TAP_TARGET_CLASS}
            onClick={() => router.refresh()}
          >
            {t('onboarding.joinCheck', 'I ran it — refresh')}
          </Button>
        </>
      )}
    </section>
  );
}
