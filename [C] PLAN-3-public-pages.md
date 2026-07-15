# RefQueue — Plan 3: Public Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give RefQueue its visitor-facing flow — a landing page with the signup form (honoring `?ref=` links), a per-signup status page (position, shareable referral link, share buttons, reward progress), and a verify flow that survives email-scanner prefetch and redirects into the status page.

**Architecture:** All new *logic* lands in tested modules; the two pages are thin server components over them. A status service (`getSignupStatus`) computes position + confirmed referrals + reward status + referral link in **one** DB query (killing the Plan-1 N+1 — `listVerifiedSignups` now also returns `referred_by`, and a pure `tallyConfirmedReferrals` derives every count from that single result set). `POST /api/signup` is refactored onto the service, so its response gains `referralLink` and `rewards`. `verifySignup` becomes idempotent (the token is *kept* after verification and re-verifying is a no-op that reports `alreadyVerified`) so an Outlook-Safe-Links prefetch no longer locks the real user out; `GET /api/verify` turns into a 303 redirect to `/status/<referral_code>`, firing milestone emails only on the first verify. The single waitlist row is auto-provisioned from env (`WAITLIST_SLUG`/`WAITLIST_NAME`) — env stays the only config surface. RLS is enabled deny-all as fail-closed insurance (service_role bypasses it). Interactive bits (`SignupForm`, `CopyButton`) are small client components; everything they call is covered by route/service tests.

**Tech Stack:** Next.js 15 (App Router, server components, CSS modules) · TypeScript · Vitest · Supabase (local via colima). Builds on Plan 1 (schema, repos, position/reward engine, routes) and Plan 2 (email senders, templates, milestone service).

**Repo location:** `~/Personal/refqueue` (Plans 1–2 complete, on `main`, remote `origin` = private `alinearonsky/refqueue`). This planning doc lives in `~/Code Documentation/refqueue/`.

---

## Scope: this is Plan 3 of 6

| Plan | Subsystem | Produces |
|---|---|---|
| 1 | Core engine | ✅ done — tested backend + minimal API |
| 2 | Email: Resend + SMTP behind the interface; confirmation + milestone emails | ✅ done — real emails on signup + tier-unlock |
| **3 (this)** | Public pages: landing + signup status page, verify→status redirect | Visitor-facing flow |
| 4 | Maker dashboard + Supabase Auth | Maker-facing flow |
| 5 | Theming/config + "powered by RefQueue" credit | Configurable, self-distributing |
| 6 | Deploy: Vercel + Docker, README, CONTRIBUTING | Shippable v1 |

