-- Reusable templates + per-client prescribed trees (immutable history via new program rows / ended assignments)

create table public.program_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  duration_weeks int,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.program_template_weeks (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.program_templates (id) on delete cascade,
  week_number int not null check (week_number > 0),
  label text,
  unique (template_id, week_number)
);

create table public.program_template_days (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references public.program_template_weeks (id) on delete cascade,
  day_number int not null check (day_number > 0),
  label text,
  unique (week_id, day_number)
);

create table public.program_template_day_exercises (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references public.program_template_days (id) on delete cascade,
  sequence int not null check (sequence > 0),
  exercise_id uuid not null references public.exercises (id) on delete restrict,
  superset_group text,
  prescribed_sets int,
  prescribed_reps text,
  rest_seconds int,
  tempo text,
  target_rpe numeric(4, 1),
  notes text,
  unique (day_id, sequence)
);

-- Assigned program instance for a client (prescription lives in child tables — NOT workout logs)
create table public.client_programs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  template_id uuid references public.program_templates (id) on delete set null,
  name text not null,
  start_date date not null,
  end_date date,
  ended_at timestamptz,
  status public.client_program_status not null default 'active',
  author_kind public.program_author_kind not null default 'manager',
  manager_author_id uuid references public.profiles (id),
  primary_trainer_id uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_programs_dates_chk check (
    end_date is null
    or end_date >= start_date
  )
);

create index client_programs_client_idx on public.client_programs (client_id);
create unique index client_programs_one_active
  on public.client_programs (client_id)
  where status = 'active';

create table public.client_program_weeks (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.client_programs (id) on delete cascade,
  week_number int not null check (week_number > 0),
  label text,
  unique (program_id, week_number)
);

create table public.client_program_days (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references public.client_program_weeks (id) on delete cascade,
  day_number int not null check (day_number > 0),
  label text,
  unique (week_id, day_number)
);

create table public.client_program_day_exercises (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references public.client_program_days (id) on delete cascade,
  sequence int not null check (sequence > 0),
  exercise_id uuid not null references public.exercises (id) on delete restrict,
  superset_group text,
  prescribed_sets int,
  prescribed_reps text,
  rest_seconds int,
  tempo text,
  target_rpe numeric(4, 1),
  notes text,
  unique (day_id, sequence)
);

-- Trainer-proposed modifications to manager-authored programs — no silent mutation
create table public.program_change_requests (
  id uuid primary key default gen_random_uuid(),
  client_program_id uuid not null references public.client_programs (id) on delete cascade,
  requested_by uuid not null references public.profiles (id),
  status public.program_change_request_status not null default 'pending',
  request_summary text,
  payload jsonb not null default '{}'::jsonb,
  manager_decision_note text,
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index program_change_requests_program_idx on public.program_change_requests (client_program_id, status);

-- Optional explicit substitution pairing metadata for analytics (sessions still store actual performed exercise)
create table public.exercise_substitution_rules (
  id uuid primary key default gen_random_uuid(),
  base_exercise_id uuid not null references public.exercises (id) on delete cascade,
  substitute_exercise_id uuid not null references public.exercises (id) on delete cascade,
  requires_same_target_muscle boolean not null default true,
  note text,
  unique (base_exercise_id, substitute_exercise_id),
  constraint exercise_substitution_rules_no_self check (base_exercise_id <> substitute_exercise_id)
);
