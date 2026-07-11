# Development

## Stack

| Layer       | Choice                                              |
| ----------- | --------------------------------------------------- |
| Runtime     | Bun                                                 |
| Backend     | ElysiaJS (HTTP) + native Bun WebSocket              |
| Persistence | SQLite (`bun:sqlite`)                               |
| Frontend    | React + Vite + Tailwind + dnd-kit                   |
| Agents      | In-process Claude Code SDK sessions (1 session = 1 ticket) |
| VCS         | git worktrees + `gh` CLI for PRs                    |

## Requirements

- [Bun](https://bun.sh)
- `git`

Real mode only (see below):

- `tmux` and `gh` (authenticated GitHub CLI)
- An authenticated **Claude Code** session on the machine — the agents reuse the host login. Run `claude` once and log in (Pro/Max OAuth, stored in the macOS Keychain / `~/.claude/.credentials.json`). The app overrides no `HOME`, so every agent uses whichever account `claude` is logged into on this machine.

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

To have agents actually spawn `claude`, create worktrees and open PRs:

```bash
bun run real         # KANBAN_DRY_RUN=0 on kanban-real.db
```

Needs the real-mode prerequisites above (`tmux`, authenticated `gh`, a logged-in Claude session). It runs git/tmux/gh/filesystem for real, using the SDK's bundled native `claude` binary — no separately installed CLI required.

### Codex agents (optional)

Tickets can run on **OpenAI Codex** instead of Claude (via `@openai/codex-sdk`): Codex is available as an orchestrator (it then implements itself) and as an implementer delegated to by a Claude orchestrator. A built-in **Codex** profile preset ships with the app. Requirements when a ticket uses Codex:

- An authenticated Codex session: run `codex login` once (active ChatGPT subscription), or export `CODEX_API_KEY`.
- The `codex` binary resolves from `node_modules` in dev; the packaged app embeds it (Apache-2.0, redistributable — unlike `claude`). Override with `KANBAN_CODEX_BINARY`.

## Claude Code skills (real mode)

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

In real mode, these skills must be available in the Claude Code environment running the agent; otherwise the agent cannot run the steps that reference them. Source definitions and install instructions: [Antune-L/skillzer](https://github.com/Antune-L/skillzer).

## Desktop app (macOS, optional)

The app can be packaged as a macOS desktop application via [Electrobun](https://github.com/blackboardsh/electrobun) (WebKit). The wrapper starts the Bun backend in-process then opens a window on the frontend.

```bash
bun run dev:desktop    # dev window
bun run build:desktop  # .app → build/dev-macos-arm64/
```

### Electrobun dev on a new machine

`bun run dev:desktop` is also a **real-mode** launcher: it starts real `claude` sessions (plus `tmux` shells for interactive test terminals), creates git worktrees, runs project setup/install commands, and opens PRs through `gh`. It differs from `bun run real` in a few important ways:

- it runs `build:web` before starting the app (the agents run in-process — no agent bundles to build);
- the agent runs the SDK's native `claude` binary; a dev run resolves it from `node_modules`, while a packaged `.app` detects a user install or downloads the pinned version at first launch (only the Apache-2.0 `codex` binary is embedded);
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

For agents to receive tickets in desktop dev, the same real-mode requirements apply: `tmux` (interactive test terminals), authenticated `gh`, and a logged-in Claude session.

⚠️ Desktop, `bun run real` and `bun run dev` all want **port 52817**: one process at a time.

## Releases and first launch

Releases are cut by CI from `v*` tags (`.github/workflows/release.yml` → `bun run release:desktop`). No auto-update yet: to update, download the next release and replace the app.

On first launch of a packaged app:

- The `claude` agent binary is **not** bundled (it is proprietary). The app first looks for an existing Claude Code install (PATH, `~/.local/bin`, Homebrew); if none is found it downloads the exact pinned version from the npm registry (~220 MB, one-time) into the app's data folder.
- An authenticated Claude session is required (run `claude` once and log in), plus `git`, `tmux` and an authenticated `gh` CLI — see [Requirements](#requirements).
- App data (config, database, uploads, provisioned binaries) lives in `~/Library/Application Support/kanban-agents/`.
