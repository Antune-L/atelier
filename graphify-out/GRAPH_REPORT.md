# Graph Report - kanban-agents  (2026-07-21)

## Corpus Check
- 176 files · ~662,610 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1688 nodes · 4021 edges · 92 communities (79 shown, 13 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 25 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8e72f687`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Contract Building & Slots
- Terminals UI & Notifications
- Desktop Bootstrap & Menus
- Feasibility Batch Management
- Ticket Action Panels
- Fake System Adapter
- Shared Zod Schemas
- Settings & Profiles UI
- PR Selection & Slots Bar
- Real System Adapter
- Slot Config & Worktree Watch
- Core Domain Concepts
- Board & Sidebar Layout
- Database Store Operations
- Coordinator & Protocol
- API Routes & Reformulate
- Stats Aggregation
- Triage & Server Hub
- Live Terminal Views
- Stage Progress & Display
- Real Adapter GH/Composer
- Store Types & Agent Knobs
- DB Row Schemas & Mappers
- Dev Dependencies
- TypeScript Config
- Client Hub & Watchdog
- Cost & Pricing
- Workflow View & Lifecycle
- Stats Charts
- Session Hub & Agent Session
- Agents View & Ticket Cards
- PRD Review & Markdown
- User Terminal & Fake IO
- Logging
- Board Columns
- NPM Scripts
- Runtime Dependencies
- Claude SDK Provider
- Agent Profile Config
- Agent Coordinator Handlers
- API Client Inputs
- Ticket Config & Constants
- Ticket Detail & Triage UI
- Demo Pipeline Concepts
- Chart Primitives
- Session Hub Transcript
- Community 46
- Modal Dialogs
- Community 48
- Slot State
- Stats Hooks & Cards
- Community 51
- csv.ts
- User Terminal Manager
- Community 54
- Community 55
- CSV Parsing
- Community 57
- File Uploads
- Webhook MCP
- Package Manifest
- Community 61
- TicketCard.tsx
- Community 63
- Composer Run Script
- migration.ts
- useTickTimer.ts
- ProjectConfig
- CLAUDE.md Doc
- Electrobun Deps Types
- logger.ts
- PostCSS Config
- Community 72
- React Root Mount
- Theme Flash Guard
- Community 75
- usePrdSearch.ts
- Community 77
- useTerminalShortcuts.ts
- WorktreeSession
- Community 80
- SplitTree.tsx
- Community 82
- FakePaneStream
- prd.ts
- Community 89
- Community 90
- reformulate.ts

## God Nodes (most connected - your core abstractions)
1. `Store` - 86 edges
2. `Ticket` - 66 edges
3. `cn()` - 61 edges
4. `RealSystemAdapter` - 51 edges
5. `SlotManager` - 45 edges
6. `FakeSystemAdapter` - 44 edges
7. `ProjectInfo` - 39 edges
8. `ClientHub` - 34 edges
9. `AgentModel` - 30 edges
10. `AgentEffort` - 29 edges

## Surprising Connections (you probably didn't know these)
- `boot()` --calls--> `startServer()`  [INFERRED]
  desktop/index.ts → src/server/index.ts
- `NewClean` --references--> `ProjectKey`  [EXTRACTED]
  src/server/db/store.ts → src/server/config.ts
- `StageProgressBarProps` --references--> `Ticket`  [EXTRACTED]
  src/web/src/components/StageProgressBar.tsx → src/shared/schemas.ts
- `TicketCostProps` --references--> `Ticket`  [EXTRACTED]
  src/web/src/components/TicketCost.tsx → src/shared/schemas.ts
- `WorkflowViewProps` --references--> `Ticket`  [EXTRACTED]
  src/web/src/components/WorkflowView.tsx → src/shared/schemas.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Agent session lifecycle (per ticket)** — agents_session_hub, agents_slot_manager, agents_coordinator, agents_pipeline_contract, agents_slots, agents_done_gate [INFERRED 0.85]
- **Side-effect boundary implementations** — agents_system_adapter, agents_fake_system_adapter, agents_real_system_adapter [EXTRACTED 1.00]
- **In-process SDK agent protocol** — agents_claude_agent_sdk, agents_query_streaming_input, agents_in_process_mcp_server, agents_worker_tools, agents_channel_events [INFERRED 0.85]

## Communities (92 total, 13 thin omitted)

### Community 0 - "Contract Building & Slots"
Cohesion: 0.10
Nodes (20): log, ReclaimOutcome, SETUP_PHASES, SlotManagerConfig, resolveTemplatePaths(), TemplatePaths, computeWorktreeAddresses(), log (+12 more)

### Community 1 - "Terminals UI & Notifications"
Cohesion: 0.17
Nodes (5): DRY_RUN_VERDICT, FeasibilityBatchManager, log, toTriageResult(), FeasibilityResult

### Community 2 - "Desktop Bootstrap & Menus"
Cohesion: 0.04
Nodes (58): AnalyzeTicketsInput, appSettingsSchema, automationRunSchema, automationSchema, baseBranchSchema, capabilitiesSchema, commentAuthorSchema, commentSchema (+50 more)

### Community 3 - "Feasibility Batch Management"
Cohesion: 0.09
Nodes (3): delay(), fakeShellPrompt(), FakeSystemAdapter

### Community 4 - "Ticket Action Panels"
Cohesion: 0.11
Nodes (10): dataMessage(), normalizeSeed(), safeParse(), send(), TerminalSession, TerminalSessionManager, visibleText(), TerminalServerMessage (+2 more)

### Community 5 - "Fake System Adapter"
Cohesion: 0.06
Nodes (33): buildNotionImportPrompt(), createSplitChildren(), failSplitMother(), isBlocked(), isSplitMother(), log, PaneReader, performSplit() (+25 more)

### Community 7 - "Settings & Profiles UI"
Cohesion: 0.07
Nodes (29): addUsageByModel(), log, ToolHandler, ToolResult, toUsageByModel(), TRIAGE_VERDICTS, AgentSettableStage, agentSettableStageSchema (+21 more)

### Community 8 - "PR Selection & Slots Bar"
Cohesion: 0.07
Nodes (25): log, log, DRY_RUN_VERDICT, log, TriageSession, log, Watchdog, MODELS (+17 more)

### Community 9 - "Real System Adapter"
Cohesion: 0.08
Nodes (5): extractPrUrl(), RealSystemAdapter, safeJsonParse(), DoneGateResult, ReviewDoneOptions

### Community 10 - "Slot Config & Worktree Watch"
Cohesion: 0.05
Nodes (38): AutomationRow, automationRowSchema, AutomationRunRow, automationRunRowSchema, buildScripts(), CommentRow, commentRowSchema, mapProfileRow() (+30 more)

### Community 11 - "Core Domain Concepts"
Cohesion: 0.08
Nodes (29): FullscreenToggle(), FullscreenToggleProps, badgeLabelFor(), LiveTerminal(), LiveTerminalOptions, LiveTerminalProps, TabButton(), PrdView() (+21 more)

### Community 12 - "Board & Sidebar Layout"
Cohesion: 0.15
Nodes (6): SessionHub, DRY_RUN_RESULT, log, PendingSplit, SplitManager, SplitResult

### Community 13 - "Database Store Operations"
Cohesion: 0.11
Nodes (31): AgentsViewProps, CleanPrPanel(), CleanPrPanelProps, NewTicketDialogProps, PrdAnnotator(), ProjectPrPicker(), ProjectPrPickerProps, ProjectSelect() (+23 more)

### Community 14 - "Coordinator & Protocol"
Cohesion: 0.10
Nodes (29): effectiveWorkDurationMs(), costByModel(), costByProject(), CostGroup, DurationGroup, KIND_LABELS, KindCount, kindCounts() (+21 more)

### Community 15 - "API Routes & Reformulate"
Cohesion: 0.17
Nodes (15): WORKER_TOOLS, resolveClaudeBinary(), bashCommandSchema, buildSettings(), claudeProvider, createSdkAgentSession(), dispatch(), HIDDEN_COMMIT_ATTRIBUTION (+7 more)

### Community 16 - "Stats Aggregation"
Cohesion: 0.19
Nodes (17): loadTree(), saveTree(), storageKey(), applySizes(), collectTerminalIds(), findLeaf(), firstLeafId(), LeafNode (+9 more)

### Community 17 - "Triage & Server Hub"
Cohesion: 0.08
Nodes (25): devDependencies, autoprefixer, class-variance-authority, clsx, concurrently, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities (+17 more)

### Community 18 - "Live Terminal Views"
Cohesion: 0.15
Nodes (5): resolveBaseBranch(), SlotManager, slotPath(), slugify(), isProjectKey()

### Community 19 - "Stage Progress & Display"
Cohesion: 0.08
Nodes (24): compilerOptions, allowImportingTsExtensions, baseUrl, esModuleInterop, isolatedModules, jsx, lib, module (+16 more)

### Community 20 - "Real Adapter GH/Composer"
Cohesion: 0.20
Nodes (14): Tab, TAB_TITLES, TabButtonProps, PrdReviewDialogProps, QuitConfirmModalProps, isNotionUrl(), NOTION_HOSTS, ConfirmDialogProps (+6 more)

### Community 21 - "Store Types & Agent Knobs"
Cohesion: 0.08
Nodes (20): BoardColumn(), BoardColumnProps, DEFAULT_COLLAPSED, familyKeyOf(), groupTicketsByFamily(), isSplitMother(), RenderGroup, resolveAnalyzeAllTitle() (+12 more)

### Community 22 - "DB Row Schemas & Mappers"
Cohesion: 0.16
Nodes (20): formatTokens(), TicketCost(), TicketCostProps, TOKEN_FORMATTER, USD_FORMATTER, costByFamily(), costOf(), costOfModel() (+12 more)

### Community 23 - "Dev Dependencies"
Cohesion: 0.07
Nodes (27): Architecture, argus review (native subagent), Backend (routes tool calls, verifies gates), Bun runtime, Channel events (ticket/answer/prd_validated/nudge/user_comment), @anthropic-ai/claude-agent-sdk, Column vs Stage axes, Commands (+19 more)

### Community 24 - "TypeScript Config"
Cohesion: 0.18
Nodes (8): ABSOLUTE_UPLOAD_PATH, ImageLightboxProps, LightboxImage, Markdown(), MarkdownProps, OPEN_KEYS, purifier, renderMarkdownToSafeHtml()

### Community 25 - "Client Hub & Watchdog"
Cohesion: 0.07
Nodes (35): useStats(), UseStatsResult, StatRecord, StatCard(), StatCardProps, StatEmpty(), ACTIVE_BAR, AREA_CURSOR (+27 more)

### Community 26 - "Cost & Pricing"
Cohesion: 0.14
Nodes (17): PrdReviewDialog(), resolveProjectColor(), resolveProjectLabel(), AUTHOR_BADGES, CommentRow(), CommentRowProps, isLocked(), TicketDetail() (+9 more)

### Community 27 - "Workflow View & Lifecycle"
Cohesion: 0.09
Nodes (20): Agent runtime (Agent SDK), Architecture, Codex provider, Overview, Ticket flow, Claude Code skills (real mode), Codex agents (optional), Desktop app (macOS, optional) (+12 more)

### Community 28 - "Stats Charts"
Cohesion: 0.10
Nodes (13): active, ensureNotificationPermission(), getAudioContext(), isSupported(), playNotificationSound(), showDesktopNotification(), Window, BoardStore (+5 more)

### Community 29 - "Session Hub & Agent Session"
Cohesion: 0.21
Nodes (4): TicketBadgesProps, TicketCardProps, TicketLifecycle, Ticket

### Community 30 - "Agents View & Ticket Cards"
Cohesion: 0.12
Nodes (18): mapCommentRow(), NewClean, NewProject, ProjectInUseError, ProjectPatch, SlotStatus, SqlBindValue, TicketPatch (+10 more)

### Community 31 - "PRD Review & Markdown"
Cohesion: 0.23
Nodes (5): Logger, paint(), ScopedLogger, serializeFields(), timestamp()

### Community 32 - "User Terminal & Fake IO"
Cohesion: 0.10
Nodes (25): BASH_ALLOWLIST, buildFeasibilitySessionConfig(), buildImplementSessionConfig(), buildSplitSessionConfig(), buildTriageSessionConfig(), codexKnobs(), CONTRACT_SKILLS, DENIED_BUILTIN_AGENTS (+17 more)

### Community 33 - "Logging"
Cohesion: 0.10
Nodes (20): scripts, build:desktop, build:web, dev, dev:desktop, dev:proxy, dev:server, dev:web (+12 more)

### Community 34 - "Board Columns"
Cohesion: 0.07
Nodes (45): buildSplitChannelPrompt(), buildTicketLines(), isEnglish(), AgentCard(), AgentCardProps, AgentsView(), normalize(), PROGRESS_BAR_COLORS (+37 more)

### Community 35 - "NPM Scripts"
Cohesion: 0.15
Nodes (15): applyDesktopEnv(), DesktopRoots, ensureConfig(), boot(), installApplicationMenu(), installMenuShortcutBridge(), menuShortcutActionSchema, newWindowEventSchema (+7 more)

### Community 36 - "Runtime Dependencies"
Cohesion: 0.07
Nodes (37): AgentProfileConfig(), AskPanel(), AskPanelProps, ImplementationAgentFields(), ProjectsSettings(), DragHandleAttributes, DragHandleListeners, GeneralSettings() (+29 more)

### Community 37 - "Claude SDK Provider"
Cohesion: 0.11
Nodes (18): dependencies, @anthropic-ai/claude-agent-sdk, dompurify, elysia, marked, @modelcontextprotocol/sdk, nanoid, papaparse (+10 more)

### Community 38 - "Agent Profile Config"
Cohesion: 0.16
Nodes (14): LiveSession, log, previewToolInput(), renderChannelEvent(), renderSessionEvent(), SessionHubHandlers, SessionStartConfig, ChannelEvent (+6 more)

### Community 39 - "Agent Coordinator Handlers"
Cohesion: 0.24
Nodes (8): artifactPath, assertClaudeSdkVersionInSync(), BUILT_DMG, ELECTROBUN_BIN, fail(), RELEASE_FOLDER, REPO_ROOT, run()

### Community 40 - "API Client Inputs"
Cohesion: 0.20
Nodes (3): AgentCoordinator, SessionToolCall, WorkerToolName

### Community 41 - "Ticket Config & Constants"
Cohesion: 0.26
Nodes (18): AgentProfileConfigProps, FormState, ImplementationAgentFieldsProps, AutomationPatch, NewAsk, NewAutomation, NewProfile, NewReview (+10 more)

### Community 42 - "Ticket Detail & Triage UI"
Cohesion: 0.24
Nodes (10): Channel (agent<->backend link), Contract (pipeline instructions), Coordinator, Done Gate, Protocol (wire format source of truth), SessionHub, Slot (git-worktree execution unit), SlotManager (+2 more)

### Community 43 - "Demo Pipeline Concepts"
Cohesion: 0.16
Nodes (7): log, TerminalSocket, TerminalSocketData, log, UserTerminalManager, TerminalDescriptor, SystemAdapter

### Community 44 - "Chart Primitives"
Cohesion: 0.13
Nodes (15): AddProjectForm(), AddProjectFormProps, isPositiveIntegerString(), isValidDraft(), ProjectFieldsProps, ProjectRow(), ProjectRowProps, emit() (+7 more)

### Community 46 - "Community 46"
Cohesion: 0.27
Nodes (15): Agent Implementation Config, Argus Code Review, Automated Tests (typecheck/lint/test), Claude Code Autonomous Agent, Ticket Contract Injection, Feasibility Analysis, Kanban Board (Atelier), Kanban Agents Demo (demo.gif) (+7 more)

### Community 47 - "Modal Dialogs"
Cohesion: 0.11
Nodes (11): AutomationCardProps, AutomationFormProps, AutomationView(), EMPTY_FORM, RUN_STATUS_LABEL, RUN_STATUS_VARIANT, AGENT_MODELS, AUTOMATION_TRIGGER_LABELS (+3 more)

### Community 48 - "Community 48"
Cohesion: 0.13
Nodes (12): AgentSessionHandle, AgentSessionOptions, dryRunLog, FAKE_OPEN_PRS, fakeEncoder, hexToBytes(), GitWorktreeAddOptions, ImportNotionOptions (+4 more)

### Community 49 - "Slot State"
Cohesion: 0.10
Nodes (20): labelWithDefault(), TicketConfigSummary(), resolveEffort(), resolveModel(), AGENT_EFFORT_LABELS, AGENT_MODEL_LABELS, AUTOMATION_RUN_STATUSES, COMMENT_AUTHORS (+12 more)

### Community 50 - "Stats Hooks & Cards"
Cohesion: 0.19
Nodes (7): SlotsBar(), SlotsBarProps, Stat(), StatProps, STATUS_LABELS, mapSlotRow(), Slot

### Community 51 - "Community 51"
Cohesion: 0.10
Nodes (19): CLAUDE_JSON_PATH, COMPOSER_BINARIES, detectInstallCommand(), ghPrSchema, ghPrStateSchema, ghReviewSchema, ghReviewsSchema, INSTALL_COMMANDS (+11 more)

### Community 52 - "csv.ts"
Cohesion: 0.22
Nodes (19): buildAskContract(), buildCleanContract(), buildConflictResolutionContract(), buildFeasibilityBatchContract(), buildFeasibilityContextSection(), buildImplementingSteps(), buildMockupReviewStep(), buildPlanningStep() (+11 more)

### Community 53 - "User Terminal Manager"
Cohesion: 0.33
Nodes (5): CONTEXT — domain glossary, Execution, Proposed (not yet built), Seams, Work items

### Community 55 - "Community 55"
Cohesion: 0.21
Nodes (9): ImportTicketsPanel(), ImportTicketsPanelProps, useAgentKnobs(), CsvParseError, ParsedTicketRow, ParsedTicketsCsv, parseTicketsCsv(), Switch (+1 more)

### Community 56 - "CSV Parsing"
Cohesion: 0.14
Nodes (18): Board(), BoardProps, normalize(), NewTicketDialog(), Toaster(), WorkflowView(), WorktreeSessionsView(), useBoard() (+10 more)

### Community 57 - "Community 57"
Cohesion: 0.31
Nodes (8): UseThemeResult, applyTheme(), getStoredTheme(), isTheme(), Theme, ThemeOption, THEMES, root

### Community 58 - "File Uploads"
Cohesion: 0.67
Nodes (4): Column (board lane), Kind (ticket pipeline type), Stage (pipeline state), Ticket

### Community 60 - "Package Manifest"
Cohesion: 0.31
Nodes (8): createDatabase(), migrate(), PROFILE_MIGRATIONS, seedProfiles(), seedSlots(), TICKET_MIGRATIONS, DEFAULT_PROFILES, SLOT_COUNT

### Community 61 - "Community 61"
Cohesion: 0.24
Nodes (4): mapAutomationRow(), mapAutomationRunRow(), Automation, AutomationRun

### Community 62 - "TicketCard.tsx"
Cohesion: 0.22
Nodes (7): TERMINAL_THEME, terminalWsUrl(), textEncoder, useXtermSocket, UseXtermSocketOptions, terminalServerMessageSchema, TerminalCellProps

### Community 64 - "Composer Run Script"
Cohesion: 0.48
Nodes (4): PrSelectRow(), PrSelectRowProps, isPrNeedsAttention(), OpenPr

### Community 65 - "migration.ts"
Cohesion: 0.23
Nodes (11): projectConfigSchema, buildAppSettingsPatch(), LegacyConfig, legacyConfigSchema, LegacyModels, log, migrateConfigJsonIfPresent(), parseLegacyConfig() (+3 more)

### Community 66 - "useTickTimer.ts"
Cohesion: 0.31
Nodes (8): PrdAnnotatorProps, AnnotatedHtml, compileFeedback(), injectAnnotations(), isInsideAnnotation(), PrdAnnotation, SelectionState, wrapFirstOccurrence()

### Community 67 - "ProjectConfig"
Cohesion: 0.28
Nodes (3): FeasibilitySession, SqlUpdateBuilder, ProjectConfig

### Community 68 - "CLAUDE.md Doc"
Cohesion: 0.40
Nodes (5): MIME_EXTENSIONS, resolveExtension(), SavedUpload, saveUpload(), serveUpload()

### Community 69 - "Electrobun Deps Types"
Cohesion: 0.33
Nodes (3): listeners, mcp, ReplyArgsSchema

### Community 70 - "logger.ts"
Cohesion: 0.25
Nodes (8): ANSI, COLOR_ENABLED, isLevel(), Level, LEVEL_ORDER, LEVEL_TAG, resolveThreshold(), THRESHOLD

### Community 71 - "PostCSS Config"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 72 - "Community 72"
Cohesion: 0.56
Nodes (8): buildContractConstraintsLines(), buildResponseFormatLines(), buildStrictRulesLines(), buildTicketLines(), buildTriageChannelPrompt(), buildTriagePlusChannelPrompt(), isEnglish(), readOnlyFramingLines()

### Community 73 - "React Root Mount"
Cohesion: 0.50
Nodes (4): Claude binary resolution (KANBAN_CLAUDE_BINARY), Config split (config.json vs env), Databases (kanban.db / kanban-real.db), Electrobun desktop app

### Community 74 - "Theme Flash Guard"
Cohesion: 0.50
Nodes (4): ClientHub (broadcasts board snapshots), No type casting convention, rows.ts (zod row validation), store.ts single DB mutation point

### Community 75 - "Community 75"
Cohesion: 1.00
Nodes (4): Dry-run safety model, FakeSystemAdapter, RealSystemAdapter, SystemAdapter (side-effect boundary)

### Community 76 - "usePrdSearch.ts"
Cohesion: 0.25
Nodes (4): ShortcutDetail, usePrdSearch(), UsePrdSearchOptions, UsePrdSearchResult

### Community 78 - "useTerminalShortcuts.ts"
Cohesion: 0.32
Nodes (6): useTerminals, ShortcutDetail, UseTerminalShortcutsOptions, SplitTreeProps, SplitOrientation, TreeNode

### Community 79 - "WorktreeSession"
Cohesion: 0.29
Nodes (4): mapWorktreeSessionRow(), enrichWorktreeSession(), BoardState, WorktreeSession

### Community 81 - "SplitTree.tsx"
Cohesion: 0.48
Nodes (6): groupOrientation(), layoutToSizes(), panelId(), panelPercent(), SplitTree(), TerminalCell()

## Knowledge Gaps
- **437 isolated node(s):** `IMPLEMENTER_SAFE_TOOLS`, `CONTRACT_SKILLS`, `NO_SKILLS`, `FIGMA_READONLY_TOOLS`, `READONLY_TOOLS` (+432 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Store` connect `Shared Zod Schemas` to `Contract Building & Slots`, `Terminals UI & Notifications`, `Fake System Adapter`, `Settings & Profiles UI`, `PR Selection & Slots Bar`, `Slot Config & Worktree Watch`, `Board & Sidebar Layout`, `Session Hub & Agent Session`, `Agents View & Ticket Cards`, `Demo Pipeline Concepts`, `Session Hub Transcript`, `Stats Hooks & Cards`, `Community 54`, `Webhook MCP`, `Community 61`, `Community 63`, `migration.ts`, `ProjectConfig`, `WorktreeSession`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._
- **Why does `Ticket` connect `Session Hub & Agent Session` to `Contract Building & Slots`, `Desktop Bootstrap & Menus`, `Fake System Adapter`, `Shared Zod Schemas`, `PR Selection & Slots Bar`, `Slot Config & Worktree Watch`, `Database Store Operations`, `Live Terminal Views`, `Store Types & Agent Knobs`, `DB Row Schemas & Mappers`, `Cost & Pricing`, `Stats Charts`, `Agents View & Ticket Cards`, `Board Columns`, `Slot State`, `Community 54`, `CSV Parsing`, `WorktreeSession`, `reformulate.ts`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Why does `boot()` connect `NPM Scripts` to `PR Selection & Slots Bar`, `Ticket Action Panels`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **What connects `IMPLEMENTER_SAFE_TOOLS`, `CONTRACT_SKILLS`, `NO_SKILLS` to the rest of the system?**
  _440 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Contract Building & Slots` be split into smaller, more focused modules?**
  _Cohesion score 0.09803921568627451 - nodes in this community are weakly interconnected._
- **Should `Desktop Bootstrap & Menus` be split into smaller, more focused modules?**
  _Cohesion score 0.04019037546271814 - nodes in this community are weakly interconnected._
- **Should `Feasibility Batch Management` be split into smaller, more focused modules?**
  _Cohesion score 0.09191583610188261 - nodes in this community are weakly interconnected._