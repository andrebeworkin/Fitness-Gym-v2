import { notFound } from "next/navigation";

import { fetchMemberDetailBundle } from "@/app/(manager)/manager/members/_lib/detail-queries";
import {
  fetchMembershipTypes,
  fetchTrainerOptions,
} from "@/app/(manager)/manager/members/_lib/queries";
import { MemberDetailView } from "@/app/(manager)/manager/members/[memberId]/member-detail-view";
import { getManagerServerContext } from "@/lib/auth/manager-server";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type PageProps = {
  params: Promise<{ memberId: string }>;
  searchParams: Promise<{ created?: string }>;
};

export default async function ManagerMemberDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { memberId } = await params;
  const sp = await searchParams;

  if (!UUID_RE.test(memberId)) {
    notFound();
  }

  const ctx = await getManagerServerContext();
  if (!ctx) {
    notFound();
  }

  let bundle;
  let membershipTypes;
  let trainers;
  try {
    ;[bundle, membershipTypes, trainers] = await Promise.all([
      fetchMemberDetailBundle(ctx.supabase, memberId),
      fetchMembershipTypes(ctx.supabase),
      fetchTrainerOptions(ctx.supabase),
    ]);
  } catch {
    throw new Error("Failed to load member");
  }

  if (!bundle) {
    notFound();
  }

  return (
    <MemberDetailView
      data={bundle}
      membershipTypes={membershipTypes}
      trainers={trainers}
      created={sp.created === "1"}
    />
  );
}
