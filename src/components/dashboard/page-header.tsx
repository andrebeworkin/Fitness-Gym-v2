type PageHeaderProps = {
  title: string;
  description?: string;
};

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <div className="mb-8 space-y-2">
      <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
        {title}
      </h2>
      {description ? (
        <p className="max-w-2xl text-sm text-muted-foreground md:text-base">
          {description}
        </p>
      ) : null}
    </div>
  );
}
