# Claude Code Channels setup

> **OBSOLETE.** Atelier no longer uses Claude Code Channels. Agents now run on the official
> `@anthropic-ai/claude-agent-sdk` (`query()` streaming-input) in-process; the backend injects
> events as user turns and exposes the worker tools as an in-process MCP server — there is no
> channel server, no `--dangerously-load-development-channels`, and no `worker.ts` anymore. This
> page is kept for historical reference only.

Official reference: <https://code.claude.com/docs/en/channels-reference>

This was the minimum setup required for Atelier agents to receive tickets through Claude Code Channels.

## Required On Each Machine

Check the basics:

```bash
claude --version    # must be v2.1.80+
gh auth status
tmux -V
bun --version
```

Also make sure:

- Claude Code CLI is logged in and is `v2.1.80` or newer;
- Claude Code Channels are enabled for the account/org;
- Team/Enterprise orgs have Channels explicitly enabled by an admin;
- `gh` is authenticated with push/PR rights on the configured repo;
- `config.json` points `repoPath` to a local git clone with a working `origin`;
- the target repo's package manager is installed (`pnpm`, `yarn`, `npm`, or `bun`, depending on the lockfile).

Atelier automatically launches Claude with:

```bash
claude --dangerously-load-development-channels server:worker
```

Do not pass this manually; it is already part of the real-mode spawn command.

## Start Atelier In Real Mode

For the web dev app:

```bash
bun install
cp config.example.json config.json
# edit config.json
bun run real
```

For Electrobun dev:

```bash
bun install
cp config.example.json config.json
bun run link:desktop-data   # recommended in dev: share config/db/uploads with bun run real
bun run dev:desktop
```

Without `bun run link:desktop-data`, Electrobun reads its config from `~/Library/Application Support/kanban-agents/config.json`, not from the repo's `config.json`.

## If The Terminal Opens But The Agent Is Idle

Run:

```bash
claude --version
gh auth status
tmux -V
git -C /path/to/configured/repo fetch origin <baseBranch>
```

Then inspect the card terminal for:

- MCP/project trust prompts;
- `blocked by org policy`;
- worker import/dependency errors;
- stale copied DB state where first-boot setup is already marked done on a new machine.

Inside a Claude session, `/mcp` can help confirm whether the `worker` server is loaded or failing.

## Optional Webhook Example

The standalone webhook example is only for testing Channels outside Atelier:

- [`docs/examples/webhook-channel/webhook.ts`](examples/webhook-channel/webhook.ts)
- [`docs/examples/webhook-channel/mcp.json.example`](examples/webhook-channel/mcp.json.example)

If copied to its own folder:

```bash
bun add @modelcontextprotocol/sdk
# copy mcp.json.example to .mcp.json
claude --dangerously-load-development-channels server:webhook
```

Atelier tickets do not use this webhook example. They use `worker/worker.ts` and the backend `/workers` WebSocket.
