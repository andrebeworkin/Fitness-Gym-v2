# Authentication flow

Plain-English description of how sign-in, roles, and route protection work after Supabase SSR integration.

---

## What “signed in” means

1. The user completes **Supabase Auth** (email + password) on `/login`.  
2. Supabase sets **HTTP-only cookies** managed by `@supabase/ssr` (refreshed in **middleware** on each matched request).  
3. The app loads **`profiles`** for `profiles.id = auth.users.id`.  
4. **`profiles.role`** must be one of: `manager`, `trainer`, `client`. That value is the **source of truth** for which workspace URLs the user may use.

There is **no** separate demo role cookie in the real flow.

---

## Sign-in sequence

1. User submits email and password on `/login` via a **server action** (`signInAction`).  
2. The action uses **`createServerSupabase()`** and `signInWithPassword`.  
3. On success, it reads **`profiles.role`**. If the row is missing or the role is invalid, the user is **signed out** again and sees an error (no half session).  
4. On success with a valid role, the action **`redirect()`**s to:
   - the `next` query parameter **only if** it is a safe same-app path **and** the path belongs to that role (e.g. a trainer cannot be redirected to `/manager/...`), or  
   - otherwise the **default dashboard** for that role (`/manager/dashboard`, `/trainer/dashboard`, or `/client/dashboard`).

---

## Session refresh (middleware)

- **Middleware** runs on almost all routes (excluding static assets).  
- It calls **`updateSupabaseSession`**, which uses `createServerClient` from `@supabase/ssr` with the request cookies and **`getUser()`** so tokens stay fresh.  
- The response carries **updated Set-Cookie** headers when Supabase rotates the session.

If **Supabase env vars are missing**, protected workspace URLs redirect to `/login?error=config`.

---

## Route protection

Two layers work together:

### 1. Middleware (first line)

For paths under `/manager`, `/trainer`, or `/client`:

- If there is **no Supabase user** → redirect to `/login?next=…`.  
- If there is a user but **no valid `profiles.role`** → redirect to **`/auth/setup-profile`**.  
- If the role **does not match** the prefix (e.g. client hits `/manager/...`) → redirect to **`/unauthorized?required=…`**.

Public routes, `/login`, `/auth/*`, `/unauthorized`, and the marketing home page are **not** role-gated in this way.

### 2. Layouts (defense in depth)

Each workspace layout calls **`requireDashboardRole('manager' | 'trainer' | 'client')`**, which:

- Loads the same auth + profile picture on the **server** (`loadAuthContext`).  
- Redirects to login, setup-profile, or unauthorized if something is wrong.

So even if middleware were misconfigured, layouts still enforce the role.

---

## Dev-only bypass

If **`NEXT_PUBLIC_DEV_AUTH_BYPASS=true`**:

- Middleware **does not** run Supabase checks.  
- Layouts **skip** real auth and assume the **layout’s** role (manager/trainer/client) so UI can be developed without credentials.

**Do not enable in production.** See `docs/ENVIRONMENT.md`.

---

## Missing profile or role

| Situation | Behavior |
|-----------|----------|
| Auth user exists, **no `profiles` row** | Sign-in fails with an error; if they somehow have a session, `/auth/setup-profile` explains next steps. |
| Profile exists, **`role` not in allowed enum** | Same as above. |
| Valid session, user opens **wrong** workspace URL | `/unauthorized` with link to their real dashboard + sign out. |

---

## Sign-out

**Sign out** is a **server action** that calls `supabase.auth.signOut()` and redirects to `/login`. It appears in dashboard headers and mobile menus.

---

## Privacy note

Auth helpers only load **`profiles`** (and Auth user metadata). They do **not** expose billing tables or internal notes; those remain behind RLS when you query them elsewhere.
