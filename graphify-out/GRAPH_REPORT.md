# Graph Report - kanban-agents  (2026-06-29)

## Corpus Check
- 152 files · ~639,247 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1495 nodes · 3460 edges · 84 communities (73 shown, 11 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 15 edges (avg confidence: 0.81)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1f6230be`
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
- [[_COMMUNITY_Community 38|Community 38]]
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
- [[_COMMUNITY_Community 56|Community 56]]
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
- [[_COMMUNITY_Community 83|Community 83]]
- [[_COMMUNITY_Community 84|Community 84]]

## God Nodes (most connected - your core abstractions)
1. `Ticket` - 70 edges
2. `Store` - 66 edges
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

## Communities (84 total, 11 thin omitted)

### Community 0 - "Contract Building & Slots"
Cohesion: 0.09
Nodes (22): buildAskContract(), buildCleanContract(), buildConflictResolutionContract(), buildFeasibilityContextSection(), buildImplementingSteps(), buildPlanningStep(), buildReviewContract(), buildReviewFixLines() (+14 more)

### Community 1 - "Terminals UI & Notifications"
Cohesion: 0.13
Nodes (17): PROGRESS_BAR_COLORS, StageProgressBar(), StageProgressBarProps, ANIMATED_STAGES, BadgeVariant, DATETIME_FORMAT, NON_DEPENDABLE_COLUMNS, prNumberFromUrl() (+9 more)

### Community 2 - "Desktop Bootstrap & Menus"
Cohesion: 0.08
Nodes (16): dataMessage(), log, normalizeSeed(), safeParse(), send(), TerminalSession, TerminalSessionManager, TerminalSocket (+8 more)

### Community 3 - "Feasibility Batch Management"
Cohesion: 0.16
Nodes (8): buildFeasibilityBatchContract(), DRY_RUN_VERDICT, FeasibilityBatchManager, FeasibilitySession, log, toTriageResult(), ProjectConfig, FeasibilityResult

### Community 4 - "Ticket Action Panels"
Cohesion: 0.33
Nodes (3): COLUMN_NODE_COLOR, WorkflowView(), WorkflowViewProps

### Community 5 - "Fake System Adapter"
Cohesion: 0.09
Nodes (3): delay(), fakeShellPrompt(), FakeSystemAdapter

### Community 6 - "Shared Zod Schemas"
Cohesion: 0.04
Nodes (54): AnalyzeTicketsInput, appSettingsSchema, baseBranchSchema, capabilitiesSchema, commentAuthorSchema, commentSchema, CreateAskInput, CreateCleanInput (+46 more)

### Community 7 - "Settings & Profiles UI"
Cohesion: 0.10
Nodes (22): DragHandleAttributes, DragHandleListeners, GeneralSettings(), IMPLEMENTER_OPTIONS, LANGUAGE_OPTIONS, ProfileRowProps, SettingsModalProps, SettingsTab (+14 more)

### Community 8 - "PR Selection & Slots Bar"
Cohesion: 0.19
Nodes (10): TICKET_OPTION, TicketOptionsToggleGroup(), TicketOptionsToggleGroupProps, TicketOptionValues, cn(), ToggleGroup, ToggleGroupContext, ToggleGroupItem (+2 more)

### Community 9 - "Real System Adapter"
Cohesion: 0.09
Nodes (3): RealSystemAdapter, safeJsonParse(), DoneGateResult

### Community 10 - "Slot Config & Worktree Watch"
Cohesion: 0.18
Nodes (14): CleanPrPanel(), ProjectPrPicker(), ProjectPrPickerProps, ReviewPrPanel(), ProjectPanelState, useProjectPanel(), REVIEW_DEPTHS, ButtonProps (+6 more)

### Community 11 - "Core Domain Concepts"
Cohesion: 0.12
Nodes (22): Channel (agent<->backend link), Column (board lane), Contract (pipeline instructions), Coordinator, Done Gate, Kind (ticket pipeline type), Protocol (wire format source of truth), SessionHub (+14 more)

### Community 12 - "Board & Sidebar Layout"
Cohesion: 0.15
Nodes (12): active, ensureNotificationPermission(), getAudioContext(), isSupported(), playNotificationSound(), showDesktopNotification(), Window, BoardState (+4 more)

### Community 13 - "Database Store Operations"
Cohesion: 0.09
Nodes (6): TicketBadgesProps, TicketCardProps, SqlUpdateBuilder, Store, TicketLifecycle, Ticket

### Community 14 - "Coordinator & Protocol"
Cohesion: 0.09
Nodes (20): TRIAGE_VERDICTS, AgentSettableStage, agentSettableStageSchema, askUserArgsSchema, AssertNamesCovered, channelEventSchema, doneArgsSchema, failArgsSchema (+12 more)

### Community 15 - "API Routes & Reformulate"
Cohesion: 0.06
Nodes (33): buildNotionImportPrompt(), buildPrdPrompt(), buildReformulatePrompt(), createSplitChildren(), failSplitMother(), isBlocked(), isSplitMother(), log (+25 more)

### Community 16 - "Stats Aggregation"
Cohesion: 0.11
Nodes (28): effectiveWorkDurationMs(), costByModel(), costByProject(), CostGroup, DurationGroup, KIND_LABELS, KindCount, meanCostPerIssueUsd() (+20 more)

### Community 17 - "Triage & Server Hub"
Cohesion: 0.13
Nodes (17): createDatabase(), migrate(), PROFILE_MIGRATIONS, seedProfiles(), seedSlots(), TICKET_MIGRATIONS, PROJECT_ROOT, RunningServer (+9 more)

### Community 18 - "Live Terminal Views"
Cohesion: 0.11
Nodes (22): AgentsViewProps, AskPanelProps, CleanPrPanelProps, ImportTicketsPanel(), ImportTicketsPanelProps, NewTicketDialog(), NewTicketDialogProps, Tab (+14 more)

### Community 19 - "Stage Progress & Display"
Cohesion: 0.17
Nodes (20): AgentCard(), AgentCardProps, TicketBadges(), projectBadgeStyle(), resolveProjectColor(), resolveProjectLabel(), TicketCard(), TriageDot() (+12 more)

### Community 20 - "Real Adapter GH/Composer"
Cohesion: 0.09
Nodes (11): dryRunLog, FAKE_OPEN_PRS, fakeEncoder, FakePaneStream, hexToBytes(), GitWorktreeAddOptions, ImportNotionOptions, PaneSize (+3 more)

### Community 22 - "DB Row Schemas & Mappers"
Cohesion: 0.08
Nodes (24): CommentRow, commentRowSchema, mapTicketRow(), parseSessionUsage(), ProfileRow, profileRowSchema, projectSchema, SlotRow (+16 more)

### Community 23 - "Dev Dependencies"
Cohesion: 0.08
Nodes (25): devDependencies, autoprefixer, class-variance-authority, clsx, concurrently, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities (+17 more)

### Community 24 - "TypeScript Config"
Cohesion: 0.08
Nodes (24): compilerOptions, allowImportingTsExtensions, baseUrl, esModuleInterop, isolatedModules, jsx, lib, module (+16 more)

### Community 25 - "Client Hub & Watchdog"
Cohesion: 0.15
Nodes (12): log, ToolHandler, ToolResult, DRY_RUN_VERDICT, log, TriageSession, log, ClientSocket (+4 more)

### Community 26 - "Cost & Pricing"
Cohesion: 0.16
Nodes (20): formatTokens(), TicketCost(), TicketCostProps, TOKEN_FORMATTER, USD_FORMATTER, costByFamily(), costOf(), costOfModel() (+12 more)

### Community 27 - "Workflow View & Lifecycle"
Cohesion: 0.15
Nodes (18): mapCommentRow(), mapWorktreeSessionRow(), enrichWorktreeSession(), NewAsk, NewClean, NewReview, SlotStatus, SqlBindValue (+10 more)

### Community 28 - "Stats Charts"
Cohesion: 0.10
Nodes (25): StatsView(), useStats(), UseStatsResult, kindCounts(), StatRecord, StatCard(), StatCardProps, StatEmpty() (+17 more)

### Community 29 - "Session Hub & Agent Session"
Cohesion: 0.20
Nodes (3): AgentCoordinator, SessionToolCall, WorkerToolName

### Community 30 - "Agents View & Ticket Cards"
Cohesion: 0.18
Nodes (8): ABSOLUTE_UPLOAD_PATH, ImageLightboxProps, LightboxImage, Markdown(), MarkdownProps, OPEN_KEYS, purifier, renderMarkdownToSafeHtml()

### Community 31 - "PRD Review & Markdown"
Cohesion: 0.67
Nodes (3): loadOnce(), subscribers, useProjects()

### Community 32 - "User Terminal & Fake IO"
Cohesion: 0.18
Nodes (7): SlotsBar(), SlotsBarProps, Stat(), StatProps, STATUS_LABELS, mapSlotRow(), Slot

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
Cohesion: 0.13
Nodes (17): addUsageByModel(), toUsageByModel(), LiveSession, log, previewToolInput(), renderChannelEvent(), renderSessionEvent(), SessionHubHandlers (+9 more)

### Community 38 - "Community 38"
Cohesion: 0.08
Nodes (22): resolveBaseBranch(), log, log, ReclaimOutcome, SETUP_PHASES, SlotManagerConfig, log, SlotWatch (+14 more)

### Community 39 - "Agent Coordinator Handlers"
Cohesion: 0.18
Nodes (10): AgentsView(), normalize(), Board(), BoardProps, normalize(), Toaster(), useBoard(), COLUMN_ORDER (+2 more)

### Community 40 - "API Client Inputs"
Cohesion: 0.13
Nodes (16): labelWithDefault(), TicketConfigSummary(), AGENT_EFFORT_LABELS, AGENT_EFFORTS, AGENT_MODEL_LABELS, AGENT_MODELS, COMMENT_AUTHORS, FAILURE_COLUMNS (+8 more)

### Community 41 - "Ticket Config & Constants"
Cohesion: 0.16
Nodes (16): WORKER_TOOLS, AgentProvider, resolveClaudeBinary(), bashCommandSchema, buildSettings(), claudeProvider, createSdkAgentSession(), dispatch() (+8 more)

### Community 42 - "Ticket Detail & Triage UI"
Cohesion: 0.16
Nodes (10): FullscreenToggle(), FullscreenToggleProps, badgeLabelFor(), LiveTerminal(), LiveTerminalOptions, LiveTerminalProps, TerminalData, TerminalView() (+2 more)

### Community 43 - "Demo Pipeline Concepts"
Cohesion: 0.27
Nodes (15): Agent Implementation Config, Argus Code Review, Automated Tests (typecheck/lint/test), Claude Code Autonomous Agent, Ticket Contract Injection, Feasibility Analysis, Kanban Board (Atelier), Kanban Agents Demo (demo.gif) (+7 more)

### Community 44 - "Chart Primitives"
Cohesion: 0.14
Nodes (12): SettingsModal(), NAV_ENTRIES, NavEntry, Sidebar(), SidebarProps, SidebarView, WorktreeSessionsView(), WorktreeSessionsViewProps (+4 more)

### Community 45 - "Session Hub Transcript"
Cohesion: 0.12
Nodes (27): loadTree(), saveTree(), storageKey(), useTerminals, ShortcutDetail, UseTerminalShortcutsOptions, groupOrientation(), layoutToSizes() (+19 more)

### Community 46 - "Community 46"
Cohesion: 0.42
Nodes (11): AgentProfileConfigProps, ImplementationAgentFieldsProps, NewProfile, NewTicket, ProfilePatch, AgentKnobs, AgentProfileConfigValues, ResolvedAgentDefaults (+3 more)

### Community 47 - "Modal Dialogs"
Cohesion: 0.19
Nodes (15): PrdReviewDialogProps, QuitConfirmModal(), QuitConfirmModalProps, TerminalsView(), TerminalsViewProps, useTerminalShortcuts(), collectTerminalIds(), Button (+7 more)

### Community 48 - "Community 48"
Cohesion: 0.22
Nodes (11): PrdAnnotator(), PrdAnnotatorProps, PrdView(), AnnotatedHtml, compileFeedback(), injectAnnotations(), isInsideAnnotation(), PrdAnnotation (+3 more)

### Community 49 - "Slot State"
Cohesion: 0.16
Nodes (12): ChartConfig, ChartContainer, ChartContainerProps, ChartContext, ChartContextValue, ChartLegendContent(), ChartLegendContentProps, ChartTooltipContent() (+4 more)

### Community 50 - "Stats Hooks & Cards"
Cohesion: 0.11
Nodes (21): BASH_ALLOWLIST, buildFeasibilitySessionConfig(), buildImplementSessionConfig(), buildTriageSessionConfig(), CONTRACT_SKILLS, DENIED_BUILTIN_AGENTS, feasibilityScoutAgent(), FeasibilitySessionInput (+13 more)

### Community 51 - "Community 51"
Cohesion: 0.09
Nodes (5): SessionHub, Watchdog, ClientHub, Notifier, Comment

### Community 53 - "User Terminal Manager"
Cohesion: 0.24
Nodes (13): buildSplitChannelPrompt(), buildTicketLines(), isEnglish(), buildContractConstraintsLines(), buildResponseFormatLines(), buildStrictRulesLines(), buildTicketLines(), buildTriageChannelPrompt() (+5 more)

### Community 54 - "Community 54"
Cohesion: 0.17
Nodes (14): PrdReviewDialog(), AUTHOR_BADGES, CommentRow(), CommentRowProps, isLocked(), TicketDetail(), TriageSection(), TriageSectionProps (+6 more)

### Community 55 - "Community 55"
Cohesion: 0.25
Nodes (6): Architecture, Commands, Conventions (enforced — beyond the global ones in ~/.claude/CLAUDE.md), graphify, The dry-run safety model — read before running anything, What this is

### Community 57 - "Community 57"
Cohesion: 0.18
Nodes (3): BoardStore, Listener, WsClientEvent

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
Cohesion: 0.48
Nodes (4): PrSelectRow(), PrSelectRowProps, isPrNeedsAttention(), OpenPr

### Community 62 - "Badge Component"
Cohesion: 0.09
Nodes (20): CLAUDE_JSON_PATH, COMPOSER_BINARIES, detectInstallCommand(), extractPrUrl(), ghPrSchema, ghPrStateSchema, ghReviewSchema, ghReviewsSchema (+12 more)

### Community 63 - "Community 63"
Cohesion: 0.24
Nodes (6): buildSplitSessionConfig(), DRY_RUN_RESULT, log, PendingSplit, SplitManager, SplitResult

### Community 66 - "Community 66"
Cohesion: 0.20
Nodes (8): TERMINAL_THEME, terminalWsUrl(), textEncoder, useXtermSocket, UseXtermSocketOptions, terminalServerMessageSchema, TerminalCell(), TerminalCellProps

### Community 67 - "Community 67"
Cohesion: 0.24
Nodes (5): mapProfileRow(), emit(), refreshProfiles(), subscribers, Profile

### Community 75 - "Community 75"
Cohesion: 0.33
Nodes (4): currentNow, startTicking(), subscribe(), subscribers

### Community 76 - "Community 76"
Cohesion: 0.40
Nodes (5): MIME_EXTENSIONS, resolveExtension(), SavedUpload, saveUpload(), serveUpload()

### Community 77 - "Community 77"
Cohesion: 0.14
Nodes (21): AgentProfileConfig(), AskPanel(), ImplementationAgentFields(), ProfilesSettings(), loadOnce(), subscribers, UNKNOWN_CAPABILITIES, useCapabilities() (+13 more)

### Community 78 - "Community 78"
Cohesion: 0.40
Nodes (3): log, createSystemAdapter(), SystemAdapter

### Community 81 - "Community 81"
Cohesion: 0.33
Nodes (4): CsvParseError, ParsedTicketRow, ParsedTicketsCsv, parseTicketsCsv()

## Knowledge Gaps
- **386 isolated node(s):** `IMPLEMENTER_SAFE_TOOLS`, `CONTRACT_SKILLS`, `NO_SKILLS`, `READONLY_TOOLS`, `READONLY_PLAIN_DISALLOWED` (+381 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `RealSystemAdapter` connect `Real System Adapter` to `Desktop Bootstrap & Menus`, `Claude SDK Provider`, `Ticket Config & Constants`, `Community 78`, `Real Adapter GH/Composer`, `Community 61`, `Badge Component`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **Why does `Ticket` connect `Database Store Operations` to `Contract Building & Slots`, `Terminals UI & Notifications`, `Ticket Action Panels`, `Shared Zod Schemas`, `Board & Sidebar Layout`, `API Routes & Reformulate`, `Live Terminal Views`, `Stage Progress & Display`, `DB Row Schemas & Mappers`, `Client Hub & Watchdog`, `Cost & Pricing`, `Workflow View & Lifecycle`, `Board Columns`, `Community 38`, `Agent Coordinator Handlers`, `API Client Inputs`, `Chart Primitives`, `Stats Hooks & Cards`, `Community 51`, `User Terminal Manager`, `Community 54`, `Community 56`, `Community 57`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **Why does `Store` connect `Database Store Operations` to `User Terminal & Fake IO`, `Desktop Bootstrap & Menus`, `Feasibility Batch Management`, `Community 67`, `Community 38`, `Board & Sidebar Layout`, `Community 79`, `API Routes & Reformulate`, `Triage & Server Hub`, `Community 51`, `Tick Timer Hook`, `Community 56`, `Client Hub & Watchdog`, `Workflow View & Lifecycle`, `Community 63`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **What connects `IMPLEMENTER_SAFE_TOOLS`, `CONTRACT_SKILLS`, `NO_SKILLS` to the rest of the system?**
  _386 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Contract Building & Slots` be split into smaller, more focused modules?**
  _Cohesion score 0.09471153846153846 - nodes in this community are weakly interconnected._
- **Should `Terminals UI & Notifications` be split into smaller, more focused modules?**
  _Cohesion score 0.13450292397660818 - nodes in this community are weakly interconnected._
- **Should `Desktop Bootstrap & Menus` be split into smaller, more focused modules?**
  _Cohesion score 0.08048780487804878 - nodes in this community are weakly interconnected._