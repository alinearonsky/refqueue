create table waitlists (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  slug          text not null unique,
  theme         jsonb not null default '{}'::jsonb,       -- logo, color, copy (Plan 5)
  reward_tiers  jsonb not null default '[]'::jsonb,       -- [{referrals:int, label:text}]
  powered_by    boolean not null default true,
  created_at    timestamptz not null default now()
);

create table signups (
  id            uuid primary key default gen_random_uuid(),
  waitlist_id   uuid not null references waitlists(id) on delete cascade,
  email         text not null,
  verified      boolean not null default false,
  verify_token  text,                                     -- kept after verification (idempotent verify; prefetch-safe)
  referral_code text not null,
  referred_by   uuid references signups(id) on delete set null,
  created_at    timestamptz not null default now(),
  verified_at   timestamptz,
  unique (waitlist_id, email),
  unique (waitlist_id, referral_code)
);

create index signups_waitlist_verified_idx on signups (waitlist_id, verified);
create index signups_referred_by_idx on signups (referred_by);
create index signups_verify_token_idx on signups (verify_token);

-- This CLI's local stack no longer auto-exposes new tables to the Data API roles
-- (see `auto_expose_new_tables` in supabase/config.toml, a deprecated legacy flag).
-- All access in this app goes through the service role (server-side only), so grant
-- it explicitly rather than relying on that flag. anon/authenticated stay revoked.
grant select, insert, update, delete on waitlists, signups to service_role;
