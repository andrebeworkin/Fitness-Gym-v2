import type { ReportsData } from "@/app/(manager)/manager/reports/_lib/queries";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function money(cents: number): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

type Props = {
  data: ReportsData;
};

function rosterFlags(row: ReportsData["rosterHealth"][number]): string {
  const flags: string[] = [];
  if (row.hasTrainer === false) flags.push("No trainer");
  if (row.hasActiveProgram === false) flags.push("No program");
  if (row.overduePayment) flags.push("Overdue");
  return flags.length > 0 ? flags.join(" · ") : "Healthy";
}

export function ReportsBreakdowns({ data }: Readonly<Props>) {
  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Membership mix</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {data.membersByMembershipType.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active members for selected filters.</p>
          ) : (
            data.membersByMembershipType.map((x) => (
              <Badge key={x.label} variant="secondary">
                {x.label}: {x.count}
              </Badge>
            ))
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Member roster health</CardTitle>
          </CardHeader>
          <CardContent className="max-h-80 overflow-auto text-sm">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2">Client</th>
                  <th className="pb-2">Membership</th>
                  <th className="pb-2">Flags</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.rosterHealth.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-4 text-muted-foreground">
                      No roster rows for current filters.
                    </td>
                  </tr>
                ) : (
                  data.rosterHealth.slice(0, 40).map((r) => (
                    <tr key={r.clientId}>
                      <td className="py-2">{r.name}</td>
                      <td className="py-2">{r.membershipType}</td>
                      <td className="py-2">
                      {rosterFlags(r)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment status summary</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Count</th>
                  <th className="pb-2">Open balance</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.paymentSummary.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-4 text-muted-foreground">
                      No payment rows for current filters.
                    </td>
                  </tr>
                ) : (
                  data.paymentSummary.map((p) => (
                    <tr key={p.status}>
                      <td className="py-2 capitalize">
                        {p.status.replaceAll("_", " ")}
                      </td>
                      <td className="py-2">{p.count}</td>
                      <td className="py-2">{money(p.openBalanceCents)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Trainer workload and utilization</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2">Trainer</th>
                  <th className="pb-2">Booked</th>
                  <th className="pb-2">Completed</th>
                  <th className="pb-2">Utilization</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.trainerWorkload.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-4 text-muted-foreground">
                      No trainer workload rows for current filters.
                    </td>
                  </tr>
                ) : (
                  data.trainerWorkload.map((t) => (
                    <tr key={t.trainerId}>
                      <td className="py-2">{t.trainerName}</td>
                      <td className="py-2">{t.scheduled + t.completed + t.noShow}</td>
                      <td className="py-2">{t.completed}</td>
                      <td className="py-2">{t.utilizationPct}%</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Appointment outcomes</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <ul className="space-y-2">
              {data.appointmentOutcomes.length === 0 ? (
                <li className="rounded border px-3 py-2 text-muted-foreground">
                  No appointment outcomes for current filters.
                </li>
              ) : (
                data.appointmentOutcomes.map((o) => (
                  <li key={o.status} className="flex justify-between rounded border px-3 py-2">
                    <span className="capitalize">
                      {o.status.replaceAll("_", " ")}
                    </span>
                    <span className="font-medium tabular-nums">{o.count}</span>
                  </li>
                ))
              )}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Program coverage</CardTitle>
          </CardHeader>
          <CardContent className="max-h-80 overflow-auto text-sm">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2">Client</th>
                  <th className="pb-2">Program</th>
                  <th className="pb-2">Ends</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.programCoverage.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-4 text-muted-foreground">
                      No program coverage rows for current filters.
                    </td>
                  </tr>
                ) : (
                  data.programCoverage.slice(0, 50).map((p) => (
                    <tr key={p.clientId}>
                      <td className="py-2">{p.name}</td>
                      <td className="py-2">{p.hasActiveProgram ? "Active" : "None"}</td>
                      <td className="py-2">{p.programEndsOn ?? "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Session activity and adherence</CardTitle>
          </CardHeader>
          <CardContent className="max-h-80 overflow-auto text-sm">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2">Client</th>
                  <th className="pb-2">14d sessions</th>
                  <th className="pb-2">30d sessions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.sessionAdherence.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-4 text-muted-foreground">
                      No session activity rows for current filters.
                    </td>
                  </tr>
                ) : (
                  data.sessionAdherence.slice(0, 50).map((s) => (
                    <tr key={s.clientId}>
                      <td className="py-2">{s.name}</td>
                      <td className="py-2">{s.sessionsLast14Days}</td>
                      <td className="py-2">{s.sessionsLast30Days}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Entitlement and credit balances (Semi-Private)</CardTitle>
        </CardHeader>
        <CardContent className="max-h-96 overflow-auto text-sm">
          <table className="w-full">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2">Client</th>
                <th className="pb-2">Included</th>
                <th className="pb-2">Add-on</th>
                <th className="pb-2">Total</th>
                <th className="pb-2">Last event</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.entitlementBalances.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-4 text-muted-foreground">
                    No entitlement balances for current filters.
                  </td>
                </tr>
              ) : (
                data.entitlementBalances.map((e) => (
                  <tr key={e.clientId}>
                    <td className="py-2">{e.name}</td>
                    <td className="py-2">{e.includedBalance}</td>
                    <td className="py-2">{e.addOnBalance}</td>
                    <td className="py-2 font-medium">{e.totalBalance}</td>
                    <td className="py-2">{e.latestEventAt ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
