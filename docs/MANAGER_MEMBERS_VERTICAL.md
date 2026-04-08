# Manager → Members vertical

Plain-English summary of the first **data-backed** manager feature: roster, detail, onboarding, membership history, trainer assignment, billing summary, and internal notes.

---

## What was built

| Area | Description |
|------|-------------|
| **List** (`/manager/members`) | Server-loaded client roster with search (name/email), filters (membership type, location, payment flag), sort (newest, name, overdue-first), summary cards, and a wide table. |
| **Detail** (`/manager/members/[memberId]`) | Read-only sections + **membership change**, **trainer reassignment**, and **add staff note** forms (server actions). |
| **New member** (`/manager/members/new`) | Creates **Supabase Auth user** (when service role is configured), relies on `handle_new_user` for `profiles`, then manager session updates profile + RPC membership + optional trainer/goal/note. |
| **Edit** (`/manager/members/[memberId]/edit`) | Profile + **client_training_preferences** (checkboxes), plus same membership/trainer controls as detail. |

All reads use the **manager’s** Supabase session (RLS). Mutations re-check manager context in server actions (`getManagerServerContext`).

---

## Tables touched (reads)

- `profiles` (clients only)
- `gym_locations`
- `membership_types`
- `client_membership_periods`
- `trainer_client_assignments`
- `client_programs` (+ `client_program_weeks` count on detail)
- `invoices`, `payment_records`, `receipts`, `financial_documents`
- `emergency_contacts`, `client_training_preferences`
- `client_goals`, `client_assessments`, `progress_photos` (metadata only)
- `appointments`, `workout_sessions`
- `staff_notes`
- `membership_change_history` (display on detail via bundle; list uses periods)

---

## Tables touched (writes)

| Action | Tables |
|--------|--------|
| **Create member** | Auth (admin API) → `profiles` (update), `client_membership_periods` + `membership_change_history` via RPC, optional `trainer_client_assignments`, `client_goals`, `staff_notes` |
| **Update profile** | `profiles`, `client_training_preferences` (upsert) |
| **Change membership** | RPC `manager_supersede_membership_period` → updates prior active row, inserts new active row, inserts `membership_change_history` |
| **Trainer assign** | `trainer_client_assignments` (close open rows, optionally insert new primary) |
| **Add note** | `staff_notes` |

---

## New database function

**`public.manager_supersede_membership_period(p_client_id, p_new_membership_type_id, p_notes)`**

- `SECURITY DEFINER` with `is_manager()` guard.
- In a single transaction: closes current **active** `client_membership_periods` row (if any), inserts a new **active** row, appends **`membership_change_history`**.
- If there is **no** active period, inserts the first active row + history (onboarding / repair).

Migration: `supabase/migrations/20250408120000_manager_membership_supersede.sql`

Apply with `supabase db push` (or your usual migration path) before using **Change membership** in the app.

---

## What is real vs placeholder

| Real | Placeholder / out of scope |
|------|----------------------------|
| List, filters, stats **for the current filtered cohort** | Proration, automated billing on membership change |
| Detail sections backed by queries | **Program builder** link (disabled button) |
| Payment **summary** + invoice rows + doc/receipt **counts** | Uploading PDFs, Storage URLs, payment capture |
| Progress photos: **count + latest date** only | Image preview / signed URLs |
| Emergency contacts **read** | Create/edit emergency contacts in UI |
| Goals **read** | Create/edit goals in UI |
| Assessments **read** | Create/edit assessments in UI |
| Membership change via RPC | Credits ledger (`client_training_credits`) automation |

---

## Auth user creation (new member)

- **With** `SUPABASE_SERVICE_ROLE_KEY` in **server** env: the app calls `auth.admin.createUser`, then uses the manager’s normal client for RLS-protected inserts.
- **Without** service role: the new-member form shows instructions; create users in the Supabase Dashboard (Auth) — `handle_new_user` still creates `profiles` — then set membership via SQL or future “link existing user” flow.

**Never** expose the service role to the browser or middleware.

---

## Assumptions & limitations

1. **Overdue** is derived in the app from `invoices` (status `overdue`, or `due_at` passed with balance remaining). No cron job updates `invoice.status` in this pass.
2. **`amount_paid_cents`** is not auto-updated by triggers in the bundled schema; keep it consistent when recording payments (future vertical).
3. **Trainer “needed”** on the list: Semi-Private or Private with **no** open `trainer_client_assignments` row.
4. Summary cards on the list reflect the **same filtered set** as the table (search, location, membership, payment filters).

---

## Related docs

- `docs/DB_SCHEMA.md` — membership lifecycle  
- `docs/RLS_MATRIX.md` — manager vs trainer vs client access  
- `docs/AUTH_FLOW.md` — how managers reach these routes  
- `docs/ENVIRONMENT.md` — env vars including service role  
