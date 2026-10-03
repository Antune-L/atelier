import { ACTIVE_STAGES } from "../../shared/constants.ts";
import type { Stage } from "../../shared/constants.ts";
import { reviewKindSchema } from "../../shared/protocol.ts";
import type { Ticket } from "../../shared/schemas.ts";
import type { Store } from "../db/store.ts";

const MAX_RECOVERY_CONTEXT_LENGTH = 24_000;
const MAX_RECOVERY_ENTRY_LENGTH = 1_200;
const MAX_RECOVERY_ENTRIES = 20;

export function recoveryStage(ticket: Ticket, store: Store): Stage {
  const unresolvedQuestions = store.listComments(ticket.id).some((comment) => comment.author === "agent" && comment.questionId !== null && !comment.answered);
  if (unresolvedQuestions) return "awaiting_answers";
  if (ticket.stage !== null && ticket.stage !== "queued" && ACTIVE_STAGES.includes(ticket.stage)) return ticket.stage;
  const previous = store.getLastActiveStage(ticket.id);
  if (previous !== null && previous !== "awaiting_answers") return previous;
  return "implementing";
}

export function buildRecoveryContext(ticket: Ticket, store: Store, stage: Stage): string {
  const lines = [
    "Reprise de l'exécution après interruption. Cet état persistant complète le contrat et prend priorité sur ses instructions de démarrage.",
    `Étape à reprendre : ${stage}. Conserve les modifications présentes et vérifie l'état réel du worktree avant de poursuivre.`,
    "Les lots terminés ont été intégrés. Ne les relance pas. Les lots interrompus ne prouvent pas une intégration ; vérifie leur état et le plan avant de reprendre.",
    "Les résultats de review ci-dessous sont historiques : leurs empreintes seront revérifiées par les gates existantes. Aucun succès de test n'est prouvé par cette reprise ; relance les vérifications nécessaires.",
    "Les messages non acceptés sont rejoués par le serveur. Ne répète pas une question déjà posée et conserve les budgets de tentatives et de review.",
    `Provider : ${ticket.orchestrator}. Branche : ${ticket.branch ?? "inconnue"}. PR : ${ticket.prUrl ?? "aucune"}. PRD présent : ${ticket.prdMarkdown !== null}.`,
  ];
  let length = lines.join("\n").length;
  const append = (label: string, value: unknown): void => {
    const entry = `${label} : ${JSON.stringify(value)}`;
    const bounded = entry.length > MAX_RECOVERY_ENTRY_LENGTH ? `${entry.slice(0, MAX_RECOVERY_ENTRY_LENGTH)}…` : entry;
    if (length + bounded.length >= MAX_RECOVERY_CONTEXT_LENGTH) return;
    lines.push(bounded);
    length += bounded.length + 1;
  };
  for (const comment of store.listComments(ticket.id).filter((entry) => entry.author === "user" || entry.questionId !== null).slice(-MAX_RECOVERY_ENTRIES)) {
    append("Contexte utilisateur", { author: comment.author, questionId: comment.questionId, answered: comment.answered, body: comment.body });
  }
  const plan = store.getImplementationPlan(ticket.id);
  if (plan !== null) {
    append("Plan d'implémentation persistant", { id: plan.id, status: plan.status, maxParallel: plan.maxParallel });
    for (const lot of plan.lots.slice(0, MAX_RECOVERY_ENTRIES)) {
      append("Lot du plan", { label: lot.label, files: lot.files, dependsOn: lot.dependsOn, status: lot.status, attempts: lot.attempts, summary: lot.summary, plan: lot.plan });
    }
  }
  for (const lot of store.listImplementationLotStates(ticket.id).slice(-MAX_RECOVERY_ENTRIES)) append("Lot du cycle courant", lot);
  const pass = store.getReviewPass(ticket.id);
  if (pass !== null) {
    append("Passe de review historique", { id: pass.passId, codeFingerprint: pass.codeFingerprint, depth: pass.reviewDepth });
    for (const kind of reviewKindSchema.options) {
      const result = pass.results[kind];
      if (!result) continue;
      append("Résultat de review historique", { kind, status: result.status, verdict: result.verdict, summary: result.summary, error: result.error });
      for (const finding of result.findings.slice(0, MAX_RECOVERY_ENTRIES)) append("Correction à vérifier", { kind, id: finding.id, severity: finding.severity, summary: finding.summary, path: finding.path, line: finding.line, verificationStatus: finding.verificationStatus });
    }
  }
  const iteration = store.getActiveQualityIteration(ticket.id);
  if (iteration !== null) append("Itération qualité", { id: iteration.id, mode: iteration.mode, status: iteration.status, diagnostic: iteration.diagnostic });
  return lines.join("\n");
}
