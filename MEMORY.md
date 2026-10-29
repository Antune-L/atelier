# MEMORY.md

Durable lessons for agents working on this repo that cannot be derived from the code. Read this before starting a task, and append a new entry when you learn something non-obvious that the next agent would otherwise rediscover the hard way.

## Permission refusals are specific to a command and session

The 2026-09-30 retention ticket stalled after a delegated Claude session generalized one refused compound Bash command to all Bash commands. Its parent also tried `corepack pnpm format`, which was not covered by the existing `Bash(pnpm:*)` rule; direct `pnpm format` succeeded. Delegated sessions intentionally cannot commit, push or create PRs, but retain package-manager permissions. Keep their permission reports separate from the parent's permissions, use commands directly in the configured working directory, and inspect the exact refusal before requesting wider permissions. Claude reports authoritative denials in SDK results; Codex's local policy hook journals its denials for the session transcript and server log.

Quality artifacts intentionally omit command operands, so a historical generic refusal cannot identify the rejecting guard afterward. Record a bounded reason code at the guard before redaction and keep unknown provider refusals unknown. Actual Claude and Codex probes confirmed that an observed refusal can coexist with subsequent successful reads and valid criterion results; a refusal is not itself the verdict for the whole run.

## Two agent providers: implement every host integration for both

