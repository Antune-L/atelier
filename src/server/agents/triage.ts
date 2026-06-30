import type { Ticket } from "../../shared/schemas.ts";
import {
  AGENT_EFFORTS,
  AGENT_MODELS,
  FEASIBILITY_SCOUT_AGENT_NAME,
  TRIAGE_PLUS_SOLUTIONS_SCOUT_AGENT_NAME,
} from "../../shared/constants.ts";
import type { CommitLanguage } from "../../shared/constants.ts";
import { extractFigmaUrls } from "../../shared/figma.ts";
import type { ProjectConfig } from "../config.ts";

/** Whether the triage prompt should be rendered in English (vs the French default). */
function isEnglish(language: CommitLanguage): boolean {
  return language === "en";
}

/**
 * The `## Ticket` block plus the image/Figma note: title, description and referenced Figma links.
 * Shared verbatim by the normal and the deep ("Analyse +") triage prompts.
 */
function buildTicketLines(ticket: Ticket, en: boolean): string[] {
  const figmaUrls = extractFigmaUrls(ticket.description);
  const figmaLines =
    figmaUrls.length > 0
      ? [en ? "Referenced Figma links:" : "Liens Figma référencés :", ...figmaUrls.map((url) => `- ${url}`)]
      : [];

  return en
    ? [
        "## Ticket",
        `Title: ${ticket.title}`,
        "",
        "Description:",
        ticket.description || "(empty)",
        "",
        "The description may reference absolute local image paths (e.g. /Users/.../uploads/xxx.png)",
        "that you can read with the Read tool, and figma.com links.",
        ...figmaLines,
      ]
    : [
        "## Ticket",
        `Titre : ${ticket.title}`,
        "",
        "Description :",
        ticket.description || "(vide)",
        "",
        "La description peut référencer des chemins d'images locaux absolus (ex. /Users/.../uploads/xxx.png)",
        "que tu peux lire avec l'outil Read, et des liens figma.com.",
        ...figmaLines,
      ];
}

/** The `## Strict rules` block, shared by both triage prompts. */
function buildStrictRulesLines(en: boolean): string[] {
  return en
    ? [
        "## Strict rules",
        "- Don't make anything up.",
        "- Don't assume anything: if information is missing, it is a question, not an assumption.",
        "- Don't propose rewriting the ticket.",
        "- Ground every claim in code you have actually read (cite file paths).",
      ]
    : [
        "## Règles strictes",
        "- N'invente rien.",
        "- Ne suppose rien : si une information manque, c'est une question, pas une hypothèse.",
        "- Ne propose pas de réécrire le ticket.",
        "- Fonde chaque affirmation sur du code que tu as réellement lu (cite les chemins de fichiers).",
      ];
}

/**
 * The `## Response format` block. `extraFields` are inserted just before the closing "don't write the
 * verdict as text" line — the deep prompt uses it to document its extra `solutions` field.
 */
function buildResponseFormatLines(en: boolean, extraFields: string[] = []): string[] {
  return en
    ? [
        "## Response format",
        "When your analysis is done, call the `submit_triage` tool (MCP `worker` server) with:",
        "- `verdict`: `implementable` | `needs_info` | `needs_rework`",
        "- `summary`: 2-3 sentences",
        "- `reasons`: list of reasons (mandatory for `needs_rework`)",
        "- `questions`: list of questions (mandatory for `needs_info`)",
        "- `files`: paths actually read that ground the analysis",
        "- `suggestedModel` / `suggestedEffort`: see below, otherwise `null`",
        ...extraFields,
        "Do not write the verdict as text: only the `submit_triage` call is taken into account.",
      ]
    : [
        "## Format de réponse",
        "Quand ton analyse est terminée, appelle le tool `submit_triage` (serveur MCP `worker`) avec :",
        "- `verdict` : `implementable` | `needs_info` | `needs_rework`",
        "- `summary` : 2-3 phrases",
        "- `reasons` : liste de raisons (obligatoire pour `needs_rework`)",
        "- `questions` : liste de questions (obligatoire pour `needs_info`)",
        "- `files` : chemins réellement lus qui fondent l'analyse",
        "- `suggestedModel` / `suggestedEffort` : voir ci-dessous, sinon `null`",
        ...extraFields,
        "N'écris pas le verdict en texte : seul l'appel à `submit_triage` est pris en compte.",
      ];
}

