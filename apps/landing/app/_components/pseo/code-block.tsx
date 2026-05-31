'use client';

import { useState } from 'react';

export function CodeBlock({
  code,
  language = 'python',
}: {
  code: string;
  language?: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="group relative my-4 rounded-xl border border-border bg-background">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <span className="text-xs text-muted-foreground">{language}</span>
        <button
          onClick={copy}
          className="text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-sm leading-relaxed text-muted-foreground">
        <code>{code}</code>
      </pre>
    </div>
  );
}
