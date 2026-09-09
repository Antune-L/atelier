import { CLEANER_BRANCH_SUFFIX, FEASIBILITY_SCOUT_AGENT_NAME, MAX_PARALLEL_IMPLEMENTERS, REVIEWER_BRANCH_SUFFIX } from "../../shared/constants.ts";
import type { CommitLanguage, ReviewDepth } from "../../shared/constants.ts";
import type { Ticket } from "../../shared/schemas.ts";
import { triageResultSchema } from "../../shared/schemas.ts";
import { extractFigmaUrls } from "../../shared/figma.ts";
import { hasMockups } from "../../shared/mockups.ts";
import type { ProjectConfig } from "../config.ts";
import { getProject, isProjectKey } from "../config.ts";
import type { Store } from "../db/store.ts";
import { resolveBaseBranch } from "./baseBranch.ts";

/** Max chars of each ticket's description injected into the feasibility list (keeps the prompt bounded). */
const FEASIBILITY_DESC_MAX = 1200;

/** Uppercase French label of the language the agent must write commits/PR/review text in. */
function commitLanguageLabel(language: CommitLanguage): string {
  return language === "fr" ? "FRANÇAIS" : "ANGLAIS";
}

/** Instruction line forcing the language of commit messages and PR title/description. */
function commitLanguageDirective(language: CommitLanguage): string {
  return `- Rédige les messages de commit et le titre/description de la PR en ${commitLanguageLabel(language)}.`;
}

/**
 * Builds the `implementing` step(s) of the contract. Five modes:
 * Codex implementation goes through backend-owned fresh-context child sessions
 * (`delegate_implementation` tool, resumed by one `implementation_done` event per lot); Composer
 * delegates code-writing to Cursor headless; a PRD-enabled Claude ticket delegates it to
 * fresh-context sub-agents (kept separate from the planning session, with the validated PRD as
 * their contract); otherwise Claude implements inline via those same sub-agents.
 *
 * Both delegated modes may split the work into up to MAX_PARALLEL_IMPLEMENTERS independent lots with
 * disjoint file scopes, launched in parallel in the same turn.
 */
function buildImplementingSteps(
  ticket: Ticket,
  opts: { composerScriptPath: string },
  prdPath: string,
): string[] {
  if (ticket.implementer === "codex") {
    const planSource = ticket.prdEnabled
      ? "le PRD validé tel quel"
      : "un plan concis et complet rédigé depuis la description du ticket";
    return [
      "2. implementing (délégué à une session Codex indépendante en arrière-plan) :",
      "   N'utilise JAMAIS le sous-agent natif `implementer` pour ce ticket : l'implémentation passe EXCLUSIVEMENT par le tool delegate_implementation.",
      ...(ticket.prdEnabled
        ? [`   a. Dès réception de l'événement prd_validated, écris le PRD validé tel quel dans ${prdPath} : c'est la source de vérité de l'implémentation.`]
        : []),
      `   ${ticket.prdEnabled ? "b" : "a"}. Décide d'ABORD du découpage. Si la fonctionnalité se découpe naturellement en lots indépendants à périmètres de fichiers DISJOINTS, appelle delegate_implementation une fois par lot DANS LE MÊME TOUR (${MAX_PARALLEL_IMPLEMENTERS} lots maximum, un \`label\` distinct par lot ; chaque \`plan\` énonce son périmètre de fichiers exact et les fichiers auxquels il ne doit PAS toucher). SINON, fais UN SEUL appel avec ${planSource} entier dans \`plan\`. Dans les deux cas le backend lance une session Codex par appel dans le worktree courant : elle écrit le code et ne commit JAMAIS.`,
      `   ${ticket.prdEnabled ? "c" : "b"}. TERMINE ton tour immédiatement après ces appels (ne boucle pas, ne surveille rien : l'attente est gérée par le backend). Tu recevras un événement implementation_done par lot.`,
      `   ${ticket.prdEnabled ? "d" : "c"}. À chaque implementation_done reçu : si \`remaining\` > 0, TERMINE de nouveau ton tour et attends les suivants (ne boucle pas, ne surveille rien). Quand tu reçois l'événement dont \`remaining\` vaut 0, tous les lots sont terminés : relis le diff produit (git diff), comble les manques toi-même si l'implémentation est partielle, puis enchaîne sur la review. Si un lot signale un échec, relance delegate_implementation UNE seule fois pour CE lot (même label) ; sinon implémente-le toi-même ou appelle fail().`,
    ];
  }
  if (ticket.implementer === "composer") {
    return [
      "2. implementing (délégué à Composer 2.5) :",
      `   a. Écris le plan à coder dans /tmp/composer-plan-${ticket.id}.md : ${
        ticket.prdEnabled
          ? "reprends le PRD validé tel quel."
          : "rédige un plan concis et complet depuis la description."
      } Le script attend un CHEMIN de fichier, donc le plan doit exister sur disque.`,
      "   b. Lance le script Composer EN ARRIÈRE-PLAN sur le worktree courant (il écrit le code dans le worktree et ne commit JAMAIS). Le run dure 10–25 min : démarre-le en tâche de fond, ne le lance pas en appel synchrone bloquant.",
      `      Script à invoquer : ${opts.composerScriptPath}, avec en premier argument le répertoire de travail courant, et en second le fichier de plan /tmp/composer-plan-${ticket.id}.md. Redirige stdout et stderr vers /tmp/composer-${ticket.id}.log, puis écris son code de retour dans /tmp/composer-${ticket.id}.rc une fois terminé — c'est ce fichier .rc que tu surveilleras (étape c).`,
      `   c. SURVEILLE SANS TERMINER TON TOUR : boucle avec \`sleep 60\` puis teste l'existence de /tmp/composer-${ticket.id}.rc. NE termine PAS ton tour tant que le fichier .rc n'existe pas (sinon le pipeline croit que tu es bloqué et t'escalade en stalled). Toutes les ~3 minutes pendant l'attente, appelle update_stage("implementing") comme heartbeat (sinon le watchdog te marquera inactif — le sleep ne le rafraîchit pas).`,
      "   d. Quand le .rc existe, lis le code de retour :",
      "      - 0 : relis le diff produit (git diff) et vérifie que le projet typecheck. Si l'implémentation est partielle (build cassé, fichiers orphelins) → fais UNE seule passe ciblée (réécris un gaps file listant les manques précis puis relance le script sur le même worktree) OU termine le câblage toi-même. Ne boucle JAMAIS Composer plus d'une passe.",
      "      - 3 ou 4 : Cursor absent ou non authentifié → appelle fail(\"Composer indisponible : binaire Cursor absent ou non authentifié\"). N'implémente PAS toi-même en silence.",
      "      - 5 : échec ou timeout de Composer → fail avec la raison.",
      "      - 6 : Composer n'a produit aucun changement (probable limite de contexte) → implémente toi-même OU fail.",
      "   e. Tu reprends la main pour la suite : c'est TOI (Claude) qui review, corrige, teste, commit, push et ouvre la PR. Composer n'a rien committé.",
    ];
  }
  if (ticket.prdEnabled) {
    return [
      "2. implementing (délégué au sous-agent `implementer`) :",
      `   a. Dès réception de l'événement prd_validated, écris le PRD validé tel quel dans ${prdPath} : c'est la source de vérité de l'implémentation et le chemin que tu transmettras au sous-agent.`,
      `   b. Décide d'ABORD du découpage, puis délègue l'implémentation au sous-agent \`implementer\` (outil Agent, \`subagent_type: implementer\`) : il écrit le code dans le worktree courant et ne commit JAMAIS ; toi (session principale) tu gardes la main sur git, review, tests et PR. Si le PRD se découpe naturellement en lots indépendants à périmètres de fichiers DISJOINTS, lance jusqu'à ${MAX_PARALLEL_IMPLEMENTERS} sous-agents \`implementer\` EN PARALLÈLE (plusieurs appels Agent dans le MÊME message), un par lot ; SINON fais UN SEUL appel couvrant toute la fonctionnalité.`,
      `      Dans le prompt de chaque sous-agent, transmets-lui : le chemin du PRD (${prdPath}) à lire et à garder en tête comme contrat à respecter de bout en bout, le worktree courant comme répertoire de travail, et son périmètre de fichiers exact ainsi que les fichiers auxquels il ne doit PAS toucher.`,
      "   c. Attends que TOUS les sous-agents aient rendu la main, puis relis leur diff (git diff), vérifie la cohérence avec le PRD et comble les manques toi-même si l'implémentation est partielle, puis enchaîne sur la review.",
    ];
  }
  return [
    "2. implementing (délégué au sous-agent `implementer`) :",
    `   a. Décide d'ABORD du découpage, puis délègue l'implémentation au sous-agent \`implementer\` (outil Agent, \`subagent_type: implementer\`) : il écrit le code dans le worktree courant et ne commit JAMAIS ; toi (session principale) tu gardes la main sur git, review, tests et PR. Si la fonctionnalité se découpe naturellement en lots indépendants à périmètres de fichiers DISJOINTS, lance jusqu'à ${MAX_PARALLEL_IMPLEMENTERS} sous-agents \`implementer\` EN PARALLÈLE (plusieurs appels Agent dans le MÊME message), un par lot ; SINON fais UN SEUL appel couvrant toute la fonctionnalité.`,
    "      Dans le prompt de chaque sous-agent, transmets-lui : le worktree courant comme répertoire de travail, son périmètre de fichiers exact et les fichiers auxquels il ne doit PAS toucher, et la consigne d'implémenter intégralement la part de la fonctionnalité décrite dans la description du ticket qui lui revient.",
    "   b. Attends que TOUS les sous-agents aient rendu la main, puis relis leur diff (git diff), comble les manques toi-même si l'implémentation est partielle, puis enchaîne sur la review.",
  ];
}

