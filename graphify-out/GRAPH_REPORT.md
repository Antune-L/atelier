# Graph Report - slot-2  (2026-06-29)

## Corpus Check
- 150 files · ~638,672 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1511 nodes · 3521 edges · 90 communities (75 shown, 15 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 15 edges (avg confidence: 0.81)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `fb590e64`
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
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_React Root Mount|React Root Mount]]
- [[_COMMUNITY_Theme Flash Guard|Theme Flash Guard]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 80|Community 80]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 82|Community 82]]
- [[_COMMUNITY_Community 83|Community 83]]
- [[_COMMUNITY_Community 84|Community 84]]
- [[_COMMUNITY_Community 85|Community 85]]
- [[_COMMUNITY_Community 86|Community 86]]
- [[_COMMUNITY_Community 87|Community 87]]
- [[_COMMUNITY_Community 88|Community 88]]
- [[_COMMUNITY_Community 89|Community 89]]

## God Nodes (most connected - your core abstractions)
1. `Store` - 74 edges
2. `Ticket` - 70 edges
3. `cn()` - 51 edges
4. `RealSystemAdapter` - 50 edges
5. `SlotManager` - 45 edges
6. `FakeSystemAdapter` - 43 edges
7. `ProjectInfo` - 39 edges
8. `getProject()` - 31 edges
9. `ClientHub` - 30 edges
10. `isProjectKey()` - 29 edges

## Surprising Connections (you probably didn't know these)
- `boot()` --calls--> `startServer()`  [INFERRED]
  desktop/index.ts → src/server/index.ts
- `Kind (ticket pipeline type)` --conceptually_related_to--> `argus (argus-review) skill`  [INFERRED]
  CONTEXT.md → README.md
- `Kind (ticket pipeline type)` --conceptually_related_to--> `minos-pr-feedback skill`  [INFERRED]
  CONTEXT.md → README.md
- `Contract (pipeline instructions)` --references--> `argus (argus-review) skill`  [EXTRACTED]
  CONTEXT.md → README.md
- `Contract (pipeline instructions)` --references--> `composer-implement skill`  [EXTRACTED]
  CONTEXT.md → README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **System Adapter side-effect seam** — context_system_adapter, agents_fakesystemadapter, agents_realsystemadapter, agents_dry_run_safety_model [EXTRACTED 1.00]
- **Slot lifecycle flow** — context_slotmanager, context_slot, context_sessionhub, context_contract, context_done_gate [EXTRACTED 1.00]
- **Skills referenced by the pipeline contract** — context_contract, readme_paris_research, readme_argus_review, readme_regression_check, readme_mockup_fidelity_review, readme_minos_pr_feedback, readme_composer_implement [EXTRACTED 1.00]
- **Autonomous Implementation Flow** — docs_demo_claude_code_agent, docs_demo_stage_machine, docs_demo_argus_review, docs_demo_automated_tests, docs_demo_pull_request [EXTRACTED 1.00]
- **Ticket-to-PR End-to-End Pipeline** — docs_demo_kanban_board, docs_demo_ticket_creation, docs_demo_feasibility_analysis, docs_demo_claude_code_agent, docs_demo_pull_request [EXTRACTED 1.00]

## Communities (90 total, 15 thin omitted)

### Community 0 - "Contract Building & Slots"
Cohesion: 0.16
Nodes (3): SlotManager, slotPath(), slugify()

### Community 1 - "Terminals UI & Notifications"
Cohesion: 0.11
Nodes (24): PrdReviewDialogProps, QuitConfirmModal(), QuitConfirmModalProps, TerminalsView(), TerminalsViewProps, useTerminalShortcuts(), cn(), ButtonProps (+16 more)

### Community 2 - "Desktop Bootstrap & Menus"
Cohesion: 0.10
Nodes (14): dataMessage(), log, normalizeSeed(), safeParse(), send(), TerminalSession, TerminalSessionManager, TerminalSocket (+6 more)

### Community 3 - "Feasibility Batch Management"
Cohesion: 0.15
Nodes (9): buildFeasibilityBatchContract(), DRY_RUN_VERDICT, FeasibilityBatchManager, FeasibilitySession, log, toTriageResult(), buildFeasibilitySessionConfig(), ProjectConfig (+1 more)

### Community 4 - "Ticket Action Panels"
Cohesion: 0.14
Nodes (8): AgentsViewProps, TicketBadgesProps, TicketCardProps, COLUMN_NODE_COLOR, WorkflowView(), WorkflowViewProps, TicketLifecycle, Ticket

### Community 5 - "Fake System Adapter"
Cohesion: 0.15
Nodes (3): delay(), FakeSystemAdapter, WorktreeSetupOptions

