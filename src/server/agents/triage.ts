import type { Ticket } from "../../shared/schemas.ts";
import {
  AGENT_EFFORTS,
  AGENT_MODELS,
  CODEX_EFFORTS,
  CODEX_MODELS,
  FEASIBILITY_SCOUT_AGENT_NAME,
  FEASIBILITY_VERIFIER_AGENT_NAME,
  TRIAGE_PLUS_SOLUTIONS_SCOUT_AGENT_NAME,
} from "../../shared/constants.ts";
import type { CommitLanguage, Orchestrator } from "../../shared/constants.ts";
import { extractFigmaUrls } from "../../shared/figma.ts";
import type { ProjectConfig } from "../config.ts";

/** Whether the triage prompt should be rendered in English (vs the French default). */
function isEnglish(language: CommitLanguage): boolean {
  return language === "en";
}

/**
 * Read-only framing per driver: Claude sessions are tool-gated (Read/Glob/Grep only), a Codex
 * session runs in the CLI's read-only sandbox with its own shell-based exploration tools.
 */
function readOnlyFramingLines(driver: Orchestrator, en: boolean, sessionKind: { en: string; fr: string }): string[] {
  if (driver === "codex") {
    return en
      ? [
          `You are a READ-ONLY Codex ${sessionKind.en} session (read-only sandbox: any write to the`,
          "repository is blocked). Explore the repository with your read tools only.",
        ]
      : [
          `Tu es une session Codex de ${sessionKind.fr} en LECTURE SEULE (sandbox en lecture seule :`,
          "toute écriture dans le dépôt est bloquée). Explore le dépôt avec tes outils de lecture uniquement.",
        ];
  }
  return en
    ? [
        `You are a READ-ONLY ${sessionKind.en} session (only Read, Glob, Grep, the read-only Figma MCP tools`,
        "and the `Agent` sub-agent tool are available; Edit/Write/Bash are uncallable). Do not attempt to modify the repository.",
      ]
    : [
        `Tu es une session de ${sessionKind.fr} en LECTURE SEULE (seuls Read, Glob, Grep, les outils MCP Figma`,
        "de lecture et le tool de sous-agents `Agent` sont disponibles ; Edit/Write/Bash sont inappelables). N'essaie pas de modifier le dépôt.",
      ];
}

/** How the orchestrator launches one read-only sub-agent of type `name` on each provider. */
export function subagentSpawnHint(driver: Orchestrator, name: string, en = false): string {
  if (driver === "codex") {
    return en
      ? `\`spawn_agent\` with \`agent_type: "${name}"\`, \`fork_turns: "none"\` and a unique \`task_name\` (lowercase letters, digits, \`_\`)`
      : `\`spawn_agent\` avec \`agent_type: "${name}"\`, \`fork_turns: "none"\` et un \`task_name\` unique (lettres minuscules, chiffres, \`_\`)`;
  }
  return en ? `the \`Agent\` tool with \`subagent_type: "${name}"\`` : `le tool \`Agent\` avec \`subagent_type: "${name}"\``;
}

/** Sub-agent discipline shared by every feasibility orchestrator: wait in the same turn, never nest. */
export function subagentDisciplineLines(driver: Orchestrator, en = false): string[] {
  if (en) {
    return [
      driver === "codex" ? "Wait for every sub-agent with `wait_agent` before moving on." : "Wait for every sub-agent within this same turn: never run one in the background.",
      "Sub-agents do not inherit this conversation: copy the exact ticket into each prompt.",
      "NEVER nest sub-agents: a sub-agent must never launch another one.",
    ];
  }
  return [
    driver === "codex" ? "Attends chaque sous-agent avec `wait_agent` avant de passer à l'étape suivante." : "Attends chaque sous-agent dans ce même tour : n'en lance jamais en arrière-plan.",
    "Les sous-agents n'héritent pas de cette conversation : recopie le ticket exact dans chaque prompt.",
    "N'imbrique JAMAIS les sous-agents : un sous-agent ne doit jamais en lancer un autre.",
  ];
}

/**
 * The `## Ticket` block plus the image/Figma note: title, description and referenced Figma links.
 * Shared verbatim by the normal and the deep ("Analyse +") triage prompts.
 */
