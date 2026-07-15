# RefQueue Plan 4 — Maker Dashboard + Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The maker's side of RefQueue — a login-gated `/dashboard` showing every signup with position and referral counts, top referrers, a signups-over-time chart, and CSV export, authenticated via Supabase Auth with a single maker account provisioned from env vars.

**Architecture:** Supabase Auth (email + password) with the maker account idempotently seeded from `MAKER_EMAIL`/`MAKER_PASSWORD` on login-page render — same pattern as `ensureWaitlist`. Sessions ride httpOnly cookies via `@supabase/ssr`; `src/middleware.ts` guards `/dashboard` + `/api/dashboard`. All *data* access stays on the service-role client (RLS deny-all is untouched; the anon-key client is used for auth only). Dashboard metrics derive from ONE `listAllSignups` query through a pure `buildDashboardData` function (reusing `computePositions` + `tallyConfirmedReferrals`); the same entries array feeds the HTML table and the CSV export. Chart is a dependency-free inline SVG.

**Tech Stack:** Next.js 15 App Router (server components, route handlers, middleware), Supabase Auth via `@supabase/supabase-js` admin API + `@supabase/ssr` (the only new dependency), CSS modules, Vitest.

**Plan/roadmap position:** Plan 4 of 6. Plans 1–3 (core engine, email, public pages) are done. Plan 5 = theming + powered-by credit. Plan 6 = deploy, Docker, README, hardening backlog.

---

## Scope

**In:** maker login (`/login`), logout, session middleware, `/dashboard` (stat cards, signups table with positions + referral counts, top-5 referrers, 30-day signups chart), `GET /api/dashboard/export` CSV download, env additions (`SUPABASE_ANON_KEY`, `MAKER_EMAIL`, `MAKER_PASSWORD`).

**Explicitly OUT (YAGNI / later plans):** password reset UI (recovery = change `MAKER_PASSWORD` env and reload `/login` — the seeder syncs it), multi-user/team accounts (out of v1 per PRODUCT.md), settings UI of any kind (env-only config), pagination/search on the signups table (revisit at scale; v1 target lists are small), React Testing Library / component tests (pages stay presentational; logic lives in tested pure modules — same decision as Plan 3, reconfirmed because the dashboard page has zero client JS), dashboard styling beyond clean-default (theming is Plan 5), rate limiting on login (Supabase Auth has its own throttling; trusted-proxy work is Plan 6).

**Design decisions locked in this plan:**
1. **Password auth, not magic links.** Magic links would require configuring Supabase Auth's *own* SMTP — a second email pipeline next to our Resend/SMTP sender, pure friction for self-hosters. Email + password from env matches "env is v1's only config surface." `ensureMakerAccount` syncs the password from env on every `/login` render, so env stays the source of truth and password recovery = edit env.
2. **Auth client ≠ data client.** `@supabase/ssr` + anon key handles *sessions only*. Every table read stays on the existing service-role client. RLS deny-all (0002) keeps the anon role locked out of data even for an authenticated maker — no new policies needed.
3. **One query, pure derivation.** The dashboard needs positions, per-signup referral counts, top referrers, day buckets, and CSV rows. All derive from a single `listAllSignups` result via pure functions — no per-row queries (the Plan-3 N+1 lesson, applied from the start).
4. **CSV formula-injection guard.** Emails are attacker-controlled; fields starting with `=`, `+`, `-`, `@`, tab, or CR get a leading `'` before RFC-4180 quoting so Excel/Sheets never execute them.
5. **Route handlers that touch `cookies()` are smoke-tested, not Vitest-tested.** `next/headers` `cookies()` throws outside a real request scope, so `/api/auth/login`, `/api/auth/logout`, and `/api/dashboard/export` can't be direct-called in Vitest (unlike the Plan 1–3 routes). Coverage: auth behavior proven at the db layer (integration test signs in with the real anon client), metrics/CSV proven at the pure layer, the cookie plumbing proven in the U2 browser smoke. Keep these handlers thin.

---

## Context from Plans 1–3 (existing code this plan uses — do NOT reimplement)

- `src/lib/db/client.ts` → `createServiceClient()` (service role; server-side only).
- `src/lib/db/signups.ts` → `SignupRecord { id, waitlist_id, email, verified, verify_token, referral_code, referred_by, created_at, verified_at }`, `createWaitlistForTest(db, slug, rewardTiers?)`, `listVerifiedSignups`, `createSignup`, `verifySignup`, etc.
- `src/lib/db/waitlists.ts` → `WaitlistRecord`, `getWaitlistBySlug`, `ensureWaitlist` (the idempotent-provisioning pattern R2 mirrors).
- `src/lib/referral/position.ts` → `SignupRow { id; confirmedReferrals; verifiedAt }`, `computePositions(rows): Map<id, position>`, `ReferredRow { id; referred_by }`, `tallyConfirmedReferrals(rows): Map<id, count>`.
- `src/lib/config.ts` → sole reader of env config (`getWaitlistConfig`, `getAppBaseUrl`). R1 extends it; nothing else reads `process.env` for app config.
- Public pages: `src/app/page.tsx` (landing), `src/app/status/[code]/page.tsx` — both `export const dynamic = 'force-dynamic'` so `npm run build` never touches the DB. Every new page/route that reads the DB or cookies MUST do the same.
- Styling: plain CSS modules (`page.module.css` next to the page), system-font clean-default look. No Tailwind, no UI libs.
- **Test env:** Vitest does NOT auto-load `.env`. Integration runs: `bash -c 'set -a; source .env; set +a; npm run test:integration'`. Unit runs: `npm test`. Integration files are named `*.integration.test.ts` (picked up by `vitest.integration.config.ts` only).
- **Local stack:** colima + `npx supabase start` must be running for integration tests. `npx supabase status -o json` prints `ANON_KEY` and `SERVICE_ROLE_KEY`.
- **Dev-server gotcha:** port 3000 is usually held by another project (BubbleTracker). Run refqueue with `APP_BASE_URL=http://localhost:3001 npm run dev -- -p 3001`. Never `pkill -f "next dev"` — kill by port.
- **Commits:** conventional prefixes (`feat:`, `test:`, `docs:`), footer `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`, direct commits on `main` (private solo repo convention). `.env` is gitignored — never commit it.

