import Link from "next/link";

import {
  bookClientAppointmentAction,
  cancelClientAppointmentAction,
  requestRescheduleClientAppointmentAction,
} from "@/app/(client)/client/actions";
import { fetchClientAppointmentsData } from "@/app/(client)/client/_lib/queries";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getClientServerContext } from "@/lib/auth/client-server";
import { ROUTES } from "@/lib/navigation/dashboard-nav";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ClientAppointmentsPage({ searchParams }: PageProps) {
  const ctx = await getClientServerContext();
  const sp = await searchParams;
  if (!ctx) {
    return (
      <Card className="border-destructive/40">
        <CardContent className="pt-6 text-sm text-muted-foreground">
          Client session required.
        </CardContent>
      </Card>
    );
  }

  const filters = {
    trainerId: typeof sp.trainerId === "string" ? sp.trainerId : null,
    locationId: typeof sp.locationId === "string" ? sp.locationId : null,
    date: typeof sp.date === "string" ? sp.date : null,
  };
  const data = await fetchClientAppointmentsData({
    supabase: ctx.supabase,
    clientId: ctx.clientId,
    filters,
  });
  const ok = typeof sp.ok === "string" ? sp.ok : null;
  const error = typeof sp.error === "string" ? sp.error : null;

  return (
    <>
      <PageHeader
        title="Appointments"
        description="Book available slots and manage upcoming sessions."
      />

      {ok ? (
        <Card className="mb-6 border-emerald-300/60 bg-emerald-50">
          <CardContent className="pt-6 text-sm text-emerald-900">{ok}</CardContent>
        </Card>
      ) : null}
      {error ? (
        <Card className="mb-6 border-destructive/40 bg-destructive/5">
          <CardContent className="pt-6 text-sm text-destructive">{error}</CardContent>
        </Card>
      ) : null}

      <div className="mb-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming appointments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {data.upcoming.length === 0 ? (
              <p className="text-muted-foreground">No upcoming appointments.</p>
            ) : (
              data.upcoming.map((a) => (
                <div key={a.id} className="rounded border p-3">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">
                      {new Date(a.starts_at).toLocaleString()}
                    </p>
                    <Badge variant={a.status === "scheduled" ? "default" : "outline"}>
                      {a.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {a.trainer_name ? `Trainer: ${a.trainer_name} · ` : ""}
                    {a.location_name ?? "Location"}
                  </p>
                  <div className="mt-3 grid gap-2">
                    <form action={cancelClientAppointmentAction} className="space-y-2">
                      <input type="hidden" name="appointmentId" value={a.id} />
                      <input type="hidden" name="returnTo" value={ROUTES.client.appointments} />
                      <Input name="reason" placeholder="Cancellation reason (optional)" />
                      <Button type="submit" size="sm" variant="outline">
                        Cancel / request cancel
                      </Button>
                    </form>
                    <form action={requestRescheduleClientAppointmentAction} className="space-y-2">
                      <input type="hidden" name="appointmentId" value={a.id} />
                      <input type="hidden" name="returnTo" value={ROUTES.client.appointments} />
                      <div className="grid gap-2 md:grid-cols-2">
                        <Input name="requestedStartsAt" type="datetime-local" />
                        <Input name="requestedEndsAt" type="datetime-local" />
                      </div>
                      <Textarea name="note" rows={2} placeholder="Reschedule note" />
                      <Button type="submit" size="sm" variant="ghost">
                        Request reschedule
                      </Button>
                    </form>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Past appointments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data.past.length === 0 ? (
              <p className="text-muted-foreground">No past appointments yet.</p>
            ) : (
              data.past.map((a) => (
                <div key={a.id} className="rounded border p-2">
                  <p className="font-medium">{new Date(a.starts_at).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.status} · {a.trainer_name ?? "Trainer"} · {a.location_name ?? "Location"}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Book a slot</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {data.bookingAllowed ? null : (
            <p className="rounded border border-amber-300 bg-amber-50 p-2 text-amber-900">
              {data.bookingReason ?? "Booking is currently unavailable."}
            </p>
          )}

          <form className="grid gap-3 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="trainerId">Trainer</Label>
              <Input id="trainerId" name="trainerId" defaultValue={filters.trainerId ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="locationId">Location</Label>
              <Input id="locationId" name="locationId" defaultValue={filters.locationId ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input id="date" name="date" type="date" defaultValue={filters.date ?? ""} />
            </div>
            <div className="flex items-end gap-2">
              <Button type="submit">Filter slots</Button>
              <Button type="button" variant="ghost" asChild>
                <Link href={ROUTES.client.appointments}>Clear</Link>
              </Button>
            </div>
          </form>

          {data.availableSlots.length === 0 ? (
            <p className="text-muted-foreground">No open slots in this range.</p>
          ) : (
            <div className="space-y-2">
              {data.availableSlots.map((slot) => (
                <div key={slot.id} className="flex flex-wrap items-center justify-between gap-2 rounded border p-2">
                  <div>
                    <p className="font-medium">{new Date(slot.starts_at).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">
                      {slot.trainer_name ?? "Trainer"} · {slot.location_name ?? "Location"}
                    </p>
                  </div>
                  <form action={bookClientAppointmentAction}>
                    <input type="hidden" name="slotId" value={slot.id} />
                    <input type="hidden" name="returnTo" value={ROUTES.client.appointments} />
                    <Button type="submit" size="sm" disabled={!data.bookingAllowed}>
                      Book
                    </Button>
                  </form>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Booking currently uses a conservative membership check. Semi-Private entitlement consumption is not decremented in this pass.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
