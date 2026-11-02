import { createPublicKey, verify } from "node:crypto";
import { chmodSync, readFileSync, renameSync, writeFileSync } from "node:fs";

const SOCKET = "/run/kanban-updater/control.sock";
const STATE = "/var/lib/kanban-updater/status.json";
const REPOSITORY = "https://github.com/Antune-L/atelier.git";
const INSTALLED_LOCK = "/opt/kanban/current/bun.lock";
const TIMEOUT_MS = 10_000;
const MAX_TOKEN_BYTES = 16_384;
const MAX_PROGRESS_LENGTH = 512;
const MILLISECONDS_PER_SECOND = 1_000;
const KEY_TTL_MS = 300_000;
const MAX_BUFFER_LENGTH = 8_192;
const EXIT_ACTIVE_WORK = 75;
const ATTEMPT_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const config: unknown = JSON.parse(readFileSync("/etc/kanban-updater/config.json", "utf8"));

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

if (!isRecord(config) || typeof config.issuer !== "string" || !/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(config.issuer)
  || typeof config.audience !== "string" || !config.audience || typeof config.email !== "string" || !config.email) {
  throw new Error("Invalid root-owned updater configuration.");
}
const issuer = config.issuer;
const audience = config.audience;
const email = config.email;
let keys: unknown[] = [];
let keysAt = 0;
let active = false;
let status: { attemptId: string | null; phase: string; target: string | null; progress: string; updatedAt: number; exitCode: number | null } = { attemptId: null, phase: "idle", target: null, progress: "Ready", updatedAt: Date.now(), exitCode: null };

function persist(phase: string, progress: string, target: string | null = status.target, exitCode: number | null = null, updatedAt = Date.now()): void {
  status = { attemptId: status.attemptId, phase, target, progress: progress.slice(0, MAX_PROGRESS_LENGTH), updatedAt, exitCode };
  writeFileSync(`${STATE}.tmp`, JSON.stringify(status), { mode: 0o600 });
  renameSync(`${STATE}.tmp`, STATE);
}

try {
  const saved: unknown = JSON.parse(readFileSync(STATE, "utf8"));
  if (!isRecord(saved) || typeof saved.phase !== "string" || typeof saved.progress !== "string"
    || !["idle", "resolving", "running", "succeeded", "refused", "failed", "interrupted"].includes(saved.phase)) {
    throw new Error("Invalid persisted updater state; operator inspection is required.");
  }
  const target = typeof saved.target === "string" && /^[0-9a-f]{40}$/.test(saved.target) ? saved.target : null;
  status.attemptId = typeof saved.attemptId === "string" && ATTEMPT_ID_PATTERN.test(saved.attemptId) ? saved.attemptId : null;
  if (saved.phase === "running" || saved.phase === "resolving") persist("interrupted", "Updater restarted during an update. Operator inspection is required.", target);
  else persist(saved.phase, saved.progress, target, typeof saved.exitCode === "number" ? saved.exitCode : null, typeof saved.updatedAt === "number" ? saved.updatedAt : undefined);
} catch (error) {
  if (!(isRecord(error) && error.code === "ENOENT")) throw error;
}

async function authenticate(token: string): Promise<boolean> {
  if (!token || token.length > MAX_TOKEN_BYTES) return false;
  try {
    const parts = token.split(".");
    const [headerPart, payloadPart, signaturePart] = parts;
    if (parts.length !== 3 || !headerPart || !payloadPart || !signaturePart) return false;
    const header: unknown = JSON.parse(Buffer.from(headerPart, "base64url").toString());
    const payload: unknown = JSON.parse(Buffer.from(payloadPart, "base64url").toString());
    if (!isRecord(header) || header.alg !== "RS256" || typeof header.kid !== "string" || !isRecord(payload)) return false;
    const now = Date.now() / MILLISECONDS_PER_SECOND;
    if (payload.iss !== issuer || !Array.isArray(payload.aud) || !payload.aud.includes(audience) || payload.email !== email
      || typeof payload.exp !== "number" || payload.exp <= now || typeof payload.iat !== "number" || payload.iat > now
      || payload.exp <= payload.iat
      || (payload.nbf !== undefined && (typeof payload.nbf !== "number" || payload.nbf > now))) return false;
    if (Date.now() - keysAt > KEY_TTL_MS) {
      const response = await fetch(`${issuer}/cdn-cgi/access/certs`, { signal: AbortSignal.timeout(TIMEOUT_MS), redirect: "error" });
      if (!response.ok) return false;
      const document: unknown = await response.json();
      if (!isRecord(document) || !Array.isArray(document.keys)) return false;
      keys = document.keys;
      keysAt = Date.now();
    }
    const key = keys.find((candidate) => isRecord(candidate) && candidate.kid === header.kid);
    if (!isRecord(key) || key.kty !== "RSA" || typeof key.n !== "string" || typeof key.e !== "string") return false;
    const publicKey = createPublicKey({ key: { kty: "RSA", n: key.n, e: key.e }, format: "jwk" });
    return payload.exp > Date.now() / MILLISECONDS_PER_SECOND && verify("RSA-SHA256", Buffer.from(`${headerPart}.${payloadPart}`), publicKey, Buffer.from(signaturePart, "base64url"));
  } catch {
    return false;
  }
}

