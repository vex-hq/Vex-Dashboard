'use client';

import { useState, useTransition } from 'react';

import Link from 'next/link';

import type {
  ProjectDefaultScope,
  ProjectStripData,
} from '../../_lib/server/project-strip.loader';
import {
  setMyCaptureScopeAction,
  setProjectDefaultScopeAction,
} from '../../_lib/server/project-scope-actions';
import { L } from './shell-tokens';

/**
 * Who can see this project, and where its captures go — on the screen you
 * actually land on when you pick a project.
 *
 * THE COPY IS THE FEATURE. "scope=org" is a database value, not an answer to
 * the question a person is asking, which is "if I work in this project, who
 * ends up reading it?" So each setting is stated as that sentence, and the
 * control is labelled with the consequence rather than the field name.
 */
const SCOPE_SENTENCE: Record<ProjectDefaultScope, string> = {
  org: 'Captures in this project are shared with everyone in your team.',
  project: "Captures here are visible to this project's members.",
  private: 'Captures here stay private to whoever made them.',
};

const SCOPE_CHOICE: { value: ProjectDefaultScope; label: string }[] = [
  { value: 'private', label: 'Private to each person' },
  { value: 'project', label: 'This project’s members' },
  { value: 'org', label: 'Everyone in the team' },
];

export function ProjectStrip({
  data,
  accountSlug,
}: {
  data: ProjectStripData;
  accountSlug: string;
}) {
  const [pending, startTransition] = useTransition();
  const [scope, setScope] = useState<ProjectDefaultScope>(data.defaultScope);
  const [mine, setMine] = useState<'private' | null>(data.myOverride);
  const [error, setError] = useState<string | null>(null);

  // Widening publishes everyone's future captures, so only an admin may.
  // Narrowing back needs manage — see project-scope-actions for why.
  const isAdmin = data.viewerRole === 'admin';
  const canManage = isAdmin || data.viewerRole === 'manage';

  const changeScope = (next: ProjectDefaultScope) => {
    const widening = next !== 'private';

    if (widening ? !isAdmin : !canManage) return;

    const previous = scope;
    setScope(next);
    setError(null);

    startTransition(async () => {
      const result = await setProjectDefaultScopeAction({
        accountSlug,
        projectId: data.projectId,
        scope: next,
      });

      if (!result?.ok) {
        setScope(previous);
        setError("That didn't save. You may not have permission.");
      }
    });
  };

  const changeMine = (next: 'private' | null) => {
    const previous = mine;
    setMine(next);
    setError(null);

    startTransition(async () => {
      const result = await setMyCaptureScopeAction({
        accountSlug,
        projectId: data.projectId,
        mine: next === 'private' ? 'private' : 'default',
      });

      if (!result?.ok) {
        setMine(previous);
        setError("That didn't save.");
      }
    });
  };

  // What actually happens to THIS person's captures, which is not the project
  // setting whenever they have opted out.
  const effective =
    mine === 'private' && scope !== 'private'
      ? 'Your own captures here stay private — you have opted out.'
      : SCOPE_SENTENCE[scope];

  return (
    <section
      className="flex flex-col gap-3 rounded-[6px] border px-4 py-3"
      style={{ borderColor: L.line }}
      aria-label={`${data.name} sharing`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-[14px] font-[590]" style={{ color: L.ink }}>
          {data.name}
        </h2>

        <Link
          href={`/home/${accountSlug}/projects/${data.projectId}`}
          className="text-[12px] underline-offset-2 hover:underline"
          style={{ color: L.muted }}
        >
          {data.memberCount === 1
            ? '1 person has access'
            : `${data.memberCount} people have access`}
        </Link>
      </div>

      <p className="text-[13px] leading-relaxed" style={{ color: L.ink }}>
        {effective}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        {canManage ? (
          <label className="flex items-center gap-2 text-[12px]">
            <span style={{ color: L.muted }}>Where captures go</span>
            <select
              value={scope}
              disabled={pending}
              onChange={(e) =>
                changeScope(e.target.value as ProjectDefaultScope)
              }
              className="rounded-[4px] border px-2 py-1 text-[12px] disabled:opacity-60"
              style={{
                borderColor: L.line,
                background: 'transparent',
                color: L.ink,
              }}
            >
              {SCOPE_CHOICE.map((choice) => (
                <option
                  key={choice.value}
                  value={choice.value}
                  // Only an admin may widen. Rendering the option disabled
                  // rather than hiding it tells a manager the setting exists
                  // and who to ask, instead of silently truncating the list.
                  disabled={choice.value !== 'private' && !isAdmin}
                >
                  {choice.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label className="flex items-center gap-2 text-[12px]">
          <span style={{ color: L.muted }}>My captures</span>
          <select
            value={mine === 'private' ? 'private' : 'default'}
            disabled={pending}
            onChange={(e) =>
              changeMine(e.target.value === 'private' ? 'private' : null)
            }
            className="rounded-[4px] border px-2 py-1 text-[12px] disabled:opacity-60"
            style={{
              borderColor: L.line,
              background: 'transparent',
              color: L.ink,
            }}
          >
            <option value="default">Follow the project</option>
            <option value="private">Keep mine private</option>
          </select>
        </label>

        <Link
          href={`/home/${accountSlug}/projects/${data.projectId}`}
          className="rounded-[4px] border px-2 py-1 text-[12px]"
          style={{ borderColor: L.line, color: L.ink }}
        >
          Manage access
        </Link>

        {pending ? (
          <span className="text-[12px]" style={{ color: L.muted }}>
            Saving…
          </span>
        ) : null}
      </div>

      {error ? (
        <p className="text-[12px]" style={{ color: L.danger }} role="alert">
          {error}
        </p>
      ) : null}

      <p className="text-[11px] leading-relaxed" style={{ color: L.muted }}>
        Changes apply to captures from now on. Nothing already stored moves.
      </p>
    </section>
  );
}
