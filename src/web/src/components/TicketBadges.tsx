import { AlertTriangle, Brush, Eye, HelpCircle, MessageCircleQuestion } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { Ticket } from "@shared/schemas";

import { Badge } from "@/components/ui/badge";

interface TicketBadgesProps {
  ticket: Ticket;
}

const BADGE_CLASS = "gap-1 text-2xs";

const KIND_BADGES: Partial<Record<Ticket["kind"], { Icon: LucideIcon; label: string }>> = {
  review: { Icon: Eye, label: "Review" },
  clean: { Icon: Brush, label: "Clean" },
  ask: { Icon: HelpCircle, label: "Ask" },
};

/** Ticket kind and attention badges (watchdog, pending questions), used by the agent card. */
export function TicketBadges({ ticket }: TicketBadgesProps) {
  const kindBadge = KIND_BADGES[ticket.kind];
  return (
    <>
      {kindBadge && (
        <Badge variant="secondary" className={BADGE_CLASS}>
          <kindBadge.Icon className="h-3 w-3" /> {kindBadge.label}
        </Badge>
      )}
      {ticket.watchdogFlagged && (
        <Badge variant="warning" className={BADGE_CLASS}>
          <AlertTriangle className="h-3 w-3" /> Inactif
        </Badge>
      )}
      {ticket.pendingQuestions > 0 && (
        <Badge variant="warning" className={BADGE_CLASS}>
          <MessageCircleQuestion className="h-3 w-3" /> {ticket.pendingQuestions}
        </Badge>
      )}
    </>
  );
}
