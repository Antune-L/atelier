/**
 * Readiness probe of the confined Codex sandbox used by remote-card analyses. It runs the pinned
 * native binary through `codex sandbox` with the same generated permission profile as a real
 * analysis, against synthetic canaries only: a readable file in the probe workspace, a forbidden
 * sibling file, an unlisted file next to the probe root (neither allowed nor denied), and a write
 * attempt. Real secrets are never read.
 */

import { existsSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { nanoid } from "nanoid";

import { getErrorMessage } from "../../shared/errors.ts";
import { SLOTS_ROOT } from "../config.ts";
import type { Store } from "../db/store.ts";
import { createLogger } from "../logger.ts";
import { resolveCodexBinary, verifyCodexBinaryVersion } from "../system/codexBinary.ts";
import { CODEX_CONFINED_PROFILE, codexConfinedProfile, tomlInline } from "../system/confinedPolicy.ts";
import { agentBaseEnv } from "../system/nvmNode.ts";

import { getRemoteMcpSandboxStatus, setRemoteMcpSandboxStatus } from "./sandboxStatus.ts";

const log = createLogger("remote-mcp-sandbox");

/** Outside the analysis workspaces root, which boot recovery wipes. */
const PROBE_ROOT = join(SLOTS_ROOT, "sandbox-probe");
const UNLISTED_DIR_PREFIX = "sandbox-probe-unlisted-";
const PROBE_ID_LENGTH = 10;
const PROBE_TIMEOUT_MS = 30_000;
const DEFAULT_POLL_INTERVAL_MS = 30_000;
const CAT_BINARY = "/bin/cat";
const TOUCH_BINARY = "/usr/bin/touch";
const CANARY_FILE = "canary.txt";
const WRITE_CANARY_FILE = "write-canary.txt";
const SKIPPED_KEY = "skipped";

export interface SandboxCheckResult {
  ok: boolean;
  detail: string;
}

interface SandboxRun {
  exitCode: number;
  stdout: string;
}

async function runInSandbox(binaryPath: string, profileOverride: string, workspace: string, command: string[], environment: Record<string, string | undefined>): Promise<SandboxRun> {
  const proc = Bun.spawn([
    binaryPath,
    "--config", "features.use_legacy_landlock=false",
    "--config", profileOverride,
    "sandbox",
    "--permission-profile", CODEX_CONFINED_PROFILE,
    "--include-managed-config",
    "--cd", workspace,
    "--",
    ...command,
  ], { cwd: workspace, env: environment, stdin: "ignore", stdout: "pipe", stderr: "pipe", timeout: PROBE_TIMEOUT_MS, killSignal: "SIGKILL" });
  const [stdout, , exitCode] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited]);
  return { exitCode, stdout };
}

/**
 * Probe the confined Codex sandbox: positive read of the workspace canary, refused reads of a
 * denied sibling canary and of an unlisted canary outside the workspace, refused write in the
 * workspace. Never throws; `detail` is safe to log.
 */
export async function checkCodexConfinedSandbox(): Promise<SandboxCheckResult> {
  const probeId = nanoid(PROBE_ID_LENGTH);
  const probeDir = join(PROBE_ROOT, probeId);
  const workspace = join(probeDir, "workspace");
  const forbidden = join(probeDir, "forbidden");
  const unlisted = join(SLOTS_ROOT, `${UNLISTED_DIR_PREFIX}${probeId}`);
  const token = nanoid();
  try {
    const environment = agentBaseEnv();
    const binaryPath = resolveCodexBinary();
    await verifyCodexBinaryVersion(binaryPath, environment);
    for (const dir of [workspace, forbidden, unlisted]) {
      await mkdir(dir, { recursive: true });
      await writeFile(join(dir, CANARY_FILE), token, { mode: 0o600 });
    }
    const profile = codexConfinedProfile({ workspace, binaryPath, extraDenied: [forbidden], environment });
    const override = `permissions.${CODEX_CONFINED_PROFILE}=${tomlInline(profile)}`;

    const readable = await runInSandbox(binaryPath, override, workspace, [CAT_BINARY, join(workspace, CANARY_FILE)], environment);
    if (readable.exitCode !== 0 || !readable.stdout.includes(token)) {
      return { ok: false, detail: `workspace canary unreadable in the sandbox (exit ${readable.exitCode})` };
    }
    const refusedReads = [
      { dir: forbidden, detail: "forbidden canary readable in the sandbox" },
      { dir: unlisted, detail: "unlisted canary outside the workspace readable in the sandbox" },
    ];
    for (const { dir, detail } of refusedReads) {
      const run = await runInSandbox(binaryPath, override, workspace, [CAT_BINARY, join(dir, CANARY_FILE)], environment);
      if (run.exitCode === 0 || run.stdout.includes(token)) return { ok: false, detail };
    }
    const writePath = join(workspace, WRITE_CANARY_FILE);
    const write = await runInSandbox(binaryPath, override, workspace, [TOUCH_BINARY, writePath], environment);
    if (write.exitCode === 0 || existsSync(writePath)) {
      return { ok: false, detail: "write in the workspace was not blocked by the sandbox" };
    }
    return { ok: true, detail: "workspace read allowed, forbidden and unlisted reads and write refused" };
  } catch (error) {
    return { ok: false, detail: getErrorMessage(error) };
  } finally {
    await rm(probeDir, { recursive: true, force: true }).catch(() => undefined);
    await rm(unlisted, { recursive: true, force: true }).catch(() => undefined);
  }
}