---

## Milestone R — Auth foundation

### Task R1: Dependency, env surface, config getters

**Files:**
- Modify: `package.json` (via npm install)
- Modify: `.env.example`, `.env` (local, gitignored)
- Modify: `src/lib/config.ts`
- Test: `src/lib/config.test.ts` (new)

- [ ] **Step 1: Install the one new dependency**

```bash
npm install @supabase/ssr
```

- [ ] **Step 2: Write the failing unit test**

Create `src/lib/config.test.ts`:

```ts
import { afterEach, describe, expect, it } from 'vitest'
import { getMakerCredentials, getSupabaseAnonKey } from './config'

const savedEnv = { ...process.env }
afterEach(() => {
  process.env = { ...savedEnv }
})

describe('getSupabaseAnonKey', () => {
  it('returns the key when set', () => {
    process.env.SUPABASE_ANON_KEY = 'anon-123'
    expect(getSupabaseAnonKey()).toBe('anon-123')
  })

  it('throws when unset', () => {
    delete process.env.SUPABASE_ANON_KEY
    expect(() => getSupabaseAnonKey()).toThrow('SUPABASE_ANON_KEY')
  })
})

describe('getMakerCredentials', () => {
  it('returns credentials when both vars are set', () => {
    process.env.MAKER_EMAIL = 'maker@example.com'
    process.env.MAKER_PASSWORD = 'hunter22'
    expect(getMakerCredentials()).toEqual({ email: 'maker@example.com', password: 'hunter22' })
  })

  it('returns null when either var is missing', () => {
    process.env.MAKER_EMAIL = 'maker@example.com'
    delete process.env.MAKER_PASSWORD
    expect(getMakerCredentials()).toBeNull()

    delete process.env.MAKER_EMAIL
    process.env.MAKER_PASSWORD = 'hunter22'
    expect(getMakerCredentials()).toBeNull()
  })
})
```

- [ ] **Step 3: Run it to make sure it fails**

Run: `npx vitest run src/lib/config.test.ts`
Expected: FAIL — `getMakerCredentials` / `getSupabaseAnonKey` not exported.

- [ ] **Step 4: Implement the getters**

Append to `src/lib/config.ts`:

```ts
/** Anon (publishable) key — used ONLY for Supabase Auth sessions, never for data access. */
export function getSupabaseAnonKey(): string {
  const key = process.env.SUPABASE_ANON_KEY
  if (!key) throw new Error('SUPABASE_ANON_KEY must be set')
  return key
}

/**
 * The single maker account, provisioned from env (env is v1's only config surface).
 * null = dashboard disabled (login page explains which vars to set).
 */
export function getMakerCredentials(): { email: string; password: string } | null {
  const email = process.env.MAKER_EMAIL
  const password = process.env.MAKER_PASSWORD
  if (!email || !password) return null
  return { email, password }
}
```

- [ ] **Step 5: Run the tests and make sure they pass**

Run: `npx vitest run src/lib/config.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Extend the env files**

Append to `.env.example`:

```bash

# Dashboard (Plan 4) — the maker account is auto-provisioned from these on /login render.
# Anon key: used for auth sessions only (data access stays on the service role).
SUPABASE_ANON_KEY=your-anon-key
MAKER_EMAIL=you@yourdomain.com
MAKER_PASSWORD=choose-a-strong-password
```

Append the same three vars to the local `.env` (gitignored — do NOT commit) with real local values: get `ANON_KEY` from `npx supabase status -o json`, and use `MAKER_EMAIL=maker@local.test`, `MAKER_PASSWORD=local-dev-password`.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json .env.example src/lib/config.ts src/lib/config.test.ts
git commit -m "feat: add @supabase/ssr + auth env config (anon key, maker credentials)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task R2: `ensureMakerAccount` — idempotent maker provisioning

**Files:**
- Create: `src/lib/db/maker.ts`
- Test: `src/lib/db/maker.integration.test.ts` (new)

- [ ] **Step 1: Write the failing integration test**

Create `src/lib/db/maker.integration.test.ts`:

```ts
import { createClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createServiceClient } from './client'
import { ensureMakerAccount } from './maker'

const db = createServiceClient()
const TEST_EMAIL = `maker-test-${Date.now()}@example.com`

async function findTestUser() {
  const { data, error } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (error) throw error
  return data.users.find((u) => u.email === TEST_EMAIL) ?? null
}

async function deleteTestUser() {
  const user = await findTestUser()
  if (user) await db.auth.admin.deleteUser(user.id)
}

beforeAll(deleteTestUser)
afterAll(deleteTestUser)

