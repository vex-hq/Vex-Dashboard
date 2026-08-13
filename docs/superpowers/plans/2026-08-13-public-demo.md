# Public Klio Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a public page at `klio.tech/demo` where an anonymous visitor chats with an agent backed by real Klio recall and watches the context being fetched.

**Architecture:** A Next.js route handler in `apps/landing` is the only network surface. It holds a server-only Klio API key, forwards each visitor's ephemeral id as `X-Vex-Agent`, calls the engine's existing `POST /capture/recall` and `POST /capture/event` REST endpoints, and calls an LLM through the LiteLLM gateway. Visitor writes land at `scope='agent'`, which the engine already isolates per agent. No engine change.

**Tech Stack:** Next.js App Router (`apps/landing`), TypeScript, vitest + jsdom, Tailwind, the Klio engine REST API, LiteLLM gateway.

## Global Constraints

- **No Klio credential may reach the browser.** Never use a `NEXT_PUBLIC_*` variable for a key. `NEXT_PUBLIC_*` is inlined into the client bundle at build time. `apps/landing/app/live/_lib/verify-action.ts:4` does exactly this and is the anti-pattern being replaced.
- **Engine base URL:** `https://api.klio.tech`. Recall is `POST /capture/recall`; passive write is `POST /capture/event`.
- **Auth headers:** `X-Vex-Key: <server-held demo key>` and `X-Vex-Agent: <visitor id>`.
- **Recall request fields:** `{ query: string, limit: number, scope: "org" | "agent" | "private" }`. Default limit 12.
- **Write request fields:** `{ content: string, memory_type: "observation"|"note"|"memory"|"plan"|"decision", metadata?: object, session_id?: string }`.
- **Scope is a TOP-LEVEL request field, never `metadata.scope`.** `metadata` is only persisted on the row (`capture.py:183`); it is not interpreted. `CaptureEventRequest.scope` is `Literal["org", "agent"]`.
- **THE DEMO API KEY MUST BE PROVISIONED WITH NO `created_by` USER.** This is the single most important line in this plan. `_hook_write_scope` (`capture.py:253`) discards the caller's declared scope whenever the request is attributable: `if user_id: return "private", user_id`. Only an *unattributable* caller keeps `declared_scope`. Every normally-provisioned key carries a `created_by`, so a normal demo key would make **every visitor's write land at `scope='private'` owned by that one shared user** — and the next visitor's recall, resolving the same user, would read it back. That is a cross-visitor leak. An unattributable key logs a warning per write (`capture.py:288`); that warning is expected and correct here.
- **Visitor isolation depends on `scope='agent'`.** Enforced in `services/shared/shared/memory.py` — retrieval at :1678, write-dedup at :1139, and cross-agent refusal at :1327. It is marked "deprecated" in `capture.py:240` (discouraged for new product surfaces, not removed). Task 1 pins it with a test, and Task 1 Step 6 proves it against the live engine — a mocked `fetch` can only prove the request shape, never the engine's behaviour.
- **Reading both the shared corpus and the visitor's own writes takes two recalls.** `scope='org'` returns the shared brain; `scope='agent'` returns that visitor's rows. Neither includes the other. Merge them in the client wrapper.
- **The LLM is given no tools.** Visitor text is hostile input; the model receives context in a system prompt and returns text only. There is no tool-calling surface for an injected instruction to reach.
- **No screen may render empty.** Empty states must be impossible by construction. Showing an empty feature is the failure this whole project exists to fix.
- **The "without Klio" arm must genuinely run without recall.** Never a canned weak answer — that would be a lie about our own product, findable in one network-tab read.
- **Tests:** vitest, files named `*.test.ts` / `*.test.tsx`. The `~/` alias resolves to `apps/landing/app`. Run from `apps/landing`.
- Copy rules from `.agents/product-marketing.md`: never lead with token savings; never say "branches", "PRs" or "merges"; avoid "brain" in public copy.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `apps/landing/app/demo/_lib/engine-client.ts` | Server-only. Typed wrapper over the engine's recall + event endpoints. The only place the API key is read. |
| `apps/landing/app/demo/_lib/visitor.ts` | Server-only. Issues and reads the ephemeral visitor cookie. |
| `apps/landing/app/demo/_lib/rate-limit.ts` | Server-only. Per-IP and per-visitor counters, global cap, kill switch. |
| `apps/landing/app/demo/_lib/seed/harbor.ts` | The seeded corpus as data (also consumed by the seeding script). |
| `apps/landing/app/demo/_lib/seed/seed-demo-org.ts` | One-shot script that pushes the corpus into the demo org. |
| `apps/landing/app/api/demo/chat/route.ts` | The single network surface. Orchestrates rate limit → recall → LLM → write. |
| `apps/landing/app/demo/_components/demo-chat.tsx` | Chat transcript + composer. |
| `apps/landing/app/demo/_components/recall-panel.tsx` | Shows the recall query, returned facts with scores, and write events. |
| `apps/landing/app/demo/_components/klio-toggle.tsx` | The With Klio / Without Klio control. |
| `apps/landing/app/demo/page.tsx` | Replaced. Composes the above. |

---

### Task 1: Engine client and visitor identity

**Files:**
- Create: `apps/landing/app/demo/_lib/engine-client.ts`
- Create: `apps/landing/app/demo/_lib/visitor.ts`
- Test: `apps/landing/app/demo/_lib/engine-client.test.ts`

**Interfaces:**
- Produces: `recallMemories({ query, visitorId, scope, limit }): Promise<RecalledFact[]>`, `writeMemory({ content, visitorId, memoryType }): Promise<void>`, `RecalledFact = { id: string; content: string; score: number; memoryType: string; createdAt: string; supersedes?: { id: string; content: string; reason: string; retiredAt: string } }`, `getOrCreateVisitorId(): Promise<string>`.

- [ ] **Step 1: Write the failing test**

