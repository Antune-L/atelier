# Coolify preview implementation state

## Current summary

- Base: `897e98b` on `main`; implementation branch: `feature/coolify-previews` in the managed `coolify-previews` worktree. First implementation commit: `eea5401`; draft PR: https://github.com/Antune-L/atelier/pull/183.
- Scope: GitHub V1; Azure DevOps preview support is deferred. Existing Azure behavior must remain unchanged. Claude and Codex run browser verification on the Mac against the remote preview.
- Verified infrastructure: Coolify 4.3.23 responds to authenticated read requests; its server is reachable/usable; the `kanban-agents` project exists; the GitHub App exposes `Antune-L/atelier`, matching this checkout. No application existed at preflight. The supplied token has read, write and deploy permissions according to the user's dashboard.
- Docker: local OrbStack daemon is available. Worktree dependencies installed from the existing frozen lockfile.
- Design: separate disposable Coolify application per preview attempt, latest PR commit pinned at creation, automatic GitHub deployments disabled, durable stop intent, and owned-resource cleanup. Native HTTP Basic authentication protects Dockerfile previews. Compose previews require a tracked authenticated gateway because Coolify's native protection does not cover Compose routing. Credentials stay outside committed source and public settings responses.
- Implemented: shared persistence/configuration, Coolify client/lifecycle, settings/project/ticket interface, remote quality target for Claude and Codex, Docker recipe, bundled preparation skill and bounded local Docker verification helper. Compose gateway support is undergoing final integration.
- Cleanup evidence: Coolify application deletion queues a remote job and immediately hides the application. A successful response or subsequent 404 is insufficient to prove resource removal. The bounded SSH verifier checks exact ownership and removes only the preview's containers, volumes, networks and application directory before deleting its Coolify record. Strict SSH access and read-only verification of a nonexistent application are verified. Queued deployment cancellation races are under review.
- Checks: existing suite passed (279 tests, 1,125 assertions), typecheck and lint passed, web build passed with its large-chunk warning. Local Docker build, health, UI, WebSocket, data isolation, restart and owned cleanup passed. UI sandbox passed settings, preparation ticket reuse, create, both simulated validation choices, stop and recreation; responsive/keyboard checks passed.
- Isolated test servers: dry-run UI on port 53941; real integration on port 53942 with private data under `/private/tmp/kanban-coolify-live-2m4cedpy`. The supplied token is stored only in private settings outside Git. Neither server uses the user's live application database.
- Demonstration branch: `test/coolify-preview-demo`, commit `0aa7d35e69c3f9136bbaf6d595b1a0fdbf512517`, draft PR https://github.com/Antune-L/atelier/pull/184 (based on the implementation branch). Its isolated ticket is `jiK_JuLcE_`; the banner and interactive counter have three browser acceptance criteria.
- Live API findings: Coolify 4.3.23 requires leading slashes for transport paths. Its native authentication encrypts a 32-byte password beyond the database column's 255-character capacity; Dockerfile previews now reject passwords above 31 UTF-8 bytes before any remote intent. These corrections are committed in `c453ca1`.
- The two rejected-create test records were repaired only after exact error evidence and read-only ownership checks proved no application was created; both stopped cleanly. Their original test credential remains unchanged. Automatic approval review rejected changing that credential; user approval is pending only for the optional native Dockerfile pilot.
- Compose attempt `_cgrLCLzrxrlGD9HM-iC_` successfully created app `o1q6aruerxn4yxib1ypb0zus` and deployment `r8awgsjd0ul23z5lhqzjytt9`. Build logs proved Coolify resolves Compose contexts against its project directory. The recipe and validator now use that contract; the repeated local authenticated browser/WebSocket/isolation tests passed. The failed cloud attempt was stopped through the implementation and verified fully cleaned by SSH and the API.
- No healthy remote preview is claimed yet. The next attempt uses the corrected recipe and latest demonstration PR commit.

## Next actions

1. Commit the verified Compose context correction and update the demonstration PR from its implementation base.
2. Restart the isolated integration server with corrected code and deploy the demonstration PR's latest commit through the implemented path.
3. Verify the remote preview with both providers and exercise stop/recovery/owned cleanup.
4. Record final checks and leave one working preview for user testing.

## History

- 2026-10-04: user authorized implementation and continued testing until a real Kanban demonstration preview is available. No modification to the primary checkout's existing untracked files.
