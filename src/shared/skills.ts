import { ORCHESTRATORS } from "./constants.ts";
import type { Orchestrator } from "./constants.ts";

export const SKILLZER_REPO_URL = "https://github.com/Antune-L/skillzer";

export const SKILL_MANIFEST_FILE = "SKILL.md";
export const COOLIFY_PREPARATION_MARKER = "[coolify-preview-setup:v1]";
export const COOLIFY_PREPARATION_SKILL = "coolify-preview-setup";

export const HOST_SKILL_ROOTS: Record<Orchestrator, readonly string[]> = {
  claude: ["~/.claude/skills"],
  codex: ["~/.codex/skills", "~/.agents/skills"],
};

/** `skills` CLI agent ids targeted by the install command, one per provider. */
const SKILLS_CLI_AGENTS: Record<Orchestrator, string> = {
  claude: "claude-code",
  codex: "codex",
};

/** Host skill invoked by the pipeline contract. */
export interface SkillRequirement {
  /** Directory name under each provider's host skill root (the folder holding `SKILL.md`). */
  name: string;
  /** Short French label shown to the user explaining what the skill is used for. */
  purpose: string;
  /** French install hint, for both providers, when the skill is not published in skillzer (null → `npx skills add` from skillzer). */
  installHint: string | null;
}

/**
 * Host skills invoked by the pipeline contract. Must mirror CONTRACT_SKILLS in
 * src/server/agents/sessionConfig.ts.
 */
export const SKILL_REQUIREMENTS: readonly SkillRequirement[] = [
  { name: "argus-review", purpose: "Review bloquante avant PR (étape reviewing)", installHint: null },
  { name: "regression-check", purpose: "Carte des consommateurs après modification", installHint: null },
  { name: "minos-pr-feedback", purpose: "Triage des commentaires de PR (GitHub uniquement)", installHint: null },
  {
    name: "mockup-fidelity-review",
    purpose: "Comparaison aux maquettes (tickets verifyFeature)",
    installHint: "absent de skillzer : à copier dans ~/.claude/skills et ~/.agents/skills",
  },
];

export function skillzerInstallCommand(name: string): string {
  const agents = Object.values(SKILLS_CLI_AGENTS).join(",");
  return `npx skills add Antune-L/skillzer/skills/${name} -g -a ${agents} -y`;
}

/** Manifest paths where a provider would detect the skill, as displayed to the user. */
export function expectedSkillPaths(name: string, provider: Orchestrator, roots = HOST_SKILL_ROOTS[provider]): string[] {
  return roots.map((root) => `${root}/${name}/${SKILL_MANIFEST_FILE}`);
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
