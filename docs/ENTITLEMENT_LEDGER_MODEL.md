# Entitlement Ledger Model

This document defines the conservative entitlement bookkeeping model used for Semi-Private session access and add-on session consumption.

## Why a ledger model

Balances can drift when booking/cancel flows directly mutate a single "remaining sessions" field.  
The app now uses an append-only ledger (`entitlement_ledger_entries`) so every entitlement change is auditable and reversible without deleting history.

## Table used

- `entitlement_ledger_entries` (new)
  - `client_id`, optional `membership_period_id`
  - `source_kind`:
    - `included_membership`
    - `purchased_add_on`
    - `manual_adjustment`
  - `event_kind`:
    - `award`
    - `booking_consume`
    - `booking_reversal`
    - `manual_adjustment`
    - `session_completed` (reserved)
    - `session_no_show` (reserved)
  - signed `delta` (positive awards/reversals, negative consumption)
  - optional references (`appointment_id`, `workout_session_id`, `credit_row_id`, `add_on_row_id`)
  - `idempotency_key` for duplicate protection

## Balance calculation

Current balance is derived, not stored:

- included balance = sum of ledger rows where `source_kind = included_membership`
- add-on balance = sum where `source_kind = purchased_add_on`
- total balance = included + add-on

## Current conservative policy

### Membership behavior

- `private`: booking allowed, no entitlement ledger consumption.
- `open_gym`: booking blocked.
- `semi_private`: booking requires positive ledger balance and consumes one session.

### Award behavior

- Awards are seeded from:
  - `client_training_credits` -> `credit-award:<id>`
  - `trainer_session_add_ons` -> `addon-award:<id>`
- Semi-Private monthly included benefit is conservatively awarded as:
  - `+1` per active membership period per calendar month
  - idempotency key: `semi-private-monthly-award:<periodId>:YYYY-MM`

### Consumption behavior

- On successful appointment booking (manager or client), one entitlement is consumed:
  - priority: included membership first, then add-on
  - idempotency key: `appointment-consume:<appointmentId>`

### Reversal behavior

- On cancellation, a compensating `+1` entry is inserted if a consumption exists:
  - same source as consumed row
  - idempotency key: `appointment-reversal:<appointmentId>`

### No-show/completion behavior

- No extra consume is performed at completion/no-show in this pass.
- Consumption happens at booking time; no-show currently keeps consumption.

## Audit guarantees

- No destructive updates to historical ledger rows.
- All balance changes are append-only and traceable to source event/reference.
- Duplicate writes are blocked by `idempotency_key`.

## Out of scope for this pass

- Fine-grained grace windows and late-cancel penalties by membership policy.
- Automated expiry logic beyond existing source records.
- Revenue recognition or invoice posting tied to ledger events.
