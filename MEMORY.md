# MEMORY.md

Durable lessons for agents working on this repo that cannot be derived from the code. Read this before starting a task, and append a new entry when you learn something non-obvious that the next agent would otherwise rediscover the hard way.

## Two agent providers: implement every host integration for both

The app drives two agent providers: **Claude** (Claude Agent SDK) and **Codex** (Codex App Server). Every host-integration feature (skills detection, hooks, settings sources, binaries, install commands) must be implemented and tested for BOTH providers. A Claude-only implementation is a bug, not a first step. Reuse `ORCHESTRATORS` / `Orchestrator` from `src/shared/constants.ts` as the provider key.

Host (user-level) skill roots, each holding `<name>/SKILL.md`:

| Provider | Roots | Source |
| -------- | ----- | ------ |
| Claude | `~/.claude/skills` | Claude Code user-level skills |
| Codex | `$CODEX_HOME/skills` (default `~/.codex/skills`, deprecated but still read) and `~/.agents/skills` | openai/codex `codex-rs/ext/skills/src/host_roots.rs` |

Install for both at once with `npx skills add <source> -g -a claude-code,codex -y` (`skills` CLI agent ids: `claude-code`, `codex`). Detection lives in `checkSkills` (`src/server/system/real.ts`), shared roots and install command in `src/shared/skills.ts`.
