import type { ScheduleTypeFilter } from "@/app/(manager)/manager/schedule/_lib/queries";
import type { ScheduleView } from "@/app/(manager)/manager/schedule/_lib/time";
import { parseYmd, toDateYmd } from "@/app/(manager)/manager/schedule/_lib/time";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ScheduleFilters = {
  view: ScheduleView;
  date: string;
  locationId: string | null;
  trainerId: string | null;
  type: ScheduleTypeFilter;
};

export function parseScheduleSearchParams(
  raw: Record<string, string | string[] | undefined>,
): ScheduleFilters {
  const get = (key: string) => {
    const v = raw[key];
    return typeof v === "string" ? v : "";
  };

  const viewRaw = get("view");
  const view: ScheduleView = viewRaw === "week" ? "week" : "day";

  const dRaw = get("date");
  const parsedDate = parseYmd(dRaw);
  const date = parsedDate ? toDateYmd(parsedDate) : toDateYmd(new Date());

  const locationRaw = get("locationId");
  const locationId = UUID_RE.test(locationRaw) ? locationRaw : null;

  const trainerRaw = get("trainerId");
  const trainerId = UUID_RE.test(trainerRaw) ? trainerRaw : null;

  const typeRaw = get("type");
  const type: ScheduleTypeFilter =
    typeRaw === "shifts" ||
    typeRaw === "availability" ||
    typeRaw === "appointments"
      ? typeRaw
      : "all";

  return { view, date, locationId, trainerId, type };
}
