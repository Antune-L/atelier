# Graph Report - kanban-agents  (2026-07-27)

## Corpus Check
- 175 files · ~662,790 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1694 nodes · 3951 edges · 91 communities (76 shown, 15 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 25 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `91331a28`
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
- Community 82
- FakePaneStream
- prd.ts
- Community 89
- Community 90
- reformulate.ts

## God Nodes (most connected - your core abstractions)
1. `Store` - 84 edges
2. `Ticket` - 66 edges
3. `cn()` - 61 edges
4. `RealSystemAdapter` - 51 edges
5. `FakeSystemAdapter` - 44 edges
6. `SlotManager` - 43 edges
7. `ProjectInfo` - 39 edges
8. `ClientHub` - 32 edges
9. `AgentModel` - 30 edges
10. `AgentEffort` - 29 edges

## Surprising Connections (you probably didn't know these)
- `boot()` --calls--> `startServer()`  [INFERRED]
  desktop/index.ts → src/server/index.ts
- `StageProgressBarProps` --references--> `Ticket`  [EXTRACTED]
  src/web/src/components/StageProgressBar.tsx → src/shared/schemas.ts
- `TicketCostProps` --references--> `Ticket`  [EXTRACTED]
  src/web/src/components/TicketCost.tsx → src/shared/schemas.ts
- `StatsViewProps` --references--> `ProjectInfo`  [EXTRACTED]
  src/web/src/components/StatsView.tsx → src/shared/schemas.ts
- `TerminalsViewProps` --references--> `ProjectInfo`  [EXTRACTED]
  src/web/src/components/TerminalsView.tsx → src/shared/schemas.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Side-effect boundary implementations** — agents_system_adapter, agents_fake_system_adapter, agents_real_system_adapter [EXTRACTED 1.00]
- **In-process SDK agent protocol** — agents_claude_agent_sdk, agents_query_streaming_input, agents_in_process_mcp_server, agents_worker_tools, agents_channel_events [INFERRED 0.85]

## Communities (91 total, 15 thin omitted)

### Community 0 - "Contract Building & Slots"
Cohesion: 0.07
Nodes (42): DRY_RUN_VERDICT, FeasibilitySession, log, log, log, ReclaimOutcome, SETUP_PHASES, SlotManagerConfig (+34 more)

### Community 1 - "Terminals UI & Notifications"
Cohesion: 0.19
Nodes (3): FeasibilityBatchManager, toTriageResult(), FeasibilityResult

### Community 2 - "Desktop Bootstrap & Menus"
Cohesion: 0.04
Nodes (47): appSettingsSchema, automationRunSchema, automationSchema, baseBranchSchema, capabilitiesSchema, commentAuthorSchema, commentSchema, CreateTerminalBody (+39 more)

### Community 3 - "Feasibility Batch Management"
Cohesion: 0.09
Nodes (3): delay(), fakeShellPrompt(), FakeSystemAdapter

### Community 4 - "Ticket Action Panels"
Cohesion: 0.08
Nodes (23): applyDesktopEnv(), DesktopRoots, ensureConfig(), boot(), installApplicationMenu(), installMenuShortcutBridge(), menuShortcutActionSchema, newWindowEventSchema (+15 more)

### Community 5 - "Fake System Adapter"
Cohesion: 0.06
Nodes (33): buildNotionImportPrompt(), createSplitChildren(), failSplitMother(), isBlocked(), isSplitMother(), log, PaneReader, performSplit() (+25 more)

### Community 7 - "Settings & Profiles UI"
Cohesion: 0.09
Nodes (21): TRIAGE_VERDICTS, AgentSettableStage, agentSettableStageSchema, askUserArgsSchema, AssertNamesCovered, ChannelEvent, channelEventSchema, doneArgsSchema (+13 more)

### Community 8 - "PR Selection & Slots Bar"
Cohesion: 0.10
Nodes (9): log, log, Watchdog, ClientHub, ClientSocket, ClientSocketData, NativeNotify, Notifier (+1 more)

### Community 9 - "Real System Adapter"
Cohesion: 0.08
Nodes (5): extractPrUrl(), RealSystemAdapter, safeJsonParse(), DoneGateResult, ReviewDoneOptions

### Community 10 - "Slot Config & Worktree Watch"
Cohesion: 0.06
Nodes (36): AutomationRow, automationRowSchema, AutomationRunRow, automationRunRowSchema, buildScripts(), CommentRow, commentRowSchema, mapProjectRow() (+28 more)

### Community 11 - "Core Domain Concepts"
Cohesion: 0.09
Nodes (23): TabButton(), PrdView(), NAV_ENTRIES, NavEntry, Sidebar(), SidebarProps, SidebarView, SlotsBar() (+15 more)

### Community 12 - "Board & Sidebar Layout"
Cohesion: 0.21
Nodes (5): ReformulateManager, PendingSplit, SplitManager, RouteDeps, SplitResult

### Community 13 - "Database Store Operations"
Cohesion: 0.12
Nodes (32): AgentsViewProps, AskPanelProps, CleanPrPanel(), CleanPrPanelProps, ImportTicketsPanel(), ImportTicketsPanelProps, NewTicketDialogProps, Tab (+24 more)

### Community 14 - "Coordinator & Protocol"
Cohesion: 0.10
Nodes (27): effectiveWorkDurationMs(), costByModel(), costByProject(), CostGroup, DurationGroup, KIND_LABELS, KindCount, kindCounts() (+19 more)

### Community 15 - "API Routes & Reformulate"
Cohesion: 0.12
Nodes (22): WORKER_TOOLS, WorkerToolName, AgentPermissionMode, AgentProvider, AgentSessionEvent, AgentSessionToolResult, AgentSubagentDefinition, AgentTurnUsage (+14 more)

### Community 16 - "Stats Aggregation"
Cohesion: 0.06
Nodes (39): ShortcutDetail, UsePrdSearchOptions, UsePrdSearchResult, loadTree(), saveTree(), storageKey(), useTerminals, ShortcutDetail (+31 more)

### Community 17 - "Triage & Server Hub"
Cohesion: 0.08
Nodes (25): devDependencies, autoprefixer, class-variance-authority, clsx, concurrently, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities (+17 more)

### Community 18 - "Live Terminal Views"
Cohesion: 0.14
Nodes (8): resolveBaseBranch(), SlotManager, slotPath(), slugify(), computeWorktreeAddresses(), getProject(), isProjectKey(), requireStore()

### Community 19 - "Stage Progress & Display"
Cohesion: 0.08
Nodes (24): compilerOptions, allowImportingTsExtensions, baseUrl, esModuleInterop, isolatedModules, jsx, lib, module (+16 more)

### Community 20 - "Real Adapter GH/Composer"
Cohesion: 0.10
Nodes (27): PrdReviewDialogProps, QuitConfirmModalProps, DragHandleAttributes, DragHandleListeners, GeneralSettings(), IMPLEMENTER_OPTIONS, LANGUAGE_OPTIONS, ProfileRowProps (+19 more)

### Community 21 - "Store Types & Agent Knobs"
Cohesion: 0.10
Nodes (18): BoardColumn(), BoardColumnProps, DEFAULT_COLLAPSED, familyKeyOf(), groupTicketsByFamily(), isSplitMother(), RenderGroup, resolveAnalyzeAllTitle() (+10 more)

### Community 22 - "DB Row Schemas & Mappers"
Cohesion: 0.15
Nodes (21): formatTokens(), TicketCost(), TicketCostProps, TOKEN_FORMATTER, USD_FORMATTER, AGENT_MODEL_LABELS, costByFamily(), costOf() (+13 more)

### Community 23 - "Dev Dependencies"
Cohesion: 0.07
Nodes (27): Architecture, argus review (native subagent), Backend (routes tool calls, verifies gates), Bun runtime, Channel events (ticket/answer/prd_validated/nudge/user_comment), @anthropic-ai/claude-agent-sdk, Column vs Stage axes, Commands (+19 more)

### Community 24 - "TypeScript Config"
Cohesion: 0.11
Nodes (18): PrdAnnotator(), PrdAnnotatorProps, usePrdSearch(), AnnotatedHtml, compileFeedback(), injectAnnotations(), isInsideAnnotation(), PrdAnnotation (+10 more)

### Community 25 - "Client Hub & Watchdog"
Cohesion: 0.13
Nodes (18): StatsViewProps, ACTIVE_BAR, AREA_CURSOR, AXIS_PROPS, BAR_CURSOR, CHART_PALETTE, CostChart(), DurationChart() (+10 more)

### Community 26 - "Cost & Pricing"
Cohesion: 0.16
Nodes (15): PrdReviewDialog(), AUTHOR_BADGES, CommentRow(), CommentRowProps, isLocked(), TicketDetail(), TriageSection(), TriageSectionProps (+7 more)

### Community 27 - "Workflow View & Lifecycle"
Cohesion: 0.09
Nodes (20): Agent runtime (Agent SDK), Architecture, Codex provider, Overview, Ticket flow, Claude Code skills (real mode), Codex agents (optional), Desktop app (macOS, optional) (+12 more)

### Community 28 - "Stats Charts"
Cohesion: 0.10
Nodes (13): active, ensureNotificationPermission(), getAudioContext(), isSupported(), playNotificationSound(), showDesktopNotification(), Window, BoardStore (+5 more)

### Community 29 - "Session Hub & Agent Session"
Cohesion: 0.16
Nodes (6): TicketBadgesProps, TicketCardProps, COLUMN_NODE_COLOR, WorkflowViewProps, TicketLifecycle, Ticket

### Community 30 - "Agents View & Ticket Cards"
Cohesion: 0.11
Nodes (21): mapCommentRow(), mapWorktreeSessionRow(), enrichWorktreeSession(), NewClean, NewProject, NewReview, ProjectInUseError, ProjectPatch (+13 more)

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
Nodes (47): buildSplitChannelPrompt(), buildTicketLines(), isEnglish(), AgentCard(), AgentCardProps, AgentsView(), normalize(), PROGRESS_BAR_COLORS (+39 more)

### Community 35 - "NPM Scripts"
Cohesion: 0.07
Nodes (13): AgentCoordinator, log, ToolHandler, ToolResult, LiveSession, log, previewToolInput(), renderChannelEvent() (+5 more)

### Community 36 - "Runtime Dependencies"
Cohesion: 0.13
Nodes (20): AskPanel(), ImplementationAgentFields(), ProjectsSettings(), QuitConfirmModal(), TerminalsView(), TerminalsViewProps, loadOnce(), subscribers (+12 more)

### Community 37 - "Claude SDK Provider"
Cohesion: 0.11
Nodes (18): dependencies, @anthropic-ai/claude-agent-sdk, dompurify, elysia, marked, @modelcontextprotocol/sdk, nanoid, papaparse (+10 more)

### Community 38 - "Agent Profile Config"
Cohesion: 0.14
Nodes (16): log, runFirstBootSetup(), applyAppSettingsToModels(), initProjectRegistry(), listProjectKeys(), PROJECT_ROOT, RunningServer, serveStaticAsset() (+8 more)

### Community 39 - "Agent Coordinator Handlers"
Cohesion: 0.24
Nodes (8): artifactPath, assertClaudeSdkVersionInSync(), BUILT_DMG, ELECTROBUN_BIN, fail(), RELEASE_FOLDER, REPO_ROOT, run()

### Community 40 - "API Client Inputs"
Cohesion: 0.23
Nodes (10): FullscreenToggle(), FullscreenToggleProps, badgeLabelFor(), LiveTerminal(), LiveTerminalOptions, LiveTerminalProps, TerminalData, TerminalView() (+2 more)

### Community 41 - "Ticket Config & Constants"
Cohesion: 0.32
Nodes (14): AgentProfileConfigProps, ImplementationAgentFieldsProps, AutomationPatch, NewAsk, NewAutomation, NewProfile, NewTicket, ProfilePatch (+6 more)

### Community 42 - "Ticket Detail & Triage UI"
Cohesion: 0.24
Nodes (10): Channel (agent<->backend link), Contract (pipeline instructions), Coordinator, Done Gate, Protocol (wire format source of truth), SessionHub, Slot (git-worktree execution unit), SlotManager (+2 more)

### Community 43 - "Demo Pipeline Concepts"
Cohesion: 0.12
Nodes (9): TriageManager, log, TerminalSocket, TerminalSocketData, log, UserTerminalManager, TerminalDescriptor, TriageResult (+1 more)

### Community 44 - "Chart Primitives"
Cohesion: 0.13
Nodes (14): AddProjectForm(), AddProjectFormProps, isPositiveIntegerString(), isValidDraft(), ProjectFieldsProps, ProjectRow(), ProjectRowProps, emit() (+6 more)

### Community 46 - "Community 46"
Cohesion: 0.27
Nodes (15): Agent Implementation Config, Argus Code Review, Automated Tests (typecheck/lint/test), Claude Code Autonomous Agent, Ticket Contract Injection, Feasibility Analysis, Kanban Board (Atelier), Kanban Agents Demo (demo.gif) (+7 more)

### Community 47 - "Modal Dialogs"
Cohesion: 0.12
Nodes (10): AutomationCardProps, AutomationFormProps, AutomationView(), EMPTY_FORM, FormState, RUN_STATUS_LABEL, RUN_STATUS_VARIANT, AutomationTrigger (+2 more)

### Community 48 - "Community 48"
Cohesion: 0.13
Nodes (12): AgentSessionHandle, AgentSessionOptions, dryRunLog, FAKE_OPEN_PRS, fakeEncoder, hexToBytes(), GitWorktreeAddOptions, ImportNotionOptions (+4 more)

### Community 49 - "Slot State"
Cohesion: 0.14
Nodes (14): labelWithDefault(), TicketConfigSummary(), AGENT_EFFORT_LABELS, AUTOMATION_RUN_STATUSES, AUTOMATION_TRIGGER_LABELS, AUTOMATION_TRIGGERS, AutomationRunStatus, COMMENT_AUTHORS (+6 more)

### Community 50 - "Stats Hooks & Cards"
Cohesion: 0.22
Nodes (5): SlotsBarProps, mapSlotRow(), BoardState, Slot, WorktreeSession

### Community 51 - "Community 51"
Cohesion: 0.10
Nodes (19): CLAUDE_JSON_PATH, COMPOSER_BINARIES, detectInstallCommand(), ghPrSchema, ghPrStateSchema, ghReviewSchema, ghReviewsSchema, INSTALL_COMMANDS (+11 more)

### Community 52 - "csv.ts"
Cohesion: 0.22
Nodes (19): buildAskContract(), buildCleanContract(), buildConflictResolutionContract(), buildFeasibilityBatchContract(), buildFeasibilityContextSection(), buildImplementingSteps(), buildMockupReviewStep(), buildPlanningStep() (+11 more)

### Community 53 - "User Terminal Manager"
Cohesion: 0.33
Nodes (5): CONTEXT — domain glossary, Execution, Proposed (not yet built), Seams, Work items

### Community 54 - "Community 54"
Cohesion: 0.16
Nodes (12): ChartConfig, ChartContainer, ChartContainerProps, ChartContext, ChartContextValue, ChartLegendContent(), ChartLegendContentProps, ChartTooltipContent() (+4 more)

### Community 55 - "Community 55"
Cohesion: 0.33
Nodes (4): CsvParseError, ParsedTicketRow, ParsedTicketsCsv, parseTicketsCsv()

### Community 56 - "CSV Parsing"
Cohesion: 0.15
Nodes (17): Board(), BoardProps, normalize(), NewTicketDialog(), Toaster(), WorkflowView(), WorktreeSessionsView(), useBoard() (+9 more)

### Community 57 - "Community 57"
Cohesion: 0.31
Nodes (8): UseThemeResult, applyTheme(), getStoredTheme(), isTheme(), Theme, ThemeOption, THEMES, root

### Community 58 - "File Uploads"
Cohesion: 0.67
Nodes (4): Column (board lane), Kind (ticket pipeline type), Stage (pipeline state), Ticket

### Community 59 - "Webhook MCP"
Cohesion: 0.29
Nodes (6): AgentProfileConfig(), ProfilesSettings(), emit(), refreshProfiles(), subscribers, useProfiles()

### Community 60 - "Package Manifest"
Cohesion: 0.31
Nodes (8): createDatabase(), migrate(), PROFILE_MIGRATIONS, seedProfiles(), seedSlots(), TICKET_MIGRATIONS, DEFAULT_PROFILES, SLOT_COUNT

### Community 62 - "TicketCard.tsx"
Cohesion: 0.32
Nodes (6): useStats(), UseStatsResult, StatRecord, StatCard(), StatCardProps, StatEmpty()

### Community 64 - "Composer Run Script"
Cohesion: 0.48
Nodes (4): PrSelectRow(), PrSelectRowProps, isPrNeedsAttention(), OpenPr

### Community 68 - "CLAUDE.md Doc"
Cohesion: 0.40
Nodes (5): MIME_EXTENSIONS, resolveExtension(), SavedUpload, saveUpload(), serveUpload()

### Community 69 - "Electrobun Deps Types"
Cohesion: 0.33
Nodes (3): listeners, mcp, ReplyArgsSchema

### Community 70 - "logger.ts"
Cohesion: 0.33
Nodes (5): resolveEffort(), resolveModel(), agentEffortSchema, agentModelSchema, Capabilities

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
Cohesion: 0.40
Nodes (6): nextWeek(), outcomeCounts(), projectCounts(), recordOutcome(), startOfWeek(), weeklyThroughput

### Community 86 - "FakePaneStream"
Cohesion: 0.17
Nodes (3): FakePaneStream, RealPaneStream, PaneStream

### Community 87 - "prd.ts"
Cohesion: 0.09
Nodes (18): buildPrdPrompt(), AnalyzeTicketsInput, Comment, CreateAskInput, CreateCleanInput, CreateCommentInput, CreateProfileInput, CreateReviewInput (+10 more)

## Knowledge Gaps
- **442 isolated node(s):** `log`, `ToolResult`, `ToolHandler`, `log`, `SessionStartConfig` (+437 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **15 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Ticket` connect `Session Hub & Agent Session` to `Contract Building & Slots`, `Desktop Bootstrap & Menus`, `Fake System Adapter`, `Shared Zod Schemas`, `PR Selection & Slots Bar`, `Slot Config & Worktree Watch`, `Board & Sidebar Layout`, `Database Store Operations`, `Live Terminal Views`, `Store Types & Agent Knobs`, `DB Row Schemas & Mappers`, `Cost & Pricing`, `Stats Charts`, `Agents View & Ticket Cards`, `Board Columns`, `Slot State`, `Stats Hooks & Cards`, `CSV Parsing`, `ProjectConfig`, `prd.ts`, `reformulate.ts`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **Why does `RealSystemAdapter` connect `Real System Adapter` to `Contract Building & Slots`, `Composer Run Script`, `Demo Pipeline Concepts`, `API Routes & Reformulate`, `Community 48`, `Community 51`, `FakePaneStream`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Why does `boot()` connect `Ticket Action Panels` to `Agent Profile Config`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **What connects `log`, `ToolResult`, `ToolHandler` to the rest of the system?**
  _445 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Contract Building & Slots` be split into smaller, more focused modules?**
  _Cohesion score 0.06766917293233082 - nodes in this community are weakly interconnected._
- **Should `Desktop Bootstrap & Menus` be split into smaller, more focused modules?**
  _Cohesion score 0.04081632653061224 - nodes in this community are weakly interconnected._
- **Should `Feasibility Batch Management` be split into smaller, more focused modules?**
  _Cohesion score 0.09407665505226481 - nodes in this community are weakly interconnected._