/** The `Contract constraints` block (verdict semantics + model/effort guidance), shared by both prompts. */
function buildContractConstraintsLines(en: boolean): string[] {
  return en
    ? [
        "Contract constraints:",
        "- `verdict` = `implementable` if the ticket can be implemented as is.",
        "- `verdict` = `needs_info` if a decision is beyond you: `questions` must then be non-empty.",
        "- `verdict` = `needs_rework` if the ticket contradicts existing code or is impossible as is:",
        "  `reasons` must then explain why (contradiction, infeasible scope…).",
        "- `files` lists the paths actually read.",
        "- `suggestedModel` / `suggestedEffort`: ONLY if `verdict` = `implementable`, judge the model",
        `  (${AGENT_MODELS.join(", ")}) and the effort (${AGENT_EFFORTS.join(", ")}) the implementation agent`,
        "  should use, based on the real complexity of the ticket (diff size, logic subtlety, touched",
        "  surface). The simpler/more mechanical it is, the lower the model and effort can be.",
        "  Otherwise (non-implementable verdict, or no reliable suggestion), set both to `null`.",
      ]
    : [
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
}

/**
 * Builds the read-only triage prompt injected into a worker-channel session: decide whether the
 * ticket is implementable EXACTLY as written against THIS repository, then return the verdict by
 * calling the `submit_triage` worker tool (not by printing JSON).
 */
export function buildTriageChannelPrompt(
  ticket: Ticket,
  project: ProjectConfig,
  baseBranch: string,
  language: CommitLanguage,
): string {
  const en = isEnglish(language);

  const header = en
    ? [
        `# Feasibility triage — Ticket ${ticket.id}`,
        "",
        `Project: ${project.label} (base branch: ${baseBranch})`,
        "",
        "You are a READ-ONLY triage session (only Read, Glob, Grep are available;",
        "Edit/Write/Bash are uncallable). Do not attempt to modify the repository.",
      ]
    : [
        `# Triage de faisabilité — Ticket ${ticket.id}`,
        "",
        `Projet : ${project.label} (branche de base : ${baseBranch})`,
        "",
        "Tu es une session de triage en LECTURE SEULE (seuls Read, Glob, Grep sont disponibles ;",
        "Edit/Write/Bash sont inappelables). N'essaie pas de modifier le dépôt.",
      ];

  const mission = en
    ? [
        "## Your mission",
        "Explore THIS repository (read-only) and decide whether the ticket is implementable",
        "EXACTLY as written, without rewording it.",
      ]
    : [
        "## Ta mission",
        "Explore CE dépôt (en lecture seule) et décide si le ticket est implémentable",
        "EXACTEMENT tel qu'il est écrit, sans le reformuler.",
      ];

  const lines: string[] = [
    ...header,
    "",
    ...buildTicketLines(ticket, en),
    "",
    ...mission,
    "",
    ...buildStrictRulesLines(en),
    "",
    ...buildResponseFormatLines(en),
    "",
    ...buildContractConstraintsLines(en),
  ];

  return lines.filter((line) => line !== "").join("\n");
}

/**
 * Builds the read-only DEEP triage prompt ("Analyse +"): the session fans out PARALLEL sub-agents
 * (feasibility + solutions angles), judges their findings, then submits the verdict AND the concrete
 * deployable solution options via `submit_triage` (the `solutions` field). Same strict contract rules
 * as the normal triage for verdict/questions/reasons/files/suggested*.
 */
export function buildTriagePlusChannelPrompt(
  ticket: Ticket,
  project: ProjectConfig,
  baseBranch: string,
  language: CommitLanguage,
): string {
  const en = isEnglish(language);

  const header = en
    ? [
        `# Deep feasibility analysis (Analyse +) — Ticket ${ticket.id}`,
        "",
        `Project: ${project.label} (base branch: ${baseBranch})`,
        "",
        "You are a READ-ONLY deep-analysis session on the real repository (no worktree).",
        "Only Read, Glob, Grep and Task (sub-agents) are available; Edit/Write/Bash are uncallable.",
        "Do not attempt to modify the repository.",
      ]
    : [
        `# Analyse + de faisabilité (approfondie) — Ticket ${ticket.id}`,
        "",
        `Projet : ${project.label} (branche de base : ${baseBranch})`,
        "",
        "Tu es une session d'analyse approfondie en LECTURE SEULE sur le dépôt réel (pas de worktree).",
        "Seuls Read, Glob, Grep et Task (sous-agents) sont disponibles ; Edit/Write/Bash sont inappelables.",
        "N'essaie pas de modifier le dépôt.",
      ];

  const mission = en
    ? [
        "## Your mission",
        "Run a deep analysis of THIS ticket against THIS repository. Launch IN PARALLEL (fan-out, a single",
        "message, several Task calls) EXACTLY these fresh-context sub-agents:",
        "",
        `1. ONE \`subagent_type: "${FEASIBILITY_SCOUT_AGENT_NAME}"\` sub-agent (feasibility): is the ticket`,
        "   implementable EXACTLY as written? Contradictions, missing dependencies, gray areas.",
        "   It returns: verdict (`implementable` | `needs_info` | `needs_rework`), summary,",
        "   reasons/questions per the verdict, files read, suggestedModel/suggestedEffort if implementable.",
        "",
        `2. TWO \`subagent_type: "${TRIAGE_PLUS_SOLUTIONS_SCOUT_AGENT_NAME}"\` sub-agents with`,
        "   DELIBERATELY distinct angles (don't tell them what the other does):",
        "   - Scout A: conventional / documented / mainstream approach for this repository.",
        "   - Scout B: alternative approach (simplicity, performance, or a contrarian angle).",
        "   Each solutions scout returns: Recommendation, Evidence (cited files), Trade-offs, Confidence.",
        "",
        "NEVER nest sub-agents: a sub-agent must never launch another one.",
        "Once you receive their feedback, JUDGE yourself (paris-research style): compare feasibility and",
        "solutions, decide on the final verdict and the retained options, then synthesize.",
      ]
    : [
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
      ];

  const solutionsField = en
    ? [
        "- `solutions`: the list of concrete, deployable solution options identified (each a short",
        "  paragraph: the approach + its key trade-off). This is the main output of this deep analysis.",
      ]
    : [
        "- `solutions` : la liste des options de solution concrètes et déployables identifiées (chacune un court",
        "  paragraphe : l'approche + son compromis clé). C'est l'apport principal de cette analyse approfondie.",
      ];

  const lines: string[] = [
    ...header,
    "",
    ...buildTicketLines(ticket, en),
    "",
    ...mission,
    "",
    ...buildStrictRulesLines(en),
    "",
    ...buildResponseFormatLines(en, solutionsField),
    "",
    ...buildContractConstraintsLines(en),
  ];

  return lines.filter((line) => line !== "").join("\n");
}