### Community 6 - "Shared Zod Schemas"
Cohesion: 0.05
Nodes (38): appSettingsSchema, baseBranchSchema, capabilitiesSchema, commentAuthorSchema, commentSchema, commitLanguageSchema, CreateTerminalBody, EXTERNAL_URL_PROTOCOLS (+30 more)

### Community 7 - "Settings & Profiles UI"
Cohesion: 0.13
Nodes (17): log, SlotWatch, DEFAULT_MODELS, PROJECT_ROOT, projectConfigSchema, SLOTS_ROOT, createLogger(), buildAppSettingsPatch() (+9 more)

### Community 8 - "PR Selection & Slots Bar"
Cohesion: 0.13
Nodes (15): NAV_ENTRIES, NavEntry, Sidebar(), SidebarProps, SidebarView, WorktreeSessionsView(), WorktreeSessionsViewProps, loadOnce() (+7 more)

### Community 10 - "Slot Config & Worktree Watch"
Cohesion: 0.39
Nodes (4): PrSelectRow(), PrSelectRowProps, isPrNeedsAttention(), OpenPr

### Community 11 - "Core Domain Concepts"
Cohesion: 0.12
Nodes (22): Channel (agent<->backend link), Column (board lane), Contract (pipeline instructions), Coordinator, Done Gate, Kind (ticket pipeline type), Protocol (wire format source of truth), SessionHub (+14 more)

### Community 13 - "Database Store Operations"
Cohesion: 0.12
Nodes (3): mapProfileRow(), Store, Profile

### Community 14 - "Coordinator & Protocol"
Cohesion: 0.08
Nodes (27): addUsageByModel(), log, ToolHandler, ToolResult, toUsageByModel(), AgentSettableStage, agentSettableStageSchema, askUserArgsSchema (+19 more)

### Community 15 - "API Routes & Reformulate"
Cohesion: 0.06
Nodes (25): buildNotionImportPrompt(), MODELS, failSplitMother(), log, PaneReader, performSplit(), splitMotherBranch(), analyzeTicketsSchema (+17 more)

### Community 16 - "Stats Aggregation"
Cohesion: 0.10
Nodes (26): effectiveWorkDurationMs(), CostGroup, DurationGroup, KIND_LABELS, KindCount, kindCounts(), meanDurationByEffort(), meanDurationByKey() (+18 more)

### Community 17 - "Triage & Server Hub"
Cohesion: 0.11
Nodes (19): log, runFirstBootSetup(), applyAppSettingsToModels(), initProjectRegistry(), listProjectKeys(), PROJECT_ROOT, RunningServer, serveStaticAsset() (+11 more)

### Community 18 - "Live Terminal Views"
Cohesion: 0.21
Nodes (15): CleanPrPanel(), CleanPrPanelProps, ProjectPrPicker(), ProjectPrPickerProps, ProjectSelectProps, ReviewPrPanel(), ReviewPrPanelProps, ProjectPanelState (+7 more)

### Community 19 - "Stage Progress & Display"
Cohesion: 0.21
Nodes (17): AgentCard(), AgentCardProps, AgentsView(), normalize(), TicketBadges(), projectBadgeStyle(), resolveProjectColor(), resolveProjectLabel() (+9 more)

### Community 20 - "Real Adapter GH/Composer"
Cohesion: 0.18
Nodes (3): FakePaneStream, fakeShellPrompt(), hexToBytes()

### Community 21 - "Store Types & Agent Knobs"
Cohesion: 0.15
Nodes (23): buildAskContract(), buildCleanContract(), buildConflictResolutionContract(), buildFeasibilityContextSection(), buildImplementingSteps(), buildPlanningStep(), buildReviewContract(), buildReviewFixLines() (+15 more)

### Community 22 - "DB Row Schemas & Mappers"
Cohesion: 0.07
Nodes (30): buildScripts(), CommentRow, commentRowSchema, mapProjectRow(), mapTicketRow(), parseSessionUsage(), parseWorktreePorts(), ProfileRow (+22 more)

### Community 23 - "Dev Dependencies"
Cohesion: 0.08
Nodes (25): devDependencies, autoprefixer, class-variance-authority, clsx, concurrently, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities (+17 more)

### Community 24 - "TypeScript Config"
Cohesion: 0.08
Nodes (24): compilerOptions, allowImportingTsExtensions, baseUrl, esModuleInterop, isolatedModules, jsx, lib, module (+16 more)

