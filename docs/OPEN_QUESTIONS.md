# Open questions

Decisions **not yet locked**. Each item should become either a **LOCKED** line in `docs/PRD.md` or an explicit **ASSUMPTION** with owner and date.

---

## Memberships and entitlements

1. **Semi-Private free 30-minute session:** If unused in a calendar month, does it **expire**, **roll**, or **accumulate**? Who can waive or reset it?  
2. **Mid-month upgrade/downgrade:** How should **money** be represented in v1 (proration fields on invoice, notes only, or ignore amounts entirely and track membership only)?  
3. **Open Gym members:** Do they appear in **programming** screens at all, or are they hidden from training modules?

---

## Locations

4. **Client location rules:** Can a client **book** at the non-primary location by default, or only when a manager enables it?  
5. **Data residency / privacy:** Any requirement to keep certain locations’ member lists **more restricted** to staff assigned to that location?

---

## Scheduling

6. **Client cancellation:** How many hours before a session is **late cancel** vs **free cancel**? Does a late cancel count toward **no-show** stats?  
7. **Staff changes without manager:** Which trainer actions are always allowed (e.g., reschedule within same day) vs require manager (e.g., cross-location move)?  
8. **Double booking:** Can two clients book the same trainer at the same time if one is “floor” vs “office,” or is that disallowed always?

---

## Training and programs

9. **Trainer publishing power:** May an assigned trainer create/update a **Private** client’s program **without** manager approval, or only **suggest** edits until manager approves?  
10. **Coverage depth:** When a substitute trainer opens another client’s profile, do they see **full assessment** or a **summary**?  
11. **Plan visibility:** Default for clients viewing **past** programs — on or off until manager enables?

---

## Workout logging

12. **Who confirms substitutions:** If a client logs a swapped exercise, does a trainer need to **confirm** for it to count as “verified”?  
13. **Pain notes:** Do pain/discomfort notes trigger **any** automatic flag for manager review, or are they informational only?

---

## Assessments

14. **Client visibility:** Can clients see **full assessment** results, a **summary**, or **nothing**?  
15. **Retention:** How long must assessments be kept, and who may delete/redact (if anyone)?

---

## Media (before/after)

16. **Visibility:** Are photos visible to **all trainers**, only **assigned trainer**, or **manager-only** by default?  
17. **Consent:** Do you need explicit **consent timestamp** stored alongside uploads for demo realism?

---

## Billing artifacts (v1)

18. **Status list:** Exact invoice statuses (e.g., Draft, Sent, Paid, Partially paid, Overdue, Voided).  
19. **Receipt format:** Upload-only vs generated PDF template in v1.  
20. **Overdue definition:** Due date rule (net-0, net-7) default for demo.

---

## Reporting

21. **“Notes” report scope:** Does it include **client workout notes**, **staff internal notes** (manager-only), or both in separate reports?  
22. **Trainer utilization:** Count **only delivered appointments**, or also **admin time** / **shift hours**?

---

## Accounts and compliance

23. **Minors:** If DOB indicates a minor, is the account blocked, linked to a guardian, or out of scope for v1?  
24. **HIPAA / health data:** Will you store anything beyond **general fitness** that requires stricter compliance (affects copy, fields, and hosting posture)?

---

## Related documents

- `docs/RISK_REVIEW.md` — which questions should be locked before build continues.  
- `docs/PHASED_IMPLEMENTATION_PLAN.md` — which phase needs which answers.  
