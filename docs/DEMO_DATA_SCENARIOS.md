# Demo Data Scenarios

Use this file to set up realistic role demos and verify each major page has meaningful content.

## Required demo users

Create these users in Supabase Auth before running `supabase/seed.sql`:

- `manager@demo.formula4.fitness`
- `trainer1@demo.formula4.fitness`
- `trainer2@demo.formula4.fitness`
- `client.open@demo.formula4.fitness`
- `client.semi@demo.formula4.fitness`
- `client.private@demo.formula4.fitness`

Optional extra realism:

- `trainer3@demo.formula4.fitness`
- `client.extra@demo.formula4.fitness`
- `client.semi2@demo.formula4.fitness`
- `client.private2@demo.formula4.fitness`

## Seeded scenario matrix

## Manager scenarios

- Active members across Open Gym, Semi-Private, and Private.
- Membership history examples.
- Mixed trainer assignment coverage.
- Schedule with completed, no-show, cancelled, and open-slot examples.
- Reports with utilization, adherence spread, overdue counts, and program coverage variance.

## Trainer scenarios

- Trainer today dashboard with:
  - at least one completed appointment
  - at least one no-show
  - open availability still visible
- Clients with active program + recent sessions.
- Program change request examples pending manager review.

## Client scenarios

- Open Gym client with no trainer-required booking path.
- Semi-Private client with credits/add-ons and entitlement ledger activity.
- Private client with active trainer, active program, upcoming appointment, and logged session history.
- Profile/progress pages with goals, assessments, and sessions.

## Billing and reporting scenarios

- Overdue invoice example.
- Partial invoice example.
- Paid invoice example.
- Payment record example on at least one invoice.

## Entitlement ledger scenarios

- Award entries from complimentary and add-on sources.
- Booking consume entry.
- Booking reversal behavior supported in app flows (cancel paths).

## Setup checklist

1. Ensure migrations are applied (`supabase db push`).
2. Ensure optional demo users exist if you want expanded scenarios.
3. Run/reset seed (`supabase db reset` or execute `supabase/seed.sql`).
4. Sign in as manager and verify `/manager/reports`, `/manager/members`, `/manager/schedule`.
5. Sign in as trainer and verify `/trainer/dashboard`, `/trainer/clients`.
6. Sign in as client and verify `/client/dashboard`, `/client/plan`, `/client/appointments`.