```ts
// apps/landing/app/demo/_lib/engine-client.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { recallMemories, writeMemory } from './engine-client';

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  vi.stubEnv('KLIO_DEMO_API_KEY', 'test-key');
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({
    ok: true,
    json: async () => ({ memories: [], count: 0 }),
  });
});

describe('recallMemories', () => {
  it('sends the visitor id as X-Vex-Agent so the engine isolates per visitor', async () => {
    await recallMemories({ query: 'why postgres', visitorId: 'visitor-abc' });

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers['X-Vex-Agent']).toBe('visitor-abc');
    expect(init.headers['X-Vex-Key']).toBe('test-key');
  });

  it('reads the shared corpus AND the visitor\'s own rows — neither scope includes the other', async () => {
    await recallMemories({ query: 'why postgres', visitorId: 'v1', limit: 6 });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const scopes = fetchMock.mock.calls.map((c) => JSON.parse(c[1].body).scope);
    expect(scopes).toEqual(['org', 'agent']);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.klio.tech/capture/recall');
    expect(JSON.parse(init.body)).toEqual({ query: 'why postgres', limit: 6, scope: 'org' });
  });

  it('never reads a NEXT_PUBLIC variable for the key', async () => {
    const source = await import('node:fs').then((fs) =>
      fs.readFileSync(new URL('./engine-client.ts', import.meta.url), 'utf8'),
    );
    expect(source).not.toMatch(/NEXT_PUBLIC/);
  });

  it('returns [] rather than throwing when the engine errors, so the page never breaks', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 503, json: async () => ({}) });
    await expect(recallMemories({ query: 'x', visitorId: 'v1' })).resolves.toEqual([]);
  });
});

describe('writeMemory', () => {
  it("declares scope='agent' as a TOP-LEVEL field, not inside metadata", async () => {
    await writeMemory({ content: 'we run two-week sprints', visitorId: 'v1' });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.klio.tech/capture/event');
    const body = JSON.parse(init.body);
    // metadata is only persisted on the row (capture.py:183); it is never
    // read to decide scope. A scope hidden in metadata is silently ignored,
    // and the write lands wherever _hook_write_scope decides instead.
    expect(body.scope).toBe('agent');
    expect(body.metadata?.scope).toBeUndefined();
    expect(init.headers['X-Vex-Agent']).toBe('v1');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd apps/landing && pnpm vitest run app/demo/_lib/engine-client.test.ts`
Expected: FAIL — `Failed to resolve import "./engine-client"`.

- [ ] **Step 3: Write the implementation**

```ts
// apps/landing/app/demo/_lib/engine-client.ts
import 'server-only';

const ENGINE_URL = process.env.KLIO_ENGINE_URL ?? 'https://api.klio.tech';

// Read at call time, not module scope: module scope evaluates during build,
// where the variable is absent, and would bake in an empty key.
function demoKey(): string {
  return process.env.KLIO_DEMO_API_KEY ?? '';
}

export interface SupersededBelief {
  id: string;
  content: string;
  reason: string;
  retiredAt: string;
}

export interface RecalledFact {
  id: string;
  content: string;
  score: number;
  memoryType: string;
  createdAt: string;
  supersedes?: SupersededBelief;
}

interface RecallArgs {
  query: string;
  visitorId: string;
  limit?: number;
}

function headers(visitorId: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-Vex-Key': demoKey(),
    'X-Vex-Agent': visitorId,
  };
}

async function recallOneScope(
  query: string,
  visitorId: string,
  scope: 'org' | 'agent',
  limit: number,
): Promise<RecalledFact[]> {
  try {
    const response = await fetch(`${ENGINE_URL}/capture/recall`, {
      method: 'POST',
      headers: headers(visitorId),
      body: JSON.stringify({ query, limit, scope }),
      cache: 'no-store',
    });

    if (!response.ok) return [];

    const payload = (await response.json()) as { memories?: unknown[] };
    return (payload.memories ?? []).map(toFact);
  } catch {
    // A demo that 500s is worse than a demo with a thin panel.
    return [];
  }
}

/**
 * Two calls, deliberately. `scope='org'` returns the shared Harbor corpus;
 * `scope='agent'` returns only what THIS visitor wrote. Neither scope
 * includes the other, so the write-loop moment needs both. Ordered
 * org-then-agent so the visitor's own line surfaces last and reads as new.
 */
export async function recallMemories({
  query,
  visitorId,
  limit = 12,
}: RecallArgs): Promise<RecalledFact[]> {
  const [shared, own] = await Promise.all([
    recallOneScope(query, visitorId, 'org', limit),
    recallOneScope(query, visitorId, 'agent', limit),
  ]);

  const seen = new Set<string>();
  return [...shared, ...own].filter((f) => {
    if (seen.has(f.id)) return false;
    seen.add(f.id);
    return true;
  });
}

function toFact(raw: unknown): RecalledFact {
  const m = raw as Record<string, unknown>;
  const superseded = m.supersedes as Record<string, unknown> | undefined;

  return {
    id: String(m.id ?? ''),
    content: String(m.content ?? ''),
    score: typeof m.score === 'number' ? m.score : 0,
    memoryType: String(m.memory_type ?? 'memory'),
    createdAt: String(m.created_at ?? ''),
    supersedes: superseded
      ? {
          id: String(superseded.id ?? ''),
          content: String(superseded.content ?? ''),
          reason: String(superseded.reason ?? ''),
          retiredAt: String(superseded.retired_at ?? ''),
        }
      : undefined,
  };
}

interface WriteArgs {
  content: string;
  visitorId: string;
  memoryType?: 'observation' | 'note' | 'memory' | 'plan' | 'decision';
}

export async function writeMemory({
  content,
  visitorId,
  memoryType = 'observation',
}: WriteArgs): Promise<void> {
  try {
    await fetch(`${ENGINE_URL}/capture/event`, {
      method: 'POST',
      headers: headers(visitorId),
      body: JSON.stringify({
        content,
        memory_type: memoryType,
        // TOP-LEVEL scope. This is what keeps one visitor's writes invisible
        // to every other visitor (memory.py:1327 refuses a cross-agent read).
        // It only survives if the demo key is UNATTRIBUTABLE — see Global
        // Constraints. With a created_by user, _hook_write_scope discards this
        // and writes 'private' under one shared owner, leaking across visitors.
        scope: 'agent',
        metadata: { source: 'public-demo' },
        session_id: visitorId,
      }),
      cache: 'no-store',
    });
  } catch {
    // A failed write must not break the reply the visitor is waiting on.
  }
}
```

