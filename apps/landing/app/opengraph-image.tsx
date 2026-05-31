import { ImageResponse } from 'next/og';

/**
 * Social share card for klio.tech — renders when the URL is posted anywhere
 * (X, Slack, iMessage, LinkedIn, etc.). File-based `opengraph-image` so Next
 * auto-injects the og:image meta for the home route. Klio cream/mono card:
 * the mark, the memory wedge headline, and the proof line.
 */
export const alt = 'Klio — the memory layer that keeps AI agents reliable';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const CREAM = '#fbfaf6';
const INK = '#1f1d1a';
const MUTED = '#6f6b62';
const BORDER = '#e8e6e0';

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: CREAM,
        color: INK,
        padding: '72px 80px',
        border: `12px solid ${CREAM}`,
        fontFamily: 'monospace',
      }}
    >
      {/* top row: mark + wordmark */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        <svg width="52" height="52" viewBox="0 0 24 24">
          <rect x="3" y="6" width="18" height="2" fill={INK} />
          <rect x="8" y="11" width="13" height="2" fill={INK} />
          <rect x="3" y="16" width="18" height="2" fill={INK} />
        </svg>
        <div
          style={{
            display: 'flex',
            fontSize: 34,
            fontWeight: 700,
            letterSpacing: -1,
          }}
        >
          Klio
        </div>
      </div>

      {/* headline */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            fontSize: 82,
            fontWeight: 700,
            lineHeight: 1.06,
            letterSpacing: -2.5,
          }}
        >
          <div style={{ display: 'flex' }}>Your agents forget.</div>
          <div style={{ display: 'flex' }}>Klio remembers.</div>
        </div>
        <div
          style={{ display: 'flex', fontSize: 30, color: MUTED, maxWidth: 980 }}
        >
          One shared brain for Claude, Cursor, Codex, and any AI agent — what
          one learns, they all know.
        </div>
      </div>

      {/* footer */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTop: `2px solid ${BORDER}`,
          paddingTop: 28,
          fontSize: 26,
          color: MUTED,
        }}
      >
        <div style={{ display: 'flex' }}>klio.tech</div>
        <div style={{ display: 'flex' }}>npx @klio-tech/klio init</div>
      </div>
    </div>,
    { ...size },
  );
}
