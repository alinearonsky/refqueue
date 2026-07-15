# RefQueue — Plan 2: Email Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make RefQueue actually send email — a real confirmation (double opt-in) email on signup and a milestone email when a referrer unlocks a reward tier — behind the existing `EmailSender` interface, with a Resend provider (default) and an SMTP provider (fallback), all TDD-tested.

**Architecture:** Email *content* is built by pure template functions (unit-tested, no I/O). Email *sending* stays behind the Plan 1 `EmailSender` interface; two new implementations (`ResendEmailSender`, `SmtpEmailSender`) wrap their SDKs and are unit-tested with injected clients/transporters (no network). A factory selects the provider from env (Resend → SMTP → Fake fallback when nothing is configured). A tiny module singleton (`getEmailSender`) with a test-override hook lets the API routes obtain the sender while staying testable. The two routes are wired: `POST /api/signup` sends the confirmation; `GET /api/verify` fires a milestone notification to the referrer when their confirmed-referral count crosses a reward tier. Milestone/notification orchestration lives in a small service module so the routes stay thin.

**Tech Stack:** Next.js 15 · TypeScript · `resend` (Resend SDK) · `nodemailer` + `@types/nodemailer` (SMTP) · Vitest. Builds on Plan 1 (schema, signups repo, position/reward engine, both API routes).

**Repo location:** `~/Personal/refqueue` (already exists, Plan 1 complete, on `main`, remote `origin` = private `alinearonsky/refqueue`). This planning doc lives in `~/Code Documentation/refqueue/`.

---

## Scope: this is Plan 2 of 6

| Plan | Subsystem | Produces |
|---|---|---|
| 1 | Core engine | ✅ done — tested backend + minimal API |
| **2 (this)** | Email: Resend + SMTP behind the interface; confirmation + milestone emails | Real emails sent on signup + tier-unlock |
| 3 | Public pages: themeable landing + signup status page | Visitor-facing flow |
| 4 | Maker dashboard + Supabase Auth | Maker-facing flow |
| 5 | Theming/config + "powered by RefQueue" credit | Configurable, self-distributing |
| 6 | Deploy: Vercel + Docker, README, CONTRIBUTING | Shippable v1 |

**Explicitly OUT of Plan 2 (YAGNI):** custom email-template editor (ship good defaults), Mailchimp/ConvertKit sync, per-position "you moved up" pings (spammy — Plan 2 sends only *reward-tier-unlock* milestones), retry queues / background jobs (send is best-effort inline), resend-verification endpoint (re-signing up an unverified email already re-sends). These are later plans or deliberate non-goals.

---

## Context from Plan 1 (existing code this plan uses — do NOT reimplement)

- `src/lib/email/types.ts` → `EmailSender { send(msg: EmailMessage): Promise<void> }`, `EmailMessage { to; subject; html }`.
- `src/lib/email/fake.ts` → `FakeEmailSender` with a public `sent: EmailMessage[]`.
- `src/lib/db/signups.ts` → `SignupRecord` (`id, waitlist_id, email, verified, verify_token, referral_code, referred_by, created_at, verified_at`), `createSignup`, `verifySignup`, `countConfirmedReferrals`, `createWaitlistForTest(db, slug)`.
- `src/lib/db/waitlists.ts` → `WaitlistRecord` (`id, name, slug, theme, reward_tiers, powered_by`), `getWaitlistBySlug`.
- `src/lib/referral/position.ts` → `RewardTier { referrals; label }`, `resolveRewards`.
- `src/app/api/signup/route.ts` (POST) and `src/app/api/verify/route.ts` (GET) — thin routes to extend.
- Integration tests load env via: `bash -c 'set -a; source .env; set +a; npm run test:integration'`. Vitest does NOT auto-load `.env`.

---

## File Structure (Plan 2)

