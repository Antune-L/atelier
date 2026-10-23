import { boundedCommandDetail, runBoundedCommand } from "./boundedCommand.ts";
import type { BoundedCommandResult } from "./boundedCommand.ts";
import { readGithubRepoRef } from "./vcs/github.ts";

export interface AuditRangeCommit {
  sha: string;
  subject: string;
  body: string;
  prNumber: number | null;
}

export interface AuditChunkPart {
  index: number;
  total: number;
}

export interface AuditRangeChunk {
  index: number;
  baseSha: string;
  headSha: string;
  commits: AuditRangeCommit[];
  diff: string;
  files: string[];
  skipped: Array<{ path: string; reason: string }>;
  part: AuditChunkPart | null;
}

export interface AuditRange {
  status: "ok" | "no_changes" | "rewritten";
  baseSha: string | null;
  tipSha: string;
  githubRepositoryUrl: string | null;
  chunks: AuditRangeChunk[];
  deferredCommitCount: number;
}

export interface AuditRangeInput {
  cwd: string;
  baseSha: string | null;
  bootstrapHours: number;
  maxChunkChars: number;
  maxChunks: number;
  maxUnitDiffChars: number;
}

const AUDIT_EMPTY_TREE_SHA = "4b825dc642cb6eb9a060e54bf8d69288fbee4904";

const AUDIT_IGNORED_PATHSPECS = [
  ":(exclude,glob)**/*.lock",
  ":(exclude,glob)**/bun.lock",
  ":(exclude,glob)**/pnpm-lock.yaml",
  ":(exclude,glob)**/package-lock.json",
  ":(exclude,glob)**/yarn.lock",
  ":(exclude,glob)**/snapshot.json",
  ":(exclude,glob)**/*.snap",
  ":(exclude,glob)**/*.gen.ts",
  ":(exclude,glob)**/paraglide/**",
  ":(exclude,glob)**/generated/**",
  ":(exclude,glob)**/dist/**",
  ":(exclude,glob)**/.turbo/**",
  ":(exclude,glob)**/node_modules/**",
  ":(exclude,glob)**/graphify-out/**",
] as const;

