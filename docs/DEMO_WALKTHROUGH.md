# Demo Walkthrough (5-10 Minutes)

Use this flow for founder demos. It is designed to show business value first, then operational depth.

## 0) Prep (30 seconds)

- Confirm seeded data is loaded (see `docs/DEMO_DATA_SCENARIOS.md`).
- Open three browser profiles or incognito tabs for manager, trainer, client.

## 1) Public + positioning (45 seconds)

1. Start at `/`.
2. Explain role coverage:
   - manager operations
   - trainer execution
   - client self-service
3. Click **Sign in** and move to manager.

## 2) Manager value (3 minutes)

## A. Dashboard

- Open `/manager/dashboard`.
- Call out live weekly metrics:
  - active members
  - appointments/no-shows
  - overdue payments

## B. Reports

- Open `/manager/reports`.
- Apply date range/location filters.
- Walk through:
  - roster health
  - trainer workload/utilization
  - adherence and entitlement balances
- Explain that this is sourced from the same operational records used by scheduling/programming/session flows.

## C. Member detail and entitlement

- Open `/manager/members`, then a Semi-Private member.
- Show:
  - membership/trainer/program context
  - billing summary
  - entitlement ledger balance and history

## 3) Trainer execution (2 minutes)

1. Switch to trainer account and open `/trainer/dashboard`.
2. Show:
   - today appointments
   - in-progress session links
   - pending change requests
3. Open a session runner (`/trainer/sessions/[sessionId]`) and explain:
   - prescribed vs actual separation
   - substitutions and set logs
   - notes/incidents vs client-visible context

## 4) Client experience (2 minutes)

1. Switch to client account and open `/client/dashboard`.
2. Show:
   - next session
   - active program summary
   - progress consistency cards
3. Open:
   - `/client/plan`
   - `/client/appointments`
   - `/client/sessions/[sessionId]`
4. Highlight self-log + booking while preserving role boundaries.

## 5) Close with trust and roadmap (45 seconds)

- Emphasize operational trust model:
  - append-only entitlement ledger
  - role-safe data access
  - historical records preserved
- End with known limitations and next phase (`docs/KNOWN_LIMITATIONS.md`, `docs/NEXT_FEATURES.md`).
