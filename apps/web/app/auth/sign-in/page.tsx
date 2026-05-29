import Link from 'next/link';

import { SignInMethodsContainer } from '@kit/auth/sign-in';
import { getSafeRedirectPath } from '@kit/shared/utils';
import { Trans } from '@kit/ui/trans';

import authConfig from '~/config/auth.config';
import pathsConfig from '~/config/paths.config';
import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';

interface SignInPageProps {
  searchParams: Promise<{
    next?: string;
  }>;
}

export const generateMetadata = async () => {
  const i18n = await createI18nServerInstance();

  return {
    title: i18n.t('auth:signIn'),
  };
};

async function SignInPage({ searchParams }: SignInPageProps) {
  const { next } = await searchParams;

  const paths = {
    callback: pathsConfig.auth.callback,
    returnPath: getSafeRedirectPath(next, pathsConfig.app.home),
    joinTeam: pathsConfig.app.joinTeam,
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">
          <Trans i18nKey={'auth:signInHeading'} />
        </h1>

        <p className="text-muted-foreground text-sm">
          <Trans i18nKey={'auth:signInSubheading'} />
        </p>
      </div>

      <SignInMethodsContainer
        paths={paths}
        providers={authConfig.providers}
        captchaSiteKey={authConfig.captchaTokenSiteKey}
      />

      <p className="text-muted-foreground text-sm">
        <Trans i18nKey={'auth:newToKlio'} defaults={'New to Klio?'} />{' '}
        <Link
          href={pathsConfig.auth.signUp}
          className="text-foreground font-medium underline underline-offset-4 hover:no-underline"
          prefetch={true}
        >
          <Trans
            i18nKey={'auth:createAnAccount'}
            defaults={'Create an account'}
          />
        </Link>
      </p>
    </div>
  );
}

export default withI18n(SignInPage);
