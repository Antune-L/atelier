# Graph Report - kanban-agents  (2026-06-23)

## Corpus Check
- 136 files · ~98,056 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1396 nodes · 3252 edges · 75 communities (62 shown, 13 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 15 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `74da83df`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Terminal Viewer UI|Terminal Viewer UI]]
- [[_COMMUNITY_Ticket Action Panels|Ticket Action Panels]]
- [[_COMMUNITY_API Client & Schemas|API Client & Schemas]]
- [[_COMMUNITY_Sidebar & Slots Bar|Sidebar & Slots Bar]]
- [[_COMMUNITY_Slot Manager Lifecycle|Slot Manager Lifecycle]]
- [[_COMMUNITY_Board & App Views|Board & App Views]]
- [[_COMMUNITY_Fake Adapter (Git Ops)|Fake Adapter (Git Ops)]]
- [[_COMMUNITY_Architecture Concepts (Docs)|Architecture Concepts (Docs)]]
- [[_COMMUNITY_Ticket Detail & Comments|Ticket Detail & Comments]]
- [[_COMMUNITY_SQL Store Mutations|SQL Store Mutations]]
- [[_COMMUNITY_Agent Contract Builders|Agent Contract Builders]]
- [[_COMMUNITY_Stats Aggregation|Stats Aggregation]]
- [[_COMMUNITY_API Routes|API Routes]]
- [[_COMMUNITY_DB Row Schemas|DB Row Schemas]]
- [[_COMMUNITY_Worker Protocol & MCP Schemas|Worker Protocol & MCP Schemas]]
- [[_COMMUNITY_Settings Modal|Settings Modal]]
- [[_COMMUNITY_Dev Dependencies|Dev Dependencies]]
- [[_COMMUNITY_Server Boot & Sockets|Server Boot & Sockets]]
- [[_COMMUNITY_Real Adapter (Git Ops)|Real Adapter (Git Ops)]]
- [[_COMMUNITY_TypeScript Config|TypeScript Config]]
- [[_COMMUNITY_Feasibility Batch Manager|Feasibility Batch Manager]]
- [[_COMMUNITY_Slot Setup & Templates|Slot Setup & Templates]]
- [[_COMMUNITY_Triage Manager|Triage Manager]]
- [[_COMMUNITY_Notifications & Board Store|Notifications & Board Store]]
- [[_COMMUNITY_Build & Dev Scripts|Build & Dev Scripts]]
- [[_COMMUNITY_Stage Progress & Display|Stage Progress & Display]]
- [[_COMMUNITY_Stats Charts|Stats Charts]]
- [[_COMMUNITY_Ticket Cost & Pricing|Ticket Cost & Pricing]]
- [[_COMMUNITY_Desktop Bootstrap & Menu|Desktop Bootstrap & Menu]]
- [[_COMMUNITY_PRD Review Dialog|PRD Review Dialog]]
- [[_COMMUNITY_Logger|Logger]]
- [[_COMMUNITY_Real Adapter Config & GH Schemas|Real Adapter Config & GH Schemas]]
- [[_COMMUNITY_Agent Coordinator|Agent Coordinator]]
- [[_COMMUNITY_Watchdog & Hub Lifecycle|Watchdog & Hub Lifecycle]]
- [[_COMMUNITY_Board Column|Board Column]]
- [[_COMMUNITY_Ticket Lifecycle|Ticket Lifecycle]]
- [[_COMMUNITY_Runtime Dependencies|Runtime Dependencies]]
- [[_COMMUNITY_Store Types|Store Types]]
- [[_COMMUNITY_Agent Profile Config|Agent Profile Config]]
- [[_COMMUNITY_Worker Hub|Worker Hub]]
- [[_COMMUNITY_Fake Session Spawning|Fake Session Spawning]]
- [[_COMMUNITY_Agent Cards & Timers|Agent Cards & Timers]]
- [[_COMMUNITY_Terminal Manager (Server)|Terminal Manager (Server)]]
- [[_COMMUNITY_Chart UI Primitives|Chart UI Primitives]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Coordinator Tool Schemas|Coordinator Tool Schemas]]
- [[_COMMUNITY_App Config|App Config]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Theme System|Theme System]]
- [[_COMMUNITY_Client Hub Broadcast|Client Hub Broadcast]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Stats View Hook|Stats View Hook]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Terminal Session Manager|Terminal Session Manager]]
- [[_COMMUNITY_Terminals View & Shortcuts|Terminals View & Shortcuts]]
- [[_COMMUNITY_DB Migrations & Seeds|DB Migrations & Seeds]]
- [[_COMMUNITY_PR Selection|PR Selection]]
- [[_COMMUNITY_Ticket Detail Helpers|Ticket Detail Helpers]]
- [[_COMMUNITY_Stop Hook Usage Aggregation|Stop Hook Usage Aggregation]]
- [[_COMMUNITY_PreToolUse Guard Hook|PreToolUse Guard Hook]]
- [[_COMMUNITY_Webhook Channel|Webhook Channel]]
- [[_COMMUNITY_Package Metadata|Package Metadata]]
- [[_COMMUNITY_Real Pane Stream|Real Pane Stream]]
- [[_COMMUNITY_Dry-Run Safety Model|Dry-Run Safety Model]]
- [[_COMMUNITY_Composer Runner Script|Composer Runner Script]]
- [[_COMMUNITY_Vite Config|Vite Config]]
- [[_COMMUNITY_Config Split Rationale|Config Split Rationale]]
- [[_COMMUNITY_No-Cast Convention|No-Cast Convention]]
- [[_COMMUNITY_TriageFeasibility Concept|Triage/Feasibility Concept]]
- [[_COMMUNITY_Theme Flash Guard|Theme Flash Guard]]

