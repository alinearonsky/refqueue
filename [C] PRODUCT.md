# [C] PRODUCT — Open-Source Waitlist with Referral

*Spec. Created 11 Jul 2026. Name: **RefQueue** (confirmed clean 11 Jul 2026 — GitHub org, npm bare name, and refqueue.com all available, no in-category collision). Supersedes the photo-culler direction in `~/Cowork Homebase/02 Projects/Side Project/OSS Alternative Project/[C] Research — Open-Source Alternative Route.md`.*

## Goal

One goal, and it is not users or revenue: **GitHub stars, as a portfolio signal.** Target **100–500 stars** — the threshold the research established as a genuine signal (a "couple stars" is trivial and means nothing; 10k+ needs a content machine we're not building). Everything below is optimized for that number and nothing else.

## Why this idea survived the grilling

Every other candidate failed a filter. The photo-culler failed because photo-culling is a *consumer* pain with a dead *developer* market — the audience that gives stars doesn't pay for cleaner apps, so there's no resentment to convert into an upvote. Aline's own SaaS invoices (Framer, Squarespace, Canva, Dropbox) failed because their OSS categories are already owned by 30k-star incumbents (Penpot, Nextcloud). Cookie-consent failed because `orestbida/cookieconsent` is a healthy 5,578-star incumbent.

Waitlist-with-referral passes all of them:

- **Empty OSS niche (verified 11 Jul 2026).** The popular waitlist repos are plain email forms with no referral mechanic (`raqibnur/quick-waitlist` ~275★ stale, `soufianeelc/nextjs-waitlist-page` ~122★ stale). Every repo that actually does position-jumping referral is a sub-10-star hobby project. No maintained incumbent anywhere near 1k stars.
- **Validated real demand (verified 11 Jul 2026).** Viral Loops: ~CA$1.3M FY2025 revenue, G2 4.7 across 108 reviews, acquired Feb 2026 for ~$2.1M. Waitlister claims "10,000+ founders." Real paying users — but a small, mature market, which is exactly why no funded OSS competitor bothered. That profile is a 100–500 star niche, not a 10k one. It matches the target instead of mocking it.
- **Crisp, current villain.** GetWaitlist removed its free tier mid-2025; Viral Loops was just acquired and will be squeezed. The referral mechanic — the single most valuable feature — is paywalled behind $50/mo (GetWaitlist Advanced) / $35–279/mo (Viral Loops). Positioning: *"They took the free plan away and the leader just got acquired. Here's the free, open-source, self-hosted one that can't be paywalled or taken from you."*
- **It self-distributes.** Unlike a testimonial wall (which sits silently on someone's site), every waitlist page and referral link is a public URL that carries a removable "powered by RefQueue" credit. As makers use it and signups share links, the tool advertises itself to the exact indie-hacker crowd that stars GitHub repos. For someone with no Hacker News following, a product that seeds its own discovery is worth more than a cleverer product that doesn't.
- **Authentic origin story.** Aline is a build-in-public marketer launching side projects — she *is* the target user. "I went to launch my own thing, got quoted $50/mo just to let people refer friends, so I built the open-source one" is a true story she can tell on alinedecodes without a shred of fraud.

**Honest caveats, on the record:** the ceiling is genuinely low (this will never be a 10k breakout), and the tactic is plateauing, not surging. Both are fine — "steady and useful" is the explicit goal.

## What it does

A self-hosted app that turns "sign up to be notified" into "sign up, then recruit friends to move up the line" — the mechanic behind Superhuman's and Robinhood's launches. Two sides:

**The maker** (installs and deploys the app) gets: a themeable hosted waitlist landing page; a dashboard (every signup, their position, referral counts, top referrers, signups-over-time, CSV export); configurable reward milestones ("refer 3 → early access," "refer 10 → founding-member badge"); transactional emails (double-opt-in confirmation + milestone/"you moved up" notifications).

**The signup** (end visitor) experiences: enter email → see a position ("You're #247"); get a unique referral link + share buttons; every confirmed friend who joins via that link bumps them up ("You're now #180 — 3 joined, 2 more to unlock early access"). The visible progress is the dopamine that drives sharing.

The flywheel: join → want to move up → share → friends join → they want to move up → they share.

## MVP scope

The "steady and useful" core, sized to stay finishable before HSLU starts (~8 weeks out) and maintainable after:

- Email signup → assigned queue position
- Unique referral link per signup
- Referral recalculates position (only counts confirmed referrals — see Anti-gaming)
- Signup-facing status page: position, referral link, share buttons, progress to next reward tier
- Configurable reward milestones (refer N → unlock a labeled reward, e.g. early access / founding member) — position itself is driven by referral count, so referring already moves you up; milestones are labeled unlocks on top, not separate spot arithmetic
- Maker dashboard: signups list, positions, referral counts, top referrers, signups-over-time chart, CSV export
- Double-opt-in email verification + milestone emails
- Themeable landing page: logo, color, headline/subhead/CTA copy
- Removable "powered by RefQueue" credit — **on by default** (the self-distribution mechanic)
- Self-host: one-click Vercel deploy **and** a Docker option (r/selfhosted won't star without Docker), `.env`-driven config

**Product shape:** hosted **page** for the MVP. (Decided 11 Jul 2026.)

## Explicitly out of v1 (scope protection = maintenance runway)

Each is a real, anticipated feature request we answer *after* launch — that backlog is what keeps the repo alive and growing instead of sprawling or rotting:

- **Embeddable widget** for third-party sites — top of the v1.1 backlog (indie hackers and r/selfhosted will ask first)
- Email-provider sync (Mailchimp/ConvertKit) — CSV export covers the launch need
- A/B testing, advanced analytics
- Multiple waitlists per instance
- Team accounts / multi-user dashboard
- Custom email-template editor (ship good defaults instead)
- Fraud detection beyond the MVP baseline

## Architecture

- **Stack:** Next.js (App Router) + Supabase (Postgres, Auth, Storage). Matches Aline's skillset; one-click Vercel deploy; generous free tiers.
- **Deploy targets:** Vercel one-click template + a Docker Compose setup for self-hosters.
- **Email:** Resend as the default (best DX, generous free tier) with plain SMTP as a fallback so self-hosters can bring any provider.
- **Config:** environment variables only for v1 (no settings UI) — smaller surface, easier to keep stable.

### Data model (core tables)

- `waitlists` — id, name, slug, theme config (logo, color, copy), reward-tier config, powered_by_enabled
- `signups` — id, waitlist_id, email, verified (bool), referral_code (unique), referred_by (signup_id, nullable), created_at, verified_at
- `position` — derived, not stored: computed from verified signups ordered by (confirmed_referral_count desc, verified_at asc). Referring more people moves you ahead of everyone with fewer confirmed referrals — that ordering *is* the skip-the-line mechanic; there is no separate additive spot-jump. Recompute on read or on referral-confirm event.

## Anti-gaming design

Referral leaderboards get abused with fake signups; if the number is fake, the tool is worthless and gets mocked, not starred. The spine:

- **A referral counts only after the referred email completes double opt-in.** This is the single most important rule — it makes fake referrals cost a real, verifiable inbox. Double-opt-in doubles as email verification, so it earns its keep twice.
- Per-IP rate limiting on signup + verification endpoints
- Disposable/temporary-email domain blocking (maintained blocklist)

## Self-distribution mechanic

The "powered by RefQueue" credit ships **on by default** and links to the GitHub repo. Makers can turn it off (goodwill + it's OSS, forcing it would be user-hostile), but default-on means most public waitlist pages carry it. This is the passive half of distribution. The active half is the launch sequence.

## Launch sequence (committed)

Not the generic playbook — the channels Aline actually has (no Hacker News standing, so "Show HN" is a *maybe*, not the centerpiece):

1. **alinedecodes short-form video** — demo the viral-loop mechanic (satisfying position-jump animation); the "$50/mo for a referral feature → I built the free one" story
2. **Directory listings** (pure signal, need no audience): openalternative.co, awesome-selfhosted, awesome-foss-alternatives
3. **Subreddits:** r/SaaS, r/indiehackers, r/selfhosted, r/opensource
4. **IndieHackers** post (build-in-public origin story)
5. **Personal + community networks** for the first credibility-cluster of stars: women-in-tech communities (Girls Who Code and similar — a community Aline wants to build into anyway), HSLU data-science cohort (from ~Sep 2026)
6. **Show HN** — optional, low expectations, not load-bearing

## Maintenance posture (committed)

The star audience rewards *maintained* repos; every corpse in the niche is stuck at ~50 stars *because* it died. Countermeasures baked into the design: deliberately small surface area; env-only config (no settings UI to break); a pinned, published v1.1+ backlog so feature requests have a home; `CONTRIBUTING.md` + issue templates from day one. "Steady and useful" means responsive to issues, disciplined against feature sprawl. A concrete maintenance cadence gets planned alongside the build.

## Legal line

- ✅ Nominative use in the README ("open-source alternative to GetWaitlist / Viral Loops") is fine.
- ❌ No competitor trademark in the product name; no copied code, copy, or design. Own implementation only.

## Open items (resolved before repo creation, not blocking the plan)

1. **Name.** ✅ Resolved 11 Jul 2026: **RefQueue**. Verified clean — GitHub org `refqueue` claimable, bare `refqueue` npm package free, refqueue.com available, no in-category product or trademark collision (the descriptive compound reads as "referral queue," which also serves the "legible in 5 seconds" star rule). Chosen over the other clean finalists Antelist and QueueBloom for instant legibility.
2. **Project folder.** ✅ Renamed this Code Documentation folder to `refqueue`. Repo itself lives at `~/Personal/refqueue` per workspace convention.
