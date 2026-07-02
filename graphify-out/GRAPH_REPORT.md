# Graph Report - kanban-agents  (2026-07-02)

## Corpus Check
- 160 files · ~649,562 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1646 nodes · 4072 edges · 89 communities (79 shown, 10 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 27 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `cb15bb9b`
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
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_CLAUDE.md Doc|CLAUDE.md Doc]]
- [[_COMMUNITY_Electrobun Deps Types|Electrobun Deps Types]]
- [[_COMMUNITY_Electrobun Config|Electrobun Config]]
- [[_COMMUNITY_PostCSS Config|PostCSS Config]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_React Root Mount|React Root Mount]]
- [[_COMMUNITY_Theme Flash Guard|Theme Flash Guard]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 79|Community 79]]
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

## Communities (89 total, 10 thin omitted)

### Community 0 - "Contract Building & Slots"
Cohesion: 0.16
Nodes (3): SlotManager, slotPath(), slugify()

### Community 1 - "Terminals UI & Notifications"
Cohesion: 0.08
Nodes (13): ReformulateManager, SessionHub, DRY_RUN_VERDICT, log, TriageSession, RouteDeps, log, TerminalSocket (+5 more)

### Community 2 - "Desktop Bootstrap & Menus"
Cohesion: 0.05
Nodes (42): appSettingsSchema, baseBranchSchema, capabilitiesSchema, commentAuthorSchema, commentSchema, commitLanguageSchema, CreateTerminalBody, EXTERNAL_URL_PROTOCOLS (+34 more)

### Community 3 - "Feasibility Batch Management"
Cohesion: 0.09
Nodes (4): delay(), fakeShellPrompt(), FakeSystemAdapter, hexToBytes()

### Community 4 - "Ticket Action Panels"
Cohesion: 0.11
Nodes (10): dataMessage(), normalizeSeed(), safeParse(), send(), TerminalSession, TerminalSessionManager, visibleText(), TerminalServerMessage (+2 more)

### Community 5 - "Fake System Adapter"
Cohesion: 0.06
Nodes (31): buildNotionImportPrompt(), createSplitChildren(), failSplitMother(), isBlocked(), isSplitMother(), log, PaneReader, performSplit() (+23 more)

### Community 6 - "Shared Zod Schemas"
Cohesion: 0.12
Nodes (3): Store, AppSettings, UpdateAppSettingsInput

### Community 7 - "Settings & Profiles UI"
Cohesion: 0.07
Nodes (29): addUsageByModel(), log, ToolHandler, ToolResult, toUsageByModel(), TRIAGE_VERDICTS, AgentSettableStage, agentSettableStageSchema (+21 more)

### Community 8 - "PR Selection & Slots Bar"
Cohesion: 0.11
Nodes (8): log, Watchdog, ClientHub, ClientSocket, ClientSocketData, createLogger(), NativeNotify, Notifier

### Community 9 - "Real System Adapter"
Cohesion: 0.08
Nodes (3): RealSystemAdapter, safeJsonParse(), DoneGateResult

### Community 10 - "Slot Config & Worktree Watch"
Cohesion: 0.07
Nodes (30): buildScripts(), CommentRow, commentRowSchema, mapProjectRow(), mapTicketRow(), parseSessionUsage(), parseWorktreePorts(), ProfileRow (+22 more)

### Community 11 - "Core Domain Concepts"
Cohesion: 0.08
Nodes (28): TabButton(), PrdAnnotator(), PrdAnnotatorProps, PrdView(), SlotsBar(), SlotsBarProps, Stat(), StatProps (+20 more)

### Community 12 - "Board & Sidebar Layout"
Cohesion: 0.10
Nodes (22): LiveSession, log, previewToolInput(), renderChannelEvent(), renderSessionEvent(), SessionHubHandlers, SessionStartConfig, CODEX_EFFORTS (+14 more)

### Community 13 - "Database Store Operations"
Cohesion: 0.21
Nodes (21): buildAskContract(), buildCleanContract(), buildConflictResolutionContract(), buildFeasibilityContextSection(), buildImplementingSteps(), buildMockupReviewStep(), buildPlanningStep(), buildPrdBullet() (+13 more)

