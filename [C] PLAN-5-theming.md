# RefQueue Plan 5 — Theming + Powered-By Credit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the public pages a maker-brandable product — logo, accent color, headline/subhead/CTA copy, env-configurable reward tiers — and ship the "powered by RefQueue" self-distribution credit (on by default, removable).

**Architecture:** Env stays the only config surface (PRODUCT.md). New optional vars: `THEME_ACCENT_COLOR/LOGO_URL/HEADLINE/SUBHEAD/CTA_LABEL`, `REWARD_TIERS` (JSON), `POWERED_BY`. Config getters in `config.ts` validate fail-safe (bad value → `console.warn` + fallback, never a crashed landing page). `ensureWaitlist` — the landing-render provisioning hook — now also syncs `reward_tiers` and `powered_by` into the waitlist row, because the milestone email service and status page already read tiers **from the DB row**; theme values are presentation-only, so pages read them straight from config (the `waitlists.theme` jsonb column stays intentionally unused). Accent color flows as a CSS custom property set inline on each page's `<main>` (`--accent` + `--accent-text`), with `var()` fallbacks that preserve today's look exactly when unset.

**Tech Stack:** Next.js 15 server components, zod (already a dep — validates `REWARD_TIERS`), CSS modules + custom properties. Zero new dependencies.

**Plan/roadmap position:** Plan 5 of 6. Plans 1–4 done (engine, email, public pages, dashboard+auth). Plan 6 = deploy, Docker, README, hardening backlog.

---

## Scope

**In:** theme env config + validation, reward-tiers env config synced to DB (closes the Plan 3 deferral "reward-tier env config"), powered-by flag synced to DB, landing page theming (logo, headline, subhead, CTA label, accent), status-page accent, `PoweredBy` credit component on both public pages linking to the GitHub repo.

**Explicitly OUT (YAGNI / later):** theming the dashboard/login (maker-internal utility screens stay neutral), email template theming (good defaults ship; custom templates are a documented non-goal), a theme settings UI (env-only config), custom fonts, favicon/logo upload (logo is a URL the maker hosts), multi-waitlist theming, `waitlists.theme` DB sync (no consumer; column stays for a future settings UI), dark/light accent variants (one accent, docs advise picking one that carries white text).

**Design decisions locked in this plan:**
1. **Tiers/powered-by sync to the DB row; theme does not.** `notifyReferrerMilestone` and `getSignupStatus` already read `reward_tiers` from the waitlist row, and `powered_by` is a schema column consumed at render — so env must materialize into the row (same pattern as the existing `name` sync, diff-checked so unchanged config costs zero writes). Theme has exactly one consumer (page render), which already has config in scope — a DB round-trip would add nothing.
2. **Accent = two inline CSS vars, validated hex only.** `--accent` (background) + `--accent-text: #ffffff`. CSS uses `var(--accent, var(--foreground))` / `var(--accent-text, var(--background))`, so no accent = today's exact look, accent = white-on-accent in both color schemes. The hex regex is also the injection guard — the value lands in a `style` attribute.
3. **Logo is a plain `<img>`** with an eslint disable: `next/image` needs known dimensions or configured remote hosts, and a self-hoster's logo is an arbitrary external URL. Fixed display height (44px), `alt` = waitlist name.
4. **Fail-safe config parsing.** Malformed `REWARD_TIERS` JSON or an invalid accent/logo value must never 500 the landing page: warn + fall back (empty tiers / no theming). The landing page is the product's front door.
5. **`POWERED_BY` defaults on** — anything except the literal string `false` keeps the credit (PRODUCT.md: the self-distribution mechanic ships on by default; disabling is a deliberate act). Repo URL is a constant in `PoweredBy.tsx` (`https://github.com/alinearonsky/refqueue`; Plan 6 revisits if the repo moves to an org).

---

## Context from Plans 1–4 (existing code this plan touches — do NOT reimplement)

