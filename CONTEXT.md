# CONTEXT — domain glossary

Domain vocabulary for kanban-agents. These are the nouns the code, the README, and
architecture reviews should use. User-facing strings are French; these identifiers are
English (matching the code). Keep this file in sync as concepts crystallize.

## Work items

**Ticket** — one unit of work the board tracks. Carries a **Kind**, a **Column**, a
**Stage**, and the agent knobs (model, effort, implementer). All ticket mutations go
through `store.ts`.

**Kind** — what pipeline a ticket runs: `feature` (implement end-to-end), `review` (run
argus on a PR), `clean` (triage + fix PR feedback), `ask` (read-only question answered as
a comment). *Conflict resolution* is a mode on a feature ticket (`resolvingConflicts`),
not a kind.

**Column** — the board lane a card sits in (8: todo, implementing, prd, done, merged,
reviewed, failed, abandoned). The coarse, user-visible axis.

**Stage** — the fine-grained pipeline state (12: queued … opening_pr / done / failed /
interrupted / stalled). A *different axis* from Column. Use `ACTIVE_STAGES` /
`TERMINAL_STAGES`, never hardcode. A subset is *agent-settable* (what an agent may set via
`update_stage`); terminal stages like `stalled`/`interrupted` are backend-set only.

## Execution

**Slot** — a git-worktree execution unit from a fixed pool (`SLOT_COUNT`), at
`SLOTS_ROOT/slot-N`. **SlotManager** owns its lifecycle: cleanup → fetch → worktree add →
deposit config → install → tmux spawn → done gate → release. Git ops per repo serialize
through `repoMutex`.

**Worker** — the MCP channel server (`worker/worker.ts`) spawned inside each Claude Code
session. Speaks MCP over stdio to its session, and connects outbound over WS to the
backend. Opens no listening port; reconnects self-heal a backend restart.

**Channel** — the two-way agent↔backend link. backend→agent: MCP notifications
(`ticket`, `answer`, `prd_validated`, `nudge`, `user_comment`). agent→backend: tool calls
(`update_stage`, `ask_user`, `submit_prd`, `submit_answer`, `done`, `fail`,
`submit_triage`, `submit_feasibility`).

**Protocol** — the single source of truth for the wire format of the Channel: the tool
registry (name → args schema → MCP description), the channel-event union, and the WS
frames. Lives in `src/shared/protocol.ts` so the worker (bundled standalone), the
coordinator, and the web client all derive from one declaration instead of hand-synced
copies. *(Introduced by architecture candidate #2 — the wire-protocol seam.)*

**Contract** — the pipeline instructions (`contract.ts`) injected verbatim as the first
`ticket` channel event. The backend never reasons; the contract tells the agent's own
native subagents what to do.

**Done Gate** — server-side verification of `done(pr_url)`: clean tree, branch pushed, PR
exists. The backend does not trust the agent. Failure → `stalled`, slot kept.

**Coordinator** — routes worker tool calls and Stop-hook events to state mutations;
owns the auto-nudge → auto-reclaim → stalled escalation.

**Ticket Lifecycle** (`src/server/lifecycle.ts`) — the domain-verb surface for ticket
state transitions, sitting ABOVE `store` (it calls `store`, never SQL). Each verb
(`setStage`, `submitPrd`, `beginImplementing`, `resumeImplementing`, `beginOpeningPr`,
`enqueue`, `moveColumn`, `markMerged`, `fail`, `stall`, `markLaunchFailed`) fuses the
coupling a transition carries — ticket fields + slot status + `finishedAt` — with the
broadcast/log/notify ritual, so a caller can't move the stage without syncing the slot or
forget to push. Replaces hand-assembled `store.updateTicket` patches at the
coordinator/routes/slotManager call sites. Does NOT depend on the Channel (WorkerHub) —
channel sends are not lifecycle transitions. Config-knob edits (model, effort, autoMerge…)
and pure bookkeeping (sessionId, nudgeCount, progress) stay on `store.updateTicket`.
*Not yet routed through it:* the slot-mechanics-entangled terminal transitions inside
SlotManager (done-success, completeAsk, abandon, interrupted-on-recover) — a noted
follow-up. *(Architecture candidate #1 — the deep module above store.)*

## Seams

**System Adapter** (`src/server/system/`) — the single side-effect seam (git, tmux, gh,
osascript, fs, `~/.claude.json`). `FakeSystemAdapter` (dry-run default, zero side effects)
and `RealSystemAdapter` (only when `KANBAN_DRY_RUN=0`) are the two adapters.

**Triage / Feasibility** — read-only implementability analysis run before implementation.
Triage runs one session on the real repo; feasibility fans out one batch session over many
imported tickets.

## Proposed (not yet built)

**Lifecycle phase 2** — route the remaining slot-mechanics-entangled terminal transitions
in SlotManager (done-success, completeAsk, abandon, interrupted-on-recover) through
[[Ticket Lifecycle]] verbs (`finishDone`, `completeAnswered`, `abandon`, `markInterrupted`)
so it becomes the *complete* terminal-transition surface, not just the shared `fail`/`stall`
paths.
