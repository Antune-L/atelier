# Atelier

**Orchestrate coding agents with a kanban board.** Drag tickets across columns; each card spawns a real Claude Code session that implements the work end to end — isolated worktree, blocking review, local tests, GitHub PR.

A **"no SDK"** take on agent orchestration: agents are interactive Claude Code sessions in tmux, wired through an **MCP channel**. No Agent SDK, no `claude -p`. The board routes work; the backend verifies gates; the agents do the reasoning.

![Atelier demo](docs/demo.gif)

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

| Var              | Default       | Role                                                     |
| ---------------- | ------------- | -------------------------------------------------------- |
| `PORT`           | `52817`       | backend port                                             |
| `KANBAN_DB`      | `./kanban.db` | SQLite database path                                     |
| `KANBAN_DRY_RUN` | `1`           | **dry-run by default**. Set to `0` for real side effects |

## Real mode

To have agents actually spawn `claude` in tmux, create worktrees and open PRs:

```bash
bun run real         # KANBAN_DRY_RUN=0 on kanban-real.db
```

Requirements: `tmux` and `gh` installed and authenticated, plus the `claude` (Claude Code) CLI installed and logged in, **v2.1.80 or later** (see Channels below). Real mode runs git/tmux/gh/filesystem for real.

### Channels (research preview)

The backend→agent push (the `ticket`/`answer`/`nudge` events that wake a session) relies on Claude Code's **Channels** feature, still in research preview. The `worker` shipped with this repo (`worker/worker.ts`) **is** the channel server: it declares the `claude/channel` capability and pushes events via `notifications/claude/channel`. There is no webhook to write yourself.

Since custom channels are not on Anthropic's allowlist during the preview, the app launches every session with `--dangerously-load-development-channels server:worker` automatically — nothing to pass by hand. The local `claude` must be **v2.1.80+**, otherwise the channel never registers and the spawned agent stays idle (it receives no ticket). On a **Team/Enterprise** Claude Code org, an admin must explicitly enable channels (org policy), or the events are dropped silently ("blocked by org policy").

This only matters in real mode. In dry-run (`bun run dev`, the default) no `claude` is spawned, so the channel is moot. See [Claude Code Channels setup](docs/claude-code-channels.md) for the project-specific setup and troubleshooting notes. Reference: <https://code.claude.com/docs/en/channels-reference>.

## Desktop app (macOS, optional)

The app can be packaged as a macOS desktop application via [Electrobun](https://github.com/blackboardsh/electrobun) (WebKit). The wrapper starts the Bun backend in-process then opens a window on the frontend.

```bash
bun run dev:desktop    # dev window
bun run build:desktop  # .app → build/dev-macos-arm64/
```

### Electrobun dev on a new machine

`bun run dev:desktop` is also a **real-mode** launcher: it starts real `tmux`/`claude` sessions, creates git worktrees, runs project setup/install commands, and opens PRs through `gh`. It differs from `bun run real` in a few important ways:

- it runs `build:web` and `build:agents` before starting the app;
- agent sessions use the bundled `dist/agents/worker.js` and hook bundles (`KANBAN_AGENT_DIST=1`);
- the desktop app reads its config and database from `~/Library/Application Support/kanban-agents/` by default, not from the repo root;
- it repairs the macOS GUI `PATH` before spawning `tmux`, `claude`, `gh`, `git`, or `cursor-agent`.

Bootstrap checklist:

```bash
bun install
cp config.example.json config.json
bun run link:desktop-data   # recommended in dev: share config/db/uploads with bun run real
bun run dev:desktop
```

If you do **not** run `bun run link:desktop-data`, edit the desktop config at `~/Library/Application Support/kanban-agents/config.json`. If you do run it, edit the repo-local `config.json`.

For agents to receive tickets in desktop dev, the same real-mode requirements apply: `tmux`, authenticated `gh`, authenticated `claude` CLI **v2.1.80+**, and Claude Code Channels enabled for the account/org. See [Claude Code Channels setup](docs/claude-code-channels.md) for the channel-specific setup.

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

### Claude Code skills

Agent sessions rely on **Claude Code skills** installed locally (`~/.claude/skills/`). Most of the skills used here live in [skillzer](https://github.com/Antune-L/skillzer) — install them with `npx skills add`:

```bash
npx skills add Antune-L/skillzer/skills/<skill-name>
# … see skillzer/README.md for the full list
```

The pipeline contract injected into each session (`src/server/agents/contract.ts`) explicitly references:

| Skill                    | When                                                                              | Role                                                                                                                        |
| ------------------------ | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `paris-research`         | **Feature** ticket with "Research plan" enabled                                   | Two independent research sub-agents on the approach, then an orchestrator verdict — feeds the PRD or implementation framing |
| `argus` (`argus-review`) | **Feature** ticket (reviewing step); **review** ticket                            | Parallel review of the diff or PR (light or full), with optional inline posting on GitHub                                   |
| `regression-check`       | **Feature** ticket (anti-regression step)                                         | Maps consumers of changed symbols and flags potential regressions                                                           |
| `mockup-fidelity-review` | **Feature** ticket with functional verification + mockups (Figma links or images) | Compares the live UI to mockups before opening the PR                                                                       |
| `minos-pr-feedback`      | **Clean** ticket                                                                  | Fetches PR review threads, triages by relevance, applies only pertinent fixes                                               |
| `composer-implement`     | **Feature** ticket with **Composer** as implementer                               | Delegates code-writing to Cursor headless via `templates/run_composer.sh` (vendored script — keep in sync with the skill)   |

**Ask**, **test**, and **conflict-resolution** tickets do not invoke a dedicated skill — read-only exploration or manual git per the contract.

In real mode, these skills must be available in the Claude Code environment running in tmux; otherwise the agent cannot run the steps that reference them. Source definitions and install instructions: [Antune-L/skillzer](https://github.com/Antune-L/skillzer).

For implementation details, see `AGENTS.md`.
