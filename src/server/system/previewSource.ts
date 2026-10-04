import { posix } from "node:path";

import { z } from "zod";

import { PREVIEW_AUTH_DISABLED_VALUE, PREVIEW_AUTH_HASH_ENV, PREVIEW_AUTH_USERNAME_ENV, previewRecipeSchema } from "../../shared/preview.ts";
import type { PreviewRecipe } from "../../shared/preview.ts";

import { runBoundedCommand } from "./boundedCommand.ts";

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
  const directory = posix.dirname(recipe.composeFile);
  if (mount && gateway.image?.startsWith("caddy:")) {
    const source = mount.slice(0, -":/etc/caddy/Caddyfile:ro".length);
    if (!source.startsWith("./") || source.includes("\\")) throw new Error("The Caddy configuration must be a repository file next to the Compose file.");
    return { caddyPath: repositoryPath(directory, source), dockerfilePath: null, buildContext: null };
  }
  const build = z.object({ context: z.string(), dockerfile: z.string().default("Dockerfile") }).parse(gateway.build);
  const buildContext = repositoryPath(directory, build.context, ".");
  return { caddyPath: null, dockerfilePath: repositoryPath(buildContext, build.dockerfile), buildContext };
}

export async function readPreviewSource(repoPath: string, prUrl: string, recipePath: string) {
  const repositoryResult = await runBoundedCommand(["gh", "repo", "view", "--json", "nameWithOwner,url"], repoPath);
  if (repositoryResult.exitCode !== 0 || repositoryResult.timedOut) throw new Error("The configured GitHub repository identity could not be read.");
  const identity = z.object({ nameWithOwner: z.string().min(1), url: z.url() }).parse(JSON.parse(repositoryResult.stdout));
  const expectedHost = new URL(identity.url).hostname;
  const url = new URL(prUrl);
  const match = /^\/([^/]+)\/([^/]+)\/pull\/([0-9]+)$/.exec(url.pathname);
  const repository = identity.nameWithOwner;
  if (url.protocol !== "https:" || url.hostname !== expectedHost || !match || `${match[1]}/${match[2]}`.toLowerCase() !== repository.toLowerCase()) throw new Error("The preview pull request must belong to the configured GitHub repository.");
  const pull = await runBoundedCommand(["gh", "api", "--hostname", expectedHost, `repos/${repository}/pulls/${match[3]}`], repoPath);
  if (pull.exitCode !== 0 || pull.timedOut) throw new Error("The latest GitHub pull request revision could not be read.");
  const parsed = PULL_SCHEMA.parse(JSON.parse(pull.stdout));
  if (parsed.state !== "open" && !parsed.merged) throw new Error("The pull request is closed without being merged.");
  if (parsed.base.repo.full_name.toLowerCase() !== repository.toLowerCase() || parsed.head.repo?.full_name.toLowerCase() !== repository.toLowerCase()) throw new Error("Fork pull requests are not supported by this preview recipe.");
  const content = await runBoundedCommand(["gh", "api", "--hostname", expectedHost, `repos/${repository}/contents/${recipePath.split("/").map(encodeURIComponent).join("/")}?ref=${parsed.head.sha}`], repoPath);
  if (content.exitCode !== 0 || content.timedOut) throw new Error("The preview recipe is missing from the exact pull request revision. Create a preparation ticket first.");
  const file = CONTENT_SCHEMA.parse(JSON.parse(content.stdout));
  const recipe = previewRecipeSchema.parse(JSON.parse(Buffer.from(file.content, "base64").toString("utf8")));
  const buildPath = recipe.buildPack === "dockerfile" ? recipe.dockerfile : recipe.composeFile;
  const build = await runBoundedCommand(["gh", "api", "--hostname", expectedHost, `repos/${repository}/contents/${buildPath.split("/").map(encodeURIComponent).join("/")}?ref=${parsed.head.sha}`], repoPath);
  if (build.exitCode !== 0 || build.timedOut) throw new Error("The preview build file is missing from the exact pull request revision.");
  const buildFile = CONTENT_SCHEMA.parse(JSON.parse(build.stdout));
  const buildText = Buffer.from(buildFile.content, "base64").toString("utf8");
  if (/\{\{\s*(?:environment|project|team)\./i.test(buildText)) throw new Error("Preview build files must not reference shared Coolify secrets.");
  if (recipe.buildPack === "dockercompose") {
    const gateway = validateComposeGateway(buildText, recipe);
    let caddyPath = gateway.caddyPath;
    if (gateway.dockerfilePath && gateway.buildContext !== null) {
      const dockerfileResult = await runBoundedCommand(["gh", "api", "--hostname", expectedHost, `repos/${repository}/contents/${gateway.dockerfilePath.split("/").map(encodeURIComponent).join("/")}?ref=${parsed.head.sha}`], repoPath);
      if (dockerfileResult.exitCode !== 0 || dockerfileResult.timedOut) throw new Error("The gateway Dockerfile is missing from the exact pull request revision.");
      const dockerfile = CONTENT_SCHEMA.parse(JSON.parse(dockerfileResult.stdout));
      const dockerfileText = Buffer.from(dockerfile.content, "base64").toString("utf8");
      const copy = /^COPY\s+(\S+)\s+\/etc\/caddy\/Caddyfile\s*$/m.exec(dockerfileText);
      if (!/^FROM\s+caddy:/im.test(dockerfileText) || !copy?.[1]) throw new Error("The gateway image must use Caddy and copy its tracked configuration into /etc/caddy/Caddyfile.");
      caddyPath = repositoryPath(gateway.buildContext, copy[1]);
    }
    if (!caddyPath) throw new Error("The tracked Caddy gateway configuration could not be identified.");
    const caddyResult = await runBoundedCommand(["gh", "api", "--hostname", expectedHost, `repos/${repository}/contents/${caddyPath.split("/").map(encodeURIComponent).join("/")}?ref=${parsed.head.sha}`], repoPath);
    if (caddyResult.exitCode !== 0 || caddyResult.timedOut) throw new Error("The protected Caddy gateway configuration is missing from the exact pull request revision.");
    const caddyFile = CONTENT_SCHEMA.parse(JSON.parse(caddyResult.stdout));
    const caddyText = Buffer.from(caddyFile.content, "base64").toString("utf8");
    const username = `\\{(?:env\\.${PREVIEW_AUTH_USERNAME_ENV}|\\$${PREVIEW_AUTH_USERNAME_ENV})\\}`;
    const password = `\\{(?:env\\.${PREVIEW_AUTH_HASH_ENV}|\\$${PREVIEW_AUTH_HASH_ENV})\\}`;
    const gatewayPattern = new RegExp(`^\\s*(?:\\{\\s*(?:(?:admin off|auto_https off|persist_config off)\\s*)*\\}\\s*)?:${recipe.port}\\s*\\{\\s*basic_auth\\s*\\{\\s*${username}\\s+${password}\\s*\\}\\s*reverse_proxy\\s+[a-zA-Z0-9_.-]+:[0-9]+\\s*\\}\\s*$`);
    if (!gatewayPattern.test(caddyText)) throw new Error("The Caddy gateway must use the prepared global authentication and reverse proxy configuration without bypass routes.");
  }
  return { revision: parsed.head.sha, branch: parsed.head.ref, repository, recipe };
}
