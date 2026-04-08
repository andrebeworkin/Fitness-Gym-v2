import Link from "next/link";

import type { MemberListRow } from "@/app/(manager)/manager/members/_lib/queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/navigation/dashboard-nav";

function formatMoney(cents: number): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

type Props = { rows: MemberListRow[] };

export function MembersTable({ rows }: Props) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-6 py-16 text-center">
        <p className="text-lg font-medium">No members match your filters</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Try clearing search or filters, or add a new member.
        </p>
        <Button asChild className="mt-6">
          <Link href={ROUTES.manager.memberNew}>New member</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="border-b border-border/80 bg-muted/40">
            <tr>
              <th className="px-4 py-3 font-medium">Member</th>
              <th className="px-4 py-3 font-medium">Membership</th>
              <th className="px-4 py-3 font-medium">Location</th>
              <th className="px-4 py-3 font-medium">Trainer</th>
              <th className="px-4 py-3 font-medium">Program</th>
              <th className="px-4 py-3 font-medium">Payments</th>
              <th className="px-4 py-3 font-medium w-[100px]" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {rows.map((r) => (
              <tr key={r.profile.id} className="hover:bg-muted/30">
                <td className="px-4 py-3 align-top">
                  <div className="font-medium">{r.profile.display_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {r.profile.email ?? "—"}
                  </div>
                </td>
                <td className="px-4 py-3 align-top">
                  {r.membershipType ? (
                    <>
                      <div>{r.membershipType.name}</div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {r.membershipPeriod?.status === "active" ? (
                          <Badge variant="success">Active</Badge>
                        ) : (
                          <Badge variant="warning">No active period</Badge>
                        )}
                      </div>
                    </>
                  ) : (
                    <Badge variant="muted">No membership</Badge>
                  )}
                </td>
                <td className="px-4 py-3 align-top text-muted-foreground">
                  {r.location?.name ?? "—"}
                </td>
                <td className="px-4 py-3 align-top">
                  {r.trainer ? (
                    <span>{r.trainer.display_name}</span>
                  ) : (
                    <span className="text-muted-foreground">None</span>
                  )}
                </td>
                <td className="px-4 py-3 align-top">
                  {r.activeProgram ? (
                    <span className="line-clamp-2">{r.activeProgram.name}</span>
                  ) : (
                    <span className="text-muted-foreground">None</span>
                  )}
                </td>
                <td className="px-4 py-3 align-top">
                  {r.overdue ? (
                    <Badge variant="destructive">Overdue</Badge>
                  ) : r.openBalanceCents > 0 ? (
                    <Badge variant="warning">Balance</Badge>
                  ) : (
                    <Badge variant="secondary">OK</Badge>
                  )}
                  {r.openBalanceCents > 0 ? (
                    <div className="mt-1 text-xs text-muted-foreground tabular-nums">
                      Open {formatMoney(r.openBalanceCents)}
                    </div>
                  ) : null}
                </td>
                <td className="px-4 py-3 align-top text-right">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={ROUTES.manager.member(r.profile.id)}>View</Link>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
