import Link from "next/link";

import type { ScheduleFilters } from "@/app/(manager)/manager/schedule/_lib/parse-filters";
import type { ScheduleData } from "@/app/(manager)/manager/schedule/_lib/queries";
import { addDays, parseYmd, toDateYmd } from "@/app/(manager)/manager/schedule/_lib/time";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select-native";
import { ROUTES } from "@/lib/navigation/dashboard-nav";

type Props = {
  filters: ScheduleFilters;
  data: ScheduleData["filtersData"];
};

export function ScheduleFilters({ filters, data }: Props) {
  const parsed = parseYmd(filters.date) ?? new Date();
  const prevDate = toDateYmd(addDays(parsed, filters.view === "day" ? -1 : -7));
  const nextDate = toDateYmd(addDays(parsed, filters.view === "day" ? 1 : 7));

  const shared = new URLSearchParams();
  shared.set("view", filters.view);
  shared.set("type", filters.type);
  if (filters.locationId) shared.set("locationId", filters.locationId);
  if (filters.trainerId) shared.set("trainerId", filters.trainerId);

  return (
    <form
      action={ROUTES.manager.schedule}
      method="get"
      className="mb-6 space-y-4 rounded-xl border border-border/80 bg-card p-4 shadow-sm"
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <div className="space-y-2">
          <Label htmlFor="view">View</Label>
          <SelectNative id="view" name="view" defaultValue={filters.view}>
            <option value="day">Day</option>
            <option value="week">Week</option>
          </SelectNative>
        </div>
        <div className="space-y-2">
          <Label htmlFor="date">Anchor date</Label>
          <Input id="date" name="date" type="date" defaultValue={filters.date} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="locationId">Location</Label>
          <SelectNative
            id="locationId"
            name="locationId"
            defaultValue={filters.locationId ?? ""}
          >
            <option value="">All locations</option>
            {data.locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </SelectNative>
        </div>
        <div className="space-y-2">
          <Label htmlFor="trainerId">Trainer/staff</Label>
          <SelectNative
            id="trainerId"
            name="trainerId"
            defaultValue={filters.trainerId ?? ""}
          >
            <option value="">All staff</option>
            {data.staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.display_name}
              </option>
            ))}
          </SelectNative>
        </div>
        <div className="space-y-2">
          <Label htmlFor="type">Schedule type</Label>
          <SelectNative id="type" name="type" defaultValue={filters.type}>
            <option value="all">All</option>
            <option value="shifts">Shifts</option>
            <option value="availability">Availability</option>
            <option value="appointments">Appointments</option>
          </SelectNative>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit">Apply</Button>
        <Button variant="outline" asChild>
          <Link href={ROUTES.manager.schedule}>Reset</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link
            href={`${ROUTES.manager.schedule}?${new URLSearchParams({
              ...Object.fromEntries(shared.entries()),
              date: prevDate,
            }).toString()}`}
          >
            Previous {filters.view}
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link
            href={`${ROUTES.manager.schedule}?${new URLSearchParams({
              ...Object.fromEntries(shared.entries()),
              date: nextDate,
            }).toString()}`}
          >
            Next {filters.view}
          </Link>
        </Button>
      </div>
    </form>
  );
}
