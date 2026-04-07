import { PublicSiteHeader } from "@/components/layout/public-site-header";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicSiteHeader />
      {children}
    </div>
  );
}
