-- Demo seed for Formula 4 Fitness (run after `supabase db reset` migrations).
--
-- Prerequisite: create these Auth users first (same passwords as your dev policy).
-- Emails must match exactly; the auth trigger will have created `profiles` rows.
--
-- | Email                              | Final role |
-- |-----------------------------------|------------|
-- | manager@demo.formula4.fitness     | manager    |
-- | trainer1@demo.formula4.fitness   | trainer    |
-- | trainer2@demo.formula4.fitness   | trainer    |
-- | trainer3@demo.formula4.fitness   | trainer (optional) |
-- | client.open@demo.formula4.fitness | client     |
-- | client.semi@demo.formula4.fitness | client     |
-- | client.private@demo.formula4.fitness | client  |
-- | client.extra@demo.formula4.fitness  | client (optional second open-gym) |
-- | client.semi2@demo.formula4.fitness  | client (optional second semi-private) |
-- | client.private2@demo.formula4.fitness | client (optional second private) |
--
-- Then: psql or Supabase SQL editor → run this file, OR `supabase db reset` loads it automatically.

begin;

-- Locations (idempotent by code)
insert into public.gym_locations (name, code, city, region, timezone)
values
  ('Formula 4 — Bridge District', 'BRG', 'Columbus', 'OH', 'America/New_York'),
  ('Formula 4 — River North', 'RVN', 'Columbus', 'OH', 'America/New_York')
on conflict (code) do nothing;

-- Membership types (locked product names)
insert into public.membership_types (name, slug, description, sort_order)
values
  ('Open Gym Membership', 'open_gym', 'Facility access; no custom plan.', 10),
  ('Semi-Private Membership', 'semi_private', 'Custom plan; one complimentary 30-min; add-ons.', 20),
  ('Private Membership', 'private', 'Assessment, assigned trainer, appointments, self-logging.', 30)
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  sort_order = excluded.sort_order;

-- Exercises + targets
insert into public.exercises (id, name, short_description, machine, bar_type, grip)
values
  ('c1000001-0000-4000-8000-000000000001', 'Trap-bar deadlift', 'Hip hinge strength', 'Trap bar', 'Trap', 'Neutral'),
  ('c1000001-0000-4000-8000-000000000002', 'Half-kneeling cable row', 'Scapular control', 'Cable stack', 'N/A', 'Neutral'),
  ('c1000001-0000-4000-8000-000000000003', 'Pallof press', 'Anti-rotation core', 'Cable stack', 'N/A', 'Neutral')
on conflict (id) do nothing;

insert into public.exercise_muscle_targets (exercise_id, muscle, is_primary)
values
  ('c1000001-0000-4000-8000-000000000001', 'glutes', true),
  ('c1000001-0000-4000-8000-000000000001', 'hamstrings', false),
  ('c1000001-0000-4000-8000-000000000002', 'lats', true),
  ('c1000001-0000-4000-8000-000000000002', 'mid_back', false),
  ('c1000001-0000-4000-8000-000000000003', 'core', true)
on conflict (exercise_id, muscle) do nothing;

insert into public.exercise_alternatives (exercise_id, alternative_exercise_id, note)
values
  ('c1000001-0000-4000-8000-000000000001', 'c1000001-0000-4000-8000-000000000002', 'If back sensitivity — row pattern instead')
on conflict (exercise_id, alternative_exercise_id) do nothing;

-- Program template (manager-owned content)
insert into public.program_templates (id, name, description, duration_weeks)
values
  ('d2000001-0000-4000-8000-000000000001', 'Strength Base 8w', 'Foundational strength template', 8)
on conflict (id) do nothing;

insert into public.program_template_weeks (id, template_id, week_number, label)
values
  ('d2000002-0000-4000-8000-000000000001', 'd2000001-0000-4000-8000-000000000001', 1, 'Week 1')
on conflict (id) do nothing;

insert into public.program_template_days (id, week_id, day_number, label)
values
  ('d2000003-0000-4000-8000-000000000001', 'd2000002-0000-4000-8000-000000000001', 1, 'Day A')
