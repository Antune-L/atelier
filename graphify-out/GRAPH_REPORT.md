# Graph Report - kanban-agents  (2026-09-14)

## Corpus Check
- 261 files · ~731,848 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2806 nodes · 7349 edges · 139 communities (104 shown, 35 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 45 edges (avg confidence: 0.64)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `dc4d5191`
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
- schema.test.ts
- contract.test.ts
- CodexRuntimeStatus
- PostCSS Config
- App.tsx
- TerminalView.tsx
- button.tsx
- FakePaneStream
- usePrdSearch.ts
- Community 77
- csv.ts
- WorktreeSession
- recordedAction.ts
- terminalManager.ts
- Community 82
- Community 83
- TicketCost.tsx
- TerminalView.tsx
- usePrdSearch.ts
- useProjects.ts
- AgentsView.tsx
- ProjectConfig
- ColumnActionsMenu.tsx
- .addComment
- TicketConfigSummary.tsx
- useTickTimer.ts
- RunningServer
- triageManager.ts
- reviewPublishingGuard.ts
- coordinator.ts
- codexProvider.test.ts
- DescriptionTab.tsx
- TerminalSession
- AutomationView.tsx
- .finishTicket
- nvmNode.ts
- isNotionUrl
- uploads.ts
- nvmNode.ts
- Profile
- .start
- PrSelectRow.tsx
- bootstrap.ts
- createMcpServer
- useLocalDraft.ts
- settings.tsx
- codexBinary.ts
- codexHookTrust.ts
- RunningServer
- useSavedFlash.ts
- TicketMeta.tsx
- performSplit
- RunningServer
- slotTemplates.ts
- reviewMarkdown.ts
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

## God Nodes (most connected - your core abstractions)
1. `Store` - 124 edges
2. `cn()` - 79 edges
3. `SystemAdapter` - 76 edges
4. `Ticket` - 75 edges
5. `RealSystemAdapter` - 70 edges
6. `createApiRoutes()` - 70 edges
7. `FakeSystemAdapter` - 65 edges
8. `SlotManager` - 56 edges
9. `ProjectInfo` - 50 edges
10. `DelegationManager` - 49 edges

## Surprising Connections (you probably didn't know these)
- `McpSettingsClient` --references--> `McpSettingsMetadata`  [EXTRACTED]
  src/web/src/lib/mcpSettings.ts → desktop/mcpRpc.ts
- `RecordedSession` --references--> `AgentSessionOptions`  [EXTRACTED]
  src/server/agents/delegationManager.test.ts → src/server/system/agentSession.ts
- `createCodexProvider()` --indirect_call--> `options()`  [INFERRED]
  src/server/system/codexProvider.ts → src/server/system/codexProvider.test.ts
- `main()` --calls--> `assertCodexDowngradeSafe()`  [EXTRACTED]
  scripts/downgrade-codex-catalog.ts → src/server/db/schema.ts
- `main()` --calls--> `migrateCodexCatalog()`  [EXTRACTED]
  scripts/downgrade-codex-catalog.ts → src/server/db/schema.ts

## Import Cycles
- None detected.

## Communities (139 total, 35 thin omitted)

### Community 0 - "Contract Building & Slots"
Cohesion: 0.03
Nodes (78): AUTOMATION_RUN_STATUSES, COMMENT_AUTHORS, STAGES, ActionExecutionOptions, actionExecutionOptionsSchema, AgentMessageChannel, agentMessageSchema, AnalyzeTicketsInput (+70 more)

### Community 1 - "Terminals UI & Notifications"
Cohesion: 0.09
Nodes (27): analyzeTicketsInputSchema, analyzeTicketsOutputSchema, columnSchema, compactTicketSchema, createTodoTicketOutputSchema, editableTicketSchema, effectivePort(), isAllowedHost() (+19 more)

### Community 2 - "Desktop Bootstrap & Menus"
Cohesion: 0.33
Nodes (6): RFC-4180, CsvParseError, normalizeHeader(), ParsedTicketRow, ParsedTicketsCsv, parseTicketsCsv()

### Community 3 - "Feasibility Batch Management"
Cohesion: 0.07
Nodes (29): TRIAGE_VERDICTS, AgentSettableStage, agentSettableStageSchema, askUserArgsSchema, AssertNamesCovered, channelEventSchema, delegateImplementationArgsSchema, delegateReviewArgsSchema (+21 more)

### Community 4 - "Ticket Action Panels"
Cohesion: 0.05
Nodes (54): Slot, QuitConfirmModal(), QuitConfirmModalProps, ATTENTION_STATUSES, sessionOf(), SlotPips(), SlotPipsProps, STATUS_LABELS (+46 more)

### Community 5 - "Fake System Adapter"
Cohesion: 0.06
Nodes (33): buildNotionImportPrompt(), buildPrdPrompt(), ProjectInUseError, cleanDescription(), isWebOnlyPath(), log, reviewDescription(), toManagedProject() (+25 more)

### Community 7 - "Settings & Profiles UI"
Cohesion: 0.07
Nodes (5): delay(), fakeShellPrompt(), FakeSystemAdapter, hexToBytes(), WorktreeSetupOptions

### Community 8 - "PR Selection & Slots Bar"
Cohesion: 0.13
Nodes (19): ACTIVE_BAR, AREA_CURSOR, AXIS_PROPS, BAR_CURSOR, CHART_PALETTE, CodexTierSummary(), colorAt(), DurationBars() (+11 more)

### Community 9 - "Real System Adapter"
Cohesion: 0.06
Nodes (52): codexRuntimeStatusSchema, isCodexFastServiceTier(), pairedRuntimeCodexEffort(), UNKNOWN_CODEX_RUNTIME_STATUS, pairedCodexEffort(), Capabilities, CodexAgentFields(), CodexConnectionStatus() (+44 more)

### Community 10 - "Slot Config & Worktree Watch"
Cohesion: 0.06
Nodes (40): Block, blockText(), compactChunks(), firstCharCode(), TranscriptBuffer, trimBlockStart(), AgentStreamBlock, TERMINAL_STAGES (+32 more)

### Community 11 - "Core Domain Concepts"
Cohesion: 0.03
Nodes (51): agentMessageRowSchema, AutomationRow, automationRowSchema, AutomationRunRow, automationRunRowSchema, buildScripts(), CommentRow, commentRowSchema (+43 more)

### Community 12 - "Board & Sidebar Layout"
Cohesion: 0.14
Nodes (10): RecordingSystemAdapter, reviewApiEndpoint(), runBoundedReviewCommand(), safeJsonParse(), DoneGateResult, PrepareReviewWorktreeOptions, PublishReviewOptions, PublishReviewResult (+2 more)

### Community 13 - "Database Store Operations"
Cohesion: 0.14
Nodes (23): main(), scalar(), assertCodexDowngradeSafe(), backfillOrchestrator(), countRows(), createDatabase(), EXECUTION_MIGRATIONS, hasColumn() (+15 more)

### Community 14 - "Coordinator & Protocol"
Cohesion: 0.11
Nodes (6): assertCodexImplementerAvailable(), featureBranch(), SlotManager, slotPath(), slugify(), enrichWorktreeSession()

### Community 15 - "API Routes & Reformulate"
Cohesion: 0.06
Nodes (4): detectInstallCommand(), realpathSafe(), RealSystemAdapter, setupOutputExcerpt()

### Community 16 - "Stats Aggregation"
Cohesion: 0.16
Nodes (12): FailedReformulation, ActionSystem, AgentSessionEvent, dryRunLog, FAKE_OPEN_PRS, fakeEncoder, GitWorktreeAddOptions, ImportNotionOptions (+4 more)

### Community 17 - "Triage & Server Hub"
Cohesion: 0.08
Nodes (25): devDependencies, autoprefixer, class-variance-authority, clsx, concurrently, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities (+17 more)

### Community 18 - "Live Terminal Views"
Cohesion: 0.09
Nodes (31): isReviewFixSession(), BASH_ALLOWLIST, buildFeasibilitySessionConfig(), buildImplementSessionConfig(), buildSplitSessionConfig(), buildTriageSessionConfig(), CODEX_READONLY_TOOLS, codexImplementerKnobs() (+23 more)

### Community 19 - "Stage Progress & Display"
Cohesion: 0.08
Nodes (24): compilerOptions, allowImportingTsExtensions, baseUrl, esModuleInterop, isolatedModules, jsx, lib, module (+16 more)

### Community 20 - "Real Adapter GH/Composer"
Cohesion: 0.09
Nodes (33): FAILURE_COLUMNS, Kind, KINDS, SUCCESS_COLUMNS, DurationChart(), OutcomeChart(), SuccessRateChart(), ThroughputChart() (+25 more)

### Community 21 - "Store Types & Agent Knobs"
Cohesion: 0.15
Nodes (28): buildAskContract(), buildCleanContract(), buildConflictResolutionContract(), buildFeasibilityBatchContract(), buildFeasibilityContextSection(), buildImplementingSteps(), buildMockupReviewStep(), buildPlanningStep() (+20 more)

### Community 22 - "DB Row Schemas & Mappers"
Cohesion: 0.12
Nodes (19): CompactTicket, ListTicketsInput, Column, COLUMN_LABELS, columnSchema, BoardColumnProps, DEFAULT_OPEN, NOTE: an expanded column already owns the droppable id through its lane; registe (+11 more)

### Community 23 - "Dev Dependencies"
Cohesion: 0.10
Nodes (18): NewTicket, TicketCreationRequestConflictError, AnalyzeTicketRejectionReason, AnalyzeTicketsResult, createTicketOperations(), CreateTodoTicketInput, createTodoTicketInputSchema, CreateTodoTicketResult (+10 more)

### Community 24 - "TypeScript Config"
Cohesion: 0.12
Nodes (22): bashCommandSchema, buildSettings(), claudeProvider, createSdkAgentSession(), denyBashHook(), denyNoVerifyHook, denyReviewPublishingHook, denyTypecheckHook() (+14 more)

### Community 25 - "Client Hub & Watchdog"
Cohesion: 0.38
Nodes (5): agentPairError(), normalizeCreateInput(), ticketDependencyError(), isAllowedAgentPair(), deriveTitleFromDescription()

### Community 26 - "Cost & Pricing"
Cohesion: 0.06
Nodes (26): BoundedCommandResult, CLAUDE_JSON_PATH, COMPOSER_BINARIES, extractPrUrl(), ghPrHeadSchema, ghPrSchema, ghPrStateSchema, ghRestPullSchema (+18 more)

### Community 27 - "Workflow View & Lifecycle"
Cohesion: 0.06
Nodes (27): Architecture, Commands, Conventions (enforced — beyond the global ones in ~/.claude/CLAUDE.md), graphify, The dry-run safety model — read before running anything, What this is, Agent runtime (Agent SDK), Architecture (+19 more)

### Community 28 - "Stats Charts"
Cohesion: 0.05
Nodes (42): agentMessageDeltaSchema, agentToml(), buildMcpServers(), CodexProviderDependencies, ConfigObject, configReadResponseSchema, ConfigValue, createCodexAgentSession() (+34 more)

### Community 31 - "PRD Review & Markdown"
Cohesion: 0.17
Nodes (8): CodexAppServerInitializationError, CodexAppServerNotification, CodexAppServerProtocolError, CodexAppServerRpcError, incomingSchema, initializeResponseSchema, log, rpcErrorSchema

### Community 32 - "User Terminal & Fake IO"
Cohesion: 0.16
Nodes (18): CreateProjectInput, ManagedProject, UpdateProjectInput, isPositiveIntegerString(), isValidDraft(), ProjectListRow(), ProjectListRowProps, ProjectPanel() (+10 more)

### Community 33 - "Logging"
Cohesion: 0.10
Nodes (21): scripts, build:desktop, build:web, dev, dev:desktop, dev:proxy, dev:server, dev:web (+13 more)

### Community 34 - "Board Columns"
Cohesion: 0.33
Nodes (9): useTheme(), UseThemeResult, applyTheme(), getStoredTheme(), isTheme(), Theme, ThemeOption, THEMES (+1 more)

### Community 36 - "Runtime Dependencies"
Cohesion: 0.18
Nodes (17): COLUMN_SORT_FIELD, BoardColumn(), compareFamilyMembers(), familyKeyOf(), groupTicketIds(), groupTicketsByFamily(), isSplitMother(), readCollapsed() (+9 more)

### Community 37 - "Claude SDK Provider"
Cohesion: 0.09
Nodes (23): dependencies, @anthropic-ai/claude-agent-sdk, dompurify, elysia, @fontsource/ibm-plex-mono, @fontsource/ibm-plex-sans, marked, @modelcontextprotocol/sdk (+15 more)

### Community 39 - "Agent Coordinator Handlers"
Cohesion: 0.10
Nodes (28): artifactPath, assertPackageVersionInSync(), assertSdkVersionsInSync(), BUILT_DMG, ELECTROBUN_BIN, fail(), installedPackageVersion(), RELEASE_FOLDER (+20 more)

### Community 40 - "API Client Inputs"
Cohesion: 0.16
Nodes (13): cleanTicket(), conflictTicket(), REVIEW_OPTS, reviewTicket(), TICKET_OPTS, createdPaths, reserveDbPath(), paths (+5 more)

### Community 43 - "Demo Pipeline Concepts"
Cohesion: 0.11
Nodes (44): AgentEffort, AgentModel, CodexEffort, CodexModel, Implementer, Orchestrator, ProfileConfig, Profile (+36 more)

### Community 44 - "Chart Primitives"
Cohesion: 0.15
Nodes (20): AgentCard(), STATE_STRIPE_COLORS, TicketCard(), TicketCardProps, TriageDot(), truncateParentTitle(), currentNow, getSnapshot() (+12 more)

### Community 45 - "Session Hub Transcript"
Cohesion: 0.08
Nodes (35): BREADCRUMB, NO_ANNOTATIONS, PrdReviewDialog(), PrdReviewDialogProps, TICKET_TAB_LABELS, TicketTab, TicketTabs(), TicketTabsProps (+27 more)

### Community 46 - "Community 46"
Cohesion: 0.27
Nodes (15): Agent Implementation Config, Argus Code Review, Automated Tests (typecheck/lint/test), Claude Code Autonomous Agent, Ticket Contract Injection, Feasibility Analysis, Kanban Board (Atelier), Kanban Agents Demo (demo.gif) (+7 more)

### Community 47 - "Modal Dialogs"
Cohesion: 0.12
Nodes (13): WorktreeAddressWatcher, projectConfigSchema, buildAppSettingsPatch(), LegacyConfig, legacyConfigSchema, LegacyModels, log, parseLegacyConfig() (+5 more)

### Community 48 - "Community 48"
Cohesion: 0.22
Nodes (4): PublicMcpManager, isActive(), isBlocked(), TicketOperations

### Community 49 - "Slot State"
Cohesion: 0.14
Nodes (13): log, log, ReformulateManager, log, initProjectRegistry(), ClientHub, ClientSocket, ClientSocketData (+5 more)

### Community 50 - "Stats Hooks & Cards"
Cohesion: 0.16
Nodes (12): ChartConfig, ChartContainer, ChartContainerProps, ChartContext, ChartContextValue, ChartLegendContent(), ChartLegendContentProps, ChartTooltipContent() (+4 more)

### Community 51 - "Community 51"
Cohesion: 0.19
Nodes (5): reviewKey(), reviewPrompt(), setup(), verificationPrompt(), verifiedFindings()

### Community 52 - "chart.tsx"
Cohesion: 0.13
Nodes (25): ExecutionFinishStatus, LiveSession, log, PendingSessionMessage, previewToolInput(), renderChannelEvent(), renderImplementationDone(), renderSessionEvent() (+17 more)

### Community 53 - "User Terminal Manager"
Cohesion: 0.33
Nodes (5): CONTEXT — domain glossary, Execution, Proposed (not yet built), Seams, Work items

### Community 54 - "Community 54"
Cohesion: 0.05
Nodes (72): toCodexRuntimeModels(), AGENT_EFFORT_FULL_LABELS, AGENT_EFFORT_LABELS, AGENT_EFFORTS, AGENT_MODEL_FULL_LABELS, AGENT_MODEL_LABELS, AGENT_MODELS, AUTOMATION_TRIGGER_LABELS (+64 more)

### Community 55 - "App.tsx"
Cohesion: 0.19
Nodes (11): startFeasibilityTicket(), ResolvedExecution, DRY_RUN_VERDICT, FeasibilityBatchManager, FeasibilityGroup, FeasibilitySession, log, QueuedFeasibility (+3 more)

### Community 56 - "CSV Parsing"
Cohesion: 0.08
Nodes (6): setup(), mergeAgentUsageByModel(), SessionHub, SessionHubHandlers, SessionStartCallbacks, TranscriptUpdate

### Community 57 - "Community 57"
Cohesion: 0.17
Nodes (17): ensureConfig(), boot(), externalUrlFromNewWindowEvent(), forwardAtelierShortcut(), installApplicationMenu(), installMenuShortcutBridge(), menuShortcutActionSchema, navigationEventSchema (+9 more)

### Community 59 - "triageManager.ts"
Cohesion: 0.25
Nodes (14): buildSplitChannelPrompt(), buildTicketLines(), isEnglish(), buildContractConstraintsLines(), buildResponseFormatLines(), buildStrictRulesLines(), buildTicketLines(), buildTriageChannelPrompt() (+6 more)

### Community 60 - "Package Manifest"
Cohesion: 0.11
Nodes (21): ActiveReviewPass, log, orderedReviewKinds(), renderFinding(), renderPersistedReviewResult(), REVIEW_DISALLOWED_TOOLS, REVIEW_OUTPUT_SCHEMA, REVIEW_REPORT_LABELS_EN (+13 more)

### Community 61 - "splitManager.ts"
Cohesion: 0.16
Nodes (8): createLogger(), log, TerminalSocket, TerminalSocketData, log, UserTerminalManager, rpcResponseSchema, TerminalDescriptor

### Community 62 - "TicketCard.tsx"
Cohesion: 0.19
Nodes (5): Watchdog, TicketLifecycle, Ticket, DescriptionTabProps, PrdTabProps

### Community 63 - "Community 63"
Cohesion: 0.08
Nodes (23): AttachExecutionSessionInput, AutomationPatch, EnqueueAgentMessageInput, FinalizeExecutionInput, MarkAgentMessageAcceptedInput, MarkAgentMessageReceivedInput, MarkAgentMessageRejectedInput, NewAsk (+15 more)

### Community 64 - "Composer Run Script"
Cohesion: 0.13
Nodes (9): AckSystem, RecordingSystem, RecordedSession, RecordingSystem, RelaunchSystem, AgentProvider, AgentSessionHandle, AgentSessionOptions (+1 more)

### Community 66 - "OpenPr"
Cohesion: 0.23
Nodes (14): AppSettings, UpdateAppSettingsInput, AgentDefaultsSettings(), AppSettingsState, flashSaved(), loadOnce(), patchAppSettings(), publish() (+6 more)

### Community 67 - "UserTerminalManager"
Cohesion: 0.26
Nodes (9): StatRecord, StatCard(), StatCardProps, StatEmpty(), CostSummary(), StatsView(), StatsViewProps, useStats() (+1 more)

### Community 69 - "contract.test.ts"
Cohesion: 0.13
Nodes (24): dedupeFindings(), DimensionFinding, findingAnchor(), FRENCH_STOP_WORD_PATTERN, FRENCH_STOP_WORDS, hasSimilarSummary(), isSameDefect(), isSelfRefuting() (+16 more)

### Community 71 - "PostCSS Config"
Cohesion: 0.29
Nodes (6): name, overrides, zod, private, type, version

### Community 72 - "App.tsx"
Cohesion: 0.14
Nodes (20): ColumnActionsMenu(), ColumnActionsMenuProps, ColumnMenuItem, ActionContext, buildActions(), ConfirmSpec, errorMessage(), RETRY_STAGES (+12 more)

### Community 74 - "button.tsx"
Cohesion: 0.07
Nodes (24): PROJECT_ROOT, NOTE: PRD generation holds the request open up to ~120s (REFORMULATE_TIMEOUT_MS), resolveServerPort(), RunningServer, serveStaticAsset(), SocketData, startServer(), StartServerOptions (+16 more)

### Community 75 - "FakePaneStream"
Cohesion: 0.23
Nodes (13): isProcessing(), ACTIVE_STAGES, COLUMN_ORDER, COLUMNS, ACTIVE_COLUMNS, Board(), BoardProps, isColumn() (+5 more)

### Community 76 - "usePrdSearch.ts"
Cohesion: 0.14
Nodes (18): costByFamily(), costOf(), costOfModel(), costOfSessions(), CostSummary, FamilyPricing, ModelFamily, normalizeModel() (+10 more)

### Community 78 - "csv.ts"
Cohesion: 0.07
Nodes (39): App(), HOME_VIEW_OPTIONS, HomeView, NewTicketSheet(), NAV_ENTRIES, NavEntry, Sidebar(), SidebarProps (+31 more)

### Community 79 - "WorktreeSession"
Cohesion: 0.33
Nodes (3): listeners, mcp, ReplyArgsSchema

### Community 80 - "recordedAction.ts"
Cohesion: 0.23
Nodes (17): alternation(), COMMAND_WRAPPERS, commandSegments(), commandWords(), executableName(), launchedPackageScript(), launchesTypecheck(), OPTIONS_WITH_VALUE (+9 more)

### Community 81 - "terminalManager.ts"
Cohesion: 0.31
Nodes (13): abortReason(), computeCodeFingerprint(), FingerprintEntry, FingerprintPhase, hashFingerprintPaths(), isMissingFileError(), listFingerprintPaths(), log (+5 more)

### Community 86 - "TicketCost.tsx"
Cohesion: 0.25
Nodes (9): totalTokensOfSessions(), MetaRow(), MetaRowProps, TicketCost(), TicketCostProps, formatTokens(), formatUsd(), TOKEN_FORMATTER (+1 more)

### Community 87 - "TerminalView.tsx"
Cohesion: 0.22
Nodes (4): McpTokenSource, createMcpSettingsController(), McpSettingsControllerDependencies, temporaryDirectories

### Community 89 - "usePrdSearch.ts"
Cohesion: 0.16
Nodes (12): accountResponseSchema, hasExplicitCodexApiKey(), isProtocolIncompatibility(), listRuntimeModels(), modelListResponseSchema, modelSchema, probeCodexRuntime(), status() (+4 more)

### Community 91 - "AgentsView.tsx"
Cohesion: 0.22
Nodes (9): AtelierDesktopRpcSchema, DesktopRequests, McpSettingsMetadata, WebviewRequests, McpSettingsController, McpSettings(), createMcpSettingsClient(), getMcpSettingsClient() (+1 more)

### Community 92 - "ProjectConfig"
Cohesion: 0.18
Nodes (9): log, logRejection(), ToolHandler, ToolResult, ActiveDelegation, ActiveReview, ClosableExecution, TicketPatch (+1 more)

### Community 93 - "ColumnActionsMenu.tsx"
Cohesion: 0.25
Nodes (10): FILLED_GLYPH_COLORS, StageProgressBar(), StageProgressBarProps, CardState, DEAD_STAGES, PROGRESS_STAGES, stageCardState(), stageLabel() (+2 more)

### Community 94 - ".addComment"
Cohesion: 0.07
Nodes (5): nullableBooleanValue(), SqlUpdateBuilder, Store, migrateConfigJsonIfPresent(), runRecordedAction()

### Community 95 - "TicketConfigSummary.tsx"
Cohesion: 0.50
Nodes (3): appBundle, EMBEDDED_BINARIES, resourcesApp

### Community 97 - "RunningServer"
Cohesion: 0.11
Nodes (18): ANSI, appendToLogFile(), COLOR_ENABLED, disableFileLogging(), initLogFile(), isLevel(), Level, LEVEL_ORDER (+10 more)

### Community 98 - "triageManager.ts"
Cohesion: 0.12
Nodes (20): resolveBaseBranch(), assertExecutionAvailable(), CODEX_LAUNCH_STATUS_MESSAGES, CodexCapabilityReader, ExecutionDefaults, ExecutionOverrides, FEASIBILITY_ENGINE_EXECUTION, resolveExecution() (+12 more)

### Community 99 - "reviewPublishingGuard.ts"
Cohesion: 0.24
Nodes (10): GH_API_READ_METHOD_SET, GH_API_READ_METHODS, GH_API_WRITE_INPUT_PATTERN, GH_API_WRITE_LONG_FLAGS, GH_API_WRITE_METHODS, GH_API_WRITE_SHORT_FLAGS, GH_PR_PUBLISH_PATTERN, GH_PR_PUBLISH_SUBCOMMANDS (+2 more)

### Community 100 - "coordinator.ts"
Cohesion: 0.14
Nodes (13): SessionToolCall, directories, initializeParamsSchema, log, requestSchema, rpcError(), rpcResult(), toolCallParamsSchema (+5 more)

### Community 101 - "codexProvider.test.ts"
Cohesion: 0.14
Nodes (7): createCodexProvider(), AppServerFixture, AppServerFixtureOptions, hookPathForSession(), options(), RecordedRequest, waitFor()

### Community 102 - "DescriptionTab.tsx"
Cohesion: 0.09
Nodes (51): ProjectInfo, AgentProfileConfig(), AskPanelProps, CleanPrPanel(), CleanPrPanelProps, ImportTicketsPanel(), ImportTicketsPanelProps, NewTicketSheetProps (+43 more)

### Community 103 - "TerminalSession"
Cohesion: 0.08
Nodes (10): FakePaneStream, PaneStream, dataMessage(), normalizeSeed(), safeParse(), send(), TerminalSession, TerminalSessionManager (+2 more)

### Community 104 - "AutomationView.tsx"
Cohesion: 0.10
Nodes (24): FeasibilityEngine, OverviewTab(), OverviewTabProps, SUMMARY_COLUMNS, PrdTab(), SectionHeader(), SectionHeaderProps, TriageSection() (+16 more)

### Community 105 - ".finishTicket"
Cohesion: 0.24
Nodes (10): AgentCardProps, AgentsView(), AgentsViewProps, hasLiveAgent(), normalize(), KIND_BADGES, TicketBadges(), TicketBadgesProps (+2 more)

### Community 106 - "nvmNode.ts"
Cohesion: 0.19
Nodes (9): CHILD_USAGE, FULL_REVIEW_KINDS, LIGHT_REVIEW_KINDS, newDelegatedTicket(), newReviewTicket(), RecordedSession, sleep(), startAndApproveReviews() (+1 more)

### Community 108 - "uploads.ts"
Cohesion: 0.24
Nodes (6): CodexAppServerConnection, connectCodexAppServer(), fakeAppServer(), temporaryDirectories, writeFixture(), verifyCodexBinaryVersion()

### Community 109 - "nvmNode.ts"
Cohesion: 0.42
Nodes (7): bestInstalledMatch(), compareParts(), envWithProjectNode(), nvmNodeBinDir(), readNvmrc(), prepareProjectShell(), shellLiteral()

### Community 110 - "Profile"
Cohesion: 0.12
Nodes (11): createApiRoutes(), createSplitChildren(), failSplitMother(), isBlocked(), isSplitMother(), jsonError(), PaneReader, performSplit() (+3 more)

### Community 112 - "PrSelectRow.tsx"
Cohesion: 0.48
Nodes (4): OpenPr, PrSelectRow(), PrSelectRowProps, isPrNeedsAttention()

### Community 113 - "bootstrap.ts"
Cohesion: 0.36
Nodes (5): applyDesktopEnv(), DesktopRoots, ensureMcpToken(), regenerateMcpToken(), temporaryDirectories

### Community 114 - "createMcpServer"
Cohesion: 0.53
Nodes (5): createMcpServer(), invalidInput(), OutputValidator, toolError(), toolResult()

### Community 115 - "useLocalDraft.ts"
Cohesion: 0.14
Nodes (22): AskPanel(), ActivityTab(), isUnanswered(), NO_COMMENT_COLUMNS, AUTHOR_BADGES, AuthorBadge(), CommentRow(), DescriptionEdit (+14 more)

### Community 116 - "settings.tsx"
Cohesion: 0.33
Nodes (6): DashedAddButton(), DashedAddButtonProps, footerMessage(), SectionHeader(), SettingsFooter(), SettingsFooterProps

### Community 117 - "codexBinary.ts"
Cohesion: 0.40
Nodes (5): CodexBinaryVersionError, require, resolveCodexBinary(), resolveCodexBinaryOverride(), TARGETS

### Community 118 - "codexHookTrust.ts"
Cohesion: 0.47
Nodes (4): canonicalJson(), CodexCommandHook, codexSessionPreToolUseHookHash(), JsonValue

### Community 119 - "RunningServer"
Cohesion: 0.16
Nodes (17): groupFeasibilityTickets(), computeWorktreeAddresses(), log, SlotWatch, log, runFirstBootSetup(), applyAppSettingsToModels(), DEFAULT_MODELS (+9 more)

### Community 120 - "useSavedFlash.ts"
Cohesion: 0.50
Nodes (4): SavedFlag, SavedFlash, useSavedFlag(), useSavedFlash()

### Community 121 - "TicketMeta.tsx"
Cohesion: 0.50
Nodes (3): Comment, ActivityTabProps, CommentRowProps

## Knowledge Gaps
- **667 isolated node(s):** `LIGHT_REVIEW_KINDS`, `FULL_REVIEW_KINDS`, `log`, `ToolResult`, `ToolHandler` (+662 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **35 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Store` connect `.addComment` to `Fake System Adapter`, `Coordinator & Protocol`, `Store Types & Agent Knobs`, `Dev Dependencies`, `Agents View & Ticket Cards`, `NPM Scripts`, `Agent Profile Config`, `API Client Inputs`, `Modal Dialogs`, `Slot State`, `Community 51`, `App.tsx`, `Package Manifest`, `splitManager.ts`, `TicketCard.tsx`, `Community 63`, `button.tsx`, `usePrdSearch.ts`, `ProjectConfig`, `triageManager.ts`, `nvmNode.ts`, `Profile`, `RunningServer`, `RunningServer`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **Why does `SystemAdapter` connect `Agents View & Ticket Cards` to `triageManager.ts`, `Agent Profile Config`, `Settings & Profiles UI`, `TerminalSession`, `TerminalView.tsx`, `Coordinator & Protocol`, `API Routes & Reformulate`, `Stats Aggregation`, `Slot State`, `splitManager.ts`, `chart.tsx`, `Store Types & Agent Knobs`, `RunningServer`, `App.tsx`, `Cost & Pricing`, `Package Manifest`, `Session Hub & Agent Session`, `.addComment`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **Why does `DelegationManager` connect `TerminalView.tsx` to `NPM Scripts`, `CodexRuntimeStatus`, `nvmNode.ts`, `button.tsx`, `Package Manifest`, `Slot State`, `Community 51`, `.addComment`, `ProjectConfig`, `Session Hub & Agent Session`, `Agents View & Ticket Cards`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **What connects `LIGHT_REVIEW_KINDS`, `FULL_REVIEW_KINDS`, `log` to the rest of the system?**
  _678 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Contract Building & Slots` be split into smaller, more focused modules?**
  _Cohesion score 0.02997355274757567 - nodes in this community are weakly interconnected._
- **Should `Terminals UI & Notifications` be split into smaller, more focused modules?**
  _Cohesion score 0.09113300492610837 - nodes in this community are weakly interconnected._
- **Should `Feasibility Batch Management` be split into smaller, more focused modules?**
  _Cohesion score 0.06666666666666667 - nodes in this community are weakly interconnected._