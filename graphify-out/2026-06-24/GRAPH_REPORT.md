# Graph Report - slot-2  (2026-06-24)

## Corpus Check
- 144 files · ~103,514 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1458 nodes · 3422 edges · 86 communities (74 shown, 12 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 12 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `81ed50aa`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Slot & Project Config|Slot & Project Config]]
- [[_COMMUNITY_Agents & Ticket UI|Agents & Ticket UI]]
- [[_COMMUNITY_Terminal Split View|Terminal Split View]]
- [[_COMMUNITY_MCP Channels & Workers|MCP Channels & Workers]]
- [[_COMMUNITY_API Schemas & Inputs|API Schemas & Inputs]]
- [[_COMMUNITY_UI Utilities & Layout|UI Utilities & Layout]]
- [[_COMMUNITY_Review Done Gate (E2E)|Review Done Gate (E2E)]]
- [[_COMMUNITY_PR & Ticket Panels|PR & Ticket Panels]]
- [[_COMMUNITY_Terminal Session Manager|Terminal Session Manager]]
- [[_COMMUNITY_Store & Profiles|Store & Profiles]]
- [[_COMMUNITY_Stats Charts & Records|Stats Charts & Records]]
- [[_COMMUNITY_Fake System Adapter|Fake System Adapter]]
- [[_COMMUNITY_Agent Profile & Ask Panel|Agent Profile & Ask Panel]]
- [[_COMMUNITY_Worker Protocol Schemas|Worker Protocol Schemas]]
- [[_COMMUNITY_Real Worktree Shell Ops|Real Worktree Shell Ops]]
- [[_COMMUNITY_Feasibility Batch Manager|Feasibility Batch Manager]]
- [[_COMMUNITY_Stats Aggregation & Cost|Stats Aggregation & Cost]]
- [[_COMMUNITY_API Routes & Schemas|API Routes & Schemas]]
- [[_COMMUNITY_Ticket Detail & Forms|Ticket Detail & Forms]]
- [[_COMMUNITY_Board Store & Notifications|Board Store & Notifications]]
- [[_COMMUNITY_Dev Dependencies|Dev Dependencies]]
- [[_COMMUNITY_TypeScript Config|TypeScript Config]]
- [[_COMMUNITY_DB Rows & Mapping|DB Rows & Mapping]]
- [[_COMMUNITY_Client Hub & Watchdog|Client Hub & Watchdog]]
- [[_COMMUNITY_Build Scripts|Build Scripts]]
- [[_COMMUNITY_Pricing & Token Cost|Pricing & Token Cost]]
- [[_COMMUNITY_Desktop Bootstrap|Desktop Bootstrap]]
- [[_COMMUNITY_Worker Hub & Bridge|Worker Hub & Bridge]]
- [[_COMMUNITY_App & Board Root|App & Board Root]]
- [[_COMMUNITY_Board Columns|Board Columns]]
- [[_COMMUNITY_Logging|Logging]]
- [[_COMMUNITY_Terminals View & Modals|Terminals View & Modals]]
- [[_COMMUNITY_Ticket Lifecycle|Ticket Lifecycle]]
- [[_COMMUNITY_Agent Coordinator|Agent Coordinator]]
- [[_COMMUNITY_Ticket Store Types|Ticket Store Types]]
- [[_COMMUNITY_Agent Config Constants|Agent Config Constants]]
- [[_COMMUNITY_Runtime Dependencies|Runtime Dependencies]]
- [[_COMMUNITY_Settings Modal|Settings Modal]]
- [[_COMMUNITY_Server Entry & Static|Server Entry & Static]]
- [[_COMMUNITY_System Adapter Types|System Adapter Types]]
- [[_COMMUNITY_Coordinator & Hub Wiring|Coordinator & Hub Wiring]]
- [[_COMMUNITY_Chart Components|Chart Components]]
- [[_COMMUNITY_Triage Manager|Triage Manager]]
- [[_COMMUNITY_Slot Workflow View|Slot Workflow View]]
- [[_COMMUNITY_Theme Management|Theme Management]]
- [[_COMMUNITY_Agent Knobs & Models|Agent Knobs & Models]]
- [[_COMMUNITY_Fake Pane Stream|Fake Pane Stream]]
- [[_COMMUNITY_Triage Prompt Builder|Triage Prompt Builder]]
- [[_COMMUNITY_User Terminal Manager|User Terminal Manager]]
- [[_COMMUNITY_Database Schema & Seed|Database Schema & Seed]]
- [[_COMMUNITY_Triage Verdicts & Config|Triage Verdicts & Config]]
- [[_COMMUNITY_AGENTS.md Docs|AGENTS.md Docs]]
- [[_COMMUNITY_Stop Hook & Usage|Stop Hook & Usage]]
- [[_COMMUNITY_PR Selection|PR Selection]]
- [[_COMMUNITY_CONTEXT.md Glossary|CONTEXT.md Glossary]]
- [[_COMMUNITY_CSV Ticket Parsing|CSV Ticket Parsing]]
- [[_COMMUNITY_File Uploads|File Uploads]]
- [[_COMMUNITY_PreToolUse Hook Guard|PreToolUse Hook Guard]]
- [[_COMMUNITY_Webhook & Reply|Webhook & Reply]]
- [[_COMMUNITY_Package Manifest|Package Manifest]]
- [[_COMMUNITY_Session Spawning Options|Session Spawning Options]]
- [[_COMMUNITY_Dry-Run Safety Model|Dry-Run Safety Model]]
- [[_COMMUNITY_Projects Hook|Projects Hook]]
- [[_COMMUNITY_Composer Run Script|Composer Run Script]]
- [[_COMMUNITY_Vite Config|Vite Config]]
- [[_COMMUNITY_Config Split Doc|Config Split Doc]]
- [[_COMMUNITY_No Type Casting Doc|No Type Casting Doc]]
- [[_COMMUNITY_TriageFeasibility Doc|Triage/Feasibility Doc]]
- [[_COMMUNITY_Theme Flash Guard Doc|Theme Flash Guard Doc]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 82|Community 82]]
- [[_COMMUNITY_Community 83|Community 83]]
- [[_COMMUNITY_Community 86|Community 86]]

