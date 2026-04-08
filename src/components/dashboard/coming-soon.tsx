import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ComingSoonProps = {
  title: string;
};

export function ComingSoon({ title }: ComingSoonProps) {
  return (
    <Card className="border-dashed border-border/80 bg-muted/20">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          This area is scaffolded for the demo. Business logic, Supabase models,
          and RLS will land in the next implementation phases per{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            docs/PHASED_IMPLEMENTATION_PLAN.md
          </code>
          .
        </p>
      </CardContent>
    </Card>
  );
}
