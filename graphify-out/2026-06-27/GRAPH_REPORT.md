# Graph Report - kanban-agents  (2026-06-27)

## Corpus Check
- 142 files · ~631,333 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1434 nodes · 3415 edges · 75 communities (61 shown, 14 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 12 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ffbcb417`
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
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 83|Community 83]]

## God Nodes (most connected - your core abstractions)
1. `Ticket` - 65 edges
2. `Store` - 62 edges
3. `cn()` - 58 edges
4. `SlotManager` - 49 edges
5. `RealSystemAdapter` - 46 edges
6. `FakeSystemAdapter` - 41 edges
7. `ProjectInfo` - 39 edges
8. `ClientHub` - 29 edges
9. `getProject()` - 28 edges
10. `isProjectKey()` - 26 edges

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

## Communities (75 total, 14 thin omitted)

### Community 0 - "Slot & Project Config"
Cohesion: 0.14
Nodes (4): resolveBaseBranch(), SlotManager, slotPath(), slugify()

### Community 1 - "Agents & Ticket UI"
Cohesion: 0.07
Nodes (48): AgentCard(), AgentCardProps, AgentsView(), normalize(), PROGRESS_BAR_COLORS, StageProgressBar(), StageProgressBarProps, TicketBadges() (+40 more)

### Community 2 - "Terminal Split View"
Cohesion: 0.08
Nodes (36): loadTree(), saveTree(), storageKey(), useTerminals, ShortcutDetail, UseTerminalShortcutsOptions, TERMINAL_THEME, terminalWsUrl() (+28 more)

### Community 3 - "MCP Channels & Workers"
Cohesion: 0.14
Nodes (15): ClientHub, Column vs Stage axes, Done Gate (server-verified), repoMutex (KeyedMutex), rows.ts (zod row validation), Slot (git-worktree execution unit), SlotManager, Stop Hook Auto-Nudge Escalation (+7 more)

### Community 4 - "API Schemas & Inputs"
Cohesion: 0.05
Nodes (53): AnalyzeTicketsInput, appSettingsSchema, baseBranchSchema, Capabilities, capabilitiesSchema, Comment, commentAuthorSchema, commentSchema (+45 more)

### Community 5 - "UI Utilities & Layout"
Cohesion: 0.09
Nodes (22): TabButton(), NAV_ENTRIES, NavEntry, Sidebar(), SidebarProps, SidebarView, SlotsBar(), Stat() (+14 more)

### Community 7 - "PR & Ticket Panels"
Cohesion: 0.08
Nodes (27): MCP Channel, No-SDK Design Choice, Two-Channel Agent Protocol, Worker (MCP channel server), WorkerHub, Channel (agent↔backend link), Protocol (wire-format source of truth), Claude Code Channels setup (+19 more)

### Community 8 - "Terminal Session Manager"
Cohesion: 0.10
Nodes (14): dataMessage(), log, normalizeSeed(), safeParse(), send(), TerminalSession, TerminalSessionManager, TerminalSocket (+6 more)

### Community 10 - "Stats Charts & Records"
Cohesion: 0.13
Nodes (18): StatsViewProps, ACTIVE_BAR, AREA_CURSOR, AXIS_PROPS, BAR_CURSOR, CHART_PALETTE, CostChart(), DurationChart() (+10 more)

### Community 11 - "Fake System Adapter"
Cohesion: 0.13
Nodes (3): delay(), FakeSystemAdapter, WorktreeSetupOptions

### Community 12 - "Agent Profile & Ask Panel"
Cohesion: 0.10
Nodes (24): DRY_RUN_VERDICT, log, TriageManagerConfig, TriageSession, log, runFirstBootSetup(), ClientSocket, ClientSocketData (+16 more)

### Community 13 - "Worker Protocol Schemas"
Cohesion: 0.09
Nodes (23): log, ToolHandler, ToolResult, TRIAGE_VERDICTS, AgentSettableStage, agentSettableStageSchema, askUserArgsSchema, AssertNamesCovered (+15 more)

### Community 14 - "Real Worktree Shell Ops"
Cohesion: 0.11
Nodes (16): CLAUDE_JSON_PATH, COMPOSER_BINARIES, detectInstallCommand(), ghPrSchema, ghPrStateSchema, ghReviewSchema, ghReviewsSchema, INSTALL_COMMANDS (+8 more)

### Community 15 - "Feasibility Batch Manager"
Cohesion: 0.09
Nodes (10): FeasibilityBatchManager, feasibilitySessionName(), toTriageResult(), TriageManager, triageSessionName(), RouteDeps, UserTerminalManager, FeasibilityResult (+2 more)

### Community 16 - "Stats Aggregation & Cost"
Cohesion: 0.10
Nodes (26): effectiveWorkDurationMs(), CostGroup, DurationGroup, KIND_LABELS, KindCount, kindCounts(), meanDurationByEffort(), meanDurationByKey() (+18 more)

### Community 17 - "API Routes & Schemas"
Cohesion: 0.07
Nodes (21): buildReformulatePrompt(), log, PaneReader, analyzeTicketsSchema, createAskSchema, createCleanSchema, createCommentSchema, createProfileSchema (+13 more)

### Community 18 - "Ticket Detail & Forms"
Cohesion: 0.12
Nodes (34): AskPanelProps, CleanPrPanel(), CleanPrPanelProps, ImportTicketsPanel(), ImportTicketsPanelProps, NewTicketDialogProps, Tab, TAB_TITLES (+26 more)

### Community 19 - "Board Store & Notifications"
Cohesion: 0.07
Nodes (33): AnnotatedHtml, isInsideAnnotation(), PrdAnnotation, PrdReviewDialog(), PrdReviewDialogProps, SelectionState, wrapFirstOccurrence(), QuitConfirmModalProps (+25 more)

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
Cohesion: 0.12
Nodes (11): active, ensureNotificationPermission(), isSupported(), playNotificationSound(), showDesktopNotification(), BoardState, BoardStore, CommentListener (+3 more)

### Community 24 - "Build Scripts"
Cohesion: 0.10
Nodes (20): scripts, build:desktop, build:web, dev, dev:desktop, dev:proxy, dev:server, dev:web (+12 more)

### Community 25 - "Pricing & Token Cost"
Cohesion: 0.15
Nodes (21): formatTokens(), TicketCost(), TicketCostProps, TOKEN_FORMATTER, USD_FORMATTER, AGENT_MODEL_LABELS, costByFamily(), costOf() (+13 more)

### Community 26 - "Desktop Bootstrap"
Cohesion: 0.14
Nodes (16): mapCommentRow(), mapWorktreeSessionRow(), enrichWorktreeSession(), NewClean, NewReview, SlotStatus, SqlBindValue, SqlUpdateBuilder (+8 more)

### Community 27 - "Worker Hub & Bridge"
Cohesion: 0.19
Nodes (6): AgentsViewProps, TicketBadgesProps, TicketCardProps, TicketLifecycle, Stage, Ticket

### Community 29 - "Board Columns"
Cohesion: 0.08
Nodes (26): buildFeasibilityBatchContract(), DRY_RUN_VERDICT, FeasibilityManagerConfig, FeasibilitySession, log, log, ReclaimOutcome, SETUP_PHASES (+18 more)

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
Cohesion: 0.36
Nodes (10): buildContractConstraintsLines(), buildResponseFormatLines(), buildStrictRulesLines(), buildTicketLines(), buildTriageChannelPrompt(), buildTriagePlusChannelPrompt(), isEnglish(), AGENT_EFFORTS (+2 more)

### Community 37 - "Settings Modal"
Cohesion: 0.08
Nodes (31): AgentProfileConfig(), AskPanel(), ImplementationAgentFields(), DragHandleAttributes, DragHandleListeners, IMPLEMENTER_OPTIONS, LANGUAGE_OPTIONS, ProfileRowProps (+23 more)

### Community 38 - "Server Entry & Static"
Cohesion: 0.15
Nodes (15): applyDesktopEnv(), DesktopRoots, ensureConfig(), boot(), installApplicationMenu(), installMenuShortcutBridge(), menuShortcutActionSchema, newWindowEventSchema (+7 more)

### Community 39 - "System Adapter Types"
Cohesion: 0.06
Nodes (36): BASH_ALLOWLIST, buildImplementSessionConfig(), implementerAgent(), ImplementSessionInput, prFixerAgent(), LiveSession, log, previewToolInput() (+28 more)

### Community 40 - "Coordinator & Hub Wiring"
Cohesion: 0.18
Nodes (3): FakePaneStream, fakeShellPrompt(), hexToBytes()

### Community 41 - "Chart Components"
Cohesion: 0.16
Nodes (12): ChartConfig, ChartContainer, ChartContainerProps, ChartContext, ChartContextValue, ChartLegendContent(), ChartLegendContentProps, ChartTooltipContent() (+4 more)

### Community 42 - "Triage Manager"
Cohesion: 0.15
Nodes (14): createDatabase(), migrate(), PROFILE_MIGRATIONS, seedProfiles(), seedSlots(), TICKET_MIGRATIONS, COLUMNS, COMMENT_AUTHORS (+6 more)

### Community 43 - "Community 43"
Cohesion: 0.39
Nodes (4): PrSelectRow(), PrSelectRowProps, isPrNeedsAttention(), OpenPr

### Community 44 - "Theme Management"
Cohesion: 0.24
Nodes (10): GeneralSettings(), useTheme(), UseThemeResult, applyTheme(), getStoredTheme(), isTheme(), Theme, ThemeOption (+2 more)

### Community 45 - "Agent Knobs & Models"
Cohesion: 0.18
Nodes (8): dryRunLog, FAKE_OPEN_PRS, fakeEncoder, GitWorktreeAddOptions, PaneSize, ReformulateOptions, ReviewDoneOptions, SpawnShellOptions

### Community 46 - "Community 46"
Cohesion: 0.20
Nodes (9): labelWithDefault(), TicketConfigSummary(), resolveEffort(), resolveModel(), AGENT_EFFORT_LABELS, IMPLEMENTER_LABELS, REVIEW_DEPTH_LABELS, agentEffortSchema (+1 more)

### Community 47 - "Triage Prompt Builder"
Cohesion: 0.22
Nodes (5): Architecture, Commands, Conventions (enforced — beyond the global ones in ~/.claude/CLAUDE.md), The dry-run safety model — read before running anything, What this is

### Community 48 - "User Terminal Manager"
Cohesion: 0.38
Nodes (12): AgentProfileConfigProps, ImplementationAgentFieldsProps, NewAsk, NewProfile, NewTicket, ProfilePatch, AgentKnobs, AgentProfileConfigValues (+4 more)

### Community 49 - "Database Schema & Seed"
Cohesion: 0.32
Nodes (6): useStats(), UseStatsResult, StatRecord, StatCard(), StatCardProps, StatEmpty()

### Community 51 - "Community 51"
Cohesion: 0.50
Nodes (4): QuitConfirmModal(), TerminalsView(), TerminalsViewProps, useTerminalShortcuts()

### Community 52 - "Stop Hook & Usage"
Cohesion: 0.40
Nodes (5): MIME_EXTENSIONS, resolveExtension(), SavedUpload, saveUpload(), serveUpload()

### Community 53 - "Community 53"
Cohesion: 0.33
Nodes (5): CONTEXT — domain glossary, Execution, Proposed (not yet built), Seams, Work items

### Community 55 - "Community 55"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 58 - "Webhook & Reply"
Cohesion: 0.33
Nodes (3): listeners, mcp, ReplyArgsSchema

### Community 59 - "Package Manifest"
Cohesion: 0.11
Nodes (5): log, Watchdog, ClientHub, Notifier, ACTIVE_STAGES

### Community 60 - "Community 60"
Cohesion: 0.14
Nodes (17): Board(), BoardProps, normalize(), NewTicketDialog(), Toaster(), WorkflowView(), WorktreeSessionsView(), useBoard() (+9 more)

### Community 61 - "Dry-Run Safety Model"
Cohesion: 0.67
Nodes (4): Dry-Run Safety Model, FakeSystemAdapter, RealSystemAdapter, SystemAdapter (side-effect boundary)

### Community 62 - "Projects Hook"
Cohesion: 0.40
Nodes (6): costByModel(), costByProject(), meanCostPerIssueUsd(), modelLabel(), totalSpendUsd(), withCost()

### Community 73 - "Community 73"
Cohesion: 0.26
Nodes (16): Composer 2.5 Implementer Path, buildAskContract(), buildCleanContract(), buildConflictResolutionContract(), buildFeasibilityContextSection(), buildImplementingSteps(), buildPlanningStep(), buildReviewContract() (+8 more)

### Community 74 - "Community 74"
Cohesion: 0.33
Nodes (4): CsvParseError, ParsedTicketRow, ParsedTicketsCsv, parseTicketsCsv()

### Community 77 - "Community 77"
Cohesion: 0.38
Nodes (3): SlotsBarProps, mapSlotRow(), Slot

## Knowledge Gaps
- **372 isolated node(s):** `log`, `SessionHubHandlers`, `AgentSessionToolResult`, `SDK_EFFORTS`, `bashCommandSchema` (+367 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Ticket` connect `Worker Hub & Bridge` to `Slot & Project Config`, `Agents & Ticket UI`, `API Schemas & Inputs`, `Store & Profiles`, `Agent Profile & Ask Panel`, `API Routes & Schemas`, `Ticket Detail & Forms`, `Board Store & Notifications`, `DB Rows & Mapping`, `Client Hub & Watchdog`, `Pricing & Token Cost`, `Desktop Bootstrap`, `Board Columns`, `Ticket Lifecycle`, `Agent Config Constants`, `Runtime Dependencies`, `System Adapter Types`, `Community 46`, `CONTEXT.md Glossary`, `Package Manifest`, `Community 60`, `Community 73`?**
  _High betweenness centrality (0.080) - this node is a cross-community bridge._
- **Why does `FakeSystemAdapter` connect `Fake System Adapter` to `System Adapter Types`, `Coordinator & Hub Wiring`, `Community 43`, `Agent Profile & Ask Panel`, `Agent Knobs & Models`, `App & Board Root`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Why does `SlotManager` connect `Slot & Project Config` to `Community 73`, `Agent Profile & Ask Panel`, `Worker Protocol Schemas`, `Feasibility Batch Manager`, `API Routes & Schemas`, `Package Manifest`, `Board Columns`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **What connects `log`, `SessionHubHandlers`, `AgentSessionToolResult` to the rest of the system?**
  _375 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Slot & Project Config` be split into smaller, more focused modules?**
  _Cohesion score 0.13636363636363635 - nodes in this community are weakly interconnected._
- **Should `Agents & Ticket UI` be split into smaller, more focused modules?**
  _Cohesion score 0.06836158192090395 - nodes in this community are weakly interconnected._
- **Should `Terminal Split View` be split into smaller, more focused modules?**
  _Cohesion score 0.07575757575757576 - nodes in this community are weakly interconnected._