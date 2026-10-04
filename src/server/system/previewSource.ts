import { posix } from "node:path";

import { z } from "zod";

import { PREVIEW_AUTH_DISABLED_VALUE, PREVIEW_AUTH_HASH_ENV, PREVIEW_AUTH_USERNAME_ENV, previewRecipeSchema, previewGithubRepositorySchema, previewBranchSchema } from "../../shared/preview.ts";
import type { PreviewReadiness, PreviewRecipe } from "../../shared/preview.ts";

import { runBoundedCommand, safeJsonParse } from "./boundedCommand.ts";

class PreviewPreparationError extends Error {
  constructor(message: string, readonly revision: string) { super(message); }
}

class PreviewInspectionError extends Error {
  constructor(message: string, readonly revision: string) { super(message); }
}

const SHA_SCHEMA = z.string().regex(/^[a-f0-9]{40}$/i);
const PULL_SCHEMA = z.object({ head: z.object({ sha: SHA_SCHEMA, ref: z.string().min(1), repo: z.object({ full_name: z.string().min(1) }).nullable() }), base: z.object({ repo: z.object({ full_name: z.string().min(1) }) }), state: z.enum(["open", "closed"]), merged: z.boolean() });
const CONTENT_SCHEMA = z.object({ type: z.literal("file"), encoding: z.literal("base64"), content: z.string() });
const COMPOSE_SCHEMA = z.object({ services: z.record(z.string(), z.object({ image: z.string().optional(), environment: z.union([z.record(z.string(), z.unknown()), z.array(z.string())]).optional(), volumes: z.array(z.string()).optional(), build: z.unknown().optional() }).passthrough()) }).passthrough();

function environmentValue(environment: z.infer<typeof COMPOSE_SCHEMA>["services"][string]["environment"], key: string): unknown {
  if (Array.isArray(environment)) return environment.find((value) => value.startsWith(`${key}=`))?.slice(key.length + 1);
  return environment?.[key];
}

function repositoryPath(...parts: string[]): string {
  const root = "/preview-repository";
  const path = posix.resolve(root, ...parts);
  if (path !== root && !path.startsWith(`${root}/`)) throw new Error("The preview gateway configuration must remain in the repository.");
  return posix.relative(root, path) || ".";
}

function validateComposeGateway(text: string, recipe: Extract<PreviewRecipe, { buildPack: "dockercompose" }>) {
  const compose = COMPOSE_SCHEMA.parse(Bun.YAML.parse(text));
  const gateway = compose.services[recipe.serviceName];
  if (!gateway) throw new Error("The prepared preview gateway service is missing.");
  for (const [name, service] of Object.entries(compose.services)) {
    for (const key of [PREVIEW_AUTH_USERNAME_ENV, PREVIEW_AUTH_HASH_ENV]) {
      const expected = name === recipe.serviceName ? `\${${key}}` : PREVIEW_AUTH_DISABLED_VALUE;
      if (environmentValue(service.environment, key) !== expected) throw new Error("Compose preview authentication must be scoped to the gateway and disabled explicitly on every other service.");
    }
    if (service.build !== undefined && /KANBAN_PREVIEW_AUTH_/i.test(JSON.stringify(service.build))) throw new Error("Compose preview authentication must never enter image builds.");
  }
  const mount = gateway.volumes?.find((volume) => volume.endsWith(":/etc/caddy/Caddyfile:ro"));
  const directory = recipe.buildContext;
  if (mount && gateway.image?.startsWith("caddy:")) {
    const source = mount.slice(0, -":/etc/caddy/Caddyfile:ro".length);
    if (!source.startsWith("./") || source.includes("\\")) throw new Error("The Caddy configuration must be a repository file relative to the recipe build context.");
    return { caddyPath: repositoryPath(directory, source), dockerfilePath: null, buildContext: null };
  }
  const build = z.object({ context: z.string(), dockerfile: z.string().default("Dockerfile") }).parse(gateway.build);
  const buildContext = repositoryPath(directory, build.context, ".");
  return { caddyPath: null, dockerfilePath: repositoryPath(buildContext, build.dockerfile), buildContext };
}

