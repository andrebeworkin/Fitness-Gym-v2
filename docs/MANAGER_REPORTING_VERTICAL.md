# Manager Reporting Vertical

This vertical implements real manager-facing operations reporting and entitlement visibility.

## What was built

## 1) Reports page (`/manager/reports`)

- Replaced the placeholder with a real reporting workspace.
- Added filters:
  - date range (`from`, `to`)
  - location
  - trainer
- Added summary cards:
  - active members
  - overdue payments
  - trainer utilization
  - appointments in range
  - completed sessions in range
  - no-shows
  - clients without active programs
  - clients without assigned trainers (where applicable)
  - low adherence clients

## 2) Report breakdown sections

- Membership mix (active members by membership type)
- Member roster health
- Payment status summary
- Trainer workload and utilization
- Appointment outcomes by status
- Program coverage
- Session activity/adherence (14-day and 30-day)
- Semi-Private entitlement balances

## 3) Entitlement-aware member detail

Manager member detail now includes:

- current included balance
- current add-on balance
- total available balance
- recent entitlement ledger history with references to appointment/session where present

## Tables used

Reporting and detail views read from:

- `profiles`
- `gym_locations`
- `client_membership_periods`
- `membership_types`
- `invoices`
- `appointments`
- `trainer_availability_slots`
- `workout_sessions`
- `client_programs`
- `trainer_client_assignments`
- `client_training_credits`
- `trainer_session_add_ons`
- `entitlement_ledger_entries` (new)

## How entitlement consumption works (current conservative model)

- Booking consumes one entitlement for Semi-Private members.
- Source priority:
  1. included membership balance
  2. purchased add-on balance
- Cancellation inserts explicit compensating ledger entries (reversal).
- No-show currently keeps consumed entitlement (no auto-reversal).
- All write paths use idempotency keys to prevent accidental double-consume/double-reverse.

See `docs/ENTITLEMENT_LEDGER_MODEL.md` for the full rule set and assumptions.

## Calculation notes for reports

- Overdue payment count: invoice-level overdue check from current invoice state and due dates.
- Trainer utilization: completed appointments vs availability slots in the selected range.
- Program coverage: active member set compared against active client programs.
- Low adherence: active members with fewer than 2 sessions in last 14 days.
- Entitlement balances: sum of append-only ledger rows by source kind.

## Out of scope in this pass

- Policy-specific late-cancel penalties and dynamic no-show charging rules.
- Full accounting/reporting exports.
- Forecasting dashboards and chart-heavy analytics.
