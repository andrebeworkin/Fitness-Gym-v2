import Link from "next/link";
import { notFound } from "next/navigation";

import {
  fetchClientProfileForManager,
  fetchGymLocations,
  fetchMembershipTypes,
  fetchTrainerOptions,
} from "@/app/(manager)/manager/members/_lib/queries";
import {
  MembershipChangeForm,
  TrainerReassignForm,
} from "@/app/(manager)/manager/members/[memberId]/member-inline-forms";
import { EditMemberForm } from "@/app/(manager)/manager/members/[memberId]/edit/edit-member-form";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getManagerServerContext } from "@/lib/auth/manager-server";
import { ROUTES } from "@/lib/navigation/dashboard-nav";
import type { ClientTrainingPreferencesRow } from "@/types/database.types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type PageProps = { params: Promise<{ memberId: string }> };

export default async function EditMemberPage({ params }: PageProps) {
  const { memberId } = await params;
  if (!UUID_RE.test(memberId)) notFound();

  const ctx = await getManagerServerContext();
  if (!ctx) notFound();

  const [profile, locations, membershipTypes, trainers, prefRes] =
    await Promise.all([
      fetchClientProfileForManager(ctx.supabase, memberId),
      fetchGymLocations(ctx.supabase),
      fetchMembershipTypes(ctx.supabase),
      fetchTrainerOptions(ctx.supabase),
      ctx.supabase
        .from("client_training_preferences")
        .select("*")
        .eq("client_id", memberId)
        .maybeSingle(),
    ]);

  if (!profile) notFound();
  if (prefRes.error) throw new Error(prefRes.error.message);

  return (
    <>
      <div className="mb-6 flex flex-wrap gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href={ROUTES.manager.member(memberId)}>← Member profile</Link>
        </Button>
        <Button variant="ghost" size="sm" asChild>
          <Link href={ROUTES.manager.members}>All members</Link>
        </Button>
      </div>
      <PageHeader
        title={`Edit · ${profile.display_name}`}
        description="Profile and preferences. Membership and trainer changes stay on the audit trail."
      />

      <div className="grid max-w-3xl gap-8">
        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle>Basics</CardTitle>
            <CardDescription>
              Email is mirrored from Auth — change it in Supabase if needed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              Signed up as:{" "}
              <span className="font-medium text-foreground">
                {profile.email ?? "—"}
              </span>
            </p>
            <EditMemberForm
              memberId={memberId}
              profile={profile}
              preferences={
                (prefRes.data ?? null) as ClientTrainingPreferencesRow | null
              }
              locations={locations}
            />
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle>Membership change</CardTitle>
            <CardDescription>
              Supersedes the current period; no proration in-app.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MembershipChangeForm
              memberId={memberId}
              membershipTypes={membershipTypes}
            />
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle>Trainer assignment</CardTitle>
          </CardHeader>
          <CardContent>
            <TrainerReassignForm memberId={memberId} trainers={trainers} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
