import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select-native";
import { ROUTES } from "@/lib/navigation/dashboard-nav";
import type { GymLocationRow, MembershipTypeRow } from "@/types/database.types";

type MembersFiltersProps = {
  locations: GymLocationRow[];
  membershipTypes: MembershipTypeRow[];
  values: {
    q: string;
    membership: string;
    locationId: string;
    payment: string;
    sort: string;
  };
};

export function MembersFilters({
  locations,
  membershipTypes,
  values,
}: MembersFiltersProps) {
  return (
    <form
      className="mb-6 space-y-4 rounded-xl border border-border/80 bg-card p-4 shadow-sm"
      action={ROUTES.manager.members}
      method="get"
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="q">Search</Label>
          <Input
            id="q"
            name="q"
            placeholder="Name or email"
            defaultValue={values.q}
            autoComplete="off"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="membership">Membership type</Label>
          <SelectNative id="membership" name="membership" defaultValue={values.membership}>
            <option value="">All types</option>
            {membershipTypes.map((t) => (
              <option key={t.id} value={t.slug}>
                {t.name}
              </option>
            ))}
          </SelectNative>
        </div>
        <div className="space-y-2">
          <Label htmlFor="locationId">Location</Label>
          <SelectNative id="locationId" name="locationId" defaultValue={values.locationId}>
            <option value="">All locations</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </SelectNative>
        </div>
        <div className="space-y-2">
          <Label htmlFor="payment">Payment</Label>
          <SelectNative id="payment" name="payment" defaultValue={values.payment}>
            <option value="all">All</option>
            <option value="overdue">Overdue / unpaid</option>
            <option value="ok">No overdue flag</option>
          </SelectNative>
        </div>
        <div className="space-y-2">
          <Label htmlFor="sort">Sort</Label>
          <SelectNative id="sort" name="sort" defaultValue={values.sort}>
            <option value="newest">Newest members</option>
            <option value="name">Name (A–Z)</option>
            <option value="overdue">Overdue first</option>
          </SelectNative>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit">Apply filters</Button>
        <Button type="button" variant="outline" asChild>
          <Link href={ROUTES.manager.members}>Reset</Link>
        </Button>
        <Button type="button" variant="default" asChild className="ml-auto">
          <Link href={ROUTES.manager.memberNew}>New member</Link>
        </Button>
      </div>
    </form>
  );
}
