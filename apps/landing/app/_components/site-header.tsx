import Link from 'next/link';

import { AppLogo } from '~/components/app-logo';

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#252525] bg-[#0a0a0a]/90 backdrop-blur-md">
      <div className="container">
        <div className="flex h-16 items-center justify-between">
          <AppLogo href="/" />

          <nav className="hidden items-center gap-8 md:flex">
            <a
              href="#how-it-works"
              className="text-sm text-[#a2a2a2] transition-colors hover:text-white"
            >
              How It Works
            </a>
            <a
              href="#code"
              className="text-sm text-[#a2a2a2] transition-colors hover:text-white"
            >
              Quick Start
            </a>
            <Link
              href="/guides"
              className="text-sm text-[#a2a2a2] transition-colors hover:text-white"
            >
              Guides
            </Link>
            <Link
              href="/checklists"
              className="text-sm text-[#a2a2a2] transition-colors hover:text-white"
            >
              Checklists
            </Link>
            <Link
              href="/learn"
              className="text-sm text-[#a2a2a2] transition-colors hover:text-white"
            >
              Learn
            </Link>
            <Link
              href="/blog"
              className="text-sm text-[#a2a2a2] transition-colors hover:text-white"
            >
              Blog
            </Link>
            <Link
              href="/pricing"
              className="text-sm text-[#a2a2a2] transition-colors hover:text-white"
            >
              Pricing
            </Link>
            <a
              href="https://docs.tryvex.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[#a2a2a2] transition-colors hover:text-white"
            >
              Docs
            </a>
            <a
              href="https://github.com/Vex-AI-Dev/Vex"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[#a2a2a2] transition-colors hover:text-white"
            >
              GitHub
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <iframe
              src="https://ghbtns.com/github-btn.html?user=Vex-AI-Dev&repo=Vex&type=star&count=true&size=large&color=dark"
              width="150"
              height="30"
              title="GitHub Stars"
              className="hidden lg:block"
            />

            <Link
              href="https://app.tryvex.dev"
              className="inline-flex h-9 items-center rounded-md bg-emerald-500 px-4 text-sm font-medium text-white transition-colors hover:bg-emerald-400"
            >
              Get Started
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
