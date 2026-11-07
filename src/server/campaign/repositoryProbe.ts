import { z } from "zod";

import { runBoundedCommand, safeJsonParse } from "../system/boundedCommand.ts";
import { runGithubCommand } from "../system/github/accountEnv.ts";
import { readGithubRepoRef } from "../system/vcs/github.ts";

const GH_BINARY = "gh";
const WORKFLOWS_DIR = ".github/workflows";
const WORKFLOW_EXTENSIONS = [".yml", ".yaml"];
const PULL_REQUEST_EVENTS = ["pull_request", "pull_request_target"];
const BASE_PROTECTION_RULES = ["pull_request", "non_fast_forward", "update", "deletion", "required_status_checks"];

export type CiPresence = "present" | "absent" | "unknown";
export type ProtectionState = "protected" | "unprotected" | "unknown";

export interface CampaignRepositoryInspection {
  repository: { ok: boolean; cause: string | null };
  baseProtection: ProtectionState;
  motherRules: { known: boolean; requiresApproval: boolean; mergeQueue: boolean; cause: string | null };
  ci: { presence: CiPresence; workflows: string[]; cause: string | null };
  baseRevision: string | null;
}

export interface CampaignRepositoryProbe {
  inspect(repoPath: string, baseBranch: string, motherBranch: string): Promise<CampaignRepositoryInspection>;
}

const branchSchema = z.object({ protected: z.boolean() });
const rulesSchema = z.array(z.object({
  type: z.string(),
  parameters: z.record(z.string(), z.unknown()).optional(),
}));
const pullRequestParametersSchema = z.object({ required_approving_review_count: z.number().optional() });

function globToRegExp(pattern: string): RegExp {
  let source = "";
  for (let index = 0; index < pattern.length; index += 1) {
    const char = pattern[index] ?? "";
    if (char === "*" && pattern[index + 1] === "*") {
      source += ".*";
      index += 1;
    } else if (char === "*") {
      source += "[^/]*";
    } else {
      source += char.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
    }
  }
  return new RegExp(`^${source}$`);
}

/** GitHub branch filter semantics: later `!pattern` entries exclude what earlier ones included. */
export function branchMatchesFilters(branch: string, filters: readonly string[]): boolean {
  let matched = false;
  for (const filter of filters) {
    if (filter.startsWith("!")) {
      if (globToRegExp(filter.slice(1)).test(branch)) matched = false;
    } else if (globToRegExp(filter).test(branch)) {
      matched = true;
    }
  }
  return matched;
}

const stringListSchema = z.union([z.string(), z.array(z.string())]).transform((value) => (typeof value === "string" ? [value] : value));
const eventFilterSchema = z.object({
  branches: stringListSchema.optional(),
  "branches-ignore": stringListSchema.optional(),
}).passthrough().nullable();

/** Whether a parsed workflow runs on pull requests that target `branch`. */
export function workflowRunsOnPullRequestsTo(workflow: unknown, branch: string): boolean {
  if (typeof workflow !== "object" || workflow === null || !("on" in workflow)) return false;
  const trigger: unknown = workflow.on;
  if (typeof trigger === "string") return PULL_REQUEST_EVENTS.includes(trigger);
  if (Array.isArray(trigger)) return trigger.some((event) => typeof event === "string" && PULL_REQUEST_EVENTS.includes(event));
  if (typeof trigger !== "object" || trigger === null) return false;
  return PULL_REQUEST_EVENTS.some((event) => {
    if (!(event in trigger)) return false;
    const parsed = eventFilterSchema.safeParse(Object.entries(trigger).find(([key]) => key === event)?.[1] ?? null);
    if (!parsed.success || parsed.data === null) return true;
    const include = parsed.data.branches;
    const ignore = parsed.data["branches-ignore"];
    if (include !== undefined) return branchMatchesFilters(branch, include);
    if (ignore !== undefined) return !branchMatchesFilters(branch, ignore);
    return true;
  });
}

async function ghApi(repoPath: string, host: string, endpoint: string): Promise<{ ok: true; data: unknown } | { ok: false; notFound: boolean; detail: string }> {
  const result = await runGithubCommand([GH_BINARY, "api", endpoint, "--hostname", host], repoPath);
  if (result.exitCode === 0 && !result.timedOut) return { ok: true, data: safeJsonParse(result.stdout) };
  const detail = `${result.stderr} ${result.stdout}`.trim();
  return { ok: false, notFound: /HTTP 404|Not Found/i.test(detail), detail };
}