### Community 25 - "Client Hub & Watchdog"
Cohesion: 0.10
Nodes (17): buildPrdPrompt(), AnalyzeTicketsInput, Capabilities, CreateAskInput, CreateCleanInput, CreateCommentInput, CreateProfileInput, CreateReviewInput (+9 more)

### Community 26 - "Cost & Pricing"
Cohesion: 0.16
Nodes (20): formatTokens(), TicketCost(), TicketCostProps, TOKEN_FORMATTER, USD_FORMATTER, costByFamily(), costOf(), costOfModel() (+12 more)

### Community 27 - "Workflow View & Lifecycle"
Cohesion: 0.31
Nodes (14): AgentProfileConfigProps, ImplementationAgentFieldsProps, NewAsk, NewClean, NewProfile, NewTicket, ProfilePatch, AgentKnobs (+6 more)

### Community 28 - "Stats Charts"
Cohesion: 0.13
Nodes (18): StatsViewProps, ACTIVE_BAR, AREA_CURSOR, AXIS_PROPS, BAR_CURSOR, CHART_PALETTE, CostChart(), DurationChart() (+10 more)

### Community 29 - "Session Hub & Agent Session"
Cohesion: 0.20
Nodes (3): AgentCoordinator, SessionToolCall, WorkerToolName

### Community 30 - "Agents View & Ticket Cards"
Cohesion: 0.19
Nodes (10): active, ensureNotificationPermission(), getAudioContext(), isSupported(), playNotificationSound(), showDesktopNotification(), Window, CommentListener (+2 more)

### Community 31 - "PRD Review & Markdown"
Cohesion: 0.13
Nodes (17): PROGRESS_BAR_COLORS, StageProgressBar(), StageProgressBarProps, ANIMATED_STAGES, BadgeVariant, DATETIME_FORMAT, NON_DEPENDABLE_COLUMNS, prNumberFromUrl() (+9 more)

### Community 32 - "User Terminal & Fake IO"
Cohesion: 0.20
Nodes (5): mapSlotRow(), mapWorktreeSessionRow(), BoardState, Slot, WorktreeSession

### Community 33 - "Logging"
Cohesion: 0.14
Nodes (13): ANSI, COLOR_ENABLED, isLevel(), Level, LEVEL_ORDER, LEVEL_TAG, Logger, paint() (+5 more)

### Community 34 - "Board Columns"
Cohesion: 0.10
Nodes (18): BoardColumn(), BoardColumnProps, DEFAULT_COLLAPSED, familyKeyOf(), groupTicketsByFamily(), isSplitMother(), RenderGroup, resolveAnalyzeAllTitle() (+10 more)

### Community 35 - "NPM Scripts"
Cohesion: 0.10
Nodes (20): scripts, build:desktop, build:web, dev, dev:desktop, dev:proxy, dev:server, dev:web (+12 more)

### Community 36 - "Runtime Dependencies"
Cohesion: 0.11
Nodes (18): dependencies, @anthropic-ai/claude-agent-sdk, dompurify, elysia, marked, @modelcontextprotocol/sdk, nanoid, papaparse (+10 more)

### Community 37 - "Claude SDK Provider"
Cohesion: 0.16
Nodes (14): LiveSession, log, previewToolInput(), renderChannelEvent(), renderSessionEvent(), SessionHubHandlers, SessionStartConfig, ChannelEvent (+6 more)

### Community 38 - "Agent Profile Config"
Cohesion: 0.33
Nodes (10): buildContractConstraintsLines(), buildResponseFormatLines(), buildStrictRulesLines(), buildTicketLines(), buildTriageChannelPrompt(), buildTriagePlusChannelPrompt(), isEnglish(), AGENT_MODELS (+2 more)

### Community 39 - "Agent Coordinator Handlers"
Cohesion: 0.18
Nodes (3): BoardStore, Listener, WsClientEvent

### Community 40 - "API Client Inputs"
Cohesion: 0.13
Nodes (16): labelWithDefault(), TicketConfigSummary(), resolveEffort(), resolveModel(), AGENT_EFFORT_LABELS, AGENT_MODEL_LABELS, COMMENT_AUTHORS, IMPLEMENTER_LABELS (+8 more)

### Community 41 - "Ticket Config & Constants"
Cohesion: 0.17
Nodes (15): WORKER_TOOLS, resolveClaudeBinary(), bashCommandSchema, buildSettings(), claudeProvider, createSdkAgentSession(), dispatch(), HIDDEN_COMMIT_ATTRIBUTION (+7 more)

### Community 42 - "Ticket Detail & Triage UI"
Cohesion: 0.13
Nodes (18): PrdReviewDialog(), TerminalData, TerminalView(), TerminalViewProps, AUTHOR_BADGES, CommentRow(), CommentRowProps, isLocked() (+10 more)

