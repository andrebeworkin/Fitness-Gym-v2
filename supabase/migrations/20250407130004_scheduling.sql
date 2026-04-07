-- Staff shifts (presence) vs client appointments (booked training) — strictly separate.

create table public.staff_shifts (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.profiles (id) on delete cascade,
  location_id uuid not null references public.gym_locations (id) on delete restrict,
  shift_date date not null,
  start_time time not null,
  end_time time not null,
  notes text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint staff_shifts_time_chk check (end_time > start_time)
);

create index staff_shifts_staff_date_idx on public.staff_shifts (staff_id, shift_date);

-- Discrete bookable windows (30-minute slots) — manager defines trainer availability
create table public.trainer_availability_slots (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.profiles (id) on delete cascade,
  location_id uuid not null references public.gym_locations (id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  is_open boolean not null default true,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trainer_availability_slots_duration_chk check (
    ends_at = starts_at + interval '30 minutes'
  )
);

create index trainer_availability_slots_trainer_idx on public.trainer_availability_slots (trainer_id, starts_at);
create index trainer_availability_slots_open_idx on public.trainer_availability_slots (location_id, starts_at)
where is_open = true;

-- Client-facing appointments (may reference originating availability slot)
create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.gym_locations (id) on delete restrict,
  client_id uuid not null references public.profiles (id) on delete cascade,
  primary_trainer_id uuid not null references public.profiles (id) on delete restrict,
  substitute_trainer_id uuid references public.profiles (id) on delete set null,
  availability_slot_id uuid references public.trainer_availability_slots (id) on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.appointment_status not null default 'scheduled',
  attendance_marked_at timestamptz,
  attendance_marked_by uuid references public.profiles (id),
  no_show boolean not null default false,
  cancel_reason text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointments_duration_chk check (ends_at = starts_at + interval '30 minutes')
);

create index appointments_client_idx on public.appointments (client_id, starts_at desc);
create index appointments_trainer_idx on public.appointments (primary_trainer_id, starts_at desc);
create index appointments_location_idx on public.appointments (location_id, starts_at desc);

-- Optional audit trail for reschedules / cancellations
create table public.appointment_change_requests (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments (id) on delete cascade,
  requested_by uuid references public.profiles (id),
  request_type text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  resolved_at timestamptz,
  resolved_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index appointment_change_requests_appt_idx on public.appointment_change_requests (appointment_id);