### Community 14 - "Coordinator & Protocol"
Cohesion: 0.10
Nodes (26): effectiveWorkDurationMs(), CostGroup, DurationGroup, KIND_LABELS, KindCount, kindCounts(), meanDurationByEffort(), meanDurationByKey() (+18 more)

### Community 15 - "API Routes & Reformulate"
Cohesion: 0.09
Nodes (21): claudeProvider, CLAUDE_JSON_PATH, COMPOSER_BINARIES, detectInstallCommand(), extractPrUrl(), ghPrSchema, ghPrStateSchema, ghReviewSchema (+13 more)

### Community 16 - "Stats Aggregation"
Cohesion: 0.19
Nodes (17): loadTree(), saveTree(), storageKey(), applySizes(), collectTerminalIds(), findLeaf(), firstLeafId(), LeafNode (+9 more)

### Community 17 - "Triage & Server Hub"
Cohesion: 0.08
Nodes (25): devDependencies, autoprefixer, class-variance-authority, clsx, concurrently, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities (+17 more)

### Community 18 - "Live Terminal Views"
Cohesion: 0.13
Nodes (9): resolveBaseBranch(), log, ReclaimOutcome, SETUP_PHASES, SlotManagerConfig, resolveTemplatePaths(), TemplatePaths, WorktreeAddressWatcher (+1 more)

### Community 19 - "Stage Progress & Display"
Cohesion: 0.08
Nodes (24): compilerOptions, allowImportingTsExtensions, baseUrl, esModuleInterop, isolatedModules, jsx, lib, module (+16 more)

### Community 20 - "Real Adapter GH/Composer"
Cohesion: 0.19
Nodes (16): PrdReviewDialogProps, QuitConfirmModal(), QuitConfirmModalProps, TerminalsView(), TerminalsViewProps, useTerminalShortcuts(), Button, ButtonProps (+8 more)

### Community 21 - "Store Types & Agent Knobs"
Cohesion: 0.13
Nodes (13): BoardColumn(), BoardColumnProps, DEFAULT_COLLAPSED, familyKeyOf(), groupTicketsByFamily(), isSplitMother(), RenderGroup, resolveAnalyzeAllTitle() (+5 more)

### Community 22 - "DB Row Schemas & Mappers"
Cohesion: 0.15
Nodes (21): formatTokens(), TicketCost(), TicketCostProps, TOKEN_FORMATTER, USD_FORMATTER, AGENT_MODEL_LABELS, costByFamily(), costOf() (+13 more)

### Community 23 - "Dev Dependencies"
Cohesion: 0.07
Nodes (27): Architecture, argus review (native subagent), Backend (routes tool calls, verifies gates), Bun runtime, Channel events (ticket/answer/prd_validated/nudge/user_comment), @anthropic-ai/claude-agent-sdk, Column vs Stage axes, Commands (+19 more)

### Community 24 - "TypeScript Config"
Cohesion: 0.29
Nodes (3): ShortcutDetail, UsePrdSearchOptions, UsePrdSearchResult

### Community 25 - "Client Hub & Watchdog"
Cohesion: 0.13
Nodes (18): StatsViewProps, ACTIVE_BAR, AREA_CURSOR, AXIS_PROPS, BAR_CURSOR, CHART_PALETTE, CostChart(), DurationChart() (+10 more)

### Community 26 - "Cost & Pricing"
Cohesion: 0.15
Nodes (17): log, log, SlotWatch, PROJECT_ROOT, projectConfigSchema, SLOTS_ROOT, buildAppSettingsPatch(), LegacyConfig (+9 more)

### Community 27 - "Workflow View & Lifecycle"
Cohesion: 0.07
Nodes (32): Channel (agent<->backend link), Column (board lane), Contract (pipeline instructions), Coordinator, Done Gate, Kind (ticket pipeline type), Protocol (wire format source of truth), SessionHub (+24 more)

### Community 28 - "Stats Charts"
Cohesion: 0.16
Nodes (8): buildFeasibilityBatchContract(), DRY_RUN_VERDICT, FeasibilityBatchManager, FeasibilitySession, log, toTriageResult(), ProjectConfig, FeasibilityResult

### Community 29 - "Session Hub & Agent Session"
Cohesion: 0.10
Nodes (24): AgentsView(), normalize(), NewTicketDialog(), NAV_ENTRIES, NavEntry, Sidebar(), SidebarProps, SidebarView (+16 more)

