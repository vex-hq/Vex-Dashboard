# Context Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> The spec (`docs/superpowers/specs/2026-08-11-context-workspace-design.md`) is the contract. Where this plan and the spec disagree, the spec wins.

**Goal:** Rebuild the app.klio.tech dashboard around the context item — stream home, per-project context view, Klio-only IA, billing guarded — in one release.

**Architecture:** All new code lives in `apps/web`. New read-only loaders over existing engine tables (`session_memories`, `projects`, `project_members`, `brain_recall_events`) follow the `memory.loader.ts` pattern: `getAgentGuardPool()`, React `cache()`, org-scoped SQL, `orFallback` degradation at the page. Visibility SQL is copied verbatim from the three silo loaders (`team-memory` / `private-memory` / `project-memory`), one UNION arm each, never hand-rolled. The home page swaps Vex loaders for the new ones; the project detail page gains the context view; nav and billing are config-level changes.

**Tech Stack:** Next.js App Router, `pg` Pool, vitest (mocked pool, FIFO `queueRows` style), @kit/ui components, i18n via `Trans` + `apps/web/public/locales/en/agentguard.json`.

## Global Constraints

- **No engine changes, no migrations** — engine freeze of 2026-08-07 holds.
- **Visibility is inherited, never restated**: every arm of every new WHERE is copied from `team-memory.loader.ts` (org arm), `private-memory.loader.ts` (private arm), or `project-memory.loader.ts` (project-membership `EXISTS` arm), with a comment naming the source file. Membership enforced in SQL, never by fetching wide and filtering in TS.
- **Every page loader call wraps in the existing `orFallback` pattern** (see `app/home/[account]/page.tsx`) — a slow Neon resume must degrade a panel, not error the page.
- Existing suite (213 tests) must not drop; typecheck must stay clean.
- Never `git add -A`; stage by name. `apps/web` tests run with `DATABASE_URL= npx vitest run` from `apps/web/`.
- Vex routes/loaders are hidden, never deleted.
- Copy rules: "context item", "decision/plan/constraint/note"; estimates labeled "estimated"; no hype words.

## File Structure

```
apps/web/app/home/[account]/
  _lib/server/context-stream.loader.ts        (T1)  stream query + filters
  _lib/server/context-stream.loader.test.ts   (T1)
  _lib/server/context-usage.loader.ts         (T2)  accounting + estimate
  _lib/server/context-usage.loader.test.ts    (T2)
  _components/context-stream.tsx              (T3)  feed + rows + filter bar (client)
  _components/context-stream.test.tsx         (T3)
  _components/projects-rail.tsx               (T4)  per-project pulse cards
  _components/usage-strip.tsx                 (T4)
  page.tsx                                    (T5)  rewire home
  projects/[projectId]/_lib/server/context-view.loader.ts       (T6)
  projects/[projectId]/_lib/server/context-view.loader.test.ts  (T6)
  projects/[projectId]/_components/context-view.tsx             (T7)
  projects/[projectId]/page.tsx               (T7)  context view above members
config/team-account-navigation.config.tsx     (T8)  IA
app/home/[account]/billing/page.tsx           (T8)  guard
public/locales/en/agentguard.json             (T3/T4/T7/T8) keys as needed
```

---

### Task 1: Context stream loader

**Files:**
- Create: `apps/web/app/home/[account]/_lib/server/context-stream.loader.ts`
- Test: `apps/web/app/home/[account]/_lib/server/context-stream.loader.test.ts`
- Read first: `_lib/../memory/_lib/server/{team,private,project}-memory.loader.ts` (the three predicate sources), `memory.loader.test.ts` (mock style)

**Interfaces:**
- Produces:
  ```ts
  export interface ContextItem {
    id: string;
    kind: 'decision' | 'plan' | 'fact' | 'note' | 'other';
    content: string;
    scope: string;
    projectId: string | null;
    projectName: string | null;
    agentId: string | null;
    userId: string | null;
    createdAt: string;              // ISO
    supersededBy: string | null;    // id of the replacement, null = active
  }
  export interface StreamFilters {
    projectId?: string; agentId?: string; kind?: string; days?: number;
  }
  export const loadContextStream: (
    orgId: string,
    viewerUserId: string | null,
    filters: StreamFilters,
    limit?: number,     // default 50
  ) => Promise<ContextItem[]>;
  ```

