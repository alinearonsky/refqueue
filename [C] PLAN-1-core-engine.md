# RefQueue — Plan 1: Core Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the tested backend core of RefQueue — a self-hosted, open-source waitlist with referral/position-jumping — covering the data model, signup creation, referral attribution, position computation, double-opt-in verification, and anti-gaming, exposed through minimal API routes and exercised by unit + integration tests.

**Architecture:** Next.js (App Router, TypeScript) app with a Supabase Postgres backend. The referral/position logic is written as **pure functions over plain data** (fully unit-testable with no DB), wrapped by a thin repository layer tested with integration tests against a local Supabase Postgres. Email *sending* is behind an interface with a fake implementation for now (real providers land in Plan 2). This plan produces a working, testable backend even before any UI exists.

**Tech Stack:** Next.js 15 (App Router) · TypeScript · Supabase (Postgres) · Vitest · `nanoid` (referral codes) · `disposable-email-domains` (anti-gaming) · `zod` (input validation).

**Repo location:** `~/Personal/refqueue` (per workspace convention — side-project repos live in `~/Personal`). This planning doc lives separately in `~/Code Documentation/open-source-portfolio-project/`.

---

## Scope: this is Plan 1 of 6

| Plan | Subsystem | Produces |
|---|---|---|
| **1 (this)** | Core engine: data, signup, referral, position, verification, anti-gaming | Tested backend + minimal API |
| 2 | Email: Resend + SMTP providers behind the interface; confirmation + milestone emails | Real emails sent on signup/verify/milestone |
| 3 | Public pages: themeable landing page + signup status page (position, referral link, share) | Visitor-facing flow |
| 4 | Maker dashboard + Supabase Auth: signups, top referrers, signups-over-time chart, CSV export | Maker-facing flow |
| 5 | Theming/config + "powered by RefQueue" credit (env-driven) | Configurable, self-distributing |
| 6 | Deploy: Vercel one-click template, Docker Compose, README, CONTRIBUTING, issue templates | Shippable v1 |

Each later plan gets written in full TDD detail before its build phase begins.

---

## File Structure (Plan 1)

```
~/Personal/refqueue/
├── package.json
├── vitest.config.ts
├── tsconfig.json
├── .env.example
├── supabase/
│   └── migrations/
│       └── 0001_core_schema.sql        # waitlists + signups tables
├── src/
│   ├── lib/
│   │   ├── referral/
│   │   │   ├── code.ts                  # referral-code generation (pure)
│   │   │   ├── code.test.ts
│   │   │   ├── position.ts              # position engine (pure)
│   │   │   └── position.test.ts
│   │   ├── antiabuse/
│   │   │   ├── disposable.ts            # disposable-email check (pure)
│   │   │   ├── disposable.test.ts
│   │   │   ├── ratelimit.ts             # pluggable rate limiter + in-memory impl
│   │   │   └── ratelimit.test.ts
│   │   ├── email/
│   │   │   ├── types.ts                 # EmailSender interface
│   │   │   └── fake.ts                  # FakeEmailSender (records sent emails)
│   │   ├── db/
│   │   │   ├── client.ts                # Supabase client factory
│   │   │   ├── signups.ts               # signups repository
│   │   │   └── signups.integration.test.ts
│   │   └── validation.ts                # zod schemas
│   └── app/
│       └── api/
│           ├── signup/route.ts          # POST create signup
│           ├── signup/route.integration.test.ts
│           └── verify/route.ts          # GET confirm double-opt-in
└── README.md                            # stub; fleshed out in Plan 6
```

**Responsibility boundaries:** pure logic (`referral/`, `antiabuse/disposable`) never imports the DB or Next.js — it's unit-tested in milliseconds. The repository (`db/`) is the only place that talks to Postgres. API routes are thin: validate → call repo/logic → respond.

---

## Milestone A — Project setup

### Task A1: Scaffold the Next.js + TypeScript project

**Files:**
- Create: `~/Personal/refqueue/` (whole project)

- [ ] **Step 1: Scaffold**

Run:
```bash
cd ~/Personal
npx create-next-app@latest refqueue --typescript --app --eslint --src-dir --no-tailwind --import-alias "@/*"
cd ~/Personal/refqueue
```
Expected: a new Next.js app in `~/Personal/refqueue` with `src/app/`.

- [ ] **Step 2: Initialize git and first commit**

Run:
```bash
cd ~/Personal/refqueue
git init
git add -A
git commit -m "chore: scaffold Next.js app"
```
Expected: initial commit created.

### Task A2: Install and configure Vitest

**Files:**
- Create: `~/Personal/refqueue/vitest.config.ts`
- Modify: `~/Personal/refqueue/package.json` (scripts)

- [ ] **Step 1: Install test deps**

Run:
```bash
cd ~/Personal/refqueue
npm install -D vitest @vitest/coverage-v8
npm install nanoid zod disposable-email-domains
```

- [ ] **Step 2: Write `vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    exclude: ['src/**/*.integration.test.ts'], // integration run separately (needs DB)
  },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
})
```

- [ ] **Step 3: Add test scripts to `package.json`**

Add to the `"scripts"` object:
```json
"test": "vitest run",
"test:watch": "vitest",
"test:integration": "vitest run --config vitest.integration.config.ts"
```

- [ ] **Step 4: Verify the runner works with a smoke test**

