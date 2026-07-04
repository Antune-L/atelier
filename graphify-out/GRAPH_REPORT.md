# Graph Report - slot-1  (2026-07-04)

## Corpus Check
- 154 files · ~645,935 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1665 nodes · 4064 edges · 88 communities (74 shown, 14 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 27 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `76e559d7`
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
- [[_COMMUNITY_Community 80|Community 80]]
- [[_COMMUNITY_Community 82|Community 82]]
- [[_COMMUNITY_Community 87|Community 87]]
- [[_COMMUNITY_Community 89|Community 89]]
- [[_COMMUNITY_Community 90|Community 90]]

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

## Communities (88 total, 14 thin omitted)

### Community 0 - "Contract Building & Slots"
Cohesion: 0.10
Nodes (34): buildAskContract(), buildCleanContract(), buildConflictResolutionContract(), buildFeasibilityContextSection(), buildImplementingSteps(), buildPlanningStep(), buildReviewContract(), buildReviewFixLines() (+26 more)

### Community 1 - "Terminals UI & Notifications"
Cohesion: 0.14
Nodes (6): SessionHub, DRY_RUN_RESULT, log, PendingSplit, SplitManager, SplitResult

### Community 2 - "Desktop Bootstrap & Menus"
Cohesion: 0.04
Nodes (65): AnalyzeTicketsInput, appSettingsSchema, automationRunSchema, automationSchema, baseBranchSchema, Capabilities, capabilitiesSchema, Comment (+57 more)

### Community 3 - "Feasibility Batch Management"
Cohesion: 0.12
Nodes (5): delay(), FakeSystemAdapter, GitWorktreeAddOptions, ImportNotionOptions, WorktreeSetupOptions

### Community 4 - "Ticket Action Panels"
Cohesion: 0.10
Nodes (14): dataMessage(), log, normalizeSeed(), safeParse(), send(), TerminalSession, TerminalSessionManager, TerminalSocket (+6 more)

### Community 5 - "Fake System Adapter"
Cohesion: 0.06
Nodes (33): buildNotionImportPrompt(), createSplitChildren(), failSplitMother(), isBlocked(), isSplitMother(), log, PaneReader, performSplit() (+25 more)

### Community 7 - "Settings & Profiles UI"
Cohesion: 0.07
Nodes (28): addUsageByModel(), log, ToolHandler, ToolResult, toUsageByModel(), AgentSettableStage, agentSettableStageSchema, askUserArgsSchema (+20 more)

### Community 8 - "PR Selection & Slots Bar"
Cohesion: 0.07
Nodes (37): DRY_RUN_VERDICT, log, log, DRY_RUN_VERDICT, log, TriageSession, log, MODELS (+29 more)

### Community 9 - "Real System Adapter"
Cohesion: 0.07
Nodes (5): extractPrUrl(), RealSystemAdapter, safeJsonParse(), DoneGateResult, ReviewDoneOptions

### Community 10 - "Slot Config & Worktree Watch"
Cohesion: 0.06
Nodes (36): AutomationRow, automationRowSchema, AutomationRunRow, automationRunRowSchema, buildScripts(), CommentRow, commentRowSchema, mapProjectRow() (+28 more)

### Community 11 - "Core Domain Concepts"
Cohesion: 0.08
Nodes (28): FullscreenToggle(), FullscreenToggleProps, badgeLabelFor(), LiveTerminal(), LiveTerminalOptions, LiveTerminalProps, TabButton(), PrdView() (+20 more)

### Community 12 - "Board & Sidebar Layout"
Cohesion: 0.14
Nodes (16): LiveSession, log, previewToolInput(), renderChannelEvent(), renderSessionEvent(), SessionHubHandlers, SessionStartConfig, ChannelEvent (+8 more)

### Community 13 - "Database Store Operations"
Cohesion: 0.15
Nodes (26): AskPanelProps, CleanPrPanel(), CleanPrPanelProps, NewTicketDialogProps, Tab, TAB_TITLES, TabButtonProps, ProjectPrPicker() (+18 more)

### Community 14 - "Coordinator & Protocol"
Cohesion: 0.10
Nodes (26): effectiveWorkDurationMs(), CostGroup, DurationGroup, KIND_LABELS, KindCount, kindCounts(), meanDurationByEffort(), meanDurationByKey() (+18 more)

### Community 15 - "API Routes & Reformulate"
Cohesion: 0.10
Nodes (18): CLAUDE_JSON_PATH, COMPOSER_BINARIES, detectInstallCommand(), ghPrSchema, ghPrStateSchema, ghReviewSchema, ghReviewsSchema, INSTALL_COMMANDS (+10 more)

### Community 16 - "Stats Aggregation"
Cohesion: 0.06
Nodes (39): ShortcutDetail, UsePrdSearchOptions, UsePrdSearchResult, loadTree(), saveTree(), storageKey(), useTerminals, ShortcutDetail (+31 more)

### Community 17 - "Triage & Server Hub"
Cohesion: 0.08
Nodes (25): devDependencies, autoprefixer, class-variance-authority, clsx, concurrently, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities (+17 more)

### Community 18 - "Live Terminal Views"
Cohesion: 0.15
Nodes (4): resolveBaseBranch(), SlotManager, slotPath(), slugify()

### Community 19 - "Stage Progress & Display"
Cohesion: 0.08
Nodes (24): compilerOptions, allowImportingTsExtensions, baseUrl, esModuleInterop, isolatedModules, jsx, lib, module (+16 more)

### Community 20 - "Real Adapter GH/Composer"
Cohesion: 0.19
Nodes (16): PrdReviewDialogProps, QuitConfirmModal(), QuitConfirmModalProps, TerminalsView(), TerminalsViewProps, useTerminalShortcuts(), Button, ButtonProps (+8 more)

### Community 21 - "Store Types & Agent Knobs"
Cohesion: 0.09
Nodes (18): BoardColumn(), DEFAULT_COLLAPSED, familyKeyOf(), groupTicketsByFamily(), isSplitMother(), RenderGroup, resolveAnalyzeAllTitle(), resolveCheckAllTitle() (+10 more)

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
Cohesion: 0.25
Nodes (8): projectConfigSchema, buildAppSettingsPatch(), LegacyConfig, legacyConfigSchema, LegacyModels, log, pickModel(), AGENT_EFFORTS

### Community 27 - "Workflow View & Lifecycle"
Cohesion: 0.07
Nodes (32): Channel (agent<->backend link), Column (board lane), Contract (pipeline instructions), Coordinator, Done Gate, Kind (ticket pipeline type), Protocol (wire format source of truth), SessionHub (+24 more)

### Community 28 - "Stats Charts"
Cohesion: 0.18
Nodes (5): buildFeasibilityBatchContract(), FeasibilityBatchManager, toTriageResult(), buildFeasibilitySessionConfig(), FeasibilityResult

### Community 29 - "Session Hub & Agent Session"
Cohesion: 0.14
Nodes (7): AgentsViewProps, TicketBadgesProps, TicketCardProps, COLUMN_NODE_COLOR, WorkflowViewProps, TicketLifecycle, Ticket

### Community 30 - "Agents View & Ticket Cards"
Cohesion: 0.12
Nodes (22): BoardColumnProps, mapCommentRow(), NewAsk, NewClean, NewProject, NewReview, ProjectInUseError, ProjectPatch (+14 more)

### Community 31 - "PRD Review & Markdown"
Cohesion: 0.23
Nodes (5): Logger, paint(), ScopedLogger, serializeFields(), timestamp()

### Community 32 - "User Terminal & Fake IO"
Cohesion: 0.11
Nodes (21): BASH_ALLOWLIST, buildImplementSessionConfig(), buildSplitSessionConfig(), buildTriageSessionConfig(), CONTRACT_SKILLS, DENIED_BUILTIN_AGENTS, feasibilityScoutAgent(), FeasibilitySessionInput (+13 more)

### Community 33 - "Logging"
Cohesion: 0.10
Nodes (20): scripts, build:desktop, build:web, dev, dev:desktop, dev:proxy, dev:server, dev:web (+12 more)

### Community 34 - "Board Columns"
Cohesion: 0.13
Nodes (17): PROGRESS_BAR_COLORS, StageProgressBar(), StageProgressBarProps, ANIMATED_STAGES, BadgeVariant, DATETIME_FORMAT, NON_DEPENDABLE_COLUMNS, prNumberFromUrl() (+9 more)

### Community 35 - "NPM Scripts"
Cohesion: 0.13
Nodes (16): NewTicketDialog(), PrdReviewDialog(), AUTHOR_BADGES, AuthorBadge(), CommentRow(), CommentRowProps, isLocked(), TicketDetail() (+8 more)

### Community 36 - "Runtime Dependencies"
Cohesion: 0.07
Nodes (37): AgentProfileConfig(), AskPanel(), ImplementationAgentFields(), ProjectsSettings(), DragHandleAttributes, DragHandleListeners, GeneralSettings(), IMPLEMENTER_OPTIONS (+29 more)

### Community 37 - "Claude SDK Provider"
Cohesion: 0.11
Nodes (18): dependencies, @anthropic-ai/claude-agent-sdk, dompurify, elysia, marked, @modelcontextprotocol/sdk, nanoid, papaparse (+10 more)

### Community 38 - "Agent Profile Config"
Cohesion: 0.13
Nodes (16): WORKER_TOOLS, resolveClaudeBinary(), bashCommandSchema, buildSettings(), claudeProvider, createSdkAgentSession(), dispatch(), HIDDEN_COMMIT_ATTRIBUTION (+8 more)

### Community 40 - "API Client Inputs"
Cohesion: 0.22
Nodes (3): AgentCoordinator, SessionToolCall, WorkerToolName

### Community 41 - "Ticket Config & Constants"
Cohesion: 0.26
Nodes (14): AgentCard(), AgentCardProps, AgentsView(), normalize(), projectBadgeStyle(), TicketCard(), TriageDot(), useTickTimer() (+6 more)

### Community 42 - "Ticket Detail & Triage UI"
Cohesion: 0.24
Nodes (14): buildSplitChannelPrompt(), buildTicketLines(), isEnglish(), buildContractConstraintsLines(), buildResponseFormatLines(), buildStrictRulesLines(), buildTicketLines(), buildTriageChannelPrompt() (+6 more)

### Community 43 - "Demo Pipeline Concepts"
Cohesion: 0.20
Nodes (4): ReformulateManager, RouteDeps, UserTerminalManager, TerminalDescriptor

### Community 44 - "Chart Primitives"
Cohesion: 0.15
Nodes (12): AddProjectForm(), AddProjectFormProps, isPositiveIntegerString(), isValidDraft(), ProjectFieldsProps, ProjectRow(), ProjectRowProps, emit() (+4 more)

### Community 45 - "Session Hub Transcript"
Cohesion: 0.15
Nodes (15): applyDesktopEnv(), DesktopRoots, ensureConfig(), boot(), installApplicationMenu(), installMenuShortcutBridge(), menuShortcutActionSchema, newWindowEventSchema (+7 more)

### Community 46 - "Community 46"
Cohesion: 0.27
Nodes (15): Agent Implementation Config, Argus Code Review, Automated Tests (typecheck/lint/test), Claude Code Autonomous Agent, Ticket Contract Injection, Feasibility Analysis, Kanban Board (Atelier), Kanban Agents Demo (demo.gif) (+7 more)

### Community 47 - "Modal Dialogs"
Cohesion: 0.12
Nodes (9): AutomationCardProps, AutomationFormProps, AutomationView(), EMPTY_FORM, RUN_STATUS_LABEL, RUN_STATUS_VARIANT, AUTOMATION_TRIGGER_LABELS, AUTOMATION_TRIGGERS (+1 more)

### Community 48 - "Community 48"
Cohesion: 0.09
Nodes (9): dryRunLog, FAKE_OPEN_PRS, fakeEncoder, FakePaneStream, fakeShellPrompt(), hexToBytes(), PaneSize, RunAutomationOptions (+1 more)

### Community 49 - "Slot State"
Cohesion: 0.21
Nodes (9): ImportTicketsPanel(), ImportTicketsPanelProps, useAgentKnobs(), CsvParseError, ParsedTicketRow, ParsedTicketsCsv, parseTicketsCsv(), Switch (+1 more)

### Community 50 - "Stats Hooks & Cards"
Cohesion: 0.10
Nodes (13): active, ensureNotificationPermission(), getAudioContext(), isSupported(), playNotificationSound(), showDesktopNotification(), Window, BoardStore (+5 more)

### Community 51 - "Community 51"
Cohesion: 0.16
Nodes (12): ChartConfig, ChartContainer, ChartContainerProps, ChartContext, ChartContextValue, ChartLegendContent(), ChartLegendContentProps, ChartTooltipContent() (+4 more)

### Community 52 - "Tick Timer Hook"
Cohesion: 0.31
Nodes (15): AgentProfileConfigProps, FormState, ImplementationAgentFieldsProps, AutomationPatch, NewAutomation, NewProfile, NewTicket, ProfilePatch (+7 more)

### Community 53 - "User Terminal Manager"
Cohesion: 0.33
Nodes (5): CONTEXT — domain glossary, Execution, Proposed (not yet built), Seams, Work items

### Community 54 - "Community 54"
Cohesion: 0.18
Nodes (6): mapSlotRow(), mapWorktreeSessionRow(), enrichWorktreeSession(), BoardState, Slot, WorktreeSession

### Community 56 - "CSV Parsing"
Cohesion: 0.11
Nodes (22): Board(), BoardProps, normalize(), NAV_ENTRIES, NavEntry, Sidebar(), SidebarProps, SidebarView (+14 more)

### Community 57 - "Community 57"
Cohesion: 0.31
Nodes (8): UseThemeResult, applyTheme(), getStoredTheme(), isTheme(), Theme, ThemeOption, THEMES, root

### Community 60 - "Package Manifest"
Cohesion: 0.12
Nodes (17): log, createDatabase(), migrate(), PROFILE_MIGRATIONS, seedProfiles(), seedSlots(), TICKET_MIGRATIONS, AUTOMATION_RUN_STATUSES (+9 more)

### Community 61 - "Community 61"
Cohesion: 0.24
Nodes (4): mapAutomationRow(), mapAutomationRunRow(), Automation, AutomationRun

### Community 62 - "Badge Component"
Cohesion: 0.32
Nodes (6): useStats(), UseStatsResult, StatRecord, StatCard(), StatCardProps, StatEmpty()

### Community 64 - "Composer Run Script"
Cohesion: 0.48
Nodes (4): PrSelectRow(), PrSelectRowProps, isPrNeedsAttention(), OpenPr

### Community 65 - "Community 65"
Cohesion: 0.25
Nodes (7): labelWithDefault(), TicketConfigSummary(), AGENT_EFFORT_LABELS, IMPLEMENTER_LABELS, REVIEW_DEPTH_LABELS, agentEffortSchema, agentModelSchema

### Community 66 - "Community 66"
Cohesion: 0.33
Nodes (4): currentNow, startTicking(), subscribe(), subscribers

### Community 67 - "Community 67"
Cohesion: 0.40
Nodes (6): costByModel(), costByProject(), meanCostPerIssueUsd(), modelLabel(), totalSpendUsd(), withCost()

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
Cohesion: 0.47
Nodes (4): TicketBadges(), Badge(), BadgeProps, badgeVariants

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
Cohesion: 0.50
Nodes (4): buildReformulatePrompt(), TriageSection(), triageVerdictVariant(), parseTriageReport()

## Knowledge Gaps
- **423 isolated node(s):** `log`, `ticketRowSchema`, `TicketRow`, `commentRowSchema`, `CommentRow` (+418 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Store` connect `Shared Zod Schemas` to `Contract Building & Slots`, `Terminals UI & Notifications`, `Cost & Pricing`, `Ticket Action Panels`, `Fake System Adapter`, `Settings & Profiles UI`, `PR Selection & Slots Bar`, `Agent Coordinator Handlers`, `Demo Pipeline Concepts`, `Session Hub & Agent Session`, `Community 54`, `Community 55`, `File Uploads`, `Webhook MCP`, `Package Manifest`, `Community 61`, `Agents View & Ticket Cards`, `Community 63`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Why does `FakeSystemAdapter` connect `Feasibility Batch Management` to `Agent Profile Config`, `PR Selection & Slots Bar`, `Real System Adapter`, `Board & Sidebar Layout`, `Community 48`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **Why does `Ticket` connect `Session Hub & Agent Session` to `Contract Building & Slots`, `Desktop Bootstrap & Menus`, `Fake System Adapter`, `Shared Zod Schemas`, `PR Selection & Slots Bar`, `Slot Config & Worktree Watch`, `Database Store Operations`, `Live Terminal Views`, `Store Types & Agent Knobs`, `DB Row Schemas & Mappers`, `Agents View & Ticket Cards`, `User Terminal & Fake IO`, `Board Columns`, `NPM Scripts`, `Agent Coordinator Handlers`, `Ticket Config & Constants`, `Ticket Detail & Triage UI`, `Demo Pipeline Concepts`, `Stats Hooks & Cards`, `Community 54`, `CSV Parsing`, `File Uploads`, `Community 65`, `Community 72`, `Community 76`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **What connects `log`, `ticketRowSchema`, `TicketRow` to the rest of the system?**
  _426 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Contract Building & Slots` be split into smaller, more focused modules?**
  _Cohesion score 0.10434782608695652 - nodes in this community are weakly interconnected._
- **Should `Terminals UI & Notifications` be split into smaller, more focused modules?**
  _Cohesion score 0.14210526315789473 - nodes in this community are weakly interconnected._
- **Should `Desktop Bootstrap & Menus` be split into smaller, more focused modules?**
  _Cohesion score 0.03836317135549872 - nodes in this community are weakly interconnected._