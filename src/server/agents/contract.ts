import type { Ticket } from "../../shared/schemas.ts";
import { extractFigmaUrls } from "../../shared/figma.ts";
import { getProject, isProjectKey } from "../config.ts";

/**
 * Builds the `ticket` channel payload: the full pipeline contract injected into
 * the session at startup. Describes the steps, the tools to call, and the bans.
 */
export function buildTicketContract(ticket: Ticket, opts: { composerScriptPath: string }): string {
  if (!isProjectKey(ticket.project)) {
    throw new Error(`Projet inconnu: ${ticket.project}`);
  }
  const project = getProject(ticket.project);
  const figmaUrls = extractFigmaUrls(ticket.description);
  const isUi = figmaUrls.length > 0;
  // A draft PR can't be auto-merged, so autoMerge always produces a ready PR.
  const prIsDraft = ticket.prDraft && !ticket.autoMerge;
  const prCreateCmd = prIsDraft ? "gh pr create --draft" : "gh pr create";

  const implementingSteps: string[] =
    ticket.implementer === "composer"
      ? [
          "2. implementing (délégué à Composer 2.5) :",
          `   a. Écris le plan à coder dans /tmp/composer-plan-${ticket.id}.md : ${
            ticket.prdEnabled
              ? "reprends le PRD validé tel quel."
              : "rédige un plan concis et complet depuis la description."
          } Le script attend un CHEMIN de fichier, donc le plan doit exister sur disque.`,
          "   b. Lance Composer en ARRIÈRE-PLAN (il écrit le code dans le worktree courant et ne commit JAMAIS) :",
          `      ${opts.composerScriptPath} "$(pwd)" /tmp/composer-plan-${ticket.id}.md > /tmp/composer-${ticket.id}.log 2>&1 ; echo $? > /tmp/composer-${ticket.id}.rc &`,
          `   c. SURVEILLE SANS TERMINER TON TOUR : boucle avec \`sleep 60\` puis teste l'existence de /tmp/composer-${ticket.id}.rc. NE termine PAS ton tour tant que le fichier .rc n'existe pas (sinon le pipeline croit que tu es bloqué et t'escalade en stalled). Toutes les ~3 minutes pendant l'attente, appelle update_stage("implementing") comme heartbeat (sinon le watchdog te marquera inactif — le sleep ne le rafraîchit pas).`,
          "   d. Quand le .rc existe, lis le code de retour :",
          "      - 0 : relis le diff produit (git diff) et vérifie que le projet typecheck. Si l'implémentation est partielle (build cassé, fichiers orphelins) → fais UNE seule passe ciblée (réécris un gaps file listant les manques précis puis relance le script sur le même worktree) OU termine le câblage toi-même. Ne boucle JAMAIS Composer plus d'une passe.",
          "      - 3 ou 4 : Cursor absent ou non authentifié → appelle fail(\"Composer indisponible : binaire Cursor absent ou non authentifié\"). N'implémente PAS toi-même en silence.",
          "      - 5 : échec ou timeout de Composer → fail avec la raison.",
          "      - 6 : Composer n'a produit aucun changement (probable limite de contexte) → implémente toi-même OU fail.",
          "   e. Tu reprends la main pour la suite : c'est TOI (Claude) qui review, corrige, teste, commit, push et ouvre la PR. Composer n'a rien committé.",
        ]
      : ["2. implementing : implémente la fonctionnalité dans le worktree courant."];

  const lines: string[] = [
    `# Ticket ${ticket.id} — ${ticket.title}`,
    "",
    `Projet : ${project.label} (branche de base et cible : ${project.baseBranch})`,
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
      ? "- `submit_prd(markdown)` une fois le plan prêt, PUIS attends l'événement `prd_validated` avant d'implémenter."
      : "- (Option PRD désactivée : implémente directement.)",
    `- \`done(pr_url)\` UNIQUEMENT après avoir : commité proprement, poussé la branche, et ouvert une PR${prIsDraft ? " draft" : ""} via \`${prCreateCmd}\`.`,
    "- `fail(reason, findings)` si tu es bloqué après avoir épuisé tes options.",
    "",
    "## Événements de channel",
    "Tu peux recevoir à tout moment un événement `user_comment` : une instruction/orientation de l'utilisateur à prendre en compte dans le travail en cours (ce n'est PAS une réponse à une question `ask_user`).",
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
    `6. opening_pr : commit (conventions du projet), push, \`${prCreateCmd}\` vers ${project.baseBranch}.`,
    "7. done(pr_url).",
    ticket.autoMerge
      ? `Note : la PR ne doit PAS être en draft — une fois \`done()\` validé, le système la mergera automatiquement dans ${project.baseBranch}.`
      : "",
    "",
    "## Interdits",
    "- N'utilise JAMAIS `git push --no-verify` ni de flag contournant les hooks.",
    "- Ne touche à aucun fichier hors du worktree.",
    project.instructions ? `- Consigne projet : ${project.instructions}` : "",
  ];

  return lines.filter((line) => line !== "").join("\n");
}
