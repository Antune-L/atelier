---
name: coolify-preview-setup
description: Prepare a project's actual application for isolated Coolify pull-request previews, including requests such as "Préparer pour Coolify". Produce container files, a versioned recipe and local validation evidence through either Claude or Codex.
metadata:
  version: "1"
---

# Prepare Coolify previews

Prepare a reviewable repository change for the selected project. Keep implementation agents on their existing host; the preview contains only the application and its isolated dependencies. Inspect the project before choosing Dockerfile or Compose. Reuse maintained build, startup, migration, seed and container definitions.

This skill prepares repository files and validates local disposable resources. Deployment, DNS, source permissions, remote resource creation and publication require authorization from the current task. The recipe is an application contract, not a Coolify-native configuration file.

## Inspect the actual application

Read the project's instructions and durable lessons. Verify every path, package script and binary before citing it. Identify runtime versions, lockfiles, build output, server entry point, listening interface, internal ports, API/static routing, WebSockets, databases, uploads, migrations, authentication, background jobs and external integrations.

Choose a Dockerfile for one service. Choose Compose when required services or initialization genuinely need multiple containers. Explain the choice. Preserve ordinary local and production behavior.

Use existing fake integrations or isolated fixtures for email, payments, agents, production APIs and shared storage. A missing safe replacement blocks that user flow; do not hide it behind a success-returning stub. Never test email delivery without explicit authorization.

Check startup probes independently from fake adapters: SDK provisioning, credential discovery and scheduled jobs can run before application actions. Avoid downloading or authenticating live providers in a simulated preview. Prefer a real preview setting or a narrow runtime guard over a misleading binary override.

## Prepare the artifact

Make the image reproducible from tracked sources and lockfiles. Pin runtime versions, build static assets during image creation, and use the supported runtime entry point. Separate build dependencies when practical. Include non-JavaScript tools and vendored assets used at runtime.

Exclude developer environment files, credentials, local configuration, databases, uploads, caches and build output from the context. An explicit input allow-list is useful when a repository contains production state. Check its inputs against both build and runtime requirements.

Listen on a container-reachable interface and configure one explicit internal application port. Use an existing read-only health endpoint that verifies actual readiness. The health-check executable must exist in the final image. Preserve same-origin APIs and WebSocket proxy routing.

Preview data is disposable by default. A fresh container must start with its own non-secret fixture state. Document whether restart preserves that container's state and recreation resets it. Persistent storage requires explicit scoped ownership and lifecycle support; do not share a host path or production database.

Do not mount the Docker socket, home directories, developer credentials or production state. Never inject the deployment controller's Coolify credentials into the preview. Keep secret values out of recipes, task descriptions and evidence.

Write `.coolify/preview.json` with `version: 1`, `buildPack: "dockerfile"` or `"dockercompose"`, a repository-relative `buildContext`, integer internal `port`, same-origin `healthPath` beginning with `/`, and `environment` mapping names to non-secret runtime string values. Dockerfile recipes require a repository-relative `dockerfile`; Compose recipes require `composeFile`, `serviceName` identifying the public authentication gateway, and `authentication: "gateway"`. A Compose recipe's `port` is the gateway listener port; upstream service ports belong in Compose and gateway configuration. Include the selected container-definition path only. Optional `websocketPaths` lists application socket paths. The default state policy is ephemeral with no persistent mounts. This complete contract is available when the skill is embedded in a preparation ticket; [references/recipe.md](references/recipe.md) provides standalone examples.

For Compose previews, put an authentication gateway in front of every publicly routed application service. Keep application services private, and protect all gateway routes including readiness, API and WebSockets. Kanban supplies `KANBAN_PREVIEW_AUTH_USERNAME` and a bcrypt `KANBAN_PREVIEW_AUTH_HASH` privately at runtime; do not include either in recipe.environment or commit their values. The gateway service declares `${KANBAN_PREVIEW_AUTH_USERNAME}` and `${KANBAN_PREVIEW_AUTH_HASH}`. Other services explicitly set both variables to the fixed non-secret string `disabled` so Coolify's shared runtime environment file cannot leak gateway credentials into them. Copy gateway configuration into its image instead of mounting the checkout or Docker socket. A health check can require public HTTP 401 without credentials plus upstream readiness, without adding an unauthenticated bypass or plaintext password.

Keep remote authentication settings and secret references in the application's supported configuration mechanism. Review remote exposure and its authentication separately before deployment.

## Validate with disposable resources

Discover the installed package manager and Docker/Compose tools. Verify flags through help or official documentation before running them. Check the Docker daemon and architecture; a local ARM result does not prove AMD64 compatibility.

Run applicable existing project checks. Do not author tests unless asked. Build the actual candidate application image, never a replacement demonstration server. Give local resources unique names and bind browser access to a dynamically assigned loopback port. Do not reuse the live application port or data.

