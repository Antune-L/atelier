# Graph Report - kanban-agents  (2026-09-14)

## Corpus Check
- 261 files · ~731,884 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2806 nodes · 7264 edges · 143 communities (102 shown, 41 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 45 edges (avg confidence: 0.64)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `db18bdf8`
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
- agentToml
- createCodexAgentSession
- profileMatching.test.ts
- PreparedAgents

## God Nodes (most connected - your core abstractions)
1. `Store` - 122 edges
2. `cn()` - 79 edges
3. `Ticket` - 75 edges
4. `SystemAdapter` - 74 edges
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

## Communities (143 total, 41 thin omitted)

### Community 0 - "Contract Building & Slots"
Cohesion: 0.03
Nodes (80): AUTOMATION_RUN_STATUSES, COMMENT_AUTHORS, STAGES, ActionExecutionOptions, actionExecutionOptionsSchema, AgentMessageChannel, agentMessageSchema, appSettingsSchema (+72 more)

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
Cohesion: 0.14
Nodes (21): codexRuntimeStatusSchema, isCodexFastServiceTier(), pairedRuntimeCodexEffort(), UNKNOWN_CODEX_RUNTIME_STATUS, pairedCodexEffort(), Capabilities, CodexAgentFields(), CodexConnectionStatus() (+13 more)

### Community 7 - "Settings & Profiles UI"
Cohesion: 0.08
Nodes (4): delay(), fakeShellPrompt(), FakeSystemAdapter, hexToBytes()

### Community 8 - "PR Selection & Slots Bar"
Cohesion: 0.11
Nodes (21): ACTIVE_BAR, AREA_CURSOR, AXIS_PROPS, BAR_CURSOR, CHART_PALETTE, CodexTierSummary(), colorAt(), CostSummary() (+13 more)

### Community 9 - "Real System Adapter"
Cohesion: 0.08
Nodes (32): ProfilesSettings(), AppearanceSettings(), CODEX_STATUS_TONES, COMMIT_ROW, DefaultsRowSpec, EFFORT_OPTIONS, FEASIBILITY_ROW, IMPLEMENTATION_ROW (+24 more)

### Community 10 - "Slot Config & Worktree Watch"
Cohesion: 0.06
Nodes (40): Block, blockText(), compactChunks(), firstCharCode(), TranscriptBuffer, trimBlockStart(), AgentStreamBlock, TERMINAL_STAGES (+32 more)

### Community 11 - "Core Domain Concepts"
Cohesion: 0.03
Nodes (51): agentMessageRowSchema, AutomationRow, automationRowSchema, AutomationRunRow, automationRunRowSchema, buildScripts(), CommentRow, commentRowSchema (+43 more)

### Community 12 - "Board & Sidebar Layout"
Cohesion: 0.16
Nodes (10): RecordingSystemAdapter, reviewApiEndpoint(), runBoundedReviewCommand(), safeJsonParse(), DoneGateResult, PrepareReviewWorktreeOptions, PublishReviewOptions, PublishReviewResult (+2 more)

### Community 13 - "Database Store Operations"
Cohesion: 0.14
Nodes (23): main(), scalar(), assertCodexDowngradeSafe(), backfillOrchestrator(), countRows(), createDatabase(), EXECUTION_MIGRATIONS, hasColumn() (+15 more)

### Community 14 - "Coordinator & Protocol"
Cohesion: 0.15
Nodes (5): assertCodexImplementerAvailable(), featureBranch(), slotPath(), slugify(), enrichWorktreeSession()

### Community 16 - "Stats Aggregation"
Cohesion: 0.17
Nodes (11): FailedReformulation, ActionSystem, dryRunLog, FAKE_OPEN_PRS, fakeEncoder, GitWorktreeAddOptions, ImportNotionOptions, ReformulateOptions (+3 more)

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
Nodes (33): FAILURE_COLUMNS, Kind, KINDS, SUCCESS_COLUMNS, DurationChart(), ProjectChart(), SuccessRateChart(), ThroughputChart() (+25 more)

### Community 21 - "Store Types & Agent Knobs"
Cohesion: 0.19
Nodes (23): buildAskContract(), buildCleanContract(), buildConflictResolutionContract(), buildFeasibilityBatchContract(), buildFeasibilityContextSection(), buildImplementingSteps(), buildMockupReviewStep(), buildPlanningStep() (+15 more)

### Community 22 - "DB Row Schemas & Mappers"
Cohesion: 0.12
Nodes (23): CompactTicket, ListTicketsInput, Column, COLUMN_ORDER, COLUMNS, ACTIVE_COLUMNS, Board(), BoardProps (+15 more)

### Community 23 - "Dev Dependencies"
Cohesion: 0.09
Nodes (19): NewTicket, TicketCreationRequestConflictError, AnalyzeTicketRejectionReason, AnalyzeTicketsResult, createTicketOperations(), CreateTodoTicketInput, createTodoTicketInputSchema, CreateTodoTicketResult (+11 more)

### Community 24 - "TypeScript Config"
Cohesion: 0.12
Nodes (22): bashCommandSchema, buildSettings(), claudeProvider, createSdkAgentSession(), denyBashHook(), denyNoVerifyHook, denyReviewPublishingHook, denyTypecheckHook() (+14 more)

### Community 25 - "Client Hub & Watchdog"
Cohesion: 0.19
Nodes (8): agentPairError(), FeasibilityStarter, isProcessing(), normalizeCreateInput(), ticketDependencyError(), TicketOperations, isAllowedAgentPair(), deriveTitleFromDescription()

### Community 26 - "Cost & Pricing"
Cohesion: 0.06
Nodes (28): BoundedCommandResult, CLAUDE_JSON_PATH, COMPOSER_BINARIES, detectInstallCommand(), ghPrHeadSchema, ghPrSchema, ghPrStateSchema, ghRestPullSchema (+20 more)

### Community 27 - "Workflow View & Lifecycle"
Cohesion: 0.06
Nodes (27): Architecture, Commands, Conventions (enforced — beyond the global ones in ~/.claude/CLAUDE.md), graphify, The dry-run safety model — read before running anything, What this is, Agent runtime (Agent SDK), Architecture (+19 more)

### Community 28 - "Stats Charts"
Cohesion: 0.07
Nodes (25): agentMessageDeltaSchema, buildMcpServers(), ConfigObject, configReadResponseSchema, describeCodexError(), emptyResponseSchema, errorNotificationSchema, itemLifecycleSchema (+17 more)

### Community 31 - "PRD Review & Markdown"
Cohesion: 0.14
Nodes (9): CodexAppServerInitializationError, CodexAppServerNotification, CodexAppServerProtocolError, CodexAppServerRpcError, incomingSchema, initializeResponseSchema, log, PendingRequest (+1 more)

### Community 32 - "User Terminal & Fake IO"
Cohesion: 0.13
Nodes (22): CreateProjectInput, ManagedProject, UpdateProjectInput, isPositiveIntegerString(), isValidDraft(), ProjectListRow(), ProjectListRowProps, ProjectPanel() (+14 more)

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
Cohesion: 0.14
Nodes (33): AgentEffort, AgentModel, CodexEffort, CodexModel, Implementer, Orchestrator, ProfileConfig, Profile (+25 more)

### Community 44 - "Chart Primitives"
Cohesion: 0.18
Nodes (16): AgentCard(), DurationBars(), STATE_STRIPE_COLORS, TicketCard(), TicketCardProps, TriageDot(), truncateParentTitle(), ANIMATED_STAGES (+8 more)

### Community 45 - "Session Hub Transcript"
Cohesion: 0.08
Nodes (37): ProviderRow(), OverviewTab(), OverviewTabProps, SUMMARY_COLUMNS, PrdTab(), SectionHeader(), SectionHeaderProps, TICKET_TAB_LABELS (+29 more)

### Community 46 - "Community 46"
Cohesion: 0.27
Nodes (15): Agent Implementation Config, Argus Code Review, Automated Tests (typecheck/lint/test), Claude Code Autonomous Agent, Ticket Contract Injection, Feasibility Analysis, Kanban Board (Atelier), Kanban Agents Demo (demo.gif) (+7 more)

### Community 49 - "Slot State"
Cohesion: 0.11
Nodes (14): log, resolveBaseBranch(), DRY_RUN_VERDICT, log, TriageSession, log, ClientHub, ClientSocket (+6 more)

### Community 50 - "Stats Hooks & Cards"
Cohesion: 0.16
Nodes (12): ChartConfig, ChartContainer, ChartContainerProps, ChartContext, ChartContextValue, ChartLegendContent(), ChartLegendContentProps, ChartTooltipContent() (+4 more)

### Community 51 - "Community 51"
Cohesion: 0.19
Nodes (4): reviewKey(), reviewPrompt(), verificationPrompt(), verifiedFindings()

### Community 53 - "User Terminal Manager"
Cohesion: 0.33
Nodes (5): CONTEXT — domain glossary, Execution, Proposed (not yet built), Seams, Work items

### Community 54 - "Community 54"
Cohesion: 0.06
Nodes (57): toCodexRuntimeModels(), AGENT_EFFORT_FULL_LABELS, AGENT_EFFORT_LABELS, AGENT_MODEL_FULL_LABELS, AGENT_MODEL_LABELS, CODEX_EFFORT_FULL_LABELS, CODEX_EFFORT_LABELS, CODEX_EFFORTS (+49 more)

### Community 55 - "App.tsx"
Cohesion: 0.18
Nodes (11): startFeasibilityTicket(), ResolvedExecution, DRY_RUN_VERDICT, FeasibilityBatchManager, FeasibilityGroup, FeasibilitySession, log, QueuedFeasibility (+3 more)

### Community 56 - "CSV Parsing"
Cohesion: 0.05
Nodes (33): setup(), ExecutionFinishStatus, LiveSession, log, mergeAgentUsageByModel(), PendingSessionMessage, previewToolInput(), renderChannelEvent() (+25 more)

### Community 57 - "Community 57"
Cohesion: 0.10
Nodes (24): applyDesktopEnv(), DesktopRoots, ensureConfig(), ensureMcpToken(), regenerateMcpToken(), temporaryDirectories, boot(), externalUrlFromNewWindowEvent() (+16 more)

### Community 59 - "triageManager.ts"
Cohesion: 0.25
Nodes (14): buildSplitChannelPrompt(), buildTicketLines(), isEnglish(), buildContractConstraintsLines(), buildResponseFormatLines(), buildStrictRulesLines(), buildTicketLines(), buildTriageChannelPrompt() (+6 more)

### Community 60 - "Package Manifest"
Cohesion: 0.10
Nodes (17): ActiveDelegation, ActiveReview, ActiveReviewPass, ClosableExecution, log, orderedReviewKinds(), renderCollapsedFinding(), renderPersistedReviewResult() (+9 more)

### Community 61 - "splitManager.ts"
Cohesion: 0.18
Nodes (9): TriageManager, RouteDeps, log, TerminalSocket, TerminalSocketData, log, UserTerminalManager, TerminalDescriptor (+1 more)

### Community 62 - "TicketCard.tsx"
Cohesion: 0.21
Nodes (5): Watchdog, TicketLifecycle, Ticket, DescriptionTabProps, PrdTabProps

### Community 63 - "Community 63"
Cohesion: 0.06
Nodes (30): log, logRejection(), ToolHandler, ToolResult, AttachExecutionSessionInput, AutomationPatch, EnqueueAgentMessageInput, FinalizeExecutionInput (+22 more)

### Community 64 - "Composer Run Script"
Cohesion: 0.13
Nodes (9): AckSystem, RecordingSystem, RecordedSession, RecordingSystem, RelaunchSystem, AgentProvider, AgentSessionHandle, AgentSessionOptions (+1 more)

### Community 66 - "OpenPr"
Cohesion: 0.25
Nodes (13): AppSettings, AgentDefaultsSettings(), AppSettingsState, flashSaved(), loadOnce(), patchAppSettings(), publish(), snapshot() (+5 more)

### Community 67 - "UserTerminalManager"
Cohesion: 0.26
Nodes (9): StatRecord, StatCard(), StatCardProps, StatEmpty(), OutcomeChart(), StatsView(), StatsViewProps, useStats() (+1 more)

### Community 68 - "schema.test.ts"
Cohesion: 0.20
Nodes (16): PrdAnnotator(), PrdAnnotatorProps, BREADCRUMB, NO_ANNOTATIONS, PrdReviewDialog(), PrdReviewDialogProps, renderMarkdownToSafeHtml(), AnnotatedHtml (+8 more)

### Community 69 - "contract.test.ts"
Cohesion: 0.13
Nodes (24): dedupeFindings(), DimensionFinding, findingAnchor(), FRENCH_STOP_WORD_PATTERN, FRENCH_STOP_WORDS, hasSimilarSummary(), isSameDefect(), isSelfRefuting() (+16 more)

### Community 70 - "CodexRuntimeStatus"
Cohesion: 0.12
Nodes (12): analyzeResultSchema, compactTicketSchema, createResultSchema, errorResultSchema, projectResultSchema, startResultSchema, structuredContentResultSchema, textContentResultSchema (+4 more)

### Community 71 - "PostCSS Config"
Cohesion: 0.29
Nodes (6): name, overrides, zod, private, type, version

### Community 72 - "App.tsx"
Cohesion: 0.13
Nodes (22): isProcessing(), ACTIVE_STAGES, ColumnActionsMenu(), ColumnActionsMenuProps, ColumnMenuItem, ActionContext, buildActions(), ConfirmSpec (+14 more)

### Community 74 - "button.tsx"
Cohesion: 0.13
Nodes (12): PROJECT_ROOT, NOTE: PRD generation holds the request open up to ~120s (REFORMULATE_TIMEOUT_MS), resolveServerPort(), RunningServer, serveStaticAsset(), SocketData, startServer(), StartServerOptions (+4 more)

### Community 75 - "FakePaneStream"
Cohesion: 0.18
Nodes (12): FULL_REVIEW_KINDS, LIGHT_REVIEW_KINDS, passDimensionFindings(), publishedReviewFindings(), requiredReviewKinds(), log, ReclaimOutcome, reviewPublicationState() (+4 more)

### Community 76 - "usePrdSearch.ts"
Cohesion: 0.12
Nodes (23): costByFamily(), costOf(), costOfModel(), costOfSessions(), CostSummary, FamilyPricing, ModelFamily, normalizeModel() (+15 more)

### Community 78 - "csv.ts"
Cohesion: 0.08
Nodes (35): HOME_VIEW_OPTIONS, HomeView, ImportTicketsPanel(), NewTicketSheet(), PrdView(), NAV_ENTRIES, NavEntry, Sidebar() (+27 more)

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
Cohesion: 0.21
Nodes (8): TICKET_OPTION, TicketOptionsToggleGroupProps, TicketOptionValues, ToggleGroup, ToggleGroupContext, ToggleGroupItem, Toggle, toggleVariants

### Community 87 - "TerminalView.tsx"
Cohesion: 0.27
Nodes (9): App(), emit(), loadedSubscribers, loadOnce(), refreshProjects(), subscribers, useProjects(), useProjectsLoaded() (+1 more)

### Community 89 - "usePrdSearch.ts"
Cohesion: 0.24
Nodes (10): accountResponseSchema, hasExplicitCodexApiKey(), isProtocolIncompatibility(), listRuntimeModels(), modelListResponseSchema, modelSchema, probeCodexRuntime(), status() (+2 more)

### Community 91 - "AgentsView.tsx"
Cohesion: 0.15
Nodes (11): AtelierDesktopRpcSchema, DesktopRequests, McpSettingsMetadata, McpTokenSource, WebviewRequests, McpSettingsController, McpSettingsControllerDependencies, McpSettings() (+3 more)

### Community 92 - "ProjectConfig"
Cohesion: 0.36
Nodes (10): ConfigValue, extractCommandScript(), prepareNoVerifyHook(), reviewPublishingGuardScript(), shellDeny(), shellDenyOnMatch(), shellDenyWhen(), shellGrepTest() (+2 more)

### Community 93 - "ColumnActionsMenu.tsx"
Cohesion: 0.29
Nodes (9): FILLED_GLYPH_COLORS, StageProgressBar(), StageProgressBarProps, CardState, DEAD_STAGES, PROGRESS_STAGES, stageCardState(), stageLabel() (+1 more)

### Community 94 - ".addComment"
Cohesion: 0.06
Nodes (6): nullableBooleanValue(), SqlUpdateBuilder, Store, migrateConfigJsonIfPresent(), parseLegacyConfig(), runRecordedAction()

### Community 95 - "TicketConfigSummary.tsx"
Cohesion: 0.50
Nodes (3): appBundle, EMBEDDED_BINARIES, resourcesApp

### Community 97 - "RunningServer"
Cohesion: 0.06
Nodes (32): WorktreeAddressWatcher, projectConfigSchema, ANSI, appendToLogFile(), COLOR_ENABLED, createLogger(), disableFileLogging(), initLogFile() (+24 more)

### Community 98 - "triageManager.ts"
Cohesion: 0.08
Nodes (36): assertExecutionAvailable(), CODEX_LAUNCH_STATUS_MESSAGES, CodexCapabilityReader, ExecutionDefaults, ExecutionOverrides, FEASIBILITY_ENGINE_EXECUTION, resolveExecution(), resolveFeasibilityExecution() (+28 more)

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
Cohesion: 0.11
Nodes (44): ProjectInfo, AgentProfileConfig(), AskPanelProps, CleanPrPanel(), CleanPrPanelProps, ImplementationAgentFields(), ImportTicketsPanelProps, NewTicketSheetProps (+36 more)

### Community 103 - "TerminalSession"
Cohesion: 0.08
Nodes (10): FakePaneStream, PaneStream, dataMessage(), normalizeSeed(), safeParse(), send(), TerminalSession, TerminalSessionManager (+2 more)

### Community 104 - "AutomationView.tsx"
Cohesion: 0.11
Nodes (24): AGENT_EFFORTS, AGENT_MODELS, AUTOMATION_TRIGGER_LABELS, AUTOMATION_TRIGGERS, AutomationRunStatus, AutomationTrigger, AutomationCard(), AutomationCardProps (+16 more)

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
Cohesion: 0.09
Nodes (22): buildNotionImportPrompt(), cleanDescription(), createApiRoutes(), createSplitChildren(), failSplitMother(), isBlocked(), isSplitMother(), isWebOnlyPath() (+14 more)

### Community 111 - ".start"
Cohesion: 0.32
Nodes (7): COLUMN_LABELS, columnSchema, STATUS_CONFIRMS, StatusConfirm, statusTitle(), TicketMeta(), finishedKindLabel()

### Community 112 - "PrSelectRow.tsx"
Cohesion: 0.60
Nodes (4): OpenPr, PrSelectRow(), PrSelectRowProps, isPrNeedsAttention()

### Community 113 - "bootstrap.ts"
Cohesion: 0.39
Nodes (7): currentNow, getSnapshot(), startTicking(), stopTicking(), subscribe(), subscribers, useTickTimer()

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

### Community 121 - "TicketMeta.tsx"
Cohesion: 0.07
Nodes (23): buildPrdPrompt(), AnalyzeTicketsInput, Comment, CreateAskInput, CreateAutomationInput, CreateCleanInput, CreateCommentInput, CreateProfileInput (+15 more)

### Community 139 - "agentToml"
Cohesion: 0.67
Nodes (3): agentToml(), prepareAgents(), tomlString()

## Knowledge Gaps
- **671 isolated node(s):** `log`, `ActiveDelegation`, `ReviewResult`, `{ $schema: _reviewSchemaDraft, ...REVIEW_OUTPUT_SCHEMA }`, `ActiveReview` (+666 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **41 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Store` connect `.addComment` to `Coordinator & Protocol`, `Store Types & Agent Knobs`, `Dev Dependencies`, `Agents View & Ticket Cards`, `NPM Scripts`, `Agent Profile Config`, `API Client Inputs`, `Modal Dialogs`, `Slot State`, `chart.tsx`, `App.tsx`, `splitManager.ts`, `TicketCard.tsx`, `Community 63`, `button.tsx`, `FakePaneStream`, `RunningServer`, `triageManager.ts`, `nvmNode.ts`, `Profile`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **Why does `SystemAdapter` connect `Agents View & Ticket Cards` to `triageManager.ts`, `Agent Profile Config`, `Settings & Profiles UI`, `TerminalSession`, `FakePaneStream`, `Coordinator & Protocol`, `API Routes & Reformulate`, `Stats Aggregation`, `Slot State`, `Modal Dialogs`, `App.tsx`, `CSV Parsing`, `Cost & Pricing`, `splitManager.ts`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._
- **Why does `Ticket` connect `TicketCard.tsx` to `Contract Building & Slots`, `Ticket Action Panels`, `Slot Config & Worktree Watch`, `Core Domain Concepts`, `Live Terminal Views`, `DB Row Schemas & Mappers`, `Dev Dependencies`, `Client Hub & Watchdog`, `Runtime Dependencies`, `API Client Inputs`, `Chart Primitives`, `Session Hub Transcript`, `Slot State`, `Community 54`, `App.tsx`, `triageManager.ts`, `split.ts`, `App.tsx`, `usePrdSearch.ts`, `csv.ts`, `ColumnActionsMenu.tsx`, `triageManager.ts`, `DescriptionTab.tsx`, `.finishTicket`, `Profile`, `.start`, `useLocalDraft.ts`, `TicketMeta.tsx`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **What connects `log`, `ActiveDelegation`, `ReviewResult` to the rest of the system?**
  _682 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Contract Building & Slots` be split into smaller, more focused modules?**
  _Cohesion score 0.025271818983250073 - nodes in this community are weakly interconnected._
- **Should `Terminals UI & Notifications` be split into smaller, more focused modules?**
  _Cohesion score 0.09113300492610837 - nodes in this community are weakly interconnected._
- **Should `Feasibility Batch Management` be split into smaller, more focused modules?**
  _Cohesion score 0.06666666666666667 - nodes in this community are weakly interconnected._