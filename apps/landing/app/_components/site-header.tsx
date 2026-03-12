import { AppLogo } from '~/components/app-logo';
import { getGitHubStars } from '~/lib/github';

import { DesktopNav } from './nav/desktop-nav';
import { GitHubStarsBadge } from './nav/github-stars-badge';
import { MobileNav } from './nav/mobile-nav';
import { APP_URL } from './nav/nav-config';

export async function SiteHeader() {
  const { formatted } = await getGitHubStars();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#252525] bg-[#0a0a0a]/90 backdrop-blur-md">
      <div className="container">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <MobileNav formatted={formatted} />
            <AppLogo href="/" />
          </div>

          <DesktopNav />

          <div className="hidden items-center gap-3 md:flex">
            <GitHubStarsBadge formatted={formatted} />
            <a
              href={APP_URL}
              className="inline-flex h-9 items-center rounded-md bg-emerald-500 px-4 text-sm font-medium text-white transition-colors hover:bg-emerald-400"
            >
              Get Started
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