export async function readPreviewRepository(repoPath: string) {
  const repositoryResult = await runBoundedCommand(["gh", "repo", "view", "--json", "nameWithOwner,url,isPrivate"], repoPath);
  if (repositoryResult.exitCode !== 0 || repositoryResult.timedOut) throw new Error("The configured GitHub repository identity could not be read.");
  const identity = z.object({ nameWithOwner: z.string().regex(/^[^/]+\/[^/]+$/), url: z.url(), isPrivate: z.boolean() }).parse(JSON.parse(repositoryResult.stdout));
  const url = new URL(identity.url);
  if (url.protocol !== "https:" || url.username || url.password || url.port || url.pathname.replace(/\/$/, "").toLowerCase() !== `/${identity.nameWithOwner}`.toLowerCase()) throw new Error("The configured GitHub repository identity is invalid.");
  return previewGithubRepositorySchema.parse({ repository: identity.nameWithOwner, host: url.hostname, visibility: identity.isPrivate ? "private" : "public" });
}

export async function readPreviewSource(repoPath: string, prUrl: string, recipePath: string) {
  const identity = await readPreviewRepository(repoPath);
  const expectedHost = identity.host;
  const url = new URL(prUrl);
  const match = /^\/([^/]+)\/([^/]+)\/pull\/([0-9]+)$/.exec(url.pathname);
  const repository = identity.repository;
  if (url.protocol !== "https:" || url.hostname !== expectedHost || !match || `${match[1]}/${match[2]}`.toLowerCase() !== repository.toLowerCase()) throw new Error("The preview pull request must belong to the configured GitHub repository.");
  const pull = await runBoundedCommand(["gh", "api", "--hostname", expectedHost, `repos/${repository}/pulls/${match[3]}`], repoPath);
  if (pull.exitCode !== 0 || pull.timedOut) throw new Error("The latest GitHub pull request revision could not be read.");
  const parsed = PULL_SCHEMA.parse(JSON.parse(pull.stdout));
  if (parsed.state !== "open" && !parsed.merged) throw new Error("The pull request is closed without being merged.");
  if (parsed.base.repo.full_name.toLowerCase() !== repository.toLowerCase() || parsed.head.repo?.full_name.toLowerCase() !== repository.toLowerCase()) throw new Error("Fork pull requests are not supported by this preview recipe.");
  const recipe = await readPreviewRecipe(repoPath, identity, parsed.head.sha, recipePath);
  return { ...identity, revision: parsed.head.sha, branch: parsed.head.ref, recipe };
}

async function readPreviewFile(repoPath: string, identity: ReturnType<typeof previewGithubRepositorySchema.parse>, revision: string, filePath: string): Promise<string> {
  try {
    const result = await runBoundedCommand(["gh", "api", "--hostname", identity.host, `repos/${identity.repository}/contents/${filePath.split("/").map(encodeURIComponent).join("/")}?ref=${revision}`], repoPath);
    if (result.exitCode !== 0 || result.timedOut) {
      if (!result.timedOut && /\(HTTP 404\)/.test(result.stderr)) {
        const tree = await runBoundedCommand(["gh", "api", "--hostname", identity.host, `repos/${identity.repository}/git/trees/${revision}?recursive=1`], repoPath);
        if (tree.exitCode === 0 && !tree.timedOut) {
          const parsed = z.object({ truncated: z.boolean(), tree: z.array(z.object({ path: z.string() })) }).safeParse(safeJsonParse(tree.stdout));
          if (parsed.success && !parsed.data.truncated && !parsed.data.tree.some((entry) => entry.path === filePath)) throw new PreviewPreparationError(`The preview file ${filePath} is missing from revision ${revision}. Prepare this branch before starting a preview.`, revision);
        }
      }
      throw new PreviewInspectionError(`The preview file ${filePath} could not be read at revision ${revision}. Check GitHub access and connectivity before retrying.`, revision);
    }
    const file = CONTENT_SCHEMA.parse(JSON.parse(result.stdout));
    return Buffer.from(file.content, "base64").toString("utf8");
  } catch (error) {
    if (error instanceof PreviewPreparationError || error instanceof PreviewInspectionError) throw error;
    throw new PreviewInspectionError(`The preview file ${filePath} could not be inspected at revision ${revision}. Check GitHub access and connectivity before retrying.`, revision);
  }
}