## God Nodes (most connected - your core abstractions)
1. `Ticket` - 64 edges
2. `Store` - 62 edges
3. `cn()` - 58 edges
4. `RealSystemAdapter` - 48 edges
5. `SlotManager` - 46 edges
6. `FakeSystemAdapter` - 41 edges
7. `ProjectInfo` - 39 edges
8. `ClientHub` - 29 edges
9. `getProject()` - 26 edges
10. `AgentCoordinator` - 24 edges

## Surprising Connections (you probably didn't know these)
- `Standalone Webhook Channel Example` --semantically_similar_to--> `Worker (MCP channel server)`  [INFERRED] [semantically similar]
  docs/claude-code-channels.md → AGENTS.md
- `Channel (agent↔backend link)` --semantically_similar_to--> `MCP Channel`  [INFERRED] [semantically similar]
  CONTEXT.md → AGENTS.md
- `Channel (agent↔backend link)` --semantically_similar_to--> `Two-Channel Agent Protocol`  [INFERRED] [semantically similar]
  CONTEXT.md → AGENTS.md
- `boot()` --calls--> `startServer()`  [INFERRED]
  desktop/index.ts → src/server/index.ts
- `Column vs Stage axes` --rationale_for--> `Column (board lane)`  [INFERRED]
  AGENTS.md → CONTEXT.md

## Import Cycles
- None detected.

## Communities (86 total, 12 thin omitted)

### Community 0 - "Slot & Project Config"
Cohesion: 0.11
Nodes (11): SlotManager, slotPath(), slugify(), AGENT_DIST_SUBPATH, BASH_ALLOWLIST, buildImplementerAgentMd(), buildMcpJson(), buildPrFixerAgentMd() (+3 more)

### Community 1 - "Agents & Ticket UI"
Cohesion: 0.07
Nodes (46): AgentCard(), AgentCardProps, PROGRESS_BAR_COLORS, StageProgressBar(), StageProgressBarProps, TicketBadges(), projectBadgeStyle(), resolveProjectColor() (+38 more)

### Community 2 - "Terminal Split View"
Cohesion: 0.06
Nodes (46): FullscreenToggle(), FullscreenToggleProps, badgeLabelFor(), LiveTerminal(), LiveTerminalOptions, LiveTerminalProps, TerminalData, TerminalView() (+38 more)

### Community 3 - "MCP Channels & Workers"
Cohesion: 0.14
Nodes (15): ClientHub, Column vs Stage axes, Done Gate (server-verified), repoMutex (KeyedMutex), rows.ts (zod row validation), Slot (git-worktree execution unit), SlotManager, Stop Hook Auto-Nudge Escalation (+7 more)