## God Nodes (most connected - your core abstractions)
1. `Ticket` - 63 edges
2. `Store` - 58 edges
3. `cn()` - 57 edges
4. `RealSystemAdapter` - 46 edges
5. `SlotManager` - 40 edges
6. `FakeSystemAdapter` - 40 edges
7. `ProjectInfo` - 35 edges
8. `ClientHub` - 28 edges
9. `AgentCoordinator` - 24 edges
10. `FeasibilityBatchManager` - 24 edges

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

## Hyperedges (group relationships)
- **Two-channel agent protocol loop** — agents_worker, agents_worker_hub, agents_contract, agents_mcp_channel [EXTRACTED 1.00]
- **Slot lifecycle (acquire → spawn → done gate → release)** — agents_slot_manager, agents_slot, agents_repo_mutex, agents_done_gate [EXTRACTED 1.00]
- **Dry-run side-effect seam** — agents_dry_run_safety_model, agents_system_adapter, agents_fake_system_adapter, agents_real_system_adapter [EXTRACTED 1.00]

## Communities (75 total, 13 thin omitted)

### Community 0 - "Terminal Viewer UI"
Cohesion: 0.06
Nodes (44): AskPanel(), QuitConfirmModal(), TerminalsView(), loadOnce(), useCapabilities(), loadTree(), saveTree(), storageKey() (+36 more)

### Community 1 - "Ticket Action Panels"
Cohesion: 0.12
Nodes (31): AgentsViewProps, AskPanelProps, CleanPrPanel(), CleanPrPanelProps, NewTicketDialogProps, Tab, TAB_TITLES, TabButtonProps (+23 more)

### Community 2 - "API Client & Schemas"
Cohesion: 0.07
Nodes (29): appSettingsSchema, baseBranchSchema, capabilitiesSchema, commentAuthorSchema, commentSchema, commitLanguageSchema, CreateTerminalBody, feasibilityResultSchema (+21 more)

