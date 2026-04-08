"use client";

import { useActionState, useEffect } from "react";

import {
  addManagerStaffNoteAction,
  changeMembershipAction,
  reassignTrainerAction,
  type ActionResult,
} from "@/app/(manager)/manager/members/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select-native";
import { Textarea } from "@/components/ui/textarea";
import type { MembershipTypeRow } from "@/types/database.types";

type TrainerOpt = { id: string; display_name: string };

function FormMessage({ state }: { state: ActionResult | null }) {
  if (!state) return null;
  if (state.ok) {
    return (
      <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
        Saved.
      </p>
    );
  }
  return (
    <p className="text-sm font-medium text-destructive">{state.error}</p>
  );
}

export function MembershipChangeForm({
  memberId,
  membershipTypes,
}: {
  memberId: string;
  membershipTypes: MembershipTypeRow[];
}) {
  const bound = changeMembershipAction.bind(null, memberId);
  const [state, formAction, pending] = useActionState(bound, null);

  return (
    <form action={formAction} className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="membership_type_id">New membership type</Label>
        <SelectNative
          id="membership_type_id"
          name="membership_type_id"
          required
        >
          <option value="">Select…</option>
          {membershipTypes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </SelectNative>
      </div>
      <div className="space-y-2">
        <Label htmlFor="change_notes">Notes (optional)</Label>
        <Textarea
          id="change_notes"
          name="change_notes"
          placeholder="Reason for change — stored in history"
          rows={2}
        />
      </div>
      <FormMessage state={state} />
      <Button type="submit" disabled={pending} size="sm">
        {pending ? "Updating…" : "Change membership"}
      </Button>
      <p className="text-xs text-muted-foreground">
        Closes the current active period and opens a new one. Proration and
        billing math are not calculated here.
      </p>
    </form>
  );
}

export function TrainerReassignForm({
  memberId,
  trainers,
}: {
  memberId: string;
  trainers: TrainerOpt[];
}) {
  const bound = reassignTrainerAction.bind(null, memberId);
  const [state, formAction, pending] = useActionState(bound, null);

  return (
    <form action={formAction} className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="trainer_id">Trainer</Label>
        <SelectNative id="trainer_id" name="trainer_id">
          <option value="">—</option>
          {trainers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.display_name}
            </option>
          ))}
        </SelectNative>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="clear_trainer" />
        No assigned trainer
      </label>
      <FormMessage state={state} />
      <Button type="submit" disabled={pending} size="sm">
        {pending ? "Saving…" : "Update assignment"}
      </Button>
    </form>
  );
}

export function AddStaffNoteForm({ memberId }: { memberId: string }) {
  const bound = addManagerStaffNoteAction.bind(null, memberId);
  const [state, formAction, pending] = useActionState(bound, null);

  useEffect(() => {
    if (state?.ok) {
      const form = document.getElementById(
        `note-form-${memberId}`,
      ) as HTMLFormElement | null;
      form?.reset();
    }
  }, [state, memberId]);

  return (
    <form id={`note-form-${memberId}`} action={formAction} className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="audience">Audience</Label>
        <SelectNative id="audience" name="audience" defaultValue="manager_only">
          <option value="manager_only">Manager only</option>
          <option value="staff_internal">Staff (trainers + managers)</option>
        </SelectNative>
      </div>
      <div className="space-y-2">
        <Label htmlFor="note_body">Note</Label>
        <Textarea id="note_body" name="note_body" required rows={3} />
      </div>
      <FormMessage state={state} />
      <Button type="submit" disabled={pending} size="sm">
        {pending ? "Adding…" : "Add note"}
      </Button>
    </form>
  );
}
