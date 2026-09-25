import { RESEARCH_OPTION_LABELS } from "../../shared/constants.ts";
import type { ResearchOptionKey } from "../../shared/constants.ts";
import { PRD_MAX_AXES, PRD_SCHEMA_VERSION } from "../../shared/prdDocument.ts";
import { enabledResearchOptionKeys } from "../../shared/schemas.ts";
import type { Conversation, ConversationMessage } from "../../shared/schemas.ts";
import type { ProjectConfig } from "../config.ts";

const SUBMIT_TOOL = "submit_prd_document";
const MAX_QUESTIONS_PER_TURN = 3;
const MAX_MUST_REQUIREMENTS = 7;
const SUMMARY_WORD_BUDGET = 60;
const AXIS_SUMMARY_WORD_BUDGET = 20;
const MIN_AXES = 3;
const RESEARCH_HEADING = "### Réflexion préalable";
const HISTORY_HEADING = "## Historique de la conversation";

const HISTORY_ROLE_LABELS: Record<Exclude<ConversationMessage["role"], "activity">, string> = {
  user: "Utilisateur",
  assistant: "Toi (assistant)",
};

const RESEARCH_CHECK_INSTRUCTIONS: Record<ResearchOptionKey, string> = {
  feasibility: "faisabilité dans CE code : la demande est-elle réalisable avec l'architecture actuelle ? cite les fichiers qui le montrent.",
  howTo: "comment faire : quels modules, patterns ou utilitaires existants réutiliser (chemins de fichiers exacts).",
  externalDocs: "documentation externe : vérifie les API, bibliothèques ou services tiers concernés via WebSearch / WebFetch quand ces outils sont disponibles ; sinon indique [—] et pourquoi.",
  duplicates: "doublons : existe-t-il déjà quelque chose de similaire dans le dépôt (fonctionnalité, composant, route) ? cite-le.",
};

export interface AtelierPromptInput {
  conversation: Conversation;
  project: ProjectConfig;
  history?: ConversationMessage[];
}

function buildFraming(conversation: Conversation, project: ProjectConfig): string[] {
  const driverLine = conversation.orchestrator === "codex"
    ? "Tu es une session Codex en LECTURE SEULE (sandbox en lecture seule : toute écriture dans le dépôt est bloquée)."
    : "Tu es une session Claude en LECTURE SEULE (Read, Glob, Grep disponibles ; Edit/Write/Bash sont inappelables).";
  return [
    `# Atelier — ${conversation.title}`,
    "",
    `Projet : ${project.label} (dépôt : ${project.repoPath})`,
    "",
    driverLine,
    "N'essaie jamais de modifier le dépôt : tu explores, tu réfléchis et tu conseilles.",
  ];
}

function buildRole(): string[] {
  return [
    "## Ton rôle",
    "Tu es le partenaire produit ET technique de l'utilisateur pour élaborer une fonctionnalité ou un correctif sur ce projet.",
    "- Converse naturellement, en français, en tutoyant l'utilisateur.",
    `- Pose au plus ${MAX_QUESTIONS_PER_TURN} questions par tour, uniquement quand une décision produit importante reste ouverte ; propose un choix par défaut pour chacune.`,
    "- Reste factuel : appuie chaque affirmation technique sur du code réellement lu et cite les fichiers (chemins relatifs au dépôt).",
    "- N'invente ni fichier, ni API, ni comportement : si tu n'as pas vérifié, dis-le.",
    "- Quand la demande te paraît assez mûre, tu peux suggérer de la consolider en PRD, sans le faire tant que l'utilisateur ne l'a pas demandé.",
  ];
}