on conflict (id) do nothing;

insert into public.program_template_day_exercises (id, day_id, sequence, exercise_id, prescribed_sets, prescribed_reps, rest_seconds, tempo, target_rpe)
values
  ('d2000004-0000-4000-8000-000000000001', 'd2000003-0000-4000-8000-000000000001', 1, 'c1000001-0000-4000-8000-000000000001', 4, '6-8', 120, '31X1', 8.0),
  ('d2000004-0000-4000-8000-000000000002', 'd2000003-0000-4000-8000-000000000001', 2, 'c1000001-0000-4000-8000-000000000002', 3, '10-12', 90, null, 7.5)
on conflict (id) do nothing;

-- Role elevation + demographics (requires auth users)
do $$
declare
  loc_brg uuid;
  loc_rvn uuid;
  mgr uuid;
  t1 uuid;
  t2 uuid;
  c_open uuid;
  c_semi uuid;
  c_priv uuid;
  mt_open uuid;
  mt_semi uuid;
  mt_priv uuid;
  period_semi uuid;
  period_priv uuid;
  cp_semi uuid;
  cp_priv uuid;
  cpw uuid;
  cpd uuid;
  appt_slot timestamptz;
begin
  select id into loc_brg from public.gym_locations where code = 'BRG' limit 1;
  select id into loc_rvn from public.gym_locations where code = 'RVN' limit 1;
  select id into mgr from auth.users where email = 'manager@demo.formula4.fitness' limit 1;
  select id into t1 from auth.users where email = 'trainer1@demo.formula4.fitness' limit 1;
  select id into t2 from auth.users where email = 'trainer2@demo.formula4.fitness' limit 1;
  select id into c_open from auth.users where email = 'client.open@demo.formula4.fitness' limit 1;
  select id into c_semi from auth.users where email = 'client.semi@demo.formula4.fitness' limit 1;
  select id into c_priv from auth.users where email = 'client.private@demo.formula4.fitness' limit 1;

  if mgr is null then
    raise notice 'Seed: create Auth user manager@demo.formula4.fitness first — skipping persona data.';
    return;
  end if;

  select id into mt_open from public.membership_types where slug = 'open_gym' limit 1;
  select id into mt_semi from public.membership_types where slug = 'semi_private' limit 1;
  select id into mt_priv from public.membership_types where slug = 'private' limit 1;

  update public.profiles set
    role = 'manager',
    display_name = 'Alex Morgan',
    primary_location_id = loc_brg,
    phone = '+16145550100',
    date_of_birth = '1985-03-12',
    sex = 'female'
  where id = mgr;

  if t1 is not null then
    update public.profiles set
      role = 'trainer',
      display_name = 'Jordan Lee',
      primary_location_id = loc_brg,
      phone = '+16145550101',
      date_of_birth = '1990-07-22',
      sex = 'male'
    where id = t1;
  end if;

  if t2 is not null then
    update public.profiles set
      role = 'trainer',
      display_name = 'Riley Chen',
      primary_location_id = loc_rvn,
      phone = '+16145550102',
      date_of_birth = '1992-11-05',
      sex = 'non_binary'
    where id = t2;
  end if;

  if c_open is not null then
    update public.profiles set
      role = 'client',
      display_name = 'Sam Rivera',
      primary_location_id = loc_brg,
      phone = '+16145550200',
      date_of_birth = '1996-01-18',
      sex = 'male'
    where id = c_open;

    update public.client_membership_periods
    set status = 'superseded', effective_to = coalesce(effective_to, now())
    where client_id = c_open and status = 'active';

    insert into public.client_membership_periods (client_id, membership_type_id, effective_from, status, billing_month)
    values (c_open, mt_open, now() - interval '40 days', 'active', date_trunc('month', now())::date);

    delete from public.emergency_contacts where client_id = c_open;
    insert into public.emergency_contacts (client_id, full_name, relationship, phone, is_primary)
    values (c_open, 'Jamie Rivera', 'Spouse', '+16145550201', true);
  end if;

  if c_semi is not null then
    update public.profiles set
      role = 'client',
      display_name = 'Taylor Brooks',
      primary_location_id = loc_rvn,
      phone = '+16145550210',
      date_of_birth = '1988-09-30',
      sex = 'female'
    where id = c_semi;

    delete from public.membership_change_history where client_id = c_semi;
    delete from public.client_training_credits where client_id = c_semi;
    delete from public.trainer_session_add_ons where client_id = c_semi;

    update public.client_membership_periods
    set status = 'superseded', effective_to = coalesce(effective_to, now())
    where client_id = c_semi and status = 'active';

    insert into public.client_membership_periods (client_id, membership_type_id, effective_from, effective_to, status)
    values (c_semi, mt_semi, now() - interval '70 days', now() - interval '36 days', 'superseded');

    insert into public.client_membership_periods (id, client_id, membership_type_id, effective_from, status, billing_month)
    values ('e3000001-0000-4000-8000-000000000001', c_semi, mt_semi, now() - interval '35 days', 'active', date_trunc('month', now())::date);

    period_semi := 'e3000001-0000-4000-8000-000000000001';

    insert into public.membership_change_history (client_id, from_membership_type_id, to_membership_type_id, changed_by, reason, related_period_id)
    values (c_semi, mt_semi, mt_semi, mgr, 'Demo: renewed period boundary same tier', period_semi);

    insert into public.client_training_credits (client_id, membership_period_id, kind, quantity, label)
    values (c_semi, period_semi, 'complimentary_30', 1, 'Semi-Private monthly complimentary');

    insert into public.trainer_session_add_ons (client_id, membership_period_id, sessions_purchased, unit_amount_cents, notes, created_by)
    values (c_semi, period_semi, 2, 4500, 'Pack of two 30-min add-ons', mgr);

    if t1 is not null then
      delete from public.trainer_client_assignments where client_id = c_semi and trainer_id = t1;
      insert into public.trainer_client_assignments (client_id, trainer_id, is_primary, effective_from)
      values (c_semi, t1, false, current_date - 20);
    end if;

    delete from public.program_change_requests where client_program_id = 'f4000001-0000-4000-8000-000000000001';
    delete from public.client_programs where id = 'f4000001-0000-4000-8000-000000000001';

    -- Active program (manager-authored)
    insert into public.client_programs (id, client_id, template_id, name, start_date, end_date, status, author_kind, manager_author_id)
    values ('f4000001-0000-4000-8000-000000000001', c_semi, 'd2000001-0000-4000-8000-000000000001', 'Strength Base — Taylor', current_date - 14, current_date + 50, 'active', 'manager', mgr)
    on conflict (id) do nothing;

    select id into cp_semi from public.client_programs where id = 'f4000001-0000-4000-8000-000000000001';

    insert into public.client_program_weeks (id, program_id, week_number, label)
    values ('f4000002-0000-4000-8000-000000000001', cp_semi, 1, 'Week 1')
    on conflict (id) do nothing;

    select id into cpw from public.client_program_weeks where id = 'f4000002-0000-4000-8000-000000000001';

    insert into public.client_program_days (id, week_id, day_number, label)
    values ('f4000003-0000-4000-8000-000000000001', cpw, 1, 'Day A')
    on conflict (id) do nothing;

    select id into cpd from public.client_program_days where id = 'f4000003-0000-4000-8000-000000000001';

    insert into public.client_program_day_exercises (id, day_id, sequence, exercise_id, prescribed_sets, prescribed_reps, rest_seconds, tempo, target_rpe)
    values
      ('f4000004-0000-4000-8000-000000000001', cpd, 1, 'c1000001-0000-4000-8000-000000000001', 4, '6-8', 120, '31X1', 8.0),
      ('f4000004-0000-4000-8000-000000000002', cpd, 2, 'c1000001-0000-4000-8000-000000000002', 3, '10-12', 90, null, 7.5)
    on conflict (id) do nothing;

    if t1 is not null then
      delete from public.program_change_requests where client_program_id = cp_semi and requested_by = t1 and status = 'pending';
      insert into public.program_change_requests (client_program_id, requested_by, status, request_summary, payload)
      values (cp_semi, t1, 'pending', 'Swap deadlift for lighter hinge', '{"action":"substitute_exercise","day_exercise_id":"f4000004-0000-4000-8000-000000000001"}'::jsonb);
    end if;
  end if;

  if c_priv is not null then
    update public.profiles set
      role = 'client',
      display_name = 'Morgan Ellis',
      primary_location_id = loc_brg,
      phone = '+16145550220',
      date_of_birth = '1984-04-02',
      sex = 'prefer_not'
    where id = c_priv;

    update public.client_membership_periods
    set status = 'superseded', effective_to = coalesce(effective_to, now())
    where client_id = c_priv and status = 'active';

    insert into public.client_membership_periods (id, client_id, membership_type_id, effective_from, status, billing_month)
    values ('e3000002-0000-4000-8000-000000000002', c_priv, mt_priv, now() - interval '25 days', 'active', date_trunc('month', now())::date);

    period_priv := 'e3000002-0000-4000-8000-000000000002';

    if t1 is not null then
      delete from public.trainer_client_assignments where client_id = c_priv and trainer_id = t1;
      insert into public.trainer_client_assignments (client_id, trainer_id, is_primary, effective_from)
      values (c_priv, t1, true, current_date - 25);
    end if;

    delete from public.client_assessments where client_id = c_priv;

    insert into public.client_assessments (client_id, assessor_id, location_id, summary, body)
    values (c_priv, coalesce(t1, mgr), loc_brg, 'Baseline movement screen', 'ROM adequate; begin structured progression.');

    delete from public.program_change_requests where client_program_id = 'f4000010-0000-4000-8000-000000000010';
    delete from public.client_programs where id = 'f4000010-0000-4000-8000-000000000010';

    insert into public.client_programs (id, client_id, template_id, name, start_date, end_date, status, author_kind, manager_author_id, primary_trainer_id)
    values ('f4000010-0000-4000-8000-000000000010', c_priv, 'd2000001-0000-4000-8000-000000000001', 'Private — Morgan Phase 1', current_date - 20, current_date + 40, 'active', 'manager', mgr, t1)
    on conflict (id) do nothing;

    select id into cp_priv from public.client_programs where id = 'f4000010-0000-4000-8000-000000000010';

    insert into public.client_program_weeks (id, program_id, week_number, label)
    values ('f4000011-0000-4000-8000-000000000011', cp_priv, 1, 'Week 1')
    on conflict (id) do nothing;

    insert into public.client_program_days (id, week_id, day_number, label)
    values ('f4000012-0000-4000-8000-000000000012', 'f4000011-0000-4000-8000-000000000011', 1, 'Day A')
    on conflict (id) do nothing;

    insert into public.client_program_day_exercises (id, day_id, sequence, exercise_id, prescribed_sets, prescribed_reps, rest_seconds, target_rpe)
    values
      ('f4000013-0000-4000-8000-000000000013', 'f4000012-0000-4000-8000-000000000012', 1, 'c1000001-0000-4000-8000-000000000003', 3, '12-15', 60, 7.0)
    on conflict (id) do nothing;

    appt_slot := date_trunc('week', now()) + interval '3 days' + interval '10 hours';
    if t1 is not null then
      delete from public.appointments
      where client_id = c_priv
        and starts_at between appt_slot - interval '1 second' and appt_slot + interval '1 second';

      delete from public.trainer_availability_slots
      where trainer_id = t1
        and starts_at between appt_slot - interval '1 second' and appt_slot + interval '1 second';

      insert into public.trainer_availability_slots (trainer_id, location_id, starts_at, ends_at, is_open, created_by)
      values (t1, loc_brg, appt_slot, appt_slot + interval '30 minutes', false, mgr);

      insert into public.appointments (location_id, client_id, primary_trainer_id, substitute_trainer_id, starts_at, ends_at, status, created_by)
      values (loc_brg, c_priv, t1, t2, appt_slot, appt_slot + interval '30 minutes', 'scheduled', mgr);
    end if;

    delete from public.workout_set_logs where session_exercise_id in (
      select wse.id from public.workout_session_exercises wse
      join public.workout_sessions ws on ws.id = wse.session_id
      where ws.client_id = c_priv
    );
    delete from public.workout_session_exercises where session_id in (
      select id from public.workout_sessions where client_id = c_priv
    );
    delete from public.client_session_notes where client_id = c_priv;
    delete from public.staff_notes where client_id = c_priv;
    delete from public.payment_records where invoice_id in (select id from public.invoices where client_id = c_priv);
    delete from public.invoices where client_id = c_priv;
    delete from public.workout_sessions where client_id = c_priv;

    insert into public.workout_sessions (client_id, client_program_id, client_program_day_id, location_id, trainer_id, started_at, completed_at, status)
    values (
      c_priv,
      cp_priv,
      'f4000012-0000-4000-8000-000000000012',
      loc_brg,
      t1,
      now() - interval '3 days',
      now() - interval '3 days' + interval '55 minutes',
      'completed'
    );

    insert into public.workout_session_exercises (session_id, sequence, prescribed_line_id, performed_exercise_id, substituted, substitution_note, similar_muscle_group_asserted)
    select
      ws.id,
      1,
      'f4000013-0000-4000-8000-000000000013'::uuid,
      'c1000001-0000-4000-8000-000000000002'::uuid,
      true,
      'Cable stack busy — row pattern similar posterior chain load',
      true
    from public.workout_sessions ws
    where ws.client_id = c_priv
    order by ws.started_at desc
    limit 1;

    insert into public.workout_set_logs (session_exercise_id, set_number, performed_reps, performed_rpe, skipped)
    select wse.id, gs.n, 10 + gs.n, 7.5 + gs.n * 0.2, false
    from public.workout_session_exercises wse
    cross join lateral generate_series(1, 3) as gs (n)
    where wse.session_id = (
      select id from public.workout_sessions where client_id = c_priv order by started_at desc limit 1
    );

    insert into public.client_session_notes (session_id, client_id, author_id, body, pain_reported, discomfort_reported, skipped_exercises_note)
    select ws.id, c_priv, c_priv, 'Felt strong today; slight tightness left hip.', false, true, null
    from public.workout_sessions ws
    where ws.client_id = c_priv
    order by ws.started_at desc
    limit 1;

    insert into public.staff_notes (client_id, session_id, audience, author_id, body)
    select c_priv, ws.id, 'staff_internal', coalesce(t1, mgr), 'Good bar path; monitor hip hinge depth.'
    from public.workout_sessions ws
    where ws.client_id = c_priv
    order by ws.started_at desc
    limit 1;

    insert into public.staff_notes (client_id, audience, author_id, body)
    values (c_priv, 'manager_only', mgr, 'Billing note: comp session applied last month — watch add-on usage.');

    insert into public.invoices (client_id, location_id, status, amount_cents, amount_paid_cents, issued_at, due_at, title, created_by)
    values (c_priv, loc_brg, 'partial', 32000, 16000, now() - interval '12 days', now() + interval '2 days', 'April membership + sessions', mgr);

    insert into public.payment_records (invoice_id, amount_cents, method, reference, recorded_by)
    select id, 16000, 'ACH', 'REF-APR-1', mgr from public.invoices where client_id = c_priv order by created_at desc limit 1;
  end if;

  -- Staff shift + assignment samples
  if mgr is not null and t1 is not null then
    insert into public.staff_location_assignments (staff_id, location_id, work_date, created_by)
    values (t1, loc_brg, current_date, mgr)
    on conflict (staff_id, work_date) do update
    set
      location_id = excluded.location_id,
      created_by = excluded.created_by,
      updated_at = now();

    delete from public.staff_shifts
    where staff_id = t1 and shift_date = current_date and location_id = loc_brg;

    insert into public.staff_shifts (staff_id, location_id, shift_date, start_time, end_time, created_by)
    values (t1, loc_brg, current_date, time '09:00', time '17:00', mgr);
  end if;

  raise notice 'Seed persona block finished.';
