# Risk review

Plain-language risks for Formula 4 Fitness before engineering work accelerates.  
Use this with `docs/OPEN_QUESTIONS.md` to decide what to **lock early**.

---

## 1. Contradictions or ambiguities

| Topic | Risk | Why it matters | Recommendation |
|--------|------|----------------|----------------|
| **Trainer editing power** | PRD says trainers **suggest** changes and **manager approval** is required for **manager-authored** programs, but real gyms often let senior trainers edit freely. | If unclear, engineers may build a heavy approval flow that staff bypass with “manager passwords,” or skip approvals and break audit requirements. | **Lock:** Whether assigned trainers may **publish** updates for Private clients without manager approval, and which program types are **manager-owned**. |
| **“View other clients as needed”** | Broad trainer access helps coverage; too broad creates creep (“I’ll browse everyone”). | Permissions bugs are trust killers and may create legal exposure. | **Lock:** Define **coverage** as time-bounded (appointment window) vs role-based (always). Document in `PERMISSIONS_MATRIX.md`. |
| **Staff reschedule without manager** | “Not always required” is correct operationally but vague for system rules. | Without rules, either trainers feel blocked or clients get moved without audit. | **Lock:** Allowed actions matrix: cancel, reschedule ±N hours, same-location only, etc. |
| **Open Gym + training modules** | Open Gym has **no custom plan** but might still need facility check-in or waivers. | Scope creep or accidental exclusion from needed safety flows. | **Lock:** Whether Open Gym appears in **scheduling** or only **access/membership** screens for v1. |

---

## 2. Privacy / permission risks

| Risk | Description | Mitigation |
|------|-------------|------------|
| **Internal notes leakage** | Staff-only notes could leak via a poorly scoped API route, join, or “export” feature. | Separate tables, **deny-by-default RLS**, no shared “notes” view model for clients. |
| **Photo access** | Before/after photos are sensitive; trainers may need them for coaching but not for curiosity. | Default least privilege; manager-configurable visibility; audit who viewed (ASSUMPTION — lock if required). |
| **Assessment visibility** | Full assessments may contain information clients should not self-serve read. | **Lock** client-visible summary fields vs staff-only detail. |
| **Trainer browsing** | “As needed” access can become permanent visibility in a cached client list. | Prefer **contextual access** (substitute assigned to appointment) logged in an audit table. |

---

## 3. Scheduling edge cases

| Edge case | What could go wrong | Lock / handle |
|-----------|---------------------|----------------|
| **Trainer works two locations same day** | Shifts vs appointments conflict; client books “wrong” site. | Enforce **appointment location** matches **shift location** for the trainer at that time (ASSUMPTION). |
| **Substitute trainer** | Client arrives expecting primary; notes don’t reach substitute. | Appointment record shows **delivering trainer**; push **session briefing** view (prescription + recent notes) to substitute. |
| **Double booking** | Same trainer, same slot. | DB uniqueness constraint on `(trainer_id, start_time)` **or** explicit concurrent-session policy (OPEN). |
| **No-show vs late cancel** | Metrics and client fairness disputes. | **Lock** definitions and how each status affects utilization reports. |
| **Client books last slot** | Staff stays late; shift ends before appointment. | Validate booking against **shift end** and **availability**, not only generic hours. |

---

## 4. Billing edge cases

| Edge case | What could go wrong | Lock / handle |
|-----------|---------------------|----------------|
| **Mid-month membership change** | Invoices don’t match reality; “overdue” becomes meaningless. | Decide v1 rule: **separate invoice lines per period** vs notes-only adjustment. |
| **Semi-Private add-ons** | Free vs paid session confusion. | Entitlement ledger: **free 30-min consumed flag/counter** with immutable events. |
| **No payment processor** | Team manually marks paid; human error. | Simple statuses + **who marked paid/when**; optional file receipt required to mark paid. |
| **Void vs delete** | Auditors lose trail. | Prefer **void** states, not hard deletes, for invoices. |

---

## 5. Workout logging edge cases

| Edge case | What could go wrong | Lock / handle |
|-----------|---------------------|----------------|
| **Substitution abuse** | “Similar muscle group” is subjective. | Require **reason** + optional **trainer confirmation** for client-logged swaps (OPEN). |
| **Editing logs after the fact** | Disputes on progress and safety. | Append **edits** with timestamp/user; or restrict edits to same-day (OPEN). |
| **Pain notes** | Under-reaction (injury) or over-reaction (alarm fatigue). | Decide if certain keywords trigger **manager tasks** (future); v1 at least surfaces on reports. |
| **Prescription vs log drift** | Analytics compare apples to oranges. | Always store **prescription snapshot id** or **program version** on the log (ASSUMPTION). |

---

## 6. Recommendations to lock before app build continues

These are the highest leverage “early locks” to avoid rework:

1. **Trainer program authority:** publish vs suggest-only for Private clients; which assets are manager-owned.  
2. **Trainer access to non-assigned clients:** coverage window rules + audit expectations.  
3. **No-show / cancel policy:** definitions and who can change appointment status.  
4. **Semi-Private free session:** expire vs roll; how add-ons are recorded in v1.  
5. **Invoice statuses + overdue rules:** minimal enum and due-date default for demo credibility.  
6. **Client visibility:** assessments and photos — who sees what by default.  
7. **Open Gym scope in app:** training screens vs membership-only.  

---

## 7. Architectural risks (summary)

- **RLS complexity** rising faster than features → slow development and subtle bugs. Mitigate with a **small number of well-tested policies** and server-side guards.  
- **Versioning** under-modeled → history requirements (memberships, programs, substitutions) become string hacks. Mitigate with **period tables** and **effective dates** early.  
- **Reporting queries** on large joins without indexes → demo feels fine, production crawls. Mitigate by identifying **report keys** up front (location, membership name, trainer, date).  

---

## Related documents

- `docs/OPEN_QUESTIONS.md`  
- `docs/PERMISSIONS_MATRIX.md`  
- `docs/PRD.md`  
