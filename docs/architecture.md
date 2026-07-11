# Architecture

## Overview

```
src/
  shared/   types + zod schemas + constants (shared across back/front)
  server/   Bun.serve: Elysia HTTP + WS, SQLite Store, SlotManager, in-process agent SDK + MCP tools
  web/      React frontend (board, dnd-kit columns, detail)
templates/  run_composer.sh (Cursor headless driver)
```

## Agent runtime (Agent SDK)

Each ticket runs a long-lived `claude` process via the official **`@anthropic-ai/claude-agent-sdk`** (`query()`, streaming-input), owned in-process by the backend — no tmux, no MCP channel. The board routes work; the backend verifies gates; the agents do the reasoning.

Wake events (`ticket`/`answer`/`nudge`) are injected as ordinary user turns, and the worker tools run as an in-process MCP server. No webhook, no `--dangerously-load-development-channels`, no `initialized` race.

In dry-run (`bun run dev`, the default) no `claude` is spawned. The SDK's native binary is resolved by `src/server/system/claudeBinary.ts`: `KANBAN_CLAUDE_BINARY` override → `node_modules` → previously provisioned binary → detected Claude Code install → pinned npm download (packaged app only; dev always hits `node_modules`).

## Codex provider

Codex sessions run through the same provider abstraction (`src/server/system/codexProvider.ts`, backed by `@openai/codex-sdk`). Orchestrator × implementer pairing is constrained: Codex orchestrates only itself, while Claude can orchestrate any implementer (`claude`, `composer`, or `codex` as delegate). Unlike the Claude sessions, the worker tools reach Codex over the backend's HTTP MCP endpoint (bearer-token authenticated) rather than in-process, and the Apache-2.0 `codex` binary (plus its `codex-code-mode-host` companion) is embedded in the packaged app — resolution: `KANBAN_CODEX_BINARY` override → SDK's own resolution from `node_modules` (see `src/server/system/codexBinary.ts`).

## Ticket flow

1. Card created in **TODO**, dragged to **To implement**.
2. A slot (git worktree) is acquired; a `claude` SDK session starts in-process.
3. The agent drives its work through the MCP tools: `update_stage`, `ask_user`, `done`, `fail`.
4. `done(pr_url)` → the backend verifies on its own (clean tree, branch pushed, PR exists) before closing.

For agent-facing implementation details (protocol, slots, conventions), see [AGENTS.md](../AGENTS.md).
