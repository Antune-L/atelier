import { spawn } from "node:child_process";
import { mkdir, realpath, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { assertOperationActive, runBoundedCommand } from "./boundedCommand.ts";
import { githubEnvForCwdSync, runGithubCommand } from "./github/accountEnv.ts";
import { addDetachedWorktree, DetachedWorktreeError, removeDetachedWorktree } from "./detachedWorktree.ts";
import { envWithProjectNode } from "./nvmNode.ts";
import type { OperationDeadlineOptions, ValidationCommandOptions, ValidationCommandResult, ValidationRevision, ValidationRevisionOptions, ValidationServiceHandle, ValidationWorkspaceOptions } from "./types.ts";

const OUTPUT_LIMIT = 32_768;
const VALIDATION_ROOT = join(tmpdir(), "kanban-quality-validation");
const TERMINATION_SIGNAL = "SIGKILL";
const NETWORK_GIT_TIMEOUT_MS = 10 * 60 * 1000;
const SAFE_ENVIRONMENT_KEYS = ["PATH", "HOME", "USER", "LOGNAME", "SHELL", "TMPDIR", "LANG", "LC_ALL", "TERM"];
const PARENT_WATCHDOG_SCRIPT = "const target = Number(process.argv[1]); const owner = Number(process.argv[2]); setInterval(() => { if (process.ppid !== owner) { try { process.kill(-target, 'SIGKILL'); } catch {} process.exit(0); } }, 500);";

function assertIdentity(value: string): void {
  if (!/^[a-zA-Z0-9_-]+$/.test(value)) throw new Error("Invalid validation identity.");
}

function workspaceDirectory(runId: string): string {
  assertIdentity(runId);
  return join(VALIDATION_ROOT, runId);
}

async function gitOutput(repoPath: string, args: string[], options: OperationDeadlineOptions = {}): Promise<string> {
  const result = await runBoundedCommand(["git", ...args], repoPath, options);
  if (result.exitCode !== 0 || result.timedOut) throw new Error(result.stderr.trim() || result.stdout.trim() || "Validation Git command failed.");
  return result.stdout.trim();
}

/** Keep the validation subsystem's own error wording, which the board UI translates verbatim. */
function validationGitError(error: unknown): unknown {
  if (!(error instanceof DetachedWorktreeError)) return error;
  if (error.step === "remove") return new Error("Validation workspace cleanup timed out.");
  return new Error(error.result.stderr.trim() || error.result.stdout.trim() || "Validation Git command failed.");
}

export async function captureValidationRevision(options: ValidationRevisionOptions): Promise<ValidationRevision> {
  assertOperationActive(options);
  if (options.sourcePath) {
    const source = await realpath(options.sourcePath);
    const sourceCommon = await gitOutput(source, ["rev-parse", "--path-format=absolute", "--git-common-dir"], options);
    const repoCommon = await gitOutput(options.repoPath, ["rev-parse", "--path-format=absolute", "--git-common-dir"], options);
    if (await realpath(sourceCommon) !== await realpath(repoCommon)) throw new Error("Validation source does not belong to the project repository.");
    const status = await gitOutput(source, ["status", "--porcelain"], options);
    if (status) throw new Error("Commit or discard pending changes before validation.");
    const commitSha = await gitOutput(source, ["rev-parse", "HEAD"], options);
    return { commitSha, fingerprint: commitSha, clean: true };
  }
  if (!options.branch && !options.revision) throw new Error("No committed ticket revision is available for validation.");
  let commitSha = "";
  if (options.branch) {
    await gitOutput(options.repoPath, ["check-ref-format", `refs/heads/${options.branch}`], options);
    const origin = await runBoundedCommand(["git", "config", "--get", "remote.origin.url"], options.repoPath, options);
    if (origin.exitCode === 0 && !origin.timedOut) {
      const remote = await runGithubCommand(["git", "ls-remote", "--heads", "origin", `refs/heads/${options.branch}`], options.repoPath, options);
      if (remote.exitCode !== 0 || remote.timedOut) throw new Error(remote.stderr.trim() || "Cannot verify the current remote ticket revision.");
      if (remote.stdout.trim()) {
        const fetched = await runGithubCommand(["git", "fetch", "origin", options.branch], options.repoPath, { ...options, timeoutMs: NETWORK_GIT_TIMEOUT_MS });
        if (fetched.exitCode !== 0 || fetched.timedOut) throw new Error(fetched.stderr.trim() || fetched.stdout.trim() || "Validation Git command failed.");
        commitSha = await gitOutput(options.repoPath, ["rev-parse", "FETCH_HEAD^{commit}"], options);
      } else if (!options.revision) throw new Error("The ticket branch is no longer available on the remote.");
    } else if (origin.exitCode === 1 && !origin.timedOut) {
      const local = await runBoundedCommand(["git", "rev-parse", "--verify", `refs/heads/${options.branch}^{commit}`], options.repoPath, options);
      if (local.exitCode === 0 && !local.timedOut) commitSha = local.stdout.trim();
      else if (!options.revision) throw new Error(local.stderr.trim() || "Ticket branch is unavailable.");
    } else throw new Error(origin.stderr.trim() || "Cannot inspect the project remote.");
  }
  if (!commitSha && options.revision) commitSha = await gitOutput(options.repoPath, ["rev-parse", "--verify", `${options.revision}^{commit}`], options);
  return { commitSha, fingerprint: commitSha, clean: true };
}

export async function prepareValidationWorkspace(options: ValidationWorkspaceOptions): Promise<{ cwd: string; dataDirectory: string; port: number; databaseNamespace: string }> {
  assertOperationActive(options);
  const cwd = workspaceDirectory(options.runId);
  await addDetachedWorktree(options.repoPath, cwd, options.commitSha, options).catch((error: unknown) => {
    throw validationGitError(error);
  });
  const dataDirectory = `${cwd}-data`;
  assertOperationActive(options);
  await mkdir(dataDirectory, { recursive: true });
  assertOperationActive(options);
  const port = await new Promise<number>((resolvePort, reject) => {
    const server = createServer();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const release = (): void => {
      clearTimeout(timer);
      options.signal?.removeEventListener("abort", onAbort);
    };
    const onAbort = (): void => {
      release();
      server.close();
      reject(options.signal?.reason ?? new Error("Validation port allocation interrupted."));
    };
    server.once("error", (error) => { release(); reject(error); });
    options.signal?.addEventListener("abort", onAbort, { once: true });
    if (options.deadlineAt !== undefined) timer = setTimeout(onAbort, options.deadlineAt - Date.now());
    if (options.signal?.aborted || (options.deadlineAt !== undefined && Date.now() >= options.deadlineAt)) {
      onAbort();
      return;
    }
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        release();
        server.close();
        reject(new Error("Validation port allocation failed."));
        return;
      }
      server.close((error) => {
        release();
        if (error) reject(error);
        else resolvePort(address.port);
      });
    });
  });
  assertOperationActive(options);
  return { cwd, dataDirectory, port, databaseNamespace: `validation_${options.runId.replaceAll("-", "_")}` };
}

