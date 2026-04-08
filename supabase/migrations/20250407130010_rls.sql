-- Row Level Security — uses SECURITY DEFINER helpers to avoid recursion on profiles

-- Helper functions (bypass RLS on profiles when needed)
create or replace function public.is_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'manager'
      and p.deleted_at is null
  );
$$;

create or replace function public.is_trainer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'trainer'
      and p.deleted_at is null
  );
$$;

create or replace function public.is_client()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'client'
      and p.deleted_at is null
  );
$$;

create or replace function public.trainer_has_client_access(target_client uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.trainer_client_assignments t
    where t.client_id = target_client
      and t.trainer_id = auth.uid()
      and t.effective_to is null
  )
  or exists (
    select 1
    from public.client_programs cp
    where cp.client_id = target_client
      and cp.primary_trainer_id = auth.uid()
      and cp.status = 'active'
  )
  or exists (
    select 1
    from public.appointments a
    where a.client_id = target_client
      and (
        a.primary_trainer_id = auth.uid()
        or a.substitute_trainer_id = auth.uid()
      )
      and a.starts_at between (now() - interval '120 days') and (now() + interval '60 days')
  );
$$;

create or replace function public.trainer_owns_appointment(appt_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.appointments a
    where a.id = appt_id
      and (
        a.primary_trainer_id = auth.uid()
        or a.substitute_trainer_id = auth.uid()
      )
  );
$$;

-- Enable RLS
alter table public.gym_locations enable row level security;
alter table public.profiles enable row level security;
alter table public.staff_location_assignments enable row level security;
alter table public.emergency_contacts enable row level security;
alter table public.client_training_preferences enable row level security;
alter table public.trainer_client_assignments enable row level security;
alter table public.membership_types enable row level security;
alter table public.client_membership_periods enable row level security;
alter table public.membership_change_history enable row level security;
alter table public.client_training_credits enable row level security;
alter table public.trainer_session_add_ons enable row level security;
alter table public.invoices enable row level security;
alter table public.payment_records enable row level security;
alter table public.receipts enable row level security;
alter table public.financial_documents enable row level security;
alter table public.client_goals enable row level security;
alter table public.client_assessments enable row level security;
alter table public.progress_photos enable row level security;
alter table public.client_incidents enable row level security;
alter table public.staff_shifts enable row level security;
alter table public.trainer_availability_slots enable row level security;
alter table public.appointments enable row level security;
alter table public.appointment_change_requests enable row level security;
alter table public.exercises enable row level security;
alter table public.exercise_muscle_targets enable row level security;
alter table public.exercise_alternatives enable row level security;
alter table public.exercise_progressions enable row level security;
alter table public.exercise_regressions enable row level security;
alter table public.program_templates enable row level security;
alter table public.program_template_weeks enable row level security;
alter table public.program_template_days enable row level security;
alter table public.program_template_day_exercises enable row level security;
alter table public.client_programs enable row level security;
alter table public.client_program_weeks enable row level security;
alter table public.client_program_days enable row level security;
alter table public.client_program_day_exercises enable row level security;
alter table public.program_change_requests enable row level security;
alter table public.exercise_substitution_rules enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.workout_session_exercises enable row level security;
alter table public.workout_set_logs enable row level security;
alter table public.staff_notes enable row level security;
alter table public.client_session_notes enable row level security;
alter table public.audit_logs enable row level security;

-- gym_locations
create policy gym_locations_select_authenticated
  on public.gym_locations for select
  to authenticated
  using (true);

create policy gym_locations_write_manager
  on public.gym_locations for all
  to authenticated
  using (public.is_manager())
  with check (public.is_manager());

-- profiles
create policy profiles_select_self
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

create policy profiles_select_manager
  on public.profiles for select
  to authenticated
  using (public.is_manager());

