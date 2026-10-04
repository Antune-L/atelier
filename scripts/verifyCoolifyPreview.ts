import { randomUUID } from "node:crypto";
import { readdir, readFile, realpath } from "node:fs/promises";
import { isAbsolute, join, relative, resolve } from "node:path";

import { DEFAULT_PREVIEW_RECIPE_PATH, previewProjectSettingsSchema, previewRecipeSchema } from "../src/shared/preview.ts";

const OWNERSHIP_LABEL = "kanban.preview.validation";
const RESOURCE_PREFIX = "kanban-preview-check-";
const VERIFICATION_SELECTOR_PATH = ".coolify/verification.json";
const BUILD_TIMEOUT_MS = 600_000;
const COMMAND_TIMEOUT_MS = 30_000;
const HEALTH_DEADLINE_MS = 30_000;
const HEALTH_REQUEST_TIMEOUT_MS = 3_000;
const POLL_INTERVAL_MS = 500;
const OUTPUT_LIMIT = 4_000;
const MAX_CONTEXT_ENTRIES = 200_000;
const SHA256_ID = /^(?:sha256:)?[a-f0-9]{64}$/;
const ENVIRONMENT_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;
const LOCAL_PORT = /^127\.0\.0\.1:(\d+)$/;

async function boundedOutput(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let output = "";
  for (;;) {
    const chunk = await reader.read();
    if (chunk.done) break;
    output = (output + decoder.decode(chunk.value, { stream: true })).slice(-OUTPUT_LIMIT);
  }
  return output.trim();
}

async function docker(args: string[], cwd: string, timeout = COMMAND_TIMEOUT_MS): Promise<string> {
  const child = Bun.spawn(["docker", ...args], {
    cwd,
    stdin: "ignore",
    stdout: "pipe",
    stderr: "pipe",
    timeout,
    killSignal: "SIGKILL",
  });
  const interrupt = () => child.kill("SIGTERM");
  process.once("SIGINT", interrupt);
  process.once("SIGTERM", interrupt);
  try {
    const [exitCode, stdout, stderr] = await Promise.all([child.exited, boundedOutput(child.stdout), boundedOutput(child.stderr)]);
    if (exitCode !== 0) throw new Error(`Docker ${args[0]} failed (${exitCode}): ${stderr || stdout}`);
    return stdout || stderr;
  } finally {
    process.removeListener("SIGINT", interrupt);
    process.removeListener("SIGTERM", interrupt);
  }
}

function requireConfined(root: string, path: string): void {
  const difference = relative(root, path);
  if (isAbsolute(difference) || difference === ".." || difference.startsWith("../")) {
    throw new Error("Preview inputs must remain inside the working repository.");
  }
}

async function confinedPath(root: string, path: string): Promise<string> {
  const result = await realpath(resolve(root, path));
  requireConfined(root, result);
  return result;
}

async function checkContextLinks(root: string): Promise<void> {
  const pending = [root];
  let count = 0;
  while (pending.length > 0) {
    const directory = pending.pop();
    if (directory === undefined) break;
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      count += 1;
      if (count > MAX_CONTEXT_ENTRIES) throw new Error("Build context is too large for controlled verification; reduce it before retrying.");
      const path = join(directory, entry.name);
      if (entry.isSymbolicLink()) requireConfined(root, await realpath(path));
      if (entry.isDirectory()) pending.push(path);
    }
  }
}

function checkDockerfile(contents: string): void {
  const unsafeBuildFeatures = /--mount\s*=\s*[^\n]*(?:type\s*=\s*(?:ssh|secret|bind))|--network\s*=\s*host|--security\s*=\s*insecure|^\s*ADD\s+[^\n]*(?:https?:\/\/|git@|ssh:\/\/)/im;
  if (unsafeBuildFeatures.test(contents)) throw new Error("Controlled verification does not allow remote ADD, SSH/secrets/bind mounts or host build privileges.");
  const syntax = contents.match(/^\s*#\s*syntax\s*=\s*(\S+)/im)?.[1];
  if (syntax !== undefined && !/^docker\/dockerfile:(?:1(?:\.\d+)*(?:-labs)?)$/.test(syntax)) {
    throw new Error("Controlled verification requires the standard Dockerfile frontend.");
  }
}

async function waitForHealth(url: URL, requireDryRun: boolean): Promise<void> {
  const deadline = Date.now() + HEALTH_DEADLINE_MS;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(HEALTH_REQUEST_TIMEOUT_MS) });
      if (response.ok) {
        if (!requireDryRun) return;
        const body: unknown = await response.json();
        if (body !== null && typeof body === "object" && "dryRun" in body && body.dryRun === true) return;
        throw new Error("The Kanban preview must report dryRun=true.");
      }
    } catch {
      if (Date.now() >= deadline) break;
    }
    await Bun.sleep(POLL_INTERVAL_MS);
  }
  throw new Error("The isolated application did not become ready before the deadline.");
}

