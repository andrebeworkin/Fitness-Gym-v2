import Link from "next/link";

import { fetchTrainerClientsData } from "@/app/(trainer)/trainer/_lib/queries";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select-native";
import { getTrainerServerContext } from "@/lib/auth/trainer-server";
import { ROUTES } from "@/lib/navigation/dashboard-nav";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function TrainerClientsPage({ searchParams }: PageProps) {
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

  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const relationship =
    typeof sp.relationship === "string" &&
    (sp.relationship === "assigned" || sp.relationship === "scheduled_only")
      ? sp.relationship
      : "all";

  const rows = await fetchTrainerClientsData({
    supabase: ctx.supabase,
    trainerId: ctx.trainerId,
    q,
    relationship,
  });

  return (
    <>
      <PageHeader
        title="Clients"
        description="Trainer-safe roster across assigned and scheduled clients."
      />

      <Card className="mb-6">
        <CardContent className="pt-6">
          <form className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="q">Search</Label>
              <Input id="q" name="q" defaultValue={q} placeholder="Name or email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="relationship">Relationship</Label>
              <SelectNative id="relationship" name="relationship" defaultValue={relationship}>
                <option value="all">All</option>
                <option value="assigned">Assigned</option>
                <option value="scheduled_only">Scheduled only</option>
              </SelectNative>
            </div>
            <div className="flex items-end gap-2">
              <Button type="submit">Apply</Button>
              <Button type="button" variant="ghost" asChild>
                <Link href={ROUTES.trainer.clients}>Clear</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Roster</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {rows.length === 0 ? (
            <p className="text-muted-foreground">No clients match these filters.</p>
          ) : (
            rows.map((r) => (
              <div
                key={r.profile.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{r.profile.display_name}</p>
                    <Badge variant={r.relationship === "assigned" ? "default" : "outline"}>
                      {r.relationship === "assigned" ? "Assigned" : "Scheduled"}
                    </Badge>
                    {r.membershipSlug ? <Badge variant="secondary">{r.membershipSlug}</Badge> : null}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {r.profile.email ?? "No email"}
                    {r.activeProgram ? ` · Active program: ${r.activeProgram.name}` : " · No active program"}
                    {r.latestSessionAt
                      ? ` · Last session: ${new Date(r.latestSessionAt).toLocaleDateString()}`
                      : " · No sessions yet"}
                    {r.recentIncidentCount > 0
                      ? ` · ${r.recentIncidentCount} recent incident flag(s)`
                      : ""}
                  </p>
                </div>
                <Button variant="ghost" asChild>
                  <Link href={ROUTES.trainer.client(r.profile.id)}>Open</Link>
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </>
  );
}
