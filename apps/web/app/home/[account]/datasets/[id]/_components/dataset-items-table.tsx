'use client';

import { useState } from 'react';

import { ChevronDown, ChevronRight, Database } from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';
import { Trans } from '@kit/ui/trans';

import type { DatasetItem } from '~/lib/agentguard/types';

interface DatasetItemsTableProps {
  items: DatasetItem[];
  datasetName: string;
}

function truncate(value: unknown, maxLength: number): string {
  if (value === undefined || value === null) {
    return '';
  }

  const text =
    typeof value === 'string' ? value : JSON.stringify(value, null, 2);

  if (text.length <= maxLength) {
    return text;
  }

  return text.slice(0, maxLength) + '...';
}

function formatValue(value: unknown): string {
  if (value === undefined || value === null) {
    return '';
  }

  return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
}

export function DatasetItemsTable({
  items,
  datasetName,
}: DatasetItemsTableProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  function handleToggle(index: number) {
    setExpandedIndex((current) => (current === index ? null : index));
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{datasetName}</CardTitle>
          <CardDescription>
            <Trans i18nKey="agentguard:datasets.items" />
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="bg-muted mb-4 flex h-12 w-12 items-center justify-center rounded-full">
            <Database className="text-muted-foreground h-6 w-6" />
          </div>
          <h3 className="text-foreground text-sm font-medium">
            <Trans i18nKey="agentguard:datasets.noItems" />
          </h3>
          <p className="text-muted-foreground mt-1 max-w-sm text-center text-xs">
            <Trans i18nKey="agentguard:datasets.noItemsDescription" />
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{datasetName}</CardTitle>
        <CardDescription>
          <Trans
            i18nKey="agentguard:datasets.itemCount"
            values={{ count: items.length }}
          />
          {' — '}
          <Trans i18nKey="agentguard:datasets.clickToExpand" />
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Trans i18nKey="agentguard:datasets.index" />
              </TableHead>
              <TableHead>
                <Trans i18nKey="agentguard:datasets.input" />
              </TableHead>
              <TableHead>
                <Trans i18nKey="agentguard:datasets.expectedOutput" />
              </TableHead>
              <TableHead>
                <Trans i18nKey="agentguard:datasets.groundTruth" />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, index) => {
              const isExpanded = expandedIndex === index;

              return (
                <ExpandableRow
                  key={index}
                  index={index}
                  item={item}
                  isExpanded={isExpanded}
                  onToggle={handleToggle}
                />
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

interface ExpandableRowProps {
  index: number;
  item: DatasetItem;
  isExpanded: boolean;
  onToggle: (index: number) => void;
}

function ExpandableRow({
  index,
  item,
  isExpanded,
  onToggle,
}: ExpandableRowProps) {
  const ChevronIcon = isExpanded ? ChevronDown : ChevronRight;

  return (
    <>
      <TableRow
        className="hover:bg-muted/50 cursor-pointer"
        onClick={() => onToggle(index)}
      >
        <TableCell className="text-muted-foreground text-xs">
          <span className="flex items-center gap-1">
            <ChevronIcon className="h-3 w-3" />
            {index + 1}
          </span>
        </TableCell>
        <TableCell className="max-w-xs font-mono text-xs">
          {truncate(item.input, 100)}
        </TableCell>
        <TableCell className="max-w-xs text-xs">
          {truncate(item.expected_output, 100)}
        </TableCell>
        <TableCell className="max-w-xs text-xs">
          {truncate(item.ground_truth, 100)}
        </TableCell>
      </TableRow>

      {isExpanded && (
        <TableRow>
          <TableCell colSpan={4} className="bg-muted/30 p-4">
            <ExpandedContent item={item} />
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

function ExpandedContent({ item }: { item: DatasetItem }) {
  return (
    <div className="space-y-3">
      <ExpandedField
        label="agentguard:datasets.input"
        value={formatValue(item.input)}
      />

      {item.expected_output !== undefined && (
        <ExpandedField
          label="agentguard:datasets.expectedOutput"
          value={formatValue(item.expected_output)}
        />
      )}

      {item.ground_truth !== undefined && (
        <ExpandedField
          label="agentguard:datasets.groundTruth"
          value={formatValue(item.ground_truth)}
        />
      )}

      {item.metadata && Object.keys(item.metadata).length > 0 && (
        <ExpandedField
          label="agentguard:datasets.metadata"
          value={JSON.stringify(item.metadata, null, 2)}
        />
      )}
    </div>
  );
}

function ExpandedField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-muted-foreground mb-1 block text-xs font-medium">
        <Trans i18nKey={label} />
      </span>
      <pre className="bg-background max-h-60 overflow-auto rounded border p-2 text-xs whitespace-pre-wrap">
        {value}
      </pre>
    </div>
  );
}