### Community 4 - "API Schemas & Inputs"
Cohesion: 0.06
Nodes (34): appSettingsSchema, baseBranchSchema, capabilitiesSchema, commentAuthorSchema, commentSchema, CreateTerminalBody, EXTERNAL_URL_PROTOCOLS, externalUrlSchema (+26 more)

### Community 5 - "UI Utilities & Layout"
Cohesion: 0.11
Nodes (23): NewTicketDialog(), AUTHOR_BADGES, AuthorBadge(), CommentRow(), CommentRowProps, TriageSection(), TriageSectionProps, TICKET_OPTION (+15 more)

### Community 6 - "Review Done Gate (E2E)"
Cohesion: 0.08
Nodes (3): RealSystemAdapter, safeJsonParse(), DoneGateResult

### Community 7 - "PR & Ticket Panels"
Cohesion: 0.08
Nodes (27): MCP Channel, No-SDK Design Choice, Two-Channel Agent Protocol, Worker (MCP channel server), WorkerHub, Channel (agent↔backend link), Protocol (wire-format source of truth), Claude Code Channels setup (+19 more)

### Community 8 - "Terminal Session Manager"
Cohesion: 0.11
Nodes (13): dataMessage(), log, normalizeSeed(), safeParse(), send(), TerminalSession, TerminalSessionManager, TerminalSocketData (+5 more)

### Community 9 - "Store & Profiles"
Cohesion: 0.07
Nodes (9): TicketBadgesProps, TicketCardProps, mapSlotRow(), Store, TicketLifecycle, AppSettings, Profile, Ticket (+1 more)

### Community 10 - "Stats Charts & Records"
Cohesion: 0.13
Nodes (18): StatsViewProps, ACTIVE_BAR, AREA_CURSOR, AXIS_PROPS, BAR_CURSOR, CHART_PALETTE, CostChart(), DurationChart() (+10 more)

### Community 11 - "Fake System Adapter"
Cohesion: 0.13
Nodes (4): delay(), FakeSystemAdapter, GitWorktreeAddOptions, WorktreeSetupOptions

### Community 12 - "Agent Profile & Ask Panel"
Cohesion: 0.13
Nodes (22): AgentProfileConfig(), AskPanel(), ImplementationAgentFields(), labelWithDefault(), TicketConfigSummary(), loadOnce(), subscribers, UNKNOWN_CAPABILITIES (+14 more)

### Community 13 - "Worker Protocol Schemas"
Cohesion: 0.09
Nodes (22): AgentSettableStage, agentSettableStageSchema, AssertNamesCovered, channelEventSchema, isWorkerToolName(), submitFeasibilityMcpArgsSchema, submitTriageMcpArgsSchema, triageVerdictSchema (+14 more)

### Community 14 - "Real Worktree Shell Ops"
Cohesion: 0.08
Nodes (23): CLAUDE_JSON_PATH, COMPOSER_BINARIES, detectInstallCommand(), FEASIBILITY_DENIED_AGENTS, FEASIBILITY_SCOUT_AGENTS_JSON, FEASIBILITY_SETTINGS_JSON, ghPrSchema, ghPrStateSchema (+15 more)

### Community 15 - "Feasibility Batch Manager"
Cohesion: 0.14
Nodes (12): buildFeasibilityBatchContract(), DRY_RUN_VERDICT, FeasibilityBatchManager, FeasibilityManagerConfig, FeasibilitySession, feasibilitySessionName(), log, toTriageResult() (+4 more)

### Community 16 - "Stats Aggregation & Cost"
Cohesion: 0.10
Nodes (26): effectiveWorkDurationMs(), CostGroup, DurationGroup, KIND_LABELS, KindCount, kindCounts(), meanDurationByEffort(), meanDurationByKey() (+18 more)

### Community 17 - "API Routes & Schemas"
Cohesion: 0.07
Nodes (21): agentActiveSchema, log, PaneReader, stopHookSchema, analyzeTicketsSchema, createAskSchema, createCleanSchema, createCommentSchema (+13 more)

### Community 18 - "Ticket Detail & Forms"
Cohesion: 0.13
Nodes (29): AgentsViewProps, AskPanelProps, CleanPrPanel(), CleanPrPanelProps, NewTicketDialogProps, Tab, TAB_TITLES, TabButton() (+21 more)

### Community 20 - "Dev Dependencies"
Cohesion: 0.08
Nodes (25): devDependencies, autoprefixer, class-variance-authority, clsx, concurrently, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities (+17 more)