```
src/lib/email/
├── types.ts                 # (exists)
├── fake.ts                  # (exists)
├── templates.ts             # NEW — buildConfirmationEmail, buildMilestoneEmail (pure)
├── templates.test.ts        # NEW
├── resend.ts                # NEW — ResendEmailSender + makeResendSender
├── resend.test.ts           # NEW (injected client, no network)
├── smtp.ts                  # NEW — SmtpEmailSender + makeSmtpSender
├── smtp.test.ts             # NEW (mock transporter, no network)
├── factory.ts               # NEW — createEmailSender(env)
├── factory.test.ts          # NEW
├── index.ts                 # NEW — getEmailSender() singleton + setEmailSenderForTest()
└── index.test.ts            # NEW
src/lib/notifications/
├── milestone.ts             # NEW — notifyReferrerMilestone (service; keeps verify route thin)
└── milestone.integration.test.ts  # NEW (DB-backed)
src/lib/db/
├── signups.ts               # MODIFY — add getSignupById; extend createWaitlistForTest with reward tiers
└── waitlists.ts             # MODIFY — add getWaitlistById
src/app/api/
├── signup/route.ts          # MODIFY — send confirmation email on new/unverified signup
├── signup/route.integration.test.ts   # MODIFY — assert confirmation email sent
├── verify/route.ts          # MODIFY — fire milestone notification
└── verify/route.integration.test.ts   # MODIFY — assert milestone email on tier unlock
.env.example                 # MODIFY — email provider vars
```

**Boundaries:** templates are pure (no I/O). Providers wrap SDKs and are the only code importing `resend`/`nodemailer`. The factory is the only place that reads provider env. Routes obtain the sender via `getEmailSender()` and delegate milestone logic to the notifications service — routes stay thin.

---

## Milestone J — Dependencies & templates

### Task J1: Install email provider dependencies

**Files:**
- Modify: `~/Personal/refqueue/package.json` (deps)

- [ ] **Step 1: Install**

Run:
```bash
cd ~/Personal/refqueue
npm install resend nodemailer
npm install -D @types/nodemailer
```

- [ ] **Step 2: Typecheck baseline still clean**

Run: `npx tsc --noEmit`
Expected: no errors (no code uses the new deps yet).

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add resend + nodemailer"
```

### Task J2: Email templates (pure)

**Files:**
- Create: `src/lib/email/templates.ts`
- Test: `src/lib/email/templates.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { test, expect, describe } from 'vitest'
import { buildConfirmationEmail, buildMilestoneEmail } from './templates'

describe('buildConfirmationEmail', () => {
  test('includes the waitlist name in the subject and the verify link in the body', () => {
    const { subject, html } = buildConfirmationEmail({
      waitlistName: 'My App',
      verifyUrl: 'http://localhost:3000/api/verify?token=abc123XY',
    })
    expect(subject).toContain('My App')
    expect(html).toContain('http://localhost:3000/api/verify?token=abc123XY')
  })
  test('escapes HTML in the waitlist name (defense against maker-supplied markup)', () => {
    const { html } = buildConfirmationEmail({
      waitlistName: '<script>alert(1)</script>',
      verifyUrl: 'http://x/verify',
    })
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;script&gt;')
  })
})

