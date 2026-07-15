# [C] RefQueue — Plan 1 Review Notes & Hardening Backlog

*Created during Plan 1 (core engine) build, 11 Jul 2026. Captures code-review findings that were deliberately deferred rather than fixed in Plan 1 — inputs for Plan 6 (deploy/hardening) and the maintenance backlog. Fixed items are recorded for traceability.*

## Fixed during Plan 1 (from review)

- **Position engine (D1):** reviewed; NaN-from-Invalid-Date in the comparator noted as unreachable by design (only verified signups with non-null `verified_at` reach it) — deliberately not guarded (YAGNI).
- **Signups repo (G2):** fixed swallowed DB read errors in `getSignupByCode`, `findReferrerId`, the idempotency SELECT, and the 23505 race re-fetch — they now throw instead of silently returning "not found" (which would have dropped referral credit on a transient error). Commit `91d9382`.
- **Signup route (H1):** fixed the position query swallowing its error (would fabricate `position: 1` on a transient DB error inside a 200 response); documented the `x-forwarded-for` trust boundary in-code.

## Fixed during Plan 3 (13 Jul 2026)

- **RLS enabled deny-all (was hardening item 2):** `0002_enable_rls.sql` enables RLS on `waitlists` + `signups` with zero policies — fail-closed; service_role bypasses. Verified live (`relrowsecurity = t`, 0 policies). Commit `63065fa`.
- **Verify prefetch (was hardening item 3):** `verifySignup` is now idempotent — the token is *kept* after verification, so a scanner prefetch (Outlook Safe Links) and the real click both land on the status redirect; milestone email gated on `alreadyVerified` (fires exactly once, regression-tested). `GET /api/verify` 303-redirects to `/status/<code>` (`?welcome=1` on first verify), invalid tokens to `/?verify=invalid`. Commits `1f86fdd`, `a5187d3`.
- **Position N+1 (was performance item 4):** `listVerifiedSignups` now returns `referred_by`; a pure `tallyConfirmedReferrals` derives every confirmed-referral count from that single query — one DB query per position computation instead of N+1. Commits `3e82149`, `6d207d1`.
- **Plan 2/3 wiring (from Plan 1 final review):** `resolveRewards` + shareable referral link (`${APP_BASE_URL}/?ref=<code>`) now surfaced — in the `POST /api/signup` response (`referralLink`, `rewards`) and on the status page (`/status/<code>`: position, link + copy/share buttons, reward progress). Commits `7bacec1`–`3d3ebe9`.
- **E2E route test (was nice-to-have):** verify-route suite now proves a confirmed referral raises the referrer's position through the API alone. Commit `a5187d3`.
- **Pre-public polish, two items:** unused `wl` bindings in the signup route test cleared; redundant `reward_tiers ?? []` guard dropped in `milestone.ts`. Lint is at zero warnings. Commit `7e09349`.

## Deferred — Hardening backlog (Plan 6 / maintenance)

### Security / correctness
1. **`x-forwarded-for` trust + rate-limit key.** Header is client-spoofable; absent header collapses all traffic into one `signup:unknown` bucket (self-inflicted DoS after 5 signups). Plan 1 documents the "deploy behind a proxy that overwrites XFF" assumption in-code. Plan 6: add trusted-proxy handling and a shared/distributed limiter (the `RateLimiter` interface is already the seam) so multi-instance deploys rate-limit correctly.
2. ~~Enable RLS~~ — ✅ done in Plan 3 (see above).
3. ~~`GET /api/verify` prefetch~~ — ✅ done in Plan 3 via idempotent verify + redirect (see above).

### Performance
4. ~~N+1 in signup position computation~~ — ✅ done in Plan 3 via single query + pure tally (see above).

### Robustness / DX (minor)
5. **`verify_token` uniqueness** is a plain index, not a unique constraint (unlike email/referral_code). Astronomically unlikely to collide (32-char nanoid); a partial unique index would be cheap symmetry.
6. **Case-insensitive email uniqueness** enforced only in app code (`.trim().toLowerCase()`), not at the DB. Fine while `createSignup` is the sole write path; a `citext` column or `lower(email)` unique index would make it DB-enforced.
7. **Generated Supabase types.** The repo uses `as SignupRecord`/`as WaitlistRecord` casts on an untyped client — no compiler safety against a column rename. `supabase gen types typescript` + a typed client would convert these to checked casts.
8. **`createWaitlistForTest` lives in the production `signups.ts` module** (reused by API route tests). Acceptable pragmatic tradeoff; a colocated `test-utils.ts` would be marginally cleaner if the pattern grows.

### Test coverage gaps (acceptable for Plan 1)
9. Referral-code collision-retry path (unreachable in normal runs), concurrent same-email double-submit race branch, and email-normalization idempotency (`A@x.com` vs `a@x.com`) are untested.