/** Step 1 label of the contract: a PRD planning phase or a direct jump to implementing. */
function buildPlanningStep(ticket: Ticket): string {
  if (ticket.prdEnabled) return "1. planning → submit_prd → (attente prd_validated)";
  return "1. implementing";
}

const LIGHT_REVIEW_KINDS = ["quality", "conventions", "regression", "logic"];
const FULL_REVIEW_KINDS = [...LIGHT_REVIEW_KINDS, "architecture", "security"];

function reviewKinds(depth: ReviewDepth): string[] {
  return depth === "full" ? FULL_REVIEW_KINDS : LIGHT_REVIEW_KINDS;
}

/** Recovery hint: the verdicts are persisted, so a lost `review_done` never justifies a re-run. */
const READ_REVIEW_RESULTS_HINT =
  "Les verdicts arrivent en événements `review_done`. Si l'un d'eux n'arrive pas (ou après un redémarrage de session), appelle `read_review_results()` pour relire les verdicts déjà persistés au lieu de relancer les reviewers.";

function reviewCalls(depth: ReviewDepth): string {
  return reviewKinds(depth).map((kind) => `\`delegate_review(kind="${kind}", context=...)\``).join(", ");
}

/**
 * Builds the reviewing/anti-regression/fixing steps. Both providers delegate to two backend-owned,
 * read-only sessions with fresh and mutually independent contexts.
 */
function buildReviewSteps(ticket: Ticket, opts: { isUi: boolean; figmaUrls: string[] }): string[] {
  const figmaLines = opts.isUi
    ? [
        "   + comparaison aux maquettes Figma référencées (récupère TOUJOURS la frame parente de chaque node-id) :",
        ...opts.figmaUrls.map((url) => `     - ${url}`),
      ]
    : [];
  const loopBudget = ticket.argusMultiLoop ? "Max 2 boucles" : "1 seule boucle de correction";
  const depth = ticket.reviewDepth ?? "light";
  const kinds = reviewKinds(depth);
  return [
    `3. reviewing : récupère le diff complet et appelle EN PARALLÈLE les ${kinds.length} reviewers indépendants : ${reviewCalls(depth)}. Passe à chacun la description/PRD et le diff utile, sans leur transmettre le raisonnement privé ni le résultat d'un autre. Termine ton tour et attends les ${kinds.length} événements \`review_done\`.`,
    ...figmaLines,
    `3a. ${READ_REVIEW_RESULTS_HINT}`,
    `3b. indépendance : chaque dimension a sa propre session backend en lecture seule. N'appelle jamais \`done()\` avant les ${kinds.length} verdicts \`approve\` sur le code courant ; un échec bloque la validation.`,
    `4. fixing : si un verdict vaut revise, corrige tous les findings pertinents puis relance les ${kinds.length} reviewers sur le nouveau diff. ${loopBudget}, sinon fail().`,
  ];
}

/** Step 5b (optional): mandatory end-to-end functional verification of the feature, before the PR. */
function buildVerifyStep(ticket: Ticket): string {
  const browserHint =
    ticket.orchestrator === "codex"
      ? "avec les outils MCP Playwright attachés à la session contre un serveur de dev lancé sur un port libre"
      : "pour un changement frontend, utilise le navigateur headless des outils MCP Playwright de la session (namespace `mcp__playwright` : browser_navigate, browser_snapshot, browser_click…) contre un serveur de dev lancé sur un port libre ; sinon exerce le code/CLI/endpoint concerné";
  return `5b. vérification fonctionnelle OBLIGATOIRE avant la PR : lance réellement l'app et vérifie de bout en bout que la fonctionnalité décrite marche (${browserHint}). Si elle ne marche pas, corrige puis re-vérifie ; si tu ne parviens pas à la faire marcher, appelle fail(). Ne passe JAMAIS à l'ouverture de la PR sans cette vérification réussie.`;
}

/** Step 5c (optional): mandatory visual diff against referenced mockups, before opening the PR. */
function buildMockupReviewStep(ticket: Ticket, verifyWithMockups: boolean): string {
  if (!verifyWithMockups) return "";
  return "5c. comparaison visuelle OBLIGATOIRE aux maquettes : compare le rendu réel aux maquettes fournies dans la description (liens Figma et/ou images). Utilise le skill `mockup-fidelity-review` (ou un subagent à contexte frais) pour juger la fidélité ; corrige les écarts visuels significatifs avant d'ouvrir la PR. C'est EN PLUS des reviews indépendantes.";
}

/**
 * Deferred-tools hint for Codex sessions. Some Codex accounts/versions don't inject MCP tools into
 * the static tool list: they sit behind `tool_search` (namespace `mcp__kanban`). Without this hint a
 * session concludes the protocol tools are missing and parks itself (seen live on an ask ticket).
 */
