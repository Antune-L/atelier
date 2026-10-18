# Real Atelier provider qualification

Run from the repository root with existing authenticated Claude and Codex installations:

```sh
KANBAN_LOG=warn bun src/server/testing/qualifyAtelierProviders.ts
```

The process needs outbound provider access and permission to bind an ephemeral localhost port. It does not log in, alter provider configuration, or read an application database. The printed fixture directory contains the disposable repository, uploads, SQLite local database and `evidence.json`; fixtures are retained on both success and failure.

The harness uses the application's `RealSystemAdapter.startAgentSession`, `SessionHub`, `AtelierManager`, `AgentCoordinator`, scoped worker MCP (Model Context Protocol) endpoint and `TicketOperations`. Claude runs through the Agent SDK session library, and Codex runs through its local App Server session protocol. Native provider session records may be created by those runtimes. Every real session is restricted to the disposable repository and the Atelier role; another role is rejected before startup.

All other system-adapter effects are fake. Feasibility and slot starts are recorded without launching their sessions, creating worktrees, contacting a pull request host or modifying another repository. A successful card start therefore qualifies admission and persisted queue state, not implementation, worktree preparation or delivery. GitHub and Azure DevOps are outside this harness's verification scope.

Each provider must complete free conversation with a retained link and no PRD, application attachment hydration with a random source token and a PNG whose six-digit value exists only in its pixels, project-scoped list/get calls, exactly one parked TODO creation, an existing-card start plus unavailable-card rejections, and an explicitly requested roadmap PRD. The PRD must retain the link, document and image references, have two milestones, and associate every task with a valid milestone. Assertions inspect persisted messages, PRDs, tickets, native image-send metadata and actual worker-tool responses. Provider claims alone do not satisfy card or PRD assertions.

Turns have a three-minute deadline, session cleanup has a twenty-second deadline, worker calls are capped at forty, and captured native events are bounded. The final evidence records each session's closure. An unknown closure remains explicitly unverified and its fixture is retained.

For a targeted rerun, set `ATELIER_QUALIFY_PROVIDERS` to `codex` or `claude`. Setting `ATELIER_QUALIFY_ROADMAP=0` skips roadmap generation; this is a partial qualification. The default command runs both providers and includes the roadmap scenario. The process exits unsuccessfully when a provider or an executable assertion fails, while still attempting the other selected provider and closing all sessions.

Provider endpoint overrides (server addresses) are inherited. Successful authentication probes do not establish that the configured model endpoint is reachable. If a Claude run records `ECONNREFUSED`, preserve that evidence and inspect its effective endpoint before retrying. After confirming that an inherited `ANTHROPIC_BASE_URL` override is unusable, this Claude-only command removes it from the disposable process and uses existing native authentication without changing user configuration:

```sh
KANBAN_LOG=warn ATELIER_QUALIFY_PROVIDERS=claude bun -e 'delete process.env.ANTHROPIC_BASE_URL; await import("./src/server/testing/qualifyAtelierProviders.ts");'
```
