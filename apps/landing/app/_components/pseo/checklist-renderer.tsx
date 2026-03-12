'use client';

import { useState } from 'react';

import type { ChecklistPage } from '~/lib/pseo/types';

import { CtaBanner } from './cta-banner';
import { SeverityBadge } from './severity-badge';

export function ChecklistRenderer({ checklist }: { checklist: ChecklistPage }) {
  const { content } = checklist;
  const totalItems = content.sections.reduce((sum, s) => sum + s.items.length, 0);
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const progress = totalItems > 0 ? Math.round((checked.size / totalItems) * 100) : 0;

  return (
    <div>
      {/* Intro */}
      <p className="mb-8 text-lg leading-relaxed text-[#a2a2a2]">{content.intro}</p>

      {/* Progress bar */}
      <div className="mb-10 rounded-lg border border-[#252525] bg-[#0a0a0a] p-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-[#a2a2a2]">Progress</span>
          <span className="font-mono text-emerald-400">
            {checked.size}/{totalItems} ({progress}%)
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[#252525]">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Sections */}
      {content.sections.map((section, si) => (
        <div key={si} className="mb-10">
          <h2 className="mb-2 text-xl font-bold text-white">{section.heading}</h2>
          <p className="mb-4 text-sm text-[#a2a2a2]">{section.description}</p>
          <div className="grid gap-2">
            {section.items.map((item, ii) => {
              const id = `${si}-${ii}`;
              const isChecked = checked.has(id);
              return (
                <label
                  key={id}
                  className={`flex cursor-pointer gap-3 rounded-lg border p-3 transition-colors ${
                    isChecked
                      ? 'border-emerald-500/30 bg-emerald-500/5'
                      : 'border-[#252525] bg-[#0a0a0a] hover:border-[#333]'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggle(id)}
                    className="mt-1 h-4 w-4 rounded border-[#585858] bg-transparent text-emerald-500 accent-emerald-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm font-medium ${isChecked ? 'text-[#585858] line-through' : 'text-white'}`}
                      >
                        {item.label}
                      </span>
                      <SeverityBadge level={item.priority} />
                    </div>
                    <p className="mt-0.5 text-xs text-[#585858]">{item.description}</p>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      ))}

      {/* Regulatory Notes */}
      <div className="mb-10 rounded-xl border border-orange-500/20 bg-orange-500/5 p-6">
        <h2 className="mb-3 text-lg font-bold text-white">{content.regulatoryNotes.heading}</h2>
        <ul className="grid gap-2">
          {content.regulatoryNotes.notes.map((note, i) => (
            <li key={i} className="flex gap-2 text-sm text-[#a2a2a2]">
              <span className="text-orange-400">&#9888;</span>
              {note}
            </li>
          ))}
        </ul>
      </div>

      {/* CTA */}
      <CtaBanner heading={content.cta.heading} description={content.cta.description} />
    </div>
  );
}
