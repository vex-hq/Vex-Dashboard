import { redirect } from 'next/navigation';

import { AuthLayoutShell } from '@kit/auth/shared';
import { requireUser } from '@kit/supabase/require-user';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import { Trans } from '@kit/ui/trans';

import { AppLogo } from '~/components/app-logo';
import pathsConfig from '~/config/paths.config';
import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';
import { ConsentServiceError } from '~/lib/oauth/consent-service';

import { ConsentCard } from './_components/consent-card';
import { loadConsentPage } from './_lib/server/consent.loader';

// The query parameter Supabase Auth uses for the authorization request.
const AUTHORIZATION_ID_PARAM = 'authorization_id';

export const generateMetadata = async () => {
  const i18n = await createI18nServerInstance();
  const title = i18n.t('agentguard:oauthConsent.pageTitle');
  return { title };
};

interface ConsentPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

async function ConsentPage(props: ConsentPageProps) {
  const searchParams = await props.searchParams;
  const rawAuthId = searchParams[AUTHORIZATION_ID_PARAM];
  const authorizationId =
    typeof rawAuthId === 'string' ? rawAuthId.trim() : null;

  // Missing authorization id — render a friendly error card rather than a
  // blank page or a 404. This covers direct navigation, expired links, etc.
  if (!authorizationId) {
    return (
      <AuthLayoutShell Logo={AppLogo}>
        <AuthorizationErrorCard i18nKey="agentguard:oauthConsent.missingId" />
      </AuthLayoutShell>
    );
  }

  const client = getSupabaseServerClient();

  // Build the return URL that sign-in will redirect back to after login.
  const returnUrl = `${pathsConfig.oauth.consent}?${AUTHORIZATION_ID_PARAM}=${encodeURIComponent(authorizationId)}`;

  const auth = await requireUser(client, { next: returnUrl });

  if (auth.error ?? !auth.data) {
    redirect(auth.redirectTo);
  }

  // Load authorization details and workspace list.
  // If the authorization id is invalid/expired, ConsentServiceError is thrown;
  // we catch it and show a friendly error card.
  let loaderResult: Awaited<ReturnType<typeof loadConsentPage>>;

  try {
    loaderResult = await loadConsentPage(client, authorizationId);
  } catch (err) {
    const message =
      err instanceof ConsentServiceError
        ? err.message
        : 'agentguard:oauthConsent.invalidId';

    return (
      <AuthLayoutShell Logo={AppLogo}>
        <AuthorizationErrorCard message={message} />
      </AuthLayoutShell>
    );
  }

  // Supabase already consented — redirect immediately without rendering.
  if (loaderResult.kind === 'already_consented') {
    redirect(loaderResult.redirectTo);
  }

  const { details, workspaces } = loaderResult;

  return (
    <AuthLayoutShell Logo={AppLogo} contentClassName="max-w-md">
      <ConsentCard
        details={details}
        workspaces={workspaces}
        addWorkspacePath={pathsConfig.app.addWorkspace}
      />
    </AuthLayoutShell>
  );
}

export default withI18n(ConsentPage);

// ---------------------------------------------------------------------------
// Error card
// ---------------------------------------------------------------------------

interface AuthorizationErrorCardProps {
  i18nKey?: string;
  message?: string;
}

function AuthorizationErrorCard({
  i18nKey,
  message,
}: AuthorizationErrorCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Trans i18nKey="agentguard:oauthConsent.errorTitle" />
        </CardTitle>
        <CardDescription>
          {i18nKey ? <Trans i18nKey={i18nKey} /> : <span>{message}</span>}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm">
          <Trans i18nKey="agentguard:oauthConsent.errorBody" />
        </p>
      </CardContent>
    </Card>
  );
}
