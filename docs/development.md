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

- `tmux`
- The CLI of each project's VCS provider:
  - GitHub projects: `gh` (authenticated GitHub CLI).
  - Azure DevOps projects: `az` with the `azure-devops` extension (`az extension add --name azure-devops`) and a
    signed-in account (`az login`). Cloud only (`https://dev.azure.com/<org>`); on-premises Azure DevOps Server is
    not supported.
- An authenticated **Claude Code** session on the machine — the agents reuse the host login. Run `claude` once and log in (Pro/Max OAuth, stored in the macOS Keychain / `~/.claude/.credentials.json`). The app overrides no `HOME`, so every agent uses whichever account `claude` is logged into on this machine.

## Getting started

```bash
bun install
cp config.example.json config.json   # required: machine config (repoPath, baseBranch, scripts…)
bun run dev          # backend (:52817) + Vite frontend (:52818)
```

`config.json` is gitignored and mandatory — the server refuses to start without it. Adapt it to your machine (projects path, base branch, scripts).

Then open **http://localhost:52818**. The frontend proxies `/api` and `/ws` to the backend.

By default, `bun run dev` runs in **dry-run** mode: no side effects (no real `claude`/tmux/git/gh, no repo touched). The full pipeline is still exercisable end to end — this is the recommended mode for exploring the app and developing against it.

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

Needs the real-mode prerequisites above (`tmux`, the authenticated provider CLI — `gh` or `az` — and a logged-in Claude session). It runs git/tmux/gh/filesystem for real, using the SDK's bundled native `claude` binary — no separately installed CLI required.

### Codex agents (optional)

Tickets can run on **OpenAI Codex** instead of Claude (via `@openai/codex-sdk`): Codex is available as an orchestrator and as an implementer delegated to by a Claude orchestrator. A built-in **Codex** profile preset ships with the app.

For both Claude and Codex implementers, the orchestrator starts backend-owned child lots with `delegate_implementation`. Declared file scopes run in separate worktrees and are checked before integration into the ticket worktree. A lot without `files` uses the shared ticket worktree exclusively while it runs. Composer follows its separate script path. Requirements when a ticket uses Codex:

- An authenticated Codex session: run `codex login` once (active ChatGPT subscription), or export `CODEX_API_KEY`.
- The `codex` binary resolves from `node_modules` in dev; the packaged app embeds it (Apache-2.0, redistributable — unlike `claude`). Override with `KANBAN_CODEX_BINARY`.

## Agent skills (real mode)

