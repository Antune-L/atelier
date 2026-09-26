import { CLEANER_BRANCH_SUFFIX, COMMIT_LANGUAGE_LABELS, FEASIBILITY_SCOUT_AGENT_NAME, MAX_PARALLEL_IMPLEMENTERS, REVIEWER_BRANCH_SUFFIX } from "../../shared/constants.ts";
import type { CommitLanguage, ReviewDepth } from "../../shared/constants.ts";
import type { Ticket } from "../../shared/schemas.ts";
import { triageResultSchema } from "../../shared/schemas.ts";
import { extractFigmaUrls } from "../../shared/figma.ts";
import { hasMockups } from "../../shared/mockups.ts";
import type { ProjectConfig } from "../config.ts";
import { getProject, isProjectKey } from "../config.ts";
import type { Store } from "../db/store.ts";
import { resolveBaseBranch } from "./baseBranch.ts";
import { vcsCommands } from "./vcsCommands.ts";
import type { VcsCommandTable } from "./vcsCommands.ts";

/** Max chars of each ticket's description injected into the feasibility list (keeps the prompt bounded). */
const FEASIBILITY_DESC_MAX = 1200;

/** Uppercase French label of the language the agent must write commits/PR/review text in. */
function commitLanguageLabel(language: CommitLanguage): string {
  return language === "fr" ? "FRANÇAIS" : "ANGLAIS";
}

/** Language the review comments are written in: the ticket's own choice, else the app's commit language. */
function resolveReviewLanguage(ticket: Ticket, fallback: CommitLanguage): CommitLanguage {
  return ticket.reviewLanguage ?? fallback;
}

/** Header lines stating the review language and, when enabled, the human tone. */
function reviewStyleHeaderLines(language: CommitLanguage, humanTone: boolean): string[] {
  return [`Langue de la revue : ${COMMIT_LANGUAGE_LABELS[language]}`, humanTone ? "Ton : humain (concis)" : ""];
}

const HUMAN_TONE_DIRECTIVE =
  "- Ton des commentaires : humain et concis. Écris comme un collègue qui relit la PR : phrases courtes, pas de jargon de reviewer automatique, pas de préambule, une remarque = une idée.";

/** Instruction line forcing the language of commit messages and PR title/description. */
function commitLanguageDirective(language: CommitLanguage): string {
  return `- Rédige les messages de commit et le titre/description de la PR en ${commitLanguageLabel(language)}.`;
}

function hasValidatedAtelierPrd(ticket: Ticket): boolean {
  return !ticket.prdEnabled && ticket.prdMarkdown !== null && ticket.prdMarkdown.trim().length > 0;
}

function buildValidatedPrdSection(ticket: Ticket): string {
  if (!hasValidatedAtelierPrd(ticket)) return "";
  return [
    "## PRD validé",
    "Ce PRD a déjà été élaboré et validé par l'utilisateur dans l'Atelier : implémente-le tel quel, sans appeler `submit_prd` ni attendre `prd_validated`. Planifie ton implémentation à partir de lui ; la description ci-dessus précise la part (tâche ou axe) qui revient à cette carte.",
    "",
    ticket.prdMarkdown ?? "",
    "",
  ].join("\n");
}

