# Architecture

## Overview

```
src/
  shared/   types + zod schemas + constants (shared across back/front)
  server/   Bun.serve: Elysia HTTP + WS, SQLite Store, SlotManager, in-process agent SDK + MCP tools
  web/      React frontend (board, dnd-kit columns, detail)
templates/  run_composer.sh (Cursor headless driver)
```

## Agent runtime

Each ticket runs a backend-owned Claude SDK or Codex App Server session. Claude uses **`@anthropic-ai/claude-agent-sdk`** (`query()`, streaming input); Codex uses the App Server protocol. Neither provider uses tmux for agent sessions. The board routes work; the backend verifies gates; the agents do the reasoning.

Wake events (`ticket`/`answer`/`nudge`) are injected as ordinary user turns. Claude worker tools run through an in-process MCP server; Codex reaches them through the backend's authenticated HTTP MCP endpoint.

In dry-run (`bun run dev`, the default) no `claude` is spawned. The SDK's native binary is resolved by `src/server/system/claudeBinary.ts`: `KANBAN_CLAUDE_BINARY` override → `node_modules` → previously provisioned binary → detected Claude Code install → pinned npm download (packaged app only; dev always hits `node_modules`).

## Codex provider

Codex sessions run through the same provider abstraction (`src/server/system/codexProvider.ts`, backed by `@openai/codex-sdk`). Orchestrator × implementer pairing is constrained: Codex orchestrates only itself, while Claude can orchestrate any implementer (`claude`, `composer`, or `codex` as delegate). Unlike the Claude sessions, the worker tools reach Codex over the backend's HTTP MCP endpoint (bearer-token authenticated) rather than in-process, and the Apache-2.0 `codex` binary (plus its `codex-code-mode-host` companion) is embedded in the packaged app — resolution: `KANBAN_CODEX_BINARY` override → SDK's own resolution from `node_modules` (see `src/server/system/codexBinary.ts`).

## Ticket flow

1. Card created in the `todo` column, dragged to `implementing`.
2. A slot (git worktree) is acquired; the selected provider starts an orchestrator session.
3. For Claude and Codex implementers, the orchestrator calls `delegate_implementation` to start backend-owned child lots. Declared, non-overlapping file scopes receive separate worktrees; the backend rejects out-of-scope changes or conflicts when integrating them. A lot without `files` reserves the shared ticket worktree while it runs. Composer uses its separate script path.
4. The agent drives the remaining work through the MCP tools: `update_stage`, `ask_user`, `done`, `fail`.
5. `done(pr_url)` → the backend verifies on its own (clean tree, branch pushed, PR exists) before closing.

For agent-facing implementation details (protocol, slots, conventions), see [AGENTS.md](../AGENTS.md).