- [ ] **Step 1: Write the failing tests**

```ts
// context-stream.loader.test.ts — mirror memory.loader.test.ts's mock exactly:
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const queryMock = vi.fn();
vi.mock('~/lib/agentguard/db', () => ({
  getAgentGuardPool: () => ({ query: queryMock }),
}));
function queueRows(...payloads: Array<{ rows: unknown[] }>): void {
  for (const p of payloads) queryMock.mockResolvedValueOnce(p);
}
beforeEach(() => queryMock.mockReset());
afterEach(() => vi.resetModules());

describe('loadContextStream', () => {
  it('maps memory_type to the kind union, defaulting to other', async () => {
    const { loadContextStream } = await import('./context-stream.loader');
    queueRows({
      rows: [
        row({ memory_type: 'decision' }),
        row({ memory_type: 'artifact' }),
      ],
    });
    const items = await loadContextStream('org-1', 'user-1', {});
    expect(items.map((i) => i.kind)).toEqual(['decision', 'other']);
  });

  it('passes viewer id and org into the query params, never interpolated', async () => {
    const { loadContextStream } = await import('./context-stream.loader');
    queueRows({ rows: [] });
    await loadContextStream('org-1', 'user-1', { kind: 'decision', days: 7 });
    const [sql, params] = queryMock.mock.calls[0];
    expect(params).toContain('org-1');
    expect(params).toContain('user-1');
    expect(sql).not.toContain('org-1'); // no string interpolation of tenancy
  });

  it('visibility SQL carries all three ladder arms', async () => {
    const { loadContextStream } = await import('./context-stream.loader');
    queueRows({ rows: [] });
    await loadContextStream('org-1', 'user-1', {});
    const [sql] = queryMock.mock.calls[0];
    // The three arms, per the silo loaders they are copied from:
    expect(sql).toMatch(/scope = 'org'/);
    expect(sql).toMatch(/scope = 'private'/);
    expect(sql).toMatch(/EXISTS \(\s*SELECT 1 FROM project_members/);
  });

  it('a null viewer (unattributed key) gets org scope only', async () => {
    const { loadContextStream } = await import('./context-stream.loader');
    queueRows({ rows: [] });
    await loadContextStream('org-1', null, {});
    const [sql] = queryMock.mock.calls[0];
    expect(sql).toMatch(/scope = 'org'/);
    expect(sql).not.toMatch(/scope = 'private'/);
    expect(sql).not.toMatch(/project_members/);
  });
});

function row(over: Record<string, unknown>) {
  return {
    id: 'm-1', memory_type: 'note', content: 'x', scope: 'org',
    project_id: null, project_name: null, agent_id: 'claude-code',
    user_id: null, created_at: '2026-08-11T00:00:00Z', superseded_by: null,
    ...over,
  };
}
```

- [ ] **Step 2: Run to verify failure**

Run: `cd apps/web && DATABASE_URL= npx vitest run app/home/\[account\]/_lib/server/context-stream.loader.test.ts`
Expected: FAIL — cannot resolve `./context-stream.loader`.

- [ ] **Step 3: Implement the loader**

