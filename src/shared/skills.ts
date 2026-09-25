export const SKILLZER_REPO_URL = "https://github.com/Antune-L/skillzer";

export const SKILL_TIERS = ["required", "recommended"] as const;
export type SkillTier = (typeof SKILL_TIERS)[number];

export interface SkillRequirement {
  /** Directory name under `~/.claude/skills/` (the host skill folder holding `SKILL.md`). */
  name: string;
  /** `required`: invoked by the pipeline contract. `recommended`: cited by the host CLAUDE.md merged into sessions. */
  tier: SkillTier;
  /** Short French label shown to the user explaining what the skill is used for. */
  purpose: string;
  /** Install hint when the skill is not published in the skillzer repo (null → `npx skills add` from skillzer). */
  installHint: string | null;
}

/**
 * Host skills the app depends on. The `required` ones mirror CONTRACT_SKILLS in
 * src/server/agents/sessionConfig.ts and must stay in sync with it.
 */
export const SKILL_REQUIREMENTS: readonly SkillRequirement[] = [
  { name: "argus-review", tier: "required", purpose: "Review bloquante avant PR (étape reviewing)", installHint: null },
  { name: "regression-check", tier: "required", purpose: "Carte des consommateurs après modification", installHint: null },
  { name: "minos-pr-feedback", tier: "required", purpose: "Triage des commentaires de PR (GitHub uniquement)", installHint: null },
  {
    name: "mockup-fidelity-review",
    tier: "required",
    purpose: "Comparaison aux maquettes (tickets verifyFeature)",
    installHint: "absent de skillzer : à copier dans ~/.claude/skills",
  },
  {
    name: "simplifier",
    tier: "recommended",
    purpose: "Passe de simplification après chaque implémentation",
    installHint: "skill officiel Claude, à installer via /plugin",
  },
  { name: "coding-convention", tier: "recommended", purpose: "Conventions imposées par CLAUDE.md", installHint: null },
  { name: "ts-search-first", tier: "recommended", purpose: "Réutilisation avant tout nouveau code", installHint: null },
  { name: "prd", tier: "recommended", purpose: "Rédaction de PRD hors app", installHint: null },
];

export function skillzerInstallCommand(name: string): string {
  return `npx skills add Antune-L/skillzer/skills/${name}`;
}
