# Graph Report - kanban-agents  (2026-09-05)

## Corpus Check
- 218 files · ~699,929 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2289 nodes · 6373 edges · 123 communities (90 shown, 33 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 45 edges (avg confidence: 0.69)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1267cd5d`
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
- chart.tsx
- User Terminal Manager
- Community 54
- App.tsx
- CSV Parsing
- Community 57
- File Uploads
- triageManager.ts
- Package Manifest
- splitManager.ts
- TicketCard.tsx
- Community 63
- Composer Run Script
- split.ts
- OpenPr
- UserTerminalManager
- CLAUDE.md Doc
- fake.ts
- logger.ts
- PostCSS Config
- Community 72
- TerminalSessionManager
- codexBinary.ts
- FakePaneStream
- usePrdSearch.ts
- Community 77
- useTerminalShortcuts.ts
- WorktreeSession
- Community 80
- .handleMessage
- Community 82
- Community 83
- codexHookTrust.ts
- prd.ts
- Community 89
- Community 90
- reformulate.ts
- ProjectConfig
- FakePaneStream
- .addComment
- TicketConfigSummary.tsx
- useTickTimer.ts
- RunningServer
- usage.ts
- buildMcpServers
- coordinator.ts
- CodexProviderDependencies
- reformulate.ts
- Composer 2.5 path (run_composer.sh)
- agentToml
- shellQuote
- PreparedAgents
- submitTriageArgsSchema
- Contract (pipeline instructions)
- Coordinator
- Done Gate
- Kind (ticket pipeline type)
- Protocol (wire format source of truth)
- SessionHub
- Slot (git-worktree execution unit)
- SlotManager
- Stage (pipeline state)
- Ticket
- Ticket Lifecycle
- Triage / Feasibility
- performSplit
- TicketCost.tsx
- .handleMessage

## God Nodes (most connected - your core abstractions)
1. `Store` - 111 edges
2. `Ticket` - 71 edges
3. `createApiRoutes()` - 70 edges
4. `SystemAdapter` - 67 edges
5. `cn()` - 65 edges
6. `FakeSystemAdapter` - 58 edges
7. `RealSystemAdapter` - 55 edges
8. `SlotManager` - 47 edges
9. `SessionHub` - 46 edges
10. `Orchestrator` - 40 edges

## Surprising Connections (you probably didn't know these)
- `TriageSessionInput` --references--> `Orchestrator`  [EXTRACTED]
  src/server/agents/sessionConfig.ts → src/shared/constants.ts
- `SplitSessionInput` --references--> `Orchestrator`  [EXTRACTED]
  src/server/agents/sessionConfig.ts → src/shared/constants.ts
- `FeasibilitySessionInput` --references--> `Orchestrator`  [EXTRACTED]
  src/server/agents/sessionConfig.ts → src/shared/constants.ts
- `createCodexProvider()` --indirect_call--> `options()`  [INFERRED]
  src/server/system/codexProvider.ts → src/server/system/codexProvider.test.ts
- `main()` --calls--> `assertCodexDowngradeSafe()`  [EXTRACTED]
  scripts/downgrade-codex-catalog.ts → src/server/db/schema.ts

## Import Cycles
- 3-file cycle: `src/server/config.ts -> src/server/db/store.ts -> src/server/db/rows.ts -> src/server/config.ts`
- 3-file cycle: `src/server/agents/worktreeAddresses.ts -> src/server/config.ts -> src/server/db/store.ts -> src/server/agents/worktreeAddresses.ts`

## Communities (123 total, 33 thin omitted)

### Community 0 - "Contract Building & Slots"
Cohesion: 0.04
Nodes (70): ActionExecutionOptions, actionExecutionOptionsSchema, agentMessageSchema, AnalyzeTicketsInput, appSettingsSchema, automationRunSchema, automationSchema, baseBranchSchema (+62 more)

### Community 1 - "Terminals UI & Notifications"
Cohesion: 0.07
Nodes (51): COLUMN_LABELS, COLUMN_SORT_FIELD, AgentCard(), AgentCardProps, AgentsView(), hasLiveAgent(), normalize(), BoardColumn() (+43 more)

### Community 2 - "Desktop Bootstrap & Menus"
Cohesion: 0.13
Nodes (24): ProjectInfo, AgentsViewProps, AskPanelProps, CleanPrPanel(), CleanPrPanelProps, NewTicketDialogProps, Tab, TAB_TITLES (+16 more)

### Community 3 - "Feasibility Batch Management"
Cohesion: 0.07
Nodes (16): FakePaneStream, PaneStream, dataMessage(), log, normalizeSeed(), safeParse(), send(), TerminalSession (+8 more)

### Community 4 - "Ticket Action Panels"
Cohesion: 0.13
Nodes (30): groupOrientation(), layoutToSizes(), panelId(), panelPercent(), SplitTree(), SplitTreeProps, applySizes(), collectTerminalIds() (+22 more)

### Community 5 - "Fake System Adapter"
Cohesion: 0.11
Nodes (17): log, SlotWatch, WorktreeAddressWatcher, PROJECT_ROOT, projectConfigSchema, NOTE: AppSettings carries no implementerModel/implementerEffort, so those two MO, NOTE: must live OUTSIDE any repo that has a node_modules: tsc auto-includes @typ, SLOTS_ROOT (+9 more)

### Community 6 - "Shared Zod Schemas"
Cohesion: 0.06
Nodes (60): main(), scalar(), buildAskContract(), buildCleanContract(), buildConflictResolutionContract(), buildFeasibilityBatchContract(), buildFeasibilityContextSection(), buildImplementingSteps() (+52 more)

### Community 7 - "Settings & Profiles UI"
Cohesion: 0.08
Nodes (5): delay(), fakeShellPrompt(), FakeSystemAdapter, hexToBytes(), ReviewDoneOptions

### Community 8 - "PR Selection & Slots Bar"
Cohesion: 0.39
Nodes (6): buildSplitChannelPrompt(), buildTicketLines(), isEnglish(), CommitLanguage, extractFigmaUrls(), hasMockups()

### Community 9 - "Real System Adapter"
Cohesion: 0.11
Nodes (21): FEASIBILITY_ENGINES, IMPLEMENTERS, ORCHESTRATORS, PROGRESS_BAR_COLORS, StageProgressBar(), StageProgressBarProps, ANIMATED_STAGES, BadgeVariant (+13 more)

### Community 10 - "Slot Config & Worktree Watch"
Cohesion: 0.23
Nodes (27): ExecutionOverrides, ProjectKey, AutomationPatch, NewAsk, NewAutomation, NewClean, NewProfile, NewReview (+19 more)

### Community 11 - "Core Domain Concepts"
Cohesion: 0.04
Nodes (47): agentMessageRowSchema, AutomationRow, automationRowSchema, AutomationRunRow, automationRunRowSchema, buildScripts(), CommentRow, commentRowSchema (+39 more)

### Community 12 - "Board & Sidebar Layout"
Cohesion: 0.08
Nodes (52): pairedRuntimeCodexEffort(), AgentProfileConfig(), AskPanel(), CodexAgentFields(), CodexConnectionStatus(), STATUS_LABELS, ImplementationAgentFields(), ReviewPrPanel() (+44 more)

### Community 13 - "Database Store Operations"
Cohesion: 0.10
Nodes (18): AckSystem, RecordingSystem, RecordedSession, RecordingSystem, USAGE, RelaunchSystem, AgentMcpServerDefinition, AgentPermissionMode (+10 more)

### Community 14 - "Coordinator & Protocol"
Cohesion: 0.27
Nodes (4): ReformulateManager, TicketLifecycle, failSplitMother(), Ticket

### Community 15 - "API Routes & Reformulate"
Cohesion: 0.15
Nodes (16): AddProjectForm(), AddProjectFormProps, isPositiveIntegerString(), isValidDraft(), ProjectFieldsProps, ProjectRow(), ProjectRowProps, ProjectsSettings() (+8 more)

### Community 16 - "Stats Aggregation"
Cohesion: 0.09
Nodes (3): RealSystemAdapter, safeJsonParse(), DoneGateResult

### Community 17 - "Triage & Server Hub"
Cohesion: 0.08
Nodes (25): devDependencies, autoprefixer, class-variance-authority, clsx, concurrently, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities (+17 more)

### Community 18 - "Live Terminal Views"
Cohesion: 0.12
Nodes (12): directories, initializeParamsSchema, log, requestSchema, rpcError(), rpcResult(), rpcResponseSchema, toolCallParamsSchema (+4 more)

### Community 19 - "Stage Progress & Display"
Cohesion: 0.08
Nodes (24): compilerOptions, allowImportingTsExtensions, baseUrl, esModuleInterop, isolatedModules, jsx, lib, module (+16 more)

### Community 20 - "Real Adapter GH/Composer"
Cohesion: 0.09
Nodes (30): FAILURE_COLUMNS, Kind, KINDS, SUCCESS_COLUMNS, CodexTierSummary(), DurationChart(), ThroughputChart(), effectiveWorkDurationMs() (+22 more)

### Community 21 - "Store Types & Agent Knobs"
Cohesion: 0.05
Nodes (37): CodexAppServerConnection, CodexAppServerInitializationError, CodexAppServerNotification, CodexAppServerOptions, CodexAppServerProtocolError, CodexAppServerRpcError, connectCodexAppServer(), errorMessage() (+29 more)

### Community 23 - "Dev Dependencies"
Cohesion: 0.07
Nodes (32): terminalServerMessageSchema, badgeLabelFor(), LiveTerminal(), LiveTerminalOptions, LiveTerminalProps, TabButton(), sessionOf(), SlotsBar() (+24 more)

### Community 24 - "TypeScript Config"
Cohesion: 0.15
Nodes (18): ensureClaudeBinary(), bashCommandSchema, buildSettings(), createSdkAgentSession(), denyNoVerifyHook(), dispatchClaudeMessage(), HIDDEN_COMMIT_ATTRIBUTION, pumpStream() (+10 more)

### Community 25 - "Client Hub & Watchdog"
Cohesion: 0.11
Nodes (25): PrdAnnotator(), PrdAnnotatorProps, ABSOLUTE_UPLOAD_PATH, ImageLightboxProps, LightboxImage, Markdown(), MarkdownProps, OPEN_KEYS (+17 more)

### Community 26 - "Cost & Pricing"
Cohesion: 0.08
Nodes (22): claudeProvider, CLAUDE_JSON_PATH, COMPOSER_BINARIES, detectInstallCommand(), extractPrUrl(), ghPrSchema, ghPrStateSchema, ghReviewSchema (+14 more)

### Community 27 - "Workflow View & Lifecycle"
Cohesion: 0.06
Nodes (26): Architecture, Commands, Conventions (enforced — beyond the global ones in ~/.claude/CLAUDE.md), graphify, The dry-run safety model — read before running anything, What this is, Agent runtime (Agent SDK), Architecture (+18 more)

### Community 28 - "Stats Charts"
Cohesion: 0.08
Nodes (20): agentMessageDeltaSchema, ConfigObject, configReadResponseSchema, describeCodexError(), emptyResponseSchema, errorNotificationSchema, itemLifecycleSchema, mcpProgressSchema (+12 more)

### Community 29 - "Session Hub & Agent Session"
Cohesion: 0.17
Nodes (4): resolveBaseBranch(), SlotManager, resolveTemplatePaths(), mapTicketRow()

### Community 30 - "Agents View & Ticket Cards"
Cohesion: 0.14
Nodes (6): FeasibilityBatchManager, toTriageResult(), TriageManager, RouteDeps, FeasibilityResult, TriageResult

### Community 31 - "PRD Review & Markdown"
Cohesion: 0.22
Nodes (8): agentEffortSchema, Capabilities, codexEffortSchema, codexModelSchema, resolveCodexEffort(), resolveCodexModel(), resolveEffort(), resolveModel()

### Community 32 - "User Terminal & Fake IO"
Cohesion: 0.09
Nodes (28): BASH_ALLOWLIST, buildFeasibilitySessionConfig(), buildImplementSessionConfig(), buildSplitSessionConfig(), buildTriageSessionConfig(), CODEX_READONLY_TOOLS, codexKnobs(), CONTRACT_SKILLS (+20 more)

### Community 33 - "Logging"
Cohesion: 0.10
Nodes (21): scripts, build:desktop, build:web, dev, dev:desktop, dev:proxy, dev:server, dev:web (+13 more)

### Community 34 - "Board Columns"
Cohesion: 0.12
Nodes (16): ActiveDelegation, ActiveReviewPass, ClosableExecution, dedupeFindings(), FULL_REVIEW_KINDS, LIGHT_REVIEW_KINDS, log, requiredReviewKinds() (+8 more)

### Community 35 - "NPM Scripts"
Cohesion: 0.13
Nodes (4): AgentCoordinator, SessionToolCall, isProcessing(), ACTIVE_STAGES

### Community 36 - "Runtime Dependencies"
Cohesion: 0.36
Nodes (4): applyAppSettingsToModels(), migrateConfigJsonIfPresent(), AppSettings, UpdateAppSettingsInput

### Community 37 - "Claude SDK Provider"
Cohesion: 0.11
Nodes (19): dependencies, @anthropic-ai/claude-agent-sdk, dompurify, elysia, marked, @modelcontextprotocol/sdk, nanoid, @openai/codex-sdk (+11 more)

### Community 38 - "Agent Profile Config"
Cohesion: 0.16
Nodes (6): AutomationManager, mapAutomationRow(), mapAutomationRunRow(), AutomationRunStatus, Automation, AutomationRun

### Community 39 - "Agent Coordinator Handlers"
Cohesion: 0.11
Nodes (27): artifactPath, assertPackageVersionInSync(), assertSdkVersionsInSync(), BUILT_DMG, ELECTROBUN_BIN, fail(), installedPackageVersion(), RELEASE_FOLDER (+19 more)

### Community 40 - "API Client Inputs"
Cohesion: 0.11
Nodes (24): AutomationCard(), AutomationCardProps, AutomationFormProps, EMPTY_FORM, formFromAutomation(), RUN_STATUS_LABEL, RUN_STATUS_VARIANT, toCreateInput() (+16 more)

### Community 43 - "Demo Pipeline Concepts"
Cohesion: 0.19
Nodes (14): assertExecutionAvailable(), CODEX_LAUNCH_STATUS_MESSAGES, CodexCapabilityReader, ExecutionDefaults, FEASIBILITY_ENGINE_EXECUTION, resolveExecution(), resolveFeasibilityExecution(), resolveTicketExecution() (+6 more)

### Community 44 - "Chart Primitives"
Cohesion: 0.33
Nodes (9): useTheme(), UseThemeResult, applyTheme(), getStoredTheme(), isTheme(), Theme, ThemeOption, THEMES (+1 more)

### Community 45 - "Session Hub Transcript"
Cohesion: 0.13
Nodes (21): ACTIVE_BAR, AREA_CURSOR, AXIS_PROPS, BAR_CURSOR, CHART_PALETTE, colorAt(), DurationBars(), DurationDatum (+13 more)

### Community 46 - "Community 46"
Cohesion: 0.27
Nodes (15): Agent Implementation Config, Argus Code Review, Automated Tests (typecheck/lint/test), Claude Code Autonomous Agent, Ticket Contract Injection, Feasibility Analysis, Kanban Board (Atelier), Kanban Agents Demo (demo.gif) (+7 more)

### Community 47 - "Modal Dialogs"
Cohesion: 0.17
Nodes (18): TERMINAL_STAGES, AUTHOR_BADGES, AuthorBadge(), CommentRow(), CommentRowProps, isLocked(), mergeComments(), TicketDetail() (+10 more)

### Community 48 - "Community 48"
Cohesion: 0.14
Nodes (10): cleanDescription(), createApiRoutes(), dependencyError(), isBlocked(), isSplitMother(), isWebOnlyPath(), PaneReader, reviewDescription() (+2 more)

### Community 49 - "Slot State"
Cohesion: 0.12
Nodes (11): log, DRY_RUN_VERDICT, log, TriageSession, log, Watchdog, ClientHub, ClientSocket (+3 more)

### Community 50 - "Stats Hooks & Cards"
Cohesion: 0.32
Nodes (4): mapExecutionRunRow(), runRecordedAction(), ExecutionRun, ExecutionUsageByModel

### Community 51 - "Community 51"
Cohesion: 0.15
Nodes (12): groupFeasibilityTickets(), slotPath(), slugify(), computeWorktreeAddresses(), getProject(), isProjectKey(), mapSlotRow(), mapWorktreeSessionRow() (+4 more)

### Community 52 - "chart.tsx"
Cohesion: 0.16
Nodes (12): ChartConfig, ChartContainer, ChartContainerProps, ChartContext, ChartContextValue, ChartLegendContent(), ChartLegendContentProps, ChartTooltipContent() (+4 more)

### Community 53 - "User Terminal Manager"
Cohesion: 0.33
Nodes (5): CONTEXT — domain glossary, Execution, Proposed (not yet built), Seams, Work items

### Community 54 - "Community 54"
Cohesion: 0.12
Nodes (12): ActiveReview, CHILD_USAGE, FULL_REVIEW_KINDS, LIGHT_REVIEW_KINDS, RecordedSession, RecordingSystemAdapter, sleep(), startAndApproveReviews() (+4 more)

### Community 55 - "App.tsx"
Cohesion: 0.20
Nodes (8): codexImplementerKnobs(), assertCodexImplementerAvailable(), log, ReclaimOutcome, SETUP_PHASES, SlotManagerConfig, TemplatePaths, KeyedMutex

### Community 57 - "Community 57"
Cohesion: 0.16
Nodes (18): applyDesktopEnv(), DesktopRoots, ensureConfig(), boot(), externalUrlFromNewWindowEvent(), forwardAtelierShortcut(), installApplicationMenu(), installMenuShortcutBridge() (+10 more)

### Community 60 - "Package Manifest"
Cohesion: 0.11
Nodes (22): AGENT_EFFORT_LABELS, AGENT_MODEL_LABELS, AUTOMATION_RUN_STATUSES, AUTOMATION_TRIGGER_LABELS, AUTOMATION_TRIGGERS, CODEX_EFFORT_LABELS, CODEX_MODEL_EFFORTS, CODEX_MODEL_LABELS (+14 more)

### Community 61 - "splitManager.ts"
Cohesion: 0.09
Nodes (33): Column, COLUMN_ORDER, COLUMNS, wsClientEventSchema, App(), HOME_VIEW_OPTIONS, HomeView, AutomationView() (+25 more)

### Community 62 - "TicketCard.tsx"
Cohesion: 0.07
Nodes (29): buildNotionImportPrompt(), buildPrdPrompt(), agentPairError(), jsonError(), log, isAllowedAgentPair(), analyzeTicketsSchema, createAskSchema (+21 more)

### Community 63 - "Community 63"
Cohesion: 0.10
Nodes (4): setup(), SessionHub, SessionHubHandlers, SessionStartCallbacks

### Community 64 - "Composer Run Script"
Cohesion: 0.22
Nodes (6): createCodexAgentSession(), createCodexProvider(), PreparedHook, AppServerFixtureOptions, options(), RecordedRequest

### Community 65 - "split.ts"
Cohesion: 0.31
Nodes (5): DRY_RUN_RESULT, log, PendingSplit, SplitManager, SplitResult

### Community 67 - "UserTerminalManager"
Cohesion: 0.36
Nodes (3): mapAgentMessageRow(), AgentMessage, ExecutionOwnerType

### Community 68 - "CLAUDE.md Doc"
Cohesion: 0.08
Nodes (29): DEFAULT_MODELS, mapReviewApprovalRow(), mapReviewPassRow(), AttachExecutionSessionInput, EnqueueAgentMessageInput, FinalizeExecutionInput, MarkAgentMessageAcceptedInput, MarkAgentMessageReceivedInput (+21 more)

### Community 69 - "fake.ts"
Cohesion: 0.31
Nodes (8): ResolvedExecution, DRY_RUN_VERDICT, FeasibilityGroup, FeasibilitySession, log, QueuedFeasibility, ProjectConfig, AgentSessionRole

### Community 70 - "logger.ts"
Cohesion: 0.19
Nodes (11): RFC-4180, ImportTicketsPanel(), ImportTicketsPanelProps, PrdView(), useAgentKnobs(), pairedImplementer(), CsvParseError, normalizeHeader() (+3 more)

### Community 71 - "PostCSS Config"
Cohesion: 0.29
Nodes (6): name, overrides, zod, private, type, version

### Community 73 - "TerminalSessionManager"
Cohesion: 0.48
Nodes (3): mapProfileRow(), nullableBooleanValue(), Profile

### Community 74 - "codexBinary.ts"
Cohesion: 0.44
Nodes (6): bestInstalledMatch(), compareParts(), nvmNodeBinDir(), readNvmrc(), prepareProjectShell(), shellLiteral()

### Community 75 - "FakePaneStream"
Cohesion: 0.47
Nodes (4): createSplitChildren(), performSplit(), splitChildDefaults(), splitMotherBranch()

### Community 76 - "usePrdSearch.ts"
Cohesion: 0.11
Nodes (27): costByFamily(), costOf(), costOfModel(), costOfSessions(), CostSummary, FamilyPricing, ModelFamily, normalizeModel() (+19 more)

### Community 78 - "useTerminalShortcuts.ts"
Cohesion: 0.25
Nodes (16): buildContractConstraintsLines(), buildResponseFormatLines(), buildStrictRulesLines(), buildTicketLines(), buildTriageChannelPrompt(), buildTriagePlusChannelPrompt(), isEnglish(), readOnlyFramingLines() (+8 more)

### Community 79 - "WorktreeSession"
Cohesion: 0.33
Nodes (3): listeners, mcp, ReplyArgsSchema

### Community 80 - "Community 80"
Cohesion: 0.13
Nodes (11): WsClientEvent, active, ensureNotificationPermission(), getAudioContext(), isSupported(), loadSoundBuffer(), playBuffer(), playNotificationSound() (+3 more)

### Community 81 - ".handleMessage"
Cohesion: 0.40
Nodes (5): MIME_EXTENSIONS, resolveExtension(), SavedUpload, saveUpload(), serveUpload()

### Community 87 - "prd.ts"
Cohesion: 0.14
Nodes (18): log, ToolHandler, ToolResult, ExecutionFinishStatus, LiveSession, log, PendingSessionMessage, previewToolInput() (+10 more)

### Community 91 - "reformulate.ts"
Cohesion: 0.18
Nodes (4): childTranscriptPrefix(), DelegationManager, reviewKey(), mergeAgentUsageByModel()

### Community 92 - "ProjectConfig"
Cohesion: 0.13
Nodes (12): initProjectRegistry(), FailedReformulation, ActionSystem, dryRunLog, FAKE_OPEN_PRS, fakeEncoder, GitWorktreeAddOptions, ImportNotionOptions (+4 more)

### Community 93 - "FakePaneStream"
Cohesion: 0.10
Nodes (13): ANSI, COLOR_ENABLED, isLevel(), Level, LEVEL_ORDER, LEVEL_TAG, Logger, paint() (+5 more)

### Community 94 - ".addComment"
Cohesion: 0.50
Nodes (3): mapCommentRow(), CommentAuthor, Comment

### Community 95 - "TicketConfigSummary.tsx"
Cohesion: 0.50
Nodes (3): appBundle, EMBEDDED_BINARIES, resourcesApp

### Community 97 - "RunningServer"
Cohesion: 0.12
Nodes (18): log, runFirstBootSetup(), listProjectKeys(), requireStore(), PROJECT_ROOT, NOTE: PRD generation holds the request open up to ~120s (REFORMULATE_TIMEOUT_MS), RunningServer, serveStaticAsset() (+10 more)

### Community 99 - "buildMcpServers"
Cohesion: 0.50
Nodes (4): buildMcpServers(), mcpConfig(), resolveBackendPort(), setConfigEntry()

### Community 100 - "coordinator.ts"
Cohesion: 0.07
Nodes (27): TRIAGE_VERDICTS, AgentSettableStage, agentSettableStageSchema, askUserArgsSchema, AssertNamesCovered, channelEventSchema, delegateImplementationArgsSchema, delegateReviewArgsSchema (+19 more)

### Community 104 - "agentToml"
Cohesion: 0.67
Nodes (3): agentToml(), prepareAgents(), tomlString()

### Community 105 - "shellQuote"
Cohesion: 0.67
Nodes (3): ConfigValue, prepareNoVerifyHook(), shellQuote()

### Community 139 - "performSplit"
Cohesion: 0.13
Nodes (18): Block, blockText(), compactChunks(), firstCharCode(), TranscriptBuffer, trimBlockStart(), AgentStreamBlock, applyTranscriptUpdate() (+10 more)

### Community 142 - "TicketCost.tsx"
Cohesion: 0.40
Nodes (5): StatRecord, StatCard(), StatCardProps, StatEmpty(), UseStatsResult

### Community 144 - ".handleMessage"
Cohesion: 0.39
Nodes (4): OpenPr, PrSelectRow(), PrSelectRowProps, isPrNeedsAttention()

## Knowledge Gaps
- **538 isolated node(s):** `What this is`, `Commands`, `graphify`, `The dry-run safety model — read before running anything`, `Architecture` (+533 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **33 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Store` connect `triageManager.ts` to `Feasibility Batch Management`, `Fake System Adapter`, `Shared Zod Schemas`, `Core Domain Concepts`, `Database Store Operations`, `Coordinator & Protocol`, `Session Hub & Agent Session`, `Agents View & Ticket Cards`, `Runtime Dependencies`, `Agent Profile Config`, `Demo Pipeline Concepts`, `Community 48`, `Slot State`, `Stats Hooks & Cards`, `Community 51`, `App.tsx`, `TicketCard.tsx`, `split.ts`, `OpenPr`, `UserTerminalManager`, `CLAUDE.md Doc`, `fake.ts`, `TerminalSessionManager`, `FakePaneStream`, `usePrdSearch.ts`, `ProjectConfig`, `.addComment`, `RunningServer`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **Why does `Ticket` connect `Coordinator & Protocol` to `Contract Building & Slots`, `Terminals UI & Notifications`, `Desktop Bootstrap & Menus`, `Shared Zod Schemas`, `PR Selection & Slots Bar`, `Real System Adapter`, `Core Domain Concepts`, `Session Hub & Agent Session`, `Demo Pipeline Concepts`, `Modal Dialogs`, `Slot State`, `Community 51`, `App.tsx`, `triageManager.ts`, `Package Manifest`, `splitManager.ts`, `TicketCard.tsx`, `OpenPr`, `CLAUDE.md Doc`, `fake.ts`, `usePrdSearch.ts`, `useTerminalShortcuts.ts`, `Community 80`, `reformulate.ts`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Why does `boot()` connect `Community 57` to `RunningServer`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `createApiRoutes()` (e.g. with `isWebOnlyPath()` and `.onEvent()`) actually correct?**
  _`createApiRoutes()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `What this is`, `Commands`, `graphify` to the rest of the system?**
  _542 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Contract Building & Slots` be split into smaller, more focused modules?**
  _Cohesion score 0.03538812785388128 - nodes in this community are weakly interconnected._
- **Should `Terminals UI & Notifications` be split into smaller, more focused modules?**
  _Cohesion score 0.06779661016949153 - nodes in this community are weakly interconnected._