# Environment variables

Reference for **local** and **production** configuration.

---

## Required for real authentication

| Variable | Where | Purpose |
|----------|--------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + server + Edge | Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + server + Edge | Public anon key; RLS enforced on data access. |

Without both, workspace routes redirect to **`/login?error=config`** and sign-in shows a configuration error.

**Never** put the **service role** key in `NEXT_PUBLIC_*` or ship it to the browser.

---

## App URL

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_APP_URL` | Canonical site URL (e.g. `https://app.example.com`). Defaults to `http://localhost:3000` if unset. Use for absolute links, callbacks, or metadata in production. |

---

## Optional server-only

| Variable | Purpose |
|----------|---------|
| `SUPABASE_SERVICE_ROLE_KEY` | Bypasses RLS — **server-only** (scripts, admin APIs, never in `middleware` or client). Optional for sign-in; **required** for in-app **New member** (Auth `createUser`) on `/manager/members/new`. |

---

## Dev-only (dangerous)

| Variable | Values | Effect |
|----------|--------|--------|
| `NEXT_PUBLIC_DEV_AUTH_BYPASS` | `true` / omitted | When **`true`**, middleware **skips** Supabase session and role checks. Dashboard layouts use a **synthetic** role for the current route group so you can style pages **without** logging in. |

**Warnings:**

- **Do not set in production.**  
- Anyone could open `/manager/...` URLs; there is no real security while bypass is on.  
- Sign-in still talks to Supabase if env vars are set; bypass only affects **middleware + layout guards**.

---

## Local setup checklist

1. Copy `.env.example` → `.env.local`.  
2. Paste **Project URL** and **anon key** from Supabase → Project Settings → API.  
3. Restart `npm run dev` after changes.  

---

## Production checklist

1. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in the hosting provider (Vercel, etc.).  
2. Add your **production site URL** to Supabase → Authentication → URL configuration (redirect / allow lists as required).  
3. Ensure **`NEXT_PUBLIC_DEV_AUTH_BYPASS` is not set** or is `false`.  
4. Use **HTTPS** so session cookies stay secure.

---

## Related docs

- `docs/AUTH_FLOW.md` — how auth and roles behave in the app.  
- `docs/DEMO_AUTH_SETUP.md` — creating demo users and roles.  
- `docs/SETUP.md` — install and run the Next.js app.
