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
  title: 'Klio — the memory layer that keeps AI agents reliable',
  description:
    'Klio gives AI agents shared, persistent memory — what one learns, the others know — so they stop forgetting, drifting, and contradicting themselves. Local-first, encrypted, open source.',
  keywords: [
    'AI agent memory',
    'agent memory layer',
    'persistent memory for AI agents',
    'cross-agent memory',
    'MCP memory',
    'Claude Code memory',
    'Cursor memory',
    'local-first agent memory',
    'AI agent reliability',
    'agent drift',
  ],
  alternates: {
    canonical: 'https://klio.tech',
  },
  openGraph: {
    title: 'Klio — memory for AI agents',
    description:
      'Shared, persistent memory for AI agents. What one learns, the others know. Local-first, encrypted, open source.',
    url: 'https://klio.tech',
    siteName: 'Klio',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@klio_tech',
    title: 'Klio — memory for AI agents',
    description:
      'Shared, persistent memory for AI agents. Local-first, encrypted, open source.',
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
