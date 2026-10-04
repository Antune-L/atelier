# Project deploy keys and live preview verification

## Current state

- Base revision: `0c5d52b2eb9ebb78934fdd9c5a6f595ae3d56d7d`.
- Implementation is isolated on `feat/coolify-project-deploy-key` in a managed worktree. The primary checkout remains unchanged.
- The requested behavior is an optional project key selection that takes priority over the existing GitHub App/public source selection. An unavailable selected key must fail explicitly.
- Coolify supports listing private-key metadata and creating applications using an existing key reference. Kanban must retain only the reference and strip key material from responses.
- Claude and Codex use the same preview backend. Their agent execution paths are unchanged. Existing Azure DevOps behavior is outside this GitHub preview source change and must remain unchanged.
- Implementation and independent simplifier/regression review are complete. Project key selection takes priority, unavailable selected keys fail without fallback, and only key UUID/name metadata crosses the Kanban API.
- Live metadata inspection confirmed Coolify 4.3.23 and matched its selected public key to the private source repository's read-only GitHub deploy key. Private key content was not printed or persisted.
- The source project has no application preview container recipe. Its existing Compose file starts only a development database. The user requires all source-project adaptations to remain in the temporary local test copy, with no commit, push or change to the original repository.
- Live verification succeeded. The temporary Nixpacks deployment cloned the private source through the new deploy-key path, built the application and started its database, backend and protected frontend. The deployed commit matches the frozen source revision, and Kanban reports the preview ready.
- The first build exhausted Node's approximately 2 GiB heap limit during frontend compilation. The host reported approximately 10 GiB available. The first attempt was cleaned successfully; a build-only 6 GiB heap limit let the second attempt complete. This adjustment exists only in the disposable source-project recipe.

## Verification and next action

- Typecheck, lint, web build, and diff whitespace checks passed. Existing tests: 268 passed in the sandbox; the remaining 11 MCP tests passed after rerunning with local socket permission. No new tests were added.
- Twelve disposable simulated probes passed, covering metadata redaction, source precedence, failures without fallback, partial setting updates, and frozen attempt credentials.
- A real Playwright browser journey against an isolated dry-run server verified selecting, saving, clearing and restoring the key, the existing automatic source mode, and a retained missing key with an explicit error. No browser console errors were observed. This does not prove a live clone.
- The temporary Compose recipe parses and its 32 source inputs exist. It describes a schema-only PostgreSQL database, backend and authenticated frontend gateway, without production credentials or email testing. No source-project changes were committed or pushed.
- The isolated live harness uses the real PreviewManager for source selection, frozen key/commit, application creation, health checks and cleanup. Only its temporary build configuration is adapted to Nixpacks. Its one-hour expiration and cleanup loop remains active while the successful preview is available.
- A real Playwright browser loaded the source project's login page over HTTPS with status 200. Its authenticated health request returned 200; an unauthenticated request returned 401. No console errors, page errors or failed browser requests were observed. Credentials were loaded in memory and scoped to the preview origin. No login, account activation, password reset or email operation was performed.

## Scope and remaining limits

- Coolify 4.3.23 always reloads Compose from Git during a Git-backed deployment; inline Dockerfiles skip Git cloning. The temporary probe instead uses verified Nixpacks custom commands and Node 24, PostgreSQL 17 and Caddy packages, without publishing build files to the source repository.
- Filtered server-side logs identified the frontend memory failure. The configured API token hides deployment logs; no token permissions were changed. Native Coolify health checks are disabled for this temporary application; the manager performs authenticated health verification.
- Authenticated business workflows and outbound integrations were not exercised. The preview uses fresh test data and dummy integration credentials.
- The source repository remains unprepared for ordinary repeatable previews: this verification intentionally supplied an external local-only build recipe, as requested. Nixpacks support was not added to the product recipe schema.
- A listed key proves availability, not clone permission. The tested key's access was separately established by the successful live clone.

## History

- 2026-10-04: User authorized implementation with Sol high subagents and defined success as an accessible preview of a private repository in another organization. Requested notification at the live-test stage.
- 2026-10-04: User clarified that source-project deployment adjustments must stay local to the disposable test project; its repository must remain unchanged.