Create `src/smoke.test.ts`:
```typescript
import { test, expect } from 'vitest'
test('vitest runs', () => { expect(1 + 1).toBe(2) })
```
Run: `npm test`
Expected: 1 passing test.

- [ ] **Step 5: Delete the smoke test and commit**

Run:
```bash
rm src/smoke.test.ts
git add -A
git commit -m "chore: add vitest"
```

### Task A3: Integration test config (separate, DB-backed)

**Files:**
- Create: `~/Personal/refqueue/vitest.integration.config.ts`

- [ ] **Step 1: Write the integration config**

```typescript
import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.integration.test.ts'],
    testTimeout: 20000,
    fileParallelism: false, // integration tests share one DB; run serially
  },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
})
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "chore: add integration test config"
```

---

## Milestone B — Data model

### Task B1: Supabase local + core schema migration

**Files:**
- Create: `~/Personal/refqueue/supabase/migrations/0001_core_schema.sql`
- Create: `~/Personal/refqueue/.env.example`

- [ ] **Step 1: Init Supabase locally**

Run:
```bash
cd ~/Personal/refqueue
npx supabase init
npx supabase start
```
Expected: local Supabase stack running; the command prints an API URL and `anon`/`service_role` keys. Note the DB URL (`postgresql://postgres:postgres@127.0.0.1:54322/postgres`).

- [ ] **Step 2: Write the schema migration**

Create `supabase/migrations/0001_core_schema.sql`:
```sql
create table waitlists (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  slug          text not null unique,
  theme         jsonb not null default '{}'::jsonb,       -- logo, color, copy (Plan 5)
  reward_tiers  jsonb not null default '[]'::jsonb,       -- [{referrals:int, label:text}]
  powered_by    boolean not null default true,
  created_at    timestamptz not null default now()
);

create table signups (
  id            uuid primary key default gen_random_uuid(),
  waitlist_id   uuid not null references waitlists(id) on delete cascade,
  email         text not null,
  verified      boolean not null default false,
  verify_token  text,                                     -- null once verified
  referral_code text not null,
  referred_by   uuid references signups(id) on delete set null,
  created_at    timestamptz not null default now(),
  verified_at   timestamptz,
  unique (waitlist_id, email),
  unique (waitlist_id, referral_code)
);

create index signups_waitlist_verified_idx on signups (waitlist_id, verified);
create index signups_referred_by_idx on signups (referred_by);
create index signups_verify_token_idx on signups (verify_token);
```

- [ ] **Step 3: Apply the migration**

Run:
```bash
npx supabase migration up
```
Expected: migration applies; `\dt` in `npx supabase db shell` shows `waitlists` and `signups`.

- [ ] **Step 4: Write `.env.example`**

```bash
# Supabase
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
# App
APP_BASE_URL=http://localhost:3000
```
Also create a local `.env` (gitignored) with the real values printed by `supabase start`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0001_core_schema.sql .env.example
git commit -m "feat: core schema (waitlists, signups)"
```

---

## Milestone C — Referral codes & signup validation (pure logic)

### Task C1: Referral-code generation

**Files:**
- Create: `src/lib/referral/code.ts`
- Test: `src/lib/referral/code.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { test, expect, describe } from 'vitest'
import { generateReferralCode, isValidReferralCode } from './code'

describe('generateReferralCode', () => {
  test('produces an 8-char url-safe code', () => {
    const code = generateReferralCode()
    expect(code).toMatch(/^[0-9A-Za-z_-]{8}$/)
  })
  test('produces distinct codes across many calls', () => {
    const codes = new Set(Array.from({ length: 1000 }, () => generateReferralCode()))
    expect(codes.size).toBe(1000)
  })
})

