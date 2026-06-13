import type { Ticket } from "../../shared/schemas.ts";
import { extractFigmaUrls } from "../../shared/figma.ts";
import { getProject, isProjectKey } from "../config.ts";

/**
 * Builds the `ticket` channel payload: the full pipeline contract injected into
 * the session at startup. Describes the steps, the tools to call, and the bans.
 */
export function buildTicketContract(ticket: Ticket): string {
  if (!isProjectKey(ticket.project)) {
    throw new Error(`Projet inconnu: ${ticket.project}`);
  }
  const project = getProject(ticket.project);
  const figmaUrls = extractFigmaUrls(ticket.description);
  const isUi = figmaUrls.length > 0;

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
    "- `done(pr_url)` UNIQUEMENT après avoir : commité proprement, poussé la branche, et ouvert une PR draft via `gh pr create --draft`.",
    "- `fail(reason, findings)` si tu es bloqué après avoir épuisé tes options.",
    "",
    "## Événements de channel",
    "Tu peux recevoir à tout moment un événement `user_comment` : une instruction/orientation de l'utilisateur à prendre en compte dans le travail en cours (ce n'est PAS une réponse à une question `ask_user`).",
    "",
    "## Étapes",
    ticket.prdEnabled ? "1. planning → submit_prd → (attente prd_validated)" : "1. implementing",
    "2. implementing : implémente la fonctionnalité dans le worktree courant.",
    "3. reviewing : lance un subagent à contexte frais (outil Agent) avec le skill `argus` sur ton diff.",
    ...(isUi
      ? [
          "   + comparaison aux maquettes Figma référencées (récupère TOUJOURS la frame parente de chaque node-id) :",
          ...figmaUrls.map((url) => `     - ${url}`),
        ]
      : []),
    "4. fixing : corrige les findings, puis re-review. Max 2 boucles, sinon fail().",
    "5. testing : exécute typecheck, lint et tests du projet. Rouge après correction → fail().",
    "6. opening_pr : commit (conventions du projet), push, `gh pr create --draft` vers " + project.baseBranch + ".",
    "7. done(pr_url).",
    "",
    "## Interdits",
    "- N'utilise JAMAIS `git push --no-verify` ni de flag contournant les hooks.",
    "- Ne touche à aucun fichier hors du worktree.",
    project.instructions ? `- Consigne projet : ${project.instructions}` : "",
  ];

  return lines.filter((line) => line !== "").join("\n");
}
