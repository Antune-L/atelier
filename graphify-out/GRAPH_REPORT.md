# Graph Report - kanban-agents  (2026-09-25)

## Corpus Check
- 276 files · ~750,721 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3075 nodes · 8316 edges · 121 communities (106 shown, 15 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 50 edges (avg confidence: 0.65)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `253a47b2`
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
- OpenPr
- TerminalView.tsx
- schema.test.ts
- reviewFindings.ts
- CodexRuntimeStatus
- PostCSS Config
- App.tsx
- TerminalView.tsx
- button.tsx
- .handleRequest
- usePrdSearch.ts
- Community 77
- csv.ts
- WorktreeSession
- recordedAction.ts
- vcsCommands.ts
- TicketOperations
- Community 83
- useTickTimer.ts
- codexBinary.ts
- usePrdSearch.ts
- nvmNode.ts
- WorktreeAddressWatcher
- ColumnActionsMenu.tsx
- .addComment
- TicketConfigSummary.tsx
- useTickTimer.ts
- RunningServer
- triageManager.ts
- reviewPublishingGuard.ts
- .startVerification
- codexProvider.test.ts
- .start
- TerminalSession
- .runWorktreeSetupScript
- createMcpServer
- usePrdSearch.ts
- azureRemote.ts
- oneShotSession.ts
- StageProgressBar.tsx
- Profile
- isProcessing
- prd.ts
- reformulate.ts
- WorktreeSession
- isNotionUrl
- settings.tsx
- TicketMeta.tsx
- profileMatching.test.ts
- prUrl.ts

## God Nodes (most connected - your core abstractions)
1. `Store` - 125 edges
2. `Ticket` - 101 edges
3. `cn()` - 79 edges
4. `SystemAdapter` - 78 edges
5. `FakeSystemAdapter` - 68 edges
6. `RealSystemAdapter` - 64 edges
7. `createApiRoutes()` - 59 edges
8. `SlotManager` - 55 edges
9. `DelegationManager` - 50 edges
10. `SessionHub` - 45 edges

## Surprising Connections (you probably didn't know these)
- `McpSettingsClient` --references--> `McpSettingsMetadata`  [EXTRACTED]
  src/web/src/lib/mcpSettings.ts → desktop/mcpRpc.ts
- `main()` --calls--> `assertCodexDowngradeSafe()`  [EXTRACTED]
  scripts/downgrade-codex-catalog.ts → src/server/db/schema.ts
- `main()` --calls--> `migrateCodexCatalog()`  [EXTRACTED]
  scripts/downgrade-codex-catalog.ts → src/server/db/schema.ts
- `ActiveReviewPass` --references--> `ResolvedExecution`  [EXTRACTED]
  src/server/agents/delegationManager.ts → src/server/agents/executionConfig.ts
- `verifiedFindings()` --indirect_call--> `finding()`  [INFERRED]
  src/server/agents/delegationManager.ts → src/server/agents/reviewFindings.test.ts

## Import Cycles
- None detected.

## Communities (121 total, 15 thin omitted)

### Community 0 - "Contract Building & Slots"
Cohesion: 0.02
Nodes (90): ActionExecutionOptions, actionExecutionOptionsSchema, AgentMessageChannel, agentMessageSchema, AnalyzeTicketsInput, appSettingsSchema, automationRunSchema, automationSchema (+82 more)

### Community 1 - "Terminals UI & Notifications"
Cohesion: 0.10
Nodes (20): analyzeTicketsInputSchema, analyzeTicketsOutputSchema, columnSchema, compactTicketSchema, createTodoTicketOutputSchema, editableTicketSchema, listProjectsInputSchema, listProjectsOutputSchema (+12 more)

### Community 2 - "Desktop Bootstrap & Menus"
Cohesion: 0.13
Nodes (8): featureBranch(), SlotManager, slotPath(), slugify(), enrichWorktreeSession(), failSplitMother(), TicketOperationsDeps, getErrorMessage()

### Community 3 - "Feasibility Batch Management"
Cohesion: 0.07
Nodes (29): TRIAGE_VERDICTS, AgentSettableStage, agentSettableStageSchema, askUserArgsSchema, AssertNamesCovered, channelEventSchema, delegateImplementationArgsSchema, delegateReviewArgsSchema (+21 more)

### Community 4 - "Ticket Action Panels"
Cohesion: 0.13
Nodes (23): AgentCard(), AgentCardProps, AgentsView(), AgentsViewProps, hasLiveAgent(), normalize(), KIND_BADGES, TicketBadges() (+15 more)

### Community 5 - "Fake System Adapter"
Cohesion: 0.07
Nodes (32): ReviewPublicationEvent, azureChangeEntrySchema, azureCommentSchema, AzureDevopsVcsClient, azureIdentitySchema, azureIterationChangesSchema, azureIterationListSchema, azurePath() (+24 more)

### Community 6 - "Shared Zod Schemas"
Cohesion: 0.23
Nodes (7): resolveBaseBranch(), buildAskContract(), resolveTemplatePaths(), computeWorktreeAddresses(), getProject(), isProjectKey(), projectVcsProvider()

### Community 7 - "Settings & Profiles UI"
Cohesion: 0.08
Nodes (3): delay(), fakeShellPrompt(), FakeSystemAdapter

### Community 8 - "PR Selection & Slots Bar"
Cohesion: 0.08
Nodes (31): assertExecutionAvailable(), CODEX_LAUNCH_STATUS_MESSAGES, CodexCapabilityReader, ExecutionDefaults, ExecutionOverrides, FEASIBILITY_ENGINE_EXECUTION, ResolvedExecution, resolveExecution() (+23 more)

### Community 9 - "Real System Adapter"
Cohesion: 0.10
Nodes (28): CreateProjectInput, ManagedProject, UpdateProjectInput, vcsProviderSchema, ConnectionHint, DragHandleAttributes, DragHandleListeners, groupProjects() (+20 more)

### Community 10 - "Slot Config & Worktree Watch"
Cohesion: 0.26
Nodes (12): AppSettings, AppSettingsState, flashSaved(), loadOnce(), patchAppSettings(), publish(), snapshot(), state (+4 more)

### Community 11 - "Core Domain Concepts"
Cohesion: 0.03
Nodes (52): agentMessageRowSchema, AutomationRow, automationRowSchema, AutomationRunRow, automationRunRowSchema, buildScripts(), CommentRow, commentRowSchema (+44 more)

### Community 12 - "Board & Sidebar Layout"
Cohesion: 0.04
Nodes (23): CLAUDE_JSON_PATH, COMPOSER_BINARIES, detectInstallCommand(), INSTALL_COMMANDS, log, NON_INTERACTIVE_ENV, NOTION_IMPORT_ALLOWED_TOOLS, NOTION_READ_TOOLS (+15 more)

### Community 13 - "Database Store Operations"
Cohesion: 0.13
Nodes (24): ProjectPrPicker(), ProjectPrPickerProps, groupProjects(), groupReviewCount(), initialExpandedGroups(), normalizeSearch(), ProjectGroup, projectGroupIdentity() (+16 more)

### Community 14 - "Coordinator & Protocol"
Cohesion: 0.09
Nodes (21): NewTicket, ProjectInUseError, agentPairError(), cleanDescription(), createApiRoutes(), createSplitChildren(), isBlocked(), isProcessing() (+13 more)

### Community 15 - "API Routes & Reformulate"
Cohesion: 0.10
Nodes (18): CodexAppServerProtocolError, createCodexAgentSession(), inheritedMcpServerNames(), PreparedHook, prepareSkills(), threadConfig(), accountResponseSchema, hasExplicitCodexApiKey() (+10 more)

### Community 16 - "Stats Aggregation"
Cohesion: 0.12
Nodes (5): childTranscriptPrefix(), mergeAgentUsageByModel(), SessionHubHandlers, SessionStartCallbacks, AgentSessionEvent

### Community 17 - "Triage & Server Hub"
Cohesion: 0.08
Nodes (25): devDependencies, autoprefixer, class-variance-authority, clsx, concurrently, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities (+17 more)

### Community 18 - "Live Terminal Views"
Cohesion: 0.08
Nodes (33): isReviewFixSession(), AZURE_BASH_ALLOWLIST, AZURE_CLEAN_BASH_ALLOWLIST, BASH_ALLOWLIST, bashAllowlist(), buildFeasibilitySessionConfig(), buildImplementSessionConfig(), buildTriageSessionConfig() (+25 more)

### Community 19 - "Stage Progress & Display"
Cohesion: 0.08
Nodes (24): compilerOptions, allowImportingTsExtensions, baseUrl, esModuleInterop, isolatedModules, jsx, lib, module (+16 more)

### Community 20 - "Real Adapter GH/Composer"
Cohesion: 0.09
Nodes (33): FAILURE_COLUMNS, Kind, KINDS, SUCCESS_COLUMNS, ExecutionRun, DurationChart(), OutcomeChart(), SuccessRateChart() (+25 more)

### Community 21 - "Store Types & Agent Knobs"
Cohesion: 0.17
Nodes (28): buildCleanContract(), buildConflictResolutionContract(), buildFeasibilityBatchContract(), buildFeasibilityContextSection(), buildImplementingSteps(), buildMockupReviewStep(), buildPlanningStep(), buildPrdBullet() (+20 more)

### Community 22 - "DB Row Schemas & Mappers"
Cohesion: 0.24
Nodes (9): CHILD_USAGE, FULL_REVIEW_KINDS, LIGHT_REVIEW_KINDS, newDelegatedTicket(), newReviewTicket(), sleep(), startAndApproveReviews(), startParentSession() (+1 more)

### Community 23 - "Dev Dependencies"
Cohesion: 0.10
Nodes (18): TicketCreationRequestConflictError, TicketPatch, AnalyzeTicketRejectionReason, AnalyzeTicketsResult, CreateTodoTicketInput, createTodoTicketInputSchema, CreateTodoTicketResult, isActive() (+10 more)

### Community 24 - "TypeScript Config"
Cohesion: 0.13
Nodes (23): bashCommandSchema, buildSettings(), claudeProvider, createSdkAgentSession(), denyBashHook(), denyNoVerifyHook, denyReviewPublishingHook, denyTypecheckHook() (+15 more)

### Community 25 - "Client Hub & Watchdog"
Cohesion: 0.31
Nodes (13): abortReason(), computeCodeFingerprint(), FingerprintEntry, FingerprintPhase, hashFingerprintPaths(), isMissingFileError(), listFingerprintPaths(), log (+5 more)

### Community 26 - "Cost & Pricing"
Cohesion: 0.08
Nodes (24): Watchdog, log, PROJECT_ROOT, NOTE: PRD generation holds the request open up to ~120s (REFORMULATE_TIMEOUT_MS), resolveDataFile(), resolveServerPort(), RunningServer, serveStaticAsset() (+16 more)

### Community 27 - "Workflow View & Lifecycle"
Cohesion: 0.06
Nodes (28): Architecture, Commands, Conventions (enforced — beyond the global ones in ~/.claude/CLAUDE.md), graphify, The dry-run safety model — read before running anything, What this is, Agent runtime (Agent SDK), Architecture (+20 more)

### Community 28 - "Stats Charts"
Cohesion: 0.07
Nodes (42): AgentMcpServerDefinition, agentMessageDeltaSchema, agentToml(), apiWriteDenyScript(), buildMcpServers(), ConfigObject, configReadResponseSchema, ConfigValue (+34 more)

### Community 29 - "Session Hub & Agent Session"
Cohesion: 0.13
Nodes (6): CodexAppServerConnection, CodexAppServerNotification, CodexAppServerOptions, CodexProviderDependencies, AppServerFixture, CodexRuntimeDependencies

### Community 30 - "Agents View & Ticket Cards"
Cohesion: 0.12
Nodes (27): ActiveDelegation, ActiveReview, ClosableExecution, ExecutionFinishStatus, LiveSession, log, PendingSessionMessage, previewToolInput() (+19 more)

### Community 31 - "PRD Review & Markdown"
Cohesion: 0.10
Nodes (14): log, logRejection(), setup(), ToolHandler, ToolResult, setup(), SessionHub, DRY_RUN_RESULT (+6 more)

### Community 32 - "User Terminal & Fake IO"
Cohesion: 0.16
Nodes (8): AckSystem, RecordedSession, RecordingSystem, RecordedSession, RecordingSystem, RelaunchSystem, AgentSessionHandle, AgentSessionOptions

### Community 33 - "Logging"
Cohesion: 0.10
Nodes (21): scripts, build:desktop, build:web, dev, dev:desktop, dev:proxy, dev:server, dev:web (+13 more)

### Community 34 - "Board Columns"
Cohesion: 0.09
Nodes (31): FILLED_GLYPH_COLORS, StageProgressBar(), TICKET_TAB_LABELS, TicketTab, TicketTabs(), TicketTabsProps, availableTabs(), hasSessionPane() (+23 more)

### Community 35 - "NPM Scripts"
Cohesion: 0.15
Nodes (4): AgentCoordinator, SessionToolCall, addUsageByModel(), toUsageByModel()

### Community 36 - "Runtime Dependencies"
Cohesion: 0.06
Nodes (52): Slot, wsClientEventSchema, ATTENTION_STATUSES, sessionOf(), SlotPips(), SlotPipsProps, STATUS_LABELS, STATUS_PIP_CLASSES (+44 more)

### Community 37 - "Claude SDK Provider"
Cohesion: 0.09
Nodes (23): dependencies, @anthropic-ai/claude-agent-sdk, dompurify, elysia, @fontsource/ibm-plex-mono, @fontsource/ibm-plex-sans, marked, @modelcontextprotocol/sdk (+15 more)

### Community 39 - "Agent Coordinator Handlers"
Cohesion: 0.10
Nodes (29): artifactPath, assertPackageVersionInSync(), assertSdkVersionsInSync(), BUILT_DMG, ELECTROBUN_BIN, fail(), installedPackageVersion(), RELEASE_FOLDER (+21 more)

### Community 40 - "API Client Inputs"
Cohesion: 0.09
Nodes (9): DelegationManager, orderedReviewKinds(), renderCollapsedFinding(), reviewKey(), finding(), allowedReviewPasses(), passDimensionFindings(), requiredReviewKinds() (+1 more)

### Community 41 - "Ticket Config & Constants"
Cohesion: 0.11
Nodes (22): PR_STATE_LABELS, PrState, ColumnActionsMenu(), ColumnActionsMenuProps, ColumnMenuItem, ActionContext, buildActions(), ConfirmSpec (+14 more)

### Community 42 - "Ticket Detail & Triage UI"
Cohesion: 0.08
Nodes (22): FAKE_OPEN_PRS, extractPrUrl(), ghPrHeadSchema, ghPrSchema, ghPrStateSchema, ghRestPullSchema, ghRestReviewPagesSchema, ghRestReviewSchema (+14 more)

### Community 43 - "Demo Pipeline Concepts"
Cohesion: 0.46
Nodes (5): buildSplitChannelPrompt(), buildTicketLines(), isEnglish(), extractFigmaUrls(), hasMockups()

### Community 44 - "Chart Primitives"
Cohesion: 0.22
Nodes (4): McpTokenSource, createMcpSettingsController(), McpSettingsControllerDependencies, temporaryDirectories

### Community 45 - "Session Hub Transcript"
Cohesion: 0.18
Nodes (17): COLUMN_SORT_FIELD, BoardColumn(), compareFamilyMembers(), familyKeyOf(), groupTicketIds(), groupTicketsByFamily(), isSplitMother(), readCollapsed() (+9 more)

### Community 46 - "Community 46"
Cohesion: 0.27
Nodes (15): Agent Implementation Config, Argus Code Review, Automated Tests (typecheck/lint/test), Claude Code Autonomous Agent, Ticket Contract Injection, Feasibility Analysis, Kanban Board (Atelier), Kanban Agents Demo (demo.gif) (+7 more)

### Community 47 - "Modal Dialogs"
Cohesion: 0.06
Nodes (38): AUTOMATION_TRIGGER_LABELS, AUTOMATION_TRIGGERS, AutomationRunStatus, AutomationTrigger, OpenPr, AutomationCard(), AutomationCardProps, AutomationFormProps (+30 more)

### Community 48 - "Community 48"
Cohesion: 0.33
Nodes (9): useTheme(), UseThemeResult, applyTheme(), getStoredTheme(), isTheme(), Theme, ThemeOption, THEMES (+1 more)

### Community 49 - "Slot State"
Cohesion: 0.09
Nodes (35): main(), scalar(), cleanTicket(), conflictTicket(), REVIEW_OPTS, reviewTicket(), TICKET_OPTS, assertCodexDowngradeSafe() (+27 more)

### Community 50 - "Stats Hooks & Cards"
Cohesion: 0.16
Nodes (12): ChartConfig, ChartContainer, ChartContainerProps, ChartContext, ChartContextValue, ChartLegendContent(), ChartLegendContentProps, ChartTooltipContent() (+4 more)

### Community 51 - "Community 51"
Cohesion: 0.08
Nodes (24): AttachExecutionSessionInput, AutomationPatch, EnqueueAgentMessageInput, FinalizeExecutionInput, MarkAgentMessageAcceptedInput, MarkAgentMessageReceivedInput, MarkAgentMessageRejectedInput, NewAsk (+16 more)

### Community 52 - "repairPath.ts"
Cohesion: 0.06
Nodes (41): Block, blockText(), compactChunks(), firstCharCode(), TranscriptBuffer, trimBlockStart(), AgentStreamBlock, TERMINAL_STAGES (+33 more)

### Community 53 - "User Terminal Manager"
Cohesion: 0.33
Nodes (5): CONTEXT — domain glossary, Execution, Proposed (not yet built), Seams, Work items

### Community 54 - "Community 54"
Cohesion: 0.12
Nodes (21): ACTIVE_BAR, AREA_CURSOR, AXIS_PROPS, BAR_CURSOR, CHART_PALETTE, CodexTierSummary(), colorAt(), DurationBars() (+13 more)

### Community 55 - "App.tsx"
Cohesion: 0.13
Nodes (4): startFeasibilityTicket(), FeasibilityBatchManager, toTriageResult(), FeasibilityResult

### Community 56 - "CSV Parsing"
Cohesion: 0.15
Nodes (33): AgentEffort, AgentModel, CodexEffort, CodexModel, Implementer, Orchestrator, AgentProfileConfigProps, CodexAgentFieldsProps (+25 more)

### Community 57 - "Community 57"
Cohesion: 0.12
Nodes (22): applyDesktopEnv(), DesktopRoots, ensureConfig(), ensureMcpToken(), regenerateMcpToken(), temporaryDirectories, boot(), externalUrlFromNewWindowEvent() (+14 more)

### Community 58 - "File Uploads"
Cohesion: 0.29
Nodes (8): StatRecord, StatCard(), StatCardProps, StatEmpty(), StatsView(), StatsViewProps, useStats(), UseStatsResult

### Community 59 - "triageManager.ts"
Cohesion: 0.22
Nodes (17): buildContractConstraintsLines(), buildResponseFormatLines(), buildStrictRulesLines(), buildTicketLines(), buildTriageChannelPrompt(), buildTriagePlusChannelPrompt(), isEnglish(), readOnlyFramingLines() (+9 more)

### Community 60 - "Package Manifest"
Cohesion: 0.22
Nodes (3): SqlUpdateBuilder, migrateConfigJsonIfPresent(), parseLegacyConfig()

### Community 61 - "splitManager.ts"
Cohesion: 0.08
Nodes (41): RFC-4180, ProjectInfo, AgentProfileConfig(), AskPanel(), AskPanelProps, CleanPrPanel(), CleanPrPanelProps, ImportTicketsPanel() (+33 more)

### Community 62 - "TicketCard.tsx"
Cohesion: 0.14
Nodes (7): TicketLifecycle, Stage, Ticket, TriageResult, StageProgressBarProps, DescriptionTabProps, PrdTabProps

### Community 63 - "Community 63"
Cohesion: 0.09
Nodes (4): DoneGateResult, ReviewHeadResult, FakeVcsClient, VcsClient

### Community 64 - "Composer Run Script"
Cohesion: 0.09
Nodes (11): FailedReformulation, ActionSystem, dryRunLog, fakeEncoder, FakePaneStream, hexToBytes(), GitWorktreeAddOptions, ImportNotionOptions (+3 more)

### Community 65 - "split.ts"
Cohesion: 0.10
Nodes (22): log, SlotWatch, applyAppSettingsToModels(), DEFAULT_MODELS, initProjectRegistry(), listProjectKeys(), log, PROJECT_ROOT (+14 more)

### Community 66 - "OpenPr"
Cohesion: 0.15
Nodes (11): CodexAppServerRpcError, canonicalJson(), CodexCommandHook, codexSessionPreToolUseHookHash(), JsonValue, createCodexProvider(), AppServerFixtureOptions, hookPathForSession() (+3 more)

### Community 68 - "schema.test.ts"
Cohesion: 0.18
Nodes (18): Comment, ActivityTab(), ActivityTabProps, isUnanswered(), NO_COMMENT_COLUMNS, AUTHOR_BADGES, AuthorBadge(), CommentRow() (+10 more)

### Community 69 - "reviewFindings.ts"
Cohesion: 0.05
Nodes (61): ActiveReviewPass, BOARD_FINDING_RENDER_STYLE, log, renderFinding(), renderPersistedReviewResult(), REVIEW_DISALLOWED_TOOLS, REVIEW_REPORT_LABELS, REVIEW_REPORT_LABELS_EN (+53 more)

### Community 70 - "CodexRuntimeStatus"
Cohesion: 0.07
Nodes (44): App(), HOME_VIEW_OPTIONS, HomeView, AutomationView(), NAV_ENTRIES, NavEntry, Sidebar(), SidebarProps (+36 more)

### Community 71 - "PostCSS Config"
Cohesion: 0.29
Nodes (6): name, overrides, zod, private, type, version

### Community 73 - "TerminalView.tsx"
Cohesion: 0.36
Nodes (7): effectivePort(), isAllowedHost(), isAllowedOrigin(), isAuthorized(), isLoopbackHost(), jsonResponse(), parseHost()

### Community 74 - "button.tsx"
Cohesion: 0.06
Nodes (58): AGENT_EFFORT_FULL_LABELS, AGENT_EFFORT_LABELS, AGENT_MODEL_FULL_LABELS, AGENT_MODEL_LABELS, AUTOMATION_RUN_STATUSES, CODEX_EFFORT_FULL_LABELS, CODEX_EFFORT_LABELS, CODEX_MODEL_LABELS (+50 more)

### Community 75 - ".handleRequest"
Cohesion: 0.11
Nodes (14): analyzeResultSchema, compactTicketSchema, createResultSchema, errorResultSchema, ISOLATED_ENV_KEYS, projectResultSchema, savedEnv, startResultSchema (+6 more)

### Community 76 - "usePrdSearch.ts"
Cohesion: 0.13
Nodes (23): costByFamily(), costOf(), costOfModel(), costOfSessions(), CostSummary, FamilyPricing, MODEL_PRICING, ModelFamily (+15 more)

### Community 78 - "csv.ts"
Cohesion: 0.11
Nodes (9): RecordingSystemAdapter, PublishReviewOptions, PublishReviewResult, ReviewPublicationState, GithubVcsClient, pullApiEndpoint(), reviewApiEndpoint(), rightSideDiffLines() (+1 more)

### Community 79 - "WorktreeSession"
Cohesion: 0.33
Nodes (3): listeners, mcp, ReplyArgsSchema

### Community 80 - "recordedAction.ts"
Cohesion: 0.23
Nodes (17): alternation(), COMMAND_WRAPPERS, commandSegments(), commandWords(), executableName(), launchedPackageScript(), launchesTypecheck(), OPTIONS_WITH_VALUE (+9 more)

### Community 81 - "vcsCommands.ts"
Cohesion: 0.20
Nodes (7): AZURE_COMMANDS, COMMANDS_BY_PROVIDER, GITHUB_COMMANDS, PrDiffContext, VcsCleanCommands, AZ_SETTLED_THREAD_STATUSES, VCS_PROVIDER_LABELS

### Community 82 - "TicketOperations"
Cohesion: 0.25
Nodes (3): listPublicProjects(), PublicMcpManager, TicketOperations

### Community 86 - "useTickTimer.ts"
Cohesion: 0.39
Nodes (7): currentNow, getSnapshot(), startTicking(), stopTicking(), subscribe(), subscribers, useTickTimer()

### Community 87 - "codexBinary.ts"
Cohesion: 0.38
Nodes (5): normalizeCreateInput(), requestKeyConflictMessage(), ticketDependencyError(), isAllowedAgentPair(), deriveTitleFromDescription()

### Community 89 - "usePrdSearch.ts"
Cohesion: 0.11
Nodes (25): CompactTicket, ListTicketsInput, ACTIVE_STAGES, Column, COLUMN_LABELS, COLUMN_ORDER, COLUMNS, ACTIVE_COLUMNS (+17 more)

### Community 90 - "nvmNode.ts"
Cohesion: 0.35
Nodes (9): gitMetadataWritableRoots(), agentBaseEnv(), bestInstalledMatch(), compareParts(), envWithProjectNode(), nvmNodeBinDir(), readNvmrc(), prepareProjectShell() (+1 more)

### Community 93 - "ColumnActionsMenu.tsx"
Cohesion: 0.25
Nodes (7): Azure DevOps support — state file, Decisions (validated by the owner, 2026-09-21), Goal, Known blockers for lots 3 and 4, Open questions, Progress, Verified on this machine (az 2.90.0, azure-devops 1.0.8)

### Community 94 - ".addComment"
Cohesion: 0.11
Nodes (14): log, log, ReformulateManager, TriageManager, log, ClientHub, ClientSocket, ClientSocketData (+6 more)

### Community 95 - "TicketConfigSummary.tsx"
Cohesion: 0.50
Nodes (3): appBundle, EMBEDDED_BINARIES, resourcesApp

### Community 97 - "RunningServer"
Cohesion: 0.11
Nodes (18): ANSI, appendToLogFile(), COLOR_ENABLED, disableFileLogging(), initLogFile(), isLevel(), Level, LEVEL_ORDER (+10 more)

### Community 98 - "triageManager.ts"
Cohesion: 0.14
Nodes (15): AtelierDesktopRpcSchema, DesktopRequests, McpSettingsMetadata, WebviewRequests, McpSettingsController, McpSettings(), DashedAddButton(), DashedAddButtonProps (+7 more)

### Community 99 - "reviewPublishingGuard.ts"
Cohesion: 0.07
Nodes (35): API_GUARDS, API_READ_METHOD_SET, ApiDenyPatterns, ApiGuard, AZ_INVOKE_COMMAND, AZ_INVOKE_METHOD_LONG_FLAGS, AZ_INVOKE_WRITE_INPUT_LONG_FLAGS, AZ_PR_WRITE_PATTERN (+27 more)

### Community 100 - ".startVerification"
Cohesion: 0.11
Nodes (17): CodexAppServerInitializationError, connectCodexAppServer(), incomingSchema, initializeResponseSchema, log, PendingRequest, rpcErrorSchema, spawnCodexAppServer() (+9 more)

### Community 101 - "codexProvider.test.ts"
Cohesion: 0.13
Nodes (11): directories, initializeParamsSchema, log, requestSchema, rpcError(), rpcResult(), rpcResponseSchema, toolCallParamsSchema (+3 more)

### Community 103 - "TerminalSession"
Cohesion: 0.07
Nodes (16): RealPaneStream, PaneStream, dataMessage(), log, normalizeSeed(), safeParse(), send(), TerminalSession (+8 more)

### Community 104 - ".runWorktreeSetupScript"
Cohesion: 0.24
Nodes (4): BoundedCommandResult, connectionFailure(), connectionResult(), VcsConnectionResult

### Community 105 - "createMcpServer"
Cohesion: 0.53
Nodes (5): createMcpServer(), invalidInput(), OutputValidator, toolError(), toolResult()

### Community 106 - "usePrdSearch.ts"
Cohesion: 0.14
Nodes (22): PrdAnnotator(), PrdAnnotatorProps, BREADCRUMB, NO_ANNOTATIONS, PrdReviewDialog(), PrdReviewDialogProps, PrdView(), QuitConfirmModal() (+14 more)

### Community 107 - "azureRemote.ts"
Cohesion: 0.35
Nodes (11): azureOrgUrl(), AzureRepoRef, fromAzureSegments(), fromCollectionSegments(), fromLegacySegments(), fromSshSegments(), parseAzureRepoRef(), parseRemoteLocation() (+3 more)

### Community 109 - "StageProgressBar.tsx"
Cohesion: 0.50
Nodes (4): SavedFlag, SavedFlash, useSavedFlag(), useSavedFlash()

### Community 110 - "Profile"
Cohesion: 0.18
Nodes (16): ProfileConfig, Profile, DragHandleAttributes, DragHandleListeners, ProfileRowHeader(), ProfileRowHeaderProps, ProfileRowProps, ProfilesSettings() (+8 more)

### Community 116 - "settings.tsx"
Cohesion: 0.05
Nodes (58): CapabilityCache, CodexRuntimeStatus, codexRuntimeStatusSchema, isCodexFastServiceTier(), pairedRuntimeCodexEffort(), UNKNOWN_CODEX_RUNTIME_STATUS, pairedCodexEffort(), Capabilities (+50 more)

### Community 117 - "TicketMeta.tsx"
Cohesion: 0.18
Nodes (12): columnSchema, CostSummary(), MetaRow(), MetaRowProps, STATUS_CONFIRMS, StatusConfirm, statusTitle(), TicketMeta() (+4 more)

### Community 121 - "prUrl.ts"
Cohesion: 0.32
Nodes (7): ImplementSessionInput, VCS_PROVIDERS, VcsProvider, parsePrUrl(), PR_URL_SEGMENT, prNumberFromUrl(), PrUrlRef

## Knowledge Gaps
- **753 isolated node(s):** `SlotStatus`, `persistedReviewStatusSchema`, `reviewVerdictSchema`, `reviewVerificationStatusSchema`, `persistedReviewFindingsSchema` (+748 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **15 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Ticket` connect `TicketCard.tsx` to `Contract Building & Slots`, `Desktop Bootstrap & Menus`, `Ticket Action Panels`, `Shared Zod Schemas`, `PR Selection & Slots Bar`, `Core Domain Concepts`, `Live Terminal Views`, `Store Types & Agent Knobs`, `DB Row Schemas & Mappers`, `Dev Dependencies`, `Agents View & Ticket Cards`, `Board Columns`, `Runtime Dependencies`, `API Client Inputs`, `Ticket Config & Constants`, `Demo Pipeline Concepts`, `Session Hub Transcript`, `Modal Dialogs`, `Slot State`, `repairPath.ts`, `triageManager.ts`, `splitManager.ts`, `TerminalView.tsx`, `schema.test.ts`, `reviewFindings.ts`, `CodexRuntimeStatus`, `button.tsx`, `usePrdSearch.ts`, `codexBinary.ts`, `usePrdSearch.ts`, `.addComment`, `reformulate.ts`, `TicketMeta.tsx`, `prUrl.ts`?**
  _High betweenness centrality (0.072) - this node is a cross-community bridge._
- **Why does `SystemAdapter` connect `TerminalView.tsx` to `Composer Run Script`, `Desktop Bootstrap & Menus`, `reviewFindings.ts`, `Agent Profile Config`, `Settings & Profiles UI`, `PR Selection & Slots Bar`, `TerminalSession`, `API Client Inputs`, `Board & Sidebar Layout`, `csv.ts`, `Agents View & Ticket Cards`, `Cost & Pricing`, `.addComment`, `PRD Review & Markdown`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **Why does `Store` connect `.start` to `Desktop Bootstrap & Menus`, `Shared Zod Schemas`, `PR Selection & Slots Bar`, `Coordinator & Protocol`, `Store Types & Agent Knobs`, `DB Row Schemas & Mappers`, `Dev Dependencies`, `Cost & Pricing`, `Agents View & Ticket Cards`, `PRD Review & Markdown`, `NPM Scripts`, `Agent Profile Config`, `API Client Inputs`, `Slot State`, `Community 51`, `Package Manifest`, `TicketCard.tsx`, `split.ts`, `TerminalView.tsx`, `reviewFindings.ts`, `App.tsx`, `.onMessageStatus`, `.addComment`, `TerminalSession`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **What connects `SlotStatus`, `persistedReviewStatusSchema`, `reviewVerdictSchema` to the rest of the system?**
  _764 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Contract Building & Slots` be split into smaller, more focused modules?**
  _Cohesion score 0.022222222222222223 - nodes in this community are weakly interconnected._
- **Should `Terminals UI & Notifications` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._
- **Should `Desktop Bootstrap & Menus` be split into smaller, more focused modules?**
  _Cohesion score 0.1286195286195286 - nodes in this community are weakly interconnected._