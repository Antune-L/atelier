import type { Ticket, TriageResult } from "../../shared/schemas.ts";
import { triageResultSchema } from "../../shared/schemas.ts";
import { AGENT_EFFORTS, AGENT_MODELS } from "../../shared/constants.ts";
import { extractFigmaUrls } from "../../shared/figma.ts";
import type { ProjectConfig } from "../config.ts";

const FENCE_PATTERN = /^```(?:json)?\s*\n?([\s\S]*?)\n?```$/;

/**
 * Builds the read-only triage prompt: decide whether the ticket is implementable
 * EXACTLY as written against THIS repository, without inventing or reworking.
 */
export function buildTriagePrompt(ticket: Ticket, project: ProjectConfig): string {
  const figmaUrls = extractFigmaUrls(ticket.description);

  const lines: string[] = [
    `# Triage de faisabilité — Ticket ${ticket.id}`,
    "",
    `Projet : ${project.label} (branche de base : ${project.baseBranch})`,
    "",
    "## Ticket",
    `Titre : ${ticket.title}`,
    "",
    "Description :",
    ticket.description || "(vide)",
    "",
    "La description peut référencer des chemins d'images locaux absolus (ex. /Users/.../uploads/xxx.png)",
    "que tu peux lire avec l'outil Read, et des liens figma.com.",
    ...(figmaUrls.length > 0 ? ["Liens Figma référencés :", ...figmaUrls.map((url) => `- ${url}`)] : []),
    "",
    "## Ta mission",
    "Explore CE dépôt (en lecture seule : Read, Glob, Grep) et décide si le ticket est implémentable",
    "EXACTEMENT tel qu'il est écrit, sans le reformuler.",
    "",
    "## Règles strictes",
    "- N'invente rien.",
    "- Ne suppose rien : si une information manque, c'est une question, pas une hypothèse.",
    "- Ne propose pas de réécrire le ticket.",
    "- Fonde chaque affirmation sur du code que tu as réellement lu (cite les chemins de fichiers).",
    "",
    "## Format de réponse",
    "Réponds avec UNIQUEMENT un objet JSON (aucun texte autour, aucune clôture markdown) :",
    JSON.stringify(
      {
        verdict: "implementable | needs_info | needs_rework",
        summary: "<2-3 phrases>",
        reasons: ["…"],
        questions: ["…"],
        files: ["chemins réellement lus qui fondent l'analyse"],
        suggestedModel: null,
        suggestedEffort: null,
      },
      null,
      2,
    ),
    "",
    "Contraintes du contrat :",
    "- `verdict` = `implementable` si le ticket peut être implémenté tel quel.",
    "- `verdict` = `needs_info` si une décision te dépasse : `questions` doit alors être non vide.",
    "- `verdict` = `needs_rework` si le ticket contredit le code existant ou est impossible en l'état :",
    "  `reasons` doit alors expliquer pourquoi (contradiction, périmètre infaisable…).",
    "- `files` liste les chemins réellement lus.",
    "- `suggestedModel` / `suggestedEffort` : UNIQUEMENT si `verdict` = `implementable`, juge le modèle",
    `  (${AGENT_MODELS.join(", ")}) et l'effort (${AGENT_EFFORTS.join(", ")}) que l'agent d'implémentation`,
    "  devrait utiliser, en fonction de la complexité réelle du ticket (ampleur du diff, subtilité de la",
    "  logique, surface touchée). Plus c'est simple/mécanique, plus le modèle et l'effort peuvent être bas.",
    "  Sinon (verdict non implementable, ou aucune suggestion fiable), mets les deux à `null`.",
  ];

  return lines.filter((line) => line !== "").join("\n");
}

/** Strips an optional ```json fence, then zod-validates the triage shape. null on failure. */
export function parseTriageResult(raw: string): TriageResult | null {
  const trimmed = raw.trim();
  const unfenced = FENCE_PATTERN.exec(trimmed)?.[1] ?? trimmed;
  let value: unknown;
  try {
    value = JSON.parse(unfenced);
  } catch {
    return null;
  }
  const parsed = triageResultSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
