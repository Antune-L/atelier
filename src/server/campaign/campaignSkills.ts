import { createHash } from "node:crypto";
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, isAbsolute, join, normalize, relative, sep } from "node:path";

import { z } from "zod";

import { CAMPAIGN_REQUIRED_SKILLS } from "../../shared/campaign.ts";
import type { CampaignSkillFingerprint } from "../../shared/campaign.ts";
import { SKILL_MANIFEST_FILE, SKILLZER_REPO_URL } from "../../shared/skills.ts";
import { runBoundedCommand } from "../system/boundedCommand.ts";

export const SKILLZER_PINNED_COMMIT = "8f3ccad6e73c4629c51c1ffed535009bf32eeac2";
const SKILLZER_SKILLS_DIR = "skills";
const MAX_SKILL_FILES = 200;
const MAX_SKILL_BYTES = 2_000_000;
const GIT_CLONE_TIMEOUT_MS = 120_000;

export type CampaignSkillName = (typeof CAMPAIGN_REQUIRED_SKILLS)[number];

export interface CampaignSkillRoots {
  /** Directories written on install, one per provider (Claude first). */
  install: readonly string[];
  /** Directories searched, in priority order. */
  search: readonly string[];
}

export function defaultCampaignSkillRoots(): CampaignSkillRoots {
  const home = homedir();
  const codexHome = process.env.CODEX_HOME || join(home, ".codex");
  const claude = join(home, ".claude", "skills");
  const agents = join(home, ".agents", "skills");
  return { install: [claude, agents], search: [claude, join(codexHome, "skills"), agents] };
}

export const skillFileSchema = z.object({
  path: z.string().trim().min(1).max(512),
  contentBase64: z.string().max(MAX_SKILL_BYTES * 2),
});
export type SkillFile = z.infer<typeof skillFileSchema>;

function listFiles(root: string, current = root): string[] {
  const entries = readdirSync(current).sort();
  const files: string[] = [];
  for (const entry of entries) {
    const path = join(current, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) files.push(...listFiles(root, path));
    else if (stat.isFile()) files.push(relative(root, path).split(sep).join("/"));
  }
  return files;
}

/** Content fingerprint of a skill folder: sha256 over sorted relative paths and file bytes. */
export function fingerprintSkillFiles(files: readonly { path: string; content: Buffer }[]): string {
  const hash = createHash("sha256");
  for (const file of [...files].sort((a, b) => a.path.localeCompare(b.path))) {
    hash.update(file.path);
    hash.update("\0");
    hash.update(createHash("sha256").update(file.content).digest("hex"));
    hash.update("\n");
  }
  return hash.digest("hex");
}

function readSkillDir(dir: string): { path: string; content: Buffer }[] {
  return listFiles(dir).map((path) => ({ path, content: readFileSync(join(dir, path)) }));
}

export function locateSkill(name: string, roots: CampaignSkillRoots): string | null {
  for (const root of roots.search) {
    const dir = join(root, name);
    if (existsSync(join(dir, SKILL_MANIFEST_FILE))) return dir;
  }
  return null;
}

/** Re-read each required skill from disk (FR14); a missing or unreadable skill falls back to internal guidance. */
export function readCampaignSkills(roots: CampaignSkillRoots): CampaignSkillFingerprint[] {
  return CAMPAIGN_REQUIRED_SKILLS.map((name) => {
    const dir = locateSkill(name, roots);
    if (dir === null) return { name, sha256: null, path: null, source: "internal" };
    try {
      return { name, sha256: fingerprintSkillFiles(readSkillDir(dir)), path: join(dir, SKILL_MANIFEST_FILE), source: "installed" };
    } catch {
      return { name, sha256: null, path: null, source: "internal" };
    }
  });
}

/** SKILL.md content to inject into a campaign session, or null when the internal guidance applies. */
export function readSkillInstructions(name: string, roots: CampaignSkillRoots): string | null {
  const dir = locateSkill(name, roots);
  if (dir === null) return null;
  try {
    return readFileSync(join(dir, SKILL_MANIFEST_FILE), "utf8");
  } catch {
    return null;
  }
}

function safeRelativePath(path: string): string | null {
  if (isAbsolute(path)) return null;
  const normalized = normalize(path);
  if (normalized.startsWith("..") || normalized.split(sep).includes("..")) return null;
  return normalized;
}

export const skillInstallOutcomeSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("installed"), name: z.string(), sha256: z.string(), paths: z.array(z.string()) }),
  z.object({ status: z.literal("unchanged"), name: z.string(), sha256: z.string(), paths: z.array(z.string()) }),
  z.object({ status: z.literal("conflict"), name: z.string(), installedSha256: z.string(), incomingSha256: z.string(), installedManifest: z.string(), incomingManifest: z.string() }),
  z.object({ status: z.literal("unavailable"), name: z.string(), reason: z.string() }),
  z.object({ status: z.literal("invalid"), name: z.string(), reason: z.string() }),
]);
export type SkillInstallOutcome = z.infer<typeof skillInstallOutcomeSchema>;

export interface SkillInstallRequest {
  name: string;
  files: readonly SkillFile[];
  /** Fingerprint of the installed version the user chose to replace after comparing (FR15). */
  replaceSha256?: string;
}

