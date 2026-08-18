# Graph Report - kanban-agents  (2026-08-18)

## Corpus Check
- 175 files · ~663,385 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1722 nodes · 3680 edges · 101 communities (84 shown, 17 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 27 edges (avg confidence: 0.78)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1170eb41`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Contract Building & Slots
- Terminals UI & Notifications
- Desktop Bootstrap & Menus
- Feasibility Batch Management
- Ticket Action Panels
- Fake System Adapter
- Shared Zod Schemas
- Settings & Profiles UI
- PR Selection & Slots Bar
- Real System Adapter
- Slot Config & Worktree Watch
- Core Domain Concepts
- Board & Sidebar Layout
- Database Store Operations
- Coordinator & Protocol
- API Routes & Reformulate
- Stats Aggregation
- Triage & Server Hub
- Live Terminal Views
- Stage Progress & Display
- Real Adapter GH/Composer
- Store Types & Agent Knobs
- DB Row Schemas & Mappers
- Dev Dependencies
- TypeScript Config
- Client Hub & Watchdog
- Cost & Pricing
- Workflow View & Lifecycle
- Stats Charts
- Session Hub & Agent Session
- Agents View & Ticket Cards
- PRD Review & Markdown
- User Terminal & Fake IO
- Logging
- Board Columns
- NPM Scripts
- Runtime Dependencies
- Claude SDK Provider
- Agent Profile Config
- Agent Coordinator Handlers
- API Client Inputs
- Ticket Config & Constants
- Ticket Detail & Triage UI
- Demo Pipeline Concepts
- Chart Primitives
- Session Hub Transcript
- Community 46
- Modal Dialogs
- Community 48
- Slot State
- Stats Hooks & Cards
- Community 51
- csv.ts
- User Terminal Manager
- Community 54
- Community 55
- CSV Parsing
- Community 57
- File Uploads
- Webhook MCP
- Package Manifest
- Community 61
- TicketCard.tsx
- Community 63
- Composer Run Script
- migration.ts
- useTickTimer.ts
- ProjectConfig
- CLAUDE.md Doc
- Electrobun Deps Types
- logger.ts
- PostCSS Config
- Community 72
- React Root Mount
- Theme Flash Guard
- Community 75
- usePrdSearch.ts
- Community 77
- useTerminalShortcuts.ts
- WorktreeSession
- Community 80
- DoneGateResult
- Community 82
- FakePaneStream
- prd.ts
- Community 89
- Community 90
- reformulate.ts
- ProjectConfig
- logger.ts
- ProjectConfig
- TicketConfigSummary.tsx
- useTickTimer.ts
- TicketDetail
- withCost
- split.ts
- coordinator.ts

## God Nodes (most connected - your core abstractions)
1. `Store` - 82 edges
2. `cn()` - 61 edges
3. `Ticket` - 57 edges
4. `RealSystemAdapter` - 50 edges
5. `FakeSystemAdapter` - 44 edges
6. `SlotManager` - 40 edges
7. `ProjectInfo` - 39 edges
8. `ClientHub` - 30 edges
9. `api` - 24 edges
10. `BoardStore` - 23 edges

## Surprising Connections (you probably didn't know these)
- `boot()` --calls--> `startServer()`  [INFERRED]
  desktop/index.ts → src/server/index.ts
- `StageProgressBarProps` --references--> `Ticket`  [EXTRACTED]
  src/web/src/components/StageProgressBar.tsx → src/shared/schemas.ts
- `TicketCostProps` --references--> `Ticket`  [EXTRACTED]
  src/web/src/components/TicketCost.tsx → src/shared/schemas.ts
- `WorkflowViewProps` --references--> `Ticket`  [EXTRACTED]
  src/web/src/components/WorkflowView.tsx → src/shared/schemas.ts
- `ImportTicketsPanelProps` --references--> `ProjectInfo`  [EXTRACTED]
  src/web/src/components/ImportTicketsPanel.tsx → src/shared/schemas.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Side-effect boundary implementations** — agents_system_adapter, agents_fake_system_adapter, agents_real_system_adapter [EXTRACTED 1.00]
- **In-process SDK agent protocol** — agents_claude_agent_sdk, agents_query_streaming_input, agents_in_process_mcp_server, agents_worker_tools, agents_channel_events [INFERRED 0.85]

## Communities (101 total, 17 thin omitted)

### Community 0 - "Contract Building & Slots"
Cohesion: 0.14
Nodes (13): log, SlotWatch, WorktreeAddressWatcher, projectConfigSchema, buildAppSettingsPatch(), LegacyConfig, legacyConfigSchema, LegacyModels (+5 more)

### Community 1 - "Terminals UI & Notifications"
Cohesion: 0.16
Nodes (6): DRY_RUN_VERDICT, FeasibilityBatchManager, FeasibilitySession, log, toTriageResult(), FeasibilityResult

### Community 2 - "Desktop Bootstrap & Menus"
Cohesion: 0.04
Nodes (61): AnalyzeTicketsInput, appSettingsSchema, automationRunSchema, automationSchema, baseBranchSchema, capabilitiesSchema, commentAuthorSchema, commentSchema (+53 more)

### Community 4 - "Ticket Action Panels"
Cohesion: 0.14
Nodes (13): dataMessage(), log, normalizeSeed(), safeParse(), send(), TerminalSession, TerminalSessionManager, TerminalSocket (+5 more)

### Community 5 - "Fake System Adapter"
Cohesion: 0.05
Nodes (35): buildNotionImportPrompt(), buildPrdPrompt(), createSplitChildren(), failSplitMother(), isBlocked(), isSplitMother(), log, PaneReader (+27 more)

### Community 7 - "Settings & Profiles UI"
Cohesion: 0.08
Nodes (22): AgentSettableStage, agentSettableStageSchema, askUserArgsSchema, AssertNamesCovered, ChannelEvent, channelEventSchema, doneArgsSchema, failArgsSchema (+14 more)

### Community 8 - "PR Selection & Slots Bar"
Cohesion: 0.10
Nodes (7): log, Watchdog, ClientHub, ClientSocket, ClientSocketData, NativeNotify, Notifier

### Community 9 - "Real System Adapter"
Cohesion: 0.08
Nodes (4): RealSystemAdapter, safeJsonParse(), DoneGateResult, ReviewDoneOptions

### Community 10 - "Slot Config & Worktree Watch"
Cohesion: 0.06
Nodes (37): AutomationRow, automationRowSchema, AutomationRunRow, automationRunRowSchema, buildScripts(), CommentRow, commentRowSchema, mapProjectRow() (+29 more)

### Community 11 - "Core Domain Concepts"
Cohesion: 0.09
Nodes (24): TabButton(), PrdView(), NAV_ENTRIES, NavEntry, Sidebar(), SidebarProps, SidebarView, SlotsBar() (+16 more)

### Community 12 - "Board & Sidebar Layout"
Cohesion: 0.14
Nodes (16): buildReformulatePrompt(), log, ReformulateManager, log, runFirstBootSetup(), DEFAULT_MODELS, getProject(), isProjectKey() (+8 more)

### Community 13 - "Database Store Operations"
Cohesion: 0.12
Nodes (18): ImportTicketsPanel(), NewTicketDialog(), Tab, TAB_TITLES, TabButtonProps, ProjectSelect(), ProjectSelectProps, WorktreePanel() (+10 more)

### Community 14 - "Coordinator & Protocol"
Cohesion: 0.12
Nodes (22): effectiveWorkDurationMs(), CostGroup, DurationGroup, KIND_LABELS, KindCount, kindCounts(), meanDurationByEffort(), meanDurationByKey() (+14 more)

### Community 15 - "API Routes & Reformulate"
Cohesion: 0.16
Nodes (17): AgentProvider, AgentSessionOptions, bashCommandSchema, buildSettings(), claudeProvider, createSdkAgentSession(), denyNoVerifyHook(), dispatch() (+9 more)

### Community 16 - "Stats Aggregation"
Cohesion: 0.08
Nodes (36): loadTree(), saveTree(), storageKey(), useTerminals, ShortcutDetail, UseTerminalShortcutsOptions, TERMINAL_THEME, terminalWsUrl() (+28 more)

### Community 17 - "Triage & Server Hub"
Cohesion: 0.08
Nodes (25): devDependencies, autoprefixer, class-variance-authority, clsx, concurrently, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities (+17 more)

### Community 18 - "Live Terminal Views"
Cohesion: 0.04
Nodes (49): AGENT_EFFORT_LABELS, AGENT_EFFORTS, AGENT_MODEL_LABELS, AGENT_MODELS, AgentEffort, AgentModel, AUTOMATION_RUN_STATUSES, AUTOMATION_TRIGGER_LABELS (+41 more)

### Community 19 - "Stage Progress & Display"
Cohesion: 0.08
Nodes (24): compilerOptions, allowImportingTsExtensions, baseUrl, esModuleInterop, isolatedModules, jsx, lib, module (+16 more)

### Community 20 - "Real Adapter GH/Composer"
Cohesion: 0.11
Nodes (18): DragHandleAttributes, DragHandleListeners, GeneralSettings(), IMPLEMENTER_OPTIONS, LANGUAGE_OPTIONS, ProfileRowProps, ProfilesSettings(), renderTab() (+10 more)

### Community 21 - "Store Types & Agent Knobs"
Cohesion: 0.11
Nodes (15): BoardColumn(), BoardColumnProps, DEFAULT_COLLAPSED, familyKeyOf(), groupTicketsByFamily(), isSplitMother(), RenderGroup, resolveAnalyzeAllTitle() (+7 more)

### Community 22 - "DB Row Schemas & Mappers"
Cohesion: 0.25
Nodes (8): formatTokens(), TicketCost(), TicketCostProps, TOKEN_FORMATTER, USD_FORMATTER, Badge(), BadgeProps, badgeVariants

### Community 23 - "Dev Dependencies"
Cohesion: 0.07
Nodes (27): Architecture, argus review (native subagent), Backend (routes tool calls, verifies gates), Bun runtime, Channel events (ticket/answer/prd_validated/nudge/user_comment), @anthropic-ai/claude-agent-sdk, Column vs Stage axes, Commands (+19 more)

### Community 24 - "TypeScript Config"
Cohesion: 0.09
Nodes (19): PrdAnnotatorProps, ShortcutDetail, usePrdSearch(), UsePrdSearchOptions, UsePrdSearchResult, AnnotatedHtml, compileFeedback(), injectAnnotations() (+11 more)

### Community 25 - "Client Hub & Watchdog"
Cohesion: 0.13
Nodes (18): StatsViewProps, ACTIVE_BAR, AREA_CURSOR, AXIS_PROPS, BAR_CURSOR, CHART_PALETTE, CostChart(), DurationChart() (+10 more)

### Community 26 - "Cost & Pricing"
Cohesion: 0.16
Nodes (18): PrdAnnotator(), PrdReviewDialog(), PrdReviewDialogProps, QuitConfirmModalProps, AUTHOR_BADGES, CommentRow(), CommentRowProps, TriageSection() (+10 more)

### Community 27 - "Workflow View & Lifecycle"
Cohesion: 0.09
Nodes (20): Agent runtime (Agent SDK), Architecture, Codex provider, Overview, Ticket flow, Claude Code skills (real mode), Codex agents (optional), Desktop app (macOS, optional) (+12 more)

### Community 28 - "Stats Charts"
Cohesion: 0.11
Nodes (10): active, ensureNotificationPermission(), getAudioContext(), isSupported(), playNotificationSound(), showDesktopNotification(), Window, BoardStore (+2 more)

### Community 29 - "Session Hub & Agent Session"
Cohesion: 0.22
Nodes (4): TicketBadgesProps, TicketCardProps, TicketLifecycle, Ticket

### Community 30 - "Agents View & Ticket Cards"
Cohesion: 0.10
Nodes (24): computeWorktreeAddresses(), mapWorktreeSessionRow(), AutomationPatch, enrichWorktreeSession(), NewAsk, NewAutomation, NewClean, NewProfile (+16 more)

### Community 31 - "PRD Review & Markdown"
Cohesion: 0.14
Nodes (13): ANSI, COLOR_ENABLED, isLevel(), Level, LEVEL_ORDER, LEVEL_TAG, Logger, paint() (+5 more)

### Community 32 - "User Terminal & Fake IO"
Cohesion: 0.09
Nodes (27): BASH_ALLOWLIST, buildFeasibilitySessionConfig(), buildImplementSessionConfig(), buildSplitSessionConfig(), buildTriageSessionConfig(), codexKnobs(), CONTRACT_SKILLS, DENIED_BUILTIN_AGENTS (+19 more)

### Community 33 - "Logging"
Cohesion: 0.10
Nodes (21): scripts, build:desktop, build:web, dev, dev:desktop, dev:proxy, dev:server, dev:web (+13 more)

### Community 34 - "Board Columns"
Cohesion: 0.23
Nodes (16): AgentCard(), AgentCardProps, AgentsView(), normalize(), TicketBadges(), projectBadgeStyle(), resolveProjectLabel(), TicketCard() (+8 more)

### Community 35 - "NPM Scripts"
Cohesion: 0.16
Nodes (3): AgentCoordinator, renderChannelEvent(), SessionToolCall

### Community 36 - "Runtime Dependencies"
Cohesion: 0.16
Nodes (19): AgentProfileConfig(), AgentProfileConfigProps, AskPanel(), ImplementationAgentFields(), ImplementationAgentFieldsProps, loadOnce(), subscribers, UNKNOWN_CAPABILITIES (+11 more)

### Community 37 - "Claude SDK Provider"
Cohesion: 0.11
Nodes (19): dependencies, @anthropic-ai/claude-agent-sdk, dompurify, elysia, marked, @modelcontextprotocol/sdk, nanoid, @openai/codex-sdk (+11 more)

### Community 38 - "Agent Profile Config"
Cohesion: 0.12
Nodes (20): createDatabase(), migrate(), PROFILE_MIGRATIONS, seedProfiles(), seedSlots(), TICKET_MIGRATIONS, applyAppSettingsToModels(), initProjectRegistry() (+12 more)

### Community 39 - "Agent Coordinator Handlers"
Cohesion: 0.24
Nodes (8): artifactPath, assertClaudeSdkVersionInSync(), BUILT_DMG, ELECTROBUN_BIN, fail(), RELEASE_FOLDER, REPO_ROOT, run()

### Community 40 - "API Client Inputs"
Cohesion: 0.23
Nodes (10): FullscreenToggle(), FullscreenToggleProps, badgeLabelFor(), LiveTerminal(), LiveTerminalOptions, LiveTerminalProps, TerminalData, TerminalView() (+2 more)

### Community 41 - "Ticket Config & Constants"
Cohesion: 0.15
Nodes (3): SlotManager, slotPath(), slugify()

### Community 42 - "Ticket Detail & Triage UI"
Cohesion: 0.24
Nodes (10): Channel (agent<->backend link), Contract (pipeline instructions), Coordinator, Done Gate, Protocol (wire format source of truth), SessionHub, Slot (git-worktree execution unit), SlotManager (+2 more)

### Community 43 - "Demo Pipeline Concepts"
Cohesion: 0.19
Nodes (7): resolveBaseBranch(), DRY_RUN_VERDICT, log, TriageManager, TriageSession, TRIAGE_VERDICT_LABELS, TriageResult

### Community 44 - "Chart Primitives"
Cohesion: 0.13
Nodes (15): AddProjectForm(), AddProjectFormProps, isPositiveIntegerString(), isValidDraft(), ProjectFieldsProps, ProjectRow(), ProjectRowProps, ProjectsSettings() (+7 more)

### Community 46 - "Community 46"
Cohesion: 0.27
Nodes (15): Agent Implementation Config, Argus Code Review, Automated Tests (typecheck/lint/test), Claude Code Autonomous Agent, Ticket Contract Injection, Feasibility Analysis, Kanban Board (Atelier), Kanban Agents Demo (demo.gif) (+7 more)

### Community 47 - "Modal Dialogs"
Cohesion: 0.11
Nodes (10): AutomationCardProps, AutomationFormProps, AutomationView(), EMPTY_FORM, FormState, RUN_STATUS_LABEL, RUN_STATUS_VARIANT, CreateAutomationInput (+2 more)

### Community 48 - "Community 48"
Cohesion: 0.14
Nodes (10): resolveClaudeBinary(), dryRunLog, FAKE_OPEN_PRS, fakeEncoder, GitWorktreeAddOptions, ImportNotionOptions, PaneSize, ReformulateOptions (+2 more)

### Community 49 - "Slot State"
Cohesion: 0.29
Nodes (6): log, ReclaimOutcome, SETUP_PHASES, SlotManagerConfig, ACTIVE_STAGES, Column

### Community 50 - "Stats Hooks & Cards"
Cohesion: 0.38
Nodes (3): SlotsBarProps, mapSlotRow(), Slot

### Community 51 - "Community 51"
Cohesion: 0.09
Nodes (20): CLAUDE_JSON_PATH, COMPOSER_BINARIES, detectInstallCommand(), extractPrUrl(), ghPrSchema, ghPrStateSchema, ghReviewSchema, ghReviewsSchema (+12 more)

### Community 52 - "csv.ts"
Cohesion: 0.21
Nodes (20): buildAskContract(), buildCleanContract(), buildConflictResolutionContract(), buildFeasibilityBatchContract(), buildFeasibilityContextSection(), buildImplementingSteps(), buildMockupReviewStep(), buildPlanningStep() (+12 more)

### Community 53 - "User Terminal Manager"
Cohesion: 0.33
Nodes (5): CONTEXT — domain glossary, Execution, Proposed (not yet built), Seams, Work items

### Community 54 - "Community 54"
Cohesion: 0.16
Nodes (12): ChartConfig, ChartContainer, ChartContainerProps, ChartContext, ChartContextValue, ChartLegendContent(), ChartLegendContentProps, ChartTooltipContent() (+4 more)

### Community 55 - "Community 55"
Cohesion: 0.24
Nodes (7): ImportTicketsPanelProps, CsvParseError, ParsedTicketRow, ParsedTicketsCsv, parseTicketsCsv(), Switch, SwitchProps

### Community 56 - "CSV Parsing"
Cohesion: 0.12
Nodes (20): Board(), BoardProps, normalize(), Toaster(), COLUMN_NODE_COLOR, WorkflowView(), WorkflowViewProps, WorktreeSessionsView() (+12 more)

### Community 57 - "Community 57"
Cohesion: 0.15
Nodes (15): applyDesktopEnv(), DesktopRoots, ensureConfig(), boot(), installApplicationMenu(), installMenuShortcutBridge(), menuShortcutActionSchema, newWindowEventSchema (+7 more)

### Community 58 - "File Uploads"
Cohesion: 0.67
Nodes (4): Column (board lane), Kind (ticket pipeline type), Stage (pipeline state), Ticket

### Community 59 - "Webhook MCP"
Cohesion: 0.14
Nodes (24): AgentsViewProps, AskPanelProps, CleanPrPanel(), CleanPrPanelProps, NewTicketDialogProps, ProjectPrPicker(), ProjectPrPickerProps, QuitConfirmModal() (+16 more)

### Community 60 - "Package Manifest"
Cohesion: 0.31
Nodes (8): UseThemeResult, applyTheme(), getStoredTheme(), isTheme(), Theme, ThemeOption, THEMES, root

### Community 61 - "Community 61"
Cohesion: 0.24
Nodes (4): mapAutomationRow(), mapAutomationRunRow(), Automation, AutomationRun

### Community 62 - "TicketCard.tsx"
Cohesion: 0.32
Nodes (6): useStats(), UseStatsResult, StatRecord, StatCard(), StatCardProps, StatEmpty()

### Community 64 - "Composer Run Script"
Cohesion: 0.48
Nodes (4): PrSelectRow(), PrSelectRowProps, isPrNeedsAttention(), OpenPr

### Community 65 - "migration.ts"
Cohesion: 0.14
Nodes (16): PROGRESS_BAR_COLORS, StageProgressBar(), StageProgressBarProps, ANIMATED_STAGES, BadgeVariant, DATETIME_FORMAT, NON_DEPENDABLE_COLUMNS, prNumberFromUrl() (+8 more)

### Community 68 - "CLAUDE.md Doc"
Cohesion: 0.40
Nodes (5): MIME_EXTENSIONS, resolveExtension(), SavedUpload, saveUpload(), serveUpload()

### Community 69 - "Electrobun Deps Types"
Cohesion: 0.33
Nodes (3): listeners, mcp, ReplyArgsSchema

### Community 70 - "logger.ts"
Cohesion: 0.17
Nodes (6): log, createLogger(), log, UserTerminalManager, TerminalDescriptor, SystemAdapter

### Community 71 - "PostCSS Config"
Cohesion: 0.29
Nodes (6): name, overrides, zod, private, type, version

### Community 72 - "Community 72"
Cohesion: 0.56
Nodes (8): buildContractConstraintsLines(), buildResponseFormatLines(), buildStrictRulesLines(), buildTicketLines(), buildTriageChannelPrompt(), buildTriagePlusChannelPrompt(), isEnglish(), readOnlyFramingLines()

### Community 73 - "React Root Mount"
Cohesion: 0.50
Nodes (4): Claude binary resolution (KANBAN_CLAUDE_BINARY), Config split (config.json vs env), Databases (kanban.db / kanban-real.db), Electrobun desktop app

### Community 74 - "Theme Flash Guard"
Cohesion: 0.50
Nodes (4): ClientHub (broadcasts board snapshots), No type casting convention, rows.ts (zod row validation), store.ts single DB mutation point

### Community 75 - "Community 75"
Cohesion: 1.00
Nodes (4): Dry-run safety model, FakeSystemAdapter, RealSystemAdapter, SystemAdapter (side-effect boundary)

### Community 76 - "usePrdSearch.ts"
Cohesion: 0.21
Nodes (12): costByFamily(), costOf(), costOfModel(), costOfSessions(), FamilyPricing, ModelFamily, normalizeModel(), PRICING (+4 more)

### Community 86 - "FakePaneStream"
Cohesion: 0.18
Nodes (3): FakePaneStream, fakeShellPrompt(), hexToBytes()

### Community 87 - "prd.ts"
Cohesion: 0.20
Nodes (12): LiveSession, log, previewToolInput(), renderSessionEvent(), SessionStartConfig, AgentPermissionMode, AgentSessionEvent, AgentSessionHandle (+4 more)

### Community 93 - "logger.ts"
Cohesion: 0.31
Nodes (5): DRY_RUN_RESULT, log, PendingSplit, SplitManager, SplitResult

### Community 95 - "TicketConfigSummary.tsx"
Cohesion: 0.40
Nodes (4): labelWithDefault(), TicketConfigSummary(), agentEffortSchema, agentModelSchema

### Community 96 - "useTickTimer.ts"
Cohesion: 0.33
Nodes (4): currentNow, startTicking(), subscribe(), subscribers

### Community 97 - "TicketDetail"
Cohesion: 0.40
Nodes (5): resolveProjectColor(), isLocked(), TicketDetail(), finishedKindLabel(), stageVariant()

### Community 98 - "withCost"
Cohesion: 0.40
Nodes (6): costByModel(), costByProject(), meanCostPerIssueUsd(), modelLabel(), totalSpendUsd(), withCost()

### Community 99 - "split.ts"
Cohesion: 0.46
Nodes (5): buildSplitChannelPrompt(), buildTicketLines(), isEnglish(), extractFigmaUrls(), hasMockups()

### Community 100 - "coordinator.ts"
Cohesion: 0.50
Nodes (3): log, ToolHandler, ToolResult

## Knowledge Gaps
- **507 isolated node(s):** `IMPLEMENTER_SAFE_TOOLS`, `CONTRACT_SKILLS`, `NO_SKILLS`, `FIGMA_READONLY_TOOLS`, `SLACK_READONLY_TOOLS` (+502 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **17 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Store` connect `Shared Zod Schemas` to `Contract Building & Slots`, `Terminals UI & Notifications`, `Ticket Action Panels`, `Fake System Adapter`, `PR Selection & Slots Bar`, `Slot Config & Worktree Watch`, `Board & Sidebar Layout`, `Session Hub & Agent Session`, `Agents View & Ticket Cards`, `Agent Profile Config`, `Demo Pipeline Concepts`, `Session Hub Transcript`, `Stats Hooks & Cards`, `Community 61`, `Community 63`, `useTickTimer.ts`, `ProjectConfig`, `logger.ts`, `logger.ts`, `ProjectConfig`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **Why does `Ticket` connect `Session Hub & Agent Session` to `Desktop Bootstrap & Menus`, `Fake System Adapter`, `Shared Zod Schemas`, `PR Selection & Slots Bar`, `Slot Config & Worktree Watch`, `Board & Sidebar Layout`, `Store Types & Agent Knobs`, `DB Row Schemas & Mappers`, `Cost & Pricing`, `Stats Charts`, `Agents View & Ticket Cards`, `Board Columns`, `CSV Parsing`, `Webhook MCP`, `migration.ts`, `ProjectConfig`, `ProjectConfig`, `TicketConfigSummary.tsx`, `split.ts`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Why does `FakeSystemAdapter` connect `Feasibility Batch Management` to `Community 48`, `logger.ts`, `FakePaneStream`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **What connects `IMPLEMENTER_SAFE_TOOLS`, `CONTRACT_SKILLS`, `NO_SKILLS` to the rest of the system?**
  _511 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Contract Building & Slots` be split into smaller, more focused modules?**
  _Cohesion score 0.1380952380952381 - nodes in this community are weakly interconnected._
- **Should `Desktop Bootstrap & Menus` be split into smaller, more focused modules?**
  _Cohesion score 0.03798076923076923 - nodes in this community are weakly interconnected._
- **Should `Feasibility Batch Management` be split into smaller, more focused modules?**
  _Cohesion score 0.10384068278805121 - nodes in this community are weakly interconnected._