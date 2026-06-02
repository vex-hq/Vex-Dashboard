'use client';

import { Card, CardContent } from '@kit/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';
import { Trans } from '@kit/ui/trans';

import { PaginationBar } from '~/components/pagination-bar';
import { formatTimestamp } from '~/lib/agentguard/formatters';

import type { AgentRecallRow } from '../../../_lib/server/memory.loader';

interface RecallActivityTableProps {
  rows: AgentRecallRow[];
  page: number;
  pageCount: number;
}

/** Search-param that drives this table's pagination on the drill-in route. */
const RECALLS_PAGE_PARAM = 'recallsPage';

export function RecallActivityTable({
  rows,
  page,
  pageCount,
}: RecallActivityTableProps) {
  if (rows.length === 0) {
    return (
      <Card>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            <Trans i18nKey="agentguard:memory.noRecalls" />
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Trans i18nKey="agentguard:memory.colQuery" />
              </TableHead>
              <TableHead>
                <Trans i18nKey="agentguard:memory.colResults" />
              </TableHead>
              <TableHead>
                <Trans i18nKey="agentguard:memory.source" />
              </TableHead>
              <TableHead>
                <Trans i18nKey="agentguard:memory.colCreated" />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="max-w-md">
                  {row.query_text ? (
                    <span className="block truncate" title={row.query_text}>
                      {row.query_text}
                    </span>
                  ) : (
                    '—'
                  )}
                </TableCell>
                <TableCell>{row.result_count.toLocaleString()}</TableCell>
                <TableCell>{row.source ?? '—'}</TableCell>
                <TableCell className="whitespace-nowrap">
                  {formatTimestamp(row.created_at)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <PaginationBar
          page={page}
          pageCount={pageCount}
          pageParam={RECALLS_PAGE_PARAM}
        />
      </CardContent>
    </Card>
  );
}