const CODEX_DEFERRED_TOOLS_HINT =
  "IMPORTANT : si les tools `kanban` n'apparaissent pas dans ta liste statique de tools, ils sont exposés en DIFFÉRÉ — retrouve-les via `tool_search` (namespace `mcp__kanban`, ex. requête « update_stage » ou « kanban ») puis appelle-les normalement. Ne conclus JAMAIS qu'ils sont indisponibles sans avoir fait cette recherche.";

/**
 * Framing line naming the agent driving the session, with the deferred-tools hint for Codex. Pass
 * `mission` for a specialized contract ("... dédiée <mission>."); omit it for the generic contract.
 */
function buildSpecializedFraming(isCodex: boolean, mission?: string): string {
  const dedicated = mission ? ` dédiée ${mission}` : "";
  const framing = `Tu es une session ${isCodex ? "Codex" : "Claude Code"} autonome${dedicated}. Tu DOIS piloter la carte via les tools du serveur MCP \`kanban\` :`;
  return isCodex ? `${framing}\n${CODEX_DEFERRED_TOOLS_HINT}` : framing;
}

/** Opening line of the "## Contrat de pipeline" section: names the agent driving the session. */
function buildSessionFramingLine(ticket: Ticket): string {
  return buildSpecializedFraming(ticket.orchestrator === "codex");
}

/** The `submit_prd` bullet keeps planning separate from the implementation child. */
function buildPrdBullet(ticket: Ticket): string {
  if (!ticket.prdEnabled) return "- (Option PRD désactivée : implémente directement.)";
  if (ticket.orchestrator === "codex") {
    return "- `submit_prd(markdown)` une fois le plan prêt, PUIS attends l'événement `prd_validated` avant de déléguer l'implémentation via `delegate_implementation` (ne l'implémente pas dans cette phase de planification).";
  }
  if (ticket.implementer === "codex") {
    return "- `submit_prd(markdown)` une fois le plan prêt, PUIS attends l'événement `prd_validated` avant de déléguer l'implémentation via le tool `delegate_implementation` (ne l'implémente pas dans cette session de planification).";
  }
  return "- `submit_prd(markdown)` une fois le plan prêt, PUIS attends l'événement `prd_validated` avant de déléguer l'implémentation à un sous-agent à contexte frais (ne l'implémente pas dans cette session de planification).";
}

/**
 * Builds the `ticket` channel payload: the full pipeline contract injected into
 * the session at startup. Describes the steps, the tools to call, and the bans.
 */
function buildFeasibilityContextSection(ticket: Ticket): string {
  if (
    !ticket.feasibilityContext ||
    ticket.triageStatus !== "done" ||
    ticket.triageVerdict !== "implementable" ||
    ticket.triageReport === null
  ) {
    return "";
  }
  let parsedReport: unknown;
  try {
    parsedReport = JSON.parse(ticket.triageReport);
  } catch {
    return "";
  }
  const result = triageResultSchema.safeParse(parsedReport);
  if (!result.success) return "";
  const { summary, files, reasons, questions } = result.data;
  const lines = [
    "## Contexte de faisabilité",
    "Une analyse de faisabilité a jugé ce ticket implémentable. Utilise ses constats pour cadrer ta solution et traiter le problème au mieux (ce n'est PAS une réécriture du ticket).",
    `- Synthèse : ${summary}`,
    files.length > 0 ? `- Fichiers identifiés comme pertinents : ${files.join(", ")}` : "",
    reasons.length > 0 ? `- Raisons : ${reasons.join(" ; ")}` : "",
    questions.length > 0 ? `- Questions : ${questions.join(" ; ")}` : "",
    "",
  ];
  return lines.filter((line) => line !== "").join("\n");
}

