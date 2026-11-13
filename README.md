# Atelier

> Orchestrate coding agents from a kanban board. Drag a ticket into a column and a real agent — Claude Code, OpenAI Codex, or Cursor Composer — implements it end to end: isolated worktree, blocking review, local tests, GitHub PR.

![Atelier demo](docs/demo.gif)

## Quickstart

Download the latest `Atelier-vX.Y.Z-arm64.dmg` from [GitHub Releases](https://github.com/Antune-L/atelier/releases), open it and drag **Atelier** to Applications (macOS, Apple Silicon).

The app is not signed yet, so macOS blocks the first launch with a misleading "Atelier is damaged" dialog — clear the quarantine flag instead:

```bash
xattr -dr com.apple.quarantine /Applications/Atelier.app
```

First launch needs `git` and a logged-in Claude Code session (run `claude` once); the full pipeline also needs `tmux` and an authenticated `gh` CLI. If no `claude` install is found on the machine, the app downloads the pinned version automatically (one-time, ~220 MB).

For Codex, the app reuses the existing Codex connection. The available models and reasoning levels are the ones advertised by the connected account. Claude remains available. The « Vérifier à nouveau » (check again) button stays available in the settings even when Codex is unreachable; it refreshes the connection and the model list without restarting the app.

For a Codex implementation, the implementer's model, effort and FAST mode can differ from the orchestrator's. By default they inherit the existing Codex settings; an explicitly chosen value stays independent. Profiles store these choices. Configurations are frozen at launch and kept across resumes: editing the ticket or the settings afterwards does not change a run that has already started.

The Codex SDK and binary are pinned to `0.160.0`. Interactive sessions use that same binary's App Server to receive messages during a turn, interrupt a turn and resume a conversation. Notion import also follows the chosen agent and requires the Notion MCP connection to be authorized for this client.

In worktrees, the numeric version declared in `.nvmrc` must be installed via nvm. That version is then applied to the install, the scripts, the agents and the terminal. A missing version or an unsupported alias produces an explicit diagnostic before launch.

Running from source instead? See [docs/development.md](docs/development.md).

## Local MCP

Atelier exposes a Streamable HTTP MCP server on `http://localhost:52817/mcp`. It only accepts connections coming from the local machine and requires the `Authorization: Bearer <token>` header.

In the macOS app, a persistent random token is created at first launch in `~/Library/Application Support/kanban-agents/mcp-token`, with permissions restricted to the user account. The `KANBAN_MCP_TOKEN` variable lets you supply another token at launch. From source, the endpoint stays disabled as long as that variable is not set:

```bash
KANBAN_MCP_TOKEN=replace-with-a-long-secret bun run dev
```

Then configure the MCP client with the URL above and the token as a Bearer header. The available tools are `get_application_version`, `list_projects`, `list_tickets`, `get_capacity`, `get_ticket`, `create_todo_ticket`, `update_ticket`, `analyze_tickets`, `start_ticket`, `answer_question`, `answer_feasibility_questions`, `list_open_prs` and `create_review_ticket`. Ticket responses also report `dryRun` so that an agent can tell the sandbox apart from the real server. The read-only application version tool reports installed and verified available versions separately; see [its contract](docs/application-version-mcp.md).

External browser validation tools (`start_external_validation`, `get_external_validation`, `cancel_external_validation`, `read_external_validation_artifact`) are documented in [the validation contract](docs/external-browser-validation.md); their receipts expose `simulated`.

Branch preview tools (`create_branch_preview`, `get_branch_preview`, `stop_branch_preview`) deploy, inspect and stop a remote branch preview on Coolify like the board's Create preview button, without browser validation; see [their contract](docs/branch-preview-mcp.md).

The desktop app settings show the MCP URL and let you copy the token without exposing it to the web page. The regenerate button immediately replaces the token managed by Atelier; it is disabled when a token is supplied through `KANBAN_MCP_TOKEN`.

`create_todo_ticket` creates a card in TODO without starting its implementation; a new card runs its feasibility analysis in the background. It accepts the same options as creating one from the app: content (`title`, `description`, `externalUrl`), pipeline (`prdEnabled`, `verifyFeature` for E2E verification, `prDraft`, `autoMerge`, `stealth`, `directPush`, `addScreenshots`, `argusMultiLoop`), branch and stacking (`baseBranch`, `dependsOn`), as well as the orchestrator, the implementer and their Claude or Codex models/efforts (`orchestrator`, `implementer`, `model`, `effort`, `implementerModel`, `implementerEffort`, `codexModel`, `codexEffort`, `codexFast`, `codexImplementerModel`, `codexImplementerEffort`, `codexImplementerFast`, `feasibilityEngine`). `requestId` is mandatory and makes creation idempotent: a strictly identical new call returns the existing card, while the same identifier with different options is rejected. Use `start_ticket` afterwards to launch the card; `create_todo_ticket` rejects the `start` field.

To follow a card, `get_ticket` returns its column, stage, error, pull request URL (`prUrl`) and number (`prNumber`), `autonomousState`, `reviewOutcome`, the feasibility study (`feasibility`: `status`, `verdict`, `summary`, `reasons`, `revision`, `reportVersion` and its questions, which `answer_feasibility_questions` answers in one call), the agent's questions (`questionId`, `text`, `answered`) and its 20 most recent comments. `answer_question` answers one of those questions exactly like the board does and returns `delivered`: `true` when a live agent session received the answer, `false` when it was only stored (TODO card, or no live session).

`list_open_prs` returns the open pull requests of a project (`number`, `title`, `url`, `headBranch`, `headSha`, `baseBranch`, `isDraft`, `reviewStatus`, `updatedAt`, `author`, `additions`, `deletions`), cached for five minutes unless `refresh` is `true`. `create_review_ticket` takes a `project` and one open pull request (`pr`, number or URL), creates one review card and starts it right away; it is not idempotent and lets the caller pace its own queue. It accepts the options of the board's review dialog with the same defaults: `depth` (`full`), `postComments` (`true`), `fixComments` (`false`), `language`, `humanTone`, `baseBranch`, `model`, `effort`, `orchestrator`, `codexModel`, `codexEffort`, `codexFast`. A pull request that is not open is rejected with `NOT_FOUND`, and `fixComments` on a pull request held by a quality iteration with `CONFLICT`. Filter review cards with `list_tickets` and `kind: "review"`; a finished review lands in the `reviewed` column (`reviewOutcome: "closed_unpublished"` when it was closed without publication) and `get_ticket` exposes `reviewedCommitSha`, the pull request head commit read by the latest review pass. Compare it with the `headSha` returned by `list_open_prs` (the head commit read in the same provider request: `headRefOid` on GitHub, `lastMergeSourceCommit.commitId` on Azure DevOps, `null` when the provider omits it) to skip a pull request already reviewed at the same commit without another call.

For a review card, `get_ticket` also returns `reviewVerdict` once every reviewer of the latest pass has completed, and `null` before that (or for any other card): `passId`, `verdict` (`APPROVE` with no retained finding, `REQUEST_CHANGES` with at least one critical or major finding, `COMMENT` with only minor findings or when the user forced a comment), `findings` counted by severity after verification, deduplication and user dismissals (`critical`, `major`, `minor`, and `blocking` = critical + major), and `dismissed`, the number of findings the user dismissed.

`analyze_tickets` takes a non-empty list of identifiers and starts only their feasibility study in the background; it starts no implementation. The response separates accepted identifiers (`startedIds`) from missing or already busy cards (`rejected`); the study results are then recorded on each card.

Autonomous campaigns add `submit_campaign_plan`, `check_campaign_readiness`, `install_campaign_skill`, `approve_campaign`, `get_campaign` (read with a cursor), `list_campaigns`, `pause_campaign`, `resume_campaign` and `cancel_campaign`: a plan of several cards runs on its own on the VPS, each card is merged into a campaign branch, and one final pull request (never merged automatically) is validated on a Coolify preview. See [docs/campaigns.md](docs/campaigns.md).

`update_ticket` edits an existing card as long as it sits in TODO and no analysis or implementation is running. It accepts the content and every editable option in the form, in particular the project, the branch, the dependency, the models, the efforts, the orchestrator, the implementer and the pipeline options. An omitted field stays unchanged; `null` and `false` are explicit values. This tool neither moves nor starts the card.

## How it works

```mermaid
flowchart LR
    A[Kanban board] -->|drag ticket| B[Isolated worktree slot]
    B --> C[Claude or Codex session]
    C --> D[Implement + review + tests]
    D --> E[GitHub PR]
    E --> F{Server-verified gates}
    F --> G[Done]
```

The board routes work, the backend verifies gates, and the agents do the reasoning. Each ticket acquires a slot — an isolated git worktree — and spawns a long-lived agent session owned in-process by the backend — Claude Code or OpenAI Codex, chosen per ticket; code-writing can also be delegated to Cursor Composer. The agent drives its pipeline through dedicated tools (`update_stage`, `ask_user`, `done`, `fail`). When it reports `done(pr_url)`, the backend independently verifies that the working tree is clean, the branch is pushed, and the PR exists before closing the ticket.

## Documentation

| Doc | What's inside |
| --- | --- |
| [docs/development.md](docs/development.md) | Run from source, dry-run vs real mode, env vars, desktop app, releases, required Claude Code skills |
| [docs/architecture.md](docs/architecture.md) | Source layout, agent runtime (Agent SDK), ticket flow |
| [docs/campaigns.md](docs/campaigns.md) | Autonomous campaigns driven over MCP: plan, readiness, execution into a campaign branch, final pull request, report |
| [docs/coolify-previews.md](docs/coolify-previews.md) | Configure, prepare, validate and clean up GitHub previews with Coolify |
| [docs/branch-preview-mcp.md](docs/branch-preview-mcp.md) | MCP tools that deploy a branch preview idempotently, without validation |
| [AGENTS.md](AGENTS.md) | Guidance for coding agents working on this repository |
