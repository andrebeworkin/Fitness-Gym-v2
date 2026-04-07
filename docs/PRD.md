# Product Requirements Document (PRD)

**Product:** Formula 4 Fitness — gym management and training platform (web demo → production-capable)  
**Audience:** Founder / operations (plain English)  
**Engineering stack:** Next.js (App Router), TypeScript, Tailwind, shadcn/ui, Supabase (Auth, Postgres, Storage, Realtime)

---

## How to read this document

| Label | Meaning |
|--------|---------|
| **LOCKED** | Decided for v1; treat as a requirement. |
| **ASSUMPTION** | Working default until you confirm otherwise. |
| **OPEN** | Not decided; see also `docs/OPEN_QUESTIONS.md`. |

---

## 1. Vision

Formula 4 Fitness helps a multi-location gym **manage memberships**, **deliver structured training programs**, **schedule staff and clients**, and **track outcomes** — with clear boundaries between what clients see, what staff see internally, and what managers control.

**Near-term goal:** a **credible web demo** that could grow into a real operations system without throwing away the data model.

---

## 2. Users and roles

### 2.1 Manager (operations owner)

**LOCKED:** Full operational access: locations, memberships, programs, scheduling, staff assignments, reporting configuration, and financial document records (invoices/receipts).

### 2.2 Trainer / coach

**LOCKED:** Limited access. Can:

- View **assigned** clients and work with their plans and appointments.
- View **other clients’ training-related profiles when needed** for coverage (e.g., substitute trainer, floor support).
- View **assessment history** where applicable.
- Write **private, staff-only internal notes** (clients never see these).
- Record **pain, dizziness, form issues, incidents, missed appointments** (operational safety and quality).

### 2.3 Client / member

**LOCKED:** Can:

- View **own progress** and **log own workouts** (especially relevant for Private membership, and any client logging the manager enables).
- View **current and past plans** **if the manager allows** in configuration.
- **Cannot** view private trainer/staff notes.

**OPEN:** Exact definition of “progress” tiles for v1 (strength metrics vs photos vs adherence only).

---

## 3. Multi-location operations

**LOCKED:** The business runs **two locations** from day one.

**LOCKED:** Staff may work at **both** locations.

**LOCKED:** The **manager allocates which location a staff member works at on a given day** (day-level assignment). This is how coverage and reporting by location stay accurate.

**ASSUMPTION:** A client has a **primary location** for membership and billing context, but may **book or attend** where rules allow (OPEN if you want strict “one location only” for clients).

---

## 4. Memberships (business meaning, not “tiers”)

**LOCKED:** Membership **names** carry the business rules. **Do not use tier numbers as the primary meaning** in product copy, reports, or staff workflows (internal codes are fine technically if hidden).

**LOCKED:** Memberships are **month-to-month**.

**LOCKED:** Memberships **cannot be paused or frozen**.

**LOCKED:** Clients may **upgrade or downgrade mid-month**.

**LOCKED:** **Preserve history** when memberships change (what they had, when, and what changed).

### 4.1 Open Gym Membership

**LOCKED:**

- Regular **gym access** (facility use).
- **No custom workout plan** in the product.

### 4.2 Semi-Private Membership

**LOCKED:**

- **Custom workout plan** (one active plan at a time — see Section 6).
- Includes **one free 30-minute one-on-one** session (must be trackable).
- Additional one-on-one sessions are **paid add-ons**.
- **No assigned trainer by default.**

**ASSUMPTION:** “Semi-private” may still involve **group-style floor coaching** outside the product; v1 focuses on **plan + bookable 1:1 slots** as specified.

### 4.3 Private Membership

**LOCKED:**

- **Physical assessment** (record exists, history visible to authorized staff).
- **Custom program** (structured plan).
- **Assigned trainer** (primary).
- **Appointment-based** one-on-one sessions in **30-minute** increments.
- **Substitute trainers** allowed when needed (coverage), with clear assignment per appointment or day.
- Client may **self-log workouts** and **track progress** in addition to coached sessions.

---

## 5. Client profile and media

**LOCKED:** Personal profile includes **date of birth**, **age**, **sex**, and other relevant fields.

**ASSUMPTION:** Age is **derived from DOB** in the UI for accuracy; store DOB as source of truth.

**ASSUMPTION:** Contact info, emergency contact, and basic health flags (as approved by your legal counsel) belong in profile or adjacent medical waiver area (OPEN: what you want in v1 vs paper-only).

