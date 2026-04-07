# Formula 4 Fitness

Web demo and future production direction for a **gym management and training platform** serving **two locations**, structured programming, scheduling, and member progress — with strict separation between **what clients see** and **what staff keep internal**.

The repo includes **product docs**, a **Next.js scaffold** (App Router, TypeScript, Tailwind, shadcn-style UI), and a **Supabase/Postgres schema** (migrations, RLS, Storage policies, seed). Next.js ↔ Supabase wiring in app code is still minimal (see `src/services/supabase/` stubs).

---

## Quick start

```bash
npm install
cp .env.example .env.local   # optional for now
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), then use **Sign in** → pick a **demo role** (Manager / Trainer / Client).

Details: [docs/SETUP.md](docs/SETUP.md) · Route list: [docs/ROUTE_MAP.md](docs/ROUTE_MAP.md) · Structure: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

---

## Who this is for

- **Founder / operations:** [docs/PRD.md](docs/PRD.md), [docs/USER_FLOWS.md](docs/USER_FLOWS.md)  
- **Engineering:** [.cursor/rules/product.md](.cursor/rules/product.md), [.cursor/rules/engineering.md](.cursor/rules/engineering.md), [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

---

## Tech stack

- Next.js 15 (App Router) · TypeScript · Tailwind CSS · shadcn/ui-style components  
- Planned: Supabase Auth, Postgres (RLS), Storage, Realtime

---

## Document map

| Document | Purpose |
|----------|---------|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | App structure, auth stub, domain reminders |
| [docs/ROUTE_MAP.md](docs/ROUTE_MAP.md) | URLs and protection rules |
| [docs/SETUP.md](docs/SETUP.md) | Install, env, dev bypass, Supabase CLI & seed |
| [docs/DB_SCHEMA.md](docs/DB_SCHEMA.md) | Tables, keys, lifecycles, privacy summary |
| [docs/RLS_MATRIX.md](docs/RLS_MATRIX.md) | Row-level security by role |
| [docs/STORAGE_MODEL.md](docs/STORAGE_MODEL.md) | Storage buckets & path rules |
| [docs/PRD.md](docs/PRD.md) | Product requirements (LOCKED / ASSUMPTION / OPEN) |
| [docs/USER_FLOWS.md](docs/USER_FLOWS.md) | Journeys by role |
| [docs/PERMISSIONS_MATRIX.md](docs/PERMISSIONS_MATRIX.md) | Access rules for future RLS |
| [docs/OPEN_QUESTIONS.md](docs/OPEN_QUESTIONS.md) | Decisions still needed |
| [docs/PHASED_IMPLEMENTATION_PLAN.md](docs/PHASED_IMPLEMENTATION_PLAN.md) | Build order |
| [docs/RISK_REVIEW.md](docs/RISK_REVIEW.md) | Risks and early locks |

---

## Locked business rules (v1 summary)

- **Two locations** from day one; staff may work at both; **manager assigns location per staff per day**.  
- Membership **names**: **Open Gym**, **Semi-Private**, **Private** — not tier numbers as the product story.  
- **Month-to-month** memberships; **no pause/freeze**; **mid-month changes** with **history preserved**.  
- **Prescription vs logs**; **staff-only vs client notes**; **shifts vs appointments** — modeled separately.  
- **30-minute** appointments; **no-shows**; **substitute trainers** for Private.  
- **Invoices/receipts stored**; **payments** later; **in-app messaging** v2.  
- **Exercise library** metadata in v1; **no exercise media uploads** in v1.

---

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Run production build |
| `npm run lint` | ESLint |

---

## License

Unspecified — add a license when you are ready to share or commercialize the codebase.
