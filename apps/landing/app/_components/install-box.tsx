'use client';

import { useCallback, useState } from 'react';

const commands = {
  python: 'pip install vex-sdk',
  typescript: 'npm install @vex_dev/sdk',
} as const;

type Lang = keyof typeof commands;

export function InstallBox() {
  const [lang, setLang] = useState<Lang>('python');
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(commands[lang]).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [lang]);

  return (
    <div className="mx-auto w-full max-w-[480px]">
      <div className="overflow-hidden border border-[#252525] bg-[#161616]">
        <div className="flex border-b border-[#252525]">
          {(['python', 'typescript'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setLang(tab)}
              className={`flex-1 border-b-2 px-4 py-2.5 text-[13px] font-medium transition-colors ${
                lang === tab
                  ? 'border-b-emerald-500 text-white'
                  : 'border-transparent text-[#a2a2a2] hover:text-white'
              }`}
            >
              {tab === 'python' ? 'Python' : 'TypeScript'}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between px-5 py-4">
          <code className="font-mono text-sm text-[#a2a2a2]">
            <span className="text-emerald-500">$</span> {commands[lang]}
          </code>
          <button
            onClick={handleCopy}
            aria-label="Copy install command"
            className="rounded-md p-1.5 text-[#a2a2a2] transition-colors hover:bg-[#252525] hover:text-white"
          >
            {copied ? (
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="text-emerald-500"
              >
                <path d="M4 8l3 3 5-5" />
              </svg>
            ) : (
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <rect x="5" y="5" width="9" height="9" rx="1.5" />
                <path d="M3 11V3a1.5 1.5 0 011.5-1.5H11" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <p className="mt-3 text-center text-[13px] text-[#a2a2a2]">
        Zero vendor lock-in &middot;{' '}
        <a
          href="https://github.com/Vex-AI-Dev/Vex"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-white"
        >
          Python SDK
        </a>{' '}
        &middot;{' '}
        <a
          href="https://github.com/Vex-AI-Dev/Typescript-sdk"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-white"
        >
          TypeScript SDK
        </a>
      </p>
    </div>
  );
}