function buildImplementingSteps(
  ticket: Ticket,
  opts: { composerScriptPath: string },
  prdPath: string,
): string[] {
  if (ticket.implementer === "codex" || ticket.implementer === "claude") {
    const providerName = ticket.implementer === "codex" ? "Codex" : "Claude";
    let planSource = "un plan concis et complet rédigé depuis la description du ticket";
    if (ticket.prdEnabled) planSource = "le PRD validé tel quel";
    else if (hasValidatedAtelierPrd(ticket)) planSource = "un plan concis et complet rédigé depuis la section « PRD validé » (limité à la part décrite dans la description)";
    return [
      `2. implementing (délégué à une session ${providerName} indépendante en arrière-plan) :`,
      "   N'utilise JAMAIS le sous-agent natif `implementer` pour ce ticket : l'implémentation passe EXCLUSIVEMENT par le tool delegate_implementation.",
      ...(ticket.prdEnabled
        ? [`   a. Dès réception de l'événement prd_validated, écris le PRD validé tel quel dans ${prdPath} : c'est la source de vérité de l'implémentation.`]
        : []),
      `   ${ticket.prdEnabled ? "b" : "a"}. Décide d'ABORD du découpage. Si la fonctionnalité se découpe naturellement en lots indépendants à périmètres de fichiers DISJOINTS, appelle delegate_implementation une fois par lot DANS LE MÊME TOUR (${MAX_PARALLEL_IMPLEMENTERS} lots maximum, un \`label\` distinct par lot ; déclare les fichiers ou dossiers relatifs au dépôt dans \`files\`, sans glob, et explique ce périmètre dans chaque \`plan\`). SINON, fais UN SEUL appel avec ${planSource} entier dans \`plan\` et déclare son périmètre dans \`files\` quand il est connu. Sans \`files\`, le lot occupe tout le dépôt. Chaque session ${providerName} écrit le code et ne commit JAMAIS.`,
      `   ${ticket.prdEnabled ? "c" : "b"}. TERMINE ton tour immédiatement après ces appels (ne boucle pas, ne surveille rien : l'attente est gérée par le backend). Tu recevras un événement implementation_done par lot.`,
      `   ${ticket.prdEnabled ? "d" : "c"}. À chaque implementation_done reçu : si \`remaining\` > 0, TERMINE de nouveau ton tour et attends les suivants (ne boucle pas, ne surveille rien). Quand tu reçois l'événement dont \`remaining\` vaut 0, tous les lots sont terminés : relis le diff produit (git diff), comble les manques toi-même si l'implémentation est partielle, puis enchaîne sur la review. Si un lot signale un échec, relance delegate_implementation UNE seule fois pour CE lot (même label et mêmes \`files\`) ; sinon implémente-le toi-même ou appelle fail(). Une nouvelle correction après un lot réussi est un nouveau lot avec un nouveau label.`,
    ];
  }
  if (ticket.implementer === "composer") {
    return [
      "2. implementing (délégué à Composer 2.5) :",
      `   a. Écris le plan à coder dans /tmp/composer-plan-${ticket.id}.md : ${
        ticket.prdEnabled || hasValidatedAtelierPrd(ticket)
          ? "reprends le PRD validé tel quel (section « PRD validé » pour une carte de l'Atelier)."
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
  return [];
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

const FORMAT_BEFORE_REVIEW_HINT =
  "AVANT CHAQUE batch de reviewers (première passe et chaque relecture après correction), découvre le formatter déjà configuré via les instructions et scripts du dépôt, applique-le aux fichiers pertinents modifiés en respectant ses ignores et les consignes sur les fichiers générés, puis exécute son check avec un code de sortie réel (ne déduis pas le succès d'une sortie RTK résumée ou masquée). N'invente aucun script, ne lance aucun téléchargement global via npx et, si aucun formatter n'est configuré, suis les conventions documentées sans prétendre avoir exécuté un check. Si un formatter configuré échoue ou est indisponible, résous le problème ou appelle `fail()` AVANT `delegate_review` : ce préflight ne consomme jamais une boucle de correction.";

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
    `   ${FORMAT_BEFORE_REVIEW_HINT}`,
    `3. reviewing : récupère le diff complet et appelle EN PARALLÈLE les ${kinds.length} reviewers indépendants : ${reviewCalls(depth)}. Passe à chacun la description/PRD et le diff utile, sans leur transmettre le raisonnement privé ni le résultat d'un autre. Termine ton tour et attends les ${kinds.length} événements \`review_done\`.`,
    ...figmaLines,
    `3a. ${READ_REVIEW_RESULTS_HINT}`,
    `3b. indépendance : chaque dimension a sa propre session backend en lecture seule. N'appelle jamais \`done()\` avant les ${kinds.length} résultats vérifiés sur le code courant ; un reviewer échoué ou une dimension manquante bloque la validation.`,
    `4. fixing : si un verdict vaut revise, corrige tous les findings pertinents puis relance les ${kinds.length} reviewers sur le nouveau diff. ${loopBudget}. Si la dernière relecture demande encore revise après cette limite, ne relance plus et ne fail pas pour ce seul motif : poursuis les tests, le commit, le push et l'ouverture de la PR, puis signale clairement les findings encore ouverts dans sa description. Au-delà de ce budget, le backend refuse toute passe supplémentaire : \`delegate_review\` répond en erreur. Le backend désactive alors l'auto-merge.`,
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
  if (hasValidatedAtelierPrd(ticket)) {
    return "- PRD déjà validé dans l'Atelier (section « PRD validé ») : N'appelle PAS `submit_prd` et n'attends aucun `prd_validated` ; implémente-le directement tel quel.";
  }
  if (!ticket.prdEnabled) return "- (Option PRD désactivée : implémente directement.)";
  if (ticket.orchestrator === "codex") {
    return "- `submit_prd(markdown)` une fois le plan prêt, PUIS attends l'événement `prd_validated` avant de déléguer l'implémentation via `delegate_implementation` (ne l'implémente pas dans cette phase de planification).";
  }
  if (ticket.implementer === "codex" || ticket.implementer === "claude") {
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
  const vcs = vcsCommands(project.vcsProvider);
  const prCreateCmd = vcs.createPr({ draft: prIsDraft, baseBranch });
  const prdPath = `/tmp/prd-${ticket.id}.md`;
  const implementingSteps = buildImplementingSteps(ticket, opts, prdPath);

  // The completion directive, the finalisation step and the signalling step each have three variants
  // (directPush → stealth → standard PR). Resolved here as plain branches to avoid nested ternaries.
  let toolDirective: string;
  if (directPush) {
    toolDirective = `- \`ready_for_review()\` UNIQUEMENT après avoir commité proprement et poussé tes commits DIRECTEMENT sur la branche cible \`${baseBranch}\` (AUCUNE PR, AUCUN ${vcs.bannedCreatePr}).`;
  } else if (stealth) {
    toolDirective = `- \`ready_for_review()\` UNIQUEMENT après avoir commité proprement et poussé la branche (AUCUNE PR, AUCUN ${vcs.bannedCreatePr}).`;
  } else {
    toolDirective = `- \`done(pr_url)\` UNIQUEMENT après avoir : commité proprement, poussé la branche, et ouvert une PR${prIsDraft ? " draft" : ""} via \`${prCreateCmd}\`.`;
  }

  let finalizationStep: string;
  if (directPush) {
    finalizationStep = `6. finalisation : commit (conventions du projet), puis pousse tes commits DIRECTEMENT sur la branche cible \`${baseBranch}\` : \`git push origin HEAD:refs/heads/${baseBranch}\`. N'ouvre AUCUNE PR. Si le push est rejeté (non-fast-forward parce que \`${baseBranch}\` a avancé), rebase sur \`origin/${baseBranch}\` puis re-pousse.`;
  } else if (stealth) {
    finalizationStep = `6. finalisation : commit (conventions du projet), puis pousse la branche (\`git push -u origin HEAD\`). N'ouvre AUCUNE PR (\`${vcs.bannedCreatePr}\` est INTERDIT).`;
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
    buildValidatedPrdSection(ticket),
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
    noPr ? "" : vcs.createPrHint && `   ${vcs.createPrHint}`,
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
    `   ${FORMAT_BEFORE_REVIEW_HINT}`,
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
    `Pour CHACUN des tickets ci-dessus, lance EXACTEMENT UN sous-agent natif à contexte frais.`,
    ...(driver === "claude"
      ? [
          `Utilise \`subagent_type: "${FEASIBILITY_SCOUT_AGENT_NAME}"\` (sous-agent en lecture seule, sans Task ni Bash : il ne`,
          "peut pas relancer d'autre sous-agent).",
        ]
      : [
          "Utilise un sous-agent générique avec un `task_name` unique composé de lettres minuscules, chiffres et `_`,",
          "`fork_turns: \"none\"`, sans `agent_type`, `model` ni `reasoning_effort`. Dans son message, recopie le ticket",
          "exact et impose : lecture seule, aucun sous-agent, aucun outil kanban, rapport rendu uniquement au parent.",
        ]),
    "Chaque sous-agent décide si SON ticket est implémentable EXACTEMENT",
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

/** Step 3 of a read-only review: publish the pass through the backend, or explain why it can't. */
function buildReviewPublicationStep(ticket: Ticket, vcs: VcsCommandTable): string {
  if (!ticket.postComments) {
    return `3. N'en poste RIEN sur ${vcs.label} : synthétise le verdict (findings par sévérité) dans ta réponse.`;
  }
  return `3. Appelle \`publish_review({ passId })\` avec le passId commun reçu dans les événements. Le backend compose et publie une seule review ${vcs.label} liée au commit revu : REQUEST_CHANGES si un finding critical ou major est retenu, COMMENT s'il ne reste que des findings minor, APPROVE si tous les findings ont été rejetés (ou auto-réfutés) ou si tous les reviewers approuvent. Ne poste aucun commentaire ${vcs.label} directement. Si la PR a avancé, lance une nouvelle passe complète avec tous les reviewers avant de rappeler publish_review.`;
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
  const vcs = vcsCommands(project.vcsProvider);
  const prDiffCmd = vcs.prDiff({ prNumber: ticket.prNumber, baseBranch: reviewBase });
  const postComments = ticket.postComments;
  const reviewLanguage = resolveReviewLanguage(ticket, opts.commitLanguage);
  const independentReviewSteps = [
    `2. Récupère le diff complet de la PR : \`${prDiffCmd}\`. Le backend positionne le worktree sur le head ${vcs.label} exact avant la nouvelle passe ; ne lance aucun fetch toi-même.`,
    `   Lance EN PARALLÈLE les ${kinds.length} dimensions indépendantes : ${reviewCalls(depth)}. Donne à chacun la PR, la profondeur, les dimensions (${reviewDimensions}) et le diff, sans le résultat ni le raisonnement d'un autre. Termine ton tour et attends les ${kinds.length} événements \`review_done\`.`,
    `   ${READ_REVIEW_RESULTS_HINT}`,
    `   Un reviewer ou sa contre-vérification échoués bloquent done(). Un verdict revise est une conclusion valide de cette revue en lecture seule : conserve les corrections recommandées dans le rapport puis termine normalement. Les ${kinds.length} dimensions doivent rendre un résultat vérifié sur le même passId et le code courant.`,
    buildReviewPublicationStep(ticket, vcs),
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
    ...reviewStyleHeaderLines(reviewLanguage, ticket.humanTone),
    `Poster les commentaires sur ${vcs.label} : ${postComments ? "OUI" : "NON"}`,
    "",
    "## Contrat de pipeline",
    buildSpecializedFraming(isCodex, "à la REVUE d'une PR (lecture seule)"),
    "- `update_stage(stage)` à chaque transition d'étape.",
    "- `ask_user(question)` si une décision te dépasse (ex. PR introuvable ou ambiguë).",
    postComments ? "- `publish_review({ passId })` UNIQUEMENT après réception de tous les résultats requis de la passe courante." : "",
    "- `done(pr_url)` UNIQUEMENT une fois la revue terminée (et postée si demandé).",
    "- `fail(reason, findings)` si tu es bloqué après avoir épuisé tes options.",
    `- Rédige les commentaires de revue postés sur la PR en ${commitLanguageLabel(reviewLanguage)}.`,
    ticket.humanTone ? HUMAN_TONE_DIRECTIVE : "",
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
    `- N'appelle aucune commande ${vcs.label} qui modifie la PR ; la publication COMMENT appartient exclusivement au backend via publish_review.`,
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
  const vcs = vcsCommands(project.vcsProvider);
  const prDiffCmd = vcs.prDiff({ prNumber: ticket.prNumber, baseBranch: reviewBase });
  const postComments = ticket.postComments;
  const reviewLanguage = resolveReviewLanguage(ticket, opts.commitLanguage);

  const reviewAndFixSteps = [
    `   ${FORMAT_BEFORE_REVIEW_HINT}`,
    `2. Récupère le diff complet de la PR (\`${prDiffCmd}\`) puis lance EN PARALLÈLE les ${kinds.length} sessions indépendantes : ${reviewCalls(depth)}. Transmets la profondeur ${depth}, les dimensions (${reviewDimensions}) et le diff à chacune, sans résultat ni raisonnement d'une autre. Termine ton tour et attends leurs événements \`review_done\`.`,
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
    ...reviewStyleHeaderLines(reviewLanguage, ticket.humanTone),
    "",
    "## Contexte",
    `Le worktree courant est DÉJÀ positionné sur la branche head de la PR (\`${branch}\`). Tu vas reviewer la PR, corriger les retours, puis commiter et pousser sur CETTE MÊME branche (aucune nouvelle PR).`,
    "",
    "## Contrat de pipeline",
    buildSpecializedFraming(isCodex, "à la REVUE puis la CORRECTION d'une PR"),
    "- `update_stage(stage)` à chaque transition d'étape.",
    "- `ask_user(question)` si une décision te dépasse (ex. retour ambigu, arbitrage de périmètre).",
    `- \`done(pr_url)\` UNIQUEMENT après les ${kinds.length} reviews indépendantes approuvées sur le code courant, les corrections appliquées, commitées, et la branche poussée (passe la MÊME URL de PR, ne crée PAS de nouvelle PR).`,
    postComments ? "- `publish_review({ passId })` après le commit et le push, avec le passId approuvé courant." : "",
    "- `fail(reason, findings)` si tu es bloqué après avoir épuisé tes options.",
    `- Rédige les messages de commit en ${commitLanguageLabel(opts.commitLanguage)}.`,
    `- Rédige les commentaires de revue en ${commitLanguageLabel(reviewLanguage)}.`,
    ticket.humanTone ? HUMAN_TONE_DIRECTIVE : "",
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
    postComments
      ? `7. Appelle \`publish_review({ passId })\`. Si le head ${vcs.label} a changé, lance une nouvelle passe complète avant toute publication.`
      : "",
    `${postComments ? "8" : "7"}. \`done(${ticket.prUrl})\`.`,
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
 * reviewer feedback — through the minos-pr-feedback skill where the provider supports it, otherwise
 * through the provider's own CLI — applies ONLY the pertinent fixes respecting the PR context, then
 * commits and pushes to the SAME PR head branch (HEAD:<prHeadBranch>) — no new PR, no posted
 * comments. It collapses (Azure DevOps: resolves) the reviewer threads it actually addressed.
 */
export function buildCleanContract(ticket: Ticket, opts: { commitLanguage: CommitLanguage }): string {
  if (!isProjectKey(ticket.project)) {
    throw new Error(`Projet inconnu: ${ticket.project}`);
  }
  const project = getProject(ticket.project);
  const branch = ticket.prHeadBranch ?? "";
  const localBranch = branch ? `${branch}${CLEANER_BRANCH_SUFFIX}` : "";
  const isCodex = ticket.orchestrator === "codex";
  const vcs = vcsCommands(project.vcsProvider);
  const clean = vcs.clean;
  const prRef = { prNumber: ticket.prNumber, prUrl: ticket.prUrl };

  // Codex has no minos-pr-feedback skill, and the skill itself is GitHub-only: whenever it does not
  // cover the provider, BOTH agent providers get the inline CLI instructions instead.
  const inlineTriageStep = `2. \`update_stage("fixing")\` puis : récupère TOUS les fils de retours de la PR #${ticket.prNumber} via \`${clean.cli}\` — ${clean.feedbackFetch(prRef)}. Trie-les par pertinence et n'applique QUE les corrections pertinentes qui respectent le contexte de la PR ci-dessus ; écarte les nits et ignore les fils résolus/obsolètes. Si rien n'est pertinent, n'applique rien.`;
  const triageStep = isCodex || !clean.minosSkill
    ? inlineTriageStep
    : `2. \`update_stage("fixing")\` puis : lance le skill **minos-pr-feedback** sur la PR #${ticket.prNumber} (branche \`${branch}\`). Il récupère tous les fils de commentaires (inline, résumés de review, conversation), les trie par pertinence, et n'applique QUE les corrections pertinentes qui respectent le contexte de la PR ci-dessus ; il écarte les nits et ignore les fils résolus/obsolètes. Si rien n'est pertinent, n'applique rien.`;
  const collapseStep = `6. Replie (minimise) chaque commentaire de reviewer RÉELLEMENT traité (l'ensemble \`apply\` : retours pertinents que tu as adressés), PAS les nits écartés ni les retours hors-périmètre. Cela vaut que du code ait été poussé ou non — un retour peut être adressé par une correction appliquée. ${clean.collapseComment(prRef)}. Si aucun commentaire n'a été traité, ne replie rien.`;

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
    triageStep,
    `   ${FORMAT_BEFORE_REVIEW_HINT}`,
    `3. \`update_stage("reviewing")\` : récupère le diff courant puis lance EN PARALLÈLE les 4 reviewers ${reviewCalls("light")}. Attends 4 événements \`review_done\` avec verdict approve sur le code courant ; corrige et relance les 4 si nécessaire. Un échec bloque \`done()\`.`,
    `   ${READ_REVIEW_RESULTS_HINT}`,
    '4. `update_stage("testing")` : exécute typecheck, lint et tests du projet. Rouge après correction → `fail()`.',
    `5. \`update_stage("opening_pr")\` : commit (conventions du projet), puis pousse vers la head de la PR avec \`git push origin HEAD:${branch}\` (jamais \`--no-verify\`, aucune nouvelle PR ; le nom de branche locale diffère volontairement de la head de la PR). Si aucune correction n'a été appliquée, saute le commit/push.`,
    collapseStep,
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
