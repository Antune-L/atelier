# MEMORY.md

Durable lessons for agents working on this repo that cannot be derived from the code. Read this before starting a task, and append a new entry when you learn something non-obvious that the next agent would otherwise rediscover the hard way.

## Permission refusals are specific to a command and session

The 2026-09-30 retention ticket stalled after a delegated Claude session generalized one refused compound Bash command to all Bash commands. Its parent also tried `corepack pnpm format`, which was not covered by the existing `Bash(pnpm:*)` rule; direct `pnpm format` succeeded. Delegated sessions intentionally cannot commit, push or create PRs, but retain package-manager permissions. Keep their permission reports separate from the parent's permissions, use commands directly in the configured working directory, and inspect the exact refusal before requesting wider permissions. Claude reports authoritative denials in SDK results; Codex's local policy hook journals its denials for the session transcript and server log.

## Two agent providers: implement every host integration for both

The app drives two agent providers: **Claude** (Claude Agent SDK) and **Codex** (Codex App Server). Every host-integration feature (skills detection, hooks, settings sources, binaries, install commands) must be implemented and tested for BOTH providers. A Claude-only implementation is a bug, not a first step. Reuse `ORCHESTRATORS` / `Orchestrator` from `src/shared/constants.ts` as the provider key.

Host (user-level) skill roots, each holding `<name>/SKILL.md`:

| Provider | Roots | Source |
| -------- | ----- | ------ |
| Claude | `~/.claude/skills` | Claude Code user-level skills |
| Codex | `$CODEX_HOME/skills` (default `~/.codex/skills`, deprecated but still read) and `~/.agents/skills` | openai/codex `codex-rs/ext/skills/src/host_roots.rs` |

Install for both at once with `npx skills add <source> -g -a claude-code,codex -y` (`skills` CLI agent ids: `claude-code`, `codex`). Detection lives in `checkSkills` (`src/server/system/real.ts`), shared roots and install command in `src/shared/skills.ts`.

- Submitted review activity is separate from formal approval. GitHub `COMMENTED` reviews count as `reviewed` in the PR picker and review counts even when `reviewDecision` is `null` or `REVIEW_REQUIRED`; ordinary comments do not. Keep `APPROVED` and `CHANGES_REQUESTED` distinct for publication verification.
- A publication completion marker proves that review content was posted, not that an Azure reviewer vote succeeded. Use the marker comment's author as the publisher, require the vote response to identify that publisher, and verify the publisher's exact intended vote before reporting approval or requested changes as successful. The done gate must verify the same publisher. Persist the intended event, expected and actual states, provider result, and warning or error for each publication attempt.
- The installed Azure DevOps CLI version parser rejects `7.1-preview.1`; policy evaluation requests use `7.1-preview`. `ConnectionData` can appear in resource catalogs while `Location` is absent from the resource-area directory, so `az devops invoke` cannot address it, and omitting `--area` is unsupported. Binding verification to the marked comment's publisher and the authenticated `set-vote` response keeps the supported CLI transport.

## Azure reviewer response nullability

Azure DevOps can return `isRequired: null` for a reviewer. Keep reviewer schemas nullable for this field; a Zod default handles a missing field but does not accept explicit null. Vote publication must still validate the publisher identity and numeric vote before confirming success.
