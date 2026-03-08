import type { Metadata } from 'next';

import { cn } from '@kit/ui/utils';

import { getFontsClassName } from '~/lib/fonts';

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
    "Vex is the open-source runtime reliability layer that detects when your AI agent's behavior silently changes in production. Before your customers notice.",
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
              {
                '@context': 'https://schema.org',
                '@type': 'SoftwareApplication',
                name: 'Vex',
                description:
                  'Open-source runtime reliability layer that detects when AI agent behavior silently drifts in production. Observes every LLM call, corrects hallucinations and policy violations in real time.',
                url: 'https://tryvex.dev',
                applicationCategory: 'DeveloperApplication',
                operatingSystem: 'Any',
                offers: {
                  '@type': 'Offer',
                  price: '0',
                  priceCurrency: 'USD',
                  description: 'Free tier available',
                },
                softwareHelp: {
                  '@type': 'WebPage',
                  url: 'https://docs.tryvex.dev',
                },
                downloadUrl: 'https://pypi.org/project/vex-sdk/',
                codeRepository: 'https://github.com/Vex-AI-Dev/Vex',
                license: 'https://github.com/Vex-AI-Dev/Vex/blob/main/LICENSING.md',
              },
              {
                '@context': 'https://schema.org',
                '@type': 'Organization',
                name: 'Vex',
                url: 'https://tryvex.dev',
                logo: 'https://tryvex.dev/images/og-image.png',
                sameAs: [
                  'https://github.com/Vex-AI-Dev',
                  'https://x.com/tryvex',
                ],
              },
              {
                '@context': 'https://schema.org',
                '@type': 'FAQPage',
                mainEntity: [
                  {
                    '@type': 'Question',
                    name: 'What is Vex?',
                    acceptedAnswer: {
                      '@type': 'Answer',
                      text: "Vex is an open-source runtime reliability layer for AI agents. It detects when your agent's behavior silently changes in production — hallucinations, drift, schema violations — and auto-corrects before your users notice.",
                    },
                  },
                  {
                    '@type': 'Question',
                    name: 'How is Vex different from evals or tracing?',
                    acceptedAnswer: {
                      '@type': 'Answer',
                      text: "Evals test your agent before deployment. Tracing shows you what happened after something breaks. Vex runs continuously in production, catching behavioral drift in real-time and auto-correcting on the fly. They're complementary — Vex fills the gap between pre-deploy testing and post-mortem analysis.",
                    },
                  },
                  {
                    '@type': 'Question',
                    name: 'How long does it take to set up?',
                    acceptedAnswer: {
                      '@type': 'Answer',
                      text: 'About 5 minutes. Install the SDK (pip install vex-sdk or npm install @vex_dev/sdk), add 3 lines of code to wrap your agent function, and deploy. Vex starts learning from the first request.',
                    },
                  },
                  {
                    '@type': 'Question',
                    name: 'What frameworks does Vex support?',
                    acceptedAnswer: {
                      '@type': 'Answer',
                      text: 'Vex works with LangChain, CrewAI, OpenAI Assistants, and any custom Python or TypeScript agent. If your code calls an LLM, Vex can watch it.',
                    },
                  },
                  {
                    '@type': 'Question',
                    name: 'Is Vex open source?',
                    acceptedAnswer: {
                      '@type': 'Answer',
                      text: 'Yes. Vex is fully open source. The SDKs (Python, TypeScript) are Apache 2.0. The core engine and dashboard are AGPLv3. Everything is on GitHub.',
                    },
                  },
                  {
                    '@type': 'Question',
                    name: 'Does Vex add latency?',
                    acceptedAnswer: {
                      '@type': 'Answer',
                      text: 'In async mode (default), Vex adds zero latency — verification happens in the background. In sync mode, Vex adds a verification step before returning the output, which typically takes 200-500ms depending on the checks enabled.',
                    },
                  },
                ],
              },
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
