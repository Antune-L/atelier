import { matchesQuery, normalizeSearch } from "./search";
import { THEME_PALETTES } from "./theme";

export const SETTINGS_GROUPS = ["Application", "Connexions"] as const;
export type SettingsGroup = (typeof SETTINGS_GROUPS)[number];

export type SettingsSectionId =
  | "appearance"
  | "defaults"
  | "quality"
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
    keywords: [
      "thème", "clair", "sombre", "deep ocean", "couleurs", "interface", "palette",
      ...THEME_PALETTES.flatMap((palette) => [palette.label, palette.value]),
    ],
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
    group: "Application",
    keywords: ["contrôles", "relecture", "validation", "responsable", "poste", "vps", "devin"],
  },
  {
    id: "profiles",
    label: "Profils",
    group: "Application",
    keywords: ["profil", "orchestrateur", "implémenteur", "préréglage", "sous-agent", "sessions déléguées", "personnaliser"],
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
    keywords: ["codex", "claude", "composer", "cursor", "connexion", "fast", "statut", "détection", "mode rapide", "effort Codex", "modèle Codex", "effort", "modèle"],
  },
  {
    id: "skills",
    label: "Skills",
    group: "Connexions",
    keywords: ["skill", "skills", "argus", "skillzer", "claude code", "codex", "détection", "compétences", "installation", "dossiers", "chemins"],
  },
  {
    id: "github",
    label: "Comptes GitHub",
    group: "Connexions",
    keywords: ["github", "compte", "token", "jeton", "gh", "organisation", "sso", "clone", "permissions", "stockage", "jeton d’accès", "read:org"],
  },
  {
    id: "mcp",
    label: "MCP",
    group: "Connexions",
    keywords: ["mcp", "agent", "jeton", "token", "connexion", "adresse", "serveur", "outil", "client", "renouveler", "maintenance", "copier", "secret", "jeton d’accès", "adresse de connexion"],
  },
  {
    id: "coolify",
    label: "Coolify",
    group: "Connexions",
    keywords: ["prévisualisation", "preview", "déploiement", "serveur", "github", "jeton", "mot de passe", "destination", "protection", "identifiants", "domaine", "environnement", "alias SSH", "GitHub App", "projet Coolify", "adresse Coolify", "domaine des prévisualisations", "nom d’utilisateur", "ssh", "alias", "nettoyage"],
  },
];

export function sectionMatches(section: SettingsSection, query: string): boolean {
  return matchesQuery(query, section.label, ...section.keywords);
}

export function matchingSettingsSection(query: string): SettingsSectionId | undefined {
  const normalizedQuery = normalizeSearch(query);
  const labelMatch = SETTINGS_SECTIONS.find((section) => matchesQuery(normalizedQuery, section.label));
  if (labelMatch !== undefined) return labelMatch.id;
  return SETTINGS_SECTIONS.find((section) => sectionMatches(section, normalizedQuery))?.id;
}
