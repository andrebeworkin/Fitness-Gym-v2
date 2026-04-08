# Route map

URLs exposed by the App Router scaffold. Route **groups** `(public)`, `(auth)`, `(manager)`, `(trainer)`, `(client)` are **not** part of the path.

| URL | Group | Purpose |
|-----|--------|---------|
| `/` | `(public)` | Marketing / founder landing |
| `/login` | `(auth)` | Email/password sign-in (Supabase Auth) |
| `/auth/setup-profile` | — | Signed in but missing or invalid `profiles.role` |
| `/unauthorized` | — | Signed in as wrong role for this URL prefix |
| `/manager` | `(manager)` | Redirect → `/manager/dashboard` |
| `/manager/dashboard` | `(manager)` | Manager weekly live operations snapshot + routing entry point |
| `/manager/locations` | `(manager)` | Location operations context and quick links to schedule/reporting |
| `/manager/members` | `(manager)` | Member roster (filters, stats, Supabase-backed) |
| `/manager/members/new` | `(manager)` | Create Auth user + client profile + initial membership |
| `/manager/members/[memberId]` | `(manager)` | Member detail + membership / trainer / notes actions |
| `/manager/members/[memberId]/edit` | `(manager)` | Edit profile, preferences, membership, trainer |
| `/manager/schedule` | `(manager)` | Schedule ops: shifts, availability, appointments, conflict-aware actions |
| `/manager/programs` | `(manager)` | Programs overview: templates, client programs, pending change requests |
| `/manager/programs/templates/new` | `(manager)` | Create a reusable program template skeleton |
| `/manager/programs/templates/[templateId]` | `(manager)` | Template detail/edit + add template day exercises |
| `/manager/programs/assign` | `(manager)` | Assign template or scratch program to a client |
| `/manager/programs/clients/[programId]` | `(manager)` | Client program detail + status + append exercise + request review |
| `/manager/reports` | `(manager)` | Manager operations reporting (entitlements, utilization, adherence, payments) |
| `/manager/library` | `(manager)` | Exercise metadata context + programming entry points |
| `/trainer` | `(trainer)` | Redirect → `/trainer/dashboard` |
| `/trainer/dashboard` | `(trainer)` | Today view: appointments, in-progress sessions, follow-up + request summary |
| `/trainer/clients` | `(trainer)` | Trainer-safe roster with search/relationship filters |
| `/trainer/clients/[clientId]` | `(trainer)` | Trainer client detail: goals, assessment, sessions, notes/incidents, quick start |
| `/trainer/schedule` | `(trainer)` | Trainer schedule view for today and upcoming week |
| `/trainer/sessions/start/[appointmentId]` | `(trainer)` | Confirm and start session runner from appointment |
| `/trainer/sessions/[sessionId]` | `(trainer)` | Live session runner + set logging + notes/incidents + change request action |
| `/trainer/library` | `(trainer)` | Exercise metadata context for session execution and change requests |
| `/client` | `(client)` | Redirect → `/client/dashboard` |
| `/client/dashboard` | `(client)` | Real client overview: next appointment, active plan, actions, recent sessions |
| `/client/plan` | `(client)` | Real active plan view + optional history visibility |
| `/client/log` | `(client)` | Start self-led session + recent workout logging history |
| `/client/appointments` | `(client)` | Real booking and appointment management |
| `/client/book` | `(client)` | Redirects to `/client/appointments` |
| `/client/sessions/[sessionId]` | `(client)` | Client session detail and set-by-set execution logging |
| `/client/progress` | `(client)` | Real progress view (goals, assessments, consistency, photos metadata) |
| `/client/profile` | `(client)` | Profile and membership/trainer context |

---

## Protection

| Prefix | Required `profiles.role` |
|--------|---------------------------|
| `/manager` | `manager` |
| `/trainer` | `trainer` |
| `/client` | `client` |

**Middleware** (`src/middleware.ts`) refreshes the Supabase session and enforces the prefix ↔ role match. **Layouts** call `requireDashboardRole` for defense in depth.

- No session → `/login?next=…`  
- Session but invalid/missing profile role → `/auth/setup-profile`  
- Session with wrong role for prefix → `/unauthorized?required=…`

Set `NEXT_PUBLIC_DEV_AUTH_BYPASS=true` to **skip** Supabase checks in middleware/layouts (UI dev only). See `docs/ENVIRONMENT.md` and `docs/SETUP.md`.

Full flow: **`docs/AUTH_FLOW.md`**.

---

## Source of truth for nav labels

`src/lib/navigation/dashboard-nav.ts` — update there when adding pages so sidebars stay consistent.

Manager member helpers: `ROUTES.manager.member(id)`, `memberEdit(id)`, `memberNew`.

---

## Manager vertical implementation notes

See **`docs/MANAGER_MEMBERS_VERTICAL.md`**, **`docs/MANAGER_SCHEDULE_VERTICAL.md`**, **`docs/MANAGER_PROGRAMS_VERTICAL.md`**, **`docs/TRAINER_EXECUTION_VERTICAL.md`**, **`docs/CLIENT_EXPERIENCE_VERTICAL.md`**, **`docs/MANAGER_REPORTING_VERTICAL.md`**, and **`docs/ENTITLEMENT_LEDGER_MODEL.md`**.
