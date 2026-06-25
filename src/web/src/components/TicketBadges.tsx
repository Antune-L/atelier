import { AlertTriangle, Brush, Eye, EyeOff, HelpCircle, MessageCircleQuestion, Upload } from "lucide-react";

import type { Ticket } from "@shared/schemas";

import { Badge } from "@/components/ui/badge";

interface TicketBadgesProps {
  ticket: Ticket;
}

/** The ticket badges shared by the board card and the agent card: kind, watchdog, pending questions. */
export function TicketBadges({ ticket }: TicketBadgesProps) {
  return (
    <>
      {ticket.kind === "review" && (
        <Badge variant="secondary" className="gap-1 text-[10px]">
          <Eye className="h-3 w-3" /> Review
        </Badge>
      )}
      {ticket.kind === "clean" && (
        <Badge variant="secondary" className="gap-1 text-[10px]">
          <Brush className="h-3 w-3" /> Clean
        </Badge>
      )}
      {ticket.kind === "ask" && (
        <Badge variant="secondary" className="gap-1 text-[10px]">
          <HelpCircle className="h-3 w-3" /> Ask
        </Badge>
      )}
      {ticket.kind === "feature" && ticket.stealth && (
        <Badge variant="secondary" className="gap-1 text-[10px]">
          <EyeOff className="h-3 w-3" /> Stealth
        </Badge>
      )}
      {ticket.kind === "feature" && ticket.directPush && (
        <Badge variant="secondary" className="gap-1 text-[10px]">
          <Upload className="h-3 w-3" /> Push direct
        </Badge>
      )}
      {ticket.watchdogFlagged && (
        <Badge variant="warning" className="gap-1">
          <AlertTriangle className="h-3 w-3" /> Inactif
        </Badge>
      )}
      {ticket.pendingQuestions > 0 && (
        <Badge variant="warning" className="gap-1">
          <MessageCircleQuestion className="h-3 w-3" /> {ticket.pendingQuestions}
        </Badge>
      )}
    </>
  );
}
