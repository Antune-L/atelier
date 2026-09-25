import { ORCHESTRATORS } from "./constants.ts";
import type { Orchestrator } from "./constants.ts";

export const SKILLZER_REPO_URL = "https://github.com/Antune-L/skillzer";

export const SKILL_MANIFEST_FILE = "SKILL.md";

/**
 * Host (user-level) skill roots each agent provider reads, as displayed to the user. Codex reads
 * `$CODEX_HOME/skills` (default `~/.codex/skills`, deprecated but still scanned) and `~/.agents/skills`.
 */
export const HOST_SKILL_ROOTS: Record<Orchestrator, readonly string[]> = {
  claude: ["~/.claude/skills"],
  codex: ["~/.codex/skills", "~/.agents/skills"],
};

/** `skills` CLI agent ids targeted by the install command, one per provider. */
const SKILLS_CLI_AGENTS: Record<Orchestrator, string> = {
  claude: "claude-code",
  codex: "codex",
};

export const SKILL_TIERS = ["required", "recommended"] as const;
export type SkillTier = (typeof SKILL_TIERS)[number];

export interface SkillRequirement {
  /** Directory name under each provider's host skill root (the folder holding `SKILL.md`). */
  name: string;
  /** `required`: invoked by the pipeline contract. `recommended`: cited by the host CLAUDE.md merged into sessions. */
  tier: SkillTier;
  /** Short French label shown to the user explaining what the skill is used for. */
  purpose: string;
  /** French install hint, for both providers, when the skill is not published in skillzer (null → `npx skills add` from skillzer). */
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
    installHint: "absent de skillzer : à copier dans ~/.claude/skills et ~/.agents/skills",
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
  const agents = Object.values(SKILLS_CLI_AGENTS).join(",");
  return `npx skills add Antune-L/skillzer/skills/${name} -g -a ${agents} -y`;
}

/** Manifest paths where a provider would detect the skill, as displayed to the user. */
export function expectedSkillPaths(name: string, provider: Orchestrator): string[] {
  return HOST_SKILL_ROOTS[provider].map((root) => `${root}/${name}/${SKILL_MANIFEST_FILE}`);
}

/** Providers among `providers` whose host skill roots lack the skill. */
export function missingSkillProviders(
  installed: Record<Orchestrator, boolean>,
  providers: readonly Orchestrator[] = ORCHESTRATORS,
): Orchestrator[] {
  return providers.filter((provider) => !installed[provider]);
}

/** Providers whose runtime is detected on this Mac, from the capability flags. */
export function availableSkillProviders(flags: { claudeAvailable: boolean; codexAvailable: boolean }): Orchestrator[] {
  const available: Record<Orchestrator, boolean> = { claude: flags.claudeAvailable, codex: flags.codexAvailable };
  return ORCHESTRATORS.filter((provider) => available[provider]);
}
