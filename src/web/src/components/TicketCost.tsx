import type { ReactNode } from "react";

import { tokenBreakdownOf, totalTokensOfSessions } from "@shared/pricing";
import type { Ticket } from "@shared/schemas";

import { Badge } from "@/components/ui/badge";
import { formatTokens } from "@/lib/display";

interface TicketCostProps {
  ticket: Pick<Ticket, "sessionUsage" | "implementer">;
}

/** Token breakdown for a ticket, derived from its per-session usage. */
export function TicketCost({ ticket }: TicketCostProps): ReactNode {
  const hasUsage = Object.keys(ticket.sessionUsage).length > 0;
  if (!hasUsage) return null;

  const totalTokens = totalTokensOfSessions(ticket.sessionUsage);
  const breakdown = tokenBreakdownOf(ticket.sessionUsage);

  return (
    <section className="space-y-2 rounded-md border bg-muted/30 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold">Tokens</h3>
        <Badge variant="secondary" className="tabular-nums">
          {formatTokens(totalTokens)}
        </Badge>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <div className="flex justify-between gap-2">
          <dt>Entrée</dt>
          <dd className="tabular-nums">{formatTokens(breakdown.input)}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>Sortie</dt>
          <dd className="tabular-nums">{formatTokens(breakdown.output)}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>Cache (lecture)</dt>
          <dd className="tabular-nums">{formatTokens(breakdown.cacheRead)}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>Cache (création)</dt>
          <dd className="tabular-nums">{formatTokens(breakdown.cacheCreate)}</dd>
        </div>
      </dl>

      {ticket.implementer === "composer" && (
        <p className="text-xs text-muted-foreground">Tokens Cursor non inclus (code écrit par Composer).</p>
      )}
    </section>
  );
}
