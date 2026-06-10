'use client';

import { useState, useTransition } from 'react';

import Link from 'next/link';

import { Alert, AlertDescription } from '@kit/ui/alert';
import { Button } from '@kit/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import { Label } from '@kit/ui/label';
import { RadioGroup, RadioGroupItem } from '@kit/ui/radio-group';
import { Trans } from '@kit/ui/trans';

import type { AuthorizationDetails } from '~/lib/oauth/consent-service';

import type { WorkspaceOption } from '../_lib/server/consent.loader';
import { submitConsentAction } from '../_lib/server/consent-actions';

interface ConsentCardProps {
  details: AuthorizationDetails;
  workspaces: WorkspaceOption[];
  addWorkspacePath: string;
}

/**
 * Consent card rendered for the OAuth authorization flow.
 *
 * Renders the requesting client's name, the scope being requested, a
 * RadioGroup of the user's team workspaces, and Approve / Deny buttons.
 *
 * On a successful action the component navigates to the OAuth redirect URL
 * via `window.location.assign` — a hard navigation is used deliberately so
 * the Next.js router cache does not interfere with the OAuth code exchange.
 */
export function ConsentCard({
  details,
  workspaces,
  addWorkspacePath,
}: ConsentCardProps) {
  const [isPending, startTransition] = useTransition();
  const [selectedSlug, setSelectedSlug] = useState<string>(
    workspaces.length === 1 ? (workspaces[0]!.slug) : '',
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const clientName = details.clientName ?? 'An application';
  const canApprove = selectedSlug.length > 0;

  function handleApprove() {
    if (!canApprove) return;

    setErrorMessage(null);

    startTransition(async () => {
      try {
        const result = await submitConsentAction({
          authorizationId: details.authorizationId,
          decision: 'approve',
          accountSlug: selectedSlug,
        });

        window.location.assign(result.redirectTo);
      } catch (err) {
        setErrorMessage(
          err instanceof Error
            ? err.message
            : 'Something went wrong. Please try again.',
        );
      }
    });
  }

  function handleDeny() {
    setErrorMessage(null);

    startTransition(async () => {
      try {
        const result = await submitConsentAction({
          authorizationId: details.authorizationId,
          decision: 'deny',
        });

        window.location.assign(result.redirectTo);
      } catch (err) {
        setErrorMessage(
          err instanceof Error
            ? err.message
            : 'Something went wrong. Please try again.',
        );
      }
    });
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl">
          <Trans
            i18nKey="agentguard:oauthConsent.title"
            values={{ clientName }}
          />
        </CardTitle>
        <CardDescription>
          <Trans i18nKey="agentguard:oauthConsent.description" />
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Requested permission summary */}
        <div className="bg-muted/50 rounded-md px-4 py-3">
          <p className="text-foreground text-sm font-medium">
            <Trans i18nKey="agentguard:oauthConsent.permissionHeading" />
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            <Trans i18nKey="agentguard:oauthConsent.permissionBody" />
          </p>

          {details.redirectHint ? (
            <p className="text-muted-foreground mt-2 truncate text-xs">
              <Trans
                i18nKey="agentguard:oauthConsent.redirectHint"
                values={{ url: details.redirectHint }}
              />
            </p>
          ) : null}
        </div>

        {/* Team workspace picker */}
        <div className="space-y-3">
          <p className="text-sm font-medium">
            <Trans i18nKey="agentguard:oauthConsent.workspaceLabel" />
          </p>

          {workspaces.length === 0 ? (
            <Alert>
              <AlertDescription className="space-y-2">
                <p>
                  <Trans i18nKey="agentguard:oauthConsent.noWorkspaces" />
                </p>
                <Link
                  href={addWorkspacePath}
                  className="text-primary text-sm underline underline-offset-4"
                >
                  <Trans i18nKey="agentguard:oauthConsent.createWorkspaceLink" />
                </Link>
              </AlertDescription>
            </Alert>
          ) : (
            <RadioGroup
              value={selectedSlug}
              onValueChange={setSelectedSlug}
              className="grid gap-2"
              disabled={isPending}
            >
              {workspaces.map((ws) => (
                <div
                  key={ws.slug}
                  className="border-input has-[button[data-state=checked]]:border-primary has-[button[data-state=checked]]:bg-primary/5 flex items-center gap-3 rounded-md border px-4 py-3 transition-colors"
                >
                  <RadioGroupItem value={ws.slug} id={`ws-${ws.slug}`} />
                  <Label
                    htmlFor={`ws-${ws.slug}`}
                    className="flex-1 cursor-pointer font-normal"
                  >
                    {ws.name}
                    <span className="text-muted-foreground ml-2 text-xs">
                      {ws.slug}
                    </span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          )}
        </div>

        {/* Error message */}
        {errorMessage ? (
          <Alert variant="destructive">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}
      </CardContent>

      <CardFooter className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <Button
          variant="outline"
          onClick={handleDeny}
          disabled={isPending}
          className="w-full sm:w-auto"
        >
          <Trans i18nKey="agentguard:oauthConsent.denyButton" />
        </Button>
        <Button
          onClick={handleApprove}
          disabled={isPending || !canApprove}
          className="w-full sm:w-auto"
        >
          <Trans i18nKey="agentguard:oauthConsent.approveButton" />
        </Button>
      </CardFooter>
    </Card>
  );
}