function buildTicketLines(ticket: Ticket, en: boolean, driver: Orchestrator): string[] {
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
        "that you can read with the Read tool. Consult figma.com links only through a read-only Figma",
        ...(driver === "claude"
          ? ["MCP tool (get_screenshot/get_design_context in `mcp__plugin_figma_figma`)."]
          : ["tool actually exposed to this Codex session; otherwise report the link as unavailable."]),
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
        "que tu peux lire avec l'outil Read. Consulte les liens figma.com uniquement avec un outil Figma",
        ...(driver === "claude"
          ? ["MCP de lecture (get_screenshot/get_design_context dans `mcp__plugin_figma_figma`)."]
          : ["de lecture réellement exposé à cette session Codex ; sinon signale le lien non consultable."]),
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
        "- Read the applicable AGENTS.md files first. If needed project guidance is absent, consult the applicable CLAUDE.md for compatibility, without importing its permissions or secrets.",
      ]
    : [
        "## Règles strictes",
        "- N'invente rien.",
        "- Ne suppose rien : si une information manque, c'est une question, pas une hypothèse.",
        "- Ne propose pas de réécrire le ticket.",
        "- Fonde chaque affirmation sur du code que tu as réellement lu (cite les chemins de fichiers).",
        "- Lis d'abord les fichiers AGENTS.md applicables. Si une règle projet nécessaire manque, consulte le CLAUDE.md applicable comme compatibilité, sans importer ses permissions ni secrets.",
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
        "When your analysis is done, call the `submit_triage` tool (MCP `kanban` server) with:",
        "- `verdict`: `implementable` | `needs_info` | `needs_rework`",
        "- `summary`: 2-3 sentences",
        "- `reasons`: list of reasons (mandatory for `needs_rework`)",
        "- `questions`: list of questions (mandatory for `needs_info`)",
        "- `files`: paths actually read that ground the analysis",
        "- `suggestedModel` / `suggestedEffort`: see below, otherwise `null`",
        "- `suggestedOrchestrator` / `suggestedCodexModel` / `suggestedCodexEffort`: see below",
        ...extraFields,
        "Do not write the verdict as text: only the `submit_triage` call is taken into account.",
        "If the tool is not in your static tool list, it is exposed lazily: find it via your tool search (`mcp__kanban` namespace) before concluding it is unavailable.",
      ]
    : [
        "## Format de réponse",
        "Quand ton analyse est terminée, appelle le tool `submit_triage` (serveur MCP `kanban`) avec :",
        "- `verdict` : `implementable` | `needs_info` | `needs_rework`",
        "- `summary` : 2-3 phrases",
        "- `reasons` : liste de raisons (obligatoire pour `needs_rework`)",
        "- `questions` : liste de questions (obligatoire pour `needs_info`)",
        "- `files` : chemins réellement lus qui fondent l'analyse",
        "- `suggestedModel` / `suggestedEffort` : voir ci-dessous, sinon `null`",
        "- `suggestedOrchestrator` / `suggestedCodexModel` / `suggestedCodexEffort` : voir ci-dessous",
        ...extraFields,
        "N'écris pas le verdict en texte : seul l'appel à `submit_triage` est pris en compte.",
        "Si le tool n'apparaît pas dans ta liste statique de tools, il est exposé en différé : retrouve-le via ta recherche de tools (namespace `mcp__kanban`) avant de conclure qu'il est indisponible.",
      ];
}