### Community 21 - "TypeScript Config"
Cohesion: 0.08
Nodes (24): compilerOptions, allowImportingTsExtensions, baseUrl, esModuleInterop, isolatedModules, jsx, lib, module (+16 more)

### Community 22 - "DB Rows & Mapping"
Cohesion: 0.08
Nodes (24): CommentRow, commentRowSchema, mapProfileRow(), mapTicketRow(), parseSessionUsage(), ProfileRow, profileRowSchema, projectSchema (+16 more)

### Community 23 - "Client Hub & Watchdog"
Cohesion: 0.10
Nodes (4): Watchdog, ClientHub, Notifier, WorkerHub

### Community 24 - "Build Scripts"
Cohesion: 0.09
Nodes (23): scripts, build:agents, build:desktop, build:hooks, build:web, build:worker, dev, dev:desktop (+15 more)

### Community 25 - "Pricing & Token Cost"
Cohesion: 0.15
Nodes (21): formatTokens(), TicketCost(), TicketCostProps, TOKEN_FORMATTER, USD_FORMATTER, AGENT_MODEL_LABELS, costByFamily(), costOf() (+13 more)

### Community 26 - "Desktop Bootstrap"
Cohesion: 0.15
Nodes (15): applyDesktopEnv(), DesktopRoots, ensureConfig(), boot(), installApplicationMenu(), installMenuShortcutBridge(), menuShortcutActionSchema, newWindowEventSchema (+7 more)

### Community 27 - "Worker Hub & Bridge"
Cohesion: 0.20
Nodes (3): ChannelEvent, WorkerOutbound, BackendBridge

### Community 28 - "App & Board Root"
Cohesion: 0.19
Nodes (12): AgentsView(), normalize(), Toaster(), COLUMN_NODE_COLOR, WorkflowView(), WorkflowViewProps, WorktreeSessionsView(), useBoard() (+4 more)

### Community 29 - "Board Columns"
Cohesion: 0.10
Nodes (18): resolveBaseBranch(), log, ReclaimOutcome, SETUP_PHASES, SlotManagerConfig, log, SlotWatch, WorktreeAddressWatcher (+10 more)

### Community 30 - "Logging"
Cohesion: 0.23
Nodes (5): Logger, paint(), ScopedLogger, serializeFields(), timestamp()

### Community 31 - "Terminals View & Modals"
Cohesion: 0.10
Nodes (16): AnnotatedHtml, isInsideAnnotation(), PrdAnnotation, PrdReviewDialog(), PrdReviewDialogProps, SelectionState, wrapFirstOccurrence(), Textarea (+8 more)

### Community 32 - "Ticket Lifecycle"
Cohesion: 0.14
Nodes (12): BoardColumn(), BoardColumnProps, DEFAULT_COLLAPSED, resolveAnalyzeAllTitle(), resolveCheckAllTitle(), resolveMoveAllTitle(), SortDir, useWindowedTickets() (+4 more)

### Community 33 - "Agent Coordinator"
Cohesion: 0.17
Nodes (3): AgentCoordinator, ToolCallContext, WorkerToolName

### Community 34 - "Ticket Store Types"
Cohesion: 0.13
Nodes (29): AgentProfileConfigProps, ImplementationAgentFieldsProps, mapCommentRow(), mapWorktreeSessionRow(), enrichWorktreeSession(), NewAsk, NewClean, NewProfile (+21 more)

### Community 35 - "Agent Config Constants"
Cohesion: 0.11
Nodes (15): AnalyzeTicketsInput, Comment, CreateAskInput, CreateCleanInput, CreateCommentInput, CreateProfileInput, CreateReviewInput, CreateTicketInput (+7 more)

### Community 36 - "Runtime Dependencies"
Cohesion: 0.22
Nodes (7): Board(), BoardProps, normalize(), ACTIVE_STAGES, COLUMN_ORDER, COLUMNS, ConfirmDialog()

### Community 37 - "Settings Modal"
Cohesion: 0.08
Nodes (21): DragHandleAttributes, DragHandleListeners, GeneralSettings(), IMPLEMENTER_OPTIONS, LANGUAGE_OPTIONS, ProfileRowProps, ProfilesSettings(), SettingsModal() (+13 more)

### Community 38 - "Server Entry & Static"
Cohesion: 0.10
Nodes (19): runFirstBootSetup(), ClientSocket, PROJECT_ROOT, RunningServer, serveStaticAsset(), SocketData, startServer(), StartServerOptions (+11 more)

