# AGENTS.md

This file provides guidance to coding agents (Claude Code, Cursor, etc.) when working with code in this repository.

## What this is

Local single-user kanban where autonomous Claude Code sessions implement tickets end-to-end (optional PRD → isolated worktree → blocking review → local tests → draft GitHub PR). Agents run on the official **`@anthropic-ai/claude-agent-sdk`** (`query()` in streaming-input mode): the backend owns each long-lived `claude` run **in-process**, injects user turns (contract / answer / nudge / comment), and exposes the worker tools as an in-process MCP server. The backend never reasons; it only routes tool calls + turn-end events and verifies gates. The agent's own native subagents do the work (e.g. argus review, Figma compare) per the injected contract. tmux is now used **only** for the interactive worktree/user/test shells, never for agents.

Runtime is **Bun** throughout (server, build, tests). User-facing strings and the README are French; code identifiers and comments are English.

## Commands

```bash
bun install
bun run dev            # backend :52817 + Vite :52818 (dry-run sandbox on kanban.db)
bun run dev:server     # backend only
bun run dev:web        # frontend only
bun run typecheck      # tsc --noEmit (covers src + desktop)
bun run lint           # eslint . --ext .ts,.tsx
bun test               # bun's test runner (no test files exist yet)
bun test path/x.test.ts        # run a single test file
bun test -t "name substring"   # run tests matching a name
bun run real           # REAL side effects: KANBAN_DRY_RUN=0 KANBAN_SETUP=1 on kanban-real.db
bun run dev:desktop    # Electrobun dev window (builds web first)
bun run build:desktop  # package macOS .app (embeds the SDK's native claude binary)
```

The agent sessions run in-process via the Agent SDK — there are no agent bundles to build. The packaged desktop `.app` embeds the SDK's native `claude` binary (electrobun `copy` → `claude-bin`, pointed to via `KANBAN_CLAUDE_BINARY`); dev/web mode resolves it from `node_modules`.

Run `typecheck` + `lint` after edits. There is no `format` script; eslint is the gate.

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
    sdkSession.ts   the real SDK session (query() streaming-input + in-process MCP tools)
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

**Agent protocol (in-process SDK).** Each ticket runs one `query()` streaming-input session owned by `SessionHub`:
- backend → agent: channel events (`ticket`, `answer`, `prd_validated`, `nudge`, `user_comment`) are injected as user turns via a queue-fed async generator — no connect poll, no `initialized` race (the contract is simply the first turn).
- agent → backend: the worker tools (`update_stage`, `ask_user`, `submit_prd`, `submit_answer`, `done`, `ready_for_review`, `fail`, plus `submit_triage`/`submit_feasibility`) are an in-process `createSdkMcpServer`; each handler routes to the coordinator. Security posture is `permissionMode: 'dontAsk'` + an explicit allow-list (bash patterns; non-bash safe tools), an in-process PreToolUse hook denying `--no-verify`, and `permissions.deny` for read-only triage/feasibility scouts.

**Slots.** A fixed pool (`SLOT_COUNT`, default 5, override `KANBAN_SLOTS`) of git-worktree slots at `SLOTS_ROOT/slot-N` (default repo `slots/`, gitignored). `SlotManager` lifecycle: cleanup → fetch → `worktree add -b` → copy env → install → start SDK session → inject contract → `done` gate → release. Git ops per repo are serialized through `repoMutex`. No free slot → FIFO queue. A dead turn is auto-reclaimed in place (worktree preserved) up to `AUTO_RECLAIM_MAX`, then fails; a lost session at backend restart relaunches active-stage slots in place.

**The `done` gate is server-verified.** `done(pr_url)` does not trust the agent: the backend re-checks (clean working tree, branch pushed, PR exists via `gh pr view`). Failure → `stalled`, slot kept. The SDK turn-end event escalates a turn that ended without any protocol tool: auto-nudge once (`nudge` event) → otherwise `stalled` + notification.

**Column vs Stage are different axes.** `COLUMNS` (8: todo/implementing/prd/done/merged/reviewed/failed/abandoned) is the board lane; `STAGES` (12: queued…opening_pr/done/failed/interrupted/stalled) is the fine-grained pipeline state. Use `TERMINAL_STAGES` / `ACTIVE_STAGES` rather than hardcoding. Ticket `kind` is `feature` | `review` (a review ticket runs argus on a PR).

**Config split.** Machine-specific structured config (project `repoPath`/`baseBranch`/`scripts`/`defaultAutoMerge`, model choices, `slotsRoot`) lives in **gitignored `config.json`**, validated by zod in `src/server/config.ts` (seeded from `config.example.json`). Infrastructure knobs stay in **env** (`PORT`, `KANBAN_DB`, `BACKEND_WS`/`BACKEND_HTTP`, `KANBAN_DRY_RUN`, `KANBAN_SETUP`, `KANBAN_SLOTS`, `CURSOR_API_KEY`). Don't move project paths back into `src/shared`.

**Databases.** `kanban.db` = dev dry-run sandbox. `kanban-real.db` = real mode + desktop app. The desktop app reads its own copies under `~/Library/Application Support/kanban-agents/`; `bun run link:desktop-data` symlinks them to the repo's real db/config/uploads. `dev`, `real`, and desktop all want **port 52817** → one process at a time; the shared db is the sync mechanism.

## Conventions (enforced — beyond the global ones in ~/.claude/CLAUDE.md)

- **No type casting.** `as`/angle-bracket assertions are an eslint error (`no-restricted-syntax`). Validate with zod `parse`/`safeParse`, narrow with type guards, or use `satisfies`. `any` is also an error.
- `tsconfig` is strict with `noUncheckedIndexedAccess` (array/record access is `T | undefined` — handle it) and `verbatimModuleSyntax` (use `import type`; `consistent-type-imports` enforces it).
- Relative imports in server/shared code carry explicit **`.ts` extensions** (`allowImportingTsExtensions`). Path aliases: `@shared/*` and `@/*` (web).
- `store.ts` is the only place that mutates the DB; `rows.ts` zod-validates every row crossing the SQLite boundary — keep new fields validated there.
- The Composer 2.5 path (per-ticket `implementer: "composer"`) has Claude plan, delegate code-writing to Cursor headless (`templates/run_composer.sh`, run in background and polled), then resume to review/test/commit/push/PR. **Composer never commits — Claude owns all git.**
