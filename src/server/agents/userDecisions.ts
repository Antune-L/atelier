/**
 * Authorisation of backend actions backed by an explicit user instruction. A user comment (answer
 * or free comment, referenced by `comments.id`) authorises one precise action on one target of its
 * own review ticket, once, and every outcome is journaled. This guards against ordinary
 * misinterpretation by the agent; it is not a defence against a malicious local agent.
 */

import type { Comment } from "../../shared/schemas.ts";
import { USER_DECISION_APPLIED_EVENT, type Store } from "../db/store.ts";

export const USER_DECISION_REFUSED_EVENT = "user_decision_refused";

export const USER_DECISION_ACTIONS = {
  rerunReview: "rerun_review",
  dismissFinding: "dismiss_finding",
  attachNote: "attach_note",
  chooseVerdict: "choose_verdict",
  skipPublication: "skip_publication",
} as const;
export type UserDecisionAction = (typeof USER_DECISION_ACTIONS)[keyof typeof USER_DECISION_ACTIONS];

export interface UserDecisionRequest {
  ticketId: string;
  messageId: string;
  action: UserDecisionAction;
  target: string;
  /** Creation time of the targeted result revision: the instruction must not predate it. */
  notBefore: number;
  /** What the agent understood the user asked, journaled next to the user's own text. */
  interpretation: unknown;
}

export type UserDecisionCheck = { ok: true; comment: Comment } | { ok: false; reason: string };

export function authorizeUserDecision(store: Store, request: UserDecisionRequest): UserDecisionCheck {
  const ticket = store.getTicket(request.ticketId);
  if (!ticket) return { ok: false, reason: "carte introuvable" };
  if (ticket.autonomous) return { ok: false, reason: "les cartes autonomes n'acceptent pas de décision utilisateur rapportée par l'agent" };
  if (ticket.kind !== "review") return { ok: false, reason: "seules les cartes de revue de PR acceptent cette décision" };
  const comment = store.getComment(request.messageId);
  if (!comment || comment.ticketId !== request.ticketId) {
    return { ok: false, reason: `message ${request.messageId} introuvable sur cette carte : cite l'id (messageId) d'une réponse ou d'un commentaire de l'utilisateur` };
  }
  if (comment.author !== "user") return { ok: false, reason: `le message ${request.messageId} n'a pas été écrit par l'utilisateur` };
  if (comment.createdAt < request.notBefore) {
    return { ok: false, reason: `le message ${request.messageId} est antérieur au résultat qu'il viserait : il ne peut pas l'autoriser` };
  }
  if (store.isUserDecisionConsumed(request.ticketId, request.messageId, request.action, request.target)) {
    return { ok: false, reason: `le message ${request.messageId} a déjà autorisé ${request.action} sur ${request.target}` };
  }
  return { ok: true, comment };
}

/** Journal an applied decision: the user's own text, the interpreted action, its target and outcome. */
export function recordUserDecision(store: Store, request: UserDecisionRequest, comment: Comment, outcome: string): void {
  store.logEvent(request.ticketId, USER_DECISION_APPLIED_EVENT, {
    messageId: request.messageId,
    action: request.action,
    target: request.target,
    userText: comment.body,
    interpretation: request.interpretation,
    outcome,
  });
}

/** Journal a refused decision and build the explicit refusal returned to the agent. */
export function refuseUserDecision(store: Store, request: Pick<UserDecisionRequest, "ticketId" | "messageId" | "action" | "target">, reason: string): { ok: false; result: string } {
  store.logEvent(request.ticketId, USER_DECISION_REFUSED_EVENT, {
    messageId: request.messageId,
    action: request.action,
    target: request.target,
    reason,
  });
  return {
    ok: false,
    result: `Décision utilisateur non exécutée : ${reason}. Explique-le explicitement à l'utilisateur au lieu de reposer la même question.`,
  };
}
