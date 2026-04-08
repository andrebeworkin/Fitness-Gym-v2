# Known Limitations

This file is intentionally candid for investor and operator demos.

## Product limitations (current phase)

- Library routes are still placeholder-level (`/manager/library`, `/trainer/library`).
- Program change request approval does not auto-apply payloads to prescriptions.
- Client reschedule flow is request-based (no direct slot swap in one action).
- Entitlement policy is conservative (booking consume + cancellation reversal), without fine-grained late-cancel policy controls.
- Reporting is table-first; no CSV export or charting layer yet.

## Data and policy limitations

- Invoice lifecycle and payment accounting are operational, but not full finance-grade reconciliation.
- No configurable policy engine yet for:
  - grace windows
  - no-show penalties by membership type
  - entitlement expiry windows
- Cross-location timezone edge cases are not fully modeled per location timezone display.

## UX and platform limitations

- Mobile usability is improved but some dense manager tables are still desktop-first.
- No push notifications, email reminders, or in-app messaging workflow yet.
- No realtime collaborative editing for schedule/program changes.

## Demo caveats

- Demo users must exist in Auth before running seed data.
- Some expanded scenarios are optional and only appear if optional demo users were created.
