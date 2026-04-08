import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  AppointmentRow,
  ClientAssessmentRow,
  ClientGoalRow,
  ClientIncidentRow,
  ClientMembershipPeriodRow,
  ClientProgramDayExerciseRow,
  ClientProgramDayRow,
  ClientProgramRow,
  ClientProgramWeekRow,
  ClientSessionNoteRow,
  ClientTrainingPreferencesRow,
  ExerciseRow,
  GymLocationRow,
  MembershipTypeRow,
  ProfileRow,
  ProgressPhotoRow,
  TrainerAvailabilitySlotRow,
  TrainerClientAssignmentRow,
  WorkoutSessionExerciseRow,
  WorkoutSessionRow,
  WorkoutSetLogRow,
} from "@/types/database.types";

export type ClientCoreContext = {
  profile: Pick<
    ProfileRow,
    "id" | "display_name" | "email" | "primary_location_id" | "date_of_birth" | "sex"
  >;
  membership: {
    period: ClientMembershipPeriodRow | null;
    type: MembershipTypeRow | null;
  };
  trainer: Pick<ProfileRow, "id" | "display_name" | "email"> | null;
  preferences: ClientTrainingPreferencesRow | null;
};

export async function fetchClientCoreContext(
  supabase: SupabaseClient,
  clientId: string,
): Promise<ClientCoreContext> {
  const [profileRes, periodRes, typesRes, assignmentRes, prefsRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, display_name, email, primary_location_id, date_of_birth, sex")
      .eq("id", clientId)
      .single(),
    supabase
      .from("client_membership_periods")
      .select("*")
      .eq("client_id", clientId)
      .eq("status", "active")
      .order("effective_from", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("membership_types").select("*"),
    supabase
      .from("trainer_client_assignments")
      .select("*")
      .eq("client_id", clientId)
      .is("effective_to", null)
      .order("is_primary", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("client_training_preferences")
      .select("*")
      .eq("client_id", clientId)
      .maybeSingle(),
  ]);
  if (profileRes.error) throw new Error(profileRes.error.message);
  if (periodRes.error) throw new Error(periodRes.error.message);
  if (typesRes.error) throw new Error(typesRes.error.message);
  if (assignmentRes.error) throw new Error(assignmentRes.error.message);
  if (prefsRes.error) throw new Error(prefsRes.error.message);

  const period = (periodRes.data ?? null) as ClientMembershipPeriodRow | null;
  const types = (typesRes.data ?? []) as MembershipTypeRow[];
  const type = period ? types.find((t) => t.id === period.membership_type_id) ?? null : null;

  let trainer: Pick<ProfileRow, "id" | "display_name" | "email"> | null = null;
  const assignment = (assignmentRes.data ?? null) as TrainerClientAssignmentRow | null;
  if (assignment) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name, email")
      .eq("id", assignment.trainer_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    trainer = (data ?? null) as Pick<ProfileRow, "id" | "display_name" | "email"> | null;
  }

  return {
    profile: profileRes.data as ClientCoreContext["profile"],
    membership: { period, type },
    trainer,
    preferences: (prefsRes.data ?? null) as ClientTrainingPreferencesRow | null,
  };
}

export type ClientDashboardData = ClientCoreContext & {
  nextAppointment: (AppointmentRow & { trainer_name: string | null; location_name: string | null }) | null;
  activeProgram: (ClientProgramRow & { weekCount: number; dayCount: number }) | null;
  nextWorkoutDayId: string | null;
  recentSessions: WorkoutSessionRow[];
  progressSummary: {
    sessionsLast30Days: number;
    completedLast30Days: number;
    streakDays: number;
  };
  upcomingActions: string[];
};

export async function fetchClientDashboardData(
  supabase: SupabaseClient,
  clientId: string,
): Promise<ClientDashboardData> {
  const core = await fetchClientCoreContext(supabase, clientId);
  const now = new Date();
  const start30 = new Date();
  start30.setDate(start30.getDate() - 30);

  const [nextApptRes, programRes, recentSessionsRes] = await Promise.all([
    supabase
      .from("appointments")
      .select("*")
      .eq("client_id", clientId)
      .gte("starts_at", now.toISOString())
      .neq("status", "cancelled")
      .order("starts_at")
      .limit(1)
      .maybeSingle(),
    supabase
      .from("client_programs")
      .select("*")
      .eq("client_id", clientId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("workout_sessions")
      .select("*")
      .eq("client_id", clientId)
      .order("started_at", { ascending: false })
      .limit(8),
  ]);
  if (nextApptRes.error) throw new Error(nextApptRes.error.message);
  if (programRes.error) throw new Error(programRes.error.message);
  if (recentSessionsRes.error) throw new Error(recentSessionsRes.error.message);

  const nextAppt = (nextApptRes.data ?? null) as AppointmentRow | null;
  let nextAppointment: ClientDashboardData["nextAppointment"] = null;
  if (nextAppt) {
    const [trainerRes, locationRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, display_name")
        .eq(
          "id",
          nextAppt.substitute_trainer_id ?? nextAppt.primary_trainer_id,
        )
        .maybeSingle(),
      supabase
        .from("gym_locations")
        .select("id, name")
        .eq("id", nextAppt.location_id)
        .maybeSingle(),
    ]);
    if (trainerRes.error) throw new Error(trainerRes.error.message);
    if (locationRes.error) throw new Error(locationRes.error.message);
    nextAppointment = {
      ...nextAppt,
      trainer_name: (trainerRes.data as { display_name: string } | null)?.display_name ?? null,
      location_name: (locationRes.data as { name: string } | null)?.name ?? null,
    };
  }

  const activeProgram = (programRes.data ?? null) as ClientProgramRow | null;
  let activeProgramWithCounts: ClientDashboardData["activeProgram"] = null;
  let nextWorkoutDayId: string | null = null;
  if (activeProgram) {
    const { data: weeks, error: wErr } = await supabase
      .from("client_program_weeks")
      .select("*")
      .eq("program_id", activeProgram.id)
      .order("week_number");
    if (wErr) throw new Error(wErr.message);
    const weekRows = (weeks ?? []) as ClientProgramWeekRow[];
    const weekIds = weekRows.map((w) => w.id);
    const { data: days, error: dErr } = weekIds.length
      ? await supabase
          .from("client_program_days")
          .select("*")
          .in("week_id", weekIds)
          .order("day_number")
      : { data: [], error: null };
    if (dErr) throw new Error(dErr.message);
    const dayRows = (days ?? []) as ClientProgramDayRow[];

    activeProgramWithCounts = {
      ...activeProgram,
      weekCount: weekRows.length,
      dayCount: dayRows.length,
    };
    nextWorkoutDayId = dayRows[0]?.id ?? null;
  }

  const recentSessions = (recentSessionsRes.data ?? []) as WorkoutSessionRow[];

  const { data: sessions30, error: s30Err } = await supabase
    .from("workout_sessions")
    .select("id, status, started_at")
    .eq("client_id", clientId)
    .gte("started_at", start30.toISOString());
  if (s30Err) throw new Error(s30Err.message);
  const sessionsLast30Days = (sessions30 ?? []).length;
  const completedLast30Days = (sessions30 ?? []).filter(
    (s: { status: string }) => s.status === "completed",
  ).length;
  const uniqueDays = new Set(
    (sessions30 ?? []).map((s: { started_at: string }) =>
      new Date(s.started_at).toISOString().slice(0, 10),
    ),
  );
  const streakDays = uniqueDays.size;

  const upcomingActions: string[] = [];
  if (!activeProgramWithCounts) upcomingActions.push("No active program assigned.");
  if (
    core.membership.type &&
    (core.membership.type.slug === "private" ||
      core.membership.type.slug === "semi_private") &&
    !core.trainer
  ) {
    upcomingActions.push("No trainer assigned for your membership.");
  }
  if (!nextAppointment) upcomingActions.push("No upcoming appointments booked.");

  return {
    ...core,
    nextAppointment,
    activeProgram: activeProgramWithCounts,
    nextWorkoutDayId,
    recentSessions,
    progressSummary: {
      sessionsLast30Days,
      completedLast30Days,
      streakDays,
    },
    upcomingActions,
  };
}

export type ClientPlanData = {
  core: ClientCoreContext;
  activeProgram: ClientProgramRow | null;
  activePlanWeeks: (ClientProgramWeekRow & {
    days: (ClientProgramDayRow & {
      exercises: (ClientProgramDayExerciseRow & {
        exercise: Pick<ExerciseRow, "id" | "name" | "machine" | "bar_type" | "grip" | "short_description"> | null;
        recently_logged: boolean;
      })[];
    })[];
  })[];
  selectedDayId: string | null;
  historyPrograms: Pick<ClientProgramRow, "id" | "name" | "status" | "start_date" | "end_date" | "created_at">[];
  historyAllowed: boolean;
};

export async function fetchClientPlanData(params: {
  supabase: SupabaseClient;
  clientId: string;
  selectedDayId: string | null;
}): Promise<ClientPlanData> {
  const { supabase, clientId, selectedDayId } = params;
  const core = await fetchClientCoreContext(supabase, clientId);
  const { data: activeProgramRes, error: apErr } = await supabase
    .from("client_programs")
    .select("*")
    .eq("client_id", clientId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (apErr) throw new Error(apErr.message);
  const activeProgram = (activeProgramRes ?? null) as ClientProgramRow | null;

  let activePlanWeeks: ClientPlanData["activePlanWeeks"] = [];
  let effectiveSelectedDayId = selectedDayId;
  if (activeProgram) {
    const { data: weeksData, error: wErr } = await supabase
      .from("client_program_weeks")
      .select("*")
      .eq("program_id", activeProgram.id)
      .order("week_number");
    if (wErr) throw new Error(wErr.message);
    const weeks = (weeksData ?? []) as ClientProgramWeekRow[];
    const weekIds = weeks.map((w) => w.id);
    const { data: daysData, error: dErr } = weekIds.length
      ? await supabase
          .from("client_program_days")
          .select("*")
          .in("week_id", weekIds)
          .order("day_number")
      : { data: [], error: null };
    if (dErr) throw new Error(dErr.message);
    const days = (daysData ?? []) as ClientProgramDayRow[];
    const dayIds = days.map((d) => d.id);
    const { data: linesData, error: lErr } = dayIds.length
      ? await supabase
          .from("client_program_day_exercises")
          .select("*")
          .in("day_id", dayIds)
          .order("sequence")
      : { data: [], error: null };
    if (lErr) throw new Error(lErr.message);
    const lines = (linesData ?? []) as ClientProgramDayExerciseRow[];
    const exerciseIds = [...new Set(lines.map((l) => l.exercise_id))];
    const { data: exData, error: exErr } = exerciseIds.length
      ? await supabase
          .from("exercises")
          .select("id, name, machine, bar_type, grip, short_description")
          .in("id", exerciseIds)
      : { data: [], error: null };
    if (exErr) throw new Error(exErr.message);
    const exerciseMap = new Map(
      ((exData ?? []) as Pick<
        ExerciseRow,
        "id" | "name" | "machine" | "bar_type" | "grip" | "short_description"
      >[]).map((e) => [e.id, e]),
    );

    const sessionDayIds = dayIds;
    const { data: sessions, error: sErr } = sessionDayIds.length
      ? await supabase
          .from("workout_sessions")
          .select("client_program_day_id, started_at")
          .eq("client_id", clientId)
          .in("client_program_day_id", sessionDayIds)
          .gte("started_at", new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString())
      : { data: [], error: null };
    if (sErr) throw new Error(sErr.message);
    const loggedDaySet = new Set(
      ((sessions ?? []) as { client_program_day_id: string | null }[])
        .map((s) => s.client_program_day_id)
        .filter(Boolean) as string[],
    );

    if (!effectiveSelectedDayId) {
      effectiveSelectedDayId = days[0]?.id ?? null;
    }

    const daysByWeek = new Map<string, ClientProgramDayRow[]>();
    for (const d of days) {
      const list = daysByWeek.get(d.week_id) ?? [];
      list.push(d);
      daysByWeek.set(d.week_id, list);
    }
    const linesByDay = new Map<string, ClientProgramDayExerciseRow[]>();
    for (const l of lines) {
      const list = linesByDay.get(l.day_id) ?? [];
      list.push(l);
      linesByDay.set(l.day_id, list);
    }

    activePlanWeeks = weeks.map((w) => ({
      ...w,
      days: (daysByWeek.get(w.id) ?? []).map((d) => ({
        ...d,
        exercises: (linesByDay.get(d.id) ?? []).map((line) => ({
          ...line,
          exercise: exerciseMap.get(line.exercise_id) ?? null,
          recently_logged: loggedDaySet.has(d.id),
        })),
      })),
    }));
  }

  const historyAllowed = core.preferences?.show_plan_history ?? true;
  let historyPrograms: ClientPlanData["historyPrograms"] = [];
  if (historyAllowed) {
    const { data, error } = await supabase
      .from("client_programs")
      .select("id, name, status, start_date, end_date, created_at")
      .eq("client_id", clientId)
      .neq("status", "active")
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);
    historyPrograms = (data ?? []) as ClientPlanData["historyPrograms"];
  }

  return {
    core,
    activeProgram,
    activePlanWeeks,
    selectedDayId: effectiveSelectedDayId,
    historyPrograms,
    historyAllowed,
  };
}

export type ClientLogData = {
  inProgressSession: WorkoutSessionRow | null;
  recentSessions: WorkoutSessionRow[];
  activeProgram: ClientProgramRow | null;
  programDays: ClientProgramDayRow[];
};

export async function fetchClientLogData(
  supabase: SupabaseClient,
  clientId: string,
): Promise<ClientLogData> {
  const [inProgressRes, recentRes, programRes] = await Promise.all([
    supabase
      .from("workout_sessions")
      .select("*")
      .eq("client_id", clientId)
      .eq("status", "in_progress")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("workout_sessions")
      .select("*")
      .eq("client_id", clientId)
      .order("started_at", { ascending: false })
      .limit(20),
    supabase
      .from("client_programs")
      .select("*")
      .eq("client_id", clientId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (inProgressRes.error) throw new Error(inProgressRes.error.message);
  if (recentRes.error) throw new Error(recentRes.error.message);
  if (programRes.error) throw new Error(programRes.error.message);

  const activeProgram = (programRes.data ?? null) as ClientProgramRow | null;
  let programDays: ClientProgramDayRow[] = [];
  if (activeProgram) {
    const { data: weeks, error: wErr } = await supabase
      .from("client_program_weeks")
      .select("id")
      .eq("program_id", activeProgram.id)
      .order("week_number");
    if (wErr) throw new Error(wErr.message);
    const weekIds = (weeks ?? []).map((w) => w.id);
    if (weekIds.length > 0) {
      const { data: days, error: dErr } = await supabase
        .from("client_program_days")
        .select("*")
        .in("week_id", weekIds)
        .order("day_number");
      if (dErr) throw new Error(dErr.message);
      programDays = (days ?? []) as ClientProgramDayRow[];
    }
  }

  return {
    inProgressSession: (inProgressRes.data ?? null) as WorkoutSessionRow | null,
    recentSessions: (recentRes.data ?? []) as WorkoutSessionRow[],
    activeProgram,
    programDays,
  };
}

export type ClientSessionDetail = {
  session: WorkoutSessionRow;
  appointment: AppointmentRow | null;
  trainer: Pick<ProfileRow, "id" | "display_name"> | null;
  prescribedDay: ClientProgramDayRow | null;
  prescribedExercises: (ClientProgramDayExerciseRow & { exercise_name: string | null })[];
  loggedExercises: (WorkoutSessionExerciseRow & {
    exercise_name: string;
    prescribed_name: string | null;
    sets: WorkoutSetLogRow[];
  })[];
  clientNotes: ClientSessionNoteRow[];
  incidents: ClientIncidentRow[];
  exerciseOptions: Pick<ExerciseRow, "id" | "name">[];
};

export async function fetchClientSessionDetail(params: {
  supabase: SupabaseClient;
  clientId: string;
  sessionId: string;
}): Promise<ClientSessionDetail | null> {
  const { supabase, clientId, sessionId } = params;
  const { data: session, error: sErr } = await supabase
    .from("workout_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("client_id", clientId)
    .maybeSingle();
  if (sErr) throw new Error(sErr.message);
  if (!session) return null;
  const sessionRow = session as WorkoutSessionRow;

  const [appointmentRes, trainerRes, dayRes, loggedRes, notesRes, incidentsRes, exOptionsRes] =
    await Promise.all([
      sessionRow.appointment_id
        ? supabase
            .from("appointments")
            .select("*")
            .eq("id", sessionRow.appointment_id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      sessionRow.trainer_id
        ? supabase
            .from("profiles")
            .select("id, display_name")
            .eq("id", sessionRow.trainer_id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      sessionRow.client_program_day_id
        ? supabase
            .from("client_program_days")
            .select("*")
            .eq("id", sessionRow.client_program_day_id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      supabase
        .from("workout_session_exercises")
        .select("*")
        .eq("session_id", sessionId)
        .order("sequence"),
      supabase
        .from("client_session_notes")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: false }),
      supabase
        .from("client_incidents")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: false }),
      supabase
        .from("exercises")
        .select("id, name")
        .eq("is_active", true)
        .order("name")
        .limit(80),
    ]);
  if (appointmentRes.error) throw new Error(appointmentRes.error.message);
  if (trainerRes.error) throw new Error(trainerRes.error.message);
  if (dayRes.error) throw new Error(dayRes.error.message);
  if (loggedRes.error) throw new Error(loggedRes.error.message);
  if (notesRes.error) throw new Error(notesRes.error.message);
  if (incidentsRes.error) throw new Error(incidentsRes.error.message);
  if (exOptionsRes.error) throw new Error(exOptionsRes.error.message);

  const logged = (loggedRes.data ?? []) as WorkoutSessionExerciseRow[];
  const loggedIds = logged.map((l) => l.id);
  const [setsRes, performedExRes, prescribedLineRes] = await Promise.all([
    loggedIds.length
      ? supabase
          .from("workout_set_logs")
          .select("*")
          .in("session_exercise_id", loggedIds)
          .order("set_number")
      : { data: [], error: null },
    logged.length
      ? supabase
          .from("exercises")
          .select("id, name")
          .in(
            "id",
            [...new Set(logged.map((l) => l.performed_exercise_id))],
          )
      : { data: [], error: null },
    logged.some((l) => l.prescribed_line_id)
      ? supabase
          .from("client_program_day_exercises")
          .select("id, exercise_id")
          .in(
            "id",
            [...new Set(logged.map((l) => l.prescribed_line_id).filter(Boolean))] as string[],
          )
      : { data: [], error: null },
  ]);
  if (setsRes.error) throw new Error(setsRes.error.message);
  if (performedExRes.error) throw new Error(performedExRes.error.message);
  if (prescribedLineRes.error) throw new Error(prescribedLineRes.error.message);

  const setMap = new Map<string, WorkoutSetLogRow[]>();
  for (const s of (setsRes.data ?? []) as WorkoutSetLogRow[]) {
    const list = setMap.get(s.session_exercise_id) ?? [];
    list.push(s);
    setMap.set(s.session_exercise_id, list);
  }
  const exNameMap = new Map(
    ((performedExRes.data ?? []) as Pick<ExerciseRow, "id" | "name">[]).map((e) => [
      e.id,
      e.name,
    ]),
  );
  const prescribedLines = (prescribedLineRes.data ?? []) as Pick<
    ClientProgramDayExerciseRow,
    "id" | "exercise_id"
  >[];
  const prescribedExerciseIds = [...new Set(prescribedLines.map((l) => l.exercise_id))];
  let prescribedExName = new Map<string, string>();
  if (prescribedExerciseIds.length > 0) {
    const { data, error } = await supabase
      .from("exercises")
      .select("id, name")
      .in("id", prescribedExerciseIds);
    if (error) throw new Error(error.message);
    prescribedExName = new Map(
      ((data ?? []) as Pick<ExerciseRow, "id" | "name">[]).map((e) => [e.id, e.name]),
    );
  }
  const prescribedLineName = new Map(
    prescribedLines.map((l) => [l.id, prescribedExName.get(l.exercise_id) ?? null]),
  );

  let prescribedExercises: ClientSessionDetail["prescribedExercises"] = [];
  if (sessionRow.client_program_day_id) {
    const { data: dayLines, error: dayLinesErr } = await supabase
      .from("client_program_day_exercises")
      .select("*")
      .eq("day_id", sessionRow.client_program_day_id)
      .order("sequence");
    if (dayLinesErr) throw new Error(dayLinesErr.message);
    const lines = (dayLines ?? []) as ClientProgramDayExerciseRow[];
    const exIds = [...new Set(lines.map((l) => l.exercise_id))];
    let nameMap = new Map<string, string>();
    if (exIds.length > 0) {
      const { data, error } = await supabase
        .from("exercises")
        .select("id, name")
        .in("id", exIds);
      if (error) throw new Error(error.message);
      nameMap = new Map(
        ((data ?? []) as Pick<ExerciseRow, "id" | "name">[]).map((e) => [e.id, e.name]),
      );
    }
    prescribedExercises = lines.map((l) => ({
      ...l,
      exercise_name: nameMap.get(l.exercise_id) ?? null,
    }));
  }

  return {
    session: sessionRow,
    appointment: (appointmentRes.data ?? null) as AppointmentRow | null,
    trainer: (trainerRes.data ?? null) as Pick<ProfileRow, "id" | "display_name"> | null,
    prescribedDay: (dayRes.data ?? null) as ClientProgramDayRow | null,
    prescribedExercises,
    loggedExercises: logged.map((line) => ({
      ...line,
      exercise_name: exNameMap.get(line.performed_exercise_id) ?? "Exercise",
      prescribed_name: line.prescribed_line_id
        ? (prescribedLineName.get(line.prescribed_line_id) ?? null)
        : null,
      sets: setMap.get(line.id) ?? [],
    })),
    clientNotes: (notesRes.data ?? []) as ClientSessionNoteRow[],
    incidents: (incidentsRes.data ?? []) as ClientIncidentRow[],
    exerciseOptions: (exOptionsRes.data ?? []) as Pick<ExerciseRow, "id" | "name">[],
  };
}

export type ClientAppointmentsData = ClientCoreContext & {
  upcoming: (AppointmentRow & { trainer_name: string | null; location_name: string | null })[];
  past: (AppointmentRow & { trainer_name: string | null; location_name: string | null })[];
  availableSlots: (TrainerAvailabilitySlotRow & {
    trainer_name: string | null;
    location_name: string | null;
  })[];
  bookingAllowed: boolean;
  bookingReason: string | null;
};

export async function fetchClientAppointmentsData(params: {
  supabase: SupabaseClient;
  clientId: string;
  filters: {
    trainerId: string | null;
    locationId: string | null;
    date: string | null;
  };
}): Promise<ClientAppointmentsData> {
  const { supabase, clientId, filters } = params;
  const core = await fetchClientCoreContext(supabase, clientId);
  const now = new Date();
  const in14 = new Date();
  in14.setDate(in14.getDate() + 14);

  const [upcomingRes, pastRes] = await Promise.all([
    supabase
      .from("appointments")
      .select("*")
      .eq("client_id", clientId)
      .gte("starts_at", now.toISOString())
      .order("starts_at"),
    supabase
      .from("appointments")
      .select("*")
      .eq("client_id", clientId)
      .lt("starts_at", now.toISOString())
      .order("starts_at", { ascending: false })
      .limit(20),
  ]);
  if (upcomingRes.error) throw new Error(upcomingRes.error.message);
  if (pastRes.error) throw new Error(pastRes.error.message);

  const allAppointments = [
    ...((upcomingRes.data ?? []) as AppointmentRow[]),
    ...((pastRes.data ?? []) as AppointmentRow[]),
  ];
  const trainerIds = [
    ...new Set(
      allAppointments.flatMap((a) =>
        [a.primary_trainer_id, a.substitute_trainer_id].filter(Boolean),
      ),
    ),
  ] as string[];
  const locationIds = [...new Set(allAppointments.map((a) => a.location_id))];
  const [trainersRes, locationsRes] = await Promise.all([
    trainerIds.length
      ? supabase.from("profiles").select("id, display_name").in("id", trainerIds)
      : { data: [], error: null },
    locationIds.length
      ? supabase.from("gym_locations").select("id, name").in("id", locationIds)
      : { data: [], error: null },
  ]);
  if (trainersRes.error) throw new Error(trainersRes.error.message);
  if (locationsRes.error) throw new Error(locationsRes.error.message);
  const trainerName = new Map(
    ((trainersRes.data ?? []) as Pick<ProfileRow, "id" | "display_name">[]).map((t) => [
      t.id,
      t.display_name,
    ]),
  );
  const locationName = new Map(
    ((locationsRes.data ?? []) as Pick<GymLocationRow, "id" | "name">[]).map((l) => [
      l.id,
      l.name,
    ]),
  );

  let bookingAllowed = false;
  let bookingReason: string | null = null;
  const slug = core.membership.type?.slug ?? null;
  if (slug === "private") {
    bookingAllowed = true;
  } else if (slug === "semi_private") {
    const [creditsRes, addOnsRes] = await Promise.all([
      supabase
        .from("client_training_credits")
        .select("quantity")
        .eq("client_id", clientId),
      supabase
        .from("trainer_session_add_ons")
        .select("sessions_purchased")
        .eq("client_id", clientId),
    ]);
    if (creditsRes.error) throw new Error(creditsRes.error.message);
    if (addOnsRes.error) throw new Error(addOnsRes.error.message);
    const totalCredits = (creditsRes.data ?? []).reduce(
      (sum: number, r: { quantity: number }) => sum + r.quantity,
      0,
    );
    const totalAddOns = (addOnsRes.data ?? []).reduce(
      (sum: number, r: { sessions_purchased: number }) => sum + r.sessions_purchased,
      0,
    );
    bookingAllowed = totalCredits + totalAddOns > 0;
    if (!bookingAllowed) {
      bookingReason =
        "No available Semi-Private credits or session add-ons were found.";
    }
  } else if (slug === "open_gym") {
    bookingAllowed = false;
    bookingReason = "Open Gym membership does not require trainer appointment booking.";
  } else {
    bookingAllowed = false;
    bookingReason = "No active membership available for booking.";
  }

  let slots: (TrainerAvailabilitySlotRow & {
    trainer_name: string | null;
    location_name: string | null;
  })[] = [];
  if (bookingAllowed) {
    let slotQ = supabase
      .from("trainer_availability_slots")
      .select("*")
      .eq("is_open", true)
      .gte("starts_at", now.toISOString())
      .lt("starts_at", in14.toISOString())
      .order("starts_at")
      .limit(200);
    if (filters.trainerId) slotQ = slotQ.eq("trainer_id", filters.trainerId);
    if (filters.locationId) slotQ = slotQ.eq("location_id", filters.locationId);
    if (filters.date) {
      const start = new Date(`${filters.date}T00:00:00`);
      const end = new Date(`${filters.date}T23:59:59`);
      slotQ = slotQ.gte("starts_at", start.toISOString()).lte("starts_at", end.toISOString());
    }

    const { data: slotData, error: slotErr } = await slotQ;
    if (slotErr) throw new Error(slotErr.message);
    const raw = (slotData ?? []) as TrainerAvailabilitySlotRow[];
    const slotTrainerIds = [...new Set(raw.map((s) => s.trainer_id))];
    const slotLocationIds = [...new Set(raw.map((s) => s.location_id))];
    const [slotTrainerRes, slotLocationRes] = await Promise.all([
      slotTrainerIds.length
        ? supabase
            .from("profiles")
            .select("id, display_name")
            .in("id", slotTrainerIds)
        : { data: [], error: null },
      slotLocationIds.length
        ? supabase
            .from("gym_locations")
            .select("id, name")
            .in("id", slotLocationIds)
        : { data: [], error: null },
    ]);
    if (slotTrainerRes.error) throw new Error(slotTrainerRes.error.message);
    if (slotLocationRes.error) throw new Error(slotLocationRes.error.message);
    const snTrainer = new Map(
      ((slotTrainerRes.data ?? []) as Pick<ProfileRow, "id" | "display_name">[]).map((t) => [
        t.id,
        t.display_name,
      ]),
    );
    const snLocation = new Map(
      ((slotLocationRes.data ?? []) as Pick<GymLocationRow, "id" | "name">[]).map((l) => [
        l.id,
        l.name,
      ]),
    );
    slots = raw.map((s) => ({
      ...s,
      trainer_name: snTrainer.get(s.trainer_id) ?? null,
      location_name: snLocation.get(s.location_id) ?? null,
    }));
  }

  return {
    ...core,
    upcoming: ((upcomingRes.data ?? []) as AppointmentRow[]).map((a) => ({
      ...a,
      trainer_name: trainerName.get(a.substitute_trainer_id ?? a.primary_trainer_id) ?? null,
      location_name: locationName.get(a.location_id) ?? null,
    })),
    past: ((pastRes.data ?? []) as AppointmentRow[]).map((a) => ({
      ...a,
      trainer_name: trainerName.get(a.substitute_trainer_id ?? a.primary_trainer_id) ?? null,
      location_name: locationName.get(a.location_id) ?? null,
    })),
    availableSlots: slots,
    bookingAllowed,
    bookingReason,
  };
}

export type ClientProgressData = ClientCoreContext & {
  goals: ClientGoalRow[];
  latestAssessment: ClientAssessmentRow | null;
  progressPhotos: Pick<ProgressPhotoRow, "id" | "taken_on" | "caption" | "created_at">[];
  sessionsLast12Weeks: {
    weekStart: string;
    count: number;
  }[];
  recentSessions: WorkoutSessionRow[];
};

export async function fetchClientProgressData(
  supabase: SupabaseClient,
  clientId: string,
): Promise<ClientProgressData> {
  const core = await fetchClientCoreContext(supabase, clientId);
  const since = new Date();
  since.setDate(since.getDate() - 7 * 12);
  const [goalsRes, assessRes, photosRes, sessionsRes] = await Promise.all([
    supabase
      .from("client_goals")
      .select("*")
      .eq("client_id", clientId)
      .order("is_active", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("client_assessments")
      .select("*")
      .eq("client_id", clientId)
      .order("assessed_at", { ascending: false })
      .limit(1),
    supabase
      .from("progress_photos")
      .select("id, taken_on, caption, created_at")
      .eq("client_id", clientId)
      .order("taken_on", { ascending: false })
      .limit(24),
    supabase
      .from("workout_sessions")
      .select("*")
      .eq("client_id", clientId)
      .gte("started_at", since.toISOString())
      .order("started_at", { ascending: false }),
  ]);
  if (goalsRes.error) throw new Error(goalsRes.error.message);
  if (assessRes.error) throw new Error(assessRes.error.message);
  if (photosRes.error) throw new Error(photosRes.error.message);
  if (sessionsRes.error) throw new Error(sessionsRes.error.message);

  const sessions = (sessionsRes.data ?? []) as WorkoutSessionRow[];
  const weekMap = new Map<string, number>();
  for (const s of sessions) {
    const d = new Date(s.started_at);
    const day = d.getDay();
    const delta = day === 0 ? -6 : 1 - day;
    const monday = new Date(d);
    monday.setDate(d.getDate() + delta);
    monday.setHours(0, 0, 0, 0);
    const key = monday.toISOString().slice(0, 10);
    weekMap.set(key, (weekMap.get(key) ?? 0) + 1);
  }
  const sessionsLast12Weeks = [...weekMap.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([weekStart, count]) => ({ weekStart, count }));

  return {
    ...core,
    goals: (goalsRes.data ?? []) as ClientGoalRow[],
    latestAssessment:
      (((assessRes.data ?? []) as ClientAssessmentRow[])[0] ?? null),
    progressPhotos: (photosRes.data ?? []) as ClientProgressData["progressPhotos"],
    sessionsLast12Weeks,
    recentSessions: sessions.slice(0, 15),
  };
}
