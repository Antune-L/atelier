# Graph Report - kanban-agents  (2026-06-27)

## Corpus Check
- 141 files · ~626,899 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1361 nodes · 3257 edges · 75 communities (65 shown, 10 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 11 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3b776135`
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
- [[_COMMUNITY_Community 28|Community 28]]
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
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Theme Management|Theme Management]]
- [[_COMMUNITY_Agent Knobs & Models|Agent Knobs & Models]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Triage Prompt Builder|Triage Prompt Builder]]
- [[_COMMUNITY_User Terminal Manager|User Terminal Manager]]
- [[_COMMUNITY_Database Schema & Seed|Database Schema & Seed]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 53|Community 53]]
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
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 82|Community 82]]
- [[_COMMUNITY_Community 83|Community 83]]
- [[_COMMUNITY_Community 84|Community 84]]

## God Nodes (most connected - your core abstractions)
1. `Ticket` - 65 edges
2. `Store` - 62 edges
3. `cn()` - 58 edges
4. `RealSystemAdapter` - 46 edges
5. `SlotManager` - 45 edges
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

## Communities (75 total, 10 thin omitted)

### Community 0 - "Slot & Project Config"
Cohesion: 0.15
Nodes (4): resolveBaseBranch(), SlotManager, slotPath(), slugify()

### Community 1 - "Agents & Ticket UI"
Cohesion: 0.13
Nodes (17): PROGRESS_BAR_COLORS, StageProgressBar(), StageProgressBarProps, ANIMATED_STAGES, BadgeVariant, DATETIME_FORMAT, NON_DEPENDABLE_COLUMNS, prNumberFromUrl() (+9 more)

### Community 2 - "Terminal Split View"
Cohesion: 0.06
Nodes (43): QuitConfirmModal(), TerminalsView(), TerminalsViewProps, loadTree(), saveTree(), storageKey(), useTerminals, ShortcutDetail (+35 more)

### Community 3 - "MCP Channels & Workers"
Cohesion: 0.14
Nodes (15): ClientHub, Column vs Stage axes, Done Gate (server-verified), repoMutex (KeyedMutex), rows.ts (zod row validation), Slot (git-worktree execution unit), SlotManager, Stop Hook Auto-Nudge Escalation (+7 more)

### Community 4 - "API Schemas & Inputs"
Cohesion: 0.05
Nodes (51): COMMENT_AUTHORS, REVIEW_DEPTHS, STAGES, AnalyzeTicketsInput, appSettingsSchema, baseBranchSchema, capabilitiesSchema, commentAuthorSchema (+43 more)

### Community 5 - "UI Utilities & Layout"
Cohesion: 0.10
Nodes (21): TabButton(), NAV_ENTRIES, NavEntry, Sidebar(), SidebarProps, SidebarView, SlotsBar(), Stat() (+13 more)

### Community 6 - "Review Done Gate (E2E)"
Cohesion: 0.08
Nodes (4): RealSystemAdapter, safeJsonParse(), DoneGateResult, ReviewDoneOptions

### Community 7 - "PR & Ticket Panels"
Cohesion: 0.15
Nodes (12): Agent runtime (Agent SDK), Architecture (overview), Atelier, Claude Code skills, Desktop app (macOS, optional), Electrobun dev on a new machine, Environment variables, Getting started (+4 more)

### Community 8 - "Terminal Session Manager"
Cohesion: 0.10
Nodes (14): dataMessage(), log, normalizeSeed(), safeParse(), send(), TerminalSession, TerminalSessionManager, TerminalSocket (+6 more)

### Community 9 - "Store & Profiles"
Cohesion: 0.05
Nodes (18): SlotsBarProps, TicketCardProps, COLUMN_NODE_COLOR, WorkflowViewProps, mapProfileRow(), mapSlotRow(), mapWorktreeSessionRow(), enrichWorktreeSession() (+10 more)

### Community 10 - "Stats Charts & Records"
Cohesion: 0.13
Nodes (18): StatsViewProps, ACTIVE_BAR, AREA_CURSOR, AXIS_PROPS, BAR_CURSOR, CHART_PALETTE, CostChart(), DurationChart() (+10 more)

### Community 11 - "Fake System Adapter"
Cohesion: 0.09
Nodes (4): delay(), fakeShellPrompt(), FakeSystemAdapter, hexToBytes()

### Community 12 - "Agent Profile & Ask Panel"
Cohesion: 0.10
Nodes (15): AnnotatedHtml, isInsideAnnotation(), PrdAnnotation, PrdReviewDialog(), PrdReviewDialogProps, SelectionState, wrapFirstOccurrence(), ABSOLUTE_UPLOAD_PATH (+7 more)

### Community 13 - "Worker Protocol Schemas"
Cohesion: 0.08
Nodes (27): addUsageByModel(), log, ToolHandler, ToolResult, toUsageByModel(), TRIAGE_VERDICTS, AgentSettableStage, agentSettableStageSchema (+19 more)

### Community 14 - "Real Worktree Shell Ops"
Cohesion: 0.10
Nodes (18): CLAUDE_JSON_PATH, COMPOSER_BINARIES, detectInstallCommand(), extractPrUrl(), ghPrSchema, ghPrStateSchema, ghReviewSchema, ghReviewsSchema (+10 more)

### Community 15 - "Feasibility Batch Manager"
Cohesion: 0.15
Nodes (8): buildFeasibilityBatchContract(), DRY_RUN_VERDICT, FeasibilityBatchManager, FeasibilitySession, log, toTriageResult(), ProjectConfig, FeasibilityResult

### Community 16 - "Stats Aggregation & Cost"
Cohesion: 0.10
Nodes (26): effectiveWorkDurationMs(), CostGroup, DurationGroup, KIND_LABELS, KindCount, kindCounts(), meanDurationByEffort(), meanDurationByKey() (+18 more)

### Community 17 - "API Routes & Schemas"
Cohesion: 0.07
Nodes (21): buildReformulatePrompt(), log, PaneReader, analyzeTicketsSchema, createAskSchema, createCleanSchema, createCommentSchema, createProfileSchema (+13 more)

### Community 18 - "Ticket Detail & Forms"
Cohesion: 0.12
Nodes (34): AgentsViewProps, AskPanelProps, CleanPrPanel(), CleanPrPanelProps, ImportTicketsPanel(), ImportTicketsPanelProps, NewTicketDialogProps, Tab (+26 more)

### Community 19 - "Board Store & Notifications"
Cohesion: 0.36
Nodes (8): QuitConfirmModalProps, ConfirmDialogProps, Modal(), ModalBody(), ModalFooter(), ModalHeader(), ModalProps, ModalTitle()

### Community 20 - "Dev Dependencies"
Cohesion: 0.08
Nodes (25): devDependencies, autoprefixer, class-variance-authority, clsx, concurrently, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities (+17 more)

### Community 21 - "TypeScript Config"
Cohesion: 0.08
Nodes (24): compilerOptions, allowImportingTsExtensions, baseUrl, esModuleInterop, isolatedModules, jsx, lib, module (+16 more)

### Community 22 - "DB Rows & Mapping"
Cohesion: 0.08
Nodes (24): CommentRow, commentRowSchema, mapTicketRow(), parseSessionUsage(), ProfileRow, profileRowSchema, projectSchema, SlotRow (+16 more)

### Community 23 - "Client Hub & Watchdog"
Cohesion: 0.14
Nodes (16): log, runFirstBootSetup(), PROJECT_KEYS, PROJECT_ROOT, RunningServer, serveStaticAsset(), SocketData, startServer() (+8 more)

### Community 24 - "Build Scripts"
Cohesion: 0.10
Nodes (20): scripts, build:desktop, build:web, dev, dev:desktop, dev:proxy, dev:server, dev:web (+12 more)

### Community 25 - "Pricing & Token Cost"
Cohesion: 0.15
Nodes (21): formatTokens(), TicketCost(), TicketCostProps, TOKEN_FORMATTER, USD_FORMATTER, AGENT_MODEL_LABELS, costByFamily(), costOf() (+13 more)

### Community 26 - "Desktop Bootstrap"
Cohesion: 0.19
Nodes (24): AgentProfileConfigProps, ImplementationAgentFieldsProps, NewAsk, NewClean, NewProfile, NewReview, NewTicket, ProfilePatch (+16 more)

### Community 27 - "Worker Hub & Bridge"
Cohesion: 0.16
Nodes (11): AUTHOR_BADGES, CommentRow(), CommentRowProps, TriageSection(), TriageSectionProps, dependencyCandidates(), formatDateTime(), triageVerdictVariant() (+3 more)

### Community 29 - "Board Columns"
Cohesion: 0.13
Nodes (13): log, SlotWatch, WorktreeAddressWatcher, AppConfig, config, configSchema, DEFAULT_MODELS, loadConfig() (+5 more)

### Community 30 - "Logging"
Cohesion: 0.14
Nodes (13): ANSI, COLOR_ENABLED, isLevel(), Level, LEVEL_ORDER, LEVEL_TAG, Logger, paint() (+5 more)

### Community 31 - "Terminals View & Modals"
Cohesion: 0.11
Nodes (18): FullscreenToggle(), FullscreenToggleProps, badgeLabelFor(), LiveTerminal(), LiveTerminalOptions, LiveTerminalProps, TerminalData, TerminalView() (+10 more)

### Community 32 - "Ticket Lifecycle"
Cohesion: 0.12
Nodes (14): BoardColumn(), BoardColumnProps, DEFAULT_COLLAPSED, resolveAnalyzeAllTitle(), resolveCheckAllTitle(), resolveMoveAllTitle(), SortDir, useWindowedTickets() (+6 more)

### Community 34 - "Ticket Store Types"
Cohesion: 0.11
Nodes (18): dependencies, @anthropic-ai/claude-agent-sdk, dompurify, elysia, marked, @modelcontextprotocol/sdk, nanoid, papaparse (+10 more)

### Community 35 - "Agent Config Constants"
Cohesion: 0.30
Nodes (11): buildContractConstraintsLines(), buildResponseFormatLines(), buildStrictRulesLines(), buildTicketLines(), buildTriageChannelPrompt(), buildTriagePlusChannelPrompt(), isEnglish(), AGENT_MODELS (+3 more)

### Community 36 - "Runtime Dependencies"
Cohesion: 0.31
Nodes (8): createDatabase(), migrate(), PROFILE_MIGRATIONS, seedProfiles(), seedSlots(), TICKET_MIGRATIONS, DEFAULT_PROFILES, SLOT_COUNT

### Community 37 - "Settings Modal"
Cohesion: 0.11
Nodes (17): DragHandleAttributes, DragHandleListeners, GeneralSettings(), IMPLEMENTER_OPTIONS, LANGUAGE_OPTIONS, ProfileRowProps, ProfilesSettings(), SettingsModal() (+9 more)

### Community 38 - "Server Entry & Static"
Cohesion: 0.15
Nodes (15): applyDesktopEnv(), DesktopRoots, ensureConfig(), boot(), installApplicationMenu(), installMenuShortcutBridge(), menuShortcutActionSchema, newWindowEventSchema (+7 more)

### Community 39 - "System Adapter Types"
Cohesion: 0.33
Nodes (5): resolveTemplatePaths(), TemplatePaths, DRY_RUN_VERDICT, log, TriageSession

### Community 40 - "Coordinator & Hub Wiring"
Cohesion: 0.28
Nodes (13): AgentCard(), AgentCardProps, projectBadgeStyle(), TicketCard(), TriageDot(), useTickTimer(), formatDuration(), formatRelativeDuration() (+5 more)

### Community 41 - "Chart Components"
Cohesion: 0.16
Nodes (12): ChartConfig, ChartContainer, ChartContainerProps, ChartContext, ChartContextValue, ChartLegendContent(), ChartLegendContentProps, ChartTooltipContent() (+4 more)

### Community 42 - "Community 42"
Cohesion: 0.40
Nodes (5): MIME_EXTENSIONS, resolveExtension(), SavedUpload, saveUpload(), serveUpload()

### Community 43 - "Community 43"
Cohesion: 0.48
Nodes (4): PrSelectRow(), PrSelectRowProps, isPrNeedsAttention(), OpenPr

### Community 44 - "Theme Management"
Cohesion: 0.31
Nodes (8): UseThemeResult, applyTheme(), getStoredTheme(), isTheme(), Theme, ThemeOption, THEMES, root

### Community 45 - "Agent Knobs & Models"
Cohesion: 0.11
Nodes (12): RouteDeps, log, UserTerminalManager, TerminalDescriptor, dryRunLog, FAKE_OPEN_PRS, fakeEncoder, GitWorktreeAddOptions (+4 more)

### Community 46 - "Community 46"
Cohesion: 0.14
Nodes (13): labelWithDefault(), TicketConfigSummary(), mapCommentRow(), AGENT_EFFORT_LABELS, CommentAuthor, COMMIT_LANGUAGE_LABELS, COMMIT_LANGUAGES, IMPLEMENTER_LABELS (+5 more)

### Community 47 - "Triage Prompt Builder"
Cohesion: 0.22
Nodes (5): Architecture, Commands, Conventions (enforced — beyond the global ones in ~/.claude/CLAUDE.md), The dry-run safety model — read before running anything, What this is

### Community 48 - "User Terminal Manager"
Cohesion: 0.19
Nodes (16): AgentProfileConfig(), AskPanel(), ImplementationAgentFields(), loadOnce(), subscribers, UNKNOWN_CAPABILITIES, useCapabilities(), resolveAgentDefaults() (+8 more)

### Community 49 - "Database Schema & Seed"
Cohesion: 0.28
Nodes (7): StatsView(), useStats(), UseStatsResult, StatRecord, StatCard(), StatCardProps, StatEmpty()

### Community 51 - "Community 51"
Cohesion: 0.33
Nodes (7): MCP Channel, No-SDK Design Choice, Two-Channel Agent Protocol, Worker (MCP channel server), WorkerHub, Channel (agent↔backend link), Protocol (wire-format source of truth)

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
Cohesion: 0.10
Nodes (8): log, Watchdog, ClientHub, ClientSocket, ClientSocketData, NativeNotify, Notifier, ACTIVE_STAGES

### Community 60 - "Community 60"
Cohesion: 0.13
Nodes (20): AgentsView(), normalize(), Board(), BoardProps, normalize(), NewTicketDialog(), Toaster(), WorkflowView() (+12 more)

### Community 61 - "Dry-Run Safety Model"
Cohesion: 0.67
Nodes (4): Dry-Run Safety Model, FakeSystemAdapter, RealSystemAdapter, SystemAdapter (side-effect boundary)

### Community 62 - "Projects Hook"
Cohesion: 0.40
Nodes (6): costByModel(), costByProject(), meanCostPerIssueUsd(), modelLabel(), totalSpendUsd(), withCost()

### Community 73 - "Community 73"
Cohesion: 0.17
Nodes (22): Composer 2.5 Implementer Path, buildAskContract(), buildCleanContract(), buildConflictResolutionContract(), buildFeasibilityContextSection(), buildImplementingSteps(), buildPlanningStep(), buildReviewContract() (+14 more)

### Community 74 - "Community 74"
Cohesion: 0.33
Nodes (4): CsvParseError, ParsedTicketRow, ParsedTicketsCsv, parseTicketsCsv()

### Community 81 - "Community 81"
Cohesion: 0.33
Nodes (4): currentNow, startTicking(), subscribe(), subscribers

### Community 82 - "Community 82"
Cohesion: 0.32
Nodes (6): TicketBadges(), TicketBadgesProps, Badge(), BadgeProps, BadgeVariant, badgeVariants

### Community 84 - "Community 84"
Cohesion: 0.33
Nodes (6): resolveProjectColor(), resolveProjectLabel(), isLocked(), TicketDetail(), finishedKindLabel(), stageVariant()

## Knowledge Gaps
- **361 isolated node(s):** `menuShortcutActionSchema`, `newWindowEventSchema`, `ELECTROBUN_BIN`, `PATH_PROBE_COMMAND`, `listeners` (+356 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Ticket` connect `Store & Profiles` to `Slot & Project Config`, `Agents & Ticket UI`, `Terminal Split View`, `API Schemas & Inputs`, `Feasibility Batch Manager`, `API Routes & Schemas`, `Ticket Detail & Forms`, `DB Rows & Mapping`, `Pricing & Token Cost`, `Desktop Bootstrap`, `Worker Hub & Bridge`, `Ticket Lifecycle`, `Agent Config Constants`, `Coordinator & Hub Wiring`, `Community 46`, `Package Manifest`, `Community 60`, `Community 73`, `Community 82`?**
  _High betweenness centrality (0.070) - this node is a cross-community bridge._
- **Why does `FakeSystemAdapter` connect `Fake System Adapter` to `Agent Knobs & Models`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Why does `Store` connect `Store & Profiles` to `System Adapter Types`, `Terminal Session Manager`, `Community 73`, `Worker Protocol Schemas`, `Community 46`, `Feasibility Batch Manager`, `Agent Knobs & Models`, `API Routes & Schemas`, `DB Rows & Mapping`, `Client Hub & Watchdog`, `Desktop Bootstrap`, `Package Manifest`, `Community 28`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **What connects `menuShortcutActionSchema`, `newWindowEventSchema`, `ELECTROBUN_BIN` to the rest of the system?**
  _364 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Agents & Ticket UI` be split into smaller, more focused modules?**
  _Cohesion score 0.13450292397660818 - nodes in this community are weakly interconnected._
- **Should `Terminal Split View` be split into smaller, more focused modules?**
  _Cohesion score 0.05803571428571429 - nodes in this community are weakly interconnected._
- **Should `MCP Channels & Workers` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._