### Community 3 - "Sidebar & Slots Bar"
Cohesion: 0.09
Nodes (22): TabButton(), NAV_ENTRIES, NavEntry, Sidebar(), SidebarProps, SidebarView, SlotsBar(), SlotsBarProps (+14 more)

### Community 5 - "Board & App Views"
Cohesion: 0.11
Nodes (20): Board(), BoardProps, normalize(), NewTicketDialog(), Toaster(), COLUMN_NODE_COLOR, WorkflowView(), WorkflowViewProps (+12 more)

### Community 6 - "Fake Adapter (Git Ops)"
Cohesion: 0.09
Nodes (4): delay(), fakeShellPrompt(), FakeSystemAdapter, hexToBytes()

### Community 7 - "Architecture Concepts (Docs)"
Cohesion: 0.05
Nodes (45): ClientHub, Column vs Stage axes, Done Gate (server-verified), MCP Channel, No-SDK Design Choice, repoMutex (KeyedMutex), rows.ts (zod row validation), Slot (git-worktree execution unit) (+37 more)

### Community 8 - "Ticket Detail & Comments"
Cohesion: 0.12
Nodes (14): BoardColumn(), BoardColumnProps, DEFAULT_COLLAPSED, resolveAnalyzeAllTitle(), resolveCheckAllTitle(), resolveMoveAllTitle(), SortDir, useWindowedTickets() (+6 more)

### Community 9 - "SQL Store Mutations"
Cohesion: 0.10
Nodes (6): mapProfileRow(), SqlUpdateBuilder, Store, AppSettings, Profile, UpdateAppSettingsInput

### Community 10 - "Agent Contract Builders"
Cohesion: 0.29
Nodes (15): Composer 2.5 Implementer Path, buildAskContract(), buildCleanContract(), buildConflictResolutionContract(), buildFeasibilityContextSection(), buildImplementingSteps(), buildPlanningStep(), buildReviewContract() (+7 more)

### Community 11 - "Stats Aggregation"
Cohesion: 0.12
Nodes (23): effectiveWorkDurationMs(), CostGroup, DurationGroup, KIND_LABELS, KindCount, meanDurationByEffort(), meanDurationByKey(), meanDurationByModel() (+15 more)

### Community 12 - "API Routes"
Cohesion: 0.07
Nodes (20): agentActiveSchema, log, PaneReader, stopHookSchema, analyzeTicketsSchema, createAskSchema, createCleanSchema, createCommentSchema (+12 more)

### Community 13 - "DB Row Schemas"
Cohesion: 0.09
Nodes (22): CommentRow, commentRowSchema, mapTicketRow(), parseSessionUsage(), ProfileRow, profileRowSchema, projectSchema, SlotRow (+14 more)

### Community 14 - "Worker Protocol & MCP Schemas"
Cohesion: 0.09
Nodes (23): TRIAGE_VERDICTS, AgentSettableStage, agentSettableStageSchema, AssertNamesCovered, channelEventSchema, isWorkerToolName(), submitFeasibilityMcpArgsSchema, submitTriageMcpArgsSchema (+15 more)

### Community 15 - "Settings Modal"
Cohesion: 0.08
Nodes (30): QuitConfirmModalProps, DragHandleAttributes, DragHandleListeners, GeneralSettings(), IMPLEMENTER_OPTIONS, LANGUAGE_OPTIONS, ProfileRowProps, SettingsModal() (+22 more)

### Community 16 - "Dev Dependencies"
Cohesion: 0.08
Nodes (25): devDependencies, autoprefixer, class-variance-authority, clsx, concurrently, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities (+17 more)

### Community 17 - "Server Boot & Sockets"
Cohesion: 0.09
Nodes (21): log, runFirstBootSetup(), PROJECT_KEYS, PROJECT_ROOT, RunningServer, serveStaticAsset(), SocketData, startServer() (+13 more)

