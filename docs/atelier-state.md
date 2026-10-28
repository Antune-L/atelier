# Atelier (conversation → PRD → cards) — implementation state

Living state file for the multi-session implementation of the Atelier workflow. Update it at each
step. Interactive mockup that was validated by the user: https://claude.ai/artifact/SucMFDq5YYeSMm9vkvwbYD

## Goal

A new sidebar view where the user converses with Claude or Codex (model + reasoning effort chosen
per conversation) to elaborate a feature or a fix, with an optional "réflexion préalable" mode in
which the agent runs verifications (feasibility, how-to, external docs, duplicates) before proposing.
Once consolidated, the agent produces a PRD as **structured JSON** (the `prd` skill contract,
`schemaVersion: 2`). The PRD is reviewed with inline annotations + a general note, regenerated into
new revisions, exported as JSON and HTML, and finally turned into one or several TODO tickets that
carry the PRD.

Decisions taken with the user (2026-09-25):

- Sidebar rail entry "Atelier" (not a Home sub-tab).
- Secondary entry points: "Élaborer dans l'Atelier" link in the new-ticket sheet; an "Origine"
  row in the ticket detail linking back to the PRD/conversation.
- "Solidité" gauge from the mockup is dropped for now: the "Consolider en PRD" button is available
  as soon as the agent has replied once; the agent may suggest consolidation in its text.
- Cards default to one ticket per PRD task chained through a single retained prerequisite after
  transitive reduction of the full PRD graph. Independent prerequisites block the whole task batch;
  the UI offers one card for the whole document. Other split modes: one single ticket, one per axis.

## Architecture decisions

### Persistence (SQLite, `src/server/db`)

Three new tables in `SCHEMA_SQL` (+ indexes), rows zod-validated in `rows.ts`, all mutations in
`store.ts`:

- `conversations`: `id`, `project`, `title`, `orchestrator` (`claude|codex`), `model`, `effort`,
  `codex_model`, `codex_effort`, `codex_fast` (0/1), `research_enabled` (0/1), `research_options`
  (JSON: `{feasibility, howTo, externalDocs, duplicates}` booleans), `status`
  (`exploring|prd_draft|prd_validated|cards_created`), `session_status` (`idle|running|error`),
  `session_id` (provider thread id, Codex resume), `error`, `created_at`, `updated_at`.
- `conversation_messages`: `id`, `conversation_id`, `role` (`user|assistant|activity`), `content`
  (markdown; for `activity` a one-line tool trace such as `Read src/x.ts`), `turn_id` (nullable),
  `created_at`. An assistant message is one text segment: a turn may hold several, interleaved
  with its activity rows. For a finished turn the UI shows only the last assistant message as the
  answer and folds the earlier texts and activity rows into a collapsed, indented "Réflexion" block;
  the live turn is one open "Réflexion" block. Older conversations (one merged assistant message
  per turn) render unchanged: that message is the answer.
- `prd_documents`: `id`, `conversation_id`, `revision` (INTEGER, 1..n), `document_json` (validated
  `prdDocumentSchema`), `status` (`draft|validated`), `annotations_json` (`PRD_ANNOTATIONS_SCHEMA`
  shape: `{id, quote, comment}[]`), `general_note`, `created_at`, `updated_at`.
- `tickets`: two new nullable columns `source_prd_id` (→ `prd_documents.id`) and `source_prd_task`
  (`T1`… or null when the card carries the whole PRD or an axis).

### Shared contract (`src/shared`)

