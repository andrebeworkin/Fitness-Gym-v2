import Link from "next/link";

import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ROUTES } from "@/lib/navigation/dashboard-nav";

export default function ManagerLocationsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Locations"
        description="Two-location operating model with scheduling, roster, and reporting context."
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Bridge District</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Use schedule and reports filters to inspect staffing and appointment
              load for this location.
            </p>
            <Button asChild size="sm">
              <Link href={ROUTES.manager.schedule}>Open schedule</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">River North</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Compare attendance, no-shows, and utilization in reports to support
              manager decisions.
            </p>
            <Button asChild size="sm" variant="outline">
              <Link href={ROUTES.manager.reports}>Open reports</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