async function upgrade(expectedTarget: string | null): Promise<void> {
  try {
    const approved = await targetMetadata();
    if (!isRecord(approved) || expectedTarget === null || approved.id !== expectedTarget) throw new Error("A signed qualified target must be explicitly confirmed.");
    const result = Bun.spawn(["/usr/bin/git", "ls-remote", REPOSITORY, "refs/heads/main"], {
      env: { PATH: "/usr/bin:/bin", GIT_TERMINAL_PROMPT: "0" }, stdout: "pipe", stderr: "ignore",
    });
    const timeout = setTimeout(() => result.kill(), TIMEOUT_MS);
    const output = await new Response(result.stdout).text();
    const code = await result.exited;
    clearTimeout(timeout);
    const target = output.split(/\s/)[0];
    if (code !== 0 || !target || !/^[0-9a-f]{40}$/.test(target)) throw new Error("Cannot resolve main.");
    if (expectedTarget !== null && target !== expectedTarget) {
      persist("refused", "Main changed after confirmation. Refresh the target and confirm again.", target);
      return;
    }
    persist("running", "Starting the pinned upgrade", target);
    const child = Bun.spawn(["/usr/local/sbin/kanban-upgrade", "--sha", target], {
      env: { PATH: "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin" }, stdout: "pipe", stderr: "inherit",
    });
    const decoder = new TextDecoder();
    let pending = "";
    const reader = child.stdout.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      pending = (pending + decoder.decode(value, { stream: true })).slice(-MAX_BUFFER_LENGTH);
      const lines = pending.split("\n");
      pending = lines.pop() ?? "";
      for (const line of lines) {
        if (line.startsWith("==> ")) persist("running", line.slice(4), target);
      }
    }
    const exitCode = await child.exited;
    if (exitCode === 0) persist("succeeded", "Update completed, or the release was already current.", target, exitCode);
    else if (exitCode === EXIT_ACTIVE_WORK) persist("refused", "Work is still running. Finish active tasks, then confirm and retry. The application was not stopped.", target, exitCode);
    else persist("failed", "Upgrade failed. Inspect the updater journal; rollback restores code only. Do not retry before inspection.", target, exitCode);
  } catch {
    persist("failed", "Updater failed. Operator inspection is required before retrying.");
  } finally {
    active = false;
  }
}

async function readSourceMetadata(url: string, maxBytes = 4_000_000): Promise<string> {
  const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), redirect: "error" });
  if (!response.ok || !response.body) throw new Error("Source metadata unavailable.");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.length;
      if (bytes > maxBytes) throw new Error("Source metadata exceeds limit.");
      chunks.push(value);
    }
  } finally { await reader.cancel(); }
  return Buffer.concat(chunks).toString("utf8");
}

