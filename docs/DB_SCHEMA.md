# Database schema (Postgres / Supabase)

Plain-English reference for the Formula 4 Fitness v1 data model. SQL lives in `supabase/migrations/`. Assumptions and open questions are called out explicitly.

---

## Design principles

1. **Historical memberships** — never overwrite a client’s membership in place; close periods and insert new rows. `status = active` plus a partial unique index enforces **one active membership per client**.
2. **Prescription vs completion** — `client_program_*` tables hold **what was planned**; `workout_sessions` / `workout_session_exercises` / `workout_set_logs` hold **what happened** (including substitutions and skips).
3. **Notes separation** — `staff_notes` (internal vs manager-only audience) and `client_session_notes` (client-visible journal) are **different tables**.
4. **Scheduling** — `staff_shifts` (presence) and `appointments` (booked 30-minute sessions) are **independent**; optional link from appointments to `trainer_availability_slots`.
5. **Trainer edits to manager programs** — use `program_change_requests`; approved changes should be applied by **explicit app logic** (new prescription rows or new program version), not silent UPDATEs to historical lines (see risks).
6. **Billing without a processor** — `invoices` + `payment_records` + file metadata; amounts can be updated by app or triggers you add later.

---

## Entity relationship overview

- **People & locations:** `profiles` (1:1 `auth.users`), `gym_locations`, `staff_location_assignments`, `emergency_contacts`, `trainer_client_assignments`, `client_training_preferences`.
- **Memberships:** `membership_types`, `client_membership_periods`, `membership_change_history`, `client_training_credits`, `trainer_session_add_ons`.
- **Billing docs:** `invoices`, `payment_records`, `receipts`, `financial_documents`.
- **Health / progress:** `client_goals`, `client_assessments`, `progress_photos`, `client_incidents`.
- **Scheduling:** `staff_shifts`, `trainer_availability_slots`, `appointments`, `appointment_change_requests`.
- **Exercise library:** `exercises`, `exercise_muscle_targets`, `exercise_alternatives`, `exercise_progressions`, `exercise_regressions`.
- **Programming (templates + prescribed instances):** `program_templates` (+ weeks/days/exercises), `client_programs` (+ weeks/days/exercises), `program_change_requests`, `exercise_substitution_rules`.
- **Execution:** `workout_sessions`, `workout_session_exercises`, `workout_set_logs`, `client_session_notes`.
- **Staff-only notes:** `staff_notes`.
- **Audit:** `audit_logs`.

---

## Table-by-table (keys & purpose)

### `gym_locations`

| Column | Type | Notes |
|--------|------|--------|
| `id` | uuid PK | |
| `name`, `code` | text | `code` unique (e.g. BRG, RVN) |
| Address fields, `timezone` | | |
| `is_active` | boolean | |

**Lifecycle:** Reference data; two locations seeded for v1.

---

### `profiles`

| Column | Type | Notes |
|--------|------|--------|
| `id` | uuid PK, FK → `auth.users.id` | |
| `role` | `app_role` enum | `manager`, `trainer`, `client` |
| `display_name`, `email`, `phone` | text | `email` convenience; canonical email remains in Auth |
| `date_of_birth`, `sex` | | `sex` constrained to a small vocabulary |
| `primary_location_id` | FK → `gym_locations` | Billing / home site context |
| `deleted_at` | timestamptz | Soft delete (optional use) |

**Lifecycle:** Created by trigger `handle_new_user` on signup (default `client`). Managers promote staff by updating `role`.

---

### `staff_location_assignments`

**PK** `id` uuid. **Unique** `(staff_id, work_date)` — **one work location per staff member per calendar day** (conservative reading of the PRD).

| Column | Notes |
|--------|--------|
| `staff_id` | FK `profiles` |
| `location_id` | FK `gym_locations` |
| `work_date` | date |
| `created_by` | FK `profiles` (manager) |

---

### `emergency_contacts`

**PK** `id`. **FK** `client_id` → `profiles`.

---

### `client_training_preferences`

**PK** `client_id` → `profiles`. Manager-tunable flags: `show_plan_history`, `allow_self_log`. **RLS does not hide past programs** when `show_plan_history = false` — enforce in application queries (documented risk).

---

### `trainer_client_assignments`

**PK** `id`. **FKs** `client_id`, `trainer_id`. `is_primary`, `effective_from`, `effective_to` (null = open).

Used for **Private** primary trainer and optional Semi-Private touchpoints. **Coverage** also uses `appointments` + time window in `trainer_has_client_access()`.

---

### `membership_types`

**PK** `id`. **CHECK** `slug` ∈ `open_gym`, `semi_private`, `private` — matches locked product names.

---

### `client_membership_periods`

