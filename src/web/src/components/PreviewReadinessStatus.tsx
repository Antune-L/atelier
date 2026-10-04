import { Loader2 } from "lucide-react";

import { COLUMN_LABELS } from "@shared/constants";
import type { PreviewReadiness } from "@shared/preview";

import { Button } from "@/components/ui/button";
import { useBoard } from "@/hooks/useBoard";
import { PREVIEW_READINESS_LABELS, PREVIEW_REVISION_LABEL_LENGTH } from "@/lib/previewDisplay";
import { boardStore } from "@/lib/store";

export function PreviewReadinessStatus({ readiness, loading, error }: { readiness: PreviewReadiness | null; loading: boolean; error: string | null }) {
  const { tickets } = useBoard();
  const preparationTicket = tickets.find((ticket) => ticket.id === readiness?.preparationTicketId);
  return (
    <div role="status" className="space-y-2 rounded-md border border-border p-3 text-sm">
      {loading && <p className="flex items-center gap-2 text-muted-foreground"><Loader2 className="size-3.5 animate-spin" />Vérification de la préparation du projet…</p>}
      {!loading && error && <p className="text-danger">{error}</p>}
      {!loading && !error && readiness !== null && <>
        <p className={readiness.status === "ready" ? "font-medium text-primary" : "font-medium"}>{PREVIEW_READINESS_LABELS[readiness.status]}</p>
        <p className="text-xs text-muted-foreground">Branche vérifiée : <span className="font-mono">{readiness.branch}</span>{readiness.revision !== null && <> · commit <span className="font-mono">{readiness.revision.slice(0, PREVIEW_REVISION_LABEL_LENGTH)}</span></>}</p>
        {readiness.diagnostics.map((diagnostic) => <p key={diagnostic} className="break-words text-xs text-muted-foreground">{diagnostic}</p>)}
        {readiness.status === "ready" && <p className="text-xs text-muted-foreground">La recette et ses fichiers sont présents et valides. La construction sera vérifiée pendant le déploiement.</p>}
        {readiness.preparationTicketId !== null && <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => { if (readiness.preparationTicketId !== null) boardStore.openTicket(readiness.preparationTicketId); }}>Ouvrir la carte de préparation</Button>
          {preparationTicket && <span className="text-xs text-muted-foreground">{COLUMN_LABELS[preparationTicket.column]}</span>}
        </div>}
      </>}
    </div>
  );
}
