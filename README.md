# Formula 4 Fitness

Web demo and future production direction for a **gym management and training platform** serving **two locations**, structured programming, scheduling, and member progress — with strict separation between **what clients see** and **what staff keep internal**.

This repository currently holds **planning and product-definition documents** only. **Application scaffolding is intentionally not started yet.**

---

## Who this is for

- **Founder / operations:** read `docs/PRD.md` and `docs/USER_FLOWS.md` first.  
- **Engineering:** read `.cursor/rules/product.md`, `.cursor/rules/engineering.md`, then the docs below.

---

## Intended tech stack (when build starts)

- Next.js App Router  
- TypeScript  
- Tailwind CSS  
- shadcn/ui  
- Supabase Auth  
- Supabase Postgres  
- Supabase Storage  
- Supabase Realtime (where it earns its place)

---

## Document map

| Document | Purpose |
|----------|---------|
| [docs/PRD.md](docs/PRD.md) | Product requirements in plain English (LOCKED vs ASSUMPTION vs OPEN). |
| [docs/USER_FLOWS.md](docs/USER_FLOWS.md) | Step-by-step journeys for manager, trainer, and client. |
| [docs/PERMISSIONS_MATRIX.md](docs/PERMISSIONS_MATRIX.md) | Access rules aligned to RLS and server checks. |
| [docs/OPEN_QUESTIONS.md](docs/OPEN_QUESTIONS.md) | Decisions still needed before some features are built. |
| [docs/PHASED_IMPLEMENTATION_PLAN.md](docs/PHASED_IMPLEMENTATION_PLAN.md) | Demo-first build order. |
| [docs/RISK_REVIEW.md](docs/RISK_REVIEW.md) | Contradictions, privacy, scheduling, billing, logging risks. |
| [.cursor/rules/product.md](.cursor/rules/product.md) | Cursor-facing product guardrails. |
| [.cursor/rules/engineering.md](.cursor/rules/engineering.md) | Cursor-facing engineering guardrails. |

---

## Locked business rules (v1 summary)

- **Two locations** from day one; staff may work at both; **manager assigns location per staff per day**.  
- Membership **names** (not numeric tiers as the story): **Open Gym**, **Semi-Private**, **Private** — each with the capabilities defined in the PRD.  
- **Month-to-month** memberships; **no pause/freeze**; **mid-month upgrade/downgrade** with **history preserved**.  
- **Prescription vs completed logs** stay separate; **staff-only notes** separate from **client notes**; **shifts** separate from **client appointments**.  
- **30-minute** training appointments; **no-shows** tracked; **substitute trainers** allowed for Private.  
- **Invoices and receipts stored**; **payments processing** is future; **in-app messaging** is v2.  
- **Exercise library** metadata in v1; **no exercise media uploads** in v1.

---

## Local development

Not applicable until the app is scaffolded. When implementation begins, this README will gain setup instructions (environment variables, Supabase migrations, and run commands).

---

## License

Unspecified — add a license when you are ready to share or commercialize the codebase.