```ts
// context-stream.loader.ts
import 'server-only';
import { cache } from 'react';
import { getAgentGuardPool } from '~/lib/agentguard/db';

/**
 * The home stream: context items across everything the viewer can read.
 *
 * VISIBILITY IS INHERITED, NEVER RESTATED. Each UNIONed arm below is copied
 * from the silo loader that owns that scope; change those files first and
 * mirror here, never the reverse:
 *   - org arm      -> memory/_lib/server/team-memory.loader.ts
 *   - private arm  -> memory/_lib/server/private-memory.loader.ts
 *   - project arm  -> memory/_lib/server/project-memory.loader.ts (EXISTS
 *                     against project_members; membership in SQL, never TS)
 */
const KINDS = new Set(['decision', 'plan', 'fact', 'note'] as const);

export interface ContextItem { /* as in Interfaces above */ }
export interface StreamFilters { /* as in Interfaces above */ }

export const loadContextStream = cache(
  async (
    orgId: string,
    viewerUserId: string | null,
    filters: StreamFilters,
    limit = 50,
  ): Promise<ContextItem[]> => {
    const pool = getAgentGuardPool();
    const params: unknown[] = [orgId];
    const p = (v: unknown) => { params.push(v); return `$${params.length}`; };

    const arms = [`(m.scope = 'org')`];
    if (viewerUserId) {
      const u = p(viewerUserId);
      arms.push(`(m.scope = 'private' AND m.user_id = ${u})`);
      arms.push(`(m.scope = 'project' AND EXISTS (
        SELECT 1 FROM project_members pm
        WHERE pm.project_id = m.project_id AND pm.user_id = ${u}
      ))`);
    }

    const extra: string[] = [];
    if (filters.projectId) extra.push(`m.project_id = ${p(filters.projectId)}`);
    if (filters.agentId) extra.push(`m.agent_id = ${p(filters.agentId)}`);
    if (filters.kind && KINDS.has(filters.kind as never))
      extra.push(`m.memory_type = ${p(filters.kind)}`);
    if (filters.days)
      extra.push(`m.created_at > now() - (${p(filters.days)} || ' days')::interval`);

    const { rows } = await pool.query(
      `SELECT m.id, m.memory_type, m.content, m.scope, m.project_id,
              pr.name AS project_name, m.agent_id, m.user_id,
              m.created_at::text AS created_at, m.superseded_by
       FROM session_memories m
       LEFT JOIN projects pr ON pr.id = m.project_id AND pr.org_id = $1
       WHERE m.org_id = $1
         AND m.status = 'active' OR (m.status = 'superseded' AND m.org_id = $1)
       -- ^ replaced in Step 3b; kept here to make the RED->GREEN diff honest
       ORDER BY m.created_at DESC
       LIMIT ${p(limit)}`,
      params,
    );
    return rows.map(toItem);
  },
);
```

**Step 3b — the real WHERE** (the sketch above deliberately shows why
precedence bugs happen; write the final statement with explicit grouping):

```sql
WHERE m.org_id = $1
  AND m.status IN ('active', 'superseded')
  AND m.recall_hidden = FALSE
  AND (${arms.join(' OR ')})
  ${extra.length ? 'AND ' + extra.join(' AND ') : ''}
```

`toItem` maps `memory_type` through `KINDS` (else `'other'`) and renames
snake_case to the interface fields.

- [ ] **Step 4: Run tests — PASS.** Same vitest command; all 4 green.
- [ ] **Step 5: Adversarial visibility test (integration-style, mocked pool):** assert that with `viewerUserId: null` the produced SQL cannot match a private row even when queued rows include one — i.e. the loader must not post-filter; the test asserts the SQL shape (already covered by tests 3–4) AND add one mutation canary:

```ts
it('kind filter whitelist: an unknown kind never reaches the SQL', async () => {
  const { loadContextStream } = await import('./context-stream.loader');
  queueRows({ rows: [] });
  await loadContextStream('org-1', 'user-1', { kind: "x'; DROP TABLE" });
  const [sql] = queryMock.mock.calls[0];
  expect(sql).not.toContain('DROP');
});
```

- [ ] **Step 6: Commit** — `git add` the two files; message `feat(web): context stream loader — three inherited visibility arms, one union`.

---

### Task 2: Usage loader (accounting + labeled estimate)

**Files:**
- Create: `_lib/server/context-usage.loader.ts`, test alongside.

