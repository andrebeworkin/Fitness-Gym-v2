# Formula 4 Fitness — Engineering rules (Cursor)

Stack reference: **Next.js App Router**, **TypeScript**, **Tailwind**, **shadcn/ui**, **Supabase Auth**, **Postgres**, **Storage**, **Realtime** (use when it clearly reduces complexity or improves UX; do not force Realtime everywhere).

## Non-negotiable data separation

Model and store separately (distinct tables/records, not a single “blob” that mixes concerns):

1. **Prescription vs completion** — planned work (program structure, assignments) vs logs of what was done.
2. **Private staff notes vs client-visible notes** — different tables, different RLS policies, never merged in client APIs.
3. **Staff shifts vs client appointments** — separate entities; linking only when there is an explicit business rule (e.g., trainer at location).

## Historical integrity

- Membership changes mid-month, plan changes, substitutions, and approvals must be **auditable** and **historically accurate**.
- Prefer **append-only or versioned records** for plan assignments and membership periods over destructive updates.
- When “one active plan” is enforced, implement via **active window** fields or status with **ended_at** timestamps — not by deleting rows.

## Authorization

- **RLS first** in Supabase; Next.js server actions/route handlers must still **enforce role checks** (defense in depth).
- Ship with a **permissions matrix** mindset (`docs/PERMISSIONS_MATRIX.md`): every new screen or API must map to allowed roles and locations.
- Trainers may see **training-related** slices of other clients; **never** expose internal notes to client roles.

## Multi-location

- Most operational records should be **location-scoped** or **location-attributed** (where it happened, where the booking is for, where staff is scheduled).
- Staff “works at location X on day Y” is a **schedule/assignment** concept, not a hard limit on user accounts.

## Files and media

- Before/after photos and invoice/receipt documents go to **Supabase Storage** with **strict path conventions** and **RLS-aligned access** (signed URLs where appropriate).
- **No exercise media upload** in v1 (metadata only in the exercise library).

## Workflows

- **Manager-authored program edits** that trainers want to change should flow through an **approval** entity (request → decision → optional comment), not silent overwrites.

## Billing stance (v1)

- Track **money-related artifacts** (invoice/receipt storage, statuses) without building a full payment gateway integration.
- Keep models **extensible** toward future processors without implementing them now.

## UI / code quality

- Prefer **server components** by default; use client components for interactivity.
- Use **shadcn/ui** patterns consistently; avoid one-off styling that drifts from the design system.
- **Do not scaffold beyond** what the current phase requires (see `docs/PHASED_IMPLEMENTATION_PLAN.md`).

## Documentation

- When product intent changes, update **`docs/PRD.md`** and **`docs/OPEN_QUESTIONS.md`** before coding.
