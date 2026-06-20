import { CLEANER_BRANCH_SUFFIX, FEASIBILITY_SCOUT_AGENT_NAME } from "../../shared/constants.ts";
import type { CommitLanguage, ReviewDepth } from "../../shared/constants.ts";
import type { Ticket } from "../../shared/schemas.ts";
import { triageResultSchema } from "../../shared/schemas.ts";
import { extractFigmaUrls } from "../../shared/figma.ts";
import { hasMockups } from "../../shared/mockups.ts";
import type { ProjectConfig } from "../config.ts";
import { getProject, isProjectKey } from "../config.ts";

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
 * Builds the `implementing` step(s) of the contract. Three modes:
 * Composer delegates code-writing to Cursor headless; a PRD-enabled Claude ticket
 * delegates it to a fresh-context sub-agent (kept separate from the planning
 * session, with the validated PRD as its contract); otherwise Claude implements inline.
 */
function buildImplementingSteps(
  ticket: Ticket,
  opts: { composerScriptPath: string },
  prdPath: string,
): string[] {
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
      "   b. Délègue l'implémentation au sous-agent `implementer` (outil Agent, `subagent_type: implementer`) : il écrit le code dans le worktree courant et ne commit JAMAIS ; toi (session principale) tu gardes la main sur git, review, tests et PR.",
      `      Dans son prompt, transmets-lui : le chemin du PRD (${prdPath}) à lire et à garder en tête comme contrat à respecter de bout en bout, le worktree courant comme répertoire de travail, et la consigne d'implémenter intégralement la fonctionnalité décrite.`,
      "   c. Quand le sous-agent rend la main, relis son diff (git diff), vérifie la cohérence avec le PRD et comble les manques toi-même si l'implémentation est partielle, puis enchaîne sur la review.",
    ];
  }
  return [
    "2. implementing (délégué au sous-agent `implementer`) :",
    "   a. Délègue l'implémentation au sous-agent `implementer` (outil Agent, `subagent_type: implementer`) : il écrit le code dans le worktree courant et ne commit JAMAIS ; toi (session principale) tu gardes la main sur git, review, tests et PR. Dans son prompt, transmets-lui le worktree courant comme répertoire de travail et la consigne d'implémenter intégralement la fonctionnalité décrite dans la description du ticket.",
    "   b. Quand le sous-agent rend la main, relis son diff (git diff), comble les manques toi-même si l'implémentation est partielle, puis enchaîne sur la review.",
  ];
}

