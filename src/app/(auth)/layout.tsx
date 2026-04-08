export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        {children}
      </div>
    </div>
  );
}
