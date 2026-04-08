# Setup

How to run the Formula 4 Fitness web app locally after cloning.

---

## Prerequisites

- **Node.js 20+** (LTS recommended)  
- **npm** (ships with Node)

---

## Install

```bash
cd formula-4-fitness
npm install
```

---

## Environment variables

1. Copy the example file:

   ```bash
   cp .env.example .env.local
   ```

2. For **real sign-in**, set Supabase URL + anon key (see **`docs/ENVIRONMENT.md`**). Without them, workspace routes redirect to `/login?error=config`. For **UI-only** work, set `NEXT_PUBLIC_DEV_AUTH_BYPASS=true` (see env doc — not for production).

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_APP_URL` | Canonical site URL (used for links/metadata later). |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (browser + RLS). |
| `NEXT_PUBLIC_DEV_AUTH_BYPASS` | `true` = skip Supabase session + role checks in middleware/layouts (fast UI iteration only). |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only admin tasks (optional, never expose to client). |

---

## Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Sign-in

1. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to `.env.local`.  
2. Go to `/login` and sign in with **email + password** (Supabase Auth).  
3. The app reads **`profiles.role`** and redirects to `/manager/dashboard`, `/trainer/dashboard`, or `/client/dashboard`.

Create demo users and set roles in Supabase: **`docs/DEMO_AUTH_SETUP.md`**. Auth behavior: **`docs/AUTH_FLOW.md`**.

---

## Build & lint

```bash
npm run build
npm run lint
```

---

## Supabase database

Migrations and RLS live under `supabase/migrations/`. Reference docs:

- `docs/DB_SCHEMA.md` — tables, keys, lifecycles  
- `docs/RLS_MATRIX.md` — access by role  
- `docs/STORAGE_MODEL.md` — buckets and paths  

### Local CLI (optional)

1. Install [Supabase CLI](https://supabase.com/docs/guides/cli).  
2. `supabase link` to your project (or use local `supabase start`).  
3. Apply migrations: `supabase db push` (remote) or `supabase db reset` (local — **drops** data, runs migrations + `supabase/seed.sql`).  

### Demo seed prerequisites

`supabase/seed.sql` **reference data** (locations, membership types, exercises, templates) runs on every reset. The **persona block** (memberships, programs, appointments, workouts) expects Auth users to exist first with these emails:

- `manager@demo.formula4.fitness`  
- `trainer1@demo.formula4.fitness`, `trainer2@demo.formula4.fitness`  
- `client.open@demo.formula4.fitness`, `client.semi@demo.formula4.fitness`, `client.private@demo.formula4.fitness`  

Create them in the Supabase Dashboard (Auth) or via API, then re-run the persona section of `seed.sql` in the SQL editor if you already applied a reset before users existed.

---

## Supabase + Next.js (app integration)

1. Create a Supabase project; add URL + anon key to `.env.local`.  
2. Dependencies: `@supabase/supabase-js`, `@supabase/ssr`.  
3. Clients live in `src/services/supabase/` (`server.ts`, `browser-client.ts`, `middleware.ts`).  
4. Auth uses Supabase sessions; **`profiles.role`** is the app’s role source of truth.  
5. Types: `src/types/database.types.ts` (hand-maintained; optional `supabase gen types typescript`).

---

## Troubleshooting

| Issue | What to try |
|--------|-------------|
| “Supabase is not configured” | Set both public Supabase env vars; restart dev server. |
| Wrong workspace / unauthorized | You are signed in as a different role — use **Go to my dashboard** or sign out. |
| Missing profile / invalid role | See `/auth/setup-profile` and `docs/DEMO_AUTH_SETUP.md`. |
| Middleware blocks while styling | Temporarily set `NEXT_PUBLIC_DEV_AUTH_BYPASS=true` in `.env.local` (dev only). |

---

## Related documents

- `docs/ARCHITECTURE.md`  
- `docs/ROUTE_MAP.md`  
- `docs/AUTH_FLOW.md`  
- `docs/DEMO_AUTH_SETUP.md`  
- `docs/ENVIRONMENT.md`  
