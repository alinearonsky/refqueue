# Contributing to Refqueue

Thanks for helping, issues and PRs are welcome.

## Development setup

See the "Development" section of the [README](README.md). You'll need Node 20+ and Docker
(for the local Supabase stack via `npx supabase start`).

## Before opening a PR

- `npm test` (unit) and `npm run test:integration` (needs the local stack) pass.
- `npx tsc --noEmit` and `npm run lint` are clean.
- New behavior has a test. This project follows test-driven development.

## Scope

Refqueue is deliberately small (see the README roadmap for what's planned vs. out of scope).
If you're proposing a feature, open an issue first so we can check it fits before you build it.

## Reporting bugs

Use the bug report template. Include your deploy target (Vercel/Docker), and whether email
is via Resend or SMTP.
