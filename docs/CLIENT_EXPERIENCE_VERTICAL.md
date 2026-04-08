# Client -> Plan + Workout Logging + Booking

Founder-demo client experience built on real Supabase data with client-safe permission boundaries.

---

## What was built

- Client dashboard (`/client/dashboard`) with:
  - next appointment summary
  - assigned trainer context
  - active membership type
  - active program summary + quick link to next workout day
  - recent sessions summary
  - progress cards (sessions/completed in last 30 days)
  - upcoming action callouts (no active plan, no trainer, no upcoming appointments)

- My plan (`/client/plan`) with:
  - active program structure (weeks/days/exercises)
  - selected day detail for prescribed sets/reps/rest/tempo/RPE/notes
  - exercise metadata hints (machine/grip/bar type)
  - recent logged marker at day level
  - plan history visibility controlled by `client_training_preferences.show_plan_history`

- Workout logging (`/client/log`) with:
  - start self-led session
  - optional linking to prescribed day
  - in-progress session continuation
  - recent session list

- Session detail/runner (`/client/sessions/[sessionId]`) with:
  - session metadata/status
  - prescribed vs actual display
  - add exercise lines
  - set-by-set logging (reps/weight/RPE/rest/skipped)
  - session notes (client-visible)
  - completion/abandon controls
  - incident visibility (client-facing records only)

- Appointments and booking (`/client/appointments`) with:
  - upcoming + past appointments
  - cancel / cancellation-request behavior
  - reschedule request flow
  - available slot browsing and booking from `trainer_availability_slots`
  - conservative booking eligibility checks by membership context

- Profile (`/client/profile`) with:
  - personal basics
  - membership/trainer context
  - quick training stats summary

---

## Tables used

- Identity and membership context:
  - `profiles`
  - `client_membership_periods`
  - `membership_types`
  - `trainer_client_assignments`
  - `client_training_preferences`
- Programs and prescription:
  - `client_programs`
  - `client_program_weeks`
  - `client_program_days`
  - `client_program_day_exercises`
  - `exercises`
- Workout execution:
  - `workout_sessions`
  - `workout_session_exercises`
  - `workout_set_logs`
  - `client_session_notes`
  - `client_incidents`
- Booking and appointments:
  - `appointments`
  - `trainer_availability_slots`
  - `appointment_change_requests`
  - `gym_locations`
- Progress context:
  - `client_goals`
  - `client_assessments`
  - `progress_photos`
- Semi-Private entitlement checks (conservative):
  - `client_training_credits`
  - `trainer_session_add_ons`

---

## How client permissions are respected

- All client reads/mutations go through client-authenticated server context (`getClientServerContext`) and RLS.
- Session mutations always scope to `client_id = auth user`.
- No trainer internal notes are queried or rendered (`staff_notes` excluded in client UI).
- No manager-only billing/admin surfaces are included in this vertical.
- No cross-client data access is queried from client pages/actions.

---

## Self-logging behavior

- Client can start a self-led `workout_sessions` row.
- Session may link to:
  - active program
  - selected prescribed day
  - appointment context (if relevant)
- Client logs performed exercise lines (`workout_session_exercises`) and per-set actuals (`workout_set_logs`).
- Client can mark skipped sets and add client-visible notes.
- Session can be marked in progress, completed, or abandoned.

---

## Booking behavior

- Booking reads open `trainer_availability_slots` in 30-minute increments and creates `appointments`.
- Conservative eligibility:
  - `private`: booking allowed
  - `open_gym`: booking blocked
  - `semi_private`: allowed only when credits/add-ons rows exist
- Cancel behavior:
  - >= 12h before start: direct cancel
  - < 12h before start: cancellation request via `appointment_change_requests`
- Reschedule currently uses request workflow via `appointment_change_requests` (no direct client-side reschedule mutation in this pass).

---

## Prescribed vs actual handling

- Prescribed plan remains in `client_program_*` tables.
- Actual execution remains in `workout_sessions` / `workout_session_exercises` / `workout_set_logs`.
- Session exercise substitutions are execution metadata and do not mutate canonical prescription.
- Historical session truth remains valid even if execution deviates from the plan.

---

## Out of scope in this pass

- Credit/add-on consumption decrement ledger during booking.
- Automatic manager-side application of appointment reschedule payloads.
- Rich client analytics/adherence scoring beyond simple counts.
- Media upload/view flows for progress photos (metadata view only).

