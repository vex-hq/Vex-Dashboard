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

/*
 * Tessellating chevron / V pattern — echoes the Vex logo shape.
 * Tile: 80×48 — two nested V strokes for depth.
 */
const CHEVRON_TILE = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='48'%3E%3Cpath d='M0 0 L40 32 L80 0' fill='none' stroke='rgba(255,255,255,0.12)' stroke-width='1'/%3E%3Cpath d='M0 16 L40 48 L80 16' fill='none' stroke='rgba(255,255,255,0.06)' stroke-width='0.5'/%3E%3C/svg%3E")`;

export const metadata: Metadata = {
  metadataBase: new URL('https://tryvex.dev'),
  title: 'Vex — Runtime reliability for AI agents',
  description:
    "Vex is the runtime reliability layer that detects when your AI agent's behavior silently changes in production. Before your customers notice.",
  keywords: [
    'AI agent monitoring',
    'runtime reliability',
    'LLM observability',
    'agent drift detection',
    'hallucination detection',
    'AI guardrails',
    'LangChain monitoring',
    'CrewAI monitoring',
    'OpenAI agent monitoring',
    'production AI agents',
  ],
  alternates: {
    canonical: 'https://tryvex.dev',
  },
  icons: {
    icon: '/favicon.ico',
  },
  openGraph: {
    title: 'Vex — Runtime reliability for AI agents',
    description:
      "Detect when your AI agent's behavior silently changes in production. Before your customers notice.",
    url: 'https://tryvex.dev',
    images: [{ url: '/images/og-image.png', width: 1200, height: 630 }],
    siteName: 'Vex',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@tryvex',
    title: 'Vex — Runtime reliability for AI agents',
    description:
      "Detect when your AI agent's behavior silently changes in production.",
    images: ['/images/og-image.png'],
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

        {/* Chevron V-pattern background */}
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-0"
          style={{
            backgroundImage: CHEVRON_TILE,
            backgroundSize: '80px 48px',
          }}
        />

        {/* Radial vignette — pattern fades toward edges */}
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-0"
          style={{
            background:
              'radial-gradient(ellipse 90% 70% at 50% 30%, transparent 0%, #0a0a0a 100%)',
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