**Explicitly OUT of Plan 3 (YAGNI / later plans):** theming (logo, colors, copy overrides — Plan 5 fills `waitlists.theme`; this plan ships one clean default look), the "powered by RefQueue" credit (Plan 5), maker dashboard and auth (Plan 4), a public status *API* route (pages read server-side; the embeddable widget that would need one is v1.1 backlog), component-test tooling (React Testing Library + jsdom — pages stay presentational; logic lives in tested modules; revisit in Plan 4 when the dashboard raises the stakes), reward-tier env config (tiers stay DB-configured until Plan 5's config pass), trusted-proxy/rate-limit hardening (Plan 6).

**Design decisions locked in this plan:**
1. **Prefetch-safe verify = idempotent GET, not a confirm interstitial.** The Plan-1 review flagged that scanners (Outlook Safe Links) prefetch email links and would consume a single-use token. Options were an interstitial (extra human click — friction on the flow's dopamine moment) or idempotent verify. We keep the token after verification: prefetch verifies, the human's click re-verifies as a no-op and lands on the same status redirect. A scanner prefetch still proves the inbox is real (the token is unguessable and only ever travels through that inbox), so the anti-gaming property of double-opt-in holds. Consequence: the verify URL becomes a durable link to a page that shows position/referral-code — acceptable, because the status page is already public-by-referral-code and renders **no email address**.
2. **Single-waitlist instance keyed by env.** MVP is one hosted page; the row is auto-provisioned (and its name kept in sync) from `WAITLIST_SLUG`/`WAITLIST_NAME` on landing-page render — idempotent, so a maker deploys with env vars and it just works. Multi-waitlist stays out of v1 per PRODUCT.md.
3. **N+1 fix folded in.** The status page would have doubled the call sites of the per-signup `countConfirmedReferrals` loop, so the extraction moment is the fix moment: one query + pure tally. This closes hardening-backlog item 4 early.

---

## Context from Plans 1–2 (existing code this plan uses — do NOT reimplement)

- `src/lib/referral/position.ts` → `SignupRow { id; confirmedReferrals; verifiedAt }`, `computePositions(rows): Map<id, position>` (referrals desc, verifiedAt asc, id asc), `RewardTier { referrals; label }`, `RewardStatus { unlocked; next; toNext }`, `resolveRewards(count, tiers)`.
- `src/lib/referral/code.ts` → `isValidReferralCode(code)` — `/^[0-9A-Za-z_-]{8}$/`; use it to validate `?ref=` and `/status/[code]`.
- `src/lib/db/signups.ts` → `SignupRecord`, `createSignup` (idempotent per email), `verifySignup` (rewritten in O1), `countConfirmedReferrals`, `listVerifiedSignups` (extended in N1), `getSignupByCode`, `getSignupById`, `createWaitlistForTest(db, slug, rewardTiers?)`.
- `src/lib/db/waitlists.ts` → `WaitlistRecord { id, name, slug, theme, reward_tiers, powered_by }`, `getWaitlistBySlug`, `getWaitlistById`.
- `src/lib/db/client.ts` → `createServiceClient()` (service-role; server-side only — fine to call from server components, they never ship to the client).
- `src/lib/email/` → `getEmailSender()` + `setEmailSenderForTest()`, `FakeEmailSender` (`sent: EmailMessage[]`), `buildConfirmationEmail`, factory fallback order Resend → SMTP → Fake.
- `src/lib/notifications/milestone.ts` → `notifyReferrerMilestone(db, sender, verifiedSignup)` — call only on *first* verify.
- Routes: `src/app/api/signup/route.ts` (POST), `src/app/api/verify/route.ts` (GET).
- Migrations are plain ordered files: `supabase/migrations/0001_core_schema.sql` → this plan adds `0002_enable_rls.sql`.
- **Test env:** Vitest does NOT auto-load `.env`. Integration runs: `bash -c 'set -a; source .env; set +a; npm run test:integration'`. Unit runs: `npm test`. Local stack: `supabase start` (colima; analytics disabled in config.toml).
- Rate limiter: module-scoped, 5 signups / 10 min / IP keyed on `x-forwarded-for` — integration tests must vary the IP per request when a test makes several POSTs.
- Next 15: `params`/`searchParams` page props are **Promises** — `await` them.

---

## File Structure (Plan 3)

```
src/lib/
├── config.ts                        # NEW — getWaitlistConfig(), getAppBaseUrl() (only place reading these env vars)
├── referral/
│   ├── position.ts                  # MODIFY — add tallyConfirmedReferrals (pure)
│   ├── position.test.ts             # MODIFY — tests for tally
│   ├── share.ts                     # NEW — buildReferralLink, buildShareLinks (pure)
│   └── share.test.ts                # NEW
├── status/
│   ├── status.ts                    # NEW — getSignupStatus service (1 query)
│   └── status.integration.test.ts   # NEW
├── db/
│   ├── signups.ts                   # MODIFY — listVerifiedSignups +referred_by; verifySignup idempotent (VerifyResult)
│   ├── signups.integration.test.ts  # MODIFY — updated verify tests
│   ├── waitlists.ts                 # MODIFY — add ensureWaitlist
│   └── waitlists.integration.test.ts# NEW
├── email/
│   ├── logging.ts                   # NEW — LoggingEmailSender (dev fallback prints emails → verify link visible)
│   ├── logging.test.ts              # NEW
│   └── factory.ts                   # MODIFY — no-provider fallback returns LoggingEmailSender
└── notifications/
    ├── milestone.ts                 # MODIFY — drop redundant `?? []` guard (polish)
    └── milestone.integration.test.ts# MODIFY — verifySignup call sites
src/app/
├── layout.tsx                       # MODIFY — real metadata
├── page.tsx                         # REPLACE — landing page (server component)
├── page.module.css                  # REPLACE — landing styles
├── SignupForm.tsx                   # NEW — client component
├── SignupForm.module.css            # NEW
├── status/[code]/
│   ├── page.tsx                     # NEW — status page (server component)
│   ├── page.module.css              # NEW
│   └── CopyButton.tsx               # NEW — client component
└── api/
    ├── signup/route.ts              # MODIFY — use status service; response +referralLink +rewards
    ├── signup/route.integration.test.ts  # MODIFY — new fields; drop unused `wl` bindings
    ├── verify/route.ts              # MODIFY — 303 redirects; milestone only on first verify
    └── verify/route.integration.test.ts  # MODIFY — redirect assertions; prefetch test; e2e position test
supabase/migrations/
└── 0002_enable_rls.sql              # NEW — deny-all RLS on both tables
.env.example                         # MODIFY — WAITLIST_SLUG, WAITLIST_NAME
```

**Boundaries:** `db/` stays the only code touching Postgres (server components call `db/` functions, never the Supabase client directly). `config.ts` is the only reader of `WAITLIST_*`/`APP_BASE_URL`. Pure logic (tally, links) lives in `referral/` with unit tests; the status service composes db + pure and is integration-tested; pages render, nothing more.

---

## Milestone N — Status engine (backend)

### Task N1: Pure referral tally + single-query verified list

**Files:**
- Modify: `src/lib/referral/position.ts`
- Modify: `src/lib/referral/position.test.ts`
- Modify: `src/lib/db/signups.ts` (`VerifiedSignupRow`, `listVerifiedSignups`)

- [ ] **Step 1: Write the failing unit test**

Append to `src/lib/referral/position.test.ts` (inside the file, top-level alongside existing tests — extend the import from `./position` with `tallyConfirmedReferrals`):

```ts
describe('tallyConfirmedReferrals', () => {
  test('counts verified rows per referrer id', () => {
    const rows = [
      { id: 'a', referred_by: null },
      { id: 'b', referred_by: 'a' },
      { id: 'c', referred_by: 'a' },
      { id: 'd', referred_by: 'b' },
    ]
    const tally = tallyConfirmedReferrals(rows)
    expect(tally.get('a')).toBe(2)
    expect(tally.get('b')).toBe(1)
    expect(tally.get('c')).toBeUndefined()
    expect(tally.get('d')).toBeUndefined()
  })

  test('empty input yields an empty tally', () => {
    expect(tallyConfirmedReferrals([]).size).toBe(0)
  })
})
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npm test -- position`
Expected: FAIL — `tallyConfirmedReferrals` is not exported.

- [ ] **Step 3: Implement the tally (pure)**

Append to `src/lib/referral/position.ts`:

```ts
export interface ReferredRow {
  id: string
  referred_by: string | null
}

/**
 * Derives every signup's confirmed-referral count from an already-fetched list of
 * *verified* signups: a signup's count is the number of verified rows whose
 * referred_by points at it. One pass over one query result — replaces the
 * one-count-query-per-signup pattern (Plan 1 hardening item 4).
 */
export function tallyConfirmedReferrals(rows: ReferredRow[]): Map<string, number> {
  const tally = new Map<string, number>()
  for (const row of rows) {
    if (row.referred_by) tally.set(row.referred_by, (tally.get(row.referred_by) ?? 0) + 1)
  }
  return tally
}
```

- [ ] **Step 4: Run the unit suite**

Run: `npm test -- position`
Expected: PASS.

- [ ] **Step 5: Extend `listVerifiedSignups` to carry `referred_by`**

In `src/lib/db/signups.ts`, change the interface and select:

```ts
export interface VerifiedSignupRow {
  id: string
  verified_at: string | null
  referred_by: string | null
}

/** Verified signups on a waitlist, in the shape the position engine + tally need. */
export async function listVerifiedSignups(db: SupabaseClient, waitlistId: string): Promise<VerifiedSignupRow[]> {
  const { data, error } = await db
    .from('signups')
    .select('id, verified_at, referred_by')
    .eq('waitlist_id', waitlistId)
    .eq('verified', true)
  if (error) throw error
  return (data ?? []) as VerifiedSignupRow[]
}
```

- [ ] **Step 6: Typecheck + full unit suite**

Run: `npx tsc --noEmit && npm test`
Expected: clean (the change is additive; the signup route still compiles).

- [ ] **Step 7: Commit**

```bash
git add src/lib/referral/position.ts src/lib/referral/position.test.ts src/lib/db/signups.ts
git commit -m "feat: pure referral tally + referred_by in verified list (kills position N+1)"
```

### Task N2: Config module + referral/share link builders (pure)

**Files:**
- Create: `src/lib/config.ts`
- Create: `src/lib/referral/share.ts`
- Test: `src/lib/referral/share.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/referral/share.test.ts`:

```ts
import { test, expect, describe } from 'vitest'
import { buildReferralLink, buildShareLinks } from './share'

describe('buildReferralLink', () => {
  test('appends the code as ?ref= on the base URL', () => {
    expect(buildReferralLink('Ab12Cd34', 'https://wl.example.com')).toBe('https://wl.example.com/?ref=Ab12Cd34')
  })
})

describe('buildShareLinks', () => {
  const link = 'https://wl.example.com/?ref=Ab12Cd34'
  const links = buildShareLinks(link, 'Acme Launch')

  test('every target embeds the URL-encoded referral link', () => {
    const encoded = encodeURIComponent(link)
    expect(links.x).toContain(encoded)
    expect(links.whatsapp).toContain(encoded)
    expect(links.linkedin).toContain(encoded)
    expect(links.email).toContain(encoded)
  })

  test('points at the right services', () => {
    expect(links.x).toMatch(/^https:\/\/twitter\.com\/intent\/tweet\?/)
    expect(links.whatsapp).toMatch(/^https:\/\/wa\.me\/\?text=/)
    expect(links.linkedin).toMatch(/^https:\/\/www\.linkedin\.com\/sharing\/share-offsite\/\?url=/)
    expect(links.email).toMatch(/^mailto:\?subject=/)
  })

  test('mentions the waitlist name in the share text', () => {
    expect(decodeURIComponent(links.x)).toContain('Acme Launch')
  })
})
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npm test -- share`
Expected: FAIL — module `./share` not found.

- [ ] **Step 3: Implement config + share**

Create `src/lib/config.ts`:

```ts
/**
 * Single reader of the instance-level env config (env is v1's only config surface).
 * WAITLIST_SLUG/WAITLIST_NAME identify the one waitlist this instance hosts;
 * the row is auto-provisioned from these on landing-page render (ensureWaitlist).
 */
export function getWaitlistConfig(): { slug: string; name: string } {
  return {
    slug: process.env.WAITLIST_SLUG ?? 'default',
    name: process.env.WAITLIST_NAME ?? 'Waitlist',
  }
}

export function getAppBaseUrl(): string {
  return process.env.APP_BASE_URL ?? 'http://localhost:3000'
}
```

Create `src/lib/referral/share.ts`:

```ts
import { getAppBaseUrl } from '@/lib/config'

export function buildReferralLink(code: string, base: string = getAppBaseUrl()): string {
  return `${base}/?ref=${code}`
}

export interface ShareLinks {
  x: string
  whatsapp: string
  linkedin: string
  email: string
}

/** Prebuilt share-intent URLs for the status page. Text stays honest: referring moves the referrer up. */
export function buildShareLinks(referralLink: string, waitlistName: string): ShareLinks {
  const text = `Join the ${waitlistName} waitlist through my link:`
  const url = encodeURIComponent(referralLink)
  const msg = encodeURIComponent(`${text} ${referralLink}`)
  return {
    x: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${url}`,
    whatsapp: `https://wa.me/?text=${msg}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
    email: `mailto:?subject=${encodeURIComponent(`Join me on the ${waitlistName} waitlist`)}&body=${msg}`,
  }
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- share`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/config.ts src/lib/referral/share.ts src/lib/referral/share.test.ts
git commit -m "feat: env config module + referral/share link builders"
```

### Task N3: Status service (`getSignupStatus`)

**Files:**
- Create: `src/lib/status/status.ts`
- Test: `src/lib/status/status.integration.test.ts`

- [ ] **Step 1: Write the failing integration test**

Create `src/lib/status/status.integration.test.ts`:

```ts
import { test, expect, describe, beforeEach } from 'vitest'
import { createServiceClient } from '@/lib/db/client'
import { createWaitlistForTest, createSignup, verifySignup } from '@/lib/db/signups'
import { getWaitlistById } from '@/lib/db/waitlists'
import { getSignupStatus } from './status'

const db = createServiceClient()
async function reset() {
  await db.from('signups').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await db.from('waitlists').delete().neq('id', '00000000-0000-0000-0000-000000000000')
}

describe('getSignupStatus (integration)', () => {
  beforeEach(reset)

  test('a confirmed referral moves the referrer ahead of an earlier-verified signup', async () => {
    const wl = await createWaitlistForTest(db, 'st1', [
      { referrals: 1, label: 'Early access' },
      { referrals: 3, label: 'Founding member' },
    ])
    const waitlist = (await getWaitlistById(db, wl.id))!

    // "other" verifies FIRST — wins the time tiebreak until referrals say otherwise
    const other = await createSignup(db, { waitlistId: wl.id, email: 'other@example.com' })
    await verifySignup(db, other.verify_token!)
    const referrer = await createSignup(db, { waitlistId: wl.id, email: 'ref@example.com' })
    await verifySignup(db, referrer.verify_token!)

    const before = await getSignupStatus(db, waitlist, referrer)
    expect(before.position).toBe(2)
    expect(before.confirmedReferrals).toBe(0)

    const friend = await createSignup(db, { waitlistId: wl.id, email: 'friend@example.com', referrerCode: referrer.referral_code })
    await verifySignup(db, friend.verify_token!)

    const after = await getSignupStatus(db, waitlist, referrer)
    expect(after.position).toBe(1)
    expect(after.confirmedReferrals).toBe(1)
    expect(after.rewards.unlocked).toEqual([{ referrals: 1, label: 'Early access' }])
    expect(after.rewards.next).toEqual({ referrals: 3, label: 'Founding member' })
    expect(after.rewards.toNext).toBe(2)
    const base = process.env.APP_BASE_URL ?? 'http://localhost:3000'
    expect(after.referralLink).toBe(`${base}/?ref=${referrer.referral_code}`)
  })

  test('an unverified signup gets the back-of-line fallback position', async () => {
    const wl = await createWaitlistForTest(db, 'st2')
    const waitlist = (await getWaitlistById(db, wl.id))!
    const v = await createSignup(db, { waitlistId: wl.id, email: 'v@example.com' })
    await verifySignup(db, v.verify_token!)
    const pending = await createSignup(db, { waitlistId: wl.id, email: 'p@example.com' })

    const status = await getSignupStatus(db, waitlist, pending)
    expect(status.position).toBe(2) // 1 verified + 1
    expect(status.rewards).toEqual({ unlocked: [], next: null, toNext: 0 })
  })
})
```

> Note: these tests call `verifySignup` without using its return value, so they survive the O1 signature change untouched.

- [ ] **Step 2: Run it to make sure it fails**

Run: `bash -c 'set -a; source .env; set +a; npm run test:integration -- status'`
Expected: FAIL — module `./status` not found. (Local Supabase must be running: `supabase start`.)

- [ ] **Step 3: Implement the service**

Create `src/lib/status/status.ts`:

```ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { WaitlistRecord } from '@/lib/db/waitlists'
import type { SignupRecord } from '@/lib/db/signups'
import { listVerifiedSignups } from '@/lib/db/signups'
import { computePositions, tallyConfirmedReferrals, resolveRewards, type RewardStatus } from '@/lib/referral/position'
import { buildReferralLink } from '@/lib/referral/share'

export interface SignupStatus {
  position: number
  confirmedReferrals: number
  rewards: RewardStatus
  referralLink: string
}

/**
 * Everything the visitor-facing surfaces show about one signup, from a single
 * verified-signups query. Unverified signups fall back to back-of-line
 * (verified count + 1) — same behavior the signup route had in Plan 1.
 */
export async function getSignupStatus(
  db: SupabaseClient,
  waitlist: WaitlistRecord,
  signup: SignupRecord,
): Promise<SignupStatus> {
  const verified = await listVerifiedSignups(db, waitlist.id)
  const counts = tallyConfirmedReferrals(verified)
  const rows = verified.map(r => ({
    id: r.id,
    confirmedReferrals: counts.get(r.id) ?? 0,
    verifiedAt: new Date(r.verified_at as string),
  }))
  const confirmedReferrals = counts.get(signup.id) ?? 0
  return {
    position: computePositions(rows).get(signup.id) ?? verified.length + 1,
    confirmedReferrals,
    rewards: resolveRewards(confirmedReferrals, waitlist.reward_tiers),
    referralLink: buildReferralLink(signup.referral_code),
  }
}
```

- [ ] **Step 4: Run the integration test**

Run: `bash -c 'set -a; source .env; set +a; npm run test:integration -- status'`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/status/
git commit -m "feat: signup status service — position, referrals, rewards, link in one query"
```

### Task N4: Refactor `POST /api/signup` onto the service

**Files:**
- Modify: `src/app/api/signup/route.ts`
- Modify: `src/app/api/signup/route.integration.test.ts`

- [ ] **Step 1: Write the failing test**

In `src/app/api/signup/route.integration.test.ts`, add inside the `describe` block:

```ts
  test('response includes the shareable referral link and reward status', async () => {
    await createWaitlistForTest(db, 'launch-rewards', [{ referrals: 3, label: 'Early access' }])
    const res = await POST(req({ waitlistSlug: 'launch-rewards', email: 'r@example.com' }, '10.0.0.9'))
    expect(res.status).toBe(200)
    const json = await res.json()
    const base = process.env.APP_BASE_URL ?? 'http://localhost:3000'
    expect(json.referralLink).toBe(`${base}/?ref=${json.referralCode}`)
    expect(json.rewards).toEqual({ unlocked: [], next: { referrals: 3, label: 'Early access' }, toNext: 3 })
  })
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `bash -c 'set -a; source .env; set +a; npm run test:integration -- signup/route'`
Expected: the new test FAILS (`referralLink` undefined); existing tests pass.

- [ ] **Step 3: Refactor the route**

Replace the position-computation tail of `src/app/api/signup/route.ts` (everything from `// Compute this signup's current position...` through the final `return NextResponse.json`) and adjust imports. Full new file:

```ts
import { NextResponse } from 'next/server'
import { signupInputSchema } from '@/lib/validation'
import { isDisposableEmail } from '@/lib/antiabuse/disposable'
import { InMemoryRateLimiter } from '@/lib/antiabuse/ratelimit'
import { createServiceClient } from '@/lib/db/client'
import { getWaitlistBySlug } from '@/lib/db/waitlists'
import { createSignup } from '@/lib/db/signups'
import { getSignupStatus } from '@/lib/status/status'
import { getAppBaseUrl } from '@/lib/config'
import { getEmailSender } from '@/lib/email'
import { buildConfirmationEmail } from '@/lib/email/templates'

// Module-scoped limiter: 5 signups / 10 min / IP. Plan 6 swaps in a shared store.
const limiter = new InMemoryRateLimiter({ max: 5, windowMs: 10 * 60_000 })

// Rate-limit key is derived from x-forwarded-for. RefQueue must be deployed behind a
// reverse proxy (Vercel, or nginx/Caddy for Docker self-hosters) that OVERWRITES this
// header with the real client IP — otherwise the value is client-spoofable, and if the
// header is absent all traffic collapses into a single 'unknown' bucket. Trusted-proxy
// config and a shared/distributed limiter are handled in Plan 6 (deploy).
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

  // Send the double-opt-in confirmation email (best-effort; a send failure must not
  // fail the signup — the row exists and re-signing up re-sends). Awaited so it
  // completes before the serverless function returns.
  if (!signup.verified && signup.verify_token) {
    const verifyUrl = `${getAppBaseUrl()}/api/verify?token=${signup.verify_token}`
    const confirmation = buildConfirmationEmail({ waitlistName: waitlist.name, verifyUrl })
    try {
      await getEmailSender().send({ to: signup.email, subject: confirmation.subject, html: confirmation.html })
    } catch (err) {
      console.error('signup: confirmation email failed to send', err)
    }
  }

  const status = await getSignupStatus(db, waitlist, signup)
  return NextResponse.json({
    referralCode: signup.referral_code,
    verified: signup.verified,
    position: status.position,
    referralLink: status.referralLink,
    rewards: status.rewards,
  })
}
```

- [ ] **Step 4: Run the file's suite + typecheck**

Run: `npx tsc --noEmit && bash -c 'set -a; source .env; set +a; npm run test:integration -- signup/route'`
Expected: all PASS (old fields unchanged, so existing assertions hold).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/signup/route.ts src/app/api/signup/route.integration.test.ts
git commit -m "feat: signup response includes referral link + reward status via status service"
```

---

## Milestone O — Prefetch-safe verify + redirect to status

### Task O1: Idempotent `verifySignup`

**Files:**
- Modify: `src/lib/db/signups.ts`
- Modify: `src/lib/db/signups.integration.test.ts`
- Modify: `src/lib/notifications/milestone.integration.test.ts` (call sites)
- Modify: `src/app/api/verify/route.ts` (compile fix only; behavior task is O2)

- [ ] **Step 1: Rewrite the verify tests to the new contract**

In `src/lib/db/signups.integration.test.ts`, replace the test named `'verifySignup is idempotent and clears the token'` with:

```ts
  test('verifySignup verifies once, keeps the token, and re-verifies as a no-op', async () => {
    const wl = await createWaitlistForTest(db, 'w-verify')
    const s = await createSignup(db, { waitlistId: wl.id, email: 'v@example.com' })
    const token = s.verify_token!

    const first = await verifySignup(db, token)
    expect(first!.alreadyVerified).toBe(false)
    expect(first!.signup.verified).toBe(true)
    expect(first!.signup.verify_token).toBe(token) // kept: scanner prefetch must not burn the link

    const again = await verifySignup(db, token)
    expect(again!.alreadyVerified).toBe(true)
    expect(again!.signup.verified_at).toBe(first!.signup.verified_at) // no re-stamp

    expect(await verifySignup(db, 'not-a-real-token-not-a-real-token')).toBeNull()
  })
```

Any other use of `verifySignup`'s return value in this file (e.g. the count test around line 53 uses it fire-and-forget — leave those) stays as-is.

In `src/lib/notifications/milestone.integration.test.ts`, all three tests bind the result: change each

```ts
    const verified = await verifySignup(db, referred.verify_token!)
```
(and the `s.verify_token!` variant) to

```ts
    const verified = (await verifySignup(db, referred.verify_token!))!.signup
```

and each `await notifyReferrerMilestone(db, fake, verified!)` to `await notifyReferrerMilestone(db, fake, verified)`.

- [ ] **Step 2: Run to make sure they fail**

Run: `bash -c 'set -a; source .env; set +a; npm run test:integration -- signups'`
Expected: FAIL — `alreadyVerified`/`signup` don't exist on `SignupRecord`.

- [ ] **Step 3: Implement the new `verifySignup`**

In `src/lib/db/signups.ts`, replace the existing `verifySignup` with:

```ts
export interface VerifyResult {
  signup: SignupRecord
  alreadyVerified: boolean
}

/**
 * Idempotent: the token is KEPT after verification so email-scanner prefetch
 * (e.g. Outlook Safe Links) consuming the link first doesn't lock the real user
 * out — prefetch and real click both land on the same status redirect. A scanner
 * hit still proves the inbox is real (the token only travels through that inbox),
 * so double-opt-in's anti-gaming property holds. `alreadyVerified` tells the
 * caller whether THIS call did the verifying — milestone emails fire only then.
 */
export async function verifySignup(db: SupabaseClient, token: string): Promise<VerifyResult | null> {
  const { data, error } = await db.from('signups').select('*').eq('verify_token', token).maybeSingle()
  if (error) throw error
  if (!data) return null
  const existing = data as SignupRecord
  if (existing.verified) return { signup: existing, alreadyVerified: true }

  const { data: updated, error: updateError } = await db
    .from('signups')
    .update({ verified: true, verified_at: new Date().toISOString() })
    .eq('id', existing.id)
    .eq('verified', false) // concurrent prefetch + click: exactly one caller wins this update
    .select()
    .maybeSingle()
  if (updateError) throw updateError
  if (updated) return { signup: updated as SignupRecord, alreadyVerified: false }

  // Lost the race — the row verified between our read and update. Report as already-verified.
  const raced = await getSignupById(db, existing.id)
  return raced ? { signup: raced, alreadyVerified: true } : null
}
```

- [ ] **Step 4: Fix the verify route to compile (behavior unchanged for now)**

In `src/app/api/verify/route.ts`, adjust the call site minimally so the repo compiles (O2 rewrites this route properly):

```ts
  const result = await verifySignup(db, token)
  if (!result) return NextResponse.json({ error: 'invalid_or_used_token' }, { status: 410 })
  const signup = result.signup
```

(keep the rest referencing `signup` as before).

- [ ] **Step 5: Run both integration files + typecheck**

Run: `npx tsc --noEmit && bash -c 'set -a; source .env; set +a; npm run test:integration'`
Expected: full integration suite PASS — including the untouched verify-route tests (a second GET of the same token now finds a verified row, but the route still 200s on first call; the 410-for-unknown-token test still passes because unknown ≠ used).

> Heads-up: the old route test `'already-used or unknown token returns 410'` uses an *unknown* token, so it still passes. Used-token behavior intentionally changed and gets its real assertions in O2.

- [ ] **Step 6: Commit**

```bash
git add src/lib/db/signups.ts src/lib/db/signups.integration.test.ts src/lib/notifications/milestone.integration.test.ts src/app/api/verify/route.ts
git commit -m "feat: idempotent verify — token survives prefetch, alreadyVerified flag for callers"
```

### Task O2: Verify route redirects to the status page

**Files:**
- Modify: `src/app/api/verify/route.ts`
- Modify: `src/app/api/verify/route.integration.test.ts`

- [ ] **Step 1: Rewrite the route's integration tests**

Replace the body of the `describe` block in `src/app/api/verify/route.integration.test.ts` (keep the imports, `db`, `reset`, `verifyReq`, and the FakeEmailSender `beforeEach`/`afterEach` scaffolding) with — and extend the imports with `getSignupByCode` from `@/lib/db/signups` and `POST as signupPOST` from `@/app/api/signup/route`:

```ts
const base = process.env.APP_BASE_URL ?? 'http://localhost:3000'

  test('first click verifies and 303-redirects to the status page with welcome', async () => {
    const wl = await createWaitlistForTest(db, 'v1')
    const s = await createSignup(db, { waitlistId: wl.id, email: 'a@example.com' })
    const res = await GET(verifyReq(s.verify_token!))
    expect(res.status).toBe(303)
    expect(res.headers.get('location')).toBe(`${base}/status/${s.referral_code}?welcome=1`)
    const row = await getSignupByCode(db, wl.id, s.referral_code)
    expect(row!.verified).toBe(true)
  })

  test('second click (or scanner prefetch first) redirects without welcome and emails the referrer once', async () => {
    const wl = await createWaitlistForTest(db, 'v-pf', [{ referrals: 1, label: 'Early access' }])
    const referrer = await createSignup(db, { waitlistId: wl.id, email: 'ref@example.com' })
    const referred = await createSignup(db, { waitlistId: wl.id, email: 'friend@example.com', referrerCode: referrer.referral_code })

    const prefetch = await GET(verifyReq(referred.verify_token!)) // scanner consumes the link first
    const realClick = await GET(verifyReq(referred.verify_token!)) // then the human clicks

    expect(prefetch.status).toBe(303)
    expect(prefetch.headers.get('location')).toBe(`${base}/status/${referred.referral_code}?welcome=1`)
    expect(realClick.status).toBe(303)
    expect(realClick.headers.get('location')).toBe(`${base}/status/${referred.referral_code}`)
    expect(fakeEmail.sent.filter(m => m.to === 'ref@example.com')).toHaveLength(1)
  })

  test('missing token redirects to the landing page with an error flag', async () => {
    const res = await GET(new Request('http://localhost/api/verify'))
    expect(res.status).toBe(303)
    expect(res.headers.get('location')).toBe(`${base}/?verify=invalid`)
  })

  test('unknown token redirects to the landing page with an error flag', async () => {
    const res = await GET(verifyReq('deadbeefdeadbeefdeadbeefdeadbeef'))
    expect(res.status).toBe(303)
    expect(res.headers.get('location')).toBe(`${base}/?verify=invalid`)
  })

  test('a confirmed referral raises the referrer position through the API alone', async () => {
    const wl = await createWaitlistForTest(db, 'e2e')
    const signupReq = (email: string, ip: string, ref?: string) =>
      new Request('http://localhost/api/signup', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
        body: JSON.stringify({ waitlistSlug: 'e2e', email, ref }),
      })

    // "other" signs up and confirms first — holds #1 on the time tiebreak
    const other = await (await signupPOST(signupReq('other@example.com', '10.9.9.1'))).json()
    await GET(verifyReq((await getSignupByCode(db, wl.id, other.referralCode))!.verify_token!))

    const referrer = await (await signupPOST(signupReq('referrer@example.com', '10.9.9.2'))).json()
    await GET(verifyReq((await getSignupByCode(db, wl.id, referrer.referralCode))!.verify_token!))

    // idempotent re-signup is the API's status read-back: referrer sits at #2
    const mid = await (await signupPOST(signupReq('referrer@example.com', '10.9.9.3'))).json()
    expect(mid.position).toBe(2)

    // a friend joins via the referrer's link and confirms
    const friend = await (await signupPOST(signupReq('friend@example.com', '10.9.9.4', referrer.referralCode))).json()
    await GET(verifyReq((await getSignupByCode(db, wl.id, friend.referralCode))!.verify_token!))

    const after = await (await signupPOST(signupReq('referrer@example.com', '10.9.9.5'))).json()
    expect(after.position).toBe(1)
  })
```

> Every POST uses a distinct `x-forwarded-for` — the module-scoped limiter allows 5 per IP per 10 min and state persists across tests in the file.

- [ ] **Step 2: Run to make sure the new assertions fail**

Run: `bash -c 'set -a; source .env; set +a; npm run test:integration -- verify/route'`
Expected: FAIL — route still returns JSON 200/410, not redirects.

- [ ] **Step 3: Rewrite the route**

Replace `src/app/api/verify/route.ts` with:

```ts
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/db/client'
import { verifySignup } from '@/lib/db/signups'
import { getAppBaseUrl } from '@/lib/config'
import { getEmailSender } from '@/lib/email'
import { notifyReferrerMilestone } from '@/lib/notifications/milestone'

export async function GET(req: Request) {
  const base = getAppBaseUrl()
  const token = new URL(req.url).searchParams.get('token')
  if (!token) return NextResponse.redirect(`${base}/?verify=invalid`, 303)

  const db = createServiceClient()
  const result = await verifySignup(db, token)
  if (!result) return NextResponse.redirect(`${base}/?verify=invalid`, 303)

  if (!result.alreadyVerified) {
    // Best-effort milestone notification to the referrer (never fail verification on it).
    // Guarded by alreadyVerified so a scanner-prefetch + real-click pair emails once.
    try {
      await notifyReferrerMilestone(db, getEmailSender(), result.signup)
    } catch (err) {
      console.error('verify: milestone notification failed', err)
    }
  }

  const suffix = result.alreadyVerified ? '' : '?welcome=1'
  return NextResponse.redirect(`${base}/status/${result.signup.referral_code}${suffix}`, 303)
}
```

- [ ] **Step 4: Run the full integration suite + typecheck**

Run: `npx tsc --noEmit && bash -c 'set -a; source .env; set +a; npm run test:integration'`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/verify/route.ts src/app/api/verify/route.integration.test.ts
git commit -m "feat: verify redirects to status page; prefetch-safe, milestone fires once"
```

---

## Milestone P — Pages

### Task P1: `ensureWaitlist` (env-provisioned row) + env example

**Files:**
- Modify: `src/lib/db/waitlists.ts`
- Test: `src/lib/db/waitlists.integration.test.ts` (new)
- Modify: `.env.example`

- [ ] **Step 1: Write the failing integration test**

Create `src/lib/db/waitlists.integration.test.ts`:

```ts
import { test, expect, describe, beforeEach } from 'vitest'
import { createServiceClient } from '@/lib/db/client'
import { ensureWaitlist } from './waitlists'

const db = createServiceClient()
async function reset() {
  await db.from('signups').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await db.from('waitlists').delete().neq('id', '00000000-0000-0000-0000-000000000000')
}

describe('ensureWaitlist (integration)', () => {
  beforeEach(reset)

  test('creates the waitlist when missing, with defaults', async () => {
    const wl = await ensureWaitlist(db, { slug: 'ew1', name: 'Ensure One' })
    expect(wl.slug).toBe('ew1')
    expect(wl.name).toBe('Ensure One')
    expect(wl.reward_tiers).toEqual([])
    expect(wl.powered_by).toBe(true)
  })

  test('is idempotent and syncs the name from env on later calls', async () => {
    const first = await ensureWaitlist(db, { slug: 'ew2', name: 'Old Name' })
    const renamed = await ensureWaitlist(db, { slug: 'ew2', name: 'New Name' })
    expect(renamed.id).toBe(first.id)
    expect(renamed.name).toBe('New Name')
    const { count } = await db.from('waitlists').select('id', { count: 'exact', head: true }).eq('slug', 'ew2')
    expect(count).toBe(1)
  })
})
```

- [ ] **Step 2: Run to make sure it fails**

Run: `bash -c 'set -a; source .env; set +a; npm run test:integration -- waitlists'`
Expected: FAIL — `ensureWaitlist` is not exported.

- [ ] **Step 3: Implement**

Append to `src/lib/db/waitlists.ts`:

```ts
/**
 * Idempotent provisioning of the instance's single waitlist from env config
 * (env is v1's only config surface — no settings UI). Called on landing-page
 * render: creates the row on first deploy, keeps `name` in sync when the
 * maker changes WAITLIST_NAME. Tiers/theme stay untouched (Plan 5's config pass).
 */
export async function ensureWaitlist(
  db: SupabaseClient,
  input: { slug: string; name: string },
): Promise<WaitlistRecord> {
  const existing = await getWaitlistBySlug(db, input.slug)
  if (existing) {
    if (existing.name === input.name) return existing
    const { data, error } = await db
      .from('waitlists')
      .update({ name: input.name })
      .eq('id', existing.id)
      .select()
      .single()
    if (error) throw error
    return data as WaitlistRecord
  }

  const { data, error } = await db
    .from('waitlists')
    .insert({ slug: input.slug, name: input.name })
    .select()
    .single()
  if (error) {
    // 23505 = unique_violation: created concurrently — fetch and return it.
    if (error.code === '23505') {
      const raced = await getWaitlistBySlug(db, input.slug)
      if (raced) return raced
    }
    throw error
  }
  return data as WaitlistRecord
}
```

- [ ] **Step 4: Run the test**

Run: `bash -c 'set -a; source .env; set +a; npm run test:integration -- waitlists'`
Expected: PASS.

- [ ] **Step 5: Extend `.env.example`**

Add after the `APP_BASE_URL` line:

```bash
# Waitlist identity — the row is auto-created (and renamed) from these on first page load.
# Reward tiers + theming become configurable in Plan 5.
WAITLIST_SLUG=default
WAITLIST_NAME=My Product
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/db/waitlists.ts src/lib/db/waitlists.integration.test.ts .env.example
git commit -m "feat: ensureWaitlist — env-provisioned single waitlist"
```

### Task P2: Landing page + SignupForm

**Files:**
- Replace: `src/app/page.tsx`
- Replace: `src/app/page.module.css`
- Create: `src/app/SignupForm.tsx`
- Create: `src/app/SignupForm.module.css`
- Modify: `src/app/layout.tsx` (metadata only)

No component-test rig (deliberate — see scope); correctness rests on the tested route/service layer plus the Q3 smoke run. Steps are implement → typecheck → lint.

- [ ] **Step 1: Replace `src/app/page.tsx`**

```tsx
import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/db/client'
import { ensureWaitlist } from '@/lib/db/waitlists'
import { getWaitlistConfig } from '@/lib/config'
import { isValidReferralCode } from '@/lib/referral/code'
import { SignupForm } from './SignupForm'
import styles from './page.module.css'

// DB read/provision per request — never prerender at build time.
export const dynamic = 'force-dynamic'

export function generateMetadata(): Metadata {
  const { name } = getWaitlistConfig()
  return { title: name, description: `Join the ${name} waitlist — refer friends to move up the line.` }
}

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function LandingPage({ searchParams }: Props) {
  const params = await searchParams
  const ref = typeof params.ref === 'string' && isValidReferralCode(params.ref) ? params.ref : undefined
  const verifyFailed = params.verify === 'invalid'

  const waitlist = await ensureWaitlist(createServiceClient(), getWaitlistConfig())

  return (
    <main className={styles.main}>
      {verifyFailed && (
        <p role="alert" className={styles.notice}>
          That confirmation link isn’t valid. Enter your email below to get a fresh one.
        </p>
      )}
      <h1 className={styles.title}>{waitlist.name}</h1>
      <p className={styles.subhead}>Join the waitlist — refer friends to move up the line.</p>
      <SignupForm waitlistSlug={waitlist.slug} referralCode={ref} />
    </main>
  )
}
```

- [ ] **Step 2: Create `src/app/SignupForm.tsx`**

```tsx
'use client'

import { useState } from 'react'
import styles from './SignupForm.module.css'

interface SignupResult {
  referralCode: string
  verified: boolean
  position: number
}

const ERROR_MESSAGES: Record<string, string> = {
  invalid_input: 'That doesn’t look like a valid email address.',
  disposable_email: 'Disposable email addresses aren’t accepted — please use your real one.',
  rate_limited: 'Too many signups from your network right now. Try again in a few minutes.',
  waitlist_not_found: 'This waitlist isn’t set up yet. Try again shortly.',
}

export function SignupForm({ waitlistSlug, referralCode }: { waitlistSlug: string; referralCode?: string }) {
  const [email, setEmail] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<SignupResult | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    setError(null)
    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ waitlistSlug, email, ref: referralCode }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(ERROR_MESSAGES[json.error] ?? 'Something went wrong. Please try again.')
        return
      }
      setResult(json as SignupResult)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setPending(false)
    }
  }

  if (result) {
    return result.verified ? (
      <p className={styles.success}>
        You’re already on the list at <strong>#{result.position}</strong>.{' '}
        <a href={`/status/${result.referralCode}`}>View your status</a>
      </p>
    ) : (
      <p className={styles.success}>
        You’re <strong>#{result.position}</strong> in line. Check your inbox and confirm your email to lock in your
        spot — that’s also where your referral link lives.
      </p>
    )
  }

  return (
    <form onSubmit={submit} className={styles.form}>
      <input
        type="email"
        required
        placeholder="you@example.com"
        aria-label="Email address"
        value={email}
        onChange={e => setEmail(e.target.value)}
        disabled={pending}
      />
      <button type="submit" disabled={pending}>
        {pending ? 'Joining…' : 'Join the waitlist'}
      </button>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </form>
  )
}
```

- [ ] **Step 3: Replace `src/app/page.module.css`**

```css
.main {
  min-height: 100svh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 24px;
  font-family: var(--font-geist-sans), system-ui, sans-serif;
  text-align: center;
}

.title {
  font-size: 2.1rem;
  letter-spacing: -0.02em;
}

.subhead {
  color: #666;
  max-width: 42ch;
}

.notice {
  background: #fff3cd;
  color: #664d03;
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 0.9rem;
}

@media (prefers-color-scheme: dark) {
  .subhead {
    color: #999;
  }
  .notice {
    background: #3a2f00;
    color: #ffe69c;
  }
}
```

- [ ] **Step 4: Create `src/app/SignupForm.module.css`**

```css
.form {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  width: 100%;
  max-width: 440px;
  margin-top: 8px;
}

.form input {
  flex: 1 1 220px;
  padding: 10px 14px;
  border: 1px solid #d0d0d0;
  border-radius: 8px;
  font-size: 1rem;
  background: var(--background);
  color: var(--foreground);
}

.form button {
  padding: 10px 18px;
  border: none;
  border-radius: 8px;
  background: var(--foreground);
  color: var(--background);
  font-size: 1rem;
  cursor: pointer;
}

.form button:disabled {
  opacity: 0.6;
  cursor: default;
}

.error {
  flex-basis: 100%;
  color: #b3261e;
  font-size: 0.9rem;
}

.success {
  font-size: 1.05rem;
  max-width: 46ch;
  margin-top: 8px;
}

@media (prefers-color-scheme: dark) {
  .form input {
    border-color: #444;
  }
  .error {
    color: #ff8a80;
  }
}
```

- [ ] **Step 5: Fix `src/app/layout.tsx` metadata**

Replace the `metadata` export (create-next-app boilerplate) with:

```tsx
export const metadata: Metadata = {
  title: "RefQueue",
  description: "Open-source waitlist with referral — refer friends, move up the line.",
};
```

(Pages override `title` via their own `generateMetadata`.)

- [ ] **Step 6: Typecheck, lint, build**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: clean (`force-dynamic` keeps the build from touching the DB).

- [ ] **Step 7: Commit**

```bash
git add src/app/page.tsx src/app/page.module.css src/app/SignupForm.tsx src/app/SignupForm.module.css src/app/layout.tsx
git commit -m "feat: landing page with signup form, ?ref= capture, verify-error notice"
```

### Task P3: Status page + CopyButton

**Files:**
- Create: `src/app/status/[code]/page.tsx`
- Create: `src/app/status/[code]/page.module.css`
- Create: `src/app/status/[code]/CopyButton.tsx`

- [ ] **Step 1: Create `src/app/status/[code]/CopyButton.tsx`**

```tsx
'use client'

import { useState } from 'react'

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard unavailable (plain http, old browser) — the link is rendered beside
      // this button, so manual copy still works.
    }
  }

  return (
    <button type="button" onClick={copy}>
      {copied ? 'Copied ✓' : 'Copy link'}
    </button>
  )
}
```

- [ ] **Step 2: Create `src/app/status/[code]/page.tsx`**

```tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/db/client'
import { getWaitlistBySlug } from '@/lib/db/waitlists'
import { getSignupByCode } from '@/lib/db/signups'
import { getSignupStatus } from '@/lib/status/status'
import { getWaitlistConfig } from '@/lib/config'
import { isValidReferralCode } from '@/lib/referral/code'
import { buildShareLinks } from '@/lib/referral/share'
import { CopyButton } from './CopyButton'
import styles from './page.module.css'

export const dynamic = 'force-dynamic'

export function generateMetadata(): Metadata {
  return {
    title: `Your spot — ${getWaitlistConfig().name}`,
    robots: { index: false }, // per-signup pages don't belong in search indexes
  }
}

interface Props {
  params: Promise<{ code: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function StatusPage({ params, searchParams }: Props) {
  const { code } = await params
  if (!isValidReferralCode(code)) notFound()

  const db = createServiceClient()
  const waitlist = await getWaitlistBySlug(db, getWaitlistConfig().slug)
  if (!waitlist) notFound()
  const signup = await getSignupByCode(db, waitlist.id, code)
  if (!signup) notFound()

  // Anyone holding the referral link can open this page — render no email address.
  if (!signup.verified) {
    return (
      <main className={styles.main}>
        <h1 className={styles.pendingTitle}>Almost there</h1>
        <p className={styles.pendingText}>
          Check your inbox and click the confirmation link to lock in your spot on {waitlist.name}.
        </p>
      </main>
    )
  }

  const status = await getSignupStatus(db, waitlist, signup)
  const share = buildShareLinks(status.referralLink, waitlist.name)
  const welcome = (await searchParams).welcome === '1'
  const { unlocked, next, toNext } = status.rewards

  return (
    <main className={styles.main}>
      {welcome && <p className={styles.welcome}>You’re in — your spot is confirmed.</p>}

      <p className={styles.positionLabel}>Your position on {waitlist.name}</p>
      <p className={styles.position}>#{status.position}</p>
      <p className={styles.referrals}>
        {status.confirmedReferrals === 1
          ? '1 friend has joined through your link'
          : `${status.confirmedReferrals} friends have joined through your link`}
      </p>

      <section className={styles.card}>
        <h2>Move up the line</h2>
        <p>Every friend who joins through your link and confirms their email moves you up.</p>
        <div className={styles.linkRow}>
          <code className={styles.link}>{status.referralLink}</code>
          <CopyButton text={status.referralLink} />
        </div>
        <div className={styles.shareRow}>
          <a href={share.x} target="_blank" rel="noopener noreferrer">Share on X</a>
          <a href={share.whatsapp} target="_blank" rel="noopener noreferrer">WhatsApp</a>
          <a href={share.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a>
          <a href={share.email}>Email</a>
        </div>
      </section>

      {(unlocked.length > 0 || next) && (
        <section className={styles.card}>
          <h2>Rewards</h2>
          <ul className={styles.tiers}>
            {unlocked.map(t => (
              <li key={`${t.referrals}-${t.label}`} className={styles.unlocked}>
                ✓ {t.label}
              </li>
            ))}
            {next && (
              <li>
                Refer {toNext} more to unlock <strong>{next.label}</strong>
              </li>
            )}
          </ul>
        </section>
      )}
    </main>
  )
}
```

- [ ] **Step 3: Create `src/app/status/[code]/page.module.css`**

```css
.main {
  min-height: 100svh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 24px;
  font-family: var(--font-geist-sans), system-ui, sans-serif;
  text-align: center;
}

.welcome {
  background: #d1e7dd;
  color: #0f5132;
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 0.95rem;
}

.positionLabel,
.referrals {
  color: #666;
  font-size: 0.95rem;
}

.position {
  font-size: 3.5rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1;
}

.pendingTitle {
  font-size: 1.8rem;
}

.pendingText {
  color: #666;
  max-width: 44ch;
}

.card {
  width: 100%;
  max-width: 480px;
  border: 1px solid #e2e2e2;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  text-align: left;
}

.card h2 {
  font-size: 1.05rem;
}

.card p {
  color: #666;
  font-size: 0.92rem;
}

.linkRow {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.link {
  flex: 1 1 240px;
  padding: 8px 10px;
  background: rgba(127, 127, 127, 0.12);
  border-radius: 6px;
  font-size: 0.85rem;
  overflow-wrap: anywhere;
}

.linkRow button {
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  background: var(--foreground);
  color: var(--background);
  font-size: 0.85rem;
  cursor: pointer;
}

.shareRow {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
}

.shareRow a {
  font-size: 0.9rem;
  color: inherit;
  text-decoration: underline;
}

.tiers {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.unlocked {
  color: #0f5132;
}

@media (prefers-color-scheme: dark) {
  .welcome {
    background: #0f3d2e;
    color: #a3e9c9;
  }
  .positionLabel,
  .referrals,
  .pendingText,
  .card p {
    color: #999;
  }
  .card {
    border-color: #333;
  }
  .unlocked {
    color: #7bd8a8;
  }
}
```

- [ ] **Step 4: Typecheck, lint, build**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/app/status/
git commit -m "feat: signup status page — position, referral link, share buttons, rewards"
```

### Task P4: Dev email fallback logs the message

Without a provider configured, `FakeEmailSender` swallows emails silently — a dev (and the Q3 smoke run) can't reach the verify link. Make the no-provider fallback print what it "sends" while still recording like the fake (`.env.example` already promises "emails are logged, not sent").

**Files:**
- Create: `src/lib/email/logging.ts`
- Test: `src/lib/email/logging.test.ts`
- Modify: `src/lib/email/factory.ts` (fallback branch only)

- [ ] **Step 1: Write the failing test**

Create `src/lib/email/logging.test.ts`:

```ts
import { test, expect, vi, afterEach } from 'vitest'
import { LoggingEmailSender } from './logging'
import { FakeEmailSender } from './fake'
import { createEmailSender } from './factory'

afterEach(() => vi.restoreAllMocks())

test('records the message and prints it to the console', async () => {
  const log = vi.spyOn(console, 'log').mockImplementation(() => {})
  const sender = new LoggingEmailSender()
  await sender.send({ to: 'a@example.com', subject: 'Hi', html: '<a href="http://x/api/verify?token=t1">verify</a>' })
  expect(sender.sent).toHaveLength(1)
  expect(log).toHaveBeenCalledTimes(1)
  expect(log.mock.calls[0].join(' ')).toContain('verify?token=t1')
})

test('factory falls back to the logging sender when no provider is configured', () => {
  const sender = createEmailSender({} as NodeJS.ProcessEnv)
  expect(sender).toBeInstanceOf(LoggingEmailSender)
  expect(sender).toBeInstanceOf(FakeEmailSender) // subclass — existing factory tests keep passing
})
```

- [ ] **Step 2: Run to make sure it fails**

Run: `npm test -- logging`
Expected: FAIL — module `./logging` not found.

- [ ] **Step 3: Implement**

Create `src/lib/email/logging.ts`:

```ts
import type { EmailMessage } from './types'
import { FakeEmailSender } from './fake'

/**
 * Dev fallback (no provider configured): records like the fake AND prints the
 * message, so the verify link is reachable from the dev-server console.
 */
export class LoggingEmailSender extends FakeEmailSender {
  async send(msg: EmailMessage): Promise<void> {
    await super.send(msg)
    console.log(`[email] to=${msg.to} subject="${msg.subject}"\n${msg.html}`)
  }
}
```

In `src/lib/email/factory.ts`, change the import and final fallback:

```ts
import { LoggingEmailSender } from './logging'
```
and replace `return new FakeEmailSender()` with:
```ts
  return new LoggingEmailSender()
```
(update the factory doc comment's last line to `neither -> LoggingEmailSender (local dev; records + logs, never sends)`; drop the now-unused `FakeEmailSender` import if nothing else in the file uses it).

- [ ] **Step 4: Run the unit suite**

Run: `npm test`
Expected: PASS — including the existing factory tests (`LoggingEmailSender` is a `FakeEmailSender`).

- [ ] **Step 5: Commit**

```bash
git add src/lib/email/logging.ts src/lib/email/logging.test.ts src/lib/email/factory.ts
git commit -m "feat: dev email fallback logs messages so the verify link is visible"
```

---

## Milestone Q — RLS, polish, gate

### Task Q1: Deny-all RLS migration

**Files:**
- Create: `supabase/migrations/0002_enable_rls.sql`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/0002_enable_rls.sql`:

```sql
-- Fail-closed insurance (Plan 1 review, hardening item 2): every app access is
-- server-side through service_role, which BYPASSES RLS — so enabling RLS with
-- zero policies changes nothing today, but guarantees that a future accidental
-- grant to anon/authenticated still exposes no rows.
alter table waitlists enable row level security;
alter table signups enable row level security;
```

- [ ] **Step 2: Apply locally**

Run: `cd ~/Personal/refqueue && npx supabase db reset`
Expected: both migrations apply cleanly.

- [ ] **Step 3: Prove the service role is unaffected**

Run: `bash -c 'set -a; source .env; set +a; npm run test:integration'`
Expected: full integration suite PASS (all access is service-role).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0002_enable_rls.sql
git commit -m "chore: enable deny-all RLS on waitlists + signups (fail-closed)"
```

### Task Q2: Lint/polish cleanup + full gate

**Files:**
- Modify: `src/app/api/signup/route.integration.test.ts` (unused `wl` bindings)
- Modify: `src/lib/notifications/milestone.ts` (redundant guard)

- [ ] **Step 1: Drop the unused `wl` bindings**

In `src/app/api/signup/route.integration.test.ts`, the tests for `launch`, `launch2`, `launch3` bind `const wl = await createWaitlistForTest(...)` without using it — change each to a bare `await createWaitlistForTest(...)`.

- [ ] **Step 2: Drop the redundant tiers guard**

In `src/lib/notifications/milestone.ts`, change:

```ts
  const tiers = waitlist.reward_tiers ?? []
```
to
```ts
  const tiers = waitlist.reward_tiers
```
(`reward_tiers` is typed non-optional on `WaitlistRecord` and the column is `not null default '[]'`).

- [ ] **Step 3: Full gate**

Run:
```bash
npx tsc --noEmit && npm run lint && npm test && bash -c 'set -a; source .env; set +a; npm run test:integration' && npm run build
```
Expected: everything green, zero lint warnings.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/signup/route.integration.test.ts src/lib/notifications/milestone.ts
git commit -m "chore: clear lint warnings + redundant tiers guard"
```

### Task Q3: Manual smoke run + docs

- [ ] **Step 1: Smoke the full visitor flow locally**

```bash
cd ~/Personal/refqueue
supabase start   # if not already up (colima must be running)
npm run dev
```

Then, in a browser:
1. Open `http://localhost:3000` → landing renders with the `WAITLIST_NAME` from `.env` (row auto-created).
2. Sign up with `smoke-a@example.com` → "You're #1 in line… check your inbox".
3. In the dev-server console, find the `[email]` log and open its `/api/verify?token=...` URL → lands on `/status/<code>?welcome=1` showing "You're in" + `#1` + referral link + share buttons.
4. Open the verify URL a **second time** → same status page, no welcome banner (prefetch idempotency, live).
5. Copy the referral link, open it in a private window (`/?ref=<code>` shows the landing) → sign up `smoke-b@example.com` → verify via its `[email]` log link.
6. Reload signup A's status page → "1 friend has joined through your link" and position still `#1`; signup B sits at `#2`.
7. Visit `/status/AAAAAAAA` (unknown but well-formed code) → 404; visit `/api/verify?token=bogus` → redirected to `/?verify=invalid` with the notice shown.

Expected: every step behaves as written; fix before proceeding if not.

- [ ] **Step 2: Update the review-notes doc**

In `~/Code Documentation/refqueue/[C] Plan-1 Review Notes & Hardening Backlog.md`, mark as resolved-in-Plan-3 (move each to the "Fixed" section with a one-liner): hardening item 2 (RLS enabled), hardening item 4 (position N+1 → single query + tally), hardening item 3 / verify-prefetch (idempotent verify + redirect), the "Plan 2/3 wiring" items (rewards + referral link in responses/pages), the nice-to-have e2e position test, and the two pre-public polish one-liners (lint `wl` bindings, `?? []` guard). Leave the rest (XFF/rate-limit, citext, generated types, Plan-2 concurrent-verify milestone race, best-effort-send tests) untouched.

- [ ] **Step 3: Update memory + commit docs**

Add any new gotchas surfaced during execution to `~/Code Documentation/claude-memory.md` (per its update rules). Then:

```bash
cd ~/Personal/refqueue && git status   # confirm clean tree, all Plan 3 commits on main
```

---

## Self-Review (against the spec)

- **PRODUCT.md MVP lines covered by this plan:** "Signup-facing status page: position, referral link, share buttons, progress to next reward tier" → Task P3 (+N3 service). "Email signup → assigned queue position" visitor UX → P2. "Unique referral link per signup" as an actual *link* → N2/N4. `?ref=` capture with validation → P2 (spec'd in Plan 1 as `isValidReferralCode`'s purpose). Double-opt-in flow reaching a real page → O2. Env-only config honored → N2/P1 (no settings UI added).
- **Deliberately deferred, stated in scope:** theming + powered-by credit (Plan 5), dashboard/auth (Plan 4), Docker/README (Plan 6), status API route + component tests (YAGNI now).
- **Review-notes items this plan closes:** RLS (item 2), N+1 (item 4), verify prefetch (item 3), rewards/link wiring, e2e position test, two polish one-liners.
- **Type consistency checked:** `VerifiedSignupRow.referred_by` (N1) feeds `tallyConfirmedReferrals(rows: ReferredRow[])` — structurally compatible. `VerifyResult { signup; alreadyVerified }` used identically in O1 (db), O2 (route), and both test files. `SignupStatus` fields consumed by N4's response and P3's page match the N3 definition. `ensureWaitlist` returns `WaitlistRecord`, which `SignupForm` never sees (only `slug`/`name` strings cross the client boundary).
- **Known risks:** the e2e test assumes verify-route and signup-route module instances share one process per test file (true under Vitest defaults; distinct IPs keep the limiter out of the way regardless). `npm run build` with `force-dynamic` must not touch the DB — if a future Next version changes prerender behavior, the build step in P2 will catch it.

---

## Execution Handoff

Execute task-by-task with TDD and frequent commits, per the header. Two options:

1. **Subagent-Driven (recommended)** — fresh subagent per task via superpowers:subagent-driven-development, review between tasks.
2. **Inline Execution** — superpowers:executing-plans in one session, batch execution with checkpoints.

Prereqs before Task N1: colima + `supabase start` running, `.env` present (copy `.env.example` values for local), `main` clean.
