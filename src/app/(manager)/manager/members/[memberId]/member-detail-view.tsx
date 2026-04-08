import Link from "next/link";

import type { MemberDetailBundle } from "@/app/(manager)/manager/members/_lib/detail-queries";
import {
  AddStaffNoteForm,
  MembershipChangeForm,
  TrainerReassignForm,
} from "@/app/(manager)/manager/members/[memberId]/member-inline-forms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ROUTES } from "@/lib/navigation/dashboard-nav";
import type { MembershipTypeRow } from "@/types/database.types";

function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return d;
  }
}

function fmtDateTime(d: string | null | undefined): string {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return d;
  }
}

function money(cents: number): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

type Props = {
  data: MemberDetailBundle;
  membershipTypes: MembershipTypeRow[];
  trainers: { id: string; display_name: string }[];
  created?: boolean;
};

export function MemberDetailView({
  data,
  membershipTypes,
  trainers,
  created,
}: Props) {
  const { profile } = data;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
            {profile.display_name}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {profile.email ?? "No email on profile"} · Joined{" "}
            {fmtDate(profile.created_at)}
          </p>
          {created ? (
            <p className="mt-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">
              Member created — welcome email can be sent from Supabase Auth if
              configured.
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href={ROUTES.manager.members}>All members</Link>
          </Button>
          <Button asChild>
            <Link href={ROUTES.manager.memberEdit(profile.id)}>Edit profile</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Profile</CardTitle>
            <CardDescription>Core member record</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Phone</span>
              <span>{profile.phone ?? "—"}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Date of birth</span>
              <span>{fmtDate(profile.date_of_birth)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Sex</span>
              <span className="capitalize">
                {profile.sex?.replace(/_/g, " ") ?? "—"}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Home location</span>
              <span>{data.location?.name ?? "—"}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Emergency contact</CardTitle>
            <CardDescription>Primary contacts on file</CardDescription>
          </CardHeader>
          <CardContent>
            {data.emergencyContacts.length === 0 ? (
              <p className="text-sm text-muted-foreground">None on file.</p>
            ) : (
              <ul className="space-y-3 text-sm">
                {data.emergencyContacts.map((c) => (
                  <li key={c.id} className="rounded-lg border border-border/60 p-3">
                    <div className="font-medium">
                      {c.full_name}
                      {c.is_primary ? (
                        <Badge className="ml-2" variant="secondary">
                          Primary
                        </Badge>
                      ) : null}
                    </div>
                    <div className="text-muted-foreground">
                      {c.relationship ?? "Relationship not set"} · {c.phone}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Membership</CardTitle>
            <CardDescription>
              Active period and history — changes never delete past rows
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {data.activePeriod ? (
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="success">Active</Badge>
                <span className="font-medium">
                  {data.activePeriod.membership_type?.name ?? "Unknown type"}
                </span>
                <span className="text-sm text-muted-foreground">
                  Since {fmtDateTime(data.activePeriod.effective_from)}
                </span>
              </div>
            ) : (
              <p className="text-sm text-amber-800 dark:text-amber-200">
                No active membership period — assign one below.
              </p>
            )}

            <div>
              <h4 className="mb-2 text-sm font-medium">Period history</h4>
              {data.membershipHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground">No periods yet.</p>
              ) : (
                <ul className="max-h-48 space-y-2 overflow-y-auto text-sm">
                  {data.membershipHistory.map((p) => (
                    <li
                      key={p.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/50 px-3 py-2"
                    >
                      <span>
                        {p.membership_type?.name ?? "Type"}{" "}
                        <span className="text-muted-foreground">
                          ({p.status})
                        </span>
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {fmtDateTime(p.effective_from)}
                        {p.effective_to
                          ? ` → ${fmtDateTime(p.effective_to)}`
                          : " → open"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <Separator />

            <div>
              <h4 className="mb-3 text-sm font-medium">Change membership</h4>
              <MembershipChangeForm
                memberId={profile.id}
                membershipTypes={membershipTypes}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Trainer assignment</CardTitle>
            <CardDescription>
              Open-ended assignments; history kept when you reassign
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm">
              <span className="text-muted-foreground">Current: </span>
              <span className="font-medium">
                {data.activeTrainer?.display_name ?? "None assigned"}
              </span>
            </div>
            {data.trainerAssignments.length > 0 ? (
              <div>
                <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  History
                </h4>
                <ul className="max-h-40 space-y-1 overflow-y-auto text-xs text-muted-foreground">
                  {data.trainerAssignments.map((a) => (
                    <li key={a.id}>
                      {a.trainer?.display_name ?? a.trainer_id}{" "}
                      {fmtDate(a.effective_from)} —{" "}
                      {a.effective_to ? fmtDate(a.effective_to) : "open"}
                      {a.is_primary ? " · primary" : ""}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <TrainerReassignForm memberId={profile.id} trainers={trainers} />
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Goals</CardTitle>
          </CardHeader>
          <CardContent>
            {data.goals.length === 0 ? (
              <p className="text-sm text-muted-foreground">No goals recorded.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {data.goals.map((g) => (
                  <li key={g.id} className="rounded-lg border border-border/50 p-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{g.title}</span>
                      {!g.is_active ? (
                        <Badge variant="muted">Inactive</Badge>
                      ) : (
                        <Badge variant="secondary">Active</Badge>
                      )}
                    </div>
                    {g.detail ? (
                      <p className="mt-1 text-muted-foreground">{g.detail}</p>
                    ) : null}
                    {g.target_date ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Target {fmtDate(g.target_date)}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Latest assessment</CardTitle>
            <CardDescription>Most recent entry</CardDescription>
          </CardHeader>
          <CardContent>
            {!data.latestAssessment ? (
              <p className="text-sm text-muted-foreground">No assessments yet.</p>
            ) : (
              <div className="space-y-2 text-sm">
                <div className="text-muted-foreground">
                  {fmtDateTime(data.latestAssessment.assessed_at)}
                </div>
                {data.latestAssessment.summary ? (
                  <p>{data.latestAssessment.summary}</p>
                ) : null}
                {data.latestAssessment.body ? (
                  <p className="text-muted-foreground line-clamp-4">
                    {data.latestAssessment.body}
                  </p>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Progress photos</CardTitle>
            <CardDescription>
              Metadata only — files live in Storage (not loaded here)
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            <p>
              <span className="font-medium tabular-nums">
                {data.progressPhotoMeta.count}
              </span>{" "}
              photo{data.progressPhotoMeta.count === 1 ? "" : "s"} on file
            </p>
            {data.progressPhotoMeta.latestTakenOn ? (
              <p className="mt-1 text-muted-foreground">
                Latest dated {fmtDate(data.progressPhotoMeta.latestTakenOn)}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Recent appointments</CardTitle>
          </CardHeader>
          <CardContent>
            {data.appointments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No appointments yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 pr-4 font-medium">When</th>
                      <th className="pb-2 pr-4 font-medium">Trainer</th>
                      <th className="pb-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {data.appointments.map((a) => (
                      <tr key={a.id}>
                        <td className="py-2 pr-4">
                          {fmtDateTime(a.starts_at)}
                        </td>
                        <td className="py-2 pr-4">
                          {data.appointmentTrainerNames[a.primary_trainer_id] ??
                            "—"}
                        </td>
                        <td className="py-2">
                          <Badge variant="outline" className="capitalize">
                            {a.status.replace(/_/g, " ")}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Workout activity</CardTitle>
            <CardDescription>Recent sessions (summary)</CardDescription>
          </CardHeader>
          <CardContent>
            {data.recentSessions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sessions logged.</p>
            ) : (
              <ul className="flex flex-wrap gap-2 text-sm">
                {data.recentSessions.map((s) => (
                  <li
                    key={s.id}
                    className="rounded-full border border-border/60 px-3 py-1"
                  >
                    {fmtDateTime(s.started_at)}{" "}
                    <span className="text-muted-foreground">
                      ({s.status.replace(/_/g, " ")})
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Active program</CardTitle>
            <CardDescription>Prescribed plan instance</CardDescription>
          </CardHeader>
          <CardContent>
            {!data.activeProgram ? (
              <p className="text-sm text-muted-foreground">
                No active program. Full builder lives under Programs (coming
                soon).
              </p>
            ) : (
              <div className="space-y-2 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-base">
                    {data.activeProgram.name}
                  </span>
                  <Badge variant="secondary" className="capitalize">
                    {data.activeProgram.status}
                  </Badge>
                </div>
                <p className="text-muted-foreground">
                  {fmtDate(data.activeProgram.start_date)}
                  {data.activeProgram.end_date
                    ? ` — ${fmtDate(data.activeProgram.end_date)}`
                    : ""}
                  {data.activeProgram.ended_at
                    ? ` · Ended ${fmtDateTime(data.activeProgram.ended_at)}`
                    : ""}
                </p>
                <p>
                  <span className="text-muted-foreground">Assigned by: </span>
                  {data.programAuthor?.display_name ?? "—"} (
                  {data.activeProgram.author_kind})
                </p>
                <p>
                  <span className="text-muted-foreground">Weeks in plan: </span>
                  <span className="font-medium tabular-nums">
                    {data.programWeekCount}
                  </span>
                </p>
                <p>
                  <span className="text-muted-foreground">Latest session: </span>
                  {data.latestProgramSessionAt
                    ? fmtDateTime(data.latestProgramSessionAt)
                    : "—"}
                </p>
                <Button variant="outline" size="sm" type="button" disabled>
                  Open program builder (placeholder)
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Session entitlement ledger</CardTitle>
            <CardDescription>
              Included and add-on balances with auditable consumption/reversal history
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2 text-sm">
              <Badge variant="secondary">
                Included: {data.entitlementSummary.includedBalance}
              </Badge>
              <Badge variant="secondary">
                Add-on: {data.entitlementSummary.addOnBalance}
              </Badge>
              <Badge variant="outline">
                Total available: {data.entitlementSummary.total}
              </Badge>
            </div>
            {data.entitlementHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No entitlement entries yet for this member.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 pr-4 font-medium">When</th>
                      <th className="pb-2 pr-4 font-medium">Event</th>
                      <th className="pb-2 pr-4 font-medium">Source</th>
                      <th className="pb-2 pr-4 font-medium">Delta</th>
                      <th className="pb-2 font-medium">Reference</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {data.entitlementHistory.map((row) => (
                      <tr key={row.id}>
                        <td className="py-2 pr-4">{fmtDateTime(row.created_at)}</td>
                        <td className="py-2 pr-4 capitalize">
                          {row.event_kind.replace(/_/g, " ")}
                        </td>
                        <td className="py-2 pr-4 capitalize">
                          {row.source_kind.replace(/_/g, " ")}
                        </td>
                        <td className="py-2 pr-4 tabular-nums">{row.delta}</td>
                        <td className="py-2 text-xs text-muted-foreground">
                          {row.appointment_id
                            ? `appt:${row.appointment_id.slice(0, 8)}`
                            : row.workout_session_id
                              ? `session:${row.workout_session_id.slice(0, 8)}`
                              : row.note ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Billing summary</CardTitle>
            <CardDescription>
              Manager-safe view — no payment processing in this pass
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3">
              {data.paymentSummary.overdue ? (
                <Badge variant="destructive">Overdue invoices</Badge>
              ) : (
                <Badge variant="success">No overdue flag</Badge>
              )}
              <span className="text-sm text-muted-foreground">
                Open invoice lines: {data.paymentSummary.openInvoiceCount} · Open
                balance {money(data.paymentSummary.openBalanceCents)}
              </span>
            </div>
            {data.invoices.length === 0 ? (
              <p className="text-sm text-muted-foreground">No invoices yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 pr-4 font-medium">Issued</th>
                      <th className="pb-2 pr-4 font-medium">Status</th>
                      <th className="pb-2 pr-4 font-medium">Amount</th>
                      <th className="pb-2 pr-4 font-medium">Paid</th>
                      <th className="pb-2 font-medium">Docs</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {data.invoices.slice(0, 15).map((inv) => (
                      <tr key={inv.id}>
                        <td className="py-2 pr-4">
                          {fmtDate(inv.issued_at ?? inv.created_at)}
                        </td>
                        <td className="py-2 pr-4 capitalize">
                          {inv.status.replace(/_/g, " ")}
                        </td>
                        <td className="py-2 pr-4 tabular-nums">
                          {money(inv.amount_cents)}
                        </td>
                        <td className="py-2 pr-4 tabular-nums">
                          {money(inv.amount_paid_cents)}
                        </td>
                        <td className="py-2">
                          <span className="text-xs text-muted-foreground">
                            {inv.financial_documents.length > 0
                              ? `${inv.financial_documents.length} doc(s)`
                              : "—"}
                            {inv.receipts.length > 0
                              ? ` · ${inv.receipts.length} receipt(s)`
                              : ""}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Internal notes</CardTitle>
            <CardDescription>
              Staff notes — not visible to clients in v1 RLS
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 lg:grid-cols-2">
            <div>
              <h4 className="mb-3 text-sm font-medium">Add note</h4>
              <AddStaffNoteForm memberId={profile.id} />
            </div>
            <div>
              <h4 className="mb-3 text-sm font-medium">Recent</h4>
              {data.staffNotes.length === 0 ? (
                <p className="text-sm text-muted-foreground">No notes yet.</p>
              ) : (
                <ul className="max-h-64 space-y-3 overflow-y-auto text-sm">
                  {data.staffNotes.map((n) => (
                    <li
                      key={n.id}
                      className="rounded-lg border border-border/50 p-3"
                    >
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline">{n.audience}</Badge>
                        <span>{fmtDateTime(n.created_at)}</span>
                        <span>· {n.author?.display_name ?? "Staff"}</span>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap">{n.body}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Preferences</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>
              Plan history visible:{" "}
              <span className="font-medium text-foreground">
                {data.preferences?.show_plan_history ?? true ? "Yes" : "No"}
              </span>
            </p>
            <p className="mt-1">
              Self logging allowed:{" "}
              <span className="font-medium text-foreground">
                {data.preferences?.allow_self_log ?? true ? "Yes" : "No"}
              </span>
            </p>
            <Button variant="link" className="mt-2 h-auto p-0" asChild>
              <Link href={ROUTES.manager.memberEdit(profile.id)}>
                Change on edit page
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
