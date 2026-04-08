import Link from "next/link";

import { resolveProgramChangeRequestAction } from "@/app/(manager)/manager/programs/actions";
import type {
  ClientProgramListItem,
  ProgramRequestListItem,
  ProgramTemplateListItem,
} from "@/app/(manager)/manager/programs/_lib/queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROUTES } from "@/lib/navigation/dashboard-nav";

type Props = {
  templates: ProgramTemplateListItem[];
  clientPrograms: ClientProgramListItem[];
  pendingRequests: ProgramRequestListItem[];
};

function statusVariant(status: string) {
  if (status === "active") return "default" as const;
  if (status === "completed") return "secondary" as const;
  return "outline" as const;
}

export function ProgramsLists({ templates, clientPrograms, pendingRequests }: Props) {
  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Templates</CardTitle>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href={ROUTES.manager.programTemplateNew}>New template</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {templates.length === 0 ? (
            <p className="text-muted-foreground">No templates yet.</p>
          ) : (
            templates.map((template) => (
              <div
                key={template.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{template.name}</p>
                    {template.archived ? <Badge variant="outline">Archived</Badge> : null}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {template.week_count} weeks
                    {template.description ? ` · ${template.description}` : ""}
                  </p>
                </div>
                <Button variant="ghost" asChild>
                  <Link href={ROUTES.manager.programTemplate(template.id)}>Open</Link>
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Client programs</CardTitle>
          <Button asChild>
            <Link href={ROUTES.manager.programsAssign}>Assign program</Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {clientPrograms.length === 0 ? (
            <p className="text-muted-foreground">
              No programs match these filters.
            </p>
          ) : (
            clientPrograms.map((program) => (
              <div
                key={program.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{program.name}</p>
                    <Badge variant={statusVariant(program.status)}>{program.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {program.client_name}
                    {program.trainer_name ? ` · Trainer: ${program.trainer_name}` : ""}
                    {program.client_location ? ` · ${program.client_location.name}` : ""}
                  </p>
                </div>
                <Button variant="ghost" asChild>
                  <Link href={ROUTES.manager.programClient(program.id)}>View</Link>
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pending trainer change requests</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {pendingRequests.length === 0 ? (
            <p className="text-muted-foreground">No pending requests.</p>
          ) : (
            pendingRequests.map((req) => (
              <div key={req.id} className="rounded-lg border p-3">
                <p className="font-medium">
                  {req.client_name ?? "Client"} · {req.program_name ?? "Program"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Requested by {req.requester_name ?? "trainer"} ·{" "}
                  {new Date(req.created_at).toLocaleString()}
                </p>
                {req.request_summary ? (
                  <p className="mt-2 text-sm">{req.request_summary}</p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <form action={resolveProgramChangeRequestAction} className="flex gap-2">
                    <input type="hidden" name="requestId" value={req.id} />
                    <input type="hidden" name="decision" value="approved" />
                    <input type="hidden" name="returnTo" value={ROUTES.manager.programs} />
                    <Label className="sr-only" htmlFor={`approve-note-${req.id}`}>
                      Decision note
                    </Label>
                    <Input
                      id={`approve-note-${req.id}`}
                      name="managerDecisionNote"
                      placeholder="Optional note"
                      className="h-9 w-48"
                    />
                    <Button type="submit" size="sm">
                      Approve
                    </Button>
                  </form>
                  <form action={resolveProgramChangeRequestAction} className="flex gap-2">
                    <input type="hidden" name="requestId" value={req.id} />
                    <input type="hidden" name="decision" value="rejected" />
                    <input type="hidden" name="returnTo" value={ROUTES.manager.programs} />
                    <Label className="sr-only" htmlFor={`reject-note-${req.id}`}>
                      Decision note
                    </Label>
                    <Input
                      id={`reject-note-${req.id}`}
                      name="managerDecisionNote"
                      placeholder="Optional reason"
                      className="h-9 w-48"
                    />
                    <Button type="submit" size="sm" variant="outline">
                      Reject
                    </Button>
                  </form>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
