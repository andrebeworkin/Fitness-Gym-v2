"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { ReportsFilters } from "@/app/(manager)/manager/reports/_lib/parse-filters";
import type { ReportsOptions } from "@/app/(manager)/manager/reports/_lib/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select-native";

type Props = {
  filters: ReportsFilters;
  options: ReportsOptions;
};

export function ReportsFiltersForm({ filters, options }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const defaults = useMemo(
    () => ({
      from: filters.from,
      to: filters.to,
      locationId: filters.locationId ?? "",
      trainerId: filters.trainerId ?? "",
    }),
    [filters],
  );

  return (
    <form
      className="grid gap-3 rounded-xl border border-border/60 bg-card p-4 md:grid-cols-5"
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const fd = new FormData(form);
        const sp = new URLSearchParams(searchParams.toString());
        for (const key of ["from", "to", "locationId", "trainerId"]) {
          const v = String(fd.get(key) ?? "").trim();
          if (v) sp.set(key, v);
          else sp.delete(key);
        }
        router.push(`${pathname}?${sp.toString()}`);
      }}
    >
      <Input name="from" type="date" defaultValue={defaults.from} />
      <Input name="to" type="date" defaultValue={defaults.to} />
      <SelectNative name="locationId" defaultValue={defaults.locationId}>
        <option value="">All locations</option>
        {options.locations.map((l) => (
          <option key={l.id} value={l.id}>
            {l.name}
          </option>
        ))}
      </SelectNative>
      <SelectNative name="trainerId" defaultValue={defaults.trainerId}>
        <option value="">All trainers</option>
        {options.trainers.map((t) => (
          <option key={t.id} value={t.id}>
            {t.display_name}
          </option>
        ))}
      </SelectNative>
      <Button type="submit">Apply filters</Button>
    </form>
  );
}
