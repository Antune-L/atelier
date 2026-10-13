import { FileText } from "lucide-react";

import type { Ticket } from "@shared/schemas";

import { Button } from "@/components/ui/button";

interface PrdTabProps {
  ticket: Ticket;
  onExpand: () => void;
}

export function PrdTab({ ticket, onExpand }: PrdTabProps) {
  const proposed = ticket.column === "prd";
  return (
    <section className="space-y-4 rounded-lg border border-border p-5">
      <div className="flex items-start gap-3"><FileText className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden /><div><h2 className="text-lg font-medium">{proposed ? "PRD · À valider" : "PRD · Lecture seule"}</h2><p className="mt-1 text-sm text-muted-foreground">Document soumis pour ce ticket. Les annotations restent liées au contenu de cette version.</p></div></div>
      {ticket.prdMarkdown === null ? <p className="text-sm text-muted-foreground">Le PRD n’a pas encore été soumis.</p> : <><p className="text-xs text-muted-foreground">{proposed ? "Lisez le plan, puis validez-le ou demandez des corrections dans la barre de décision." : "Ce document est conservé pour consultation. Aucune décision ne peut être envoyée dans cet état."}</p><Button size="sm" onClick={onExpand}>Lire le PRD</Button></>}
    </section>
  );
}
