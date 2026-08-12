import type { Metadata } from 'next';

import { cn } from '@kit/ui/utils';

import { getFontsClassName } from '~/lib/fonts';
import {
  faqPageSchema,
  organizationSchema,
  softwareApplicationSchema,
} from '~/lib/seo/schemas';

import '../styles/globals.css';
// Imported after globals so the survey rules — deliberately unlayered — win
// over the layered Makerkit base without needing !important.
import '../styles/survey.css';
import { SiteFooter } from './_components/site-footer';
import { SiteHeader } from './_components/site-header';

export const metadata: Metadata = {
  metadataBase: new URL('https://klio.tech'),
  title: 'Klio — context management for AI agents',
  description:
    'Your agents do not need better memories. They need somewhere to work together. Connect Claude Code, Cursor, Codex and any MCP client to one project-scoped memory: one agent finishes, the next picks up where it left off. Local-first, encrypted, open source.',
  keywords: [
    'shared workspace for AI agents',
    'AI agent collaboration',
    'cross-agent memory',
    'shared memory for AI agents',
    'agent handover',
    'vendor-neutral agent memory',
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
    title: 'Klio — context management for AI agents',
    description:
      'Give your agents somewhere to work together. One finishes, the next picks up where it left off — across Claude Code, Cursor, Codex and any MCP client.',
    url: 'https://klio.tech',
    siteName: 'Klio',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@klio_tech',
    title: 'Klio — context management for AI agents',
    description:
      'Give your agents somewhere to work together. One finishes, the next picks up where it left off.',
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