### Community 43 - "Demo Pipeline Concepts"
Cohesion: 0.27
Nodes (15): Agent Implementation Config, Argus Code Review, Automated Tests (typecheck/lint/test), Claude Code Autonomous Agent, Ticket Contract Injection, Feasibility Analysis, Kanban Board (Atelier), Kanban Agents Demo (demo.gif) (+7 more)

### Community 44 - "Chart Primitives"
Cohesion: 0.14
Nodes (15): ImportTicketsPanel(), ImportTicketsPanelProps, NewTicketDialog(), NewTicketDialogProps, Tab, TAB_TITLES, TabButtonProps, ProjectSelect() (+7 more)

### Community 45 - "Session Hub Transcript"
Cohesion: 0.06
Nodes (43): FullscreenToggle(), FullscreenToggleProps, badgeLabelFor(), LiveTerminal(), LiveTerminalOptions, LiveTerminalProps, useFullscreenEscape(), loadTree() (+35 more)

### Community 47 - "Modal Dialogs"
Cohesion: 0.08
Nodes (28): DragHandleAttributes, DragHandleListeners, GeneralSettings(), IMPLEMENTER_OPTIONS, LANGUAGE_OPTIONS, ProfileRowProps, ProfilesSettings(), SettingsModal() (+20 more)

### Community 48 - "Community 48"
Cohesion: 0.22
Nodes (11): PrdAnnotator(), PrdAnnotatorProps, PrdView(), AnnotatedHtml, compileFeedback(), injectAnnotations(), isInsideAnnotation(), PrdAnnotation (+3 more)

### Community 49 - "Slot State"
Cohesion: 0.16
Nodes (12): ChartConfig, ChartContainer, ChartContainerProps, ChartContext, ChartContextValue, ChartLegendContent(), ChartLegendContentProps, ChartTooltipContent() (+4 more)

### Community 50 - "Stats Hooks & Cards"
Cohesion: 0.08
Nodes (28): BASH_ALLOWLIST, buildImplementSessionConfig(), buildSplitSessionConfig(), buildTriageSessionConfig(), DENIED_BUILTIN_AGENTS, feasibilityScoutAgent(), FeasibilitySessionInput, IMPLEMENTER_SAFE_TOOLS (+20 more)

### Community 51 - "Community 51"
Cohesion: 0.10
Nodes (9): log, Watchdog, ClientHub, ClientSocket, ClientSocketData, NativeNotify, Notifier, ACTIVE_STAGES (+1 more)

### Community 52 - "Tick Timer Hook"
Cohesion: 0.19
Nodes (5): DRY_RUN_VERDICT, log, TriageManager, TriageSession, TriageResult

### Community 54 - "Community 54"
Cohesion: 0.22
Nodes (8): Board(), BoardProps, normalize(), Toaster(), useBoard(), COLUMN_ORDER, COLUMNS, ConfirmDialog()

### Community 55 - "Community 55"
Cohesion: 0.25
Nodes (6): Architecture, Commands, Conventions (enforced — beyond the global ones in ~/.claude/CLAUDE.md), graphify, The dry-run safety model — read before running anything, What this is

### Community 56 - "CSV Parsing"
Cohesion: 0.14
Nodes (8): dryRunLog, FAKE_OPEN_PRS, fakeEncoder, GitWorktreeAddOptions, ImportNotionOptions, PaneSize, ReformulateOptions, SpawnShellOptions

### Community 58 - "File Uploads"
Cohesion: 0.13
Nodes (15): applyDesktopEnv(), DesktopRoots, ensureConfig(), boot(), installApplicationMenu(), installMenuShortcutBridge(), menuShortcutActionSchema, newWindowEventSchema (+7 more)

### Community 59 - "Webhook MCP"
Cohesion: 0.33
Nodes (3): listeners, mcp, ReplyArgsSchema

### Community 60 - "Package Manifest"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 61 - "Community 61"
Cohesion: 0.14
Nodes (3): safeJsonParse(), DoneGateResult, ReviewDoneOptions

### Community 62 - "Badge Component"
Cohesion: 0.09
Nodes (19): CLAUDE_JSON_PATH, COMPOSER_BINARIES, detectInstallCommand(), extractPrUrl(), ghPrSchema, ghPrStateSchema, ghReviewSchema, ghReviewsSchema (+11 more)

### Community 66 - "Community 66"
Cohesion: 0.33
Nodes (4): currentNow, startTicking(), subscribe(), subscribers