async function targetMetadata(): Promise<unknown> {
  const commit: unknown = JSON.parse(await readSourceMetadata("https://api.github.com/repos/Antune-L/atelier/commits/main"));
  if (!isRecord(commit) || typeof commit.sha !== "string" || !/^[a-f0-9]{40}$/.test(commit.sha)) throw new Error("Invalid source target.");
  const lock = await readSourceMetadata(`https://raw.githubusercontent.com/Antune-L/atelier/${commit.sha}/bun.lock`);
  const claude = lock.match(/"@anthropic-ai\/claude-agent-sdk":\s*\["@anthropic-ai\/claude-agent-sdk@([^"\s]+)"/)?.[1];
  const codex = lock.match(/"@openai\/codex-sdk":\s*\["@openai\/codex-sdk@([^"\s]+)"/)?.[1];
  if (!claude || !codex || !/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(claude) || !/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(codex)) throw new Error("Invalid target provider versions.");
  const installedLock = readFileSync(INSTALLED_LOCK, "utf8");
  const installedClaude = installedLock.match(/"@anthropic-ai\/claude-agent-sdk":\s*\["@anthropic-ai\/claude-agent-sdk@([^"\s]+)"/)?.[1];
  const installedCodex = installedLock.match(/"@openai\/codex-sdk":\s*\["@openai\/codex-sdk@([^"\s]+)"/)?.[1];
  if (installedClaude === claude && installedCodex === codex) return { id: commit.sha, version: commit.sha.slice(0, 7), providers: { claude, codex } };
  if (!isRecord(config) || typeof config.adoptionPublicKey !== "string") throw new Error("Configure the root-owned provider adoption publisher key.");
  const releaseText = await readSourceMetadata("https://api.github.com/repos/Antune-L/atelier/releases/latest", 1_000_000);
  const release: unknown = JSON.parse(releaseText);
  if (!isRecord(release) || release.draft !== false || typeof release.body !== "string") throw new Error("Invalid qualification release.");
  const envelope: unknown = JSON.parse(release.body);
  if (!isRecord(envelope) || typeof envelope.payload !== "string" || typeof envelope.signature !== "string") throw new Error("Missing signed qualification.");
  const key = createPublicKey(config.adoptionPublicKey);
  if (key.asymmetricKeyType !== "ed25519" || !verify(null, Buffer.from(envelope.payload), key, Buffer.from(envelope.signature, "base64"))) throw new Error("Invalid qualification publisher.");
  const receipt: unknown = JSON.parse(envelope.payload);
  if (!isRecord(receipt) || receipt.protocol !== 1 || receipt.revision !== commit.sha || !isRecord(receipt.providers) || receipt.providers.claude !== claude || receipt.providers.codex !== codex
    || !isRecord(receipt.gates) || receipt.gates.linux !== "passed" || receipt.gates.mac !== "passed" || receipt.gates.static !== "passed"
    || receipt.lockSha256 !== new Bun.CryptoHasher("sha256").update(lock).digest("hex") || release.tag_name !== `v${receipt.version}`) throw new Error("Qualification does not match the exact source graph.");
  return { id: commit.sha, version: receipt.version, providers: { claude, codex } };
}

Bun.serve({
  unix: SOCKET,
  maxRequestBodySize: 0,
  async fetch(request) {
    const path = new URL(request.url).pathname;
    if (!(((path === "/status" || path === "/target") && request.method === "GET") || (path === "/start" && request.method === "POST"))) return new Response(null, { status: 404 });
    if (!await authenticate(request.headers.get("Cf-Access-Jwt-Assertion") ?? "")) return new Response(null, { status: 403 });
    if (path === "/target") {
      try { return Response.json(await targetMetadata(), { headers: { "cache-control": "no-store" } }); }
      catch { return Response.json({ error: "Target metadata unavailable; check source access and updater adoption." }, { status: 502 }); }
    }
    if (path === "/start") {
      const attemptId = request.headers.get("x-kanban-attempt-id");
      if (attemptId !== null && !ATTEMPT_ID_PATTERN.test(attemptId)) return new Response(null, { status: 400 });
      const expectedTarget = request.headers.get("x-kanban-target");
      if (expectedTarget !== null && !/^[a-f0-9]{40}$/.test(expectedTarget)) return new Response(null, { status: 400 });
      if (attemptId !== null && attemptId === status.attemptId) return Response.json(status, { headers: { "cache-control": "no-store" } });
      if (active || status.phase === "interrupted" || status.phase === "failed") return new Response(null, { status: 409 });
      status.attemptId = attemptId ?? crypto.randomUUID();
      persist("resolving", "Resolving the main commit", null);
      active = true;
      void upgrade(expectedTarget);
    }
    return Response.json(status, { headers: { "cache-control": "no-store" } });
  },
});
chmodSync(SOCKET, 0o660);
