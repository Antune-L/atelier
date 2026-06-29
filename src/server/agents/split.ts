import type { Ticket } from "../../shared/schemas.ts";
import type { CommitLanguage } from "../../shared/constants.ts";
import { extractFigmaUrls } from "../../shared/figma.ts";
import type { ProjectConfig } from "../config.ts";

/** Whether the split prompt should be rendered in English (vs the French default). */
function isEnglish(language: CommitLanguage): boolean {
  return language === "en";
}

/** The `## Ticket` block: title, description, the optional PRD, and the image/Figma note. */
function buildTicketLines(ticket: Ticket, en: boolean): string[] {
  const figmaUrls = extractFigmaUrls(ticket.description);
  const figmaLines =
    figmaUrls.length > 0
      ? [en ? "Referenced Figma links:" : "Liens Figma référencés :", ...figmaUrls.map((url) => `- ${url}`)]
      : [];

  const prdLines =
    ticket.prdMarkdown !== null
      ? [
          "",
          en ? "## Validated PRD" : "## PRD validé",
          ticket.prdMarkdown,
        ]
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
        ...prdLines,
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
        ...prdLines,
      ];
}

/**
 * Builds the read-only split prompt injected into a worker-channel session: explore THIS repository
 * (read-only) and decompose the ticket into the minimal set of independently-implementable
 * sub-tickets, then return the decomposition by calling the `submit_split` worker tool.
 */
export function buildSplitChannelPrompt(
  ticket: Ticket,
  project: ProjectConfig,
  language: CommitLanguage,
): string {
  const en = isEnglish(language);

  const header = en
    ? [
        `# Ticket split — Ticket ${ticket.id}`,
        "",
        `Project: ${project.label} (base branch: ${project.baseBranch})`,
        "",
        "You are a READ-ONLY split session (only Read, Glob, Grep are available;",
        "Edit/Write/Bash are uncallable). Do not attempt to modify the repository.",
      ]
    : [
        `# Découpage de ticket — Ticket ${ticket.id}`,
        "",
        `Projet : ${project.label} (branche de base : ${project.baseBranch})`,
        "",
        "Tu es une session de découpage en LECTURE SEULE (seuls Read, Glob, Grep sont disponibles ;",
        "Edit/Write/Bash sont inappelables). N'essaie pas de modifier le dépôt.",
      ];

  const mission = en
    ? [
        "## Your mission",
        "Explore THIS repository (read-only) and decompose the ticket into the minimal set of",
        "independently-implementable sub-tickets. Aim for one user story = one ticket, but stay free:",
        "use as many or as few children as the work genuinely warrants.",
        "For each child, produce a concise title and a SELF-CONTAINED summary: it is the spec the child's",
        "implementer agent will read, with no access to this conversation — include the relevant context,",
        "scope, and acceptance criteria.",
        "Return the children SORTED IN IMPLEMENTATION ORDER (the order they should be built within their",
        "group, earlier dependencies first).",
        "Each child MAY nest its own `children` array to express a multi-level breakdown when the work",
        "genuinely warrants sub-grouping; a child with children becomes an intermediate integration node",
        "and its own children stack on it. Keep the tree as shallow as the work requires — prefer flat",
        "unless nesting adds real clarity.",
      ]
    : [
        "## Ta mission",
        "Explore CE dépôt (en lecture seule) et découpe le ticket en l'ensemble MINIMAL de sous-tickets",
        "implémentables indépendamment. Vise une user story = un ticket, mais reste libre :",
        "utilise autant de filles que le travail le justifie réellement.",
        "Pour chaque fille, produis un titre concis et une synthèse AUTONOME : c'est le cahier des charges",
        "que l'agent d'implémentation de la fille lira, sans accès à cette conversation — inclus le contexte",
        "pertinent, le périmètre et les critères d'acceptation.",
        "Renvoie les filles TRIÉES DANS L'ORDRE D'IMPLÉMENTATION (l'ordre dans lequel elles doivent être",
        "réalisées au sein de leur groupe, les dépendances d'abord).",
        "Chaque fille PEUT contenir son propre tableau `children` pour exprimer un découpage multi-niveaux",
        "quand le travail le justifie réellement ; une fille qui a des enfants devient un nœud d'intégration",
        "intermédiaire sur lequel ses propres enfants s'empilent. Garde l'arbre aussi plat que possible —",
        "préfère le plat sauf si l'imbrication apporte une réelle clarté.",
      ];

  const responseFormat = en
    ? [
        "## Response format",
        "When your analysis is done, call the `submit_split` tool (MCP `worker` server) with:",
        "- `summary`: a short overall summary of the decomposition rationale.",
        "- `children`: a non-empty list, in implementation order, of recursive nodes shaped",
        "  `{ title, summary, children }` where `children` is itself a (possibly empty) list of the same",
        "  shape (omit it or leave it empty for a leaf).",
        "Do not write the decomposition as text: only the `submit_split` call is taken into account.",
      ]
    : [
        "## Format de réponse",
        "Quand ton analyse est terminée, appelle le tool `submit_split` (serveur MCP `worker`) avec :",
        "- `summary` : un court résumé global de la logique de découpage.",
        "- `children` : une liste non vide, dans l'ordre d'implémentation, de nœuds récursifs de forme",
        "  `{ title, summary, children }` où `children` est elle-même une liste (éventuellement vide) de la",
        "  même forme (omets-la ou laisse-la vide pour une feuille).",
        "N'écris pas le découpage en texte : seul l'appel à `submit_split` est pris en compte.",
      ];

  const lines: string[] = [
    ...header,
    "",
    ...buildTicketLines(ticket, en),
    "",
    ...mission,
    "",
    ...responseFormat,
  ];

  return lines.filter((line) => line !== "").join("\n");
}