/** Step 1 label of the contract: a PRD planning phase or a direct jump to implementing. */
function buildPlanningStep(ticket: Ticket): string {
  if (ticket.prdEnabled) return "1. planning → submit_prd → (attente prd_validated)";
  return "1. implementing";
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
  // A draft PR can't be auto-merged, so autoMerge always produces a ready PR.
  const prIsDraft = ticket.prDraft && !ticket.autoMerge;
  // Screenshots only make sense on a PR a human will read; auto-merge skips that.
  // NOTE(ali): `gh` can't upload images to GitHub's user-attachments CDN (that endpoint is
  // internal to the web editor's drag-and-drop, not in the REST API). The agent must host the
  // image elsewhere (commit it, release asset) before referencing it in the PR markdown.
  const wantsScreenshots = ticket.addScreenshots && !ticket.autoMerge;
  const wantsVerify = ticket.verifyFeature;
  const verifyWithMockups = wantsVerify && hasMockups(ticket.description);
  const prCreateCmd = `${prIsDraft ? "gh pr create --draft" : "gh pr create"} --base ${baseBranch}`;
  const prdPath = `/tmp/prd-${ticket.id}.md`;
  const implementingSteps = buildImplementingSteps(ticket, opts, prdPath);

  const lines: string[] = [
    `# Ticket ${ticket.id} — ${ticket.title}`,
    "",
    `Projet : ${project.label} (branche de base et cible : ${baseBranch})`,
    isUi ? "Type : ticket UI (maquettes Figma référencées dans la description, comparaison requise)" : "",
    "",
    "## Description",
    ticket.description || "(vide)",
    "La description peut référencer des chemins d'images locaux absolus (ex. /Users/.../uploads/xxx.png) que tu peux lire avec l'outil Read.",
    "",
    buildFeasibilityContextSection(ticket),
    "## Contrat de pipeline",
    "Tu es une session Claude Code autonome. Tu DOIS piloter la carte via les tools du serveur MCP `worker` :",
    "- `update_stage(stage)` à chaque transition d'étape.",
    "- `ask_user(question)` dès qu'une décision te dépasse (ne devine jamais une exigence critique).",
    ticket.prdEnabled
      ? "- `submit_prd(markdown)` une fois le plan prêt, PUIS attends l'événement `prd_validated` avant de déléguer l'implémentation à un sous-agent à contexte frais (ne l'implémente pas dans cette session de planification)."
      : "- (Option PRD désactivée : implémente directement.)",
    `- \`done(pr_url)\` UNIQUEMENT après avoir : commité proprement, poussé la branche, et ouvert une PR${prIsDraft ? " draft" : ""} via \`${prCreateCmd}\`.`,
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
    "3. reviewing : lance un subagent à contexte frais (outil Agent) avec le skill `argus` sur ton diff.",
    ...(isUi
      ? [
          "   + comparaison aux maquettes Figma référencées (récupère TOUJOURS la frame parente de chaque node-id) :",
          ...figmaUrls.map((url) => `     - ${url}`),
        ]
      : []),
    "3b. anti-régression : lance un AUTRE subagent à contexte frais (outil Agent) avec le skill `regression-check` sur ton diff, en modèle sonnet et effort low. Il cartographie les consommateurs des symboles modifiés et signale les régressions potentielles. C'est un subagent distinct de la review argus.",
    `4. fixing : corrige les findings (argus + anti-régression), puis relance les DEUX subagents (review argus ET anti-régression) pour confirmer. ${
      ticket.argusMultiLoop ? "Max 2 boucles" : "1 seule boucle de correction"
    }, sinon fail().`,
    [
      "5. testing : exécute typecheck, lint et tests du projet. Rouge après correction → fail().",
      `   Note serveur/DB : si tu dois lancer un serveur pour les tests, utilise un port libre (pas le port par défaut de l'app — trouve-en un avec \`lsof\`/\`ss\` ou laisse l'OS en assigner un) et une base de données isolée et vierge (ex. \`/tmp/test-${ticket.id}.db\` — jamais \`kanban.db\` ni \`kanban-real.db\`). Si le schéma DB a changé, initialise/migre la DB de test avant de lancer les tests.`,
    ].join("\n"),
    wantsVerify
      ? "5b. vérification fonctionnelle OBLIGATOIRE avant la PR : lance réellement l'app et vérifie de bout en bout que la fonctionnalité décrite marche (via Playwright/navigateur pour un changement frontend, ou en exerçant le code/CLI/endpoint concerné sinon). Si elle ne marche pas, corrige puis re-vérifie ; si tu ne parviens pas à la faire marcher, appelle fail(). Ne passe JAMAIS à l'ouverture de la PR sans cette vérification réussie."
      : "",
    verifyWithMockups
      ? "5c. comparaison visuelle OBLIGATOIRE aux maquettes : compare le rendu réel aux maquettes fournies dans la description (liens Figma et/ou images). Utilise le skill `mockup-fidelity-review` (ou un subagent à contexte frais) pour juger la fidélité ; corrige les écarts visuels significatifs avant d'ouvrir la PR. C'est EN PLUS de la review argus."
      : "",
    `6. opening_pr : commit (conventions du projet), push, \`${prCreateCmd}\` vers ${baseBranch}.`,
    wantsScreenshots
      ? "   + captures d'écran : si ce ticket touche le frontend, capture la fonctionnalité via Playwright (lance l'app, navigue jusqu'à l'écran concerné, prends les screenshots) et inclus ces images dans la description de la PR (téléverse-les puis intègre-les en markdown `![légende](url)`). Si le diff ne touche pas le frontend, ignore cette consigne."
      : "",
    "7. done(pr_url).",
    ticket.autoMerge
      ? `Note : la PR ne doit PAS être en draft — une fois \`done()\` validé, le système la mergera automatiquement dans ${baseBranch}.`
      : "",
    "",
    "## Interdits",
    "- N'utilise JAMAIS `git push --no-verify` ni de flag contournant les hooks.",
    "- Ne touche à aucun fichier hors du worktree.",
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
    "Tu es une session Claude Code autonome dédiée à la résolution de conflits. Tu DOIS piloter la carte via les tools du serveur MCP `worker` :",
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
    '3. `update_stage("testing")` : exécute typecheck, lint et tests du projet. Rouge → corrige (commits additionnels) ; si tu ne peux pas rétablir le vert, `fail()`.',
    `4. \`update_stage("opening_pr")\` : pousse la branche réécrite par le rebase avec \`git push --force-with-lease\` (jamais \`--no-verify\`).`,
    `5. \`done(${ticket.prUrl})\` — le système re-tentera automatiquement le merge dans \`${baseBranch}\`.`,
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
export function buildFeasibilityBatchContract(tickets: Ticket[], project: ProjectConfig): string {
  const ticketList = tickets.map(
    (ticket) => `- [${ticket.id}] ${ticket.title} :: ${truncateDescription(ticket.description)}`,
  );

  const lines: string[] = [
    `# Analyse de faisabilité en lot — ${tickets.length} ticket(s)`,
    "",
    `Projet : ${project.label} (branche de base : ${project.baseBranch})`,
    "",
    "Tu es une session orchestratrice de faisabilité en LECTURE SEULE sur le dépôt réel (pas de worktree).",
    "Seuls Read, Glob, Grep et Task (sous-agents) sont disponibles ; Edit/Write/Bash sont inappelables.",
    "Ne modifie JAMAIS le dépôt.",
    "",
    "## Tickets à évaluer",
    ...ticketList,
    "Les descriptions peuvent référencer des chemins d'images locaux absolus (Read possible) et des liens externes.",
    "",
    "## Ta mission",
    `Pour CHACUN des tickets ci-dessus, lance EXACTEMENT UN sous-agent à contexte frais via l'outil Task avec`,
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
    "",
    "## Liens / pièces jointes non consultables",
    "Si une description référence une pièce jointe ou un lien que tu ne peux pas consulter (ex. lien Trello,",
    "image absente), ajoute-le dans `questions` du ticket concerné avec le préfixe exact `Lien non consultable: <url>`.",
    "",
    "## Règles strictes (reprises du triage)",
    "- N'invente rien.",
    "- Ne suppose rien : si une information manque, c'est une question, pas une hypothèse.",
    "- Ne propose pas de réécrire le ticket.",
    "- Fonde chaque affirmation sur du code réellement lu (cite les chemins de fichiers).",
    "",
    "## Format de réponse",
    "Une fois TOUS les sous-agents terminés, agrège leurs verdicts et appelle UNE SEULE FOIS le tool",
    "`submit_feasibility` (serveur MCP `worker`) avec `{ results: [{ ticketId, verdict, summary, reasons, questions, files, suggestedModel, suggestedEffort }] }`,",
    "un objet par ticket (reprends le `ticketId` exact entre crochets ci-dessus). Ne termine pas ton tour avant",
    "d'avoir appelé `submit_feasibility` ou `fail`. N'écris pas les verdicts en texte : seul l'appel au tool compte.",
  ];

  return lines.filter((line) => line !== "").join("\n");
}

/** Explicit, non-droppable depth directive injected next to the argus invocation so the
 * autonomous agent never silently falls back to argus' documented light default. */
function reviewDepthDirective(depth: ReviewDepth): string {
  return depth === "full"
    ? "   Profondeur EXIGÉE : **full** — le flag `--full` ci-dessus est OBLIGATOIRE, ne le retire jamais. Argus DOIT dispatcher les 6 reviewers (quality, architecture, regression, security, conventions, logic). Le défaut light (4 reviewers) est INTERDIT pour cette revue."
    : "   Profondeur EXIGÉE : **light** — 4 reviewers (quality, conventions, regression, logic). N'ajoute PAS `--full`.";
}

/**
 * Builds the `ticket` channel payload for a review ticket: drive the argus skill
 * over an open PR, optionally posting findings inline via gh, then done().
 */
export function buildReviewContract(ticket: Ticket, opts: { commitLanguage: CommitLanguage }): string {
  if (!isProjectKey(ticket.project)) {
    throw new Error(`Projet inconnu: ${ticket.project}`);
  }
  const project = getProject(ticket.project);
  const depth = ticket.reviewDepth ?? "light";
  const fullFlag = depth === "full" ? " --full" : "";
  const postFlag = ticket.postComments && ticket.prNumber !== null ? ` --post=${ticket.prNumber}` : "";
  const branch = ticket.prHeadBranch ?? "";
  // Review against the PR's own detected target branch (or the user's override), not the project default.
  const reviewBase = ticket.baseBranch ?? project.baseBranch;
  const argusCmd = `argus ${branch} --base ${reviewBase}${fullFlag}${postFlag}`;

  // Guard on prHeadBranch too: slotManager only checks out the PR head branch (worktreeAddExisting)
  // and the done gate only requires a push when prHeadBranch is non-null. Branching the contract on
  // the same condition keeps contract/worktree/gate from diverging if prHeadBranch is ever absent.
  if (ticket.fixComments && ticket.prHeadBranch !== null) {
    return buildReviewFixLines(ticket, opts, { project, depth, branch, argusCmd, reviewBase });
  }

  const lines: string[] = [
    `# Revue de PR #${ticket.prNumber} — ${ticket.title}`,
    "",
    `Projet : ${project.label} (branche de base : ${reviewBase})`,
    `PR : ${ticket.prUrl}`,
    `Branche de la PR : ${branch}`,
    `Profondeur : ${depth === "full" ? "complète (full)" : "light"}`,
    `Poster les commentaires sur GitHub : ${ticket.postComments ? "OUI" : "NON"}`,
    "",
    "## Contrat de pipeline",
    "Tu es une session Claude Code autonome dédiée à la REVUE d'une PR (lecture seule). Tu DOIS piloter la carte via les tools du serveur MCP `worker` :",
    "- `update_stage(stage)` à chaque transition d'étape.",
    "- `ask_user(question)` si une décision te dépasse (ex. PR introuvable ou ambiguë).",
    "- `done(pr_url)` UNIQUEMENT une fois la revue terminée (et postée si demandé).",
    "- `fail(reason, findings)` si tu es bloqué après avoir épuisé tes options.",
    `- Rédige les commentaires de revue postés sur la PR en ${commitLanguageLabel(opts.commitLanguage)}.`,
    "",
    "## Événements de channel",
    "Tu peux recevoir à tout moment un événement `user_comment` : une instruction/orientation de l'utilisateur à prendre en compte dans la revue en cours.",
    "",
    "## Étapes",
    '1. `update_stage("reviewing")`.',
    `2. Lance le skill **argus** sur la PR via cette invocation : \`${argusCmd}\``,
    reviewDepthDirective(depth),
    "   Argus exécute lui-même `git fetch origin <branche>`, calcule le diff `<base>...<branche>`, fanne en reviewers parallèles à contexte frais,",
    ticket.postComments
      ? "   puis poste UNE review inline sur la PR via `gh` (`event: COMMENT`)."
      : "   et te renvoie le verdict (aucun postage : `--post` est volontairement absent).",
    `3. \`done(${ticket.prUrl})\` une fois la revue (et le postage le cas échéant) terminée.`,
    "",
    "## Interdits",
    "- Ne modifie AUCUN fichier : argus est en lecture seule, cette session ne produit pas de diff.",
    "- N'approuve JAMAIS, ne demande pas de changements via l'API, ne merge pas la PR (`event: COMMENT` uniquement).",
    "- N'utilise JAMAIS `git push --no-verify` ni de flag contournant les hooks.",
    "- Ne touche à aucun fichier hors du worktree.",
    project.instructions ? `- Consigne projet : ${project.instructions}` : "",
  ];

  return lines.filter((line) => line !== "").join("\n");
}

/**
 * fix-mode review contract: the worktree is ALREADY checked out on the PR's head branch. The session
 * runs argus (posting its findings), delegates the corrections to the `pr-fixer` sub-agent, then
 * tests, commits and pushes the fixes onto the SAME branch — no new PR.
 */
function buildReviewFixLines(
  ticket: Ticket,
  opts: { commitLanguage: CommitLanguage },
  ctx: { project: ReturnType<typeof getProject>; depth: ReviewDepth; branch: string; argusCmd: string; reviewBase: string },
): string {
  const { project, depth, branch, argusCmd, reviewBase } = ctx;

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
    "Tu es une session Claude Code autonome dédiée à la REVUE puis la CORRECTION d'une PR. Tu DOIS piloter la carte via les tools du serveur MCP `worker` :",
    "- `update_stage(stage)` à chaque transition d'étape.",
    "- `ask_user(question)` si une décision te dépasse (ex. retour ambigu, arbitrage de périmètre).",
    "- `done(pr_url)` UNIQUEMENT après qu'argus a posté la revue, les corrections appliquées, commitées, et la branche poussée (passe la MÊME URL de PR, ne crée PAS de nouvelle PR).",
    "- `fail(reason, findings)` si tu es bloqué après avoir épuisé tes options.",
    `- Rédige les messages de commit et les commentaires de revue en ${commitLanguageLabel(opts.commitLanguage)}.`,
    "",
    "## Événements de channel",
    "Tu peux recevoir à tout moment un événement `user_comment` : une instruction/orientation de l'utilisateur à prendre en compte dans le travail en cours.",
    "",
    "## Étapes",
    '1. `update_stage("reviewing")`.',
    `2. Lance le skill **argus** sur la PR via cette invocation : \`${argusCmd}\``,
    reviewDepthDirective(depth),
    "   Argus exécute lui-même `git fetch origin <branche>`, calcule le diff `<base>...<branche>`, fanne en reviewers parallèles à contexte frais, puis poste UNE review inline sur la PR via `gh` (`event: COMMENT`).",
    `3. \`update_stage("fixing")\` : délègue les corrections au sous-agent \`pr-fixer\` (outil Agent, \`subagent_type: pr-fixer\`). Dans son prompt, transmets-lui : le worktree courant comme répertoire de travail, le numéro de la PR (#${ticket.prNumber}), les findings d'argus issus de ton contexte, et la consigne de lire au besoin les commentaires de review postés via \`gh\` et de n'appliquer que les corrections PERTINENTES. Il ne commit JAMAIS. Quand il rend la main, relis son diff (\`git diff\`) et complète toi-même ce qui est partiel.`,
    '4. `update_stage("testing")` : exécute typecheck, lint et tests du projet. Rouge après correction → `fail()`.',
    '5. `update_stage("opening_pr")` : commit (conventions du projet), puis `git push` la branche head de la PR (jamais `--no-verify`, aucune nouvelle PR).',
    `6. \`done(${ticket.prUrl})\`.`,
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
    "Tu es une session Claude Code autonome dédiée au TRI puis à l'APPLICATION des retours de review d'une PR. Le worktree courant est sur une branche locale dédiée `" + localBranch + "` qui porte les commits de la PR (partie de la head de la PR `" + branch + "`). Tu commites tes corrections sur cette branche locale et les pousses vers la head de la PR `" + branch + "` pour mettre à jour la MÊME PR — ce nom local volontairement différent de la head de la PR est attendu. Tu DOIS piloter la carte via les tools du serveur MCP `worker` :",
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
    `2. \`update_stage("fixing")\` puis : lance le skill **minos-pr-feedback** sur la PR #${ticket.prNumber} (branche \`${branch}\`). Il récupère tous les fils de commentaires (inline, résumés de review, conversation), les trie par pertinence, et n'applique QUE les corrections pertinentes qui respectent le contexte de la PR ci-dessus ; il écarte les nits et ignore les fils résolus/obsolètes. Si rien n'est pertinent, n'applique rien.`,
    '3. `update_stage("testing")` : exécute typecheck, lint et tests du projet. Rouge après correction → `fail()`.',
    `4. \`update_stage("opening_pr")\` : commit (conventions du projet), puis pousse vers la head de la PR avec \`git push origin HEAD:${branch}\` (jamais \`--no-verify\`, aucune nouvelle PR ; le nom de branche locale diffère volontairement de la head de la PR). Si aucune correction n'a été appliquée, saute le commit/push.`,
    `5. Replie (minimise) chaque commentaire de reviewer RÉELLEMENT traité (l'ensemble \`apply\` : retours pertinents que tu as adressés), PAS les nits écartés ni les retours hors-périmètre. Cela vaut que du code ait été poussé ou non — un retour peut être adressé par une correction appliquée. Récupère le \`node_id\` de chaque commentaire traité : les commentaires inline via \`gh api /repos/{owner}/{repo}/pulls/${ticket.prNumber}/comments\` (champ \`node_id\`), les commentaires de conversation top-level via \`gh api /repos/{owner}/{repo}/issues/${ticket.prNumber}/comments\` (champ \`node_id\`). Pour chacun, replie-le avec la mutation GraphQL \`minimizeComment\` (\`classifier: RESOLVED\`, \`subjectId\` = le \`node_id\`), ex. : \`gh api graphql -f query='mutation($id:ID!){minimizeComment(input:{subjectId:$id,classifier:RESOLVED}){minimizedComment{isMinimized}}}' -f id=<node_id>\`. Si aucun commentaire n'a été traité, ne replie rien.`,
    `6. \`done(${ticket.prUrl})\`.`,
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

  const lines: string[] = [
    `# Question ${ticket.id} — ${ticket.title}`,
    "",
    `Projet : ${project.label} (worktree en LECTURE SEULE sur ${ticket.baseBranch ?? project.baseBranch})`,
    "",
    "## Question",
    ticket.description || "(vide)",
    "La question peut référencer des chemins d'images locaux absolus (ex. /Users/.../uploads/xxx.png) que tu peux lire avec l'outil Read.",
    "",
    "## Contrat de pipeline",
    "Tu es une session Claude Code autonome dédiée à RÉPONDRE à une question (lecture seule, aucune modification). Tu DOIS piloter la carte via les tools du serveur MCP `worker` :",
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
    "2. Explore le projet en lecture seule (Read, Grep, Glob, et `git log`/`git diff` si utile) pour répondre précisément, en citant les fichiers/chemins pertinents.",
    "3. `submit_answer(<réponse markdown>)`. Ne termine pas ton tour avant d'avoir appelé `submit_answer`, `ask_user` ou `fail` (sinon le pipeline te relancera).",
    "",
    "## Interdits",
    "- Ne modifie, ne crée ni ne supprime AUCUN fichier ; ne commit pas, ne push pas, n'ouvre pas de PR.",
    "- Ne touche à aucun fichier hors du worktree.",
    project.instructions ? `- Consigne projet : ${project.instructions}` : "",
  ];

  return lines.filter((line) => line !== "").join("\n");
}

/**
 * Interactive test session contract: the feature already lives on `ticket.branch`, checked out in a
 * ready-to-run worktree. No pipeline, no gate, no PR — the user drives the session via the terminal
 * to explore/run/test the feature. Mentions NO MCP pipeline tool (see the coordinator guard).
 */
export function buildTestContract(ticket: Ticket): string {
  if (!isProjectKey(ticket.project)) {
    throw new Error(`Projet inconnu: ${ticket.project}`);
  }
  const project = getProject(ticket.project);
  const branch = ticket.branch ?? "(inconnue)";

  const lines: string[] = [
    `# Session de test — ${ticket.id} — ${ticket.title}`,
    "",
    `Session de test interactive. La feature « ${ticket.title} » est implémentée sur la branche \`${branch}\`, déjà checkout dans ce worktree (projet ${project.label}, dépendances installées).`,
    "",
    "## Description de la feature",
    ticket.description || "(vide)",
    "",
    "## Ta mission",
    "Aider l'utilisateur à lancer, tester et explorer cette feature : build, run, navigation, scénarios de test, etc. Réponds à ses questions et exécute les commandes nécessaires pour observer le comportement de la feature.",
    "",
    "## Interdits",
    "- Ne commit pas, ne push pas, n'ouvre aucune PR.",
    "- Cette session n'a pas de gate `done` et aucun tool de pipeline ; elle se termine quand l'utilisateur clique « Arrêter le test ».",
    "- Ne touche à aucun fichier hors du worktree.",
    project.instructions ? `- Consigne projet : ${project.instructions}` : "",
    "",
    "## Pour démarrer",
    "Propose d'emblée comment lancer et observer la feature (commande de build/run, URL ou étape à suivre), puis attends les instructions de l'utilisateur.",
  ];

  return lines.filter((line) => line !== "").join("\n");
}