Agent sessions rely on **host skills** installed locally for each provider: `~/.claude/skills/` for Claude, `$CODEX_HOME/skills` (default `~/.codex/skills`) or `~/.agents/skills/` for Codex. Most of the skills used here live in [skillzer](https://github.com/Antune-L/skillzer) — install them for both providers with `npx skills add`:

```bash
npx skills add Antune-L/skillzer/skills/<skill-name> -g -a claude-code,codex -y
# … see skillzer/README.md for the full list
```

The pipeline contract injected into each session (`src/server/agents/contract.ts`) explicitly references:

| Skill                    | When                                                                              | Role                                                                                                                        |
| ------------------------ | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `paris-research`         | **Feature** ticket with "Research plan" enabled                                   | Two independent research sub-agents on the approach, then an orchestrator verdict — feeds the PRD or implementation framing |
| `simplifier`             | Every implementation lot (lightening pass after the lot)                          | Simplifies the lot's changes without changing behaviour; the backend requires this pass before integrating the lot        |
| `argus` (`argus-review`) | **Feature** ticket (reviewing step); **review** ticket                            | Parallel review of the diff or PR (light or full); its own inline posting (`--post`) is GitHub-only and unused here         |
| `regression-check`       | **Feature** ticket (anti-regression step)                                         | Maps consumers of changed symbols and flags potential regressions                                                           |
| `mockup-fidelity-review` | **Feature** ticket with functional verification + mockups (Figma links or images) | Compares the live UI to mockups before opening the PR                                                                       |
| `minos-pr-feedback`      | **Clean** ticket on a **GitHub** project                                          | Fetches PR review threads, triages by relevance, applies only pertinent fixes                                               |
| `composer-implement`     | **Feature** ticket with **Composer** as implementer                               | Delegates code-writing to Cursor headless via `templates/run_composer.sh` (vendored script — keep in sync with the skill)   |

**Ask** tickets and **conflict-resolution** runs do not invoke a dedicated skill — read-only exploration or manual git per the contract.

The ticket pipeline contract also includes a single code-lightening pass after implementation (before formatting, checks and review). It is described inline in the contract and does not depend on any host skill, so the former `simplifier` recommendation is no longer needed.

`argus`'s inline posting (`--post`) and `minos-pr-feedback` both drive the GitHub API (REST and GraphQL), so they are **GitHub-only**. On an Azure DevOps project they are bypassed: `minos-pr-feedback` is not even listed for the session, and both the Claude and the Codex clean contracts carry the equivalent `az devops invoke` commands inline instead. Review publication never goes through `argus --post` on either provider — it is the backend's `publish_review` (see below).

### Azure DevOps: review and clean behaviour

An Azure DevOps project runs the same review and clean flows as a GitHub one, through `az` + `az devops invoke` (`src/server/system/vcs/azureDevops.ts`). Differences to expect:

- **Review publication.** One general comment thread carries the review body, the reviewed commit and the pass marker (its thread id is the `reviewId` the app persists); one inline thread carries each finding, anchored on the latest PR iteration's `changeTrackingId`. A finding whose file is absent from that iteration's changes is folded into the summary body, exactly as a GitHub finding outside the diff hunks. Azure threads show no `path:line` header, so the inline body repeats the location.
- **Reviewer vote** (`az repos pr set-vote`): `approve` for a pass without findings (`APPROVE`, which then posts no visible comment), `approve-with-suggestions` for `REQUEST_CHANGES` and `COMMENT`, whose verdict line stays in the summary thread. A refused vote (author voting on their own PR, a branch policy) does **not** fail the publication: the threads stay, and the reason is surfaced to the session — the same degradation the GitHub client applies to a self-approval.
- **Clean flow.** Feedback is read with one `az devops invoke --resource pullRequestThreads --http-method GET`; a treated thread is resolved with the same resource in `PATCH` with `{"status":"fixed"}` — the Azure equivalent of GitHub's `minimizeComment`. System threads, deleted threads and threads already `fixed`/`closed`/`wontFix`/`byDesign` are ignored.
- **Permissions.** `Bash(az devops invoke:*)` is granted to Azure **clean** sessions only (parity with `Bash(gh api:*)` on GitHub). A review session never gets it, and `src/server/system/reviewPublishingGuard.ts` denies every mutating `az` form there so publication stays the backend's job.
- **Limits.** Cloud only. Merging squashes instead of rebasing (`az repos pr update` exposes no rebase strategy). The PR payload carries no diff stat, so additions/deletions are hidden, and no last-activity date exists, so the picker orders by creation date.

In real mode, these skills must be available in the Claude Code environment running the agent; otherwise the agent cannot run the steps that reference them. Source definitions and install instructions: [Antune-L/skillzer](https://github.com/Antune-L/skillzer).

## Desktop app (macOS, optional)

The app can be packaged as a macOS desktop application via [Electrobun](https://github.com/blackboardsh/electrobun) (WebKit). The wrapper starts the Bun backend in-process then opens a window on the frontend.

```bash
bun run dev:desktop    # dev window
bun run build:desktop  # .app → build/dev-macos-arm64/
```

### Electrobun dev on a new machine

`bun run dev:desktop` is also a **real-mode** launcher: it starts real `claude` sessions (plus `tmux` shells for interactive test terminals), creates git worktrees, runs project setup/install commands, and opens PRs through the project's provider CLI (`gh` or `az`). It differs from `bun run real` in a few important ways:

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

## Provider versions and application updates

The Providers settings page checks the public npm registry for the latest Claude Agent SDK and Codex SDK versions when settings open. Checks use fixed URLs, deadlines, bounded bodies, a five-minute cache and coalesced refreshes. Installed SDK versions, measured native versions/origins, latest upstream publications and versions included in the selected app source/release are separate facts. Unknown/offline/stale information never authorizes arbitrary latest-package installation. Dry-run shows explicit simulation without registry access or native probes.

Source desktop updates require a clean `main` checkout and fast-forward from `origin/main`. Settings confirms the exact source commit and its committed lockfile; if main moves after confirmation, installation stops. Strictly frontend-only changes rebuild and reload; all other updates (including no-op pulls) install the frozen dependency graph, rebuild web, preview tools and the updater helper, then relaunch. Browser-only mode has no installer.

Provider admission is reserved synchronously before update checks and shares the repository Git mutex. Open sessions, one-shot operations/preparation, runtime/quota probes, lifecycle preparations and active Claude login exclude updates. Queued ticket starts wait without consuming a retry. New manual work requests (including creation/analysis, triage, shells, automation and validation) are explicitly refused before mutation during maintenance. Passive MCP TODO creation remains available. Other provider handles/one-shot operations defer without treating maintenance as a provider failure. Durable queued tickets use existing restart recovery; recurring automations keep their schedule. Admission cannot coordinate another application process or a user shell. Source mutations additionally persist a recovery receipt across process death. Failed or unconfirmed native closure conservatively continues to exclude updates.

If source pulling, installation or building fails after mutation begins, no success/relaunch is reported and admission remains closed until checkout repair and process restart. The data-root `source-update-recovery.json` receipt is written before mutation. A `mutating` receipt prevents boot; after completing the frozen installation and builds, the operator removes that receipt before restarting. A `ready` receipt is cleared only after the new boot verifies the revision, clean checkout, installed provider metadata and native health. Git, dependencies or assets may already have advanced. There is no automatic source or database rollback. Preserved tmux shells are interactive shells, not preserved in-process provider sessions.

Cloud updates continue through the confirmed `/api/vps-update` route, Cloudflare Access assertion, same-origin checks and the root-owned updater. The added authenticated `/target` handshake returns provider versions from the exact main commit's lockfile; the start confirmation carries that SHA and the root updater refuses a changed main. Existing root installations need an operator upgrade to expose `/target` and attempt tracking; application updates cannot upgrade root-owned services. Public-source access failures, including a private repository, leave the target unknown. Existing legacy VPS confirmation remains supported without a displayed target. The app checks attempt-tracking support before starting, then closes admission before root start. The root persists a unique attempt ID before work begins. Only that attempt's success or explicit refusal releases admission, including success without a restart when the release is already current. Polling can reconcile a lost acknowledgement by ID. A stale status or a different attempt cannot release a new reservation. Failed/interrupted or still-unknown outcomes remain closed until operator inspection and restart. Independent validation/preview/shell process checks remain the root updater's responsibility.

### Packaged macOS updates

Only packaged macOS Apple Silicon releases support automatic installation. Electrobun 1.18.1 supplies local build information and its stable archive/update metadata formats. Its `applyUpdate()` is deliberately not called: it re-fetches mutable latest metadata and removes the old application before rename. The wrapper instead verifies an Ed25519-signed app/provider manifest, fixes the target, downloads a versioned public GitHub asset through an HTTPS host allowlist, checks byte count/SHA-256, stages a complete application on the destination volume, checks identity/version/provider graph/executables and destination space/permissions, then obtains an installer acknowledgement before stopping the backend.

The detached helper waits for the old process to exit, renames it to a unique sibling backup, moves the prepared app into place and opens it. A failed replacement or rejected launch restores the old app before reopening it. An ambiguous post-start backend/native-version check preserves the backup and records an actionable failure; it does not silently replace a running new app or roll back databases. New launches verify native versions before recovery, then acknowledge backend startup in a separate transaction-bound health file. Only the helper writes the terminal transaction receipt. Recovery and new provider work remain gated until the helper confirms a healthy receipt; late health results cannot replace a failed receipt, which leaves the app in maintenance until operator inspection. Failed preparation removes its owned staging directory and reports cleanup failures for inspection. User data under `dataRoot`, global provider CLIs, configuration and uploads are not replaced by the installer. Normal application startup can still run database migrations and provision the pinned Claude binary. Interrupted transactions require inspection; there are no automatic retry loops or backup deletion.

Release CI builds the DMG, Electrobun full `.app.tar.zst` and update metadata, plus a full ZIP derived from that final archive (the early `postBuild` hook runs before Electrobun writes `version.json`). It publishes checksums and `atelier-macos-arm64.json` with the exact source/provider graph. Optional `ATELIER_UPDATE_SIGNING_KEY` is an Ed25519 PEM private key held in CI secrets; its public key is embedded, while the private key is excluded from build subprocesses. Preserve that key across releases; key rotation requires a trusted manual adoption. Without the secret, releases remain downloadable but automatic updates fail closed. Publication remains tag-only; manual workflow runs build without publishing. Signing here authenticates the update publisher and is separate from Apple signing/notarization, which remains disabled.

The fixed public GitHub feed has no embedded credentials. Private releases and missing feeds use the visible manual-download fallback. Already installed old apps cannot acquire new updater code automatically when no feed/updater existed: manually install the first trusted release containing this feature and a verification key. No signed release, native replacement or provider launch has been live-qualified by the implementation checks.

## Releases and first launch

Releases are cut by CI from `v*` tags (`.github/workflows/release.yml` → `bun run release:desktop`). Automatic updates require a trusted release containing the publisher verification key; otherwise download and replace the complete application manually.

On first launch of a packaged app:

- The `claude` agent binary is **not** bundled (it is proprietary). The app first looks for an existing Claude Code install (PATH, `~/.local/bin`, Homebrew); if none is found it downloads the exact pinned version from the npm registry (~220 MB, one-time) into the app's data folder.
- An authenticated Claude session is required (run `claude` once and log in), plus `git`, `tmux` and an authenticated `gh` CLI — see [Requirements](#requirements).
- App data (config, database, uploads, provisioned binaries) lives in `~/Library/Application Support/kanban-agents/`.
