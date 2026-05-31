import type { Metadata } from 'next';

import { cn } from '@kit/ui/utils';

import { getFontsClassName } from '~/lib/fonts';
import {
  faqPageSchema,
  organizationSchema,
  softwareApplicationSchema,
} from '~/lib/seo/schemas';

import '../styles/globals.css';
import { SiteFooter } from './_components/site-footer';
import { SiteHeader } from './_components/site-header';

export const metadata: Metadata = {
  metadataBase: new URL('https://klio.tech'),
  title: 'Klio — one shared brain for all your AI agents',
  description:
    'Connect Claude, Cursor, Codex, and any MCP agent to one shared memory — so what one learns, they all know. Your agents stop forgetting, repeating work, and contradicting each other. Local-first, encrypted, open source.',
  keywords: [
    'shared memory for AI agents',
    'connect AI agents',
    'cross-agent memory',
    'AI agent collaboration',
    'shared brain for agents',
    'MCP memory',
    'Claude Code memory',
    'Cursor memory',
    'Gemini memory',
    'local-first agent memory',
  ],
  alternates: {
    canonical: 'https://klio.tech',
  },
  openGraph: {
    title: 'Klio — one shared brain for your AI agents',
    description:
      'Connect every AI agent you use to one shared memory. What one learns, they all know. Local-first, encrypted, open source.',
    url: 'https://klio.tech',
    siteName: 'Klio',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@klio_tech',
    title: 'Klio — one shared brain for your AI agents',
    description:
      'Connect every AI agent you use to one shared memory. What one learns, they all know.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const className = cn(
    'bg-background min-h-screen antialiased',
    getFontsClassName(),
  );

  return (
    <html lang="en" className={cn(className, 'overflow-x-hidden')}>
      <head>
        <link rel="alternate" type="text/plain" href="/llms.txt" />
        <script
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-F5LSR3VNPZ"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-F5LSR3VNPZ');
            `,
          }}
        />
      </head>
      <body className="relative overflow-x-hidden">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([
              softwareApplicationSchema(),
              organizationSchema(),
              faqPageSchema(),
            ]),
          }}
        />

        <div className="relative z-10 flex min-h-screen flex-col">
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
