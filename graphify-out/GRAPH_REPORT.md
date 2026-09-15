# Graph Report - slot-1  (2026-09-15)

## Corpus Check
- 259 files · ~731,974 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2792 nodes · 7178 edges · 126 communities (105 shown, 21 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 45 edges (avg confidence: 0.64)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `97f80461`
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
- slotTemplates.ts
- reviewMarkdown.ts
- submitTriageArgsSchema
- profileMatching.test.ts

## God Nodes (most connected - your core abstractions)
1. `Store` - 120 edges
2. `cn()` - 79 edges
3. `Ticket` - 75 edges
4. `SystemAdapter` - 74 edges
5. `RealSystemAdapter` - 70 edges
6. `createApiRoutes()` - 70 edges
7. `FakeSystemAdapter` - 65 edges
8. `SlotManager` - 54 edges
9. `ProjectInfo` - 50 edges
10. `DelegationManager` - 49 edges

## Surprising Connections (you probably didn't know these)
- `McpSettingsClient` --references--> `McpSettingsMetadata`  [EXTRACTED]
  src/web/src/lib/mcpSettings.ts → desktop/mcpRpc.ts
- `CompactTicket` --references--> `Ticket`  [EXTRACTED]
  src/server/ticketOperations.ts → src/shared/schemas.ts
- `ImplementSessionInput` --references--> `Ticket`  [EXTRACTED]
  src/server/agents/sessionConfig.ts → src/shared/schemas.ts
- `TerminalTabProps` --references--> `Ticket`  [EXTRACTED]
  src/web/src/components/ticket-detail/TerminalTab.tsx → src/shared/schemas.ts
- `TicketActionsProps` --references--> `Ticket`  [EXTRACTED]
  src/web/src/components/ticket-detail/TicketActions.tsx → src/shared/schemas.ts

## Import Cycles
- None detected.

## Communities (126 total, 21 thin omitted)

### Community 0 - "Contract Building & Slots"
Cohesion: 0.03
Nodes (76): ActionExecutionOptions, actionExecutionOptionsSchema, AgentMessageChannel, agentMessageSchema, appSettingsSchema, automationRunSchema, automationSchema, baseBranchSchema (+68 more)

### Community 1 - "Terminals UI & Notifications"
Cohesion: 0.10
Nodes (20): analyzeTicketsInputSchema, analyzeTicketsOutputSchema, columnSchema, compactTicketSchema, createTodoTicketOutputSchema, editableTicketSchema, listProjectsInputSchema, listProjectsOutputSchema (+12 more)

### Community 3 - "Feasibility Batch Management"
Cohesion: 0.07
Nodes (29): TRIAGE_VERDICTS, AgentSettableStage, agentSettableStageSchema, askUserArgsSchema, AssertNamesCovered, channelEventSchema, delegateImplementationArgsSchema, delegateReviewArgsSchema (+21 more)

### Community 4 - "Ticket Action Panels"
Cohesion: 0.09
Nodes (23): Slot, WsClientEvent, wsClientEventSchema, ATTENTION_STATUSES, sessionOf(), SlotPips(), SlotPipsProps, STATUS_LABELS (+15 more)

### Community 5 - "Fake System Adapter"
Cohesion: 0.11
Nodes (36): UNKNOWN_CODEX_RUNTIME_STATUS, REVIEW_DEPTH_LABELS, REVIEW_DEPTHS, ReviewDepth, Capabilities, AskPanel(), CodexAgentFields(), CodexConnectionStatus() (+28 more)

### Community 7 - "Settings & Profiles UI"
Cohesion: 0.08
Nodes (4): delay(), FakeSystemAdapter, DoneGateResult, WorktreeSetupOptions

### Community 8 - "PR Selection & Slots Bar"
Cohesion: 0.13
Nodes (15): log, SlotWatch, WorktreeAddressWatcher, SLOTS_ROOT, buildAppSettingsPatch(), LegacyConfig, legacyConfigSchema, LegacyModels (+7 more)

### Community 9 - "Real System Adapter"
Cohesion: 0.08
Nodes (27): AppearanceSettings(), CODEX_STATUS_TONES, COMMIT_ROW, DefaultsRowSpec, EFFORT_OPTIONS, FEASIBILITY_ROW, IMPLEMENTATION_ROW, KnobGroupProps (+19 more)

### Community 10 - "Slot Config & Worktree Watch"
Cohesion: 0.15
Nodes (14): terminalServerMessageSchema, FullscreenToggle(), FullscreenToggleProps, badgeLabelFor(), LiveTerminal(), LiveTerminalOptions, LiveTerminalProps, TerminalCell() (+6 more)

### Community 11 - "Core Domain Concepts"
Cohesion: 0.03
Nodes (50): agentMessageRowSchema, AutomationRow, automationRowSchema, AutomationRunRow, automationRunRowSchema, buildScripts(), CommentRow, commentRowSchema (+42 more)

### Community 12 - "Board & Sidebar Layout"
Cohesion: 0.22
Nodes (7): RecordingSystemAdapter, reviewApiEndpoint(), runBoundedReviewCommand(), safeJsonParse(), PublishReviewOptions, PublishReviewResult, ReviewDoneOptions

### Community 13 - "Database Store Operations"
Cohesion: 0.15
Nodes (21): assertCodexDowngradeSafe(), backfillOrchestrator(), countRows(), createDatabase(), EXECUTION_MIGRATIONS, hasColumn(), insertProfile(), migrate() (+13 more)

### Community 14 - "Coordinator & Protocol"
Cohesion: 0.14
Nodes (5): assertCodexImplementerAvailable(), featureBranch(), slotPath(), slugify(), enrichWorktreeSession()

### Community 16 - "Stats Aggregation"
Cohesion: 0.11
Nodes (19): log, createLogger(), FailedReformulation, ActionSystem, dryRunLog, FAKE_OPEN_PRS, fakeEncoder, GitWorktreeAddOptions (+11 more)

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
Cohesion: 0.06
Nodes (60): FAILURE_COLUMNS, Kind, SUCCESS_COLUMNS, StatRecord, StatCard(), StatCardProps, StatEmpty(), ACTIVE_BAR (+52 more)

### Community 21 - "Store Types & Agent Knobs"
Cohesion: 0.19
Nodes (23): buildAskContract(), buildCleanContract(), buildConflictResolutionContract(), buildFeasibilityBatchContract(), buildFeasibilityContextSection(), buildImplementingSteps(), buildMockupReviewStep(), buildPlanningStep() (+15 more)

### Community 22 - "DB Row Schemas & Mappers"
Cohesion: 0.12
Nodes (23): Column, COLUMN_LABELS, COLUMN_ORDER, COLUMNS, ACTIVE_COLUMNS, Board(), isColumn(), isLocked() (+15 more)

### Community 23 - "Dev Dependencies"
Cohesion: 0.09
Nodes (20): AnalyzeTicketRejectionReason, AnalyzeTicketsResult, CompactTicket, createTicketOperations(), CreateTodoTicketInput, createTodoTicketInputSchema, CreateTodoTicketResult, isActive() (+12 more)

### Community 24 - "TypeScript Config"
Cohesion: 0.12
Nodes (22): bashCommandSchema, buildSettings(), claudeProvider, createSdkAgentSession(), denyBashHook(), denyNoVerifyHook, denyReviewPublishingHook, denyTypecheckHook() (+14 more)

### Community 25 - "Client Hub & Watchdog"
Cohesion: 0.22
Nodes (7): createMcpServer(), invalidInput(), OutputValidator, toolError(), toolResult(), FeasibilityStarter, TicketOperations

### Community 26 - "Cost & Pricing"
Cohesion: 0.07
Nodes (26): BoundedCommandResult, CLAUDE_JSON_PATH, COMPOSER_BINARIES, detectInstallCommand(), ghPrHeadSchema, ghPrSchema, ghPrStateSchema, ghRestPullSchema (+18 more)

### Community 27 - "Workflow View & Lifecycle"
Cohesion: 0.06
Nodes (27): Architecture, Commands, Conventions (enforced — beyond the global ones in ~/.claude/CLAUDE.md), graphify, The dry-run safety model — read before running anything, What this is, Agent runtime (Agent SDK), Architecture (+19 more)

### Community 28 - "Stats Charts"
Cohesion: 0.05
Nodes (43): AgentMcpServerDefinition, agentMessageDeltaSchema, agentToml(), buildMcpServers(), CodexProviderDependencies, ConfigObject, configReadResponseSchema, ConfigValue (+35 more)

### Community 31 - "PRD Review & Markdown"
Cohesion: 0.05
Nodes (38): CodexAppServerConnection, CodexAppServerInitializationError, CodexAppServerNotification, CodexAppServerOptions, CodexAppServerProtocolError, CodexAppServerRpcError, connectCodexAppServer(), incomingSchema (+30 more)

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
Cohesion: 0.17
Nodes (18): COLUMN_SORT_FIELD, BoardColumn(), compareFamilyMembers(), familyKeyOf(), groupTicketIds(), groupTicketsByFamily(), isSplitMother(), readCollapsed() (+10 more)

### Community 37 - "Claude SDK Provider"
Cohesion: 0.09
Nodes (23): dependencies, @anthropic-ai/claude-agent-sdk, dompurify, elysia, @fontsource/ibm-plex-mono, @fontsource/ibm-plex-sans, marked, @modelcontextprotocol/sdk (+15 more)

### Community 39 - "Agent Coordinator Handlers"
Cohesion: 0.17
Nodes (18): adopt(), compareVersions(), detectionCandidates(), detectUserInstall(), downloadAndVerifyTarball(), downloadPinnedBinary(), emitProgress(), ensureClaudeBinary() (+10 more)

### Community 40 - "API Client Inputs"
Cohesion: 0.16
Nodes (13): cleanTicket(), conflictTicket(), REVIEW_OPTS, reviewTicket(), TICKET_OPTS, createdPaths, reserveDbPath(), paths (+5 more)

### Community 41 - "Ticket Config & Constants"
Cohesion: 0.18
Nodes (21): QuitConfirmModal(), applySizes(), collectTerminalIds(), findLeaf(), firstLeafId(), LeafNode, leafNodeSchema, makeLeaf() (+13 more)

### Community 42 - "Ticket Detail & Triage UI"
Cohesion: 0.18
Nodes (21): AGENT_EFFORT_FULL_LABELS, AGENT_MODEL_FULL_LABELS, CODEX_EFFORT_FULL_LABELS, CODEX_MODEL_LABELS, IMPLEMENTER_LABELS, ProfilePipeline(), ProfileRowHeader(), toDraft() (+13 more)

### Community 43 - "Demo Pipeline Concepts"
Cohesion: 0.23
Nodes (21): AgentEffort, AgentModel, CodexEffort, CodexModel, Implementer, Orchestrator, AgentProfileConfigProps, FormState (+13 more)

### Community 44 - "Chart Primitives"
Cohesion: 0.20
Nodes (14): AgentCard(), STATE_STRIPE_COLORS, TicketCard(), TicketCardProps, TriageDot(), truncateParentTitle(), ANIMATED_STAGES, formatRelativeDuration() (+6 more)

### Community 45 - "Session Hub Transcript"
Cohesion: 0.14
Nodes (16): OverviewTab(), OverviewTabProps, SUMMARY_COLUMNS, PrdTab(), SectionHeader(), SectionHeaderProps, ABSOLUTE_UPLOAD_PATH, ImageLightboxProps (+8 more)

### Community 46 - "Community 46"
Cohesion: 0.27
Nodes (15): Agent Implementation Config, Argus Code Review, Automated Tests (typecheck/lint/test), Claude Code Autonomous Agent, Ticket Contract Injection, Feasibility Analysis, Kanban Board (Atelier), Kanban Agents Demo (demo.gif) (+7 more)

### Community 47 - "Modal Dialogs"
Cohesion: 0.17
Nodes (3): mergeAgentUsageByModel(), SessionHubHandlers, SessionStartCallbacks

### Community 48 - "Community 48"
Cohesion: 0.24
Nodes (8): effectivePort(), isAllowedHost(), isAllowedOrigin(), isAuthorized(), isLoopbackHost(), jsonResponse(), parseHost(), PublicMcpManager

### Community 49 - "Slot State"
Cohesion: 0.15
Nodes (9): ReformulateManager, log, initProjectRegistry(), ClientHub, ClientSocket, ClientSocketData, NativeNotify, Notifier (+1 more)

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
Cohesion: 0.07
Nodes (42): toCodexRuntimeModels(), AGENT_EFFORT_LABELS, AGENT_MODEL_LABELS, AUTOMATION_RUN_STATUSES, AutomationTrigger, CODEX_EFFORT_LABELS, CODEX_EFFORTS, CODEX_MODEL_EFFORTS (+34 more)

### Community 55 - "App.tsx"
Cohesion: 0.12
Nodes (13): startFeasibilityTicket(), ResolvedExecution, DRY_RUN_VERDICT, FeasibilityBatchManager, FeasibilityGroup, FeasibilitySession, log, QueuedFeasibility (+5 more)

### Community 56 - "CSV Parsing"
Cohesion: 0.12
Nodes (26): ExecutionFinishStatus, LiveSession, log, PendingSessionMessage, previewToolInput(), renderChannelEvent(), renderImplementationDone(), renderSessionEvent() (+18 more)

### Community 57 - "Community 57"
Cohesion: 0.17
Nodes (17): ensureConfig(), boot(), externalUrlFromNewWindowEvent(), forwardAtelierShortcut(), installApplicationMenu(), installMenuShortcutBridge(), menuShortcutActionSchema, navigationEventSchema (+9 more)

### Community 58 - "File Uploads"
Cohesion: 0.20
Nodes (12): TERMINAL_STAGES, applyTranscriptUpdate(), TranscriptState, transcriptText(), transcriptUpdateSchema, TerminalData, TerminalView(), TerminalViewProps (+4 more)

### Community 59 - "triageManager.ts"
Cohesion: 0.18
Nodes (19): buildSplitChannelPrompt(), buildTicketLines(), isEnglish(), buildContractConstraintsLines(), buildResponseFormatLines(), buildStrictRulesLines(), buildTicketLines(), buildTriageChannelPrompt() (+11 more)

### Community 60 - "Package Manifest"
Cohesion: 0.10
Nodes (17): ActiveDelegation, ActiveReview, ActiveReviewPass, ClosableExecution, log, orderedReviewKinds(), renderCollapsedFinding(), renderPersistedReviewResult() (+9 more)

### Community 61 - "splitManager.ts"
Cohesion: 0.20
Nodes (8): Block, blockText(), compactChunks(), firstCharCode(), TranscriptBuffer, trimBlockStart(), AgentStreamBlock, TranscriptUpdate

### Community 62 - "TicketCard.tsx"
Cohesion: 0.20
Nodes (6): Watchdog, TicketLifecycle, Ticket, StageProgressBarProps, DescriptionTabProps, PrdTabProps

### Community 63 - "Community 63"
Cohesion: 0.06
Nodes (32): log, logRejection(), ToolHandler, ToolResult, AttachExecutionSessionInput, AutomationPatch, EnqueueAgentMessageInput, FinalizeExecutionInput (+24 more)

### Community 64 - "Composer Run Script"
Cohesion: 0.16
Nodes (7): AckSystem, RecordingSystem, RecordedSession, RecordingSystem, RelaunchSystem, AgentSessionHandle, AgentSessionOptions

### Community 66 - "OpenPr"
Cohesion: 0.24
Nodes (13): AppSettings, UpdateAppSettingsInput, AgentDefaultsSettings(), AppSettingsState, flashSaved(), loadOnce(), patchAppSettings(), publish() (+5 more)

### Community 67 - "UserTerminalManager"
Cohesion: 0.23
Nodes (10): artifactPath, assertPackageVersionInSync(), assertSdkVersionsInSync(), BUILT_DMG, ELECTROBUN_BIN, fail(), installedPackageVersion(), RELEASE_FOLDER (+2 more)

### Community 68 - "schema.test.ts"
Cohesion: 0.14
Nodes (21): PrdAnnotator(), PrdAnnotatorProps, BREADCRUMB, NO_ANNOTATIONS, PrdReviewDialog(), PrdReviewDialogProps, PrdView(), Sheet() (+13 more)

### Community 69 - "contract.test.ts"
Cohesion: 0.13
Nodes (24): dedupeFindings(), DimensionFinding, findingAnchor(), FRENCH_STOP_WORD_PATTERN, FRENCH_STOP_WORDS, hasSimilarSummary(), isSameDefect(), isSelfRefuting() (+16 more)

### Community 70 - "CodexRuntimeStatus"
Cohesion: 0.12
Nodes (11): analyzeResultSchema, compactTicketSchema, createResultSchema, errorResultSchema, projectResultSchema, startResultSchema, structuredContentResultSchema, textContentResultSchema (+3 more)

### Community 71 - "PostCSS Config"
Cohesion: 0.29
Nodes (6): name, overrides, zod, private, type, version

### Community 72 - "App.tsx"
Cohesion: 0.13
Nodes (23): isProcessing(), ACTIVE_STAGES, ColumnActionsMenu(), ColumnActionsMenuProps, ColumnMenuItem, ActionContext, buildActions(), ConfirmSpec (+15 more)

### Community 74 - "button.tsx"
Cohesion: 0.13
Nodes (12): PROJECT_ROOT, NOTE: PRD generation holds the request open up to ~120s (REFORMULATE_TIMEOUT_MS), resolveServerPort(), RunningServer, serveStaticAsset(), SocketData, startServer(), StartServerOptions (+4 more)

### Community 75 - "FakePaneStream"
Cohesion: 0.18
Nodes (12): FULL_REVIEW_KINDS, LIGHT_REVIEW_KINDS, passDimensionFindings(), publishedReviewFindings(), requiredReviewKinds(), log, ReclaimOutcome, reviewPublicationState() (+4 more)

### Community 76 - "usePrdSearch.ts"
Cohesion: 0.12
Nodes (24): costByFamily(), costOf(), costOfModel(), costOfSessions(), CostSummary, FamilyPricing, ModelFamily, normalizeModel() (+16 more)

### Community 78 - "csv.ts"
Cohesion: 0.07
Nodes (37): isNotionUrl(), NOTION_HOSTS, App(), HOME_VIEW_OPTIONS, HomeView, NewTicketSheet(), QuitConfirmModalProps, NAV_ENTRIES (+29 more)

### Community 79 - "WorktreeSession"
Cohesion: 0.33
Nodes (3): listeners, mcp, ReplyArgsSchema

### Community 80 - "recordedAction.ts"
Cohesion: 0.23
Nodes (17): alternation(), COMMAND_WRAPPERS, commandSegments(), commandWords(), executableName(), launchedPackageScript(), launchesTypecheck(), OPTIONS_WITH_VALUE (+9 more)

### Community 81 - "terminalManager.ts"
Cohesion: 0.31
Nodes (13): abortReason(), computeCodeFingerprint(), FingerprintEntry, FingerprintPhase, hashFingerprintPaths(), isMissingFileError(), listFingerprintPaths(), log (+5 more)

### Community 82 - "Community 82"
Cohesion: 0.22
Nodes (4): McpTokenSource, createMcpSettingsController(), McpSettingsControllerDependencies, temporaryDirectories

### Community 86 - "TicketCost.tsx"
Cohesion: 0.10
Nodes (26): Comment, OpenPr, PrSelectRow(), PrSelectRowProps, ActivityTab(), ActivityTabProps, isUnanswered(), NO_COMMENT_COLUMNS (+18 more)

### Community 87 - "TerminalView.tsx"
Cohesion: 0.39
Nodes (7): emit(), loadedSubscribers, loadOnce(), refreshProjects(), subscribers, useProjects(), useProjectsLoaded()

### Community 90 - "useProjects.ts"
Cohesion: 0.27
Nodes (7): CapabilityCache, CodexRuntimeStatus, codexRuntimeStatusSchema, isCodexFastServiceTier(), pairedRuntimeCodexEffort(), pairedCodexEffort(), runtime

### Community 91 - "AgentsView.tsx"
Cohesion: 0.20
Nodes (10): AtelierDesktopRpcSchema, DesktopRequests, McpSettingsMetadata, WebviewRequests, McpSettingsController, McpSettings(), errorMessage(), createMcpSettingsClient() (+2 more)

### Community 92 - "ProjectConfig"
Cohesion: 0.36
Nodes (5): applyDesktopEnv(), DesktopRoots, ensureMcpToken(), regenerateMcpToken(), temporaryDirectories

### Community 93 - "ColumnActionsMenu.tsx"
Cohesion: 0.13
Nodes (24): FILLED_GLYPH_COLORS, StageProgressBar(), TICKET_TAB_LABELS, TicketTab, TicketTabs(), TicketTabsProps, availableTabs(), hasSessionPane() (+16 more)

### Community 94 - ".addComment"
Cohesion: 0.06
Nodes (4): nullableBooleanValue(), SqlUpdateBuilder, Store, runRecordedAction()

### Community 95 - "TicketConfigSummary.tsx"
Cohesion: 0.50
Nodes (3): appBundle, EMBEDDED_BINARIES, resourcesApp

### Community 97 - "RunningServer"
Cohesion: 0.09
Nodes (19): ANSI, appendToLogFile(), COLOR_ENABLED, disableFileLogging(), initLogFile(), isLevel(), Level, LEVEL_ORDER (+11 more)

### Community 98 - "triageManager.ts"
Cohesion: 0.08
Nodes (36): resolveBaseBranch(), assertExecutionAvailable(), CODEX_LAUNCH_STATUS_MESSAGES, CodexCapabilityReader, ExecutionDefaults, ExecutionOverrides, FEASIBILITY_ENGINE_EXECUTION, resolveExecution() (+28 more)

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
Cohesion: 0.10
Nodes (37): RFC-4180, ProjectInfo, AgentProfileConfig(), AskPanelProps, BoardProps, CleanPrPanel(), CleanPrPanelProps, ImportTicketsPanel() (+29 more)

### Community 103 - "TerminalSession"
Cohesion: 0.07
Nodes (11): FakePaneStream, RealPaneStream, PaneStream, dataMessage(), normalizeSeed(), safeParse(), send(), TerminalSession (+3 more)

### Community 104 - "AutomationView.tsx"
Cohesion: 0.14
Nodes (15): AUTOMATION_TRIGGER_LABELS, AUTOMATION_TRIGGERS, AutomationRunStatus, AutomationRun, CreateAutomationInput, AutomationCard(), AutomationCardProps, AutomationFormProps (+7 more)

### Community 105 - ".finishTicket"
Cohesion: 0.27
Nodes (8): AgentCardProps, AgentsView(), AgentsViewProps, hasLiveAgent(), normalize(), KIND_BADGES, TicketBadges(), TicketBadgesProps

### Community 106 - "nvmNode.ts"
Cohesion: 0.19
Nodes (9): CHILD_USAGE, FULL_REVIEW_KINDS, LIGHT_REVIEW_KINDS, newDelegatedTicket(), newReviewTicket(), RecordedSession, sleep(), startAndApproveReviews() (+1 more)

### Community 107 - "isNotionUrl"
Cohesion: 0.50
Nodes (7): groupOrientation(), layoutToSizes(), panelId(), panelPercent(), SplitTree(), SplitTreeProps, TreeNode

### Community 108 - "uploads.ts"
Cohesion: 0.36
Nodes (7): collectMatchRanges(), isShortcutDetail(), ShortcutDetail, supportsHighlightApi(), usePrdSearch(), UsePrdSearchOptions, UsePrdSearchResult

### Community 109 - "nvmNode.ts"
Cohesion: 0.42
Nodes (7): bestInstalledMatch(), compareParts(), envWithProjectNode(), nvmNodeBinDir(), readNvmrc(), prepareProjectShell(), shellLiteral()

### Community 110 - "Profile"
Cohesion: 0.09
Nodes (23): buildNotionImportPrompt(), agentPairError(), cleanDescription(), createApiRoutes(), createSplitChildren(), failSplitMother(), isBlocked(), isSplitMother() (+15 more)

### Community 111 - ".start"
Cohesion: 0.24
Nodes (10): columnSchema, MetaRow(), MetaRowProps, STATUS_CONFIRMS, StatusConfirm, statusTitle(), TicketMeta(), resolveProjectLabel() (+2 more)

### Community 112 - "PrSelectRow.tsx"
Cohesion: 0.48
Nodes (3): AgentProvider, AgentSessionEvent, runOneShotSession()

### Community 113 - "bootstrap.ts"
Cohesion: 0.39
Nodes (7): currentNow, getSnapshot(), startTicking(), stopTicking(), subscribe(), subscribers, useTickTimer()

### Community 115 - "useLocalDraft.ts"
Cohesion: 0.22
Nodes (13): DescriptionEdit, DescriptionTab(), NOTE: the draft now mirrors what was persisted, so it is no longer unsent text., DraftUpdate, parseJson(), readDraft(), removeDraft(), useDraftStorage() (+5 more)

### Community 116 - "settings.tsx"
Cohesion: 0.13
Nodes (20): ProfileConfig, Profile, DragHandleAttributes, DragHandleListeners, ProfileRowHeaderProps, ProfileRowProps, ProfilesSettings(), NOTE: the saved flag lives here because a saved row remounts (its key carries up (+12 more)

### Community 117 - "codexBinary.ts"
Cohesion: 0.33
Nodes (5): isProcessing(), normalizeCreateInput(), requestKeyConflictMessage(), ticketDependencyError(), deriveTitleFromDescription()

### Community 118 - "codexHookTrust.ts"
Cohesion: 0.47
Nodes (5): SplitOrientation, isShortcutDetail(), ShortcutDetail, useTerminalShortcuts(), UseTerminalShortcutsOptions

### Community 121 - "TicketMeta.tsx"
Cohesion: 0.09
Nodes (19): buildPrdPrompt(), AnalyzeTicketsInput, CreateAskInput, CreateCleanInput, CreateCommentInput, CreateProfileInput, CreateReviewInput, CreateTicketInput (+11 more)

## Knowledge Gaps
- **675 isolated node(s):** `What this is`, `Commands`, `graphify`, `The dry-run safety model — read before running anything`, `Architecture` (+670 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **21 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `SystemAdapter` connect `Agents View & Ticket Cards` to `triageManager.ts`, `Desktop Bootstrap & Menus`, `NPM Scripts`, `Agent Profile Config`, `Settings & Profiles UI`, `TerminalSession`, `FakePaneStream`, `Coordinator & Protocol`, `API Routes & Reformulate`, `Stats Aggregation`, `Slot State`, `chart.tsx`, `App.tsx`, `CSV Parsing`, `Cost & Pricing`?**
  _High betweenness centrality (0.074) - this node is a cross-community bridge._
- **Why does `Store` connect `.addComment` to `Desktop Bootstrap & Menus`, `PR Selection & Slots Bar`, `Coordinator & Protocol`, `Stats Aggregation`, `Store Types & Agent Knobs`, `Agents View & Ticket Cards`, `NPM Scripts`, `Agent Profile Config`, `API Client Inputs`, `Slot State`, `chart.tsx`, `App.tsx`, `TicketCard.tsx`, `Community 63`, `button.tsx`, `FakePaneStream`, `triageManager.ts`, `nvmNode.ts`, `Profile`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **Why does `Ticket` connect `TicketCard.tsx` to `Contract Building & Slots`, `Ticket Action Panels`, `Core Domain Concepts`, `Live Terminal Views`, `DB Row Schemas & Mappers`, `Dev Dependencies`, `Runtime Dependencies`, `API Client Inputs`, `Chart Primitives`, `Session Hub Transcript`, `Slot State`, `Community 54`, `App.tsx`, `File Uploads`, `triageManager.ts`, `split.ts`, `App.tsx`, `usePrdSearch.ts`, `csv.ts`, `TicketCost.tsx`, `ColumnActionsMenu.tsx`, `triageManager.ts`, `DescriptionTab.tsx`, `.finishTicket`, `Profile`, `.start`, `useLocalDraft.ts`, `codexBinary.ts`, `TicketMeta.tsx`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **What connects `What this is`, `Commands`, `graphify` to the rest of the system?**
  _686 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Contract Building & Slots` be split into smaller, more focused modules?**
  _Cohesion score 0.02664002664002664 - nodes in this community are weakly interconnected._
- **Should `Terminals UI & Notifications` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._
- **Should `Desktop Bootstrap & Menus` be split into smaller, more focused modules?**
  _Cohesion score 0.11666666666666667 - nodes in this community are weakly interconnected._