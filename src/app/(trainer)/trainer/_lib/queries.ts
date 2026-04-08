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
  ExerciseRow,
  GymLocationRow,
  MembershipTypeRow,
  ProfileRow,
  ProgramChangeRequestRow,
  StaffNoteRow,
  TrainerClientAssignmentRow,
  WorkoutSessionExerciseRow,
  WorkoutSessionRow,
  WorkoutSetLogRow,
} from "@/types/database.types";

function dayNumberFromDate(date: Date): number {
  const d = date.getDay();
  return d === 0 ? 7 : d;
}

function nowIsoDateOnly() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(now.getDate()).padStart(2, "0")}`;
}

export type TrainerTodaySummary = {
  sessionsToday: number;
  completedToday: number;
  upcoming: number;
  followUpNotesNeeded: number;
  pendingChangeRequests: number;
};

export type TrainerTodayAppointment = AppointmentRow & {
  client_name: string;
  client_email: string | null;
  location_name: string | null;
  linked_session_id: string | null;
  linked_session_status: WorkoutSessionRow["status"] | null;
};

export type TrainerTodayData = {
  summary: TrainerTodaySummary;
  nextUpcoming: TrainerTodayAppointment | null;
  todayAppointments: TrainerTodayAppointment[];
  assignedClients: Pick<ProfileRow, "id" | "display_name">[];
  clientsScheduledToday: Pick<ProfileRow, "id" | "display_name">[];
  inProgressSessions: (WorkoutSessionRow & {
    client_name: string;
  })[];
  pendingRequests: (ProgramChangeRequestRow & {
    client_name: string | null;
    program_name: string | null;
  })[];
};

export async function fetchTrainerTodayData(
  supabase: SupabaseClient,
  trainerId: string,
): Promise<TrainerTodayData> {
  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const [appointmentsRes, assignmentsRes, sessionsRes, requestsRes, profilesRes, locationsRes] =
    await Promise.all([
      supabase
        .from("appointments")
        .select("*")
        .gte("starts_at", dayStart.toISOString())
        .lt("starts_at", dayEnd.toISOString())
        .or(`primary_trainer_id.eq.${trainerId},substitute_trainer_id.eq.${trainerId}`)
        .order("starts_at"),
      supabase
        .from("trainer_client_assignments")
        .select("*")
        .eq("trainer_id", trainerId)
        .is("effective_to", null),
      supabase
        .from("workout_sessions")
        .select("*")
        .eq("trainer_id", trainerId)
        .gte("started_at", dayStart.toISOString())
        .lt("started_at", dayEnd.toISOString())
        .order("started_at", { ascending: false }),
      supabase
        .from("program_change_requests")
        .select("*")
        .eq("requested_by", trainerId)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("profiles")
        .select("id, display_name, email")
        .is("deleted_at", null),
      supabase.from("gym_locations").select("id, name").eq("is_active", true),
    ]);

  if (appointmentsRes.error) throw new Error(appointmentsRes.error.message);
  if (assignmentsRes.error) throw new Error(assignmentsRes.error.message);
  if (sessionsRes.error) throw new Error(sessionsRes.error.message);
  if (requestsRes.error) throw new Error(requestsRes.error.message);
  if (profilesRes.error) throw new Error(profilesRes.error.message);
  if (locationsRes.error) throw new Error(locationsRes.error.message);

  const appointments = (appointmentsRes.data ?? []) as AppointmentRow[];
  const assignments = (assignmentsRes.data ?? []) as TrainerClientAssignmentRow[];
  const sessions = (sessionsRes.data ?? []) as WorkoutSessionRow[];
  const pendingRequests = (requestsRes.data ?? []) as ProgramChangeRequestRow[];
  const profiles = (profilesRes.data ?? []) as Pick<
    ProfileRow,
    "id" | "display_name" | "email"
  >[];
  const locations = (locationsRes.data ?? []) as Pick<GymLocationRow, "id" | "name">[];

  const profileById = new Map(profiles.map((p) => [p.id, p]));
  const locationById = new Map(locations.map((l) => [l.id, l.name]));

  const appointmentIds = appointments.map((a) => a.id);
  const linkedSessionByAppointment = new Map<
    string,
    Pick<WorkoutSessionRow, "id" | "status">
  >();
  if (appointmentIds.length > 0) {
    const { data, error } = await supabase
      .from("workout_sessions")
      .select("id, appointment_id, status, started_at")
      .in("appointment_id", appointmentIds)
      .eq("trainer_id", trainerId)
      .order("started_at", { ascending: false });
    if (error) throw new Error(error.message);
    for (const row of data ?? []) {
      if (row.appointment_id && !linkedSessionByAppointment.has(row.appointment_id)) {
        linkedSessionByAppointment.set(row.appointment_id, {
          id: row.id,
          status: row.status,
        });
      }
    }
  }

  const todayAppointments: TrainerTodayAppointment[] = appointments.map((a) => {
    const client = profileById.get(a.client_id);
    const linked = linkedSessionByAppointment.get(a.id) ?? null;
    return {
      ...a,
      client_name: client?.display_name ?? "Client",
      client_email: client?.email ?? null,
      location_name: locationById.get(a.location_id) ?? null,
      linked_session_id: linked?.id ?? null,
      linked_session_status: linked?.status ?? null,
    };
  });

  const nextUpcoming =
    todayAppointments.find(
      (a) => a.status === "scheduled" && new Date(a.starts_at) >= now,
    ) ?? null;

  const assignedClientIds = [...new Set(assignments.map((a) => a.client_id))];
  const assignedClients = assignedClientIds
    .map((id) => profileById.get(id))
    .filter(Boolean)
    .map((p) => ({ id: p!.id, display_name: p!.display_name }))
    .slice(0, 16);

  const scheduledClientIds = [...new Set(todayAppointments.map((a) => a.client_id))];
  const clientsScheduledToday = scheduledClientIds
    .map((id) => profileById.get(id))
    .filter(Boolean)
    .map((p) => ({ id: p!.id, display_name: p!.display_name }));

  const inProgressSessions = sessions
    .filter((s) => s.status === "in_progress")
    .map((s) => ({
      ...s,
      client_name: profileById.get(s.client_id)?.display_name ?? "Client",
    }));

  const followUpIds = sessions
    .filter((s) => s.status === "completed" || s.status === "abandoned")
    .map((s) => s.id);
  let followUpNotesNeeded = 0;
  if (followUpIds.length > 0) {
    const [staffRes, clientNotesRes] = await Promise.all([
      supabase
        .from("staff_notes")
        .select("session_id")
        .in("session_id", followUpIds)
        .eq("author_id", trainerId)
        .eq("audience", "staff_internal"),
      supabase
        .from("client_session_notes")
        .select("session_id")
        .in("session_id", followUpIds)
        .eq("author_id", trainerId),
    ]);
    if (staffRes.error) throw new Error(staffRes.error.message);
    if (clientNotesRes.error) throw new Error(clientNotesRes.error.message);
    const noted = new Set<string>();
    for (const row of staffRes.data ?? []) if (row.session_id) noted.add(row.session_id);
    for (const row of clientNotesRes.data ?? []) if (row.session_id) noted.add(row.session_id);
    followUpNotesNeeded = followUpIds.filter((id) => !noted.has(id)).length;
  }

  const requestProgramIds = [...new Set(pendingRequests.map((r) => r.client_program_id))];
  const reqProgramMeta = new Map<string, { client_name: string; program_name: string }>();
  if (requestProgramIds.length > 0) {
    const { data: programs, error } = await supabase
      .from("client_programs")
      .select("id, name, client_id")
      .in("id", requestProgramIds);
    if (error) throw new Error(error.message);
    for (const p of programs ?? []) {
      reqProgramMeta.set(p.id, {
        client_name: profileById.get(p.client_id)?.display_name ?? "Client",
        program_name: p.name,
      });
    }
  }

  const requestItems = pendingRequests.map((r) => ({
    ...r,
    client_name: reqProgramMeta.get(r.client_program_id)?.client_name ?? null,
    program_name: reqProgramMeta.get(r.client_program_id)?.program_name ?? null,
  }));

  const summary: TrainerTodaySummary = {
    sessionsToday: todayAppointments.length,
    completedToday: sessions.filter((s) => s.status === "completed").length,
    upcoming: todayAppointments.filter(
      (a) => a.status === "scheduled" && new Date(a.starts_at) >= now,
    ).length,
    followUpNotesNeeded,
    pendingChangeRequests: requestItems.length,
  };

  return {
    summary,
    nextUpcoming,
    todayAppointments,
    assignedClients,
    clientsScheduledToday,
    inProgressSessions,
    pendingRequests: requestItems,
  };
}

export type TrainerClientListItem = {
  profile: Pick<ProfileRow, "id" | "display_name" | "email" | "primary_location_id">;
  relationship: "assigned" | "scheduled_only";
  membershipSlug: MembershipTypeRow["slug"] | null;
  activeProgram: Pick<ClientProgramRow, "id" | "name" | "status"> | null;
  latestSessionAt: string | null;
  recentIncidentCount: number;
};

export async function fetchTrainerClientsData(params: {
  supabase: SupabaseClient;
  trainerId: string;
  q: string;
  relationship: "all" | "assigned" | "scheduled_only";
}): Promise<TrainerClientListItem[]> {
  const { supabase, trainerId, q, relationship } = params;
  const since = new Date();
  since.setDate(since.getDate() - 60);

  const [assignmentsRes, appointmentsRes, profilesRes] = await Promise.all([
    supabase
      .from("trainer_client_assignments")
      .select("*")
      .eq("trainer_id", trainerId)
      .is("effective_to", null),
    supabase
      .from("appointments")
      .select("id, client_id, starts_at")
      .or(`primary_trainer_id.eq.${trainerId},substitute_trainer_id.eq.${trainerId}`)
      .gte("starts_at", since.toISOString()),
    supabase
      .from("profiles")
      .select("id, display_name, email, primary_location_id")
      .eq("role", "client")
      .is("deleted_at", null),
  ]);
  if (assignmentsRes.error) throw new Error(assignmentsRes.error.message);
  if (appointmentsRes.error) throw new Error(appointmentsRes.error.message);
  if (profilesRes.error) throw new Error(profilesRes.error.message);

  const assignments = (assignmentsRes.data ?? []) as TrainerClientAssignmentRow[];
  const appointments = (appointmentsRes.data ?? []) as Pick<
    AppointmentRow,
    "id" | "client_id" | "starts_at"
  >[];
  const profiles = (profilesRes.data ?? []) as Pick<
    ProfileRow,
    "id" | "display_name" | "email" | "primary_location_id"
  >[];
  const profileById = new Map(profiles.map((p) => [p.id, p]));

  const assignedIds = new Set(assignments.map((a) => a.client_id));
  const scheduledIds = new Set(appointments.map((a) => a.client_id));
  const clientIds = [...new Set([...assignedIds, ...scheduledIds])];
  if (clientIds.length === 0) return [];

  const [programsRes, sessionsRes, incidentsRes, periodsRes, typesRes] = await Promise.all([
    supabase
      .from("client_programs")
      .select("id, client_id, name, status")
      .in("client_id", clientIds)
      .eq("status", "active"),
    supabase
      .from("workout_sessions")
      .select("id, client_id, started_at")
      .in("client_id", clientIds)
      .order("started_at", { ascending: false }),
    supabase
      .from("client_incidents")
      .select("id, client_id, created_at")
      .in("client_id", clientIds)
      .gte("created_at", since.toISOString()),
    supabase
      .from("client_membership_periods")
      .select("*")
      .in("client_id", clientIds)
      .eq("status", "active"),
    supabase.from("membership_types").select("*"),
  ]);
  if (programsRes.error) throw new Error(programsRes.error.message);
  if (sessionsRes.error) throw new Error(sessionsRes.error.message);
  if (incidentsRes.error) throw new Error(incidentsRes.error.message);
  if (periodsRes.error) throw new Error(periodsRes.error.message);
  if (typesRes.error) throw new Error(typesRes.error.message);

  const programByClient = new Map(
    ((programsRes.data ?? []) as Pick<
      ClientProgramRow,
      "id" | "client_id" | "name" | "status"
    >[]).map((p) => [p.client_id, p]),
  );
  const latestSessionByClient = new Map<string, string>();
  for (const row of (sessionsRes.data ?? []) as Pick<
    WorkoutSessionRow,
    "id" | "client_id" | "started_at"
  >[]) {
    if (!latestSessionByClient.has(row.client_id)) {
      latestSessionByClient.set(row.client_id, row.started_at);
    }
  }
  const incidentCountByClient = new Map<string, number>();
  for (const row of incidentsRes.data ?? []) {
    incidentCountByClient.set(
      row.client_id,
      (incidentCountByClient.get(row.client_id) ?? 0) + 1,
    );
  }
  const typeById = new Map(
    ((typesRes.data ?? []) as MembershipTypeRow[]).map((t) => [t.id, t.slug]),
  );
  const membershipByClient = new Map<string, MembershipTypeRow["slug"]>();
  for (const row of (periodsRes.data ?? []) as ClientMembershipPeriodRow[]) {
    const slug = typeById.get(row.membership_type_id);
    if (slug) membershipByClient.set(row.client_id, slug);
  }

  let rows: TrainerClientListItem[] = clientIds
    .map((id) => {
      const profile = profileById.get(id);
      if (!profile) return null;
      const rel: TrainerClientListItem["relationship"] = assignedIds.has(id)
        ? "assigned"
        : "scheduled_only";
      return {
        profile,
        relationship: rel,
        membershipSlug: membershipByClient.get(id) ?? null,
        activeProgram: programByClient.get(id) ?? null,
        latestSessionAt: latestSessionByClient.get(id) ?? null,
        recentIncidentCount: incidentCountByClient.get(id) ?? 0,
      };
    })
    .filter(Boolean) as TrainerClientListItem[];

  if (relationship !== "all") {
    rows = rows.filter((r) => r.relationship === relationship);
  }
  if (q.trim()) {
    const query = q.trim().toLowerCase();
    rows = rows.filter((r) => {
      const hay = `${r.profile.display_name} ${r.profile.email ?? ""}`.toLowerCase();
      return hay.includes(query);
    });
  }

  rows.sort((a, b) =>
    a.profile.display_name.localeCompare(b.profile.display_name, undefined, {
      sensitivity: "base",
    }),
  );

  return rows;
}

export type TrainerClientDetail = {
  profile: ProfileRow;
  activeAssignment: TrainerClientAssignmentRow | null;
  goals: ClientGoalRow[];
  latestAssessment: ClientAssessmentRow | null;
  activeProgram: (ClientProgramRow & { weekCount: number; dayCount: number }) | null;
  recentSessions: WorkoutSessionRow[];
  upcomingAppointments: AppointmentRow[];
  staffNotes: (StaffNoteRow & { author_name: string | null })[];
  incidents: ClientIncidentRow[];
  recentTrainerRequests: ProgramChangeRequestRow[];
};

export async function fetchTrainerClientDetail(params: {
  supabase: SupabaseClient;
  trainerId: string;
  clientId: string;
}): Promise<TrainerClientDetail | null> {
  const { supabase, trainerId, clientId } = params;
  const { data: profile, error: pErr } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", clientId)
    .eq("role", "client")
    .is("deleted_at", null)
    .maybeSingle();
  if (pErr) throw new Error(pErr.message);
  if (!profile) return null;

  const now = new Date();
  const [assignmentRes, goalsRes, assessRes, programsRes, sessionsRes, apptRes, notesRes, incidentsRes] =
    await Promise.all([
      supabase
        .from("trainer_client_assignments")
        .select("*")
        .eq("client_id", clientId)
        .eq("trainer_id", trainerId)
        .is("effective_to", null)
        .maybeSingle(),
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
        .from("client_programs")
        .select("*")
        .eq("client_id", clientId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1),
      supabase
        .from("workout_sessions")
        .select("*")
        .eq("client_id", clientId)
        .order("started_at", { ascending: false })
        .limit(12),
      supabase
        .from("appointments")
        .select("*")
        .eq("client_id", clientId)
        .or(`primary_trainer_id.eq.${trainerId},substitute_trainer_id.eq.${trainerId}`)
        .gte("starts_at", now.toISOString())
        .order("starts_at")
        .limit(10),
      supabase
        .from("staff_notes")
        .select("*")
        .eq("client_id", clientId)
        .eq("audience", "staff_internal")
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("client_incidents")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
  if (assignmentRes.error) throw new Error(assignmentRes.error.message);
  if (goalsRes.error) throw new Error(goalsRes.error.message);
  if (assessRes.error) throw new Error(assessRes.error.message);
  if (programsRes.error) throw new Error(programsRes.error.message);
  if (sessionsRes.error) throw new Error(sessionsRes.error.message);
  if (apptRes.error) throw new Error(apptRes.error.message);
  if (notesRes.error) throw new Error(notesRes.error.message);
  if (incidentsRes.error) throw new Error(incidentsRes.error.message);

  const activeProgramRow = ((programsRes.data ?? []) as ClientProgramRow[])[0] ?? null;
  let activeProgram: TrainerClientDetail["activeProgram"] = null;
  if (activeProgramRow) {
    const { data: weeks, error: weeksErr } = await supabase
      .from("client_program_weeks")
      .select("id")
      .eq("program_id", activeProgramRow.id);
    if (weeksErr) throw new Error(weeksErr.message);
    const weekIds = (weeks ?? []).map((w) => w.id);
    const { data: days, error: daysErr } = weekIds.length
      ? await supabase
          .from("client_program_days")
          .select("id")
          .in("week_id", weekIds)
      : { data: [], error: null };
    if (daysErr) throw new Error(daysErr.message);
    activeProgram = {
      ...activeProgramRow,
      weekCount: (weeks ?? []).length,
      dayCount: (days ?? []).length,
    };
  }

  const notes = (notesRes.data ?? []) as StaffNoteRow[];
  const authorIds = [...new Set(notes.map((n) => n.author_id))];
  const authorMap = new Map<string, string>();
  if (authorIds.length > 0) {
    const { data: authors, error: aErr } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", authorIds);
    if (aErr) throw new Error(aErr.message);
    for (const row of authors ?? []) {
      authorMap.set(row.id, row.display_name);
    }
  }

  const recentTrainerRequests = activeProgramRow
    ? (
        await supabase
          .from("program_change_requests")
          .select("*")
          .eq("client_program_id", activeProgramRow.id)
          .eq("requested_by", trainerId)
          .order("created_at", { ascending: false })
          .limit(10)
      ).data ?? []
    : [];

  return {
    profile: profile as ProfileRow,
    activeAssignment: (assignmentRes.data ?? null) as TrainerClientAssignmentRow | null,
    goals: (goalsRes.data ?? []) as ClientGoalRow[],
    latestAssessment:
      (((assessRes.data ?? []) as ClientAssessmentRow[])[0] ?? null),
    activeProgram,
    recentSessions: (sessionsRes.data ?? []) as WorkoutSessionRow[],
    upcomingAppointments: (apptRes.data ?? []) as AppointmentRow[],
    staffNotes: notes.map((n) => ({
      ...n,
      author_name: authorMap.get(n.author_id) ?? null,
    })),
    incidents: (incidentsRes.data ?? []) as ClientIncidentRow[],
    recentTrainerRequests: recentTrainerRequests as ProgramChangeRequestRow[],
  };
}

export type SessionExerciseDetail = WorkoutSessionExerciseRow & {
  performed_exercise_name: string;
  prescribed_exercise_name: string | null;
  sets: WorkoutSetLogRow[];
};

export type TrainerSessionDetail = {
  session: WorkoutSessionRow;
  client: Pick<ProfileRow, "id" | "display_name" | "email">;
  trainer: Pick<ProfileRow, "id" | "display_name"> | null;
  appointment: AppointmentRow | null;
  activeProgram: ClientProgramRow | null;
  prescribedDay: ClientProgramDayRow | null;
  prescribedExercises: (ClientProgramDayExerciseRow & { exercise_name: string | null })[];
  loggedExercises: SessionExerciseDetail[];
  clientNotes: ClientSessionNoteRow[];
  staffNotes: StaffNoteRow[];
  incidents: ClientIncidentRow[];
  exerciseOptions: Pick<ExerciseRow, "id" | "name">[];
};

export async function fetchTrainerSessionDetail(params: {
  supabase: SupabaseClient;
  trainerId: string;
  sessionId: string;
}): Promise<TrainerSessionDetail | null> {
  const { supabase, trainerId, sessionId } = params;
  const { data: session, error: sErr } = await supabase
    .from("workout_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("trainer_id", trainerId)
    .maybeSingle();
  if (sErr) throw new Error(sErr.message);
  if (!session) return null;
  const sessionRow = session as WorkoutSessionRow;

  const [clientRes, trainerRes, apptRes, programRes, dayRes, loggedRes, clientNotesRes, staffNotesRes, incidentsRes, exRes] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, display_name, email")
        .eq("id", sessionRow.client_id)
        .single(),
      sessionRow.trainer_id
        ? supabase
            .from("profiles")
            .select("id, display_name")
            .eq("id", sessionRow.trainer_id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      sessionRow.appointment_id
        ? supabase
            .from("appointments")
            .select("*")
            .eq("id", sessionRow.appointment_id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      sessionRow.client_program_id
        ? supabase
            .from("client_programs")
            .select("*")
            .eq("id", sessionRow.client_program_id)
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
        .from("staff_notes")
        .select("*")
        .eq("session_id", sessionId)
        .eq("audience", "staff_internal")
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
  if (clientRes.error) throw new Error(clientRes.error.message);
  if (trainerRes.error) throw new Error(trainerRes.error.message);
  if (apptRes.error) throw new Error(apptRes.error.message);
  if (programRes.error) throw new Error(programRes.error.message);
  if (dayRes.error) throw new Error(dayRes.error.message);
  if (loggedRes.error) throw new Error(loggedRes.error.message);
  if (clientNotesRes.error) throw new Error(clientNotesRes.error.message);
  if (staffNotesRes.error) throw new Error(staffNotesRes.error.message);
  if (incidentsRes.error) throw new Error(incidentsRes.error.message);
  if (exRes.error) throw new Error(exRes.error.message);

  const loggedExercises = (loggedRes.data ?? []) as WorkoutSessionExerciseRow[];
  const loggedIds = loggedExercises.map((l) => l.id);
  const prescribedLineIds = loggedExercises
    .map((l) => l.prescribed_line_id)
    .filter(Boolean) as string[];
  const performedExerciseIds = [...new Set(loggedExercises.map((l) => l.performed_exercise_id))];

  const [setRes, prescribedRes, performedRes, prescribedDayExercisesRes] = await Promise.all([
    loggedIds.length
      ? supabase
          .from("workout_set_logs")
          .select("*")
          .in("session_exercise_id", loggedIds)
          .order("set_number")
      : Promise.resolve({ data: [], error: null }),
    prescribedLineIds.length
      ? supabase
          .from("client_program_day_exercises")
          .select("id, exercise_id")
          .in("id", prescribedLineIds)
      : Promise.resolve({ data: [], error: null }),
    performedExerciseIds.length
      ? supabase.from("exercises").select("id, name").in("id", performedExerciseIds)
      : Promise.resolve({ data: [], error: null }),
    sessionRow.client_program_day_id
      ? supabase
          .from("client_program_day_exercises")
          .select("*")
          .eq("day_id", sessionRow.client_program_day_id)
          .order("sequence")
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (setRes.error) throw new Error(setRes.error.message);
  if (prescribedRes.error) throw new Error(prescribedRes.error.message);
  if (performedRes.error) throw new Error(performedRes.error.message);
  if (prescribedDayExercisesRes.error) {
    throw new Error(prescribedDayExercisesRes.error.message);
  }

  const setsBySessionExercise = new Map<string, WorkoutSetLogRow[]>();
  for (const row of (setRes.data ?? []) as WorkoutSetLogRow[]) {
    const list = setsBySessionExercise.get(row.session_exercise_id) ?? [];
    list.push(row);
    setsBySessionExercise.set(row.session_exercise_id, list);
  }

  const performedNameById = new Map(
    ((performedRes.data ?? []) as Pick<ExerciseRow, "id" | "name">[]).map((e) => [
      e.id,
      e.name,
    ]),
  );

  const prescribedLines = (prescribedRes.data ?? []) as Pick<
    ClientProgramDayExerciseRow,
    "id" | "exercise_id"
  >[];
  const prescribedExerciseIds = [
    ...new Set(prescribedLines.map((p) => p.exercise_id)),
  ];
  let prescribedExerciseNameById = new Map<string, string>();
  if (prescribedExerciseIds.length > 0) {
    const { data, error } = await supabase
      .from("exercises")
      .select("id, name")
      .in("id", prescribedExerciseIds);
    if (error) throw new Error(error.message);
    prescribedExerciseNameById = new Map(
      ((data ?? []) as Pick<ExerciseRow, "id" | "name">[]).map((e) => [e.id, e.name]),
    );
  }
  const prescribedLineNameById = new Map(
    prescribedLines.map((l) => [
      l.id,
      prescribedExerciseNameById.get(l.exercise_id) ?? null,
    ]),
  );

  const prescribedDayExercises =
    (prescribedDayExercisesRes.data ?? []) as ClientProgramDayExerciseRow[];
  const prescribedDayExerciseIds = [
    ...new Set(prescribedDayExercises.map((l) => l.exercise_id)),
  ];
  let prescribedDayNameByExerciseId = new Map<string, string>();
  if (prescribedDayExerciseIds.length > 0) {
    const { data, error } = await supabase
      .from("exercises")
      .select("id, name")
      .in("id", prescribedDayExerciseIds);
    if (error) throw new Error(error.message);
    prescribedDayNameByExerciseId = new Map(
      ((data ?? []) as Pick<ExerciseRow, "id" | "name">[]).map((e) => [e.id, e.name]),
    );
  }

  return {
    session: sessionRow,
    client: clientRes.data as Pick<ProfileRow, "id" | "display_name" | "email">,
    trainer: (trainerRes.data ?? null) as Pick<ProfileRow, "id" | "display_name"> | null,
    appointment: (apptRes.data ?? null) as AppointmentRow | null,
    activeProgram: (programRes.data ?? null) as ClientProgramRow | null,
    prescribedDay: (dayRes.data ?? null) as ClientProgramDayRow | null,
    prescribedExercises: prescribedDayExercises.map((line) => ({
      ...line,
      exercise_name: prescribedDayNameByExerciseId.get(line.exercise_id) ?? null,
    })),
    loggedExercises: loggedExercises.map((line) => ({
      ...line,
      performed_exercise_name:
        performedNameById.get(line.performed_exercise_id) ?? "Exercise",
      prescribed_exercise_name: line.prescribed_line_id
        ? (prescribedLineNameById.get(line.prescribed_line_id) ?? null)
        : null,
      sets: setsBySessionExercise.get(line.id) ?? [],
    })),
    clientNotes: (clientNotesRes.data ?? []) as ClientSessionNoteRow[],
    staffNotes: (staffNotesRes.data ?? []) as StaffNoteRow[],
    incidents: (incidentsRes.data ?? []) as ClientIncidentRow[],
    exerciseOptions: (exRes.data ?? []) as Pick<ExerciseRow, "id" | "name">[],
  };
}

export async function fetchTrainerScheduleData(
  supabase: SupabaseClient,
  trainerId: string,
): Promise<{
  today: TrainerTodayAppointment[];
  upcomingWeek: TrainerTodayAppointment[];
}> {
  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  const weekEnd = new Date(dayStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const { data: appts, error } = await supabase
    .from("appointments")
    .select("*")
    .or(`primary_trainer_id.eq.${trainerId},substitute_trainer_id.eq.${trainerId}`)
    .gte("starts_at", dayStart.toISOString())
    .lt("starts_at", weekEnd.toISOString())
    .order("starts_at");
  if (error) throw new Error(error.message);
  const appointments = (appts ?? []) as AppointmentRow[];
  const clientIds = [...new Set(appointments.map((a) => a.client_id))];
  const locationIds = [...new Set(appointments.map((a) => a.location_id))];
  const [clientsRes, locationsRes] = await Promise.all([
    clientIds.length
      ? supabase
          .from("profiles")
          .select("id, display_name, email")
          .in("id", clientIds)
      : Promise.resolve({ data: [], error: null }),
    locationIds.length
      ? supabase
          .from("gym_locations")
          .select("id, name")
          .in("id", locationIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (clientsRes.error) throw new Error(clientsRes.error.message);
  if (locationsRes.error) throw new Error(locationsRes.error.message);
  const clientById = new Map(
    ((clientsRes.data ?? []) as Pick<ProfileRow, "id" | "display_name" | "email">[]).map(
      (c) => [c.id, c],
    ),
  );
  const locationById = new Map(
    ((locationsRes.data ?? []) as Pick<GymLocationRow, "id" | "name">[]).map((l) => [
      l.id,
      l.name,
    ]),
  );
  const mapped: TrainerTodayAppointment[] = appointments.map((a) => ({
    ...a,
    client_name: clientById.get(a.client_id)?.display_name ?? "Client",
    client_email: clientById.get(a.client_id)?.email ?? null,
    location_name: locationById.get(a.location_id) ?? null,
    linked_session_id: null,
    linked_session_status: null,
  }));
  return {
    today: mapped.filter((a) => {
      const t = new Date(a.starts_at);
      return t >= dayStart && t < dayEnd;
    }),
    upcomingWeek: mapped,
  };
}

export async function findProgramDayForDate(params: {
  supabase: SupabaseClient;
  programId: string;
  date: Date;
}): Promise<string | null> {
  const { supabase, programId, date } = params;
  const dayNumber = dayNumberFromDate(date);
  const { data: weeks, error: weekErr } = await supabase
    .from("client_program_weeks")
    .select("*")
    .eq("program_id", programId)
    .order("week_number");
  if (weekErr) throw new Error(weekErr.message);
  const weekRows = (weeks ?? []) as ClientProgramWeekRow[];
  const weekIds = weekRows.map((w) => w.id);
  if (weekIds.length === 0) return null;
  const { data: days, error: dayErr } = await supabase
    .from("client_program_days")
    .select("*")
    .in("week_id", weekIds)
    .eq("day_number", dayNumber)
    .order("week_id");
  if (dayErr) throw new Error(dayErr.message);
  const day = ((days ?? []) as ClientProgramDayRow[])[0] ?? null;
  return day?.id ?? null;
}

export async function fetchTrainerExerciseOptions(
  supabase: SupabaseClient,
  q: string,
): Promise<Pick<ExerciseRow, "id" | "name">[]> {
  let qb = supabase.from("exercises").select("id, name").eq("is_active", true);
  if (q.trim()) {
    const esc = q.trim().replace(/%/g, "\\%").replace(/_/g, "\\_");
    qb = qb.ilike("name", `%${esc}%`);
  }
  const { data, error } = await qb.order("name").limit(80);
  if (error) throw new Error(error.message);
  return (data ?? []) as Pick<ExerciseRow, "id" | "name">[];
}

export function todayIsoDateForInputs() {
  return nowIsoDateOnly();
}
