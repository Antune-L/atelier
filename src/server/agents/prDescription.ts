import { REVIEW_LEVELS } from "../../shared/constants.ts";
import type { CommitLanguage, ReviewLevel } from "../../shared/constants.ts";
import { REVIEW_REASON_MAX_LENGTH } from "../../shared/protocol.ts";
import type { Ticket } from "../../shared/schemas.ts";

import { PR_DESCRIPTION_TEMPLATES, renderReviewLevelLine } from "../system/vcs/prDescription.ts";

const REVIEW_LEVEL_RULES: Record<ReviewLevel, string> = {
  low: "aucun changement de comportement (formatage, renommages, documentation, CSS sans changement de mise en page, suppression de code dont l'inutilisation est prouvée, ajout de tests)",
  medium: "le comportement change dans la structure existante (correction de bug, nouvel élément d'interface, valeurs par défaut ou textes modifiés, configuration optionnelle, montée de version patch/minor d'une dépendance, configuration d'outillage, tests affaiblis, suppression d'une fonctionnalité visible)",
  high: "la structure ou un contrat change (nouveau module, package, service ou méthode d'interface, schéma DB, migration ou forme des données persistées, API publique, MCP ou protocole, authentification, permissions, listes d'autorisation, secrets ou sandbox, CI, build ou release, concurrence ou cycle de vie, montée de version majeure d'une dépendance, suppression d'un module, de données ou d'une API partagés)",
};

export function isFirstFeatureDelivery(ticket: Ticket, hasActiveQualityIteration: boolean): boolean {
  return ticket.kind === "feature"
    && !ticket.autonomous
    && !hasActiveQualityIteration
    && !ticket.resolvingConflicts
    && !ticket.stealth
    && !ticket.directPush;
}

export function buildPrDescriptionInstructions(language: CommitLanguage, signal: string): string[] {
  const template = PR_DESCRIPTION_TEMPLATES[language];
  const levelLines = REVIEW_LEVELS.map((level) => `     - \`${level}\` (« ${template.levels[level]} ») : ${REVIEW_LEVEL_RULES[level]}.`);
  return [
    "   Description de PR obligatoire, avec exactement cette structure :",
    `   - Première ligne : \`${renderReviewLevelLine(language, "medium", "<raison>")}\` avec le libellé du niveau choisi.`,
    `   - \`${template.context}\` : pourquoi ce changement (besoin, problème, ticket).`,
    `   - \`${template.changes}\` : ce qui change concrètement, du point de vue du comportement.`,
    `   - \`${template.vigilance}\` : UNIQUEMENT s'il y a quelque chose qu'un humain doit vérifier (risque, choix discutable, vérification manquante) ; sinon omets la section entière.`,
    "   Niveau de relecture humaine (`review_level`) :",
    ...levelLines,
    "     La règle la plus haute qui s'applique l'emporte ; en cas de doute, choisis le niveau supérieur ; la taille du diff n'est jamais le critère.",
    `   Passe ce niveau et sa raison (\`review_reason\`, une phrase de ${REVIEW_REASON_MAX_LENGTH} caractères max) à ${signal}.`,
  ];
}