### Community 39 - "System Adapter Types"
Cohesion: 0.12
Nodes (9): dryRunLog, FAKE_OPEN_PRS, fakeEncoder, PaneSize, PrepareSlotFiles, ReformulateOptions, ReviewDoneOptions, SpawnShellOptions (+1 more)

### Community 40 - "Coordinator & Hub Wiring"
Cohesion: 0.61
Nodes (7): buildContractConstraintsLines(), buildResponseFormatLines(), buildStrictRulesLines(), buildTicketLines(), buildTriageChannelPrompt(), buildTriagePlusChannelPrompt(), isEnglish()

### Community 41 - "Chart Components"
Cohesion: 0.16
Nodes (12): ChartConfig, ChartContainer, ChartContainerProps, ChartContext, ChartContextValue, ChartLegendContent(), ChartLegendContentProps, ChartTooltipContent() (+4 more)

### Community 42 - "Triage Manager"
Cohesion: 0.20
Nodes (7): DRY_RUN_VERDICT, log, TriageManager, TriageManagerConfig, TriageSession, triageSessionName(), TriageResult

### Community 43 - "Slot Workflow View"
Cohesion: 0.48
Nodes (4): PrSelectRow(), PrSelectRowProps, isPrNeedsAttention(), OpenPr

### Community 44 - "Theme Management"
Cohesion: 0.31
Nodes (8): UseThemeResult, applyTheme(), getStoredTheme(), isTheme(), Theme, ThemeOption, THEMES, root

### Community 45 - "Agent Knobs & Models"
Cohesion: 0.14
Nodes (13): log, ToolHandler, ToolResult, ClientSocketData, NativeNotify, askUserArgsSchema, doneArgsSchema, failArgsSchema (+5 more)

### Community 46 - "Fake Pane Stream"
Cohesion: 0.18
Nodes (3): FakePaneStream, fakeShellPrompt(), hexToBytes()

### Community 47 - "Triage Prompt Builder"
Cohesion: 0.20
Nodes (14): QuitConfirmModal(), QuitConfirmModalProps, TerminalsView(), useTerminalShortcuts(), Button, ButtonProps, buttonVariants, ConfirmDialogProps (+6 more)

### Community 48 - "User Terminal Manager"
Cohesion: 0.11
Nodes (18): dependencies, dompurify, elysia, marked, @modelcontextprotocol/sdk, nanoid, papaparse, @radix-ui/react-toggle (+10 more)

### Community 49 - "Database Schema & Seed"
Cohesion: 0.28
Nodes (7): StatsView(), useStats(), UseStatsResult, StatRecord, StatCard(), StatCardProps, StatEmpty()

### Community 50 - "Triage Verdicts & Config"
Cohesion: 0.15
Nodes (11): AGENT_EFFORTS, AGENT_MODELS, COLUMN_LABELS, COLUMN_SORT_FIELD, COMMENT_AUTHORS, CommitLanguage, ProfileConfig, REVIEW_DEPTHS (+3 more)

### Community 51 - "AGENTS.md Docs"
Cohesion: 0.29
Nodes (5): NAV_ENTRIES, NavEntry, Sidebar(), SidebarProps, SidebarView

### Community 52 - "Stop Hook & Usage"
Cohesion: 0.33
Nodes (5): aggregateUsage(), ModelUsage, num(), StopHookInput, UsageByModel

### Community 54 - "CONTEXT.md Glossary"
Cohesion: 0.25
Nodes (6): SlotsBar(), SlotsBarProps, Stat(), StatProps, STATUS_LABELS, Slot

### Community 55 - "CSV Ticket Parsing"
Cohesion: 0.40
Nodes (6): costByModel(), costByProject(), meanCostPerIssueUsd(), modelLabel(), totalSpendUsd(), withCost()

### Community 56 - "File Uploads"
Cohesion: 0.40
Nodes (5): MIME_EXTENSIONS, resolveExtension(), SavedUpload, saveUpload(), serveUpload()

### Community 57 - "PreToolUse Hook Guard"
Cohesion: 0.33
Nodes (4): denied, DENY_PATTERNS, HookInput, WRITE_EDIT_TOOLS

### Community 58 - "Webhook & Reply"
Cohesion: 0.33
Nodes (3): listeners, mcp, ReplyArgsSchema