### Community 67 - "Community 67"
Cohesion: 0.15
Nodes (13): resolveBaseBranch(), computeWorktreeAddresses(), mapCommentRow(), enrichWorktreeSession(), NewProject, NewReview, ProjectInUseError, ProjectPatch (+5 more)

### Community 75 - "Community 75"
Cohesion: 0.18
Nodes (9): TICKET_OPTION, TicketOptionsToggleGroup(), TicketOptionsToggleGroupProps, TicketOptionValues, ToggleGroup, ToggleGroupContext, ToggleGroupItem, Toggle (+1 more)

### Community 76 - "Community 76"
Cohesion: 0.40
Nodes (5): MIME_EXTENSIONS, resolveExtension(), SavedUpload, saveUpload(), serveUpload()

### Community 77 - "Community 77"
Cohesion: 0.16
Nodes (16): AgentProfileConfig(), AskPanel(), AskPanelProps, ImplementationAgentFields(), loadOnce(), subscribers, UNKNOWN_CAPABILITIES, useCapabilities() (+8 more)

### Community 78 - "Community 78"
Cohesion: 0.28
Nodes (7): StatsView(), useStats(), UseStatsResult, StatRecord, StatCard(), StatCardProps, StatEmpty()

### Community 79 - "Community 79"
Cohesion: 0.29
Nodes (5): SlotsBar(), SlotsBarProps, Stat(), StatProps, STATUS_LABELS

### Community 81 - "Community 81"
Cohesion: 0.33
Nodes (4): CsvParseError, ParsedTicketRow, ParsedTicketsCsv, parseTicketsCsv()

### Community 82 - "Community 82"
Cohesion: 0.31
Nodes (8): createDatabase(), migrate(), PROFILE_MIGRATIONS, seedProfiles(), seedSlots(), TICKET_MIGRATIONS, DEFAULT_PROFILES, SLOT_COUNT

### Community 86 - "Community 86"
Cohesion: 0.40
Nodes (6): costByModel(), costByProject(), meanCostPerIssueUsd(), modelLabel(), totalSpendUsd(), withCost()

### Community 87 - "Community 87"
Cohesion: 0.40
Nodes (5): TicketPatch, ReformulateStatus, SessionUsage, TriageStatus, TriageVerdict

### Community 88 - "Community 88"
Cohesion: 0.50
Nodes (4): Badge(), BadgeProps, BadgeVariant, badgeVariants

## Knowledge Gaps
- **385 isolated node(s):** `PROJECT_ROOT`, `SlotStatus`, `NewProject`, `ProjectPatch`, `SqlBindValue` (+380 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **15 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Ticket` connect `Ticket Action Panels` to `Contract Building & Slots`, `Shared Zod Schemas`, `PR Selection & Slots Bar`, `Database Store Operations`, `API Routes & Reformulate`, `Stage Progress & Display`, `Store Types & Agent Knobs`, `DB Row Schemas & Mappers`, `Client Hub & Watchdog`, `Cost & Pricing`, `Agents View & Ticket Cards`, `PRD Review & Markdown`, `User Terminal & Fake IO`, `Board Columns`, `Agent Profile Config`, `Agent Coordinator Handlers`, `API Client Inputs`, `Ticket Detail & Triage UI`, `Community 46`, `Stats Hooks & Cards`, `Community 51`, `Community 54`, `Community 63`, `Community 67`, `Community 89`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Why does `Store` connect `Database Store Operations` to `User Terminal & Fake IO`, `Desktop Bootstrap & Menus`, `Feasibility Batch Management`, `Community 67`, `Settings & Profiles UI`, `Board & Sidebar Layout`, `Coordinator & Protocol`, `Community 46`, `API Routes & Reformulate`, `Triage & Server Hub`, `Stats Hooks & Cards`, `Community 51`, `Tick Timer Hook`, `Store Types & Agent Knobs`, `Community 85`, `Community 63`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **Why does `RealSystemAdapter` connect `Real System Adapter` to `Desktop Bootstrap & Menus`, `Claude SDK Provider`, `Slot Config & Worktree Watch`, `CSV Parsing`, `Community 61`, `Badge Component`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **What connects `PROJECT_ROOT`, `SlotStatus`, `NewProject` to the rest of the system?**
  _385 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Terminals UI & Notifications` be split into smaller, more focused modules?**
  _Cohesion score 0.11229946524064172 - nodes in this community are weakly interconnected._
- **Should `Desktop Bootstrap & Menus` be split into smaller, more focused modules?**
  _Cohesion score 0.09915966386554621 - nodes in this community are weakly interconnected._
- **Should `Ticket Action Panels` be split into smaller, more focused modules?**
  _Cohesion score 0.13852813852813853 - nodes in this community are weakly interconnected._