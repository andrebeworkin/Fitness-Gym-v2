# Deployment Checklist

Use this checklist for hosted preview deployment (staging/demo).

## 1) Environment variables

Set these in your hosting environment:

- `NEXT_PUBLIC_APP_URL` (your hosted URL)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`)
- `SUPABASE_SERVICE_ROLE_KEY` (server-side only; required for manager in-app member signup)
- `NEXT_PUBLIC_DEV_AUTH_BYPASS=false` (must be false in deployed preview)

## 2) Supabase project configuration

- Auth -> URL Configuration:
  - Site URL = hosted app URL
  - Add redirect URLs for:
    - hosted `/login`
    - hosted `/auth/callback` (if used later)
    - local URLs (optional for local dev)
- Ensure required auth users exist for demos (see `docs/DEMO_DATA_SCENARIOS.md`).

## 3) Database readiness

- Apply migrations: `supabase db push`
- Confirm entitlement migration is applied:
  - `20260408130000_entitlement_ledger.sql`
- Seed demo data:
  - run `supabase/seed.sql` (or `supabase db reset` for local reset)

## 4) Build and runtime checks

- `npm run lint`
- `npm run build`
- Smoke test:
  - `/` loads
  - `/login` loads
  - manager/trainer/client role redirects behave correctly
  - `/manager/reports` and `/manager/dashboard` load without runtime errors

## 5) Graceful failure behavior to confirm

- If Supabase env vars are missing:
  - protected routes redirect to login with config message
  - login displays clear deployment-safe setup error copy
- Wrong-role access goes to `/unauthorized`
- Missing profile role goes to `/auth/setup-profile`

## 6) Demo runbook

Before live demo:

1. Re-run seed and verify key personas.
2. Validate walkthrough sequence from `docs/DEMO_WALKTHROUGH.md`.
3. Keep `docs/KNOWN_LIMITATIONS.md` open for honest scope framing.
4. Keep `docs/NEXT_FEATURES.md` open for post-demo roadmap discussion.
