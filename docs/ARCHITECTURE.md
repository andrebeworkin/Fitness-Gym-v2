# Architecture

Plain-English overview of how the Formula 4 Fitness web app is structured after the initial scaffold. For route URLs, see `docs/ROUTE_MAP.md`. For local setup, see `docs/SETUP.md`.

---

## 1. Goals

- **Demo-first** UI that still respects **production-oriented boundaries** from the PRD (prescription vs logs, staff vs client notes, shifts vs appointments).
- **Role-native workspaces** for manager, trainer, and client — each with its own route prefix and navigation.
- **Supabase-ready** folders (`services/supabase`) without committing to schema yet.

---

## 2. Tech stack

| Layer | Choice |
|--------|--------|
| Framework | Next.js 15 App Router |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS + CSS variables (premium fitness palette) |
| UI kit | shadcn/ui-style primitives under `src/components/ui` |
| Auth | Supabase Auth (SSR via `@supabase/ssr`) + `profiles.role` in Postgres |
| Data | Supabase Postgres + RLS (see migrations) |
| Files (planned) | Supabase Storage (photos, invoices) |

---

## 3. Folder layout (high level)

| Path | Purpose |
|------|---------|
| `src/app/(public)` | Marketing / landing — no auth |
| `src/app/(auth)` | Sign-in (`/login`) — Supabase email/password |
| `src/app/(manager)/manager` | Manager workspace |
| `src/app/(trainer)/trainer` | Trainer workspace |
| `src/app/(client)/client` | Client workspace |
| `src/components/layout` | `DashboardShell`, public header, responsive nav |
| `src/components/dashboard` | Reusable dashboard sections (headers, stat cards, placeholders) |
| `src/components/ui` | shadcn-style building blocks |
| `src/lib` | Utilities, env, auth helpers, navigation config |
| `src/types` | Shared TypeScript types (e.g. `AppRole`) |
| `src/hooks` | Client hooks (`useMediaQuery`, future data hooks) |
| `src/services` | External integrations (Supabase clients, session refresh) |
| `src/middleware.ts` | Edge middleware — Supabase session refresh + role/prefix checks |

**Note:** Route groups `(public)`, `(auth)`, `(manager)`, etc. **do not appear in the URL** — they only organize files.

---

## 4. UI shell

- **`DashboardShell`** wraps all role dashboards: sidebar (desktop), sheet menu (mobile), top bar, and content max-width.
- **Navigation** is defined in `src/lib/navigation/dashboard-nav.ts` so URLs and labels stay in sync.
- **Design direction:** calm, premium, fitness-oriented — deep teal primary on warm off-white, generous whitespace, no flashy animation.

---

## 5. Authentication & authorization

1. **Supabase Auth** — sessions in HTTP-only cookies; **`@supabase/ssr`** on server, Route Handler–compatible middleware refresh.
2. **`profiles.role`** — canonical app role (`manager` | `trainer` | `client`); loaded after `getUser()` in server code (`loadAuthContext`, `requireDashboardRole`).
3. **Middleware** — matches URL prefix to role; sends users to `/login`, `/auth/setup-profile`, or `/unauthorized` as needed.
4. **RLS** — Postgres policies enforce data access; Next.js still performs **server-side** role checks before rendering sensitive UI.
5. **Dev bypass** — `NEXT_PUBLIC_DEV_AUTH_BYPASS=true` skips real checks (see `docs/ENVIRONMENT.md`).

Details: **`docs/AUTH_FLOW.md`**.

---

## 6. Environment configuration

- **`src/lib/env.ts`** exposes **public** variables only (`NEXT_PUBLIC_*`).
- **`.env.example`** and **`docs/ENVIRONMENT.md`** list expected keys; never commit `.env.local`.

---

## 7. Domain rules (engineering reminders)

When you implement features, keep these separations (from `docs/PRD.md` and `.cursor/rules/engineering.md`):

1. **Prescribed programming** ≠ **completed workout logs**  
2. **Staff-only notes** ≠ **client-visible notes**  
3. **Staff shifts** ≠ **client appointments**  
4. **Historical records** preserved on membership or plan changes  

---

## 8. Database & Supabase

- **Schema, RLS, Storage policies:** `supabase/migrations/` — see `docs/DB_SCHEMA.md`, `docs/RLS_MATRIX.md`, `docs/STORAGE_MODEL.md`.  
- **Demo seed:** `supabase/seed.sql` (see prerequisites in `docs/SETUP.md`).  
- **TypeScript row types:** `src/types/database.types.ts` (hand-maintained; optional `supabase gen types` later).

## 9. What is intentionally not built yet in the Next.js app

- Full finance-grade billing, reconciliation, and export workflows.  
- Policy automation for entitlement penalties/expiry beyond conservative ledger behavior.  
- In-app messaging/notifications and realtime collaboration (v2+).

---

## Related documents

- `docs/ROUTE_MAP.md`  
- `docs/SETUP.md`  
- `docs/AUTH_FLOW.md`  
- `docs/ENVIRONMENT.md`  
- `docs/DB_SCHEMA.md`  
- `docs/PRD.md`  
- `docs/PERMISSIONS_MATRIX.md`  