- `prdDocumentSchema` in `schemas.ts`: zod port of `vendor/prd/prd.schema.json` (strict objects,
  regex ids, `axes` 1..5, `tasks[].dependsOn` referencing existing task ids, no self dependency, no
  cycles — mirror the Python validator's structural checks, warnings not needed).
- `renderPrdMarkdown(doc)` in `src/shared/prdMarkdown.ts`: deterministic French markdown of the
  document (decisions first, need, goals, out of scope, axes, then per axis requirements + tasks).
  Used for: the annotator (text selection), the ticket `prdMarkdown`, and the contract injection.
- New worker tool `submit_prd_document({ document })` in `protocol.ts` (`WORKER_TOOLS` +
  `WORKER_TOOL_NAMES`), args = `{ document: prdDocumentSchema }`.
- New channel event type `chat` (raw user message, no prefix) in `protocol.ts` and
  `agentMessageChannelSchema`.
- `executionOwnerTypeSchema` gains `"conversation"`.
- Conversation/message/PRD zod schemas + input schemas (`createConversationSchema`,
  `updateConversationSchema`, `postConversationMessageSchema`, `updatePrdDocumentSchema`,
  `createTicketsFromPrdSchema`).
- `wsClientEventSchema` gains `conversation` (upsert), `conversation_removed`,
  `conversation_message` (upsert by id, used for streaming growth too), `prd_document` (upsert).
  The snapshot gains `conversations` (list without messages).
- Constants: `ATELIER_SLOT_ID = -5`, `CONVERSATION_STATUSES`, `CONVERSATION_MESSAGE_ROLES`,
  `PRD_SPLIT_MODES = ["tasks", "single", "axes"]`, labels in French.

### Agent session (server)

- New `AgentSessionRole` `"atelier"`; `workerToolsForRole("atelier")` = `["submit_prd_document",
  "fail"]`.
- `buildAtelierSessionConfig` in `sessionConfig.ts`, modelled on `buildSplitSessionConfig`
  (read-only, `dontAsk`, `skills: []`), plus `WebSearch` + `WebFetch` in `allowedTools` when
  `researchOptions.externalDocs` is on (Claude). Codex: `readOnly: true`; web search stays as the
  provider configures it.
- `AtelierManager` (`src/server/agents/atelierManager.ts`), modelled on `FeasibilityBatchManager`:
  session key `atelier-<conversationId>`, `ownerType: "conversation"`, `ownerId: conversationId`.
  Lazily starts the session on the first user message; the first turn is `buildAtelierPrompt(...)`
  (`src/server/agents/atelier.ts`) followed by the user message. Later messages go through
  `sessionHub.sendEvent(key, { type: "chat", content })`. Captures events through a new
  `SessionStartCallbacks.onEvent` tap: `assistant_text` → assistant message (merge deltas by
  `stream.itemId`, throttle pushes to ~150 ms), `tool_use`/`progress` → activity rows (a
  main-agent activity seals the current text segment: the next text opens a new assistant message),
  `turn_end` → `session_status = idle`. Idle sessions are closed after 30 min; a later message
  relaunches with `resumeSessionId` on Codex, and on Claude with the persisted history rendered as a
  "## Historique de la conversation" section of the first turn. Changing model/effort/orchestrator
  closes the live session; the next message relaunches.
- `submit_prd_document` gate in `coordinator.onToolCall` on `slotId === ATELIER_SLOT_ID` →
  `atelier.handleSubmitPrd(conversationId, document)`: stores a new `prd_documents` revision
  (revision = previous + 1, `document.revision` overwritten to match), sets conversation status
  `prd_draft`, pushes `prd_document` + `conversation`. Tool reply confirms the stored revision.
- Prompt (`buildAtelierPrompt`): French, "tu"; role = product + technical partner on the project
  repo; converse and ask questions; when research mode is on, before any proposal, run the enabled
  verifications and report them first under `### Réflexion préalable` as a list `- [OK|KO|—] …`;
  when asked to consolidate (or when the user validates), call `submit_prd_document` with a document
  following the embedded authoring rules (pyramid: summary → 3-5 axes → requirements/tasks; EARS
  acceptance; word budgets; French prose; ids `A1`, `FR1`, `NFR1`, `T1`; `preDraft.reuse` from real
  repo hits; `sources` from links the user pasted; `openQuestions` phrased as question + default).
  Regeneration turn: compiled feedback (`compileFeedback`) + "produis la révision suivante complète
  via submit_prd_document".

### Routes (`/api/atelier/...`, French errors, zod `safeParse`)

- `GET /conversations?project=` · `POST /conversations` · `GET /conversations/:id` →
  `{ conversation, messages, prds }` · `PATCH /conversations/:id` · `DELETE /conversations/:id`.
- `POST /conversations/:id/messages { content }` · `POST /conversations/:id/interrupt` ·
  `POST /conversations/:id/consolidate { feedback? }`.
- `PATCH /prd/:id { annotations?, generalNote?, status? }` · `POST /prd/:id/regenerate` ·
  `GET /prd/:id/export.json` · `GET /prd/:id/export.html` (renders through
  `vendor/prd/renderPrd.py` with `--previous` = previous revision when any; python3 required,
  502 with a French message otherwise).
- `POST /prd/:id/tickets { split, selection, options, start }` → creates TODO tickets
  (`prdEnabled: false`, `prdMarkdown` set, `sourcePrdId`/`sourcePrdTask`). In `tasks` mode, the shared
  resolver reduces direct prerequisites using the full PRD graph and chains to the retained parent
  only when selected. Independent prerequisites, unknown task IDs or cycles return HTTP 400 before
  any ticket write. A retained but excluded parent leaves the card on the project base without
  that parent's code; the UI names the missing prerequisite. The route pushes each ticket, sets
  conversation status `cards_created`, and returns `{ tickets }`.

### Contract injection

`buildTicketContract`: when `!ticket.prdEnabled && ticket.prdMarkdown`, add a
`## PRD validé` section (the markdown) after the description, and a line telling the agent the PRD is
already validated and must be implemented as-is (no `submit_prd`).

### Web (`src/web/src`)

- `Sidebar`: `"atelier"` entry (`MessageSquare` icon) between Home and Stats.
- `components/atelier/`: `AtelierView` (left list of conversations for the project filter + right
  stepper Conversation → PRD → Cartes), `ConversationPanel`, `ResearchToggle`, `PrdPanel` (reuses
  `PrdAnnotator` on `renderPrdMarkdown(doc)`, annotations persisted server-side), `CardsPanel`.
- Data: `BoardState.conversations`; `boardStore.subscribeConversationMessages` /
  `subscribePrdDocuments` listener streams (comments pattern); `api.atelier*` methods.
- Agent picker: `SessionDriverFields` + `Tabs` with `AGENT_MODEL_FULL_OPTIONS` /
  `AGENT_EFFORT_FULL_OPTIONS`, defaults from `useCapabilities`.
- Secondary entry points: `NewTicketSheet` `onOpenAtelier(seed)`; `TicketMeta` "Origine" row.

### Adversarial review option ("Revue adversariale")

- 5th research option key `adversarialReview` (opt-in, default `false`). `researchOptionsSchema`
  defaults the key so `research_options` JSON persisted before it keeps its four original choices.
- Active when `researchEnabled && researchOptions.adversarialReview`. The Atelier agent stays the
  orchestrator and runs an Athena-style read-only pipeline (dossier → 2 explorers → ≥2 independent
  analysts → own synthesis → fresh adversarial reviewers → verdict, ≤10 sub-agents, ≤1 re-review)
  before handing over a recommended solution or consolidating a changed one into a PRD. The outcome
  is shown under `### Revue adversariale` as synthetic bullet lists (Run, Objections retenues,
  Alternatives écartées, Solution recommandée, Questions ouvertes) ending with `✅ Faisable` /
  `❌ Non faisable` lists.
- Sub-agents are native and bound to the orchestrator's provider (no DB column):
  `ATELIER_ADVERSARIAL_SUBAGENTS` = Claude → `sonnet`/`medium`, Codex → `gpt-6-luna`/`high`. Three
  read-only `scout` sub-agents: `atelier-explorer`, `atelier-analyst`,
  `atelier-adversarial-reviewer`. Claude gets `Agent` + the built-in agent deny list; Codex keeps the
  read-only sandbox, and `prepareAgents` caps role `atelier` at `max_depth: 1`.
- The session config no longer depends on the option (see below); the "Réflexion préalable"
  checklist excludes the key.
- UI: the sub-agent model is not shown. Sub-agents always follow the Atelier agent's provider, so
  `ResearchFields` only exposes the option toggle (change the agent to change the sub-agent model).
- Files: `shared/constants.ts`, `shared/schemas.ts`, `server/agents/{atelier,sessionConfig,atelierManager}.ts`,
  `server/system/codexProvider.ts`, `web/src/components/atelier/{ResearchFields,NewConversationForm,ConversationPanel}.tsx`.

#### Sub-agents on explicit request

- The three read-only sub-agents are exposed in every Atelier session, on both providers
  (`buildAtelierSessionConfig` always sets `agents`; Claude always gets the fan-out tool shape).
- The prompt's `## Sous-agents` section restricts spawning to an explicit request in the current
  user message (≤10 sub-agents, read-only, full context passed in their prompt).
- The adversarial review still self-triggers when enabled; the section then names it as the only
  exception.

#### Gotcha: the Claude sub-agent tool is `Task` internally

- Claude Code names its sub-agent tool `Task` internally (that name is in the `system/init` tool
  list) even though the model calls it `Agent`. Disallowing either `Task` or `Agent` removes the
  tool entirely, even with `Agent` in `allowedTools`: the scouts never launch.
- Fan-out orchestrators (Atelier adversarial, triage "Analyse +", batch feasibility) therefore use
  `READONLY_FANOUT_DISALLOWED = ["Edit", "Write", "Bash"]` and block the built-in agents through
  `permissionDeny` `Agent(general-purpose|Explore|Plan)`. Scouts keep both `Task` and `Agent` in
  their `disallowedTools` (`SCOUT_DISALLOWED`), so they cannot recurse.
- Codex: `prepareAgents` enables `agents` with `max_depth: 1` for role `atelier`; whether Codex
  CLI 0.160.0 also needs a `[features]` flag for multi-agent was not confirmed live (no App Server
  probe run for this fix). The PreToolUse policy allows the orchestrator's
  own `spawn_agent` (no `agent_type` in the hook payload, `restrictNestedAgents` only applies to the
  implementer role) and denies it to scouts (`agent_type` in the declared scout types).
- Live check: `KANBAN_REAL_SDK_PROBE=1 bun test src/server/system/claudeSubagentProbe.test.ts`
  (skipped by default, needs Claude credentials).

### Context usage and compaction

The conversation header shows the live session's context occupancy (`Contexte : 45,2k / 200k
tokens (23 %)`, a progress bar that turns to the warning color at 80 %, `Contexte : aucune session
active` when nothing is live) and a `Compacter` button.

- Seam (`agentSession.ts`): event `{ type: "context_usage"; usedTokens; maxTokens | null }`, opt-in
  through `AgentSessionOptions.reportContextUsage` (set only by `buildAtelierSessionConfig`, both
  orchestrators), and the optional handle method `compact()` which starts a compaction turn that
  ends with a normal `turn_end`. `SessionHub.compact(key)` returns false without a live handle or
  without `compact`. `renderSessionEvent` renders nothing for `context_usage`.
- Claude: after each `result` and each `system/compact_boundary`, `Query.getContextUsage({ detail:
  "summary" })` → `totalTokens` / `rawMaxTokens` (errors are logged, never break the stream).
  `compact()` enqueues the `/compact` slash command as a user turn. `createSdkAgentSession` takes
  injectable `query`/`ensureBinary` dependencies for tests.
- Codex: `thread/tokenUsage/updated` → `last.totalTokens` (else `inputTokens + outputTokens`) and
  `tokenUsage.modelContextWindow` (else null); both fields are optional in the schema, the older
  payload keeps working. `compact()` calls `thread/compact/start { threadId }`; the compaction runs
  as a turn tracked by the existing `turn/started` / `turn/completed` handlers. A `contextCompaction`
  item emits a `Contexte compacté` plan progress.
- Persistence: nullable `conversations.context_tokens` / `context_window` (additive migration),
  server-owned (`updateConversationSchema` does not accept them). They describe the live session
  only: reset to null on settings change, delete, idle close, session failure and `recoverStale`.
  A context-only patch does not bump `updatedAt`.
- `AtelierManager.compact` + `POST /api/atelier/conversations/:id/compact` → 200 `{ conversation }`,
  404 unknown, 409 when the agent is running or no session is live. It persists a `Compacter le
  contexte` user message; the compaction turn's assistant text is dropped and replaced by
  `Contexte compacté : A → B tokens.` (or `Contexte compacté.` / `Échec du compactage du contexte.`).
  These two messages land in the history replayed when a Claude session is relaunched.
- The dry-run `FakeSystemAdapter` simulates a growing context (window 200 000) and a compaction to
  4 000 tokens for the Atelier role.
- **Not verified live**: real Claude `/compact` + `getContextUsage` and real Codex
  `thread/compact/start` + `modelContextWindow` were only checked against the SDK types and the
  strings in the bundled Codex 0.160.0 binary; the tests use scripted providers.

### Sub-agent activity

Sub-agents launched by the Atelier session (Claude `Agent`/`Task`, Codex `spawn_agent`) are shown
as attributed activity lines and as a live list on the conversation.

- Seam (`agentSession.ts`): any event may carry `subagent?: { id, label }` identifying the
  sub-agent that produced it; a dedicated `{ type: "subagent_lifecycle"; phase: "started" |
  "ended"; id; label; status? }` event reports starts and ends. Both Claude and Codex emit them.
  Labels read `description · type`.
- Messages: `conversation_messages.agent_id` / `agent_label` (nullable) are set on `activity` rows
  produced by a sub-agent (`tool_use`, and `plan`/`subagent` `progress`); null for the main agent.
  Such a line takes the current or last user turn id but never opens a turn, never changes
  `sessionStatus` and never flushes (freezes) the main assistant reply. A sub-agent's
  `assistant_text` (with `subagent` or `sourceId`) is ignored. Sub-agent lines are excluded from
  the history replayed when a session is relaunched.
- Conversations: `activeSubagents: { id, label, startedAt }[]` (JSON column, server-owned) is
  updated and pushed on every lifecycle event (`started` adds or relabels, `ended` removes). It is
  cleared on session failure, interrupt, close, settings change, idle close, ceiling close and, at
  server start, by `recoverStale` for every conversation regardless of its status.
- Idle close: while the list is non-empty the idle timer is not armed. When the last sub-agent
  ends and the conversation is not `running` (and no compaction runs), the idle timer is armed.
- Ceiling: an active sub-agent keeps the session open for at most `ATELIER_SUBAGENT_CEILING_MS`
  (60 min, injectable as `subagentCeilingMs`) counted from the oldest `startedAt`. On expiry the
  session is disconnected like an idle close: background state reset, list cleared,
  `sessionStatus` set to `idle` (unread if a background notification was pending) and context
  figures cleared.

### Steering (« Aiguillage »)

- Composer: while `sessionStatus === "running"` the composer stays enabled and its action becomes
  « Aiguiller ». `POST /conversations/:id/messages` is never refused for a running conversation.
- Persistence: the user message keeps its RAW content (no prefix) with
  `conversation_messages.steering = "pending"` (nullable column, `ConversationSteering`). States:
  `pending` (sent mid-turn, unresolved), `steered` (absorbed by the running turn), `queued`
  (handled by a follow-up turn, badge « en file »), `failed` (not transmitted), `abandoned`
  (dropped). Regular messages keep `steering: null`.
- Framing: the chat channel event carries `steer: true`; `renderChannelEvent` prefixes the content
  with `STEER_PREFIX` (« Aiguillage de l'utilisateur pendant ton tour … : »), which the Atelier
  prompt explains (integrate without restarting, never by itself a PRD regeneration/consolidation).
  `SessionHub.sendEvent` passes `{ steer: true }` as the 4th `send` argument (`AgentSendOptions`).
- Claude: the steering `SDKUserMessage` gets `priority: "next"` (never `now`, which can abort a
  running tool). **Unmeasured**: the real-Claude measurement was not run; the probe
  `src/server/testing/probeClaudeSteering.ts` is available (see
  [atelierProviderQualification.md](./atelierProviderQualification.md#mid-turn-steering-probe)).
- Codex: unchanged provider; `send` uses `turn/steer` on an active turn and replays a refused steer
  through `turn/start`, which shows up as a follow-up turn (« en file »).
- Bubbles: the text written before the steer is flushed above it; fragments of an item already
  being written keep updating that bubble, and the next new item (text or main-agent activity)
  opens a new bubble under the steer's `turnId`. No empty bubble is created when nothing follows.
- Resolution heuristic: a `turn_end` with pending steers keeps the conversation `running` and arms
  a grace timer (`ATELIER_STEER_GRACE_MS`, 10 s, injectable as `steerGraceMs`). Main-agent output
  before it fires marks every pending steer `queued` and attaches the reply under the last steer;
  the next `turn_end` idles normally. Expiry without output marks them `steered` and idles
  (unread). A steer sent during the grace window first settles the earlier pending steers as
  `steered`, then re-arms the window for itself alone. Known degradation: a slow follow-up turn may briefly show idle then running again, and
  Claude's absorbed-vs-queued state is inferred from output after the turn end, not reported.
  `markRunning` clears the idle close when the conversation flips back to running.
- Order: deliveries of one conversation are chained, so several steers reach the provider in send
  order.
- Failure: a steer that cannot be sent while the turn still runs is marked `failed` with an
  activity line « Message non transmis : <raison> » and leaves the status `running`; with no turn
  running the usual error path (« Réessayer ») applies.
- Abandonment: interrupt, settings change, session failure and the sub-agent ceiling close mark
  pending steers `abandoned` with one activity line « Aiguillage non traité : <raison> »;
  `recoverStale` does the same at boot (« redémarrage du backend »).
- Guards: consolidation and regeneration throw `AtelierBusyError` while running; the routes answer
  409 with a French message. The web disables « Valider » / « Régénérer » while running.

## Lots and status

| Lot | Scope | Status |
|---|---|---|
| A | shared schemas/constants/protocol, DB tables + rows + store, `renderPrdMarkdown`, vendored renderer + HTML export module, tests | done (2026-09-25) |
| B | atelier prompt + session config + role + coordinator gate + manager + routes + hub + contract injection + fake adapter + tests (both providers) | done (2026-09-25) |
| C | web: sidebar, store/api, atelier components, secondary entry points | done (2026-09-25) |
| D | typecheck + lint + tests, simplifier pass, dry-run UI check, graphify update | done (2026-09-25: full flow checked in the dry-run sandbox — conversation, PRD annotation/regeneration/validation, JSON + HTML export, cards with T2 → T1 chaining; renderer embedded in the desktop package) |

### Lot A public API (use these names in Lots B and C)

- Constants (`src/shared/constants.ts`): `ATELIER_SLOT_ID` (-5), `CONVERSATION_STATUSES` /
  `ConversationStatus` / `CONVERSATION_STATUS_LABELS`, `CONVERSATION_SESSION_STATUSES` /
  `ConversationSessionStatus`, `CONVERSATION_MESSAGE_ROLES` / `ConversationMessageRole`,
  `PRD_DOCUMENT_STATUSES` / `PrdDocumentStatus`, `PRD_SPLIT_MODES` / `PrdSplitMode` /
  `PRD_SPLIT_MODE_LABELS`, `PRD_SINGLE_SELECTION` (`"single"`), `RESEARCH_OPTION_KEYS` /
  `ResearchOptionKey` / `RESEARCH_OPTION_LABELS`.
- PRD contract (`src/shared/prdDocument.ts`, re-exported by `schemas.ts`): `prdDocumentSchema`,
  `PrdDocument`, `PrdAxis`, `PrdRequirement`, `PrdTask`, `PRD_SCHEMA_VERSION`, `PRD_MAX_AXES`.
  Kept in its own module so `protocol.ts` can import it without a cycle through `schemas.ts`.
- Schemas (`src/shared/schemas.ts`): `researchOptionsSchema` / `ResearchOptions` /
  `DEFAULT_RESEARCH_OPTIONS` (all true), `conversationSchema` / `Conversation`,
  `conversationMessageSchema` / `ConversationMessage`, `prdAnnotationSchema` / `PrdAnnotation`,
  `prdAnnotationsSchema`, `prdDocumentRecordSchema` / `PrdDocumentRecord`, enum schemas
  `conversationStatusSchema`, `conversationSessionStatusSchema`, `conversationMessageRoleSchema`,
  `prdDocumentStatusSchema`, `prdSplitModeSchema`. Inputs: `createConversationSchema` (note:
  `codexFast` is nullable there, resolve null to the app default; `title` optional, `seed` optional),
  `updateConversationSchema`, `postConversationMessageSchema`, `consolidatePrdSchema`,
  `updatePrdDocumentSchema`, `prdTicketOptionsSchema` (= `ticketBatchOptionsSchema` without
  `project`/`prdEnabled`), `createTicketsFromPrdSchema` (`options` prefaults to `{}`).
  `executionOwnerTypeSchema` has `"conversation"`, `agentMessageChannelSchema` has `"chat"`.
  `ticketSchema` has `sourcePrdId` / `sourcePrdTask`; `createTicketSchema` accepts them optional.
- WS events (`wsClientEventSchema`): `conversation` `{ conversation }`, `conversation_removed`
  `{ conversationId }`, `conversation_message` `{ message }`, `prd_document` `{ prd }`; the snapshot
  carries `conversations` (already filled by `ClientHub.sendSnapshot`). No `push*` helpers yet on
  `ClientHub`: Lot B adds them.
- Protocol (`src/shared/protocol.ts`): worker tool `submit_prd_document` with
  `submitPrdDocumentArgsSchema` (`{ document: prdDocumentSchema }`, re-exported by `schemas.ts`);
  channel event `{ type: "chat", content }` rendered raw by `renderChannelEvent`. The coordinator's
  `pipelineHandlers.submit_prd_document` is a placeholder refusal; Lot B adds the
  `ATELIER_SLOT_ID` gate before it. `workerToolsForRole("atelier")` = `["submit_prd_document", "fail"]`.
- Markdown (`src/shared/prdMarkdown.ts`): `renderPrdMarkdown(doc)`, `renderPrdTaskBrief(doc, taskId)`
  and `renderPrdAxisBrief(doc, axisId)` (both return `null` for an unknown id).
- Store (`src/server/db/store.ts`): `listConversations(project?)`, `getConversation(id)`,
  `createConversation(NewConversation)`, `updateConversation(id, ConversationPatch)` (patch also
  covers `sessionStatus`, `sessionId`, `error`), `deleteConversation(id)`,
  `listConversationMessages(conversationId)`, `addConversationMessage(NewConversationMessage)`,
  `updateConversationMessage(id, { content })`, `listPrdDocuments(conversationId)` (revision ASC),
  `getPrdDocument(id)`, `createPrdDocument(NewPrdDocument)`, `updatePrdDocument(id, PrdDocumentPatch)`.
  Adding a message or a PRD bumps the conversation `updated_at`. `NewTicket` accepts
  `prdMarkdown`, `sourcePrdId`, `sourcePrdTask`; `TicketPatch` accepts `sourcePrdId`, `sourcePrdTask`.
- HTML export (`src/server/prd/renderPrdHtml.ts`): `renderPrdHtml({ document, previous?, resourcesRoot? })`
  throws `PrdRenderError` (French message, stderr included) when python3 or the renderer is missing or
  the render fails; `resolvePrdRendererPath(resourcesRoot?)`, `PYTHON_BINARY`. Routes should map
  `PrdRenderError` to 502 and pass the server `resourcesRoot` for the desktop build.

### Lot C summary (web)

Files:

- Store/API: `src/web/src/lib/store.ts` (`BoardState.conversations`, `subscribeConversationMessages`,
  `subscribePrdDocuments`, `rememberConversation`, `forgetConversation`), `src/web/src/lib/api.ts`
  (`api.atelier*`, `atelierPrdExportUrl`, `ConversationDetail`, request bodies typed with `z.input`).
- Hook: `src/web/src/hooks/useConversationDetail.ts` (render-phase load per id, WS merge by id,
  `applyPrd` for REST responses).
- Helpers: `src/web/src/lib/atelier.ts` (steps, `AtelierTarget`, `AtelierAgentSettings`, agent labels,
  status badge variants); `appendMarkdownLine` added to `src/web/src/lib/paste.ts` (now shared by
  AskPanel, NewTicketSheet and the Atelier composer).
- Components (`src/web/src/components/atelier/`): `AtelierView`, `NewConversationForm`,
  `ConversationPanel`, `PrdPanel`, `CardsPanel`, `AtelierAgentFields` (SessionDriverFields + Claude
  model/effort Tabs, reused by the form, the settings popover and the cards defaults),
  `ResearchFields` (Switch + ToggleGroup of the 4 options).
- Wiring: `Sidebar.tsx` ("atelier" entry), `App.tsx` (`atelierTarget`, header project filter shown for
  the atelier view, target cleared on sidebar navigation), `NewTicketSheet.tsx` (`onOpenAtelier`),
  `TicketDetail.tsx` + `ticket-detail/TicketMeta.tsx` (`onOpenPrdOrigin`, "Origine" row).
- `PrdAnnotator.tsx`: annotation ids are now `crypto.randomUUID()` (the old per-mount counter collided
  with persisted `ann-N` ids).

Deviations / decisions:

- New-conversation form is inline in the right pane (no dialog); ⌘/Ctrl+Entrée submits it.
- The "Origine" row cannot know the revision number without a fetch: it shows "PRD (Atelier)" or
  "PRD · T2 (Atelier)". It shows a muted "PRD supprimé" only when the project has no conversation left;
  otherwise the click resolves the PRD by fetching the project's conversations one by one and toasts
  "PRD introuvable" when none owns it.
- "Réessayer" (session error) re-posts the last user message (no dedicated retry route); Lot B should
  clear `error`/`sessionStatus` on the next message.
- Sending while `sessionStatus === "running"` steers the current turn (« Aiguiller »), see
  [Steering](#steering-aiguillage).
- A new PRD revision arriving for the open conversation switches to the PRD step on the latest revision.
  "L'agent régénère…" is driven by `conversation.sessionStatus === "running"`.
- Annotation is only possible on the latest draft revision; older revisions are read-only.
- Cards: `start: false` always; implementer is paired from the orchestrator (`pairedImplementer`);
  `prDraft` is forced off when `autoMerge` is on.
- The assistant label (`claude · opus · medium`) reflects the conversation's current settings, not the
  settings at the time of each reply.
- UI not exercised in a browser yet (Lot B routes pending): to check in Lot D's dry-run pass.

### Lot B public surface and deviations (read before Lot C/D)

Files: `src/server/agents/atelier.ts` (`buildAtelierPrompt`, `buildAtelierConsolidateTurn`,
`buildAtelierRegenerationTurn`), `src/server/agents/atelierManager.ts` (`AtelierManager`,
`describeToolUse`, `ATELIER_IDLE_TIMEOUT_MS`), `sessionConfig.ts` (`buildAtelierSessionConfig`,
`atelierSessionKey`, `parseAtelierSessionKey`), `src/shared/prdFeedback.ts` (`compileFeedback`, now
re-exported by `src/web/src/lib/prdAnnotations.ts`), `ClientHub.pushConversation` /
`pushConversationRemoved` / `pushConversationMessage` / `pushPrdDocument`, `SessionStartCallbacks.onEvent`.
Routes live in `routes.ts` (`createAtelierRoutes`, mounted with `.use()` under `/api`). Tests:
`atelierManager.test.ts`, `routes.atelier.test.ts` (both orchestrators, coordinator gate, tasks chain),
`contract.test.ts` ("Atelier PRD" block).

REST contract implemented as specified. Deviations and precisions:

- `POST /prd/:id/tickets` `tasks` mode creates the selected tasks dependencies-first (stable
  topological order, document order otherwise), so a task listed before its dependency still gets
  its resolved `dependsOn`. Redundant direct prerequisites are removed transitively even through
  excluded tasks; two or more independent prerequisites on any selected task reject the entire
  batch before writes. The UI disables creation and offers a single card covering the whole
  document, clearing the milestone filter. `tickets` in the response are in creation order.
- The card preview sends `start: false`, so its creation starts no implementation. In task batches
  with chaining, the first cards are started manually; dependent cards start automatically when
  their parent opens its PR. Single and axis cards have no automatic dependency start.
- `axes` mode titles cards `A2 — <axis title>` with `sourcePrdTask: null`; `single` mode ignores the
  `selection` content (send `["single"]`) and uses `summary` + a `## Objectifs` list as description.
- `POST /conversations` with a `seed` returns the conversation re-read after the seed was posted
  (`sessionStatus: "running"`).
- `consolidate` and `regenerate` also persist a visible user message: `Consolider en PRD` (+ feedback)
  and `Régénérer le PRD (révision N)` + the compiled feedback; the richer instruction only goes to
  the agent.
- `PATCH /conversations/:id` settings changes clear `sessionId`: the next message relaunches with a
  fresh prompt + `## Historique de la conversation` on both providers (so new research options or
  model apply). Codex `resumeSessionId` is used only after an idle close / server restart; a
  resumed session that fails clears `sessionId`.
- Agent `fail` sets `sessionStatus: "error"` + `error` (session kept); session `error` events close
  the session (`sessionStatus: "error"`). Boot resets conversations left `running` to `idle`
  (`AtelierManager.recoverStale`).
- Activity rows: every `tool_use`, plus `progress` of kind `plan`/`subagent` without stream (Codex
  reports command/file/mcp items twice otherwise). Sub-agent `assistant_text` (with `sourceId`) is
  ignored. An assistant message covers one text segment of a provider turn: a main-agent activity
  seals it (sub-agent lines do not), and text streamed after a mid-turn user message stays in the
  current segment until the next activity or `turn_end`.
- Dry-run: `FakeSystemAdapter` answers each Atelier `send` with a simulated reply + `turn_end`
  (other roles unchanged).
- `AgentCoordinator` takes an 11th constructor argument `atelier`; `RouteDeps` gains `atelier` and an
  optional `resourcesRoot` (index passes it for the HTML export).
- Known limitation: `SessionHub` replays never-accepted messages of a previous generation on
  relaunch; if that includes an old `ticket` turn, the new first turn is swallowed. Rare (both
  providers accept immediately), not handled.

### Follow-ups noticed in Lot A

- Desktop packaging: `electrobun.config.ts` `build.copy` does not ship `vendor/prd/renderPrd.py` yet
  (add it in Lot D, next to `templates/run_composer.sh`).
- `deleteConversation` leaves `tickets.source_prd_id` pointing at a deleted PRD; the "Origine" row
  (Lot C) must tolerate a missing PRD.

## Verified findings (from the exploration, 2026-09-25)

- The removed standalone PRD view (commit 8a70b1c) was a one-shot markdown generator without
  persistence; nothing to reuse beyond `PrdAnnotator` / `lib/prdAnnotations.ts`.
- No skip-PRD flag exists on tickets; `prdEnabled: false` + contract injection is the chosen path.
- `SessionHub` sessions are keyed by any string; the coordinator guards `store.getTicket` misses.
- Only Codex streams token deltas; Claude emits whole text blocks.
- `WebSearch`/`WebFetch` are allow-listed only for orchestrator sessions today.

## Settled conversations

Conversations carry a `settled` flag (`conversations.settled` column, additive migration; `settled`
in `conversationSchema`). `POST /atelier/conversations/:id/settle` and `/unsettle` toggle it through
`store.setConversationSettled`, which does not bump `updated_at`, and push the conversation over the
hub (404 on unknown id, no-op when already in that state). `AtelierManager.submitTurn` resets it to
false, so sending a message, consolidating or regenerating a PRD brings the conversation back to the
active list; turn ends and errors leave it untouched. The web list (`splitConversations`) shows active
conversations first, then a collapsible "Classées" section (collapse persisted in
`atelier:settled-collapsed`) with compact rows, limited to `SETTLED_PREVIEW_COUNT` until "Afficher N de plus".

## Open questions / hypotheses

- Tickets still have one `dependsOn`: independent PRD prerequisites require a single document card
  or a revised PRD. They are never silently linearized or reduced to the first selected parent.
- HTML export depends on `python3` (present on the dev machine at `/opt/homebrew/bin/python3`).

### Lot D simplifier pass (2026-09-25)

New shared helpers introduced while deduplicating: `enabledResearchOptionKeys` / `researchOptionsFromKeys`
(`src/shared/schemas.ts`), `defaultAgentSettings` and `UNTITLED_CONVERSATION_LABEL` (`src/web/src/lib/atelier.ts`),
`useBusyAction` (`src/web/src/hooks/useBusyAction.ts`, busy flag + error + `run`), `LiveDot`
(`src/web/src/components/atelier/LiveDot.tsx`). No behaviour or public route change.
