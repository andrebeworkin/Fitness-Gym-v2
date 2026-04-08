import type { MemberListFilters } from "@/app/(manager)/manager/members/_lib/queries";

const SLUGS = new Set(["open_gym", "semi_private", "private"]);

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseMemberListSearchParams(
  raw: Record<string, string | string[] | undefined>,
): MemberListFilters {
  const g = (k: string) => {
    const v = raw[k];
    return typeof v === "string" ? v : "";
  };

  const membershipRaw = g("membership");
  const membershipSlug =
    membershipRaw && SLUGS.has(membershipRaw) ? membershipRaw : null;

  const loc = g("locationId");
  const locationId = loc && UUID_RE.test(loc) ? loc : null;

  const paymentRaw = g("payment");
  const payment: MemberListFilters["payment"] =
    paymentRaw === "overdue" || paymentRaw === "ok" || paymentRaw === "all"
      ? paymentRaw
      : "all";

  const sortRaw = g("sort");
  const sort: MemberListFilters["sort"] =
    sortRaw === "newest" || sortRaw === "name" || sortRaw === "overdue"
      ? sortRaw
      : "newest";

  return {
    q: g("q"),
    membershipSlug,
    locationId,
    payment,
    sort,
  };
}
