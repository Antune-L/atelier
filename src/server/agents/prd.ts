import type { GeneratePrdInput } from "../../shared/schemas.ts";

/** Build the one-shot Agent SDK query prompt that produces (or revises) a PRD in markdown. */
export function buildPrdPrompt({ description, previousPrd, feedback }: GeneratePrdInput): string {
  const lines: string[] = [
    "Tu es chargé de rédiger un PRD (Product Requirements Document) complet et bien structuré.",
    "",
    "## Description du besoin",
    description.trim() || "(vide)",
    "",
    "La description peut référencer des chemins d'images locaux absolus (ex. /Users/.../uploads/xxx.png)",
    "que tu peux ouvrir avec l'outil Read pour mieux comprendre le besoin.",
  ];

  const previous = previousPrd?.trim();
  const note = feedback?.trim();
  if (previous && note) {
    lines.push(
      "",
      "## PRD précédent",
      previous,
      "",
      "## Retours à intégrer",
      note,
      "",
      "## Consigne",
      "Révise le PRD précédent en intégrant les retours ci-dessus.",
      "Produis l'intégralité du PRD révisé en markdown, pas seulement les modifications.",
    );
  } else {
    lines.push(
      "",
      "## Consigne",
      "Produis un PRD clair, structuré et complet en markdown à partir de la description.",
      "Couvre notamment : contexte/objectif, périmètre, exigences fonctionnelles, et critères d'acceptation.",
      "Reste fidèle au besoin : n'invente pas de fonctionnalités non demandées.",
    );
  }

  lines.push("Réponds UNIQUEMENT avec le markdown du PRD, sans préambule ni commentaire.");

  return lines.join("\n");
}
