import { ORCHESTRATOR_LABELS, TERMINAL_STAGES } from "@shared/constants";
import type { Ticket } from "@shared/schemas";

import { LiveTerminal } from "@/components/LiveTerminal";
import { TerminalView } from "@/components/TerminalView";

interface TerminalTabProps {
  ticket: Ticket;
}

/** The session pane, filling the sheet body. */
export function TerminalTab({ ticket }: TerminalTabProps) {
  // The pane WebSocket can land before the session is spawned (queued/setup window); while the
  // session is expected to be live the terminal retries rather than freezing. A test session sits
  // on a "done" (terminal) stage, so OR in `testing` to keep it live.
  const sessionLive =
    (ticket.stage !== null && !TERMINAL_STAGES.includes(ticket.stage)) || ticket.testing;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-3">
      <div className="mb-3 shrink-0 rounded-md border border-border px-3 py-2"><h2 className="text-sm font-medium">{ticket.testing ? "Terminal de test · Interactif" : "Session agent · Lecture seule"}</h2><p className="mt-1 text-xs text-muted-foreground">{ORCHESTRATOR_LABELS[ticket.orchestrator]} · {sessionLive ? "Session active" : "Session terminée"}{ticket.testing ? " · Vos commandes sont exécutées dans la session de test." : " · La sortie est consultable sans champ de commande."}</p></div>
      {ticket.testing ? (
        // An interactive test session is a real tmux shell — keep the xterm (input + resize).
        <LiveTerminal ticketId={ticket.id} live={sessionLive} fill defaultInput />
      ) : (
        // An agent session runs in-process via the SDK: poll its rendered live transcript.
        <TerminalView ticketId={ticket.id} fill />
      )}
    </div>
  );
}
