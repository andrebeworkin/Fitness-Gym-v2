-- Completed work — separate from prescription tables

create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  client_program_id uuid references public.client_programs (id) on delete set null,
  client_program_day_id uuid references public.client_program_days (id) on delete set null,
  location_id uuid references public.gym_locations (id),
  trainer_id uuid references public.profiles (id),
  appointment_id uuid references public.appointments (id) on delete set null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status public.workout_session_status not null default 'in_progress',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index workout_sessions_client_idx on public.workout_sessions (client_id, started_at desc);
create index workout_sessions_trainer_idx on public.workout_sessions (trainer_id, started_at desc);

create table public.workout_session_exercises (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_sessions (id) on delete cascade,
  sequence int not null check (sequence > 0),
  prescribed_line_id uuid references public.client_program_day_exercises (id) on delete set null,
  performed_exercise_id uuid not null references public.exercises (id) on delete restrict,
  substituted boolean not null default false,
  substitution_note text,
  similar_muscle_group_asserted boolean,
  created_at timestamptz not null default now(),
  unique (session_id, sequence)
);

create index workout_session_exercises_session_idx on public.workout_session_exercises (session_id);

create table public.workout_set_logs (
  id uuid primary key default gen_random_uuid(),
  session_exercise_id uuid not null references public.workout_session_exercises (id) on delete cascade,
  set_number int not null check (set_number > 0),
  performed_reps int,
  performed_weight_kg numeric(8, 2),
  performed_rpe numeric(4, 1),
  performed_rest_seconds int,
  skipped boolean not null default false,
  skip_reason text,
  created_at timestamptz not null default now(),
  unique (session_exercise_id, set_number)
);

-- Staff-only vs manager-only notes (clients never see these)
create table public.staff_notes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  session_id uuid references public.workout_sessions (id) on delete cascade,
  audience public.staff_note_audience not null default 'staff_internal',
  author_id uuid not null references public.profiles (id),
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index staff_notes_client_idx on public.staff_notes (client_id, created_at desc);

-- Client-visible session journal (pain / discomfort / skipped — visible to client + authorized staff)
create table public.client_session_notes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_sessions (id) on delete cascade,
  client_id uuid not null references public.profiles (id) on delete cascade,
  author_id uuid references public.profiles (id),
  body text,
  pain_reported boolean not null default false,
  discomfort_reported boolean not null default false,
  skipped_exercises_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index client_session_notes_session_idx on public.client_session_notes (session_id);

-- Link incidents to sessions / appointments now that parent tables exist
alter table public.client_incidents
  add constraint client_incidents_session_fk
  foreign key (session_id) references public.workout_sessions (id) on delete set null;

alter table public.client_incidents
  add constraint client_incidents_appointment_fk
  foreign key (appointment_id) references public.appointments (id) on delete set null;