end $$;

-- Additional founder-demo scenarios (optional users get seeded only if they exist).
do $$
declare
  loc_brg uuid;
  loc_rvn uuid;
  mgr uuid;
  t1 uuid;
  t2 uuid;
  t3 uuid;
  c_open uuid;
  c_semi uuid;
  c_priv uuid;
  c_extra uuid;
  c_semi2 uuid;
  c_priv2 uuid;
  mt_open uuid;
  mt_semi uuid;
  mt_priv uuid;
  week_start date;
begin
  select id into loc_brg from public.gym_locations where code = 'BRG' limit 1;
  select id into loc_rvn from public.gym_locations where code = 'RVN' limit 1;
  select id into mgr from auth.users where email = 'manager@demo.formula4.fitness' limit 1;
  select id into t1 from auth.users where email = 'trainer1@demo.formula4.fitness' limit 1;
  select id into t2 from auth.users where email = 'trainer2@demo.formula4.fitness' limit 1;
  select id into t3 from auth.users where email = 'trainer3@demo.formula4.fitness' limit 1;
  select id into c_open from auth.users where email = 'client.open@demo.formula4.fitness' limit 1;
  select id into c_semi from auth.users where email = 'client.semi@demo.formula4.fitness' limit 1;
  select id into c_priv from auth.users where email = 'client.private@demo.formula4.fitness' limit 1;
  select id into c_extra from auth.users where email = 'client.extra@demo.formula4.fitness' limit 1;
  select id into c_semi2 from auth.users where email = 'client.semi2@demo.formula4.fitness' limit 1;
  select id into c_priv2 from auth.users where email = 'client.private2@demo.formula4.fitness' limit 1;
  select id into mt_open from public.membership_types where slug = 'open_gym' limit 1;
  select id into mt_semi from public.membership_types where slug = 'semi_private' limit 1;
  select id into mt_priv from public.membership_types where slug = 'private' limit 1;

  week_start := date_trunc('week', now())::date;

  if t3 is not null then
    update public.profiles set
      role = 'trainer',
      display_name = 'Cameron Diaz',
      primary_location_id = loc_brg,
      phone = '+16145550103',
      date_of_birth = '1994-02-17',
      sex = 'female'
    where id = t3;
  end if;

  if c_extra is not null then
    update public.profiles set
      role = 'client',
      display_name = 'Casey Patel',
      primary_location_id = loc_rvn,
      phone = '+16145550230',
      date_of_birth = '1993-06-10',
      sex = 'female'
    where id = c_extra;

    update public.client_membership_periods
    set status = 'superseded', effective_to = coalesce(effective_to, now())
    where client_id = c_extra and status = 'active';
    insert into public.client_membership_periods (client_id, membership_type_id, effective_from, status, billing_month)
    values (c_extra, mt_open, now() - interval '14 days', 'active', date_trunc('month', now())::date);
  end if;

  if c_semi2 is not null then
    update public.profiles set
      role = 'client',
      display_name = 'Avery Kim',
      primary_location_id = loc_brg,
      phone = '+16145550231',
      date_of_birth = '1991-12-01',
      sex = 'male'
    where id = c_semi2;

    update public.client_membership_periods
    set status = 'superseded', effective_to = coalesce(effective_to, now())
    where client_id = c_semi2 and status = 'active';
    insert into public.client_membership_periods (id, client_id, membership_type_id, effective_from, status, billing_month)
    values ('e3000003-0000-4000-8000-000000000003', c_semi2, mt_semi, now() - interval '11 days', 'active', date_trunc('month', now())::date)
    on conflict (id) do nothing;

    insert into public.client_training_credits (client_id, membership_period_id, kind, quantity, label)
    values (c_semi2, 'e3000003-0000-4000-8000-000000000003', 'complimentary_30', 1, 'Semi-Private complimentary')
    on conflict do nothing;
  end if;

  if c_priv2 is not null then
    update public.profiles set
      role = 'client',
      display_name = 'Jamie Lawson',
      primary_location_id = loc_rvn,
      phone = '+16145550232',
      date_of_birth = '1989-08-14',
      sex = 'prefer_not'
    where id = c_priv2;

    update public.client_membership_periods
    set status = 'superseded', effective_to = coalesce(effective_to, now())
    where client_id = c_priv2 and status = 'active';
    insert into public.client_membership_periods (id, client_id, membership_type_id, effective_from, status, billing_month)
    values ('e3000004-0000-4000-8000-000000000004', c_priv2, mt_priv, now() - interval '18 days', 'active', date_trunc('month', now())::date)
    on conflict (id) do nothing;
  end if;

  -- Assignment matrix for trainer dashboards and manager roster.
  if t1 is not null and c_semi is not null then
    insert into public.trainer_client_assignments (client_id, trainer_id, is_primary, effective_from)
    values (c_semi, t1, true, current_date - 30)
    on conflict do nothing;
  end if;
  if t2 is not null and c_open is not null then
    insert into public.trainer_client_assignments (client_id, trainer_id, is_primary, effective_from)
    values (c_open, t2, false, current_date - 9)
    on conflict do nothing;
  end if;
  if t3 is not null and c_priv2 is not null then
    insert into public.trainer_client_assignments (client_id, trainer_id, is_primary, effective_from)
    values (c_priv2, t3, true, current_date - 15)
    on conflict do nothing;
  end if;

  -- Build a week of availability and appointments with varied outcomes.
  if mgr is not null and t1 is not null then
    insert into public.trainer_availability_slots (id, trainer_id, location_id, starts_at, ends_at, is_open, created_by)
    values
      ('a5000001-0000-4000-8000-000000000001', t1, loc_brg, (week_start + interval '1 day' + interval '10 hour')::timestamptz, (week_start + interval '1 day' + interval '10 hour 30 minutes')::timestamptz, false, mgr),
      ('a5000001-0000-4000-8000-000000000002', t1, loc_brg, (week_start + interval '2 day' + interval '11 hour')::timestamptz, (week_start + interval '2 day' + interval '11 hour 30 minutes')::timestamptz, false, mgr),
      ('a5000001-0000-4000-8000-000000000003', t1, loc_brg, (week_start + interval '4 day' + interval '9 hour')::timestamptz, (week_start + interval '4 day' + interval '9 hour 30 minutes')::timestamptz, true, mgr)
    on conflict (id) do nothing;
  end if;

  if mgr is not null and t2 is not null then
    insert into public.trainer_availability_slots (id, trainer_id, location_id, starts_at, ends_at, is_open, created_by)
    values
      ('a5000001-0000-4000-8000-000000000004', t2, loc_rvn, (week_start + interval '1 day' + interval '14 hour')::timestamptz, (week_start + interval '1 day' + interval '14 hour 30 minutes')::timestamptz, false, mgr),
      ('a5000001-0000-4000-8000-000000000005', t2, loc_rvn, (week_start + interval '3 day' + interval '15 hour')::timestamptz, (week_start + interval '3 day' + interval '15 hour 30 minutes')::timestamptz, true, mgr)
    on conflict (id) do nothing;
  end if;

  if mgr is not null and t1 is not null and c_priv is not null then
    insert into public.appointments (id, location_id, client_id, primary_trainer_id, availability_slot_id, starts_at, ends_at, status, created_by, no_show)
    values
      ('b6000001-0000-4000-8000-000000000001', loc_brg, c_priv, t1, 'a5000001-0000-4000-8000-000000000001', (week_start + interval '1 day' + interval '10 hour')::timestamptz, (week_start + interval '1 day' + interval '10 hour 30 minutes')::timestamptz, 'completed', mgr, false),
      ('b6000001-0000-4000-8000-000000000002', loc_brg, c_semi, t1, 'a5000001-0000-4000-8000-000000000002', (week_start + interval '2 day' + interval '11 hour')::timestamptz, (week_start + interval '2 day' + interval '11 hour 30 minutes')::timestamptz, 'no_show', mgr, true)
    on conflict (id) do nothing;
  end if;

  if mgr is not null and t2 is not null and c_open is not null then
    insert into public.appointments (id, location_id, client_id, primary_trainer_id, availability_slot_id, starts_at, ends_at, status, created_by, no_show)
    values
      ('b6000001-0000-4000-8000-000000000003', loc_rvn, c_open, t2, 'a5000001-0000-4000-8000-000000000004', (week_start + interval '1 day' + interval '14 hour')::timestamptz, (week_start + interval '1 day' + interval '14 hour 30 minutes')::timestamptz, 'cancelled', mgr, false)
    on conflict (id) do nothing;
  end if;

  -- Reporting realism: overdue and paid invoices across clients.
  if mgr is not null and c_semi is not null then
    insert into public.invoices (id, client_id, location_id, status, amount_cents, amount_paid_cents, issued_at, due_at, title, created_by)
    values
      ('c7000001-0000-4000-8000-000000000001', c_semi, loc_rvn, 'overdue', 18000, 0, now() - interval '20 days', now() - interval '6 days', 'Semi-Private monthly fee', mgr),
      ('c7000001-0000-4000-8000-000000000002', c_semi, loc_rvn, 'paid', 9000, 9000, now() - interval '45 days', now() - interval '30 days', 'Add-on session pack', mgr)
    on conflict (id) do nothing;
  end if;

  if mgr is not null and c_open is not null then
    insert into public.invoices (id, client_id, location_id, status, amount_cents, amount_paid_cents, issued_at, due_at, title, created_by)
    values
      ('c7000001-0000-4000-8000-000000000003', c_open, loc_brg, 'partial', 12000, 7000, now() - interval '10 days', now() + interval '4 days', 'Open Gym monthly', mgr)
    on conflict (id) do nothing;
  end if;

  -- Program coverage variance for reports.
  if c_priv2 is not null then
    insert into public.client_programs (id, client_id, name, start_date, end_date, status, author_kind, manager_author_id, primary_trainer_id)
    values
      ('f4000020-0000-4000-8000-000000000020', c_priv2, 'Private - Jamie Deload', current_date - 10, current_date + 9, 'active', 'manager', mgr, t3)
    on conflict (id) do nothing;
  end if;

  -- Adherence spread: some clients have multiple sessions, others none.
  if c_semi is not null then
    insert into public.workout_sessions (id, client_id, started_at, completed_at, status)
    values
      ('d8000001-0000-4000-8000-000000000001', c_semi, now() - interval '9 days', now() - interval '9 days' + interval '45 minutes', 'completed'),
      ('d8000001-0000-4000-8000-000000000002', c_semi, now() - interval '4 days', now() - interval '4 days' + interval '40 minutes', 'completed')
    on conflict (id) do nothing;
  end if;
  if c_open is not null then
    insert into public.workout_sessions (id, client_id, started_at, completed_at, status)
    values
      ('d8000001-0000-4000-8000-000000000003', c_open, now() - interval '22 days', now() - interval '22 days' + interval '30 minutes', 'completed')
    on conflict (id) do nothing;
  end if;

  -- Entitlement history examples (if ledger migration has been applied).
  if to_regclass('public.entitlement_ledger_entries') is not null and c_semi is not null then
    insert into public.entitlement_ledger_entries (
      id, client_id, source_kind, event_kind, delta, appointment_id, note, idempotency_key, created_by
    )
    values
      ('e9000001-0000-4000-8000-000000000001', c_semi, 'included_membership', 'award', 1, null, 'Seed monthly complimentary', 'seed-ledger-award-1', mgr),
      ('e9000001-0000-4000-8000-000000000002', c_semi, 'purchased_add_on', 'award', 2, null, 'Seed add-on sessions', 'seed-ledger-award-2', mgr),
      ('e9000001-0000-4000-8000-000000000003', c_semi, 'included_membership', 'booking_consume', -1, 'b6000001-0000-4000-8000-000000000002', 'Seed booking consume', 'seed-ledger-consume-1', mgr)
    on conflict (id) do nothing;
  end if;
end $$;

commit;