### Community 30 - "Agents View & Ticket Cards"
Cohesion: 0.12
Nodes (38): AgentProfileConfigProps, CodexAgentFieldsProps, ImplementationAgentFieldsProps, SessionDriverFieldsProps, mapCommentRow(), mapWorktreeSessionRow(), enrichWorktreeSession(), NewAsk (+30 more)

### Community 31 - "PRD Review & Markdown"
Cohesion: 0.23
Nodes (5): Logger, paint(), ScopedLogger, serializeFields(), timestamp()

### Community 32 - "User Terminal & Fake IO"
Cohesion: 0.07
Nodes (25): AgentCoordinator, BASH_ALLOWLIST, buildFeasibilitySessionConfig(), buildImplementSessionConfig(), buildSplitSessionConfig(), buildTriageSessionConfig(), codexKnobs(), CONTRACT_SKILLS (+17 more)

### Community 33 - "Logging"
Cohesion: 0.10
Nodes (20): scripts, build:desktop, build:web, dev, dev:desktop, dev:proxy, dev:server, dev:web (+12 more)

### Community 34 - "Board Columns"
Cohesion: 0.06
Nodes (46): buildReformulatePrompt(), AgentCard(), AgentCardProps, PROGRESS_BAR_COLORS, StageProgressBar(), StageProgressBarProps, TicketBadges(), projectBadgeStyle() (+38 more)

### Community 35 - "NPM Scripts"
Cohesion: 0.09
Nodes (25): PrdReviewDialog(), resolveProjectColor(), resolveProjectLabel(), AUTHOR_BADGES, AuthorBadge(), CommentRow(), CommentRowProps, isLocked() (+17 more)

### Community 36 - "Runtime Dependencies"
Cohesion: 0.10
Nodes (20): DragHandleAttributes, DragHandleListeners, GeneralSettings(), IMPLEMENTER_OPTIONS, LANGUAGE_OPTIONS, ProfileRowProps, ProfilesSettings(), renderTab() (+12 more)

### Community 37 - "Claude SDK Provider"
Cohesion: 0.11
Nodes (18): dependencies, @anthropic-ai/claude-agent-sdk, dompurify, elysia, marked, @modelcontextprotocol/sdk, nanoid, papaparse (+10 more)

### Community 38 - "Agent Profile Config"
Cohesion: 0.18
Nodes (13): resolveClaudeBinary(), bashCommandSchema, buildSettings(), createSdkAgentSession(), dispatch(), HIDDEN_COMMIT_ATTRIBUTION, pumpStream(), SDK_EFFORTS (+5 more)

### Community 39 - "Agent Coordinator Handlers"
Cohesion: 0.23
Nodes (10): FullscreenToggle(), FullscreenToggleProps, badgeLabelFor(), LiveTerminal(), LiveTerminalOptions, LiveTerminalProps, TerminalData, TerminalView() (+2 more)

### Community 40 - "API Client Inputs"
Cohesion: 0.11
Nodes (16): buildPrdPrompt(), AnalyzeTicketsInput, CreateAskInput, CreateCleanInput, CreateCommentInput, CreateProfileInput, CreateReviewInput, CreateTicketInput (+8 more)

### Community 41 - "Ticket Config & Constants"
Cohesion: 0.14
Nodes (22): AskPanel(), AskPanelProps, CodexAgentFields(), ImplementationAgentFields(), SessionDriverFields(), loadOnce(), subscribers, UNKNOWN_CAPABILITIES (+14 more)

### Community 42 - "Ticket Detail & Triage UI"
Cohesion: 0.23
Nodes (15): buildSplitChannelPrompt(), buildTicketLines(), isEnglish(), buildContractConstraintsLines(), buildResponseFormatLines(), buildStrictRulesLines(), buildTicketLines(), buildTriageChannelPrompt() (+7 more)

### Community 43 - "Demo Pipeline Concepts"
Cohesion: 0.14
Nodes (16): log, runFirstBootSetup(), applyAppSettingsToModels(), initProjectRegistry(), listProjectKeys(), PROJECT_ROOT, RunningServer, serveStaticAsset() (+8 more)

### Community 44 - "Chart Primitives"
Cohesion: 0.16
Nodes (12): AddProjectForm(), AddProjectFormProps, isPositiveIntegerString(), isValidDraft(), ProjectFieldsProps, ProjectRow(), ProjectRowProps, ProjectsSettings() (+4 more)

