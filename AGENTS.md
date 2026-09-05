# AGENTS.md

This file provides guidance to coding agents (Claude Code, Cursor, etc.) when working with code in this repository.

## What this is

Local single-user kanban where autonomous Claude or Codex sessions implement tickets end-to-end (optional PRD → isolated worktree → blocking review → local tests → draft GitHub PR). `AgentProvider` separates the Claude Agent SDK (`query()` with streaming input) from the Codex App Server. The backend owns the sessions, injects user turns, routes worker tools and verifies gates; it never reasons. Native subagents and isolated delegated review sessions perform the reasoning under the injected contract. tmux is used **only** for interactive worktree/user/test shells, never for agents.

Runtime is **Bun** throughout (server, build, tests). User-facing strings and the README are French; code identifiers and comments are English.

## Commands

```bash
bun install
bun run dev            # backend :52817 + Vite :52818 (dry-run sandbox on kanban.db)
bun run dev:server     # backend only
bun run dev:web        # frontend only
bun run typecheck      # tsc --noEmit (covers src + desktop)
bun run lint           # eslint . --ext .ts,.tsx
bun test               # unit and integration fixtures with bun's test runner
bun test path/x.test.ts        # run a single test file
bun test -t "name substring"   # run tests matching a name
bun run real           # REAL side effects: KANBAN_DRY_RUN=0 KANBAN_SETUP=1 on kanban-real.db
bun run dev:desktop    # Electrobun dev window (builds web first)
bun run build:desktop  # package macOS .app (dev build, no DMG)
bun run release:desktop 0.1.0  # release DMG into release/ (CI entrypoint, see .github/workflows/release.yml)
```

The agent sessions run in-process via the Agent SDK — there are no agent bundles to build. The packaged desktop `.app` does NOT embed the SDK's native `claude` binary (proprietary, no redistribution grant): `src/server/system/claudeBinary.ts` provisions it at runtime (`KANBAN_CLAUDE_BINARY` override → `node_modules` → provisioned `dataRoot/bin` → detected user install → pinned npm download). Only the Apache-2.0 `codex` binary is embedded (`copy` → `codex-bin`).

**When bumping `@anthropic-ai/claude-agent-sdk`, update `CLAUDE_SDK_VERSION` in `src/server/system/claudeBinary.ts` to the exact installed version** — the packaged app downloads that pinned version at runtime. `scripts/release-desktop.ts` fails the release build on drift, but only at release time; keeping them in sync at bump time avoids the late failure.

Run `typecheck` + `lint` after edits. There is no `format` script; eslint is the gate.

**Codex provider.** `AgentProvider` also supports Codex with SDK and bundled CLI pinned to `0.153.4`. Interactive sessions use that CLI's App Server protocol (streaming, `turn/steer`, interrupt and thread resume); do not replace it with a blocking SDK `Thread.run()` loop. Claude remains on the Claude Agent SDK. Product model IDs are `gpt-6-astra`, `gpt-5.6-sol`, and `gpt-5.6-terra`; intersect reasoning levels with the authenticated runtime catalog. Preserve Terra/medium defaults and historical execution metadata. Capability probes must stay read-only, refreshable, and must never expose credentials.

**Project Node.** `envWithProjectNode` applies the installed numeric `.nvmrc` version to setup, installation, agents and project scripts. `projectShell.ts` preserves user zsh startup files while restoring that Node on PATH. Missing versions and unsupported aliases are explicit errors, never silent use of another Node version.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:

- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

## The dry-run safety model — read before running anything

Every external mutation (git, tmux, `gh`, `osascript`, `~/.claude.json`, `bun install`, filesystem) goes through one injectable interface: `src/server/system/types.ts` (`SystemAdapter`). Two implementations:

- **`FakeSystemAdapter`** — used whenever `KANBAN_DRY_RUN !== "0"` (the default). Logs intent, **zero side effects**, `done()` gate always passes, tmux tracked in memory. This is the dev/test path.
- **`RealSystemAdapter`** — only when `KANBAN_DRY_RUN=0`. Actually runs git/tmux/gh. **Never instantiated in the dev/test path.**

Consequences for working in this repo:

- `bun run dev` is a safe sandbox — it spawns no real `claude`, touches no real repos, never writes `~/.claude.json`, and the app creates **no git commits** in this repo.
- Live `claude`/tmux spawning is only exercisable under `bun run real` (`KANBAN_DRY_RUN=0`).
- `KANBAN_SETUP=1` (gated, off by default; requires `KANBAN_DRY_RUN=0`) mutates `~/.claude.json` and each project's `.git/info/exclude`. Don't enable casually.
- When testing the UI, drive the dry-run sandbox — **do not** point automation at a live real-mode server on :52817.

## Architecture

```
src/shared/      types, zod schemas, constants (protocol.ts: tool registry + channel events) — shared by server + web
src/server/
  index.ts       Bun.serve: Elysia HTTP + 2 WS paths (/ws clients, /ws/terminal shells)
  routes.ts      REST API (/api/*)
  db/            SQLite (bun:sqlite); rows.ts validates every row with zod; store.ts owns ALL mutations
  hub.ts         ClientHub — broadcasts board snapshots + per-mutation pushes to the UI
  mutex.ts       KeyedMutex — serializes git ops per repo
  system/        the side-effect boundary (types + fake + real)
    claudeProvider.ts Claude SDK streaming-input sessions + in-process MCP tools
    codexProvider.ts Codex App Server sessions + session-scoped worker bridge
    claudeBinary.ts resolves the SDK's native claude binary (KANBAN_CLAUDE_BINARY → require.resolve)
  agents/
    sessionHub.ts   SessionHub — owns each live SDK session; injects turns, routes tool calls,
                    surfaces turn-end events, keeps the per-session live transcript
    sessionConfig.ts builds the SDK session config (tools, dontAsk + permission allow/deny, subagents)
    slotManager.ts  slot lifecycle, FIFO queue, recovery/auto-reclaim
    coordinator.ts  routes the worker tools + turn-end auto-nudge → stalled escalation + usage
    contract.ts     builds the pipeline contract injected as the first user turn
    triage.ts / watchdog.ts
src/web/         React + Vite + Tailwind + dnd-kit board
templates/       run_composer.sh (the Cursor headless driver)
```

