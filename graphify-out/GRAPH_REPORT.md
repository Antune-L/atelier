# Graph Report - slot-1  (2026-06-27)

## Corpus Check
- 140 files · ~631,235 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1422 nodes · 3277 edges · 73 communities (60 shown, 13 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 16 edges (avg confidence: 0.82)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `58fc13c2`
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
- [[_COMMUNITY_Triage Prompts & Mockups|Triage Prompts & Mockups]]
- [[_COMMUNITY_Modal Dialogs|Modal Dialogs]]
- [[_COMMUNITY_DB Migrations & Seeds|DB Migrations & Seeds]]
- [[_COMMUNITY_Slot State|Slot State]]
- [[_COMMUNITY_Stats Hooks & Cards|Stats Hooks & Cards]]
- [[_COMMUNITY_Worktree Session Store|Worktree Session Store]]
- [[_COMMUNITY_Tick Timer Hook|Tick Timer Hook]]
- [[_COMMUNITY_User Terminal Manager|User Terminal Manager]]
- [[_COMMUNITY_Worktree Address Watcher|Worktree Address Watcher]]
- [[_COMMUNITY_App Settings Store|App Settings Store]]
- [[_COMMUNITY_CSV Parsing|CSV Parsing]]
- [[_COMMUNITY_Cost Aggregation|Cost Aggregation]]
- [[_COMMUNITY_File Uploads|File Uploads]]
- [[_COMMUNITY_Webhook MCP|Webhook MCP]]
- [[_COMMUNITY_Package Manifest|Package Manifest]]
- [[_COMMUNITY_Fake Pane Stream|Fake Pane Stream]]
- [[_COMMUNITY_Badge Component|Badge Component]]
- [[_COMMUNITY_Composer Run Script|Composer Run Script]]
- [[_COMMUNITY_Vite Config|Vite Config]]
- [[_COMMUNITY_No-Type-Casting Convention|No-Type-Casting Convention]]
- [[_COMMUNITY_React Root Mount|React Root Mount]]
- [[_COMMUNITY_Theme Flash Guard|Theme Flash Guard]]

## God Nodes (most connected - your core abstractions)
1. `Ticket` - 67 edges
2. `Store` - 62 edges
3. `cn()` - 49 edges
4. `RealSystemAdapter` - 47 edges
5. `SlotManager` - 45 edges
6. `FakeSystemAdapter` - 41 edges
7. `ProjectInfo` - 39 edges
8. `ClientHub` - 29 edges
9. `getProject()` - 28 edges
10. `isProjectKey()` - 26 edges

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

## Communities (73 total, 13 thin omitted)

### Community 0 - "Contract Building & Slots"
Cohesion: 0.06
Nodes (41): buildAskContract(), buildCleanContract(), buildConflictResolutionContract(), buildFeasibilityContextSection(), buildImplementingSteps(), buildPlanningStep(), buildReviewContract(), buildReviewFixLines() (+33 more)

### Community 1 - "Terminals UI & Notifications"
Cohesion: 0.05
Nodes (46): FullscreenToggle(), FullscreenToggleProps, badgeLabelFor(), LiveTerminal(), LiveTerminalOptions, LiveTerminalProps, TerminalData, TerminalView() (+38 more)

### Community 2 - "Desktop Bootstrap & Menus"
Cohesion: 0.10
Nodes (14): dataMessage(), log, normalizeSeed(), safeParse(), send(), TerminalSession, TerminalSessionManager, TerminalSocket (+6 more)

### Community 3 - "Feasibility Batch Management"
Cohesion: 0.16
Nodes (8): buildFeasibilityBatchContract(), DRY_RUN_VERDICT, FeasibilityBatchManager, FeasibilitySession, log, toTriageResult(), ProjectConfig, FeasibilityResult

### Community 4 - "Ticket Action Panels"
Cohesion: 0.12
Nodes (20): AskPanelProps, ImportTicketsPanel(), ImportTicketsPanelProps, NewTicketDialog(), NewTicketDialogProps, Tab, TAB_TITLES, TabButtonProps (+12 more)

### Community 5 - "Fake System Adapter"
Cohesion: 0.10
Nodes (3): delay(), fakeShellPrompt(), FakeSystemAdapter

### Community 6 - "Shared Zod Schemas"
Cohesion: 0.06
Nodes (34): appSettingsSchema, baseBranchSchema, capabilitiesSchema, commentAuthorSchema, commentSchema, CreateTerminalBody, EXTERNAL_URL_PROTOCOLS, externalUrlSchema (+26 more)

### Community 7 - "Settings & Profiles UI"
Cohesion: 0.09
Nodes (23): DragHandleAttributes, DragHandleListeners, GeneralSettings(), IMPLEMENTER_OPTIONS, LANGUAGE_OPTIONS, ProfileRowProps, SettingsModalProps, SettingsTab (+15 more)

### Community 8 - "PR Selection & Slots Bar"
Cohesion: 0.16
Nodes (12): SlotsBarProps, Stat(), StatProps, STATUS_LABELS, cn(), Select, Switch, SwitchProps (+4 more)

### Community 9 - "Real System Adapter"
Cohesion: 0.09
Nodes (4): RealSystemAdapter, safeJsonParse(), DoneGateResult, ReviewDoneOptions

### Community 10 - "Slot Config & Worktree Watch"
Cohesion: 0.29
Nodes (5): DRY_RUN_VERDICT, log, TriageSession, getErrorMessage(), TRIAGE_VERDICT_LABELS

### Community 11 - "Core Domain Concepts"
Cohesion: 0.08
Nodes (31): Bun runtime, @anthropic-ai/claude-agent-sdk, Composer 2.5 implementer path, Dry-run safety model, FakeSystemAdapter, RealSystemAdapter, Channel (agent<->backend link), Column (board lane) (+23 more)

### Community 12 - "Board & Sidebar Layout"
Cohesion: 0.11
Nodes (15): SettingsModal(), NAV_ENTRIES, NavEntry, Sidebar(), SidebarProps, SidebarView, SlotsBar(), loadOnce() (+7 more)

### Community 14 - "Coordinator & Protocol"
Cohesion: 0.06
Nodes (29): addUsageByModel(), AgentCoordinator, log, ToolHandler, ToolResult, toUsageByModel(), SessionToolCall, TRIAGE_VERDICTS (+21 more)

### Community 15 - "API Routes & Reformulate"
Cohesion: 0.08
Nodes (18): log, PaneReader, analyzeTicketsSchema, createAskSchema, createCleanSchema, createCommentSchema, createProfileSchema, createReviewSchema (+10 more)

### Community 16 - "Stats Aggregation"
Cohesion: 0.10
Nodes (26): effectiveWorkDurationMs(), CostGroup, DurationGroup, KIND_LABELS, KindCount, kindCounts(), meanDurationByEffort(), meanDurationByKey() (+18 more)

### Community 17 - "Triage & Server Hub"
Cohesion: 0.10
Nodes (15): log, Watchdog, ClientSocket, ClientSocketData, PROJECT_ROOT, RunningServer, serveStaticAsset(), SocketData (+7 more)

### Community 18 - "Live Terminal Views"
Cohesion: 0.15
Nodes (22): AgentsViewProps, CleanPrPanel(), CleanPrPanelProps, ProjectPrPicker(), ProjectPrPickerProps, QuitConfirmModal(), ReviewPrPanel(), ReviewPrPanelProps (+14 more)

### Community 19 - "Stage Progress & Display"
Cohesion: 0.06
Nodes (57): buildContractConstraintsLines(), buildResponseFormatLines(), buildStrictRulesLines(), buildTicketLines(), buildTriageChannelPrompt(), buildTriagePlusChannelPrompt(), isEnglish(), AgentCard() (+49 more)

### Community 20 - "Real Adapter GH/Composer"
Cohesion: 0.10
Nodes (18): CLAUDE_JSON_PATH, COMPOSER_BINARIES, detectInstallCommand(), extractPrUrl(), ghPrSchema, ghPrStateSchema, ghReviewSchema, ghReviewsSchema (+10 more)

### Community 21 - "Store Types & Agent Knobs"
Cohesion: 0.15
Nodes (16): mapCommentRow(), NewAsk, NewClean, NewReview, SlotStatus, SqlBindValue, SqlUpdateBuilder, TicketPatch (+8 more)

### Community 22 - "DB Row Schemas & Mappers"
Cohesion: 0.09
Nodes (22): CommentRow, commentRowSchema, mapTicketRow(), parseSessionUsage(), ProfileRow, profileRowSchema, projectSchema, SlotRow (+14 more)

### Community 23 - "Dev Dependencies"
Cohesion: 0.08
Nodes (25): devDependencies, autoprefixer, class-variance-authority, clsx, concurrently, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities (+17 more)

### Community 24 - "TypeScript Config"
Cohesion: 0.08
Nodes (24): compilerOptions, allowImportingTsExtensions, baseUrl, esModuleInterop, isolatedModules, jsx, lib, module (+16 more)

### Community 26 - "Cost & Pricing"
Cohesion: 0.16
Nodes (20): formatTokens(), TicketCost(), TicketCostProps, TOKEN_FORMATTER, USD_FORMATTER, costByFamily(), costOf(), costOfModel() (+12 more)

### Community 27 - "Workflow View & Lifecycle"
Cohesion: 0.16
Nodes (5): resolveBaseBranch(), TicketBadgesProps, TicketCardProps, TicketLifecycle, Ticket

### Community 28 - "Stats Charts"
Cohesion: 0.13
Nodes (18): StatsViewProps, ACTIVE_BAR, AREA_CURSOR, AXIS_PROPS, BAR_CURSOR, CHART_PALETTE, CostChart(), DurationChart() (+10 more)

### Community 29 - "Session Hub & Agent Session"
Cohesion: 0.13
Nodes (18): LiveSession, log, previewToolInput(), renderChannelEvent(), renderSessionEvent(), SessionHubHandlers, SessionStartConfig, createLogger() (+10 more)

### Community 30 - "Agents View & Ticket Cards"
Cohesion: 0.13
Nodes (18): BASH_ALLOWLIST, buildFeasibilitySessionConfig(), buildImplementSessionConfig(), buildTriageSessionConfig(), DENIED_BUILTIN_AGENTS, feasibilityScoutAgent(), FeasibilitySessionInput, IMPLEMENTER_SAFE_TOOLS (+10 more)

### Community 31 - "PRD Review & Markdown"
Cohesion: 0.18
Nodes (8): ABSOLUTE_UPLOAD_PATH, ImageLightboxProps, LightboxImage, Markdown(), MarkdownProps, OPEN_KEYS, purifier, renderMarkdownToSafeHtml()

### Community 32 - "User Terminal & Fake IO"
Cohesion: 0.11
Nodes (9): dryRunLog, FAKE_OPEN_PRS, fakeEncoder, FakePaneStream, hexToBytes(), GitWorktreeAddOptions, PaneSize, ReformulateOptions (+1 more)

### Community 33 - "Logging"
Cohesion: 0.14
Nodes (13): ANSI, COLOR_ENABLED, isLevel(), Level, LEVEL_ORDER, LEVEL_TAG, Logger, paint() (+5 more)

### Community 34 - "Board Columns"
Cohesion: 0.12
Nodes (14): BoardColumn(), BoardColumnProps, DEFAULT_COLLAPSED, resolveAnalyzeAllTitle(), resolveCheckAllTitle(), resolveMoveAllTitle(), SortDir, useWindowedTickets() (+6 more)

### Community 35 - "NPM Scripts"
Cohesion: 0.10
Nodes (20): scripts, build:desktop, build:web, dev, dev:desktop, dev:proxy, dev:server, dev:web (+12 more)

### Community 36 - "Runtime Dependencies"
Cohesion: 0.11
Nodes (18): dependencies, @anthropic-ai/claude-agent-sdk, dompurify, elysia, marked, @modelcontextprotocol/sdk, nanoid, papaparse (+10 more)

### Community 37 - "Claude SDK Provider"
Cohesion: 0.16
Nodes (16): WORKER_TOOLS, AgentProvider, resolveClaudeBinary(), bashCommandSchema, buildSettings(), claudeProvider, createSdkAgentSession(), dispatch() (+8 more)

### Community 38 - "Agent Profile Config"
Cohesion: 0.07
Nodes (45): AgentProfileConfig(), AgentProfileConfigProps, AskPanel(), ImplementationAgentFields(), ImplementationAgentFieldsProps, ProfilesSettings(), labelWithDefault(), TicketConfigSummary() (+37 more)

### Community 39 - "Agent Coordinator Handlers"
Cohesion: 0.19
Nodes (10): active, ensureNotificationPermission(), getAudioContext(), isSupported(), playNotificationSound(), showDesktopNotification(), Window, CommentListener (+2 more)

### Community 40 - "API Client Inputs"
Cohesion: 0.11
Nodes (15): AnalyzeTicketsInput, Comment, CreateAskInput, CreateCleanInput, CreateCommentInput, CreateProfileInput, CreateReviewInput, CreateTicketInput (+7 more)

### Community 41 - "Ticket Config & Constants"
Cohesion: 0.18
Nodes (3): BoardStore, Listener, WsClientEvent

### Community 42 - "Ticket Detail & Triage UI"
Cohesion: 0.12
Nodes (14): AUTHOR_BADGES, CommentRow(), CommentRowProps, TicketDetailProps, TriageSection(), TriageSectionProps, TICKET_OPTION, TicketOptionsToggleGroup() (+6 more)

### Community 43 - "Demo Pipeline Concepts"
Cohesion: 0.27
Nodes (15): Agent Implementation Config, Argus Code Review, Automated Tests (typecheck/lint/test), Claude Code Autonomous Agent, Ticket Contract Injection, Feasibility Analysis, Kanban Board (Atelier), Kanban Agents Demo (demo.gif) (+7 more)

### Community 44 - "Chart Primitives"
Cohesion: 0.16
Nodes (12): ChartConfig, ChartContainer, ChartContainerProps, ChartContext, ChartContextValue, ChartLegendContent(), ChartLegendContentProps, ChartTooltipContent() (+4 more)

### Community 46 - "Triage Prompts & Mockups"
Cohesion: 0.22
Nodes (8): Board(), BoardProps, normalize(), Toaster(), useBoard(), COLUMN_ORDER, COLUMNS, ConfirmDialog()

### Community 47 - "Modal Dialogs"
Cohesion: 0.16
Nodes (15): AnnotatedHtml, isInsideAnnotation(), PrdAnnotation, PrdReviewDialog(), PrdReviewDialogProps, SelectionState, wrapFirstOccurrence(), QuitConfirmModalProps (+7 more)

### Community 48 - "DB Migrations & Seeds"
Cohesion: 0.09
Nodes (24): createDatabase(), migrate(), PROFILE_MIGRATIONS, seedProfiles(), seedSlots(), TICKET_MIGRATIONS, applyDesktopEnv(), DesktopRoots (+16 more)

### Community 50 - "Stats Hooks & Cards"
Cohesion: 0.28
Nodes (7): StatsView(), useStats(), UseStatsResult, StatRecord, StatCard(), StatCardProps, StatEmpty()

### Community 51 - "Worktree Session Store"
Cohesion: 0.29
Nodes (4): mapWorktreeSessionRow(), enrichWorktreeSession(), BoardState, WorktreeSession

### Community 52 - "Tick Timer Hook"
Cohesion: 0.27
Nodes (3): TriageManager, RouteDeps, TriageResult

### Community 54 - "Worktree Address Watcher"
Cohesion: 0.48
Nodes (4): PrSelectRow(), PrSelectRowProps, isPrNeedsAttention(), OpenPr

### Community 56 - "CSV Parsing"
Cohesion: 0.33
Nodes (3): COLUMN_NODE_COLOR, WorkflowView(), WorkflowViewProps

### Community 57 - "Cost Aggregation"
Cohesion: 0.40
Nodes (6): costByModel(), costByProject(), meanCostPerIssueUsd(), modelLabel(), totalSpendUsd(), withCost()

### Community 58 - "File Uploads"
Cohesion: 0.40
Nodes (5): MIME_EXTENSIONS, resolveExtension(), SavedUpload, saveUpload(), serveUpload()

### Community 59 - "Webhook MCP"
Cohesion: 0.33
Nodes (3): listeners, mcp, ReplyArgsSchema

### Community 60 - "Package Manifest"
Cohesion: 0.40
Nodes (4): name, private, type, version

## Knowledge Gaps
- **365 isolated node(s):** `Window`, `active`, `SidebarProps`, `NavEntry`, `NAV_ENTRIES` (+360 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Ticket` connect `Workflow View & Lifecycle` to `Contract Building & Slots`, `Shared Zod Schemas`, `Board & Sidebar Layout`, `Database Store Operations`, `API Routes & Reformulate`, `Triage & Server Hub`, `Live Terminal Views`, `Stage Progress & Display`, `Store Types & Agent Knobs`, `DB Row Schemas & Mappers`, `Client Hub & Watchdog`, `Cost & Pricing`, `Agents View & Ticket Cards`, `Board Columns`, `Agent Profile Config`, `Agent Coordinator Handlers`, `API Client Inputs`, `Ticket Config & Constants`, `Ticket Detail & Triage UI`, `Triage Prompts & Mockups`, `Worktree Session Store`, `CSV Parsing`, `Badge Component`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **Why does `cn()` connect `PR Selection & Slots Bar` to `Terminals UI & Notifications`, `Board Columns`, `Ticket Action Panels`, `Settings & Profiles UI`, `Ticket Detail & Triage UI`, `Board & Sidebar Layout`, `Chart Primitives`, `Triage Prompts & Mockups`, `Modal Dialogs`, `Live Terminal Views`, `Stage Progress & Display`, `Stats Hooks & Cards`, `Worktree Address Watcher`, `Stats Charts`, `PRD Review & Markdown`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Why does `RealSystemAdapter` connect `Real System Adapter` to `User Terminal & Fake IO`, `Desktop Bootstrap & Menus`, `Claude SDK Provider`, `Real Adapter GH/Composer`, `Worktree Address Watcher`, `Session Hub & Agent Session`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **What connects `Window`, `active`, `SidebarProps` to the rest of the system?**
  _366 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Contract Building & Slots` be split into smaller, more focused modules?**
  _Cohesion score 0.056140350877192984 - nodes in this community are weakly interconnected._
- **Should `Terminals UI & Notifications` be split into smaller, more focused modules?**
  _Cohesion score 0.05376972530683811 - nodes in this community are weakly interconnected._
- **Should `Desktop Bootstrap & Menus` be split into smaller, more focused modules?**
  _Cohesion score 0.09915966386554621 - nodes in this community are weakly interconnected._