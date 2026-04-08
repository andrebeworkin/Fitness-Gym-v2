-- Fix recursive RLS on public.profiles.
-- Root cause: profiles policies referenced profiles via helper functions/subqueries.
-- This migration introduces a non-recursive role helper and recreates profiles policies.

create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select p.role
  from public.profiles p
  where p.id = auth.uid()
    and p.deleted_at is null
  limit 1
$$;

create or replace function public.is_manager()
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select public.current_app_role() = 'manager'
$$;

create or replace function public.is_trainer()
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select public.current_app_role() = 'trainer'
$$;

create or replace function public.is_client()
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select public.current_app_role() = 'client'
$$;

drop policy if exists profiles_select_self on public.profiles;
drop policy if exists profiles_select_manager on public.profiles;
drop policy if exists profiles_select_trainer_visible on public.profiles;
drop policy if exists profiles_update_self on public.profiles;
drop policy if exists profiles_write_manager on public.profiles;
drop policy if exists profiles_select_staff_directory_for_clients on public.profiles;

create policy profiles_select_self
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

create policy profiles_select_manager
  on public.profiles for select
  to authenticated
  using (public.current_app_role() = 'manager');

create policy profiles_select_trainer_visible
  on public.profiles for select
  to authenticated
  using (
    public.current_app_role() = 'trainer'
    and (
      id = auth.uid()
      or profiles.role in ('manager', 'trainer')
      or public.trainer_has_client_access(profiles.id)
    )
  );

create policy profiles_update_self
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy profiles_write_manager
  on public.profiles for all
  to authenticated
  using (public.current_app_role() = 'manager')
  with check (public.current_app_role() = 'manager');

create policy profiles_select_staff_directory_for_clients
  on public.profiles for select
  to authenticated
  using (
    public.current_app_role() = 'client'
    and profiles.role in ('trainer', 'manager')
    and profiles.deleted_at is null
  );
