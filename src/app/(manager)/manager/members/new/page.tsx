import Link from "next/link";

import {
  fetchGymLocations,
  fetchMembershipTypes,
  fetchTrainerOptions,
} from "@/app/(manager)/manager/members/_lib/queries";
import { NewMemberForm } from "@/app/(manager)/manager/members/new/new-member-form";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getManagerServerContext } from "@/lib/auth/manager-server";
import { ROUTES } from "@/lib/navigation/dashboard-nav";
import { createSupabaseAdminClient } from "@/services/supabase/admin";

export default async function NewMemberPage() {
  const ctx = await getManagerServerContext();
  if (!ctx) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground">
          Sign in as a manager with Supabase configured.
        </CardContent>
      </Card>
    );
  }

  const [locations, membershipTypes, trainers] = await Promise.all([
    fetchGymLocations(ctx.supabase),
    fetchMembershipTypes(ctx.supabase),
    fetchTrainerOptions(ctx.supabase),
  ]);

  const serviceRoleConfigured = createSupabaseAdminClient() !== null;

  return (
    <>
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href={ROUTES.manager.members}>← Back to members</Link>
        </Button>
      </div>
      <PageHeader
        title="New member"
        description="Creates a Supabase Auth user (when service role is configured), client profile, and initial membership period."
      />
      <NewMemberForm
        locations={locations}
        membershipTypes={membershipTypes}
        trainers={trainers}
        serviceRoleConfigured={serviceRoleConfigured}
      />
    </>
  );
}
