# QA Checklist (Pre-Demo)

Use this as the role-by-role regression checklist before each stakeholder demo.

## Global checks

- [ ] Landing page loads and calls to action are clear (`/`).
- [ ] Login works with valid user and shows clear errors on invalid credentials (`/login`).
- [ ] Missing env config redirects to login with safe config messaging.
- [ ] Wrong-role access redirects to `/unauthorized` with clear next action.
- [ ] Missing/incomplete profile redirects to `/auth/setup-profile`.

## Manager checks

- [ ] `/manager/dashboard` loads weekly live stats (not mock numbers).
- [ ] `/manager/reports` filters update data (date/location/trainer).
- [ ] Reports sections show readable empty states when filters produce no rows.
- [ ] `/manager/members` search + filters + sort work and table links resolve.
- [ ] `/manager/members/[memberId]` shows membership, billing, entitlement, notes without runtime errors.
- [ ] Member edit/new forms show success/error feedback and redirect correctly.
- [ ] `/manager/schedule` create/update/cancel/complete/no-show actions return usable feedback.
- [ ] `/manager/programs` summary cards and detail links load without type/runtime errors.
- [ ] `/manager/programs/assign` and template/client detail forms submit and flash correctly.
- [ ] `/manager/locations` and `/manager/library` present useful guidance, not dead-end placeholders.

## Trainer checks

- [ ] `/trainer/dashboard` shows today list, in-progress sessions, and request summary.
- [ ] `/trainer/clients` search/filter works and links to details.
- [ ] `/trainer/clients/[clientId]` quick start + change request form submit safely.
- [ ] `/trainer/schedule` upcoming windows and links are valid.
- [ ] `/trainer/sessions/start/[appointmentId]` starts or resumes session cleanly.
- [ ] `/trainer/sessions/[sessionId]` set logging, notes, incidents, and status updates show clear feedback.
- [ ] `/trainer/library` provides non-blocking guidance to continue trainer workflows.

## Client checks

- [ ] `/client/dashboard` shows next actions and flashes cleanly.
- [ ] `/client/plan` loads active plan and day details; no-plan state is clear.
- [ ] `/client/log` starts self session and links to in-progress session.
- [ ] `/client/sessions/[sessionId]` set logging + note actions succeed with readable feedback.
- [ ] `/client/appointments` shows upcoming/past + booking + cancel/reschedule behaviors.
- [ ] `/client/progress` and `/client/profile` show meaningful seeded data and graceful empties.
- [ ] `/client/book` redirect lands on `/client/appointments`.

## Reliability and deployment checks

- [ ] `npm run lint` passes.
- [ ] `npm run build` passes.
- [ ] Route map and docs match current behavior.
