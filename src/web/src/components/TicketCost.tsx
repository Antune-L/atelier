import type { ReactNode } from "react";

import { AGENT_MODEL_LABELS } from "@shared/constants";
import {
  costByFamily,
  costOfSessions,
  tokenBreakdownOf,
  totalTokensOfSessions,
  type ModelFamily,
} from "@shared/pricing";
import type { Ticket } from "@shared/schemas";

import { Badge } from "@/components/ui/badge";

const USD_FORMATTER = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const TOKEN_FORMATTER = new Intl.NumberFormat("fr-FR");

function formatTokens(n: number): string {
  return TOKEN_FORMATTER.format(n);
}

interface TicketCostProps {
  ticket: Pick<Ticket, "sessionUsage" | "implementer">;
}

/** Cost badge + token breakdown for a ticket, derived from its per-session usage. */
export function TicketCost({ ticket }: TicketCostProps): ReactNode {
  const hasUsage = Object.keys(ticket.sessionUsage).length > 0;
  if (!hasUsage) return null;

  const totalCost = costOfSessions(ticket.sessionUsage);
  const totalTokens = totalTokensOfSessions(ticket.sessionUsage);
  const breakdown = tokenBreakdownOf(ticket.sessionUsage);
  const byFamily = costByFamily(ticket.sessionUsage);
  const families = Object.entries(byFamily).filter((entry): entry is [ModelFamily, number] => entry[1] > 0);

  return (
    <section className="space-y-2 rounded-md border bg-muted/30 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold">Coût</h3>
        <Badge variant="secondary" className="tabular-nums">
          {USD_FORMATTER.format(totalCost)}
        </Badge>
        <span className="text-xs text-muted-foreground tabular-nums">{formatTokens(totalTokens)} tokens</span>
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

      {families.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {families.map(([family, cost]) => (
            <Badge key={family} variant="outline" className="gap-1 tabular-nums">
              {AGENT_MODEL_LABELS[family]} · {USD_FORMATTER.format(cost)}
            </Badge>
          ))}
        </div>
      )}

      {ticket.implementer === "composer" && (
        <p className="text-xs text-muted-foreground">Coût Cursor non inclus (code écrit par Composer).</p>
      )}
    </section>
  );
}
