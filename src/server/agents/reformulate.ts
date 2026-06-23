import type { Ticket } from "../../shared/schemas.ts";
import { parseTriageReport } from "../../shared/schemas.ts";

/** Build the one-shot `claude -p` prompt that reformulates a ticket's need into clean markdown. */
export function buildReformulatePrompt(ticket: Ticket): string {
  const lines: string[] = [
    "Tu es chargé de reformuler proprement le besoin décrit par un ticket.",
    "",
    "## Description du ticket",
    ticket.description || "(vide)",
    "",
    "La description peut référencer des chemins d'images locaux absolus (ex. /Users/.../uploads/xxx.png)",
    "que tu peux ouvrir avec l'outil Read pour mieux comprendre le besoin.",
  ];

  const triage = parseTriageReport(ticket.triageReport);
  if (triage) {
    lines.push("", "## Analyse de faisabilité");
    if (triage.summary.trim()) lines.push("", "### Résumé", triage.summary);
    if (triage.reasons.length > 0) {
      lines.push("", "### Raisons", ...triage.reasons.map((reason) => `- ${reason}`));
    }
    if (triage.questions.length > 0) {
      lines.push("", "### Questions ouvertes", ...triage.questions.map((question) => `- ${question}`));
    }
    if (triage.solutions.length > 0) {
      lines.push("", "### Solutions envisageables", ...triage.solutions.map((solution) => `- ${solution}`));
    }
  }

  lines.push(
    "",
    "## Consigne",
    "Produis une reformulation claire, structurée et bien organisée du besoin, en markdown.",
    "Reste fidèle au besoin : n'invente rien et ne propose pas de solution non demandée.",
    "Réponds UNIQUEMENT avec le markdown reformulé, sans préambule ni commentaire.",
  );

  return lines.join("\n");
}
