# Demo auth setup (Supabase)

How to create users for local or hosted demos so **email/password sign-in** and **`profiles.role`** work with this app.

---

## Prerequisites

1. A Supabase project with **migrations applied** (`supabase db push` or Dashboard SQL).  
2. The **`handle_new_user`** trigger on `auth.users` (included in migrations) so each new Auth user gets a **`profiles`** row with default role **`client`**.

---

## Create Auth users

Use **Authentication → Users → Add user** in the Supabase Dashboard (or the Auth API):

- Turn on **email** provider under Authentication → Providers.  
- Create users with **email + password** (or invite them).  
- Example emails from `supabase/seed.sql` (optional):

  - `manager@demo.formula4.fitness`  
  - `trainer1@demo.formula4.fitness`, `trainer2@demo.formula4.fitness`  
  - `client.open@demo.formula4.fitness`, `client.semi@demo.formula4.fitness`, `client.private@demo.formula4.fitness`  

**Do not commit real passwords** to the repo. Set passwords only in the Dashboard or your secrets store.

---

## Set `profiles.role`

New users start as **`client`** from the trigger. Promote staff in the **Table Editor** (or SQL):

```sql
update public.profiles
set role = 'manager'
where id = '<auth-user-uuid>';
```

Use exactly:

- `manager`  
- `trainer`  
- `client`  

These must match the Postgres enum / column type used in migrations.

---

## Verify

1. Add to `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (see `docs/ENVIRONMENT.md`).  
2. Run `npm run dev`.  
3. Open `/login`, sign in as each role.  
4. Confirm redirects:
   - manager → `/manager/dashboard`  
   - trainer → `/trainer/dashboard`  
   - client → `/client/dashboard`  
5. Open a **wrong** prefix while signed in (e.g. client visits `/manager/dashboard`) → **`/unauthorized`**.

---

## Seed data after users exist

`supabase/seed.sql` can attach memberships, programs, and appointments to those user IDs. If you ran **`db reset`** before creating Auth users, create the users first, then run the **persona** section of the seed (or full seed) from the SQL editor.

---

## Troubleshooting

| Symptom | What to check |
|---------|----------------|
| “Supabase is not configured” | Env vars and dev server restart. |
| “No profile found” | Trigger missing or user created outside Auth; insert `profiles` row manually with `id = auth.users.id`. |
| “Invalid role” | `profiles.role` must be exactly `manager`, `trainer`, or `client`. |
| Redirect loop | Clear site cookies; ensure middleware matcher is not blocking `/login`. |
