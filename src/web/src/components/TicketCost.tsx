import type { ReactNode } from "react";

import { summarizeSessionCosts, totalTokensOfSessions } from "@shared/pricing";
import type { Ticket } from "@shared/schemas";

import { MetaRow } from "@/components/ticket-detail/MetaRow";
import { formatTokens, formatUsd } from "@/lib/display";

interface TicketCostProps {
  ticket: Pick<Ticket, "sessionUsage" | "implementer">;
}

const UNKNOWN_COST = "—";

/** Token/cost meta rows for a ticket, derived from its per-session usage. */
export function TicketCost({ ticket }: TicketCostProps): ReactNode {
  const hasUsage = Object.keys(ticket.sessionUsage).length > 0;
  if (!hasUsage) return null;

  const totalTokens = totalTokensOfSessions(ticket.sessionUsage);
  const costs = summarizeSessionCosts(ticket.sessionUsage);
  const costLabel = costs.costUsd === null ? UNKNOWN_COST : formatUsd(costs.costUsd);

  return (
    <>
      <MetaRow label="Tokens">{formatTokens(totalTokens)}</MetaRow>
      <MetaRow label="Coût">
        {costs.partial ? `${formatUsd(costs.knownCostUsd)} (partiel)` : costLabel}
      </MetaRow>
    </>
  );
}