create policy profiles_select_trainer_visible
  on public.profiles for select
  to authenticated
  using (
    public.is_trainer()
    and (
      id = auth.uid()
      or exists (
        select 1 from public.profiles p2
        where p2.id = profiles.id
          and p2.role in ('manager', 'trainer')
      )
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
  using (public.is_manager())
  with check (public.is_manager());

-- Clients can read active staff directory (trainers/managers) for booking UX — not other clients
create policy profiles_select_staff_directory_for_clients
  on public.profiles for select
  to authenticated
  using (
    public.is_client()
    and profiles.role in ('trainer', 'manager')
    and profiles.deleted_at is null
  );

-- staff_location_assignments
create policy staff_location_assignments_select
  on public.staff_location_assignments for select
  to authenticated
  using (
    public.is_manager()
    or staff_id = auth.uid()
  );

create policy staff_location_assignments_write_manager
  on public.staff_location_assignments for all
  to authenticated
  using (public.is_manager())
  with check (public.is_manager());

-- emergency_contacts
create policy emergency_contacts_select
  on public.emergency_contacts for select
  to authenticated
  using (
    public.is_manager()
    or client_id = auth.uid()
    or public.trainer_has_client_access(client_id)
  );

create policy emergency_contacts_write_client
  on public.emergency_contacts for all
  to authenticated
  using (client_id = auth.uid())
  with check (client_id = auth.uid());

create policy emergency_contacts_write_manager
  on public.emergency_contacts for all
  to authenticated
  using (public.is_manager())
  with check (public.is_manager());

-- client_training_preferences
create policy client_training_preferences_select
  on public.client_training_preferences for select
  to authenticated
  using (
    public.is_manager()
    or client_id = auth.uid()
    or public.trainer_has_client_access(client_id)
  );

create policy client_training_preferences_write_manager
  on public.client_training_preferences for all
  to authenticated
  using (public.is_manager())
  with check (public.is_manager());

create policy client_training_preferences_write_client
  on public.client_training_preferences for update
  to authenticated
  using (client_id = auth.uid())
  with check (client_id = auth.uid());

-- trainer_client_assignments
create policy trainer_client_assignments_select
  on public.trainer_client_assignments for select
  to authenticated
  using (
    public.is_manager()
    or trainer_id = auth.uid()
    or client_id = auth.uid()
  );

create policy trainer_client_assignments_write_manager
  on public.trainer_client_assignments for all
  to authenticated
  using (public.is_manager())
  with check (public.is_manager());

-- membership_types (read-only for non-managers)
create policy membership_types_select
  on public.membership_types for select
  to authenticated
  using (true);

create policy membership_types_write_manager
  on public.membership_types for all
  to authenticated
  using (public.is_manager())
  with check (public.is_manager());

-- client_membership_periods
create policy client_membership_periods_select
  on public.client_membership_periods for select
  to authenticated
  using (
    public.is_manager()
    or client_id = auth.uid()
    or public.trainer_has_client_access(client_id)
  );

create policy client_membership_periods_write_manager
  on public.client_membership_periods for all
  to authenticated
  using (public.is_manager())
  with check (public.is_manager());

-- membership_change_history
create policy membership_change_history_select
  on public.membership_change_history for select
  to authenticated
  using (
    public.is_manager()
    or client_id = auth.uid()
    or public.trainer_has_client_access(client_id)
  );

create policy membership_change_history_write_manager
  on public.membership_change_history for insert
  to authenticated
  with check (public.is_manager());

-- client_training_credits
create policy client_training_credits_select
  on public.client_training_credits for select
  to authenticated
  using (
    public.is_manager()
    or client_id = auth.uid()
    or public.trainer_has_client_access(client_id)
  );

create policy client_training_credits_write_manager
  on public.client_training_credits for all
  to authenticated
  using (public.is_manager())
  with check (public.is_manager());

-- trainer_session_add_ons
create policy trainer_session_add_ons_select
  on public.trainer_session_add_ons for select
  to authenticated
  using (
    public.is_manager()
    or client_id = auth.uid()
  );

create policy trainer_session_add_ons_write_manager
  on public.trainer_session_add_ons for all
  to authenticated
  using (public.is_manager())
  with check (public.is_manager());

-- Billing: trainers have no access (no policies for trainer path = deny)
create policy invoices_select_client
  on public.invoices for select
  to authenticated
  using (client_id = auth.uid());

create policy invoices_all_manager
  on public.invoices for all
  to authenticated
  using (public.is_manager())
  with check (public.is_manager());

create policy payment_records_select_client
  on public.payment_records for select
  to authenticated
  using (
    exists (
      select 1 from public.invoices i
      where i.id = payment_records.invoice_id
        and i.client_id = auth.uid()
    )
  );

create policy payment_records_all_manager
  on public.payment_records for all
  to authenticated
  using (public.is_manager())
  with check (public.is_manager());

create policy receipts_select_client
  on public.receipts for select
  to authenticated
  using (
    exists (
      select 1 from public.invoices i
      where i.id = receipts.invoice_id
        and i.client_id = auth.uid()
    )
  );

create policy receipts_all_manager
  on public.receipts for all
  to authenticated
  using (public.is_manager())
  with check (public.is_manager());

create policy financial_documents_select_client
  on public.financial_documents for select
  to authenticated
  using (
    exists (
      select 1 from public.invoices i
      where i.id = financial_documents.invoice_id
        and i.client_id = auth.uid()
    )
  );

create policy financial_documents_all_manager
  on public.financial_documents for all
  to authenticated
  using (public.is_manager())
  with check (public.is_manager());

-- Health / assessments / photos / incidents
create policy client_goals_select
  on public.client_goals for select
  to authenticated
  using (
    public.is_manager()
    or client_id = auth.uid()
    or public.trainer_has_client_access(client_id)
  );

create policy client_goals_write_manager
  on public.client_goals for all
  to authenticated
  using (public.is_manager())
  with check (public.is_manager());

create policy client_goals_write_trainer
  on public.client_goals for all
  to authenticated
  using (public.is_trainer() and public.trainer_has_client_access(client_id))
  with check (public.is_trainer() and public.trainer_has_client_access(client_id));

create policy client_assessments_select
  on public.client_assessments for select
  to authenticated
  using (
    public.is_manager()
    or public.trainer_has_client_access(client_id)
    or client_id = auth.uid()
  );

create policy client_assessments_write_manager
  on public.client_assessments for all
  to authenticated
  using (public.is_manager())
  with check (public.is_manager());

create policy client_assessments_write_trainer
  on public.client_assessments for all
  to authenticated
  using (public.is_trainer() and public.trainer_has_client_access(client_id))
  with check (public.is_trainer() and public.trainer_has_client_access(client_id));

create policy progress_photos_select
  on public.progress_photos for select
  to authenticated
  using (
    public.is_manager()
    or (
      client_id = auth.uid()
      and coalesce(visibility_client, true)
    )
    or (
      public.trainer_has_client_access(client_id)
      and coalesce(visibility_client, true)
    )
  );

create policy progress_photos_insert
  on public.progress_photos for insert
  to authenticated
  with check (
    public.is_manager()
    or (
      client_id = auth.uid()
      and uploaded_by = auth.uid()
    )
  );

create policy progress_photos_update_manager
  on public.progress_photos for update
  to authenticated
  using (public.is_manager())
  with check (public.is_manager());

create policy progress_photos_delete_manager
  on public.progress_photos for delete
  to authenticated
  using (public.is_manager());

create policy client_incidents_select
  on public.client_incidents for select
  to authenticated
  using (
    public.is_manager()
    or public.trainer_has_client_access(client_id)
  );

create policy client_incidents_insert
  on public.client_incidents for insert
  to authenticated
  with check (
    public.is_manager()
    or (
      public.is_trainer()
      and public.trainer_has_client_access(client_id)
    )
  );

create policy client_incidents_update_manager
  on public.client_incidents for update
  to authenticated
  using (public.is_manager())
  with check (public.is_manager());

-- Scheduling
create policy staff_shifts_select
  on public.staff_shifts for select
  to authenticated
  using (
    public.is_manager()
    or staff_id = auth.uid()
  );

create policy staff_shifts_write_manager
  on public.staff_shifts for all
  to authenticated
  using (public.is_manager())
  with check (public.is_manager());

create policy trainer_availability_select
  on public.trainer_availability_slots for select
  to authenticated
  using (
    public.is_manager()
    or trainer_id = auth.uid()
    or public.is_client()
  );

create policy trainer_availability_write_manager
  on public.trainer_availability_slots for all
  to authenticated
  using (public.is_manager())
  with check (public.is_manager());

create policy appointments_select
  on public.appointments for select
  to authenticated
  using (
    public.is_manager()
    or client_id = auth.uid()
    or primary_trainer_id = auth.uid()
    or substitute_trainer_id = auth.uid()
  );

create policy appointments_insert_manager
  on public.appointments for insert
  to authenticated
  with check (public.is_manager());

create policy appointments_insert_client
  on public.appointments for insert
  to authenticated
  with check (
    public.is_client()
    and client_id = auth.uid()
  );

create policy appointments_update_manager
  on public.appointments for update
  to authenticated
  using (public.is_manager())
  with check (public.is_manager());

create policy appointments_update_trainer
  on public.appointments for update
  to authenticated
  using (public.trainer_owns_appointment(id))
  with check (public.trainer_owns_appointment(id));

create policy appointment_change_requests_all
  on public.appointment_change_requests for all
  to authenticated
  using (
    public.is_manager()
    or exists (
      select 1 from public.appointments a
      where a.id = appointment_change_requests.appointment_id
        and (
          a.client_id = auth.uid()
          or a.primary_trainer_id = auth.uid()
          or a.substitute_trainer_id = auth.uid()
        )
    )
  )
  with check (
    public.is_manager()
    or exists (
      select 1 from public.appointments a
      where a.id = appointment_change_requests.appointment_id
        and (
          a.client_id = auth.uid()
          or a.primary_trainer_id = auth.uid()
          or a.substitute_trainer_id = auth.uid()
        )
    )
  );

-- Exercise library
create policy exercises_select
  on public.exercises for select
  to authenticated
  using (true);

create policy exercises_write_manager
  on public.exercises for all
  to authenticated
  using (public.is_manager())
  with check (public.is_manager());

create policy exercise_related_select
  on public.exercise_muscle_targets for select
  to authenticated
  using (true);

create policy exercise_related_write_manager
  on public.exercise_muscle_targets for all
  to authenticated
  using (public.is_manager())
  with check (public.is_manager());

create policy exercise_graph_select
  on public.exercise_alternatives for select
  to authenticated
  using (true);

create policy exercise_graph_write_manager
  on public.exercise_alternatives for all
  to authenticated
  using (public.is_manager())
  with check (public.is_manager());

create policy exercise_prog_select
  on public.exercise_progressions for select
  to authenticated
  using (true);

create policy exercise_prog_write_manager
  on public.exercise_progressions for all
  to authenticated
  using (public.is_manager())
  with check (public.is_manager());

create policy exercise_regr_select
  on public.exercise_regressions for select
  to authenticated
  using (true);

create policy exercise_regr_write_manager
  on public.exercise_regressions for all
  to authenticated
  using (public.is_manager())
  with check (public.is_manager());

-- Program templates
create policy program_templates_select
  on public.program_templates for select
  to authenticated
  using (true);

create policy program_templates_write_manager
  on public.program_templates for all
  to authenticated
  using (public.is_manager())
  with check (public.is_manager());

create policy program_template_children_select
  on public.program_template_weeks for select
  to authenticated
  using (true);

create policy program_template_weeks_write_manager
  on public.program_template_weeks for all
  to authenticated
  using (public.is_manager())
  with check (public.is_manager());

create policy program_template_days_select
  on public.program_template_days for select
  to authenticated
  using (true);

create policy program_template_days_write_manager
  on public.program_template_days for all
  to authenticated
  using (public.is_manager())
  with check (public.is_manager());

create policy program_template_day_ex_select
  on public.program_template_day_exercises for select
  to authenticated
  using (true);

create policy program_template_day_ex_write_manager
  on public.program_template_day_exercises for all
  to authenticated
  using (public.is_manager())
  with check (public.is_manager());

-- Client programs (prescription)
create policy client_programs_select
  on public.client_programs for select
  to authenticated
  using (
    public.is_manager()
    or client_id = auth.uid()
    or public.trainer_has_client_access(client_id)
  );

create policy client_programs_write_manager
  on public.client_programs for all
  to authenticated
  using (public.is_manager())
  with check (public.is_manager());

create policy client_program_children_select
  on public.client_program_weeks for select
  to authenticated
  using (
    exists (
      select 1 from public.client_programs cp
      where cp.id = client_program_weeks.program_id
        and (
          public.is_manager()
          or cp.client_id = auth.uid()
          or public.trainer_has_client_access(cp.client_id)
        )
    )
  );

create policy client_program_weeks_write_manager
  on public.client_program_weeks for all
  to authenticated
  using (public.is_manager())
  with check (public.is_manager());

create policy client_program_days_select
  on public.client_program_days for select
  to authenticated
  using (
    exists (
      select 1
      from public.client_program_weeks w
      join public.client_programs cp on cp.id = w.program_id
      where w.id = client_program_days.week_id
        and (
          public.is_manager()
          or cp.client_id = auth.uid()
          or public.trainer_has_client_access(cp.client_id)
        )
    )
  );

create policy client_program_days_write_manager
  on public.client_program_days for all
  to authenticated
  using (public.is_manager())
  with check (public.is_manager());

create policy client_program_day_ex_select
  on public.client_program_day_exercises for select
  to authenticated
  using (
    exists (
      select 1
      from public.client_program_days d
      join public.client_program_weeks w on w.id = d.week_id
      join public.client_programs cp on cp.id = w.program_id
      where d.id = client_program_day_exercises.day_id
        and (
          public.is_manager()
          or cp.client_id = auth.uid()
          or public.trainer_has_client_access(cp.client_id)
        )
    )
  );

create policy client_program_day_ex_write_manager
  on public.client_program_day_exercises for all
  to authenticated
  using (public.is_manager())
  with check (public.is_manager());

-- Program change requests
create policy program_change_requests_select
  on public.program_change_requests for select
  to authenticated
  using (
    public.is_manager()
    or requested_by = auth.uid()
    or exists (
      select 1 from public.client_programs cp
      where cp.id = program_change_requests.client_program_id
        and public.trainer_has_client_access(cp.client_id)
    )
  );

create policy program_change_requests_insert_trainer
  on public.program_change_requests for insert
  to authenticated
  with check (
    public.is_trainer()
    and requested_by = auth.uid()
    and exists (
      select 1 from public.client_programs cp
      where cp.id = client_program_id
        and public.trainer_has_client_access(cp.client_id)
        and cp.author_kind = 'manager'
    )
  );

create policy program_change_requests_update_manager
  on public.program_change_requests for update
  to authenticated
  using (public.is_manager())
  with check (public.is_manager());

create policy exercise_substitution_rules_select
  on public.exercise_substitution_rules for select
  to authenticated
  using (true);

create policy exercise_substitution_rules_write_manager
  on public.exercise_substitution_rules for all
  to authenticated
  using (public.is_manager())
  with check (public.is_manager());

-- Workout execution
create policy workout_sessions_select
  on public.workout_sessions for select
  to authenticated
  using (
    public.is_manager()
    or client_id = auth.uid()
    or public.trainer_has_client_access(client_id)
    or trainer_id = auth.uid()
  );

create policy workout_sessions_insert
  on public.workout_sessions for insert
  to authenticated
  with check (
    public.is_manager()
    or (
      client_id = auth.uid()
      and public.is_client()
    )
    or (
      public.is_trainer()
      and public.trainer_has_client_access(client_id)
    )
  );

create policy workout_sessions_update
  on public.workout_sessions for update
  to authenticated
  using (
    public.is_manager()
    or (
      client_id = auth.uid()
      and public.is_client()
    )
    or (
      public.is_trainer()
      and public.trainer_has_client_access(client_id)
    )
  )
  with check (
    public.is_manager()
    or (
      client_id = auth.uid()
      and public.is_client()
    )
    or (
      public.is_trainer()
      and public.trainer_has_client_access(client_id)
    )
  );

create policy workout_session_exercises_all
  on public.workout_session_exercises for all
  to authenticated
  using (
    exists (
      select 1 from public.workout_sessions s
      where s.id = workout_session_exercises.session_id
        and (
          public.is_manager()
          or s.client_id = auth.uid()
          or public.trainer_has_client_access(s.client_id)
          or s.trainer_id = auth.uid()
        )
    )
  )
  with check (
    exists (
      select 1 from public.workout_sessions s
      where s.id = workout_session_exercises.session_id
        and (
          public.is_manager()
          or s.client_id = auth.uid()
          or public.trainer_has_client_access(s.client_id)
          or s.trainer_id = auth.uid()
        )
    )
  );

create policy workout_set_logs_all
  on public.workout_set_logs for all
  to authenticated
  using (
    exists (
      select 1
      from public.workout_session_exercises e
      join public.workout_sessions s on s.id = e.session_id
      where e.id = workout_set_logs.session_exercise_id
        and (
          public.is_manager()
          or s.client_id = auth.uid()
          or public.trainer_has_client_access(s.client_id)
          or s.trainer_id = auth.uid()
        )
    )
  )
  with check (
    exists (
      select 1
      from public.workout_session_exercises e
      join public.workout_sessions s on s.id = e.session_id
      where e.id = workout_set_logs.session_exercise_id
        and (
          public.is_manager()
          or s.client_id = auth.uid()
          or public.trainer_has_client_access(s.client_id)
          or s.trainer_id = auth.uid()
        )
    )
  );

-- Notes
create policy staff_notes_select
  on public.staff_notes for select
  to authenticated
  using (
    public.is_manager()
    or (
      audience = 'staff_internal'
      and (
        public.is_trainer()
        and public.trainer_has_client_access(client_id)
      )
    )
    or (
      audience = 'manager_only'
      and public.is_manager()
    )
  );

create policy staff_notes_insert
  on public.staff_notes for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and (
      (
        public.is_manager()
      )
      or (
        public.is_trainer()
        and audience = 'staff_internal'
        and public.trainer_has_client_access(client_id)
      )
    )
  );

create policy staff_notes_update
  on public.staff_notes for update
  to authenticated
  using (
    author_id = auth.uid()
    or public.is_manager()
  )
  with check (
    public.is_manager()
    or author_id = auth.uid()
  );

create policy staff_notes_delete_manager
  on public.staff_notes for delete
  to authenticated
  using (public.is_manager());

create policy client_session_notes_select
  on public.client_session_notes for select
  to authenticated
  using (
    public.is_manager()
    or client_id = auth.uid()
    or public.trainer_has_client_access(client_id)
  );

create policy client_session_notes_write
  on public.client_session_notes for all
  to authenticated
  using (
    public.is_manager()
    or (
      client_id = auth.uid()
      and public.is_client()
    )
    or (
      public.is_trainer()
      and public.trainer_has_client_access(client_id)
    )
  )
  with check (
    public.is_manager()
    or (
      client_id = auth.uid()
      and public.is_client()
    )
    or (
      public.is_trainer()
      and public.trainer_has_client_access(client_id)
    )
  );

-- audit_logs
create policy audit_logs_insert
  on public.audit_logs for insert
  to authenticated
  with check (actor_id = auth.uid() or public.is_manager());

create policy audit_logs_select_manager
  on public.audit_logs for select
  to authenticated
  using (public.is_manager());