## Final holistic review (end of Plan 1) — assessment: READY FOR PLAN 2

No blockers. Both suites green (24 unit + 13 integration), no secrets committed, architecture boundaries honored (after the route→db refactor below). Items surfaced and their disposition:

- **Fixed at end of Plan 1:** signup route no longer queries Postgres directly — the verified-signups query moved into `db/signups.ts` (`listVerifiedSignups`), keeping the route thin and honoring "db/ is the only place touching Postgres."
- **Plan 2 opening task (by design, not a Plan 1 gap):** wire an `EmailSender` (default `FakeEmailSender`) into `POST /api/signup` so a verification email with `${APP_BASE_URL}/api/verify?token=...` is actually sent on signup. Until then `src/lib/email/*` is intentionally unused — the interface/fake is the seam Plan 2 fills with Resend/SMTP. `APP_BASE_URL` already exists in `.env.example` (currently unused for this reason).
- **Plan 2/3 wiring:** `resolveRewards` + `waitlist.reward_tiers` are implemented and unit-tested but not yet surfaced in any response — wire unlock status into the signup/status response (Plan 3 status page is the natural home). Likewise, assemble a shareable referral **link** (`${APP_BASE_URL}/?ref=<code>`), not just the bare code.
- **Nice-to-have test:** an end-to-end route test proving a verified referral raises the referrer's position through the API (invariant is already proven at the repo + pure layers).
- **Kept intentionally:** `isValidReferralCode` (`code.ts`) — plan-specified public validator, will be used to validate the `ref` query param on the client in Plan 3; not dead by intent.
- **Plan 6:** README (currently create-next-app boilerplate).

## Plan 2 (email) review — deferred items

- **Concurrent-verify race in milestone emails (correctness, fast-follow before a live referral program).** `notifyReferrerMilestone` reads `countConfirmedReferrals` after the verify commits, but nothing serializes two *different* referred signups verifying near-simultaneously for the same referrer. Both can read the same post-both-commits count → a tier at N+1 gets skipped and a tier at N+2 fires twice (duplicate email). Bounded by best-effort semantics (a missed/duplicate reward email, not a broken flow), so not a merge blocker — but fix before a waitlist with an active referral loop goes live. Fix options: `SELECT ... FOR UPDATE` / advisory lock keyed by referrer id around the count-and-check, or a `last_milestone_count_notified` column updated atomically with the count read. Hard to test deterministically.
- **Duplicate-threshold tiers → two emails (minor).** If a maker configures two reward tiers with the same `referrals` value, `tiers.filter(t => t.referrals === count)` returns both and sends two emails on one verify. Plausibly intended (one email per tier entry); worth a one-line comment or a test documenting the semantics.
- **Milestone service does two independent queries sequentially (micro-opt).** `getWaitlistById` + `countConfirmedReferrals` could be `Promise.all`'d for one fewer round trip.
- **Email *subject* lines are not HTML-escaped** (bodies are). Pre-existing pattern in both templates; low risk since names/labels are waitlist-owner config, not public input. Subjects render as plain text anyway.

## Plan 3 final review — deferred items (13 Jul 2026)