**Agent protocol.** `SessionHub` owns each ticket session through `AgentProvider`; Claude uses SDK streaming input and Codex uses App Server turns and steering:

- backend → agent: channel events (`ticket`, `answer`, `prd_validated`, `nudge`, `user_comment`) are injected as user turns via a queue-fed async generator — no connect poll, no `initialized` race (the contract is simply the first turn).
- agent → backend: the worker tools (`update_stage`, `ask_user`, `submit_prd`, `submit_answer`, `done`, `ready_for_review`, `fail`, plus `submit_triage`/`submit_feasibility`) are an in-process `createSdkMcpServer`; each handler routes to the coordinator. `delegate_implementation` may be called once per independent lot (max `MAX_PARALLEL_IMPLEMENTERS`, distinct `label` per lot, disjoint file scopes): the backend runs the Codex children concurrently and emits one `implementation_done` per lot, carrying its `label` and the `remaining` lot count. A Claude implementer fans out the same way natively: up to `MAX_PARALLEL_IMPLEMENTERS` `implementer` sub-agents launched in parallel in one message, one per disjoint file scope. Security posture is `permissionMode: 'dontAsk'` + an explicit allow-list (bash patterns; non-bash safe tools), an in-process PreToolUse hook denying `--no-verify`, and `permissions.deny` for read-only triage/feasibility scouts.

**Slots.** A fixed pool (`SLOT_COUNT`, default 5, override `KANBAN_SLOTS`) of git-worktree slots at `SLOTS_ROOT/slot-N` (`~/kanban-worktrees/`, outside any repo so tsc in a slot never inherits parent `node_modules/@types`). `SlotManager` lifecycle: cleanup → fetch → `worktree add -b` → copy env → install → start SDK session → inject contract → `done` gate → release. Git ops per repo are serialized through `repoMutex`. No free slot → FIFO queue. A dead turn is auto-reclaimed in place (worktree preserved) up to `AUTO_RECLAIM_MAX`, then fails; a lost session at backend restart relaunches active-stage slots in place.

**The `done` gate is server-verified.** `done(pr_url)` does not trust the agent: the backend re-checks (clean working tree, branch pushed, PR exists via `gh pr view`). Failure → `stalled`, slot kept. The SDK turn-end event escalates a turn that ended without any protocol tool: auto-nudge once (`nudge` event) → otherwise `stalled` + notification.

**Column vs Stage are different axes.** `COLUMNS` (8: todo/implementing/prd/done/merged/reviewed/failed/abandoned) is the board lane; `STAGES` (12: queued…opening_pr/done/failed/interrupted/stalled) is the fine-grained pipeline state. Use `TERMINAL_STAGES` / `ACTIVE_STAGES` rather than hardcoding. Ticket `kind` is `feature` | `review` (a review ticket runs argus on a PR).

**Config split.** Machine-specific structured config (project `repoPath`/`baseBranch`/`scripts`/`defaultAutoMerge`, model choices) lives in **gitignored `config.json`**, validated by zod in `src/server/config.ts` (seeded from `config.example.json`). Infrastructure knobs stay in **env** (`PORT`, `KANBAN_DB`, `BACKEND_WS`/`BACKEND_HTTP`, `KANBAN_DRY_RUN`, `KANBAN_SETUP`, `KANBAN_SLOTS`, `CURSOR_API_KEY`). Don't move project paths back into `src/shared`.

**Databases.** `kanban.db` = dev dry-run sandbox. `kanban-real.db` = real mode + desktop app. The desktop app reads its own copies under `~/Library/Application Support/kanban-agents/`; `bun run link:desktop-data` symlinks them to the repo's real db/config/uploads. `dev`, `real`, and desktop all want **port 52817** → one process at a time; the shared db is the sync mechanism.

## Conventions (enforced — beyond the global ones in ~/.claude/CLAUDE.md)

- **No type casting.** `as`/angle-bracket assertions are an eslint error (`no-restricted-syntax`). Validate with zod `parse`/`safeParse`, narrow with type guards, or use `satisfies`. `any` is also an error.
- `tsconfig` is strict with `noUncheckedIndexedAccess` (array/record access is `T | undefined` — handle it) and `verbatimModuleSyntax` (use `import type`; `consistent-type-imports` enforces it).
- Relative imports in server/shared code carry explicit **`.ts` extensions** (`allowImportingTsExtensions`). Path aliases: `@shared/*` and `@/*` (web).
- `store.ts` is the only place that mutates the DB; `rows.ts` zod-validates every row crossing the SQLite boundary — keep new fields validated there.
- The Composer 2.5 path (per-ticket `implementer: "composer"`) has Claude plan, delegate code-writing to Cursor headless (`templates/run_composer.sh`, run in background and polled), then resume to review/test/commit/push/PR. **Composer never commits — Claude owns all git.**
