'use client';

import dynamic from 'next/dynamic';

import { LoadingOverlay } from '@kit/ui/loading-overlay';

/**
 * Client-only wrapper for the recall-activity table. The table paginates via
 * `useSearchParams` (through PaginationBar), so it is rendered without SSR —
 * mirroring how the memory browser table is loaded on the listing page.
 */
export const RecallActivity = dynamic(
  () => import('./recall-activity-table').then((mod) => mod.RecallActivityTable),
  {
    ssr: false,
    loading: () => (
      <LoadingOverlay
        fullPage={false}
        className={'flex flex-1 flex-col items-center justify-center'}
      />
    ),
  },
);