### Community 18 - "Real Adapter (Git Ops)"
Cohesion: 0.09
Nodes (3): RealSystemAdapter, safeJsonParse(), DoneGateResult

### Community 19 - "TypeScript Config"
Cohesion: 0.08
Nodes (24): compilerOptions, allowImportingTsExtensions, baseUrl, esModuleInterop, isolatedModules, jsx, lib, module (+16 more)

### Community 20 - "Feasibility Batch Manager"
Cohesion: 0.15
Nodes (10): buildFeasibilityBatchContract(), DRY_RUN_VERDICT, FeasibilityBatchManager, FeasibilityManagerConfig, FeasibilitySession, feasibilitySessionName(), log, toTriageResult() (+2 more)

### Community 21 - "Slot Setup & Templates"
Cohesion: 0.14
Nodes (16): resolveBaseBranch(), log, ReclaimOutcome, SETUP_PHASES, SlotManagerConfig, slugify(), AGENT_DIST_SUBPATH, BASH_ALLOWLIST (+8 more)

### Community 22 - "Triage Manager"
Cohesion: 0.31
Nodes (3): TriageManager, triageSessionName(), TriageResult

### Community 23 - "Notifications & Board Store"
Cohesion: 0.11
Nodes (17): labelWithDefault(), TicketConfigSummary(), AGENT_EFFORT_LABELS, AGENT_EFFORTS, AGENT_MODEL_LABELS, COMMENT_AUTHORS, COMMIT_LANGUAGE_LABELS, COMMIT_LANGUAGES (+9 more)

### Community 24 - "Build & Dev Scripts"
Cohesion: 0.09
Nodes (23): scripts, build:agents, build:desktop, build:hooks, build:web, build:worker, dev, dev:desktop (+15 more)

### Community 25 - "Stage Progress & Display"
Cohesion: 0.07
Nodes (43): AgentCard(), AgentCardProps, AgentsView(), normalize(), PROGRESS_BAR_COLORS, StageProgressBar(), StageProgressBarProps, TicketBadges() (+35 more)

### Community 26 - "Stats Charts"
Cohesion: 0.06
Nodes (45): StatsView(), StatsViewProps, useStats(), UseStatsResult, costByModel(), costByProject(), kindCounts(), meanCostPerIssueUsd() (+37 more)

### Community 27 - "Ticket Cost & Pricing"
Cohesion: 0.16
Nodes (20): formatTokens(), TicketCost(), TicketCostProps, TOKEN_FORMATTER, USD_FORMATTER, costByFamily(), costOf(), costOfModel() (+12 more)

### Community 28 - "Desktop Bootstrap & Menu"
Cohesion: 0.15
Nodes (15): applyDesktopEnv(), DesktopRoots, ensureConfig(), boot(), installApplicationMenu(), installMenuShortcutBridge(), menuShortcutActionSchema, newWindowEventSchema (+7 more)

### Community 29 - "PRD Review Dialog"
Cohesion: 0.10
Nodes (15): AnnotatedHtml, isInsideAnnotation(), PrdAnnotation, PrdReviewDialog(), PrdReviewDialogProps, SelectionState, wrapFirstOccurrence(), ABSOLUTE_UPLOAD_PATH (+7 more)

### Community 30 - "Logger"
Cohesion: 0.14
Nodes (13): ANSI, COLOR_ENABLED, isLevel(), Level, LEVEL_ORDER, LEVEL_TAG, Logger, paint() (+5 more)

### Community 31 - "Real Adapter Config & GH Schemas"
Cohesion: 0.08
Nodes (24): CLAUDE_JSON_PATH, COMPOSER_BINARIES, detectInstallCommand(), detectWorktreeSetupCommand(), detectWorktreeTeardownCommand(), FEASIBILITY_DENIED_AGENTS, FEASIBILITY_SCOUT_AGENTS_JSON, FEASIBILITY_SETTINGS_JSON (+16 more)

