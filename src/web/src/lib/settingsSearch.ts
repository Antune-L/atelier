import { matchesQuery, normalizeSearch } from "./search";
import { THEME_PALETTES } from "./theme";

export const SETTINGS_CATEGORIES = [
  "Apparence",
  "Projets",
  "Agents",
  "Qualité",
  "Intégrations",
  "MCP et accès distants",
  "Liaison des boards",
  "Serveur VPS",
] as const;
export type SettingsCategory = (typeof SETTINGS_CATEGORIES)[number];

export type SettingsSectionId =
  | "vps"
  | "appearance"
  | "defaults"
  | "quality"
  | "profiles"
  | "projects"
  | "providers"
  | "skills"
  | "coolify"
  | "github"
  | "mcp"
  | "remoteMcp"
  | "boardLink";

export interface SettingsSection {
  id: SettingsSectionId;
  label: string;
  category: SettingsCategory;
  aliases?: string[];
  cloudOnly?: true;
  keywords: string[];
}

export const SETTINGS_SECTIONS: SettingsSection[] = [
  { id: "vps", label: "Serveur VPS", category: "Serveur VPS", cloudOnly: true, keywords: ["mise à jour", "vps", "serveur", "redémarrage"] },
  {
    id: "appearance",
    label: "Apparence",
    category: "Apparence",
    keywords: [
      "thème", "clair", "sombre", "deep ocean", "couleurs", "interface", "palette",
      ...THEME_PALETTES.flatMap((palette) => [palette.label, palette.value]),
    ],
  },
  {
    id: "defaults",
    label: "Par défaut",
    category: "Agents",
    aliases: ["Agents par défaut"],
    keywords: [
      "modèle",
      "effort",
      "langue",
      "triage",
      "faisabilité",
      "analyse préalable",
      "livraison",
      "implémentation",
      "commit",
      "pull request",
      "étape",
    ],
  },
  {
    id: "quality",
    label: "Qualité",
    category: "Qualité",
    keywords: ["contrôles", "relecture", "validation", "responsable", "poste", "vps", "devin"],
  },
  {
    id: "profiles",
    label: "Profils",
    category: "Agents",
    keywords: ["profil", "orchestrateur", "implémenteur", "préréglage", "sous-agent", "sessions déléguées", "personnaliser"],
  },
  {
    id: "projects",
    label: "Projets",
    category: "Projets",
    keywords: [
      "projet",
      "dépôt",
      "branche",
      "scripts",
      "merge automatique",
      "fournisseur",
      "github",
      "azure devops",
      "connexion",
      "tester la connexion",
      "token GitHub",
      "jeton GitHub",
      "authentification GitHub",
    ],
  },
  {
    id: "providers",
    label: "Fournisseurs",
    category: "Agents",
    keywords: ["codex", "claude", "composer", "cursor", "connexion", "fast", "statut", "détection", "mode rapide", "effort Codex", "modèle Codex", "effort", "modèle"],
  },
  {
    id: "skills",
    label: "Skills",
    category: "Agents",
    keywords: ["skill", "skills", "argus", "skillzer", "claude code", "codex", "détection", "compétences", "installation", "dossiers", "chemins"],
  },
  {
    id: "github",
    label: "Comptes GitHub",
    category: "Intégrations",
    keywords: ["github", "compte", "token", "jeton", "gh", "organisation", "sso", "clone", "permissions", "stockage", "jeton d’accès", "read:org"],
  },
  {
    id: "mcp",
    label: "Connecter un outil",
    category: "MCP et accès distants",
    aliases: ["MCP"],
    keywords: ["mcp", "agent", "jeton", "token", "connexion", "adresse", "serveur", "outil", "client", "renouveler", "maintenance", "copier", "secret", "jeton d’accès", "adresse de connexion"],
  },
  {
    id: "boardLink",
    label: "Liaison des boards",
    category: "Liaison des boards",
    keywords: ["autre board", "mac", "vps", "adresse", "url", "nom du board", "alias SSH", "ssh", "nom public", "tunnel", "cloudflare", "téléphone"],
  },
  {
    id: "remoteMcp",
    label: "Cartes entrantes",
    category: "MCP et accès distants",
    aliases: ["MCP distant"],
    keywords: ["mcp", "distant", "remote", "projets autorisés", "profil des cartes distantes", "approbation", "VPS"],
  },
  {
    id: "coolify",
    label: "Coolify",
    category: "Intégrations",
    keywords: ["prévisualisation", "preview", "déploiement", "serveur", "github", "jeton", "mot de passe", "destination", "protection", "identifiants", "domaine", "environnement", "alias SSH", "GitHub App", "projet Coolify", "adresse Coolify", "domaine des prévisualisations", "nom d’utilisateur", "ssh", "alias", "nettoyage"],
  },
];

function sectionNames(section: SettingsSection): string[] {
  return [section.category, section.label, ...(section.aliases ?? [])];
}

export function sectionNameMatches(section: SettingsSection, query: string): boolean {
  return matchesQuery(query, ...sectionNames(section));
}

export function visibleSettingsSections(cloudHost: boolean): SettingsSection[] {
  return SETTINGS_SECTIONS.filter((section) => cloudHost || section.cloudOnly !== true);
}

export function categorySections(sections: readonly SettingsSection[], category: SettingsCategory): SettingsSection[] {
  return sections.filter((section) => section.category === category);
}

export function settingsSection(id: SettingsSectionId): SettingsSection | undefined {
  return SETTINGS_SECTIONS.find((section) => section.id === id);
}

export function sectionMatches(section: SettingsSection, query: string): boolean {
  return matchesQuery(query, ...sectionNames(section), ...section.keywords);
}

export function matchingSettingsSection(
  query: string,
  sections: readonly SettingsSection[] = SETTINGS_SECTIONS,
): SettingsSectionId | undefined {
  const normalizedQuery = normalizeSearch(query);
  const nameMatch = sections.find((section) => sectionNameMatches(section, normalizedQuery));
  if (nameMatch !== undefined) return nameMatch.id;
  return sections.find((section) => sectionMatches(section, normalizedQuery))?.id;
}
