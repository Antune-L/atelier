# Kanban Agents (V0)

Local single-user kanban app where autonomous Claude Code sessions implement tickets end to end: implementation in an isolated worktree, blocking review, local tests, GitHub PR.

A **"no SDK"** variant: agents are real interactive Claude Code sessions spawned in tmux, driven through an **MCP channel**. No Agent SDK, no `claude -p`.

## Stack

| Layer       | Choice                                              |
| ----------- | --------------------------------------------------- |
| Runtime     | Bun                                                 |
| Backend     | ElysiaJS (HTTP) + native Bun WebSocket              |
| Persistence | SQLite (`bun:sqlite`)                               |
| Frontend    | React + Vite + Tailwind + dnd-kit                   |
| Agents      | Claude Code sessions in tmux (1 session = 1 ticket) |
| VCS         | git worktrees + `gh` CLI for PRs                    |

## Requirements

- [Bun](https://bun.sh)
- `git`
- `tmux` and `gh` (authenticated GitHub CLI) — only for real mode (see below)

## Getting started

```bash
bun install
cp config.example.json config.json   # required: machine config (repoPath, baseBranch, scripts…)
bun run dev          # backend (:52817) + Vite frontend (:52818)
```

`config.json` is gitignored and mandatory — the server refuses to start without it. Adapt it to your machine (projects path, base branch, scripts).

Then open **http://localhost:52818**. The frontend proxies `/api` and `/ws` to the backend.

By default, `bun run dev` runs in **dry-run** mode: no side effects (no real `claude`/tmux/git/gh, no repo touched). The full pipeline is still exercisable end to end — this is the recommended mode to explore the app and develop.

Other scripts:

```bash
bun run dev:server   # backend only
bun run dev:web      # frontend only
bun run typecheck    # tsc --noEmit
bun run lint         # eslint
```

## Environment variables

The ports are deliberately unusual to avoid conflicts with other services.

| Var              | Default       | Role                                                       |
| ---------------- | ------------- | ---------------------------------------------------------- |
| `PORT`           | `52817`       | backend port                                               |
| `KANBAN_DB`      | `./kanban.db` | SQLite database path                                       |
| `KANBAN_DRY_RUN` | `1`           | **dry-run by default**. Set to `0` for real side effects   |

## Real mode

To have agents actually spawn `claude` in tmux, create worktrees and open PRs:

```bash
bun run real         # KANBAN_DRY_RUN=0 on kanban-real.db
```

Requirements: `tmux` and `gh` installed and authenticated. Real mode runs git/tmux/gh/filesystem for real.

## Desktop app (macOS, optional)

The app can be packaged as a macOS desktop application via [Electrobun](https://github.com/blackboardsh/electrobun) (WebKit). The wrapper starts the Bun backend in-process then opens a window on the frontend.

```bash
bun run dev:desktop    # dev window
bun run build:desktop  # .app → build/dev-macos-arm64/
```

The desktop app runs in real mode and uses its own database under `~/Library/Application Support/kanban-agents/`. To share data and config with `bun run real`:

```bash
bun run link:desktop-data   # symlink AppSupport → repo config/db/uploads
```

⚠️ Desktop, `bun run real` and `bun run dev` all want **port 52817**: one process at a time.

## Architecture (overview)

```
src/
  shared/   types + zod schemas + constants (shared across back/front/worker)
  server/   Bun.serve: Elysia HTTP + WS, SQLite Store, SlotManager, MCP contract
  web/      React frontend (board, dnd-kit columns, detail)
worker/     MCP channel server (stdio) → outbound WS to the backend
templates/  session hooks (PreToolUse/Stop) + drivers
```

### Ticket flow

1. Card created in **TODO**, dragged to **To implement**.
2. A slot (git worktree) is acquired; a `claude` session is spawned in tmux.
3. The agent drives its work through the MCP tools: `update_stage`, `ask_user`, `done`, `fail`.
4. `done(pr_url)` → the backend verifies on its own (clean tree, branch pushed, PR exists) before closing.

For implementation details, see `CLAUDE.md`.
