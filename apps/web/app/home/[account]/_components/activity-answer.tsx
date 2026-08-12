'use client';

import { useTranslation } from 'react-i18next';

import { formatRelativeTime } from '~/lib/agentguard/formatters';

import { buildHubAnswerLineCase } from '../_lib/hub-answer-line';
import type { HubSummary } from '../_lib/server/hub-summary.loader';
import { Sparkline } from './sparkline';

/**
 * Numbers render at title-4 scale (2rem, weight 590) in primary ink,
 * referencing the design tokens directly (`styles/shadcn-ui.css`) rather
 * than a fixed Tailwind size class, so a future token change flows through
 * here automatically. `tabular-nums` keeps digits from jittering as counts
 * change.
 */
const NUMBER_VALUE_CLASS =
  'text-foreground tabular-nums font-[590] text-[length:var(--title-4)] leading-[var(--title-4--line-height)] tracking-[var(--title-4--letter-spacing)]';
const NUMBER_LABEL_CLASS =
  'text-foreground text-[length:var(--text-large)] leading-[var(--text-large--line-height)]';

export interface ActivityAnswerProps {
  summary: HubSummary;
}

/**
 * Band 1 — the answer line. The first thing on the Hub must literally
 * answer "what happened": a sentence built from real data, with the counts
 * large and in primary ink and the connective words in secondary ink (the
 * `<p>`'s own `text-muted-foreground`, overridden per-number by
 * {@link AnswerNumber}). See `hub-answer-line.ts` for the case selection —
 * decisions/plans first, honest fallbacks to facts/notes/empty otherwise.
 */
export function ActivityAnswer({ summary }: ActivityAnswerProps) {
  const { t } = useTranslation('agentguard');
  const answerCase = buildHubAnswerLineCase(summary);
  const agentCount = summary.agentsActive7d.length;

  return (
    <section
      aria-label={t('hub.answer.sectionLabel', 'This week at a glance')}
      className="border-border bg-card flex flex-col gap-4 rounded-lg border p-6 shadow-[var(--shadow-hard-sm)]"
    >
      <p
        data-testid="hub-answer-line"
        className="text-muted-foreground flex max-w-3xl flex-wrap items-baseline gap-x-2 gap-y-1 text-[length:var(--text-regular)] leading-[var(--text-regular--line-height)] tracking-[var(--text-regular--letter-spacing)]"
      >
        <AnswerSentence answerCase={answerCase} />
      </p>

      <div
        data-testid="hub-answer-meta"
        className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-[length:var(--text-small)]"
      >
        <span data-testid="hub-last-activity">
          {summary.lastActivityAt
            ? formatRelativeTime(summary.lastActivityAt)
            : t('hub.answer.noActivityYet', 'No activity yet')}
        </span>
        <span aria-hidden="true">·</span>
        <span data-testid="hub-agents-active">
          {t('hub.answer.agentsActive', {
            count: agentCount,
            defaultValue: `${agentCount} ${agentCount === 1 ? 'agent' : 'agents'} active`,
          })}
        </span>
      </div>

      <Sparkline
        series={summary.volume30d}
        windowDays={30}
        width={640}
        height={56}
        className="h-14 w-full"
      />
    </section>
  );
}

function AnswerNumber({ value, label }: { value: number; label: string }) {
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className={NUMBER_VALUE_CLASS}>{value.toLocaleString('en-US')}</span>
      <span className={NUMBER_LABEL_CLASS}>{label}</span>
    </span>
  );
}

function AnswerSentence({
  answerCase,
}: {
  answerCase: ReturnType<typeof buildHubAnswerLineCase>;
}) {
  const { t } = useTranslation('agentguard');

  const decisionsLabel = t('hub.answer.decisions', 'decisions');
  const plansLabel = t('hub.answer.plans', 'plans');
  const projectsLabel = t('hub.answer.projects', 'projects');
  const factsLabel = t('hub.answer.facts', 'facts');
  const notesLabel = t('hub.answer.notes', 'notes');
  const andWord = t('hub.answer.and', 'and');
  const landedAcross = t('hub.answer.landedAcross', 'landed across');
  const landedThisWeek = t('hub.answer.landedThisWeek', 'landed this week.');
  const thisWeek = t('hub.answer.thisWeek', 'this week.');

  switch (answerCase.kind) {
    case 'decisionsAndPlans':
      return (
        <>
          <AnswerNumber value={answerCase.decisions} label={decisionsLabel} />
          <span>{andWord}</span>
          <AnswerNumber value={answerCase.plans} label={plansLabel} />
          {answerCase.projects > 0 ? (
            <>
              <span>{landedAcross}</span>
              <AnswerNumber value={answerCase.projects} label={projectsLabel} />
              <span>{thisWeek}</span>
            </>
          ) : (
            <span>{landedThisWeek}</span>
          )}
        </>
      );

    case 'decisionsOnly':
      return (
        <>
          <AnswerNumber value={answerCase.decisions} label={decisionsLabel} />
          {answerCase.projects > 0 ? (
            <>
              <span>{landedAcross}</span>
              <AnswerNumber value={answerCase.projects} label={projectsLabel} />
              <span>{thisWeek}</span>
            </>
          ) : (
            <span>{landedThisWeek}</span>
          )}
        </>
      );

    case 'plansOnly':
      return (
        <>
          <AnswerNumber value={answerCase.plans} label={plansLabel} />
          {answerCase.projects > 0 ? (
            <>
              <span>{landedAcross}</span>
              <AnswerNumber value={answerCase.projects} label={projectsLabel} />
              <span>{thisWeek}</span>
            </>
          ) : (
            <span>{landedThisWeek}</span>
          )}
        </>
      );

    case 'factsOnly':
      return (
        <>
          <span>{t('hub.answer.yourAgentsRecorded', 'Your agents recorded')}</span>
          <AnswerNumber value={answerCase.facts} label={factsLabel} />
          <span>
            {t('hub.answer.thisWeekNoDecisions', 'this week — no decisions yet.')}
          </span>
        </>
      );

    case 'notesOnly':
      return (
        <>
          <span>{t('hub.answer.yourAgentsRecorded', 'Your agents recorded')}</span>
          <AnswerNumber value={answerCase.notes} label={notesLabel} />
          <span>
            {t('hub.answer.thisWeekNoDecisions', 'this week — no decisions yet.')}
          </span>
        </>
      );

    case 'empty':
      return <span>{t('hub.answer.empty', 'No activity recorded this week.')}</span>;
  }
}
