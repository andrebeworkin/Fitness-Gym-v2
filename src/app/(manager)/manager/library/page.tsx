import Link from "next/link";

import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ROUTES } from "@/lib/navigation/dashboard-nav";

export default function ManagerLibraryPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Exercise library"
        description="Metadata-backed exercise catalog used by manager and trainer programming flows."
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Library coverage in this demo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            The demo uses seeded exercises, muscle targets, and alternatives in
            template and client program assignment flows.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm">
              <Link href={ROUTES.manager.programs}>Open programs</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href={ROUTES.manager.programTemplateNew}>
                Create template
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
