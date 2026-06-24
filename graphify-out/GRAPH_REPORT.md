# Graph Report - slot-1  (2026-06-24)

## Corpus Check
- 144 files · ~103,209 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1455 nodes · 3415 edges · 91 communities (77 shown, 14 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 12 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `bc1853f2`
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

## Communities (91 total, 14 thin omitted)

### Community 0 - "Slot & Project Config"
Cohesion: 0.15
Nodes (3): SlotManager, slotPath(), slugify()

### Community 1 - "Agents & Ticket UI"
Cohesion: 0.05
Nodes (52): AgentCard(), AgentCardProps, AgentsView(), normalize(), BoardColumn(), BoardColumnProps, DEFAULT_COLLAPSED, resolveAnalyzeAllTitle() (+44 more)

### Community 2 - "Terminal Split View"
Cohesion: 0.20
Nodes (16): loadTree(), saveTree(), storageKey(), applySizes(), findLeaf(), firstLeafId(), LeafNode, leafNodeSchema (+8 more)

### Community 3 - "MCP Channels & Workers"
Cohesion: 0.14
Nodes (15): ClientHub, Column vs Stage axes, Done Gate (server-verified), repoMutex (KeyedMutex), rows.ts (zod row validation), Slot (git-worktree execution unit), SlotManager, Stop Hook Auto-Nudge Escalation (+7 more)

### Community 4 - "API Schemas & Inputs"
Cohesion: 0.06
Nodes (44): AnalyzeTicketsInput, appSettingsSchema, baseBranchSchema, capabilitiesSchema, commentAuthorSchema, commentSchema, CreateAskInput, CreateCleanInput (+36 more)

### Community 5 - "UI Utilities & Layout"
Cohesion: 0.09
Nodes (25): TabButton(), PrSelectRow(), NAV_ENTRIES, NavEntry, Sidebar(), SidebarProps, SidebarView, StatsView() (+17 more)

### Community 6 - "Review Done Gate (E2E)"
Cohesion: 0.08
Nodes (5): RealSystemAdapter, safeJsonParse(), DoneGateResult, ReviewDoneOptions, SpawnTmuxOptions

### Community 7 - "PR & Ticket Panels"
Cohesion: 0.08
Nodes (27): MCP Channel, No-SDK Design Choice, Two-Channel Agent Protocol, Worker (MCP channel server), WorkerHub, Channel (agent↔backend link), Protocol (wire-format source of truth), Claude Code Channels setup (+19 more)

### Community 8 - "Terminal Session Manager"
Cohesion: 0.22
Nodes (8): log, normalizeSeed(), safeParse(), TerminalSocket, TerminalSocketData, visibleText(), terminalClientMessageSchema, TerminalServerMessage

### Community 9 - "Store & Profiles"
Cohesion: 0.11
Nodes (5): mapProfileRow(), Store, AppSettings, Profile, UpdateAppSettingsInput

### Community 10 - "Stats Charts & Records"
Cohesion: 0.13
Nodes (18): StatsViewProps, ACTIVE_BAR, AREA_CURSOR, AXIS_PROPS, BAR_CURSOR, CHART_PALETTE, CostChart(), DurationChart() (+10 more)

### Community 11 - "Fake System Adapter"
Cohesion: 0.09
Nodes (4): delay(), fakeShellPrompt(), FakeSystemAdapter, hexToBytes()

### Community 12 - "Agent Profile & Ask Panel"
Cohesion: 0.23
Nodes (13): AgentProfileConfig(), AskPanel(), ImplementationAgentFields(), ProfilesSettings(), loadOnce(), subscribers, UNKNOWN_CAPABILITIES, useCapabilities() (+5 more)

### Community 13 - "Worker Protocol Schemas"
Cohesion: 0.08
Nodes (26): log, ToolHandler, ToolResult, TRIAGE_VERDICTS, AgentSettableStage, agentSettableStageSchema, askUserArgsSchema, AssertNamesCovered (+18 more)

### Community 14 - "Real Worktree Shell Ops"
Cohesion: 0.09
Nodes (22): CLAUDE_JSON_PATH, COMPOSER_BINARIES, FEASIBILITY_DENIED_AGENTS, FEASIBILITY_SCOUT_AGENTS_JSON, FEASIBILITY_SETTINGS_JSON, ghPrSchema, ghPrStateSchema, ghReviewSchema (+14 more)

### Community 15 - "Feasibility Batch Manager"
Cohesion: 0.16
Nodes (10): buildFeasibilityBatchContract(), DRY_RUN_VERDICT, FeasibilityBatchManager, FeasibilityManagerConfig, FeasibilitySession, feasibilitySessionName(), log, toTriageResult() (+2 more)

### Community 16 - "Stats Aggregation & Cost"
Cohesion: 0.10
Nodes (26): effectiveWorkDurationMs(), CostGroup, DurationGroup, KIND_LABELS, KindCount, kindCounts(), meanDurationByEffort(), meanDurationByKey() (+18 more)

### Community 17 - "API Routes & Schemas"
Cohesion: 0.07
Nodes (23): buildReformulatePrompt(), agentActiveSchema, log, PaneReader, stopHookSchema, analyzeTicketsSchema, createAskSchema, createCleanSchema (+15 more)

### Community 18 - "Ticket Detail & Forms"
Cohesion: 0.11
Nodes (37): AgentsViewProps, AskPanelProps, CleanPrPanel(), CleanPrPanelProps, ImportTicketsPanel(), ImportTicketsPanelProps, NewTicketDialogProps, Tab (+29 more)

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
Cohesion: 0.07
Nodes (26): CommentRow, commentRowSchema, mapCommentRow(), mapTicketRow(), parseSessionUsage(), ProfileRow, profileRowSchema, projectSchema (+18 more)

### Community 23 - "Client Hub & Watchdog"
Cohesion: 0.13
Nodes (3): ClientHub, Notifier, WorkerHub

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
Nodes (6): WorkerHubHandlers, WorkerSocket, WorkerSocketData, ChannelEvent, workerInboundSchema, WorkerOutbound

### Community 28 - "App & Board Root"
Cohesion: 0.11
Nodes (20): Board(), BoardProps, normalize(), NewTicketDialog(), Toaster(), COLUMN_NODE_COLOR, WorkflowView(), WorkflowViewProps (+12 more)

### Community 29 - "Board Columns"
Cohesion: 0.14
Nodes (13): log, SlotWatch, AppConfig, config, configSchema, DEFAULT_MODELS, loadConfig(), PROJECT_KEYS (+5 more)

### Community 30 - "Logging"
Cohesion: 0.14
Nodes (13): ANSI, COLOR_ENABLED, isLevel(), Level, LEVEL_ORDER, LEVEL_TAG, Logger, paint() (+5 more)

### Community 31 - "Terminals View & Modals"
Cohesion: 0.10
Nodes (22): AnnotatedHtml, isInsideAnnotation(), PrdAnnotation, PrdReviewDialog(), PrdReviewDialogProps, SelectionState, wrapFirstOccurrence(), QuitConfirmModalProps (+14 more)

### Community 32 - "Ticket Lifecycle"
Cohesion: 0.23
Nodes (4): TicketBadgesProps, TicketCardProps, TicketLifecycle, Ticket

### Community 34 - "Ticket Store Types"
Cohesion: 0.13
Nodes (17): mapWorktreeSessionRow(), enrichWorktreeSession(), NewAsk, NewClean, NewReview, SlotStatus, SqlBindValue, SqlUpdateBuilder (+9 more)

### Community 35 - "Agent Config Constants"
Cohesion: 0.19
Nodes (13): AUTHOR_BADGES, CommentRow(), CommentRowProps, isLocked(), TicketDetail(), TriageSection(), TriageSectionProps, dependencyCandidates() (+5 more)

### Community 36 - "Runtime Dependencies"
Cohesion: 0.14
Nodes (15): resolveBaseBranch(), log, ReclaimOutcome, SETUP_PHASES, SlotManagerConfig, AGENT_DIST_SUBPATH, BASH_ALLOWLIST, buildImplementerAgentMd() (+7 more)

### Community 37 - "Settings Modal"
Cohesion: 0.11
Nodes (15): DragHandleAttributes, DragHandleListeners, GeneralSettings(), IMPLEMENTER_OPTIONS, LANGUAGE_OPTIONS, ProfileRowProps, SettingsModal(), SettingsModalProps (+7 more)

### Community 38 - "Server Entry & Static"
Cohesion: 0.15
Nodes (13): runFirstBootSetup(), PROJECT_ROOT, RunningServer, serveStaticAsset(), SocketData, startServer(), StartServerOptions, STATIC_CONTENT_TYPES (+5 more)

### Community 39 - "System Adapter Types"
Cohesion: 0.12
Nodes (14): PrSelectRowProps, log, createLogger(), log, OpenPr, dryRunLog, FAKE_OPEN_PRS, fakeEncoder (+6 more)

### Community 40 - "Coordinator & Hub Wiring"
Cohesion: 0.23
Nodes (10): FullscreenToggle(), FullscreenToggleProps, badgeLabelFor(), LiveTerminal(), LiveTerminalOptions, LiveTerminalProps, TerminalData, TerminalView() (+2 more)

### Community 41 - "Chart Components"
Cohesion: 0.16
Nodes (12): ChartConfig, ChartContainer, ChartContainerProps, ChartContext, ChartContextValue, ChartLegendContent(), ChartLegendContentProps, ChartTooltipContent() (+4 more)

### Community 42 - "Triage Manager"
Cohesion: 0.14
Nodes (17): buildContractConstraintsLines(), buildResponseFormatLines(), buildStrictRulesLines(), buildTicketLines(), buildTriageChannelPrompt(), buildTriagePlusChannelPrompt(), isEnglish(), DRY_RUN_VERDICT (+9 more)

### Community 43 - "Slot Workflow View"
Cohesion: 0.14
Nodes (10): isWorkerToolName(), WORKER_TOOLS, workerOutboundSchema, WorkerToolName, BackendBridge, bridge, env, envSchema (+2 more)

### Community 44 - "Theme Management"
Cohesion: 0.31
Nodes (8): UseThemeResult, applyTheme(), getStoredTheme(), isTheme(), Theme, ThemeOption, THEMES, root

### Community 45 - "Agent Knobs & Models"
Cohesion: 0.17
Nodes (6): log, Watchdog, ClientSocket, ClientSocketData, NativeNotify, ACTIVE_STAGES

### Community 47 - "Triage Prompt Builder"
Cohesion: 0.22
Nodes (10): QuitConfirmModal(), TerminalsView(), useTerminals, ShortcutDetail, useTerminalShortcuts(), UseTerminalShortcutsOptions, SplitTreeProps, collectTerminalIds() (+2 more)

### Community 48 - "User Terminal Manager"
Cohesion: 0.11
Nodes (18): dependencies, dompurify, elysia, marked, @modelcontextprotocol/sdk, nanoid, papaparse, @radix-ui/react-toggle (+10 more)

### Community 49 - "Database Schema & Seed"
Cohesion: 0.32
Nodes (6): useStats(), UseStatsResult, StatRecord, StatCard(), StatCardProps, StatEmpty()

### Community 50 - "Triage Verdicts & Config"
Cohesion: 0.14
Nodes (14): labelWithDefault(), TicketConfigSummary(), AGENT_EFFORT_LABELS, COMMENT_AUTHORS, COMMIT_LANGUAGE_LABELS, COMMIT_LANGUAGES, IMPLEMENTER_LABELS, ProfileConfig (+6 more)

### Community 51 - "AGENTS.md Docs"
Cohesion: 0.42
Nodes (11): AgentProfileConfigProps, ImplementationAgentFieldsProps, NewProfile, NewTicket, ProfilePatch, AgentKnobs, AgentProfileConfigValues, ResolvedAgentDefaults (+3 more)

### Community 52 - "Stop Hook & Usage"
Cohesion: 0.33
Nodes (5): aggregateUsage(), ModelUsage, num(), StopHookInput, UsageByModel

### Community 53 - "PR Selection"
Cohesion: 0.20
Nodes (8): TERMINAL_THEME, terminalWsUrl(), textEncoder, useXtermSocket, UseXtermSocketOptions, terminalServerMessageSchema, TerminalCell(), TerminalCellProps

### Community 54 - "CONTEXT.md Glossary"
Cohesion: 0.18
Nodes (8): SlotsBar(), SlotsBarProps, Stat(), StatProps, STATUS_LABELS, mapSlotRow(), BoardState, Slot

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
Cohesion: 0.33
Nodes (4): CsvParseError, ParsedTicketRow, ParsedTicketsCsv, parseTicketsCsv()

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
Cohesion: 0.19
Nodes (20): Composer 2.5 Implementer Path, buildAskContract(), buildCleanContract(), buildConflictResolutionContract(), buildFeasibilityContextSection(), buildImplementingSteps(), buildPlanningStep(), buildReviewContract() (+12 more)

### Community 74 - "Community 74"
Cohesion: 0.33
Nodes (5): BACKEND_WS, SLOT_ID, TICKET_ID, /Users/antoineliu/kanban-agents/build/dev-macos-arm64/Atelier-dev.app/Contents/MacOS/bun, worker

### Community 75 - "Community 75"
Cohesion: 0.33
Nodes (5): CONTEXT — domain glossary, Execution, Proposed (not yet built), Seams, Work items

### Community 76 - "Community 76"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 78 - "Community 78"
Cohesion: 0.27
Nodes (8): active, ensureNotificationPermission(), isSupported(), playNotificationSound(), showDesktopNotification(), CommentListener, Toast, wsClientEventSchema

### Community 84 - "Community 84"
Cohesion: 0.27
Nodes (4): detectInstallCommand(), realpathSafe(), resolveWorktreeScriptCommand(), WorktreeSetupOptions

### Community 85 - "Community 85"
Cohesion: 0.28
Nodes (6): AGENT_EFFORT_OPTIONS, AGENT_MODEL_OPTIONS, IMPLEMENTERS, TabOption, Tabs(), TabsProps

### Community 86 - "Community 86"
Cohesion: 0.25
Nodes (3): RouteDeps, UserTerminalManager, TerminalDescriptor

### Community 87 - "Community 87"
Cohesion: 0.47
Nodes (3): dataMessage(), send(), TerminalSession

### Community 90 - "Community 90"
Cohesion: 0.60
Nodes (5): groupOrientation(), layoutToSizes(), panelId(), panelPercent(), SplitTree()

## Knowledge Gaps
- **395 isolated node(s):** `ReclaimOutcome`, `log`, `SETUP_PHASES`, `SlotManagerConfig`, `log` (+390 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `BoardStore` connect `Board Store & Notifications` to `Terminal Split View`, `Agent Config Constants`, `Community 78`, `Triage Prompt Builder`, `CONTEXT.md Glossary`, `App & Board Root`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **Why does `RealSystemAdapter` connect `Review Done Gate (E2E)` to `Community 84`, `Community 77`, `Real Worktree Shell Ops`, `System Adapter Types`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **What connects `ReclaimOutcome`, `log`, `SETUP_PHASES` to the rest of the system?**
  _398 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Slot & Project Config` be split into smaller, more focused modules?**
  _Cohesion score 0.14979757085020243 - nodes in this community are weakly interconnected._
- **Should `Agents & Ticket UI` be split into smaller, more focused modules?**
  _Cohesion score 0.05311676909569798 - nodes in this community are weakly interconnected._
- **Should `MCP Channels & Workers` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._
- **Should `API Schemas & Inputs` be split into smaller, more focused modules?**
  _Cohesion score 0.05550416281221091 - nodes in this community are weakly interconnected._