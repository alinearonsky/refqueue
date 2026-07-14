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
