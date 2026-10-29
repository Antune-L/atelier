import { createPublicKey, verify } from "node:crypto";
import { chmodSync, readFileSync, renameSync, writeFileSync } from "node:fs";

const SOCKET = "/run/kanban-updater/control.sock";
const STATE = "/var/lib/kanban-updater/status.json";
const REPOSITORY = "https://github.com/Antune-L/atelier.git";
const TIMEOUT_MS = 10_000;
const MAX_TOKEN_BYTES = 16_384;
const MAX_PROGRESS_LENGTH = 512;
const MILLISECONDS_PER_SECOND = 1_000;
const KEY_TTL_MS = 300_000;
const MAX_BUFFER_LENGTH = 8_192;
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
let status: { phase: string; target: string | null; progress: string; updatedAt: number; exitCode: number | null } = { phase: "idle", target: null, progress: "Ready", updatedAt: Date.now(), exitCode: null };

function persist(phase: string, progress: string, target: string | null = status.target, exitCode: number | null = null): void {
  status = { phase, target, progress: progress.slice(0, MAX_PROGRESS_LENGTH), updatedAt: Date.now(), exitCode };
  writeFileSync(`${STATE}.tmp`, JSON.stringify(status), { mode: 0o600 });
  renameSync(`${STATE}.tmp`, STATE);
}

try {
  const saved: unknown = JSON.parse(readFileSync(STATE, "utf8"));
  if (!isRecord(saved) || typeof saved.phase !== "string" || typeof saved.progress !== "string"
    || !["idle", "resolving", "running", "succeeded", "failed", "interrupted"].includes(saved.phase)) {
    throw new Error("Invalid persisted updater state; operator inspection is required.");
  }
  const target = typeof saved.target === "string" && /^[0-9a-f]{40}$/.test(saved.target) ? saved.target : null;
  if (saved.phase === "running" || saved.phase === "resolving") persist("interrupted", "Updater restarted during an update. Operator inspection is required.", target);
  else persist(saved.phase, saved.progress, target, typeof saved.exitCode === "number" ? saved.exitCode : null);
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

async function upgrade(): Promise<void> {
  try {
    persist("resolving", "Resolving the main commit", null);
    const result = Bun.spawn(["/usr/bin/git", "ls-remote", REPOSITORY, "refs/heads/main"], {
      env: { PATH: "/usr/bin:/bin", GIT_TERMINAL_PROMPT: "0" }, stdout: "pipe", stderr: "ignore",
    });
    const timeout = setTimeout(() => result.kill(), TIMEOUT_MS);
    const output = await new Response(result.stdout).text();
    const code = await result.exited;
    clearTimeout(timeout);
    const target = output.split(/\s/)[0];
    if (code !== 0 || !target || !/^[0-9a-f]{40}$/.test(target)) throw new Error("Cannot resolve main.");
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
    else persist("failed", "Upgrade refused or failed. Inspect the updater journal; rollback restores code only. Do not retry before inspection.", target, exitCode);
  } catch {
    persist("failed", "Updater failed. Operator inspection is required before retrying.");
  } finally {
    active = false;
  }
}

Bun.serve({
  unix: SOCKET,
  maxRequestBodySize: 0,
  async fetch(request) {
    const path = new URL(request.url).pathname;
    if (!((path === "/status" && request.method === "GET") || (path === "/start" && request.method === "POST"))) return new Response(null, { status: 404 });
    if (!await authenticate(request.headers.get("Cf-Access-Jwt-Assertion") ?? "")) return new Response(null, { status: 403 });
    if (path === "/start") {
      if (active || status.phase === "interrupted" || status.phase === "failed") return new Response(null, { status: 409 });
      active = true;
      void upgrade();
    }
    return Response.json(status, { headers: { "cache-control": "no-store" } });
  },
});
chmodSync(SOCKET, 0o660);
