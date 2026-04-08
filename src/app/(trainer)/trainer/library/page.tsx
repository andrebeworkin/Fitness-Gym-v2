import Link from "next/link";

import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ROUTES } from "@/lib/navigation/dashboard-nav";

export default function TrainerLibraryPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Exercise library"
        description="Reference exercise metadata while running live sessions and program change requests."
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Library use in trainer flow</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Trainers use this metadata context through session runner and client
            detail workflows when logging substitutions or requesting plan changes.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm">
              <Link href={ROUTES.trainer.clients}>Open clients</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href={ROUTES.trainer.dashboard}>Back to today</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
