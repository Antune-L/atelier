# Graph Report - slot-1  (2026-06-29)

## Corpus Check
- 149 files · ~637,031 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1484 nodes · 3445 edges · 81 communities (70 shown, 11 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 16 edges (avg confidence: 0.82)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4f9f07c2`
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
- [[_COMMUNITY_Vite Config|Vite Config]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_No-Type-Casting Convention|No-Type-Casting Convention]]
- [[_COMMUNITY_React Root Mount|React Root Mount]]
- [[_COMMUNITY_Theme Flash Guard|Theme Flash Guard]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 82|Community 82]]
- [[_COMMUNITY_Community 85|Community 85]]
- [[_COMMUNITY_Community 89|Community 89]]

## God Nodes (most connected - your core abstractions)
1. `Ticket` - 70 edges
2. `Store` - 65 edges
3. `cn()` - 51 edges
4. `RealSystemAdapter` - 50 edges
5. `SlotManager` - 45 edges
6. `FakeSystemAdapter` - 43 edges
7. `ProjectInfo` - 39 edges
8. `getProject()` - 30 edges
9. `ClientHub` - 30 edges
10. `isProjectKey()` - 28 edges

## Surprising Connections (you probably didn't know these)
- `boot()` --calls--> `startServer()`  [INFERRED]
  desktop/index.ts → src/server/index.ts
- `Dry-run safety model` --rationale_for--> `Atelier (kanban-agents project)`  [INFERRED]
  AGENTS.md → README.md
- `Kind (ticket pipeline type)` --conceptually_related_to--> `argus (argus-review) skill`  [INFERRED]
  CONTEXT.md → README.md
- `Kind (ticket pipeline type)` --conceptually_related_to--> `minos-pr-feedback skill`  [INFERRED]
  CONTEXT.md → README.md
- `Contract (pipeline instructions)` --references--> `argus (argus-review) skill`  [EXTRACTED]
  CONTEXT.md → README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **System Adapter side-effect seam** — context_system_adapter, agents_fakesystemadapter, agents_realsystemadapter, agents_dry_run_safety_model [EXTRACTED 1.00]
- **Slot lifecycle flow** — context_slotmanager, context_slot, context_sessionhub, context_contract, context_done_gate [EXTRACTED 1.00]
- **Skills referenced by the pipeline contract** — context_contract, readme_paris_research, readme_argus_review, readme_regression_check, readme_mockup_fidelity_review, readme_minos_pr_feedback, readme_composer_implement [EXTRACTED 1.00]
- **Autonomous Implementation Flow** — docs_demo_claude_code_agent, docs_demo_stage_machine, docs_demo_argus_review, docs_demo_automated_tests, docs_demo_pull_request [EXTRACTED 1.00]
- **Ticket-to-PR End-to-End Pipeline** — docs_demo_kanban_board, docs_demo_ticket_creation, docs_demo_feasibility_analysis, docs_demo_claude_code_agent, docs_demo_pull_request [EXTRACTED 1.00]

## Communities (81 total, 11 thin omitted)

### Community 0 - "Contract Building & Slots"
Cohesion: 0.16
Nodes (3): SlotManager, slotPath(), slugify()

### Community 1 - "Terminals UI & Notifications"
Cohesion: 0.12
Nodes (13): resolveBaseBranch(), log, runFirstBootSetup(), AppConfig, config, configSchema, DEFAULT_MODELS, PROJECT_KEYS (+5 more)

### Community 2 - "Desktop Bootstrap & Menus"
Cohesion: 0.23
Nodes (10): dataMessage(), log, normalizeSeed(), send(), TerminalSession, TerminalSocket, TerminalSocketData, visibleText() (+2 more)

### Community 3 - "Feasibility Batch Management"
Cohesion: 0.15
Nodes (8): buildFeasibilityBatchContract(), DRY_RUN_VERDICT, FeasibilityBatchManager, FeasibilitySession, log, toTriageResult(), ProjectConfig, FeasibilityResult

### Community 4 - "Ticket Action Panels"
Cohesion: 0.16
Nodes (6): AgentsViewProps, TicketBadgesProps, TicketCardProps, TicketLifecycle, Stage, Ticket

### Community 5 - "Fake System Adapter"
Cohesion: 0.09
Nodes (4): delay(), fakeShellPrompt(), FakeSystemAdapter, hexToBytes()

### Community 6 - "Shared Zod Schemas"
Cohesion: 0.05
Nodes (49): AnalyzeTicketsInput, appSettingsSchema, baseBranchSchema, capabilitiesSchema, commentAuthorSchema, commentSchema, CreateAskInput, CreateCleanInput (+41 more)

### Community 7 - "Settings & Profiles UI"
Cohesion: 0.50
Nodes (3): emit(), refreshProfiles(), subscribers

### Community 8 - "PR Selection & Slots Bar"
Cohesion: 0.08
Nodes (23): SlotsBar(), SlotsBarProps, Stat(), StatProps, STATUS_LABELS, TICKET_OPTION, TicketOptionsToggleGroup(), TicketOptionsToggleGroupProps (+15 more)

### Community 9 - "Real System Adapter"
Cohesion: 0.09
Nodes (3): RealSystemAdapter, safeJsonParse(), DoneGateResult

### Community 10 - "Slot Config & Worktree Watch"
Cohesion: 0.11
Nodes (24): AskPanelProps, CleanPrPanel(), CleanPrPanelProps, ImportTicketsPanelProps, NewTicketDialogProps, ProjectPrPicker(), ProjectPrPickerProps, ProjectSelectProps (+16 more)

### Community 11 - "Core Domain Concepts"
Cohesion: 0.08
Nodes (31): Bun runtime, @anthropic-ai/claude-agent-sdk, Composer 2.5 implementer path, Dry-run safety model, FakeSystemAdapter, RealSystemAdapter, Channel (agent<->backend link), Column (board lane) (+23 more)

### Community 12 - "Board & Sidebar Layout"
Cohesion: 0.11
Nodes (12): log, ReclaimOutcome, SETUP_PHASES, SlotManagerConfig, resolveTemplatePaths(), TemplatePaths, log, SlotWatch (+4 more)

### Community 13 - "Database Store Operations"
Cohesion: 0.13
Nodes (3): mapProfileRow(), Store, Profile

### Community 14 - "Coordinator & Protocol"
Cohesion: 0.08
Nodes (26): addUsageByModel(), log, ToolHandler, ToolResult, toUsageByModel(), AgentSettableStage, agentSettableStageSchema, askUserArgsSchema (+18 more)

### Community 15 - "API Routes & Reformulate"
Cohesion: 0.06
Nodes (26): buildNotionImportPrompt(), buildPrdPrompt(), failSplitMother(), log, PaneReader, performSplit(), splitMotherBranch(), analyzeTicketsSchema (+18 more)

### Community 16 - "Stats Aggregation"
Cohesion: 0.10
Nodes (26): effectiveWorkDurationMs(), costByModel(), costByProject(), CostGroup, DurationGroup, KIND_LABELS, KindCount, kindCounts() (+18 more)

### Community 17 - "Triage & Server Hub"
Cohesion: 0.15
Nodes (12): PROJECT_ROOT, RunningServer, serveStaticAsset(), SocketData, startServer(), StartServerOptions, STATIC_CONTENT_TYPES, staticResponse() (+4 more)

### Community 18 - "Live Terminal Views"
Cohesion: 0.16
Nodes (13): ImportTicketsPanel(), NewTicketDialog(), Tab, TAB_TITLES, TabButtonProps, ProjectSelect(), WorktreePanel(), api (+5 more)

### Community 19 - "Stage Progress & Display"
Cohesion: 0.12
Nodes (15): AgentCardProps, AgentsView(), normalize(), FullscreenToggle(), FullscreenToggleProps, TerminalData, TerminalView(), TerminalViewProps (+7 more)

### Community 20 - "Real Adapter GH/Composer"
Cohesion: 0.15
Nodes (10): dryRunLog, FAKE_OPEN_PRS, fakeEncoder, GitWorktreeAddOptions, ImportNotionOptions, PaneSize, ReformulateOptions, ReviewDoneOptions (+2 more)

### Community 21 - "Store Types & Agent Knobs"
Cohesion: 0.21
Nodes (18): buildAskContract(), buildCleanContract(), buildConflictResolutionContract(), buildFeasibilityContextSection(), buildImplementingSteps(), buildPlanningStep(), buildReviewContract(), buildReviewFixLines() (+10 more)

### Community 22 - "DB Row Schemas & Mappers"
Cohesion: 0.08
Nodes (25): CommentRow, commentRowSchema, mapTicketRow(), parseSessionUsage(), ProfileRow, profileRowSchema, projectSchema, SlotRow (+17 more)

### Community 23 - "Dev Dependencies"
Cohesion: 0.08
Nodes (25): devDependencies, autoprefixer, class-variance-authority, clsx, concurrently, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities (+17 more)

### Community 24 - "TypeScript Config"
Cohesion: 0.08
Nodes (24): compilerOptions, allowImportingTsExtensions, baseUrl, esModuleInterop, isolatedModules, jsx, lib, module (+16 more)

### Community 25 - "Client Hub & Watchdog"
Cohesion: 0.13
Nodes (14): badgeLabelFor(), LiveTerminal(), LiveTerminalOptions, LiveTerminalProps, WorktreeSessionsView(), WorktreeSessionsViewProps, TERMINAL_THEME, terminalWsUrl() (+6 more)

### Community 26 - "Cost & Pricing"
Cohesion: 0.15
Nodes (21): formatTokens(), TicketCost(), TicketCostProps, TOKEN_FORMATTER, USD_FORMATTER, AGENT_MODEL_LABELS, costByFamily(), costOf() (+13 more)

### Community 27 - "Workflow View & Lifecycle"
Cohesion: 0.12
Nodes (30): AgentProfileConfigProps, ImplementationAgentFieldsProps, mapCommentRow(), mapWorktreeSessionRow(), enrichWorktreeSession(), NewAsk, NewClean, NewProfile (+22 more)

### Community 28 - "Stats Charts"
Cohesion: 0.11
Nodes (20): StatsViewProps, StatCard(), StatEmpty(), ACTIVE_BAR, AREA_CURSOR, AXIS_PROPS, BAR_CURSOR, CHART_PALETTE (+12 more)

### Community 29 - "Session Hub & Agent Session"
Cohesion: 0.11
Nodes (4): AgentCoordinator, SessionHub, SessionToolCall, WorkerToolName

### Community 31 - "PRD Review & Markdown"
Cohesion: 0.13
Nodes (27): AgentCard(), PROGRESS_BAR_COLORS, StageProgressBar(), StageProgressBarProps, projectBadgeStyle(), TicketCard(), TriageDot(), useTickTimer() (+19 more)

### Community 32 - "User Terminal & Fake IO"
Cohesion: 0.22
Nodes (5): mapSlotRow(), ClientSocket, ClientSocketData, Slot, WorktreeSession

### Community 33 - "Logging"
Cohesion: 0.14
Nodes (13): ANSI, COLOR_ENABLED, isLevel(), Level, LEVEL_ORDER, LEVEL_TAG, Logger, paint() (+5 more)

### Community 34 - "Board Columns"
Cohesion: 0.11
Nodes (17): BoardColumn(), BoardColumnProps, DEFAULT_COLLAPSED, familyKeyOf(), groupTicketsByFamily(), isSplitMother(), RenderGroup, resolveAnalyzeAllTitle() (+9 more)

### Community 35 - "NPM Scripts"
Cohesion: 0.10
Nodes (20): scripts, build:desktop, build:web, dev, dev:desktop, dev:proxy, dev:server, dev:web (+12 more)

### Community 36 - "Runtime Dependencies"
Cohesion: 0.11
Nodes (18): dependencies, @anthropic-ai/claude-agent-sdk, dompurify, elysia, marked, @modelcontextprotocol/sdk, nanoid, papaparse (+10 more)

### Community 38 - "Agent Profile Config"
Cohesion: 0.33
Nodes (4): CsvParseError, ParsedTicketRow, ParsedTicketsCsv, parseTicketsCsv()

### Community 39 - "Agent Coordinator Handlers"
Cohesion: 0.07
Nodes (22): Board(), BoardProps, normalize(), Toaster(), useBoard(), active, ensureNotificationPermission(), getAudioContext() (+14 more)

### Community 41 - "Ticket Config & Constants"
Cohesion: 0.10
Nodes (29): LiveSession, log, previewToolInput(), renderSessionEvent(), SessionHubHandlers, SessionStartConfig, WORKER_TOOLS, AgentPermissionMode (+21 more)

### Community 42 - "Ticket Detail & Triage UI"
Cohesion: 0.17
Nodes (14): PrdReviewDialog(), AUTHOR_BADGES, CommentRow(), CommentRowProps, isLocked(), TicketDetail(), TicketDetailProps, TriageSection() (+6 more)

### Community 43 - "Demo Pipeline Concepts"
Cohesion: 0.27
Nodes (15): Agent Implementation Config, Argus Code Review, Automated Tests (typecheck/lint/test), Claude Code Autonomous Agent, Ticket Contract Injection, Feasibility Analysis, Kanban Board (Atelier), Kanban Agents Demo (demo.gif) (+7 more)

### Community 44 - "Chart Primitives"
Cohesion: 0.14
Nodes (12): SettingsModal(), NAV_ENTRIES, NavEntry, Sidebar(), SidebarProps, SidebarView, loadOnce(), subscribers (+4 more)

### Community 45 - "Session Hub Transcript"
Cohesion: 0.11
Nodes (28): loadTree(), saveTree(), storageKey(), useTerminals, ShortcutDetail, UseTerminalShortcutsOptions, groupOrientation(), layoutToSizes() (+20 more)

### Community 46 - "Community 46"
Cohesion: 0.12
Nodes (16): labelWithDefault(), TicketConfigSummary(), AGENT_EFFORT_LABELS, COLUMN_LABELS, COLUMN_SORT_FIELD, COMMENT_AUTHORS, IMPLEMENTER_LABELS, ProfileConfig (+8 more)

### Community 47 - "Modal Dialogs"
Cohesion: 0.11
Nodes (25): PrdReviewDialogProps, QuitConfirmModalProps, DragHandleAttributes, DragHandleListeners, GeneralSettings(), IMPLEMENTER_OPTIONS, LANGUAGE_OPTIONS, ProfileRowProps (+17 more)

### Community 48 - "Community 48"
Cohesion: 0.22
Nodes (11): PrdAnnotator(), PrdAnnotatorProps, PrdView(), AnnotatedHtml, compileFeedback(), injectAnnotations(), isInsideAnnotation(), PrdAnnotation (+3 more)

### Community 49 - "Slot State"
Cohesion: 0.16
Nodes (12): ChartConfig, ChartContainer, ChartContainerProps, ChartContext, ChartContextValue, ChartLegendContent(), ChartLegendContentProps, ChartTooltipContent() (+4 more)

### Community 50 - "Stats Hooks & Cards"
Cohesion: 0.07
Nodes (39): BASH_ALLOWLIST, buildFeasibilitySessionConfig(), buildImplementSessionConfig(), buildSplitSessionConfig(), buildTriageSessionConfig(), DENIED_BUILTIN_AGENTS, feasibilityScoutAgent(), FeasibilitySessionInput (+31 more)

### Community 51 - "Community 51"
Cohesion: 0.11
Nodes (6): log, Watchdog, ClientHub, NativeNotify, Notifier, ACTIVE_STAGES

### Community 52 - "Tick Timer Hook"
Cohesion: 0.16
Nodes (6): DRY_RUN_VERDICT, log, TriageManager, TriageSession, TRIAGE_VERDICT_LABELS, TriageResult

### Community 54 - "Community 54"
Cohesion: 0.27
Nodes (9): UseThemeResult, applyTheme(), getStoredTheme(), isTheme(), Theme, ThemeOption, THEMES, App() (+1 more)

### Community 55 - "Community 55"
Cohesion: 0.40
Nodes (6): nextWeek(), outcomeCounts(), projectCounts(), recordOutcome(), startOfWeek(), weeklyThroughput

### Community 56 - "CSV Parsing"
Cohesion: 0.67
Nodes (3): mergePaths(), PATH_PROBE_COMMAND, repairPath()

### Community 57 - "Community 57"
Cohesion: 0.50
Nodes (4): StatsView(), useStats(), UseStatsResult, StatRecord

### Community 58 - "File Uploads"
Cohesion: 0.17
Nodes (12): applyDesktopEnv(), DesktopRoots, ensureConfig(), boot(), installApplicationMenu(), installMenuShortcutBridge(), menuShortcutActionSchema, newWindowEventSchema (+4 more)

### Community 59 - "Webhook MCP"
Cohesion: 0.33
Nodes (3): listeners, mcp, ReplyArgsSchema

### Community 60 - "Package Manifest"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 61 - "Community 61"
Cohesion: 0.48
Nodes (4): PrSelectRow(), PrSelectRowProps, isPrNeedsAttention(), OpenPr

### Community 62 - "Badge Component"
Cohesion: 0.09
Nodes (20): CLAUDE_JSON_PATH, COMPOSER_BINARIES, detectInstallCommand(), extractPrUrl(), ghPrSchema, ghPrStateSchema, ghReviewSchema, ghReviewsSchema (+12 more)

### Community 63 - "Community 63"
Cohesion: 0.33
Nodes (3): COLUMN_NODE_COLOR, WorkflowView(), WorkflowViewProps

### Community 66 - "Community 66"
Cohesion: 0.33
Nodes (4): currentNow, startTicking(), subscribe(), subscribers

### Community 76 - "Community 76"
Cohesion: 0.40
Nodes (5): MIME_EXTENSIONS, resolveExtension(), SavedUpload, saveUpload(), serveUpload()

### Community 77 - "Community 77"
Cohesion: 0.16
Nodes (19): AgentProfileConfig(), AskPanel(), ImplementationAgentFields(), ProfilesSettings(), loadOnce(), subscribers, UNKNOWN_CAPABILITIES, useCapabilities() (+11 more)

### Community 81 - "Community 81"
Cohesion: 0.17
Nodes (3): FakePaneStream, RealPaneStream, PaneStream

### Community 82 - "Community 82"
Cohesion: 0.31
Nodes (8): createDatabase(), migrate(), PROFILE_MIGRATIONS, seedProfiles(), seedSlots(), TICKET_MIGRATIONS, DEFAULT_PROFILES, SLOT_COUNT

## Knowledge Gaps
- **375 isolated node(s):** `SortDir`, `DEFAULT_COLLAPSED`, `RenderGroup`, `log`, `PaneReader` (+370 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Ticket` connect `Ticket Action Panels` to `Contract Building & Slots`, `Terminals UI & Notifications`, `Shared Zod Schemas`, `Board & Sidebar Layout`, `Database Store Operations`, `API Routes & Reformulate`, `Stage Progress & Display`, `Store Types & Agent Knobs`, `DB Row Schemas & Mappers`, `Cost & Pricing`, `Workflow View & Lifecycle`, `PRD Review & Markdown`, `User Terminal & Fake IO`, `Board Columns`, `Agent Coordinator Handlers`, `API Client Inputs`, `Ticket Detail & Triage UI`, `Chart Primitives`, `Community 46`, `Stats Hooks & Cards`, `Community 51`, `Community 63`, `Community 89`?**
  _High betweenness centrality (0.066) - this node is a cross-community bridge._
- **Why does `RealSystemAdapter` connect `Real System Adapter` to `Ticket Config & Constants`, `Community 81`, `Real Adapter GH/Composer`, `Community 61`, `Badge Component`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **Why does `Store` connect `Database Store Operations` to `User Terminal & Fake IO`, `Terminals UI & Notifications`, `Desktop Bootstrap & Menus`, `Feasibility Batch Management`, `Ticket Action Panels`, `API Client Inputs`, `Board & Sidebar Layout`, `Coordinator & Protocol`, `API Routes & Reformulate`, `Triage & Server Hub`, `Stats Hooks & Cards`, `Community 51`, `Tick Timer Hook`, `Store Types & Agent Knobs`, `Community 85`, `DB Row Schemas & Mappers`, `Workflow View & Lifecycle`, `Agents View & Ticket Cards`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **What connects `SortDir`, `DEFAULT_COLLAPSED`, `RenderGroup` to the rest of the system?**
  _376 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Terminals UI & Notifications` be split into smaller, more focused modules?**
  _Cohesion score 0.11695906432748537 - nodes in this community are weakly interconnected._
- **Should `Fake System Adapter` be split into smaller, more focused modules?**
  _Cohesion score 0.08879492600422834 - nodes in this community are weakly interconnected._
- **Should `Shared Zod Schemas` be split into smaller, more focused modules?**
  _Cohesion score 0.047895500725689405 - nodes in this community are weakly interconnected._