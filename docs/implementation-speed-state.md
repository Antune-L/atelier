# Implementation speed improvements

## Current status

- Date: 2026-10-03 (Europe/Paris).
- PR base revision: `0e1ed73959b8b2aca089c63182fd0156dce98616` (`main`). Implementation was originally verified on `ac829889625e7e4c488c76578cf38ba9b9761038`.
- Delivery branch: `feat/implementation-speed`, targeting `main`.
- Workspace: `/Users/antoineliu/.codex/worktrees/execution-speed/kanban-agents`.
- Scope: shared Claude/Codex implementation planning and bounded scheduling, durable restart recovery, and review preflight/invalidation diagnostics. Composer retains its separate execution path.
- Implementation and verification are complete. The delivery branch contains persistence, shared scheduling, restart recovery, review preflight and changed-file diagnostics for Claude and Codex. Publication of the commit and pull request was authorized separately; application restart and live database migration remain outside this delivery.

## Verified findings

- Existing delegation already supports four implementation lots per ticket and isolated scoped workspaces; the structured scheduler will reuse it.
- Restart currently resets the ticket stage and replays the original contract without an explicit completed-work summary.
- Scoped workspace baselines are currently held in memory, so durable plan state alone cannot safely recover unfinished work.
- Review fingerprints already reject stale approvals. Diagnostic per-file hashes must preserve this gate and its existing hash semantics.
- Claude starts a new SDK session on recovery. Codex resumes its App Server thread; both need the same persisted workflow reconciliation.

## Decisions

- Structured plans default to two simultaneous lots and permit up to four. A shared limit of four implementation children includes preparation, execution, and integration across tickets; review concurrency remains unchanged.
- Persist plans and scoped workspace recovery records before relying on restart continuation.
- Run discovered fast checks after formatting and before reviews, while retaining final verification and approval gates.
- Verify with existing project checks and isolated temporary scenarios; do not add permanent test files or access the real ticket database.

## Completed acceptance coverage

- Persistence/schema compatibility and both-provider worker-tool registration.
- Concurrent plans, dependency ordering, cancellation, retry, and capacity release.
- Restart context, interrupted workspace preservation, and idempotent integration.
- Fingerprint stability, changed-path diagnostics, and legacy review records.
- Existing typecheck, lint, tests, simplifier and regression review.
- Real Claude and Codex smoke checks using the authenticated installed runtimes.

## Final verification

- Final full suite after the last scheduler change: **279 passed, 0 failed, 1,125 assertions across 38 files**.
- Final `bun run typecheck` and `bun run lint`: passed.
- `bun run build:web`: passed; Vite reported its large-chunk warning.
- After updating the delivery branch to `main` at `0e1ed73959b8b2aca089c63182fd0156dce98616`, typecheck, lint and the web build passed again. The disjoint frontend change does not affect the recorded backend/provider checks.
- Final scheduler scenarios: **40 passed, 20 per provider**, including dependency ordering, global capacity, durable legacy queues, concurrent recovery, cancellation, retry budgets, completion immutability and final gates.
- Independent regression review: passed with no unresolved findings. Simplifier review completed; its only code refinement avoids duplicate workspace cleanup.
- Final diff whitespace check: passed. No permanent test files were added.
- No unresolved implementation or verification blocker remains. The pull request targets `main`; merging and deployment are outside this delivery.

- Dependencies installed in the isolated worktree without copying the real database or machine configuration.
- Existing persistence checks: 19 tests passed, 102 assertions.
- Existing recovery/session checks: 12 tests passed, 49 assertions; temporary recovery scenarios passed for Claude and Codex with testing, interrupted and awaiting-answer stages.
- Existing contract, session configuration, routing and role checks: 55 tests passed, 207 assertions.
- Existing fingerprint test passed; a temporary comparison preserved the original digest across content, metadata, file-mode, symlink and path edge cases.
- Initial combined recovery failures did not recur in the final complete suite. A separate final run without permission to bind a local socket failed before the MCP assertions; the affected 11 tests and the final full suite then passed with the required local-port permission.
- Twelve temporary real-Git workspace scenarios passed, including interrupted edits, partial integration, atomic rollback, completed markers, fresh cycles and release after suspension.
- Actual Claude SDK and Codex App Server sessions successfully used both new plan tools, read persisted recovery state and avoided re-submitting completed work.
- Production delegation launched an actual scoped implementation child on each provider and integrated its files through the real workspace boundary. Completion persisted with one attempt; recreating the manager started no duplicate child.
- Codex resumed the same actual thread after its worker server was replaced with a new port and access token, then successfully called the plan-reading tool.
- Live probes used disposable Git repositories/databases; their servers and subprocesses were stopped. An unreachable inherited Claude loopback proxy was removed only from the disposable probe environment.

## Verification artifacts

- Full suite: `/private/tmp/kanban-final-confirmation-escalated.log`.
- Web build: `/private/tmp/kanban-final-build.log`.
- Scheduler scenarios: `/private/tmp/kanban-plan-scheduler-smoke.log`.
- Actual scoped Claude/Codex implementation and integration: `/private/tmp/kanban-live-manager-result.json`.
- Actual Codex resume after worker-server replacement: `/private/tmp/kanban-codex-worker-restart.log`.

## History

- 2026-10-03: user approved implementation with Sol high agents and explicit verification of both Claude and Codex. Created an isolated managed worktree; analysis report and unrelated work in the original checkout remain untouched.
- 2026-10-03: completed independent simplifier/regression review, persisted queued work and atomic completion auditing, verified real provider execution and restart behavior, and passed the final complete test suite.
- 2026-10-03: user requested a commit and pull request against `main`. Created the delivery branch from the latest `main`; the intervening Workflow-tab removal has no overlap with the implementation changes.
- The installed Git pre-commit hook still generates Graphify output and runs no validation checks. Delivery uses its documented `GRAPHIFY_SKIP_HOOK=1` option to avoid adding unrelated generated artifacts; all validation gates above were run independently.
