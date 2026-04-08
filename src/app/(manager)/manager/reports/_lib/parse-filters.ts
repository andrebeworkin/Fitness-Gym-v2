export type ReportsFilters = {
  from: string;
  to: string;
  locationId: string | null;
  trainerId: string | null;
};

function toYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function startOfWeekMonday(now: Date): Date {
  const d = new Date(now);
  const weekday = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - weekday);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function parseReportsSearchParams(
  searchParams: Record<string, string | string[] | undefined>,
): ReportsFilters {
  const fromRaw = typeof searchParams.from === "string" ? searchParams.from : "";
  const toRaw = typeof searchParams.to === "string" ? searchParams.to : "";
  const locationRaw =
    typeof searchParams.locationId === "string" ? searchParams.locationId : "";
  const trainerRaw =
    typeof searchParams.trainerId === "string" ? searchParams.trainerId : "";

  const start = startOfWeekMonday(new Date());
  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  return {
    from: /^\d{4}-\d{2}-\d{2}$/.test(fromRaw) ? fromRaw : toYmd(start),
    to: /^\d{4}-\d{2}-\d{2}$/.test(toRaw) ? toRaw : toYmd(end),
    locationId: locationRaw || null,
    trainerId: trainerRaw || null,
  };
}