- `src/lib/config.ts` — sole env-config reader (getters: `getWaitlistConfig`, `getAppBaseUrl`, `getSupabaseAnonKey`, `getMakerCredentials`, `sessionCookieOptions`). V1 appends here; `src/lib/config.test.ts` stubs `process.env` with a saved-snapshot/`afterEach` restore pattern — follow it.
- `src/lib/db/waitlists.ts` — `WaitlistRecord { id, name, slug, theme, reward_tiers, powered_by }`, `getWaitlistBySlug`, `getWaitlistById`, `ensureWaitlist(db, { slug, name })` (V2 extends the input + sync).
- `src/lib/referral/position.ts` — `RewardTier { referrals: number; label: string }` (reuse the type).
- `src/app/page.tsx` — landing page; calls `ensureWaitlist(createServiceClient(), getWaitlistConfig())`; renders title/subhead/`SignupForm`. `src/app/page.module.css` has `.main/.title/.subhead/.notice` + a dark-mode block.
- `src/app/SignupForm.tsx` — client component; button text `{pending ? 'Joining…' : 'Join the waitlist'}`. `SignupForm.module.css` `.form button { background: var(--foreground); color: var(--background); }`.
- `src/app/status/[code]/page.tsx` — status page; fetches waitlist via `getWaitlistBySlug` (NOT ensureWaitlist — landing render is the sync point; a tier/flag change appears on status pages after the next landing view). `.position` in its `page.module.css` is the big `#N` number.
- Integration tests: `src/lib/db/waitlists.integration.test.ts` (has `beforeEach(reset)`; calls `ensureWaitlist(db, { slug, name })` — V2 updates these call sites).
- **Test env:** unit `npm test`; integration `bash -c 'set -a; source .env; set +a; npm run test:integration'` (Vitest doesn't auto-load `.env`). Local stack: colima + `npx supabase start`.
- **Dev-server gotchas:** port 3000 is BubbleTracker's — run `APP_BASE_URL=http://localhost:3001 npm run dev -- -p 3001`; kill by port, never `pkill -f "next dev"`. NEVER run `npm run build` while the dev server is running (both write `.next/` — corrupts the dev server).
- **Commits:** conventional prefixes, footer `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`, direct commits on `main`. `.env` is gitignored — never commit it.

---

## Milestone V — Config + provisioning sync

### Task V1: Theme / tiers / powered-by config getters

**Files:**
- Modify: `src/lib/config.ts`
- Modify: `src/lib/config.test.ts` (append)
- Modify: `.env.example`, `.env` (local, gitignored)

- [ ] **Step 1: Write the failing unit tests**

Append to `src/lib/config.test.ts` (the file already has the `savedEnv`/`afterEach` env-restore harness — these describe blocks go inside the same file):

```ts
describe('getRewardTiersConfig', () => {
  it('parses, validates, and sorts tiers ascending by referrals', () => {
    process.env.REWARD_TIERS = '[{"referrals":10,"label":"Founding member"},{"referrals":3,"label":"Early access"}]'
    expect(getRewardTiersConfig()).toEqual([
      { referrals: 3, label: 'Early access' },
      { referrals: 10, label: 'Founding member' },
    ])
  })

  it('returns [] when unset', () => {
    delete process.env.REWARD_TIERS
    expect(getRewardTiersConfig()).toEqual([])
  })

  it('returns [] on malformed JSON or invalid shapes (fail-safe, never throws)', () => {
    process.env.REWARD_TIERS = 'not json'
    expect(getRewardTiersConfig()).toEqual([])

    process.env.REWARD_TIERS = '[{"referrals":0,"label":"zero is not positive"}]'
    expect(getRewardTiersConfig()).toEqual([])

    process.env.REWARD_TIERS = '[{"referrals":3,"label":""}]'
    expect(getRewardTiersConfig()).toEqual([])
  })
})

describe('getPoweredByConfig', () => {
  it('is on by default and off only for the literal string "false"', () => {
    delete process.env.POWERED_BY
    expect(getPoweredByConfig()).toBe(true)

    process.env.POWERED_BY = 'true'
    expect(getPoweredByConfig()).toBe(true)

    process.env.POWERED_BY = 'false'
    expect(getPoweredByConfig()).toBe(false)
  })
})

describe('getThemeConfig', () => {
  it('returns an empty object when nothing is set', () => {
    delete process.env.THEME_ACCENT_COLOR
    delete process.env.THEME_LOGO_URL
    delete process.env.THEME_HEADLINE
    delete process.env.THEME_SUBHEAD
    delete process.env.THEME_CTA_LABEL
    expect(getThemeConfig()).toEqual({})
  })

  it('accepts valid values', () => {
    process.env.THEME_ACCENT_COLOR = '#7c3aed'
    process.env.THEME_LOGO_URL = 'https://example.com/logo.png'
    process.env.THEME_HEADLINE = 'Get early access'
    process.env.THEME_SUBHEAD = 'Skip the line by inviting friends.'
    process.env.THEME_CTA_LABEL = 'Count me in'
    expect(getThemeConfig()).toEqual({
      accentColor: '#7c3aed',
      logoUrl: 'https://example.com/logo.png',
      headline: 'Get early access',
      subhead: 'Skip the line by inviting friends.',
      ctaLabel: 'Count me in',
    })
  })

  it('accepts 3-digit hex and rejects non-hex accents (injection guard) and non-http(s) logo URLs', () => {
    process.env.THEME_ACCENT_COLOR = '#f0a'
    expect(getThemeConfig().accentColor).toBe('#f0a')

    process.env.THEME_ACCENT_COLOR = 'red;} body { display:none'
    expect(getThemeConfig().accentColor).toBeUndefined()

    process.env.THEME_LOGO_URL = 'javascript:alert(1)'
    expect(getThemeConfig().logoUrl).toBeUndefined()
  })
})
```

Add `getRewardTiersConfig, getPoweredByConfig, getThemeConfig` to the file's import from `./config`.

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/lib/config.test.ts`
Expected: FAIL — the three getters are not exported.

- [ ] **Step 3: Implement the getters**

Append to `src/lib/config.ts`:

```ts
import { z } from 'zod'
import type { RewardTier } from '@/lib/referral/position'

const rewardTiersSchema = z.array(
  z.object({ referrals: z.number().int().positive(), label: z.string().trim().min(1) }),
)

/**
 * Reward tiers from env (JSON array), synced into the waitlist row by
 * ensureWaitlist. Fail-safe: a malformed value warns and falls back to [] —
 * the landing page must never 500 on a config typo.
 */
export function getRewardTiersConfig(): RewardTier[] {
  const raw = process.env.REWARD_TIERS
  if (!raw) return []
  try {
    const tiers = rewardTiersSchema.parse(JSON.parse(raw))
    return [...tiers].sort((a, b) => a.referrals - b.referrals)
  } catch {
    console.warn('REWARD_TIERS is not a valid JSON tier array — ignoring it.')
    return []
  }
}

/** "Powered by RefQueue" credit — on unless the maker explicitly sets "false" (PRODUCT.md default-on). */
export function getPoweredByConfig(): boolean {
  return process.env.POWERED_BY !== 'false'
}

export interface ThemeConfig {
  accentColor?: string
  logoUrl?: string
  headline?: string
  subhead?: string
  ctaLabel?: string
}

// Hex-only: this value lands in a style attribute, so the regex doubles as the injection guard.
const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

/** Presentation-only theme from env; read at render, never stored. Invalid values warn and drop. */
export function getThemeConfig(): ThemeConfig {
  const theme: ThemeConfig = {}

  const accent = process.env.THEME_ACCENT_COLOR
  if (accent) {
    if (HEX_COLOR.test(accent)) theme.accentColor = accent
    else console.warn('THEME_ACCENT_COLOR must be a #rgb or #rrggbb hex color — ignoring it.')
  }

  const logo = process.env.THEME_LOGO_URL
  if (logo) {
    if (/^https?:\/\//.test(logo)) theme.logoUrl = logo
    else console.warn('THEME_LOGO_URL must be an http(s) URL — ignoring it.')
  }

  if (process.env.THEME_HEADLINE) theme.headline = process.env.THEME_HEADLINE
  if (process.env.THEME_SUBHEAD) theme.subhead = process.env.THEME_SUBHEAD
  if (process.env.THEME_CTA_LABEL) theme.ctaLabel = process.env.THEME_CTA_LABEL

  return theme
}
```

(`z` from zod is a new import at the top of config.ts; `RewardTier` is exported from `src/lib/referral/position.ts` — verify and adapt the import if the type lives elsewhere, reporting any deviation.)

- [ ] **Step 4: Run tests, tsc, lint**

Run: `npx vitest run src/lib/config.test.ts && npx tsc --noEmit && npm run lint`
Expected: all pass (13 tests in the file).

- [ ] **Step 5: Extend env files**

Append to `.env.example`:

```bash

# Theming (Plan 5) — all optional; the landing page falls back to clean defaults.
# Accent must be a hex color (#rgb or #rrggbb) dark enough to carry white text.
THEME_ACCENT_COLOR=
THEME_LOGO_URL=
THEME_HEADLINE=
THEME_SUBHEAD=
THEME_CTA_LABEL=
# Reward tiers as a JSON array, e.g. [{"referrals":3,"label":"Early access"},{"referrals":10,"label":"Founding member"}]
REWARD_TIERS=
# "Powered by RefQueue" credit on public pages — on unless set to exactly "false".
POWERED_BY=
```

Do NOT edit the local `.env` in this task (X2's smoke sets theme vars inline at launch). Never commit `.env`.

- [ ] **Step 6: Commit**

```bash
git add src/lib/config.ts src/lib/config.test.ts .env.example
git commit -m "feat: theme, reward-tiers, and powered-by env config (fail-safe parsing)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task V2: `ensureWaitlist` syncs reward tiers + powered-by

**Files:**
- Modify: `src/lib/db/waitlists.ts`
- Modify: `src/lib/db/waitlists.integration.test.ts`
- Modify: `src/app/page.tsx` (call-site input only)

- [ ] **Step 1: Write the failing integration tests**

In `src/lib/db/waitlists.integration.test.ts`, update the existing `ensureWaitlist` call sites to the new input shape (add `rewardTiers: [], poweredBy: true` to each existing call), then append inside the same describe block (match the file's existing helpers/conventions):

```ts
test('ensureWaitlist syncs reward tiers and powered_by from env config', async () => {
  const tiers = [
    { referrals: 3, label: 'Early access' },
    { referrals: 10, label: 'Founding member' },
  ]
  const created = await ensureWaitlist(db, { slug: 'w-sync', name: 'Sync', rewardTiers: tiers, poweredBy: true })
  expect(created.reward_tiers).toEqual(tiers)
  expect(created.powered_by).toBe(true)

  // Change tiers + flag -> row updates.
  const changed = await ensureWaitlist(db, {
    slug: 'w-sync',
    name: 'Sync',
    rewardTiers: [{ referrals: 5, label: 'Beta invite' }],
    poweredBy: false,
  })
  expect(changed.id).toBe(created.id)
  expect(changed.reward_tiers).toEqual([{ referrals: 5, label: 'Beta invite' }])
  expect(changed.powered_by).toBe(false)

  // Unchanged config -> returned as-is (no-op path).
  const same = await ensureWaitlist(db, {
    slug: 'w-sync',
    name: 'Sync',
    rewardTiers: [{ referrals: 5, label: 'Beta invite' }],
    poweredBy: false,
  })
  expect(same).toEqual(changed)
})
```

- [ ] **Step 2: Run to verify failure**

Run: `bash -c 'set -a; source .env; set +a; npx vitest run --config vitest.integration.config.ts src/lib/db/waitlists.integration.test.ts'`
Expected: FAIL — type error / missing properties (new input fields not accepted yet).

- [ ] **Step 3: Extend `ensureWaitlist`**

In `src/lib/db/waitlists.ts`, replace `ensureWaitlist` with:

```ts
import type { RewardTier } from '@/lib/referral/position'

export interface WaitlistProvisionInput {
  slug: string
  name: string
  rewardTiers: RewardTier[]
  poweredBy: boolean
}

// Structural compare — Postgres jsonb reorders object keys on round-trip, so a
// JSON.stringify comparison would perpetually false-diff and write per render.
function sameTiers(a: RewardTier[], b: RewardTier[]): boolean {
  return a.length === b.length && a.every((t, i) => t.referrals === b[i].referrals && t.label === b[i].label)
}

/**
 * Idempotent provisioning of the instance's single waitlist from env config
 * (env is v1's only config surface — no settings UI). Called on landing-page
 * render: creates the row on first deploy, then diff-syncs name, reward tiers,
 * and the powered-by flag whenever the maker changes env. Unchanged config
 * costs zero writes. `theme` stays untouched (presentation-only, read from env).
 */
export async function ensureWaitlist(db: SupabaseClient, input: WaitlistProvisionInput): Promise<WaitlistRecord> {
  const existing = await getWaitlistBySlug(db, input.slug)
  if (existing) {
    const patch: Record<string, unknown> = {}
    if (existing.name !== input.name) patch.name = input.name
    if (!sameTiers(existing.reward_tiers, input.rewardTiers)) patch.reward_tiers = input.rewardTiers
    if (existing.powered_by !== input.poweredBy) patch.powered_by = input.poweredBy
    if (Object.keys(patch).length === 0) return existing

    const { data, error } = await db.from('waitlists').update(patch).eq('id', existing.id).select().single()
    if (error) throw error
    return data as WaitlistRecord
  }

  const { data, error } = await db
    .from('waitlists')
    .insert({
      slug: input.slug,
      name: input.name,
      reward_tiers: input.rewardTiers,
      powered_by: input.poweredBy,
    })
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

(Keep the existing top-of-file imports/types; add the `RewardTier` import. The tiers diff uses JSON.stringify — order matters, which is fine because `getRewardTiersConfig` sorts.)

- [ ] **Step 4: Update the landing-page call site**

In `src/app/page.tsx`, extend the config import and the provisioning call:

```tsx
import { getPoweredByConfig, getRewardTiersConfig, getWaitlistConfig } from '@/lib/config'
```

```tsx
  const waitlist = await ensureWaitlist(createServiceClient(), {
    ...getWaitlistConfig(),
    rewardTiers: getRewardTiersConfig(),
    poweredBy: getPoweredByConfig(),
  })
```

- [ ] **Step 5: Run the integration file, then the full suites**

Run: `bash -c 'set -a; source .env; set +a; npx vitest run --config vitest.integration.config.ts src/lib/db/waitlists.integration.test.ts'`
Expected: PASS.
Run: `bash -c 'set -a; source .env; set +a; npm run test:integration' && npm test && npx tsc --noEmit && npm run lint`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/db/waitlists.ts src/lib/db/waitlists.integration.test.ts src/app/page.tsx
git commit -m "feat: sync reward tiers + powered-by flag into the waitlist row from env

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Milestone W — Presentation

### Task W1: Landing page theming (logo, copy, accent, CTA)

**Files:**
- Create: `src/app/accent.ts`
- Modify: `src/app/page.tsx`
- Modify: `src/app/page.module.css`
- Modify: `src/app/SignupForm.tsx`
- Modify: `src/app/SignupForm.module.css`

No component tests (repo convention — pages stay presentational; the config logic is unit-tested in V1). Verified by gates here + the X2 smoke.

- [ ] **Step 1: Create the accent helper**

Create `src/app/accent.ts`:

```ts
import type { CSSProperties } from 'react'
import type { ThemeConfig } from '@/lib/config'

/**
 * Inline CSS custom properties carrying the maker's accent. Consumed via
 * var(--accent, var(--foreground)) / var(--accent-text, var(--background)),
 * so an unset accent renders exactly the pre-theming look. Text is fixed
 * white — .env.example tells makers to pick an accent dark enough for it.
 */
export function accentStyle(theme: ThemeConfig): CSSProperties | undefined {
  if (!theme.accentColor) return undefined
  return { '--accent': theme.accentColor, '--accent-text': '#ffffff' } as CSSProperties
}
```

- [ ] **Step 2: Apply the theme on the landing page**

In `src/app/page.tsx`:

- Extend the config import: `import { getPoweredByConfig, getRewardTiersConfig, getThemeConfig, getWaitlistConfig } from '@/lib/config'` and add `import { accentStyle } from './accent'`.
- Inside the component, after the `ensureWaitlist` call, add `const theme = getThemeConfig()`.
- Replace the returned JSX with:

```tsx
  return (
    <main className={styles.main} style={accentStyle(theme)}>
      {verifyFailed && (
        <p role="alert" className={styles.notice}>
          That confirmation link isn’t valid. Enter your email below to get a fresh one.
        </p>
      )}
      {theme.logoUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- arbitrary maker-hosted URL; next/image needs known hosts/dimensions
        <img src={theme.logoUrl} alt={`${waitlist.name} logo`} className={styles.logo} />
      )}
      <h1 className={styles.title}>{theme.headline ?? waitlist.name}</h1>
      <p className={styles.subhead}>{theme.subhead ?? 'Join the waitlist — refer friends to move up the line.'}</p>
      <SignupForm waitlistSlug={waitlist.slug} referralCode={ref} ctaLabel={theme.ctaLabel} />
    </main>
  )
```

- [ ] **Step 3: Landing CSS — logo**

Append to `src/app/page.module.css` (before the dark-mode block):

```css
.logo {
  height: 44px;
  width: auto;
  max-width: 220px;
  object-fit: contain;
}
```

- [ ] **Step 4: CTA label prop on the signup form**

In `src/app/SignupForm.tsx`:

- Change the signature to:

```tsx
export function SignupForm({
  waitlistSlug,
  referralCode,
  ctaLabel = 'Join the waitlist',
}: {
  waitlistSlug: string
  referralCode?: string
  ctaLabel?: string
}) {
```

- Change the button line to: `{pending ? 'Joining…' : ctaLabel}`

- [ ] **Step 5: Accent on the form button**

In `src/app/SignupForm.module.css`, change the `.form button` rule's colors to:

```css
.form button {
  padding: 10px 18px;
  border: none;
  border-radius: 8px;
  background: var(--accent, var(--foreground));
  color: var(--accent-text, var(--background));
  font-size: 1rem;
  cursor: pointer;
}
```

(CSS custom properties inherit into the client component from the `<main>` style — no prop drilling.)

- [ ] **Step 6: Gates**

Run: `npx tsc --noEmit && npm run lint && npm test`
Expected: all green (lint must be clean WITH the eslint-disable comment — no stray warnings). Do NOT run `npm run build` if a dev server is running.

- [ ] **Step 7: Commit**

```bash
git add src/app/accent.ts src/app/page.tsx src/app/page.module.css src/app/SignupForm.tsx src/app/SignupForm.module.css
git commit -m "feat: landing page theming — logo, headline/subhead/CTA copy, accent color

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task W2: PoweredBy credit component + landing wiring

**Files:**
- Create: `src/app/PoweredBy.tsx`
- Create: `src/app/PoweredBy.module.css`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Create the component**

Create `src/app/PoweredBy.tsx`:

```tsx
import styles from './PoweredBy.module.css'

const REPO_URL = 'https://github.com/alinearonsky/refqueue'

/**
 * The self-distribution credit (PRODUCT.md): on by default on every public
 * page, removable via POWERED_BY=false — forcing it would be user-hostile.
 */
export function PoweredBy({ enabled }: { enabled: boolean }) {
  if (!enabled) return null
  return (
    <a className={styles.credit} href={REPO_URL} target="_blank" rel="noopener noreferrer">
      Powered by <strong>RefQueue</strong>
    </a>
  )
}
```

- [ ] **Step 2: Create the styles**

Create `src/app/PoweredBy.module.css`:

```css
.credit {
  position: fixed;
  bottom: 14px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.8rem;
  color: #999;
  white-space: nowrap;
}

.credit strong {
  font-weight: 600;
}

.credit:hover {
  text-decoration: underline;
}
```

(`#999` reads on both color schemes — no dark-mode block needed.)

- [ ] **Step 3: Wire into the landing page**

In `src/app/page.tsx`: `import { PoweredBy } from './PoweredBy'` and add `<PoweredBy enabled={waitlist.powered_by} />` as the last child of `<main>` (after `<SignupForm … />`).

- [ ] **Step 4: Gates**

Run: `npx tsc --noEmit && npm run lint && npm test`
Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add src/app/PoweredBy.tsx src/app/PoweredBy.module.css src/app/page.tsx
git commit -m "feat: powered-by RefQueue credit on the landing page (default on, env-removable)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task W3: Status page accent + credit

**Files:**
- Modify: `src/app/status/[code]/page.tsx`
- Modify: `src/app/status/[code]/page.module.css`

- [ ] **Step 1: Apply theme on the status page**

In `src/app/status/[code]/page.tsx`:

- Add imports: `import { getThemeConfig } from '@/lib/config'` (extend the existing config import), `import { accentStyle } from '../../accent'`, `import { PoweredBy } from '../../PoweredBy'`.
- At the top of the component body (before the unverified early return), add `const theme = getThemeConfig()`.
- Add `style={accentStyle(theme)}` to BOTH `<main>` elements (the unverified early return and the main verified render).
- Add `<PoweredBy enabled={waitlist.powered_by} />` as the last child of BOTH `<main>` elements.

- [ ] **Step 2: Accent the position number**

In `src/app/status/[code]/page.module.css`, add `color: var(--accent, inherit);` to the existing `.position` rule.

- [ ] **Step 3: Gates**

Run: `npx tsc --noEmit && npm run lint && npm test`
Expected: all green.

- [ ] **Step 4: Commit**

```bash
git add "src/app/status/[code]/page.tsx" "src/app/status/[code]/page.module.css"
git commit -m "feat: status page accent + powered-by credit

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Milestone X — Verification

### Task X1: Full gates + regression sweep

**Files:** none new — fix anything the gates surface.

- [ ] **Step 1: Stop any running dev server first** (kill by port: `lsof -ti :3001 | xargs kill`), then run every gate:

```bash
npx tsc --noEmit
npm run lint
npm test
bash -c 'set -a; source .env; set +a; npm run test:integration'
npm run build
```

Expected: zero type errors, zero lint warnings, all suites green, build succeeds with the same route table as Plan 4 (no new routes this plan; `/` and `/status/[code]` still dynamic ƒ).

- [ ] **Step 2: Fix anything surfaced, re-run until green, commit fixes** (skip if nothing surfaced).

---

### Task X2: Themed browser smoke + docs update

**Controller task (not a subagent) — needs Chrome tools and the memory files.**

- [ ] **Step 1: Launch themed.** With the build finished and port 3001 free:

```bash
APP_BASE_URL=http://localhost:3001 \
THEME_ACCENT_COLOR='#7c3aed' \
THEME_HEADLINE='Get early access to DemoApp' \
THEME_SUBHEAD='Invite friends to skip the line.' \
THEME_CTA_LABEL='Count me in' \
THEME_LOGO_URL='https://placehold.co/220x44/7c3aed/white/png?text=DemoApp' \
REWARD_TIERS='[{"referrals":1,"label":"Early access"},{"referrals":5,"label":"Founding member"}]' \
npm run dev -- -p 3001
```

- [ ] **Step 2: Landing smoke.** Logo renders; headline/subhead/CTA show the env copy; button is accent purple with white text; powered-by credit at the bottom links to GitHub; `?verify=invalid` notice still renders. (If Chrome script injection wedges: fall back to `curl` + HTML inspection.)
- [ ] **Step 3: Flow smoke.** Sign up → confirm via the logged `[email]` link → status page shows accent-colored `#N`, the "Refer 1 more to unlock Early access" tier line (from env-synced tiers), and the credit. Refer one friend (`?ref=`), verify them, reload → "Early access ✓" unlocked and referrer moved to #1.
- [ ] **Step 4: Defaults smoke.** Restart with NO theme vars (only `APP_BASE_URL`): landing renders exactly the pre-Plan-5 look; then restart once with `POWERED_BY=false` and confirm the credit disappears from both pages.
- [ ] **Step 5: Docs + memory.** Append Plan 5 outcomes to `[C] Plan-1 Review Notes & Hardening Backlog.md` (fixed/deferred from reviews); update `~/Code Documentation/claude-memory.md` per its rules; note in the backlog that `waitlists.theme` is intentionally unused (future settings UI).

---

## Self-Review (writing-plans checklist)

- **Spec coverage:** PRODUCT.md "Themeable landing page: logo, color, headline/subhead/CTA copy" ✓ (V1 config, W1 render). "Removable powered by credit — on by default" ✓ (V1 flag, V2 sync, W2/W3 render, default-on semantics). "Configurable reward milestones" env pass (Plan 3 deferral) ✓ (V1 + V2 → already-shipped milestone emails and status-page tier UI consume the row). Signup-facing progress display existed since Plan 3 ✓.
- **Placeholder scan:** every code step carries complete code; W1 Step 2's JSX is the full replacement block; no TBDs.
- **Type consistency:** `ThemeConfig` defined in config.ts (V1), consumed by `accentStyle` (W1) and both pages; `RewardTier` reused from position.ts in both V1 and V2; `WaitlistProvisionInput` fields match the V2 test and the W1/V2 page call site (`rewardTiers`, `poweredBy`); `SignupForm`'s `ctaLabel?: string` matches the W1 call site. `PoweredBy({ enabled: boolean })` matches `waitlist.powered_by: boolean`.
- **Known risks:** tier diffing must be STRUCTURAL (`sameTiers`), never `JSON.stringify` — Postgres jsonb canonicalizes object key order on round-trip, so string comparison perpetually false-diffs and writes per render (caught by the V2 review; the original dictated code had this bug). Array order stays stable because `getRewardTiersConfig` sorts. The eslint-disable for the logo `<img>` must actually silence `@next/next/no-img-element` (W1 gate catches it if the rule name drifts). Status pages read the row, so tier/flag changes materialize only after a landing render — documented in the ensureWaitlist doc comment and acceptable for v1.

---

## Execution Handoff

Execute task-by-task with TDD and frequent commits. Two options:

1. **Subagent-Driven (recommended)** — superpowers:subagent-driven-development, fresh subagent per task, two-stage review.
2. **Inline Execution** — superpowers:executing-plans.

Prereqs before V1: colima + `npx supabase start` running, `.env` present, `main` clean and pushed (it is, as of `3c657e4`).