Plan 3 shipped READY (all gates green; full findings in the plan doc's execution). Deferred:

- **Email → status-capability enumeration (accepted risk — document or mitigate before public).** Idempotent re-signup returns the existing row's `referralCode`/`referralLink` for any known email, disclosing membership + position, and re-sends the confirmation email for unverified rows (bounded only by the IP rate limit). Partially by design (re-signup doubles as the status read-back). Options: accept + document in the README's threat notes, or return a generic "check your email" response when the row pre-exists. Decide in Plan 6.
- **Silent `LoggingEmailSender` fallback in production** (`email/factory.ts`). A prod deploy with no provider configured silently logs emails (incl. verify tokens) and sends nothing. Add a startup `console.warn`/env validation in Plan 6.
- **`APP_BASE_URL` has a dev-only default** (`config.ts`). Unset in prod → verify links point at localhost. Plan 6 env validation.
- **Prefetch consumes the `?welcome=1` moment.** When a scanner hits the verify link first, the human's click lands on the plain status page (no confirmation banner). Inherent to the stateless design; cookie-based fix possible later if it bothers anyone.
- **Status computation loads all verified signups per request** (`status/status.ts`). N+1 is gone but the full-list query is per-page-view; revisit at scale (50k+ signups) — aggregate SQL or a denormalized counter.

## Fixed during Plan 4 (13 Jul 2026)

Review-driven fixes applied task-by-task (every one caught by the two-stage subagent review before it could ship):

- **Maker provisioning hardened 3×** (`src/lib/db/maker.ts`): password sync memoized so anonymous `/login` GETs can't force a bcrypt rehash per request (`9764829`); module-scope in-flight lock collapses cold-start bursts to one admin round trip (`aca0b87`); `finally` guarded against clearing a newer generation's lock (`8794c7d`).
- **Token refresh on `/login`** (`d66a896`): middleware matcher includes `/login` as a public pass-through, so an expired-but-refreshable session refreshes where cookie writes are allowed — closes the documented @supabase/ssr "randomly logged out" failure mode (server components can't persist rotated refresh tokens).
- **Login dark mode + a11y** (`aca0b87`): notice/error chips got dark-mode colors (were near-invisible); `role="alert"` on the error. Dashboard CSS shipped with its dark-mode block from the start (plan amended after this catch).
- **Test isolation** (`3bba84c`): new `listAllSignups` describe block got its own `beforeEach(reset)` — reviewer reproduced a real duplicate-slug failure under `-t` filtered runs.
- **Metrics hardening** (`cea1d82`, `2147ab2`): pending entries sorted oldest-first explicitly (was silently relying on input order); day buckets normalized through `Date` (a self-hosted non-UTC Postgres serializes `created_at` with an offset — confirmed live, PostgREST emits `+00:00` format); pending derived as complement-of-verified so a malformed row can't vanish from the table/CSV.
- **CSV plan typo caught by implementer TDD** (`f33c4f9`): the S3 implementer refused to commit on a red test, hand-traced the fixture, and correctly identified the plan's assertion as the bug. Plan doc fixed.
- **`Cache-Control: no-store` on CSV export** (`7e1c1e9`): bulk-PII download must never be cached by a browser or intermediary.
- **Session cookies hardened** (`3c657e4`, from the final holistic review): @supabase/ssr defaults to `httpOnly: false` (serves `createBrowserClient`, unused here) — now `httpOnly: true` always, `Secure` derived from `APP_BASE_URL`'s scheme so plain-HTTP LAN self-hosts keep working. Verified live (`Set-Cookie ... HttpOnly; SameSite=lax`).

## Plan 4 review — deferred items (13 Jul 2026)

- **Logout CSRF** — `POST /api/auth/logout` has no CSRF token; a third-party page can force-sign-out the maker (nuisance only; login CSRF is NOT exploitable here — single account, attacker lacks the creds). Accepted for v1; revisit if CSRF tokens ever land elsewhere.
- **GoTrue login throttling** is permissive out of the box — README (Plan 6) should tell self-hosters to tune Supabase Auth rate limits before exposing `/login` publicly.
- **CSV lacks a UTF-8 BOM** — Excel-on-Windows double-click falls back to ANSI for non-ASCII bytes. Emails are ASCII in practice; one-line `﻿` prefix if ever reported.
- **`listUsers` pagination cap** — maker lookup reads page 1 (1000 users) only; silently stops finding the account past that. Commented in code; irrelevant for single-maker instances.
- **No `?next=` redirect preservation** on the middleware bounce — deliberate (there is exactly one dashboard route).
- **`SUPABASE_URL` read + validated in three places** (client.ts, auth/server.ts, middleware.ts) with three error strings — consolidate into a config getter someday.
- **Cosmetics:** stale `?error=1` can resurface from bfcache on back-button after a successful retry; chart per-day counts are hover-only (summary aria-label exists); dark mode collapses the th/td border hierarchy.
- **Ops note:** the integration suite's `reset` wipes the local dev DB (all waitlists/signups) — running `test:integration` destroys manual demo data; reseed afterwards.

## Fixed during Plan 5 (13 Jul 2026)

- **Postgres jsonb key-reorder false-diff (Critical, caught by the V2 review — bug was in the plan's dictated code).** `ensureWaitlist`'s tier diff used `JSON.stringify`; jsonb canonicalizes object key order on round-trip (`{"referrals":5,"label":"x"}` reads back `{"label":"x","referrals":5}`), so every landing render issued a spurious `UPDATE` once tiers were configured. Fixed with a structural `sameTiers` comparator + a Proxy-based write-avoidance regression test that the reviewer mutation-tested. Commits `0ba785a` + `f88edb2`.
- **THEME_LOGO_URL scheme check made case-insensitive** (`4bd6243`) — RFC 3986 schemes are case-insensitive.
- **Bottom padding reserved on both public pages** (`7a6ad75`) so the fixed powered-by credit can't overlap tall content (mobile status page with long tier lists).
- **Reward-tier env config shipped** (V1+V2) — closes the Plan 3 deferral; `REWARD_TIERS` JSON now drives milestone emails and the status-page rewards card, verified live end-to-end (tier unlocked at 1 confirmed referral in the smoke).

## Plan 5 review — deferred items (13 Jul 2026)

- **`waitlists.theme` jsonb column is intentionally unused** — theme is presentation-only, read from env at render. The column stays for a future settings UI; documented here so nobody "fixes" it.
- **Powered-by credit links to `github.com/alinearonsky/refqueue`, which is still private** — the link 404s for outside visitors until Plan 6 makes the repo public (deploys are local-only until then). Plan 6 checklist: confirm final repo home before first deploy.
- **Middleware bundle grew 93→158 kB** — `config.ts` now imports zod, and middleware imports config; the edge bundle swallows zod without using it. Micro-opt for Plan 6 if it bothers anyone: split the zod-using getters out of the module middleware imports.
- **Status pages pick up tier/flag/name changes only after the next landing render** (ensureWaitlist is the sync point) — accepted v1 semantics, documented in code.
- **Fixed accent text is white** — makers must pick an accent dark enough to carry it; documented in `.env.example`. No dark/light accent variants in v1 (YAGNI).
- **Theme values are not length-capped** (headline/subhead/CTA) — a maker can overflow their own page; harmless self-foot-gun, revisit only if reported.
- **Final-review minors (all cosmetic, accepted):** the 64px credit reserve stays when `POWERED_BY=false` (dead space on centered pages); duplicate identical tiers collide on a React key; tier/flag changes reach status pages only after a landing render (by design).

## Pre-public polish (do before the repo goes public — Plan 6-ish)

- **Prove best-effort send failure directly.** Neither `POST /api/signup` nor `GET /api/verify` has a test where the injected sender *throws* and the request still returns a success (200 / 303 redirect). The try/catch is correct by inspection; add one test per route (a `FakeEmailSender` subclass whose `send` rejects → assert success + row persisted) to lock the guarantee.
- ~~Redundant `reward_tiers ?? []` guard~~ — ✅ dropped in Plan 3.
- ~~Pre-existing lint warnings~~ — ✅ cleared in Plan 3; lint is at zero warnings.

## Shipped in Plan 6 — The Launch Package (13 Jul 2026)

The launch bottleneck was ~80% presentation + two real code bars, not the hardening backlog. Plan 6 shipped exactly that; the rest is documented, not fixed.

- **Fail-loud production config validation (code bar #1).** `collectProductionConfigErrors(env)` pure validator + an `instrumentation.ts` `register()` hook that throws in production only. Verified against the real standalone/Docker build: a boot missing an email provider fails loudly and **every route returns 500** — the misconfigured app never silently accepts a signup or drops a verification email. (Y1)
- **Working self-host deploy (code bar #2).** `output: 'standalone'` + multi-stage Dockerfile + docker-compose + `.env.docker.example` + Vercel one-click template + a documented Supabase setup/migration path. **Validated end-to-end in CC1:** `docker build` succeeds (284 MB image), the container boots clean, serves the redesigned landing (200), and a signup POST through the container returns a position and an `APP_BASE_URL`-based referral link. (Z1–Z4)
- **Design pass — the marketing asset.** A `DESIGN.md` design-system contract, then a striking dark-first redesign of both public pages: layered near-black surface ramp, atmospheric accent glow, a themeable accent that re-tints CTA/glow/focus/kicker/step-numbers/position-number via `color-mix`, and the **oversized luminous position number** as the signature moment on the status page. Public pages are always dark (scoped to `.rq-surface`); the maker dashboard/login are untouched. Verified in-browser across default + themed accent, focus, success, pending, rewards, and mobile stacking. (AA1/AA2)
- **Collateral.** Real README (villain positioning, hero screenshots, Vercel/Docker quick starts, full env table, Known Limitations + Roadmap that give the deferred hardening and the position-jump animation a documented home), MIT LICENSE, CONTRIBUTING, and GitHub issue/PR templates. (BB1/BB2)

**Now documented-not-fixed (lives in the README "Known limitations", tracked for v1.1):** per-instance `x-forwarded-for` rate limiting, the rare double-send of a milestone reward email, membership disclosure on re-signup, and the dashboard loading all signups per view. The full hardening backlog above remains the source of truth; the README surfaces the user-facing subset.

**Explicitly deferred to wave two (documented homes):** the position-jump animation (its own mini-plan; the number's material — mono, tabular, glow — is built now as its anchor) and the short-form launch video built around it.

**Gate evidence (CC1):** `tsc` clean · `lint` clean · 73 unit + 29 integration tests green · production build with standalone output + `ƒ Middleware` · Docker image builds and serves · boot-failure smoke confirms fail-loud.

**Still private / Aline's to trigger (CC2 go-public gate):** all Plan 5 + Plan 6 commits are unpushed. Pushing `main`, flipping the repo public, adding description/topics, and the marketing launch sequence await Aline's explicit OK.