export function buildTicketContract(
  ticket: Ticket,
  opts: { composerScriptPath: string; commitLanguage: CommitLanguage; baseBranch: string },
): string {
  if (!isProjectKey(ticket.project)) {
    throw new Error(`Projet inconnu: ${ticket.project}`);
  }
  const project = getProject(ticket.project);
  const baseBranch = opts.baseBranch;
  const figmaUrls = extractFigmaUrls(ticket.description);
  const isUi = figmaUrls.length > 0;
  // A stealth ticket runs the full pipeline but opens NO PR: it commits + pushes the branch and
  // signals readiness via ready_for_review() so the user can test locally before any PR is created.
  const stealth = ticket.stealth;
  // A directPush ticket runs the full pipeline but pushes its commits DIRECTLY onto the base branch
  // (no PR), then signals via ready_for_review() so the slot is released and the card lands in "done".
  const directPush = ticket.directPush;
  // Both stealth and directPush open NO PR.
  const noPr = stealth || directPush;
  // A draft PR can't be auto-merged, so autoMerge always produces a ready PR.
  const prIsDraft = ticket.prDraft && !ticket.autoMerge;
  // Screenshots only make sense on a PR a human will read; auto-merge skips that.
  // NOTE(ali): `gh` can't upload images to GitHub's user-attachments CDN (that endpoint is
  // internal to the web editor's drag-and-drop, not in the REST API). The agent must host the
  // image elsewhere (commit it, release asset) before referencing it in the PR markdown.
  const wantsScreenshots = ticket.addScreenshots && !ticket.autoMerge && !noPr;
  const wantsVerify = ticket.verifyFeature;
  const verifyWithMockups = wantsVerify && hasMockups(ticket.description);
  const prCreateCmd = `${prIsDraft ? "gh pr create --draft" : "gh pr create"} --base ${baseBranch}`;
  const prdPath = `/tmp/prd-${ticket.id}.md`;
  const implementingSteps = buildImplementingSteps(ticket, opts, prdPath);

  // The completion directive, the finalisation step and the signalling step each have three variants
  // (directPush → stealth → standard PR). Resolved here as plain branches to avoid nested ternaries.
  let toolDirective: string;
  if (directPush) {
    toolDirective = `- \`ready_for_review()\` UNIQUEMENT après avoir commité proprement et poussé tes commits DIRECTEMENT sur la branche cible \`${baseBranch}\` (AUCUNE PR, AUCUN gh pr create).`;
  } else if (stealth) {
    toolDirective = "- `ready_for_review()` UNIQUEMENT après avoir commité proprement et poussé la branche (AUCUNE PR, AUCUN gh pr create).";
  } else {
    toolDirective = `- \`done(pr_url)\` UNIQUEMENT après avoir : commité proprement, poussé la branche, et ouvert une PR${prIsDraft ? " draft" : ""} via \`${prCreateCmd}\`.`;
  }

  let finalizationStep: string;
  if (directPush) {
    finalizationStep = `6. finalisation : commit (conventions du projet), puis pousse tes commits DIRECTEMENT sur la branche cible \`${baseBranch}\` : \`git push origin HEAD:refs/heads/${baseBranch}\`. N'ouvre AUCUNE PR. Si le push est rejeté (non-fast-forward parce que \`${baseBranch}\` a avancé), rebase sur \`origin/${baseBranch}\` puis re-pousse.`;
  } else if (stealth) {
    finalizationStep = "6. finalisation : commit (conventions du projet), puis pousse la branche (`git push -u origin HEAD`). N'ouvre AUCUNE PR (`gh pr create` est INTERDIT).";
  } else {
    finalizationStep = "6. opening_pr : commit (conventions du projet), push, puis ouvre la PR.";
  }

  let signalStep: string;
  if (directPush) {
    signalStep = `7. \`ready_for_review()\` — tes commits sont sur \`${baseBranch}\` ; le worktree sera fermé et la carte passera en « Fini » (aucune PR).`;
  } else if (stealth) {
    signalStep = "7. `ready_for_review()` — le worktree restera disponible pour que l'utilisateur teste ; la PR sera créée plus tard par l'utilisateur.";
  } else {
    signalStep = "7. done(pr_url).";
  }

  const lines: string[] = [
    `# Ticket ${ticket.id} — ${ticket.title}`,
    "",
    `Projet : ${project.label} (branche de base et cible : ${baseBranch})`,
    isUi ? "Type : ticket UI (maquettes Figma référencées dans la description, comparaison requise)" : "",
    "",
    "## Description",
    ticket.description || "(vide)",
    "La description peut référencer des chemins d'images locaux absolus (ex. /Users/.../uploads/xxx.png) que tu peux lire avec l'outil Read.",
    ticket.orchestrator === "claude"
      ? "Si la description référence un lien slack.com, consulte le thread via les outils MCP Slack de LECTURE (namespace `mcp__claude_ai_Slack` : slack_read_thread, slack_read_channel… — différés, charge-les via ToolSearch). Aucun envoi de message Slack n'est possible ni autorisé."
      : "Pour un lien Slack ou Figma, utilise uniquement un outil de lecture réellement exposé à cette session Codex. Si une source obligatoire est inaccessible, appelle ask_user au lieu d'inventer son contenu.",
    "",
    buildFeasibilityContextSection(ticket),
    "## Contrat de pipeline",
    buildSessionFramingLine(ticket),
    "- `update_stage(stage)` à chaque transition d'étape.",
    "- `ask_user(question)` dès qu'une décision te dépasse (ne devine jamais une exigence critique).",
    buildPrdBullet(ticket),
    toolDirective,
    "- `fail(reason, findings)` si tu es bloqué après avoir épuisé tes options.",
    commitLanguageDirective(opts.commitLanguage),
    "",
    "## Événements de channel",
    "Tu peux recevoir à tout moment un événement `user_comment` : une instruction/orientation de l'utilisateur à prendre en compte dans le travail en cours (ce n'est PAS une réponse à une question `ask_user`).",
    ticket.prdEnabled
      ? "Pendant l'attente de `prd_validated`, un `user_comment` contenant des retours sur le PRD (souvent des annotations citant des passages) signifie que le PRD doit être corrigé : révise-le en conséquence puis appelle de nouveau `submit_prd` avec la version corrigée. N'implémente qu'après `prd_validated` (dont le champ note peut porter des retours mineurs à appliquer pendant l'implémentation)."
      : "",
    "",
    "## Étapes",
    buildPlanningStep(ticket),
    ...implementingSteps,
    ...buildReviewSteps(ticket, { isUi, figmaUrls }),
    [
      "5. testing : exécute typecheck, lint et tests du projet. Rouge après correction → fail().",
      `   Note serveur/DB : si tu dois lancer un serveur pour les tests, utilise un port libre (pas le port par défaut de l'app — trouve-en un avec \`lsof\`/\`ss\` ou laisse l'OS en assigner un) et une base de données isolée et vierge (ex. \`/tmp/test-${ticket.id}.db\` — jamais \`kanban.db\` ni \`kanban-real.db\`). Si le schéma DB a changé, initialise/migre la DB de test avant de lancer les tests.`,
    ].join("\n"),
    wantsVerify ? buildVerifyStep(ticket) : "",
    buildMockupReviewStep(ticket, verifyWithMockups),
    finalizationStep,
    noPr
      ? ""
      : `   Si la branche cible \`${baseBranch}\` n'existe pas encore sur origin, crée-la d'abord : \`git ls-remote --heads origin ${baseBranch} | grep -q . || git push origin HEAD:refs/heads/${baseBranch}\``,
    noPr ? "" : `   Ensuite : \`${prCreateCmd}\` vers ${baseBranch}.`,
    wantsScreenshots
      ? "   + captures d'écran : si ce ticket touche le frontend, capture la fonctionnalité via Playwright (lance l'app, navigue jusqu'à l'écran concerné, prends les screenshots) et inclus ces images dans la description de la PR (téléverse-les puis intègre-les en markdown `![légende](url)`). Si le diff ne touche pas le frontend, ignore cette consigne."
      : "",
    signalStep,
    !noPr && ticket.autoMerge
      ? `Note : la PR ne doit PAS être en draft — une fois \`done()\` validé, le système la mergera automatiquement dans ${baseBranch}.`
      : "",
    "",
    "## Interdits",
    "- N'utilise JAMAIS `git push --no-verify` ni de flag contournant les hooks.",
    "- Ne touche à aucun fichier hors du worktree.",
    "- Lis les fichiers `AGENTS.md` applicables avant d'agir. Si une règle nécessaire n'y figure pas, consulte aussi le `CLAUDE.md` applicable comme compatibilité, sans importer ses permissions ni secrets.",
    project.instructions ? `- Consigne projet : ${project.instructions}` : "",
  ];

  return lines.filter((line) => line !== "").join("\n");
}

/**
 * Builds the `ticket` channel payload for an auto-merge conflict-resolution session: the worktree is
 * already checked out on the EXISTING PR branch (its commits), and the goal is to make the PR merge
 * cleanly again, then re-trigger the auto-merge via done(). No new PR is created.
 */
