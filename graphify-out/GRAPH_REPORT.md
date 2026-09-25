# Graph Report - kanban-agents  (2026-09-25)

## Corpus Check
- 269 files · ~748,115 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3040 nodes · 8540 edges · 122 communities (112 shown, 10 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 58 edges (avg confidence: 0.67)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `569adfaf`
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
- repairPath.ts
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
- prUrl.ts
- TerminalView.tsx
- schema.test.ts
- reviewFindings.ts
- CodexRuntimeStatus
- PostCSS Config
- useAppSettings.ts
- TerminalView.tsx
- button.tsx
- .handleRequest
- usePrdSearch.ts
- Community 77
- csv.ts
- WorktreeSession
- recordedAction.ts
- index.ts
- TicketOperations
- Community 83
- useTickTimer.ts
- mcpSettings.ts
- usePrdSearch.ts
- PaneStream
- bootstrap.ts
- TerminalSessionManager
- ColumnActionsMenu.tsx
- .addComment
- TicketConfigSummary.tsx
- useTickTimer.ts
- RunningServer
- usePrdSearch.ts
- reviewPublishingGuard.ts
- .startVerification
- codexProvider.test.ts
- .start
- TerminalSession
- settings.tsx
- createMcpServer
- usePrdSearch.ts
- azureRemote.ts
- WorkflowView.tsx
- projectDisplay.ts
- Profile
- FakePaneStream
- useSavedFlash.ts
- repairPath.ts
- ApiDenyPatterns
- relaunch.ts
- settings.tsx
- reformulate.ts
- delegationManager.test.ts
- WorktreeAddressWatcher

## God Nodes (most connected - your core abstractions)
1. `Store` - 122 edges
2. `Ticket` - 114 edges
3. `cn()` - 74 edges
4. `SystemAdapter` - 73 edges
5. `FakeSystemAdapter` - 66 edges
6. `RealSystemAdapter` - 64 edges
7. `VcsProvider` - 57 edges
8. `SlotManager` - 53 edges
9. `ProjectInfo` - 50 edges
10. `DelegationManager` - 48 edges

## Surprising Connections (you probably didn't know these)
- `McpSettingsClient` --references--> `McpSettingsMetadata`  [EXTRACTED]
  src/web/src/lib/mcpSettings.ts → desktop/mcpRpc.ts
- `ExecutionOverrides` --references--> `Orchestrator`  [EXTRACTED]
  src/server/agents/executionConfig.ts → src/shared/constants.ts
- `FeasibilitySessionInput` --references--> `Orchestrator`  [EXTRACTED]
  src/server/agents/sessionConfig.ts → src/shared/constants.ts
- `SplitSessionInput` --references--> `Orchestrator`  [EXTRACTED]
  src/server/agents/sessionConfig.ts → src/shared/constants.ts
- `TriageSessionInput` --references--> `Orchestrator`  [EXTRACTED]
  src/server/agents/sessionConfig.ts → src/shared/constants.ts

## Import Cycles
- 3-file cycle: `src/server/config.ts -> src/server/db/store.ts -> src/server/db/rows.ts -> src/server/config.ts`
- 3-file cycle: `src/server/agents/worktreeAddresses.ts -> src/server/config.ts -> src/server/db/store.ts -> src/server/agents/worktreeAddresses.ts`

## Communities (122 total, 10 thin omitted)

### Community 0 - "Contract Building & Slots"
Cohesion: 0.04
Nodes (66): ActionExecutionOptions, actionExecutionOptionsSchema, agentMessageSchema, AnalyzeTicketsInput, appSettingsSchema, automationRunSchema, automationSchema, baseBranchSchema (+58 more)

### Community 1 - "Terminals UI & Notifications"
Cohesion: 0.09
Nodes (32): analyzeTicketsInputSchema, analyzeTicketsOutputSchema, columnSchema, compactTicketSchema, createMcpServer(), createTodoTicketOutputSchema, editableTicketSchema, effectivePort() (+24 more)

### Community 2 - "Desktop Bootstrap & Menus"
Cohesion: 0.12
Nodes (19): CodexAppServerConnection, connectCodexAppServer(), verifyCodexBinaryVersion(), createCodexAgentSession(), inheritedMcpServerNames(), PreparedHook, prepareSkills(), threadConfig() (+11 more)

### Community 3 - "Feasibility Batch Management"
Cohesion: 0.07
Nodes (36): log, ToolHandler, ToolResult, TRIAGE_VERDICTS, AgentSettableStage, agentSettableStageSchema, askUserArgsSchema, AssertNamesCovered (+28 more)

### Community 4 - "Ticket Action Panels"
Cohesion: 0.15
Nodes (9): AckSystem, RecordingSystem, RecordedSession, RecordingSystem, RelaunchSystem, AgentProvider, AgentSessionOptions, dispatchClaudeMessage() (+1 more)

### Community 5 - "Fake System Adapter"
Cohesion: 0.06
Nodes (40): boundedCommandDetail(), BoundedCommandResult, runBoundedCommand(), safeJsonParse(), withJsonRequestFile(), azureChangeEntrySchema, azureCommentSchema, AzureDevopsVcsClient (+32 more)

### Community 6 - "Shared Zod Schemas"
Cohesion: 0.19
Nodes (16): PrdAnnotator(), PrdAnnotatorProps, BREADCRUMB, NO_ANNOTATIONS, PrdReviewDialog(), PrdReviewDialogProps, PrdView(), AnnotatedHtml (+8 more)

### Community 7 - "Settings & Profiles UI"
Cohesion: 0.08
Nodes (4): delay(), fakeShellPrompt(), FakeSystemAdapter, ReviewDoneOptions

### Community 8 - "PR Selection & Slots Bar"
Cohesion: 0.06
Nodes (58): pairedRuntimeCodexEffort(), prNumberFromUrl(), AgentCard(), AgentCardProps, AgentsView(), AgentsViewProps, hasLiveAgent(), normalize() (+50 more)

### Community 9 - "Real System Adapter"
Cohesion: 0.11
Nodes (30): CreateProjectInput, UpdateProjectInput, vcsProviderSchema, ConnectionHint, DragHandleAttributes, DragHandleListeners, groupProjects(), groupSortId() (+22 more)

### Community 10 - "Slot Config & Worktree Watch"
Cohesion: 0.13
Nodes (24): main(), scalar(), assertCodexDowngradeSafe(), backfillOrchestrator(), countRows(), createDatabase(), EXECUTION_MIGRATIONS, hasColumn() (+16 more)

### Community 11 - "Core Domain Concepts"
Cohesion: 0.04
Nodes (56): agentMessageRowSchema, AutomationRow, automationRowSchema, AutomationRunRow, automationRunRowSchema, buildScripts(), CommentRow, commentRowSchema (+48 more)

### Community 12 - "Board & Sidebar Layout"
Cohesion: 0.07
Nodes (7): NewProject, ProjectPatch, realpathSafe(), RealSystemAdapter, DoneGateResult, PrepareReviewWorktreeOptions, VcsProvider

### Community 13 - "Database Store Operations"
Cohesion: 0.09
Nodes (43): RFC-4180, ProjectInfo, AskPanel(), AskPanelProps, CleanPrPanel(), CleanPrPanelProps, ImportTicketsPanel(), ImportTicketsPanelProps (+35 more)

### Community 14 - "Coordinator & Protocol"
Cohesion: 0.24
Nodes (17): AGENT_EFFORT_FULL_LABELS, AGENT_MODEL_FULL_LABELS, CODEX_EFFORT_FULL_LABELS, ProfilePipeline(), buildProfilePipeline(), claudeDetail(), claudeSubagentDetail(), codexOrchestratorDetail() (+9 more)

### Community 15 - "API Routes & Reformulate"
Cohesion: 0.12
Nodes (11): CodexAppServerInitializationError, CodexAppServerProtocolError, CodexAppServerRpcError, incomingSchema, initializeResponseSchema, log, PendingRequest, rpcErrorSchema (+3 more)

### Community 16 - "Stats Aggregation"
Cohesion: 0.06
Nodes (5): setup(), SessionHub, SessionHubHandlers, SessionStartCallbacks, SplitManager

### Community 17 - "Triage & Server Hub"
Cohesion: 0.08
Nodes (25): devDependencies, autoprefixer, class-variance-authority, clsx, concurrently, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities (+17 more)

### Community 18 - "Live Terminal Views"
Cohesion: 0.08
Nodes (34): isReviewFixSession(), AZURE_BASH_ALLOWLIST, AZURE_CLEAN_BASH_ALLOWLIST, BASH_ALLOWLIST, bashAllowlist(), buildFeasibilitySessionConfig(), buildImplementSessionConfig(), buildTriageSessionConfig() (+26 more)

### Community 19 - "Stage Progress & Display"
Cohesion: 0.08
Nodes (24): compilerOptions, allowImportingTsExtensions, baseUrl, esModuleInterop, isolatedModules, jsx, lib, module (+16 more)

### Community 20 - "Real Adapter GH/Composer"
Cohesion: 0.11
Nodes (20): Kind, KINDS, codexEffortSchema, DurationChart(), CodexTierSummary, DurationGroup, effectiveEffortLabel(), effectiveModelLabel() (+12 more)

### Community 21 - "Store Types & Agent Knobs"
Cohesion: 0.18
Nodes (27): buildAskContract(), buildCleanContract(), buildConflictResolutionContract(), buildFeasibilityContextSection(), buildImplementingSteps(), buildMockupReviewStep(), buildPlanningStep(), buildPrdBullet() (+19 more)

### Community 22 - "DB Row Schemas & Mappers"
Cohesion: 0.06
Nodes (41): ORCHESTRATOR_LABELS, formatErrorDetails(), OverviewTab(), OverviewTabProps, SUMMARY_COLUMNS, STATUS_CONFIRMS, StatusConfirm, statusTitle() (+33 more)

### Community 23 - "Dev Dependencies"
Cohesion: 0.08
Nodes (21): TicketCreationRequestConflictError, AnalyzeTicketRejectionReason, AnalyzeTicketsResult, CreateTodoTicketInput, createTodoTicketInputSchema, CreateTodoTicketResult, isActive(), isBlocked() (+13 more)

### Community 24 - "TypeScript Config"
Cohesion: 0.14
Nodes (22): bashCommandSchema, buildSettings(), claudeProvider, createSdkAgentSession(), denyBashHook(), denyNoVerifyHook, denyReviewPublishingHook, denyTypecheckHook() (+14 more)

### Community 25 - "Client Hub & Watchdog"
Cohesion: 0.14
Nodes (6): AgentCoordinator, logRejection(), SessionToolCall, spawnCodexAppServer(), ticketDependencyError(), getErrorStack()

### Community 26 - "Cost & Pricing"
Cohesion: 0.18
Nodes (17): COLUMN_SORT_FIELD, BoardColumn(), compareFamilyMembers(), familyKeyOf(), groupTicketIds(), groupTicketsByFamily(), isSplitMother(), readCollapsed() (+9 more)

### Community 27 - "Workflow View & Lifecycle"
Cohesion: 0.06
Nodes (28): Architecture, Commands, Conventions (enforced — beyond the global ones in ~/.claude/CLAUDE.md), graphify, The dry-run safety model — read before running anything, What this is, Agent runtime (Agent SDK), Architecture (+20 more)

### Community 28 - "Stats Charts"
Cohesion: 0.07
Nodes (42): AgentMcpServerDefinition, agentMessageDeltaSchema, agentToml(), apiWriteDenyScript(), buildMcpServers(), ConfigObject, configReadResponseSchema, ConfigValue (+34 more)

### Community 29 - "Session Hub & Agent Session"
Cohesion: 0.13
Nodes (5): CodexAppServerNotification, CodexAppServerOptions, CodexProviderDependencies, AppServerFixture, CodexRuntimeDependencies

### Community 30 - "Agents View & Ticket Cards"
Cohesion: 0.13
Nodes (12): directories, initializeParamsSchema, log, requestSchema, rpcError(), rpcResult(), rpcResponseSchema, toolCallParamsSchema (+4 more)

### Community 31 - "PRD Review & Markdown"
Cohesion: 0.17
Nodes (10): canonicalJson(), CodexCommandHook, codexSessionPreToolUseHookHash(), JsonValue, createCodexProvider(), AppServerFixtureOptions, hookPathForSession(), options() (+2 more)

### Community 32 - "User Terminal & Fake IO"
Cohesion: 0.10
Nodes (27): ActiveDelegation, ClosableExecution, ExecutionFinishStatus, LiveSession, log, PendingSessionMessage, previewToolInput(), renderImplementationDone() (+19 more)

### Community 33 - "Logging"
Cohesion: 0.10
Nodes (21): scripts, build:desktop, build:web, dev, dev:desktop, dev:proxy, dev:server, dev:web (+13 more)

### Community 34 - "Board Columns"
Cohesion: 0.11
Nodes (18): LaunchForm(), LaunchFormProps, TICKET_OPTION, TicketOptionsToggleGroup(), TicketOptionsToggleGroupProps, TicketOptionValues, Toaster(), ToggleGroup (+10 more)

### Community 35 - "NPM Scripts"
Cohesion: 0.15
Nodes (8): ReformulateManager, TriageManager, addUsageByModel(), toUsageByModel(), TicketLifecycle, ErrorDetailsSource, Ticket, TriageResult

### Community 36 - "Runtime Dependencies"
Cohesion: 0.09
Nodes (54): applyAppSettingsToModels(), DEFAULT_MODELS, ProjectKey, AttachExecutionSessionInput, AutomationPatch, EnqueueAgentMessageInput, FinalizeExecutionInput, MarkAgentMessageAcceptedInput (+46 more)

### Community 37 - "Claude SDK Provider"
Cohesion: 0.09
Nodes (22): dependencies, @anthropic-ai/claude-agent-sdk, dompurify, elysia, @fontsource/ibm-plex-mono, @fontsource/ibm-plex-sans, marked, @modelcontextprotocol/sdk (+14 more)

### Community 38 - "Agent Profile Config"
Cohesion: 0.16
Nodes (15): costByFamily(), costOf(), costOfModel(), costOfSessions(), CostSummary, FamilyPricing, MODEL_PRICING, ModelFamily (+7 more)

### Community 39 - "Agent Coordinator Handlers"
Cohesion: 0.17
Nodes (18): adopt(), compareVersions(), detectionCandidates(), detectUserInstall(), downloadAndVerifyTarball(), downloadPinnedBinary(), emitProgress(), ensureClaudeBinary() (+10 more)

### Community 40 - "API Client Inputs"
Cohesion: 0.11
Nodes (8): childTranscriptPrefix(), DelegationManager, reviewKey(), allowedReviewPasses(), codexImplementerKnobs(), mergeAgentUsageByModel(), AgentSessionEvent, ReviewKind

### Community 41 - "Ticket Config & Constants"
Cohesion: 0.14
Nodes (20): isProcessing(), ACTIVE_STAGES, ColumnActionsMenu(), ColumnActionsMenuProps, ColumnMenuItem, ActionContext, buildActions(), ConfirmSpec (+12 more)

### Community 42 - "Ticket Detail & Triage UI"
Cohesion: 0.15
Nodes (15): ACTIVE_BAR, AREA_CURSOR, AXIS_PROPS, BAR_CURSOR, CHART_PALETTE, colorAt(), DurationBars(), DurationDatum (+7 more)

### Community 43 - "Demo Pipeline Concepts"
Cohesion: 0.17
Nodes (10): dataMessage(), log, normalizeSeed(), safeParse(), send(), TerminalSocket, TerminalSocketData, visibleText() (+2 more)

### Community 44 - "Chart Primitives"
Cohesion: 0.31
Nodes (13): abortReason(), computeCodeFingerprint(), FingerprintEntry, FingerprintPhase, hashFingerprintPaths(), isMissingFileError(), listFingerprintPaths(), log (+5 more)

### Community 45 - "Session Hub Transcript"
Cohesion: 0.09
Nodes (18): resolveBaseBranch(), assertExecutionAvailable(), assertCodexImplementerAvailable(), SlotManager, slotPath(), resolveTemplatePaths(), computeWorktreeAddresses(), getProject() (+10 more)

### Community 46 - "Community 46"
Cohesion: 0.27
Nodes (15): Agent Implementation Config, Argus Code Review, Automated Tests (typecheck/lint/test), Claude Code Autonomous Agent, Ticket Contract Injection, Feasibility Analysis, Kanban Board (Atelier), Kanban Agents Demo (demo.gif) (+7 more)

### Community 47 - "Modal Dialogs"
Cohesion: 0.20
Nodes (7): AZURE_COMMANDS, COMMANDS_BY_PROVIDER, GITHUB_COMMANDS, PrDiffContext, VcsCleanCommands, AZ_SETTLED_THREAD_STATUSES, VCS_PROVIDER_LABELS

### Community 48 - "Community 48"
Cohesion: 0.13
Nodes (11): agentPairError(), createApiRoutes(), isBlocked(), isSplitMother(), isWebOnlyPath(), jsonError(), PaneReader, RouteDeps (+3 more)

### Community 49 - "Slot State"
Cohesion: 0.12
Nodes (17): CHILD_USAGE, FULL_REVIEW_KINDS, LIGHT_REVIEW_KINDS, newDelegatedTicket(), newReviewTicket(), RecordedSession, sleep(), startAndApproveReviews() (+9 more)

### Community 50 - "Stats Hooks & Cards"
Cohesion: 0.16
Nodes (12): ChartConfig, ChartContainer, ChartContainerProps, ChartContext, ChartContextValue, ChartLegendContent(), ChartLegendContentProps, ChartTooltipContent() (+4 more)

### Community 51 - "Community 51"
Cohesion: 0.26
Nodes (6): CapabilityCache, CodexRuntimeModel, codexRuntimeModelSchema, CodexRuntimeStatus, codexRuntimeStatusSchema, UNKNOWN_CODEX_RUNTIME_STATUS

### Community 52 - "repairPath.ts"
Cohesion: 0.08
Nodes (31): Block, blockText(), compactChunks(), firstCharCode(), TranscriptBuffer, trimBlockStart(), AgentStreamBlock, terminalServerMessageSchema (+23 more)

### Community 53 - "User Terminal Manager"
Cohesion: 0.33
Nodes (5): CONTEXT — domain glossary, Execution, Proposed (not yet built), Seams, Work items

### Community 54 - "Community 54"
Cohesion: 0.32
Nodes (3): RecordingSystemAdapter, PublishReviewOptions, PublishReviewResult

### Community 55 - "App.tsx"
Cohesion: 0.23
Nodes (4): ActiveReview, ActiveReviewPass, ResolvedExecution, FeasibilityBatchManager

### Community 56 - "CSV Parsing"
Cohesion: 0.40
Nodes (4): mapCommentRow(), Comment, ActivityTabProps, CommentRowProps

### Community 57 - "Community 57"
Cohesion: 0.20
Nodes (10): AtelierDesktopRpcSchema, DesktopRequests, McpSettingsMetadata, WebviewRequests, McpSettingsController, McpSettings(), errorMessage(), createMcpSettingsClient() (+2 more)

### Community 58 - "File Uploads"
Cohesion: 0.05
Nodes (36): FailedReformulation, ActionSystem, dryRunLog, fakeEncoder, hexToBytes(), CLAUDE_JSON_PATH, COMPOSER_BINARIES, detectInstallCommand() (+28 more)

### Community 59 - "triageManager.ts"
Cohesion: 0.21
Nodes (17): buildContractConstraintsLines(), buildResponseFormatLines(), buildStrictRulesLines(), buildTicketLines(), buildTriageChannelPrompt(), buildTriagePlusChannelPrompt(), isEnglish(), readOnlyFramingLines() (+9 more)

### Community 60 - "Package Manifest"
Cohesion: 0.16
Nodes (19): groupProjects(), groupReviewCount(), initialExpandedGroups(), normalizeSearch(), projectGroupIdentity(), projectInitial(), ProjectSelect(), ProjectSelectOption (+11 more)

### Community 61 - "splitManager.ts"
Cohesion: 0.39
Nodes (7): emit(), loadedSubscribers, loadOnce(), refreshProjects(), subscribers, useProjects(), useProjectsLoaded()

### Community 62 - "TicketCard.tsx"
Cohesion: 0.14
Nodes (22): isNotionUrl(), NOTION_HOSTS, NewTicketSheet(), ActivityTab(), isUnanswered(), NO_COMMENT_COLUMNS, CommentRow(), DescriptionEdit (+14 more)

### Community 63 - "Community 63"
Cohesion: 0.07
Nodes (9): ReviewHeadResult, FAKE_OPEN_PRS, FakeVcsClient, githubPrHeadRef(), VcsClient, isPrNeedsAttention(), OpenPr, VcsConnectionResult (+1 more)

### Community 64 - "Composer Run Script"
Cohesion: 0.35
Nodes (9): gitMetadataWritableRoots(), agentBaseEnv(), bestInstalledMatch(), compareParts(), envWithProjectNode(), nvmNodeBinDir(), readNvmrc(), prepareProjectShell() (+1 more)

### Community 65 - "split.ts"
Cohesion: 0.22
Nodes (10): StatRecord, StatCard(), StatCardProps, StatEmpty(), CodexTierSummary(), StatsView(), StatsViewProps, useStats() (+2 more)

### Community 66 - "prUrl.ts"
Cohesion: 0.21
Nodes (13): FAILURE_COLUMNS, SUCCESS_COLUMNS, OutcomeChart(), SuccessRateChart(), ThroughputChart(), nextWeek(), outcomeCounts(), projectCounts() (+5 more)

### Community 67 - "TerminalView.tsx"
Cohesion: 0.13
Nodes (13): PROJECT_ROOT, NOTE: PRD generation holds the request open up to ~120s (REFORMULATE_TIMEOUT_MS), resolveDataFile(), resolveServerPort(), RunningServer, serveStaticAsset(), SocketData, startServer() (+5 more)

### Community 68 - "schema.test.ts"
Cohesion: 0.07
Nodes (46): AGENT_EFFORT_LABELS, AGENT_MODEL_LABELS, AgentProfileConfig(), AutomationCard(), AutomationCardProps, AutomationFormProps, AutomationView(), EMPTY_FORM (+38 more)

### Community 69 - "reviewFindings.ts"
Cohesion: 0.05
Nodes (68): BOARD_FINDING_RENDER_STYLE, log, orderedReviewKinds(), renderCollapsedFinding(), renderFinding(), renderPersistedReviewResult(), REVIEW_DISALLOWED_TOOLS, REVIEW_REPORT_LABELS (+60 more)

### Community 70 - "CodexRuntimeStatus"
Cohesion: 0.09
Nodes (21): WsClientEvent, wsClientEventSchema, ATTENTION_STATUSES, sessionOf(), SlotPips(), SlotPipsProps, STATUS_LABELS, STATUS_PIP_CLASSES (+13 more)

### Community 71 - "PostCSS Config"
Cohesion: 0.29
Nodes (6): name, overrides, zod, private, type, version

### Community 72 - "useAppSettings.ts"
Cohesion: 0.27
Nodes (12): AppSettings, AgentDefaultsSettings(), AppSettingsState, flashSaved(), loadOnce(), patchAppSettings(), publish(), snapshot() (+4 more)

### Community 73 - "TerminalView.tsx"
Cohesion: 0.18
Nodes (16): Capabilities, CodexConnectionStatus(), STATUS_LABELS, clearRetry(), loadCapabilities(), LoadOptions, publish(), refreshCapabilities() (+8 more)

### Community 74 - "button.tsx"
Cohesion: 0.08
Nodes (27): log, AUTOMATION_RUN_STATUSES, AUTOMATION_TRIGGER_LABELS, AUTOMATION_TRIGGERS, AutomationRunStatus, CODEX_EFFORT_LABELS, CODEX_MODEL_LABELS, CODEX_SEED_PROFILE (+19 more)

### Community 75 - ".handleRequest"
Cohesion: 0.11
Nodes (14): analyzeResultSchema, compactTicketSchema, createResultSchema, errorResultSchema, ISOLATED_ENV_KEYS, projectResultSchema, savedEnv, startResultSchema (+6 more)

### Community 76 - "usePrdSearch.ts"
Cohesion: 0.16
Nodes (16): isCodexFastServiceTier(), summarizeSessionCosts(), totalTokensOf(), totalTokensOfSessions(), executionCosts(), executionTokens(), projectStatRecord(), CostSummary() (+8 more)

### Community 78 - "csv.ts"
Cohesion: 0.06
Nodes (33): ReviewPublicationState, extractPrUrl(), ghPrHeadSchema, ghPrSchema, ghPrStateSchema, ghRestPullSchema, ghRestReviewPagesSchema, ghRestReviewSchema (+25 more)

### Community 79 - "WorktreeSession"
Cohesion: 0.33
Nodes (3): listeners, mcp, ReplyArgsSchema

### Community 80 - "recordedAction.ts"
Cohesion: 0.23
Nodes (17): alternation(), COMMAND_WRAPPERS, commandSegments(), commandWords(), executableName(), launchedPackageScript(), launchesTypecheck(), OPTIONS_WITH_VALUE (+9 more)

### Community 81 - "index.ts"
Cohesion: 0.27
Nodes (11): boot(), externalUrlFromNewWindowEvent(), forwardAtelierShortcut(), installApplicationMenu(), installMenuShortcutBridge(), menuShortcutActionSchema, navigationEventSchema, newWindowEventSchema (+3 more)

### Community 82 - "TicketOperations"
Cohesion: 0.07
Nodes (40): CODEX_LAUNCH_STATUS_MESSAGES, CodexCapabilityReader, ExecutionDefaults, ExecutionOverrides, FEASIBILITY_ENGINE_EXECUTION, resolveExecution(), resolveFeasibilityExecution(), resolveTicketExecution() (+32 more)

### Community 86 - "useTickTimer.ts"
Cohesion: 0.14
Nodes (15): artifactPath, assertPackageVersionInSync(), assertSdkVersionsInSync(), BUILT_DMG, ELECTROBUN_BIN, fail(), installedPackageVersion(), RELEASE_FOLDER (+7 more)

### Community 87 - "mcpSettings.ts"
Cohesion: 0.22
Nodes (4): McpTokenSource, createMcpSettingsController(), McpSettingsControllerDependencies, temporaryDirectories

### Community 89 - "usePrdSearch.ts"
Cohesion: 0.12
Nodes (23): CompactTicket, ListTicketsInput, Column, COLUMN_LABELS, COLUMN_ORDER, COLUMNS, ACTIVE_COLUMNS, Board() (+15 more)

### Community 91 - "bootstrap.ts"
Cohesion: 0.31
Nodes (5): applyDesktopEnv(), DesktopRoots, ensureMcpToken(), regenerateMcpToken(), temporaryDirectories

### Community 93 - "ColumnActionsMenu.tsx"
Cohesion: 0.25
Nodes (7): Azure DevOps support — state file, Decisions (validated by the owner, 2026-09-21), Goal, Known blockers for lots 3 and 4, Open questions, Progress, Verified on this machine (az 2.90.0, azure-devops 1.0.8)

### Community 94 - ".addComment"
Cohesion: 0.13
Nodes (10): setup(), log, Watchdog, initProjectRegistry(), ClientHub, ClientSocket, ClientSocketData, stalledEventPayload() (+2 more)

### Community 95 - "TicketConfigSummary.tsx"
Cohesion: 0.50
Nodes (3): appBundle, EMBEDDED_BINARIES, resourcesApp

### Community 97 - "RunningServer"
Cohesion: 0.22
Nodes (9): projectConfigSchema, buildAppSettingsPatch(), LegacyConfig, legacyConfigSchema, LegacyModels, log, parseLegacyConfig(), pickModel() (+1 more)

### Community 98 - "usePrdSearch.ts"
Cohesion: 0.33
Nodes (7): isShortcutDetail(), ShortcutDetail, collectMatchRanges(), supportsHighlightApi(), usePrdSearch(), UsePrdSearchOptions, UsePrdSearchResult

### Community 99 - "reviewPublishingGuard.ts"
Cohesion: 0.07
Nodes (35): API_GUARDS, API_READ_METHOD_SET, ApiDenyPatterns, ApiGuard, AZ_INVOKE_COMMAND, AZ_INVOKE_METHOD_LONG_FLAGS, AZ_INVOKE_WRITE_INPUT_LONG_FLAGS, AZ_PR_WRITE_PATTERN (+27 more)

### Community 100 - ".startVerification"
Cohesion: 0.25
Nodes (7): buildFeasibilityBatchContract(), cleanTicket(), conflictTicket(), REVIEW_OPTS, reviewTicket(), TICKET_OPTS, truncateDescription()

### Community 101 - "codexProvider.test.ts"
Cohesion: 0.14
Nodes (17): App(), HOME_VIEW_OPTIONS, HomeView, NAV_ENTRIES, NavEntry, Sidebar(), SidebarProps, SidebarView (+9 more)

### Community 102 - ".start"
Cohesion: 0.05
Nodes (19): AutomationManager, startFeasibilityTicket(), FeasibilitySession, ProjectConfig, mapAgentMessageRow(), mapAutomationRow(), mapAutomationRunRow(), mapProfileRow() (+11 more)

### Community 104 - "settings.tsx"
Cohesion: 0.33
Nodes (6): DashedAddButton(), DashedAddButtonProps, footerMessage(), SectionHeader(), SettingsFooter(), SettingsFooterProps

### Community 105 - "createMcpServer"
Cohesion: 0.40
Nodes (4): MIME_EXTENSIONS, resolveExtension(), SavedUpload, saveUpload()

### Community 106 - "usePrdSearch.ts"
Cohesion: 0.11
Nodes (18): ANSI, appendToLogFile(), COLOR_ENABLED, disableFileLogging(), initLogFile(), isLevel(), Level, LEVEL_ORDER (+10 more)

### Community 107 - "azureRemote.ts"
Cohesion: 0.40
Nodes (10): azureOrgUrl(), fromAzureSegments(), fromCollectionSegments(), fromLegacySegments(), fromSshSegments(), parseAzureRepoRef(), parseRemoteLocation(), RemoteLocation (+2 more)

### Community 108 - "WorkflowView.tsx"
Cohesion: 0.47
Nodes (5): COLUMN_NODE_COLOR, depthOf(), truncate(), WorkflowView(), WorkflowViewProps

### Community 109 - "projectDisplay.ts"
Cohesion: 0.39
Nodes (6): buildSplitChannelPrompt(), buildTicketLines(), isEnglish(), CommitLanguage, extractFigmaUrls(), hasMockups()

### Community 110 - "Profile"
Cohesion: 0.13
Nodes (24): agentEffortSchema, codexModelSchema, ImplementationAgentFields(), DragHandleAttributes, DragHandleListeners, ProfileRow(), ProfileRowHeader(), ProfileRowProps (+16 more)

### Community 112 - "useSavedFlash.ts"
Cohesion: 0.50
Nodes (4): SavedFlag, SavedFlash, useSavedFlag(), useSavedFlash()

### Community 113 - "repairPath.ts"
Cohesion: 0.67
Nodes (3): mergePaths(), PATH_PROBE_COMMAND, repairPath()

### Community 114 - "ApiDenyPatterns"
Cohesion: 0.08
Nodes (30): cleanDescription(), createSplitChildren(), failSplitMother(), log, performSplit(), prSummaryLines(), reviewDescription(), splitChildDefaults() (+22 more)

### Community 116 - "settings.tsx"
Cohesion: 0.08
Nodes (28): COMMIT_LANGUAGES, AppearanceSettings(), CODEX_STATUS_TONES, COMMIT_ROW, DefaultsRowSpec, EFFORT_OPTIONS, FEASIBILITY_ROW, IMPLEMENTATION_ROW (+20 more)

### Community 119 - "delegationManager.test.ts"
Cohesion: 0.17
Nodes (5): listPublicProjects(), PublicMcpManager, FeasibilityStarter, isProcessing(), TicketOperations

## Knowledge Gaps
- **695 isolated node(s):** `menuShortcutActionSchema`, `newWindowEventSchema`, `navigationEventSchema`, `name`, `version` (+690 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Ticket` connect `NPM Scripts` to `Contract Building & Slots`, `PR Selection & Slots Bar`, `Core Domain Concepts`, `Database Store Operations`, `Live Terminal Views`, `Store Types & Agent Knobs`, `DB Row Schemas & Mappers`, `Dev Dependencies`, `Client Hub & Watchdog`, `Cost & Pricing`, `Board Columns`, `Runtime Dependencies`, `API Client Inputs`, `Ticket Config & Constants`, `Session Hub Transcript`, `Slot State`, `repairPath.ts`, `App.tsx`, `CSV Parsing`, `triageManager.ts`, `TicketCard.tsx`, `schema.test.ts`, `reviewFindings.ts`, `CodexRuntimeStatus`, `button.tsx`, `usePrdSearch.ts`, `TicketOperations`, `usePrdSearch.ts`, `.addComment`, `codexProvider.test.ts`, `.start`, `WorkflowView.tsx`, `projectDisplay.ts`, `ApiDenyPatterns`, `reformulate.ts`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Why does `SystemAdapter` connect `TerminalSession` to `User Terminal & Fake IO`, `NPM Scripts`, `reviewFindings.ts`, `.start`, `Settings & Profiles UI`, `PaneStream`, `API Client Inputs`, `button.tsx`, `Demo Pipeline Concepts`, `Board & Sidebar Layout`, `Session Hub Transcript`, `csv.ts`, `Stats Aggregation`, `TicketOperations`, `File Uploads`, `TerminalSessionManager`, `.addComment`, `Community 63`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Why does `Store` connect `.start` to `Feasibility Batch Management`, `Slot Config & Worktree Watch`, `Stats Aggregation`, `Store Types & Agent Knobs`, `Dev Dependencies`, `Client Hub & Watchdog`, `User Terminal & Fake IO`, `NPM Scripts`, `Runtime Dependencies`, `API Client Inputs`, `Session Hub Transcript`, `Slot State`, `CSV Parsing`, `reviewFindings.ts`, `button.tsx`, `usePrdSearch.ts`, `TicketOperations`, `.addComment`, `RunningServer`, `.startVerification`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **What connects `menuShortcutActionSchema`, `newWindowEventSchema`, `navigationEventSchema` to the rest of the system?**
  _706 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Contract Building & Slots` be split into smaller, more focused modules?**
  _Cohesion score 0.036384976525821594 - nodes in this community are weakly interconnected._
- **Should `Terminals UI & Notifications` be split into smaller, more focused modules?**
  _Cohesion score 0.08571428571428572 - nodes in this community are weakly interconnected._
- **Should `Desktop Bootstrap & Menus` be split into smaller, more focused modules?**
  _Cohesion score 0.11576354679802955 - nodes in this community are weakly interconnected._