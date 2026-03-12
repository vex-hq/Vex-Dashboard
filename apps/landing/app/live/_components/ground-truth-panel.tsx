'use client';

import { useState } from 'react';

import { ChevronDown, ChevronUp, FileText } from 'lucide-react';

interface GroundTruthPanelProps {
  content: string;
}

export function GroundTruthPanel({ content }: GroundTruthPanelProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-[#252525] bg-[#111]">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-4 text-sm text-[#888] transition-colors hover:text-white"
      >
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          <span>Ground Truth Document</span>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-[#252525] p-4">
          <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-[#aaa]">
            {content}
          </pre>
        </div>
      )}
    </div>
  );
}