```ts
// apps/landing/app/demo/_lib/visitor.ts
import 'server-only';

import { cookies } from 'next/headers';

const COOKIE = 'klio_demo_visitor';
const TTL_SECONDS = 60 * 60 * 24;

export async function getOrCreateVisitorId(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(COOKIE)?.value;
  if (existing) return existing;

  const id = `demo-${crypto.randomUUID()}`;
  jar.set(COOKIE, id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: TTL_SECONDS,
    path: '/demo',
  });
  return id;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd apps/landing && pnpm vitest run app/demo/_lib/engine-client.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Prove isolation against the LIVE engine**

The unit tests above mock `fetch`, so they prove only what we *send*. They cannot
prove the engine isolates — and isolation is the security guarantee this whole
page rests on. Run this against the real demo key before going further.

```bash
# Visitor A writes something at agent scope.
curl -s -X POST "$KLIO_ENGINE_URL/capture/event" \
  -H "X-Vex-Key: $KLIO_DEMO_API_KEY" -H 'X-Vex-Agent: demo-visitor-A' \
  -H 'Content-Type: application/json' \
  -d '{"content":"CANARY visitor A private sentinel","scope":"agent","memory_type":"observation"}'

# Visitor B must NOT be able to see it, on either scope.
echo '--- B agent scope (must be empty) ---'
curl -s -X POST "$KLIO_ENGINE_URL/capture/recall" \
  -H "X-Vex-Key: $KLIO_DEMO_API_KEY" -H 'X-Vex-Agent: demo-visitor-B' \
  -H 'Content-Type: application/json' \
  -d '{"query":"CANARY sentinel","scope":"agent","limit":10}' | grep -c CANARY

echo '--- B org scope (must be empty) ---'
curl -s -X POST "$KLIO_ENGINE_URL/capture/recall" \
  -H "X-Vex-Key: $KLIO_DEMO_API_KEY" -H 'X-Vex-Agent: demo-visitor-B' \
  -H 'Content-Type: application/json' \
  -d '{"query":"CANARY sentinel","scope":"org","limit":10}' | grep -c CANARY

echo '--- A agent scope (must find it) ---'
curl -s -X POST "$KLIO_ENGINE_URL/capture/recall" \
  -H "X-Vex-Key: $KLIO_DEMO_API_KEY" -H 'X-Vex-Agent: demo-visitor-A' \
  -H 'Content-Type: application/json' \
  -d '{"query":"CANARY sentinel","scope":"agent","limit":10}' | grep -c CANARY
```

Expected: `0`, `0`, `1`.

**If either B check returns non-zero, STOP.** The demo key has a `created_by`
user, `_hook_write_scope` is rewriting the scope to `'private'` under one shared
owner, and the page would show visitors each other's text. Re-provision the key
with no user and re-run. Do not proceed past this step on a failing result.

- [ ] **Step 6: Commit**

```bash
git add apps/landing/app/demo/_lib/engine-client.ts apps/landing/app/demo/_lib/visitor.ts apps/landing/app/demo/_lib/engine-client.test.ts
git commit -m "feat(demo): server-only engine client and ephemeral visitor identity"
```

---

### Task 2: Rate limiting, global cap and kill switch

**Files:**
- Create: `apps/landing/app/demo/_lib/rate-limit.ts`
- Test: `apps/landing/app/demo/_lib/rate-limit.test.ts`

**Interfaces:**
- Produces: `checkLimits({ ip, visitorId }): { allowed: boolean; reason?: 'disabled' | 'ip' | 'session' | 'daily'; message?: string }`, `recordMessage({ ip, visitorId }): void`, `resetLimitsForTest(): void`.

The engine rate-limits only its OAuth path (`services/mcp-server/app/oauth_middleware.py`). Recall has none, so this page must bring its own.

- [ ] **Step 1: Write the failing test**

```ts
// apps/landing/app/demo/_lib/rate-limit.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { checkLimits, recordMessage, resetLimitsForTest } from './rate-limit';

beforeEach(() => {
  resetLimitsForTest();
  vi.stubEnv('DEMO_ENABLED', 'true');
  vi.stubEnv('DEMO_DAILY_MESSAGE_CAP', '1000');
});

