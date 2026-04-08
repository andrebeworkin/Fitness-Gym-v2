import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { ProgramsFilters } from "@/app/(manager)/manager/programs/_lib/parse-filters";
import type {
  AppointmentRow,
  ClientMembershipPeriodRow,
  ClientProgramDayExerciseRow,
  ClientProgramDayRow,
  ClientProgramRow,
  ClientProgramWeekRow,
  ExerciseRow,
  GymLocationRow,
  MembershipTypeRow,
  ProfileRow,
  ProgramChangeRequestRow,
  ProgramTemplateDayExerciseRow,
  ProgramTemplateDayRow,
  ProgramTemplateRow,
  ProgramTemplateWeekRow,
  WorkoutSessionRow,
} from "@/types/database.types";

export type ProgramTemplateListItem = ProgramTemplateRow & {
  week_count: number;
  archived: boolean;
};

export type ClientProgramListItem = ClientProgramRow & {
  client_name: string;
  client_email: string | null;
  client_location: Pick<GymLocationRow, "id" | "name"> | null;
  trainer_name: string | null;
  membership_slug: MembershipTypeRow["slug"] | null;
  assigned_by_name: string | null;
};

export type ProgramRequestListItem = ProgramChangeRequestRow & {
  requester_name: string | null;
  program_name: string | null;
  client_name: string | null;
};

export type ProgramsSummary = {
  activePrograms: number;
  templateCount: number;
  clientsWithNoActiveProgram: number;
  pendingChangeRequests: number;
  endingSoon: number;
};

export type ProgramsOverviewData = {
  filtersData: {
    locations: GymLocationRow[];
    trainers: Pick<ProfileRow, "id" | "display_name">[];
    membershipTypes: MembershipTypeRow[];
  };
  templates: ProgramTemplateListItem[];
  clientPrograms: ClientProgramListItem[];
  pendingRequests: ProgramRequestListItem[];
  summary: ProgramsSummary;
};

export type TemplateDetailData = {
  template: ProgramTemplateRow;
  weeks: (ProgramTemplateWeekRow & {
    days: (ProgramTemplateDayRow & {
      exercises: (ProgramTemplateDayExerciseRow & {
        exercise: Pick<
          ExerciseRow,
          "id" | "name" | "machine" | "bar_type" | "grip" | "short_description"
        > | null;
      })[];
    })[];
  })[];
};

export type ClientProgramDetailData = {
  program: ClientProgramListItem;
  weeks: (ClientProgramWeekRow & {
    days: (ClientProgramDayRow & {
      exercises: (ClientProgramDayExerciseRow & {
        exercise: Pick<
          ExerciseRow,
          "id" | "name" | "machine" | "bar_type" | "grip" | "short_description"
        > | null;
      })[];
    })[];
  })[];
  recentSessions: (Pick<
    WorkoutSessionRow,
    "id" | "started_at" | "completed_at" | "status" | "appointment_id"
  > & {
    appointment_starts_at: string | null;
  })[];
  pendingRequests: ProgramRequestListItem[];
};

function isArchivedTemplate(name: string): boolean {
  return name.startsWith("[ARCHIVED]");
}

export async function fetchProgramsFiltersData(
  supabase: SupabaseClient,
): Promise<ProgramsOverviewData["filtersData"]> {
  const [locationsRes, trainersRes, membershipRes] = await Promise.all([
    supabase.from("gym_locations").select("*").eq("is_active", true).order("name"),
    supabase
      .from("profiles")
      .select("id, display_name")
      .eq("role", "trainer")
      .is("deleted_at", null)
      .order("display_name"),
    supabase.from("membership_types").select("*").order("sort_order"),
  ]);

  if (locationsRes.error) throw new Error(locationsRes.error.message);
  if (trainersRes.error) throw new Error(trainersRes.error.message);
  if (membershipRes.error) throw new Error(membershipRes.error.message);

  return {
    locations: (locationsRes.data ?? []) as GymLocationRow[],
    trainers: (trainersRes.data ?? []) as Pick<ProfileRow, "id" | "display_name">[],
    membershipTypes: (membershipRes.data ?? []) as MembershipTypeRow[],
  };
}

