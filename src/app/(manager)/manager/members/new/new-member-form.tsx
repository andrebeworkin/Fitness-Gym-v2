"use client";

import { useActionState } from "react";

import {
  createMemberAction,
  type ActionResult,
} from "@/app/(manager)/manager/members/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select-native";
import { Textarea } from "@/components/ui/textarea";
import type { GymLocationRow, MembershipTypeRow } from "@/types/database.types";

type TrainerOpt = { id: string; display_name: string };

type Props = {
  locations: GymLocationRow[];
  membershipTypes: MembershipTypeRow[];
  trainers: TrainerOpt[];
  serviceRoleConfigured: boolean;
};

export function NewMemberForm({
  locations,
  membershipTypes,
  trainers,
  serviceRoleConfigured,
}: Props) {
  const [state, formAction, pending] = useActionState<
    ActionResult | null,
    FormData
  >(createMemberAction, null);

  if (!serviceRoleConfigured) {
    return (
      <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-6 text-sm">
        <p className="font-semibold text-amber-950 dark:text-amber-50">
          Service role key required for in-app signup
        </p>
        <p className="mt-2 text-muted-foreground">
          Add <code className="rounded bg-muted px-1">SUPABASE_SERVICE_ROLE_KEY</code>{" "}
          to <code className="rounded bg-muted px-1">.env.local</code> so the app
          can create Auth users. Alternatively, create users in the Supabase
          Dashboard and set their profile fields there — see{" "}
          <strong>docs/MANAGER_MEMBERS_VERTICAL.md</strong>.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="mx-auto max-w-2xl space-y-8">
      {state && !state.ok ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {state.error}
        </div>
      ) : null}

      <section className="space-y-4 rounded-xl border border-border/80 bg-card p-6 shadow-sm">
        <h3 className="text-lg font-semibold">Account</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="email">Email *</Label>
            <Input id="email" name="email" type="email" required autoComplete="off" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="password">Temporary password *</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
            />
            <p className="text-xs text-muted-foreground">
              Member should change this after first login (enable reset in Supabase).
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-border/80 bg-card p-6 shadow-sm">
        <h3 className="text-lg font-semibold">Profile</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="display_name">Full name *</Label>
            <Input id="display_name" name="display_name" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" type="tel" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="date_of_birth">Date of birth</Label>
            <Input id="date_of_birth" name="date_of_birth" type="date" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sex">Sex</Label>
            <SelectNative id="sex" name="sex" defaultValue="">
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
            <SelectNative id="primary_location_id" name="primary_location_id">
              <option value="">—</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </SelectNative>
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-border/80 bg-card p-6 shadow-sm">
        <h3 className="text-lg font-semibold">Membership &amp; training</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="membership_type_id">Initial membership *</Label>
            <SelectNative id="membership_type_id" name="membership_type_id" required>
              <option value="">Select…</option>
              {membershipTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </SelectNative>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="trainer_id">Assigned trainer (optional)</Label>
            <SelectNative id="trainer_id" name="trainer_id">
              <option value="">—</option>
              {trainers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.display_name}
                </option>
              ))}
            </SelectNative>
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-border/80 bg-card p-6 shadow-sm">
        <h3 className="text-lg font-semibold">Goals &amp; notes</h3>
        <div className="space-y-2">
          <Label htmlFor="goal_title">Goal title (optional)</Label>
          <Input id="goal_title" name="goal_title" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="goal_detail">Goal detail</Label>
          <Textarea id="goal_detail" name="goal_detail" rows={2} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="internal_note">Internal manager note</Label>
          <Textarea
            id="internal_note"
            name="internal_note"
            rows={3}
            placeholder="Stored as manager-only staff note"
          />
        </div>
      </section>

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create member"}
        </Button>
      </div>
    </form>
  );
}