### Community 59 - "Package Manifest"
Cohesion: 0.27
Nodes (7): ImportTicketsPanel(), ImportTicketsPanelProps, useAgentKnobs(), CsvParseError, ParsedTicketRow, ParsedTicketsCsv, parseTicketsCsv()

### Community 60 - "Session Spawning Options"
Cohesion: 0.31
Nodes (8): createDatabase(), migrate(), PROFILE_MIGRATIONS, seedProfiles(), seedSlots(), TICKET_MIGRATIONS, DEFAULT_PROFILES, SLOT_COUNT

### Community 61 - "Dry-Run Safety Model"
Cohesion: 0.67
Nodes (4): Dry-Run Safety Model, FakeSystemAdapter, RealSystemAdapter, SystemAdapter (side-effect boundary)

### Community 62 - "Projects Hook"
Cohesion: 0.22
Nodes (5): Architecture, Commands, Conventions (enforced — beyond the global ones in ~/.claude/CLAUDE.md), The dry-run safety model — read before running anything, What this is

### Community 73 - "Community 73"
Cohesion: 0.24
Nodes (17): Composer 2.5 Implementer Path, buildAskContract(), buildCleanContract(), buildConflictResolutionContract(), buildFeasibilityContextSection(), buildImplementingSteps(), buildPlanningStep(), buildReviewContract() (+9 more)

### Community 74 - "Community 74"
Cohesion: 0.33
Nodes (5): BACKEND_WS, SLOT_ID, TICKET_ID, /Users/antoineliu/kanban-agents/build/dev-macos-arm64/Atelier-dev.app/Contents/MacOS/bun, worker

### Community 75 - "Community 75"
Cohesion: 0.33
Nodes (5): CONTEXT — domain glossary, Execution, Proposed (not yet built), Seams, Work items

### Community 76 - "Community 76"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 77 - "Community 77"
Cohesion: 0.67
Nodes (3): loadOnce(), subscribers, useProjects()

### Community 78 - "Community 78"
Cohesion: 0.19
Nodes (11): active, ensureNotificationPermission(), isSupported(), playNotificationSound(), showDesktopNotification(), BoardState, CommentListener, Toast (+3 more)

### Community 86 - "Community 86"
Cohesion: 0.11
Nodes (16): log, log, PROJECT_KEYS, ANSI, COLOR_ENABLED, createLogger(), isLevel(), Level (+8 more)

## Knowledge Gaps
- **397 isolated node(s):** `/Users/antoineliu/kanban-agents/build/dev-macos-arm64/Atelier-dev.app/Contents/MacOS/bun`, `TICKET_ID`, `SLOT_ID`, `BACKEND_WS`, `menuShortcutActionSchema` (+392 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **12 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Ticket` connect `Store & Profiles` to `Slot & Project Config`, `Agents & Ticket UI`, `API Schemas & Inputs`, `UI Utilities & Layout`, `Agent Profile & Ask Panel`, `API Routes & Schemas`, `Ticket Detail & Forms`, `Board Store & Notifications`, `DB Rows & Mapping`, `Client Hub & Watchdog`, `Pricing & Token Cost`, `App & Board Root`, `Board Columns`, `Ticket Lifecycle`, `Ticket Store Types`, `Agent Config Constants`, `Runtime Dependencies`, `Coordinator & Hub Wiring`, `Agent Knobs & Models`, `Community 73`, `Community 78`, `Community 79`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **Why does `RealSystemAdapter` connect `Review Done Gate (E2E)` to `System Adapter Types`, `Slot Workflow View`, `Fake System Adapter`, `Real Worktree Shell Ops`, `PR Selection`, `Community 86`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **Why does `Ticket Lifecycle (deep module above store)` connect `MCP Channels & Workers` to `Agent Knobs & Models`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **What connects `/Users/antoineliu/kanban-agents/build/dev-macos-arm64/Atelier-dev.app/Contents/MacOS/bun`, `TICKET_ID`, `SLOT_ID` to the rest of the system?**
  _400 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Slot & Project Config` be split into smaller, more focused modules?**
  _Cohesion score 0.10530612244897959 - nodes in this community are weakly interconnected._
- **Should `Agents & Ticket UI` be split into smaller, more focused modules?**
  _Cohesion score 0.07138535995160314 - nodes in this community are weakly interconnected._
- **Should `Terminal Split View` be split into smaller, more focused modules?**
  _Cohesion score 0.05786090005844535 - nodes in this community are weakly interconnected._