let probeInFlight: Promise<SandboxCheckResult> | null = null;

/** One probe at a time: the monitor and on-demand admissions share the running probe. */
function runSharedProbe(check: () => Promise<SandboxCheckResult>): Promise<SandboxCheckResult> {
  if (probeInFlight === null) {
    probeInFlight = check().finally(() => {
      probeInFlight = null;
    });
  }
  return probeInFlight;
}

/**
 * Whether a confined Codex analysis may run now: `ok` passes, `failed` refuses, `pending` waits for
 * the running probe, and `skipped` (no listener, or a cards profile without Codex while older cards
 * stay frozen to Codex) runs an on-demand probe and waits for it. Never throws.
 */
export async function ensureCodexConfinedSandbox(check: () => Promise<SandboxCheckResult> = checkCodexConfinedSandbox): Promise<boolean> {
  const status = getRemoteMcpSandboxStatus();
  if (status === "ok") return true;
  if (status === "failed") return false;
  try {
    const result = await runSharedProbe(check);
    if (!result.ok) log.error("bac à sable Codex confiné en échec (vérification à la demande)", { detail: result.detail });
    return result.ok;
  } catch (error) {
    log.error("vérification du bac à sable Codex impossible", { error: getErrorMessage(error) });
    return false;
  }
}

export interface RemoteMcpSandboxMonitorDeps {
  store: Pick<Store, "getAppSettings" | "getProfile">;
  /** Test seam: the probe to run (defaults to the real `codex sandbox` probe). */
  check?: () => Promise<SandboxCheckResult>;
  pollIntervalMs?: number;
}

/** Selected cards profile whose analyses run on Codex, or `skipped` when Codex is not involved. */
function confinedEngineKey(store: RemoteMcpSandboxMonitorDeps["store"]): string {
  const profileId = store.getAppSettings().remoteMcpCardsProfileId;
  const profile = profileId === null ? null : store.getProfile(profileId);
  return profile?.orchestrator === "codex" ? `codex:${profile.id}` : SKIPPED_KEY;
}

/**
 * Keep `/health`'s `remoteMcp.sandbox` current: probe at start, then again whenever the selected
 * cards profile switches to (another) Codex profile. Returns the stop function.
 */
export function startRemoteMcpSandboxMonitor(deps: RemoteMcpSandboxMonitorDeps): () => void {
  const check = deps.check ?? checkCodexConfinedSandbox;
  let evaluatedKey: string | null = null;
  let running = false;
  let stopped = false;

  async function evaluate(): Promise<void> {
    const key = confinedEngineKey(deps.store);
    if (key === evaluatedKey) return;
    evaluatedKey = key;
    if (key === SKIPPED_KEY) {
      setRemoteMcpSandboxStatus("skipped");
      return;
    }
    setRemoteMcpSandboxStatus("pending");
    const result = await runSharedProbe(check);
    if (stopped || evaluatedKey !== key) return;
    setRemoteMcpSandboxStatus(result.ok ? "ok" : "failed");
    if (result.ok) log.info("bac à sable Codex confiné vérifié", { detail: result.detail });
    else log.error("bac à sable Codex confiné en échec", { detail: result.detail });
  }

  function tick(): void {
    if (stopped || running) return;
    running = true;
    void evaluate()
      .catch((error: unknown) => {
        setRemoteMcpSandboxStatus("failed");
        log.error("vérification du bac à sable Codex impossible", { error: getErrorMessage(error) });
      })
      .finally(() => {
        running = false;
      });
  }

  tick();
  const timer = setInterval(tick, deps.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS);
  timer.unref();
  return () => {
    stopped = true;
    clearInterval(timer);
  };
}