**PK** `id`. **FKs** `client_id`, `membership_type_id`, optional `created_by`.

| Column | Notes |
|--------|--------|
| `effective_from`, `effective_to` | Open-ended current period: `effective_to` null |
| `status` | `active`, `superseded`, `ended` |
| `billing_month` | Optional anchor for month-to-month reporting |

**Partial unique index:** one row with `status = 'active'` per `client_id`.

**Lifecycle (upgrade/downgrade mid-month):** set previous row `status = superseded` (or `ended`), set `effective_to`, insert new row `active`. **Do not DELETE** historical rows.

---

### `membership_change_history`

**PK** `id`. Append-only audit; optional `related_period_id` → `client_membership_periods`.

---

### `client_training_credits`

Ledger for **complimentary_30** vs **purchased_30** quantities (Semi-Private). **FK** `membership_period_id` optional.

---

### `trainer_session_add_ons`

Purchased add-on session packages; optional **FK** `invoice_id` → `invoices`.

---

### `invoices`

**PK** `id`. **FK** `client_id`, optional `location_id`, `created_by`.

| Column | Notes |
|--------|--------|
| `status` | `draft`, `sent`, `partial`, `paid`, `overdue`, `voided` |
| `amount_cents`, `amount_paid_cents` | Denormalized paid total; maintain in app or add trigger |
| `issued_at`, `due_at`, `voided_at` | | |

**Overdue** can be derived: `status = sent` and `due_at < now()` and `amount_paid_cents < amount_cents` (app or scheduled job).

---

### `payment_records`

**PK** `id`. **FK** `invoice_id`. Manual payment lines (`method`, `reference`, `received_at`).

---

### `receipts` / `financial_documents`

File metadata pointing at **Supabase Storage** (`storage_bucket`, `storage_path`). See `docs/STORAGE_MODEL.md`.

---

### `client_goals`, `client_assessments`

Goals: standard PK/FK `client_id`. Assessments: **immutable rows**; optional `supersedes_assessment_id` for lineage.

---

### `progress_photos`

**FK** `client_id`. `visibility_client` gates client-facing reads together with RLS/Storage policies.

---

### `client_incidents`

**FKs** `client_id`, optional `session_id` → `workout_sessions`, `appointment_id` → `appointments`. **Trainers + managers** read/write per RLS; **clients do not** (conservative v1).

---

### `staff_shifts`

**FKs** `staff_id`, `location_id`. `shift_date` + `start_time` / `end_time` (wall times).

---

### `trainer_availability_slots`

**CHECK** `ends_at = starts_at + 30 minutes`. `is_open`; booking trigger sets `is_open = false` when an `appointments` row references `availability_slot_id`.

---

### `appointments`

**CHECK** 30-minute duration. **FKs** `location_id`, `client_id`, `primary_trainer_id`, optional `substitute_trainer_id`, optional `availability_slot_id`.

| Column | Notes |
|--------|--------|
| `status` | `scheduled`, `completed`, `cancelled`, `no_show` |
| `no_show` | Boolean flag for analytics |
| `attendance_marked_*` | Optional audit |

---

### `appointment_change_requests`

Optional JSON `payload` for reschedule/cancel proposals.

---

### `exercises` + muscle / graph tables

Normalized metadata; **no** media URLs in v1 (library is text/metadata only).

---

### `program_templates` (+ `_weeks`, `_days`, `_day_exercises`)

Reusable blueprints. **FK** `exercise_id` on day lines.

---

### `client_programs`

**PK** `id`. Prescribed program **instance** for one client.

| Column | Notes |
|--------|--------|
| `template_id` | Optional provenance |
| `start_date`, `end_date`, `ended_at`, `status` | `active` / `completed` / `cancelled` |
| `author_kind` | `manager` or `trainer` |
| `manager_author_id`, `primary_trainer_id` | |

**Partial unique:** one `active` program per `client_id`.

**Child tables:** `client_program_weeks` → `client_program_days` → `client_program_day_exercises` (prescribed sets/reps/rest/tempo/RPE/notes/superset).

---

### `program_change_requests`

Trainer proposals against a **manager-authored** program (`author_kind` should be checked in app before insert). `payload` JSON describes the requested change; manager sets `status` `approved`/`rejected`.

**Assumption:** Applying an approval = **application-layer** migration (e.g. new `client_program_day_exercises` row or new program version), not silent in-DB overwrite of old prescription rows.

---

### `exercise_substitution_rules`

Optional reference data for allowed swaps (same muscle). **Session truth** still lives in `workout_session_exercises.substituted` + `performed_exercise_id`.

---

### `workout_sessions`

**FKs** `client_id`, optional `client_program_id`, `client_program_day_id` (which planned day, if any), `location_id`, `trainer_id`, `appointment_id`.