/** The `Contract constraints` block (verdict semantics + model/effort guidance), shared by both prompts. */
function buildContractConstraintsLines(en: boolean, driver: Orchestrator): string[] {
  const providerSuggestion =
    driver === "codex"
      ? en
        ? [
            "- Set `suggestedOrchestrator` to `codex`; choose `suggestedCodexModel` / `suggestedCodexEffort`",
            `  from (${CODEX_MODELS.join(", ")}) / (${CODEX_EFFORTS.join(", ")}). Keep legacy suggestedModel/suggestedEffort null.`,
          ]
        : [
            "- Mets `suggestedOrchestrator` à `codex` ; choisis `suggestedCodexModel` / `suggestedCodexEffort`",
            `  parmi (${CODEX_MODELS.join(", ")}) / (${CODEX_EFFORTS.join(", ")}). Laisse les anciens suggestedModel/suggestedEffort à null.`,
          ]
      : en
        ? ["- Set `suggestedOrchestrator` to `claude` and leave suggestedCodexModel/suggestedCodexEffort null."]
        : ["- Mets `suggestedOrchestrator` à `claude` et laisse suggestedCodexModel/suggestedCodexEffort à null."];
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
        ...providerSuggestion,
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
        ...providerSuggestion,
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
  driver: Orchestrator = "claude",
): string {
  const en = isEnglish(language);

  const header = [
    en ? `# Feasibility triage — Ticket ${ticket.id}` : `# Triage de faisabilité — Ticket ${ticket.id}`,
    "",
    en
      ? `Project: ${project.label} (base branch: ${baseBranch})`
      : `Projet : ${project.label} (branche de base : ${baseBranch})`,
    "",
    ...readOnlyFramingLines(driver, en, { en: "triage", fr: "triage" }),
  ];

  const mission = en
    ? [
        "## Your mission",
        "Decide whether the ticket is implementable EXACTLY as written against THIS repository, without",
        "rewording it. You orchestrate two fresh-context read-only sub-agents, one after the other:",
        `1. ONE feasibility scout via ${subagentSpawnHint(driver, FEASIBILITY_SCOUT_AGENT_NAME, true)}: it returns`,
        "   verdict, summary, reasons/questions per the verdict, files read, suggestedModel/suggestedEffort if implementable.",
        `2. Then ONE verifier via ${subagentSpawnHint(driver, FEASIBILITY_VERIFIER_AGENT_NAME, true)}, given the exact`,
        "   ticket AND the scout's full report: it re-checks every cited path and decisive claim and hunts for what was missed.",
        "3. Decide yourself: re-read in the files every contested or decisive claim, then submit the final verdict.",
        ...subagentDisciplineLines(driver, true),
      ]
    : [
        "## Ta mission",
        "Décide si le ticket est implémentable EXACTEMENT tel qu'il est écrit contre CE dépôt, sans le",
        "reformuler. Tu orchestres deux sous-agents en lecture seule à contexte frais, l'un après l'autre :",
        `1. UN scout de faisabilité via ${subagentSpawnHint(driver, FEASIBILITY_SCOUT_AGENT_NAME)} : il renvoie`,
        "   verdict, summary, reasons/questions selon le verdict, files lus, suggestedModel/suggestedEffort si implementable.",
        `2. Puis UN vérificateur via ${subagentSpawnHint(driver, FEASIBILITY_VERIFIER_AGENT_NAME)}, avec le ticket exact`,
        "   ET le rapport complet du scout : il revérifie chaque chemin cité et chaque affirmation décisive, et cherche ce qui a été manqué.",
        "3. Tranche toi-même : relis dans les fichiers chaque affirmation contestée ou décisive, puis soumets le verdict final.",
        ...subagentDisciplineLines(driver),
      ];

  const lines: string[] = [
    ...header,
    "",
    ...buildTicketLines(ticket, en, driver),
    "",
    ...mission,
    "",
    ...buildStrictRulesLines(en),
    "",
    ...buildResponseFormatLines(en),
    "",
    ...buildContractConstraintsLines(en, driver),
  ];

  return lines.filter((line) => line !== "").join("\n");
}

/**
 * Builds the read-only DEEP triage prompt ("Analyse +"): the session fans out PARALLEL sub-agents
 * (feasibility + solutions angles), has a verifier challenge its draft, then submits the verdict AND the concrete
 * deployable solution options via `submit_triage` (the `solutions` field). Same strict contract rules
 * as the normal triage for verdict/questions/reasons/files/suggested*.
 */