describe('buildMilestoneEmail', () => {
  test('names the unlocked reward and the referral count', () => {
    const { subject, html } = buildMilestoneEmail({
      waitlistName: 'My App',
      unlockedLabel: 'Early access',
      confirmedReferrals: 3,
    })
    expect(subject).toContain('Early access')
    expect(html).toContain('Early access')
    expect(html).toContain('3')
  })
  test('escapes HTML in the unlocked label', () => {
    const { html } = buildMilestoneEmail({
      waitlistName: 'A',
      unlockedLabel: '<b>x</b>',
      confirmedReferrals: 1,
    })
    expect(html).not.toContain('<b>x</b>')
    expect(html).toContain('&lt;b&gt;')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test src/lib/email/templates.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`src/lib/email/templates.ts`:
```typescript
export interface ConfirmationEmailInput {
  waitlistName: string
  verifyUrl: string
}

export interface MilestoneEmailInput {
  waitlistName: string
  unlockedLabel: string
  confirmedReferrals: number
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function buildConfirmationEmail(input: ConfirmationEmailInput): { subject: string; html: string } {
  const name = escapeHtml(input.waitlistName)
  const subject = `Confirm your spot on the ${input.waitlistName} waitlist`
  const html = [
    `<p>Thanks for joining the ${name} waitlist!</p>`,
    `<p>Confirm your email to lock in your spot: <a href="${input.verifyUrl}">Confirm my spot</a></p>`,
    `<p>If you didn't sign up, you can safely ignore this email.</p>`,
  ].join('\n')
  return { subject, html }
}

export function buildMilestoneEmail(input: MilestoneEmailInput): { subject: string; html: string } {
  const name = escapeHtml(input.waitlistName)
  const label = escapeHtml(input.unlockedLabel)
  const people = input.confirmedReferrals === 1 ? 'person' : 'people'
  const subject = `You unlocked ${input.unlockedLabel} on ${input.waitlistName}`
  const html = [
    `<p>Nice work — you've referred ${input.confirmedReferrals} ${people} to ${name}.</p>`,
    `<p>You just unlocked: <strong>${label}</strong>.</p>`,
  ].join('\n')
  return { subject, html }
}
```
> Subjects intentionally use the raw name (email clients render subjects as plain text, not HTML); the HTML bodies use the escaped name. `verifyUrl` is our own `APP_BASE_URL`-derived URL with a url-safe token, so it is not escaped.

- [ ] **Step 4: Run to verify it passes**

Run: `npm test src/lib/email/templates.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/email/templates.ts src/lib/email/templates.test.ts
git commit -m "feat: email templates (confirmation + milestone)"
```

---

## Milestone K — Providers & factory

### Task K1: Resend provider

**Files:**
- Create: `src/lib/email/resend.ts`
- Test: `src/lib/email/resend.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { test, expect, describe, vi } from 'vitest'
import { ResendEmailSender } from './resend'

describe('ResendEmailSender', () => {
  test('maps EmailMessage to the Resend client call with the configured from', async () => {
    const send = vi.fn().mockResolvedValue({ data: { id: 'x' }, error: null })
    const sender = new ResendEmailSender('RefQueue <no-reply@refqueue.dev>', { emails: { send } })
    await sender.send({ to: 'a@b.com', subject: 'Hi', html: '<p>x</p>' })
    expect(send).toHaveBeenCalledWith({
      from: 'RefQueue <no-reply@refqueue.dev>',
      to: 'a@b.com',
      subject: 'Hi',
      html: '<p>x</p>',
    })
  })
  test('throws when the Resend client returns an error', async () => {
    const send = vi.fn().mockResolvedValue({ data: null, error: { message: 'bad key' } })
    const sender = new ResendEmailSender('from@x', { emails: { send } })
    await expect(sender.send({ to: 'a@b.com', subject: 's', html: 'h' })).rejects.toThrow(/bad key/)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test src/lib/email/resend.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`src/lib/email/resend.ts`:
```typescript
import { Resend } from 'resend'
import type { EmailSender, EmailMessage } from './types'

/** The minimal slice of the Resend client we depend on (keeps the sender testable). */
export interface ResendLike {
  emails: {
    send(args: { from: string; to: string; subject: string; html: string }): Promise<{ data: unknown; error: unknown | null }>
  }
}

export class ResendEmailSender implements EmailSender {
  constructor(private readonly from: string, private readonly client: ResendLike) {}

  async send(msg: EmailMessage): Promise<void> {
    const { error } = await this.client.emails.send({
      from: this.from,
      to: msg.to,
      subject: msg.subject,
      html: msg.html,
    })
    if (error) throw new Error(`Resend send failed: ${JSON.stringify(error)}`)
  }
}

export function makeResendSender(apiKey: string, from: string): ResendEmailSender {
  return new ResendEmailSender(from, new Resend(apiKey) as unknown as ResendLike)
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test src/lib/email/resend.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/email/resend.ts src/lib/email/resend.test.ts
git commit -m "feat: Resend email provider"
```

### Task K2: SMTP provider

**Files:**
- Create: `src/lib/email/smtp.ts`
- Test: `src/lib/email/smtp.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { test, expect, describe, vi } from 'vitest'
import { SmtpEmailSender } from './smtp'

describe('SmtpEmailSender', () => {
  test('maps EmailMessage to transporter.sendMail with the configured from', async () => {
    const sendMail = vi.fn().mockResolvedValue({ messageId: '1' })
    const sender = new SmtpEmailSender('RefQueue <no-reply@refqueue.dev>', { sendMail } as never)
    await sender.send({ to: 'a@b.com', subject: 'Hi', html: '<p>x</p>' })
    expect(sendMail).toHaveBeenCalledWith({
      from: 'RefQueue <no-reply@refqueue.dev>',
      to: 'a@b.com',
      subject: 'Hi',
      html: '<p>x</p>',
    })
  })
  test('propagates a transporter error', async () => {
    const sendMail = vi.fn().mockRejectedValue(new Error('smtp down'))
    const sender = new SmtpEmailSender('from@x', { sendMail } as never)
    await expect(sender.send({ to: 'a@b.com', subject: 's', html: 'h' })).rejects.toThrow(/smtp down/)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test src/lib/email/smtp.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`src/lib/email/smtp.ts`:
```typescript
import nodemailer, { type Transporter } from 'nodemailer'
import type { EmailSender, EmailMessage } from './types'

export class SmtpEmailSender implements EmailSender {
  constructor(private readonly from: string, private readonly transporter: Transporter) {}

  async send(msg: EmailMessage): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to: msg.to,
      subject: msg.subject,
      html: msg.html,
    })
  }
}

export interface SmtpConfig {
  host: string
  port: number
  secure: boolean
  user?: string
  pass?: string
  from: string
}

export function makeSmtpSender(config: SmtpConfig): SmtpEmailSender {
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.user ? { user: config.user, pass: config.pass } : undefined,
  })
  return new SmtpEmailSender(config.from, transporter)
}
```
> The test injects a minimal `{ sendMail }` stub cast to `Transporter` — it exercises our field-mapping without opening a socket. `makeSmtpSender` is thin config-wiring, verified by the factory test in K3.

- [ ] **Step 4: Run to verify it passes**

Run: `npm test src/lib/email/smtp.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/email/smtp.ts src/lib/email/smtp.test.ts
git commit -m "feat: SMTP email provider"
```

### Task K3: Provider factory

**Files:**
- Create: `src/lib/email/factory.ts`
- Test: `src/lib/email/factory.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { test, expect, describe } from 'vitest'
import { createEmailSender } from './factory'
import { ResendEmailSender } from './resend'
import { SmtpEmailSender } from './smtp'
import { FakeEmailSender } from './fake'

describe('createEmailSender', () => {
  test('uses Resend when RESEND_API_KEY is set', () => {
    const s = createEmailSender({ RESEND_API_KEY: 're_x', EMAIL_FROM: 'from@x' } as NodeJS.ProcessEnv)
    expect(s).toBeInstanceOf(ResendEmailSender)
  })
  test('uses SMTP when SMTP_HOST is set and no Resend key', () => {
    const s = createEmailSender({ SMTP_HOST: 'smtp.x', EMAIL_FROM: 'from@x' } as NodeJS.ProcessEnv)
    expect(s).toBeInstanceOf(SmtpEmailSender)
  })
  test('falls back to Fake when no provider is configured', () => {
    const s = createEmailSender({} as NodeJS.ProcessEnv)
    expect(s).toBeInstanceOf(FakeEmailSender)
  })
  test('throws if a provider is configured without EMAIL_FROM', () => {
    expect(() => createEmailSender({ RESEND_API_KEY: 're_x' } as NodeJS.ProcessEnv)).toThrow(/EMAIL_FROM/)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test src/lib/email/factory.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`src/lib/email/factory.ts`:
```typescript
import type { EmailSender } from './types'
import { FakeEmailSender } from './fake'
import { makeResendSender } from './resend'
import { makeSmtpSender } from './smtp'

/**
 * Selects the email provider from environment:
 *   RESEND_API_KEY  -> Resend (default provider)
 *   SMTP_HOST       -> SMTP fallback (bring-your-own server)
 *   neither         -> FakeEmailSender (local dev / tests; records, never sends)
 * EMAIL_FROM is required for any real provider.
 */
export function createEmailSender(env: NodeJS.ProcessEnv = process.env): EmailSender {
  const from = env.EMAIL_FROM

  if (env.RESEND_API_KEY) {
    if (!from) throw new Error('EMAIL_FROM must be set when RESEND_API_KEY is configured')
    return makeResendSender(env.RESEND_API_KEY, from)
  }

  if (env.SMTP_HOST) {
    if (!from) throw new Error('EMAIL_FROM must be set when SMTP_HOST is configured')
    return makeSmtpSender({
      host: env.SMTP_HOST,
      port: Number(env.SMTP_PORT ?? '587'),
      secure: env.SMTP_SECURE === 'true',
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
      from,
    })
  }

  return new FakeEmailSender()
}
```
> Taking `env` as an argument (defaulting to `process.env`) makes the selection logic unit-testable without mutating global env.

- [ ] **Step 4: Run to verify it passes**

Run: `npm test src/lib/email/factory.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/email/factory.ts src/lib/email/factory.test.ts
git commit -m "feat: email provider factory"
```

### Task K4: Sender singleton + test hook

**Files:**
- Create: `src/lib/email/index.ts`
- Test: `src/lib/email/index.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { test, expect, describe, afterEach } from 'vitest'
import { getEmailSender, setEmailSenderForTest } from './index'
import { FakeEmailSender } from './fake'

afterEach(() => setEmailSenderForTest(null))

describe('getEmailSender', () => {
  test('returns the sender injected for tests', () => {
    const fake = new FakeEmailSender()
    setEmailSenderForTest(fake)
    expect(getEmailSender()).toBe(fake)
  })
  test('with no override and no provider env, returns a Fake sender', () => {
    setEmailSenderForTest(null)
    expect(getEmailSender()).toBeInstanceOf(FakeEmailSender)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test src/lib/email/index.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`src/lib/email/index.ts`:
```typescript
import type { EmailSender } from './types'
import { createEmailSender } from './factory'

let cached: EmailSender | null = null

/** Lazily builds (and caches) the process-wide email sender from env. */
export function getEmailSender(): EmailSender {
  if (!cached) cached = createEmailSender()
  return cached
}

/** Test seam: inject a sender (e.g. FakeEmailSender), or pass null to reset. */
export function setEmailSenderForTest(sender: EmailSender | null): void {
  cached = sender
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test src/lib/email/index.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/email/index.ts src/lib/email/index.test.ts
git commit -m "feat: email sender singleton with test hook"
```

---

## Milestone L — Wire email into the routes

### Task L1: Send the confirmation email on signup

**Files:**
- Modify: `src/app/api/signup/route.ts`
- Modify: `src/app/api/signup/route.integration.test.ts`

- [ ] **Step 1: Extend the integration test**

Add these imports at the top of `src/app/api/signup/route.integration.test.ts` (alongside the existing imports):
```typescript
import { afterEach } from 'vitest'
import { FakeEmailSender } from '@/lib/email/fake'
import { setEmailSenderForTest } from '@/lib/email'
```
Inside the `describe('POST /api/signup (integration)', ...)` block, add a fake sender that is installed per-test and reset afterward. Add near the top of the describe body:
```typescript
  let fakeEmail: FakeEmailSender
  beforeEach(() => {
    fakeEmail = new FakeEmailSender()
    setEmailSenderForTest(fakeEmail)
  })
  afterEach(() => setEmailSenderForTest(null))
```
(There is already a `beforeEach(reset)` for the DB — a second `beforeEach` is fine; both run. Keep both.)

Then add this test inside the same describe block:
```typescript
  test('sends a confirmation email containing the verify link', async () => {
    await createWaitlistForTest(db, 'launchmail')
    const res = await POST(req({ waitlistSlug: 'launchmail', email: 'mail@example.com' }))
    expect(res.status).toBe(200)
    expect(fakeEmail.sent).toHaveLength(1)
    const sent = fakeEmail.sent[0]
    expect(sent.to).toBe('mail@example.com')
    expect(sent.subject).toContain('launchmail')
    expect(sent.html).toContain('/api/verify?token=')
  })
```

- [ ] **Step 2: Run to verify it fails**

Run: `bash -c 'set -a; source .env; set +a; npm run test:integration'`
Expected: FAIL — the new test fails because no email is sent yet (`fakeEmail.sent` is empty). The other tests still pass.

- [ ] **Step 3: Implement — add the send after signup creation**

In `src/app/api/signup/route.ts`, add these imports:
```typescript
import { getEmailSender } from '@/lib/email'
import { buildConfirmationEmail } from '@/lib/email/templates'
```
Immediately after the line `const signup = await createSignup(db, { waitlistId: waitlist.id, email, referrerCode: ref })`, insert:
```typescript
  // Send the double-opt-in confirmation email (best-effort; a send failure must not
  // fail the signup — the row exists and re-signing up re-sends). Awaited so it
  // completes before the serverless function returns.
  if (!signup.verified && signup.verify_token) {
    const base = process.env.APP_BASE_URL ?? 'http://localhost:3000'
    const verifyUrl = `${base}/api/verify?token=${signup.verify_token}`
    const email = buildConfirmationEmail({ waitlistName: waitlist.name, verifyUrl })
    try {
      await getEmailSender().send({ to: signup.email, subject: email.subject, html: email.html })
    } catch (err) {
      console.error('signup: confirmation email failed to send', err)
    }
  }
```
Do NOT change the position computation or the response shape.

- [ ] **Step 4: Run to verify it passes**

Run: `bash -c 'set -a; source .env; set +a; npm run test:integration'`
Expected: PASS — all signup-route tests pass, including the new email one, and the existing verify + repo tests still pass. Also run `npx tsc --noEmit` (clean).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/signup/route.ts src/app/api/signup/route.integration.test.ts
git commit -m "feat: send confirmation email on signup"
```

### Task L2: Milestone email on tier unlock (verify route)

**Files:**
- Modify: `src/lib/db/signups.ts` (add `getSignupById`; extend `createWaitlistForTest`)
- Modify: `src/lib/db/waitlists.ts` (add `getWaitlistById`)
- Create: `src/lib/notifications/milestone.ts`
- Create: `src/lib/notifications/milestone.integration.test.ts`
- Modify: `src/app/api/verify/route.ts`
- Modify: `src/app/api/verify/route.integration.test.ts`

- [ ] **Step 1: Add the DB helpers (with their behavior exercised by the service test below)**

In `src/lib/db/signups.ts`, add after `getSignupByCode`:
```typescript
export async function getSignupById(db: SupabaseClient, id: string): Promise<SignupRecord | null> {
  const { data, error } = await db.from('signups').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return (data as SignupRecord) ?? null
}
```
Also extend `createWaitlistForTest` to accept optional reward tiers (needed to test unlocks). Replace the existing `createWaitlistForTest` with:
```typescript
export async function createWaitlistForTest(
  db: SupabaseClient,
  slug: string,
  rewardTiers: { referrals: number; label: string }[] = [],
) {
  const { data, error } = await db
    .from('waitlists')
    .insert({ name: slug, slug, reward_tiers: rewardTiers })
    .select()
    .single()
  if (error) throw error
  return data as { id: string; slug: string }
}
```
(The default empty array preserves every existing caller's behavior.)

In `src/lib/db/waitlists.ts`, add:
```typescript
export async function getWaitlistById(db: SupabaseClient, id: string): Promise<WaitlistRecord | null> {
  const { data, error } = await db.from('waitlists').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return (data as WaitlistRecord) ?? null
}
```

- [ ] **Step 2: Write the failing service integration test**

`src/lib/notifications/milestone.integration.test.ts`:
```typescript
import { test, expect, describe, beforeEach } from 'vitest'
import { createServiceClient } from '@/lib/db/client'
import { createWaitlistForTest, createSignup, verifySignup } from '@/lib/db/signups'
import { FakeEmailSender } from '@/lib/email/fake'
import { notifyReferrerMilestone } from './milestone'

const db = createServiceClient()
async function reset() {
  await db.from('signups').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await db.from('waitlists').delete().neq('id', '00000000-0000-0000-0000-000000000000')
}

describe('notifyReferrerMilestone (integration)', () => {
  beforeEach(reset)

  test('emails the referrer when their confirmed count hits a reward tier', async () => {
    const wl = await createWaitlistForTest(db, 'ms-a', [{ referrals: 1, label: 'Early access' }])
    const referrer = await createSignup(db, { waitlistId: wl.id, email: 'ref@example.com' })
    const referred = await createSignup(db, { waitlistId: wl.id, email: 'new@example.com', referrerCode: referrer.referral_code })
    const verified = await verifySignup(db, referred.verify_token!)
    const fake = new FakeEmailSender()
    await notifyReferrerMilestone(db, fake, verified!)
    expect(fake.sent).toHaveLength(1)
    expect(fake.sent[0].to).toBe('ref@example.com')
    expect(fake.sent[0].subject).toContain('Early access')
  })

  test('sends nothing when the verified signup was not referred', async () => {
    const wl = await createWaitlistForTest(db, 'ms-b', [{ referrals: 1, label: 'Early access' }])
    const s = await createSignup(db, { waitlistId: wl.id, email: 'solo@example.com' })
    const verified = await verifySignup(db, s.verify_token!)
    const fake = new FakeEmailSender()
    await notifyReferrerMilestone(db, fake, verified!)
    expect(fake.sent).toHaveLength(0)
  })

  test('sends nothing when the new count does not match any tier', async () => {
    const wl = await createWaitlistForTest(db, 'ms-c', [{ referrals: 5, label: 'Founding member' }])
    const referrer = await createSignup(db, { waitlistId: wl.id, email: 'ref@example.com' })
    const referred = await createSignup(db, { waitlistId: wl.id, email: 'new@example.com', referrerCode: referrer.referral_code })
    const verified = await verifySignup(db, referred.verify_token!)
    const fake = new FakeEmailSender()
    await notifyReferrerMilestone(db, fake, verified!)
    expect(fake.sent).toHaveLength(0)
  })
})
```

- [ ] **Step 3: Run to verify it fails**

Run: `bash -c 'set -a; source .env; set +a; npm run test:integration'`
Expected: FAIL — module `./milestone` not found.

- [ ] **Step 4: Implement the service**

`src/lib/notifications/milestone.ts`:
```typescript
import type { SupabaseClient } from '@supabase/supabase-js'
import type { EmailSender } from '@/lib/email/types'
import type { SignupRecord } from '@/lib/db/signups'
import { getSignupById, countConfirmedReferrals } from '@/lib/db/signups'
import { getWaitlistById } from '@/lib/db/waitlists'
import { buildMilestoneEmail } from '@/lib/email/templates'

/**
 * Called right after a signup verifies. If that signup was referred, its referrer's
 * confirmed-referral count just increased by exactly one (verify is idempotent, so this
 * runs only on the first successful verify). A reward tier is *newly* unlocked precisely
 * when its threshold equals the new count — email the referrer once per such tier.
 */
export async function notifyReferrerMilestone(
  db: SupabaseClient,
  sender: EmailSender,
  verifiedSignup: SignupRecord,
): Promise<void> {
  if (!verifiedSignup.referred_by) return

  const referrer = await getSignupById(db, verifiedSignup.referred_by)
  if (!referrer) return

  const waitlist = await getWaitlistById(db, referrer.waitlist_id)
  if (!waitlist) return

  const tiers = waitlist.reward_tiers ?? []
  const count = await countConfirmedReferrals(db, referrer.id)
  const newlyUnlocked = tiers.filter(t => t.referrals === count)

  for (const tier of newlyUnlocked) {
    const email = buildMilestoneEmail({
      waitlistName: waitlist.name,
      unlockedLabel: tier.label,
      confirmedReferrals: count,
    })
    await sender.send({ to: referrer.email, subject: email.subject, html: email.html })
  }
}
```

- [ ] **Step 5: Run to verify the service test passes**

Run: `bash -c 'set -a; source .env; set +a; npm run test:integration'`
Expected: PASS — the 3 milestone service tests pass (plus all existing tests). `npx tsc --noEmit` clean.

- [ ] **Step 6: Wire the service into the verify route + test it end-to-end**

Add to `src/app/api/verify/route.integration.test.ts` these imports:
```typescript
import { afterEach } from 'vitest'
import { FakeEmailSender } from '@/lib/email/fake'
import { setEmailSenderForTest } from '@/lib/email'
```
Add inside the describe block (keeping the existing `beforeEach(reset)`):
```typescript
  let fakeEmail: FakeEmailSender
  beforeEach(() => {
    fakeEmail = new FakeEmailSender()
    setEmailSenderForTest(fakeEmail)
  })
  afterEach(() => setEmailSenderForTest(null))
```
Add this test:
```typescript
  test('verifying a referred signup emails the referrer their tier unlock', async () => {
    const wl = await createWaitlistForTest(db, 'v-ms', [{ referrals: 1, label: 'Early access' }])
    const referrer = await createSignup(db, { waitlistId: wl.id, email: 'ref@example.com' })
    const referred = await createSignup(db, { waitlistId: wl.id, email: 'friend@example.com', referrerCode: referrer.referral_code })
    const res = await GET(verifyReq(referred.verify_token!))
    expect(res.status).toBe(200)
    expect(fakeEmail.sent.some(m => m.to === 'ref@example.com' && m.subject.includes('Early access'))).toBe(true)
  })
```
(The verify test file already imports `createWaitlistForTest` and `createSignup`; if not, add them to the existing `@/lib/db/signups` import.)

Then modify `src/app/api/verify/route.ts` to fire the notification. Add imports:
```typescript
import { getEmailSender } from '@/lib/email'
import { notifyReferrerMilestone } from '@/lib/notifications/milestone'
```
After the `if (!signup) return ...410...` line and before the final `return NextResponse.json(...)`, insert:
```typescript
  // Best-effort milestone notification to the referrer (never fail verification on it).
  try {
    await notifyReferrerMilestone(db, getEmailSender(), signup)
  } catch (err) {
    console.error('verify: milestone notification failed', err)
  }
```

- [ ] **Step 7: Run to verify everything passes**

Run: `bash -c 'set -a; source .env; set +a; npm run test:integration'` then `npm test` then `npx tsc --noEmit`.
Expected: all integration tests pass (repo, signup route, verify route, milestone service), all unit tests pass, tsc clean.

- [ ] **Step 8: Commit**

```bash
git add src/lib/db/signups.ts src/lib/db/waitlists.ts src/lib/notifications/milestone.ts src/lib/notifications/milestone.integration.test.ts src/app/api/verify/route.ts src/app/api/verify/route.integration.test.ts
git commit -m "feat: milestone email to referrer on reward-tier unlock"
```

---

## Milestone M — Config & full-suite gate

### Task M1: Env example + full suite

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: Add email provider vars to `.env.example`**

Append to `~/Personal/refqueue/.env.example`:
```bash
# Email — configure ONE provider. If neither is set, emails are logged, not sent (dev default).
EMAIL_FROM=RefQueue <no-reply@yourdomain.com>
# Option A: Resend (default provider)
RESEND_API_KEY=
# Option B: SMTP fallback (bring your own server)
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
```

- [ ] **Step 2: Run the whole suite**

Run:
```bash
cd ~/Personal/refqueue
npm test
bash -c 'set -a; source .env; set +a; npm run test:integration'
```
Expected: unit suite green (Plan 1's 24 + the new template/resend/smtp/factory/index unit tests) and integration suite green (Plan 1's 13 + the new signup-email, milestone-service, and verify-milestone tests). If anything is red, STOP and report — do not commit over a red suite.

- [ ] **Step 3: Commit**

```bash
git add .env.example
git commit -m "chore: document email provider env vars"
```

> **CI note:** `.github/workflows/ci.yml` runs `npm test` (unit only) — the new provider/template/factory unit tests run in CI with no network (they use injected clients/env). Integration tests still need the DB and are wired into CI in Plan 6. No CI change required in Plan 2.

---

## Self-Review (against the spec)

**Spec coverage (PRODUCT.md → Plan 2 slice):**
- "Transactional emails (double-opt-in confirmation)" ✓ — L1 sends the confirmation with the verify link on signup; template J2; provider K1/K2; selection K3/K4.
- "milestone / 'you moved up' notifications" ✓ (tier-unlock milestones) — L2 emails the referrer when their confirmed count crosses a reward tier. Per-position "you moved up" pings are deliberately deferred (spammy) and noted in the out-of-scope list.
- "Resend as the default with plain SMTP as a fallback so self-hosters can bring any provider" ✓ — K1 (Resend), K2 (SMTP), K3 factory prefers Resend, falls back to SMTP, then Fake.
- Architecture: sending stays behind the Plan 1 `EmailSender` interface ✓; templates are pure ✓; routes stay thin (milestone logic in `notifications/milestone.ts`) ✓; provider env read only in the factory ✓.
- Resolves the Plan 1 final-review item "wire an EmailSender into the signup route so the email module isn't dead code" ✓ (L1).

**Placeholder scan:** none — every step has complete code, exact commands, and expected results.

**Type consistency:** `EmailSender`/`EmailMessage` reused verbatim from Plan 1. `SignupRecord`, `WaitlistRecord`, `RewardTier`, `createSignup`, `verifySignup`, `countConfirmedReferrals`, `createWaitlistForTest` used with the signatures confirmed against the current tree (`createWaitlistForTest` gains an optional 3rd arg with a default, preserving existing callers). `ResendLike`/`SmtpConfig` are new and internal. `getSignupById`/`getWaitlistById` follow the existing throw-on-error repo convention.

**Deferred by design (later plans / non-goals):** template editor, ESP sync, retry queues, resend-verification endpoint, per-position move-up pings, and hooking real provider keys in CI (Plan 6).

---

## Execution Handoff

Choose when ready to build:

1. **Subagent-Driven (recommended)** — fresh subagent per task + two-stage review (uses superpowers:subagent-driven-development). Same flow that built Plan 1.
2. **Inline Execution** — tasks run in this session with checkpoints (uses superpowers:executing-plans).

Before executing: the local Supabase stack must be running (`npx supabase start`) and `~/Personal/refqueue/.env` present, since L1/L2/milestone tests are DB-backed. No provider keys are needed to run the suite — the Fake sender is the unconfigured default.
