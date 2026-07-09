# Graph Report - kanban-agents  (2026-07-09)

## Corpus Check
- 173 files · ~661,852 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1675 nodes · 4075 edges · 83 communities (68 shown, 15 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 27 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f34e67d3`
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
- User Terminal Manager
- Community 54
- Community 55
- CSV Parsing
- Community 57
- File Uploads
- Webhook MCP
- Package Manifest
- Community 61
- Community 63
- Composer Run Script
- Community 66
- CLAUDE.md Doc
- Electrobun Deps Types
- Electrobun Config
- PostCSS Config
- Community 72
- React Root Mount
- Theme Flash Guard
- Community 75
- Community 76
- Community 77
- Community 80
- Community 82
- Community 87
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
- `Claude Code skills` --conceptually_related_to--> `Contract (pipeline instructions)`  [EXTRACTED]
  README.md → CONTEXT.md
- `Kind (ticket pipeline type)` --conceptually_related_to--> `argus (argus-review) skill`  [INFERRED]
  CONTEXT.md → README.md
- `Kind (ticket pipeline type)` --conceptually_related_to--> `minos-pr-feedback skill`  [INFERRED]
  CONTEXT.md → README.md
- `Contract (pipeline instructions)` --references--> `argus (argus-review) skill`  [EXTRACTED]
  CONTEXT.md → README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Agent session lifecycle (per ticket)** — agents_session_hub, agents_slot_manager, agents_coordinator, agents_pipeline_contract, agents_slots, agents_done_gate [INFERRED 0.85]
- **Side-effect boundary implementations** — agents_system_adapter, agents_fake_system_adapter, agents_real_system_adapter [EXTRACTED 1.00]
- **In-process SDK agent protocol** — agents_claude_agent_sdk, agents_query_streaming_input, agents_in_process_mcp_server, agents_worker_tools, agents_channel_events [INFERRED 0.85]

## Communities (83 total, 15 thin omitted)

### Community 0 - "Contract Building & Slots"
Cohesion: 0.09
Nodes (29): log, SlotWatch, log, runFirstBootSetup(), applyAppSettingsToModels(), initProjectRegistry(), listProjectKeys(), PROJECT_ROOT (+21 more)

### Community 1 - "Terminals UI & Notifications"
Cohesion: 0.24
Nodes (6): buildSplitSessionConfig(), DRY_RUN_RESULT, log, PendingSplit, SplitManager, SplitResult

### Community 2 - "Desktop Bootstrap & Menus"
Cohesion: 0.04
Nodes (59): AnalyzeTicketsInput, appSettingsSchema, automationRunSchema, automationSchema, baseBranchSchema, capabilitiesSchema, commentAuthorSchema, commentSchema (+51 more)

### Community 3 - "Feasibility Batch Management"
Cohesion: 0.11
Nodes (3): delay(), FakeSystemAdapter, WorktreeSetupOptions

### Community 4 - "Ticket Action Panels"
Cohesion: 0.07
Nodes (23): applyDesktopEnv(), DesktopRoots, ensureConfig(), boot(), installApplicationMenu(), installMenuShortcutBridge(), menuShortcutActionSchema, newWindowEventSchema (+15 more)

### Community 5 - "Fake System Adapter"
Cohesion: 0.05
Nodes (35): buildNotionImportPrompt(), buildPrdPrompt(), createSplitChildren(), failSplitMother(), isBlocked(), isSplitMother(), log, PaneReader (+27 more)

### Community 7 - "Settings & Profiles UI"
Cohesion: 0.09
Nodes (20): TRIAGE_VERDICTS, AgentSettableStage, agentSettableStageSchema, askUserArgsSchema, AssertNamesCovered, channelEventSchema, doneArgsSchema, failArgsSchema (+12 more)

### Community 8 - "PR Selection & Slots Bar"
Cohesion: 0.08
Nodes (17): log, DRY_RUN_VERDICT, log, log, DRY_RUN_VERDICT, log, TriageSession, log (+9 more)

### Community 10 - "Slot Config & Worktree Watch"
Cohesion: 0.06
Nodes (37): AutomationRow, automationRowSchema, AutomationRunRow, automationRunRowSchema, buildScripts(), CommentRow, commentRowSchema, mapAutomationRow() (+29 more)

### Community 11 - "Core Domain Concepts"
Cohesion: 0.10
Nodes (24): FullscreenToggle(), FullscreenToggleProps, badgeLabelFor(), LiveTerminal(), LiveTerminalOptions, LiveTerminalProps, TabButton(), PrdView() (+16 more)

### Community 12 - "Board & Sidebar Layout"
Cohesion: 0.11
Nodes (12): LiveSession, log, previewToolInput(), renderChannelEvent(), renderSessionEvent(), SessionHub, SessionHubHandlers, SessionStartConfig (+4 more)

### Community 13 - "Database Store Operations"
Cohesion: 0.09
Nodes (37): CleanPrPanel(), CleanPrPanelProps, ImportTicketsPanel(), ImportTicketsPanelProps, NewTicketDialog(), NewTicketDialogProps, Tab, TAB_TITLES (+29 more)

### Community 14 - "Coordinator & Protocol"
Cohesion: 0.10
Nodes (29): effectiveWorkDurationMs(), costByModel(), costByProject(), CostGroup, DurationGroup, KIND_LABELS, KindCount, kindCounts() (+21 more)

### Community 15 - "API Routes & Reformulate"
Cohesion: 0.09
Nodes (29): AgentSessionHandle, AgentSessionOptions, AgentSessionToolResult, dryRunLog, FAKE_OPEN_PRS, fakeEncoder, CLAUDE_JSON_PATH, COMPOSER_BINARIES (+21 more)

### Community 16 - "Stats Aggregation"
Cohesion: 0.06
Nodes (39): ShortcutDetail, UsePrdSearchOptions, UsePrdSearchResult, loadTree(), saveTree(), storageKey(), useTerminals, ShortcutDetail (+31 more)

### Community 17 - "Triage & Server Hub"
Cohesion: 0.08
Nodes (25): devDependencies, autoprefixer, class-variance-authority, clsx, concurrently, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities (+17 more)

### Community 18 - "Live Terminal Views"
Cohesion: 0.05
Nodes (47): resolveBaseBranch(), buildAskContract(), buildCleanContract(), buildConflictResolutionContract(), buildFeasibilityBatchContract(), buildFeasibilityContextSection(), buildImplementingSteps(), buildPlanningStep() (+39 more)

### Community 19 - "Stage Progress & Display"
Cohesion: 0.08
Nodes (24): compilerOptions, allowImportingTsExtensions, baseUrl, esModuleInterop, isolatedModules, jsx, lib, module (+16 more)

### Community 20 - "Real Adapter GH/Composer"
Cohesion: 0.13
Nodes (24): PrdReviewDialog(), PrdReviewDialogProps, QuitConfirmModal(), QuitConfirmModalProps, TerminalsView(), TerminalsViewProps, AUTHOR_BADGES, CommentRow() (+16 more)

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
Cohesion: 0.11
Nodes (18): PrdAnnotator(), PrdAnnotatorProps, usePrdSearch(), AnnotatedHtml, compileFeedback(), injectAnnotations(), isInsideAnnotation(), PrdAnnotation (+10 more)

### Community 25 - "Client Hub & Watchdog"
Cohesion: 0.10
Nodes (24): StatsViewProps, useStats(), UseStatsResult, StatRecord, StatCard(), StatCardProps, StatEmpty(), ACTIVE_BAR (+16 more)

### Community 27 - "Workflow View & Lifecycle"
Cohesion: 0.07
Nodes (32): Channel (agent<->backend link), Column (board lane), Contract (pipeline instructions), Coordinator, Done Gate, Kind (ticket pipeline type), Protocol (wire format source of truth), SessionHub (+24 more)

### Community 28 - "Stats Charts"
Cohesion: 0.18
Nodes (3): BoardStore, Listener, WsClientEvent

### Community 29 - "Session Hub & Agent Session"
Cohesion: 0.15
Nodes (5): TicketCardProps, COLUMN_NODE_COLOR, WorkflowViewProps, TicketLifecycle, Ticket

### Community 30 - "Agents View & Ticket Cards"
Cohesion: 0.10
Nodes (40): AgentProfileConfigProps, FormState, ImplementationAgentFieldsProps, mapWorktreeSessionRow(), AutomationPatch, enrichWorktreeSession(), NewAsk, NewAutomation (+32 more)

### Community 31 - "PRD Review & Markdown"
Cohesion: 0.23
Nodes (5): Logger, paint(), ScopedLogger, serializeFields(), timestamp()

### Community 32 - "User Terminal & Fake IO"
Cohesion: 0.11
Nodes (21): BASH_ALLOWLIST, buildFeasibilitySessionConfig(), buildImplementSessionConfig(), buildTriageSessionConfig(), CONTRACT_SKILLS, DENIED_BUILTIN_AGENTS, feasibilityScoutAgent(), FeasibilitySessionInput (+13 more)

### Community 33 - "Logging"
Cohesion: 0.10
Nodes (20): scripts, build:desktop, build:web, dev, dev:desktop, dev:proxy, dev:server, dev:web (+12 more)

### Community 34 - "Board Columns"
Cohesion: 0.13
Nodes (17): PROGRESS_BAR_COLORS, StageProgressBar(), StageProgressBarProps, ANIMATED_STAGES, BadgeVariant, DATETIME_FORMAT, NON_DEPENDABLE_COLUMNS, prNumberFromUrl() (+9 more)

### Community 35 - "NPM Scripts"
Cohesion: 0.20
Nodes (10): addUsageByModel(), log, ToolHandler, ToolResult, toUsageByModel(), submitFeasibilityArgsSchema, submitSplitArgsSchema, submitTriageArgsSchema (+2 more)

### Community 36 - "Runtime Dependencies"
Cohesion: 0.07
Nodes (38): AgentProfileConfig(), AskPanel(), AskPanelProps, ImplementationAgentFields(), ProjectsSettings(), DragHandleAttributes, DragHandleListeners, GeneralSettings() (+30 more)

### Community 37 - "Claude SDK Provider"
Cohesion: 0.11
Nodes (18): dependencies, @anthropic-ai/claude-agent-sdk, dompurify, elysia, marked, @modelcontextprotocol/sdk, nanoid, papaparse (+10 more)

### Community 38 - "Agent Profile Config"
Cohesion: 0.13
Nodes (16): WORKER_TOOLS, AgentProvider, resolveClaudeBinary(), bashCommandSchema, buildSettings(), claudeProvider, createSdkAgentSession(), dispatch() (+8 more)

### Community 39 - "Agent Coordinator Handlers"
Cohesion: 0.24
Nodes (8): artifactPath, assertClaudeSdkVersionInSync(), BUILT_DMG, ELECTROBUN_BIN, fail(), RELEASE_FOLDER, REPO_ROOT, run()

### Community 40 - "API Client Inputs"
Cohesion: 0.22
Nodes (3): AgentCoordinator, SessionToolCall, WorkerToolName

### Community 41 - "Ticket Config & Constants"
Cohesion: 0.35
Nodes (11): AgentCard(), projectBadgeStyle(), TicketCard(), TriageDot(), useTickTimer(), formatDuration(), formatRelativeDuration(), isStageAnimated() (+3 more)

### Community 42 - "Ticket Detail & Triage UI"
Cohesion: 0.24
Nodes (4): detectInstallCommand(), realpathSafe(), resolveWorktreeScriptCommand(), shQuote()

### Community 43 - "Demo Pipeline Concepts"
Cohesion: 0.11
Nodes (14): ANSI, COLOR_ENABLED, isLevel(), Level, LEVEL_ORDER, LEVEL_TAG, resolveThreshold(), THRESHOLD (+6 more)

### Community 44 - "Chart Primitives"
Cohesion: 0.13
Nodes (15): AddProjectForm(), AddProjectFormProps, isPositiveIntegerString(), isValidDraft(), ProjectFieldsProps, ProjectRow(), ProjectRowProps, emit() (+7 more)

### Community 46 - "Community 46"
Cohesion: 0.27
Nodes (15): Agent Implementation Config, Argus Code Review, Automated Tests (typecheck/lint/test), Claude Code Autonomous Agent, Ticket Contract Injection, Feasibility Analysis, Kanban Board (Atelier), Kanban Agents Demo (demo.gif) (+7 more)

### Community 47 - "Modal Dialogs"
Cohesion: 0.07
Nodes (27): AutomationCardProps, AutomationFormProps, AutomationView(), EMPTY_FORM, RUN_STATUS_LABEL, RUN_STATUS_VARIANT, labelWithDefault(), TicketConfigSummary() (+19 more)

### Community 48 - "Community 48"
Cohesion: 0.18
Nodes (3): FakePaneStream, fakeShellPrompt(), hexToBytes()

### Community 49 - "Slot State"
Cohesion: 0.40
Nodes (3): mapCommentRow(), CommentAuthor, Comment

### Community 50 - "Stats Hooks & Cards"
Cohesion: 0.15
Nodes (12): active, ensureNotificationPermission(), getAudioContext(), isSupported(), playNotificationSound(), showDesktopNotification(), Window, BoardState (+4 more)

### Community 51 - "Community 51"
Cohesion: 0.16
Nodes (12): ChartConfig, ChartContainer, ChartContainerProps, ChartContext, ChartContextValue, ChartLegendContent(), ChartLegendContentProps, ChartTooltipContent() (+4 more)

### Community 53 - "User Terminal Manager"
Cohesion: 0.33
Nodes (5): CONTEXT — domain glossary, Execution, Proposed (not yet built), Seams, Work items

### Community 54 - "Community 54"
Cohesion: 0.19
Nodes (7): SlotsBar(), SlotsBarProps, Stat(), StatProps, STATUS_LABELS, mapSlotRow(), Slot

### Community 56 - "CSV Parsing"
Cohesion: 0.11
Nodes (22): Board(), BoardProps, normalize(), NAV_ENTRIES, NavEntry, Sidebar(), SidebarProps, SidebarView (+14 more)

### Community 57 - "Community 57"
Cohesion: 0.31
Nodes (8): UseThemeResult, applyTheme(), getStoredTheme(), isTheme(), Theme, ThemeOption, THEMES, root

### Community 59 - "Webhook MCP"
Cohesion: 0.19
Nodes (4): ReformulateManager, TriageManager, RouteDeps, TriageResult

### Community 60 - "Package Manifest"
Cohesion: 0.31
Nodes (8): createDatabase(), migrate(), PROFILE_MIGRATIONS, seedProfiles(), seedSlots(), TICKET_MIGRATIONS, DEFAULT_PROFILES, SLOT_COUNT

### Community 61 - "Community 61"
Cohesion: 0.27
Nodes (3): mapAutomationRunRow(), Automation, AutomationRun

### Community 64 - "Composer Run Script"
Cohesion: 0.48
Nodes (4): PrSelectRow(), PrSelectRowProps, isPrNeedsAttention(), OpenPr

### Community 66 - "Community 66"
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
Cohesion: 0.14
Nodes (16): AgentCardProps, AgentsView(), AgentsViewProps, normalize(), TicketBadges(), TicketBadgesProps, resolveProjectColor(), resolveProjectLabel() (+8 more)

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
- **428 isolated node(s):** `REPO_ROOT`, `BUILT_DMG`, `RELEASE_FOLDER`, `ELECTROBUN_BIN`, `artifactPath` (+423 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **15 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Ticket` connect `Session Hub & Agent Session` to `Desktop Bootstrap & Menus`, `Fake System Adapter`, `Shared Zod Schemas`, `PR Selection & Slots Bar`, `Slot Config & Worktree Watch`, `Database Store Operations`, `Live Terminal Views`, `Real Adapter GH/Composer`, `Store Types & Agent Knobs`, `DB Row Schemas & Mappers`, `Stats Charts`, `Agents View & Ticket Cards`, `User Terminal & Fake IO`, `Board Columns`, `Ticket Config & Constants`, `Modal Dialogs`, `Stats Hooks & Cards`, `CSV Parsing`, `File Uploads`, `Webhook MCP`, `Community 72`, `Community 76`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **Why does `Store` connect `Shared Zod Schemas` to `Contract Building & Slots`, `Terminals UI & Notifications`, `Ticket Action Panels`, `Fake System Adapter`, `PR Selection & Slots Bar`, `Live Terminal Views`, `Session Hub & Agent Session`, `Agents View & Ticket Cards`, `NPM Scripts`, `Demo Pipeline Concepts`, `Session Hub Transcript`, `Slot State`, `Stats Hooks & Cards`, `Community 54`, `Community 55`, `File Uploads`, `Webhook MCP`, `Community 61`, `Community 63`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **Why does `FakeSystemAdapter` connect `Feasibility Batch Management` to `Community 48`, `PR Selection & Slots Bar`, `Cost & Pricing`, `API Routes & Reformulate`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **What connects `REPO_ROOT`, `BUILT_DMG`, `RELEASE_FOLDER` to the rest of the system?**
  _431 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Contract Building & Slots` be split into smaller, more focused modules?**
  _Cohesion score 0.0915915915915916 - nodes in this community are weakly interconnected._
- **Should `Desktop Bootstrap & Menus` be split into smaller, more focused modules?**
  _Cohesion score 0.03942652329749104 - nodes in this community are weakly interconnected._
- **Should `Feasibility Batch Management` be split into smaller, more focused modules?**
  _Cohesion score 0.1140819964349376 - nodes in this community are weakly interconnected._