import { fetchClientProgressData } from "@/app/(client)/client/_lib/queries";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getClientServerContext } from "@/lib/auth/client-server";

export default async function ClientProfilePage() {
  const ctx = await getClientServerContext();
  if (!ctx) {
    return (
      <Card className="border-destructive/40">
        <CardContent className="pt-6 text-sm text-muted-foreground">
          Client session required.
        </CardContent>
      </Card>
    );
  }
  const data = await fetchClientProgressData(ctx.supabase, ctx.clientId);

  return (
    <>
      <PageHeader
        title="Profile"
        description="Your personal details and training relationship context."
      />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Basics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="font-medium">Name:</span> {data.profile.display_name}
            </p>
            <p>
              <span className="font-medium">Email:</span> {data.profile.email ?? "N/A"}
            </p>
            <p>
              <span className="font-medium">DOB:</span> {data.profile.date_of_birth ?? "N/A"}
            </p>
            <p>
              <span className="font-medium">Sex:</span> {data.profile.sex ?? "N/A"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Training context</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="font-medium">Membership:</span>{" "}
              {data.membership.type?.name ?? "Not set"}
            </p>
            <p>
              <span className="font-medium">Trainer:</span>{" "}
              {data.trainer?.display_name ?? "Not assigned"}
            </p>
            <p>
              <span className="font-medium">Goals:</span> {data.goals.length}
            </p>
            <p>
              <span className="font-medium">Progress photos:</span> {data.progressPhotos.length}
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
