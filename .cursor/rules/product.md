# Formula 4 Fitness — Product rules (Cursor)

These rules keep implementation aligned with the agreed product. When in doubt, read `docs/PRD.md`, `docs/USER_FLOWS.md`, and `docs/PERMISSIONS_MATRIX.md`.

## Locked decisions (v1)

- Two gym locations from day one. Staff may work at both; the **manager assigns which location a staff member works on a given day** (not the same thing as “only one home location forever”).
- Membership **names** are fixed and meaningful; **do not use tier numbers as the primary business meaning**:
  - Open Gym Membership
  - Semi-Private Membership
  - Private Membership
- **Month-to-month only.** Memberships **cannot** be paused or frozen.
- Clients may **upgrade or downgrade mid-month**; the system must **preserve history** when memberships or plans change.
- **In-app messaging is v2**, not v1. Do not design v1 around chat threads.

## Membership capabilities (locked)

### Open Gym Membership

- Regular gym access only.
- **No** custom plan.

### Semi-Private Membership

- Custom workout plan.
- Includes **one free** 30-minute one-on-one session (track as an entitlement, not a vague “credit”).
- Additional trainer sessions are **paid add-ons**.
- **No assigned trainer by default.**

### Private Membership

- Physical assessment.
- Custom program.
- **Assigned trainer** (primary); **substitute trainers** allowed when needed.
- Appointment-based one-on-one sessions (30-minute increments).
- Client may **self-log workouts** and **track progress** in addition to coached work.

## Client experience (locked + assumptions)

**Locked**

- Personal profile includes **date of birth**, **age** (derived or stored with clear rules), **sex**, and other profile fields as specified in PRD.
- **Before/after photos** supported (storage-backed; privacy-controlled).
- Clients can add **workout notes** about pain, discomfort, or skipped exercises.

**Assumptions (confirm in `docs/OPEN_QUESTIONS.md` if unclear)**

- “Sex” captures what the business needs for programming context; exact field options and edit permissions follow PRD.

## Workout domain (locked)

- **Prescribed workouts** (what the plan says) are **separate data** from **completed workout logs** (what actually happened).
- **Private staff/trainer notes** are **separate** from **client-visible notes**.
- **Only one active plan per client** at a time; history remains queryable.
- Programs are **reusable templates**; assigned programs have **start and end dates** and often **duration-based** structures (e.g., 8 or 10 weeks).
- Structure supports **program → weeks → days → exercises** with **sets, reps, rest, tempo, RPE, supersets, notes**.
- **Substitutions** during sessions are allowed when **similar** and **same target muscle groups**; trainers may **suggest** changes.
- **Direct edits** to **manager-authored** programs require an **approval workflow** (see PRD for intent).

## Scheduling (locked)

- Appointments in **30-minute** increments.
- **Manager records staff availability**; **clients book open slots** directly.
- **No-shows** must be tracked.
- **Staff shifts** are tracked **separately** from **client appointments**.
- **Manager approval is not always required** for staff-driven reschedules/cancellations (policy is configurable at product level; see PRD).

## Payments / admin (locked)

- **Real payment processing** is a **future** target; **do not overbuild billing** in v1.
- **Invoices and receipts** must be **stored** (files/metadata), even if payment is manual/offline in the demo.

## Reporting (locked targets)

- Active members  
- Overdue payments  
- Notes (scope: see PRD — operational and compliance-oriented)  
- Trainer utilization  

## Exercise library (v1 scope)

Include: **name**, **short description**, **machine**, **bar type**, **grip**, **target muscle**, **alternatives**, **regressions/progressions**.  
**No exercise media upload** in v1.

## Roles (high level)

- **Manager:** full operational access.
- **Trainer:** limited access; can view assigned clients; may view other clients’ **training-related** profiles as needed; assessment history; internal notes; mark incidents/pain/dizziness/form issues/missed appointments.
- **Client:** own progress; log workouts; view current/past plans **if manager configuration allows**; **cannot** see private staff notes.

## Demo-first, production-capable

Optimize for a **credible demo**, but **model the domain** so you are not forced into a rewrite for production.
