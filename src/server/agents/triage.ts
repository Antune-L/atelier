import type { Ticket } from "../../shared/schemas.ts";
import {
  AGENT_EFFORTS,
  AGENT_MODELS,
  FEASIBILITY_SCOUT_AGENT_NAME,
  TRIAGE_PLUS_SOLUTIONS_SCOUT_AGENT_NAME,
} from "../../shared/constants.ts";
import { extractFigmaUrls } from "../../shared/figma.ts";
import type { ProjectConfig } from "../config.ts";

/**
 * Builds the read-only triage prompt injected into a worker-channel session: decide whether the
 * ticket is implementable EXACTLY as written against THIS repository, then return the verdict by
 * calling the `submit_triage` worker tool (not by printing JSON).
 */
export function buildTriageChannelPrompt(ticket: Ticket, project: ProjectConfig): string {
  const figmaUrls = extractFigmaUrls(ticket.description);

  const lines: string[] = [
    `# Triage de faisabilité — Ticket ${ticket.id}`,
    "",
    `Projet : ${project.label} (branche de base : ${project.baseBranch})`,
    "",
    "Tu es une session de triage en LECTURE SEULE (seuls Read, Glob, Grep sont disponibles ;",
    "Edit/Write/Bash sont inappelables). N'essaie pas de modifier le dépôt.",
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
    "Explore CE dépôt (en lecture seule) et décide si le ticket est implémentable",
    "EXACTEMENT tel qu'il est écrit, sans le reformuler.",
    "",
    "## Règles strictes",
    "- N'invente rien.",
    "- Ne suppose rien : si une information manque, c'est une question, pas une hypothèse.",
    "- Ne propose pas de réécrire le ticket.",
    "- Fonde chaque affirmation sur du code que tu as réellement lu (cite les chemins de fichiers).",
    "",
    "## Format de réponse",
    "Quand ton analyse est terminée, appelle le tool `submit_triage` (serveur MCP `worker`) avec :",
    "- `verdict` : `implementable` | `needs_info` | `needs_rework`",
    "- `summary` : 2-3 phrases",
    "- `reasons` : liste de raisons (obligatoire pour `needs_rework`)",
    "- `questions` : liste de questions (obligatoire pour `needs_info`)",
    "- `files` : chemins réellement lus qui fondent l'analyse",
    "- `suggestedModel` / `suggestedEffort` : voir ci-dessous, sinon `null`",
    "N'écris pas le verdict en texte : seul l'appel à `submit_triage` est pris en compte.",
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

/**
 * Builds the read-only DEEP triage prompt ("Analyse +"): the session fans out PARALLEL sub-agents
 * (feasibility + solutions angles), judges their findings, then submits the verdict AND the concrete
 * deployable solution options via `submit_triage` (the `solutions` field). Same strict contract rules
 * as the normal triage for verdict/questions/reasons/files/suggested*.
 */
export function buildTriagePlusChannelPrompt(ticket: Ticket, project: ProjectConfig): string {
  const figmaUrls = extractFigmaUrls(ticket.description);

  const lines: string[] = [
    `# Analyse + de faisabilité (approfondie) — Ticket ${ticket.id}`,
    "",
    `Projet : ${project.label} (branche de base : ${project.baseBranch})`,
    "",
    "Tu es une session d'analyse approfondie en LECTURE SEULE sur le dépôt réel (pas de worktree).",
    "Seuls Read, Glob, Grep et Task (sous-agents) sont disponibles ; Edit/Write/Bash sont inappelables.",
    "N'essaie pas de modifier le dépôt.",
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
    "Mène une analyse approfondie de CE ticket contre CE dépôt. Lance EN PARALLÈLE (fan-out, un seul",
    "message, plusieurs Task) EXACTEMENT ces sous-agents à contexte frais :",
    "",
    `1. UN sous-agent \`subagent_type: "${FEASIBILITY_SCOUT_AGENT_NAME}"\` (faisabilité) : le ticket est-il`,
    "   implémentable EXACTEMENT tel qu'il est écrit ? Contradictions, dépendances manquantes, zones",
    "   d'ombre. Il renvoie : verdict (`implementable` | `needs_info` | `needs_rework`), summary,",
    "   reasons/questions selon le verdict, files lus, suggestedModel/suggestedEffort si implementable.",
    "",
    `2. DEUX sous-agents \`subagent_type: "${TRIAGE_PLUS_SOLUTIONS_SCOUT_AGENT_NAME}"\` avec des angles`,
    "   DELIBERÉMENT distincts (ne leur dis pas ce que fait l'autre) :",
    "   - Scout A : approche conventionnelle / documentée / mainstream pour ce dépôt.",
    "   - Scout B : approche alternative (simplicité, performance, ou angle contrarian).",
    "   Chaque scout solutions renvoie : Recommendation, Evidence (fichiers cités), Trade-offs, Confidence.",
    "",
    "N'imbrique JAMAIS les sous-agents : un sous-agent ne doit jamais en lancer un autre.",
    "Une fois leurs retours reçus, JUGE toi-même (style paris-research) : compare faisabilité et",
    "solutions, tranche sur le verdict final et les options retenues, puis synthétise.",
    "",
    "## Règles strictes",
    "- N'invente rien.",
    "- Ne suppose rien : si une information manque, c'est une question, pas une hypothèse.",
    "- Ne propose pas de réécrire le ticket.",
    "- Fonde chaque affirmation sur du code que tu as réellement lu (cite les chemins de fichiers).",
    "",
    "## Format de réponse",
    "Quand ton analyse est terminée, appelle le tool `submit_triage` (serveur MCP `worker`) avec :",
    "- `verdict` : `implementable` | `needs_info` | `needs_rework`",
    "- `summary` : 2-3 phrases",
    "- `reasons` : liste de raisons (obligatoire pour `needs_rework`)",
    "- `questions` : liste de questions (obligatoire pour `needs_info`)",
    "- `files` : chemins réellement lus qui fondent l'analyse",
    "- `suggestedModel` / `suggestedEffort` : voir ci-dessous, sinon `null`",
    "- `solutions` : la liste des options de solution concrètes et déployables identifiées (chacune un court",
    "  paragraphe : l'approche + son compromis clé). C'est l'apport principal de cette analyse approfondie.",
    "N'écris pas le verdict en texte : seul l'appel à `submit_triage` est pris en compte.",
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
