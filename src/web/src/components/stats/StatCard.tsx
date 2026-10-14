import type { ReactNode } from "react";

interface StatCardProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function StatCard({ title, description, children }: StatCardProps): ReactNode {
  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-4">
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
      {children}
    </div>
  );
}

export function StatEmpty(): ReactNode {
  return (
    <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
      Pas encore de données
    </div>
  );
}
