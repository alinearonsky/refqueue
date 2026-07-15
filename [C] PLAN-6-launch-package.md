# RefQueue Plan 6 — The Launch Package Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Get RefQueue to the launch bar — the repo goes public the moment this plan is all green. Everything here is either a production-safety code bar, deployability, the storefront design pass, or launch collateral. Nothing invisible to a 5-second star-decision or a first deploy is in scope.

**Architecture:** Two real code bars — fail-loud production config validation via a Next.js `instrumentation.ts` boot hook (so a misconfigured deploy crashes visibly instead of silently swallowing verification emails), and Next standalone output for a working Docker image. Then a design pass on the public pages (the marketing asset), then the collateral (README, license, contributing, templates). The hardening backlog and the position-jump animation are explicitly OUT — documented as Known Limitations / v1.1 and deferred to wave two.

**Tech Stack:** Next.js 15 (`instrumentation.ts`, `output: 'standalone'`), Docker multi-stage build, Vercel deploy template, Supabase (external — cloud or self-hosted), Vitest. No new runtime dependencies.

**Plan/roadmap position:** Plan 6 of 6 — the last build plan before launch. Plans 1–5 shipped: core engine, email, public pages, dashboard+auth, theming+credit.

---

## The Launch Bar (definition of done — the green/red checklist)

The repo goes public the instant every box below is green. Once this list is set, "good" acquires **no new items** — anything that surfaces after today goes to v1.1, not here.

**Must work (code bars):**
- [ ] Production config is validated at boot — a deploy with no email provider, or a localhost `APP_BASE_URL`, fails **loudly** and refuses to start (Task Y1).
- [ ] One-click deploy genuinely works, verified from a clean machine following the README: Docker (Task Z1–Z2) and Vercel (Task Z3).

**Must be genuinely good (visible surface — where "make it good" runs free):**
- [ ] Opinionated design pass on landing + status; position number is the hero moment (Tasks AA1–AA2).
- [ ] Core loop survives the real deploy: join → confirm → position → refer → jump (verified in Task CC1).

**Must exist (trust + legibility):**
- [ ] README: positioning, screenshots, deploy buttons, env table, quickstart, Known Limitations, v1.1 roadmap (Task BB1).
- [ ] LICENSE (MIT), CONTRIBUTING.md, issue/PR templates (Task BB2).

