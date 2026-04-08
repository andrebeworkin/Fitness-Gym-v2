# Trainer -> Today + Live Session Logging

Founder-demo trainer execution workflow with real Supabase-backed reads/writes for daily operations.

---

## What was built

- Real trainer today dashboard at `/trainer/dashboard`:
  - today's appointments
  - next upcoming session
  - in-progress sessions
  - assigned clients quick list
  - clients scheduled today quick list
  - summary cards:
    - sessions today
    - completed today
    - upcoming
    - clients needing follow-up notes
    - pending trainer-authored program change requests

- Real trainer clients roster at `/trainer/clients`:
  - search by name/email
  - relationship filter (`assigned`, `scheduled_only`, `all`)
  - training-safe context:
    - membership slug
    - active program status
    - latest session date
    - recent incident count

- Trainer client detail at `/trainer/clients/[clientId]`:
  - profile basics relevant to training
  - trainer relationship status
  - goals summary
  - latest assessment summary
  - active program summary
  - recent sessions
  - upcoming appointments
  - internal training notes + incidents
  - quick start session action
  - trainer change-request submission on manager-authored active programs

- Session start + runner:
  - start from appointment: `/trainer/sessions/start/[appointmentId]`
  - start manually from client detail (trainer-supervised, no required appointment)
  - live runner at `/trainer/sessions/[sessionId]` with:
    - session metadata/status
    - prescribed targets section
    - add logged exercise lines
    - set-by-set actual logging
    - substitution flags/notes
    - client-visible session notes
    - internal staff notes
    - incident flags
    - trainer program change request submission

- Trainer schedule view at `/trainer/schedule`:
  - today list
  - next 7 days list
  - quick links into session start

---

## Tables used

- Scheduling and relationships:
  - `appointments`
  - `trainer_client_assignments`
  - `profiles`
  - `gym_locations`
- Prescribed programming (read only for trainer execution in this vertical):
  - `client_programs`
  - `client_program_weeks`
  - `client_program_days`
  - `client_program_day_exercises`
  - `program_change_requests` (trainer insert/read, manager review remains manager-side)
- Execution logging:
  - `workout_sessions`
  - `workout_session_exercises`
  - `workout_set_logs`
- Notes and incidents:
  - `client_session_notes` (client-visible)
  - `staff_notes` (`staff_internal` only in trainer flow)
  - `client_incidents`
- Supporting context:
  - `client_goals`
  - `client_assessments`
  - `client_membership_periods`
  - `membership_types`
  - `exercises`

---

## Trainer permission boundaries

- All reads/mutations run under trainer-authenticated server context (`getTrainerServerContext`) plus RLS.
- Trainer pages only query training-safe data; no invoice/payment/receipt/financial document surfaces are queried or rendered.
- Internal notes are written with `audience = staff_internal`; manager-only note audience is not used in trainer actions.
- Mutation actions re-check trainer ownership/access before writes (session ownership, appointment ownership, trainer role).

---

## Prescribed vs actual handling

- Prescribed plan is read from `client_program_*` tables and shown as targets.
- Actual execution is written to:
  - `workout_session_exercises` (performed exercise lines)
  - `workout_set_logs` (set-by-set actual reps/weight/RPE/rest/skips)
- `prescribed_line_id` is preserved when applicable, but actual values are always stored separately.
- Session remains valid even if it deviates from prescription.

---

## Substitution handling

- Trainer can mark logged exercise lines as substituted (`substituted = true`).
- Substitution rationale is recorded (`substitution_note`, `similar_muscle_group_asserted`).
- Canonical manager-authored prescription rows are not mutated by substitutions.

---

## Change request handling

- Trainer can submit `program_change_requests` against manager-authored active programs with:
  - reason/summary
  - suggested change text
  - optional affected day/exercise context
  - optional JSON payload extension
- Requests are stored as `pending`; this vertical does not auto-apply payloads to prescription rows.
- Manager-side approve/reject workflow remains the control point.

---

## Session creation assumptions

- Appointment start:
  - links session to appointment/client/trainer/location
  - links active program if present
  - attempts to link prescribed day by weekday (`client_program_days.day_number`, Sunday => 7)
- Manual start from client detail:
  - creates trainer-supervised session even without appointment
  - links nearest same-day appointment if found
  - links active program/day using the same weekday rule when available

---

## Out of scope in this pass

- Realtime collaborative updates across devices.
- Drag/drop runner or timers.
- Automatic payload application for approved `program_change_requests`.
- Rich media/photo capture in session workflow.
- Advanced analytics dashboards for trainer utilization.

