-- updated_at maintenance, auth profile bootstrap, availability slot closure on booking

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'gym_locations',
    'profiles',
    'staff_location_assignments',
    'emergency_contacts',
    'client_training_preferences',
    'trainer_client_assignments',
    'membership_types',
    'client_membership_periods',
    'invoices',
    'staff_shifts',
    'trainer_availability_slots',
    'appointments',
    'exercises',
    'program_templates',
    'client_programs',
    'program_change_requests',
    'workout_sessions',
    'staff_notes',
    'client_session_notes'
  ]
  loop
    execute format(
      'drop trigger if exists trg_%I_updated_at on public.%I',
      tbl,
      tbl
    );
    execute format(
      'create trigger trg_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      tbl,
      tbl
    );
  end loop;
end;
$$;

-- New auth users → profile row (default role client; promote staff via admin)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    new.email,
    'client'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

-- When appointment consumes a slot, mark slot closed
create or replace function public.close_availability_slot_on_booking()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.availability_slot_id is not null then
    update public.trainer_availability_slots
    set is_open = false, updated_at = now()
    where id = new.availability_slot_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_appointment_close_slot on public.appointments;

create trigger trg_appointment_close_slot
after insert on public.appointments
for each row
execute function public.close_availability_slot_on_booking();
