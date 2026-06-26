# Graph Report - slot-1  (2026-06-25)

## Corpus Check
- 144 files · ~106,603 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1470 nodes · 3460 edges · 93 communities (78 shown, 15 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 12 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1bb72484`
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
- [[_COMMUNITY_CSV Ticket Parsing|CSV Ticket Parsing]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_PreToolUse Hook Guard|PreToolUse Hook Guard]]
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
- [[_COMMUNITY_Community 90|Community 90]]
- [[_COMMUNITY_Community 91|Community 91]]
- [[_COMMUNITY_Community 92|Community 92]]

## God Nodes (most connected - your core abstractions)
1. `Ticket` - 64 edges
2. `Store` - 62 edges
3. `cn()` - 58 edges
4. `RealSystemAdapter` - 51 edges
5. `SlotManager` - 49 edges
6. `FakeSystemAdapter` - 44 edges
7. `ProjectInfo` - 39 edges
8. `ClientHub` - 29 edges
9. `getProject()` - 27 edges
10. `AgentCoordinator` - 25 edges

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

## Communities (93 total, 15 thin omitted)

### Community 0 - "Slot & Project Config"
Cohesion: 0.14
Nodes (3): SlotManager, slotPath(), slugify()

### Community 1 - "Agents & Ticket UI"
Cohesion: 0.20
Nodes (18): AgentCard(), AgentCardProps, TicketBadges(), projectBadgeStyle(), resolveProjectColor(), resolveProjectLabel(), TicketCard(), TriageDot() (+10 more)

### Community 2 - "Terminal Split View"
Cohesion: 0.13
Nodes (23): loadTree(), saveTree(), storageKey(), useTerminals, ShortcutDetail, UseTerminalShortcutsOptions, SplitTreeProps, applySizes() (+15 more)

### Community 3 - "MCP Channels & Workers"
Cohesion: 0.14
Nodes (15): ClientHub, Column vs Stage axes, Done Gate (server-verified), repoMutex (KeyedMutex), rows.ts (zod row validation), Slot (git-worktree execution unit), SlotManager, Stop Hook Auto-Nudge Escalation (+7 more)

### Community 4 - "API Schemas & Inputs"
Cohesion: 0.05
Nodes (35): COMMENT_AUTHORS, STAGES, appSettingsSchema, baseBranchSchema, capabilitiesSchema, commentAuthorSchema, commentSchema, CreateTerminalBody (+27 more)

### Community 5 - "UI Utilities & Layout"
Cohesion: 0.12
Nodes (21): TerminalsView(), TICKET_OPTION, TicketOptionsToggleGroup(), TicketOptionsToggleGroupProps, TicketOptionValues, useTerminalShortcuts(), cn(), groupOrientation() (+13 more)

### Community 6 - "Review Done Gate (E2E)"
Cohesion: 0.08
Nodes (5): RealSystemAdapter, safeJsonParse(), DoneGateResult, ReviewDoneOptions, SpawnTmuxOptions

### Community 7 - "PR & Ticket Panels"
Cohesion: 0.08
Nodes (27): MCP Channel, No-SDK Design Choice, Two-Channel Agent Protocol, Worker (MCP channel server), WorkerHub, Channel (agent↔backend link), Protocol (wire-format source of truth), Claude Code Channels setup (+19 more)

### Community 8 - "Terminal Session Manager"
Cohesion: 0.15
Nodes (12): dataMessage(), log, normalizeSeed(), safeParse(), send(), TerminalSession, TerminalSessionManager, TerminalSocketData (+4 more)

### Community 9 - "Store & Profiles"
Cohesion: 0.14
Nodes (3): mapProfileRow(), Store, Profile

### Community 10 - "Stats Charts & Records"
Cohesion: 0.13
Nodes (18): StatsViewProps, ACTIVE_BAR, AREA_CURSOR, AXIS_PROPS, BAR_CURSOR, CHART_PALETTE, CostChart(), DurationChart() (+10 more)

### Community 12 - "Agent Profile & Ask Panel"
Cohesion: 0.27
Nodes (8): AGENT_DIST_SUBPATH, BASH_ALLOWLIST, buildImplementerAgentMd(), buildMcpJson(), buildPrFixerAgentMd(), buildSettingsJson(), SlotTemplateContext, TemplatePaths

### Community 13 - "Worker Protocol Schemas"
Cohesion: 0.09
Nodes (23): TRIAGE_VERDICTS, AgentSettableStage, agentSettableStageSchema, AssertNamesCovered, channelEventSchema, isWorkerToolName(), submitFeasibilityMcpArgsSchema, submitTriageMcpArgsSchema (+15 more)

### Community 14 - "Real Worktree Shell Ops"
Cohesion: 0.07
Nodes (27): CLAUDE_JSON_PATH, COMPOSER_BINARIES, detectInstallCommand(), extractPrUrl(), FEASIBILITY_DENIED_AGENTS, FEASIBILITY_SCOUT_AGENTS_JSON, FEASIBILITY_SETTINGS_JSON, ghPrSchema (+19 more)

### Community 15 - "Feasibility Batch Manager"
Cohesion: 0.15
Nodes (11): buildFeasibilityBatchContract(), DRY_RUN_VERDICT, FeasibilityBatchManager, FeasibilityManagerConfig, FeasibilitySession, feasibilitySessionName(), log, toTriageResult() (+3 more)

### Community 16 - "Stats Aggregation & Cost"
Cohesion: 0.10
Nodes (25): costByModel(), costByProject(), CostGroup, DurationGroup, KIND_LABELS, KindCount, kindCounts(), meanCostPerIssueUsd() (+17 more)

### Community 17 - "API Routes & Schemas"
Cohesion: 0.07
Nodes (21): agentActiveSchema, log, PaneReader, stopHookSchema, analyzeTicketsSchema, createAskSchema, createCleanSchema, createCommentSchema (+13 more)

### Community 18 - "Ticket Detail & Forms"
Cohesion: 0.14
Nodes (20): ImportTicketsPanel(), ImportTicketsPanelProps, NewTicketDialog(), Tab, TAB_TITLES, TabButton(), TabButtonProps, ProjectSelect() (+12 more)

### Community 19 - "Board Store & Notifications"
Cohesion: 0.18
Nodes (3): BoardStore, Listener, WsClientEvent

### Community 20 - "Dev Dependencies"
Cohesion: 0.08
Nodes (25): devDependencies, autoprefixer, class-variance-authority, clsx, concurrently, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities (+17 more)

### Community 21 - "TypeScript Config"
Cohesion: 0.08
Nodes (24): compilerOptions, allowImportingTsExtensions, baseUrl, esModuleInterop, isolatedModules, jsx, lib, module (+16 more)

### Community 22 - "DB Rows & Mapping"
Cohesion: 0.09
Nodes (22): CommentRow, commentRowSchema, mapTicketRow(), parseSessionUsage(), ProfileRow, profileRowSchema, projectSchema, SlotRow (+14 more)

### Community 24 - "Build Scripts"
Cohesion: 0.09
Nodes (23): scripts, build:agents, build:desktop, build:hooks, build:web, build:worker, dev, dev:desktop (+15 more)

### Community 25 - "Pricing & Token Cost"
Cohesion: 0.16
Nodes (20): formatTokens(), TicketCost(), TicketCostProps, TOKEN_FORMATTER, USD_FORMATTER, costByFamily(), costOf(), costOfModel() (+12 more)

### Community 26 - "Desktop Bootstrap"
Cohesion: 0.11
Nodes (17): log, runFirstBootSetup(), PROJECT_KEYS, PROJECT_ROOT, RunningServer, serveStaticAsset(), SocketData, startServer() (+9 more)

### Community 27 - "Worker Hub & Bridge"
Cohesion: 0.14
Nodes (7): WorkerHubHandlers, WorkerSocket, WorkerSocketData, ChannelEvent, workerInboundSchema, WorkerOutbound, BackendBridge

### Community 28 - "App & Board Root"
Cohesion: 0.13
Nodes (18): AgentsView(), normalize(), SettingsModal(), Toaster(), COLUMN_NODE_COLOR, WorkflowView(), WorkflowViewProps, WorktreeSessionsView() (+10 more)

### Community 29 - "Board Columns"
Cohesion: 0.09
Nodes (19): resolveBaseBranch(), log, ReclaimOutcome, SETUP_PHASES, SlotManagerConfig, log, SlotWatch, WorktreeAddressWatcher (+11 more)

### Community 30 - "Logging"
Cohesion: 0.14
Nodes (13): ANSI, COLOR_ENABLED, isLevel(), Level, LEVEL_ORDER, LEVEL_TAG, Logger, paint() (+5 more)

### Community 31 - "Terminals View & Modals"
Cohesion: 0.18
Nodes (8): ABSOLUTE_UPLOAD_PATH, ImageLightboxProps, LightboxImage, Markdown(), MarkdownProps, OPEN_KEYS, purifier, renderMarkdownToSafeHtml()

### Community 32 - "Ticket Lifecycle"
Cohesion: 0.12
Nodes (14): BoardColumn(), BoardColumnProps, DEFAULT_COLLAPSED, resolveAnalyzeAllTitle(), resolveCheckAllTitle(), resolveMoveAllTitle(), SortDir, useWindowedTickets() (+6 more)

### Community 33 - "Agent Coordinator"
Cohesion: 0.16
Nodes (3): AgentCoordinator, ToolCallContext, WorkerToolName

### Community 34 - "Ticket Store Types"
Cohesion: 0.12
Nodes (19): mapCommentRow(), NewAsk, NewClean, NewReview, SlotStatus, SqlBindValue, SqlUpdateBuilder, TicketPatch (+11 more)

### Community 35 - "Agent Config Constants"
Cohesion: 0.18
Nodes (5): StageProgressBarProps, TicketBadgesProps, TicketCardProps, TicketLifecycle, Ticket

### Community 36 - "Runtime Dependencies"
Cohesion: 0.13
Nodes (19): AUTHOR_BADGES, AuthorBadge(), CommentRow(), CommentRowProps, isLocked(), TicketDetail(), TriageSection(), TriageSectionProps (+11 more)

### Community 37 - "Settings Modal"
Cohesion: 0.10
Nodes (18): DragHandleAttributes, DragHandleListeners, GeneralSettings(), IMPLEMENTER_OPTIONS, LANGUAGE_OPTIONS, ProfileRowProps, ProfilesSettings(), SettingsModalProps (+10 more)

### Community 38 - "Server Entry & Static"
Cohesion: 0.15
Nodes (15): applyDesktopEnv(), DesktopRoots, ensureConfig(), boot(), installApplicationMenu(), installMenuShortcutBridge(), menuShortcutActionSchema, newWindowEventSchema (+7 more)

### Community 39 - "System Adapter Types"
Cohesion: 0.09
Nodes (14): createLogger(), RouteDeps, log, UserTerminalManager, TerminalDescriptor, dryRunLog, FAKE_OPEN_PRS, fakeEncoder (+6 more)

### Community 40 - "Coordinator & Hub Wiring"
Cohesion: 0.12
Nodes (24): AgentProfileConfig(), AskPanel(), ImplementationAgentFields(), labelWithDefault(), TicketConfigSummary(), loadOnce(), subscribers, UNKNOWN_CAPABILITIES (+16 more)

### Community 41 - "Chart Components"
Cohesion: 0.16
Nodes (12): ChartConfig, ChartContainer, ChartContainerProps, ChartContext, ChartContextValue, ChartLegendContent(), ChartLegendContentProps, ChartTooltipContent() (+4 more)

### Community 42 - "Triage Manager"
Cohesion: 0.18
Nodes (12): buildContractConstraintsLines(), buildResponseFormatLines(), buildStrictRulesLines(), buildTicketLines(), buildTriageChannelPrompt(), buildTriagePlusChannelPrompt(), isEnglish(), TriageManager (+4 more)

### Community 43 - "Community 43"
Cohesion: 0.22
Nodes (3): FakePaneStream, fakeShellPrompt(), hexToBytes()

### Community 44 - "Theme Management"
Cohesion: 0.31
Nodes (8): UseThemeResult, applyTheme(), getStoredTheme(), isTheme(), Theme, ThemeOption, THEMES, root

### Community 45 - "Agent Knobs & Models"
Cohesion: 0.13
Nodes (16): FullscreenToggle(), FullscreenToggleProps, badgeLabelFor(), LiveTerminal(), LiveTerminalOptions, LiveTerminalProps, TerminalData, TerminalView() (+8 more)

### Community 46 - "Community 46"
Cohesion: 0.25
Nodes (15): DRY_RUN_VERDICT, log, TriageManagerConfig, TriageSession, AgentProfileConfigProps, ImplementationAgentFieldsProps, NewProfile, NewTicket (+7 more)

### Community 47 - "Triage Prompt Builder"
Cohesion: 0.15
Nodes (17): AnnotatedHtml, isInsideAnnotation(), PrdAnnotation, PrdReviewDialog(), PrdReviewDialogProps, SelectionState, wrapFirstOccurrence(), QuitConfirmModal() (+9 more)

### Community 48 - "User Terminal Manager"
Cohesion: 0.11
Nodes (18): dependencies, dompurify, elysia, marked, @modelcontextprotocol/sdk, nanoid, papaparse, @radix-ui/react-toggle (+10 more)

### Community 49 - "Database Schema & Seed"
Cohesion: 0.24
Nodes (8): StatsView(), useStats(), UseStatsResult, StatRecord, StatCard(), StatCardProps, StatEmpty(), Select

### Community 50 - "Triage Verdicts & Config"
Cohesion: 0.13
Nodes (18): PROGRESS_BAR_COLORS, StageProgressBar(), ANIMATED_STAGES, BadgeVariant, DATETIME_FORMAT, effectiveWorkDurationMs(), NON_DEPENDABLE_COLUMNS, prNumberFromUrl() (+10 more)

### Community 51 - "Community 51"
Cohesion: 0.25
Nodes (6): Board(), BoardProps, normalize(), COLUMN_ORDER, COLUMNS, ConfirmDialog()

### Community 52 - "Stop Hook & Usage"
Cohesion: 0.33
Nodes (5): aggregateUsage(), ModelUsage, num(), StopHookInput, UsageByModel

### Community 53 - "Community 53"
Cohesion: 0.12
Nodes (14): AnalyzeTicketsInput, CreateAskInput, CreateCleanInput, CreateCommentInput, CreateProfileInput, CreateReviewInput, CreateTicketInput, ImportTicketsInput (+6 more)

### Community 54 - "CONTEXT.md Glossary"
Cohesion: 0.29
Nodes (5): SlotsBar(), SlotsBarProps, Stat(), StatProps, STATUS_LABELS

### Community 55 - "CSV Ticket Parsing"
Cohesion: 0.15
Nodes (12): log, ToolHandler, ToolResult, askUserArgsSchema, doneArgsSchema, failArgsSchema, readyForReviewArgsSchema, submitAnswerArgsSchema (+4 more)

### Community 56 - "Community 56"
Cohesion: 0.13
Nodes (22): AgentsViewProps, AskPanelProps, CleanPrPanel(), CleanPrPanelProps, NewTicketDialogProps, ProjectPrPicker(), ProjectPrPickerProps, ProjectSelectProps (+14 more)

### Community 57 - "PreToolUse Hook Guard"
Cohesion: 0.33
Nodes (4): denied, DENY_PATTERNS, HookInput, WRITE_EDIT_TOOLS

### Community 58 - "Webhook & Reply"
Cohesion: 0.33
Nodes (3): listeners, mcp, ReplyArgsSchema

### Community 60 - "Community 60"
Cohesion: 0.27
Nodes (8): active, ensureNotificationPermission(), isSupported(), playNotificationSound(), showDesktopNotification(), CommentListener, Toast, wsClientEventSchema

### Community 61 - "Dry-Run Safety Model"
Cohesion: 0.67
Nodes (4): Dry-Run Safety Model, FakeSystemAdapter, RealSystemAdapter, SystemAdapter (side-effect boundary)

### Community 62 - "Projects Hook"
Cohesion: 0.22
Nodes (5): Architecture, Commands, Conventions (enforced — beyond the global ones in ~/.claude/CLAUDE.md), The dry-run safety model — read before running anything, What this is

### Community 73 - "Community 73"
Cohesion: 0.20
Nodes (19): Composer 2.5 Implementer Path, buildAskContract(), buildCleanContract(), buildConflictResolutionContract(), buildFeasibilityContextSection(), buildImplementingSteps(), buildPlanningStep(), buildReviewContract() (+11 more)

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
Cohesion: 0.40
Nodes (5): MIME_EXTENSIONS, resolveExtension(), SavedUpload, saveUpload(), serveUpload()

### Community 80 - "Community 80"
Cohesion: 0.20
Nodes (4): log, Watchdog, NativeNotify, ACTIVE_STAGES

### Community 84 - "Community 84"
Cohesion: 0.36
Nodes (7): createDatabase(), migrate(), PROFILE_MIGRATIONS, seedProfiles(), seedSlots(), TICKET_MIGRATIONS, DEFAULT_PROFILES

### Community 85 - "Community 85"
Cohesion: 0.29
Nodes (5): NAV_ENTRIES, NavEntry, Sidebar(), SidebarProps, SidebarView

### Community 86 - "Community 86"
Cohesion: 0.38
Nodes (3): mapSlotRow(), BoardState, Slot

### Community 87 - "Community 87"
Cohesion: 0.33
Nodes (4): currentNow, startTicking(), subscribe(), subscribers

### Community 88 - "Community 88"
Cohesion: 0.33
Nodes (3): mapWorktreeSessionRow(), enrichWorktreeSession(), WorktreeSession

### Community 90 - "Community 90"
Cohesion: 0.40
Nodes (6): nextWeek(), outcomeCounts(), projectCounts(), recordOutcome(), startOfWeek(), weeklyThroughput

## Knowledge Gaps
- **397 isolated node(s):** `log`, `ToolResult`, `ToolHandler`, `ReclaimOutcome`, `log` (+392 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **15 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Ticket` connect `Agent Config Constants` to `Slot & Project Config`, `Agents & Ticket UI`, `API Schemas & Inputs`, `Store & Profiles`, `Agent Profile & Ask Panel`, `API Routes & Schemas`, `Board Store & Notifications`, `DB Rows & Mapping`, `Client Hub & Watchdog`, `Pricing & Token Cost`, `App & Board Root`, `Board Columns`, `Ticket Lifecycle`, `Ticket Store Types`, `Runtime Dependencies`, `Coordinator & Hub Wiring`, `Triage Manager`, `Triage Verdicts & Config`, `Community 51`, `Community 53`, `Community 56`, `Community 60`, `Community 73`, `Community 86`, `Community 92`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **Why does `Store` connect `Store & Profiles` to `Ticket Store Types`, `Agent Config Constants`, `System Adapter Types`, `Terminal Session Manager`, `Community 46`, `Feasibility Batch Manager`, `Community 80`, `API Routes & Schemas`, `Client Hub & Watchdog`, `Community 86`, `CSV Ticket Parsing`, `Community 88`, `Community 89`, `Desktop Bootstrap`, `Package Manifest`, `Board Columns`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Why does `SlotManager` connect `Slot & Project Config` to `System Adapter Types`, `Community 73`, `Agent Profile & Ask Panel`, `API Routes & Schemas`, `CSV Ticket Parsing`, `Desktop Bootstrap`, `Package Manifest`, `Board Columns`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **What connects `log`, `ToolResult`, `ToolHandler` to the rest of the system?**
  _400 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Slot & Project Config` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._
- **Should `Terminal Split View` be split into smaller, more focused modules?**
  _Cohesion score 0.1339031339031339 - nodes in this community are weakly interconnected._
- **Should `MCP Channels & Workers` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._