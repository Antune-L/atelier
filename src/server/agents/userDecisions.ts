import type { Comment } from "../../shared/schemas.ts";
import { USER_DECISION_APPLIED_EVENT, USER_DECISION_REFUSED_EVENT, type UserDecisionAction } from "../db/reviewDecisions.ts";
import type { Store } from "../db/store.ts";

export interface UserDecisionRequest {
  ticketId: string;
  messageId: string;
  action: UserDecisionAction;
  target: string;
  notBefore: number;
  interpretation: unknown;
}

export interface AuthorizedUserDecision {
  request: UserDecisionRequest;
  comment: Comment;
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
