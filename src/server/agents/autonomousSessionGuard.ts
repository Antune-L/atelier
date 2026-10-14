import { nanoid } from "nanoid";

import type { AutonomousStartKind } from "../../shared/autonomous.ts";
import type { Store } from "../db/store.ts";
import type { AgentExecutionGuard } from "../system/agentSession.ts";

export function createAutonomousSessionGuard(
  store: Store,
  ticketId: string,
  kind: AutonomousStartKind,
  actionId = nanoid(),
): AgentExecutionGuard | null {
  const ticket = store.getTicket(ticketId);
  if (!ticket?.autonomous || !ticket.autonomousState?.execution) return null;
  const generation = ticket.autonomousState.execution.generation;
  let admitted = false;
  const assertAllowed = (allowConfirmedClosure = false): void => {
    const current = store.getTicket(ticketId);
    if (!current?.autonomous || current.autonomousState?.execution?.generation !== generation) {
      throw new Error("Autonomous execution generation revoked");
    }
    const phase = current.autonomousState.phase;
    if (phase === "paused" || phase === "completed" || phase === "closing" || phase === "publishing_partial" || phase === "published_partial" || phase === "publication_failed") {
      throw new Error("Autonomous execution work phase closed");
    }
    const closure = current.autonomousState.execution.closure.status;
    if (closure !== "not_requested" && !(allowConfirmedClosure && closure === "confirmed")) {
      throw new Error("Autonomous writer closure does not permit work");
    }
    store.assertAutonomousWork(ticketId);
  };
  return {
    beforeStart: () => {
      if (admitted) {
        assertAllowed();
        return;
      }
      assertAllowed(true);
      if (!store.admitAutonomousStart(ticketId, actionId, kind)) throw new Error("Autonomous session start already reserved");
      admitted = true;
    },
    assertAllowed: () => assertAllowed(),
    snapshot: () => {
      try {
        assertAllowed();
        const current = store.getTicket(ticketId);
        if (!current?.autonomousState?.execution) return { allowed: false, deadlineAt: null };
        return { allowed: true, deadlineAt: current.autonomousState.execution.deadlineAt };
      } catch {
        return { allowed: false, deadlineAt: null };
      }
    },
    subscribe: (listener) => store.subscribeAutonomousExecution(ticketId, listener),
  };
}
