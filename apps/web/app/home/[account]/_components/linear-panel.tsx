import type { ReactNode } from 'react';

/**
 * Linear's #appBorders sheet: #09090a chrome, #121213 panel, 12px radius, 8px inset.
 */
export function LinearPanel({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[#09090a] p-2">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[12px] border border-[#212224] bg-[#121213]">
        {children}
      </div>
    </div>
  );
}
