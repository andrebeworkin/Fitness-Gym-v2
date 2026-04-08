import Link from "next/link";
import { notFound } from "next/navigation";

import { startSessionFromAppointmentAction } from "@/app/(trainer)/trainer/actions";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTrainerServerContext } from "@/lib/auth/trainer-server";
import { ROUTES } from "@/lib/navigation/dashboard-nav";
import type { AppointmentRow, ProfileRow } from "@/types/database.types";

type PageProps = {
  params: Promise<{ appointmentId: string }>;
};

export default async function TrainerSessionStartPage({ params }: PageProps) {
  const ctx = await getTrainerServerContext();
  if (!ctx) {
    return (
      <Card className="border-destructive/40">
        <CardContent className="pt-6 text-sm text-muted-foreground">
          Trainer session required.
        </CardContent>
      </Card>
    );
  }
  const { appointmentId } = await params;
  const { data: appointment, error } = await ctx.supabase
    .from("appointments")
    .select("*")
    .eq("id", appointmentId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!appointment) notFound();
  const appt = appointment as AppointmentRow;

  if (
    appt.primary_trainer_id !== ctx.trainerId &&
    appt.substitute_trainer_id !== ctx.trainerId
  ) {
    notFound();
  }

  const [clientRes, locationRes, existingRes] = await Promise.all([
    ctx.supabase
      .from("profiles")
      .select("id, display_name, email")
      .eq("id", appt.client_id)
      .maybeSingle(),
    ctx.supabase
      .from("gym_locations")
      .select("id, name")
      .eq("id", appt.location_id)
      .maybeSingle(),
    ctx.supabase
      .from("workout_sessions")
      .select("id, status")
      .eq("appointment_id", appointmentId)
      .eq("trainer_id", ctx.trainerId)
      .eq("status", "in_progress")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (clientRes.error) throw new Error(clientRes.error.message);
  if (locationRes.error) throw new Error(locationRes.error.message);
  if (existingRes.error) throw new Error(existingRes.error.message);

  const client = clientRes.data as Pick<ProfileRow, "id" | "display_name" | "email"> | null;
  if (!client) notFound();

  return (
    <>
      <PageHeader
        title="Start session"
        description="Confirm appointment context and open the live session runner."
      />
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>{client.display_name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p className="text-muted-foreground">{client.email ?? "No email on file"}</p>
          <p>
            {new Date(appt.starts_at).toLocaleString()} -{" "}
            {new Date(appt.ends_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
            {locationRes.data?.name ? ` · ${locationRes.data.name}` : ""}
          </p>

          {existingRes.data ? (
            <Button asChild>
              <Link href={ROUTES.trainer.session(existingRes.data.id)}>
                Continue active session
              </Link>
            </Button>
          ) : (
            <form action={startSessionFromAppointmentAction}>
              <input type="hidden" name="appointmentId" value={appointmentId} />
              <input type="hidden" name="returnTo" value={ROUTES.trainer.dashboard} />
              <Button type="submit">Start now</Button>
            </form>
          )}
        </CardContent>
      </Card>
    </>
  );
}
