'use client';

import { useState, useTransition } from 'react';

import { useRouter } from 'next/navigation';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { Checkbox } from '@kit/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@kit/ui/dialog';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import { Trans } from '@kit/ui/trans';

import { createApiKeyAction } from '../_lib/server/api-keys-actions';

const SCOPES = [
  {
    value: 'ingest',
    labelKey: 'agentguard:apiKeys.scopeIngest',
    descKey: 'agentguard:apiKeys.scopeIngestDescription',
  },
  {
    value: 'verify',
    labelKey: 'agentguard:apiKeys.scopeVerify',
    descKey: 'agentguard:apiKeys.scopeVerifyDescription',
  },
  {
    value: 'read',
    labelKey: 'agentguard:apiKeys.scopeRead',
    descKey: 'agentguard:apiKeys.scopeReadDescription',
  },
  {
    value: 'memory',
    labelKey: 'agentguard:apiKeys.scopeMemory',
    descKey: 'agentguard:apiKeys.scopeMemoryDescription',
  },
] as const;

interface CreateKeyDialogProps {
  accountSlug: string;
  disabled?: boolean;
}

export default function CreateKeyDialog({
  accountSlug,
  disabled,
}: CreateKeyDialogProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // Form state
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState<string[]>(['ingest', 'verify', 'read']);
  const [rateLimitRpm, setRateLimitRpm] = useState(1000);
  const [expiresAt, setExpiresAt] = useState('');

  // Show-once state
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function resetForm() {
    setName('');
    setScopes(['ingest', 'verify', 'read']);
    setRateLimitRpm(1000);
    setExpiresAt('');
    setCreatedKey(null);
    setCopied(false);
  }

  function handleScopeToggle(scope: string, checked: boolean) {
    setScopes((prev) =>
      checked ? [...prev, scope] : prev.filter((s) => s !== scope),
    );
  }

  function handleCreate() {
    startTransition(async () => {
      const result = await createApiKeyAction({
        accountSlug,
        name,
        scopes: scopes as ('ingest' | 'verify' | 'read' | 'memory')[],
        rateLimitRpm,
        expiresAt: expiresAt || null,
      });

      if (result && 'key' in result) {
        setCreatedKey(result.key);
      }
    });
  }

  function handleCopy() {
    if (createdKey) {
      navigator.clipboard.writeText(createdKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function handleDone() {
    resetForm();
    setOpen(false);
    router.refresh();
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && createdKey) {
      // If they dismiss while key is showing, still refresh
      handleDone();
      return;
    }

    if (!nextOpen) {
      resetForm();
    }

    setOpen(nextOpen);
  }

  const isFormValid = name.trim().length > 0 && scopes.length > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button disabled={disabled}>
          <Trans i18nKey="agentguard:apiKeys.createKey" />
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        {createdKey ? (
          /* ---------- Show-once key display ---------- */
          <>
            <DialogHeader>
              <DialogTitle>
                <Trans i18nKey="agentguard:apiKeys.keyCreated" />
              </DialogTitle>
              <DialogDescription>
                <Trans i18nKey="agentguard:apiKeys.keyCreatedDescription" />
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="bg-muted relative rounded-lg border p-3">
                <code className="block text-sm break-all">{createdKey}</code>
              </div>

              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-950">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  <Trans i18nKey="agentguard:apiKeys.keyCreatedDescription" />
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleCopy}
                  className="flex-1"
                >
                  {copied ? (
                    <Trans i18nKey="agentguard:apiKeys.copied" />
                  ) : (
                    <Trans i18nKey="agentguard:apiKeys.copyKey" />
                  )}
                </Button>
                <Button onClick={handleDone} className="flex-1">
                  <Trans i18nKey="agentguard:apiKeys.done" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          /* ---------- Create form ---------- */
          <>
            <DialogHeader>
              <DialogTitle>
                <Trans i18nKey="agentguard:apiKeys.createKey" />
              </DialogTitle>
              <DialogDescription>
                <Trans i18nKey="agentguard:apiKeys.createKeyDescription" />
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="key-name">
                  <Trans i18nKey="agentguard:apiKeys.keyName" />
                </Label>
                <Input
                  id="key-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Production, Staging"
                  maxLength={100}
                />
              </div>

              {/* Scopes */}
              <div className="space-y-2">
                <Label>
                  <Trans i18nKey="agentguard:apiKeys.scopesLabel" />
                </Label>
                <div className="space-y-2">
                  {SCOPES.map((scope) => (
                    <div key={scope.value} className="flex items-start gap-2">
                      <Checkbox
                        id={`scope-${scope.value}`}
                        checked={scopes.includes(scope.value)}
                        onCheckedChange={(checked) =>
                          handleScopeToggle(scope.value, !!checked)
                        }
                      />
                      <div className="flex flex-col">
                        <label
                          htmlFor={`scope-${scope.value}`}
                          className="text-sm font-medium"
                        >
                          <Badge variant="outline" className="mr-1 text-xs">
                            {scope.value}
                          </Badge>
                          <Trans i18nKey={scope.labelKey} />
                        </label>
                        <span className="text-muted-foreground text-xs">
                          <Trans i18nKey={scope.descKey} />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Rate Limit */}
              <div className="space-y-2">
                <Label htmlFor="rate-limit">
                  <Trans i18nKey="agentguard:apiKeys.rateLimitLabel" />
                </Label>
                <Input
                  id="rate-limit"
                  type="number"
                  value={rateLimitRpm}
                  onChange={(e) =>
                    setRateLimitRpm(parseInt(e.target.value, 10) || 1000)
                  }
                  min={1}
                  max={100000}
                />
              </div>

              {/* Expiry */}
              <div className="space-y-2">
                <Label htmlFor="expires-at">
                  <Trans i18nKey="agentguard:apiKeys.expiryLabel" />
                </Label>
                <Input
                  id="expires-at"
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
                <p className="text-muted-foreground text-xs">
                  <Trans i18nKey="agentguard:apiKeys.expiryNone" />
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={pending}
              >
                <Trans i18nKey="agentguard:apiKeys.cancel" />
              </Button>
              <Button onClick={handleCreate} disabled={!isFormValid || pending}>
                <Trans i18nKey="agentguard:apiKeys.create" />
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