export function buildConflictResolutionContract(ticket: Ticket, opts: { commitLanguage: CommitLanguage }): string {
  if (!isProjectKey(ticket.project)) {
    throw new Error(`Projet inconnu: ${ticket.project}`);
  }
  const project = getProject(ticket.project);
  const baseBranch = ticket.baseBranch ?? project.baseBranch;

  const lines: string[] = [
    `# Résolution de conflits de merge — Ticket ${ticket.id} — ${ticket.title}`,
    "",
    `Projet : ${project.label} (branche de base et cible : ${baseBranch})`,
    `PR : ${ticket.prUrl}`,
    `Branche de la PR : ${ticket.branch}`,
    "",
    "## Contexte",
    `Cette PR a été ouverte puis le merge automatique dans \`${baseBranch}\` a échoué (conflits ou branche en retard sur la base).`,
    "Motif rapporté par le système :",
    ticket.error ? `> ${ticket.error}` : "> (non précisé)",
    "Le worktree courant est déjà sur la branche de la PR (avec ses commits). Ton objectif : rendre la PR mergeable, puis relancer le merge.",
    "",
    "## Contrat de pipeline",
    buildSpecializedFraming(ticket.orchestrator === "codex", "à la résolution de conflits"),
    "- `update_stage(stage)` à chaque transition d'étape.",
    "- `ask_user(question)` si une décision te dépasse (conflit sémantique ambigu : ne devine pas une intention critique).",
    "- `done(pr_url)` UNIQUEMENT après avoir poussé une branche qui se merge proprement (passe la MÊME URL de PR, ne crée PAS de nouvelle PR).",
    "- `fail(reason, findings)` si les conflits ne sont pas résolvables sans arbitrage.",
    commitLanguageDirective(opts.commitLanguage),
    "",
    "## Événements de channel",
    "Tu peux recevoir à tout moment un événement `user_comment` : une instruction/orientation de l'utilisateur à prendre en compte.",
    "",
    "## Étapes",
    '1. `update_stage("implementing")`.',
    `2. \`git fetch origin ${baseBranch}\` puis rebase la branche courante sur la base : \`git rebase origin/${baseBranch}\`.`,
    "   Résous TOUS les conflits en préservant l'intention des DEUX côtés (lis le code concerné, ne supprime aucune fonctionnalité pour faire taire un conflit), puis `git add` et `git rebase --continue` jusqu'à la fin du rebase.",
    `3. \`update_stage("reviewing")\` : sur le diff de résolution, lance EN PARALLÈLE les 4 reviewers ${reviewCalls("light")}. Attends 4 verdicts approve sur le code courant ; corrige et relance les 4 sinon. Un échec bloque \`done()\`.`,
    `   ${READ_REVIEW_RESULTS_HINT}`,
    '4. `update_stage("testing")` : exécute typecheck, lint et tests du projet. Rouge → corrige (commits additionnels) ; si tu ne peux pas rétablir le vert, `fail()`.',
    `5. \`update_stage("opening_pr")\` : pousse la branche réécrite par le rebase avec \`git push --force-with-lease\` (jamais \`--no-verify\`).`,
    `6. \`done(${ticket.prUrl})\` — le système re-tentera automatiquement le merge dans \`${baseBranch}\`.`,
    "",
    "## Interdits",
    "- N'utilise JAMAIS `git push --no-verify` ni de flag contournant les hooks.",
    "- Ne ferme pas, ne recrée pas et ne mets pas la PR en draft.",
    "- Ne touche à aucun fichier hors du worktree.",
    project.instructions ? `- Consigne projet : ${project.instructions}` : "",
  ];

  return lines.filter((line) => line !== "").join("\n");
}

function truncateDescription(description: string): string {
  const flat = description.replace(/\s+/g, " ").trim();
  if (flat.length <= FEASIBILITY_DESC_MAX) return flat || "(vide)";
  return `${flat.slice(0, FEASIBILITY_DESC_MAX - 1)}…`;
}

/**
 * Builds the `ticket` channel payload for a batch feasibility session: ONE read-only orchestrator on
 * the real repo fans out one fresh-context sub-agent per imported ticket (Read/Glob/Grep only),
 * aggregates the verdicts, and submits them all at once via the `submit_feasibility` worker tool.
 * Non-readable attachments (e.g. Trello links) are flagged in `questions` with an explicit prefix.
 */
export function buildFeasibilityBatchContract(
  tickets: Ticket[],
  project: ProjectConfig,
  store: Store,
  driver: "claude" | "codex" = "claude",
): string {
  const ticketList = tickets.map((ticket) => {
    const resolvedBase = resolveBaseBranch(ticket, project, store);
    const baseAnnotation =
      resolvedBase === project.baseBranch ? "" : ` (branche de base : ${resolvedBase})`;
    return `- [${ticket.id}] ${ticket.title}${baseAnnotation} :: ${truncateDescription(ticket.description)}`;
  });

  const lines: string[] = [
    `# Analyse de faisabilité en lot — ${tickets.length} ticket(s)`,
    "",
    `Projet : ${project.label} (branche de base : ${project.baseBranch})`,
    "",
    "Tu es une session orchestratrice de faisabilité en LECTURE SEULE sur le dépôt réel (pas de worktree).",
    driver === "claude"
      ? "Seuls Read, Glob, Grep, les outils MCP Figma de lecture et Task (sous-agents) sont disponibles ;"
      : "Seuls les outils de lecture exposés à Codex et les sous-agents bornés sont disponibles ;",
    "Edit/Write/Bash sont inappelables.",
    "Ne modifie JAMAIS le dépôt.",
    "",
    "## Tickets à évaluer",
    ...ticketList,
    "Les descriptions peuvent référencer des chemins d'images locaux absolus (Read possible) et des liens externes.",
    ...(driver === "claude"
      ? [
          "Les liens figma.com sont consultables via les outils MCP Figma de lecture",
          "(get_screenshot, get_design_context — namespace `mcp__plugin_figma_figma`).",
        ]
      : [
          "Sous Codex, ne prétends consulter un lien figma.com que si un outil Figma de lecture est réellement exposé.",
          "Sinon, ajoute ce lien aux questions avec le préfixe `Lien non consultable:`.",
        ]),
    "",
    "## Ta mission",
    `Pour CHACUN des tickets ci-dessus, lance EXACTEMENT UN sous-agent natif à contexte frais avec`,
    `\`subagent_type: "${FEASIBILITY_SCOUT_AGENT_NAME}"\` (sous-agent en lecture seule, sans Task ni Bash : il ne`,
    "peut pas relancer d'autre sous-agent). Chaque sous-agent décide si SON ticket est implémentable EXACTEMENT",
    "tel qu'il est écrit contre CE dépôt, sans le reformuler. Lance-les EN PARALLÈLE (fan-out, un seul par ticket).",
    "N'imbrique JAMAIS les sous-agents : un sous-agent ne doit jamais en lancer un autre.",
    "",
    "Chaque sous-agent renvoie pour son ticket :",
    "- `verdict` : `implementable` | `needs_info` | `needs_rework`",
    "- `summary` : 2-3 phrases",
    "- `reasons` : raisons (obligatoire si `needs_rework`)",
    "- `questions` : questions (obligatoire si `needs_info`)",
    "- `files` : chemins réellement lus qui fondent l'analyse",
    "- `suggestedModel` / `suggestedEffort` : UNIQUEMENT si `implementable`, sinon `null`",
    "- `suggestedOrchestrator` et, pour GPT, `suggestedCodexModel` / `suggestedCodexEffort` : configuration réellement recommandée ; champs de l'autre moteur à `null`",
    "",
    "## Liens / pièces jointes non consultables",
    "Si une description référence une pièce jointe ou un lien que tu ne peux pas consulter (ex. lien Trello,",
    "image absente), ajoute-le dans `questions` du ticket concerné avec le préfixe exact `Lien non consultable: <url>`.",
    "Un lien figma.com va dans `questions` si aucun outil Figma de lecture n'est exposé ou si son appel échoue.",
    "",
    "## Règles strictes (reprises du triage)",
    "- N'invente rien.",
    "- Ne suppose rien : si une information manque, c'est une question, pas une hypothèse.",
    "- Ne propose pas de réécrire le ticket.",
    "- Fonde chaque affirmation sur du code réellement lu (cite les chemins de fichiers).",
    "- Lis les AGENTS.md applicables ; si une règle nécessaire manque, consulte le CLAUDE.md applicable comme compatibilité, sans importer ses permissions ni secrets.",
    "",
    "## Format de réponse",
    "Une fois TOUS les sous-agents terminés, agrège leurs verdicts et appelle UNE SEULE FOIS le tool",
    "`submit_feasibility` (serveur MCP `kanban`) avec `{ results: [{ ticketId, verdict, summary, reasons, questions, files, suggestedOrchestrator, suggestedModel, suggestedEffort, suggestedCodexModel, suggestedCodexEffort }] }`,",
    "un objet par ticket (reprends le `ticketId` exact entre crochets ci-dessus). Ne termine pas ton tour avant",
    "d'avoir appelé `submit_feasibility` ou `fail`. N'écris pas les verdicts en texte : seul l'appel au tool compte.",
  ];

  return lines.filter((line) => line !== "").join("\n");
}