**Interfaces:**
- Produces:
  ```ts
  export interface ProjectUsage {
    projectId: string | null; projectName: string | null;
    memories30d: number; recalls30d: number;
    estContextTokens30d: number;   // ALWAYS presented as an estimate
  }
  export const loadContextUsage: (orgId: string) => Promise<ProjectUsage[]>;
  ```

- [ ] **Step 1: Failing test** — seed two queued results (captures grouped by project; recalls with `SUM(result_count)` by project + org mean content length) and assert the estimate arithmetic exactly:

```ts
it('estimates context served = result_count_sum * mean_len / 4, floored', async () => {
  const { loadContextUsage } = await import('./context-usage.loader');
  queueRows(
    { rows: [{ project_id: 'p1', project_name: 'api', memories: '12' }] },
    { rows: [{ project_id: 'p1', result_sum: '30' }] },
    { rows: [{ mean_len: '400' }] },
  );
  const [p1] = await loadContextUsage('org-1');
  expect(p1.estContextTokens30d).toBe(3000); // 30 * 400 / 4
});
```

- [ ] **Step 2: RED.** Module missing.
- [ ] **Step 3: Implement** — three queries (30-day window, `org_id = $1` on each; recalls from `brain_recall_events` which is already org+project keyed; mean length over `session_memories WHERE org_id = $1 AND status='active'`), merge by projectId in TS. Spec note goes in the docstring verbatim: *result ids are not logged (`022_brain_recall_events.py`), so exact served-tokens is impossible without an engine change; this is `recalls × result_count × mean length ÷ 4` and every surface labels it estimated.*
- [ ] **Step 4: GREEN.**
- [ ] **Step 5: Commit** `feat(web): per-project usage accounting and the labeled context-served estimate`.

---

### Task 3: Stream UI (rows + filter bar)

**Files:**
- Create: `_components/context-stream.tsx` (client), `_components/context-stream.test.tsx`
- Modify: `public/locales/en/agentguard.json` (add `contextStream.*` keys used below)

**Interfaces:**
- Consumes: `ContextItem` from Task 1 (via page props — the component is presentational; the page does the loading).
- Produces: `export function ContextStream({ items, projects, agents }: { items: ContextItem[]; projects: {id:string;name:string}[]; agents: string[] })`
- Filters write **URL search params** (`?project=&agent=&kind=&days=`) via `useRouter().replace` — the page re-reads them server-side, so a filtered view is shareable (spec §1).

