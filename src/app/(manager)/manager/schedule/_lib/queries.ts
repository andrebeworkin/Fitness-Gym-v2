import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { ScheduleFilters } from "@/app/(manager)/manager/schedule/_lib/parse-filters";
import {
  addDays,
  getViewRange,
  parseTimeToMinutes,
  parseYmd,
  startOfWeekMonday,
  toDateYmd,
} from "@/app/(manager)/manager/schedule/_lib/time";
import type {
  AppointmentChangeRequestRow,
  AppointmentRow,
  GymLocationRow,
  ProfileRow,
  StaffShiftRow,
  TrainerAvailabilitySlotRow,
} from "@/types/database.types";

export type ScheduleTypeFilter = "all" | "shifts" | "availability" | "appointments";

export type StaffOption = Pick<ProfileRow, "id" | "display_name" | "role">;
export type ClientOption = Pick<ProfileRow, "id" | "display_name" | "email">;

export type ShiftItem = StaffShiftRow & {
  staff_name: string;
  location_name: string;
};

export type AvailabilityItem = TrainerAvailabilitySlotRow & {
  trainer_name: string;
  location_name: string;
  booking_status: "open" | "booked" | "unavailable";
  linked_appointment_id: string | null;
};

export type AppointmentItem = AppointmentRow & {
  client_name: string;
  trainer_name: string;
  substitute_trainer_name: string | null;
  location_name: string;
  has_shift_coverage: boolean;
  has_matching_availability: boolean;
  attention_flag: boolean;
};

export type PendingChangeRequestItem = AppointmentChangeRequestRow & {
  appointment: AppointmentItem | null;
  requested_by_name: string | null;
};

export type ScheduleSummary = {
  todaysAppointments: number;
  todaysShifts: number;
  openAvailabilityCount: number;
  noShowsThisWeek: number;
  appointmentsNeedingAttention: number;
};

export type ScheduleData = {
  filtersData: {
    locations: GymLocationRow[];
    staff: StaffOption[];
    trainers: StaffOption[];
    clients: ClientOption[];
  };
  range: {
    start: string;
    endExclusive: string;
    dayKeys: string[];
  };
  summary: ScheduleSummary;
  shifts: ShiftItem[];
  availability: AvailabilityItem[];
  appointments: AppointmentItem[];
  pendingRequests: PendingChangeRequestItem[];
};

function inSelectedLocation(locationId: string, filterLocation: string | null) {
  if (!filterLocation) return true;
  return locationId === filterLocation;
}

function inSelectedTrainer(
  primaryTrainerId: string,
  substituteTrainerId: string | null,
  filterTrainer: string | null,
) {
  if (!filterTrainer) return true;
  return primaryTrainerId === filterTrainer || substituteTrainerId === filterTrainer;
}

function isAppointmentCoveredByShift(
  appointment: AppointmentRow,
  shifts: StaffShiftRow[],
): boolean {
  const starts = new Date(appointment.starts_at);
  const ends = new Date(appointment.ends_at);
  const dateKey = toDateYmd(starts);
  const startMinutes = starts.getHours() * 60 + starts.getMinutes();
  const endMinutes = ends.getHours() * 60 + ends.getMinutes();

  return shifts.some((s) => {
    if (s.staff_id !== appointment.primary_trainer_id) return false;
    if (s.location_id !== appointment.location_id) return false;
    if (s.shift_date !== dateKey) return false;
    const shiftStart = parseTimeToMinutes(s.start_time);
    const shiftEnd = parseTimeToMinutes(s.end_time);
    if (shiftStart === null || shiftEnd === null) return false;
    return shiftStart <= startMinutes && shiftEnd >= endMinutes;
  });
}

function buildDayKeys(start: Date, endExclusive: Date): string[] {
  const keys: string[] = [];
  for (let d = new Date(start); d < endExclusive; d = addDays(d, 1)) {
    keys.push(toDateYmd(d));
  }
  return keys;
}