function decodeFiles(files: readonly SkillFile[]): { path: string; content: Buffer }[] | string {
  if (files.length === 0 || files.length > MAX_SKILL_FILES) return `A skill must hold between 1 and ${MAX_SKILL_FILES} files.`;
  const decoded: { path: string; content: Buffer }[] = [];
  let total = 0;
  for (const file of files) {
    const path = safeRelativePath(file.path);
    if (path === null) return `Unsafe skill file path: ${file.path}`;
    const content = Buffer.from(file.contentBase64, "base64");
    total += content.length;
    decoded.push({ path: path.split(sep).join("/"), content });
  }
  if (total > MAX_SKILL_BYTES) return `A skill must not exceed ${MAX_SKILL_BYTES} bytes.`;
  if (!decoded.some((file) => file.path === SKILL_MANIFEST_FILE)) return `The skill folder has no ${SKILL_MANIFEST_FILE}.`;
  if (new Set(decoded.map((file) => file.path)).size !== decoded.length) return "Duplicate skill file paths.";
  return decoded;
}

function manifestOf(files: readonly { path: string; content: Buffer }[]): string {
  return files.find((file) => file.path === SKILL_MANIFEST_FILE)?.content.toString("utf8") ?? "";
}

/** Copy a complete skill folder into every provider skill root; never overwrites a different version without an explicit choice. */
export function installSkillFiles(request: SkillInstallRequest, roots: CampaignSkillRoots): SkillInstallOutcome {
  if (!CAMPAIGN_REQUIRED_SKILLS.some((name) => name === request.name)) {
    return { status: "invalid", name: request.name, reason: `Only ${CAMPAIGN_REQUIRED_SKILLS.join(" and ")} can be installed for campaigns.` };
  }
  const decoded = decodeFiles(request.files);
  if (typeof decoded === "string") return { status: "invalid", name: request.name, reason: decoded };
  const incomingSha256 = fingerprintSkillFiles(decoded);
  const targets = roots.install.map((root) => join(root, request.name));
  for (const target of targets) {
    if (!existsSync(target)) continue;
    const installed = readSkillDir(target);
    const installedSha256 = fingerprintSkillFiles(installed);
    if (installedSha256 === incomingSha256) continue;
    if (request.replaceSha256 !== installedSha256) {
      return { status: "conflict", name: request.name, installedSha256, incomingSha256, installedManifest: manifestOf(installed), incomingManifest: manifestOf(decoded) };
    }
  }
  const changed = targets.filter((target) => !existsSync(target) || fingerprintSkillFiles(readSkillDir(target)) !== incomingSha256);
  for (const target of changed) {
    if (existsSync(target) && lstatSync(target).isSymbolicLink()) rmSync(target, { force: true });
    else rmSync(target, { recursive: true, force: true });
    for (const file of decoded) {
      const path = join(target, file.path);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, file.content);
    }
  }
  return { status: changed.length > 0 ? "installed" : "unchanged", name: request.name, sha256: incomingSha256, paths: targets };
}

/** Read a skill folder from skillzer at the pinned commit; null when the skill does not exist there. */
export async function fetchSkillzerSkill(name: string, commit = SKILLZER_PINNED_COMMIT): Promise<SkillFile[] | null> {
  const dir = mkdtempSync(join(tmpdir(), "kanban-skillzer-"));
  try {
    const clone = await runBoundedCommand(["git", "clone", "--quiet", "--filter=blob:none", "--no-checkout", SKILLZER_REPO_URL, dir], tmpdir(), { timeoutMs: GIT_CLONE_TIMEOUT_MS });
    if (clone.exitCode !== 0 || clone.timedOut) throw new Error(`skillzer clone failed: ${clone.stderr.trim() || clone.stdout.trim()}`);
    const skillPath = `${SKILLZER_SKILLS_DIR}/${name}`;
    const listing = await runBoundedCommand(["git", "-C", dir, "ls-tree", "-r", "--name-only", commit, "--", skillPath], dir);
    if (listing.exitCode !== 0) throw new Error(`skillzer commit ${commit} is not readable: ${listing.stderr.trim()}`);
    const paths = listing.stdout.split("\n").map((line) => line.trim()).filter(Boolean);
    if (paths.length === 0) return null;
    const checkout = await runBoundedCommand(["git", "-C", dir, "checkout", "--quiet", commit, "--", skillPath], dir, { timeoutMs: GIT_CLONE_TIMEOUT_MS });
    if (checkout.exitCode !== 0 || checkout.timedOut) throw new Error(`skillzer checkout failed: ${checkout.stderr.trim()}`);
    const root = realpathSync(join(dir, skillPath));
    return readSkillDir(root).map((file) => ({ path: file.path, contentBase64: file.content.toString("base64") }));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** Skill folders verified in skillzer at the pinned commit (`git ls-tree 8f3ccad skills/`, 2026-11-07). */
const KNOWN_SKILLZER_SKILLS: Record<string, readonly string[]> = {
  [SKILLZER_PINNED_COMMIT]: ["argus-review", "athena-analysis", "audit-agents-skills", "code-review", "coding-convention", "minos-pr-feedback", "prd", "regression-check", "ts-search-first"],
};

export function skillzerListsSkill(name: string, commit = SKILLZER_PINNED_COMMIT): boolean {
  return KNOWN_SKILLZER_SKILLS[commit]?.includes(name) ?? false;
}
