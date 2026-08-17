'use client';

import { useMemo, useState } from 'react';

import type { ShellContextItem } from '../../_lib/server/shell-context.types';
import { ContextTable, EmptyState } from './context-table';
import { GroupLabel, ShellNote, StatCards } from './shell-chrome';
import { ItemDrawer } from './item-drawer';

/**
 * The shared/private split: two labelled groups, two counts, one share action.
 *
 * VISIBILITY IS INHERITED, NEVER RESTATED. The two groups arrive as two arrays
 * from two loaders with two hard-coded predicates. This component does not
 * filter by scope and must never start to — a client-side split would put the
 * security boundary in the browser, where the rows have already been sent.
 *
 * The grouping here is presentational only. Whether a row may be on this screen
 * at all was decided in SQL.
 */
export function SharedView({
  shared,
  mine,
  accountSlug,
}: {
  shared: readonly ShellContextItem[];
  mine: readonly ShellContextItem[];
  accountSlug: string;
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  const open = useMemo(
    () => [...shared, ...mine].find((i) => i.id === openId) ?? null,
    [shared, mine, openId],
  );

  const sharedCount = shared.length;
  const mineCount = mine.length;

  return (
    <div className="flex flex-col gap-4">
      <StatCards
        stats={[
          {
            value: sharedCount.toLocaleString(),
            label: 'shared with the team',
          },
          { value: mineCount.toLocaleString(), label: 'private to you' },
        ]}
      />

      <ShellNote>
        {sharedCount === 0
          ? `None of your ${mineCount.toLocaleString()} items are shared. Sharing is what makes this a team brain — open any row to share it.`
          : `Only ${sharedCount.toLocaleString()} of ${(sharedCount + mineCount).toLocaleString()} items are shared. Sharing is what makes this a team brain — open any row to share it.`}
      </ShellNote>

      <section>
        <GroupLabel>Shared</GroupLabel>
        {sharedCount === 0 ? (
          <EmptyState
            title="Nothing shared yet"
            body="Open a private item and share it — everyone on your team can then use it."
          />
        ) : (
          <ContextTable
            items={shared}
            selectedId={openId}
            onSelect={setOpenId}
          />
        )}
      </section>

      <section>
        <GroupLabel>Private to you</GroupLabel>
        <ContextTable
          items={mine}
          selectedId={openId}
          onSelect={setOpenId}
          emptyTitle="Nothing private"
          emptyBody="Everything you have captured is shared with the team."
        />
      </section>

      <ItemDrawer
        item={open}
        accountSlug={accountSlug}
        onClose={() => setOpenId(null)}
      />
    </div>
  );
}
