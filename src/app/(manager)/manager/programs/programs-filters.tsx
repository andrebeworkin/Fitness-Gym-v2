"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select-native";
import type { GymLocationRow, MembershipTypeRow, ProfileRow } from "@/types/database.types";

type Props = {
  locations: GymLocationRow[];
  trainers: Pick<ProfileRow, "id" | "display_name">[];
  membershipTypes: MembershipTypeRow[];
  values: {
    q: string;
    locationId: string;
    trainerId: string;
    membership: string;
    status: string;
  };
};

export function ProgramsFilters({
  locations,
  trainers,
  membershipTypes,
  values,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const defaultParams = useMemo(() => new URLSearchParams(searchParams), [searchParams]);

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <form
          className="grid gap-4 lg:grid-cols-6"
          action={(fd) => {
            const params = new URLSearchParams(defaultParams);
            const q = String(fd.get("q") ?? "").trim();
            const locationId = String(fd.get("locationId") ?? "").trim();
            const trainerId = String(fd.get("trainerId") ?? "").trim();
            const membership = String(fd.get("membership") ?? "").trim();
            const status = String(fd.get("status") ?? "all").trim();

            if (q) params.set("q", q);
            else params.delete("q");
            if (locationId) params.set("locationId", locationId);
            else params.delete("locationId");
            if (trainerId) params.set("trainerId", trainerId);
            else params.delete("trainerId");
            if (membership) params.set("membership", membership);
            else params.delete("membership");
            if (status && status !== "all") params.set("status", status);
            else params.delete("status");

            router.push(`${pathname}?${params.toString()}`);
          }}
        >
          <div className="space-y-2 lg:col-span-2">
            <Label htmlFor="q">Search</Label>
            <Input
              id="q"
              name="q"
              defaultValue={values.q}
              placeholder="Client or program name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="locationId">Location</Label>
            <SelectNative id="locationId" name="locationId" defaultValue={values.locationId}>
              <option value="">All locations</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </SelectNative>
          </div>
          <div className="space-y-2">
            <Label htmlFor="trainerId">Trainer</Label>
            <SelectNative id="trainerId" name="trainerId" defaultValue={values.trainerId}>
              <option value="">All trainers</option>
              {trainers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.display_name}
                </option>
              ))}
            </SelectNative>
          </div>
          <div className="space-y-2">
            <Label htmlFor="membership">Membership</Label>
            <SelectNative id="membership" name="membership" defaultValue={values.membership}>
              <option value="">All memberships</option>
              {membershipTypes.map((m) => (
                <option key={m.id} value={m.slug}>
                  {m.name}
                </option>
              ))}
            </SelectNative>
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <SelectNative id="status" name="status" defaultValue={values.status || "all"}>
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </SelectNative>
          </div>
          <div className="flex gap-2 lg:col-span-6">
            <Button type="submit">Apply filters</Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push(pathname)}
            >
              Clear
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