export function buildTriagePlusChannelPrompt(
  ticket: Ticket,
  project: ProjectConfig,
  baseBranch: string,
  language: CommitLanguage,
  driver: Orchestrator = "claude",
): string {
  const en = isEnglish(language);

  const header = [
    en
      ? `# Deep feasibility analysis (Analyse +) — Ticket ${ticket.id}`
      : `# Analyse + de faisabilité (approfondie) — Ticket ${ticket.id}`,
    "",
    en
      ? `Project: ${project.label} (base branch: ${baseBranch})`
      : `Projet : ${project.label} (branche de base : ${baseBranch})`,
    "",
    ...readOnlyFramingLines(driver, en, { en: "deep analysis", fr: "analyse approfondie" }),
  ];

  const mission = en
    ? [
        "## Your mission",
        "Run a deep analysis of THIS ticket against THIS repository. Launch IN PARALLEL (fan-out, a single",
        "message, several native sub-agent calls) EXACTLY these fresh-context sub-agents:",
        "",
        `1. ONE feasibility sub-agent via ${subagentSpawnHint(driver, FEASIBILITY_SCOUT_AGENT_NAME, true)}: is the ticket`,
        "   implementable EXACTLY as written? Contradictions, missing dependencies, gray areas.",
        "   It returns: verdict (`implementable` | `needs_info` | `needs_rework`), summary,",
        "   reasons/questions per the verdict, files read, suggestedModel/suggestedEffort if implementable.",
        "",
        `2. TWO solutions sub-agents via ${subagentSpawnHint(driver, TRIAGE_PLUS_SOLUTIONS_SCOUT_AGENT_NAME, true)}, with`,
        "   DELIBERATELY distinct angles (don't tell them what the other does):",
        "   - Scout A: conventional / documented / mainstream approach for this repository.",
        "   - Scout B: alternative approach (simplicity, performance, or a contrarian angle).",
        "   Each solutions scout returns: Recommendation, Evidence (cited files), Trade-offs, Confidence.",
        "",
        "Once you receive their feedback, draft a provisional verdict and the retained options (paris-research",
        `style), then launch ONE verifier via ${subagentSpawnHint(driver, FEASIBILITY_VERIFIER_AGENT_NAME, true)} with the`,
        "exact ticket, your draft and the evidence it relies on. Finally decide yourself: re-read every contested",
        "claim in the files, then synthesize the final verdict and options.",
        ...subagentDisciplineLines(driver, true),
      ]
    : [
        "## Ta mission",
        "Mène une analyse approfondie de CE ticket contre CE dépôt. Lance EN PARALLÈLE (fan-out, un seul",
        "message, plusieurs appels de sous-agents natifs) EXACTEMENT ces sous-agents à contexte frais :",
        "",
        `1. UN sous-agent de faisabilité via ${subagentSpawnHint(driver, FEASIBILITY_SCOUT_AGENT_NAME)} : le ticket est-il`,
        "   implémentable EXACTEMENT tel qu'il est écrit ? Contradictions, dépendances manquantes, zones",
        "   d'ombre. Il renvoie : verdict (`implementable` | `needs_info` | `needs_rework`), summary,",
        "   reasons/questions selon le verdict, files lus, suggestedModel/suggestedEffort si implementable.",
        "",
        `2. DEUX sous-agents de solutions via ${subagentSpawnHint(driver, TRIAGE_PLUS_SOLUTIONS_SCOUT_AGENT_NAME)}, avec des angles`,
        "   DELIBERÉMENT distincts (ne leur dis pas ce que fait l'autre) :",
        "   - Scout A : approche conventionnelle / documentée / mainstream pour ce dépôt.",
        "   - Scout B : approche alternative (simplicité, performance, ou angle contrarian).",
        "   Chaque scout solutions renvoie : Recommendation, Evidence (fichiers cités), Trade-offs, Confidence.",
        "",
        "Une fois leurs retours reçus, rédige un verdict provisoire et les options retenues (style paris-research),",
        `puis lance UN vérificateur via ${subagentSpawnHint(driver, FEASIBILITY_VERIFIER_AGENT_NAME)} avec le ticket exact,`,
        "ton brouillon et les preuves sur lesquelles il repose. Tranche enfin toi-même : relis dans les fichiers chaque",
        "affirmation contestée, puis synthétise le verdict final et les options.",
        ...subagentDisciplineLines(driver),
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
    ...buildTicketLines(ticket, en, driver),
    "",
    ...mission,
    "",
    ...buildStrictRulesLines(en),
    "",
    ...buildResponseFormatLines(en, solutionsField),
    "",
    ...buildContractConstraintsLines(en, driver),
  ];

  return lines.filter((line) => line !== "").join("\n");
}