### Community 32 - "Agent Coordinator"
Cohesion: 0.13
Nodes (4): AgentCoordinator, ToolCallContext, WorkerToolName, BackendBridge

### Community 33 - "Watchdog & Hub Lifecycle"
Cohesion: 0.17
Nodes (6): log, Watchdog, ClientSocket, ClientSocketData, NativeNotify, ACTIVE_STAGES

### Community 34 - "Board Column"
Cohesion: 0.21
Nodes (22): AgentProfileConfigProps, ImplementationAgentFieldsProps, NewAsk, NewClean, NewProfile, NewReview, NewTicket, ProfilePatch (+14 more)

### Community 35 - "Ticket Lifecycle"
Cohesion: 0.12
Nodes (17): FullscreenToggle(), FullscreenToggleProps, badgeLabelFor(), LiveTerminal(), LiveTerminalProps, TerminalData, TerminalView(), TerminalViewProps (+9 more)

### Community 36 - "Runtime Dependencies"
Cohesion: 0.11
Nodes (18): dependencies, dompurify, elysia, marked, @modelcontextprotocol/sdk, nanoid, papaparse, @radix-ui/react-toggle (+10 more)

### Community 37 - "Store Types"
Cohesion: 0.21
Nodes (9): ImportTicketsPanel(), ImportTicketsPanelProps, useAgentKnobs(), CsvParseError, ParsedTicketRow, ParsedTicketsCsv, parseTicketsCsv(), Switch (+1 more)

### Community 38 - "Agent Profile Config"
Cohesion: 0.22
Nodes (5): Architecture, Commands, Conventions (enforced — beyond the global ones in ~/.claude/CLAUDE.md), The dry-run safety model — read before running anything, What this is

### Community 39 - "Worker Hub"
Cohesion: 0.15
Nodes (7): WorkerHub, WorkerHubHandlers, WorkerSocket, WorkerSocketData, ChannelEvent, workerInboundSchema, WorkerOutbound

### Community 40 - "Fake Session Spawning"
Cohesion: 0.16
Nodes (10): dryRunLog, FAKE_OPEN_PRS, fakeEncoder, GitWorktreeAddOptions, PaneSize, PrepareSlotFiles, ReviewDoneOptions, SpawnShellOptions (+2 more)

### Community 41 - "Agent Cards & Timers"
Cohesion: 0.33
Nodes (5): CONTEXT — domain glossary, Execution, Proposed (not yet built), Seams, Work items

### Community 42 - "Terminal Manager (Server)"
Cohesion: 0.20
Nodes (11): dataMessage(), log, normalizeSeed(), send(), TerminalSession, TerminalSocket, TerminalSocketData, visibleText() (+3 more)

### Community 43 - "Chart UI Primitives"
Cohesion: 0.11
Nodes (16): subscribers, UNKNOWN_CAPABILITIES, AnalyzeTicketsInput, Capabilities, CreateAskInput, CreateCleanInput, CreateCommentInput, CreateProfileInput (+8 more)

### Community 44 - "Community 44"
Cohesion: 0.23
Nodes (4): TicketCardProps, TicketLifecycle, Stage, Ticket

### Community 45 - "Coordinator Tool Schemas"
Cohesion: 0.17
Nodes (11): log, ToolHandler, ToolResult, askUserArgsSchema, doneArgsSchema, failArgsSchema, submitAnswerArgsSchema, submitPrdArgsSchema (+3 more)

### Community 46 - "App Config"
Cohesion: 0.12
Nodes (18): buildTriageChannelPrompt(), buildTriagePlusChannelPrompt(), DRY_RUN_VERDICT, log, TriageManagerConfig, TriageSession, AppConfig, config (+10 more)

### Community 47 - "Community 47"
Cohesion: 0.27
Nodes (9): AgentProfileConfig(), ImplementationAgentFields(), ProfilesSettings(), useProfiles(), resolveAgentDefaults(), resolveEffort(), resolveModel(), IMPLEMENTER_LABELS (+1 more)