### Community 45 - "Session Hub Transcript"
Cohesion: 0.15
Nodes (15): applyDesktopEnv(), DesktopRoots, ensureConfig(), boot(), installApplicationMenu(), installMenuShortcutBridge(), menuShortcutActionSchema, newWindowEventSchema (+7 more)

### Community 46 - "Community 46"
Cohesion: 0.27
Nodes (15): Agent Implementation Config, Argus Code Review, Automated Tests (typecheck/lint/test), Claude Code Autonomous Agent, Ticket Contract Injection, Feasibility Analysis, Kanban Board (Atelier), Kanban Agents Demo (demo.gif) (+7 more)

### Community 47 - "Modal Dialogs"
Cohesion: 0.25
Nodes (8): ANSI, COLOR_ENABLED, isLevel(), Level, LEVEL_ORDER, LEVEL_TAG, resolveThreshold(), THRESHOLD

### Community 48 - "Community 48"
Cohesion: 0.21
Nodes (5): TicketBadgesProps, TicketCardProps, WorkflowViewProps, TicketLifecycle, Ticket

### Community 49 - "Slot State"
Cohesion: 0.12
Nodes (32): AgentProfileConfig(), AgentsViewProps, BoardProps, CleanPrPanel(), CleanPrPanelProps, ImportTicketsPanel(), ImportTicketsPanelProps, NewTicketDialogProps (+24 more)

### Community 50 - "Stats Hooks & Cards"
Cohesion: 0.10
Nodes (13): active, ensureNotificationPermission(), getAudioContext(), isSupported(), playNotificationSound(), showDesktopNotification(), Window, BoardStore (+5 more)

### Community 51 - "Community 51"
Cohesion: 0.16
Nodes (12): ChartConfig, ChartContainer, ChartContainerProps, ChartContext, ChartContextValue, ChartLegendContent(), ChartLegendContentProps, ChartTooltipContent() (+4 more)

### Community 52 - "Tick Timer Hook"
Cohesion: 0.22
Nodes (10): AgentSessionOptions, dryRunLog, FAKE_OPEN_PRS, fakeEncoder, GitWorktreeAddOptions, ImportNotionOptions, PaneSize, ReformulateOptions (+2 more)

### Community 53 - "User Terminal Manager"
Cohesion: 0.33
Nodes (5): CONTEXT — domain glossary, Execution, Proposed (not yet built), Seams, Work items

### Community 54 - "Community 54"
Cohesion: 0.24
Nodes (4): mapSlotRow(), BoardState, Slot, WorktreeSession

### Community 56 - "CSV Parsing"
Cohesion: 0.29
Nodes (5): Board(), normalize(), ACTIVE_STAGES, COLUMN_ORDER, COLUMNS

### Community 57 - "Community 57"
Cohesion: 0.31
Nodes (8): UseThemeResult, applyTheme(), getStoredTheme(), isTheme(), Theme, ThemeOption, THEMES, root

### Community 60 - "Package Manifest"
Cohesion: 0.13
Nodes (16): labelWithDefault(), TicketConfigSummary(), AGENT_EFFORT_LABELS, CODEX_EFFORT_LABELS, CODEX_MODEL_LABELS, COLUMN_LABELS, COLUMN_SORT_FIELD, COMMENT_AUTHORS (+8 more)

### Community 61 - "Community 61"
Cohesion: 0.22
Nodes (12): createDatabase(), insertProfile(), migrate(), PROFILE_MIGRATIONS, seedCodexProfile(), seedProfiles(), seedSlots(), TICKET_MIGRATIONS (+4 more)

### Community 62 - "Badge Component"
Cohesion: 0.28
Nodes (7): StatsView(), useStats(), UseStatsResult, StatRecord, StatCard(), StatCardProps, StatEmpty()

### Community 63 - "Community 63"
Cohesion: 0.22
Nodes (7): TERMINAL_THEME, terminalWsUrl(), textEncoder, useXtermSocket, UseXtermSocketOptions, terminalServerMessageSchema, TerminalCellProps

### Community 64 - "Composer Run Script"
Cohesion: 0.48
Nodes (4): PrSelectRow(), PrSelectRowProps, isPrNeedsAttention(), OpenPr

