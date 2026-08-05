import { AppLogo } from '~/components/app-logo';

import { DesktopNav } from './nav/desktop-nav';
import { GitHubLink } from './nav/github-link';
import { MobileNav } from './nav/mobile-nav';
import { CLOUD_SIGNIN_URL, CLOUD_SIGNUP_URL } from './nav/nav-config';

export function SiteHeader() {
  return (
    <header className="border-border bg-background/90 sticky top-0 z-50 w-full border-b backdrop-blur-md">
      <div className="container">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <MobileNav />
            <AppLogo href="/" />
          </div>

          <DesktopNav />

          <div className="hidden items-center gap-3 md:flex">
            <GitHubLink />
            <a
              href={CLOUD_SIGNIN_URL}
              className="text-muted-foreground hover:text-foreground px-2 text-sm font-medium transition-colors"
            >
              Sign in
            </a>
            <a href={CLOUD_SIGNUP_URL} className="k-btn k-btn--primary">
              Get started
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
