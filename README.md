# Formula 4 Fitness

Web demo and future production direction for a **gym management and training platform** serving **two locations**, structured programming, scheduling, and member progress — with strict separation between **what clients see** and **what staff keep internal**.

The repo includes **product docs**, a **Next.js app** (App Router, TypeScript, Tailwind, shadcn-style UI), and a **Supabase/Postgres schema** (migrations, RLS, Storage policies, seed). Auth uses **Supabase SSR** and **`profiles.role`** for manager/trainer/client workspaces (see `docs/AUTH_FLOW.md`).

---

## Quick start

```bash
npm install
cp .env.example .env.local   # optional for now
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Add Supabase env vars (see [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md)), then **Sign in** with email/password; you are routed by **`profiles.role`**. For UI-only work without Auth, use `NEXT_PUBLIC_DEV_AUTH_BYPASS=true` (dev only).

Details: [docs/SETUP.md](docs/SETUP.md) · Auth: [docs/AUTH_FLOW.md](docs/AUTH_FLOW.md) · Demo users: [docs/DEMO_AUTH_SETUP.md](docs/DEMO_AUTH_SETUP.md) · Routes: [docs/ROUTE_MAP.md](docs/ROUTE_MAP.md) · Structure: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

---

## Who this is for

- **Founder / operations:** [docs/PRD.md](docs/PRD.md), [docs/USER_FLOWS.md](docs/USER_FLOWS.md)  
- **Engineering:** [.cursor/rules/product.md](.cursor/rules/product.md), [.cursor/rules/engineering.md](.cursor/rules/engineering.md), [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

---

## Tech stack

- Next.js 15 (App Router) · TypeScript · Tailwind CSS · shadcn/ui-style components  
- Supabase Auth (SSR), Postgres (RLS) · Storage / Realtime as features land

---

## Document map

| Document | Purpose |
|----------|---------|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | App structure, auth, domain reminders |
| [docs/AUTH_FLOW.md](docs/AUTH_FLOW.md) | Sign-in, sessions, role redirects, route protection |
| [docs/DEMO_AUTH_SETUP.md](docs/DEMO_AUTH_SETUP.md) | Creating Supabase users and `profiles.role` for demos |
| [docs/DEMO_DATA_SCENARIOS.md](docs/DEMO_DATA_SCENARIOS.md) | Seeded scenario expectations across manager/trainer/client |
| [docs/DEMO_WALKTHROUGH.md](docs/DEMO_WALKTHROUGH.md) | Founder-ready 5-10 minute presentation flow |
| [docs/QA_CHECKLIST.md](docs/QA_CHECKLIST.md) | Role-by-role final QA regression checklist |
| [docs/DEMO_VALIDATION.md](docs/DEMO_VALIDATION.md) | What was validated in final pre-demo pass |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Hosted preview deployment checklist |
| [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md) | Env vars, local vs production, dev bypass |
| [docs/ROUTE_MAP.md](docs/ROUTE_MAP.md) | URLs and protection rules |
| [docs/SETUP.md](docs/SETUP.md) | Install, env, Supabase CLI & seed |
| [docs/DB_SCHEMA.md](docs/DB_SCHEMA.md) | Tables, keys, lifecycles, privacy summary |
| [docs/RLS_MATRIX.md](docs/RLS_MATRIX.md) | Row-level security by role |
| [docs/STORAGE_MODEL.md](docs/STORAGE_MODEL.md) | Storage buckets & path rules |
| [docs/PRD.md](docs/PRD.md) | Product requirements (LOCKED / ASSUMPTION / OPEN) |
| [docs/USER_FLOWS.md](docs/USER_FLOWS.md) | Journeys by role |
| [docs/PERMISSIONS_MATRIX.md](docs/PERMISSIONS_MATRIX.md) | Access rules for future RLS |
| [docs/OPEN_QUESTIONS.md](docs/OPEN_QUESTIONS.md) | Decisions still needed |
| [docs/PHASED_IMPLEMENTATION_PLAN.md](docs/PHASED_IMPLEMENTATION_PLAN.md) | Build order |
| [docs/RISK_REVIEW.md](docs/RISK_REVIEW.md) | Risks and early locks |
| [docs/MANAGER_REPORTING_VERTICAL.md](docs/MANAGER_REPORTING_VERTICAL.md) | Reporting implementation details and calculations |
| [docs/ENTITLEMENT_LEDGER_MODEL.md](docs/ENTITLEMENT_LEDGER_MODEL.md) | Append-only entitlement model and assumptions |
| [docs/KNOWN_LIMITATIONS.md](docs/KNOWN_LIMITATIONS.md) | Honest product and policy limits for demos |
| [docs/NEXT_FEATURES.md](docs/NEXT_FEATURES.md) | Post-demo roadmap priorities |

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
