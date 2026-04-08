import { PageHeader } from "@/components/dashboard/page-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function ManagerScheduleLoading() {
  return (
    <>
      <PageHeader title="Schedule" description="Loading operational schedule..." />
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="mb-6 h-40 rounded-xl" />
      <Skeleton className="mb-6 h-72 rounded-xl" />
      <Skeleton className="h-[420px] rounded-xl" />
    </>
  );
}
