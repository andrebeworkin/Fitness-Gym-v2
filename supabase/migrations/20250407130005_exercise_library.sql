-- Metadata-first exercise library (no media blobs in v1)

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  short_description text,
  machine text,
  bar_type text,
  grip text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index exercises_name_idx on public.exercises (name);
create index exercises_active_idx on public.exercises (is_active) where is_active = true;

create table public.exercise_muscle_targets (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  muscle text not null,
  is_primary boolean not null default true,
  unique (exercise_id, muscle)
);

create index exercise_muscle_targets_exercise_idx on public.exercise_muscle_targets (exercise_id);

create table public.exercise_alternatives (
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  alternative_exercise_id uuid not null references public.exercises (id) on delete cascade,
  note text,
  primary key (exercise_id, alternative_exercise_id),
  constraint exercise_alternatives_no_self check (exercise_id <> alternative_exercise_id)
);

create table public.exercise_progressions (
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  progression_exercise_id uuid not null references public.exercises (id) on delete cascade,
  note text,
  primary key (exercise_id, progression_exercise_id),
  constraint exercise_progressions_no_self check (exercise_id <> progression_exercise_id)
);

create table public.exercise_regressions (
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  regression_exercise_id uuid not null references public.exercises (id) on delete cascade,
  note text,
  primary key (exercise_id, regression_exercise_id),
  constraint exercise_regressions_no_self check (exercise_id <> regression_exercise_id)
);