describe('isValidReferralCode', () => {
  test('accepts a well-formed code', () => {
    expect(isValidReferralCode('Ab3_-xY9')).toBe(true)
  })
  test('rejects wrong length or bad chars', () => {
    expect(isValidReferralCode('short')).toBe(false)
    expect(isValidReferralCode('has space')).toBe(false)
    expect(isValidReferralCode('')).toBe(false)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test src/lib/referral/code.test.ts`
Expected: FAIL — `Cannot find module './code'`.

- [ ] **Step 3: Implement**

```typescript
import { customAlphabet } from 'nanoid'

const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_-'
const nano = customAlphabet(ALPHABET, 8)

export function generateReferralCode(): string {
  return nano()
}

export function isValidReferralCode(code: string): boolean {
  return /^[0-9A-Za-z_-]{8}$/.test(code)
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test src/lib/referral/code.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/referral/code.ts src/lib/referral/code.test.ts
git commit -m "feat: referral code generation"
```

### Task C2: Input validation schemas

**Files:**
- Create: `src/lib/validation.ts`
- Test: `src/lib/validation.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { test, expect, describe } from 'vitest'
import { signupInputSchema } from './validation'

describe('signupInputSchema', () => {
  test('accepts a valid signup', () => {
    const r = signupInputSchema.safeParse({ waitlistSlug: 'my-app', email: 'a@b.com' })
    expect(r.success).toBe(true)
  })
  test('accepts an optional referral code', () => {
    const r = signupInputSchema.safeParse({ waitlistSlug: 'my-app', email: 'a@b.com', ref: 'Ab3_-xY9' })
    expect(r.success).toBe(true)
  })
  test('rejects a malformed email', () => {
    const r = signupInputSchema.safeParse({ waitlistSlug: 'my-app', email: 'not-an-email' })
    expect(r.success).toBe(false)
  })
  test('rejects a bad referral code', () => {
    const r = signupInputSchema.safeParse({ waitlistSlug: 'my-app', email: 'a@b.com', ref: 'bad code' })
    expect(r.success).toBe(false)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test src/lib/validation.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```typescript
import { z } from 'zod'

export const signupInputSchema = z.object({
  waitlistSlug: z.string().min(1).max(100),
  email: z.string().email().max(320),
  ref: z.string().regex(/^[0-9A-Za-z_-]{8}$/).optional(),
})

export type SignupInput = z.infer<typeof signupInputSchema>
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test src/lib/validation.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/validation.ts src/lib/validation.test.ts
git commit -m "feat: signup input validation"
```

---

## Milestone D — Position engine (pure, the crux)

The position rule (from the spec): verified signups are ordered by **(confirmed referral count desc, verified_at asc)**. Referring more people moves you ahead of everyone with fewer confirmed referrals — that ordering *is* the skip-the-line mechanic. There is no separate additive spot-jump. Reward tiers are labeled unlocks computed from referral count, not position arithmetic.

### Task D1: Compute positions from a set of signups

**Files:**
- Create: `src/lib/referral/position.ts`
- Test: `src/lib/referral/position.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { test, expect, describe } from 'vitest'
import { computePositions, type SignupRow } from './position'

function s(id: string, referrals: number, verifiedAtIso: string): SignupRow {
  return { id, confirmedReferrals: referrals, verifiedAt: new Date(verifiedAtIso) }
}

describe('computePositions', () => {
  test('orders by referral count desc, then verified_at asc', () => {
    const rows = [
      s('a', 0, '2026-01-01T00:00:00Z'),
      s('b', 2, '2026-01-03T00:00:00Z'),
      s('c', 2, '2026-01-02T00:00:00Z'), // same referrals as b, earlier verify -> ahead
      s('d', 1, '2026-01-01T00:00:00Z'),
    ]
    const pos = computePositions(rows)
    expect(pos.get('c')).toBe(1) // 2 referrals, earliest of the two
    expect(pos.get('b')).toBe(2) // 2 referrals, later
    expect(pos.get('d')).toBe(3) // 1 referral
    expect(pos.get('a')).toBe(4) // 0 referrals
  })

  test('positions are 1-indexed and contiguous', () => {
    const rows = [
      s('a', 0, '2026-01-01T00:00:00Z'),
      s('b', 0, '2026-01-02T00:00:00Z'),
      s('c', 0, '2026-01-03T00:00:00Z'),
    ]
    const pos = computePositions(rows)
    expect([...pos.values()].sort((x, y) => x - y)).toEqual([1, 2, 3])
  })

  test('empty input yields an empty map', () => {
    expect(computePositions([]).size).toBe(0)
  })

  test('ties on both keys are broken deterministically by id', () => {
    const t = '2026-01-01T00:00:00Z'
    const rows = [s('b', 1, t), s('a', 1, t)]
    const pos = computePositions(rows)
    expect(pos.get('a')).toBe(1) // 'a' < 'b'
    expect(pos.get('b')).toBe(2)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test src/lib/referral/position.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```typescript
export interface SignupRow {
  id: string
  confirmedReferrals: number
  verifiedAt: Date
}

/**
 * Returns a map of signup id -> 1-indexed position.
 * Order: confirmed referrals desc, then verifiedAt asc, then id asc (deterministic tiebreak).
 */
export function computePositions(rows: SignupRow[]): Map<string, number> {
  const sorted = [...rows].sort((a, b) => {
    if (a.confirmedReferrals !== b.confirmedReferrals) {
      return b.confirmedReferrals - a.confirmedReferrals
    }
    const ta = a.verifiedAt.getTime()
    const tb = b.verifiedAt.getTime()
    if (ta !== tb) return ta - tb
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
  })
  const positions = new Map<string, number>()
  sorted.forEach((row, i) => positions.set(row.id, i + 1))
  return positions
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test src/lib/referral/position.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/referral/position.ts src/lib/referral/position.test.ts
git commit -m "feat: position engine"
```

### Task D2: Reward-tier resolution

**Files:**
- Modify: `src/lib/referral/position.ts` (append)
- Modify: `src/lib/referral/position.test.ts` (append)

- [ ] **Step 1: Add the failing test**

Append to `position.test.ts`:
```typescript
import { resolveRewards, type RewardTier } from './position'

describe('resolveRewards', () => {
  const tiers: RewardTier[] = [
    { referrals: 3, label: 'Early access' },
    { referrals: 10, label: 'Founding member' },
  ]
  test('reports unlocked tiers and the next target', () => {
    const r = resolveRewards(4, tiers)
    expect(r.unlocked.map(t => t.label)).toEqual(['Early access'])
    expect(r.next).toEqual({ referrals: 10, label: 'Founding member' })
    expect(r.toNext).toBe(6)
  })
  test('all unlocked -> next is null', () => {
    const r = resolveRewards(12, tiers)
    expect(r.unlocked.length).toBe(2)
    expect(r.next).toBeNull()
    expect(r.toNext).toBe(0)
  })
  test('none unlocked at zero referrals', () => {
    const r = resolveRewards(0, tiers)
    expect(r.unlocked).toEqual([])
    expect(r.next?.label).toBe('Early access')
    expect(r.toNext).toBe(3)
  })
  test('unsorted tiers are handled', () => {
    const r = resolveRewards(4, [{ referrals: 10, label: 'B' }, { referrals: 3, label: 'A' }])
    expect(r.unlocked.map(t => t.label)).toEqual(['A'])
    expect(r.next?.label).toBe('B')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test src/lib/referral/position.test.ts`
Expected: FAIL — `resolveRewards` not exported.

- [ ] **Step 3: Implement (append to `position.ts`)**

```typescript
export interface RewardTier {
  referrals: number
  label: string
}

export interface RewardStatus {
  unlocked: RewardTier[]
  next: RewardTier | null
  toNext: number // referrals still needed to reach `next` (0 if none)
}

export function resolveRewards(confirmedReferrals: number, tiers: RewardTier[]): RewardStatus {
  const sorted = [...tiers].sort((a, b) => a.referrals - b.referrals)
  const unlocked = sorted.filter(t => confirmedReferrals >= t.referrals)
  const next = sorted.find(t => confirmedReferrals < t.referrals) ?? null
  return {
    unlocked,
    next,
    toNext: next ? next.referrals - confirmedReferrals : 0,
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test src/lib/referral/position.test.ts`
Expected: PASS (8 tests total in the file).

- [ ] **Step 5: Commit**

```bash
git add src/lib/referral/position.ts src/lib/referral/position.test.ts
git commit -m "feat: reward tier resolution"
```

---

## Milestone E — Anti-gaming primitives (pure/isolated)

### Task E1: Disposable-email blocking

**Files:**
- Create: `src/lib/antiabuse/disposable.ts`
- Test: `src/lib/antiabuse/disposable.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { test, expect, describe } from 'vitest'
import { isDisposableEmail } from './disposable'

describe('isDisposableEmail', () => {
  test('flags a known disposable domain', () => {
    expect(isDisposableEmail('someone@mailinator.com')).toBe(true)
  })
  test('allows a normal domain', () => {
    expect(isDisposableEmail('aline@gmail.com')).toBe(false)
  })
  test('is case-insensitive on the domain', () => {
    expect(isDisposableEmail('X@Mailinator.COM')).toBe(true)
  })
  test('treats a malformed email (no domain) as not disposable', () => {
    expect(isDisposableEmail('nope')).toBe(false)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test src/lib/antiabuse/disposable.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```typescript
// `disposable-email-domains` exports an array of domains (CommonJS).
import disposableDomains from 'disposable-email-domains'

const set = new Set((disposableDomains as string[]).map(d => d.toLowerCase()))

export function isDisposableEmail(email: string): boolean {
  const at = email.lastIndexOf('@')
  if (at === -1) return false
  const domain = email.slice(at + 1).toLowerCase().trim()
  if (!domain) return false
  return set.has(domain)
}
```
> Note: if the import shape differs (default vs named), adjust to `import { default as disposableDomains }` — verify with a quick `node -e "console.log(require('disposable-email-domains').slice(0,2))"`.

- [ ] **Step 4: Run to verify it passes**

Run: `npm test src/lib/antiabuse/disposable.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/antiabuse/disposable.ts src/lib/antiabuse/disposable.test.ts
git commit -m "feat: disposable email blocking"
```

### Task E2: Rate limiter (pluggable store, in-memory impl)

**Files:**
- Create: `src/lib/antiabuse/ratelimit.ts`
- Test: `src/lib/antiabuse/ratelimit.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { test, expect, describe, vi, beforeEach, afterEach } from 'vitest'
import { InMemoryRateLimiter } from './ratelimit'

describe('InMemoryRateLimiter', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  test('allows up to `max` hits then blocks within the window', async () => {
    const rl = new InMemoryRateLimiter({ max: 3, windowMs: 60_000 })
    expect(await rl.allow('ip:1')).toBe(true)
    expect(await rl.allow('ip:1')).toBe(true)
    expect(await rl.allow('ip:1')).toBe(true)
    expect(await rl.allow('ip:1')).toBe(false) // 4th within window
  })

  test('separate keys have separate budgets', async () => {
    const rl = new InMemoryRateLimiter({ max: 1, windowMs: 60_000 })
    expect(await rl.allow('ip:1')).toBe(true)
    expect(await rl.allow('ip:2')).toBe(true)
    expect(await rl.allow('ip:1')).toBe(false)
  })

  test('budget resets after the window elapses', async () => {
    const rl = new InMemoryRateLimiter({ max: 1, windowMs: 60_000 })
    expect(await rl.allow('ip:1')).toBe(true)
    expect(await rl.allow('ip:1')).toBe(false)
    vi.advanceTimersByTime(60_001)
    expect(await rl.allow('ip:1')).toBe(true)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test src/lib/antiabuse/ratelimit.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```typescript
export interface RateLimiter {
  /** Returns true if the action is allowed (and records it), false if over budget. */
  allow(key: string): Promise<boolean>
}

interface Bucket { count: number; resetAt: number }

export class InMemoryRateLimiter implements RateLimiter {
  private readonly max: number
  private readonly windowMs: number
  private readonly buckets = new Map<string, Bucket>()

  constructor(opts: { max: number; windowMs: number }) {
    this.max = opts.max
    this.windowMs = opts.windowMs
  }

  async allow(key: string): Promise<boolean> {
    const now = Date.now()
    const bucket = this.buckets.get(key)
    if (!bucket || now >= bucket.resetAt) {
      this.buckets.set(key, { count: 1, resetAt: now + this.windowMs })
      return true
    }
    if (bucket.count >= this.max) return false
    bucket.count += 1
    return true
  }
}
```
> The `RateLimiter` interface lets Plan 6 swap in a Redis/Upstash-backed limiter for multi-instance deploys without touching call sites.

- [ ] **Step 4: Run to verify it passes**

Run: `npm test src/lib/antiabuse/ratelimit.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/antiabuse/ratelimit.ts src/lib/antiabuse/ratelimit.test.ts
git commit -m "feat: pluggable rate limiter"
```

---

## Milestone F — Email interface (fake for now)

### Task F1: EmailSender interface + fake

**Files:**
- Create: `src/lib/email/types.ts`
- Create: `src/lib/email/fake.ts`
- Test: `src/lib/email/fake.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { test, expect, describe } from 'vitest'
import { FakeEmailSender } from './fake'

describe('FakeEmailSender', () => {
  test('records sent messages for assertion', async () => {
    const sender = new FakeEmailSender()
    await sender.send({ to: 'a@b.com', subject: 'Confirm', html: '<a>x</a>' })
    expect(sender.sent).toHaveLength(1)
    expect(sender.sent[0].to).toBe('a@b.com')
    expect(sender.sent[0].subject).toBe('Confirm')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test src/lib/email/fake.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the interface**

`src/lib/email/types.ts`:
```typescript
export interface EmailMessage {
  to: string
  subject: string
  html: string
}

export interface EmailSender {
  send(msg: EmailMessage): Promise<void>
}
```

`src/lib/email/fake.ts`:
```typescript
import type { EmailSender, EmailMessage } from './types'

export class FakeEmailSender implements EmailSender {
  public readonly sent: EmailMessage[] = []
  async send(msg: EmailMessage): Promise<void> {
    this.sent.push(msg)
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test src/lib/email/fake.test.ts`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add src/lib/email/
git commit -m "feat: email sender interface + fake"
```

---

## Milestone G — Signups repository (integration-tested)

### Task G1: Supabase client factory

**Files:**
- Create: `src/lib/db/client.ts`

- [ ] **Step 1: Install the client**

Run:
```bash
cd ~/Personal/refqueue
npm install @supabase/supabase-js
```

- [ ] **Step 2: Implement the factory**

```typescript
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export function createServiceClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set')
  }
  return createClient(url, key, { auth: { persistSession: false } })
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/db/client.ts
git commit -m "feat: supabase service client factory"
```

### Task G2: Signups repository — create, verify, count referrals

**Files:**
- Create: `src/lib/db/signups.ts`
- Test: `src/lib/db/signups.integration.test.ts`

This repository is the only code that persists signups. Behavior it must guarantee:
- `createSignup` generates a unique referral code, stores `verified=false` and a `verify_token`, and records `referred_by` only when a valid referrer code exists **on the same waitlist**.
- Re-signing up the same email on the same waitlist returns the existing row (idempotent), not a duplicate.
- `verifySignup(token)` flips `verified=true`, sets `verified_at`, clears `verify_token`, and is idempotent.
- `countConfirmedReferrals` counts only **verified** signups whose `referred_by` is the given signup.

- [ ] **Step 1: Write the failing integration test**

`src/lib/db/signups.integration.test.ts`:
```typescript
import { test, expect, describe, beforeEach } from 'vitest'
import { createServiceClient } from './client'
import { createWaitlistForTest, createSignup, verifySignup, countConfirmedReferrals, getSignupByCode } from './signups'

const db = createServiceClient()

async function reset() {
  await db.from('signups').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await db.from('waitlists').delete().neq('id', '00000000-0000-0000-0000-000000000000')
}

describe('signups repository (integration)', () => {
  beforeEach(reset)

  test('createSignup issues a referral code and stores unverified', async () => {
    const wl = await createWaitlistForTest(db, 'app-a')
    const s = await createSignup(db, { waitlistId: wl.id, email: 'a@example.com' })
    expect(s.referral_code).toMatch(/^[0-9A-Za-z_-]{8}$/)
    expect(s.verified).toBe(false)
    expect(s.verify_token).toBeTruthy()
  })

  test('same email on same waitlist is idempotent', async () => {
    const wl = await createWaitlistForTest(db, 'app-b')
    const first = await createSignup(db, { waitlistId: wl.id, email: 'dup@example.com' })
    const second = await createSignup(db, { waitlistId: wl.id, email: 'dup@example.com' })
    expect(second.id).toBe(first.id)
  })

  test('referred_by is set when the referrer code exists on the waitlist', async () => {
    const wl = await createWaitlistForTest(db, 'app-c')
    const referrer = await createSignup(db, { waitlistId: wl.id, email: 'ref@example.com' })
    const referred = await createSignup(db, {
      waitlistId: wl.id, email: 'new@example.com', referrerCode: referrer.referral_code,
    })
    expect(referred.referred_by).toBe(referrer.id)
  })

  test('referred_by is null when the referrer code is unknown', async () => {
    const wl = await createWaitlistForTest(db, 'app-d')
    const referred = await createSignup(db, {
      waitlistId: wl.id, email: 'x@example.com', referrerCode: 'ZZZZZZZZ',
    })
    expect(referred.referred_by).toBeNull()
  })

  test('countConfirmedReferrals counts only verified referred signups', async () => {
    const wl = await createWaitlistForTest(db, 'app-e')
    const referrer = await createSignup(db, { waitlistId: wl.id, email: 'r@example.com' })
    const a = await createSignup(db, { waitlistId: wl.id, email: 'a@example.com', referrerCode: referrer.referral_code })
    await createSignup(db, { waitlistId: wl.id, email: 'b@example.com', referrerCode: referrer.referral_code })
    // Only `a` verifies.
    await verifySignup(db, a.verify_token!)
    expect(await countConfirmedReferrals(db, referrer.id)).toBe(1)
  })

  test('verifySignup is idempotent and clears the token', async () => {
    const wl = await createWaitlistForTest(db, 'app-f')
    const s = await createSignup(db, { waitlistId: wl.id, email: 'v@example.com' })
    const token = s.verify_token!
    const first = await verifySignup(db, token)
    expect(first?.verified).toBe(true)
    expect(first?.verify_token).toBeNull()
    const again = await verifySignup(db, token) // token already cleared
    expect(again).toBeNull()
    // The signup stays verified.
    const still = await getSignupByCode(db, wl.id, s.referral_code)
    expect(still?.verified).toBe(true)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test:integration`
Expected: FAIL — module `./signups` not found. (Ensure `.env` has local Supabase creds so `createServiceClient` connects.)

- [ ] **Step 3: Implement the repository**

`src/lib/db/signups.ts`:
```typescript
import type { SupabaseClient } from '@supabase/supabase-js'
import { generateReferralCode } from '@/lib/referral/code'
import { randomToken } from '@/lib/referral/token'

export interface SignupRecord {
  id: string
  waitlist_id: string
  email: string
  verified: boolean
  verify_token: string | null
  referral_code: string
  referred_by: string | null
  created_at: string
  verified_at: string | null
}

export async function createWaitlistForTest(db: SupabaseClient, slug: string) {
  const { data, error } = await db
    .from('waitlists')
    .insert({ name: slug, slug })
    .select()
    .single()
  if (error) throw error
  return data as { id: string; slug: string }
}

export async function getSignupByCode(db: SupabaseClient, waitlistId: string, code: string) {
  const { data } = await db
    .from('signups')
    .select('*')
    .eq('waitlist_id', waitlistId)
    .eq('referral_code', code)
    .maybeSingle()
  return (data as SignupRecord) ?? null
}

async function findReferrerId(db: SupabaseClient, waitlistId: string, referrerCode?: string): Promise<string | null> {
  if (!referrerCode) return null
  const { data } = await db
    .from('signups')
    .select('id')
    .eq('waitlist_id', waitlistId)
    .eq('referral_code', referrerCode)
    .maybeSingle()
  return data ? (data as { id: string }).id : null
}

export async function createSignup(
  db: SupabaseClient,
  input: { waitlistId: string; email: string; referrerCode?: string },
): Promise<SignupRecord> {
  const email = input.email.trim().toLowerCase()

  // Idempotent: return the existing row if this email already signed up on this waitlist.
  const { data: existing } = await db
    .from('signups')
    .select('*')
    .eq('waitlist_id', input.waitlistId)
    .eq('email', email)
    .maybeSingle()
  if (existing) return existing as SignupRecord

  const referredBy = await findReferrerId(db, input.waitlistId, input.referrerCode)

  // Retry on the (rare) referral_code unique collision.
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await db
      .from('signups')
      .insert({
        waitlist_id: input.waitlistId,
        email,
        referral_code: generateReferralCode(),
        verify_token: randomToken(),
        referred_by: referredBy,
      })
      .select()
      .single()
    if (!error) return data as SignupRecord
    // 23505 = unique_violation. If it's the email (race), fetch & return; if code, retry.
    if (error.code === '23505') {
      const { data: raced } = await db
        .from('signups')
        .select('*')
        .eq('waitlist_id', input.waitlistId)
        .eq('email', email)
        .maybeSingle()
      if (raced) return raced as SignupRecord
      continue // code collision — regenerate and retry
    }
    throw error
  }
  throw new Error('createSignup: exhausted referral_code attempts')
}

export async function verifySignup(db: SupabaseClient, token: string): Promise<SignupRecord | null> {
  const { data, error } = await db
    .from('signups')
    .update({ verified: true, verified_at: new Date().toISOString(), verify_token: null })
    .eq('verify_token', token)
    .select()
    .maybeSingle()
  if (error) throw error
  return (data as SignupRecord) ?? null // null when token already used/cleared
}

export async function countConfirmedReferrals(db: SupabaseClient, signupId: string): Promise<number> {
  const { count, error } = await db
    .from('signups')
    .select('id', { count: 'exact', head: true })
    .eq('referred_by', signupId)
    .eq('verified', true)
  if (error) throw error
  return count ?? 0
}
```

- [ ] **Step 4: Create the token helper it depends on**

`src/lib/referral/token.ts`:
```typescript
import { customAlphabet } from 'nanoid'
const nano = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', 32)
export function randomToken(): string {
  return nano()
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `npm run test:integration`
Expected: PASS (6 tests). If `createServiceClient` throws, confirm `.env` holds the local Supabase URL + service_role key and that `npx supabase start` is running.

- [ ] **Step 6: Commit**

```bash
git add src/lib/db/signups.ts src/lib/referral/token.ts src/lib/db/signups.integration.test.ts
git commit -m "feat: signups repository (create/verify/count)"
```

---

## Milestone H — API routes (thin, integration-tested)

### Task H1: POST /api/signup

**Files:**
- Create: `src/app/api/signup/route.ts`
- Create: `src/lib/db/waitlists.ts` (lookup by slug)
- Test: `src/app/api/signup/route.integration.test.ts`

- [ ] **Step 1: Write the failing integration test**

```typescript
import { test, expect, describe, beforeEach } from 'vitest'
import { POST } from './route'
import { createServiceClient } from '@/lib/db/client'
import { createWaitlistForTest } from '@/lib/db/signups'

const db = createServiceClient()
async function reset() {
  await db.from('signups').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await db.from('waitlists').delete().neq('id', '00000000-0000-0000-0000-000000000000')
}

function req(body: unknown, ip = '10.0.0.1') {
  return new Request('http://localhost/api/signup', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify(body),
  })
}

describe('POST /api/signup (integration)', () => {
  beforeEach(reset)

  test('valid signup returns 200 with a referral code and position', async () => {
    const wl = await createWaitlistForTest(db, 'launch')
    const res = await POST(req({ waitlistSlug: 'launch', email: 'a@example.com' }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.referralCode).toMatch(/^[0-9A-Za-z_-]{8}$/)
    expect(typeof json.position).toBe('number')
  })

  test('malformed email returns 400', async () => {
    const wl = await createWaitlistForTest(db, 'launch2')
    const res = await POST(req({ waitlistSlug: 'launch2', email: 'nope' }))
    expect(res.status).toBe(400)
  })

  test('disposable email returns 422', async () => {
    const wl = await createWaitlistForTest(db, 'launch3')
    const res = await POST(req({ waitlistSlug: 'launch3', email: 'x@mailinator.com' }))
    expect(res.status).toBe(422)
  })

  test('unknown waitlist slug returns 404', async () => {
    const res = await POST(req({ waitlistSlug: 'ghost', email: 'a@example.com' }))
    expect(res.status).toBe(404)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test:integration`
Expected: FAIL — `./route` not found.

- [ ] **Step 3: Add the waitlist lookup**

`src/lib/db/waitlists.ts`:
```typescript
import type { SupabaseClient } from '@supabase/supabase-js'

export interface WaitlistRecord {
  id: string
  name: string
  slug: string
  theme: Record<string, unknown>
  reward_tiers: { referrals: number; label: string }[]
  powered_by: boolean
}

export async function getWaitlistBySlug(db: SupabaseClient, slug: string): Promise<WaitlistRecord | null> {
  const { data } = await db.from('waitlists').select('*').eq('slug', slug).maybeSingle()
  return (data as WaitlistRecord) ?? null
}
```

- [ ] **Step 4: Implement the route**

`src/app/api/signup/route.ts`:
```typescript
import { NextResponse } from 'next/server'
import { signupInputSchema } from '@/lib/validation'
import { isDisposableEmail } from '@/lib/antiabuse/disposable'
import { InMemoryRateLimiter } from '@/lib/antiabuse/ratelimit'
import { createServiceClient } from '@/lib/db/client'
import { getWaitlistBySlug } from '@/lib/db/waitlists'
import { createSignup, countConfirmedReferrals } from '@/lib/db/signups'
import { computePositions } from '@/lib/referral/position'

// Module-scoped limiter: 5 signups / 10 min / IP. Plan 6 swaps in a shared store.
const limiter = new InMemoryRateLimiter({ max: 5, windowMs: 10 * 60_000 })

function clientIp(req: Request): string {
  return (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown'
}

export async function POST(req: Request) {
  const parsed = signupInputSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input' }, { status: 400 })
  const { waitlistSlug, email, ref } = parsed.data

  if (isDisposableEmail(email)) {
    return NextResponse.json({ error: 'disposable_email' }, { status: 422 })
  }
  if (!(await limiter.allow(`signup:${clientIp(req)}`))) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
  }

  const db = createServiceClient()
  const waitlist = await getWaitlistBySlug(db, waitlistSlug)
  if (!waitlist) return NextResponse.json({ error: 'waitlist_not_found' }, { status: 404 })

  const signup = await createSignup(db, { waitlistId: waitlist.id, email, referrerCode: ref })

  // Compute this signup's current position across verified signups (+ itself if verified).
  const { data: rows } = await db
    .from('signups')
    .select('id, verified, verified_at, referred_by')
    .eq('waitlist_id', waitlist.id)
  const verified = (rows ?? []).filter(r => r.verified)
  const withCounts = await Promise.all(
    verified.map(async r => ({
      id: r.id as string,
      confirmedReferrals: await countConfirmedReferrals(db, r.id as string),
      verifiedAt: new Date(r.verified_at as string),
    })),
  )
  const position = computePositions(withCounts).get(signup.id) ?? verified.length + 1

  return NextResponse.json({
    referralCode: signup.referral_code,
    verified: signup.verified,
    position,
  })
}
```
> The unverified new signup isn't in `verified`, so `computePositions` returns `undefined` for it → we fall back to `verified.length + 1` ("last, pending confirmation"). After they verify (Task H2) their real position is reflected.

- [ ] **Step 5: Run to verify it passes**

Run: `npm run test:integration`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add src/app/api/signup/route.ts src/lib/db/waitlists.ts src/app/api/signup/route.integration.test.ts
git commit -m "feat: POST /api/signup"
```

### Task H2: GET /api/verify

**Files:**
- Create: `src/app/api/verify/route.ts`
- Test: `src/app/api/verify/route.integration.test.ts`

- [ ] **Step 1: Write the failing integration test**

```typescript
import { test, expect, describe, beforeEach } from 'vitest'
import { GET } from './route'
import { createServiceClient } from '@/lib/db/client'
import { createWaitlistForTest, createSignup } from '@/lib/db/signups'

const db = createServiceClient()
async function reset() {
  await db.from('signups').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await db.from('waitlists').delete().neq('id', '00000000-0000-0000-0000-000000000000')
}
const verifyReq = (token: string) => new Request(`http://localhost/api/verify?token=${token}`)

describe('GET /api/verify (integration)', () => {
  beforeEach(reset)

  test('valid token verifies the signup and returns 200', async () => {
    const wl = await createWaitlistForTest(db, 'v1')
    const s = await createSignup(db, { waitlistId: wl.id, email: 'a@example.com' })
    const res = await GET(verifyReq(s.verify_token!))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.verified).toBe(true)
  })

  test('missing token returns 400', async () => {
    const res = await GET(new Request('http://localhost/api/verify'))
    expect(res.status).toBe(400)
  })

  test('already-used or unknown token returns 410', async () => {
    const res = await GET(verifyReq('deadbeefdeadbeefdeadbeefdeadbeef'))
    expect(res.status).toBe(410)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test:integration`
Expected: FAIL — `./route` not found.

- [ ] **Step 3: Implement the route**

`src/app/api/verify/route.ts`:
```typescript
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/db/client'
import { verifySignup } from '@/lib/db/signups'

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'missing_token' }, { status: 400 })

  const db = createServiceClient()
  const signup = await verifySignup(db, token)
  if (!signup) return NextResponse.json({ error: 'invalid_or_used_token' }, { status: 410 })

  return NextResponse.json({ verified: true, referralCode: signup.referral_code })
}
```
> In Plan 3 this route redirects to the status page instead of returning JSON; the JSON shape stays available for tests.

- [ ] **Step 4: Run to verify it passes**

Run: `npm run test:integration`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/verify/route.ts src/app/api/verify/route.integration.test.ts
git commit -m "feat: GET /api/verify"
```

---

## Milestone I — Full-suite gate

### Task I1: Run everything, wire CI

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Run the whole suite locally**

Run:
```bash
npm test && npm run test:integration
```
Expected: all unit + integration tests green.

- [ ] **Step 2: Write CI (unit tests only; integration needs a DB service — added in Plan 6)**

`.github/workflows/ci.yml`:
```yaml
name: CI
on: [push, pull_request]
jobs:
  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm test
```

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: run unit tests on push/PR"
```

---

## Self-Review (completed against the spec)

**Spec coverage:**
- Email signup → position ✓ (H1, D1). Unique referral link per signup ✓ (C1, G2). Referrals recalculate position ✓ (D1 + `countConfirmedReferrals`). Double opt-in ✓ (G2, H2). "Referral counts only after verify" anti-gaming spine ✓ (G2 test + `countConfirmedReferrals` verified-only filter). Rate limiting ✓ (E2, H1). Disposable-email blocking ✓ (E1, H1). Reward tiers as labeled unlocks ✓ (D2). Data model matches spec (`waitlists`, `signups`, derived position) ✓ (B1).
- **Deferred by design** (later plans, not gaps): themeable landing page + status page (Plan 3), maker dashboard + CSV + chart + auth (Plan 4), real emails (Plan 2), powered-by credit + env theming (Plan 5), Docker/Vercel/README (Plan 6). Milestone-facing signup-status *values* (position, referral code) are already returned by the API so Plan 3 is pure presentation.

**Placeholder scan:** no "TBD/TODO/handle edge cases" left; every code step has complete code. The one import-shape note (E1 Step 3) includes the exact command to resolve it.

**Type consistency:** `SignupRecord` (db) vs `SignupRow` (position engine) are intentionally distinct — the engine takes a minimal `{id, confirmedReferrals, verifiedAt}` shape mapped in H1. `verifySignup`, `createSignup`, `countConfirmedReferrals`, `computePositions`, `resolveRewards` signatures are used identically wherever referenced.

---

## Execution Handoff

Choose when ready to build:

1. **Subagent-Driven (recommended)** — a fresh subagent per task, two-stage review between tasks (uses superpowers:subagent-driven-development).
2. **Inline Execution** — tasks run in this session with checkpoints (uses superpowers:executing-plans).

Before executing: work happens in `~/Personal/refqueue`, ideally in an isolated worktree (superpowers:using-git-worktrees).
