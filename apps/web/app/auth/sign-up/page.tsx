import Link from 'next/link';

import { SignUpMethodsContainer } from '@kit/auth/sign-up';
import { getSafeRedirectPath } from '@kit/shared/utils';
import { Trans } from '@kit/ui/trans';

import authConfig from '~/config/auth.config';
import pathsConfig from '~/config/paths.config';
import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';

export const generateMetadata = async () => {
  const i18n = await createI18nServerInstance();

  return {
    title: i18n.t('auth:signUp'),
  };
};

interface SignUpPageProps {
  searchParams: Promise<{
    next?: string;
    invite_token?: string;
  }>;
}

async function SignUpPage({ searchParams }: SignUpPageProps) {
  const { next, invite_token } = await searchParams;

  const inviteReturn = invite_token
    ? `${pathsConfig.app.joinTeam}?invite_token=${invite_token}`
    : null;

  const paths = {
    callback: pathsConfig.auth.callback,
    appHome: getSafeRedirectPath(
      inviteReturn ?? next,
      pathsConfig.app.home,
    ),
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">
          <Trans i18nKey={'auth:signUpHeading'} />
        </h1>

        <p className="text-muted-foreground text-sm">
          <Trans i18nKey={'auth:signUpSubheading'} />
        </p>
      </div>

      <SignUpMethodsContainer
        providers={authConfig.providers}
        displayTermsCheckbox={authConfig.displayTermsCheckbox}
        paths={paths}
        captchaSiteKey={authConfig.captchaTokenSiteKey}
      />

      <p className="text-muted-foreground text-sm">
        <Trans
          i18nKey={'auth:alreadyHaveAccount'}
          defaults={'Already have an account?'}
        />{' '}
        <Link
          href={
            invite_token
              ? `${pathsConfig.auth.signIn}?invite_token=${invite_token}&next=${encodeURIComponent(`${pathsConfig.app.joinTeam}?invite_token=${invite_token}`)}`
              : pathsConfig.auth.signIn
          }
          className="text-foreground font-medium underline underline-offset-4 hover:no-underline"
          prefetch={true}
        >
          <Trans i18nKey={'auth:signIn'} defaults={'Sign in'} />
        </Link>
      </p>
    </div>
  );
}

export default withI18n(SignUpPage);
