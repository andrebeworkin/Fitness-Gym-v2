# Manager -> Programs vertical

Founder-demo implementation of manager programming with real Supabase-backed templates, client assignments, and request review.

---

## What was built

- Real manager programs overview at `/manager/programs` with:
  - template list (including archived marker)
  - client program list (status, trainer, client, location)
  - pending `program_change_requests` review queue
  - summary cards:
    - active programs
    - non-archived template count
    - clients with no active program
    - pending program change requests
    - programs ending soon (next 14 days)
  - filters:
    - location
    - trainer
    - membership type
    - status
    - search by client/program text

- Template management:
  - create template (`/manager/programs/templates/new`)
  - edit template metadata (`/manager/programs/templates/[templateId]`)
  - archive/restore template (safe soft archive by name prefix)
  - add template exercises by week/day with sets/reps/rest/tempo/RPE/superset/notes

- Client program assignment:
  - assign from template or create scratch assignment (`/manager/programs/assign`)
  - set start/end dates, trainer context, status
  - one-active-program-per-client enforced before active assignment

- Client program detail:
  - detail view (`/manager/programs/clients/[programId]`) with:
    - client, assigned-by, trainer, status, date range
    - full week/day/exercise prescription tree
    - recent workout session summary
    - links to member and schedule
  - manager-safe status/date/trainer updates
  - append-only prescribed exercise additions (history-safe)

- Pending change requests:
  - pending queue on overview and program detail
  - approve/reject + manager note
  - explicit status updates only (no silent auto-apply of payload)

---

## Tables used

- Programming templates:
  - `program_templates`
  - `program_template_weeks`
  - `program_template_days`
  - `program_template_day_exercises`
- Assigned client programs:
  - `client_programs`
  - `client_program_weeks`
  - `client_program_days`
  - `client_program_day_exercises`
- Change requests:
  - `program_change_requests`
- Exercise selection:
  - `exercises`
  - `exercise_muscle_targets`
  - (metadata relationship awareness) `exercise_alternatives`, `exercise_progressions`, `exercise_regressions`
- Context joins for manager UX:
  - `profiles`
  - `gym_locations`
  - `client_membership_periods`
  - `membership_types`
  - `workout_sessions`
  - `appointments`

---

## Template vs client program

- **Template** = reusable blueprint for future assignments (`program_template_*`).
- **Client program** = prescribed instance for one client and date range (`client_program_*`).
- Assigning from a template copies structure into a new client program tree.
- Updating a template does not retroactively mutate previously assigned client programs.

---

## Assignment flow

1. Manager chooses client + optional trainer.
2. Manager selects:
   - template assignment (copy template weeks/days/exercises), or
   - scratch assignment (create minimal week/day and optional starter line).
3. App validates one-active-program-per-client when assigning as `active`.
4. Program row and structure rows are inserted under manager context.

---

## History preservation rules

- No destructive overwrite of completed workout logs:
  - workout completion lives in `workout_sessions`/session tables and remains separate from prescriptions.
- Manager edits on client programs in this pass are append-safe:
  - add new prescribed exercise lines by week/day
  - status/date/trainer updates on `client_programs`
  - no delete flow for prescribed lines in this vertical
- One active client program rule is enforced before activating or assigning.

---

## Change request handling

- `program_change_requests` pending rows are visible to managers.
- Manager can approve/reject with optional decision note.
- Action records:
  - `status`
  - `reviewed_by`
  - `reviewed_at`
  - `manager_decision_note`
- This pass does **not** auto-apply request payloads to program structures; application of approved requests remains an explicit/manual follow-up workflow.

---

## Exercise selection UX

- Exercise picker supports name search (`exercise_q`) and shows muscle hints.
- Prescription fields supported per line:
  - sets
  - reps
  - rest seconds
  - tempo
  - target RPE
  - superset group
  - notes
- Alternative/progression/regression metadata is preserved in the exercise library domain and surfaced as part of the selection context.

---

## Out of scope in this pass

- Automatic payload execution for approved `program_change_requests`.
- Visual drag/drop program builder UI.
- Prescription line version history snapshots beyond append-only operational approach.
- Full trainer-side request authoring UI for programs (manager review path is in place).
- Bulk program assignment operations.