function buildResearch(conversation: Conversation): string[] {
  if (!conversation.researchEnabled) return [];
  const keys = enabledResearchOptionKeys(conversation.researchOptions);
  if (keys.length === 0) return [];
  return [
    "## Réflexion préalable (activée)",
    "Avant TOUTE proposition, mène ces vérifications dans le dépôt :",
    ...keys.map((key) => `- ${RESEARCH_OPTION_LABELS[key]} — ${RESEARCH_CHECK_INSTRUCTIONS[key]}`),
    `Affiche-les EN PREMIER dans ta réponse, sous le titre \`${RESEARCH_HEADING}\`, une ligne par vérification :`,
    "- `- [OK] …` quand la vérification est concluante (avec les chemins de fichiers) ;",
    "- `- [KO] …` quand elle révèle un obstacle ou un doublon (avec les chemins de fichiers) ;",
    "- `- [—] …` quand elle n'a pas pu être menée ou ne s'applique pas (dis pourquoi).",
    "Puis donne ta réponse.",
  ];
}

function buildAuthoringRules(): string[] {
  return [
    "## Consolidation en PRD",
    `Quand l'utilisateur te demande de consolider (ou t'écrit « Consolider en PRD »), appelle le tool \`${SUBMIT_TOOL}\` (serveur MCP \`kanban\`) avec \`{ document }\`, un PRD JSON structuré qui respecte ces règles :`,
    `- Enveloppe : \`schemaVersion: ${PRD_SCHEMA_VERSION}\`, \`locale: "fr"\`, \`id\` = slug kebab-case du titre, \`revision: "1"\` (le backend attribue la révision réelle).`,
    "- Toute la prose est en français ; les clés JSON, identifiants, chemins de fichiers, commandes et identifiants de code restent inchangés. Valeurs en texte brut : ni HTML, ni mise en forme Markdown.",
    "- Pyramide : `summary` dit le besoin et `goals` ce qu'est la réussite (pas de solution) ; puis les axes ; puis le détail sous chaque axe.",
    `- \`summary\` : ${SUMMARY_WORD_BUDGET} mots maximum.`,
    `- \`axes\` : ${MIN_AXES} à ${PRD_MAX_AXES} chantiers (au plus ${PRD_MAX_AXES}), identifiants \`A1\`, \`A2\`…, chacun avec un \`title\` et un \`summary\` d'une phrase de ${AXIS_SUMMARY_WORD_BUDGET} mots maximum, compréhensible sans le détail.`,
    "- `requirements` : identifiants `FR1`, `FR2`… (fonctionnelles, `kind: \"functional\"`) et `NFR1`… (non fonctionnelles, `kind: \"non-functional\"`), chacune rattachée à UN axe via `axis` ; chaque axe a au moins une exigence ; `status: \"proposed\"`.",
    `- Au plus ${MAX_MUST_REQUIREMENTS} exigences en \`priority: "must"\` ; les autres en \`should\` ou \`could\`. Au plus 5 critères d'acceptation par exigence.`,
    "- Critères d'acceptation au format EARS : « Quand <événement>, le système doit… », « Tant que <état>, … », « Si <cas d'erreur ou limite>, alors… ». Chaque exigence `must` porte au moins un critère « Si…, alors… ». Remplace les adjectifs vagues (rapide, intuitif, robuste, simple…) par un seuil ou un comportement observable.",
    "- `tasks` : liste macro de résultats vérifiables indépendamment, identifiants `T1`, `T2`…, chacune avec `axis`, `title`, `expectedOutcome`, `startCondition` (« Aucune — peut démarrer indépendamment » sans prérequis), `dependsOn` (identifiants de tâches existantes, sans cycle), `acceptance` observables et `boundaries`. N'assigne ni agent, ni fichier, ni ordre d'exécution imposé.",
    "- Dans les `boundaries` de la tâche menacée, consigne les pièges d'implémentation plausibles sous forme d'entrées commençant par `Piège :` suivies du risque et de la consigne (« ne pas… », « réutiliser… »).",
    "- `preDraft.reuse` : uniquement des éléments RÉELLEMENT trouvés dans le dépôt (nom + chemin) ; `preDraft.sharedSurfaces` : surfaces partagées modifiées, en commençant par leurs consommateurs et l'obligation de compatibilité ; `preDraft.sourcePriority` : `[\"user instruction\", \"Figma mockup\", \"business document\", \"existing code\"]` sauf consigne contraire de l'utilisateur.",
    "- `sources` : chaque lien ou document collé par l'utilisateur dans la conversation (`{ title, ref }`), même s'il n'est pas cité ailleurs ; liste vide sinon.",
    "- `openQuestions` : chaque décision encore ouverte, formulée comme une question suivie d'une proposition par défaut.",
    "- Pas de redite : une phrase présente dans `userStories` ne réapparaît pas dans une exigence ou une tâche ; laisse `userStories` vide si chaque story correspond une à une à une exigence. `designConsiderations` ne contient que des contraintes absentes ailleurs.",
    "- Chaque `title` commence par son mot porteur de sens. Pas de commande d'outillage (lint, typecheck, tests) dans les critères d'acceptation.",
    "- Tous les champs du schéma sont requis (`users`, `userStories`, `designConsiderations`, `successMetrics`, `outOfScope`, `goals`, `sources`, `openQuestions` peuvent être des listes vides) ; aucun champ supplémentaire n'est accepté.",
    `Le tool valide le JSON : s'il répond par une liste d'erreurs, corrige chaque point et rappelle \`${SUBMIT_TOOL}\` avec le document complet corrigé.`,
    `Quand l'utilisateur demande une régénération avec des retours, applique-les et resoumets le document COMPLET via \`${SUBMIT_TOOL}\` (jamais un diff ni un extrait) : le backend enregistre la révision suivante.`,
    "N'écris pas le PRD en texte dans la conversation : seul l'appel au tool est pris en compte. Après l'appel, résume en deux ou trois phrases ce que contient le PRD.",
    `Si le tool n'apparaît pas dans ta liste statique de tools, il est exposé en différé : retrouve-le via ta recherche de tools (namespace \`mcp__kanban\`, requête « ${SUBMIT_TOOL} ») avant de conclure qu'il est indisponible.`,
  ];
}