describe('checkLimits', () => {
  it('allows a first message', () => {
    expect(checkLimits({ ip: '1.1.1.1', visitorId: 'v1' }).allowed).toBe(true);
  });

  it('blocks after 20 messages from one IP', () => {
    for (let i = 0; i < 20; i++) recordMessage({ ip: '1.1.1.1', visitorId: `v${i}` });
    const result = checkLimits({ ip: '1.1.1.1', visitorId: 'v-new' });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('ip');
  });

  it('blocks after 30 messages in one visitor session', () => {
    for (let i = 0; i < 30; i++) recordMessage({ ip: `10.0.0.${i}`, visitorId: 'v1' });
    const result = checkLimits({ ip: '10.0.0.99', visitorId: 'v1' });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('session');
  });

  it('blocks everything when the global daily cap is reached', () => {
    vi.stubEnv('DEMO_DAILY_MESSAGE_CAP', '2');
    recordMessage({ ip: '1.1.1.1', visitorId: 'v1' });
    recordMessage({ ip: '2.2.2.2', visitorId: 'v2' });
    const result = checkLimits({ ip: '3.3.3.3', visitorId: 'v3' });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('daily');
  });

  it('blocks everything when the kill switch is off', () => {
    vi.stubEnv('DEMO_ENABLED', 'false');
    const result = checkLimits({ ip: '1.1.1.1', visitorId: 'v1' });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('disabled');
  });

  it('always returns a message the UI can show', () => {
    vi.stubEnv('DEMO_ENABLED', 'false');
    expect(checkLimits({ ip: '1.1.1.1', visitorId: 'v1' }).message).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd apps/landing && pnpm vitest run app/demo/_lib/rate-limit.test.ts`
Expected: FAIL — `Failed to resolve import "./rate-limit"`.

- [ ] **Step 3: Write the implementation**

```ts
// apps/landing/app/demo/_lib/rate-limit.ts
import 'server-only';

const IP_LIMIT = 20;
const IP_WINDOW_MS = 10 * 60 * 1000;
const SESSION_LIMIT = 30;

interface Bucket {
  count: number;
  resetAt: number;
}

// In-process counters. Single-region deployment, and a demo page does not
// justify a Redis dependency. If the page is ever multi-instance, these
// become per-instance and the effective limits multiply by instance count.
const ipBuckets = new Map<string, Bucket>();
const sessionCounts = new Map<string, number>();
let dailyCount = 0;
let dailyResetAt = 0;

export function resetLimitsForTest(): void {
  ipBuckets.clear();
  sessionCounts.clear();
  dailyCount = 0;
  dailyResetAt = 0;
}

function dailyCap(): number {
  return Number(process.env.DEMO_DAILY_MESSAGE_CAP ?? '5000');
}

function rollDaily(now: number): void {
  if (now >= dailyResetAt) {
    dailyCount = 0;
    dailyResetAt = now + 24 * 60 * 60 * 1000;
  }
}

export interface LimitResult {
  allowed: boolean;
  reason?: 'disabled' | 'ip' | 'session' | 'daily';
  message?: string;
}

export function checkLimits({ ip, visitorId }: { ip: string; visitorId: string }): LimitResult {
  if (process.env.DEMO_ENABLED === 'false') {
    return {
      allowed: false,
      reason: 'disabled',
      message: 'The live demo is paused right now. The walkthrough below shows the same thing.',
    };
  }

  const now = Date.now();
  rollDaily(now);

  if (dailyCount >= dailyCap()) {
    return {
      allowed: false,
      reason: 'daily',
      message: 'The demo has hit its daily limit. Try again tomorrow, or connect your own agent.',
    };
  }

  if ((sessionCounts.get(visitorId) ?? 0) >= SESSION_LIMIT) {
    return {
      allowed: false,
      reason: 'session',
      message: "That's the end of this demo session. Reload to start over.",
    };
  }

  const bucket = ipBuckets.get(ip);
  if (bucket && now < bucket.resetAt && bucket.count >= IP_LIMIT) {
    return {
      allowed: false,
      reason: 'ip',
      message: 'Slow down a moment — too many messages. Try again in a few minutes.',
    };
  }

  return { allowed: true };
}

export function recordMessage({ ip, visitorId }: { ip: string; visitorId: string }): void {
  const now = Date.now();
  rollDaily(now);
  dailyCount += 1;
  sessionCounts.set(visitorId, (sessionCounts.get(visitorId) ?? 0) + 1);

  const bucket = ipBuckets.get(ip);
  if (!bucket || now >= bucket.resetAt) {
    ipBuckets.set(ip, { count: 1, resetAt: now + IP_WINDOW_MS });
  } else {
    bucket.count += 1;
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd apps/landing && pnpm vitest run app/demo/_lib/rate-limit.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/landing/app/demo/_lib/rate-limit.ts apps/landing/app/demo/_lib/rate-limit.test.ts
git commit -m "feat(demo): per-IP, per-session and daily limits with a kill switch"
```

---

### Task 3: The chat route handler

**Files:**
- Create: `apps/landing/app/api/demo/chat/route.ts`
- Test: `apps/landing/app/api/demo/chat/route.test.ts`

**Interfaces:**
- Consumes: `recallMemories`, `writeMemory`, `RecalledFact` (Task 1); `getOrCreateVisitorId` (Task 1); `checkLimits`, `recordMessage` (Task 2).
- Produces: `POST` handler returning `{ reply: string; facts: RecalledFact[]; remembered: string | null }`; request body `{ message: string; withKlio: boolean }`.

The `withKlio: false` arm must genuinely skip recall — see Global Constraints.

- [ ] **Step 1: Write the failing test**

```ts
// apps/landing/app/api/demo/chat/route.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

const recallMemories = vi.fn();
const writeMemory = vi.fn();
const checkLimits = vi.fn();
const recordMessage = vi.fn();
const completeChat = vi.fn();

vi.mock('~/demo/_lib/engine-client', () => ({ recallMemories, writeMemory }));
vi.mock('~/demo/_lib/rate-limit', () => ({ checkLimits, recordMessage }));
vi.mock('~/demo/_lib/visitor', () => ({ getOrCreateVisitorId: async () => 'v1' }));
vi.mock('~/demo/_lib/llm', () => ({ completeChat }));

const { POST } = await import('./route');

function request(body: unknown) {
  return new Request('http://localhost/api/demo/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '1.1.1.1' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  checkLimits.mockReturnValue({ allowed: true });
  recallMemories.mockResolvedValue([
    { id: 'm1', content: 'We chose Postgres for tenant isolation', score: 0.9, memoryType: 'decision', createdAt: '2026-03-01' },
  ]);
  completeChat.mockResolvedValue('Because of tenant isolation.');
});

describe('POST /api/demo/chat', () => {
  it('recalls context and returns the facts it used', async () => {
    const response = await POST(request({ message: 'why postgres?', withKlio: true }));
    const body = await response.json();

    expect(recallMemories).toHaveBeenCalled();
    expect(body.facts).toHaveLength(1);
    expect(body.reply).toBe('Because of tenant isolation.');
  });

  it('genuinely skips recall when withKlio is false', async () => {
    const response = await POST(request({ message: 'why postgres?', withKlio: false }));
    const body = await response.json();

    expect(recallMemories).not.toHaveBeenCalled();
    expect(body.facts).toEqual([]);
  });

  it('persists a durable statement without being asked, and reports it', async () => {
    completeChat.mockResolvedValueOnce('Noted.');
    const response = await POST(
      request({ message: 'we run two-week sprints', withKlio: true }),
    );
    const body = await response.json();

    expect(writeMemory).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringContaining('two-week sprints'), visitorId: 'v1' }),
    );
    expect(body.remembered).toContain('two-week sprints');
  });

  it('returns 429 with a usable message when a limit is hit', async () => {
    checkLimits.mockReturnValue({ allowed: false, reason: 'ip', message: 'Slow down.' });
    const response = await POST(request({ message: 'hi', withKlio: true }));

    expect(response.status).toBe(429);
    expect((await response.json()).error).toBe('Slow down.');
    expect(recallMemories).not.toHaveBeenCalled();
  });

  it('rejects an empty or oversized message', async () => {
    expect((await POST(request({ message: '', withKlio: true }))).status).toBe(400);
    expect((await POST(request({ message: 'x'.repeat(2001), withKlio: true }))).status).toBe(400);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd apps/landing && pnpm vitest run app/api/demo/chat/route.test.ts`
Expected: FAIL — cannot resolve `./route` and `~/demo/_lib/llm`.

- [ ] **Step 3: Write the implementation**

```ts
// apps/landing/app/demo/_lib/llm.ts
import 'server-only';

const BASE_URL = process.env.LITELLM_BASE_URL ?? 'https://litellm.oppla.dev';
const MODEL = process.env.DEMO_CHAT_MODEL ?? 'xai/grok-4-1-fast-non-reasoning-latest';
const MAX_TOKENS = 400;

export interface ChatTurn {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function completeChat(messages: ChatTurn[]): Promise<string> {
  const response = await fetch(`${BASE_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.LITELLM_API_KEY ?? ''}`,
    },
    body: JSON.stringify({ model: MODEL, messages, max_tokens: MAX_TOKENS }),
    cache: 'no-store',
  });

  if (!response.ok) throw new Error(`llm_error_${response.status}`);

  const payload = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return payload.choices?.[0]?.message?.content ?? '';
}
```

```ts
// apps/landing/app/api/demo/chat/route.ts
import { NextResponse } from 'next/server';

import { recallMemories, writeMemory, type RecalledFact } from '~/demo/_lib/engine-client';
import { completeChat, type ChatTurn } from '~/demo/_lib/llm';
import { checkLimits, recordMessage } from '~/demo/_lib/rate-limit';
import { getOrCreateVisitorId } from '~/demo/_lib/visitor';

const MAX_MESSAGE_CHARS = 2000;

// Durable-sounding first-person statements. Deliberately narrow: a false
// positive writes noise into the visitor's own scope, which is recoverable,
// but writing on every message would make the "remembered" badge meaningless.
const DURABLE = /\b(we|our team|i)\b.{0,60}\b(use|run|prefer|decided|standard|policy|always|never|sprint|deploy)\b/i;

function clientIp(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
}

function systemPrompt(facts: RecalledFact[]): string {
  if (facts.length === 0) {
    return [
      'You are an engineering assistant for a project called Harbor.',
      'You have NO stored context about this project.',
      'Answer honestly from general knowledge, and say plainly when you do not',
      'know the specifics of this codebase. Do not invent project details.',
    ].join(' ');
  }

  const context = facts
    .map((f) => {
      const base = `- [${f.memoryType}, ${f.createdAt}] ${f.content}`;
      return f.supersedes
        ? `${base}\n  (replaced: "${f.supersedes.content}" — ${f.supersedes.reason}, ${f.supersedes.retiredAt})`
        : base;
    })
    .join('\n');

  return [
    'You are an engineering assistant for a project called Harbor.',
    'Answer ONLY from the context below. Cite dates when the context has them.',
    'If a belief was replaced, say what it replaced and why.',
    'If the context does not cover the question, say so.',
    '\n\nContext:\n',
    context,
  ].join(' ');
}

export async function POST(request: Request) {
  let body: { message?: unknown; withKlio?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!message || message.length > MAX_MESSAGE_CHARS) {
    return NextResponse.json({ error: 'Message must be 1–2000 characters.' }, { status: 400 });
  }

  const withKlio = body.withKlio !== false;
  const visitorId = await getOrCreateVisitorId();
  const ip = clientIp(request);

  const limit = checkLimits({ ip, visitorId });
  if (!limit.allowed) {
    return NextResponse.json({ error: limit.message }, { status: 429 });
  }
  recordMessage({ ip, visitorId });

  const facts = withKlio ? await recallMemories({ query: message, visitorId }) : [];

  const turns: ChatTurn[] = [
    { role: 'system', content: systemPrompt(facts) },
    { role: 'user', content: message },
  ];

  let reply: string;
  try {
    reply = await completeChat(turns);
  } catch {
    return NextResponse.json(
      { error: 'The demo model is unavailable right now. Try again in a moment.' },
      { status: 503 },
    );
  }

  // The thesis: the write happens because the visitor said something durable,
  // not because they asked for it to be saved.
  let remembered: string | null = null;
  if (withKlio && DURABLE.test(message)) {
    await writeMemory({ content: message, visitorId, memoryType: 'observation' });
    remembered = message;
  }

  return NextResponse.json({ reply, facts, remembered });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd apps/landing && pnpm vitest run app/api/demo/chat/route.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/landing/app/api/demo/chat/route.ts apps/landing/app/demo/_lib/llm.ts apps/landing/app/api/demo/chat/route.test.ts
git commit -m "feat(demo): chat route with real recall, honest no-Klio arm, unprompted writes"
```

---

### Task 4: The Harbor seed corpus

**Files:**
- Create: `apps/landing/app/demo/_lib/seed/harbor.ts`
- Create: `apps/landing/app/demo/_lib/seed/seed-demo-org.ts`
- Test: `apps/landing/app/demo/_lib/seed/harbor.test.ts`

**Interfaces:**
- Produces: `HARBOR_MEMORIES: SeedMemory[]`, `SUGGESTED_PROMPTS: string[]`, `SeedMemory = { content: string; memoryType: 'decision'|'note'|'observation'|'plan'; createdAt: string; supersedes?: { content: string; reason: string; retiredAt: string } }`.

Content requirements are set by the spec: architecture decisions *with reasoning*, at least three rejected approaches, at least two supersession chains (one reachable from a suggested prompt), live constraints, and artifacts. The tests below enforce each so the corpus cannot silently regress into something that demos badly.

- [ ] **Step 1: Write the failing test**

```ts
// apps/landing/app/demo/_lib/seed/harbor.test.ts
import { describe, expect, it } from 'vitest';

import { HARBOR_MEMORIES, SUGGESTED_PROMPTS } from './harbor';

describe('the Harbor corpus', () => {
  it('is large enough to feel real', () => {
    expect(HARBOR_MEMORIES.length).toBeGreaterThanOrEqual(60);
  });

  it('has at least two supersession chains, each with a reason and a date', () => {
    const chains = HARBOR_MEMORIES.filter((m) => m.supersedes);
    expect(chains.length).toBeGreaterThanOrEqual(2);
    for (const m of chains) {
      expect(m.supersedes!.reason.length).toBeGreaterThan(20);
      expect(m.supersedes!.retiredAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('records at least three rejected approaches — the material a repo cannot hold', () => {
    const rejected = HARBOR_MEMORIES.filter((m) => /\b(rejected|we tried|ruled out|abandoned)\b/i.test(m.content));
    expect(rejected.length).toBeGreaterThanOrEqual(3);
  });

  it('explains why, not only what, on every decision', () => {
    const decisions = HARBOR_MEMORIES.filter((m) => m.memoryType === 'decision');
    expect(decisions.length).toBeGreaterThanOrEqual(10);
    for (const d of decisions) {
      expect(d.content).toMatch(/\b(because|since|so that|to avoid|after)\b/i);
    }
  });

  it('offers suggested prompts, one of which reaches a supersession chain', () => {
    expect(SUGGESTED_PROMPTS.length).toBeGreaterThanOrEqual(3);
    const chainTopics = HARBOR_MEMORIES.filter((m) => m.supersedes).map((m) => m.content.toLowerCase());
    const reaches = SUGGESTED_PROMPTS.some((p) =>
      chainTopics.some((c) => p.toLowerCase().split(/\s+/).filter((w) => w.length > 4).some((w) => c.includes(w))),
    );
    expect(reaches).toBe(true);
  });

  it('carries dates on everything, so answers can cite them', () => {
    for (const m of HARBOR_MEMORIES) {
      expect(m.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd apps/landing && pnpm vitest run app/demo/_lib/seed/harbor.test.ts`
Expected: FAIL — `Failed to resolve import "./harbor"`.

- [ ] **Step 3: Write the corpus and the seeding script**

Write `harbor.ts` exporting at least 60 `SeedMemory` entries for a B2B logistics SaaS. Cover: the database choice, the queue, the auth model, the mobile framework, the deploy target, observability, and the test strategy — each decision phrased with an explicit *because/after/so that*. Include at least three entries using the words "we tried", "rejected" or "ruled out". Include live constraints ("p95 must stay under 200ms", "no PII in logs").

Start from the type and these representative entries, then continue in the same shape:

```ts
export interface SeedMemory {
  content: string;
  memoryType: 'decision' | 'note' | 'observation' | 'plan';
  createdAt: string;
  supersedes?: { content: string; reason: string; retiredAt: string };
}

export const HARBOR_MEMORIES: SeedMemory[] = [
  {
    content:
      'Harbor is a B2B logistics platform: shippers post loads, carriers bid, and we settle payment on delivery confirmation.',
    memoryType: 'note',
    createdAt: '2025-11-03',
  },
  {
    content:
      'The API is Postgres-backed rather than event-sourced, because settlement disputes need a queryable current balance and the team had no event-sourcing experience to draw on.',
    memoryType: 'decision',
    createdAt: '2025-11-18',
  },
  {
    content:
      'We ruled out building our own carrier identity verification after a two-week spike: the compliance surface for FMCSA data was larger than the whole rest of the quarter.',
    memoryType: 'decision',
    createdAt: '2026-02-05',
  },
  {
    content: 'Load search p95 must stay under 200ms — carriers abandon the bid flow above that.',
    memoryType: 'note',
    createdAt: '2026-01-09',
  },
  {
    content: 'No PII in application logs, including carrier phone numbers. Enforced by a log scrubber in the request middleware.',
    memoryType: 'note',
    createdAt: '2025-12-12',
  },
  // ... continue to at least 60 entries, then the two chains below.
];
```

Include these two supersession chains verbatim:

```ts
{
  content:
    'Tenant isolation is enforced in the application layer, in the repository classes, since 2026-03-14.',
  memoryType: 'decision',
  createdAt: '2026-03-14',
  supersedes: {
    content: 'Tenant isolation is enforced with Postgres row-level security.',
    reason:
      'RLS policies depend on session variables, which the connection pooler in transaction mode does not preserve between statements. Under load, queries began running without the tenant predicate.',
    retiredAt: '2026-03-14',
  },
},
{
  content:
    'Background jobs run on Redis-backed BullMQ, chosen after the managed queue trial, because we needed per-tenant rate limiting the managed option could not express.',
  memoryType: 'decision',
  createdAt: '2026-01-22',
  supersedes: {
    content: 'Background jobs run on the cloud provider’s managed queue service.',
    reason:
      'No way to express per-tenant fairness, so one large customer’s import could starve every other tenant’s jobs for hours.',
    retiredAt: '2026-01-22',
  },
},
```

And export prompts that reach them:

```ts
export const SUGGESTED_PROMPTS = [
  'How do we handle tenant isolation, and has that changed?',
  'Why did we pick our background job queue?',
  'What approaches have we already tried and rejected?',
];
```

Then write `seed-demo-org.ts`, a one-shot script that POSTs every entry to `${KLIO_ENGINE_URL}/capture/event` with `X-Vex-Key: $KLIO_DEMO_API_KEY` and no `X-Vex-Agent` (so rows land in the shared demo org, not a visitor scope), sending `{ content, memory_type, metadata: { seeded: true, supersedes: m.supersedes ?? null } }`, logging one line per entry and exiting non-zero if any POST fails.

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd apps/landing && pnpm vitest run app/demo/_lib/seed/harbor.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Seed the demo org and verify recall returns the chain**

```bash
cd apps/landing && KLIO_DEMO_API_KEY=$KLIO_DEMO_API_KEY pnpm tsx app/demo/_lib/seed/seed-demo-org.ts
curl -s -X POST https://api.klio.tech/capture/recall \
  -H "X-Vex-Key: $KLIO_DEMO_API_KEY" -H 'Content-Type: application/json' \
  -d '{"query":"tenant isolation","limit":5}' | head -40
```
Expected: the application-layer isolation decision comes back, carrying its superseded RLS predecessor.

- [ ] **Step 6: Commit**

```bash
git add apps/landing/app/demo/_lib/seed/
git commit -m "feat(demo): Harbor seed corpus with supersession chains and rejected approaches"
```

---

### Task 5: Recall panel and chat UI

**Files:**
- Create: `apps/landing/app/demo/_components/recall-panel.tsx`
- Create: `apps/landing/app/demo/_components/demo-chat.tsx`
- Test: `apps/landing/app/demo/_components/recall-panel.test.tsx`

**Interfaces:**
- Consumes: `RecalledFact` (Task 1); `SUGGESTED_PROMPTS` (Task 4); `POST /api/demo/chat` (Task 3).
- Produces: `<RecallPanel facts={RecalledFact[]} remembered={string | null} withKlio={boolean} />`, `<DemoChat />`.

The panel is the product — without it this is an ordinary chatbot.

- [ ] **Step 1: Write the failing test**

```tsx
// apps/landing/app/demo/_components/recall-panel.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { RecallPanel } from './recall-panel';

const fact = {
  id: 'm1',
  content: 'Tenant isolation is enforced in the application layer.',
  score: 0.91,
  memoryType: 'decision',
  createdAt: '2026-03-14',
};

describe('RecallPanel', () => {
  it('shows each recalled fact with its score', () => {
    render(<RecallPanel facts={[fact]} remembered={null} withKlio />);
    expect(screen.getByText(/application layer/)).toBeInTheDocument();
    expect(screen.getByText(/0\.91/)).toBeInTheDocument();
  });

  it('shows the superseded belief and why it died', () => {
    render(
      <RecallPanel
        facts={[{ ...fact, supersedes: { id: 'old', content: 'Postgres row-level security.', reason: 'Pooler dropped session variables.', retiredAt: '2026-03-14' } }]}
        remembered={null}
        withKlio
      />,
    );
    expect(screen.getByText(/row-level security/)).toBeInTheDocument();
    expect(screen.getByText(/Pooler dropped session variables/)).toBeInTheDocument();
  });

  it('announces an unprompted write', () => {
    render(<RecallPanel facts={[fact]} remembered="we run two-week sprints" />);
    expect(screen.getByText(/remembered/i)).toBeInTheDocument();
    expect(screen.getByText(/two-week sprints/)).toBeInTheDocument();
  });

  it('is never blank — with Klio off it explains why there is no context', () => {
    const { container } = render(<RecallPanel facts={[]} remembered={null} withKlio={false} />);
    expect(container.textContent?.trim().length).toBeGreaterThan(0);
    expect(screen.getByText(/no stored context/i)).toBeInTheDocument();
  });

  it('is never blank before the first message', () => {
    const { container } = render(<RecallPanel facts={[]} remembered={null} withKlio />);
    expect(container.textContent?.trim().length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd apps/landing && pnpm vitest run app/demo/_components/recall-panel.test.tsx`
Expected: FAIL — `Failed to resolve import "./recall-panel"`.

- [ ] **Step 3: Write the implementation**

```tsx
// apps/landing/app/demo/_components/recall-panel.tsx
'use client';

import type { RecalledFact } from '../_lib/engine-client';

interface RecallPanelProps {
  facts: RecalledFact[];
  remembered: string | null;
  withKlio?: boolean;
}

export function RecallPanel({ facts, remembered, withKlio = true }: RecallPanelProps) {
  return (
    <aside className="rounded-xl border p-4">
      <h2 className="mb-3 text-sm font-medium tracking-wide uppercase">What Klio returned</h2>

      {remembered ? (
        <div className="mb-4 rounded-lg border border-dashed p-3 text-sm">
          <div className="font-medium">Remembered — you didn&apos;t ask it to</div>
          <div className="mt-1 text-muted-foreground">{remembered}</div>
        </div>
      ) : null}

      {/* A blank panel is the exact failure this project exists to fix, so
          both empty cases say something useful instead of rendering nothing. */}
      {facts.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {withKlio
            ? 'Ask a question and the context Klio retrieves will appear here.'
            : 'No stored context. This agent is answering from general knowledge alone.'}
        </p>
      ) : (
        <ul className="space-y-3">
          {facts.map((fact) => (
            <li key={fact.id} className="rounded-lg border p-3 text-sm">
              <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                <span>
                  {fact.memoryType} · {fact.createdAt}
                </span>
                <span>{fact.score.toFixed(2)}</span>
              </div>
              <p>{fact.content}</p>

              {fact.supersedes ? (
                <div className="mt-2 border-l-2 pl-3 text-xs text-muted-foreground">
                  <div>Replaced: &ldquo;{fact.supersedes.content}&rdquo;</div>
                  <div className="mt-1">{fact.supersedes.reason}</div>
                  <div className="mt-1">Retired {fact.supersedes.retiredAt}</div>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
```

Build `DemoChat` as a client component holding `messages`, `facts`, `remembered`, `withKlio` and `pending` state; rendering `SUGGESTED_PROMPTS` as buttons until the first message is sent; POSTing `{ message, withKlio }` to `/api/demo/chat`; rendering `error` from a non-OK response as an inline notice rather than throwing; and passing `facts`/`remembered`/`withKlio` down to `RecallPanel`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd apps/landing && pnpm vitest run app/demo/_components/recall-panel.test.tsx`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/landing/app/demo/_components/recall-panel.tsx apps/landing/app/demo/_components/demo-chat.tsx apps/landing/app/demo/_components/recall-panel.test.tsx
git commit -m "feat(demo): recall panel and chat, with no blank states by construction"
```

---

### Task 6: The With Klio / Without Klio toggle

**Files:**
- Create: `apps/landing/app/demo/_components/klio-toggle.tsx`
- Modify: `apps/landing/app/demo/_components/demo-chat.tsx`
- Test: `apps/landing/app/demo/_components/klio-toggle.test.tsx`

**Interfaces:**
- Produces: `<KlioToggle value={boolean} onChange={(next: boolean) => void} />`.

This is the highest-value element on the page — the whole argument in ten seconds.

- [ ] **Step 1: Write the failing test**

```tsx
// apps/landing/app/demo/_components/klio-toggle.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { KlioToggle } from './klio-toggle';

describe('KlioToggle', () => {
  it('offers both arms', () => {
    render(<KlioToggle value onChange={() => {}} />);
    expect(screen.getByRole('radio', { name: /with klio/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /without klio/i })).toBeInTheDocument();
  });

  it('marks the active arm for assistive tech', () => {
    render(<KlioToggle value onChange={() => {}} />);
    expect(screen.getByRole('radio', { name: /with klio/i })).toBeChecked();
    expect(screen.getByRole('radio', { name: /without klio/i })).not.toBeChecked();
  });

  it('reports the change', async () => {
    const onChange = vi.fn();
    render(<KlioToggle value onChange={onChange} />);
    await userEvent.click(screen.getByRole('radio', { name: /without klio/i }));
    expect(onChange).toHaveBeenCalledWith(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd apps/landing && pnpm vitest run app/demo/_components/klio-toggle.test.tsx`
Expected: FAIL — `Failed to resolve import "./klio-toggle"`.

- [ ] **Step 3: Write the implementation**

```tsx
// apps/landing/app/demo/_components/klio-toggle.tsx
'use client';

interface KlioToggleProps {
  value: boolean;
  onChange: (next: boolean) => void;
}

export function KlioToggle({ value, onChange }: KlioToggleProps) {
  return (
    <div role="radiogroup" aria-label="Klio context" className="inline-flex rounded-lg border p-1">
      {[
        { label: 'With Klio', on: true },
        { label: 'Without Klio', on: false },
      ].map(({ label, on }) => (
        <button
          key={label}
          type="button"
          role="radio"
          aria-checked={value === on}
          onClick={() => onChange(on)}
          className={`rounded-md px-3 py-1.5 text-sm ${
            value === on ? 'bg-foreground text-background' : 'text-muted-foreground'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
```

Then wire it into `DemoChat`: render `<KlioToggle value={withKlio} onChange={setWithKlio} />` above the transcript, and — so the comparison is legible — when the arm changes and a previous user message exists, resend that same message on the new arm rather than clearing the transcript.

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd apps/landing && pnpm vitest run app/demo/_components/klio-toggle.test.tsx`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/landing/app/demo/_components/klio-toggle.tsx apps/landing/app/demo/_components/demo-chat.tsx apps/landing/app/demo/_components/klio-toggle.test.tsx
git commit -m "feat(demo): with/without Klio toggle that re-runs the same question"
```

---

### Task 7: Replace the page, retire `/live`, add the guard tests

**Files:**
- Modify: `apps/landing/app/demo/page.tsx` (replace Vex-era content entirely)
- Delete: `apps/landing/app/demo/_components/live-demo.tsx`
- Delete: `apps/landing/app/live/` (whole directory)
- Create: `apps/landing/__tests__/demo-security.test.ts`

**Interfaces:**
- Consumes: `<DemoChat />` (Tasks 5–6).

`/demo` and `/live` currently pitch Vex-era drift detection and hallucination verification. Neither is in the sitemap or nav, but both are live by URL. `live/_lib/verify-action.ts:4` reads `NEXT_PUBLIC_VEX_DEMO_KEY`, shipping a credential to every browser.

- [ ] **Step 1: Write the failing test**

```ts
// apps/landing/__tests__/demo-security.test.ts
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const appDir = path.resolve(import.meta.dirname, '../app');

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return /\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

describe('demo security', () => {
  it('ships no Klio or Vex credential through a NEXT_PUBLIC variable', () => {
    const offenders = walk(appDir).filter((file) =>
      /NEXT_PUBLIC_[A-Z_]*(KEY|SECRET|TOKEN)/.test(fs.readFileSync(file, 'utf8')),
    );
    expect(offenders).toEqual([]);
  });

  it('has retired the Vex-era /live route', () => {
    expect(fs.existsSync(path.join(appDir, 'live'))).toBe(false);
  });

  it('no longer pitches Vex-era verification on the demo page', () => {
    const page = fs.readFileSync(path.join(appDir, 'demo/page.tsx'), 'utf8');
    expect(page).not.toMatch(/drift|hallucinat|Vex/i);
  });

  it('reads the demo key only from a server-only module', () => {
    const offenders = walk(appDir).filter((file) => {
      const source = fs.readFileSync(file, 'utf8');
      return source.includes('KLIO_DEMO_API_KEY') && !source.includes("import 'server-only'");
    });
    expect(offenders).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd apps/landing && pnpm vitest run __tests__/demo-security.test.ts`
Expected: FAIL on all four — `/live` still exists, still uses `NEXT_PUBLIC_VEX_DEMO_KEY`, and `demo/page.tsx` still says "drift".

- [ ] **Step 3: Replace the page and delete the Vex routes**

```tsx
// apps/landing/app/demo/page.tsx
import type { Metadata } from 'next';

import { DemoChat } from './_components/demo-chat';

export const metadata: Metadata = {
  title: 'Live Demo — Klio',
  description:
    'Ask questions about a real project and watch the context being retrieved. No signup.',
};

export default function DemoPage() {
  return (
    <div className="container py-24">
      <div className="mx-auto max-w-3xl text-center">
        <div className="mb-4 text-[13px] font-medium tracking-widest text-foreground uppercase">
          Live Demo
        </div>
        <h1 className="mb-4 text-4xl font-bold tracking-tight text-foreground lg:text-5xl">
          Ask this project anything
        </h1>
        <p className="text-lg text-muted-foreground">
          Harbor is a real project with real history in Klio. Ask why something was
          built the way it was — and watch, on the right, exactly which context came
          back. Then turn Klio off and ask again.
        </p>
      </div>

      <div className="mx-auto mt-12 max-w-6xl">
        <DemoChat />
      </div>
    </div>
  );
}
```

```bash
rm -rf apps/landing/app/live
rm -f apps/landing/app/demo/_components/live-demo.tsx
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd apps/landing && pnpm vitest run __tests__/demo-security.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Run the whole suite, lint and build**

```bash
cd apps/landing && pnpm vitest run && pnpm lint && pnpm build
```
Expected: all green. `pnpm lint` matters — the repo's CI check named "TypeScript" actually runs ESLint, and a build that only passes `tsc` has failed CI before.

- [ ] **Step 6: Verify the page in a browser**

Start the dev server via the preview tooling, open `/demo`, and confirm: suggested prompts render; asking a seeded question returns cited facts in the panel; the supersession prompt shows the replaced belief and its reason; saying "we run two-week sprints" produces the *remembered* banner unprompted; toggling to Without Klio and resending gives a visibly weaker answer with an empty-but-explained panel; and no panel is ever blank.

- [ ] **Step 7: Commit**

```bash
git add -A apps/landing/app/demo apps/landing/__tests__/demo-security.test.ts
git rm -r --cached apps/landing/app/live 2>/dev/null || true
git commit -m "feat(demo): replace the Vex-era demo with the public Klio demo, retire /live"
```

---

## Deployment notes

Set on the Railway service **before** merging, as **runtime** variables (none of these are `NEXT_PUBLIC_*`, so they are read at request time and need no build ARG):

| Variable | Value |
| --- | --- |
| `KLIO_DEMO_API_KEY` | A key scoped to the demo org **and provisioned with no `created_by` user** — see Global Constraints. An attributable key silently leaks visitors' writes to each other. Task 1 Step 5 is the gate that catches this. |
| `KLIO_ENGINE_URL` | `https://api.klio.tech` |
| `LITELLM_BASE_URL` | `https://litellm.oppla.dev` |
| `LITELLM_API_KEY` | Gateway key |
| `DEMO_CHAT_MODEL` | `xai/grok-4-1-fast-non-reasoning-latest` |
| `DEMO_ENABLED` | `true` |
| `DEMO_DAILY_MESSAGE_CAP` | `5000` |

Rotate `NEXT_PUBLIC_VEX_DEMO_KEY` after `/live` is deleted — it has been exposed in the client bundle.

## Follow-ups, deliberately not in this plan

- **Multi-instance rate limits.** The counters are in-process; if the landing app ever runs more than one instance, effective limits multiply by instance count. Move to a shared store at that point.
- **Linking the demo from nav and the sitemap.** Ship it, exercise it, then promote it.
- **The `scope='agent'` deprecation.** Visitor isolation rides on a path `capture.py:240` calls deprecated. The Task 1 test pins the behaviour; if the engine ever drops it, that test fails and this page needs a new isolation mechanism before it can ship again.
