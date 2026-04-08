import { Card, CardContent } from "@/components/ui/card";

type Props = {
  kind: "ok" | "error" | "info";
  message: string;
  className?: string;
};

function bannerStyles(kind: Props["kind"]): string {
  if (kind === "ok") {
    return "border-emerald-300/60 bg-emerald-50 text-emerald-900";
  }
  if (kind === "error") {
    return "border-destructive/40 bg-destructive/5 text-destructive";
  }
  return "border-border/70 bg-muted/30 text-muted-foreground";
}

export function FlashBanner({ kind, message, className }: Readonly<Props>) {
  if (!message) return null;

  const styles = bannerStyles(kind);

  return (
    <Card className={`${styles} ${className ?? ""}`.trim()}>
      <CardContent className="pt-6 text-sm">{message}</CardContent>
    </Card>
  );
}