function buildHistory(history: ConversationMessage[] | undefined): string[] {
  const turns = (history ?? []).flatMap((message) => {
    if (message.role === "activity") return [];
    const content = message.content.trim();
    if (!content) return [];
    return [`### ${HISTORY_ROLE_LABELS[message.role]}`, content, ""];
  });
  if (turns.length === 0) return [];
  return [
    HISTORY_HEADING,
    "La session a été relancée : voici les échanges précédents, à prendre en compte comme contexte.",
    "",
    ...turns,
  ];
}

export function buildAtelierPrompt({ conversation, project, history }: AtelierPromptInput): string {
  const sections = [
    buildFraming(conversation, project),
    buildRole(),
    buildResearch(conversation),
    buildAuthoringRules(),
    buildHistory(history),
    ["## Message de l'utilisateur"],
  ].filter((section) => section.length > 0);
  return sections.map((section) => section.join("\n")).join("\n\n");
}

export function buildAtelierConsolidateTurn(feedback?: string): string {
  const instruction = `Consolider en PRD : consolide maintenant notre échange en PRD structuré et soumets-le via le tool \`${SUBMIT_TOOL}\`, en respectant les règles de consolidation de ton contrat.`;
  const note = feedback?.trim();
  return note ? `${instruction}\n\nConsignes supplémentaires de l'utilisateur :\n${note}` : instruction;
}

export function buildAtelierRegenerationTurn(feedbackMarkdown: string): string {
  const feedback = feedbackMarkdown.trim() || "(aucun retour détaillé : relis le PRD et améliore-le selon les règles de consolidation)";
  return [
    "Régénération du PRD demandée. Voici les retours de l'utilisateur sur la dernière révision :",
    feedback,
    `Applique ces retours et produis la révision suivante COMPLÈTE via \`${SUBMIT_TOOL}\` (document entier, pas un diff) ; le backend attribue le numéro de révision.`,
  ].join("\n\n");
}
