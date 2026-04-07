# User flows

Plain-English journeys for Formula 4 Fitness.  
**LOCKED** = required behavior for v1. **ASSUMPTION** = default story until confirmed.

---

## Legend

- **Actor:** who drives the steps.  
- **Outcome:** what “done” means.  
- **System must:** non-negotiable behaviors.

---

## A. Manager: set up locations and staff coverage

**Actor:** Manager  
**Outcome:** Both locations exist; staff can be scheduled by day and location.

**LOCKED flow**

1. Manager creates **Location A** and **Location B** (names, address, hours if needed for display).  
2. Manager adds **staff accounts** (trainers and any desk roles if you include them later).  
3. For a given calendar day, manager sets **which staff work at which location** (day assignment).  
4. Manager records **staff availability** that powers bookable training slots (see Flow D).

**ASSUMPTION:** “Staff shift” is the record of **work hours / location presence**, separate from **client appointments**.

---

## B. Manager: define membership and assign to a client

**Actor:** Manager  
**Outcome:** Client has correct membership **name** and history is preserved.

**LOCKED flow**

1. Manager selects a client.  
2. Manager assigns one of: **Open Gym Membership**, **Semi-Private Membership**, **Private Membership**.  
3. System starts a **membership period** for the current month (dates recorded).  
4. If the client **upgrades or downgrades mid-month**, manager records the change:  
   - Old membership period ends with a timestamp.  
   - New membership period begins.  
   - **No pause/freeze** options appear.

**System must**

- Never pretend “tier 2 vs tier 3” is the product concept — **use membership names** in UI and exports.  
- Keep **historical membership** queryable for reporting.

---

## C. Client / manager: profile, photos, and notes

**Actor:** Client (with manager oversight where needed)  
**Outcome:** Profile is complete enough to train safely; photos and notes are stored correctly.

**LOCKED flow**

1. Client completes **profile**: DOB, sex, contact info (ASSUMPTION), emergency contact (OPEN).  
2. System shows **age** based on DOB (ASSUMPTION).  
3. Client uploads **before** and **after** photos with dates; manager can set **who may view** (OPEN detail — default: client + staff).  
4. During or after workouts, client adds **workout notes**: pain, discomfort, skipped exercises.  
5. Staff may add **internal notes** on the same client that **never** appear to the client (separate flow).

**System must**

- Keep **client notes** and **staff internal notes** in **separate places** with different permissions.

---

## D. Manager: publish availability; client books a session

**Actor:** Manager (availability), Client (booking), Trainer (delivery)  
**Outcome:** A 30-minute appointment exists; no-show can be recorded.

**LOCKED flow**

1. Manager defines **staff availability** rules (e.g., recurring blocks or specific openings — implementation detail).  
2. System exposes **open 30-minute slots** clients can book.  
3. Client picks a slot and books.  
4. **Staff shift** records still mean “who is working where,” independent of whether every hour is bookable.  
5. If the client does not attend, staff or manager marks **no-show** on that appointment.

**OPEN variations**

- Late cancel vs no-show.  
- Whether Open Gym members book anything beyond facility access in v1.

---

## E. Semi-Private: free 30-minute session + paid add-ons

**Actor:** Manager / Client / Trainer  
**Outcome:** The one free session is used or intentionally unused but visible; add-ons are tracked.

**LOCKED flow**

1. When Semi-Private membership starts, system shows **1 free 30-minute one-on-one** entitlement.  
2. Client books a 30-minute session; system can mark it against the **free entitlement** first (ASSUMPTION: automatic consumption on first qualifying booking).  
3. Additional sessions are marked as **paid add-ons** (could be “invoice required” in v1 — OPEN).

**OPEN**

- What happens if the free session is never used in a month (expire vs roll — business decision).

---

## F. Private: assessment, assigned trainer, substitute coverage

**Actor:** Manager, Trainer, Client  
**Outcome:** Assessment on record; primary trainer assigned; appointments can use substitutes when needed.

**LOCKED flow**

1. Manager ensures **physical assessment** is completed and stored in **assessment history**.  
2. Manager assigns **primary trainer**.  
3. Client books **30-minute** appointments within availability.  
4. If primary trainer is unavailable, manager or trainer arranges **substitute** for a specific appointment (who delivered the session is recorded).

**System must**

- Let authorized trainers view **training-related** information for coverage without exposing **internal staff notes** to clients.

---

## G. Programming: template → active plan → logging

**Actor:** Manager (authoring), Trainer (coaching), Client (logging where allowed)  
**Outcome:** One active plan; clear history; logs separate from prescription.

**LOCKED flow**

1. Manager (or authorized trainer — OPEN) builds a **program template**: weeks → days → exercises with sets/reps/rest/tempo/RPE/superset/notes as needed.  
2. Manager assigns template to client → becomes **active program** with **start and end** dates.  
3. Only **one active program** at a time; starting a new one **ends** the prior with history kept.  
4. Client or trainer completes a session → creates **workout log** entries linked to prescribed items where applicable.  
5. If equipment is unavailable, trainer applies **substitution** (similar exercise, same target muscle group) and that shows on the log.

---

## H. Change control: trainer suggests edits to manager-authored program

**Actor:** Trainer, Manager  
**Outcome:** Suggested changes are visible; nothing silently overwrites manager content.

**LOCKED flow**

1. Trainer proposes changes to a **manager-authored** program assignment.  
2. Manager **approves or declines**; decision is stored with **who/when**.  
3. Approved changes update the **prescription** for future sessions while **preserving** prior versions/history (ASSUMPTION: version or effective-dated structure).

---

## I. Financial artifacts: invoice and receipt on file

**Actor:** Manager (or finance role — ASSUMPTION: manager in v1)  
**Outcome:** Documents exist for audits and overdue reporting.

**LOCKED flow**

1. Manager creates/uploads **invoice** for a client (membership or add-on).  
2. When payment is received offline, manager attaches **receipt** and marks status **Paid** (exact statuses OPEN).  
3. Overdue items appear on **overdue payments** report.

**ASSUMPTION:** No card charging in v1; this is **record-keeping**, not live processing.

---

## J. Reporting snapshots (demo)

**Actor:** Manager  
**Outcome:** Dashboard answers basic operations questions.

**LOCKED examples**

- **Active members** by location and membership name.  
- **Overdue payments** list.  
- **Trainer utilization** for a date range.  
- **Notes / incidents** list suitable for risk review (exact fields OPEN — keep privacy in mind).

---

## Related documents

- `docs/PERMISSIONS_MATRIX.md`  
- `docs/PRD.md`  
- `docs/RISK_REVIEW.md`  
