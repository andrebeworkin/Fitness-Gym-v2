# Manager -> Schedule vertical

Founder-demo implementation of manager scheduling with real Supabase reads/writes.

---

## What was built

- Real manager schedule page at `/manager/schedule` with:
  - day/week anchor views
  - location filter
  - trainer/staff filter
  - schedule type filter (`all`, `shifts`, `availability`, `appointments`)
  - summary cards:
    - today's appointments
    - today's shifts
    - open trainer availability count
    - no-shows this week
    - appointments needing attention
- Manager CRUD controls for:
  - staff shifts (`staff_shifts`)
  - trainer availability (`trainer_availability_slots`)
  - appointments (`appointments`)
- Appointment quick-detail pattern:
  - each appointment row expands with details/actions (reschedule, cancel, complete, no-show)
  - quick link to member detail page
- Pending appointment change requests:
  - list pending rows from `appointment_change_requests`
  - approve/reject status actions

---

## Tables used

- `staff_shifts`
- `staff_location_assignments`
- `trainer_availability_slots`
- `appointments`
- `appointment_change_requests`
- `profiles` (staff/trainer/client labels and role-scoped lists)
- `gym_locations`
- `client_membership_periods`, `membership_types` (substitute-trainer rule for Private members)

---

## Schedule states supported

- **Shift state**: date + start/end + staff + location (manager edit/remove).
- **Availability state**:
  - open
  - booked (slot linked to appointment)
  - unavailable (closed)
- **Appointment state**:
  - scheduled
  - completed
  - cancelled
  - no_show

---

## Conflict handling implemented

Server actions enforce these rules before writes:

1. **Overlapping trainer shifts**
   - blocked for same staff/date with overlapping time windows.
2. **Overlapping appointments (trainer/client)**
   - blocked for trainer primary/substitute collisions and same-client collisions.
3. **Appointments outside trainer shift**
   - blocked unless appointment window is covered by a shift for that trainer/location/day.
4. **Appointments outside trainer availability**
   - blocked unless a matching 30-minute availability slot exists.
5. **Availability overlap**
   - blocked when a trainer slot overlaps existing availability.
6. **Booked slot safety**
   - booked availability slots cannot be moved/deleted; must resolve appointment first.
7. **Location mismatch behavior**
   - appointment create/update is blocked if client `primary_location_id` differs from selected appointment location.
8. **Substitute trainer rule**
   - substitute selection is allowed only when client has active `private` membership.

All mutation entry points are manager-verified via `getManagerServerContext()`.

---

## Notes on change requests

- `appointment_change_requests` currently supports manager approve/reject status updates.
- This pass does **not** auto-apply payload transformations into appointment rows.
- The UI shows this clearly as operational follow-up, with backend status tracked.

---

## Out of scope in this pass

- Drag/drop calendar grid.
- Multi-appointment bulk operations.
- Automatic propagation of approved `appointment_change_requests.payload`.
- Timezone-aware per-location rendering beyond browser-local display.
- Trainer/client self-service schedule screens (manager-focused only here).
- Dedicated attendance workflow screens beyond quick actions.

---

## Implementation paths

- Route:
  - `src/app/(manager)/manager/schedule/page.tsx`
- Domain data + parsing:
  - `src/app/(manager)/manager/schedule/_lib/queries.ts`
  - `src/app/(manager)/manager/schedule/_lib/parse-filters.ts`
  - `src/app/(manager)/manager/schedule/_lib/time.ts`
- Mutations:
  - `src/app/(manager)/manager/schedule/actions.ts`
- UI components:
  - `schedule-filters.tsx`
  - `schedule-summary-cards.tsx`
  - `schedule-create-forms.tsx`
  - `schedule-lists.tsx`
  - `loading.tsx`