A session **may exist with no program link** (ad-hoc log).

---

### `workout_session_exercises`

Links to optional **prescribed line** `prescribed_line_id` → `client_program_day_exercises`. **Always** stores `performed_exercise_id` (actual movement). Substitution fields document deviation.

---

### `workout_set_logs`

Per-set **performed** reps/weight/RPE/rest/skipped — independent of prescription.

---

### `staff_notes`

`audience`: `staff_internal` (trainers + managers on that client) vs `manager_only` (managers only).

---

### `client_session_notes`

Client-visible journal for a session (pain/discomfort/skipped text). Visible to client + authorized staff.

---

### `audit_logs`

Generic `action`, `entity_table`, `entity_id`, `metadata` jsonb.

---

## Enums (summary)

| Enum | Values |
|------|--------|
| `app_role` | manager, trainer, client |
| `membership_period_status` | active, superseded, ended |
| `invoice_status` | draft, sent, partial, paid, overdue, voided |
| `training_credit_kind` | complimentary_30, purchased_30 |
| `appointment_status` | scheduled, completed, cancelled, no_show |
| `client_program_status` | active, completed, cancelled |
| `program_author_kind` | manager, trainer |
| `program_change_request_status` | pending, approved, rejected, withdrawn |
| `workout_session_status` | in_progress, completed, abandoned |
| `incident_kind` | pain, dizziness, form_issue, missed_appointment, other |
| `staff_note_audience` | staff_internal, manager_only |
| `financial_document_kind` | invoice_pdf, receipt_pdf, other |

---

## Lifecycle summaries

### Membership

1. Insert `client_membership_periods` with `active`.  
2. On change: close prior row (`superseded`/`ended`, `effective_to`), insert new `active`.  
3. Optionally append `membership_change_history`.

### Program (prescribed)

1. Copy or build under `client_programs` + child tables.  
2. End program: `status` ≠ `active`, set `ended_at` / `end_date`.  
3. New active program: ensure previous active ended — unique index enforces single active.

### Appointments

1. Create `trainer_availability_slots` (30 min).  
2. Client or manager creates `appointments`; trigger may close slot.  
3. Complete / no-show / cancel updates `status` and flags.

### Workout session

1. Insert `workout_sessions`.  
2. Add `workout_session_exercises` (prescribed reference optional).  
3. Add `workout_set_logs`.  
4. Add `client_session_notes` / `staff_notes` as needed.

---

## Privacy model (summary)

- **Clients:** own profile, preferences, memberships, programs (see app filter for history), own sessions/logs/client notes, own invoices/receipts in Storage, **no** `staff_notes`, **no** `client_incidents` reads in v1 RLS, **no** billing tables beyond own invoices/payments.
- **Trainers:** training-related client data when `trainer_has_client_access()`; **no** invoice/receipt/financial document rows; **no** `manager_only` notes; **no** arbitrary client list without assignment/appointment/program link.
- **Managers:** broad access per policies; audit logs readable.

Full matrix: `docs/RLS_MATRIX.md`.

---

## Assumptions (locked for this schema)

- One `app_role` per user; compound roles deferred.  
- One primary work location per staff per day (`staff_location_assignments`).  
- `membership_types.slug` fixed to three values (DB-enforced).  
- Session duration **exactly** 30 minutes in availability + appointments (CHECK).  
- `trainer_has_client_access` uses assignment **or** active program as primary trainer **or** appointment window ±120d / +60d (tunable).

---

## Unresolved questions / follow-ups

1. **Plan history flag:** enforce `client_training_preferences.show_plan_history` in RLS (view) vs app-only — currently **app-only**.  
2. **Assessment client visibility:** RLS allows client `SELECT` on `client_assessments` — hide sensitive fields in API if needed.  
3. **Applying approved `program_change_requests`:** no automatic mutation migration in SQL — implement in server actions.  
4. **Invoice `amount_paid_cents`:** manual or add trigger on `payment_records` (previous draft removed for simplicity).  
5. **Semi-Private “one free session” consumption:** tie to `appointments` + decrement `client_training_credits` in app logic.  
6. **Realtime:** enable `supabase_realtime` publication per table when UX needs live dashboards.

---

## Schema risk review (concise)

| Risk | Mitigation |
|------|------------|
| RLS recursion on `profiles` | `SECURITY DEFINER` helpers (`is_manager`, `trainer_has_client_access`, …). |
| Trainer access too wide/narrow | Window-based appointment access; adjust intervals as legal/compliance requires. |
| Silent prescription mutation | Prefer new rows / new program; use change requests + app-side apply. |
| Seed without Auth users | `seed.sql` persona block skips until emails exist — see header comments. |
| Storage path trust | First path segment = `client_id` UUID; enforced in Storage policies. |