async function readPreviewRecipe(repoPath: string, identity: ReturnType<typeof previewGithubRepositorySchema.parse>, revision: string, recipePath: string): Promise<PreviewRecipe> {
  try {
    const recipe = previewRecipeSchema.parse(JSON.parse(await readPreviewFile(repoPath, identity, revision, recipePath)));
    const buildPath = recipe.buildPack === "dockerfile" ? recipe.dockerfile : recipe.composeFile;
    const buildText = await readPreviewFile(repoPath, identity, revision, buildPath);
    if (/\{\{\s*(?:environment|project|team)\./i.test(buildText)) throw new Error("Preview build files must not reference shared Coolify secrets.");
    if (recipe.buildPack === "dockercompose") {
      const gateway = validateComposeGateway(buildText, recipe);
      let caddyPath = gateway.caddyPath;
      if (gateway.dockerfilePath && gateway.buildContext !== null) {
        const dockerfileText = await readPreviewFile(repoPath, identity, revision, gateway.dockerfilePath);
        const copy = /^COPY\s+(\S+)\s+\/etc\/caddy\/Caddyfile\s*$/m.exec(dockerfileText);
        if (!/^FROM\s+caddy:/im.test(dockerfileText) || !copy?.[1]) throw new Error("The gateway image must use Caddy and copy its tracked configuration into /etc/caddy/Caddyfile.");
        caddyPath = repositoryPath(gateway.buildContext, copy[1]);
      }
      if (!caddyPath) throw new Error("The tracked Caddy gateway configuration could not be identified.");
      const caddyText = await readPreviewFile(repoPath, identity, revision, caddyPath);
      const username = `\\{(?:env\\.${PREVIEW_AUTH_USERNAME_ENV}|\\$${PREVIEW_AUTH_USERNAME_ENV})\\}`;
      const password = `\\{(?:env\\.${PREVIEW_AUTH_HASH_ENV}|\\$${PREVIEW_AUTH_HASH_ENV})\\}`;
      const gatewayPattern = new RegExp(`^\\s*(?:\\{\\s*(?:(?:admin off|auto_https off|persist_config off)\\s*)*\\}\\s*)?:${recipe.port}\\s*\\{\\s*basic_auth\\s*\\{\\s*${username}\\s+${password}\\s*\\}\\s*reverse_proxy\\s+[a-zA-Z0-9_.-]+:[0-9]+\\s*\\}\\s*$`);
      if (!gatewayPattern.test(caddyText)) throw new Error("The Caddy gateway must use the prepared global authentication and reverse proxy configuration without bypass routes.");
    }
    return recipe;
  } catch (error) {
    if (error instanceof PreviewPreparationError || error instanceof PreviewInspectionError) throw error;
    const message = error instanceof Error ? error.message : "The preview recipe is invalid.";
    throw new PreviewPreparationError(message, revision);
  }
}

export async function readPreviewBranchSource(repoPath: string, branch: string, recipePath: string) {
  const selectedBranch = previewBranchSchema.parse(branch);
  const identity = await readPreviewRepository(repoPath);
  const result = await runBoundedCommand(["gh", "api", "--hostname", identity.host, `repos/${identity.repository}/branches/${encodeURIComponent(selectedBranch)}`], repoPath);
  if (result.exitCode !== 0 || result.timedOut) throw new Error("The latest remote branch revision could not be read. Check the selected branch, GitHub access and connectivity.");
  const parsed = z.object({ name: z.string().min(1), commit: z.object({ sha: SHA_SCHEMA }) }).parse(JSON.parse(result.stdout));
  if (parsed.name !== selectedBranch) throw new Error("The returned GitHub branch does not match the selected branch.");
  const recipe = await readPreviewRecipe(repoPath, identity, parsed.commit.sha, recipePath);
  return { ...identity, revision: parsed.commit.sha, branch: selectedBranch, recipe };
}

export async function inspectPreviewReadiness(repoPath: string, branch: string, recipePath: string): Promise<PreviewReadiness> {
  try {
    const source = await readPreviewBranchSource(repoPath, branch, recipePath);
    return { status: "ready", branch: source.branch, revision: source.revision, diagnostics: [], preparationTicketId: null, preparationRetryAvailable: false };
  } catch (error) {
    const status = error instanceof PreviewPreparationError ? "not_ready" : "check_error";
    const revision = error instanceof PreviewPreparationError || error instanceof PreviewInspectionError ? error.revision : null;
    const message = error instanceof Error ? error.message : "Preview preparation could not be checked.";
    return { status, branch, revision, diagnostics: [message], preparationTicketId: null, preparationRetryAvailable: false };
  }
}