/**
 * A review ticket that also fixes the reviewer comments: it implements code on the PR head branch,
 * so it is NOT the read-only argus review. Guarded on prHeadBranch too because slotManager only
 * checks out the PR head branch (worktreeAddExisting) and the done gate only requires a push when
 * prHeadBranch is non-null — keeping contract, worktree, gate and session guards from diverging.
 */
export function isReviewFixSession(ticket: Ticket): boolean {
  return ticket.kind === "review" && ticket.fixComments && ticket.prHeadBranch !== null;
}

/**
 * Builds the `ticket` channel payload for an independent review of an open PR, optionally posting
 * findings inline via gh, then done().
 */
export function buildReviewContract(ticket: Ticket, opts: { commitLanguage: CommitLanguage }): string {
  if (!isProjectKey(ticket.project)) {
    throw new Error(`Projet inconnu: ${ticket.project}`);
  }
  const project = getProject(ticket.project);
  const depth = ticket.reviewDepth ?? "light";
  const branch = ticket.prHeadBranch ?? "";
  // Review against the PR's own detected target branch (or the user's override), not the project default.
  const reviewBase = ticket.baseBranch ?? project.baseBranch;

  if (isReviewFixSession(ticket)) {
    return buildReviewFixLines(ticket, opts, { project, depth, branch, reviewBase });
  }

  const isCodex = ticket.orchestrator === "codex";
  const reviewDimensions =
    depth === "full"
      ? "qualité, architecture, régressions, sécurité, conventions du dépôt, logique/correctness"
      : "qualité, conventions du dépôt, régressions, logique/correctness";
  const kinds = reviewKinds(depth);
  const independentReviewSteps = [
    `2. Récupère le diff complet de la PR : \`gh pr diff ${ticket.prNumber}\`. Le backend positionne le worktree sur le head GitHub exact avant la nouvelle passe ; ne lance aucun fetch toi-même.`,
    `   Lance EN PARALLÈLE les ${kinds.length} dimensions indépendantes : ${reviewCalls(depth)}. Donne à chacun la PR, la profondeur, les dimensions (${reviewDimensions}) et le diff, sans le résultat ni le raisonnement d'un autre. Termine ton tour et attends les ${kinds.length} événements \`review_done\`.`,
    `   ${READ_REVIEW_RESULTS_HINT}`,
    `   Un reviewer ou sa contre-vérification échoués bloquent done(). Un verdict revise est une conclusion valide de cette revue en lecture seule : conserve les corrections recommandées dans le rapport puis termine normalement. Les ${kinds.length} dimensions doivent rendre un résultat vérifié sur le même passId et le code courant.`,
    ticket.postComments
      ? "3. Appelle `publish_review({ passId })` avec le passId commun reçu dans les événements. Le backend compose et publie une seule review GitHub liée au commit revu : REQUEST_CHANGES si un finding critical ou major est retenu, COMMENT s'il ne reste que des findings minor, APPROVE si tous les findings ont été rejetés (ou auto-réfutés) ou si tous les reviewers approuvent. Ne poste aucun commentaire GitHub directement. Si la PR a avancé, lance une nouvelle passe complète avec tous les reviewers avant de rappeler publish_review."
      : "3. N'en poste RIEN sur GitHub : synthétise le verdict (findings par sévérité) dans ta réponse.",
  ];

  const lines: string[] = [
    `# Revue de PR #${ticket.prNumber} — ${ticket.title}`,
    "",
    `Projet : ${project.label} (branche de base : ${reviewBase})`,
    `PR : ${ticket.prUrl}`,
    `Branche de la PR : ${branch}`,
    ticket.prHeadBranch !== null
      ? `Le worktree est déjà checkout sur le commit de la PR (branche locale \`${branch}${REVIEWER_BRANCH_SUFFIX}\`, jamais pushée) : lire/grepper les fichiers du worktree reflète l'état de la PR, pas de la base.`
      : "",
    `Profondeur : ${depth === "full" ? "complète (full)" : "light"}`,
    `Poster les commentaires sur GitHub : ${ticket.postComments ? "OUI" : "NON"}`,
    "",
    "## Contrat de pipeline",
    buildSpecializedFraming(isCodex, "à la REVUE d'une PR (lecture seule)"),
    "- `update_stage(stage)` à chaque transition d'étape.",
    "- `ask_user(question)` si une décision te dépasse (ex. PR introuvable ou ambiguë).",
    ticket.postComments ? "- `publish_review({ passId })` UNIQUEMENT après réception de tous les résultats requis de la passe courante." : "",
    "- `done(pr_url)` UNIQUEMENT une fois la revue terminée (et postée si demandé).",
    "- `fail(reason, findings)` si tu es bloqué après avoir épuisé tes options.",
    `- Rédige les commentaires de revue postés sur la PR en ${commitLanguageLabel(opts.commitLanguage)}.`,
    "",
    "## Événements de channel",
    "Tu peux recevoir à tout moment un événement `user_comment` : une instruction/orientation de l'utilisateur à prendre en compte dans la revue en cours.",
    "",
    "## Étapes",
    '1. `update_stage("reviewing")`.',
    "   Préparation bornée : lis une seule fois les sections utiles des skills/instructions. Dès que le diff, le head et le contexte sont collectés, lance les reviewers ; laisse chaque reviewer approfondir sa dimension au lieu de relire toutes les références dans l'orchestrateur.",
    "   Pour les commandes complexes, évite les couches de quoting imbriquées : préfère plusieurs commandes courtes sans écrire de fichier.",
    ...independentReviewSteps,
    `4. \`done(${ticket.prUrl})\` une fois la revue (et le postage le cas échéant) terminée.`,
    "",
    "## Interdits",
    "- Ne modifie AUCUN fichier : la revue est en lecture seule, cette session ne produit pas de diff.",
    "- Ne lance aucun typecheck (`tsc`, script typecheck ou équivalent) : une review analyse le diff et les types sans payer ce coût d'exécution.",
    "- N'appelle aucune commande GitHub qui modifie la PR ; la publication COMMENT appartient exclusivement au backend via publish_review.",
    "- N'utilise JAMAIS `git push --no-verify` ni de flag contournant les hooks.",
    "- Ne touche à aucun fichier hors du worktree.",
    "- Lis les fichiers `AGENTS.md` applicables avant d'agir. Si une règle projet nécessaire n'y figure pas, consulte aussi le `CLAUDE.md` applicable comme source de compatibilité ; n'importe aucune permission ni secret depuis les réglages Claude.",
    project.instructions ? `- Consigne projet : ${project.instructions}` : "",
  ];

  return lines.filter((line) => line !== "").join("\n");
}

/**
 * Fix-mode review contract: the worktree is already checked out on the PR head branch. The session
 * runs the independent reviews required by the selected depth, applies relevant corrections, then tests, commits and pushes the
 * fixes onto the same branch without opening a new PR.
 */
