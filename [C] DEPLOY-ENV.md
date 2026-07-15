# RefQueue, Deploy Env + Handoff Checklist

Generated 2026-07-14 during the guided Vercel deploy. The Vercel "New Project" import
screen is already staged (repo `alinearonsky/refqueue`, branch `main`, Next.js preset,
project name `refqueue`, team "Aline's projects"). The Environment Variables panel is
expanded and the Deploy button is right below it. Do NOT click Deploy until the env
vars below are in.

## Why this stopped here

The production startup guard (`src/instrumentation.ts` -> `collectProductionConfigErrors`)
refuses to boot unless ALL of these are set. Every one is a secret or comes from a cloud
Supabase project that does not exist yet (your local `.env` points at `127.0.0.1:54321`,
that is local-only). I cannot create accounts, log in, or type secret keys, so those are yours.

## Required env vars (deploy fails without every one)

| Key | Value | Who |
| --- | --- | --- |
| `SUPABASE_URL` | your cloud Supabase project URL | you (create project) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase -> Settings -> API -> service_role | you (secret) |
| `SUPABASE_ANON_KEY` | Supabase -> Settings -> API -> anon/publishable | you |
| `APP_BASE_URL` | `https://refqueue.vercel.app` (best guess, fix after 1st deploy) | prefilled below |
| `RESEND_API_KEY` | the Resend key you already have | you (secret) |
| `EMAIL_FROM` | `The RefQueue Revue <hello@refqueue.com>` | prefilled below |

## Optional but recommended

| Key | Value |
| --- | --- |
| `WAITLIST_SLUG` | `default` |
| `WAITLIST_NAME` | `The RefQueue Revue` |
| `MAKER_EMAIL` | `aaronskyearthlink@gmail.com` (dashboard login) |
| `MAKER_PASSWORD` | choose a strong password (secret) |
| `POWERED_BY` | `true` |

## Paste-ready block

Vercel's env "Key" field accepts a pasted `.env` (it auto-splits into rows). Paste this,
then fill the four `<...>` values:

```
SUPABASE_URL=<your Supabase project URL>
SUPABASE_SERVICE_ROLE_KEY=<your Supabase service_role key>
SUPABASE_ANON_KEY=<your Supabase anon key>
APP_BASE_URL=https://refqueue.vercel.app
RESEND_API_KEY=<your Resend API key>
EMAIL_FROM=The RefQueue Revue <hello@refqueue.com>
WAITLIST_SLUG=default
WAITLIST_NAME=The RefQueue Revue
MAKER_EMAIL=aaronskyearthlink@gmail.com
MAKER_PASSWORD=<choose a strong password>
POWERED_BY=true
```

## Ordered steps for you

1. Create a free Supabase project (supabase.com). Region near you is fine.
2. Run the two migrations in `~/Personal/refqueue/supabase/migrations/`
   (`0001_core_schema.sql`, `0002_enable_rls.sql`) via the Supabase SQL editor, in order.
3. Supabase -> Settings -> API: copy Project URL, service_role key, anon key.
4. Back on the parked Vercel tab: paste the block above into the env Key field, fill the
   `<...>` values (Supabase x3, Resend x1, MAKER_PASSWORD), then click Deploy.
5. First deploy finishes -> note the real production URL Vercel assigns
   (likely `refqueue.vercel.app`; if different, e.g. `refqueue-xxxx.vercel.app`, that is fine).
6. If the real URL differs from `refqueue.vercel.app`: Project -> Settings -> Environment
   Variables -> edit `APP_BASE_URL` to the real URL -> Redeploy. (Referral links + OG image
   read this, so it must match.)
7. Seed the demo so visitors land at a believable position. Locally, point at the cloud DB:
   put the production `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` in a `.env`, then
   `cd ~/Personal/refqueue && npm run seed -- --env .env --count 250` (preview with `--dry-run`).
8. Tell me the final URL. I will add the "> Live demo" link to the top of the README and push.
9. og.png social preview (manual, GitHub only): repo -> Settings -> General -> Social preview
   -> upload `~/Personal/refqueue/public/og.png`.

## Notes

- Email domain refqueue.com is verifying in Resend (all 4 DNS records saved on Namecheap).
  It flips to Verified on its own; sends will not work until it does, but a pre-seeded demo
  looks complete without live sends.
- `quiet-meadow` on Vercel is an UNRELATED project (flower app), not RefQueue. Ignore it.