describe('ensureMakerAccount', () => {
  it('creates the account on first run, is a no-op on re-run', async () => {
    await ensureMakerAccount(db, { email: TEST_EMAIL, password: 'first-password-123' })
    const created = await findTestUser()
    expect(created).not.toBeNull()

    await ensureMakerAccount(db, { email: TEST_EMAIL, password: 'first-password-123' })
    const { data, error } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 })
    if (error) throw error
    expect(data.users.filter((u) => u.email === TEST_EMAIL)).toHaveLength(1)
  })

  it('provisions an account the maker can actually sign in with, and syncs password changes from env', async () => {
    await ensureMakerAccount(db, { email: TEST_EMAIL, password: 'second-password-456' })

    const anon = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
      auth: { persistSession: false },
    })

    const stale = await anon.auth.signInWithPassword({ email: TEST_EMAIL, password: 'first-password-123' })
    expect(stale.error).not.toBeNull()

    const fresh = await anon.auth.signInWithPassword({ email: TEST_EMAIL, password: 'second-password-456' })
    expect(fresh.error).toBeNull()
    expect(fresh.data.user?.email).toBe(TEST_EMAIL)
  })
})
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `bash -c 'set -a; source .env; set +a; npx vitest run --config vitest.integration.config.ts src/lib/db/maker.integration.test.ts'`
Expected: FAIL — `./maker` module not found. (If it fails on a missing `SUPABASE_ANON_KEY` instead, R1 Step 6's `.env` addition was skipped — fix that first.)

- [ ] **Step 3: Implement `ensureMakerAccount`**

Create `src/lib/db/maker.ts`:

```ts
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Idempotent provisioning of the single maker account from env credentials
 * (mirrors ensureWaitlist). Called on /login render. The password is synced
 * on every call so env stays the source of truth — password recovery for a
 * self-hoster = change MAKER_PASSWORD and reload /login.
 */
export async function ensureMakerAccount(
  db: SupabaseClient,
  creds: { email: string; password: string },
): Promise<void> {
  const email = creds.email.trim().toLowerCase()

  const { data, error } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (error) throw error
  const existing = data.users.find((u) => u.email?.toLowerCase() === email)

  if (!existing) {
    const { error: createError } = await db.auth.admin.createUser({
      email,
      password: creds.password,
      email_confirm: true,
    })
    // email_exists = created concurrently; password syncs on the next render.
    if (createError && createError.code !== 'email_exists') throw createError
    return
  }

  const { error: updateError } = await db.auth.admin.updateUserById(existing.id, {
    password: creds.password,
  })
  if (updateError) throw updateError
}
```

- [ ] **Step 4: Run the test and make sure it passes**

Run: `bash -c 'set -a; source .env; set +a; npx vitest run --config vitest.integration.config.ts src/lib/db/maker.integration.test.ts'`
Expected: PASS (2 tests).

- [ ] **Step 5: Run the full integration suite (no regressions)**

Run: `bash -c 'set -a; source .env; set +a; npm run test:integration'`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/db/maker.ts src/lib/db/maker.integration.test.ts
git commit -m "feat: idempotent maker account provisioning via Supabase Auth admin

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task R3: Session helpers + route-guard middleware

**Files:**
- Create: `src/lib/auth/server.ts`
- Create: `src/middleware.ts`

No unit test (both are thin cookie plumbing over `@supabase/ssr` that only runs inside a real request — see design decision 5). Verified by `npm run build` here and the browser smoke in U2.

- [ ] **Step 1: Create the server-side auth helpers**

Create `src/lib/auth/server.ts`:

```ts
import { createServerClient } from '@supabase/ssr'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { getSupabaseAnonKey } from '@/lib/config'

/**
 * Anon-key client bound to the request's cookies — Supabase Auth sessions ONLY.
 * All table access stays on createServiceClient (RLS deny-all blocks this client
 * from data by design). Server components can't write cookies, hence the
 * try/catch in setAll; middleware (src/middleware.ts) owns token refresh.
 */
export async function createAuthClient(): Promise<SupabaseClient> {
  const url = process.env.SUPABASE_URL
  if (!url) throw new Error('SUPABASE_URL must be set')
  const cookieStore = await cookies()
  return createServerClient(url, getSupabaseAnonKey(), {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // Called from a server component — cookie writes are forbidden there.
        }
      },
    },
  })
}

/** The signed-in maker, or null. Uses getUser() (validates against the auth server). */
export async function getMakerUser(): Promise<User | null> {
  const supabase = await createAuthClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}
```

- [ ] **Step 2: Create the middleware**

Create `src/middleware.ts`:

```ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseAnonKey } from '@/lib/config'

/**
 * Guards the maker area and refreshes auth tokens (the one place cookie
 * writes are always allowed). Everything else stays public.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const url = process.env.SUPABASE_URL
  if (!url) throw new Error('SUPABASE_URL must be set')

  const supabase = createServerClient(url, getSupabaseAnonKey(), {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.search = ''
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/dashboard/:path*'],
}
```

- [ ] **Step 3: Verify the gates**

Run: `npx tsc --noEmit && npm run lint && npm test && npm run build`
Expected: all green; build output lists `ƒ Middleware`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/auth/server.ts src/middleware.ts
git commit -m "feat: session helpers + middleware guarding /dashboard routes

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task R4: Login page + login/logout route handlers

**Files:**
- Create: `src/app/login/page.tsx`
- Create: `src/app/login/page.module.css`
- Create: `src/app/api/auth/login/route.ts`
- Create: `src/app/api/auth/logout/route.ts`

Zero client JS: the login form is a plain HTML `<form method="post">`; the handlers respond with 303 redirects the browser follows. Handlers touch `cookies()` → smoke-tested in U2, not Vitest-tested (design decision 5).

- [ ] **Step 1: Create the login route handler**

Create `src/app/api/auth/login/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { createAuthClient } from '@/lib/auth/server'
import { getAppBaseUrl } from '@/lib/config'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const base = getAppBaseUrl()
  const form = await req.formData()
  const email = form.get('email')
  const password = form.get('password')

  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
    return NextResponse.redirect(`${base}/login?error=1`, 303)
  }

  const supabase = await createAuthClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return NextResponse.redirect(`${base}/login?error=1`, 303)

  return NextResponse.redirect(`${base}/dashboard`, 303)
}
```

- [ ] **Step 2: Create the logout route handler**

Create `src/app/api/auth/logout/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { createAuthClient } from '@/lib/auth/server'
import { getAppBaseUrl } from '@/lib/config'

export const dynamic = 'force-dynamic'

export async function POST() {
  const supabase = await createAuthClient()
  await supabase.auth.signOut()
  return NextResponse.redirect(`${getAppBaseUrl()}/login`, 303)
}
```

- [ ] **Step 3: Create the login page**

Create `src/app/login/page.tsx`:

```tsx
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getMakerUser } from '@/lib/auth/server'
import { getMakerCredentials } from '@/lib/config'
import { createServiceClient } from '@/lib/db/client'
import { ensureMakerAccount } from '@/lib/db/maker'
import styles from './page.module.css'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Maker login',
  robots: { index: false },
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  if (await getMakerUser()) redirect('/dashboard')

  const creds = getMakerCredentials()
  if (creds) {
    // Best-effort provisioning — a transient failure must not take the page down.
    try {
      await ensureMakerAccount(createServiceClient(), creds)
    } catch (err) {
      console.error('login: maker provisioning failed', err)
    }
  }

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>Maker login</h1>

      {!creds && (
        <p className={styles.notice}>
          Dashboard is not configured. Set <code>MAKER_EMAIL</code> and <code>MAKER_PASSWORD</code> in
          your environment, then reload this page.
        </p>
      )}

      {error && <p className={styles.error}>Invalid email or password.</p>}

      <form className={styles.form} action="/api/auth/login" method="post">
        <label className={styles.label} htmlFor="email">
          Email
        </label>
        <input className={styles.input} id="email" name="email" type="email" required autoComplete="username" />

        <label className={styles.label} htmlFor="password">
          Password
        </label>
        <input
          className={styles.input}
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
        />

        <button className={styles.button} type="submit" disabled={!creds}>
          Sign in
        </button>
      </form>
    </main>
  )
}
```

- [ ] **Step 4: Create the styles**

Create `src/app/login/page.module.css`:

```css
.main {
  max-width: 24rem;
  margin: 0 auto;
  padding: 4rem 1.5rem;
}

.title {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 1.5rem;
}

.notice {
  background: #fef9c3;
  border: 1px solid #fde047;
  border-radius: 0.5rem;
  padding: 0.75rem 1rem;
  font-size: 0.9rem;
  margin-bottom: 1rem;
}

.notice code {
  font-family: ui-monospace, monospace;
  font-size: 0.85em;
}

.error {
  background: #fee2e2;
  border: 1px solid #fca5a5;
  border-radius: 0.5rem;
  padding: 0.75rem 1rem;
  font-size: 0.9rem;
  margin-bottom: 1rem;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.label {
  font-size: 0.85rem;
  font-weight: 600;
  margin-top: 0.75rem;
}

.input {
  border: 1px solid #d4d4d8;
  border-radius: 0.5rem;
  padding: 0.6rem 0.75rem;
  font-size: 1rem;
}

.button {
  margin-top: 1.25rem;
  background: #18181b;
  color: #fff;
  border: none;
  border-radius: 0.5rem;
  padding: 0.7rem 1rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
}

.button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

- [ ] **Step 5: Verify the gates**

Run: `npx tsc --noEmit && npm run lint && npm test && npm run build`
Expected: all green; build lists `/login` as dynamic (ƒ).

- [ ] **Step 6: Commit**

```bash
git add src/app/login src/app/api/auth
git commit -m "feat: maker login page + login/logout route handlers (no client JS)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Milestone S — Dashboard data layer

### Task S1: `listAllSignups` query

**Files:**
- Modify: `src/lib/db/signups.ts`
- Test: `src/lib/db/signups.integration.test.ts` (append)

- [ ] **Step 1: Write the failing integration test**

Append to the existing top-level `describe` block in `src/lib/db/signups.integration.test.ts` (match the file's existing setup helpers — it already creates waitlists via `createWaitlistForTest` and signups via `createSignup`):

```ts
describe('listAllSignups', () => {
  it('returns every signup for the waitlist (verified and not), oldest first', async () => {
    const wl = await createWaitlistForTest(db, `wl-listall-${Date.now()}`)
    const first = await createSignup(db, { waitlistId: wl.id, email: 'all-1@example.com' })
    const second = await createSignup(db, { waitlistId: wl.id, email: 'all-2@example.com' })
    await verifySignup(db, second.verify_token!)

    const rows = await listAllSignups(db, wl.id)

    expect(rows.map((r) => r.email)).toEqual(['all-1@example.com', 'all-2@example.com'])
    expect(rows[0].verified).toBe(false)
    expect(rows[1].verified).toBe(true)
    expect(rows[0].id).toBe(first.id)
    expect(rows[1].referral_code).toBe(second.referral_code)
  })
})
```

Add `listAllSignups` to the file's import from `./signups`.

- [ ] **Step 2: Run it to make sure it fails**

Run: `bash -c 'set -a; source .env; set +a; npx vitest run --config vitest.integration.config.ts src/lib/db/signups.integration.test.ts'`
Expected: FAIL — `listAllSignups` is not exported.

- [ ] **Step 3: Implement the query**

Append to `src/lib/db/signups.ts`:

```ts
/**
 * Every signup for the waitlist, oldest first — the dashboard's single query.
 * All metrics (positions, referral counts, top referrers, day buckets, CSV)
 * derive from this one result in pure code; never add per-row queries here.
 */
export async function listAllSignups(db: SupabaseClient, waitlistId: string): Promise<SignupRecord[]> {
  const { data, error } = await db
    .from('signups')
    .select('*')
    .eq('waitlist_id', waitlistId)
    .order('created_at', { ascending: true })
    .order('id', { ascending: true })
  if (error) throw error
  return (data ?? []) as SignupRecord[]
}
```

- [ ] **Step 4: Run the test and make sure it passes**

Run: `bash -c 'set -a; source .env; set +a; npx vitest run --config vitest.integration.config.ts src/lib/db/signups.integration.test.ts'`
Expected: PASS (whole file).

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/signups.ts src/lib/db/signups.integration.test.ts
git commit -m "feat: listAllSignups query for the dashboard

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task S2: Pure dashboard metrics (`buildDashboardData`)

**Files:**
- Create: `src/lib/dashboard/metrics.ts`
- Test: `src/lib/dashboard/metrics.test.ts` (new, unit)

- [ ] **Step 1: Write the failing unit test**

Create `src/lib/dashboard/metrics.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { buildDashboardData, type DashboardSignupRow } from './metrics'

const NOW = new Date('2026-07-13T12:00:00Z')

function row(overrides: Partial<DashboardSignupRow> & { id: string; email: string }): DashboardSignupRow {
  return {
    verified: false,
    referral_code: `code-${overrides.id}`,
    referred_by: null,
    created_at: '2026-07-10T10:00:00Z',
    verified_at: null,
    ...overrides,
  }
}

describe('buildDashboardData', () => {
  it('handles an empty waitlist', () => {
    const data = buildDashboardData([], NOW)
    expect(data.total).toBe(0)
    expect(data.verifiedCount).toBe(0)
    expect(data.pendingCount).toBe(0)
    expect(data.entries).toEqual([])
    expect(data.topReferrers).toEqual([])
    expect(data.signupsPerDay).toHaveLength(30)
    expect(data.signupsPerDay.every((b) => b.count === 0)).toBe(true)
    expect(data.signupsPerDay[29].day).toBe('2026-07-13')
    expect(data.signupsPerDay[0].day).toBe('2026-06-14')
  })

  it('orders verified entries by position, then pending by signup date; counts only verified referrals', () => {
    const rows = [
      // a: verified early, no referrals
      row({ id: 'a', email: 'a@x.com', verified: true, verified_at: '2026-07-10T10:00:00Z' }),
      // b: verified later but has 2 confirmed referrals -> position 1
      row({ id: 'b', email: 'b@x.com', verified: true, verified_at: '2026-07-11T10:00:00Z' }),
      row({ id: 'c', email: 'c@x.com', verified: true, verified_at: '2026-07-12T10:00:00Z', referred_by: 'b' }),
      row({ id: 'd', email: 'd@x.com', verified: true, verified_at: '2026-07-12T11:00:00Z', referred_by: 'b' }),
      // e: referred by b but NOT verified -> does not count, listed after all verified
      row({ id: 'e', email: 'e@x.com', referred_by: 'b', created_at: '2026-07-12T12:00:00Z' }),
    ]

    const data = buildDashboardData(rows, NOW)

    expect(data.total).toBe(5)
    expect(data.verifiedCount).toBe(4)
    expect(data.pendingCount).toBe(1)

    expect(data.entries.map((e) => e.email)).toEqual(['b@x.com', 'a@x.com', 'c@x.com', 'd@x.com', 'e@x.com'])
    expect(data.entries[0]).toMatchObject({ position: 1, confirmedReferrals: 2, verified: true })
    expect(data.entries[4]).toMatchObject({ email: 'e@x.com', position: null, verified: false })
    expect(data.entries[0].referralCode).toBe('code-b')

    expect(data.topReferrers).toEqual([{ email: 'b@x.com', confirmedReferrals: 2 }])
  })

  it('caps topReferrers at 5 and excludes zero-referral signups', () => {
    const rows: DashboardSignupRow[] = []
    for (let i = 0; i < 7; i++) {
      rows.push(row({ id: `ref-${i}`, email: `ref-${i}@x.com`, verified: true, verified_at: '2026-07-10T10:00:00Z' }))
      for (let j = 0; j <= i; j++) {
        rows.push(
          row({
            id: `child-${i}-${j}`,
            email: `child-${i}-${j}@x.com`,
            verified: true,
            verified_at: '2026-07-11T10:00:00Z',
            referred_by: `ref-${i}`,
          }),
        )
      }
    }

    const { topReferrers } = buildDashboardData(rows, NOW)

    expect(topReferrers).toHaveLength(5)
    expect(topReferrers[0]).toEqual({ email: 'ref-6@x.com', confirmedReferrals: 7 })
    expect(topReferrers[4]).toEqual({ email: 'ref-2@x.com', confirmedReferrals: 3 })
  })

  it('buckets signups per day over the last 30 days, dropping older rows', () => {
    const rows = [
      row({ id: 'old', email: 'old@x.com', created_at: '2026-05-01T10:00:00Z' }),
      row({ id: 'd1', email: 'd1@x.com', created_at: '2026-07-13T01:00:00Z' }),
      row({ id: 'd2', email: 'd2@x.com', created_at: '2026-07-13T23:00:00Z' }),
      row({ id: 'd3', email: 'd3@x.com', created_at: '2026-06-14T00:30:00Z' }),
    ]

    const { signupsPerDay } = buildDashboardData(rows, NOW)

    expect(signupsPerDay[29]).toEqual({ day: '2026-07-13', count: 2 })
    expect(signupsPerDay[0]).toEqual({ day: '2026-06-14', count: 1 })
    expect(signupsPerDay.reduce((sum, b) => sum + b.count, 0)).toBe(3)
  })
})
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx vitest run src/lib/dashboard/metrics.test.ts`
Expected: FAIL — module `./metrics` not found.

- [ ] **Step 3: Implement the metrics module**

Create `src/lib/dashboard/metrics.ts`:

```ts
import { computePositions, tallyConfirmedReferrals } from '@/lib/referral/position'

/** The subset of SignupRecord the dashboard consumes (structurally satisfied by it). */
export interface DashboardSignupRow {
  id: string
  email: string
  verified: boolean
  referral_code: string
  referred_by: string | null
  created_at: string
  verified_at: string | null
}

export interface DashboardEntry {
  email: string
  verified: boolean
  /** 1-based queue position; null until verified. */
  position: number | null
  confirmedReferrals: number
  referralCode: string
  createdAt: string
  verifiedAt: string | null
}

export interface TopReferrer {
  email: string
  confirmedReferrals: number
}

export interface DayBucket {
  /** UTC day, YYYY-MM-DD. */
  day: string
  count: number
}

export interface DashboardData {
  total: number
  verifiedCount: number
  pendingCount: number
  /** Verified by position asc, then pending oldest-first. Feeds the table AND the CSV. */
  entries: DashboardEntry[]
  /** Top 5 by confirmed referrals, zero-referral signups excluded. */
  topReferrers: TopReferrer[]
  /** Last `CHART_DAYS` UTC days, oldest first, zero-filled. */
  signupsPerDay: DayBucket[]
}

export const CHART_DAYS = 30

const DAY_MS = 86_400_000

export function buildDashboardData(rows: DashboardSignupRow[], now: Date): DashboardData {
  const verified = rows.filter((r) => r.verified && r.verified_at !== null)

  // Confirmed = the referred signup itself verified (the anti-gaming spine).
  const tally = tallyConfirmedReferrals(verified)
  const positions = computePositions(
    verified.map((r) => ({
      id: r.id,
      confirmedReferrals: tally.get(r.id) ?? 0,
      verifiedAt: r.verified_at as string,
    })),
  )

  const toEntry = (r: DashboardSignupRow): DashboardEntry => ({
    email: r.email,
    verified: r.verified,
    position: positions.get(r.id) ?? null,
    confirmedReferrals: tally.get(r.id) ?? 0,
    referralCode: r.referral_code,
    createdAt: r.created_at,
    verifiedAt: r.verified_at,
  })

  const entries = [
    ...verified.map(toEntry).sort((a, b) => (a.position as number) - (b.position as number)),
    ...rows.filter((r) => !r.verified).map(toEntry),
  ]

  const byId = new Map(rows.map((r) => [r.id, r]))
  const topReferrers = [...tally.entries()]
    .sort(([idA, countA], [idB, countB]) => countB - countA || idA.localeCompare(idB))
    .slice(0, 5)
    .map(([id, confirmedReferrals]) => ({
      email: byId.get(id)?.email ?? '(unknown)',
      confirmedReferrals,
    }))

  const signupsPerDay: DayBucket[] = []
  for (let i = CHART_DAYS - 1; i >= 0; i--) {
    signupsPerDay.push({ day: new Date(now.getTime() - i * DAY_MS).toISOString().slice(0, 10), count: 0 })
  }
  const bucketByDay = new Map(signupsPerDay.map((b) => [b.day, b]))
  for (const r of rows) {
    const bucket = bucketByDay.get(r.created_at.slice(0, 10))
    if (bucket) bucket.count += 1
  }

  return {
    total: rows.length,
    verifiedCount: verified.length,
    pendingCount: rows.length - verified.length,
    entries,
    topReferrers,
    signupsPerDay,
  }
}
```

- [ ] **Step 4: Run the tests and make sure they pass**

Run: `npx vitest run src/lib/dashboard/metrics.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/dashboard/metrics.ts src/lib/dashboard/metrics.test.ts
git commit -m "feat: pure dashboard metrics from a single signups query

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task S3: CSV serializer with formula-injection guard

**Files:**
- Create: `src/lib/dashboard/csv.ts`
- Test: `src/lib/dashboard/csv.test.ts` (new, unit)

- [ ] **Step 1: Write the failing unit test**

Create `src/lib/dashboard/csv.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import type { DashboardEntry } from './metrics'
import { signupsToCsv } from './csv'

function entry(overrides: Partial<DashboardEntry>): DashboardEntry {
  return {
    email: 'a@x.com',
    verified: true,
    position: 1,
    confirmedReferrals: 0,
    referralCode: 'AbCdEfGh',
    createdAt: '2026-07-10T10:00:00Z',
    verifiedAt: '2026-07-10T10:05:00Z',
    ...overrides,
  }
}

describe('signupsToCsv', () => {
  it('emits a header row and one line per entry, ending with a newline', () => {
    const csv = signupsToCsv([entry({}), entry({ email: 'b@x.com', verified: false, position: null, verifiedAt: null })])
    const lines = csv.split('\n')
    expect(lines[0]).toBe('email,verified,position,confirmed_referrals,referral_code,created_at,verified_at')
    expect(lines[1]).toBe('a@x.com,true,1,0,AbCdEfGh,2026-07-10T10:00:00Z,2026-07-10T10:05:00Z')
    expect(lines[2]).toBe('b@x.com,false,,0,AbCdEfGh,2026-07-10T10:00:00Z,')
    expect(lines[3]).toBe('')
    expect(lines).toHaveLength(4)
  })

  it('quotes fields containing commas, quotes, or newlines per RFC 4180', () => {
    const csv = signupsToCsv([entry({ email: '"weird,\nemail"@x.com' })])
    expect(csv.split('\n')[1].startsWith('"""weird,')).toBe(true)
    expect(csv).toContain('email""@x.com"')
  })

  it('neutralizes spreadsheet formula injection', () => {
    const csv = signupsToCsv([entry({ email: '=HYPERLINK("http://evil")@x.com' })])
    const dataLine = csv.split('\n')[1]
    expect(dataLine.startsWith('"\'=HYPERLINK(')).toBe(true)
  })
})
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx vitest run src/lib/dashboard/csv.test.ts`
Expected: FAIL — module `./csv` not found.

- [ ] **Step 3: Implement the serializer**

Create `src/lib/dashboard/csv.ts`:

```ts
import type { DashboardEntry } from './metrics'

const HEADER = 'email,verified,position,confirmed_referrals,referral_code,created_at,verified_at'

/**
 * RFC 4180 escaping plus a spreadsheet formula-injection guard: emails are
 * attacker-controlled, so fields starting with = + - @ tab or CR get a
 * leading apostrophe before quoting (Excel/Sheets then treat them as text).
 */
function escapeField(value: string): string {
  const guarded = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
  if (/[",\n\r]/.test(guarded)) return `"${guarded.replace(/"/g, '""')}"`
  return guarded
}

export function signupsToCsv(entries: DashboardEntry[]): string {
  const lines = entries.map((e) =>
    [
      e.email,
      String(e.verified),
      e.position === null ? '' : String(e.position),
      String(e.confirmedReferrals),
      e.referralCode,
      e.createdAt,
      e.verifiedAt ?? '',
    ]
      .map(escapeField)
      .join(','),
  )
  return [HEADER, ...lines].join('\n') + '\n'
}
```

- [ ] **Step 4: Run the tests and make sure they pass**

Run: `npx vitest run src/lib/dashboard/csv.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/dashboard/csv.ts src/lib/dashboard/csv.test.ts
git commit -m "feat: CSV export serializer with formula-injection guard

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Milestone T — Dashboard UI + export

### Task T1: `/dashboard` page (stat cards, chart, top referrers, table)

**Files:**
- Create: `src/app/dashboard/page.tsx`
- Create: `src/app/dashboard/page.module.css`
- Create: `src/app/dashboard/SignupsChart.tsx`

Server components only, zero client JS (logout is a plain form POST). Presentational — all logic already tested in S2.

- [ ] **Step 1: Create the chart component**

Create `src/app/dashboard/SignupsChart.tsx`:

```tsx
import type { DayBucket } from '@/lib/dashboard/metrics'
import styles from './page.module.css'

/** Dependency-free 30-day bar chart; heights scale to the busiest day. */
export function SignupsChart({ buckets }: { buckets: DayBucket[] }) {
  const max = Math.max(1, ...buckets.map((b) => b.count))
  const barWidth = 100 / buckets.length

  return (
    <svg
      className={styles.chart}
      viewBox="0 0 100 40"
      preserveAspectRatio="none"
      role="img"
      aria-label={`Signups per day over the last ${buckets.length} days`}
    >
      {buckets.map((b, i) => {
        const height = (b.count / max) * 36
        return (
          <rect
            key={b.day}
            x={i * barWidth + barWidth * 0.15}
            y={40 - height}
            width={barWidth * 0.7}
            height={height}
            rx={0.4}
            className={styles.chartBar}
          >
            <title>{`${b.day}: ${b.count}`}</title>
          </rect>
        )
      })}
    </svg>
  )
}
```

- [ ] **Step 2: Create the dashboard page**

Create `src/app/dashboard/page.tsx`:

```tsx
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getMakerUser } from '@/lib/auth/server'
import { getWaitlistConfig } from '@/lib/config'
import { buildDashboardData } from '@/lib/dashboard/metrics'
import { createServiceClient } from '@/lib/db/client'
import { listAllSignups } from '@/lib/db/signups'
import { getWaitlistBySlug } from '@/lib/db/waitlists'
import { SignupsChart } from './SignupsChart'
import styles from './page.module.css'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Dashboard',
  robots: { index: false },
}

const dateFmt = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})

export default async function DashboardPage() {
  // Middleware already gates this route; belt-and-braces for direct renders.
  if (!(await getMakerUser())) redirect('/login')

  const config = getWaitlistConfig()
  const db = createServiceClient()
  const waitlist = await getWaitlistBySlug(db, config.slug)
  const rows = waitlist ? await listAllSignups(db, waitlist.id) : []
  const data = buildDashboardData(rows, new Date())

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{waitlist?.name ?? config.name}</h1>
          <p className={styles.subtitle}>Waitlist dashboard</p>
        </div>
        <div className={styles.headerActions}>
          <a className={styles.exportLink} href="/api/dashboard/export">
            Export CSV
          </a>
          <form action="/api/auth/logout" method="post">
            <button className={styles.logoutButton} type="submit">
              Sign out
            </button>
          </form>
        </div>
      </header>

      <section className={styles.cards} aria-label="Totals">
        <div className={styles.card}>
          <span className={styles.cardValue}>{data.total}</span>
          <span className={styles.cardLabel}>Total signups</span>
        </div>
        <div className={styles.card}>
          <span className={styles.cardValue}>{data.verifiedCount}</span>
          <span className={styles.cardLabel}>Verified</span>
        </div>
        <div className={styles.card}>
          <span className={styles.cardValue}>{data.pendingCount}</span>
          <span className={styles.cardLabel}>Pending confirmation</span>
        </div>
      </section>

      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>Signups — last 30 days</h2>
        <SignupsChart buckets={data.signupsPerDay} />
      </section>

      {data.topReferrers.length > 0 && (
        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>Top referrers</h2>
          <ol className={styles.referrerList}>
            {data.topReferrers.map((r) => (
              <li key={r.email} className={styles.referrerItem}>
                <span>{r.email}</span>
                <span className={styles.referrerCount}>
                  {r.confirmedReferrals} confirmed {r.confirmedReferrals === 1 ? 'referral' : 'referrals'}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>Signups</h2>
        {data.entries.length === 0 ? (
          <p className={styles.empty}>No signups yet. Share your waitlist page to get started.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Referrals</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {data.entries.map((e) => (
                  <tr key={e.referralCode}>
                    <td>{e.position ?? '—'}</td>
                    <td>{e.email}</td>
                    <td>
                      <span className={e.verified ? styles.badgeVerified : styles.badgePending}>
                        {e.verified ? 'Verified' : 'Pending'}
                      </span>
                    </td>
                    <td>{e.confirmedReferrals}</td>
                    <td>{dateFmt.format(new Date(e.createdAt))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  )
}
```

- [ ] **Step 3: Create the styles**

Create `src/app/dashboard/page.module.css`:

```css
.main {
  max-width: 56rem;
  margin: 0 auto;
  padding: 2.5rem 1.5rem 4rem;
}

.header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.title {
  font-size: 1.5rem;
  font-weight: 700;
}

.subtitle {
  color: #71717a;
  font-size: 0.9rem;
}

.headerActions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.exportLink {
  background: #18181b;
  color: #fff;
  border-radius: 0.5rem;
  padding: 0.55rem 0.9rem;
  font-size: 0.9rem;
  font-weight: 600;
  text-decoration: none;
}

.logoutButton {
  background: none;
  border: 1px solid #d4d4d8;
  border-radius: 0.5rem;
  padding: 0.5rem 0.9rem;
  font-size: 0.9rem;
  cursor: pointer;
}

.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.card {
  border: 1px solid #e4e4e7;
  border-radius: 0.75rem;
  padding: 1rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.cardValue {
  font-size: 1.75rem;
  font-weight: 700;
}

.cardLabel {
  color: #71717a;
  font-size: 0.85rem;
}

.panel {
  border: 1px solid #e4e4e7;
  border-radius: 0.75rem;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
}

.panelTitle {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 0.9rem;
}

.chart {
  width: 100%;
  height: 8rem;
  display: block;
}

.chartBar {
  fill: #18181b;
}

.referrerList {
  list-style: decimal inside;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.referrerItem {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  font-size: 0.95rem;
}

.referrerCount {
  color: #71717a;
  font-size: 0.85rem;
}

.empty {
  color: #71717a;
  font-size: 0.95rem;
}

.tableWrap {
  overflow-x: auto;
}

.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.table th {
  text-align: left;
  color: #71717a;
  font-weight: 600;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid #e4e4e7;
}

.table td {
  padding: 0.55rem 0.75rem;
  border-bottom: 1px solid #f4f4f5;
}

.badgeVerified,
.badgePending {
  border-radius: 999px;
  padding: 0.15rem 0.6rem;
  font-size: 0.75rem;
  font-weight: 600;
}

.badgeVerified {
  background: #dcfce7;
  color: #166534;
}

.badgePending {
  background: #fef9c3;
  color: #854d0e;
}
```

Then append an `@media (prefers-color-scheme: dark)` block mirroring the idiom in `src/app/page.module.css` (globals.css flips `--foreground` under dark mode): dark card/panel borders, readable badge colors (`.badgeVerified`, `.badgePending`), a visible `.chartBar` fill, and button/link contrast. (Added after the R4 review caught the login page missing exactly this.)

- [ ] **Step 4: Verify the gates**

Run: `npx tsc --noEmit && npm run lint && npm test && npm run build`
Expected: all green; build lists `/dashboard` as dynamic (ƒ).

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard
git commit -m "feat: maker dashboard page — stats, 30-day chart, top referrers, signups table

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task T2: CSV export route

**Files:**
- Create: `src/app/api/dashboard/export/route.ts`

Auth-gated twice (middleware matcher covers `/api/dashboard/:path*`; the handler re-checks). Touches `cookies()` → smoke-tested in U2 (design decision 5); the CSV content itself is unit-tested in S3.

- [ ] **Step 1: Create the route**

Create `src/app/api/dashboard/export/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { getMakerUser } from '@/lib/auth/server'
import { getWaitlistConfig } from '@/lib/config'
import { signupsToCsv } from '@/lib/dashboard/csv'
import { buildDashboardData } from '@/lib/dashboard/metrics'
import { createServiceClient } from '@/lib/db/client'
import { listAllSignups } from '@/lib/db/signups'
import { getWaitlistBySlug } from '@/lib/db/waitlists'

export const dynamic = 'force-dynamic'

export async function GET() {
  if (!(await getMakerUser())) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const db = createServiceClient()
  const waitlist = await getWaitlistBySlug(db, getWaitlistConfig().slug)
  const rows = waitlist ? await listAllSignups(db, waitlist.id) : []
  const csv = signupsToCsv(buildDashboardData(rows, new Date()).entries)

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="signups.csv"',
    },
  })
}
```

- [ ] **Step 2: Verify the gates**

Run: `npx tsc --noEmit && npm run lint && npm test && npm run build`
Expected: all green; build lists `/api/dashboard/export` as dynamic (ƒ).

- [ ] **Step 3: Commit**

```bash
git add src/app/api/dashboard
git commit -m "feat: auth-gated CSV export route

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Milestone U — Verification

### Task U1: Full gates + regression sweep

**Files:** none new — fix anything the gates surface.

- [ ] **Step 1: Run every gate**

```bash
npx tsc --noEmit
npm run lint
npm test
bash -c 'set -a; source .env; set +a; npm run test:integration'
npm run build
```

Expected: zero type errors, zero lint warnings, all unit + integration tests pass, build succeeds with `/`, `/status/[code]`, `/login`, `/dashboard`, `/api/dashboard/export` all dynamic (ƒ) and `ƒ Middleware` present.

- [ ] **Step 2: Fix anything that surfaced, re-run until green, then commit any fixes**

```bash
git add -A ':!.env'
git commit -m "fix: <describe what the gates surfaced>

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

(Skip the commit if nothing surfaced.)

---

### Task U2: Manual browser smoke + docs update

**Controller task (not a subagent) — needs the Claude-in-Chrome tools and the memory files.**

- [ ] **Step 1: Start the stack**

colima + `npx supabase start` if not already up, then:

```bash
APP_BASE_URL=http://localhost:3001 npm run dev -- -p 3001
```

(Port 3000 is BubbleTracker's. Kill by port when done, never `pkill -f "next dev"`.)

- [ ] **Step 2: Smoke the auth boundary**

- `http://localhost:3001/dashboard` while signed out → redirected to `/login`.
- `curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/dashboard/export` → expect a redirect/302-family or 401, NOT a CSV body.
- Login with wrong password → back on `/login` with "Invalid email or password."
- Login with `.env` credentials (`maker@local.test` / `local-dev-password`) → lands on `/dashboard`.

- [ ] **Step 3: Smoke the dashboard content**

Against the existing local data (smoke users from Plan 3 + any manual testing): stat cards match reality; table order = status-page positions (top referrer first); pending rows show `—` position; chart renders bars on the right days; top-referrers panel matches. Sign up + verify one fresh user via the logged `[email]` link and reload — counts and table update.

- [ ] **Step 4: Smoke the CSV**

Click "Export CSV" while logged in → file downloads; header row + one line per signup; positions/emails match the table.

- [ ] **Step 5: Smoke logout**

"Sign out" → back on `/login`; `/dashboard` redirects to `/login` again.

- [ ] **Step 6: Update docs + memory**

- Append Plan 4 outcomes to `[C] Plan-1 Review Notes & Hardening Backlog.md` (fixed/deferred items from reviews).
- Update `~/Code Documentation/claude-memory.md` per its update rules (new gotchas, subagent-driven outcome note).
- Commit doc changes if any live in the repo.

---

## Self-Review (writing-plans checklist)

- **Spec coverage:** PRODUCT.md dashboard line — "signups list ✓ (T1 table), positions ✓ (S2/T1), referral counts ✓ (S2/T1), top referrers ✓ (S2/T1), signups-over-time chart ✓ (S2/T1 SVG), CSV export ✓ (S3/T2)". Auth ✓ (R1–R4, middleware R3). Supabase Auth per architecture ✓.
- **Placeholder scan:** no TBD/TODO/"handle edge cases"; every code step contains complete code; U1's commit message placeholder is instructions to the implementer about *their own* fix, not missing plan content.
- **Type consistency:** `DashboardSignupRow` is structurally satisfied by `SignupRecord` (S1 returns `SignupRecord[]`, S2/T1/T2 consume it). `DashboardEntry` fields used in T1's table and S3's CSV match the S2 definition exactly (`email, verified, position, confirmedReferrals, referralCode, createdAt, verifiedAt`). `DayBucket` feeds `SignupsChart`. `getMakerCredentials()` return shape matches `ensureMakerAccount`'s `creds` param. `getMakerUser` used identically in T1/T2/R4.
- **Known risks:** `@supabase/ssr` cookie API (`getAll`/`setAll`) is the current stable shape — if the installed version differs, R3 will surface it at `tsc` time. `listUsers` pagination caps at 1000 users — fine for a single-maker instance; noted in code. Middleware runs `getUser()` (a network call) per dashboard request — acceptable, maker-only traffic.

---

## Execution Handoff

Execute task-by-task with TDD and frequent commits, per the header. Two options:

1. **Subagent-Driven (recommended)** — fresh subagent per task via superpowers:subagent-driven-development, review between tasks.
2. **Inline Execution** — superpowers:executing-plans in one session, batch execution with checkpoints.

Prereqs before Task R1: colima + `npx supabase start` running, `.env` present, `main` clean.
