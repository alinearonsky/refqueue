# RefQueue, Distribution / Go-to-Market Tracker

Working doc for getting RefQueue in front of people (goal: 100 to 500 GitHub stars).
Complements `[C] LAUNCH.md`, which holds the launch-day post copy (Show HN, PH, Reddit
subs, X, LinkedIn, dev.to). This file tracks the broader channel plan and live status.

Rules for this project: no em dashes anywhere. Run any public-facing copy through the
humanizer skill before posting.

Last updated: 2026-07-15.

---

## Status: all technical work DONE, now in the posting/distribution phase

Everything shippable is live:
- Deployed at https://refqueue.com (apex + www 307 redirect), Supabase + Resend + Vercel wired.
- Prod seeded with 250 verified signups (live curve + top referrers show). New visitor lands near No. 251.
- README live-demo link + all 3 `[C] LAUNCH.md` post URLs point to refqueue.com.
- GitHub social preview (og.png): user believes it is already uploaded (Settings -> Social preview). Worth a quick confirm.

No code left. The remaining work is all posting and listings, done one channel at a time.

---

## Channel plan (beyond LAUNCH.md), by leverage

### Durable surfaces (highest ROI, keep sending stars for months)
- [ ] **awesome-selfhosted PR** (GitHub). Add RefQueue to the list. RECOMMENDED NEXT. No mood or timing risk, reaches the self-host audience permanently. Needs the list's exact one-line format + correct category. Not started.
- [ ] **awesome-nextjs** PR, **awesome-supabase** PR.
- [ ] **AlternativeTo.net**: list as an alternative to GetWaitlist + Viral Loops. Captures "GetWaitlist alternative" search intent.
- [ ] **Vercel Templates**: submit as a deployable template. If accepted, permanent one-click-deploy funnel.
- [ ] Directories: OpenAlternative.co, SaaSHub, StackShare.

### The "capture displaced users" play (news hook)
Category leader got acquired / free plan removed, so people are searching for alternatives now.
- [ ] Small **RefQueue vs GetWaitlist** comparison page on refqueue.com (SEO, compounding).
- [ ] Reply helpfully in X / Reddit threads where people complain about GetWaitlist pricing.

### Communities not in LAUNCH.md
- [ ] **r/nextjs**, **r/Supabase** (built-on-the-stack credibility).
- [ ] **Supabase Discord** show-and-tell, **Next.js / Reactiflux Discord**.
- [ ] **Indie Hackers** post + milestone.

### Newsletters + GitHub Trending
- [ ] **Console.dev** (dev-tools newsletter, features OSS), **JavaScript Weekly / Node Weekly** (submit).
- [ ] Coordinated first-day star push -> GitHub Trending -> Changelog Nightly picks it up.

### Platform cross-promo (free reach)
- [ ] Tag **Supabase, Vercel, Resend** in the X thread. They retweet community projects. Submit to "Made with Supabase" showcase.

### Lead with the visual
- [ ] 20 to 30 sec screen recording of join -> confirm -> ticket prints -> position ticks up. The vintage-ticket design is the differentiator. Use on X and in the PH gallery.

---

## r/selfhosted: POSTED to the New Project Megathread (15 Jul 2026)

Posted to the current pinned megathread on 15 Jul 2026. Final copy as posted (trimmed the
anti-gaming sentence and the README-limitations line from the draft below; added the
"free alternative to GetWaitlist and Viral Loops" framing into the description; shortened
the AI Involvement disclosure):

```
Project Name: RefQueue

Repo/Website Link: https://github.com/alinearonsky/refqueue (live demo: https://refqueue.com)

Description: A self-hosted waitlist with built-in referrals (free alternative to GetWaitlist
and Viral Loops). Someone signs up, gets a queue position and a referral link; every friend
who joins through that link and confirms their email moves them up. Includes a maker
dashboard (positions, top referrers, 30-day chart, CSV export) and everything is themeable.

Deployment: Next.js 15 + Supabase (Postgres + Auth) + an email provider (Resend or any
SMTP). docker compose up with a provided .env.docker.example, or one-click deploy on Vercel.
Setup docs in the README and supabase/README.md. Config is all environment variables and the
app refuses to boot in production if a required one is missing.

AI Involvement: Yes - Claude wrote most of the code; I drove the product and design
decisions, and the scope. I reviewed, tested, and deployed it.
```

Follow-up: reply to any comments within 24-48h (engagement helps ranking). Next durable
surface = awesome-selfhosted PR.

---

## r/selfhosted background + original draft (kept for reference)

Read the actual subreddit rules (screenshot). Verdict: RefQueue CANNOT be a standalone post.

- **Rule 6 (binding):** projects younger than 3 months (by first public presence) may ONLY be
  posted in the current "New Project Megathread." RefQueue is brand new, so this applies.
  Standalone posts get removed and redirected. This overrides the Rule 5 Wednesday exception.
- Megathread mechanics: a new thread is posted every **Friday**; you can comment any day; use
  whichever "New Project Megathread" is currently pinned.
- **Mood risk:** the sub is actively venting about AI-built projects right now (front-page
  post "This subreddit used to be fun" at 735 upvotes). Even an honest, well-written entry may
  get a cool reception. Transparency protects reputation; it does not guarantee stars. Keep
  expectations low here and spend real energy on Show HN / r/webdev / awesome-selfhosted, where
  AI-origin is not the live controversy.

### Ready-to-post megathread comment (uses the thread's required template)

```
Project Name: RefQueue

Repo/Website Link: https://github.com/alinearonsky/refqueue (live demo: https://refqueue.com)

Description: A self-hosted waitlist with built-in referrals. Someone signs up, gets a
queue position and a referral link; every friend who joins through that link and
confirms their email moves them up. The email confirmation is the anti-gaming rule, a
fake referral costs a real inbox. Includes a maker dashboard (positions, top referrers,
30-day chart, CSV export) and everything is themeable by environment variable. MIT
licensed, no telemetry, no paid tier. Honest limitations are in the README: rate
limiting is per-instance and keyed on x-forwarded-for, a milestone email can rarely
double-send, and the dashboard loads every signup per view (fine into the tens of
thousands).

Deployment: Next.js 15 + Supabase (Postgres + Auth) + an email provider (Resend or any
SMTP). "docker compose up" with a provided .env.docker.example, or one-click deploy on
Vercel. Setup docs in the README and supabase/README.md. Config is all environment
variables and the app refuses to boot in production if a required one is missing.

AI Involvement: Significant. I built this with Claude Code (Anthropic's coding agent).
Claude wrote most of the code; I drove the product and design decisions, the
double-opt-in anti-gaming approach, the "refuse to boot without config" behavior, the
scope, and I reviewed, tested, and deployed it. It's a real working app with tests and
documented limitations, not a code dump, but I want to be upfront that it's
AI-assisted throughout.
```

Decision pending when resuming: post this in the current megathread, or skip r/selfhosted's
thread for now and do the awesome-selfhosted PR first.

---

## Recommended next action on resume

Start the **awesome-selfhosted PR** (durable, no timing/mood risk, same audience). Then
work down the durable-surfaces list. Post the r/selfhosted megathread comment whenever;
it is low-stakes either way.
