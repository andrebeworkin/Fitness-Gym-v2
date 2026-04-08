-- Goals, assessments (versioned), progress photos (storage paths), operational incidents

create table public.client_goals (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  detail text,
  target_date date,
  is_active boolean not null default true,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index client_goals_client_idx on public.client_goals (client_id);

-- Immutable assessment versions — new row per assessment event
create table public.client_assessments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  assessed_at timestamptz not null default now(),
  assessor_id uuid references public.profiles (id),
  location_id uuid references public.gym_locations (id),
  summary text,
  body text,
  metrics jsonb,
  supersedes_assessment_id uuid references public.client_assessments (id),
  created_at timestamptz not null default now()
);

create index client_assessments_client_idx on public.client_assessments (client_id, assessed_at desc);

-- Before / after progress photos (binaries in Storage)
create table public.progress_photos (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  taken_on date not null default (current_date),
  caption text,
  visibility_client boolean not null default true,
  storage_bucket text not null,
  storage_path text not null,
  uploaded_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index progress_photos_client_idx on public.progress_photos (client_id, taken_on desc);

-- Operational / safety flags (distinct from free-text session journal)
create table public.client_incidents (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  session_id uuid,
  appointment_id uuid,
  reported_by uuid references public.profiles (id),
  kind public.incident_kind not null,
  description text,
  created_at timestamptz not null default now()
);

create index client_incidents_client_idx on public.client_incidents (client_id, created_at desc);

-- FKs to workout_sessions / appointments added in later migration after those tables exist