export async function fetchScheduleData(
  supabase: SupabaseClient,
  filters: ScheduleFilters,
): Promise<ScheduleData> {
  const anchor = parseYmd(filters.date) ?? new Date();
  const { start, end } = getViewRange(anchor, filters.view);
  const dayKeys = buildDayKeys(start, end);
  const startIso = start.toISOString();
  const endIso = end.toISOString();
  const startDate = toDateYmd(start);
  const endDateExclusive = toDateYmd(end);

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const todayEnd = addDays(todayStart, 1);
  const weekStart = startOfWeekMonday(today);
  const weekEnd = addDays(weekStart, 7);

  const [locationsRes, staffRes, trainersRes, clientsRes, shiftsRes, availabilityRes, appointmentsRes, requestsRes] =
    await Promise.all([
      supabase.from("gym_locations").select("*").eq("is_active", true).order("name"),
      supabase
        .from("profiles")
        .select("id, display_name, role")
        .is("deleted_at", null)
        .in("role", ["manager", "trainer"])
        .order("display_name"),
      supabase
        .from("profiles")
        .select("id, display_name, role")
        .eq("role", "trainer")
        .is("deleted_at", null)
        .order("display_name"),
      supabase
        .from("profiles")
        .select("id, display_name, email")
        .eq("role", "client")
        .is("deleted_at", null)
        .order("display_name"),
      supabase
        .from("staff_shifts")
        .select("*")
        .gte("shift_date", startDate)
        .lt("shift_date", endDateExclusive)
        .order("shift_date")
        .order("start_time"),
      supabase
        .from("trainer_availability_slots")
        .select("*")
        .gte("starts_at", startIso)
        .lt("starts_at", endIso)
        .order("starts_at"),
      supabase
        .from("appointments")
        .select("*")
        .gte("starts_at", startIso)
        .lt("starts_at", endIso)
        .order("starts_at"),
      supabase
        .from("appointment_change_requests")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(30),
    ]);

  if (locationsRes.error) throw new Error(locationsRes.error.message);
  if (staffRes.error) throw new Error(staffRes.error.message);
  if (trainersRes.error) throw new Error(trainersRes.error.message);
  if (clientsRes.error) throw new Error(clientsRes.error.message);
  if (shiftsRes.error) throw new Error(shiftsRes.error.message);
  if (availabilityRes.error) throw new Error(availabilityRes.error.message);
  if (appointmentsRes.error) throw new Error(appointmentsRes.error.message);
  if (requestsRes.error) throw new Error(requestsRes.error.message);

  const locations = (locationsRes.data ?? []) as GymLocationRow[];
  const staff = (staffRes.data ?? []) as StaffOption[];
  const trainers = (trainersRes.data ?? []) as StaffOption[];
  const clients = (clientsRes.data ?? []) as ClientOption[];
  const shiftsRaw = (shiftsRes.data ?? []) as StaffShiftRow[];
  const availabilityRaw = (availabilityRes.data ?? []) as TrainerAvailabilitySlotRow[];
  const appointmentsRaw = (appointmentsRes.data ?? []) as AppointmentRow[];
  const pendingRequestsRaw = (requestsRes.data ?? []) as AppointmentChangeRequestRow[];

  const profileNameById = new Map<string, string>();
  for (const s of staff) profileNameById.set(s.id, s.display_name);
  for (const c of clients) profileNameById.set(c.id, c.display_name);

  const locationById = new Map(locations.map((l) => [l.id, l]));

  const slotToAppointment = new Map<string, AppointmentRow>();
  for (const appt of appointmentsRaw) {
    if (appt.availability_slot_id) {
      slotToAppointment.set(appt.availability_slot_id, appt);
    }
  }

  const shiftsFiltered = shiftsRaw.filter(
    (s) =>
      inSelectedLocation(s.location_id, filters.locationId) &&
      (!filters.trainerId || s.staff_id === filters.trainerId),
  );

  const availabilityFiltered = availabilityRaw.filter(
    (s) =>
      inSelectedLocation(s.location_id, filters.locationId) &&
      (!filters.trainerId || s.trainer_id === filters.trainerId),
  );

  const appointmentsFiltered = appointmentsRaw.filter(
    (a) =>
      inSelectedLocation(a.location_id, filters.locationId) &&
      inSelectedTrainer(a.primary_trainer_id, a.substitute_trainer_id, filters.trainerId),
  );

  const shifts: ShiftItem[] = shiftsFiltered.map((s) => ({
    ...s,
    staff_name: profileNameById.get(s.staff_id) ?? "Staff",
    location_name: locationById.get(s.location_id)?.name ?? "Location",
  }));

  const availability: AvailabilityItem[] = availabilityFiltered.map((s) => {
    const linked = slotToAppointment.get(s.id) ?? null;
    const booking_status: AvailabilityItem["booking_status"] = linked
      ? "booked"
      : s.is_open
        ? "open"
        : "unavailable";
    return {
      ...s,
      trainer_name: profileNameById.get(s.trainer_id) ?? "Trainer",
      location_name: locationById.get(s.location_id)?.name ?? "Location",
      booking_status,
      linked_appointment_id: linked?.id ?? null,
    };
  });

  const slotById = new Map(availabilityRaw.map((s) => [s.id, s]));

  const appointments: AppointmentItem[] = appointmentsFiltered.map((a) => {
    const hasShiftCoverage = isAppointmentCoveredByShift(a, shiftsRaw);
    const matchingSlot = a.availability_slot_id
      ? slotById.get(a.availability_slot_id) ?? null
      : availabilityRaw.find(
          (s) =>
            s.trainer_id === a.primary_trainer_id &&
            s.location_id === a.location_id &&
            s.starts_at === a.starts_at &&
            s.ends_at === a.ends_at,
        ) ?? null;
    const hasMatchingAvailability = Boolean(matchingSlot);
    const attentionFlag =
      (a.status === "scheduled" && new Date(a.starts_at) < today) ||
      !hasShiftCoverage ||
      !hasMatchingAvailability;

    return {
      ...a,
      client_name: profileNameById.get(a.client_id) ?? "Client",
      trainer_name: profileNameById.get(a.primary_trainer_id) ?? "Trainer",
      substitute_trainer_name: a.substitute_trainer_id
        ? (profileNameById.get(a.substitute_trainer_id) ?? null)
        : null,
      location_name: locationById.get(a.location_id)?.name ?? "Location",
      has_shift_coverage: hasShiftCoverage,
      has_matching_availability: hasMatchingAvailability,
      attention_flag: attentionFlag,
    };
  });

  const requestAppointmentIds = [
    ...new Set(pendingRequestsRaw.map((r) => r.appointment_id)),
  ];
  const requestAppointments = new Map<string, AppointmentItem>();
  if (requestAppointmentIds.length > 0) {
    const existing = new Map(appointments.map((a) => [a.id, a]));
    for (const id of requestAppointmentIds) {
      const found = existing.get(id);
      if (found) requestAppointments.set(id, found);
    }
  }

  const pendingRequests: PendingChangeRequestItem[] = pendingRequestsRaw.map((r) => ({
    ...r,
    appointment: requestAppointments.get(r.appointment_id) ?? null,
    requested_by_name: r.requested_by ? (profileNameById.get(r.requested_by) ?? null) : null,
  }));

  const todaysAppointments = appointmentsRaw.filter(
    (a) =>
      new Date(a.starts_at) >= todayStart &&
      new Date(a.starts_at) < todayEnd &&
      inSelectedLocation(a.location_id, filters.locationId) &&
      inSelectedTrainer(a.primary_trainer_id, a.substitute_trainer_id, filters.trainerId),
  ).length;

  const todaysShifts = shiftsRaw.filter(
    (s) =>
      s.shift_date === toDateYmd(todayStart) &&
      inSelectedLocation(s.location_id, filters.locationId) &&
      (!filters.trainerId || s.staff_id === filters.trainerId),
  ).length;

  const openAvailabilityCount = availability.filter((a) => a.booking_status === "open").length;

  const noShowsThisWeek = appointmentsRaw.filter(
    (a) =>
      new Date(a.starts_at) >= weekStart &&
      new Date(a.starts_at) < weekEnd &&
      a.status === "no_show" &&
      inSelectedLocation(a.location_id, filters.locationId) &&
      inSelectedTrainer(a.primary_trainer_id, a.substitute_trainer_id, filters.trainerId),
  ).length;

  const appointmentsNeedingAttention = appointments.filter((a) => a.attention_flag).length;

  return {
    filtersData: { locations, staff, trainers, clients },
    range: {
      start: toDateYmd(start),
      endExclusive: toDateYmd(end),
      dayKeys,
    },
    summary: {
      todaysAppointments,
      todaysShifts,
      openAvailabilityCount,
      noShowsThisWeek,
      appointmentsNeedingAttention,
    },
    shifts,
    availability,
    appointments,
    pendingRequests,
  };
}