### Community 65 - "Community 65"
Cohesion: 0.31
Nodes (6): DRY_RUN_RESULT, log, PendingSplit, SplitManager, MODELS, SplitResult

### Community 66 - "Community 66"
Cohesion: 0.32
Nodes (6): useTerminals, ShortcutDetail, UseTerminalShortcutsOptions, SplitTreeProps, SplitOrientation, TreeNode

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
Cohesion: 0.33
Nodes (6): WORKER_TOOLS, callBackend(), connect(), pending, PendingCall, server

### Community 71 - "PostCSS Config"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 72 - "Community 72"
Cohesion: 0.48
Nodes (6): groupOrientation(), layoutToSizes(), panelId(), panelPercent(), SplitTree(), TerminalCell()

### Community 73 - "React Root Mount"
Cohesion: 0.50
Nodes (4): Claude binary resolution (KANBAN_CLAUDE_BINARY), Config split (config.json vs env), Databases (kanban.db / kanban-real.db), Electrobun desktop app

### Community 74 - "Theme Flash Guard"
Cohesion: 0.50
Nodes (4): ClientHub (broadcasts board snapshots), No type casting convention, rows.ts (zod row validation), store.ts single DB mutation point

### Community 75 - "Community 75"
Cohesion: 1.00
Nodes (4): Dry-run safety model, FakeSystemAdapter, RealSystemAdapter, SystemAdapter (side-effect boundary)

### Community 76 - "Community 76"
Cohesion: 0.33
Nodes (4): CsvParseError, ParsedTicketRow, ParsedTicketsCsv, parseTicketsCsv()

### Community 79 - "Community 79"
Cohesion: 0.50
Nodes (3): ColumnActionsMenu(), ColumnActionsMenuProps, ColumnMenuItem

## Knowledge Gaps
- **415 isolated node(s):** `IMPLEMENTER_SAFE_TOOLS`, `CONTRACT_SKILLS`, `NO_SKILLS`, `READONLY_TOOLS`, `READONLY_PLAIN_DISALLOWED` (+410 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Ticket` connect `Community 48` to `Contract Building & Slots`, `Terminals UI & Notifications`, `Desktop Bootstrap & Menus`, `Fake System Adapter`, `Shared Zod Schemas`, `PR Selection & Slots Bar`, `Slot Config & Worktree Watch`, `Database Store Operations`, `Live Terminal Views`, `Store Types & Agent Knobs`, `DB Row Schemas & Mappers`, `Cost & Pricing`, `Session Hub & Agent Session`, `Agents View & Ticket Cards`, `User Terminal & Fake IO`, `Board Columns`, `NPM Scripts`, `API Client Inputs`, `Ticket Detail & Triage UI`, `Slot State`, `Stats Hooks & Cards`, `Community 54`, `CSV Parsing`, `File Uploads`, `Package Manifest`?**
  _High betweenness centrality (0.077) - this node is a cross-community bridge._
- **Why does `Store` connect `Shared Zod Schemas` to `Terminals UI & Notifications`, `Community 65`, `File Uploads`, `Fake System Adapter`, `Ticket Action Panels`, `Settings & Profiles UI`, `PR Selection & Slots Bar`, `Demo Pipeline Concepts`, `Database Store Operations`, `Live Terminal Views`, `Community 54`, `Community 55`, `Cost & Pricing`, `Webhook MCP`, `Stats Charts`, `Agents View & Ticket Cards`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Why does `RealSystemAdapter` connect `Real System Adapter` to `Composer Run Script`, `Terminals UI & Notifications`, `Ticket Action Panels`, `Agent Profile Config`, `Board & Sidebar Layout`, `API Routes & Reformulate`, `Tick Timer Hook`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **What connects `IMPLEMENTER_SAFE_TOOLS`, `CONTRACT_SKILLS`, `NO_SKILLS` to the rest of the system?**
  _418 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Terminals UI & Notifications` be split into smaller, more focused modules?**
  _Cohesion score 0.07957957957957958 - nodes in this community are weakly interconnected._
- **Should `Desktop Bootstrap & Menus` be split into smaller, more focused modules?**
  _Cohesion score 0.045454545454545456 - nodes in this community are weakly interconnected._
- **Should `Feasibility Batch Management` be split into smaller, more focused modules?**
  _Cohesion score 0.08879492600422834 - nodes in this community are weakly interconnected._