### Community 48 - "Community 48"
Cohesion: 0.20
Nodes (5): createLogger(), RouteDeps, log, UserTerminalManager, TerminalDescriptor

### Community 49 - "Theme System"
Cohesion: 0.38
Nodes (3): mapSlotRow(), BoardState, Slot

### Community 51 - "Community 51"
Cohesion: 0.50
Nodes (3): emit(), refreshProfiles(), subscribers

### Community 56 - "DB Migrations & Seeds"
Cohesion: 0.36
Nodes (7): createDatabase(), migrate(), PROFILE_MIGRATIONS, seedProfiles(), seedSlots(), TICKET_MIGRATIONS, DEFAULT_PROFILES

### Community 57 - "PR Selection"
Cohesion: 0.48
Nodes (4): PrSelectRow(), PrSelectRowProps, isPrNeedsAttention(), OpenPr

### Community 59 - "Ticket Detail Helpers"
Cohesion: 0.17
Nodes (16): resolveProjectLabel(), AUTHOR_BADGES, CommentRow(), CommentRowProps, isLocked(), parseTriageReport(), TicketDetail(), TicketDetailProps (+8 more)

### Community 62 - "Stop Hook Usage Aggregation"
Cohesion: 0.33
Nodes (5): aggregateUsage(), ModelUsage, num(), StopHookInput, UsageByModel

### Community 66 - "PreToolUse Guard Hook"
Cohesion: 0.33
Nodes (4): denied, DENY_PATTERNS, HookInput, WRITE_EDIT_TOOLS

### Community 67 - "Webhook Channel"
Cohesion: 0.33
Nodes (3): listeners, mcp, ReplyArgsSchema

### Community 69 - "Package Metadata"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 71 - "Dry-Run Safety Model"
Cohesion: 0.67
Nodes (4): Dry-Run Safety Model, FakeSystemAdapter, RealSystemAdapter, SystemAdapter (side-effect boundary)

## Knowledge Gaps
- **383 isolated node(s):** `ReclaimOutcome`, `log`, `SETUP_PHASES`, `SlotManagerConfig`, `PROJECT_ROOT` (+378 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `RealSystemAdapter` connect `Real Adapter (Git Ops)` to `Fake Session Spawning`, `Terminal Manager (Server)`, `Community 53`, `PR Selection`, `Real Adapter Config & GH Schemas`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Why does `Ticket` connect `Community 44` to `Terminal Viewer UI`, `Ticket Action Panels`, `API Client & Schemas`, `Slot Manager Lifecycle`, `Board & App Views`, `Ticket Detail & Comments`, `SQL Store Mutations`, `Agent Contract Builders`, `API Routes`, `DB Row Schemas`, `Slot Setup & Templates`, `Notifications & Board Store`, `Stage Progress & Display`, `Ticket Cost & Pricing`, `Watchdog & Hub Lifecycle`, `Board Column`, `Chart UI Primitives`, `App Config`, `Theme System`, `Client Hub Broadcast`, `Ticket Detail Helpers`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **What connects `ReclaimOutcome`, `log`, `SETUP_PHASES` to the rest of the system?**
  _386 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Terminal Viewer UI` be split into smaller, more focused modules?**
  _Cohesion score 0.05625 - nodes in this community are weakly interconnected._
- **Should `Ticket Action Panels` be split into smaller, more focused modules?**
  _Cohesion score 0.12181616832779624 - nodes in this community are weakly interconnected._
- **Should `API Client & Schemas` be split into smaller, more focused modules?**
  _Cohesion score 0.06666666666666667 - nodes in this community are weakly interconnected._
- **Should `Sidebar & Slots Bar` be split into smaller, more focused modules?**
  _Cohesion score 0.09247311827956989 - nodes in this community are weakly interconnected._