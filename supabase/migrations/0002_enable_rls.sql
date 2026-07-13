-- Fail-closed insurance (Plan 1 review, hardening item 2): every app access is
-- server-side through service_role, which BYPASSES RLS — so enabling RLS with
-- zero policies changes nothing today, but guarantees that a future accidental
-- grant to anon/authenticated still exposes no rows.
alter table waitlists enable row level security;
alter table signups enable row level security;
