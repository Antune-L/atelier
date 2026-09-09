import { createHash, randomUUID } from "node:crypto";
import { lstat, readFile, readlink } from "node:fs/promises";
import { join } from "node:path";

import { createLogger } from "../logger.ts";

const log = createLogger("code-fingerprint");

const CODE_FINGERPRINT_TIMEOUT_MS = 30_000;
const FINGERPRINT_READ_CONCURRENCY = 8;
const MIN_PROCESS_TIMEOUT_MS = 1;

type FingerprintPhase = "enumeration" | "reading";

type FingerprintEntry =
  | { kind: "missing"; relativePath: string }
  | { kind: "symlink"; relativePath: string; target: string }
  | { kind: "file"; relativePath: string; executable: boolean; content: Buffer }
  | { kind: "other"; relativePath: string };

function timeoutError(): Error {
  return new Error(`empreinte du code interrompue après ${CODE_FINGERPRINT_TIMEOUT_MS}ms`);
}

function abortReason(signal: AbortSignal): Error {
  return signal.reason instanceof Error ? signal.reason : timeoutError();
}

function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) throw abortReason(signal);
}

function waitForAbort<T>(operation: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) return Promise.reject(abortReason(signal));
  return new Promise((resolve, reject) => {
    const onAbort = (): void => {
      reject(abortReason(signal));
    };
    signal.addEventListener("abort", onAbort, { once: true });
    void operation.then(
      (value) => {
        signal.removeEventListener("abort", onAbort);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener("abort", onAbort);
        reject(error);
      },
    );
  });
}

function isMissingFileError(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

async function listFingerprintPaths(
  slotPath: string,
  signal: AbortSignal,
  deadlineAt: number,
): Promise<string[]> {
  const timeout = Math.max(MIN_PROCESS_TIMEOUT_MS, deadlineAt - Date.now());
  const process = Bun.spawn(
    ["git", "-C", slotPath, "ls-files", "--cached", "--others", "--exclude-standard", "-z"],
    {
      stdin: "ignore",
      stdout: "pipe",
      stderr: "pipe",
      signal,
      timeout,
      killSignal: "SIGKILL",
    },
  );
  const completion = Promise.all([
    new Response(process.stdout).text(),
    new Response(process.stderr).text(),
    process.exited,
  ]);
  const [stdout, stderr, exitCode] = await waitForAbort(completion, signal);
  if (exitCode !== 0) {
    const detail = stderr.trim() || stdout.trim();
    throw new Error(`empreinte du code impossible : git ls-files a échoué (${detail})`);
  }
  return stdout
    .split("\0")
    .filter((path) => path.length > 0)
    .sort();
}

async function readFingerprintEntry(
  slotPath: string,
  relativePath: string,
  signal: AbortSignal,
): Promise<FingerprintEntry> {
  throwIfAborted(signal);
  const absolutePath = join(slotPath, relativePath);
  try {
    const stats = await waitForAbort(lstat(absolutePath), signal);
    if (stats.isSymbolicLink()) {
      const target = await waitForAbort(readlink(absolutePath), signal);
      return { kind: "symlink", relativePath, target };
    }
    if (stats.isFile()) {
      const content = await waitForAbort(readFile(absolutePath, { signal }), signal);
      return { kind: "file", relativePath, executable: (stats.mode & 0o111) !== 0, content };
    }
    return { kind: "other", relativePath };
  } catch (error) {
    if (isMissingFileError(error)) return { kind: "missing", relativePath };
    throw error;
  }
}

function updateFingerprint(hash: ReturnType<typeof createHash>, entry: FingerprintEntry): void {
  hash.update(`${entry.relativePath.length}:${entry.relativePath}`);
  if (entry.kind === "missing") {
    hash.update(":missing:");
    return;
  }
  if (entry.kind === "symlink") {
    hash.update(`:symlink:${entry.target.length}:${entry.target}`);
  } else if (entry.kind === "file") {
    hash.update(entry.executable ? ":file:executable:" : ":file:regular:");
    hash.update(entry.content);
  } else {
    hash.update(":other:");
  }
  hash.update("\0");
}

async function hashFingerprintPaths(
  slotPath: string,
  paths: string[],
  signal: AbortSignal,
): Promise<string> {
  const hash = createHash("sha256");
  const pending = new Map<number, Promise<FingerprintEntry>>();
  let nextIndex = 0;

  const fillPending = (): void => {
    while (pending.size < FINGERPRINT_READ_CONCURRENCY && nextIndex < paths.length && !signal.aborted) {
      const relativePath = paths[nextIndex];
      if (relativePath === undefined) break;
      const index = nextIndex;
      nextIndex += 1;
      const entry = readFingerprintEntry(slotPath, relativePath, signal);
      void entry.catch(() => undefined);
      pending.set(index, entry);
    }
  };

  fillPending();
  for (let index = 0; index < paths.length; index += 1) {
    throwIfAborted(signal);
    const entry = pending.get(index);
    if (!entry) throw new Error("empreinte du code impossible : lecture de fichier interrompue");
    updateFingerprint(hash, await waitForAbort(entry, signal));
    pending.delete(index);
    fillPending();
  }
  return hash.digest("hex");
}

export async function computeCodeFingerprint(slotPath: string): Promise<string> {
  const fingerprintId = randomUUID();
  const startedAt = Date.now();
  const deadlineAt = startedAt + CODE_FINGERPRINT_TIMEOUT_MS;
  const abortController = new AbortController();
  let phase: FingerprintPhase = "enumeration";
  const timer = setTimeout(() => abortController.abort(timeoutError()), CODE_FINGERPRINT_TIMEOUT_MS);
  log.info("empreinte du code démarrée", { fingerprintId });
  try {
    const paths = await listFingerprintPaths(slotPath, abortController.signal, deadlineAt);
    const enumerationMs = Date.now() - startedAt;
    log.info("empreinte du code énumérée", { fingerprintId, fileCount: paths.length, enumerationMs });
    phase = "reading";
    const fingerprint = await hashFingerprintPaths(slotPath, paths, abortController.signal);
    log.info("empreinte du code terminée", {
      fingerprintId,
      fileCount: paths.length,
      enumerationMs,
      readingMs: Date.now() - startedAt - enumerationMs,
      elapsedMs: Date.now() - startedAt,
    });
    return fingerprint;
  } catch (error) {
    log.warn("empreinte du code échouée", {
      fingerprintId,
      phase,
      timedOut: abortController.signal.aborted,
      elapsedMs: Date.now() - startedAt,
      errorName: error instanceof Error ? error.name : "unknown",
    });
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
