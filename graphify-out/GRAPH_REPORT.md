# Graph Report - slot-1  (2026-06-27)

## Corpus Check
- 140 files · ~631,333 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1423 nodes · 3281 edges · 70 communities (62 shown, 8 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 16 edges (avg confidence: 0.82)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `eed6ac21`
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
- [[_COMMUNITY_Triage Prompts & Mockups|Triage Prompts & Mockups]]
- [[_COMMUNITY_Modal Dialogs|Modal Dialogs]]
- [[_COMMUNITY_DB Migrations & Seeds|DB Migrations & Seeds]]
- [[_COMMUNITY_Slot State|Slot State]]
- [[_COMMUNITY_Stats Hooks & Cards|Stats Hooks & Cards]]
- [[_COMMUNITY_Worktree Session Store|Worktree Session Store]]
- [[_COMMUNITY_Tick Timer Hook|Tick Timer Hook]]
- [[_COMMUNITY_User Terminal Manager|User Terminal Manager]]
- [[_COMMUNITY_Worktree Address Watcher|Worktree Address Watcher]]
- [[_COMMUNITY_App Settings Store|App Settings Store]]
- [[_COMMUNITY_Cost Aggregation|Cost Aggregation]]
- [[_COMMUNITY_File Uploads|File Uploads]]
- [[_COMMUNITY_Webhook MCP|Webhook MCP]]
- [[_COMMUNITY_Package Manifest|Package Manifest]]
- [[_COMMUNITY_Composer Run Script|Composer Run Script]]
- [[_COMMUNITY_Vite Config|Vite Config]]
- [[_COMMUNITY_No-Type-Casting Convention|No-Type-Casting Convention]]
- [[_COMMUNITY_React Root Mount|React Root Mount]]
- [[_COMMUNITY_Theme Flash Guard|Theme Flash Guard]]

## God Nodes (most connected - your core abstractions)
1. `Ticket` - 67 edges
2. `Store` - 62 edges
3. `cn()` - 49 edges
4. `RealSystemAdapter` - 47 edges
5. `SlotManager` - 45 edges
6. `FakeSystemAdapter` - 41 edges
7. `ProjectInfo` - 39 edges
8. `ClientHub` - 29 edges
9. `getProject()` - 28 edges
10. `isProjectKey()` - 26 edges

## Surprising Connections (you probably didn't know these)
- `boot()` --calls--> `startServer()`  [INFERRED]
  desktop/index.ts → src/server/index.ts
- `Dry-run safety model` --rationale_for--> `Atelier (kanban-agents project)`  [INFERRED]
  AGENTS.md → README.md
- `Kind (ticket pipeline type)` --conceptually_related_to--> `argus (argus-review) skill`  [INFERRED]
  CONTEXT.md → README.md
- `Kind (ticket pipeline type)` --conceptually_related_to--> `minos-pr-feedback skill`  [INFERRED]
  CONTEXT.md → README.md
- `Contract (pipeline instructions)` --references--> `argus (argus-review) skill`  [EXTRACTED]
  CONTEXT.md → README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **System Adapter side-effect seam** — context_system_adapter, agents_fakesystemadapter, agents_realsystemadapter, agents_dry_run_safety_model [EXTRACTED 1.00]
- **Slot lifecycle flow** — context_slotmanager, context_slot, context_sessionhub, context_contract, context_done_gate [EXTRACTED 1.00]
- **Skills referenced by the pipeline contract** — context_contract, readme_paris_research, readme_argus_review, readme_regression_check, readme_mockup_fidelity_review, readme_minos_pr_feedback, readme_composer_implement [EXTRACTED 1.00]
- **Autonomous Implementation Flow** — docs_demo_claude_code_agent, docs_demo_stage_machine, docs_demo_argus_review, docs_demo_automated_tests, docs_demo_pull_request [EXTRACTED 1.00]
- **Ticket-to-PR End-to-End Pipeline** — docs_demo_kanban_board, docs_demo_ticket_creation, docs_demo_feasibility_analysis, docs_demo_claude_code_agent, docs_demo_pull_request [EXTRACTED 1.00]

## Communities (70 total, 8 thin omitted)

### Community 0 - "Contract Building & Slots"
Cohesion: 0.05
Nodes (48): resolveBaseBranch(), buildAskContract(), buildCleanContract(), buildConflictResolutionContract(), buildFeasibilityContextSection(), buildImplementingSteps(), buildPlanningStep(), buildReviewContract() (+40 more)

### Community 1 - "Terminals UI & Notifications"
Cohesion: 0.06
Nodes (43): TerminalsView(), loadTree(), saveTree(), storageKey(), useTerminals, ShortcutDetail, useTerminalShortcuts(), UseTerminalShortcutsOptions (+35 more)

### Community 2 - "Desktop Bootstrap & Menus"
Cohesion: 0.10
Nodes (14): dataMessage(), log, normalizeSeed(), safeParse(), send(), TerminalSession, TerminalSessionManager, TerminalSocket (+6 more)

### Community 3 - "Feasibility Batch Management"
Cohesion: 0.07
Nodes (8): buildFeasibilityBatchContract(), FeasibilityBatchManager, toTriageResult(), SessionHub, TriageManager, RouteDeps, FeasibilityResult, TriageResult

### Community 4 - "Ticket Action Panels"
Cohesion: 0.13
Nodes (16): AgentProfileConfig(), ImportTicketsPanel(), Tab, TAB_TITLES, TabButtonProps, ProjectSelect(), WorktreePanel(), useAgentKnobs() (+8 more)

### Community 5 - "Fake System Adapter"
Cohesion: 0.09
Nodes (4): delay(), fakeShellPrompt(), FakeSystemAdapter, hexToBytes()

### Community 6 - "Shared Zod Schemas"
Cohesion: 0.05
Nodes (35): COMMENT_AUTHORS, STAGES, appSettingsSchema, baseBranchSchema, capabilitiesSchema, commentAuthorSchema, commentSchema, CreateTerminalBody (+27 more)

### Community 7 - "Settings & Profiles UI"
Cohesion: 0.09
Nodes (25): QuitConfirmModal(), QuitConfirmModalProps, DragHandleAttributes, DragHandleListeners, GeneralSettings(), IMPLEMENTER_OPTIONS, LANGUAGE_OPTIONS, ProfileRowProps (+17 more)

### Community 8 - "PR Selection & Slots Bar"
Cohesion: 0.08
Nodes (24): NAV_ENTRIES, NavEntry, Sidebar(), SidebarProps, SidebarView, SlotsBarProps, Stat(), StatProps (+16 more)

### Community 9 - "Real System Adapter"
Cohesion: 0.06
Nodes (10): detectInstallCommand(), extractPrUrl(), realpathSafe(), RealSystemAdapter, resolveWorktreeScriptCommand(), safeJsonParse(), shQuote(), DoneGateResult (+2 more)

### Community 10 - "Slot Config & Worktree Watch"
Cohesion: 0.09
Nodes (18): FullscreenToggle(), FullscreenToggleProps, badgeLabelFor(), LiveTerminal(), LiveTerminalOptions, LiveTerminalProps, TerminalData, TerminalView() (+10 more)

### Community 11 - "Core Domain Concepts"
Cohesion: 0.08
Nodes (31): Bun runtime, @anthropic-ai/claude-agent-sdk, Composer 2.5 implementer path, Dry-run safety model, FakeSystemAdapter, RealSystemAdapter, Channel (agent<->backend link), Column (board lane) (+23 more)

### Community 12 - "Board & Sidebar Layout"
Cohesion: 0.67
Nodes (3): loadOnce(), subscribers, useProjects()

### Community 13 - "Database Store Operations"
Cohesion: 0.12
Nodes (3): mapProfileRow(), Store, Profile

### Community 14 - "Coordinator & Protocol"
Cohesion: 0.08
Nodes (25): addUsageByModel(), log, ToolHandler, ToolResult, toUsageByModel(), TRIAGE_VERDICTS, AgentSettableStage, agentSettableStageSchema (+17 more)

### Community 15 - "API Routes & Reformulate"
Cohesion: 0.07
Nodes (20): buildReformulatePrompt(), log, PaneReader, analyzeTicketsSchema, createAskSchema, createCleanSchema, createCommentSchema, createProfileSchema (+12 more)

### Community 16 - "Stats Aggregation"
Cohesion: 0.10
Nodes (26): effectiveWorkDurationMs(), CostGroup, DurationGroup, KIND_LABELS, KindCount, kindCounts(), meanDurationByEffort(), meanDurationByKey() (+18 more)

### Community 17 - "Triage & Server Hub"
Cohesion: 0.11
Nodes (19): createDatabase(), migrate(), PROFILE_MIGRATIONS, seedProfiles(), seedSlots(), TICKET_MIGRATIONS, PROJECT_ROOT, RunningServer (+11 more)

### Community 18 - "Live Terminal Views"
Cohesion: 0.14
Nodes (22): AgentsViewProps, AskPanelProps, CleanPrPanel(), CleanPrPanelProps, ImportTicketsPanelProps, NewTicketDialogProps, ProjectPrPicker(), ProjectPrPickerProps (+14 more)

### Community 19 - "Stage Progress & Display"
Cohesion: 0.12
Nodes (29): AgentCard(), AgentCardProps, PROGRESS_BAR_COLORS, StageProgressBar(), TicketBadges(), projectBadgeStyle(), TicketCard(), TriageDot() (+21 more)

### Community 20 - "Real Adapter GH/Composer"
Cohesion: 0.09
Nodes (24): createLogger(), log, AgentSessionOptions, dryRunLog, FAKE_OPEN_PRS, fakeEncoder, CLAUDE_JSON_PATH, COMPOSER_BINARIES (+16 more)

### Community 21 - "Store Types & Agent Knobs"
Cohesion: 0.13
Nodes (18): mapCommentRow(), mapWorktreeSessionRow(), enrichWorktreeSession(), NewAsk, NewClean, NewReview, SlotStatus, SqlBindValue (+10 more)

### Community 22 - "DB Row Schemas & Mappers"
Cohesion: 0.08
Nodes (23): CommentRow, commentRowSchema, mapTicketRow(), parseSessionUsage(), ProfileRow, profileRowSchema, projectSchema, SlotRow (+15 more)

### Community 23 - "Dev Dependencies"
Cohesion: 0.08
Nodes (25): devDependencies, autoprefixer, class-variance-authority, clsx, concurrently, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities (+17 more)

### Community 24 - "TypeScript Config"
Cohesion: 0.08
Nodes (24): compilerOptions, allowImportingTsExtensions, baseUrl, esModuleInterop, isolatedModules, jsx, lib, module (+16 more)

### Community 25 - "Client Hub & Watchdog"
Cohesion: 0.09
Nodes (10): DRY_RUN_VERDICT, log, TriageSession, log, Watchdog, ClientHub, NativeNotify, Notifier (+2 more)

### Community 26 - "Cost & Pricing"
Cohesion: 0.15
Nodes (21): formatTokens(), TicketCost(), TicketCostProps, TOKEN_FORMATTER, USD_FORMATTER, AGENT_MODEL_LABELS, costByFamily(), costOf() (+13 more)

### Community 27 - "Workflow View & Lifecycle"
Cohesion: 0.18
Nodes (5): StageProgressBarProps, TicketBadgesProps, TicketCardProps, TicketLifecycle, Ticket

### Community 28 - "Stats Charts"
Cohesion: 0.13
Nodes (18): StatsViewProps, ACTIVE_BAR, AREA_CURSOR, AXIS_PROPS, BAR_CURSOR, CHART_PALETTE, CostChart(), DurationChart() (+10 more)

### Community 29 - "Session Hub & Agent Session"
Cohesion: 0.18
Nodes (15): LiveSession, log, previewToolInput(), renderChannelEvent(), renderSessionEvent(), SessionHubHandlers, SessionStartConfig, ChannelEvent (+7 more)

### Community 30 - "Agents View & Ticket Cards"
Cohesion: 0.13
Nodes (18): BASH_ALLOWLIST, buildFeasibilitySessionConfig(), buildImplementSessionConfig(), buildTriageSessionConfig(), DENIED_BUILTIN_AGENTS, feasibilityScoutAgent(), FeasibilitySessionInput, IMPLEMENTER_SAFE_TOOLS (+10 more)

### Community 33 - "Logging"
Cohesion: 0.14
Nodes (13): ANSI, COLOR_ENABLED, isLevel(), Level, LEVEL_ORDER, LEVEL_TAG, Logger, paint() (+5 more)

### Community 34 - "Board Columns"
Cohesion: 0.11
Nodes (16): BoardColumn(), BoardColumnProps, DEFAULT_COLLAPSED, resolveAnalyzeAllTitle(), resolveCheckAllTitle(), resolveMoveAllTitle(), SortDir, useWindowedTickets() (+8 more)

### Community 35 - "NPM Scripts"
Cohesion: 0.10
Nodes (20): scripts, build:desktop, build:web, dev, dev:desktop, dev:proxy, dev:server, dev:web (+12 more)

### Community 36 - "Runtime Dependencies"
Cohesion: 0.11
Nodes (18): dependencies, @anthropic-ai/claude-agent-sdk, dompurify, elysia, marked, @modelcontextprotocol/sdk, nanoid, papaparse (+10 more)

### Community 37 - "Claude SDK Provider"
Cohesion: 0.16
Nodes (16): WORKER_TOOLS, AgentProvider, resolveClaudeBinary(), bashCommandSchema, buildSettings(), claudeProvider, createSdkAgentSession(), dispatch() (+8 more)

### Community 38 - "Agent Profile Config"
Cohesion: 0.19
Nodes (15): AskPanel(), ImplementationAgentFields(), loadOnce(), subscribers, UNKNOWN_CAPABILITIES, useCapabilities(), resolveAgentDefaults(), resolveEffort() (+7 more)

### Community 39 - "Agent Coordinator Handlers"
Cohesion: 0.16
Nodes (12): labelWithDefault(), TicketConfigSummary(), AGENT_EFFORT_LABELS, COMMIT_LANGUAGE_LABELS, COMMIT_LANGUAGES, IMPLEMENTER_LABELS, IMPLEMENTERS, ProfileConfig (+4 more)

### Community 40 - "API Client Inputs"
Cohesion: 0.10
Nodes (16): AnalyzeTicketsInput, AppSettings, CreateAskInput, CreateCleanInput, CreateCommentInput, CreateProfileInput, CreateReviewInput, CreateTicketInput (+8 more)

### Community 41 - "Ticket Config & Constants"
Cohesion: 0.30
Nodes (11): buildContractConstraintsLines(), buildResponseFormatLines(), buildStrictRulesLines(), buildTicketLines(), buildTriageChannelPrompt(), buildTriagePlusChannelPrompt(), isEnglish(), AGENT_MODELS (+3 more)

### Community 42 - "Ticket Detail & Triage UI"
Cohesion: 0.17
Nodes (14): NewTicketDialog(), AUTHOR_BADGES, CommentRow(), CommentRowProps, isLocked(), TicketDetail(), TriageSection(), TriageSectionProps (+6 more)

### Community 43 - "Demo Pipeline Concepts"
Cohesion: 0.27
Nodes (15): Agent Implementation Config, Argus Code Review, Automated Tests (typecheck/lint/test), Claude Code Autonomous Agent, Ticket Contract Injection, Feasibility Analysis, Kanban Board (Atelier), Kanban Agents Demo (demo.gif) (+7 more)

### Community 44 - "Chart Primitives"
Cohesion: 0.16
Nodes (12): ChartConfig, ChartContainer, ChartContainerProps, ChartContext, ChartContextValue, ChartLegendContent(), ChartLegendContentProps, ChartTooltipContent() (+4 more)

### Community 45 - "Session Hub Transcript"
Cohesion: 0.41
Nodes (11): AgentProfileConfigProps, ImplementationAgentFieldsProps, NewProfile, NewTicket, ProfilePatch, AgentKnobs, AgentProfileConfigValues, ResolvedAgentDefaults (+3 more)

### Community 46 - "Triage Prompts & Mockups"
Cohesion: 0.09
Nodes (21): AgentsView(), normalize(), Board(), BoardProps, normalize(), SettingsModal(), SlotsBar(), Toaster() (+13 more)

### Community 47 - "Modal Dialogs"
Cohesion: 0.18
Nodes (9): AnnotatedHtml, isInsideAnnotation(), PrdAnnotation, PrdReviewDialog(), PrdReviewDialogProps, SelectionState, wrapFirstOccurrence(), BranchComboboxProps (+1 more)

### Community 48 - "DB Migrations & Seeds"
Cohesion: 0.13
Nodes (15): applyDesktopEnv(), DesktopRoots, ensureConfig(), boot(), installApplicationMenu(), installMenuShortcutBridge(), menuShortcutActionSchema, newWindowEventSchema (+7 more)

### Community 49 - "Slot State"
Cohesion: 0.22
Nodes (6): mapSlotRow(), BoardState, ClientSocket, ClientSocketData, Slot, WorktreeSession

### Community 50 - "Stats Hooks & Cards"
Cohesion: 0.28
Nodes (7): StatsView(), useStats(), UseStatsResult, StatRecord, StatCard(), StatCardProps, StatEmpty()

### Community 51 - "Worktree Session Store"
Cohesion: 0.18
Nodes (9): TICKET_OPTION, TicketOptionsToggleGroup(), TicketOptionsToggleGroupProps, TicketOptionValues, ToggleGroup, ToggleGroupContext, ToggleGroupItem, Toggle (+1 more)

### Community 52 - "Tick Timer Hook"
Cohesion: 0.27
Nodes (9): UseThemeResult, applyTheme(), getStoredTheme(), isTheme(), Theme, ThemeOption, THEMES, App() (+1 more)

### Community 54 - "Worktree Address Watcher"
Cohesion: 0.48
Nodes (4): PrSelectRow(), PrSelectRowProps, isPrNeedsAttention(), OpenPr

### Community 55 - "App Settings Store"
Cohesion: 0.33
Nodes (4): currentNow, startTicking(), subscribe(), subscribers

### Community 57 - "Cost Aggregation"
Cohesion: 0.40
Nodes (6): costByModel(), costByProject(), meanCostPerIssueUsd(), modelLabel(), totalSpendUsd(), withCost()

### Community 58 - "File Uploads"
Cohesion: 0.40
Nodes (5): MIME_EXTENSIONS, resolveExtension(), SavedUpload, saveUpload(), serveUpload()

### Community 59 - "Webhook MCP"
Cohesion: 0.33
Nodes (3): listeners, mcp, ReplyArgsSchema

### Community 60 - "Package Manifest"
Cohesion: 0.40
Nodes (4): name, private, type, version

## Knowledge Gaps
- **366 isolated node(s):** `SDK_EFFORTS`, `bashCommandSchema`, `SdkEffort`, `SdkAgents`, `HIDDEN_COMMIT_ATTRIBUTION` (+361 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Ticket` connect `Workflow View & Lifecycle` to `Contract Building & Slots`, `Terminals UI & Notifications`, `Shared Zod Schemas`, `Database Store Operations`, `API Routes & Reformulate`, `Live Terminal Views`, `Stage Progress & Display`, `Store Types & Agent Knobs`, `DB Row Schemas & Mappers`, `Client Hub & Watchdog`, `Cost & Pricing`, `Agents View & Ticket Cards`, `Board Columns`, `Agent Coordinator Handlers`, `API Client Inputs`, `Ticket Config & Constants`, `Ticket Detail & Triage UI`, `Triage Prompts & Mockups`, `Slot State`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **Why does `RealSystemAdapter` connect `Real System Adapter` to `Desktop Bootstrap & Menus`, `Real Adapter GH/Composer`, `Claude SDK Provider`, `Worktree Address Watcher`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Why does `boot()` connect `DB Migrations & Seeds` to `Triage & Server Hub`, `Desktop Bootstrap & Menus`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **What connects `SDK_EFFORTS`, `bashCommandSchema`, `SdkEffort` to the rest of the system?**
  _367 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Contract Building & Slots` be split into smaller, more focused modules?**
  _Cohesion score 0.05013477088948787 - nodes in this community are weakly interconnected._
- **Should `Terminals UI & Notifications` be split into smaller, more focused modules?**
  _Cohesion score 0.055944055944055944 - nodes in this community are weakly interconnected._
- **Should `Desktop Bootstrap & Menus` be split into smaller, more focused modules?**
  _Cohesion score 0.09915966386554621 - nodes in this community are weakly interconnected._