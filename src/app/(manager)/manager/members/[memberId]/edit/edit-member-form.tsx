"use client";

import { useActionState } from "react";

import { updateMemberProfileAction } from "@/app/(manager)/manager/members/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select-native";
import type { ClientTrainingPreferencesRow, ProfileRow } from "@/types/database.types";
import type { GymLocationRow } from "@/types/database.types";

type Props = {
  memberId: string;
  profile: ProfileRow;
  preferences: ClientTrainingPreferencesRow | null;
  locations: GymLocationRow[];
};

export function EditMemberForm({
  memberId,
  profile,
  preferences,
  locations,
}: Props) {
  const bound = updateMemberProfileAction.bind(null, memberId);
  const [state, formAction, pending] = useActionState(bound, null);

  return (
    <form action={formAction} className="space-y-6">
      {state?.ok ? (
        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
          Profile saved.
        </p>
      ) : null}
      {state && !state.ok ? (
        <p className="text-sm font-medium text-destructive">{state.error}</p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="display_name">Full name *</Label>
          <Input
            id="display_name"
            name="display_name"
            required
            defaultValue={profile.display_name}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            defaultValue={profile.phone ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="date_of_birth">Date of birth</Label>
          <Input
            id="date_of_birth"
            name="date_of_birth"
            type="date"
            defaultValue={profile.date_of_birth ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sex">Sex</Label>
          <SelectNative
            id="sex"
            name="sex"
            defaultValue={profile.sex ?? ""}
          >
            <option value="">—</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="non_binary">Non-binary</option>
            <option value="prefer_not">Prefer not to say</option>
            <option value="other">Other</option>
          </SelectNative>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="primary_location_id">Home location</Label>
          <SelectNative
            id="primary_location_id"
            name="primary_location_id"
            defaultValue={profile.primary_location_id ?? ""}
          >
            <option value="">—</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </SelectNative>
        </div>
      </div>

      <div className="rounded-lg border border-border/60 p-4">
        <h4 className="mb-3 text-sm font-medium">Client-visible preferences</h4>
        <p className="mb-3 text-xs text-muted-foreground">
          Plan history visibility is enforced in app queries per product rules.
        </p>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="show_plan_history"
            defaultChecked={preferences?.show_plan_history ?? true}
          />
          Show plan history in member app
        </label>
        <label className="mt-2 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="allow_self_log"
            defaultChecked={preferences?.allow_self_log ?? true}
          />
          Allow self workout logging
        </label>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save profile"}
      </Button>
    </form>
  );
}
