import { Toaster } from '@kit/ui/sonner';

/*
 * Tessellating chevron pattern — a subtle geometric background texture.
 * Each tile is a downward-pointing V that tiles seamlessly.
 * Tile: 80×48 — two nested V strokes for depth.
 */
const CHEVRON_TILE = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='48'%3E%3Cpath d='M0 0 L40 32 L80 0' fill='none' stroke='rgba(255,255,255,0.15)' stroke-width='1'/%3E%3Cpath d='M0 16 L40 48 L80 16' fill='none' stroke='rgba(255,255,255,0.08)' stroke-width='0.5'/%3E%3C/svg%3E")`;

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-background relative min-h-screen overflow-hidden">
      {/* Chevron / V pattern background — full screen */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0"
        style={{
          backgroundImage: CHEVRON_TILE,
          backgroundSize: '80px 48px',
        }}
      />

      {/* Radial vignette — pattern fades toward edges */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 70% at 50% 50%, transparent 0%, hsl(0 0% 0%) 100%)',
        }}
      />

      {/* Subtle accent glow behind center content */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{
          width: '700px',
          height: '500px',
          background:
            'radial-gradient(ellipse at center, rgba(52,199,142,0.08) 0%, transparent 70%)',
          filter: 'blur(80px)',
        }}
      />

      <div className="relative z-10">{children}</div>
      <Toaster />
    </div>
  );
}
