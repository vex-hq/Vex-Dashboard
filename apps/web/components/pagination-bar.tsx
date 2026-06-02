'use client';

import { useCallback } from 'react';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@kit/ui/button';

interface PaginationBarProps {
  page: number;
  pageCount: number;
  /**
   * Name of the search-param this bar reads and writes. Defaults to `page` so
   * existing single-table pages keep working unchanged; pass a distinct value
   * (e.g. `capturesPage`) when several independently-paginated tables share a
   * single route.
   */
  pageParam?: string;
}

export function PaginationBar({
  page,
  pageCount,
  pageParam = 'page',
}: PaginationBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const goToPage = useCallback(
    (newPage: number) => {
      const params = new URLSearchParams(searchParams.toString());

      if (newPage <= 1) {
        params.delete(pageParam);
      } else {
        params.set(pageParam, String(newPage));
      }

      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams, pageParam],
  );

  if (pageCount <= 1) {
    return null;
  }

  return (
    <div className="flex items-center justify-between border-t pt-4">
      <Button
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => goToPage(page - 1)}
      >
        <ChevronLeft className="mr-1 h-4 w-4" />
        Previous
      </Button>

      <span className="text-muted-foreground text-sm">
        Page {page} of {pageCount}
      </span>

      <Button
        variant="outline"
        size="sm"
        disabled={page >= pageCount}
        onClick={() => goToPage(page + 1)}
      >
        Next
        <ChevronRight className="ml-1 h-4 w-4" />
      </Button>
    </div>
  );
}