export async function cleanupValidationWorkspace(options: ValidationWorkspaceOptions): Promise<void> {
  assertOperationActive(options);
  const cwd = workspaceDirectory(options.runId);
  try {
    await removeDetachedWorktree(options.repoPath, cwd, options);
  } catch (error) {
    throw validationGitError(error);
  }
  assertOperationActive(options);
  await rm(`${cwd}-data`, { recursive: true, force: true });
}

function commandEnvironment(options: ValidationCommandOptions): Record<string, string | undefined> {
  const projectEnvironment = envWithProjectNode(options.cwd);
  const environment: Record<string, string | undefined> = {};
  for (const key of SAFE_ENVIRONMENT_KEYS) environment[key] = projectEnvironment[key];
  // The allow-list above only copies server values: the project's GitHub account is added explicitly
  // (the workspace is a worktree of the project, so it resolves to the project's account).
  const github = githubEnvForCwdSync(options.cwd, options) ?? {};
  return { ...environment, CI: "1", COREPACK_ENABLE_DOWNLOAD_PROMPT: "0", ...github, ...options.environment };
}

function startProcess(options: ValidationCommandOptions): ValidationServiceHandle {
  assertOperationActive(options);
  const environment = commandEnvironment(options);
  assertOperationActive(options);
  const startedAt = Date.now();
  let stdout = "";
  let stderr = "";
  let timedOut = false;
  let cancelled = false;
  let settled = false;
  const child = spawn("sh", ["-c", options.command], {
    cwd: options.cwd,
    env: environment,
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const watchdog = child.pid ? spawn(process.execPath, ["-e", PARENT_WATCHDOG_SCRIPT, String(child.pid), String(process.pid)], { env: environment, stdio: "ignore" }) : null;
  const kill = (): void => {
    if (!child.pid) return;
    try { process.kill(-child.pid, TERMINATION_SIGNAL); } catch { child.kill(TERMINATION_SIGNAL); }
  };
  const onAbort = (): void => { cancelled = true; kill(); };
  let timeoutMs = options.timeoutMs;
  if (options.deadlineAt !== undefined) {
    const remaining = options.deadlineAt - Date.now();
    timeoutMs = timeoutMs > 0 ? Math.min(timeoutMs, remaining) : remaining;
  }
  const timer = timeoutMs > 0 ? setTimeout(() => { timedOut = true; kill(); }, timeoutMs) : null;
  if (options.deadlineAt !== undefined && Date.now() >= options.deadlineAt) { timedOut = true; kill(); }
  options.signal?.addEventListener("abort", onAbort, { once: true });
  if (options.signal?.aborted) onAbort();
  child.stdout?.on("data", (chunk: Buffer) => { stdout = (stdout + chunk.toString()).slice(-OUTPUT_LIMIT); });
  child.stderr?.on("data", (chunk: Buffer) => { stderr = (stderr + chunk.toString()).slice(-OUTPUT_LIMIT); });
  const result = new Promise<ValidationCommandResult>((resolveResult) => {
    const finish = (exitCode: number | null): void => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      options.signal?.removeEventListener("abort", onAbort);
      watchdog?.kill(TERMINATION_SIGNAL);
      kill();
      resolveResult({ exitCode, timedOut, cancelled, stdout, stderr, durationMs: Date.now() - startedAt });
    };
    child.once("error", (error) => { stderr = (stderr + error.message).slice(-OUTPUT_LIMIT); finish(null); });
    child.once("close", finish);
  });
  return {
    result,
    output: () => `${stdout}\n${stderr}`.trim(),
    stop: async () => { cancelled = true; kill(); await result; },
  };
}

export async function runValidationCommand(options: ValidationCommandOptions): Promise<ValidationCommandResult> {
  return startProcess(options).result;
}

export function startValidationService(options: ValidationCommandOptions): ValidationServiceHandle {
  return startProcess({ ...options, timeoutMs: 0 });
}

export function validationDatabasePath(directory: string, namespace: string): string {
  assertIdentity(namespace);
  return resolve(directory, `${namespace}.db`);
}
