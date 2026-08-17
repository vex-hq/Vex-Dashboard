import type { ReactNode } from 'react';

import { LinearPanel } from '../linear-panel';
import { L } from './shell-tokens';

/**
 * Title, subtitle, body — the frame every shell screen renders inside.
 *
 * The title/subtitle pairs are transcribed from the prototype's `T` map and
 * live in `shell-copy.ts`, one place, so a screen cannot quietly acquire a
 * heading nobody approved.
 */
export function ShellPage({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <LinearPanel>
      <header
        className="flex shrink-0 flex-wrap items-baseline gap-x-3 gap-y-1 border-b px-5 py-4"
        style={{ borderColor: L.line }}
      >
        <h1 className="text-[15px] font-[590]" style={{ color: L.ink }}>
          {title}
        </h1>
        <p className="text-[12px]" style={{ color: L.muted }}>
          {subtitle}
        </p>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
    </LinearPanel>
  );
}
