-- Entitlement ledger for Semi-Private session bookkeeping.
-- Append-only entries with idempotency keys for booking/rollback safety.

create table if not exists public.entitlement_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  membership_period_id uuid references public.client_membership_periods (id) on delete set null,
  source_kind text not null check (source_kind in ('included_membership', 'purchased_add_on', 'manual_adjustment')),
  event_kind text not null check (
    event_kind in (
      'award',
      'booking_consume',
      'booking_reversal',
      'manual_adjustment',
      'session_completed',
      'session_no_show'
    )
  ),
  delta int not null check (delta <> 0),
  appointment_id uuid references public.appointments (id) on delete set null,
  workout_session_id uuid references public.workout_sessions (id) on delete set null,
  credit_row_id uuid references public.client_training_credits (id) on delete set null,
  add_on_row_id uuid references public.trainer_session_add_ons (id) on delete set null,
  related_entry_id uuid references public.entitlement_ledger_entries (id) on delete set null,
  note text,
  idempotency_key text unique,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists entitlement_ledger_client_idx
  on public.entitlement_ledger_entries (client_id, created_at desc);

create index if not exists entitlement_ledger_appointment_idx
  on public.entitlement_ledger_entries (appointment_id, created_at desc);

alter table public.entitlement_ledger_entries enable row level security;

drop policy if exists entitlement_ledger_select_manager on public.entitlement_ledger_entries;
create policy entitlement_ledger_select_manager
  on public.entitlement_ledger_entries
  for select
  using (public.is_manager());

drop policy if exists entitlement_ledger_select_trainer on public.entitlement_ledger_entries;
create policy entitlement_ledger_select_trainer
  on public.entitlement_ledger_entries
  for select
  using (public.trainer_has_client_access(client_id));

drop policy if exists entitlement_ledger_select_client on public.entitlement_ledger_entries;
create policy entitlement_ledger_select_client
  on public.entitlement_ledger_entries
  for select
  using (client_id = auth.uid());

drop policy if exists entitlement_ledger_insert_manager on public.entitlement_ledger_entries;
create policy entitlement_ledger_insert_manager
  on public.entitlement_ledger_entries
  for insert
  with check (public.is_manager());

drop policy if exists entitlement_ledger_insert_client on public.entitlement_ledger_entries;
create policy entitlement_ledger_insert_client
  on public.entitlement_ledger_entries
  for insert
  with check (client_id = auth.uid());