function buildReviewFixLines(
  ticket: Ticket,
  opts: { commitLanguage: CommitLanguage },
  ctx: { project: ReturnType<typeof getProject>; depth: ReviewDepth; branch: string; reviewBase: string },
): string {
  const { project, depth, branch, reviewBase } = ctx;
  const isCodex = ticket.orchestrator === "codex";
  const reviewDimensions =
    depth === "full"
      ? "qualité, architecture, régressions, sécurité, conventions du dépôt, logique/correctness"
      : "qualité, conventions du dépôt, régressions, logique/correctness";
  const kinds = reviewKinds(depth);

  const reviewAndFixSteps = [
    `2. Récupère le diff complet de la PR (\`gh pr diff ${ticket.prNumber}\`) puis lance EN PARALLÈLE les ${kinds.length} sessions indépendantes : ${reviewCalls(depth)}. Transmets la profondeur ${depth}, les dimensions (${reviewDimensions}) et le diff à chacune, sans résultat ni raisonnement d'une autre. Termine ton tour et attends leurs événements \`review_done\`.`,
    `   ${READ_REVIEW_RESULTS_HINT}`,
    `3. \`update_stage("fixing")\` : si un reviewer demande revise, applique uniquement les corrections pertinentes. Ne relance pas les reviewers avant d'avoir testé, commité et poussé ces corrections.`,
  ];

  const lines: string[] = [
    `# Revue + correction de PR #${ticket.prNumber} — ${ticket.title}`,
    "",
    `Projet : ${project.label} (branche de base : ${reviewBase})`,
    `PR : ${ticket.prUrl}`,
    `Branche de la PR : ${branch}`,
    `Profondeur : ${depth === "full" ? "complète (full)" : "light"}`,
    "",
    "## Contexte",
    `Le worktree courant est DÉJÀ positionné sur la branche head de la PR (\`${branch}\`). Tu vas reviewer la PR, corriger les retours, puis commiter et pousser sur CETTE MÊME branche (aucune nouvelle PR).`,
    "",
    "## Contrat de pipeline",
    buildSpecializedFraming(isCodex, "à la REVUE puis la CORRECTION d'une PR"),
    "- `update_stage(stage)` à chaque transition d'étape.",
    "- `ask_user(question)` si une décision te dépasse (ex. retour ambigu, arbitrage de périmètre).",
    `- \`done(pr_url)\` UNIQUEMENT après les ${kinds.length} reviews indépendantes approuvées sur le code courant, les corrections appliquées, commitées, et la branche poussée (passe la MÊME URL de PR, ne crée PAS de nouvelle PR).`,
    ticket.postComments ? "- `publish_review({ passId })` après le commit et le push, avec le passId approuvé courant." : "",
    "- `fail(reason, findings)` si tu es bloqué après avoir épuisé tes options.",
    `- Rédige les messages de commit et les commentaires de revue en ${commitLanguageLabel(opts.commitLanguage)}.`,
    "",
    "## Événements de channel",
    "Tu peux recevoir à tout moment un événement `user_comment` : une instruction/orientation de l'utilisateur à prendre en compte dans le travail en cours.",
    "",
    "## Étapes",
    '1. `update_stage("reviewing")`.',
    ...reviewAndFixSteps,
    '4. `update_stage("testing")` : exécute typecheck, lint et tests du projet. Rouge après correction → `fail()`.',
    '5. `update_stage("opening_pr")` : commit (conventions du projet), puis `git push` la branche head de la PR (jamais `--no-verify`, aucune nouvelle PR).',
    `6. Si la passe précédente n'était pas approuvée ou si le code a changé, relance les ${kinds.length} reviewers sur le commit propre et poussé jusqu'à ${kinds.length} verdicts approve. Un échec bloque done().`,
    ticket.postComments
      ? "7. Appelle `publish_review({ passId })`. Si le head GitHub a changé, lance une nouvelle passe complète avant toute publication."
      : "",
    `${ticket.postComments ? "8" : "7"}. \`done(${ticket.prUrl})\`.`,
    "",
    "## Interdits",
    "- N'utilise JAMAIS `git push --no-verify` ni de flag contournant les hooks.",
    "- Ne ferme pas, ne recrée pas, ne mets pas la PR en draft, et ne crée PAS de nouvelle PR.",
    "- Ne touche à aucun fichier hors du worktree.",
    project.instructions ? `- Consigne projet : ${project.instructions}` : "",
  ];

  return lines.filter((line) => line !== "").join("\n");
}

/**
 * Builds the `ticket` channel payload for a clean ticket: the worktree is checked out on a dedicated
 * local branch (PR head + `-cleaner` suffix) carrying the PR's commits. The session triages the PR's
 * reviewer feedback via the minos-pr-feedback skill, applies ONLY the pertinent fixes respecting the PR
 * context, then commits and pushes to the SAME PR head branch (HEAD:<prHeadBranch>) — no new PR, no
 * posted comments. It collapses (minimizes) the reviewer comments it actually addressed.
 */
