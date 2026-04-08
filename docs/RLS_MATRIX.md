# Row Level Security matrix

How Postgres RLS is expected to behave for v1. Policies live in `supabase/migrations/20250407130010_rls.sql`. **Service role** bypasses RLS (server-only, never in the browser).

Helper functions (all `SECURITY DEFINER`, `search_path = public`):

| Function | Purpose |
|----------|---------|
| `is_manager()` | True if `profiles.role = 'manager'` for `auth.uid()`. |
| `is_trainer()` | True if role is `trainer`. |
| `is_client()` | True if role is `client`. |
| `trainer_has_client_access(client_uuid)` | Assignment **or** primary trainer on **active** `client_programs` **or** appointment in ±120d / +60d window. |
| `trainer_owns_appointment(appt_uuid)` | Primary or substitute trainer on that appointment. |

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✓ | Allowed by policy |
| — | No policy → **deny** for that role |
| ✓* | Allowed with conditions (see notes) |

---

## Core

| Table / group | Manager | Trainer | Client |
|---------------|---------|---------|--------|
| `gym_locations` | ✓ read/write | ✓ read | ✓ read |
| `profiles` | ✓ all rows read/write | ✓ self + other staff profiles + **clients where** `trainer_has_client_access` | ✓ self; ✓ read staff directory (`trainer`/`manager` profiles) for booking UX |
| `staff_location_assignments` | ✓ read/write | ✓ read **own** rows | — |
| `emergency_contacts` | ✓ read/write | ✓ read if `trainer_has_client_access` | ✓ read/write **own** |
| `client_training_preferences` | ✓ read/write | ✓ read if access | ✓ read; ✓ **update own** |
| `trainer_client_assignments` | ✓ read/write | ✓ read if self trainer or client is self | ✓ read **own** rows |

---

## Memberships & credits (no invoice amounts for trainers)

| Table | Manager | Trainer | Client |
|-------|---------|---------|--------|
| `membership_types` | ✓ read/write | ✓ read | ✓ read |
| `client_membership_periods` | ✓ read/write | ✓ read if `trainer_has_client_access` | ✓ read **own** |
| `membership_change_history` | ✓ read/write (insert) | ✓ read if access | ✓ read **own** |
| `client_training_credits` | ✓ read/write | ✓ read if access | ✓ read **own** |
| `trainer_session_add_ons` | ✓ read/write | — | ✓ read **own** |

---

## Billing & financial files (metadata)

| Table | Manager | Trainer | Client |
|-------|---------|---------|--------|
| `invoices` | ✓ all | — | ✓ **own** (`client_id = auth.uid()`) |
| `payment_records` | ✓ all | — | ✓ rows for **own** invoices |
| `receipts` | ✓ all | — | ✓ if linked invoice is **own** |
| `financial_documents` | ✓ all | — | ✓ if linked invoice is **own** |

**Internal-only for trainers:** full billing surface (amounts, methods, PDF paths) is **manager + client (own)** only.

---

## Health, assessments, photos, incidents

| Table | Manager | Trainer | Client |
|-------|---------|---------|--------|
| `client_goals` | ✓ read/write | ✓ read/write if access | ✓ read **own** (write via app if you allow self-service goals later) |
| `client_assessments` | ✓ read/write | ✓ read/write if access | ✓ read **own** |
| `progress_photos` | ✓ read/write | ✓ read if `visibility_client` (and access implied by role) | ✓ read/write **own** uploads where `visibility_client` |
| `client_incidents` | ✓ read/write | ✓ read/insert if access; update **manager only** | — |

**Note:** Clients **cannot** read `client_incidents` in v1 (operational safety / internal record). Revisit if product wants transparency.

---

## Scheduling

| Table | Manager | Trainer | Client |
|-------|---------|---------|--------|
| `staff_shifts` | ✓ read/write | ✓ read **own** | — |
| `trainer_availability_slots` | ✓ read/write | ✓ read **own** | ✓ read (bookable grid) |
| `appointments` | ✓ read/write | ✓ read if primary/substitute; ✓ **update own** appointment (reschedule/cancel flows) | ✓ read **own**; ✓ **insert own** (self-booking) |
| `appointment_change_requests` | ✓ all | ✓ if party to appointment | ✓ if party to appointment |

---

## Exercise library

| Table | Manager | Trainer | Client |
|-------|---------|---------|--------|
| `exercises` + muscle + graph tables | ✓ read/write | ✓ read | ✓ read |
| `exercise_substitution_rules` | ✓ read/write | ✓ read | ✓ read |

---

## Programming (prescribed)

| Table | Manager | Trainer | Client |
|-------|---------|---------|--------|
| `program_templates` (+ children) | ✓ read/write | ✓ read | ✓ read |
| `client_programs` (+ weeks/days/day_exercises) | ✓ read/write | ✓ read if `trainer_has_client_access(client_id)` | ✓ read **own** programs |
| `program_change_requests` | ✓ read/update (approve/reject) | ✓ read if access; ✓ **insert** when program is **manager-authored** and trainer has access | — |

---

## Workout execution & notes

| Table | Manager | Trainer | Client |
|-------|---------|---------|--------|
| `workout_sessions` | ✓ read/write | ✓ read/write if access or `trainer_id` | ✓ read/write **own** |
| `workout_session_exercises` | ✓ | ✓ (via parent session rule) | ✓ own sessions |
| `workout_set_logs` | ✓ | ✓ (via parent) | ✓ own sessions |
| `staff_notes` | ✓ read/write all | ✓ read/write **`staff_internal`** only, with access; **no** `manager_only` | — |
| `client_session_notes` | ✓ read/write | ✓ read/write if access | ✓ read/write **own** |

---

## Audit

| Table | Manager | Trainer | Client |
|-------|---------|---------|--------|
| `audit_logs` | ✓ read | — | ✓ **insert** when `actor_id = auth.uid()` OR manager (tweak in app to always set actor) |

**Caveat:** Insert policy is permissive for demos — tighten to `actor_id = auth.uid()` only in production hardening.

---

## Policy caveats

1. **Trainer directory for clients:** `profiles_select_staff_directory_for_clients` exposes **all** trainers/managers to **every** client (sufficient for small gym MVP). Narrow to “trainers at my location” later if needed.  
2. **`trainer_has_client_access`:** time windows are arbitrary but bounded — tune for compliance.  
3. **Plan visibility:** RLS does **not** hide historical `client_programs` from the client; respect `client_training_preferences.show_plan_history` in queries.  
4. **Storage** policies are separate — see `docs/STORAGE_MODEL.md`.  
5. **Defense in depth:** Next.js server actions should still verify role before mutations.
