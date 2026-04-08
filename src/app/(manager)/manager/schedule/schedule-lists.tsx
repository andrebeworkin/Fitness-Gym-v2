import Link from "next/link";

import {
  cancelAppointmentAction,
  deleteAvailabilityAction,
  deleteShiftAction,
  markAppointmentCompletedAction,
  markAppointmentNoShowAction,
  resolveChangeRequestAction,
  updateAppointmentAction,
  updateAvailabilityAction,
  updateShiftAction,
} from "@/app/(manager)/manager/schedule/actions";
import type {
  AppointmentItem,
  PendingChangeRequestItem,
  ScheduleData,
  ShiftItem,
  AvailabilityItem,
} from "@/app/(manager)/manager/schedule/_lib/queries";
import { toDateTimeLocalValue } from "@/app/(manager)/manager/schedule/_lib/time";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select-native";
import { Textarea } from "@/components/ui/textarea";
import { ROUTES } from "@/lib/navigation/dashboard-nav";

type Props = {
  data: ScheduleData;
  returnTo: string;
  showShifts: boolean;
  showAvailability: boolean;
  showAppointments: boolean;
};

function fmtDateTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function fmtDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    dateStyle: "medium",
  });
}

function SectionEmpty({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground">{text}</p>;
}

function ShiftSection({
  shifts,
  returnTo,
  filtersData,
}: {
  shifts: ShiftItem[];
  returnTo: string;
  filtersData: ScheduleData["filtersData"];
}) {
  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">Shifts</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {shifts.length === 0 ? (
          <SectionEmpty text="No shifts in this range." />
        ) : (
          shifts.map((s) => (
            <details key={s.id} className="rounded-lg border border-border/60 p-3">
              <summary className="cursor-pointer list-none">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      {s.staff_name} · {s.location_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {fmtDate(s.shift_date)} · {s.start_time.slice(0, 5)}-{s.end_time.slice(0, 5)}
                    </p>
                  </div>
                  <Badge variant="secondary">Shift</Badge>
                </div>
              </summary>
              <form action={updateShiftAction} className="mt-4 grid gap-3 md:grid-cols-6">
                <input type="hidden" name="return_to" value={returnTo} />
                <input type="hidden" name="shift_id" value={s.id} />
                <div className="space-y-1 md:col-span-2">
                  <Label>Staff</Label>
                  <SelectNative name="staff_id" defaultValue={s.staff_id}>
                    {filtersData.staff.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.display_name}
                      </option>
                    ))}
                  </SelectNative>
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label>Location</Label>
                  <SelectNative name="location_id" defaultValue={s.location_id}>
                    {filtersData.locations.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </SelectNative>
                </div>
                <div className="space-y-1">
                  <Label>Date</Label>
                  <Input type="date" name="shift_date" defaultValue={s.shift_date} />
                </div>
                <div className="space-y-1">
                  <Label>Start</Label>
                  <Input type="time" name="start_time" defaultValue={s.start_time.slice(0, 5)} />
                </div>
                <div className="space-y-1">
                  <Label>End</Label>
                  <Input type="time" name="end_time" defaultValue={s.end_time.slice(0, 5)} />
                </div>
                <div className="space-y-1 md:col-span-3">
                  <Label>Notes</Label>
                  <Textarea name="notes" rows={2} defaultValue={s.notes ?? ""} />
                </div>
                <div className="md:col-span-6 flex flex-wrap gap-2">
                  <Button type="submit" size="sm">
                    Save shift
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    variant="destructive"
                    formAction={deleteShiftAction}
                  >
                    Remove shift
                  </Button>
                </div>
              </form>
            </details>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function AvailabilitySection({
  availability,
  returnTo,
  filtersData,
}: {
  availability: AvailabilityItem[];
  returnTo: string;
  filtersData: ScheduleData["filtersData"];
}) {
  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">Trainer availability</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {availability.length === 0 ? (
          <SectionEmpty text="No availability slots in this range." />
        ) : (
          availability.map((slot) => (
            <details key={slot.id} className="rounded-lg border border-border/60 p-3">
              <summary className="cursor-pointer list-none">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      {slot.trainer_name} · {slot.location_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {fmtDateTime(slot.starts_at)}
                    </p>
                  </div>
                  {slot.booking_status === "booked" ? (
                    <Badge variant="warning">Booked</Badge>
                  ) : slot.booking_status === "open" ? (
                    <Badge variant="success">Open</Badge>
                  ) : (
                    <Badge variant="muted">Unavailable</Badge>
                  )}
                </div>
              </summary>
              <form action={updateAvailabilityAction} className="mt-4 grid gap-3 md:grid-cols-5">
                <input type="hidden" name="return_to" value={returnTo} />
                <input type="hidden" name="slot_id" value={slot.id} />
                <div className="space-y-1 md:col-span-2">
                  <Label>Trainer</Label>
                  <SelectNative name="trainer_id" defaultValue={slot.trainer_id}>
                    {filtersData.trainers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.display_name}
                      </option>
                    ))}
                  </SelectNative>
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label>Location</Label>
                  <SelectNative name="location_id" defaultValue={slot.location_id}>
                    {filtersData.locations.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </SelectNative>
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label>Starts at</Label>
                  <Input
                    type="datetime-local"
                    name="starts_at"
                    step={1800}
                    defaultValue={toDateTimeLocalValue(slot.starts_at)}
                  />
                </div>
                <label className="inline-flex items-center gap-2 text-sm md:col-span-2">
                  <input
                    type="checkbox"
                    name="mark_closed"
                    defaultChecked={slot.booking_status === "unavailable"}
                  />
                  Mark as unavailable
                </label>
                <div className="md:col-span-5 flex flex-wrap gap-2">
                  <Button type="submit" size="sm">
                    Save slot
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    variant="destructive"
                    formAction={deleteAvailabilityAction}
                  >
                    Remove slot
                  </Button>
                </div>
              </form>
            </details>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function AppointmentStatusBadges({ item }: { item: AppointmentItem }) {
  return (
    <div className="flex flex-wrap gap-1">
      <Badge variant="outline" className="capitalize">
        {item.status.replace("_", " ")}
      </Badge>
      {!item.has_shift_coverage ? <Badge variant="destructive">Outside shift</Badge> : null}
      {!item.has_matching_availability ? <Badge variant="warning">No slot</Badge> : null}
      {item.attention_flag ? <Badge variant="warning">Needs attention</Badge> : null}
    </div>
  );
}

function AppointmentSection({
  appointments,
  returnTo,
  filtersData,
}: {
  appointments: AppointmentItem[];
  returnTo: string;
  filtersData: ScheduleData["filtersData"];
}) {
  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">Appointments</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {appointments.length === 0 ? (
          <SectionEmpty text="No appointments in this range." />
        ) : (
          appointments.map((a) => (
            <details key={a.id} className="rounded-lg border border-border/60 p-3">
              <summary className="cursor-pointer list-none">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      {a.client_name} with {a.trainer_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {fmtDateTime(a.starts_at)} · {a.location_name}
                    </p>
                  </div>
                  <AppointmentStatusBadges item={a} />
                </div>
              </summary>

              <div className="mt-4 space-y-4">
                <div className="rounded-md border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
                  Quick links:{" "}
                  <Link className="underline" href={ROUTES.manager.member(a.client_id)}>
                    Member details
                  </Link>
                </div>

                <form action={updateAppointmentAction} className="grid gap-3 md:grid-cols-6">
                  <input type="hidden" name="return_to" value={returnTo} />
                  <input type="hidden" name="appointment_id" value={a.id} />
                  <div className="space-y-1 md:col-span-2">
                    <Label>Client</Label>
                    <SelectNative name="client_id" defaultValue={a.client_id}>
                      {filtersData.clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.display_name}
                        </option>
                      ))}
                    </SelectNative>
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <Label>Primary trainer</Label>
                    <SelectNative name="primary_trainer_id" defaultValue={a.primary_trainer_id}>
                      {filtersData.trainers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.display_name}
                        </option>
                      ))}
                    </SelectNative>
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <Label>Substitute trainer</Label>
                    <SelectNative
                      name="substitute_trainer_id"
                      defaultValue={a.substitute_trainer_id ?? ""}
                    >
                      <option value="">None</option>
                      {filtersData.trainers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.display_name}
                        </option>
                      ))}
                    </SelectNative>
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <Label>Location</Label>
                    <SelectNative name="location_id" defaultValue={a.location_id}>
                      {filtersData.locations.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))}
                    </SelectNative>
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <Label>Starts at</Label>
                    <Input
                      type="datetime-local"
                      step={1800}
                      name="starts_at"
                      defaultValue={toDateTimeLocalValue(a.starts_at)}
                    />
                  </div>
                  <div className="md:col-span-6 flex flex-wrap gap-2">
                    <Button type="submit" size="sm">
                      Reschedule / save
                    </Button>
                  </div>
                </form>

                <div className="flex flex-wrap gap-2">
                  <form action={markAppointmentCompletedAction}>
                    <input type="hidden" name="return_to" value={returnTo} />
                    <input type="hidden" name="appointment_id" value={a.id} />
                    <Button size="sm" type="submit" variant="secondary">
                      Mark completed
                    </Button>
                  </form>
                  <form action={markAppointmentNoShowAction}>
                    <input type="hidden" name="return_to" value={returnTo} />
                    <input type="hidden" name="appointment_id" value={a.id} />
                    <Button size="sm" type="submit" variant="outline">
                      Mark no-show
                    </Button>
                  </form>
                  <form action={cancelAppointmentAction} className="flex items-center gap-2">
                    <input type="hidden" name="return_to" value={returnTo} />
                    <input type="hidden" name="appointment_id" value={a.id} />
                    <Input
                      name="cancel_reason"
                      defaultValue="Cancelled by manager"
                      className="h-9 w-60"
                    />
                    <Button size="sm" type="submit" variant="destructive">
                      Cancel
                    </Button>
                  </form>
                </div>
              </div>
            </details>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function PendingRequestsSection({
  requests,
  returnTo,
}: {
  requests: PendingChangeRequestItem[];
  returnTo: string;
}) {
  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">Appointment change requests</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {requests.length === 0 ? (
          <SectionEmpty text="No pending change requests." />
        ) : (
          requests.map((r) => (
            <div key={r.id} className="rounded-lg border border-border/60 p-3">
              <p className="font-medium">
                {r.request_type} · {r.appointment?.client_name ?? "Appointment"}
              </p>
              <p className="text-xs text-muted-foreground">
                Requested by {r.requested_by_name ?? "unknown"} · {fmtDateTime(r.created_at)}
              </p>
              {r.appointment ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Current slot: {fmtDateTime(r.appointment.starts_at)} ({r.appointment.location_name})
                </p>
              ) : null}
              <div className="mt-3 flex gap-2">
                <form action={resolveChangeRequestAction}>
                  <input type="hidden" name="return_to" value={returnTo} />
                  <input type="hidden" name="request_id" value={r.id} />
                  <input type="hidden" name="decision" value="approved" />
                  <Button size="sm" type="submit">
                    Approve
                  </Button>
                </form>
                <form action={resolveChangeRequestAction}>
                  <input type="hidden" name="return_to" value={returnTo} />
                  <input type="hidden" name="request_id" value={r.id} />
                  <input type="hidden" name="decision" value="rejected" />
                  <Button size="sm" type="submit" variant="outline">
                    Reject
                  </Button>
                </form>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export function ScheduleLists({
  data,
  returnTo,
  showShifts,
  showAvailability,
  showAppointments,
}: Props) {
  return (
    <div className="grid gap-6">
      {showShifts ? (
        <ShiftSection shifts={data.shifts} returnTo={returnTo} filtersData={data.filtersData} />
      ) : null}
      {showAvailability ? (
        <AvailabilitySection
          availability={data.availability}
          returnTo={returnTo}
          filtersData={data.filtersData}
        />
      ) : null}
      {showAppointments ? (
        <AppointmentSection
          appointments={data.appointments}
          returnTo={returnTo}
          filtersData={data.filtersData}
        />
      ) : null}
      <PendingRequestsSection requests={data.pendingRequests} returnTo={returnTo} />
    </div>
  );
}
