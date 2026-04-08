import Link from "next/link";

import { createTemplateAction } from "@/app/(manager)/manager/programs/actions";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getManagerServerContext } from "@/lib/auth/manager-server";
import { ROUTES } from "@/lib/navigation/dashboard-nav";

export default async function ProgramTemplateNewPage() {
  const ctx = await getManagerServerContext();
  if (!ctx) {
    return (
      <Card className="border-destructive/40">
        <CardContent className="pt-6 text-sm text-muted-foreground">
          Manager session required.
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <PageHeader
        title="New template"
        description="Create a reusable program skeleton with weeks and days."
      />
      <Card>
        <CardHeader>
          <CardTitle>Template basics</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createTemplateAction} className="grid gap-4 lg:max-w-2xl">
            <input type="hidden" name="returnTo" value={ROUTES.manager.programTemplateNew} />
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" placeholder="12-week strength progression" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" rows={3} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="durationWeeks">Duration (weeks)</Label>
                <Input
                  id="durationWeeks"
                  name="durationWeeks"
                  type="number"
                  min={1}
                  max={52}
                  defaultValue={4}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="daysPerWeek">Days per week</Label>
                <Input
                  id="daysPerWeek"
                  name="daysPerWeek"
                  type="number"
                  min={1}
                  max={7}
                  defaultValue={3}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit">Create template</Button>
              <Button type="button" variant="ghost" asChild>
                <Link href={ROUTES.manager.programs}>Back</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