const PR_REFERENCE_PATTERN = /\(#(\d+)\)|Merge pull request #(\d+)/;

function auditPrNumber(subject: string): number | null {
  const match = PR_REFERENCE_PATTERN.exec(subject);
  const digits = match?.[1] ?? match?.[2];
  return digits === undefined ? null : Number(digits);
}

export function truncateAuditDiff(diff: string, maxChars: number): string {
  if (diff.length <= maxChars) return diff;
  const cut = diff.lastIndexOf("\n", maxChars);
  const kept = diff.slice(0, cut > 0 ? cut : maxChars);
  return `${kept}\n[diff truncated: ${diff.length - kept.length} characters omitted; read the changed files listed above in the worktree]\n`;
}

const AUDIT_GIT_TIMEOUT_MS = 60_000;
const BOOTSTRAP_WINDOW_UNIT = "hours ago";
const LOG_FIELD_SEPARATOR = "\x1f";
const LOG_RECORD_SEPARATOR = "\x1e";

const SHORT_SHA_LENGTH = 12;
const FILE_DIFF_SEPARATOR = "\ndiff --git ";
const FILE_DIFF_HEADER = /^diff --git a\/(.+) b\/(.+)$/;

interface ChunkPlan {
  baseSha: string;
  units: string[];
  diff: string;
  size: number;
  oversized: string[];
  files: string[] | null;
  part: AuditChunkPart | null;
  skipped: Array<{ path: string; reason: string }>;
}

interface FileDiff {
  path: string;
  diff: string;
}

interface CappedDiff {
  diff: string;
  truncated: boolean;
}

async function auditGit(cwd: string, args: string[], maxStdoutChars?: number): Promise<BoundedCommandResult> {
  return runBoundedCommand(["git", "-C", cwd, ...args], cwd, { timeoutMs: AUDIT_GIT_TIMEOUT_MS, ...(maxStdoutChars === undefined ? {} : { maxStdoutChars }) });
}

function oversizedDiffReason(sha: string, maxChars: number): string {
  return `diff du commit ${sha.slice(0, SHORT_SHA_LENGTH)} trop volumineux : lecture limitée à ${maxChars} caractères`;
}

async function auditGitOutput(cwd: string, args: string[]): Promise<string> {
  const result = await auditGit(cwd, args);
  if (result.exitCode !== 0 || result.timedOut) throw new Error(`git ${args[0] ?? ""} a échoué pendant l'audit : ${boundedCommandDetail(result)}`);
  return result.stdout;
}

function shaList(output: string): string[] {
  return output.split(/\s+/).filter((sha) => sha.length > 0);
}

function revisionRange(baseSha: string, headSha: string): string {
  return baseSha === AUDIT_EMPTY_TREE_SHA ? headSha : `${baseSha}..${headSha}`;
}

async function firstParent(cwd: string, sha: string): Promise<string> {
  const result = await auditGit(cwd, ["rev-parse", "--verify", "--quiet", `${sha}^1`]);
  return result.exitCode === 0 && !result.timedOut ? result.stdout.trim() : AUDIT_EMPTY_TREE_SHA;
}

async function gitSucceeds(cwd: string, args: string[]): Promise<boolean> {
  const result = await auditGit(cwd, args);
  return result.exitCode === 0 && !result.timedOut;
}

async function readGithubRepositoryUrl(cwd: string): Promise<string | null> {
  try {
    const ref = await readGithubRepoRef(cwd);
    return `https://${ref.host}/${ref.owner}/${ref.repository}`;
  } catch {
    return null;
  }
}

function diffArgs(baseSha: string, headSha: string, nameOnly: boolean): string[] {
  return ["diff", "--no-color", ...(nameOnly ? ["--name-only"] : []), baseSha, headSha, "--", ".", ...AUDIT_IGNORED_PATHSPECS];
}

function unanalysedPartReason(sha: string, maxParts: number): string {
  return `commit ${sha.slice(0, SHORT_SHA_LENGTH)} trop volumineux : seules ses ${maxParts} premières parties sont analysées`;
}

function splitDiffByFile(diff: string): FileDiff[] {
  const body = diff.startsWith("\n") ? diff : `\n${diff}`;
  return body.split(FILE_DIFF_SEPARATOR).filter((segment) => segment.trim().length > 0).map((segment) => {
    const text = `diff --git ${segment}`.replace(/\n*$/, "\n");
    const header = text.slice(0, text.indexOf("\n"));
    const match = FILE_DIFF_HEADER.exec(header);
    return { path: match?.[2] ?? header, diff: text };
  });
}

function packFileDiffs(files: readonly FileDiff[], maxChars: number): FileDiff[][] {
  const groups: FileDiff[][] = [];
  let current: FileDiff[] = [];
  let size = 0;
  for (const file of files) {
    if (current.length > 0 && size + file.diff.length > maxChars) {
      groups.push(current);
      current = [];
      size = 0;
    }
    current.push(file);
    size += file.diff.length;
  }
  if (current.length > 0) groups.push(current);
  return groups;
}

function splitUnitPlans(unitBase: string, unit: string, diff: string, input: AuditRangeInput, maxParts: number): ChunkPlan[] {
  const groups = packFileDiffs(splitDiffByFile(diff), input.maxChunkChars);
  const kept = groups.slice(0, maxParts);
  const dropped = groups.slice(maxParts).flat().map((file) => ({ path: file.path, reason: unanalysedPartReason(unit, maxParts) }));
  return kept.map((group, index) => {
    const partDiff = group.map((file) => file.diff).join("");
    const last = index === kept.length - 1;
    return {
      baseSha: unitBase,
      units: [unit],
      diff: partDiff,
      size: partDiff.length,
      oversized: [],
      files: group.map((file) => file.path),
      part: { index, total: kept.length },
      skipped: last ? dropped : [],
    };
  });
}

async function changedFileNames(cwd: string, baseSha: string, headSha: string): Promise<string[]> {
  const output = await auditGitOutput(cwd, diffArgs(baseSha, headSha, true));
  return output.split("\n").map((file) => file.trim()).filter((file) => file.length > 0);
}

async function cappedDiff(cwd: string, baseSha: string, headSha: string, maxChars: number): Promise<CappedDiff> {
  const args = diffArgs(baseSha, headSha, false);
  const result = await auditGit(cwd, args, maxChars);
  if (result.truncated === true) return { diff: result.stdout, truncated: true };
  if (result.exitCode !== 0 || result.timedOut) throw new Error(`git diff a échoué pendant l'audit : ${boundedCommandDetail(result)}`);
  return { diff: result.stdout, truncated: false };
}

async function rangeCommits(cwd: string, baseSha: string, headSha: string): Promise<AuditRangeCommit[]> {
  const format = ["%H", "%s", "%b"].join("%x1f") + "%x1e";
  const output = await auditGitOutput(cwd, ["log", "--first-parent", "--reverse", `--format=${format}`, revisionRange(baseSha, headSha)]);
  return output.split(LOG_RECORD_SEPARATOR).flatMap((record) => {
    const [sha, subject, body] = record.replace(/^\n/, "").split(LOG_FIELD_SEPARATOR);
    if (sha === undefined || sha.trim().length === 0) return [];
    const title = subject ?? "";
    return [{ sha: sha.trim(), subject: title, body: (body ?? "").trim(), prNumber: auditPrNumber(title) }];
  });
}

async function resolveBootstrapBase(cwd: string, tipSha: string, bootstrapHours: number): Promise<string> {
  const recent = shaList(await auditGitOutput(cwd, ["rev-list", "--first-parent", `--since-as-filter=${bootstrapHours} ${BOOTSTRAP_WINDOW_UNIT}`, tipSha]));
  const oldest = recent.at(-1);
  return oldest === undefined ? tipSha : firstParent(cwd, oldest);
}

async function planChunks(cwd: string, baseSha: string, units: string[], input: AuditRangeInput): Promise<{ plans: ChunkPlan[]; deferredCommitCount: number }> {
  const plans: ChunkPlan[] = [];
  let current: ChunkPlan | null = null;
  for (const [index, unit] of units.entries()) {
    const unitBase = index === 0 ? baseSha : units[index - 1] ?? baseSha;
    const { diff, truncated } = await cappedDiff(cwd, unitBase, unit, input.maxUnitDiffChars);
    const size = truncated ? Math.max(diff.length, input.maxChunkChars + 1) : diff.length;
    if (current && current.part === null && current.size + size <= input.maxChunkChars) {
      current.units.push(unit);
      current.size += size;
      continue;
    }
    if (current) plans.push(current);
    current = null;
    if (plans.length >= input.maxChunks) return { plans, deferredCommitCount: units.length - index };
    if (!truncated && size > input.maxChunkChars) {
      const parts = splitUnitPlans(unitBase, unit, diff, input, input.maxChunks - plans.length);
      if (plans.length > 0 && parts.some((part) => part.skipped.length > 0)) return { plans, deferredCommitCount: units.length - index };
      plans.push(...parts.slice(0, -1));
      current = parts.at(-1) ?? null;
      continue;
    }
    current = { baseSha: unitBase, units: [unit], diff, size, oversized: truncated ? [unit] : [], files: null, part: null, skipped: [] };
  }
  if (current) plans.push(current);
  return { plans, deferredCommitCount: 0 };
}

async function buildChunk(cwd: string, plan: ChunkPlan, index: number, input: AuditRangeInput): Promise<AuditRangeChunk> {
  const headSha = plan.units.at(-1) ?? plan.baseSha;
  const read = plan.units.length === 1 ? { diff: plan.diff, truncated: plan.oversized.length > 0 } : await cappedDiff(cwd, plan.baseSha, headSha, input.maxUnitDiffChars);
  const oversized = read.truncated && plan.oversized.length === 0 ? [headSha] : plan.oversized;
  const [files, commits] = await Promise.all([plan.files ?? changedFileNames(cwd, plan.baseSha, headSha), rangeCommits(cwd, plan.baseSha, headSha)]);
  return {
    index,
    baseSha: plan.baseSha,
    headSha,
    commits,
    diff: truncateAuditDiff(read.diff, input.maxChunkChars),
    files,
    skipped: [...oversized.map((sha) => ({ path: sha, reason: oversizedDiffReason(sha, input.maxUnitDiffChars) })), ...plan.skipped],
    part: plan.part,
  };
}

export async function collectGitAuditRange(input: AuditRangeInput): Promise<AuditRange> {
  const { cwd } = input;
  const tipSha = (await auditGitOutput(cwd, ["rev-parse", "--verify", "HEAD^{commit}"])).trim();
  const githubRepositoryUrl = await readGithubRepositoryUrl(cwd);
  const empty = { tipSha, githubRepositoryUrl, chunks: [], deferredCommitCount: 0 };
  if (input.baseSha !== null) {
    const known = await gitSucceeds(cwd, ["cat-file", "-e", `${input.baseSha}^{commit}`]);
    if (!known || !(await gitSucceeds(cwd, ["merge-base", "--is-ancestor", input.baseSha, tipSha]))) {
      return { status: "rewritten", baseSha: input.baseSha, ...empty };
    }
  }
  const baseSha = input.baseSha ?? await resolveBootstrapBase(cwd, tipSha, input.bootstrapHours);
  const units = baseSha === tipSha ? [] : shaList(await auditGitOutput(cwd, ["rev-list", "--first-parent", "--reverse", revisionRange(baseSha, tipSha)]));
  if (units.length === 0) return { status: "no_changes", baseSha, ...empty };
  const { plans, deferredCommitCount } = await planChunks(cwd, baseSha, units, input);
  const chunks: AuditRangeChunk[] = [];
  for (const [index, plan] of plans.entries()) chunks.push(await buildChunk(cwd, plan, index, input));
  return { status: "ok", baseSha, tipSha, githubRepositoryUrl, chunks, deferredCommitCount };
}