**Explicitly NOT on the bar (or "good" expands forever):**
- Position-jump animation → **wave two** (it's the hero of the *video*, not the repo).
- The entire hardening backlog → **v1.1** (documented in README Known Limitations, not fixed).

---

## Scope

**In:** boot-time production config validation; Next standalone + Dockerfile + docker-compose; Vercel deploy template + button; a documented Supabase setup + migration path; a design pass on landing + status pages; README; LICENSE; CONTRIBUTING; GitHub issue/PR templates; a "Known Limitations" + "Roadmap (v1.1)" section that gives the deferred work a documented home.

**Explicitly OUT (wave two / v1.1 / non-goals):**
- **Position-jump animation** — the satisfying "#247 → #180" motion. It's the hero shot of the alinedecodes launch video; built in wave two, after the repo is public. Not a repo-launch blocker (decided in the grilling).
- **The hardening backlog** — concurrent-verify milestone race, `x-forwarded-for` trust / distributed rate limiting, email→status enumeration, `verify_token` unique constraint, citext email uniqueness, generated Supabase types. All documented as Known Limitations + v1.1 milestones; none fixed here. (Rationale: invisible to a 5-second star decision and to a first deploy; near-zero real-world hit rate.)
- **Embeddable widget** — the top v1.1 backlog item per PRODUCT.md; named in the roadmap, not built.
- **Bundling full self-hosted Supabase into our docker-compose** — heavy surface; v1 documents pointing at Supabase Cloud (easy path) and links Supabase's own self-host compose (advanced path). Revisit as a v1.1 refinement if r/selfhosted asks.
- **Product rename** — RefQueue stays (confirmed in the grilling; cosmetic rebrand = the `THEME_*` env vars, already shipped).
- **Dashboard/login visual polish** — maker-internal utility screens stay neutral (per the global working rules); the design pass is public pages only.

**Design decisions locked in this plan:**
1. **Fail-loud at boot, not per-request.** The silent-email-failure (factory falls back to `LoggingEmailSender` with no provider) becomes a hard boot failure in production via `instrumentation.ts` → `register()`. Dev keeps the logging fallback (it's genuinely useful locally). The check is a pure `collectProductionConfigErrors(env)` (TDD'd) wrapped by a thin `register()` that throws — mirrors the repo's "pure logic + thin side-effecting wrapper" pattern. Email + Supabase + non-localhost `APP_BASE_URL` are **required** in prod (double-opt-in is the anti-gaming spine — a waitlist that can't send email can't confirm referrals). `MAKER_*` is **optional** (no dashboard is a valid config — Plan 4 already treats missing maker creds as "dashboard disabled") — a warning, not an error.
2. **Docker via Next standalone, Supabase stays external.** `output: 'standalone'` yields a self-contained server; the Dockerfile is a standard multi-stage Next build. docker-compose runs the app and documents pointing it at a Supabase (cloud free-tier = easy; self-hosted Supabase compose = advanced, linked). We do not bundle Postgres+GoTrue+PostgREST into our own compose — that's a large, brittle surface for v1.
3. **Design pass changes CSS/markup, never logic.** AA1/AA2 touch `*.module.css`, `globals.css`, `layout.tsx`, and page JSX structure only — no changes to data flow, config, or the `src/lib` modules. All existing tests must stay green; the accent/theme system (Plan 5) must keep working (design the *default* look; makers still override via `THEME_*`).
4. **README dictates real content, not a skeleton.** Screenshots/GIF are the only insertion points, captured in the design task. Positioning is the PRODUCT.md villain framing ("they took the free plan away / the leader just got acquired").
5. **The repo goes public as the final act of this plan**, not before — so the private-repo caveat on the "Powered by RefQueue" credit link (Plan 5 deferral) resolves itself the moment CC2 completes.

---

## Context from Plans 1–5 (existing code/state this plan touches — do NOT reimplement)

- `src/lib/config.ts` — sole env-config reader (getters for waitlist, base URL, anon key, maker creds, cookie options, theme, tiers, powered-by). Y1 adds `collectProductionConfigErrors` here.
- `src/lib/email/factory.ts` — `createEmailSender(env)`: Resend → SMTP → `LoggingEmailSender` fallback (the silent-failure Y1 guards against in prod). Do NOT change its dev behavior.
- `src/app/page.tsx` + `page.module.css` + `SignupForm.tsx` + `SignupForm.module.css` — landing (themed, Plan 5). `src/app/status/[code]/page.tsx` + `page.module.css` — status page. `src/app/globals.css` — CSS vars (`--background`/`--foreground`, dark-mode block), fonts (Geist via `layout.tsx`). `src/app/accent.ts` — `accentStyle`. `src/app/PoweredBy.tsx` — the credit. These are the design-pass surface (AA).
- `src/app/dashboard/*`, `src/app/login/*` — maker screens; OUT of the design pass.
- `supabase/migrations/0001_core_schema.sql`, `0002_enable_rls.sql` — the schema a fresh deployer must apply. Z4 documents the path.
- `.github/workflows/ci.yml` — existing CI (unit tests on push/PR). BB adds nothing required, but Z may extend it (optional).
- `.gitignore` — `.env*` ignored except `.env.example`. Never commit `.env`.
- `next.config.ts` — currently empty config; Z1 adds `output: 'standalone'`.
- **Test env:** unit `npm test`; integration `bash -c 'set -a; source .env; set +a; npm run test:integration'`. Local stack: colima + `npx supabase start`.
- **Dev-server gotchas:** port 3000 is BubbleTracker's — run `APP_BASE_URL=http://localhost:3001 npm run dev -- -p 3001`; kill by port; NEVER `npm run build` while a dev server runs (both write `.next/`).
- **Commits:** conventional prefixes, footer `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`, direct commits on `main`. **Pushing to origin and flipping the repo to public require Aline's explicit OK** (CC2 stops for it).

---

## Milestone Y — Production safety (code bar #1)

### Task Y1: Fail-loud production config validation

**Files:**
- Modify: `src/lib/config.ts`
- Modify: `src/lib/config.test.ts` (append)
- Create: `src/instrumentation.ts`

- [ ] **Step 1: Write the failing unit tests**

Append to `src/lib/config.test.ts` (uses the file's existing `savedEnv`/`afterEach` env-restore harness):

```ts
describe('collectProductionConfigErrors', () => {
  function validProdEnv(): NodeJS.ProcessEnv {
    return {
      SUPABASE_URL: 'https://xyz.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-key',
      SUPABASE_ANON_KEY: 'anon-key',
      APP_BASE_URL: 'https://waitlist.example.com',
      EMAIL_FROM: 'RefQueue <no-reply@example.com>',
      RESEND_API_KEY: 're_123',
    } as NodeJS.ProcessEnv
  }

  it('returns no errors for a fully configured production env', () => {
    expect(collectProductionConfigErrors(validProdEnv())).toEqual([])
  })

  it('accepts SMTP as the provider instead of Resend', () => {
    const env = validProdEnv()
    delete env.RESEND_API_KEY
    env.SMTP_HOST = 'smtp.example.com'
    expect(collectProductionConfigErrors(env)).toEqual([])
  })

  it('flags a missing email provider (double-opt-in cannot function)', () => {
    const env = validProdEnv()
    delete env.RESEND_API_KEY
    const errors = collectProductionConfigErrors(env)
    expect(errors.some((e) => e.includes('RESEND_API_KEY') && e.includes('SMTP_HOST'))).toBe(true)
  })

  it('flags EMAIL_FROM missing when a provider is set', () => {
    const env = validProdEnv()
    delete env.EMAIL_FROM
    expect(collectProductionConfigErrors(env).some((e) => e.includes('EMAIL_FROM'))).toBe(true)
  })

  it('flags a missing or localhost APP_BASE_URL (verify links would point at localhost)', () => {
    const env = validProdEnv()
    delete env.APP_BASE_URL
    expect(collectProductionConfigErrors(env).some((e) => e.includes('APP_BASE_URL'))).toBe(true)

    env.APP_BASE_URL = 'http://localhost:3000'
    expect(collectProductionConfigErrors(env).some((e) => e.includes('APP_BASE_URL'))).toBe(true)
  })

  it('flags missing Supabase config', () => {
    const env = validProdEnv()
    delete env.SUPABASE_SERVICE_ROLE_KEY
    delete env.SUPABASE_ANON_KEY
    const errors = collectProductionConfigErrors(env)
    expect(errors.some((e) => e.includes('SUPABASE_SERVICE_ROLE_KEY'))).toBe(true)
    expect(errors.some((e) => e.includes('SUPABASE_ANON_KEY'))).toBe(true)
  })

  it('does NOT error on missing maker credentials (dashboard is optional)', () => {
    const env = validProdEnv()
    delete env.MAKER_EMAIL
    delete env.MAKER_PASSWORD
    expect(collectProductionConfigErrors(env)).toEqual([])
  })
})
```

Add `collectProductionConfigErrors` to the file's import from `./config`.

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/lib/config.test.ts`
Expected: FAIL — `collectProductionConfigErrors` not exported.

- [ ] **Step 3: Implement the validator**

Append to `src/lib/config.ts`:

```ts
/**
 * Production readiness check (env is v1's only config surface). Returns a list
 * of human-readable problems that must be fixed before the app can safely serve
 * traffic. Called at boot by src/instrumentation.ts — a non-empty list crashes
 * startup loudly, so a misconfigured deploy fails visibly instead of silently
 * swallowing verification emails. Maker credentials are intentionally optional
 * (no dashboard is a valid deployment).
 */
export function collectProductionConfigErrors(env: NodeJS.ProcessEnv = process.env): string[] {
  const errors: string[] = []

  if (!env.SUPABASE_URL) errors.push('SUPABASE_URL is required.')
  if (!env.SUPABASE_SERVICE_ROLE_KEY) errors.push('SUPABASE_SERVICE_ROLE_KEY is required.')
  if (!env.SUPABASE_ANON_KEY) errors.push('SUPABASE_ANON_KEY is required (maker auth sessions).')

  const base = env.APP_BASE_URL
  if (!base || /localhost|127\.0\.0\.1/.test(base)) {
    errors.push('APP_BASE_URL must be set to your public URL (not localhost) — verify links use it.')
  }

  const hasProvider = Boolean(env.RESEND_API_KEY || env.SMTP_HOST)
  if (!hasProvider) {
    errors.push(
      'An email provider is required: set RESEND_API_KEY or SMTP_HOST. ' +
        'Without one, double-opt-in confirmation emails are never sent and referrals cannot be confirmed.',
    )
  }
  if (hasProvider && !env.EMAIL_FROM) errors.push('EMAIL_FROM is required when an email provider is configured.')

  return errors
}
```

- [ ] **Step 4: Run tests, tsc, lint**

Run: `npx vitest run src/lib/config.test.ts && npx tsc --noEmit && npm run lint`
Expected: all pass.

- [ ] **Step 5: Create the boot hook**

Create `src/instrumentation.ts`:

```ts
import { collectProductionConfigErrors } from '@/lib/config'

/**
 * Runs once when the server boots (Next.js instrumentation). In production we
 * refuse to start on a broken config so a misconfigured deploy fails loudly
 * rather than silently swallowing verification emails. Dev/test skip this —
 * the LoggingEmailSender fallback and localhost APP_BASE_URL are intended there.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  if (process.env.NODE_ENV !== 'production') return

  const errors = collectProductionConfigErrors()
  if (errors.length > 0) {
    const message = ['RefQueue cannot start — fix these environment variables:', ...errors.map((e) => `  • ${e}`)].join(
      '\n',
    )
    throw new Error(message)
  }
}
```

- [ ] **Step 6: Verify the build still succeeds** (build does NOT run `register`, so missing prod env must not break it)

Ensure no dev server is running (`lsof -ti :3001 | xargs kill` if needed), then run: `npm run build`
Expected: build succeeds (register runs at server boot, not build time).

- [ ] **Step 7: Manually confirm the loud failure** (optional but recommended)

Run: `NODE_ENV=production NEXT_RUNTIME=nodejs node -e "require('ts-node/register'); require('./src/instrumentation.ts').register().catch(e => { console.log('FAILED AS EXPECTED:\n' + e.message); process.exit(0) })"` — or simpler, trust the unit tests + the fact that `register` throws on a non-empty list. If ts-node isn't available, skip; the pure function is fully unit-tested.

- [ ] **Step 8: Commit**

```bash
git add src/lib/config.ts src/lib/config.test.ts src/instrumentation.ts
git commit -m "feat: fail-loud production config validation at boot

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Milestone Z — Deployability (code bar #2)

### Task Z1: Next standalone output + Dockerfile

**Files:**
- Modify: `next.config.ts`
- Create: `Dockerfile`
- Create: `.dockerignore`

- [ ] **Step 1: Enable standalone output**

Replace `next.config.ts` contents:

```ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Self-contained server bundle for Docker (copies only needed node_modules).
  output: 'standalone',
}

export default nextConfig
```

- [ ] **Step 2: Create `.dockerignore`**

```
node_modules
.next
.git
.env
.env.*
!.env.example
npm-debug.log
README.md
Dockerfile
.dockerignore
```

- [ ] **Step 3: Create the multi-stage `Dockerfile`**

```dockerfile
# syntax=docker/dockerfile:1

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
```

- [ ] **Step 4: Build the image to verify it compiles** (requires colima/docker running; if Docker is unavailable in this environment, report BLOCKED with the note that Z1 needs a manual `docker build` on a machine with Docker)

Run: `docker build -t refqueue:test .`
Expected: image builds successfully.

- [ ] **Step 5: Commit**

```bash
git add next.config.ts Dockerfile .dockerignore
git commit -m "feat: Next standalone output + production Dockerfile

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task Z2: docker-compose for self-hosters

**Files:**
- Create: `docker-compose.yml`
- Create: `.env.docker.example`

- [ ] **Step 1: Create `.env.docker.example`** (the compose env template — points at an external Supabase)

```bash
# RefQueue Docker env — copy to .env.docker and fill in.
# Point at a Supabase project (Supabase Cloud free tier is the easy path;
# self-hosted Supabase is the advanced path — see the README).
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_ANON_KEY=
APP_BASE_URL=https://waitlist.yourdomain.com
WAITLIST_SLUG=default
WAITLIST_NAME=My Product
EMAIL_FROM=My Product <no-reply@yourdomain.com>
RESEND_API_KEY=
# or SMTP_* instead of Resend — see .env.example
MAKER_EMAIL=you@yourdomain.com
MAKER_PASSWORD=choose-a-strong-password
# Optional theming — see .env.example
```

- [ ] **Step 2: Create `docker-compose.yml`**

```yaml
services:
  refqueue:
    build: .
    # Or use the published image once you have one:
    # image: ghcr.io/alinearonsky/refqueue:latest
    ports:
      - '3000:3000'
    env_file:
      - .env.docker
    restart: unless-stopped
```

- [ ] **Step 3: Verify compose config is valid**

Run: `docker compose config`
Expected: prints the resolved config with no errors. (If Docker is unavailable, report BLOCKED noting Z2 needs a manual check.)

- [ ] **Step 4: Commit**

```bash
git add docker-compose.yml .env.docker.example
git commit -m "feat: docker-compose + env template for self-hosters

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task Z3: Vercel deploy template

**Files:**
- Create: `vercel.json`

Vercel auto-detects Next.js, so `vercel.json` is minimal — its job is to make the config explicit and to anchor the deploy-button env list documented in the README. The one-click button URL is assembled in the README (BB1).

- [ ] **Step 1: Create `vercel.json`**

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "nextjs"
}
```

- [ ] **Step 2: Verify it's valid JSON and the build is unaffected**

Ensure no dev server runs, then: `node -e "JSON.parse(require('fs').readFileSync('vercel.json','utf8')); console.log('valid')" && npm run build`
Expected: `valid`, build succeeds.

- [ ] **Step 3: Commit**

```bash
git add vercel.json
git commit -m "feat: Vercel deploy config

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task Z4: Supabase setup + migration path (docs artifact)

**Files:**
- Create: `supabase/README.md`

A fresh deployer needs a documented way to create the schema. The migrations already exist (`0001_core_schema.sql`, `0002_enable_rls.sql`); this task documents applying them via the Supabase CLI and via the SQL editor (no-CLI path).

- [ ] **Step 1: Create `supabase/README.md`**

```markdown
# Supabase setup

RefQueue uses Supabase for Postgres, Auth (maker dashboard), and RLS. Point your
deploy at a Supabase project — [Supabase Cloud](https://supabase.com) free tier
is the easy path; self-hosting Supabase is the advanced path
([their Docker guide](https://supabase.com/docs/guides/self-hosting/docker)).

## 1. Create a project

Create a Supabase project. From **Project Settings → API**, copy:

- `SUPABASE_URL` ← Project URL
- `SUPABASE_ANON_KEY` ← `anon` `public` key
- `SUPABASE_SERVICE_ROLE_KEY` ← `service_role` key (**server-side only, keep secret**)

## 2. Apply the schema

**With the Supabase CLI** (recommended):

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

**Without the CLI** — open **SQL Editor** in the dashboard and run, in order, the
contents of:

1. `supabase/migrations/0001_core_schema.sql`
2. `supabase/migrations/0002_enable_rls.sql`

That's it — RLS is enabled deny-all and all app access goes through the service role.
```

- [ ] **Step 2: Commit**

```bash
git add supabase/README.md
git commit -m "docs: Supabase setup + migration path

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Milestone AA — The storefront design pass (visible surface)

> These two tasks are DESIGN, not TDD. **Load the `frontend` skill (execution taste) and the `branding` skill (identity direction) before starting**, per the global working rules. Constraint: touch only CSS modules, `globals.css`, `layout.tsx`, and page JSX *structure* — never `src/lib`, config, or data flow. Every existing test stays green; the Plan 5 theme system keeps working (you're designing the *default*; `THEME_*` still overrides). Verify visually in the browser and confirm `npm test && npx tsc --noEmit && npm run lint` stay green after each.

### Task AA1: Landing page redesign

**Files:**
- Modify: `src/app/page.module.css`, `src/app/SignupForm.module.css`, `src/app/globals.css`, `src/app/layout.tsx` (fonts/metadata only if needed), `src/app/page.tsx` (structure only)

- [ ] **Step 1: Design direction.** Load `frontend` + `branding`. Establish the default identity: type scale + weight, spacing rhythm, a confident default accent (that `THEME_ACCENT_COLOR` still overrides), and the emotional focal point — the waitlist value prop and the "join → move up the line" promise. Opinionated and striking, not a neutral template. Keep it dependency-free (CSS only; no UI lib).
- [ ] **Step 2: Implement** the landing redesign in the CSS modules + globals. Preserve every element the logic needs: the `verifyFailed` notice, the themed logo `<img>`, headline/subhead (default copy when unthemed), the `SignupForm`, the `PoweredBy` credit. Keep the accent-var fallback pattern (`var(--accent, ...)`) so an unthemed instance still looks like this new default and a themed one still overrides.
- [ ] **Step 3: Verify** — start the dev server (`APP_BASE_URL=http://localhost:3001 npm run dev -- -p 3001`), open `/`, confirm the redesign renders in both light and dark mode, that a themed launch (set `THEME_*` inline) still overrides cleanly, and the responsive layout holds (narrow viewport, no horizontal scroll). Stop the dev server when done (kill by port).
- [ ] **Step 4: Gates** — `npx tsc --noEmit && npm run lint && npm test` all green.
- [ ] **Step 5: Commit** — `feat: opinionated landing page design` + footer.

### Task AA2: Status page redesign (hero position moment)

**Files:**
- Modify: `src/app/status/[code]/page.module.css`, `src/app/status/[code]/page.tsx` (structure only)

- [ ] **Step 1: Design** the status page with the **position number as the hero** — it should be the most striking element on the page (this is the shot that carries the future animation and the launch video). Design both states: the "Almost there" unverified render and the full verified render (welcome banner, position, referral count, referral link + copy + share row, rewards card). Keep the accent-var usage (`var(--accent, inherit)` on the position).
- [ ] **Step 2: Implement** in the CSS module + JSX structure. Preserve all elements/logic (CopyButton, share links, rewards tiers, `PoweredBy`, `robots: noindex`, no email rendered).
- [ ] **Step 3: Verify** in the browser — drive a real signup → confirm → status flow (see CC1's method), check both states, light/dark, themed override, responsive.
- [ ] **Step 4: Gates** — `npx tsc --noEmit && npm run lint && npm test` green.
- [ ] **Step 5: Commit** — `feat: opinionated status page design, position as hero` + footer.

---

## Milestone BB — Launch collateral

### Task BB1: README

**Files:**
- Modify: `README.md` (replace the create-next-app boilerplate entirely)
- Create: `docs/screenshots/` (capture during the design pass / here)

- [ ] **Step 1: Capture screenshots.** With a themed dev server running (accent + logo + tiers, as in Plan 5's smoke), capture: the landing page and the verified status page (position hero). Save as `docs/screenshots/landing.png` and `docs/screenshots/status.png`. (A demo GIF is nice-to-have and can wait for the animation in wave two — a still is fine for launch.)

- [ ] **Step 2: Write `README.md`** with this exact content (fill the two image paths from Step 1):

````markdown
# RefQueue

**Open-source waitlist with built-in referrals.** The "refer friends to skip the line"
mechanic behind Superhuman's and Robinhood's launches — the one GetWaitlist and Viral
Loops paywall at $35–50/mo — free, self-hosted, and yours.

![Landing page](docs/screenshots/landing.png)

They took the free plan away and the category leader just got acquired. Here's the
open-source one that can't be paywalled or taken from you.

## What it does

- **Email signup → a live queue position** ("You're #247").
- **A unique referral link per signup** with X / WhatsApp / LinkedIn / email share buttons.
- **Confirmed referrals move you up the line** — every friend who joins *and confirms
  their email* bumps your position. Unconfirmed signups never count.
- **Configurable reward milestones** ("refer 3 → early access") with automatic emails.
- **A maker dashboard** — signups, positions, top referrers, a 30-day chart, CSV export.
- **Themeable** — logo, color, and copy via environment variables.
- **"Powered by RefQueue" credit** — on by default, removable with one env var.

![Status page](docs/screenshots/status.png)

## Anti-gaming

A referral counts **only after the referred email completes double opt-in.** That makes a
fake referral cost a real, verifiable inbox — the single rule that keeps the numbers honest.
Per-IP rate limiting and disposable-email blocking back it up.

## Quick start

RefQueue is a Next.js app backed by [Supabase](https://supabase.com) (Postgres + Auth).
Set up Supabase first — see [`supabase/README.md`](supabase/README.md) — then deploy.

### Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/alinearonsky/refqueue&env=SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY,SUPABASE_ANON_KEY,APP_BASE_URL,WAITLIST_NAME,EMAIL_FROM,RESEND_API_KEY,MAKER_EMAIL,MAKER_PASSWORD&envDescription=Supabase%20keys%2C%20your%20public%20URL%2C%20an%20email%20provider%2C%20and%20maker%20login)

Set `APP_BASE_URL` to your deployment's public URL after the first deploy.

### Deploy with Docker

```bash
cp .env.docker.example .env.docker   # fill in your values
docker compose up -d
```

The app serves on port 3000; put it behind your reverse proxy and point `APP_BASE_URL` at
the public URL.

## Configuration

All configuration is environment variables — no settings UI to break. Copy `.env.example`
and fill in. The app **refuses to start in production** if a required variable is missing.

| Variable | Required | What it's for |
|---|---|---|
| `SUPABASE_URL` | yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Server-side data access (keep secret) |
| `SUPABASE_ANON_KEY` | yes | Maker auth sessions |
| `APP_BASE_URL` | yes | Your public URL — used in verification links |
| `EMAIL_FROM` | yes | From-address for emails |
| `RESEND_API_KEY` *or* `SMTP_*` | yes | An email provider (double-opt-in needs one) |
| `WAITLIST_NAME` | no | Display name (default "Waitlist") |
| `MAKER_EMAIL` / `MAKER_PASSWORD` | no | Enables the `/dashboard` (omit = no dashboard) |
| `THEME_ACCENT_COLOR` / `THEME_LOGO_URL` / `THEME_HEADLINE` / `THEME_SUBHEAD` / `THEME_CTA_LABEL` | no | Branding |
| `REWARD_TIERS` | no | JSON array of `{referrals, label}` milestones |
| `POWERED_BY` | no | Set to `false` to remove the credit |

See `.env.example` for the full annotated list.

## Development

```bash
npm install
npx supabase start          # local Postgres + Auth (needs Docker/colima)
cp .env.example .env        # fill in local values (supabase status -o json for keys)
npm run dev
npm test                    # unit
npm run test:integration    # needs the local Supabase stack running
```

## Known limitations

RefQueue v1 is deliberately small. Documented tradeoffs (tracked for v1.1):

- **Rate limiting is per-instance** and keyed on `x-forwarded-for` — deploy behind a proxy
  that sets it, and expect a shared limiter to arrive with multi-instance support.
- **A milestone reward email can rarely double-send** if two referred users confirm in the
  same instant (best-effort semantics; bounded to a duplicate email, never a broken flow).
- **Re-signing up with a known email returns that email's status** — convenient status
  read-back, but it discloses membership. Use a generic response if that matters to you.
- **The dashboard loads all signups per view** — fine to tens of thousands; revisit at scale.

## Roadmap (v1.1+)

- **Embeddable widget** — drop the signup form into an existing site (most-requested).
- **Position-jump animation** — the satisfying "move up the line" motion.
- Email-provider sync (Mailchimp/ConvertKit), shared/distributed rate limiting, generated
  Supabase types.

## Contributing

Issues and PRs welcome — see [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE) — an open-source alternative to GetWaitlist / Viral Loops. Own implementation;
no affiliation.
````

- [ ] **Step 3: Verify** the markdown renders (no broken tables/links); confirm the Vercel button URL is well-formed.

- [ ] **Step 4: Commit**

```bash
git add README.md docs/screenshots
git commit -m "docs: real README — positioning, deploy buttons, config, limitations, roadmap

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task BB2: LICENSE, CONTRIBUTING, issue/PR templates

**Files:**
- Create: `LICENSE`
- Create: `CONTRIBUTING.md`
- Create: `.github/ISSUE_TEMPLATE/bug_report.md`, `.github/ISSUE_TEMPLATE/feature_request.md`
- Create: `.github/pull_request_template.md`

- [ ] **Step 1: Create `LICENSE`** — the standard MIT text, `Copyright (c) 2026 Aline Aronsky` (confirm the name/year with Aline if unsure; MIT full text verbatim).

- [ ] **Step 2: Create `CONTRIBUTING.md`**

```markdown
# Contributing to RefQueue

Thanks for helping — issues and PRs are welcome.

## Development setup

See the "Development" section of the [README](README.md). You'll need Node 20+ and Docker
(for the local Supabase stack via `npx supabase start`).

## Before opening a PR

- `npm test` (unit) and `npm run test:integration` (needs the local stack) pass.
- `npx tsc --noEmit` and `npm run lint` are clean.
- New behavior has a test. This project follows test-driven development.

## Scope

RefQueue is deliberately small (see the README roadmap for what's planned vs. out of scope).
If you're proposing a feature, open an issue first so we can check it fits before you build it.

## Reporting bugs

Use the bug report template. Include your deploy target (Vercel/Docker), and whether email
is via Resend or SMTP.
```

- [ ] **Step 3: Create `.github/ISSUE_TEMPLATE/bug_report.md`**

```markdown
---
name: Bug report
about: Something isn't working
labels: bug
---

**What happened**

**What you expected**

**Steps to reproduce**

**Environment**
- Deploy target: [Vercel / Docker / local]
- Email provider: [Resend / SMTP / none]
- Browser (if a UI bug):
```

- [ ] **Step 4: Create `.github/ISSUE_TEMPLATE/feature_request.md`**

```markdown
---
name: Feature request
about: Suggest an idea
labels: enhancement
---

**The problem you're trying to solve**

**Your proposed solution**

**Is this on the roadmap already?** (check the README roadmap first)
```

- [ ] **Step 5: Create `.github/pull_request_template.md`**

```markdown
## What this changes

## Why

## Checklist
- [ ] Tests pass (`npm test`, `npm run test:integration`)
- [ ] `npx tsc --noEmit` and `npm run lint` are clean
- [ ] New behavior has a test
```

- [ ] **Step 6: Commit**

```bash
git add LICENSE CONTRIBUTING.md .github/ISSUE_TEMPLATE .github/pull_request_template.md
git commit -m "docs: MIT license, contributing guide, issue/PR templates

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Milestone CC — Launch readiness

### Task CC1: Clean-machine deploy rehearsal + full gates

**Controller task — verifies the launch bar's "must work" boxes end to end.**

- [ ] **Step 1: Full gate sweep** (dev server stopped first):

```bash
npx tsc --noEmit
npm run lint
npm test
bash -c 'set -a; source .env; set +a; npm run test:integration'
npm run build
```

Expected: all green; build lists the same route table as Plan 5 plus `ƒ Middleware`, and reports `Creating an optimized production build` with standalone output.

- [ ] **Step 2: Docker smoke** (if Docker available): `docker build -t refqueue:test .` succeeds; `docker compose config` validates. (If Docker is unavailable in this environment, note it as a manual step Aline runs on her machine before launch.)

- [ ] **Step 3: Boot-failure smoke** — confirm a production boot with a missing provider fails loudly. Minimal check: a unit test already proves `collectProductionConfigErrors` catches it; optionally run the app with `NODE_ENV=production` and a deliberately incomplete env and confirm it refuses to start.

- [ ] **Step 4: Core-loop smoke on the real build** — following the README quickstart against the local stack, drive join → confirm (via the logged/sent verify link) → status → refer → confirm friend → position jump. Confirm the redesigned pages render correctly. (Reuse the Plan 5 smoke method; distinct `x-forwarded-for` IPs to dodge the rate limiter.)

- [ ] **Step 5: Fix anything surfaced, re-run until green, commit fixes** (skip commit if nothing surfaced).

---

### Task CC2: Launch checklist + docs + the go-public gate

**Controller task — the final act. STOPS for Aline's explicit go-ahead before anything public.**

- [ ] **Step 1: Update docs** — append Plan 6 outcomes to `[C] Plan-1 Review Notes & Hardening Backlog.md` (what shipped, what's now documented-not-fixed in the README's Known Limitations). Update `~/Code Documentation/claude-memory.md` per its rules.

- [ ] **Step 2: Confirm the Launch Bar is all green** — walk the checklist at the top of this plan; every box must be checked with evidence.

- [ ] **Step 3: Present the go-live checklist to Aline and STOP.** Do NOT push, make the repo public, or post anything without her explicit OK (per the standing rule: pushes to the default branch and anything outward-facing need her sign-off). The remaining steps are hers to trigger:

  **Repo go-public (Aline triggers):**
  - [ ] Push `main` to origin.
  - [ ] Flip the GitHub repo to public.
  - [ ] Add repo description + topics (`waitlist`, `referral`, `nextjs`, `supabase`, `open-source`, `self-hosted`).
  - [ ] Confirm the CI badge is green on the public repo.

  **Launch sequence (Aline's marketing runbook, from PRODUCT.md — wave one, animation-independent):**
  - [ ] Directory listings: openalternative.co, awesome-selfhosted, awesome-foss-alternatives.
  - [ ] Subreddit posts: r/SaaS, r/indiehackers, r/selfhosted, r/opensource.
  - [ ] IndieHackers build-in-public post.
  - [ ] Personal + community network activation.
  - [ ] (Optional) Show HN.

  **Wave two (after the repo is public):**
  - [ ] Build the position-jump animation (its own mini-plan).
  - [ ] Cut the alinedecodes short-form video around the animated position-jump — the asymmetric distribution bet.

---

## Self-Review (writing-plans checklist)

- **Spec coverage (against the Launch Bar):** boot-time config validation → Y1; deploy works (Docker → Z1/Z2, Vercel → Z3, Supabase path → Z4); design pass → AA1/AA2; core loop verified → CC1; README → BB1; LICENSE/CONTRIBUTING/templates → BB2; Known Limitations + roadmap giving the deferred hardening a home → BB1. Animation + hardening explicitly deferred with documented homes.
- **Placeholder scan:** README, LICENSE (MIT verbatim), CONTRIBUTING, templates, Dockerfile, compose, instrumentation, and the validator are all dictated in full. The only genuine insertion points are the two screenshot files (captured in BB1 Step 1) — not vague placeholders. Design tasks (AA) are intentionally not TDD; their steps are concrete (touch only these files, preserve these elements, verify these states) with a hard "logic/tests unchanged" constraint.
- **Type consistency:** `collectProductionConfigErrors(env): string[]` defined in config.ts (Y1), consumed by `src/instrumentation.ts`. No other new types. `next.config.ts` `output: 'standalone'` matches the Dockerfile's `.next/standalone` copy paths.
- **Known risks:** (a) Docker/build steps need Docker present — flagged as BLOCKED-if-unavailable + a manual fallback for Aline's machine. (b) `instrumentation.ts` must live at `src/` (matches the repo's `src/` layout and `@/` alias); if Next resolves it at root instead, the build's route table won't show it — CC1 Step 1 would surface that. (c) The Vercel button URL bakes in `github.com/alinearonsky/refqueue`; if the repo home changes it must update (but the rename decision was closed — RefQueue stays). (d) The design pass must not regress the Plan 5 theme system — AA's per-task gates + themed-override verification guard it.

---

## Execution Handoff

Execute task-by-task with frequent commits. Two options:

1. **Subagent-Driven (recommended)** — superpowers:subagent-driven-development. Note: milestone AA (design) is best done with the controller driving the `frontend`/`branding` skills directly rather than a generic implementer subagent, since it's taste work with visual verification; Y/Z/BB are clean subagent tasks.
2. **Inline Execution** — superpowers:executing-plans.

Prereqs before Y1: colima + `npx supabase start` running, `.env` present, `main` clean. **CC2 stops for Aline's explicit go-ahead before any push or public action.**
