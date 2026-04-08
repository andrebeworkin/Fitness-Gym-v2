import { PageHeader } from "@/components/dashboard/page-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function MembersLoading() {
  return (
    <>
      <PageHeader title="Members" description="Loading roster…" />
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
      <Skeleton className="mb-6 h-48 w-full rounded-xl" />
      <Skeleton className="h-[480px] w-full rounded-xl" />
    </>
  );
}
