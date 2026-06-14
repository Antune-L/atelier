import type { CommitLanguage } from "../../shared/constants.ts";
import type { Ticket } from "../../shared/schemas.ts";
import { extractFigmaUrls } from "../../shared/figma.ts";
import { getProject, isProjectKey } from "../config.ts";

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

/**
 * Builds the `ticket` channel payload: the full pipeline contract injected into
 * the session at startup. Describes the steps, the tools to call, and the bans.
 */
export function buildTicketContract(
  ticket: Ticket,
  opts: { composerScriptPath: string; commitLanguage: CommitLanguage },
): string {
  if (!isProjectKey(ticket.project)) {
    throw new Error(`Projet inconnu: ${ticket.project}`);
  }
  const project = getProject(ticket.project);
  const baseBranch = ticket.baseBranch ?? project.baseBranch;
  const figmaUrls = extractFigmaUrls(ticket.description);
  const isUi = figmaUrls.length > 0;
  // A draft PR can't be auto-merged, so autoMerge always produces a ready PR.
  const prIsDraft = ticket.prDraft && !ticket.autoMerge;
  // Screenshots only make sense on a PR a human will read; auto-merge skips that.
  const wantsScreenshots = ticket.addScreenshots && !ticket.autoMerge;
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
    ticket.prdEnabled ? "1. planning → submit_prd → (attente prd_validated)" : "1. implementing",
    ...implementingSteps,
    "3. reviewing : lance un subagent à contexte frais (outil Agent) avec le skill `argus` sur ton diff.",
    ...(isUi
      ? [
          "   + comparaison aux maquettes Figma référencées (récupère TOUJOURS la frame parente de chaque node-id) :",
          ...figmaUrls.map((url) => `     - ${url}`),
        ]
      : []),
    "4. fixing : corrige les findings, puis re-review. Max 2 boucles, sinon fail().",
    "5. testing : exécute typecheck, lint et tests du projet. Rouge après correction → fail().",
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
  const argusCmd = `argus ${branch} --base ${project.baseBranch}${fullFlag}${postFlag}`;

  const lines: string[] = [
    `# Revue de PR #${ticket.prNumber} — ${ticket.title}`,
    "",
    `Projet : ${project.label} (branche de base : ${project.baseBranch})`,
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
