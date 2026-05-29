'use client';

import { useState, useTransition } from 'react';

import { isRedirectError } from 'next/dist/client/components/redirect-error';

import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';

import { Alert, AlertDescription } from '@kit/ui/alert';
import { Button } from '@kit/ui/button';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import { Trans } from '@kit/ui/trans';

import { KlioMark } from '~/components/klio-mark';

import { createWorkspaceAction } from '../_lib/server-actions';

export function CreateWorkspaceForm() {
  const { t } = useTranslation('agentguard');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmed = name.trim();

    if (!trimmed) return;

    setError(undefined);

    startTransition(async () => {
      try {
        const result = await createWorkspaceAction({ name: trimmed });

        if (result?.error) {
          setError(result.message ?? t('addWorkspace.errorGeneric'));
        }
      } catch (e) {
        if (!isRedirectError(e)) {
          setError(t('addWorkspace.errorGeneric'));
        }
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Klio logo */}
      <motion.div
        className="flex justify-center"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <KlioMark size={120} className="text-foreground" />
      </motion.div>

      {/* Heading + description */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h1 className="text-center text-3xl font-bold tracking-tight">
          {t('addWorkspace.title')}
        </h1>
        <p className="text-muted-foreground mx-auto mt-2 max-w-md text-center">
          {t('addWorkspace.description')}
        </p>
      </motion.div>

      {/* Error alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>
            <Trans i18nKey={error} defaults={error} />
          </AlertDescription>
        </Alert>
      )}

      {/* Card with input */}
      <motion.div
        className="border-border/50 bg-card/50 rounded-xl border p-6 md:p-8"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Label htmlFor="workspace-name" className="sr-only">
          {t('addWorkspace.title')}
        </Label>
        <Input
          id="workspace-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('addWorkspace.placeholder')}
          minLength={2}
          maxLength={50}
          autoFocus
          className="h-12 text-lg"
        />
      </motion.div>

      {/* CTA button */}
      <motion.div
        className="flex justify-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Button
          type="submit"
          disabled={!name.trim() || pending}
          className="rounded-lg px-8"
          size="lg"
        >
          {pending ? t('addWorkspace.creating') : t('addWorkspace.continue')}
        </Button>
      </motion.div>
    </form>
  );
}