async function readCi(repoPath: string, baseBranch: string, motherBranch: string): Promise<CampaignRepositoryInspection["ci"]> {
  const ref = `origin/${baseBranch}`;
  const listing = await runBoundedCommand(["git", "-C", repoPath, "ls-tree", "--name-only", `${ref}:${WORKFLOWS_DIR}`], repoPath);
  if (listing.exitCode !== 0) {
    return /not a tree object|does not exist|Not a valid object name/i.test(listing.stderr)
      ? { presence: "absent", workflows: [], cause: `No ${WORKFLOWS_DIR} directory on ${baseBranch}.` }
      : { presence: "unknown", workflows: [], cause: listing.stderr.trim() || "Workflows could not be listed." };
  }
  const files = listing.stdout.split("\n").map((line) => line.trim()).filter((name) => WORKFLOW_EXTENSIONS.some((extension) => name.endsWith(extension)));
  const matching: string[] = [];
  for (const file of files) {
    const content = await runBoundedCommand(["git", "-C", repoPath, "show", `${ref}:${WORKFLOWS_DIR}/${file}`], repoPath);
    if (content.exitCode !== 0) return { presence: "unknown", workflows: matching, cause: `Workflow ${file} could not be read.` };
    try {
      if (workflowRunsOnPullRequestsTo(Bun.YAML.parse(content.stdout), motherBranch)) matching.push(file);
    } catch {
      return { presence: "unknown", workflows: matching, cause: `Workflow ${file} is not valid YAML.` };
    }
  }
  return matching.length > 0
    ? { presence: "present", workflows: matching, cause: null }
    : { presence: "absent", workflows: [], cause: `No workflow runs on pull requests targeting ${motherBranch}.` };
}

/** Reads repository facts with `gh` and the local clone; never merges or writes. */
export class GithubCampaignRepositoryProbe implements CampaignRepositoryProbe {
  async inspect(repoPath: string, baseBranch: string, motherBranch: string): Promise<CampaignRepositoryInspection> {
    const failed = (cause: string): CampaignRepositoryInspection => ({
      repository: { ok: false, cause },
      baseProtection: "unknown",
      motherRules: { known: false, requiresApproval: false, mergeQueue: false, cause },
      ci: { presence: "unknown", workflows: [], cause },
      baseRevision: null,
    });
    let ref;
    try {
      ref = await readGithubRepoRef(repoPath);
    } catch (error) {
      return failed(error instanceof Error ? error.message : String(error));
    }
    const fetch = await runBoundedCommand(["git", "-C", repoPath, "fetch", "--quiet", "origin", baseBranch], repoPath);
    if (fetch.exitCode !== 0 || fetch.timedOut) return failed(`git fetch origin ${baseBranch} failed: ${fetch.stderr.trim()}`);
    const revision = await runBoundedCommand(["git", "-C", repoPath, "rev-parse", `origin/${baseBranch}`], repoPath);
    const repoPathApi = `repos/${encodeURIComponent(ref.owner)}/${encodeURIComponent(ref.repository)}`;
    const [branch, baseRules, motherRules, ci] = await Promise.all([
      ghApi(repoPath, ref.host, `${repoPathApi}/branches/${encodeURIComponent(baseBranch)}`),
      ghApi(repoPath, ref.host, `${repoPathApi}/rules/branches/${encodeURIComponent(baseBranch)}`),
      ghApi(repoPath, ref.host, `${repoPathApi}/rules/branches/${encodeURIComponent(motherBranch)}`),
      readCi(repoPath, baseBranch, motherBranch),
    ]);
    if (!branch.ok) return failed(`Repository ${ref.owner}/${ref.repository} or branch ${baseBranch} is not readable: ${branch.detail}`);
    const classic = branchSchema.safeParse(branch.data);
    const baseRuleList = baseRules.ok ? rulesSchema.safeParse(baseRules.data) : null;
    const hasBaseRules = baseRuleList?.success === true && baseRuleList.data.some((rule) => BASE_PROTECTION_RULES.includes(rule.type));
    let baseProtection: ProtectionState = "unknown";
    if ((classic.success && classic.data.protected) || hasBaseRules) baseProtection = "protected";
    else if (classic.success && baseRuleList?.success === true) baseProtection = "unprotected";
    const motherRuleList = motherRules.ok ? rulesSchema.safeParse(motherRules.data) : null;
    const mother = motherRuleList?.success === true
      ? {
        known: true,
        requiresApproval: motherRuleList.data.some((rule) => rule.type === "pull_request" && (pullRequestParametersSchema.safeParse(rule.parameters ?? {}).data?.required_approving_review_count ?? 0) > 0),
        mergeQueue: motherRuleList.data.some((rule) => rule.type === "merge_queue"),
        cause: null,
      }
      : { known: false, requiresApproval: false, mergeQueue: false, cause: motherRules.ok ? "Unexpected rules response." : motherRules.detail };
    return {
      repository: { ok: true, cause: null },
      baseProtection,
      motherRules: mother,
      ci,
      baseRevision: revision.exitCode === 0 ? revision.stdout.trim() : null,
    };
  }
}

export interface FakeRepositoryState {
  inspection?: Partial<CampaignRepositoryInspection>;
}

/** Dry-run probe: a protected main, an unrestricted mother branch and CI on mother pull requests. */
export class FakeCampaignRepositoryProbe implements CampaignRepositoryProbe {
  constructor(private readonly state: FakeRepositoryState = {}) {}

  inspect(): Promise<CampaignRepositoryInspection> {
    return Promise.resolve({
      repository: { ok: true, cause: null },
      baseProtection: "protected",
      motherRules: { known: true, requiresApproval: false, mergeQueue: false, cause: null },
      ci: { presence: "present", workflows: ["ci.yml"], cause: null },
      baseRevision: "0".repeat(40),
      ...this.state.inspection,
    });
  }
}
