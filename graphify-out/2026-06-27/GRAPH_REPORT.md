# Graph Report - kanban-agents  (2026-06-27)

## Corpus Check
- 141 files · ~631,043 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1440 nodes · 3436 edges · 86 communities (75 shown, 11 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 11 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2734f9da`
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
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Theme Management|Theme Management]]
- [[_COMMUNITY_Agent Knobs & Models|Agent Knobs & Models]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Triage Prompt Builder|Triage Prompt Builder]]
- [[_COMMUNITY_User Terminal Manager|User Terminal Manager]]
- [[_COMMUNITY_Database Schema & Seed|Database Schema & Seed]]
- [[_COMMUNITY_Triage Verdicts & Config|Triage Verdicts & Config]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Stop Hook & Usage|Stop Hook & Usage]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_CONTEXT.md Glossary|CONTEXT.md Glossary]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Webhook & Reply|Webhook & Reply]]
- [[_COMMUNITY_Package Manifest|Package Manifest]]
- [[_COMMUNITY_Community 60|Community 60]]
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
- [[_COMMUNITY_Community 80|Community 80]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 82|Community 82]]
- [[_COMMUNITY_Community 83|Community 83]]
- [[_COMMUNITY_Community 84|Community 84]]
- [[_COMMUNITY_Community 85|Community 85]]

## God Nodes (most connected - your core abstractions)
1. `Ticket` - 65 edges
2. `Store` - 62 edges
3. `cn()` - 58 edges
4. `SlotManager` - 49 edges
5. `RealSystemAdapter` - 47 edges
6. `FakeSystemAdapter` - 41 edges
7. `ProjectInfo` - 39 edges
8. `ClientHub` - 29 edges
9. `getProject()` - 28 edges
10. `isProjectKey()` - 26 edges

## Surprising Connections (you probably didn't know these)
- `Channel (agent↔backend link)` --semantically_similar_to--> `MCP Channel`  [INFERRED] [semantically similar]
  CONTEXT.md → AGENTS.md
- `Channel (agent↔backend link)` --semantically_similar_to--> `Two-Channel Agent Protocol`  [INFERRED] [semantically similar]
  CONTEXT.md → AGENTS.md
- `boot()` --calls--> `startServer()`  [INFERRED]
  desktop/index.ts → src/server/index.ts
- `Column vs Stage axes` --rationale_for--> `Column (board lane)`  [INFERRED]
  AGENTS.md → CONTEXT.md
- `Column vs Stage axes` --rationale_for--> `Stage (pipeline state)`  [INFERRED]
  AGENTS.md → CONTEXT.md

## Import Cycles
- None detected.

## Communities (86 total, 11 thin omitted)

### Community 0 - "Slot & Project Config"
Cohesion: 0.14
Nodes (4): resolveBaseBranch(), SlotManager, slotPath(), slugify()

### Community 1 - "Agents & Ticket UI"
Cohesion: 0.12
Nodes (19): PROGRESS_BAR_COLORS, StageProgressBar(), StageProgressBarProps, ANIMATED_STAGES, BadgeVariant, DATETIME_FORMAT, effectiveWorkDurationMs(), NON_DEPENDABLE_COLUMNS (+11 more)

### Community 2 - "Terminal Split View"
Cohesion: 0.08
Nodes (36): loadTree(), saveTree(), storageKey(), useTerminals, ShortcutDetail, UseTerminalShortcutsOptions, TERMINAL_THEME, terminalWsUrl() (+28 more)

### Community 3 - "MCP Channels & Workers"
Cohesion: 0.14
Nodes (15): ClientHub, Column vs Stage axes, Done Gate (server-verified), repoMutex (KeyedMutex), rows.ts (zod row validation), Slot (git-worktree execution unit), SlotManager, Stop Hook Auto-Nudge Escalation (+7 more)

### Community 4 - "API Schemas & Inputs"
Cohesion: 0.06
Nodes (32): appSettingsSchema, baseBranchSchema, capabilitiesSchema, commentAuthorSchema, commentSchema, CreateTerminalBody, EXTERNAL_URL_PROTOCOLS, externalUrlSchema (+24 more)

### Community 5 - "UI Utilities & Layout"
Cohesion: 0.08
Nodes (26): TabButton(), NAV_ENTRIES, NavEntry, Sidebar(), SidebarProps, SidebarView, StatsView(), AuthorBadge() (+18 more)

### Community 6 - "Review Done Gate (E2E)"
Cohesion: 0.07
Nodes (9): detectInstallCommand(), realpathSafe(), RealSystemAdapter, resolveWorktreeScriptCommand(), safeJsonParse(), shQuote(), DoneGateResult, ReviewDoneOptions (+1 more)

### Community 7 - "PR & Ticket Panels"
Cohesion: 0.15
Nodes (12): Agent runtime (Agent SDK), Architecture (overview), Atelier, Claude Code skills, Desktop app (macOS, optional), Electrobun dev on a new machine, Environment variables, Getting started (+4 more)

### Community 8 - "Terminal Session Manager"
Cohesion: 0.22
Nodes (11): dataMessage(), log, normalizeSeed(), send(), TerminalSession, TerminalSocket, TerminalSocketData, visibleText() (+3 more)

### Community 9 - "Store & Profiles"
Cohesion: 0.13
Nodes (3): mapProfileRow(), Store, Profile

### Community 10 - "Stats Charts & Records"
Cohesion: 0.11
Nodes (20): StatsViewProps, kindCounts(), Outcome, ACTIVE_BAR, AREA_CURSOR, AXIS_PROPS, BAR_CURSOR, CHART_PALETTE (+12 more)

### Community 11 - "Fake System Adapter"
Cohesion: 0.10
Nodes (3): delay(), fakeShellPrompt(), FakeSystemAdapter

### Community 12 - "Agent Profile & Ask Panel"
Cohesion: 0.13
Nodes (17): log, runFirstBootSetup(), PROJECT_ROOT, RunningServer, serveStaticAsset(), SocketData, startServer(), StartServerOptions (+9 more)

### Community 13 - "Worker Protocol Schemas"
Cohesion: 0.09
Nodes (23): log, ToolHandler, ToolResult, TRIAGE_VERDICTS, AgentSettableStage, agentSettableStageSchema, askUserArgsSchema, AssertNamesCovered (+15 more)

### Community 14 - "Real Worktree Shell Ops"
Cohesion: 0.12
Nodes (14): claudeProvider, CLAUDE_JSON_PATH, COMPOSER_BINARIES, extractPrUrl(), ghPrSchema, ghPrStateSchema, ghReviewSchema, ghReviewsSchema (+6 more)

### Community 15 - "Feasibility Batch Manager"
Cohesion: 0.13
Nodes (12): buildFeasibilityBatchContract(), DRY_RUN_VERDICT, FeasibilityBatchManager, FeasibilityManagerConfig, FeasibilitySession, feasibilitySessionName(), log, toTriageResult() (+4 more)

### Community 16 - "Stats Aggregation & Cost"
Cohesion: 0.14
Nodes (20): CostGroup, DurationGroup, KIND_LABELS, KindCount, meanDurationByEffort(), meanDurationByKey(), meanDurationByModel(), nextWeek() (+12 more)

### Community 17 - "API Routes & Schemas"
Cohesion: 0.07
Nodes (21): buildReformulatePrompt(), log, PaneReader, analyzeTicketsSchema, createAskSchema, createCleanSchema, createCommentSchema, createProfileSchema (+13 more)

### Community 18 - "Ticket Detail & Forms"
Cohesion: 0.14
Nodes (20): AgentsViewProps, AskPanelProps, CleanPrPanel(), CleanPrPanelProps, ImportTicketsPanelProps, NewTicketDialogProps, ProjectPrPicker(), ProjectPrPickerProps (+12 more)

### Community 19 - "Board Store & Notifications"
Cohesion: 0.11
Nodes (26): AnnotatedHtml, isInsideAnnotation(), PrdAnnotation, PrdReviewDialog(), PrdReviewDialogProps, SelectionState, wrapFirstOccurrence(), QuitConfirmModalProps (+18 more)

### Community 20 - "Dev Dependencies"
Cohesion: 0.08
Nodes (25): devDependencies, autoprefixer, class-variance-authority, clsx, concurrently, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities (+17 more)

### Community 21 - "TypeScript Config"
Cohesion: 0.08
Nodes (24): compilerOptions, allowImportingTsExtensions, baseUrl, esModuleInterop, isolatedModules, jsx, lib, module (+16 more)

### Community 22 - "DB Rows & Mapping"
Cohesion: 0.09
Nodes (23): CommentRow, commentRowSchema, mapTicketRow(), parseSessionUsage(), ProfileRow, profileRowSchema, projectSchema, SlotRow (+15 more)

### Community 23 - "Client Hub & Watchdog"
Cohesion: 0.13
Nodes (10): active, ensureNotificationPermission(), isSupported(), playNotificationSound(), showDesktopNotification(), BoardStore, CommentListener, Listener (+2 more)

### Community 24 - "Build Scripts"
Cohesion: 0.10
Nodes (20): scripts, build:desktop, build:web, dev, dev:desktop, dev:proxy, dev:server, dev:web (+12 more)

### Community 25 - "Pricing & Token Cost"
Cohesion: 0.16
Nodes (20): formatTokens(), TicketCost(), TicketCostProps, TOKEN_FORMATTER, USD_FORMATTER, costByFamily(), costOf(), costOfModel() (+12 more)

### Community 26 - "Desktop Bootstrap"
Cohesion: 0.12
Nodes (29): AgentProfileConfigProps, ImplementationAgentFieldsProps, mapCommentRow(), mapWorktreeSessionRow(), enrichWorktreeSession(), NewAsk, NewClean, NewProfile (+21 more)

### Community 27 - "Worker Hub & Bridge"
Cohesion: 0.16
Nodes (6): TicketBadgesProps, TicketCardProps, COLUMN_NODE_COLOR, WorkflowViewProps, TicketLifecycle, Ticket

### Community 28 - "App & Board Root"
Cohesion: 0.11
Nodes (15): AnalyzeTicketsInput, Comment, CreateAskInput, CreateCleanInput, CreateCommentInput, CreateProfileInput, CreateReviewInput, CreateTicketInput (+7 more)

### Community 29 - "Board Columns"
Cohesion: 0.09
Nodes (19): log, ReclaimOutcome, SETUP_PHASES, SlotManagerConfig, log, SlotWatch, WorktreeAddressWatcher, AppConfig (+11 more)

### Community 30 - "Logging"
Cohesion: 0.14
Nodes (13): ANSI, COLOR_ENABLED, isLevel(), Level, LEVEL_ORDER, LEVEL_TAG, Logger, paint() (+5 more)

### Community 31 - "Terminals View & Modals"
Cohesion: 0.23
Nodes (10): FullscreenToggle(), FullscreenToggleProps, badgeLabelFor(), LiveTerminal(), LiveTerminalOptions, LiveTerminalProps, TerminalData, TerminalView() (+2 more)

### Community 32 - "Ticket Lifecycle"
Cohesion: 0.12
Nodes (14): BoardColumn(), BoardColumnProps, DEFAULT_COLLAPSED, resolveAnalyzeAllTitle(), resolveCheckAllTitle(), resolveMoveAllTitle(), SortDir, useWindowedTickets() (+6 more)

### Community 34 - "Ticket Store Types"
Cohesion: 0.11
Nodes (18): dependencies, @anthropic-ai/claude-agent-sdk, dompurify, elysia, marked, @modelcontextprotocol/sdk, nanoid, papaparse (+10 more)

### Community 35 - "Agent Config Constants"
Cohesion: 0.21
Nodes (14): buildContractConstraintsLines(), buildResponseFormatLines(), buildStrictRulesLines(), buildTicketLines(), buildTriageChannelPrompt(), buildTriagePlusChannelPrompt(), isEnglish(), DRY_RUN_VERDICT (+6 more)

### Community 36 - "Runtime Dependencies"
Cohesion: 0.18
Nodes (14): WORKER_TOOLS, AgentSessionOptions, resolveClaudeBinary(), bashCommandSchema, buildSettings(), createSdkAgentSession(), dispatch(), pumpStream() (+6 more)

### Community 37 - "Settings Modal"
Cohesion: 0.08
Nodes (26): DragHandleAttributes, DragHandleListeners, GeneralSettings(), IMPLEMENTER_OPTIONS, LANGUAGE_OPTIONS, ProfileRowProps, ProfilesSettings(), SettingsModal() (+18 more)

### Community 38 - "Server Entry & Static"
Cohesion: 0.15
Nodes (15): applyDesktopEnv(), DesktopRoots, ensureConfig(), boot(), installApplicationMenu(), installMenuShortcutBridge(), menuShortcutActionSchema, newWindowEventSchema (+7 more)

### Community 39 - "System Adapter Types"
Cohesion: 0.09
Nodes (23): BASH_ALLOWLIST, buildImplementSessionConfig(), implementerAgent(), ImplementSessionInput, prFixerAgent(), LiveSession, log, previewToolInput() (+15 more)

### Community 40 - "Coordinator & Hub Wiring"
Cohesion: 0.26
Nodes (14): AgentCard(), AgentCardProps, AgentsView(), normalize(), TicketBadges(), projectBadgeStyle(), TicketCard(), TriageDot() (+6 more)

### Community 41 - "Chart Components"
Cohesion: 0.16
Nodes (12): ChartConfig, ChartContainer, ChartContainerProps, ChartContext, ChartContextValue, ChartLegendContent(), ChartLegendContentProps, ChartTooltipContent() (+4 more)

### Community 42 - "Triage Manager"
Cohesion: 0.36
Nodes (7): createDatabase(), migrate(), PROFILE_MIGRATIONS, seedProfiles(), seedSlots(), TICKET_MIGRATIONS, DEFAULT_PROFILES

### Community 43 - "Community 43"
Cohesion: 0.48
Nodes (4): PrSelectRow(), PrSelectRowProps, isPrNeedsAttention(), OpenPr

### Community 44 - "Theme Management"
Cohesion: 0.31
Nodes (8): UseThemeResult, applyTheme(), getStoredTheme(), isTheme(), Theme, ThemeOption, THEMES, root

### Community 45 - "Agent Knobs & Models"
Cohesion: 0.12
Nodes (9): dryRunLog, FAKE_OPEN_PRS, fakeEncoder, FakePaneStream, hexToBytes(), GitWorktreeAddOptions, PaneSize, ReformulateOptions (+1 more)

### Community 46 - "Community 46"
Cohesion: 0.14
Nodes (14): labelWithDefault(), TicketConfigSummary(), AGENT_EFFORT_LABELS, AGENT_MODEL_LABELS, COMMENT_AUTHORS, FAILURE_COLUMNS, IMPLEMENTER_LABELS, KINDS (+6 more)

### Community 47 - "Triage Prompt Builder"
Cohesion: 0.22
Nodes (5): Architecture, Commands, Conventions (enforced — beyond the global ones in ~/.claude/CLAUDE.md), The dry-run safety model — read before running anything, What this is

### Community 48 - "User Terminal Manager"
Cohesion: 0.16
Nodes (23): AgentProfileConfig(), AskPanel(), ImplementationAgentFields(), ImportTicketsPanel(), NewTicketDialog(), Tab, TAB_TITLES, TabButtonProps (+15 more)

### Community 49 - "Database Schema & Seed"
Cohesion: 0.32
Nodes (6): useStats(), UseStatsResult, StatRecord, StatCard(), StatCardProps, StatEmpty()

### Community 50 - "Triage Verdicts & Config"
Cohesion: 0.25
Nodes (5): BoardState, ClientSocket, ClientSocketData, WorktreeSession, WsClientEvent

### Community 51 - "Community 51"
Cohesion: 0.33
Nodes (7): MCP Channel, No-SDK Design Choice, Two-Channel Agent Protocol, Worker (MCP channel server), WorkerHub, Channel (agent↔backend link), Protocol (wire-format source of truth)

### Community 52 - "Stop Hook & Usage"
Cohesion: 0.40
Nodes (5): MIME_EXTENSIONS, resolveExtension(), SavedUpload, saveUpload(), serveUpload()

### Community 53 - "Community 53"
Cohesion: 0.33
Nodes (5): CONTEXT — domain glossary, Execution, Proposed (not yet built), Seams, Work items

### Community 54 - "CONTEXT.md Glossary"
Cohesion: 0.31
Nodes (3): TriageManager, triageSessionName(), TriageResult

### Community 55 - "Community 55"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 56 - "Community 56"
Cohesion: 0.24
Nodes (11): bashCommandSchema, buildSettings(), createSdkAgentSession(), dispatch(), pumpStream(), SDK_EFFORTS, SdkAgents, SdkEffort (+3 more)

### Community 58 - "Webhook & Reply"
Cohesion: 0.33
Nodes (3): listeners, mcp, ReplyArgsSchema

### Community 59 - "Package Manifest"
Cohesion: 0.15
Nodes (3): ClientHub, Notifier, SystemAdapter

### Community 60 - "Community 60"
Cohesion: 0.15
Nodes (16): Board(), BoardProps, normalize(), Toaster(), WorkflowView(), WorktreeSessionsView(), useBoard(), loadOnce() (+8 more)

### Community 61 - "Dry-Run Safety Model"
Cohesion: 0.67
Nodes (4): Dry-Run Safety Model, FakeSystemAdapter, RealSystemAdapter, SystemAdapter (side-effect boundary)

### Community 62 - "Projects Hook"
Cohesion: 0.40
Nodes (6): costByModel(), costByProject(), meanCostPerIssueUsd(), modelLabel(), totalSpendUsd(), withCost()

### Community 73 - "Community 73"
Cohesion: 0.17
Nodes (21): Composer 2.5 Implementer Path, buildAskContract(), buildCleanContract(), buildConflictResolutionContract(), buildFeasibilityContextSection(), buildImplementingSteps(), buildPlanningStep(), buildReviewContract() (+13 more)

### Community 74 - "Community 74"
Cohesion: 0.33
Nodes (4): CsvParseError, ParsedTicketRow, ParsedTicketsCsv, parseTicketsCsv()

### Community 75 - "Community 75"
Cohesion: 0.33
Nodes (5): resolveEffort(), resolveModel(), agentEffortSchema, agentModelSchema, Capabilities

### Community 77 - "Community 77"
Cohesion: 0.19
Nodes (7): SlotsBar(), SlotsBarProps, Stat(), StatProps, STATUS_LABELS, mapSlotRow(), Slot

### Community 79 - "Community 79"
Cohesion: 0.25
Nodes (3): RouteDeps, UserTerminalManager, TerminalDescriptor

### Community 80 - "Community 80"
Cohesion: 0.25
Nodes (3): log, Watchdog, ACTIVE_STAGES

### Community 81 - "Community 81"
Cohesion: 0.33
Nodes (4): currentNow, startTicking(), subscribe(), subscribers

### Community 82 - "Community 82"
Cohesion: 0.47
Nodes (4): Badge(), BadgeProps, BadgeVariant, badgeVariants

### Community 84 - "Community 84"
Cohesion: 0.33
Nodes (6): resolveProjectColor(), resolveProjectLabel(), isLocked(), TicketDetail(), finishedKindLabel(), stageVariant()

### Community 85 - "Community 85"
Cohesion: 0.50
Nodes (4): QuitConfirmModal(), TerminalsView(), TerminalsViewProps, useTerminalShortcuts()

## Knowledge Gaps
- **375 isolated node(s):** `AgentSessionToolResult`, `SDK_EFFORTS`, `bashCommandSchema`, `SdkEffort`, `SdkAgents` (+370 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Ticket` connect `Worker Hub & Bridge` to `Slot & Project Config`, `Agents & Ticket UI`, `API Schemas & Inputs`, `Store & Profiles`, `Feasibility Batch Manager`, `API Routes & Schemas`, `Ticket Detail & Forms`, `Board Store & Notifications`, `DB Rows & Mapping`, `Client Hub & Watchdog`, `Pricing & Token Cost`, `Desktop Bootstrap`, `App & Board Root`, `Board Columns`, `Ticket Lifecycle`, `Agent Config Constants`, `System Adapter Types`, `Coordinator & Hub Wiring`, `Community 46`, `Triage Verdicts & Config`, `Package Manifest`, `Community 60`, `Community 73`, `Community 82`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **Why does `Store` connect `Store & Profiles` to `Agent Config Constants`, `Terminal Session Manager`, `Agent Profile & Ask Panel`, `Worker Protocol Schemas`, `Community 77`, `Feasibility Batch Manager`, `Community 80`, `API Routes & Schemas`, `Triage Verdicts & Config`, `Community 79`, `Community 57`, `Desktop Bootstrap`, `Package Manifest`, `App & Board Root`, `Board Columns`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Why does `RealSystemAdapter` connect `Review Done Gate (E2E)` to `Runtime Dependencies`, `System Adapter Types`, `Terminal Session Manager`, `Community 43`, `Agent Profile & Ask Panel`, `Agent Knobs & Models`, `Real Worktree Shell Ops`, `Package Manifest`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **What connects `AgentSessionToolResult`, `SDK_EFFORTS`, `bashCommandSchema` to the rest of the system?**
  _378 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Slot & Project Config` be split into smaller, more focused modules?**
  _Cohesion score 0.13953488372093023 - nodes in this community are weakly interconnected._
- **Should `Agents & Ticket UI` be split into smaller, more focused modules?**
  _Cohesion score 0.12380952380952381 - nodes in this community are weakly interconnected._
- **Should `Terminal Split View` be split into smaller, more focused modules?**
  _Cohesion score 0.07575757575757576 - nodes in this community are weakly interconnected._