The app drives two agent providers: **Claude** (Claude Agent SDK) and **Codex** (Codex App Server). Follow the [project's provider compatibility rule](./AGENTS.md#provider-compatibility-when-developing-kanban-agents) for implementation and verification requirements. The provider-specific details below complement that rule. Reuse `ORCHESTRATORS` / `Orchestrator` from `src/shared/constants.ts` as the provider key.

Host (user-level) skill roots, each holding `<name>/SKILL.md`:

| Provider | Roots | Source |
| -------- | ----- | ------ |
| Claude | `~/.claude/skills` | Claude Code user-level skills |
| Codex | `$CODEX_HOME/skills` (default `~/.codex/skills`, deprecated but still read) and `~/.agents/skills` | openai/codex `codex-rs/ext/skills/src/host_roots.rs` |

Install for both at once with `npx skills add <source> -g -a claude-code,codex -y` (`skills` CLI agent ids: `claude-code`, `codex`). Detection lives in `checkSkills` (`src/server/system/real.ts`), shared roots and install command in `src/shared/skills.ts`.

- Zod 4 applies field defaults inside optional properties, including schemas made with `partial()`. PATCH schemas must remove each field default before making the field optional; otherwise omitted preview identifiers, desired state, or generation can reset during unrelated updates. Direct schema and Store probes confirmed that `removeDefault().optional()` preserves only explicitly submitted fields.

- Submitted review activity is separate from formal approval. GitHub `COMMENTED` reviews count as `reviewed` in the PR picker and review counts even when `reviewDecision` is `null` or `REVIEW_REQUIRED`; ordinary comments do not. Keep `APPROVED` and `CHANGES_REQUESTED` distinct for publication verification.
- A publication completion marker proves that review content was posted, not that an Azure reviewer vote succeeded. Use the marker comment's author as the publisher, require the vote response to identify that publisher, and verify the publisher's exact intended vote before reporting approval or requested changes as successful. The done gate must verify the same publisher. Persist the intended event, expected and actual states, provider result, and warning or error for each publication attempt.
- The installed Azure DevOps CLI version parser rejects `7.1-preview.1`; policy evaluation requests use `7.1-preview`. `ConnectionData` can appear in resource catalogs while `Location` is absent from the resource-area directory, so `az devops invoke` cannot address it, and omitting `--area` is unsupported. Binding verification to the marked comment's publisher and the authenticated `set-vote` response keeps the supported CLI transport.

## Azure reviewer response nullability

Azure DevOps can return `isRequired: null` for a reviewer. Keep reviewer schemas nullable for this field; a Zod default handles a missing field but does not accept explicit null. Vote publication must still validate the publisher identity and numeric vote before confirming success.

## Disposable quality verification

- A real Claude correction session claimed that a connection error on its inherited public `kanban` HTTP MCP endpoint made session worker tools unavailable, before attempting any worker call. The same session successfully discovered and called the injected `mcp__kanban__fail` tool. Worker tools are registered in-process by the Claude provider; a public endpoint warning is not evidence that those tools failed. Keep the correction contract explicit about this distinction and require actual discovery/call evidence before changing permissions or host configuration.

- Repository validator read policies restrict tools and paths; they do not semantically filter readable file contents. Do not describe scoped repository reads as guaranteed secret exclusion.
- Snapshot SQLite databases using `VACUUM INTO` before isolated verification. Copying only the main file can omit committed changes still held in the write-ahead log (WAL). Use a separate database and server port for the copied app; temporary validation worktrees also need independent runtime data and application ports.
- Preserve the actual application/provider startup error. A later readiness timeout is not the root cause: the real Claude smoke initially inherited a provider proxy URL pointing at an unavailable local endpoint, and the temporary harness succeeded after removing that override. Do not change the user's provider configuration to repair a disposable probe.
- A completed Model Context Protocol (MCP) tool response with `isError` is a failed operation, not behavioral proof. Require successful browser operations and non-empty attributed observations before accepting criterion evidence.
- Provider tool schemas must use a JSON Schema dialect supported by the actual CLI. The Claude probe rejected JSON Schema 2020-12 metadata; the validator output schema switched to draft-07 and the full real negative-case run then passed. Typecheck and Zod validation alone do not establish CLI compatibility; verify a real provider turn after changing schema conversion.
- Browser request origin filtering is not full network isolation. It constrains the browser's app traffic, not provider processes, project commands, subprocesses, or external resources.

- Quality UI messages are localized at the display boundary, including persisted historical errors. Keep the English wire contract and preserve user-authored criteria, agent evidence and raw diagnostics; translate only recognized application-owned text.

## Delegated implementation recovery

Manual takeover does not protect child changes from ordinary final slot-release cleanup. Before finalization, preserve and verify every unreconciled child workspace and journal outside the cleanup scope; if preservation fails, retain the slot and block cleanup. Recovery also needs affirmative evidence for every frozen obligation independently of the ordinary review-pass budget: an exhausted review budget cannot turn missing coverage into success.

A child can finish integration before its parent records completion. Keep the successful integration journal after removing the child worktree so recovery can recognize that outcome without applying its changes twice, and bind journals to the execution cycle so a fresh run cannot reuse an old completion. Suspending a child must release its active workspace ownership while preserving the workspace and journal; otherwise cleanup can wait for a session that no longer exists or erase the changes needed for recovery.

## Coolify GitHub source metadata

Coolify repository-list lookup uses the GitHub App's numeric `id`, while application creation uses its `uuid`; preserve both rather than substituting one for the other. Parse public-source rows with `id: 0` and nullable installation metadata before filtering for installed Apps. Missing required metadata is incomplete evidence, not proof that an App is uninstalled.

Coolify key inventory includes private/public key material, so validate responses into UUID/name metadata before returning them to clients. Do not filter selectable keys by `is_git_related`: on Coolify 4.3.23, a deploy key already installed on GitHub was still marked false before its first application association. Inventory presence does not prove repository clone access.

## Claude sub-agent tool is `Task` internally

Claude Code lists its sub-agent tool as `Task` in the `system/init` tool list even though the model calls it `Agent`. Putting either `Task` or `Agent` in `disallowedTools` removes it entirely, even when `Agent` is in `allowedTools`, so fan-out orchestrators silently never launch their scouts. Block built-in agents with `permissionDeny` `Agent(general-purpose|Explore|Plan)` instead; only the scouts themselves keep both names disallowed. On Codex, the orchestrator's `spawn_agent` passes the PreToolUse policy (no `agent_type` in its payload) while declared scouts are denied.

## Attributing independent source analysis

Do not require an agent to cite backend/provider-internal observation IDs: Codex App Server command item IDs need not be visible in the model's tool context. Match exact normalized source paths and literal excerpts against completed single-file reads, then persist the server-observed tool ID and session identity. Discovery-only results, path substrings and ambiguous multi-file command outputs cannot attribute a source assertion.

## Isolated browser acceptance fixtures

Use the production-built SPA served from the isolated backend origin when a custom Vite port disagrees with the existing Host/Origin guard. Successful reads and WebSockets do not prove mutations will pass; do not loosen the guard for a test port. A copied SQLite database can retain WAL journal mode without destination sidecars and fail the startup read-only snapshot. Verify the isolated copy and its journal mode before blaming migration logic; never repair the source database to make a fixture run.

## Codex read-only analysis commands

Codex triage and automatic feasibility must expose native exec_command reads to both the parent and the scout/verifier. Read/Glob/Grep names in subagent instructions do not create Codex tools, and native exec_command reaches the PreToolUse hook as Bash. Keep read-only analysis commands single, path-scoped, and limited to explicit absolute repository operands; the hook may lack the effective command working directory. Require rg --no-config and deny external preprocessors, compressed-search helpers, dereferencing escapes, writes, and child recursion. Preserve Claude and Atelier scout restrictions. Only promise local-image inspection when an image-reading tool is actually exposed; otherwise report the limitation.

## Tester action history and native cleanup

Reserve a manual quality request before revision capture or other preparation. It has its own finite allowance and must not consume or reset an autonomous execution's credits, frozen scenarios, or delivery proof. A request rejected before run creation is not a failed product test.

Redact sensitive text before storage, but preserve trusted action identifiers and artifact references structurally. Replacing a short value throughout serialized JSON can corrupt identifiers and break exact evidence links. Compare bounded raw observations only in memory before redacting the persisted evidence.

Provider event dispatchers can absorb callback exceptions, so an audit write failure needs an explicit owner-level abort signal. Progress writes must not prevent compensating closure. Record each native session's cleanup obligation before startup and retain it when closure is unknown; restart recovery and deletion must honor the obligation, including planner and repository sessions without a browser.

## Atelier mockup iframe sandbox

Never add `allow-same-origin` to the mockup iframe sandbox (`MOCKUP_SANDBOX`), nor `allow-scripts` without a security review. The app has no authentication and exposes `/ws/terminal` on the same origin, so same-origin agent-written HTML could drive a shell. An opaque-origin iframe's requests carry `Origin: null`, which `src/server/requestGuard.ts` rejects.

## Root updater capabilities on systemd 259

UID 0 and CapabilityBoundingSet do not prove effective CAP_SETUID. On the VPS, systemd 259.5 started the root updater without that effective capability, causing runuser to fail before cutover. Its seccomp execution path drops CAP_SETUID unless retained in AmbientCapabilities. Preserve CAP_SETUID explicitly for this updater; retain NoNewPrivileges and all application hardening. Verify /proc service capabilities and a harmless user-switch probe separately from a real upgrade, and never reset failed updater state while an upgrade is running.