async function cleanupOwnedResources(cwd: string, identity: string, resources: { type: "container" | "image"; id: string | null; name: string }[]): Promise<void> {
  const failures: string[] = [];
  for (const resource of resources) {
    try {
      const identifier = resource.id ?? await docker(["inspect", "--type", resource.type, "--format", "{{.Id}}", resource.name], cwd).catch(() => null);
      if (identifier === null) continue;
      if (!SHA256_ID.test(identifier)) throw new Error("Cannot validate the owned resource identifier.");
      const marker = await docker(["inspect", "--type", resource.type, "--format", `{{index .Config.Labels "${OWNERSHIP_LABEL}"}}`, identifier], cwd);
      if (marker !== identity) throw new Error("Ownership marker did not match; resource retained.");
      const args = resource.type === "container" ? ["rm", "--force", identifier] : ["image", "rm", identifier];
      await docker(args, cwd);
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
    }
  }
  if (failures.length > 0) throw new Error(`Owned-resource cleanup failed: ${failures.join("; ")}`);
}

async function verify(): Promise<void> {
  if (process.argv.length > 2) throw new Error("This verifier accepts no arguments; run it in the prepared repository.");
  if (Bun.which("docker") === null) throw new Error("Docker is not installed.");
  const cwd = await realpath(process.cwd());
  let selectedRecipePath = DEFAULT_PREVIEW_RECIPE_PATH;
  if (await Bun.file(join(cwd, VERIFICATION_SELECTOR_PATH)).exists()) {
    const selectorPath = await confinedPath(cwd, VERIFICATION_SELECTOR_PATH);
    const selector = previewProjectSettingsSchema.pick({ recipePath: true }).strict().parse(JSON.parse(await readFile(selectorPath, "utf8")));
    selectedRecipePath = selector.recipePath;
  }
  const recipePath = await confinedPath(cwd, selectedRecipePath);
  const recipe = previewRecipeSchema.parse(JSON.parse(await readFile(recipePath, "utf8")));
  if (recipe.buildPack !== "dockerfile") throw new Error("Compose requires separately controlled manual verification; this helper validates Dockerfile recipes only.");
  const context = await confinedPath(cwd, recipe.buildContext);
  const dockerfile = await confinedPath(cwd, recipe.dockerfile);
  requireConfined(context, dockerfile);
  await checkContextLinks(context);
  await checkDockerfile(await readFile(dockerfile, "utf8"));
  for (const name of Object.keys(recipe.environment)) {
    if (!ENVIRONMENT_NAME.test(name)) throw new Error("The preview recipe contains an invalid environment variable name.");
  }
  const healthUrl = new URL(recipe.healthPath, "http://127.0.0.1");
  if (healthUrl.origin !== "http://127.0.0.1" || healthUrl.username || healthUrl.password) {
    throw new Error("The health path must stay on the local preview origin.");
  }
  const identity = randomUUID();
  const name = RESOURCE_PREFIX + identity;
  const image = `${name}:local`;
  let containerId: string | null = null;
  let imageId: string | null = null;
  let interrupted = false;
  const interrupt = () => { interrupted = true; };
  process.once("SIGINT", interrupt);
  process.once("SIGTERM", interrupt);
  try {
    await docker(["version", "--format", "{{.Server.Version}}"], cwd);
    console.log("Building the prepared application in a disposable image.");
    await docker(["build", "--file", dockerfile, "--tag", image, "--label", `${OWNERSHIP_LABEL}=${identity}`, context], cwd, BUILD_TIMEOUT_MS);
    imageId = await docker(["inspect", "--type", "image", "--format", "{{.Id}}", image], cwd);
    if (!SHA256_ID.test(imageId)) throw new Error("Docker returned an invalid image identifier.");
    const volumes: unknown = JSON.parse(await docker(["inspect", "--type", "image", "--format", "{{json .Config.Volumes}}", imageId], cwd));
    if (volumes !== null && (typeof volumes !== "object" || Object.keys(volumes).length > 0)) {
      throw new Error("Controlled verification requires an image without persistent or anonymous volume declarations.");
    }
    if (interrupted) throw new Error("Preview verification interrupted.");
    const environment = Object.entries(recipe.environment).flatMap(([key, value]) => ["--env", `${key}=${value}`]);
    containerId = await docker(["run", "--detach", "--name", name, "--label", `${OWNERSHIP_LABEL}=${identity}`, "--publish", `127.0.0.1::${recipe.port}`, ...environment, imageId], cwd);
    if (!SHA256_ID.test(containerId)) throw new Error("Docker returned an invalid container identifier.");
    const address = await docker(["port", containerId, `${recipe.port}/tcp`], cwd);
    const match = address.match(LOCAL_PORT);
    const port = match?.[1];
    if (port === undefined) throw new Error("Docker did not publish the preview exclusively on loopback.");
    healthUrl.port = port;
    await waitForHealth(healthUrl, recipe.environment.KANBAN_DRY_RUN === "1");
    if (interrupted) throw new Error("Preview verification interrupted.");
    console.log(JSON.stringify({ status: "passed", imageId, buildPack: recipe.buildPack, port: recipe.port, healthPath: recipe.healthPath, browser: "not_run", isolation: "not_run", remote: "not_run" }));
  } catch (error) {
    if (containerId !== null && SHA256_ID.test(containerId)) {
      console.error(await docker(["logs", "--tail", "30", containerId], cwd).catch(() => "Startup logs unavailable."));
    }
    throw error;
  } finally {
    process.removeListener("SIGINT", interrupt);
    process.removeListener("SIGTERM", interrupt);
    await cleanupOwnedResources(cwd, identity, [{ type: "container", id: containerId, name }, { type: "image", id: imageId, name: image }]);
    console.log("Owned preview containers and image tags removed.");
  }
}

try {
  await verify();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
