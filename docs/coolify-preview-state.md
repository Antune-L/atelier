# Coolify preview implementation state

## Current summary

- Base: `897e98b` on `main`; implementation branch: `feature/coolify-previews` in the managed `coolify-previews` worktree.
- Scope: GitHub V1; Azure DevOps preview support is deferred. Existing Azure behavior must remain unchanged. Claude and Codex run browser verification on the Mac against the remote preview.
- Verified infrastructure: Coolify 4.3.23 responds to authenticated read requests; its server is reachable/usable; the `kanban-agents` project exists; the GitHub App exposes `Antune-L/atelier`, matching this checkout. No application existed at preflight. The supplied token has read, write and deploy permissions according to the user's dashboard.
- Docker: local OrbStack daemon is available. Worktree dependencies installed from the existing frozen lockfile.
- Design: separate disposable Coolify application per preview attempt, latest PR commit pinned at creation, automatic GitHub deployments disabled, durable stop intent, and owned-resource cleanup. Native HTTP Basic authentication protects Dockerfile previews. Compose previews require a tracked authenticated gateway because Coolify's native protection does not cover Compose routing. Credentials stay outside committed source and public settings responses.
- Implemented: shared persistence/configuration, Coolify client/lifecycle, settings/project/ticket interface, remote quality target for Claude and Codex, Docker recipe, bundled preparation skill and bounded local Docker verification helper. Compose gateway support is undergoing final integration.
- Cleanup evidence: Coolify application deletion queues a remote job and immediately hides the application. A successful response or subsequent 404 is insufficient to prove resource removal. The bounded SSH verifier checks exact ownership and removes only the preview's containers, volumes, networks and application directory before deleting its Coolify record. Strict SSH access and read-only verification of a nonexistent application are verified. Queued deployment cancellation races are under review.
- Checks: existing suite passed (279 tests, 1,125 assertions), typecheck and lint passed, web build passed with its large-chunk warning. Local Docker build, health, UI, WebSocket, data isolation, restart and owned cleanup passed. UI sandbox passed settings, preparation ticket reuse, create, both simulated validation choices, stop and recreation; responsive/keyboard checks passed.
- Isolated test servers: dry-run UI on port 53941; real integration on port 53942 with private data under `/private/tmp/kanban-coolify-live-2m4cedpy`. The supplied token is stored only in private settings outside Git. Neither server uses the user's live application database.
- Real deployment, remote provider verification and removal of actual preview resources are not yet tested. No live-preview success is claimed.

## Next actions

1. Complete Compose gateway integration and final diff review, then repeat checks affected by those edits.
2. Commit the implementation and create its draft PR; create a separate demonstration feature PR based on it.
3. Restart the isolated integration server with the final code, deploy the demonstration PR's latest commit through the implemented path, and verify with both providers.
4. Exercise stop/recovery/owned cleanup, then leave one working preview for user testing.

## History

- 2026-10-04: user authorized implementation and continued testing until a real Kanban demonstration preview is available. No modification to the primary checkout's existing untracked files.
