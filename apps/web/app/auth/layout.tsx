import { Toaster } from '@kit/ui/sonner';

import { KlioMark } from '~/components/klio-mark';

import { AuthCarousel } from './_components/auth-carousel';

/*
 * Tessellating chevron / V pattern — echoes the Vex logo shape.
 * Tile: 80×48 — two nested V strokes for depth.
 */
const CHEVRON_TILE = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='48'%3E%3Cpath d='M0 0 L40 32 L80 0' fill='none' stroke='rgba(255,255,255,0.15)' stroke-width='1'/%3E%3Cpath d='M0 16 L40 48 L80 16' fill='none' stroke='rgba(255,255,255,0.08)' stroke-width='0.5'/%3E%3C/svg%3E")`;

function AuthLayout({ children }: React.PropsWithChildren) {
  return (
    <div className="bg-background flex min-h-screen">
      {/* Left side — form */}
      <div className="flex w-full flex-col items-center justify-center px-8 py-10 lg:w-1/2 lg:px-16 xl:px-24">
        <div className="w-full max-w-sm">
          {/* Logo — stacked Klio mark + wordmark */}
          <div className="text-foreground mb-8 flex flex-col items-start gap-3">
            <KlioMark size={56} />
            <span className="text-3xl font-semibold tracking-tight">Klio</span>
          </div>

          {children}
        </div>
      </div>

      {/* Right side — value proposition (hidden on mobile) */}
      <div className="relative hidden overflow-hidden lg:flex lg:w-1/2 lg:items-center lg:justify-center">
        {/* V pattern background */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: CHEVRON_TILE,
            backgroundSize: '80px 48px',
          }}
        />

        {/* Radial vignette */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 80% 70% at 50% 50%, transparent 0%, hsl(0 0% 0%) 100%)',
          }}
        />

        {/* Accent glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{
            width: '500px',
            height: '400px',
            background:
              'radial-gradient(ellipse at center, rgba(52,199,142,0.06) 0%, transparent 70%)',
            filter: 'blur(80px)',
          }}
        />

        {/* Carousel */}
        <AuthCarousel />
      </div>

      <Toaster />
    </div>
  );
}

export default AuthLayout;
