# Graph Report - kanban-agents  (2026-07-11)

## Corpus Check
- 175 files · ~662,240 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1678 nodes · 4073 edges · 83 communities (73 shown, 10 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 25 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `aac2cc35`
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
- CLAUDE.md Doc
- Electrobun Deps Types
- PostCSS Config
- Community 72
- React Root Mount
- Theme Flash Guard
- Community 75
- Community 77
- Community 80
- Community 82
- Community 89
- Community 90

## God Nodes (most connected - your core abstractions)
1. `Store` - 87 edges
2. `Ticket` - 70 edges
3. `cn()` - 61 edges
4. `RealSystemAdapter` - 51 edges
5. `SlotManager` - 45 edges
6. `FakeSystemAdapter` - 44 edges
7. `ProjectInfo` - 39 edges
8. `ClientHub` - 34 edges
9. `getProject()` - 33 edges
10. `isProjectKey()` - 31 edges

## Surprising Connections (you probably didn't know these)
- `boot()` --calls--> `startServer()`  [INFERRED]
  desktop/index.ts → src/server/index.ts
- `NewClean` --references--> `ProjectKey`  [EXTRACTED]
  src/server/db/store.ts → src/server/config.ts
- `ImplementSessionInput` --references--> `Ticket`  [EXTRACTED]
  src/server/agents/sessionConfig.ts → src/shared/schemas.ts
- `StageProgressBarProps` --references--> `Ticket`  [EXTRACTED]
  src/web/src/components/StageProgressBar.tsx → src/shared/schemas.ts
- `TicketBadgesProps` --references--> `Ticket`  [EXTRACTED]
  src/web/src/components/TicketBadges.tsx → src/shared/schemas.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Agent session lifecycle (per ticket)** — agents_session_hub, agents_slot_manager, agents_coordinator, agents_pipeline_contract, agents_slots, agents_done_gate [INFERRED 0.85]
- **Side-effect boundary implementations** — agents_system_adapter, agents_fake_system_adapter, agents_real_system_adapter [EXTRACTED 1.00]
- **In-process SDK agent protocol** — agents_claude_agent_sdk, agents_query_streaming_input, agents_in_process_mcp_server, agents_worker_tools, agents_channel_events [INFERRED 0.85]

## Communities (83 total, 10 thin omitted)

### Community 0 - "Contract Building & Slots"
Cohesion: 0.13
Nodes (17): log, log, runFirstBootSetup(), initProjectRegistry(), PROJECT_ROOT, RunningServer, serveStaticAsset(), SocketData (+9 more)

### Community 1 - "Terminals UI & Notifications"
Cohesion: 0.17
Nodes (5): DRY_RUN_VERDICT, FeasibilityBatchManager, log, toTriageResult(), FeasibilityResult

### Community 2 - "Desktop Bootstrap & Menus"
Cohesion: 0.04
Nodes (62): AnalyzeTicketsInput, appSettingsSchema, automationRunSchema, automationSchema, baseBranchSchema, capabilitiesSchema, commentAuthorSchema, commentSchema (+54 more)

### Community 3 - "Feasibility Batch Management"
Cohesion: 0.09
Nodes (4): delay(), fakeShellPrompt(), FakeSystemAdapter, hexToBytes()

### Community 4 - "Ticket Action Panels"
Cohesion: 0.10
Nodes (14): dataMessage(), log, normalizeSeed(), safeParse(), send(), TerminalSession, TerminalSessionManager, TerminalSocket (+6 more)

### Community 5 - "Fake System Adapter"
Cohesion: 0.05
Nodes (34): buildNotionImportPrompt(), buildPrdPrompt(), createSplitChildren(), failSplitMother(), isBlocked(), isSplitMother(), log, PaneReader (+26 more)

### Community 7 - "Settings & Profiles UI"
Cohesion: 0.09
Nodes (20): TRIAGE_VERDICTS, AgentSettableStage, agentSettableStageSchema, askUserArgsSchema, AssertNamesCovered, channelEventSchema, doneArgsSchema, failArgsSchema (+12 more)

### Community 8 - "PR Selection & Slots Bar"
Cohesion: 0.10
Nodes (10): DRY_RUN_VERDICT, log, TriageSession, log, Watchdog, ClientHub, ClientSocket, ClientSocketData (+2 more)

### Community 9 - "Real System Adapter"
Cohesion: 0.06
Nodes (10): detectInstallCommand(), extractPrUrl(), realpathSafe(), RealSystemAdapter, resolveWorktreeScriptCommand(), safeJsonParse(), shQuote(), DoneGateResult (+2 more)

### Community 10 - "Slot Config & Worktree Watch"
Cohesion: 0.06
Nodes (37): AutomationRow, automationRowSchema, AutomationRunRow, automationRunRowSchema, buildScripts(), CommentRow, commentRowSchema, mapProjectRow() (+29 more)

### Community 11 - "Core Domain Concepts"
Cohesion: 0.11
Nodes (19): TabButton(), SlotsBar(), SlotsBarProps, Stat(), StatProps, STATUS_LABELS, StatsView(), AuthorBadge() (+11 more)

### Community 12 - "Board & Sidebar Layout"
Cohesion: 0.13
Nodes (7): SessionHub, DRY_RUN_RESULT, log, PendingSplit, SplitManager, SplitResult, SystemAdapter

### Community 13 - "Database Store Operations"
Cohesion: 0.10
Nodes (34): CleanPrPanel(), CleanPrPanelProps, ImportTicketsPanel(), ImportTicketsPanelProps, NewTicketDialog(), NewTicketDialogProps, Tab, TAB_TITLES (+26 more)

### Community 14 - "Coordinator & Protocol"
Cohesion: 0.10
Nodes (29): effectiveWorkDurationMs(), costByModel(), costByProject(), CostGroup, DurationGroup, KIND_LABELS, KindCount, kindCounts() (+21 more)

### Community 15 - "API Routes & Reformulate"
Cohesion: 0.07
Nodes (33): WORKER_TOOLS, AgentProvider, resolveClaudeBinary(), bashCommandSchema, buildSettings(), claudeProvider, createSdkAgentSession(), dispatch() (+25 more)

### Community 16 - "Stats Aggregation"
Cohesion: 0.06
Nodes (39): ShortcutDetail, UsePrdSearchOptions, UsePrdSearchResult, loadTree(), saveTree(), storageKey(), useTerminals, ShortcutDetail (+31 more)

### Community 17 - "Triage & Server Hub"
Cohesion: 0.08
Nodes (25): devDependencies, autoprefixer, class-variance-authority, clsx, concurrently, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities (+17 more)

### Community 18 - "Live Terminal Views"
Cohesion: 0.05
Nodes (50): resolveBaseBranch(), buildAskContract(), buildCleanContract(), buildConflictResolutionContract(), buildFeasibilityBatchContract(), buildFeasibilityContextSection(), buildImplementingSteps(), buildPlanningStep() (+42 more)

### Community 19 - "Stage Progress & Display"
Cohesion: 0.08
Nodes (24): compilerOptions, allowImportingTsExtensions, baseUrl, esModuleInterop, isolatedModules, jsx, lib, module (+16 more)

### Community 20 - "Real Adapter GH/Composer"
Cohesion: 0.12
Nodes (25): PrdReviewDialog(), PrdReviewDialogProps, QuitConfirmModal(), QuitConfirmModalProps, TerminalsView(), TerminalsViewProps, AUTHOR_BADGES, CommentRow() (+17 more)

### Community 21 - "Store Types & Agent Knobs"
Cohesion: 0.10
Nodes (18): BoardColumn(), BoardColumnProps, DEFAULT_COLLAPSED, familyKeyOf(), groupTicketsByFamily(), isSplitMother(), RenderGroup, resolveAnalyzeAllTitle() (+10 more)

### Community 22 - "DB Row Schemas & Mappers"
Cohesion: 0.16
Nodes (20): formatTokens(), TicketCost(), TicketCostProps, TOKEN_FORMATTER, USD_FORMATTER, costByFamily(), costOf(), costOfModel() (+12 more)

### Community 23 - "Dev Dependencies"
Cohesion: 0.07
Nodes (27): Architecture, argus review (native subagent), Backend (routes tool calls, verifies gates), Bun runtime, Channel events (ticket/answer/prd_validated/nudge/user_comment), @anthropic-ai/claude-agent-sdk, Column vs Stage axes, Commands (+19 more)

### Community 24 - "TypeScript Config"
Cohesion: 0.10
Nodes (20): PrdAnnotator(), PrdAnnotatorProps, PrdView(), usePrdSearch(), AnnotatedHtml, compileFeedback(), injectAnnotations(), isInsideAnnotation() (+12 more)

### Community 25 - "Client Hub & Watchdog"
Cohesion: 0.10
Nodes (24): StatsViewProps, useStats(), UseStatsResult, StatRecord, StatCard(), StatCardProps, StatEmpty(), ACTIVE_BAR (+16 more)

### Community 26 - "Cost & Pricing"
Cohesion: 0.14
Nodes (16): AgentCardProps, AgentsView(), AgentsViewProps, normalize(), TicketBadges(), TicketBadgesProps, resolveProjectColor(), resolveProjectLabel() (+8 more)

### Community 27 - "Workflow View & Lifecycle"
Cohesion: 0.09
Nodes (20): Agent runtime (Agent SDK), Architecture, Codex provider, Overview, Ticket flow, Claude Code skills (real mode), Codex agents (optional), Desktop app (macOS, optional) (+12 more)

### Community 28 - "Stats Charts"
Cohesion: 0.10
Nodes (13): active, ensureNotificationPermission(), getAudioContext(), isSupported(), playNotificationSound(), showDesktopNotification(), Window, BoardStore (+5 more)

### Community 29 - "Session Hub & Agent Session"
Cohesion: 0.15
Nodes (5): TicketCardProps, COLUMN_NODE_COLOR, WorkflowViewProps, TicketLifecycle, Ticket

### Community 30 - "Agents View & Ticket Cards"
Cohesion: 0.11
Nodes (19): mapCommentRow(), mapWorktreeSessionRow(), enrichWorktreeSession(), NewClean, NewProject, ProjectInUseError, ProjectPatch, SlotStatus (+11 more)

### Community 31 - "PRD Review & Markdown"
Cohesion: 0.14
Nodes (13): ANSI, COLOR_ENABLED, isLevel(), Level, LEVEL_ORDER, LEVEL_TAG, Logger, paint() (+5 more)

### Community 32 - "User Terminal & Fake IO"
Cohesion: 0.11
Nodes (22): BASH_ALLOWLIST, buildFeasibilitySessionConfig(), buildImplementSessionConfig(), buildSplitSessionConfig(), buildTriageSessionConfig(), CONTRACT_SKILLS, DENIED_BUILTIN_AGENTS, feasibilityScoutAgent() (+14 more)

### Community 33 - "Logging"
Cohesion: 0.10
Nodes (20): scripts, build:desktop, build:web, dev, dev:desktop, dev:proxy, dev:server, dev:web (+12 more)

### Community 34 - "Board Columns"
Cohesion: 0.13
Nodes (17): PROGRESS_BAR_COLORS, StageProgressBar(), StageProgressBarProps, ANIMATED_STAGES, BadgeVariant, DATETIME_FORMAT, NON_DEPENDABLE_COLUMNS, prNumberFromUrl() (+9 more)

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
Cohesion: 0.22
Nodes (3): AgentCoordinator, SessionToolCall, WorkerToolName

### Community 41 - "Ticket Config & Constants"
Cohesion: 0.26
Nodes (18): AgentProfileConfigProps, FormState, ImplementationAgentFieldsProps, AutomationPatch, NewAsk, NewAutomation, NewProfile, NewReview (+10 more)

### Community 42 - "Ticket Detail & Triage UI"
Cohesion: 0.24
Nodes (10): Channel (agent<->backend link), Contract (pipeline instructions), Coordinator, Done Gate, Protocol (wire format source of truth), SessionHub, Slot (git-worktree execution unit), SlotManager (+2 more)

### Community 44 - "Chart Primitives"
Cohesion: 0.15
Nodes (12): AddProjectForm(), AddProjectFormProps, isPositiveIntegerString(), isValidDraft(), ProjectFieldsProps, ProjectRow(), ProjectRowProps, emit() (+4 more)

### Community 45 - "Session Hub Transcript"
Cohesion: 0.33
Nodes (3): applyAppSettingsToModels(), AppSettings, UpdateAppSettingsInput

### Community 46 - "Community 46"
Cohesion: 0.27
Nodes (15): Agent Implementation Config, Argus Code Review, Automated Tests (typecheck/lint/test), Claude Code Autonomous Agent, Ticket Contract Injection, Feasibility Analysis, Kanban Board (Atelier), Kanban Agents Demo (demo.gif) (+7 more)

### Community 47 - "Modal Dialogs"
Cohesion: 0.07
Nodes (27): AutomationCardProps, AutomationFormProps, AutomationView(), EMPTY_FORM, RUN_STATUS_LABEL, RUN_STATUS_VARIANT, labelWithDefault(), TicketConfigSummary() (+19 more)

### Community 48 - "Community 48"
Cohesion: 0.12
Nodes (7): dryRunLog, FAKE_OPEN_PRS, fakeEncoder, FakePaneStream, GitWorktreeAddOptions, PaneSize, SpawnShellOptions

### Community 49 - "Slot State"
Cohesion: 0.33
Nodes (5): resolveEffort(), resolveModel(), agentEffortSchema, agentModelSchema, Capabilities

### Community 50 - "Stats Hooks & Cards"
Cohesion: 0.24
Nodes (4): mapSlotRow(), BoardState, Slot, WorktreeSession

### Community 51 - "Community 51"
Cohesion: 0.16
Nodes (12): ChartConfig, ChartContainer, ChartContainerProps, ChartContext, ChartContextValue, ChartLegendContent(), ChartLegendContentProps, ChartTooltipContent() (+4 more)

### Community 52 - "csv.ts"
Cohesion: 0.20
Nodes (10): addUsageByModel(), log, ToolHandler, ToolResult, toUsageByModel(), submitFeasibilityArgsSchema, submitSplitArgsSchema, submitTriageArgsSchema (+2 more)

### Community 53 - "User Terminal Manager"
Cohesion: 0.33
Nodes (5): CONTEXT — domain glossary, Execution, Proposed (not yet built), Seams, Work items

### Community 54 - "Community 54"
Cohesion: 0.23
Nodes (6): buildReformulatePrompt(), log, ReformulateManager, MODELS, RouteDeps, parseTriageReport()

### Community 56 - "CSV Parsing"
Cohesion: 0.10
Nodes (23): Board(), BoardProps, normalize(), NAV_ENTRIES, NavEntry, Sidebar(), SidebarProps, SidebarView (+15 more)

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
Cohesion: 0.35
Nodes (11): AgentCard(), projectBadgeStyle(), TicketCard(), TriageDot(), useTickTimer(), formatDuration(), formatRelativeDuration(), isStageAnimated() (+3 more)

### Community 64 - "Composer Run Script"
Cohesion: 0.48
Nodes (4): PrSelectRow(), PrSelectRowProps, isPrNeedsAttention(), OpenPr

### Community 65 - "migration.ts"
Cohesion: 0.27
Nodes (9): buildAppSettingsPatch(), LegacyConfig, legacyConfigSchema, LegacyModels, log, migrateConfigJsonIfPresent(), parseLegacyConfig(), pickModel() (+1 more)

### Community 66 - "useTickTimer.ts"
Cohesion: 0.33
Nodes (4): currentNow, startTicking(), subscribe(), subscribers

### Community 68 - "CLAUDE.md Doc"
Cohesion: 0.40
Nodes (5): MIME_EXTENSIONS, resolveExtension(), SavedUpload, saveUpload(), serveUpload()

### Community 69 - "Electrobun Deps Types"
Cohesion: 0.33
Nodes (3): listeners, mcp, ReplyArgsSchema

### Community 71 - "PostCSS Config"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 72 - "Community 72"
Cohesion: 0.23
Nodes (10): FullscreenToggle(), FullscreenToggleProps, badgeLabelFor(), LiveTerminal(), LiveTerminalOptions, LiveTerminalProps, TerminalData, TerminalView() (+2 more)

### Community 73 - "React Root Mount"
Cohesion: 0.50
Nodes (4): Claude binary resolution (KANBAN_CLAUDE_BINARY), Config split (config.json vs env), Databases (kanban.db / kanban-real.db), Electrobun desktop app

### Community 74 - "Theme Flash Guard"
Cohesion: 0.50
Nodes (4): ClientHub (broadcasts board snapshots), No type casting convention, rows.ts (zod row validation), store.ts single DB mutation point

### Community 75 - "Community 75"
Cohesion: 1.00
Nodes (4): Dry-run safety model, FakeSystemAdapter, RealSystemAdapter, SystemAdapter (side-effect boundary)

## Knowledge Gaps
- **434 isolated node(s):** `Quickstart`, `How it works`, `Documentation`, `Overview`, `Agent runtime (Agent SDK)` (+429 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Ticket` connect `Session Hub & Agent Session` to `Desktop Bootstrap & Menus`, `Fake System Adapter`, `Shared Zod Schemas`, `PR Selection & Slots Bar`, `Slot Config & Worktree Watch`, `Live Terminal Views`, `Real Adapter GH/Composer`, `Store Types & Agent Knobs`, `DB Row Schemas & Mappers`, `Cost & Pricing`, `Stats Charts`, `Agents View & Ticket Cards`, `User Terminal & Fake IO`, `Board Columns`, `Modal Dialogs`, `Stats Hooks & Cards`, `Community 54`, `CSV Parsing`, `TicketCard.tsx`?**
  _High betweenness centrality (0.066) - this node is a cross-community bridge._
- **Why does `Store` connect `Shared Zod Schemas` to `Contract Building & Slots`, `Terminals UI & Notifications`, `Ticket Action Panels`, `Fake System Adapter`, `PR Selection & Slots Bar`, `Slot Config & Worktree Watch`, `Board & Sidebar Layout`, `Live Terminal Views`, `Session Hub & Agent Session`, `Agents View & Ticket Cards`, `Session Hub Transcript`, `Stats Hooks & Cards`, `csv.ts`, `Community 54`, `Community 55`, `Webhook MCP`, `Community 61`, `Community 63`, `migration.ts`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Why does `RealSystemAdapter` connect `Real System Adapter` to `Contract Building & Slots`, `Composer Run Script`, `Agent Profile Config`, `Board & Sidebar Layout`, `API Routes & Reformulate`, `Community 48`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **What connects `Quickstart`, `How it works`, `Documentation` to the rest of the system?**
  _437 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Contract Building & Slots` be split into smaller, more focused modules?**
  _Cohesion score 0.13043478260869565 - nodes in this community are weakly interconnected._
- **Should `Desktop Bootstrap & Menus` be split into smaller, more focused modules?**
  _Cohesion score 0.039160839160839164 - nodes in this community are weakly interconnected._
- **Should `Feasibility Batch Management` be split into smaller, more focused modules?**
  _Cohesion score 0.08879492600422834 - nodes in this community are weakly interconnected._