**LOCKED:** **Before and after photos** are supported (upload, date, visibility rules).

**LOCKED:** Clients can add **workout notes** about **pain**, **discomfort**, or **skipped exercises** (client-visible notes; distinct from staff internal notes).

---

## 6. Workout programming

### 6.1 Structure

**LOCKED:**

- Programs can be saved and reused as **templates**.
- **Only one active plan per client** at a time.
- Assigned programs have **start and end dates** and are often **duration-based** (e.g., 8 or 10 weeks).
- Structure supports **program → weeks → days → exercises**.

### 6.2 Exercise details

**LOCKED:** For prescribed work, support **sets, reps, rest, tempo, RPE, supersets, notes** (exact UX can be simple; the **model** must not block these).

### 6.3 Substitutions and coaching changes

**LOCKED:** During sessions, **exercise substitutions** are allowed when **similar** and targeting the **same muscle groups**.

**LOCKED:** Trainers can **suggest changes** to programming.

**LOCKED:** **Direct edits** to **manager-authored** programs require an **approval workflow** (request → manager decision → audit trail).

**ASSUMPTION:** Trainer-authored drafts for their assigned private clients may follow a lighter path (OPEN — if trainers can publish without manager approval for certain templates).

### 6.4 Logging vs prescription

**LOCKED:** **Prescribed workouts** and **completed workout logs** are **separate**. Logs reference what was prescribed when possible, but can reflect reality (substitutions, skipped sets).

---

## 7. Exercise library (v1)

**LOCKED:** v1 includes metadata:

- Exercise name  
- Short description  
- Machine  
- Bar type  
- Grip  
- Target muscle  
- Alternatives  
- Regressions / progressions  

**LOCKED:** **No exercise media upload** in v1 (no video/image per exercise in library).

---

## 8. Scheduling

**LOCKED:**

- Training appointments are booked in **30-minute** increments.
- **Manager records staff availability** (the rules that generate bookable slots).
- **Clients book open slots** directly in the product.
- **No-shows** are tracked.
- **Private** clients may work with **substitute trainers** when needed.

**LOCKED:** **Staff shifts** (who is working where, when) are **separate** from **client appointments** (what clients booked).

**LOCKED:** **Manager approval is not always required** for **staff** reschedules/cancellations (product should support policy: trainer-led changes within rules).

**OPEN:** Who may **cancel** a client booking without penalty, and how **late cancel** is defined.

---

## 9. Payments and financial records

**LOCKED:** Real **payment processing** is a **future** target.

**LOCKED:** **Do not overbuild billing** in v1.

**LOCKED:** **Invoices** and **receipts** must be **stored** (PDF upload or generated artifact + file) with metadata (member, amount, dates, status).

**ASSUMPTION:** v1 statuses might be **Draft / Sent / Paid / Overdue / Voided** (exact list OPEN).

---

## 10. Reporting (v1 targets)

**LOCKED:** Reporting should support:

- **Active members** (by location and membership name).  
- **Overdue payments** (based on stored invoice/financial records, not live card rails).  
- **Notes** (operational: incidents, pain flags, no-shows — scope OPEN for privacy).  
- **Trainer utilization** (sessions delivered, hours booked, no-shows attributed).  

---

## 11. Messaging

**LOCKED:** **In-app messaging is v2**, not v1. Do not block other features waiting for chat.

---

## 12. Non-goals for v1 (explicit)

- Full payment processor integration.  
- In-app messaging threads.  
- Exercise media hosting in the library.  
- Complex freeze/pause logic (not allowed by business rules).  

---

## 13. Success criteria for the demo

**ASSUMPTION:** “Success” means a founder can walk through:

1. Two locations live with staff day assignments.  
2. A client on each membership type with correct entitlements (esp. Semi-Private free 30-min).  
3. One active program with weeks/days/exercises + a completed log with a substitution.  
4. Booking flow with availability, no-show marking, and separate shift record.  
5. Internal note vs client note demonstrated side by side (permissions).  
6. Invoice/receipt stored and appears on an overdue report stub.  

---

## 14. Related documents

- `docs/USER_FLOWS.md` — step-by-step journeys.  
- `docs/PERMISSIONS_MATRIX.md` — who can see and do what.  
- `docs/OPEN_QUESTIONS.md` — decisions still needed.  
- `docs/PHASED_IMPLEMENTATION_PLAN.md` — build order.  
- `docs/RISK_REVIEW.md` — risks and early locks.  
