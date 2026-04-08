-- Profiles, locations, emergency contacts, staff day assignments, client preferences

create table public.gym_locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  address_line1 text,
  address_line2 text,
  city text,
  region text,
  postal_code text,
  timezone text not null default 'America/New_York',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.app_role not null default 'client',
  display_name text not null,
  email text,
  phone text,
  date_of_birth date,
  sex text,
  primary_location_id uuid references public.gym_locations (id),
  avatar_url text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_sex_chk check (
    sex is null
    or sex in ('female', 'male', 'non_binary', 'prefer_not', 'other')
  )
);

create index profiles_role_idx on public.profiles (role);
create index profiles_primary_location_idx on public.profiles (primary_location_id)
where deleted_at is null;

-- Manager allocates which location a staff member works on a given calendar day
create table public.staff_location_assignments (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.profiles (id) on delete cascade,
  location_id uuid not null references public.gym_locations (id) on delete restrict,
  work_date date not null,
  notes text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (staff_id, work_date)
);

create index staff_location_assignments_date_idx on public.staff_location_assignments (work_date);
create index staff_location_assignments_staff_idx on public.staff_location_assignments (staff_id);

create table public.emergency_contacts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  full_name text not null,
  relationship text,
  phone text not null,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index emergency_contacts_client_idx on public.emergency_contacts (client_id);

-- Client-visible preference flags (manager-controlled for v1)
create table public.client_training_preferences (
  client_id uuid primary key references public.profiles (id) on delete cascade,
  show_plan_history boolean not null default true,
  allow_self_log boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Primary / coverage trainer assignments (Private membership focus; optional for Semi-Private)
create table public.trainer_client_assignments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  trainer_id uuid not null references public.profiles (id) on delete cascade,
  is_primary boolean not null default false,
  effective_from date not null default (current_date),
  effective_to date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index trainer_client_assignments_client_idx on public.trainer_client_assignments (client_id);
create index trainer_client_assignments_trainer_idx on public.trainer_client_assignments (trainer_id);
create index trainer_client_assignments_active_idx on public.trainer_client_assignments (client_id, trainer_id)
where effective_to is null;