Kanban preparation tickets provide an absolute path to the bounded local-verification wrapper. Execute that exact wrapper from the prepared checkout with no arguments; do not bypass its command boundary by invoking Docker through an unrestricted shell or package-manager command. The wrapper validates Dockerfile recipes, builds an owned image, checks health and removes its own resources. It explicitly leaves browser and two-preview isolation checks unverified. Compose needs separately controlled manual validation; report that prerequisite.

The wrapper defaults to `.coolify/preview.json`. If the preparation ticket selects another recipe location, write `.coolify/verification.json` containing `{ "recipePath": "the/repository-relative/recipe.json" }` so the same no-argument wrapper verifies that location. The selector and chosen recipe must remain inside the prepared checkout; absolute paths and parent traversal are rejected. Include this non-secret selector in the preparation change when using a custom location.

Verify these observable gates:

1. The image builds from the prepared source and lockfile.
2. The application boots with isolated fixture state and safe integrations.
3. Health, static assets, a meaningful browser flow, API calls and used WebSockets work.
4. Two containers cannot read or change each other's data.
5. Restart and recreation follow the documented state policy.
6. Teardown removes exactly the owned containers and temporary resources.

Collect bounded startup logs before diagnosing readiness failures. Clean up owned resources after failure or interruption too. Never prune shared Docker resources. Distinguish a refused command from a technical failure. After two failures on the same issue, preserve evidence and present bounded alternatives.

Record the source revision, relevant uncommitted preparation changes, runtime architecture, tool versions, image identity, configuration, check outcomes and timestamps. Rebuild after required inputs change. Do not mark an image built before later changes as the final candidate.

Use these readiness outcomes accurately:

- `prepared`: repository changes exist; required validation remains incomplete.
- `locally_verified`: the actual artifact passed the local build, runtime, browser, isolation and cleanup gates.
- `coolify_verified`: the same candidate passed authorized live deployment and preview lifecycle checks.
- `blocked`: record the exact prerequisite and evidence with completed work preserved.

Keep `not_run`, `failed`, `blocked` and `passed` distinct. A health response alone does not prove browser functionality. Local verification does not prove DNS, authentication, GitHub App events, target architecture or remote cleanup.

## Provider and source scope

Preparation must work through both Claude and Codex using the same skill contract. When invoked by Kanban Agents, the preparation ticket embeds this bundled skill's exact instructions with the `[coolify-preview-setup:v1]` marker. No manually installed slash command is required. Preserve the selected orchestrator, implementation provider, isolated checkout, reviews, checks and draft PR workflow. Verify that both providers receive the embedded contract. Preserve existing review skills and narrow validation permissions.

The initial deployment integration supports GitHub. Keep existing Azure DevOps application behavior intact and report deployment support separately. Do not infer deployment authorization from preparation success.

## Official references

Read current documentation relevant to the project's selected build method and installed Coolify version before producing settings or API calls:

- [Dockerfile builds](https://coolify.io/docs/applications/builds/dockerfile)
- [Preview deployments](https://coolify.io/docs/applications/deployments/preview-deployments)
- [Health checks](https://coolify.io/docs/applications/configuration/health-checks)
- [Bun container guide](https://bun.sh/guides/ecosystem/docker), only for Bun applications
- [Caddy authentication](https://caddyserver.com/docs/caddyfile/directives/basic_auth), when preparing the Compose gateway

## Gotchas

- Coolify 4.3.23 runs Compose with `--project-directory` set to the recipe's `buildContext`. Resolve service build contexts and relative file paths from that directory, even when the Compose file lives in `.coolify`; reproduce this working-directory contract during local verification.
- Keep recipe paths repository-relative. Coolify 4.3.23 requires leading slashes for API `base_directory` and `dockerfile_location` values (root `/`); translate paths at the API boundary instead of changing recipe examples.
- Coolify 4.3.23's native Dockerfile HTTP authentication stores encrypted passwords in a 255-character column. Keep passwords within 31 UTF-8 bytes: a 32-byte input produces 256 ciphertext characters and fails before application creation. The Compose gateway is unaffected.
- A fake system adapter may not cover startup provisioning or probes. Inspect initialization paths rather than assuming dry-run isolates them all.
- Coolify may inject one runtime environment file into every Compose service. Explicitly blank gateway authentication variables in upstream services rather than assuming service.environment prevents inheritance.
- Kanban Agents' legacy configuration migration removes its input after importing it. Only copy a disposable non-secret fixture into the fresh data root.
- Kanban Agents' `startServer` needs an explicit `dataRoot` to isolate logs, uploads and configuration alongside its database; a database environment override alone is incomplete.
- A container restart retains its writable layer. A new container resets it only when no persistent volume supplies old data.
- An automatically assigned host port can change on container restart. Read the current published loopback port again instead of assuming the original address remains valid.
- Native PR events can recreate a manually removed preview after a later push. Verify trigger suppression before promising durable manual-stop behavior.
- A Mac-owned expiration timer cannot enforce a deadline while the Mac is offline. Verify server-side enforcement separately.