export function buildCleanContract(ticket: Ticket, opts: { commitLanguage: CommitLanguage }): string {
  if (!isProjectKey(ticket.project)) {
    throw new Error(`Projet inconnu: ${ticket.project}`);
  }
  const project = getProject(ticket.project);
  const branch = ticket.prHeadBranch ?? "";
  const localBranch = branch ? `${branch}${CLEANER_BRANCH_SUFFIX}` : "";
  const isCodex = ticket.orchestrator === "codex";

  // Codex has no minos-pr-feedback skill: it fetches and triages the reviewer threads itself via gh.
  const codexTriageStep = `2. \`update_stage("fixing")\` puis : récupère TOUS les fils de retours de la PR #${ticket.prNumber} via \`gh\` — commentaires inline (\`gh api /repos/{owner}/{repo}/pulls/${ticket.prNumber}/comments\`), reviews (\`gh pr view ${ticket.prUrl} --json reviews\`) et commentaires de conversation (\`gh api /repos/{owner}/{repo}/issues/${ticket.prNumber}/comments\`). Trie-les par pertinence et n'applique QUE les corrections pertinentes qui respectent le contexte de la PR ci-dessus ; écarte les nits et ignore les fils résolus/obsolètes. Si rien n'est pertinent, n'applique rien.`;
  const claudeTriageStep = `2. \`update_stage("fixing")\` puis : lance le skill **minos-pr-feedback** sur la PR #${ticket.prNumber} (branche \`${branch}\`). Il récupère tous les fils de commentaires (inline, résumés de review, conversation), les trie par pertinence, et n'applique QUE les corrections pertinentes qui respectent le contexte de la PR ci-dessus ; il écarte les nits et ignore les fils résolus/obsolètes. Si rien n'est pertinent, n'applique rien.`;

  const lines: string[] = [
    `# Nettoyage des retours de PR #${ticket.prNumber} — ${ticket.title}`,
    "",
    `Projet : ${project.label} (branche de base : ${project.baseBranch})`,
    `PR : ${ticket.prUrl}`,
    `Branche de la PR : ${branch}`,
    "",
    "## Contexte de la PR",
    ticket.description || "(vide)",
    "",
    "Tu ne dois appliquer QUE les retours qui respectent ce contexte : un retour hors-périmètre, qui élargit ou détourne l'intention de la PR ci-dessus, doit être ignoré.",
    "",
    "## Contrat de pipeline",
    `Tu es une session ${isCodex ? "Codex" : "Claude Code"} autonome dédiée au TRI puis à l'APPLICATION des retours de review d'une PR. Le worktree courant est sur une branche locale dédiée \`` + localBranch + "` qui porte les commits de la PR (partie de la head de la PR `" + branch + "`). Tu commites tes corrections sur cette branche locale et les pousses vers la head de la PR `" + branch + "` pour mettre à jour la MÊME PR — ce nom local volontairement différent de la head de la PR est attendu. Tu DOIS piloter la carte via les tools du serveur MCP `kanban` :",
    isCodex ? CODEX_DEFERRED_TOOLS_HINT : "",
    "- `update_stage(stage)` à chaque transition d'étape.",
    "- `ask_user(question)` si une décision est ambiguë (ex. retour au périmètre incertain).",
    "- `done(pr_url)` UNIQUEMENT après avoir appliqué les corrections pertinentes (ou déterminé qu'aucune ne l'est), commité et poussé via `git push origin HEAD:" + branch + "` (passe la MÊME URL de PR, ne crée JAMAIS de nouvelle PR).",
    "- `fail(reason, findings)` si tu es bloqué après avoir épuisé tes options.",
    commitLanguageDirective(opts.commitLanguage),
    "",
    "## Événements de channel",
    "Tu peux recevoir à tout moment un événement `user_comment` : une instruction/orientation de l'utilisateur à prendre en compte dans le travail en cours.",
    "",
    "## Étapes",
    '1. `update_stage("implementing")`.',
    isCodex ? codexTriageStep : claudeTriageStep,
    `3. \`update_stage("reviewing")\` : récupère le diff courant puis lance EN PARALLÈLE les 4 reviewers ${reviewCalls("light")}. Attends 4 événements \`review_done\` avec verdict approve sur le code courant ; corrige et relance les 4 si nécessaire. Un échec bloque \`done()\`.`,
    `   ${READ_REVIEW_RESULTS_HINT}`,
    '4. `update_stage("testing")` : exécute typecheck, lint et tests du projet. Rouge après correction → `fail()`.',
    `5. \`update_stage("opening_pr")\` : commit (conventions du projet), puis pousse vers la head de la PR avec \`git push origin HEAD:${branch}\` (jamais \`--no-verify\`, aucune nouvelle PR ; le nom de branche locale diffère volontairement de la head de la PR). Si aucune correction n'a été appliquée, saute le commit/push.`,
    `6. Replie (minimise) chaque commentaire de reviewer RÉELLEMENT traité (l'ensemble \`apply\` : retours pertinents que tu as adressés), PAS les nits écartés ni les retours hors-périmètre. Cela vaut que du code ait été poussé ou non — un retour peut être adressé par une correction appliquée. Récupère le \`node_id\` de chaque commentaire traité : les commentaires inline via \`gh api /repos/{owner}/{repo}/pulls/${ticket.prNumber}/comments\` (champ \`node_id\`), les commentaires de conversation top-level via \`gh api /repos/{owner}/{repo}/issues/${ticket.prNumber}/comments\` (champ \`node_id\`). Pour chacun, replie-le avec la mutation GraphQL \`minimizeComment\` (\`classifier: RESOLVED\`, \`subjectId\` = le \`node_id\`), ex. : \`gh api graphql -f query='mutation($id:ID!){minimizeComment(input:{subjectId:$id,classifier:RESOLVED}){minimizedComment{isMinimized}}}' -f id=<node_id>\`. Si aucun commentaire n'a été traité, ne replie rien.`,
    `7. \`done(${ticket.prUrl})\`.`,
    "",
    "## Interdits",
    "- N'utilise JAMAIS `git push --no-verify` ni de flag contournant les hooks.",
    "- Ne ferme pas, ne recrée pas, ne mets pas la PR en draft, et ne crée PAS de nouvelle PR.",
    "- Ne poste AUCUN nouveau commentaire/réponse sur la PR (c'est argus --post, hors périmètre). Seul le repli (minimisation) des commentaires que tu as traités est autorisé : c'est la SEULE mutation de commentaire de PR permise.",
    "- Ne touche à aucun fichier hors du worktree.",
    project.instructions ? `- Consigne projet : ${project.instructions}` : "",
  ];

  return lines.filter((line) => line !== "").join("\n");
}

/**
 * Builds the `ticket` channel payload for an ask ticket: a read-only session that explores the
 * project to answer a question, then surfaces the answer via submit_answer. No diff, commit or PR.
 */
export function buildAskContract(ticket: Ticket): string {
  if (!isProjectKey(ticket.project)) {
    throw new Error(`Projet inconnu: ${ticket.project}`);
  }
  const project = getProject(ticket.project);
  const isCodex = ticket.orchestrator === "codex";

  const lines: string[] = [
    `# Question ${ticket.id} — ${ticket.title}`,
    "",
    `Projet : ${project.label} (worktree en LECTURE SEULE sur ${ticket.baseBranch ?? project.baseBranch})`,
    "",
    "## Question",
    ticket.description || "(vide)",
    `La question peut référencer des chemins d'images locaux absolus (ex. /Users/.../uploads/xxx.png) que tu peux lire${isCodex ? "" : " avec l'outil Read"}.`,
    "",
    "## Contrat de pipeline",
    buildSpecializedFraming(isCodex, `à RÉPONDRE à une question (lecture seule${isCodex ? ", sandbox en lecture seule" : ""}, aucune modification)`),
    '- `update_stage("implementing")` dès le début (accuse réception du contrat et signale l\'activité).',
    "- `ask_user(question)` UNIQUEMENT si la question est ambiguë au point de t'empêcher de répondre (ne devine pas une intention critique).",
    "- `submit_answer(answer)` avec ta réponse complète en markdown une fois ton analyse terminée. Ceci clôt le ticket.",
    "- `fail(reason, findings)` si tu ne peux pas répondre après avoir épuisé tes options.",
    "- Réponds dans la même langue que la question.",
    "",
    "## Événements de channel",
    "Tu peux recevoir à tout moment un événement `user_comment` : une précision ou réorientation de l'utilisateur à prendre en compte dans ta réponse en cours.",
    "",
    "## Étapes",
    '1. `update_stage("implementing")`.',
    `2. Explore le projet en lecture seule (${isCodex ? "tes outils de lecture" : "Read, Grep, Glob"}, et \`git log\`/\`git diff\` si utile) pour répondre précisément, en citant les fichiers/chemins pertinents.`,
    "3. `submit_answer(<réponse markdown>)`. Ne termine pas ton tour avant d'avoir appelé `submit_answer`, `ask_user` ou `fail` (sinon le pipeline te relancera).",
    "",
    "## Interdits",
    "- Ne modifie, ne crée ni ne supprime AUCUN fichier ; ne commit pas, ne push pas, n'ouvre pas de PR.",
    "- Ne touche à aucun fichier hors du worktree.",
    project.instructions ? `- Consigne projet : ${project.instructions}` : "",
  ];

  return lines.filter((line) => line !== "").join("\n");
}
