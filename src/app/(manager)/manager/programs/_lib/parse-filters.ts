export type ProgramStatusFilter = "all" | "active" | "completed" | "cancelled";

export type ProgramsFilters = {
  q: string;
  locationId: string | null;
  trainerId: string | null;
  membershipSlug: string | null;
  status: ProgramStatusFilter;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MEMBERSHIP_SLUGS = new Set(["open_gym", "semi_private", "private"]);

export function parseProgramsSearchParams(
  raw: Record<string, string | string[] | undefined>,
): ProgramsFilters {
  const get = (key: string): string => {
    const v = raw[key];
    return typeof v === "string" ? v : "";
  };

  const locationRaw = get("locationId");
  const trainerRaw = get("trainerId");
  const membershipRaw = get("membership");
  const statusRaw = get("status");

  const status: ProgramStatusFilter =
    statusRaw === "active" || statusRaw === "completed" || statusRaw === "cancelled"
      ? statusRaw
      : "all";

  return {
    q: get("q").trim(),
    locationId: UUID_RE.test(locationRaw) ? locationRaw : null,
    trainerId: UUID_RE.test(trainerRaw) ? trainerRaw : null,
    membershipSlug: MEMBERSHIP_SLUGS.has(membershipRaw) ? membershipRaw : null,
    status,
  };
}
