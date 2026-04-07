# Phased implementation plan

**Goal:** Ship a **simple demo-first** build without painting the product into a corner.  
**Rule:** Each phase ends with something **demoable** before moving on.

Legend: **LOCKED** requirements already decided. **ASSUMPTION** suggested sequencing.

---

## Phase 0 — Decisions and guardrails (before heavy coding)

**Outcome:** Fewer rebuilds later.

- Lock answers in `docs/OPEN_QUESTIONS.md` for: **Semi-Private free session rollover**, **client cancellation / no-show policy**, **trainer publish vs suggest-only**, **invoice statuses**, **assessment client visibility**.  
- Confirm **ASSUMPTION** rows in `docs/PERMISSIONS_MATRIX.md` that affect database shape (especially trainer access to non-assigned clients).

**Deliverable:** Updated PRD sections marked LOCKED for the above.

---

## Phase 1 — Foundation (Supabase + Next.js shell)

**Outcome:** Auth, roles, and empty app skeleton with navigation.

- Supabase project: Auth, Postgres, Storage buckets (private documents, private photos).  
- Role model: **manager, trainer, client** (ASSUMPTION: enum + profile table).  
- Next.js App Router app with layout, auth gate, and role-based route stubs.  
- Tailwind + shadcn/ui baseline.

**Demo checkpoint:** Sign in as each role; see different menus (even if pages are placeholders).

---

## Phase 2 — Locations, staff day assignments, shifts

**Outcome:** Two locations and operational scheduling primitives.

**LOCKED capabilities**

- Two locations.  
- Manager assigns **staff → location per day**.  
- **Staff shifts** modeled separately from appointments (even if v1 UI is a simple grid).

**Demo checkpoint:** Manager assigns trainers to Location A/B on a sample week; trainer sees their own shifts.

---

## Phase 3 — Members, memberships, history

**Outcome:** Clients exist with correct membership **names** and immutable history.

- Membership types: **Open Gym**, **Semi-Private**, **Private** (no tier-based UX).  
- **Month-to-month** periods; **no pause/freeze**; **mid-month change** creates new period row and closes old.  
- Client profile: DOB, sex, derived age, basics.

**Demo checkpoint:** Change a client mid-month and show history timeline.

---

## Phase 4 — Exercise library (metadata only)

**Outcome:** CRUD for exercises with v1 fields; no media uploads.

- Fields per PRD (machine, bar, grip, target muscle, alternatives, regressions/progressions, etc.).

**Demo checkpoint:** Build a small library used later in program builder.

---

## Phase 5 — Programs (prescription) and versioning

**Outcome:** Templates and assigned programs with **program → weeks → days → exercises** and prescription detail fields.

- **One active program** per client via date window / status.  
- **Prescription** tables separate from **logs** (empty logs until Phase 7).  
- **Approval workflow** entity for trainer-proposed edits to **manager-authored** programs (minimal UI: request list + approve/deny).

**Demo checkpoint:** Assign an 8-week style template with a week/day breakdown; show approval on a proposed edit.

---

## Phase 6 — Scheduling: availability, appointments, no-shows

**Outcome:** 30-minute bookings, separate from shifts.

- Manager defines availability → client self-books open slot.  
- Appointment records: trainer(s), location, client, time, status (scheduled / completed / no-show / canceled — exact list ASSUMPTION).  
- **Substitute trainer** supported on a specific appointment.

**Demo checkpoint:** Book, complete, and mark no-show; show substitute trainer on a session.

---

## Phase 7 — Workout logging and substitutions

**Outcome:** Completed logs reference prescription but capture reality.

- Log sets, reps, RPE, notes; substitutions linked to rationale (similar muscle group).  
- Client-entered notes for pain/discomfort/skipped exercises (client-visible).

**Demo checkpoint:** Trainer logs session with substitution; client adds a note the trainer can see; internal staff note remains hidden from client.

---

## Phase 8 — Semi-Private entitlements and Private assessments

**Outcome:** Business rules visible in UI.

- Semi-Private: **one free 30-minute** tracking + paid add-on labeling (money handling minimal).  
- Private: assessment history; assigned trainer; self-logging enabled.

**Demo checkpoint:** Walkthrough comparing three membership types side by side.

---

## Phase 9 — Financial artifacts (lightweight)

**Outcome:** Stored invoices/receipts + overdue list — **no payment processor**.

- Upload or attach files to Storage; metadata in Postgres.  
- Basic overdue reporting.

**Demo checkpoint:** Upload invoice + receipt; show overdue row.

---

## Phase 10 — Reporting MVP + polish

**Outcome:** Founder-ready narrative.

- Active members by location + membership name.  
- Trainer utilization (define formula using answers from open questions).  
- Notes/incidents report (split client vs staff-only per decision).

**Demo checkpoint:** Manager dashboard tells a coherent story in under 10 minutes.

---

## Phase 11 (future) — v2 hooks

- In-app messaging.  
- Payment processor.  
- Exercise media.  
- Advanced analytics.

---

## Related documents

- `docs/PRD.md`  
- `docs/RISK_REVIEW.md`  
- `docs/OPEN_QUESTIONS.md`  
