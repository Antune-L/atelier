# Graph Report - kanban-agents  (2026-06-23)

## Corpus Check
- 138 files · ~100,423 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1399 nodes · 3065 edges · 74 communities (63 shown, 11 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 15 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `19fbb7e4`
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

## God Nodes (most connected - your core abstractions)
1. `Ticket` - 63 edges
2. `Store` - 58 edges
3. `cn()` - 49 edges
4. `RealSystemAdapter` - 47 edges
5. `SlotManager` - 40 edges
6. `FakeSystemAdapter` - 40 edges
7. `ProjectInfo` - 35 edges
8. `ClientHub` - 28 edges
9. `FeasibilityBatchManager` - 24 edges
10. `scripts` - 23 edges

## Surprising Connections (you probably didn't know these)
- `Standalone Webhook Channel Example` --semantically_similar_to--> `Worker (MCP channel server)`  [INFERRED] [semantically similar]
  docs/claude-code-channels.md → AGENTS.md
- `Channel (agent↔backend link)` --semantically_similar_to--> `MCP Channel`  [INFERRED] [semantically similar]
  CONTEXT.md → AGENTS.md
- `Channel (agent↔backend link)` --semantically_similar_to--> `Two-Channel Agent Protocol`  [INFERRED] [semantically similar]
  CONTEXT.md → AGENTS.md
- `boot()` --calls--> `startServer()`  [INFERRED]
  desktop/index.ts → src/server/index.ts
- `React root mount (main.tsx)` --references--> `Atelier`  [INFERRED]
  src/web/index.html → README.md

## Import Cycles
- None detected.

## Communities (74 total, 11 thin omitted)

### Community 0 - "Slot & Project Config"
Cohesion: 0.05
Nodes (47): Composer 2.5 Implementer Path, buildAskContract(), buildCleanContract(), buildConflictResolutionContract(), buildFeasibilityContextSection(), buildImplementingSteps(), buildPlanningStep(), buildReviewContract() (+39 more)

### Community 1 - "Agents & Ticket UI"
Cohesion: 0.10
Nodes (22): PROGRESS_BAR_COLORS, StageProgressBar(), StageProgressBarProps, AGENT_EFFORT_OPTIONS, ANIMATED_STAGES, BadgeVariant, DATETIME_FORMAT, finishedKindLabel() (+14 more)

### Community 2 - "Terminal Split View"
Cohesion: 0.07
Nodes (43): badgeLabelFor(), LiveTerminal(), LiveTerminalProps, QuitConfirmModal(), TerminalsView(), TerminalsViewProps, loadTree(), saveTree() (+35 more)

### Community 3 - "MCP Channels & Workers"
Cohesion: 0.05
Nodes (44): ClientHub, Column vs Stage axes, Done Gate (server-verified), MCP Channel, No-SDK Design Choice, repoMutex (KeyedMutex), rows.ts (zod row validation), Slot (git-worktree execution unit) (+36 more)

### Community 4 - "API Schemas & Inputs"
Cohesion: 0.06
Nodes (41): AnalyzeTicketsInput, appSettingsSchema, baseBranchSchema, capabilitiesSchema, commentAuthorSchema, commentSchema, CreateAskInput, CreateCleanInput (+33 more)

### Community 5 - "UI Utilities & Layout"
Cohesion: 0.12
Nodes (15): NAV_ENTRIES, NavEntry, Sidebar(), SidebarProps, SidebarView, TICKET_OPTION, TicketOptionsToggleGroupProps, TicketOptionValues (+7 more)

### Community 6 - "Review Done Gate (E2E)"
Cohesion: 0.08
Nodes (5): RealSystemAdapter, safeJsonParse(), DoneGateResult, ReviewDoneOptions, SpawnTmuxOptions

### Community 7 - "PR & Ticket Panels"
Cohesion: 0.22
Nodes (14): AskPanelProps, CleanPrPanel(), CleanPrPanelProps, NewTicketDialogProps, ProjectPrPicker(), ProjectPrPickerProps, ProjectSelectProps, ReviewPrPanel() (+6 more)

### Community 8 - "Terminal Session Manager"
Cohesion: 0.10
Nodes (14): dataMessage(), log, normalizeSeed(), safeParse(), send(), TerminalSession, TerminalSessionManager, TerminalSocket (+6 more)

### Community 9 - "Store & Profiles"
Cohesion: 0.11
Nodes (5): mapSlotRow(), Store, AppSettings, Profile, UpdateAppSettingsInput

### Community 10 - "Stats Charts & Records"
Cohesion: 0.13
Nodes (18): StatsViewProps, ACTIVE_BAR, AREA_CURSOR, AXIS_PROPS, BAR_CURSOR, CHART_PALETTE, CostChart(), DurationChart() (+10 more)

### Community 11 - "Fake System Adapter"
Cohesion: 0.09
Nodes (4): delay(), fakeShellPrompt(), FakeSystemAdapter, hexToBytes()

### Community 12 - "Agent Profile & Ask Panel"
Cohesion: 0.15
Nodes (16): AgentProfileConfig(), AskPanel(), ImplementationAgentFields(), loadOnce(), subscribers, UNKNOWN_CAPABILITIES, useCapabilities(), emit() (+8 more)

### Community 13 - "Worker Protocol Schemas"
Cohesion: 0.10
Nodes (20): TRIAGE_VERDICTS, AgentSettableStage, agentSettableStageSchema, askUserArgsSchema, AssertNamesCovered, channelEventSchema, doneArgsSchema, failArgsSchema (+12 more)

### Community 14 - "Real Worktree Shell Ops"
Cohesion: 0.09
Nodes (22): CLAUDE_JSON_PATH, COMPOSER_BINARIES, FEASIBILITY_DENIED_AGENTS, FEASIBILITY_SCOUT_AGENTS_JSON, FEASIBILITY_SETTINGS_JSON, ghPrSchema, ghPrStateSchema, ghReviewSchema (+14 more)

### Community 15 - "Feasibility Batch Manager"
Cohesion: 0.15
Nodes (10): buildFeasibilityBatchContract(), DRY_RUN_VERDICT, FeasibilityBatchManager, FeasibilityManagerConfig, FeasibilitySession, feasibilitySessionName(), log, toTriageResult() (+2 more)

### Community 16 - "Stats Aggregation & Cost"
Cohesion: 0.10
Nodes (26): effectiveWorkDurationMs(), CostGroup, DurationGroup, KIND_LABELS, KindCount, kindCounts(), meanDurationByEffort(), meanDurationByKey() (+18 more)

### Community 17 - "API Routes & Schemas"
Cohesion: 0.07
Nodes (20): agentActiveSchema, log, PaneReader, stopHookSchema, analyzeTicketsSchema, createAskSchema, createCleanSchema, createCommentSchema (+12 more)

### Community 18 - "Ticket Detail & Forms"
Cohesion: 0.14
Nodes (17): ImportTicketsPanel(), ImportTicketsPanelProps, NewTicketDialog(), Tab, TAB_TITLES, TabButtonProps, ProjectSelect(), TicketOptionsToggleGroup() (+9 more)

### Community 19 - "Board Store & Notifications"
Cohesion: 0.09
Nodes (17): SlotsBar(), SlotsBarProps, Stat(), StatProps, STATUS_LABELS, active, ensureNotificationPermission(), isSupported() (+9 more)

### Community 20 - "Dev Dependencies"
Cohesion: 0.08
Nodes (25): devDependencies, autoprefixer, class-variance-authority, clsx, concurrently, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities (+17 more)

### Community 21 - "TypeScript Config"
Cohesion: 0.08
Nodes (24): compilerOptions, allowImportingTsExtensions, baseUrl, esModuleInterop, isolatedModules, jsx, lib, module (+16 more)

### Community 22 - "DB Rows & Mapping"
Cohesion: 0.08
Nodes (23): CommentRow, commentRowSchema, mapProfileRow(), mapTicketRow(), parseSessionUsage(), ProfileRow, profileRowSchema, projectSchema (+15 more)

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
Cohesion: 0.16
Nodes (8): ToolCallContext, WorkerHub, WorkerHubHandlers, WorkerSocket, WorkerSocketData, workerInboundSchema, WorkerOutbound, WorkerToolName

### Community 28 - "App & Board Root"
Cohesion: 0.09
Nodes (21): Board(), BoardProps, normalize(), SettingsModal(), AUTHOR_BADGES, CommentRowProps, isLocked(), parseTriageReport() (+13 more)

### Community 29 - "Board Columns"
Cohesion: 0.12
Nodes (14): BoardColumn(), BoardColumnProps, DEFAULT_COLLAPSED, resolveAnalyzeAllTitle(), resolveCheckAllTitle(), resolveMoveAllTitle(), SortDir, useWindowedTickets() (+6 more)

### Community 30 - "Logging"
Cohesion: 0.14
Nodes (13): ANSI, COLOR_ENABLED, isLevel(), Level, LEVEL_ORDER, LEVEL_TAG, Logger, paint() (+5 more)

### Community 31 - "Terminals View & Modals"
Cohesion: 0.14
Nodes (18): AnnotatedHtml, isInsideAnnotation(), PrdAnnotation, PrdReviewDialog(), PrdReviewDialogProps, SelectionState, wrapFirstOccurrence(), QuitConfirmModalProps (+10 more)

### Community 32 - "Ticket Lifecycle"
Cohesion: 0.12
Nodes (8): resolveBaseBranch(), AgentsViewProps, TicketBadgesProps, TicketCardProps, COLUMN_NODE_COLOR, WorkflowViewProps, TicketLifecycle, Ticket

### Community 34 - "Ticket Store Types"
Cohesion: 0.07
Nodes (44): AgentProfileConfigProps, ImplementationAgentFieldsProps, labelWithDefault(), TicketConfigSummary(), mapCommentRow(), NewAsk, NewClean, NewProfile (+36 more)

### Community 35 - "Agent Config Constants"
Cohesion: 0.21
Nodes (17): AgentCard(), AgentCardProps, AgentsView(), normalize(), TicketBadges(), projectBadgeStyle(), resolveProjectColor(), resolveProjectLabel() (+9 more)

### Community 36 - "Runtime Dependencies"
Cohesion: 0.11
Nodes (18): dependencies, dompurify, elysia, marked, @modelcontextprotocol/sdk, nanoid, papaparse, @radix-ui/react-toggle (+10 more)

### Community 37 - "Settings Modal"
Cohesion: 0.11
Nodes (13): DragHandleAttributes, DragHandleListeners, IMPLEMENTER_OPTIONS, LANGUAGE_OPTIONS, ProfileRowProps, SettingsModalProps, SettingsTab, TAB_OPTIONS (+5 more)

### Community 38 - "Server Entry & Static"
Cohesion: 0.11
Nodes (19): createDatabase(), migrate(), PROFILE_MIGRATIONS, seedProfiles(), seedSlots(), TICKET_MIGRATIONS, PROJECT_ROOT, RunningServer (+11 more)

### Community 39 - "System Adapter Types"
Cohesion: 0.11
Nodes (12): createLogger(), log, UserTerminalManager, TerminalDescriptor, dryRunLog, FAKE_OPEN_PRS, fakeEncoder, GitWorktreeAddOptions (+4 more)

### Community 40 - "Coordinator & Hub Wiring"
Cohesion: 0.16
Nodes (11): log, ToolHandler, ToolResult, log, ClientSocket, ClientSocketData, NativeNotify, ACTIVE_STAGES (+3 more)

### Community 41 - "Chart Components"
Cohesion: 0.16
Nodes (12): ChartConfig, ChartContainer, ChartContainerProps, ChartContext, ChartContextValue, ChartLegendContent(), ChartLegendContentProps, ChartTooltipContent() (+4 more)

### Community 42 - "Triage Manager"
Cohesion: 0.14
Nodes (17): buildContractConstraintsLines(), buildResponseFormatLines(), buildStrictRulesLines(), buildTicketLines(), buildTriageChannelPrompt(), buildTriagePlusChannelPrompt(), isEnglish(), DRY_RUN_VERDICT (+9 more)

### Community 43 - "Slot Workflow View"
Cohesion: 0.13
Nodes (10): ChannelEvent, isWorkerToolName(), WORKER_TOOLS, workerOutboundSchema, BackendBridge, bridge, env, envSchema (+2 more)

### Community 44 - "Theme Management"
Cohesion: 0.24
Nodes (10): useTheme(), UseThemeResult, applyTheme(), getStoredTheme(), isTheme(), Theme, ThemeOption, THEMES (+2 more)

### Community 45 - "Agent Knobs & Models"
Cohesion: 0.18
Nodes (8): ABSOLUTE_UPLOAD_PATH, ImageLightboxProps, LightboxImage, Markdown(), MarkdownProps, OPEN_KEYS, purifier, renderMarkdownToSafeHtml()

### Community 47 - "Triage Prompt Builder"
Cohesion: 0.27
Nodes (4): detectInstallCommand(), realpathSafe(), resolveWorktreeScriptCommand(), WorktreeSetupOptions

### Community 48 - "User Terminal Manager"
Cohesion: 0.31
Nodes (6): FullscreenToggle(), FullscreenToggleProps, TerminalData, TerminalView(), TerminalViewProps, useFullscreenEscape()

### Community 49 - "Database Schema & Seed"
Cohesion: 0.28
Nodes (7): StatsView(), useStats(), UseStatsResult, StatRecord, StatCard(), StatCardProps, StatEmpty()

### Community 50 - "Triage Verdicts & Config"
Cohesion: 0.33
Nodes (4): currentNow, startTicking(), subscribe(), subscribers

### Community 51 - "AGENTS.md Docs"
Cohesion: 0.29
Nodes (5): Architecture, Commands, Conventions (enforced — beyond the global ones in ~/.claude/CLAUDE.md), The dry-run safety model — read before running anything, What this is

### Community 52 - "Stop Hook & Usage"
Cohesion: 0.33
Nodes (5): aggregateUsage(), ModelUsage, num(), StopHookInput, UsageByModel

### Community 53 - "PR Selection"
Cohesion: 0.29
Nodes (8): PrSelectRow(), PrSelectRowProps, isPrNeedsAttention(), OpenPr, Badge(), BadgeProps, BadgeVariant, badgeVariants

### Community 54 - "CONTEXT.md Glossary"
Cohesion: 0.33
Nodes (5): CONTEXT — domain glossary, Execution, Proposed (not yet built), Seams, Work items

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
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 61 - "Dry-Run Safety Model"
Cohesion: 0.67
Nodes (4): Dry-Run Safety Model, FakeSystemAdapter, RealSystemAdapter, SystemAdapter (side-effect boundary)

### Community 62 - "Projects Hook"
Cohesion: 0.67
Nodes (3): loadOnce(), subscribers, useProjects()

## Knowledge Gaps
- **383 isolated node(s):** `Tab`, `TAB_TITLES`, `TabButtonProps`, `log`, `CLAUDE_JSON_PATH` (+378 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `RealSystemAdapter` connect `Review Done Gate (E2E)` to `Terminal Session Manager`, `Triage Prompt Builder`, `Real Worktree Shell Ops`, `System Adapter Types`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Why does `Ticket` connect `Ticket Lifecycle` to `Slot & Project Config`, `Agents & Ticket UI`, `Ticket Store Types`, `Agent Config Constants`, `API Schemas & Inputs`, `PR & Ticket Panels`, `Coordinator & Hub Wiring`, `Store & Profiles`, `Triage Manager`, `API Routes & Schemas`, `Board Store & Notifications`, `DB Rows & Mapping`, `Client Hub & Watchdog`, `Pricing & Token Cost`, `App & Board Root`, `Board Columns`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Why does `cn()` connect `UI Utilities & Layout` to `Agents & Ticket UI`, `Terminal Split View`, `Agent Config Constants`, `PR & Ticket Panels`, `Chart Components`, `Stats Charts & Records`, `Agent Profile & Ask Panel`, `Agent Knobs & Models`, `User Terminal Manager`, `Database Schema & Seed`, `Ticket Detail & Forms`, `Board Store & Notifications`, `PR Selection`, `App & Board Root`, `Board Columns`, `Terminals View & Modals`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **What connects `Tab`, `TAB_TITLES`, `TabButtonProps` to the rest of the system?**
  _386 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Slot & Project Config` be split into smaller, more focused modules?**
  _Cohesion score 0.052503052503052504 - nodes in this community are weakly interconnected._
- **Should `Agents & Ticket UI` be split into smaller, more focused modules?**
  _Cohesion score 0.10144927536231885 - nodes in this community are weakly interconnected._
- **Should `Terminal Split View` be split into smaller, more focused modules?**
  _Cohesion score 0.06638714185883997 - nodes in this community are weakly interconnected._