async function fetchTemplateWeekCountMap(
  supabase: SupabaseClient,
  templateIds: string[],
): Promise<Map<string, number>> {
  if (templateIds.length === 0) return new Map();
  const { data, error } = await supabase
    .from("program_template_weeks")
    .select("template_id")
    .in("template_id", templateIds);
  if (error) throw new Error(error.message);
  const map = new Map<string, number>();
  for (const row of data ?? []) {
    const key = String(row.template_id);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
}

function matchesProgramFilter(
  item: ClientProgramListItem,
  filters: ProgramsFilters,
): boolean {
  if (filters.locationId && item.client_location?.id !== filters.locationId) return false;
  if (filters.trainerId && item.primary_trainer_id !== filters.trainerId) return false;
  if (filters.membershipSlug && item.membership_slug !== filters.membershipSlug) return false;
  if (filters.status !== "all" && item.status !== filters.status) return false;
  if (filters.q) {
    const q = filters.q.toLowerCase();
    const hay = `${item.name} ${item.client_name} ${item.client_email ?? ""}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

export async function fetchProgramsOverviewData(
  supabase: SupabaseClient,
  filters: ProgramsFilters,
): Promise<ProgramsOverviewData> {
  const filtersData = await fetchProgramsFiltersData(supabase);

  const [templatesRes, programsRes, clientsRes, activePeriodsRes, requestsRes, profilesRes] =
    await Promise.all([
      supabase.from("program_templates").select("*").order("updated_at", { ascending: false }),
      supabase
        .from("client_programs")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("profiles")
        .select("id, display_name, email, primary_location_id")
        .eq("role", "client")
        .is("deleted_at", null),
      supabase
        .from("client_membership_periods")
        .select("*")
        .eq("status", "active"),
      supabase
        .from("program_change_requests")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("profiles")
        .select("id, display_name")
        .is("deleted_at", null),
    ]);

  if (templatesRes.error) throw new Error(templatesRes.error.message);
  if (programsRes.error) throw new Error(programsRes.error.message);
  if (clientsRes.error) throw new Error(clientsRes.error.message);
  if (activePeriodsRes.error) throw new Error(activePeriodsRes.error.message);
  if (requestsRes.error) throw new Error(requestsRes.error.message);
  if (profilesRes.error) throw new Error(profilesRes.error.message);

  const templates = (templatesRes.data ?? []) as ProgramTemplateRow[];
  const templateWeekMap = await fetchTemplateWeekCountMap(
    supabase,
    templates.map((t) => t.id),
  );
  const templateList: ProgramTemplateListItem[] = templates.map((t) => ({
    ...t,
    week_count: templateWeekMap.get(t.id) ?? 0,
    archived: isArchivedTemplate(t.name),
  }));

  const programs = (programsRes.data ?? []) as ClientProgramRow[];
  const clients = (clientsRes.data ?? []) as Pick<
    ProfileRow,
    "id" | "display_name" | "email" | "primary_location_id"
  >[];
  const locationsMap = new Map(filtersData.locations.map((l) => [l.id, l]));
  const profileMap = new Map(
    ((profilesRes.data ?? []) as Pick<ProfileRow, "id" | "display_name">[]).map((p) => [
      p.id,
      p.display_name,
    ]),
  );
  const clientMap = new Map(clients.map((c) => [c.id, c]));

  const activePeriods = (activePeriodsRes.data ?? []) as ClientMembershipPeriodRow[];
  const membershipTypeById = new Map(filtersData.membershipTypes.map((m) => [m.id, m]));
  const activeMembershipByClient = new Map(
    activePeriods.map((p) => [p.client_id, p.membership_type_id]),
  );

  const clientProgramsAll: ClientProgramListItem[] = programs.map((p) => {
    const client = clientMap.get(p.client_id);
    const location = client?.primary_location_id
      ? (locationsMap.get(client.primary_location_id) ?? null)
      : null;
    const membershipTypeId = activeMembershipByClient.get(p.client_id) ?? null;
    const membershipSlug = membershipTypeId
      ? (membershipTypeById.get(membershipTypeId)?.slug ?? null)
      : null;
    const assignedByName =
      p.author_kind === "manager"
        ? (p.manager_author_id ? (profileMap.get(p.manager_author_id) ?? null) : null)
        : (p.primary_trainer_id ? (profileMap.get(p.primary_trainer_id) ?? null) : null);
    return {
      ...p,
      client_name: client?.display_name ?? "Client",
      client_email: client?.email ?? null,
      client_location: location ? { id: location.id, name: location.name } : null,
      trainer_name: p.primary_trainer_id
        ? (profileMap.get(p.primary_trainer_id) ?? null)
        : null,
      membership_slug: membershipSlug,
      assigned_by_name: assignedByName,
    };
  });

  const clientPrograms = clientProgramsAll.filter((p) =>
    matchesProgramFilter(p, filters),
  );

  const requestsRaw = (requestsRes.data ?? []) as ProgramChangeRequestRow[];
  const programMap = new Map(clientProgramsAll.map((p) => [p.id, p]));
  const pendingRequests: ProgramRequestListItem[] = requestsRaw.map((r) => {
    const program = programMap.get(r.client_program_id);
    return {
      ...r,
      requester_name: profileMap.get(r.requested_by) ?? null,
      program_name: program?.name ?? null,
      client_name: program?.client_name ?? null,
    };
  });

  const clientsWithActiveProgram = new Set(
    clientProgramsAll.filter((p) => p.status === "active").map((p) => p.client_id),
  );
  const clientsWithNoActiveProgram = clients.filter(
    (c) => !clientsWithActiveProgram.has(c.id),
  ).length;

  const now = new Date();
  const soon = new Date(now);
  soon.setDate(soon.getDate() + 14);
  const endingSoon = clientProgramsAll.filter((p) => {
    if (p.status !== "active" || !p.end_date) return false;
    const end = new Date(p.end_date);
    return end >= now && end <= soon;
  }).length;

  const summary: ProgramsSummary = {
    activePrograms: clientProgramsAll.filter((p) => p.status === "active").length,
    templateCount: templateList.filter((t) => !t.archived).length,
    clientsWithNoActiveProgram,
    pendingChangeRequests: pendingRequests.length,
    endingSoon,
  };

  return {
    filtersData,
    templates: templateList,
    clientPrograms,
    pendingRequests,
    summary,
  };
}

export async function fetchExercisesForPicker(
  supabase: SupabaseClient,
  q: string,
): Promise<(ExerciseRow & { muscles: string[] })[]> {
  let query = supabase.from("exercises").select("*").eq("is_active", true);
  if (q.trim()) {
    const esc = q.trim().replace(/%/g, "\\%").replace(/_/g, "\\_");
    query = query.ilike("name", `%${esc}%`);
  }
  const { data: exData, error: exErr } = await query.order("name").limit(60);
  if (exErr) throw new Error(exErr.message);
  const exercises = (exData ?? []) as ExerciseRow[];
  if (exercises.length === 0) return [];

  const ids = exercises.map((e) => e.id);
  const { data: mt, error: mtErr } = await supabase
    .from("exercise_muscle_targets")
    .select("exercise_id, muscle")
    .in("exercise_id", ids);
  if (mtErr) throw new Error(mtErr.message);
  const musclesByExercise = new Map<string, string[]>();
  for (const row of mt ?? []) {
    const id = String(row.exercise_id);
    const list = musclesByExercise.get(id) ?? [];
    list.push(String(row.muscle));
    musclesByExercise.set(id, list);
  }
  return exercises.map((e) => ({
    ...e,
    muscles: musclesByExercise.get(e.id) ?? [],
  }));
}

export async function fetchTemplateDetail(
  supabase: SupabaseClient,
  templateId: string,
): Promise<TemplateDetailData | null> {
  const { data: template, error: tErr } = await supabase
    .from("program_templates")
    .select("*")
    .eq("id", templateId)
    .maybeSingle();
  if (tErr) throw new Error(tErr.message);
  if (!template) return null;

  const { data: weeksData, error: weeksErr } = await supabase
    .from("program_template_weeks")
    .select("*")
    .eq("template_id", templateId)
    .order("week_number");
  if (weeksErr) throw new Error(weeksErr.message);
  const weeks = (weeksData ?? []) as ProgramTemplateWeekRow[];
  const weekIds = weeks.map((w) => w.id);

  const { data: daysData, error: daysErr } = weekIds.length
    ? await supabase
        .from("program_template_days")
        .select("*")
        .in("week_id", weekIds)
        .order("day_number")
    : { data: [], error: null };
  if (daysErr) throw new Error(daysErr.message);
  const days = (daysData ?? []) as ProgramTemplateDayRow[];
  const dayIds = days.map((d) => d.id);

  const { data: linesData, error: linesErr } = dayIds.length
    ? await supabase
        .from("program_template_day_exercises")
        .select("*")
        .in("day_id", dayIds)
        .order("sequence")
    : { data: [], error: null };
  if (linesErr) throw new Error(linesErr.message);
  const lines = (linesData ?? []) as ProgramTemplateDayExerciseRow[];
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

  const daysByWeek = new Map<string, ProgramTemplateDayRow[]>();
  for (const day of days) {
    const list = daysByWeek.get(day.week_id) ?? [];
    list.push(day);
    daysByWeek.set(day.week_id, list);
  }
  const linesByDay = new Map<string, ProgramTemplateDayExerciseRow[]>();
  for (const line of lines) {
    const list = linesByDay.get(line.day_id) ?? [];
    list.push(line);
    linesByDay.set(line.day_id, list);
  }

  return {
    template: template as ProgramTemplateRow,
    weeks: weeks.map((week) => ({
      ...week,
      days: (daysByWeek.get(week.id) ?? []).map((day) => ({
        ...day,
        exercises: (linesByDay.get(day.id) ?? []).map((line) => ({
          ...line,
          exercise: exerciseMap.get(line.exercise_id) ?? null,
        })),
      })),
    })),
  };
}

export async function fetchClientProgramDetail(
  supabase: SupabaseClient,
  programId: string,
): Promise<ClientProgramDetailData | null> {
  const { data: program, error: pErr } = await supabase
    .from("client_programs")
    .select("*")
    .eq("id", programId)
    .maybeSingle();
  if (pErr) throw new Error(pErr.message);
  if (!program) return null;

  const [clientRes, locationRes, trainerRes, managerRes, weeksRes, reqRes, sessionsRes] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, display_name, email, primary_location_id")
        .eq("id", program.client_id)
        .maybeSingle(),
      supabase.from("gym_locations").select("id, name").eq("is_active", true),
      program.primary_trainer_id
        ? supabase
            .from("profiles")
            .select("id, display_name")
            .eq("id", program.primary_trainer_id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      program.manager_author_id
        ? supabase
            .from("profiles")
            .select("id, display_name")
            .eq("id", program.manager_author_id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      supabase
        .from("client_program_weeks")
        .select("*")
        .eq("program_id", programId)
        .order("week_number"),
      supabase
        .from("program_change_requests")
        .select("*")
        .eq("client_program_id", programId)
        .eq("status", "pending")
        .order("created_at", { ascending: false }),
      supabase
        .from("workout_sessions")
        .select("id, started_at, completed_at, status, appointment_id")
        .eq("client_program_id", programId)
        .order("started_at", { ascending: false })
        .limit(8),
    ]);

  if (clientRes.error) throw new Error(clientRes.error.message);
  if (locationRes.error) throw new Error(locationRes.error.message);
  if (trainerRes.error) throw new Error(trainerRes.error.message);
  if (managerRes.error) throw new Error(managerRes.error.message);
  if (weeksRes.error) throw new Error(weeksRes.error.message);
  if (reqRes.error) throw new Error(reqRes.error.message);
  if (sessionsRes.error) throw new Error(sessionsRes.error.message);

  const client = clientRes.data as Pick<
    ProfileRow,
    "id" | "display_name" | "email" | "primary_location_id"
  > | null;
  if (!client) return null;

  const locationMap = new Map(
    ((locationRes.data ?? []) as Pick<GymLocationRow, "id" | "name">[]).map((l) => [
      l.id,
      l,
    ]),
  );
  const clientLocation = client.primary_location_id
    ? (locationMap.get(client.primary_location_id) ?? null)
    : null;

  const programView: ClientProgramListItem = {
    ...(program as ClientProgramRow),
    client_name: client.display_name,
    client_email: client.email ?? null,
    client_location: clientLocation,
    trainer_name: (trainerRes.data as { display_name: string } | null)?.display_name ?? null,
    membership_slug: null,
    assigned_by_name:
      ((program.author_kind === "manager" ? managerRes.data : trainerRes.data) as {
        display_name: string;
      } | null)?.display_name ?? null,
  };

  const weeks = (weeksRes.data ?? []) as ClientProgramWeekRow[];
  const weekIds = weeks.map((w) => w.id);
  const { data: daysData, error: daysErr } = weekIds.length
    ? await supabase
        .from("client_program_days")
        .select("*")
        .in("week_id", weekIds)
        .order("day_number")
    : { data: [], error: null };
  if (daysErr) throw new Error(daysErr.message);
  const days = (daysData ?? []) as ClientProgramDayRow[];
  const dayIds = days.map((d) => d.id);

  const { data: linesData, error: linesErr } = dayIds.length
    ? await supabase
        .from("client_program_day_exercises")
        .select("*")
        .in("day_id", dayIds)
        .order("sequence")
    : { data: [], error: null };
  if (linesErr) throw new Error(linesErr.message);
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

  const daysByWeek = new Map<string, ClientProgramDayRow[]>();
  for (const day of days) {
    const list = daysByWeek.get(day.week_id) ?? [];
    list.push(day);
    daysByWeek.set(day.week_id, list);
  }
  const linesByDay = new Map<string, ClientProgramDayExerciseRow[]>();
  for (const line of lines) {
    const list = linesByDay.get(line.day_id) ?? [];
    list.push(line);
    linesByDay.set(line.day_id, list);
  }

  const sessions = (sessionsRes.data ?? []) as Pick<
    WorkoutSessionRow,
    "id" | "started_at" | "completed_at" | "status" | "appointment_id"
  >[];
  const appointmentIds = [
    ...new Set(sessions.map((s) => s.appointment_id).filter(Boolean)),
  ] as string[];
  const { data: appts, error: apptErr } = appointmentIds.length
    ? await supabase.from("appointments").select("id, starts_at").in("id", appointmentIds)
    : { data: [], error: null };
  if (apptErr) throw new Error(apptErr.message);
  const apptMap = new Map(((appts ?? []) as Pick<AppointmentRow, "id" | "starts_at">[]).map((a) => [a.id, a.starts_at]));

  const requestsRaw = (reqRes.data ?? []) as ProgramChangeRequestRow[];
  const { data: reqProfiles, error: reqProfilesErr } = requestsRaw.length
    ? await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", [...new Set(requestsRaw.map((r) => r.requested_by))])
    : { data: [], error: null };
  if (reqProfilesErr) throw new Error(reqProfilesErr.message);
  const reqNameMap = new Map(
    ((reqProfiles ?? []) as Pick<ProfileRow, "id" | "display_name">[]).map((p) => [
      p.id,
      p.display_name,
    ]),
  );
  const pendingRequests: ProgramRequestListItem[] = requestsRaw.map((r) => ({
    ...r,
    requester_name: reqNameMap.get(r.requested_by) ?? null,
    program_name: programView.name,
    client_name: programView.client_name,
  }));

  return {
    program: programView,
    weeks: weeks.map((week) => ({
      ...week,
      days: (daysByWeek.get(week.id) ?? []).map((day) => ({
        ...day,
        exercises: (linesByDay.get(day.id) ?? []).map((line) => ({
          ...line,
          exercise: exerciseMap.get(line.exercise_id) ?? null,
        })),
      })),
    })),
    recentSessions: sessions.map((s) => ({
      ...s,
      appointment_starts_at: s.appointment_id ? (apptMap.get(s.appointment_id) ?? null) : null,
    })),
    pendingRequests,
  };
}

export async function fetchExerciseRelationSummary(
  supabase: SupabaseClient,
  exerciseId: string,
): Promise<{
  alternatives: number;
  progressions: number;
  regressions: number;
}> {
  const [altRes, progRes, regRes] = await Promise.all([
    supabase
      .from("exercise_alternatives")
      .select("exercise_id")
      .eq("exercise_id", exerciseId),
    supabase
      .from("exercise_progressions")
      .select("exercise_id")
      .eq("exercise_id", exerciseId),
    supabase
      .from("exercise_regressions")
      .select("exercise_id")
      .eq("exercise_id", exerciseId),
  ]);
  if (altRes.error) throw new Error(altRes.error.message);
  if (progRes.error) throw new Error(progRes.error.message);
  if (regRes.error) throw new Error(regRes.error.message);
  return {
    alternatives: (altRes.data ?? []).length,
    progressions: (progRes.data ?? []).length,
    regressions: (regRes.data ?? []).length,
  };
}

export async function fetchProgramAssignmentOptions(supabase: SupabaseClient): Promise<{
  clients: Pick<ProfileRow, "id" | "display_name" | "email">[];
  trainers: Pick<ProfileRow, "id" | "display_name">[];
  templates: Pick<ProgramTemplateRow, "id" | "name" | "duration_weeks">[];
}> {
  const [clientsRes, trainersRes, templatesRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, display_name, email")
      .eq("role", "client")
      .is("deleted_at", null)
      .order("display_name"),
    supabase
      .from("profiles")
      .select("id, display_name")
      .eq("role", "trainer")
      .is("deleted_at", null)
      .order("display_name"),
    supabase
      .from("program_templates")
      .select("id, name, duration_weeks")
      .order("name"),
  ]);
  if (clientsRes.error) throw new Error(clientsRes.error.message);
  if (trainersRes.error) throw new Error(trainersRes.error.message);
  if (templatesRes.error) throw new Error(templatesRes.error.message);

  const templates = ((templatesRes.data ?? []) as Pick<
    ProgramTemplateRow,
    "id" | "name" | "duration_weeks"
  >[]).filter((t) => !isArchivedTemplate(t.name));

  return {
    clients: (clientsRes.data ?? []) as Pick<ProfileRow, "id" | "display_name" | "email">[],
    trainers: (trainersRes.data ?? []) as Pick<ProfileRow, "id" | "display_name">[],
    templates,
  };
}