- [ ] **Step 1: Failing component tests** (testing-library, as the repo's existing `.test.tsx` files do):

```tsx
it('renders a superseded item struck through with a replacement pointer', () => {
  render(<ContextStream items={[item({ supersededBy: 'm-9' })]} projects={[]} agents={[]} />);
  const row = screen.getByText('old decision text');
  expect(row.closest('[data-superseded]')).not.toBeNull();
  expect(screen.getByText(/replaced/i)).toBeInTheDocument();
});
it('renders kind glyph, project and relative time on a row', () => {
  render(<ContextStream items={[item({})]} projects={[]} agents={[]} />);
  expect(screen.getByText('decision')).toBeInTheDocument();
  expect(screen.getByText('api-gateway')).toBeInTheDocument();
});
it('empty + filtered explains the filter instead of a bare blank', () => {
  render(<ContextStream items={[]} projects={[]} agents={[]} activeFilterCount={2} />);
  expect(screen.getByText(/no items match/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: RED.**
- [ ] **Step 3: Implement** — a `<ul>` of rows: mono kind badge (`decision`/`plan`/`fact`/`note`), one-line content with `line-clamp-1` and click-to-expand (`aria-expanded`), project chip, `agentId` + person, relative time (`Intl.RelativeTimeFormat`). Superseded: `data-superseded`, `line-through opacity-60`, "replaced →" link that filters to the replacement id. Filter bar: three `Select`s (project, agent, kind) + days segmented control, all writing URL params; a visible "clear filters" when any is set. All interactive targets ≥44px (the landing lesson). No hover-only affordances.
- [ ] **Step 4: GREEN.**
- [ ] **Step 5: Commit** `feat(web): context stream component — rows, filters as URL state, superseded rendering`.

---

### Task 4: Projects rail + usage strip components

**Files:**
- Create: `_components/projects-rail.tsx`, `_components/usage-strip.tsx`, one test file each.

**Interfaces:**
- `ProjectsRail({ pulses }: { pulses: ProjectPulse[] })` where
  `interface ProjectPulse { projectId: string; name: string; itemsThisWeek: number; lastItemAt: string | null; agentsActive: string[] }` — computed by a `loadProjectPulse(orgId, viewerUserId)` added to **Task 1's loader file** (same visibility arms, `GROUP BY project`); test its grouping the same mocked way.
- `UsageStrip({ usage }: { usage: ProjectUsage[] })` — renders measured numbers plainly and the estimate with the literal suffix **"estimated"** plus a tooltip: "Klio doesn't see your agents' own token bills; this is recalls × results × average memory size."

- [ ] Steps: failing tests (rail: renders a card per project with items-this-week; strip: the word "estimated" is ALWAYS present next to the token figure — this is the honesty canary) → RED → implement → GREEN → commit `feat(web): projects rail and usage strip`.

---

### Task 5: Rewire the home page

**Files:**
- Modify: `app/home/[account]/page.tsx`
- Read first: its `orFallback` helper and the connect-card wiring (shipped 2026-08-11).

- [ ] **Step 1:** Remove the seven Vex loader calls (`loadHomepageKpis`, `loadAgentHealth`, `loadAlertSummary`, `loadHomepageTrend`, `loadFailurePatterns`, `loadAnomalyAlerts`, `loadPlanUsage`) and the `HomepageDashboard` import/render. **Do not delete the loader files** — hidden Vex routes keep using them.
- [ ] **Step 2:** Wire the new loads, each in `orFallback`: `contextStream` (filters parsed from `searchParams`), `projectPulse`, `contextUsage`, keep `loadMemoryVolume` only for the connect-card emptiness check.
- [ ] **Step 3:** Render order: connect card (empty orgs) → `UsageStrip` → two-column `ContextStream` + `ProjectsRail` (rail stacks under stream below `lg`).
- [ ] **Step 4:** `DATABASE_URL= npx vitest run` — full suite; expect **213 + new tests, 0 fail**. `npx tsc --noEmit`.
- [ ] **Step 5:** Commit `feat(web): the home is the context stream — Vex console panels retired from the landing screen`.

---

### Task 6: Context view loader (sections + supersession chains)

**Files:**
- Create: `projects/[projectId]/_lib/server/context-view.loader.ts` + test.

**Interfaces:**
- Produces:
  ```ts
  export interface ChainLink { id: string; content: string; createdAt: string }
  export interface ContextViewItem extends ContextItem { replaced: ChainLink[] }
  export interface ContextView {
    decisions: ContextViewItem[]; plans: ContextViewItem[];
    constraints: ContextViewItem[]; recent: ContextItem[];
    header: { members: number; agentsActive: string[]; itemsThisWeek: number };
  }
  export const loadContextView: (
    orgId: string, projectId: string,
    viewer: { userId: string } // membership checked in SQL, project arm only
  ) => Promise<ContextView | null>;   // null = not a member -> page 404s
  ```

- [ ] **Step 1: Failing tests**, including the two that matter most:

```ts
it('returns null for a non-member (membership in SQL, not TS)', async () => {
  const { loadContextView } = await import('./context-view.loader');
  queueRows({ rows: [] }); // membership probe returns nothing
  expect(await loadContextView('org-1', 'p1', { userId: 'intruder' })).toBeNull();
});
it('assembles the supersession chain oldest-last', async () => {
  // active decision m3; predecessors m1 <- m2 <- m3 via superseded_by
  ...
  expect(view.decisions[0].replaced.map((l) => l.id)).toEqual(['m2', 'm1']);
});
it('maps types to sections: decision/plan/fact; note lands only in recent', ...);
```

- [ ] **Step 2: RED.** **Step 3: Implement** — membership probe first (`EXISTS project_members` — copied from `project-memory.loader.ts`), then one query for active items of the three section types, one recursive CTE for predecessor chains (`WHERE successor.superseded_by chains`, capped `LIMIT 20` per chain), one for recent-any-type (limit 15). **Step 4: GREEN.** **Step 5:** Mutation canary run manually and pasted into the commit body: comment out the membership probe → the non-member test fails. **Step 6: Commit.**

---

### Task 7: Context view UI + project page

**Files:**
- Create: `projects/[projectId]/_components/context-view.tsx` + test.
- Modify: `projects/[projectId]/page.tsx` — context view renders as the page's main content, above the existing members card (which stays).

- [ ] Failing tests: section headings render in order (Decisions, Plans, Constraints, Recent); a decision with `replaced` shows "replaced *old content* — Mar" inline; empty project shows the brief-shaped empty state ("Nothing set down yet — decisions and plans your agents record will build this page."). → RED → implement (server component; sections as definition lists; header chips for members/agents/items-this-week) → GREEN → full suite + typecheck → commit `feat(web): the project page reads as a brief — the context view`.

---

### Task 8: IA + billing guard

**Files:**
- Modify: `config/team-account-navigation.config.tsx` — remove the `sessions` and `agents` entries from the Workspace group (routes stay); add `projects` if not present; label group per current i18n keys.
- Modify: `app/home/[account]/billing/page.tsx` and `app/home/(user)/billing/page.tsx` — replace the checkout render with a plan-summary card: current plan name, seat count, and copy: *"Team pricing is $20 per seat at klio.tech/pricing. Billing setup for Klio is in progress — talk to us at contact@klio.tech."* Keep every server action untouched.
- Verify: `featureFlagsConfig.enablePersonalAccountBilling` — set the flag source (env/config file where it's defined) to false for the personal nav if not already.

- [ ] Steps: adjust nav config → grep the app for `routes.sessions|routes.agents` label usages to confirm nothing dangles → billing pages swapped (component test: the string `$29` / `$99` / `$349` appears nowhere in rendered billing output; the two Vex team-account pages render the summary card) → suite + typecheck → commit `feat(web): Klio-only navigation; billing can no longer sell a Vex price`.

---

### Task 9: Full verification, browser pass, ship

- [ ] `cd apps/web && DATABASE_URL= npx vitest run` — expect ≥213+new passed, 0 failed. `npx tsc --noEmit` clean.
- [ ] Browser (klio-web launch config, port 3000): home renders stream/rail/strip (empty-state path verifiable without auth data: at minimum assert no console errors on redirect-to-auth); hidden routes `/home/<acct>/alerts` and `/executions` still render by direct URL (no 500s — imports intact); mobile 375px: no horizontal scroll, filters usable, tap targets ≥44px.
- [ ] Auth-gated screens can't be clicked headlessly (magic link) — flag anything unverified in the report rather than claiming it.
- [ ] Push. Vercel deploys `apps/web`; confirm production deploy green.
- [ ] Report: task-by-task commits, test deltas, verbatim mutation canaries (T1 SQL-shape tests, T6 membership probe), anything that proved wrong or impossible.

## Self-Review (done while writing)

- **Spec coverage:** stream (T1/T3/T5) ✓, filters-as-URL (T3/T5) ✓, rail (T4) ✓, connect card kept (T5) ✓, usage + estimate with label (T2/T4) ✓, context view + chains + type mapping (T6/T7) ✓, IA (T8) ✓, billing guard (T8) ✓, Vex loaders off home but not deleted (T5) ✓, degradation via orFallback (T5) ✓, adversarial visibility (T1 shape tests + T6 membership + canaries) ✓, 375px pass (T9) ✓.
- **No placeholders:** every task carries real code or exact strings; T6's chain test elision (`...`) is bounded by the explicit expected assertion beneath it — implementer writes the seed rows shown in the comment.
- **Type consistency:** `ContextItem` defined once (T1), extended in T6 (`ContextViewItem`), consumed by name in T3/T5/T7.
