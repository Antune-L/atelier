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

## Mid-turn steering probe

Atelier steering (a chat message sent while the agent runs a turn, see [atelier-state.md](./atelier-state.md#steering-aiguillage)) relies on provider behavior that has **not been validated live on Claude nor Codex yet**: only simulated tests (fake sessions, scripted SDK query) cover it. On Claude, the backend sends steering messages with SDK `priority: "next"`; whether such a message is absorbed by the running turn or opens a follow-up turn is unmeasured.

The standalone probe measures it against a real, authenticated Claude installation:

```sh
KANBAN_LOG=warn bun src/server/testing/probeClaudeSteering.ts [none|next|later]...
```

It defaults to `none next`. Each variant starts a fresh session whose first turn runs three slow shell commands, pushes a steering message with the variant's priority once the first tool call is observed, and reports the number of turn ends and whether the requested marker word appears in the turn that was running. `now` is never measured because it can abort a tool in flight. The probe does not cover Codex; Codex steering uses App Server `turn/steer` and replays a refused steer through `turn/start`, also unvalidated live.
