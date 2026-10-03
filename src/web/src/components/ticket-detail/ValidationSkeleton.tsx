const VALIDATION_SECTION_PLACEHOLDERS = ["prerequisites", "checks", "criteria"];

export function ValidationSkeleton() {
  return (
    <div role="status" aria-busy="true" className="mx-auto w-full min-w-0 max-w-4xl pb-4">
      <span className="sr-only">Chargement de la validation…</span>
      <div aria-hidden="true" className="min-w-0 animate-pulse space-y-6 motion-reduce:animate-none">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-2 w-28 max-w-full rounded bg-muted" />
            <div className="h-6 w-36 max-w-full rounded bg-muted" />
            <div className="h-3 w-64 max-w-full rounded bg-muted" />
          </div>
          <div className="h-8 w-8 max-w-full shrink-0 rounded bg-muted" />
        </div>

        <div className="space-y-3 rounded border border-border bg-muted/20 p-4">
          <div className="h-4 w-36 max-w-full rounded bg-muted" />
          <div className="space-y-2">
            <div className="h-3 w-full rounded bg-muted" />
            <div className="h-3 w-3/4 rounded bg-muted" />
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="h-8 w-28 max-w-full rounded bg-muted" />
            <div className="h-8 w-36 max-w-full rounded bg-muted" />
          </div>
          <div className="h-2 w-3/4 rounded bg-muted" />
        </div>

        <div className="flex gap-3 rounded border border-border bg-muted/20 p-3">
          <div className="h-4 w-4 max-w-full shrink-0 rounded bg-muted" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3 w-40 max-w-full rounded bg-muted" />
            <div className="h-3 w-3/4 rounded bg-muted" />
          </div>
        </div>

        {VALIDATION_SECTION_PLACEHOLDERS.map((section) => (
          <div key={section} className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex w-full min-w-0 items-center gap-2 sm:w-auto sm:flex-1">
                <div className="h-5 w-5 max-w-full shrink-0 rounded bg-muted" />
                <div className="h-4 w-44 min-w-0 max-w-full rounded bg-muted" />
              </div>
              <div className="h-7 w-16 max-w-full shrink-0 rounded bg-muted" />
            </div>
            <div className="space-y-3 rounded border border-border p-3">
              <div className="h-3 w-3/4 rounded bg-muted" />
              <div className="h-3 w-full rounded bg-muted" />
              <div className="h-3 w-1/2 rounded bg-muted" />
            </div>
          </div>
        ))}

        <div className="rounded border border-border p-3"><div className="h-3 w-48 max-w-full rounded bg-muted" /></div>

        <div className="space-y-2.5">
          <div className="flex min-w-0 items-center gap-2"><div className="h-5 w-5 max-w-full shrink-0 rounded bg-muted" /><div className="h-4 w-36 min-w-0 max-w-full rounded bg-muted" /></div>
          <div className="space-y-3 rounded border border-border p-3">
            <div className="h-3 w-40 max-w-full rounded bg-muted" />
            <div className="h-3 w-full rounded bg-muted" />
            <div className="h-3 w-3/4 rounded bg-muted" />
          </div>
        </div>
      </div>
    </div>
  );
}
