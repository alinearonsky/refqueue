# RefQueue, Launch & Go-to-Market

Goal: 100–500 GitHub stars as a portfolio signal. Stars come from a working demo + being
seen by the right people, not from more code. Work top to bottom.

Positioning (the one line everything hangs on):
> **The "refer friends to skip the line" waitlist behind Superhuman's and Robinhood's launches, the one GetWaitlist and Viral Loops paywall at $35–50/mo, free, open-source, and self-hosted.**

---

## 1. Pre-launch checklist (do before posting anywhere)

- [ ] **Deploy a live demo.** This is the single biggest lever, see §2.
- [ ] **Set `APP_BASE_URL`** on the deployment to the demo's real URL (referral links + OG image use it).
- [ ] **Add a "▶ Live demo" link** to the very top of the README (above the first screenshot).
- [ ] **Upload the social preview to GitHub.** Repo → Settings → General → Social preview → upload
      `public/og.png`. (This is separate from the app's OG tag; GitHub uses its own uploaded image
      for `github.com/...` link cards.)
- [ ] **Verify the unfurl.** Paste the demo URL into [opengraph.xyz](https://www.opengraph.xyz) and
      the [X card validator]; confirm the ticket card shows.
- [ ] **Repo hygiene:** description + topics are set. Pin the repo on your profile. Open 2–3
      "good first issue"s from the roadmap (embeddable widget, distributed rate limiting, MC/CK sync)
      so drive-by contributors have a door in.
- [ ] **Seed the demo** so a new visitor lands at a believable position (e.g. "No. 247"), not
      "No. 1", and the dashboard shows a live curve + top referrers. Run `npm run seed -- --env
      .env --count 250` (writes verified signups straight to Supabase via the service role, so it
      needs no email provider). Preview first with `--dry-run`.

---

## 2. Live demo deploy (the 10-minute version)

The demo is what turns a repo view into a star. A waitlist tool that you can't try is a hard sell.

1. **Supabase:** create a free project. Run the migrations in `supabase/`. Grab `SUPABASE_URL`,
   `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`.
2. **Email:** create a free Resend account, verify a domain (or use their test sender for the demo),
   grab `RESEND_API_KEY` and set `EMAIL_FROM`.
3. **Vercel:** import the repo (or use the one-click Deploy button in the README). Paste the env
   vars. Set `WAITLIST_NAME` to something demo-flavored ("The RefQueue Revue"), `MAKER_EMAIL` /
   `MAKER_PASSWORD` for the dashboard.
4. **After first deploy:** set `APP_BASE_URL` to the Vercel URL and redeploy so referral links and
   the OG image point at the real host.
5. Seed the demo (checklist above) and click through: join → confirm → status → copy link.

Note the double-opt-in: a signup only counts after the referred email confirms, so the demo needs
real (or catch-all) inboxes to show movement. For a pure visual demo, pre-seeding is enough.

---

## 3. Launch posts (copy-paste, then tune)

Post order over ~a week: Show HN first (highest-signal, most fragile), then Reddit the next day,
then the X thread + LinkedIn, then a dev.to writeup last as evergreen. Don't blast everything at once.

### Show HN

Keep it plain. HN distrusts polish and rewards honesty about tradeoffs.

**Title:**
`Show HN: RefQueue – open-source waitlist with referrals, self-hosted`

**Body:**
```
I kept reaching for the "refer a friend to move up the waitlist" mechanic, the one
Superhuman and Robinhood used, and every hosted option (GetWaitlist, Viral Loops)
gates it behind a $35–50/mo plan. So I built the open-source version.

RefQueue is a Next.js 15 + Supabase app you self-host. Someone signs up, gets a queue
position and a referral link; every friend who joins through it AND confirms their email
moves them up. The double opt-in is the whole anti-gaming story, a fake referral costs a
real, verifiable inbox, so the numbers stay honest. There's a maker dashboard (positions,
top referrers, CSV export) and everything's themeable by env var.

Deliberately small for v1. Known tradeoffs are in the README: per-instance rate limiting,
a milestone email that can rarely double-send, the dashboard loading all signups per view.

Live demo: https://refqueue.com
Code: https://github.com/alinearonsky/refqueue

Happy to talk about the referral-position logic or the double-opt-in design.
```

### Product Hunt

- **Name:** RefQueue
- **Tagline:** `The open-source waitlist that moves, refer friends, skip the line`
- **Description:**
  `Free, self-hosted waitlist with built-in referrals, the mechanic behind Superhuman's and Robinhood's launches, without the $35–50/mo SaaS. Queue positions, unique referral links, double-opt-in anti-gaming, a maker dashboard, and full theming. Next.js + Supabase, MIT licensed.`
- **First comment (maker):**
  `Built this because the "refer to skip the line" loop is a proven launch tactic, but the hosted tools paywall it. RefQueue gives you the same loop, self-hosted and free. The design leans into a vintage ticket, your position is a numbered stub that ticks toward the front. Demo + code in the links; feedback welcome.`

### Reddit

Read each sub's self-promo rules first; lead with the build, not the pitch.

**r/SideProject**: title: `I built a free, open-source alternative to GetWaitlist (waitlist + referrals)`
```
The "refer friends to move up the line" waitlist mechanic is everywhere, but the hosted
tools charge $35–50/mo for it. I wanted it for a side project and didn't want a subscription,
so I built RefQueue and open-sourced it.

Self-hosted (Next.js + Supabase). You get queue positions, per-signup referral links, and
referrals only count after the friend confirms their email, which keeps people from gaming
their position with throwaways. Comes with a maker dashboard and it's fully themeable.

Went a bit overboard on the design, the whole thing is styled as a vintage theatre ticket,
your position is a numbered stub.

Demo: https://refqueue.com · Code: https://github.com/alinearonsky/refqueue
```

**r/webdev**: lead technical: Next.js 15 App Router, Supabase RLS, server-rendered pages,
double-opt-in referral counting, per-IP rate limiting + disposable-email blocking. Link demo + repo.

**r/opensource**: lead with MIT + self-host + "no paywalled mechanic", link the repo.

### X / Twitter thread

```
1/ Superhuman and Robinhood grew their waitlists with one trick: refer a friend, skip the line.

The tools that sell you that trick (GetWaitlist, Viral Loops) charge $35–50/mo.

So I built the open-source one. Free, self-hosted. 🎟️ https://refqueue.com

2/ How it works: you join, get a queue position + a referral link. Every friend who joins
through it *and confirms their email* moves you up.

That email confirmation is the anti-gaming rule, a fake referral costs a real inbox.

3/ Comes with a maker dashboard (positions, top referrers, 30-day chart, CSV export) and it's
themeable by env var. Next.js 15 + Supabase, MIT licensed.

4/ I also went deep on the design, the whole surface is a vintage theatre ticket. Your
position prints as a numbered stub that ticks toward the front.

[attach the OG card / status screenshot]

5/ Free forever, self-host it, star it if it's useful:
https://github.com/alinearonsky/refqueue
```

### LinkedIn

```
Waitlists with referrals, "refer a friend, skip the line", are a proven launch tactic.
Superhuman and Robinhood both used it. The catch: the tools that offer it (GetWaitlist,
Viral Loops) paywall it at $35–50/month.

I built the open-source alternative. RefQueue is a free, self-hosted waitlist with built-in
referrals. Confirmed referrals move you up the line; the email double-opt-in keeps the numbers
honest. Maker dashboard, full theming, MIT licensed.

I also spent real time on the design, it's a vintage theatre ticket, and your queue position
is a numbered stub.

Demo + code below. If you're launching something and want the referral loop without the
subscription, it's yours.
```

### dev.to / blog (evergreen, write last)

Working title: **"Building an open-source waitlist with referrals (and the one rule that stops people gaming it)"**
Outline: the mechanic and why it works → the double-opt-in anti-gaming decision → position/
referral data model in Supabase → server-rendered Next.js 15 → the vintage-ticket design and why
committing to a distinctive look matters for a portfolio piece → self-host it. End with the repo.

---

## 4. After launch

- Reply to every comment for the first 24–48h (HN/Reddit ranking rewards engagement).
- If a real feature request recurs, open an issue and label it, visible momentum draws stars.
- Cross-link: the dev.to post links the repo; the repo README links the demo; the demo footer
  already credits RefQueue.
