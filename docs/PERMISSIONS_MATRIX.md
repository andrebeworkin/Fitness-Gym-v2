# Permissions matrix

Who can see and do what in v1.  
**LOCKED** rules come from product definition; **ASSUMPTION** rows should be confirmed.

---

## Roles

| Role | Description |
|------|-------------|
| **Manager** | Full operational access. |
| **Trainer** | Limited; focused on delivery, safety notes, and assigned work. |
| **Client** | Self-service for own data; no internal staff notes. |

**ASSUMPTION:** One user has exactly one primary role in v1 (no combined manager+trainer login unless you add later).

---

## Location scope

| Capability | Manager | Trainer | Client |
|------------|---------|---------|--------|
| View list of locations | Yes | Yes (ASSUMPTION: only locations they work or where they have clients) | Yes (ASSUMPTION: primary + allowed bookable locations) |
| Configure location settings (hours, branding) | Yes | No | No |
| Set **who works where on a given day** | Yes | No | No |

**OPEN:** Whether clients see both locations always or only theirs.

---

## Memberships and entitlements

| Capability | Manager | Trainer | Client |
|------------|---------|---------|--------|
| Assign / change membership **by name** | Yes | No | No |
| View current membership | Yes | Yes (training context) | Yes |
| View membership **history** | Yes | ASSUMPTION: yes for assigned clients; limited for others | ASSUMPTION: yes for own history |
| Pause / freeze membership | **Nobody** (not allowed) | **Nobody** | **Nobody** |

---

## Client profile and media

| Data | Manager | Trainer | Client |
|------|---------|---------|--------|
| DOB, age, sex, contact | Yes | ASSUMPTION: trainers see training-needed subset for assigned clients; broader for coverage as allowed | Own only |
| Emergency contact | Yes | ASSUMPTION: assigned + coverage | Own only |
| Before/after photos | Yes | ASSUMPTION: yes when needed for coaching | Own upload; view own |
| **Client-visible workout notes** (pain, skipped, etc.) | Yes | Yes (assigned; ASSUMPTION: coverage trainers for active appointments) | Own |
| **Staff-only internal notes** | Yes | Yes (ASSUMPTION: trainers; desk staff OPEN) | **No** |

---

## Assessments

| Capability | Manager | Trainer | Client |
|------------|---------|---------|--------|
| Create / edit assessment | Yes | ASSUMPTION: trainers can record within policy | No (ASSUMPTION: request via staff) |
| View assessment history | Yes | Yes (LOCKED for authorized training staff) | OPEN (often summary only) |

---

## Programs: templates and assignments

| Capability | Manager | Trainer | Client |
|------------|---------|---------|--------|
| Create / edit **templates** | Yes | OPEN (likely yes for private programs with safeguards) | No |
| Assign program to client (set active window) | Yes | ASSUMPTION: no by default | No |
| View **prescribed** program | Yes | Yes (assigned clients; other clients when needed for coverage) | If manager enables plan visibility |
| **Approve** changes to **manager-authored** programs | Yes | No | No |
| **Propose** changes to manager-authored programs | ASSUMPTION: trainers yes | Yes (LOCKED: can suggest) | No |

---

## Workout logs (completed work)

| Capability | Manager | Trainer | Client |
|------------|---------|---------|--------|
| View logs | Yes | Yes (assigned; coverage as needed) | Own |
| Create / edit own logs | Yes (correction use) | Yes (ASSUMPTION: can assist entry during session) | Yes where product allows self-logging |
| Record substitution vs prescription | Yes | Yes | ASSUMPTION: client can note changes; trainer confirms OPEN |

**LOCKED:** Logs are **separate** from prescription tables/APIs.

---

## Exercise library

| Capability | Manager | Trainer | Client |
|------------|---------|---------|--------|
| View exercises | Yes | Yes | ASSUMPTION: yes if program visibility allows |
| Edit library entries | Yes | ASSUMPTION: no in v1 | No |
| Upload exercise media | **Nobody in v1** | **Nobody in v1** | **Nobody in v1** |

---

## Scheduling: shifts vs appointments

| Entity | Manager | Trainer | Client |
|--------|---------|---------|--------|
| **Staff shifts** (who works where/when) | Full | ASSUMPTION: view own | No |
| **Staff availability** (bookable grid) | Configure | ASSUMPTION: view own | No |
| **Client appointments** (30-min) | Full | View relevant (assigned/coverage) | Own bookings |
| Book appointment | ASSUMPTION: yes on behalf of client | ASSUMPTION: yes on behalf of client | Yes (open slots) |
| Mark **no-show** | Yes | ASSUMPTION: yes for own delivered appointments | No |
| Reschedule / cancel **as staff** | Yes | LOCKED: allowed **without manager approval** in many cases (policy-bound) | OPEN (client self-cancel rules) |

---

## Financial records

| Capability | Manager | Trainer | Client |
|------------|---------|---------|--------|
| Create/upload invoices & receipts | Yes | No | No |
| View invoices/receipts | Yes | ASSUMPTION: no by default | Own (ASSUMPTION) |
| Mark paid / overdue | Yes | No | No |

---

## Reporting

| Report | Manager | Trainer | Client |
|--------|---------|---------|--------|
| Active members | Yes | No | No |
| Overdue payments | Yes | No | No |
| Trainer utilization | Yes | ASSUMPTION: limited “self” view optional | No |
| Incidents / safety flags | Yes | ASSUMPTION: contribute + view relevant | No |

---

## Messaging

| Capability | Manager | Trainer | Client |
|------------|---------|---------|--------|
| In-app messaging | **v2 — out of scope for v1** | **v2** | **v2** |

---

## Implementation note (for engineering)

Enforce with **Supabase RLS** plus **server-side checks**. Client-visible pages must **never** query staff-only tables.

---

## Related documents

- `docs/PRD.md`  
- `docs/USER_FLOWS.md`  
- `docs/RISK_REVIEW.md`  
