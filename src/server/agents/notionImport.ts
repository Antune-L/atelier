/** Build the one-shot Agent SDK query prompt that reads a Notion card and synthesizes its problem as markdown. */
export function buildNotionImportPrompt(url: string): string {
  const lines: string[] = [
    "Tu es chargé de lire une carte Notion et d'en produire une synthèse markdown du problème.",
    "",
    "## Carte Notion à lire",
    url,
    "",
    "## Outils",
    "Le serveur MCP `notion` est déjà connecté : utilise ses outils pour ouvrir et lire la page Notion ci-dessus.",
    "Si l'URL n'est pas joignable ou n'est pas une page Notion, réponds par une courte note markdown l'indiquant.",
    "",
    "## Données à extraire",
    "- Le titre de la carte.",
    "- TOUTES les propriétés/champs disponibles (statut, dates, assignés, tags, priorité, liens…).",
    "- L'intégralité du contenu du corps de la page.",
    "- TOUS les commentaires de la page : ils sont LA PARTIE LA PLUS IMPORTANTE, reproduis-les fidèlement en les citant.",
    "- Tout lien de maquette/design trouvé (ex. Figma).",
    "",
    "## Consigne",
    "Produis une synthèse claire et structurée du problème, en markdown français, prête à être ajoutée à la description d'un ticket.",
    "Commence par un titre de niveau 2 `## Import Notion`, puis des sous-sections : Champs, Contenu, Commentaires, Maquettes/Liens.",
    "Réponds UNIQUEMENT avec le markdown, sans préambule ni commentaire final.",
  ];

  return lines.join("\n");
}
