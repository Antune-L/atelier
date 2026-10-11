import { matchesQuery, normalizeSearch } from "./search";

export const SETTINGS_GROUPS = ["Application", "Connexions"] as const;
export type SettingsGroup = (typeof SETTINGS_GROUPS)[number];

export type SettingsSectionId =
  | "appearance"
  | "defaults"
  | "profiles"
  | "projects"
  | "providers"
  | "skills"
  | "coolify"
  | "github"
  | "mcp";

export interface SettingsSection {
  id: SettingsSectionId;
  label: string;
  group: SettingsGroup;
  keywords: string[];
}

export const SETTINGS_SECTIONS: SettingsSection[] = [
  {
    id: "appearance",
    label: "Apparence",
    group: "Application",
    keywords: ["thème", "clair", "sombre", "deep ocean", "couleurs", "interface"],
  },
  {
    id: "defaults",
    label: "Agents par défaut",
    group: "Application",
    keywords: [
      "modèle",
      "effort",
      "langue",
      "triage",
      "faisabilité",
      "implémentation",
      "commit",
      "pull request",
      "étape",
    ],
  },
  {
    id: "profiles",
    label: "Profils",
    group: "Application",
    keywords: ["profil", "orchestrateur", "implémenteur", "préréglage", "sous-agent"],
  },
  {
    id: "projects",
    label: "Projets",
    group: "Application",
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
    group: "Connexions",
    keywords: ["codex", "claude", "composer", "cursor", "connexion", "fast", "statut", "détection"],
  },
  {
    id: "skills",
    label: "Skills",
    group: "Connexions",
    keywords: ["skill", "skills", "argus", "simplifier", "skillzer", "claude code", "codex", "détection"],
  },
  {
    id: "github",
    label: "Comptes GitHub",
    group: "Connexions",
    keywords: ["github", "compte", "token", "jeton", "gh", "organisation", "sso", "clone"],
  },
  {
    id: "mcp",
    label: "MCP",
    group: "Connexions",
    keywords: ["mcp", "agent", "jeton", "token", "connexion", "adresse", "serveur"],
  },
  {
    id: "coolify",
    label: "Coolify",
    group: "Connexions",
    keywords: ["prévisualisation", "preview", "déploiement", "serveur", "github", "jeton", "mot de passe"],
  },
];

export function sectionMatches(section: SettingsSection, query: string): boolean {
  return matchesQuery(query, section.label, ...section.keywords);
}

export function matchingSettingsSection(query: string): SettingsSectionId | undefined {
  return SETTINGS_SECTIONS.find((section) => sectionMatches(section, normalizeSearch(query)))?.id;
}
