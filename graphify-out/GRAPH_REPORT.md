# Graph Report - slot-2  (2026-06-30)

## Corpus Check
- 152 files · ~642,571 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1602 nodes · 3878 edges · 83 communities (69 shown, 14 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 27 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `35124f8c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Contract Building & Slots|Contract Building & Slots]]
- [[_COMMUNITY_Terminals UI & Notifications|Terminals UI & Notifications]]
- [[_COMMUNITY_Desktop Bootstrap & Menus|Desktop Bootstrap & Menus]]
- [[_COMMUNITY_Feasibility Batch Management|Feasibility Batch Management]]
- [[_COMMUNITY_Ticket Action Panels|Ticket Action Panels]]
- [[_COMMUNITY_Fake System Adapter|Fake System Adapter]]
- [[_COMMUNITY_Shared Zod Schemas|Shared Zod Schemas]]
- [[_COMMUNITY_Settings & Profiles UI|Settings & Profiles UI]]
- [[_COMMUNITY_PR Selection & Slots Bar|PR Selection & Slots Bar]]
- [[_COMMUNITY_Real System Adapter|Real System Adapter]]
- [[_COMMUNITY_Slot Config & Worktree Watch|Slot Config & Worktree Watch]]
- [[_COMMUNITY_Core Domain Concepts|Core Domain Concepts]]
- [[_COMMUNITY_Board & Sidebar Layout|Board & Sidebar Layout]]
- [[_COMMUNITY_Database Store Operations|Database Store Operations]]
- [[_COMMUNITY_Coordinator & Protocol|Coordinator & Protocol]]
- [[_COMMUNITY_API Routes & Reformulate|API Routes & Reformulate]]
- [[_COMMUNITY_Stats Aggregation|Stats Aggregation]]
- [[_COMMUNITY_Triage & Server Hub|Triage & Server Hub]]
- [[_COMMUNITY_Live Terminal Views|Live Terminal Views]]
- [[_COMMUNITY_Stage Progress & Display|Stage Progress & Display]]
- [[_COMMUNITY_Real Adapter GHComposer|Real Adapter GH/Composer]]
- [[_COMMUNITY_Store Types & Agent Knobs|Store Types & Agent Knobs]]
- [[_COMMUNITY_DB Row Schemas & Mappers|DB Row Schemas & Mappers]]
- [[_COMMUNITY_Dev Dependencies|Dev Dependencies]]
- [[_COMMUNITY_TypeScript Config|TypeScript Config]]
- [[_COMMUNITY_Client Hub & Watchdog|Client Hub & Watchdog]]
- [[_COMMUNITY_Cost & Pricing|Cost & Pricing]]
- [[_COMMUNITY_Workflow View & Lifecycle|Workflow View & Lifecycle]]
- [[_COMMUNITY_Stats Charts|Stats Charts]]
- [[_COMMUNITY_Session Hub & Agent Session|Session Hub & Agent Session]]
- [[_COMMUNITY_Agents View & Ticket Cards|Agents View & Ticket Cards]]
- [[_COMMUNITY_PRD Review & Markdown|PRD Review & Markdown]]
- [[_COMMUNITY_User Terminal & Fake IO|User Terminal & Fake IO]]
- [[_COMMUNITY_Logging|Logging]]
- [[_COMMUNITY_Board Columns|Board Columns]]
- [[_COMMUNITY_NPM Scripts|NPM Scripts]]
- [[_COMMUNITY_Runtime Dependencies|Runtime Dependencies]]
- [[_COMMUNITY_Claude SDK Provider|Claude SDK Provider]]
- [[_COMMUNITY_Agent Profile Config|Agent Profile Config]]
- [[_COMMUNITY_Agent Coordinator Handlers|Agent Coordinator Handlers]]
- [[_COMMUNITY_API Client Inputs|API Client Inputs]]
- [[_COMMUNITY_Ticket Config & Constants|Ticket Config & Constants]]
- [[_COMMUNITY_Ticket Detail & Triage UI|Ticket Detail & Triage UI]]
- [[_COMMUNITY_Demo Pipeline Concepts|Demo Pipeline Concepts]]
- [[_COMMUNITY_Chart Primitives|Chart Primitives]]
- [[_COMMUNITY_Session Hub Transcript|Session Hub Transcript]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Modal Dialogs|Modal Dialogs]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Slot State|Slot State]]
- [[_COMMUNITY_Stats Hooks & Cards|Stats Hooks & Cards]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Tick Timer Hook|Tick Timer Hook]]
- [[_COMMUNITY_User Terminal Manager|User Terminal Manager]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_CSV Parsing|CSV Parsing]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_File Uploads|File Uploads]]
- [[_COMMUNITY_Webhook MCP|Webhook MCP]]
- [[_COMMUNITY_Package Manifest|Package Manifest]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Badge Component|Badge Component]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Composer Run Script|Composer Run Script]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_CLAUDE.md Doc|CLAUDE.md Doc]]
- [[_COMMUNITY_Electrobun Deps Types|Electrobun Deps Types]]
- [[_COMMUNITY_Electrobun Config|Electrobun Config]]
- [[_COMMUNITY_PostCSS Config|PostCSS Config]]
- [[_COMMUNITY_React Root Mount|React Root Mount]]
- [[_COMMUNITY_Theme Flash Guard|Theme Flash Guard]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 80|Community 80]]
- [[_COMMUNITY_Community 82|Community 82]]
- [[_COMMUNITY_Community 87|Community 87]]
- [[_COMMUNITY_Community 89|Community 89]]
- [[_COMMUNITY_Community 90|Community 90]]

## God Nodes (most connected - your core abstractions)
1. `Store` - 76 edges
2. `Ticket` - 70 edges
3. `cn()` - 61 edges
4. `RealSystemAdapter` - 50 edges
5. `SlotManager` - 45 edges
6. `FakeSystemAdapter` - 43 edges
7. `ProjectInfo` - 39 edges
8. `getProject()` - 33 edges
9. `isProjectKey()` - 31 edges
10. `ClientHub` - 31 edges

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

## Communities (83 total, 14 thin omitted)

### Community 0 - "Contract Building & Slots"
Cohesion: 0.06
Nodes (44): resolveBaseBranch(), buildAskContract(), buildCleanContract(), buildConflictResolutionContract(), buildFeasibilityContextSection(), buildImplementingSteps(), buildPlanningStep(), buildReviewContract() (+36 more)

### Community 1 - "Terminals UI & Notifications"
Cohesion: 0.14
Nodes (7): buildSplitSessionConfig(), SessionHub, DRY_RUN_RESULT, log, PendingSplit, SplitManager, SplitResult

### Community 2 - "Desktop Bootstrap & Menus"
Cohesion: 0.04
Nodes (55): AnalyzeTicketsInput, appSettingsSchema, baseBranchSchema, capabilitiesSchema, commentAuthorSchema, commentSchema, CreateAskInput, CreateCleanInput (+47 more)

### Community 4 - "Ticket Action Panels"
Cohesion: 0.09
Nodes (11): dataMessage(), normalizeSeed(), safeParse(), send(), TerminalSession, TerminalSessionManager, visibleText(), TerminalServerMessage (+3 more)

### Community 5 - "Fake System Adapter"
Cohesion: 0.06
Nodes (33): buildNotionImportPrompt(), buildPrdPrompt(), createSplitChildren(), failSplitMother(), isBlocked(), isSplitMother(), log, PaneReader (+25 more)

### Community 7 - "Settings & Profiles UI"
Cohesion: 0.07
Nodes (29): addUsageByModel(), log, ToolHandler, ToolResult, toUsageByModel(), TRIAGE_VERDICTS, AgentSettableStage, agentSettableStageSchema (+21 more)

### Community 8 - "PR Selection & Slots Bar"
Cohesion: 0.07
Nodes (17): buildReformulatePrompt(), log, ReformulateManager, DRY_RUN_VERDICT, log, TriageSession, log, Watchdog (+9 more)

### Community 10 - "Slot Config & Worktree Watch"
Cohesion: 0.07
Nodes (31): buildScripts(), CommentRow, commentRowSchema, mapProjectRow(), mapTicketRow(), parseSessionUsage(), parseWorktreePorts(), ProfileRow (+23 more)

### Community 11 - "Core Domain Concepts"
Cohesion: 0.09
Nodes (22): TabButton(), PrdView(), StatsView(), AuthorBadge(), TICKET_OPTION, TicketOptionsToggleGroup(), TicketOptionsToggleGroupProps, TicketOptionValues (+14 more)

### Community 12 - "Board & Sidebar Layout"
Cohesion: 0.17
Nodes (13): log, previewToolInput(), renderChannelEvent(), renderSessionEvent(), SessionHubHandlers, SessionStartConfig, ChannelEvent, AgentPermissionMode (+5 more)

### Community 13 - "Database Store Operations"
Cohesion: 0.26
Nodes (12): CleanPrPanel(), CleanPrPanelProps, ImportTicketsPanelProps, NewTicketDialogProps, ProjectPrPicker(), ProjectPrPickerProps, ReviewPrPanel(), ReviewPrPanelProps (+4 more)

### Community 14 - "Coordinator & Protocol"
Cohesion: 0.10
Nodes (26): effectiveWorkDurationMs(), CostGroup, DurationGroup, KIND_LABELS, KindCount, kindCounts(), meanDurationByEffort(), meanDurationByKey() (+18 more)

### Community 15 - "API Routes & Reformulate"
Cohesion: 0.19
Nodes (5): detectInstallCommand(), realpathSafe(), resolveWorktreeScriptCommand(), shQuote(), WorktreeSetupOptions

### Community 16 - "Stats Aggregation"
Cohesion: 0.13
Nodes (23): loadTree(), saveTree(), storageKey(), useTerminals, ShortcutDetail, UseTerminalShortcutsOptions, SplitTreeProps, applySizes() (+15 more)

### Community 17 - "Triage & Server Hub"
Cohesion: 0.08
Nodes (25): devDependencies, autoprefixer, class-variance-authority, clsx, concurrently, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities (+17 more)

### Community 19 - "Stage Progress & Display"
Cohesion: 0.08
Nodes (24): compilerOptions, allowImportingTsExtensions, baseUrl, esModuleInterop, isolatedModules, jsx, lib, module (+16 more)

### Community 20 - "Real Adapter GH/Composer"
Cohesion: 0.19
Nodes (16): PrdReviewDialogProps, QuitConfirmModal(), QuitConfirmModalProps, TerminalsView(), TerminalsViewProps, useTerminalShortcuts(), Button, ButtonProps (+8 more)

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
Cohesion: 0.13
Nodes (16): PrdAnnotator(), PrdAnnotatorProps, ShortcutDetail, usePrdSearch(), UsePrdSearchOptions, UsePrdSearchResult, AnnotatedHtml, compileFeedback() (+8 more)

### Community 25 - "Client Hub & Watchdog"
Cohesion: 0.13
Nodes (18): StatsViewProps, ACTIVE_BAR, AREA_CURSOR, AXIS_PROPS, BAR_CURSOR, CHART_PALETTE, CostChart(), DurationChart() (+10 more)

### Community 26 - "Cost & Pricing"
Cohesion: 0.20
Nodes (11): projectConfigSchema, buildAppSettingsPatch(), LegacyConfig, legacyConfigSchema, LegacyModels, log, migrateConfigJsonIfPresent(), parseLegacyConfig() (+3 more)

### Community 27 - "Workflow View & Lifecycle"
Cohesion: 0.07
Nodes (32): Channel (agent<->backend link), Column (board lane), Contract (pipeline instructions), Coordinator, Done Gate, Kind (ticket pipeline type), Protocol (wire format source of truth), SessionHub (+24 more)

### Community 28 - "Stats Charts"
Cohesion: 0.17
Nodes (6): buildFeasibilityBatchContract(), DRY_RUN_VERDICT, FeasibilityBatchManager, log, toTriageResult(), FeasibilityResult

### Community 29 - "Session Hub & Agent Session"
Cohesion: 0.10
Nodes (21): NAV_ENTRIES, NavEntry, Sidebar(), SidebarProps, SidebarView, SlotsBar(), Stat(), StatProps (+13 more)

### Community 30 - "Agents View & Ticket Cards"
Cohesion: 0.11
Nodes (20): mapWorktreeSessionRow(), enrichWorktreeSession(), NewAsk, NewClean, NewProject, NewReview, ProjectInUseError, ProjectPatch (+12 more)

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
Cohesion: 0.06
Nodes (45): AgentCard(), AgentCardProps, AgentsView(), AgentsViewProps, normalize(), PROGRESS_BAR_COLORS, StageProgressBar(), StageProgressBarProps (+37 more)

### Community 35 - "NPM Scripts"
Cohesion: 0.14
Nodes (18): PrdReviewDialog(), resolveProjectColor(), resolveProjectLabel(), AUTHOR_BADGES, CommentRow(), CommentRowProps, isLocked(), TicketDetail() (+10 more)

### Community 36 - "Runtime Dependencies"
Cohesion: 0.11
Nodes (17): DragHandleAttributes, DragHandleListeners, GeneralSettings(), IMPLEMENTER_OPTIONS, LANGUAGE_OPTIONS, ProfileRowProps, renderTab(), SettingsModal() (+9 more)

### Community 37 - "Claude SDK Provider"
Cohesion: 0.11
Nodes (18): dependencies, @anthropic-ai/claude-agent-sdk, dompurify, elysia, marked, @modelcontextprotocol/sdk, nanoid, papaparse (+10 more)

### Community 38 - "Agent Profile Config"
Cohesion: 0.06
Nodes (41): LiveSession, WORKER_TOOLS, AgentSessionHandle, AgentSessionOptions, resolveClaudeBinary(), bashCommandSchema, buildSettings(), claudeProvider (+33 more)

### Community 39 - "Agent Coordinator Handlers"
Cohesion: 0.10
Nodes (23): FullscreenToggle(), FullscreenToggleProps, badgeLabelFor(), LiveTerminal(), LiveTerminalOptions, LiveTerminalProps, TerminalData, TerminalView() (+15 more)

### Community 40 - "API Client Inputs"
Cohesion: 0.22
Nodes (3): AgentCoordinator, SessionToolCall, WorkerToolName

### Community 41 - "Ticket Config & Constants"
Cohesion: 0.18
Nodes (17): AgentProfileConfig(), AskPanel(), AskPanelProps, ImplementationAgentFields(), ProfilesSettings(), loadOnce(), subscribers, UNKNOWN_CAPABILITIES (+9 more)

### Community 42 - "Ticket Detail & Triage UI"
Cohesion: 0.50
Nodes (8): buildContractConstraintsLines(), buildResponseFormatLines(), buildStrictRulesLines(), buildTicketLines(), buildTriageChannelPrompt(), buildTriagePlusChannelPrompt(), isEnglish(), AGENT_MODELS

### Community 43 - "Demo Pipeline Concepts"
Cohesion: 0.11
Nodes (19): PROJECT_ROOT, RunningServer, serveStaticAsset(), SocketData, startServer(), StartServerOptions, STATIC_CONTENT_TYPES, staticResponse() (+11 more)

### Community 44 - "Chart Primitives"
Cohesion: 0.18
Nodes (11): AddProjectForm(), AddProjectFormProps, isPositiveIntegerString(), isValidDraft(), ProjectFieldsProps, ProjectRow(), ProjectRowProps, ProjectsSettings() (+3 more)

### Community 45 - "Session Hub Transcript"
Cohesion: 0.15
Nodes (15): applyDesktopEnv(), DesktopRoots, ensureConfig(), boot(), installApplicationMenu(), installMenuShortcutBridge(), menuShortcutActionSchema, newWindowEventSchema (+7 more)

### Community 46 - "Community 46"
Cohesion: 0.27
Nodes (15): Agent Implementation Config, Argus Code Review, Automated Tests (typecheck/lint/test), Claude Code Autonomous Agent, Ticket Contract Injection, Feasibility Analysis, Kanban Board (Atelier), Kanban Agents Demo (demo.gif) (+7 more)

### Community 47 - "Modal Dialogs"
Cohesion: 0.25
Nodes (8): ANSI, COLOR_ENABLED, isLevel(), Level, LEVEL_ORDER, LEVEL_TAG, resolveThreshold(), THRESHOLD

### Community 49 - "Slot State"
Cohesion: 0.12
Nodes (20): ImportTicketsPanel(), NewTicketDialog(), Tab, TAB_TITLES, TabButtonProps, ProjectSelect(), ProjectSelectProps, WorktreePanel() (+12 more)

### Community 50 - "Stats Hooks & Cards"
Cohesion: 0.11
Nodes (10): active, ensureNotificationPermission(), getAudioContext(), isSupported(), playNotificationSound(), showDesktopNotification(), Window, BoardStore (+2 more)

### Community 51 - "Community 51"
Cohesion: 0.16
Nodes (12): ChartConfig, ChartContainer, ChartContainerProps, ChartContext, ChartContextValue, ChartLegendContent(), ChartLegendContentProps, ChartTooltipContent() (+4 more)

### Community 52 - "Tick Timer Hook"
Cohesion: 0.42
Nodes (11): AgentProfileConfigProps, ImplementationAgentFieldsProps, NewProfile, NewTicket, ProfilePatch, AgentKnobs, AgentProfileConfigValues, ResolvedAgentDefaults (+3 more)

### Community 53 - "User Terminal Manager"
Cohesion: 0.33
Nodes (5): CONTEXT — domain glossary, Execution, Proposed (not yet built), Seams, Work items

### Community 54 - "Community 54"
Cohesion: 0.38
Nodes (3): SlotsBarProps, mapSlotRow(), Slot

### Community 56 - "CSV Parsing"
Cohesion: 0.11
Nodes (17): Board(), BoardProps, normalize(), Toaster(), COLUMN_NODE_COLOR, WorkflowView(), WorkflowViewProps, WorktreeSessionsView() (+9 more)

### Community 57 - "Community 57"
Cohesion: 0.31
Nodes (8): UseThemeResult, applyTheme(), getStoredTheme(), isTheme(), Theme, ThemeOption, THEMES, root

### Community 58 - "File Uploads"
Cohesion: 0.28
Nodes (3): FeasibilitySession, SqlUpdateBuilder, ProjectConfig

### Community 60 - "Package Manifest"
Cohesion: 0.11
Nodes (20): labelWithDefault(), TicketConfigSummary(), createDatabase(), migrate(), PROFILE_MIGRATIONS, seedProfiles(), seedSlots(), TICKET_MIGRATIONS (+12 more)

### Community 62 - "Badge Component"
Cohesion: 0.32
Nodes (6): useStats(), UseStatsResult, StatRecord, StatCard(), StatCardProps, StatEmpty()

### Community 63 - "Community 63"
Cohesion: 0.40
Nodes (3): mapCommentRow(), CommentAuthor, Comment

### Community 64 - "Composer Run Script"
Cohesion: 0.48
Nodes (4): PrSelectRow(), PrSelectRowProps, isPrNeedsAttention(), OpenPr

### Community 67 - "Community 67"
Cohesion: 0.40
Nodes (6): costByModel(), costByProject(), meanCostPerIssueUsd(), modelLabel(), totalSpendUsd(), withCost()

### Community 68 - "CLAUDE.md Doc"
Cohesion: 0.40
Nodes (5): MIME_EXTENSIONS, resolveExtension(), SavedUpload, saveUpload(), serveUpload()

### Community 69 - "Electrobun Deps Types"
Cohesion: 0.33
Nodes (3): listeners, mcp, ReplyArgsSchema

### Community 70 - "Electrobun Config"
Cohesion: 0.50
Nodes (3): emit(), refreshProfiles(), subscribers

### Community 71 - "PostCSS Config"
Cohesion: 0.40
Nodes (4): name, private, type, version

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
- **412 isolated node(s):** `log`, `DRY_RUN_VERDICT`, `log`, `DRY_RUN_VERDICT`, `TriageSession` (+407 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Ticket` connect `Board Columns` to `Contract Building & Slots`, `User Terminal & Fake IO`, `Desktop Bootstrap & Menus`, `NPM Scripts`, `Fake System Adapter`, `Shared Zod Schemas`, `PR Selection & Slots Bar`, `Ticket Detail & Triage UI`, `Slot Config & Worktree Watch`, `Database Store Operations`, `Stats Hooks & Cards`, `Store Types & Agent Knobs`, `DB Row Schemas & Mappers`, `CSV Parsing`, `Package Manifest`, `Session Hub & Agent Session`, `Agents View & Ticket Cards`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Why does `Store` connect `Shared Zod Schemas` to `Contract Building & Slots`, `Terminals UI & Notifications`, `Board Columns`, `Cost & Pricing`, `Ticket Action Panels`, `Fake System Adapter`, `Settings & Profiles UI`, `PR Selection & Slots Bar`, `Demo Pipeline Concepts`, `Community 54`, `Community 55`, `File Uploads`, `Stats Charts`, `Community 61`, `Agents View & Ticket Cards`, `Community 63`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Why does `Worker tools (update_stage, ask_user, done, ...)` connect `Dev Dependencies` to `Settings & Profiles UI`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **What connects `log`, `DRY_RUN_VERDICT`, `log` to the rest of the system?**
  _415 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Contract Building & Slots` be split into smaller, more focused modules?**
  _Cohesion score 0.05801980198019802 - nodes in this community are weakly interconnected._
- **Should `Terminals UI & Notifications` be split into smaller, more focused modules?**
  _Cohesion score 0.1380952380952381 - nodes in this community are weakly interconnected._
- **Should `Desktop Bootstrap & Menus` be split into smaller, more focused modules?**
  _Cohesion score 0.04208065458796026 - nodes in this community are weakly interconnected._