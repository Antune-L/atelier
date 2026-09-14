# Graph Report - kanban-agents  (2026-09-14)

## Corpus Check
- 261 files · ~732,604 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2793 nodes · 8159 edges · 135 communities (111 shown, 24 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 57 edges (avg confidence: 0.67)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `73139700`
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
- codexCapabilities.ts
- TerminalView.tsx
- usePrdSearch.ts
- transcriptBuffer.ts
- AgentsView.tsx
- ProjectConfig
- FakePaneStream
- .addComment
- TicketConfigSummary.tsx
- useTickTimer.ts
- RunningServer
- splitManager.ts
- reviewPublishingGuard.ts
- coordinator.ts
- split.ts
- DescriptionTab.tsx
- TerminalSession
- usePrdSearch.ts
- usePrdSearch.ts
- nvmNode.ts
- SlotPips.tsx
- uploads.ts
- renderCollapsedDetails
- TicketOperations
- .start
- bootstrap.ts
- createMcpServer
- useLocalDraft.ts
- useTickTimer.ts
- profileMatching.test.ts
- AgentSessionEvent
- RunningServer
- isNotionUrl
- AgentsView.tsx
- useTickTimer.ts
- RunningServer
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
1. `Store` - 123 edges
2. `Ticket` - 108 edges
3. `cn()` - 79 edges
4. `SystemAdapter` - 75 edges
5. `createApiRoutes()` - 72 edges
6. `RealSystemAdapter` - 68 edges
7. `FakeSystemAdapter` - 64 edges
8. `SlotManager` - 54 edges
9. `ProjectInfo` - 50 edges
10. `DelegationManager` - 49 edges

## Surprising Connections (you probably didn't know these)
- `McpSettingsClient` --references--> `McpSettingsMetadata`  [EXTRACTED]
  src/web/src/lib/mcpSettings.ts → desktop/mcpRpc.ts
- `main()` --calls--> `assertCodexDowngradeSafe()`  [EXTRACTED]
  scripts/downgrade-codex-catalog.ts → src/server/db/schema.ts
- `main()` --calls--> `migrateCodexCatalog()`  [EXTRACTED]
  scripts/downgrade-codex-catalog.ts → src/server/db/schema.ts
- `ActiveReviewPass` --references--> `ResolvedExecution`  [EXTRACTED]
  src/server/agents/delegationManager.ts → src/server/agents/executionConfig.ts
- `TriageSessionInput` --references--> `Orchestrator`  [EXTRACTED]
  src/server/agents/sessionConfig.ts → src/shared/constants.ts

## Import Cycles
- 3-file cycle: `src/server/config.ts -> src/server/db/store.ts -> src/server/db/rows.ts -> src/server/config.ts`
- 3-file cycle: `src/server/agents/worktreeAddresses.ts -> src/server/config.ts -> src/server/db/store.ts -> src/server/agents/worktreeAddresses.ts`

## Communities (135 total, 24 thin omitted)

### Community 0 - "Contract Building & Slots"
Cohesion: 0.04
Nodes (47): ActionExecutionOptions, actionExecutionOptionsSchema, agentMessageSchema, appSettingsSchema, automationRunSchema, automationSchema, baseBranchSchema, capabilitiesSchema (+39 more)

### Community 1 - "Terminals UI & Notifications"
Cohesion: 0.10
Nodes (20): analyzeTicketsInputSchema, analyzeTicketsOutputSchema, columnSchema, compactTicketSchema, createTodoTicketOutputSchema, editableTicketSchema, listProjectsInputSchema, listProjectsOutputSchema (+12 more)

### Community 2 - "Desktop Bootstrap & Menus"
Cohesion: 0.10
Nodes (14): dryRunLog, FAKE_OPEN_PRS, fakeEncoder, GitWorktreeAddOptions, ImportNotionOptions, PaneSize, PrepareReviewWorktreeOptions, ReviewPublicationComment (+6 more)

### Community 3 - "Feasibility Batch Management"
Cohesion: 0.07
Nodes (36): log, ToolHandler, ToolResult, TRIAGE_VERDICTS, AgentSettableStage, agentSettableStageSchema, askUserArgsSchema, AssertNamesCovered (+28 more)

### Community 4 - "Ticket Action Panels"
Cohesion: 0.13
Nodes (11): WsClientEvent, active, ensureNotificationPermission(), getAudioContext(), isSupported(), loadSoundBuffer(), playBuffer(), playNotificationSound() (+3 more)

### Community 5 - "Fake System Adapter"
Cohesion: 0.09
Nodes (20): AnalyzeTicketsInput, Capabilities, CreateAskInput, CreateCleanInput, CreateCommentInput, CreateProfileInput, CreateProjectInput, CreateReviewInput (+12 more)

### Community 6 - "Shared Zod Schemas"
Cohesion: 0.14
Nodes (24): PrdAnnotator(), PrdAnnotatorProps, BREADCRUMB, NO_ANNOTATIONS, PrdReviewDialog(), PrdReviewDialogProps, PrdView(), DraftUpdate (+16 more)

### Community 7 - "Settings & Profiles UI"
Cohesion: 0.08
Nodes (4): delay(), fakeShellPrompt(), FakeSystemAdapter, hexToBytes()

### Community 8 - "PR Selection & Slots Bar"
Cohesion: 0.14
Nodes (17): StatEmpty(), ACTIVE_BAR, AREA_CURSOR, AXIS_PROPS, BAR_CURSOR, CHART_PALETTE, colorAt(), DurationBars() (+9 more)

### Community 9 - "Real System Adapter"
Cohesion: 0.06
Nodes (50): COMMIT_LANGUAGE_LABELS, COMMIT_LANGUAGES, CodexAgentFields(), CodexConnectionStatus(), STATUS_LABELS, AppearanceSettings(), CODEX_STATUS_TONES, COMMIT_ROW (+42 more)

### Community 10 - "Slot Config & Worktree Watch"
Cohesion: 0.15
Nodes (14): terminalServerMessageSchema, FullscreenToggle(), FullscreenToggleProps, badgeLabelFor(), LiveTerminal(), LiveTerminalOptions, LiveTerminalProps, TerminalCell() (+6 more)

### Community 11 - "Core Domain Concepts"
Cohesion: 0.04
Nodes (49): agentMessageRowSchema, AutomationRow, automationRowSchema, AutomationRunRow, automationRunRowSchema, buildScripts(), CommentRow, commentRowSchema (+41 more)

### Community 12 - "Board & Sidebar Layout"
Cohesion: 0.09
Nodes (8): RealSystemAdapter, reviewApiEndpoint(), runBoundedReviewCommand(), safeJsonParse(), DoneGateResult, PublishReviewResult, ReviewDoneOptions, ReviewHeadResult

### Community 13 - "Database Store Operations"
Cohesion: 0.12
Nodes (23): main(), scalar(), assertCodexDowngradeSafe(), backfillOrchestrator(), countRows(), createDatabase(), EXECUTION_MIGRATIONS, hasColumn() (+15 more)

### Community 14 - "Coordinator & Protocol"
Cohesion: 0.10
Nodes (13): resolveBaseBranch(), groupFeasibilityTickets(), SlotManager, slotPath(), slugify(), resolveTemplatePaths(), computeWorktreeAddresses(), getProject() (+5 more)

### Community 15 - "API Routes & Reformulate"
Cohesion: 0.08
Nodes (37): ProfileConfig, agentEffortSchema, agentModelSchema, codexEffortSchema, codexModelSchema, Profile, DragHandleAttributes, DragHandleListeners (+29 more)

### Community 16 - "Stats Aggregation"
Cohesion: 0.12
Nodes (11): mapCommentRow(), createApiRoutes(), createSplitChildren(), failSplitMother(), isBlocked(), isSplitMother(), PaneReader, performSplit() (+3 more)

### Community 17 - "Triage & Server Hub"
Cohesion: 0.08
Nodes (25): devDependencies, autoprefixer, class-variance-authority, clsx, concurrently, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities (+17 more)

### Community 18 - "Live Terminal Views"
Cohesion: 0.13
Nodes (31): buildAskContract(), buildCleanContract(), buildConflictResolutionContract(), buildFeasibilityBatchContract(), buildFeasibilityContextSection(), buildImplementingSteps(), buildMockupReviewStep(), buildPlanningStep() (+23 more)

### Community 19 - "Stage Progress & Display"
Cohesion: 0.08
Nodes (24): compilerOptions, allowImportingTsExtensions, baseUrl, esModuleInterop, isolatedModules, jsx, lib, module (+16 more)

### Community 20 - "Real Adapter GH/Composer"
Cohesion: 0.11
Nodes (22): Kind, KINDS, CodexTierSummary(), DurationChart(), effectiveWorkDurationMs(), CodexTierSummary, DurationGroup, effectiveEffortLabel() (+14 more)

### Community 21 - "Store Types & Agent Knobs"
Cohesion: 0.14
Nodes (17): AGENT_EFFORTS, AGENT_MODELS, AUTOMATION_TRIGGER_LABELS, AUTOMATION_TRIGGERS, AutomationRunStatus, CreateAutomationInput, AutomationCard(), AutomationCardProps (+9 more)

### Community 22 - "DB Row Schemas & Mappers"
Cohesion: 0.14
Nodes (21): ColumnActionsMenu(), ColumnActionsMenuProps, ColumnMenuItem, ActionContext, buildActions(), ConfirmSpec, errorMessage(), RETRY_STAGES (+13 more)

### Community 23 - "Dev Dependencies"
Cohesion: 0.11
Nodes (16): TicketCreationRequestConflictError, AnalyzeTicketRejectionReason, AnalyzeTicketsResult, CreateTodoTicketInput, createTodoTicketInputSchema, CreateTodoTicketResult, log, normalizeCreateInput() (+8 more)

### Community 24 - "TypeScript Config"
Cohesion: 0.11
Nodes (26): logRejection(), ensureClaudeBinary(), bashCommandSchema, buildSettings(), claudeProvider, createSdkAgentSession(), denyBashHook(), denyNoVerifyHook (+18 more)

### Community 25 - "Client Hub & Watchdog"
Cohesion: 0.09
Nodes (20): log, SlotWatch, WorktreeAddressWatcher, log, applyAppSettingsToModels(), listProjectKeys(), PROJECT_ROOT, projectConfigSchema (+12 more)

### Community 26 - "Cost & Pricing"
Cohesion: 0.06
Nodes (30): renderCollapsedFinding(), BoundedCommandResult, CLAUDE_JSON_PATH, COMPOSER_BINARIES, detectInstallCommand(), extractPrUrl(), ghPrHeadSchema, ghPrSchema (+22 more)

### Community 27 - "Workflow View & Lifecycle"
Cohesion: 0.06
Nodes (27): Architecture, Commands, Conventions (enforced — beyond the global ones in ~/.claude/CLAUDE.md), graphify, The dry-run safety model — read before running anything, What this is, Agent runtime (Agent SDK), Architecture (+19 more)

### Community 28 - "Stats Charts"
Cohesion: 0.07
Nodes (40): AgentMcpServerDefinition, agentMessageDeltaSchema, agentToml(), buildMcpServers(), ConfigObject, configReadResponseSchema, ConfigValue, describeCodexError() (+32 more)

### Community 29 - "Session Hub & Agent Session"
Cohesion: 0.24
Nodes (5): runFirstBootSetup(), startServer(), migrateConfigJsonIfPresent(), parseLegacyConfig(), createTicketOperations()

### Community 30 - "Agents View & Ticket Cards"
Cohesion: 0.11
Nodes (26): assertExecutionAvailable(), CODEX_LAUNCH_STATUS_MESSAGES, CodexCapabilityReader, ExecutionDefaults, FEASIBILITY_ENGINE_EXECUTION, ResolvedExecution, resolveExecution(), resolveFeasibilityExecution() (+18 more)

### Community 31 - "PRD Review & Markdown"
Cohesion: 0.06
Nodes (33): buildNotionImportPrompt(), buildPrdPrompt(), agentPairError(), cleanDescription(), isWebOnlyPath(), jsonError(), log, reviewDescription() (+25 more)

### Community 32 - "User Terminal & Fake IO"
Cohesion: 0.09
Nodes (31): BASH_ALLOWLIST, buildFeasibilitySessionConfig(), buildImplementSessionConfig(), buildSplitSessionConfig(), buildTriageSessionConfig(), CODEX_READONLY_TOOLS, codexImplementerKnobs(), codexKnobs() (+23 more)

### Community 33 - "Logging"
Cohesion: 0.10
Nodes (21): scripts, build:desktop, build:web, dev, dev:desktop, dev:proxy, dev:server, dev:web (+13 more)

### Community 34 - "Board Columns"
Cohesion: 0.09
Nodes (24): CodexAppServerInitializationError, CodexAppServerProtocolError, CodexAppServerRpcError, connectCodexAppServer(), incomingSchema, initializeResponseSchema, log, PendingRequest (+16 more)

### Community 35 - "NPM Scripts"
Cohesion: 0.15
Nodes (4): AgentCoordinator, SessionToolCall, addUsageByModel(), toUsageByModel()

### Community 36 - "Runtime Dependencies"
Cohesion: 0.06
Nodes (48): Comment, ProviderRow(), FILLED_GLYPH_COLORS, StageProgressBar(), StageProgressBarProps, ActivityTab(), ActivityTabProps, isUnanswered() (+40 more)

### Community 37 - "Claude SDK Provider"
Cohesion: 0.09
Nodes (23): dependencies, @anthropic-ai/claude-agent-sdk, dompurify, elysia, @fontsource/ibm-plex-mono, @fontsource/ibm-plex-sans, marked, @modelcontextprotocol/sdk (+15 more)

### Community 38 - "Agent Profile Config"
Cohesion: 0.09
Nodes (9): AutomationManager, mapAutomationRow(), mapAutomationRunRow(), mapWorktreeSessionRow(), enrichWorktreeSession(), Automation, AutomationRun, WorktreeSession (+1 more)

### Community 39 - "Agent Coordinator Handlers"
Cohesion: 0.10
Nodes (28): artifactPath, assertPackageVersionInSync(), assertSdkVersionsInSync(), BUILT_DMG, ELECTROBUN_BIN, fail(), installedPackageVersion(), RELEASE_FOLDER (+20 more)

### Community 40 - "API Client Inputs"
Cohesion: 0.17
Nodes (32): ExecutionOverrides, ProjectKey, AutomationPatch, NewAsk, NewAutomation, NewClean, NewProfile, NewReview (+24 more)

### Community 41 - "Ticket Config & Constants"
Cohesion: 0.13
Nodes (6): CodexAppServerConnection, CodexAppServerNotification, CodexAppServerOptions, CodexProviderDependencies, AppServerFixture, CodexRuntimeDependencies

### Community 43 - "Demo Pipeline Concepts"
Cohesion: 0.11
Nodes (29): AppSettings, McpSettings(), isPositiveIntegerString(), isValidDraft(), ProjectListRow(), ProjectListRowProps, ProjectPanel(), ProjectPanelProps (+21 more)

### Community 44 - "Chart Primitives"
Cohesion: 0.18
Nodes (17): COLUMN_SORT_FIELD, BoardColumn(), compareFamilyMembers(), familyKeyOf(), groupTicketIds(), groupTicketsByFamily(), isSplitMother(), readCollapsed() (+9 more)

### Community 45 - "Session Hub Transcript"
Cohesion: 0.17
Nodes (14): CompactTicket, ListTicketsInput, Column, COLUMN_LABELS, columnSchema, BoardColumnProps, TerminalColumnsPanelProps, STATUS_CONFIRMS (+6 more)

### Community 46 - "Community 46"
Cohesion: 0.27
Nodes (15): Agent Implementation Config, Argus Code Review, Automated Tests (typecheck/lint/test), Claude Code Autonomous Agent, Ticket Contract Injection, Feasibility Analysis, Kanban Board (Atelier), Kanban Agents Demo (demo.gif) (+7 more)

### Community 47 - "Modal Dialogs"
Cohesion: 0.14
Nodes (18): cleanTicket(), conflictTicket(), REVIEW_OPTS, reviewTicket(), TICKET_OPTS, CHILD_USAGE, FULL_REVIEW_KINDS, LIGHT_REVIEW_KINDS (+10 more)

### Community 48 - "Community 48"
Cohesion: 0.12
Nodes (12): createCodexAgentSession(), inheritedMcpServerNames(), PreparedHook, prepareSkills(), threadConfig(), hasExplicitCodexApiKey(), isProtocolIncompatibility(), listRuntimeModels() (+4 more)

### Community 49 - "Slot State"
Cohesion: 0.09
Nodes (15): log, setup(), ReformulateManager, SessionHub, log, ReclaimOutcome, SETUP_PHASES, SlotManagerConfig (+7 more)

### Community 50 - "Stats Hooks & Cards"
Cohesion: 0.16
Nodes (12): ChartConfig, ChartContainer, ChartContainerProps, ChartContext, ChartContextValue, ChartLegendContent(), ChartLegendContentProps, ChartTooltipContent() (+4 more)

### Community 51 - "Community 51"
Cohesion: 0.33
Nodes (9): useTheme(), UseThemeResult, applyTheme(), getStoredTheme(), isTheme(), Theme, ThemeOption, THEMES (+1 more)

### Community 52 - "chart.tsx"
Cohesion: 0.08
Nodes (11): startFeasibilityTicket(), mapAgentMessageRow(), mapExecutionRunRow(), mapProfileRow(), mapTicketRow(), nullableBooleanValue(), SqlUpdateBuilder, Store (+3 more)

### Community 53 - "User Terminal Manager"
Cohesion: 0.33
Nodes (5): CONTEXT — domain glossary, Execution, Proposed (not yet built), Seams, Work items

### Community 54 - "Community 54"
Cohesion: 0.08
Nodes (34): AGENT_EFFORT_FULL_LABELS, AGENT_EFFORT_LABELS, AGENT_MODEL_FULL_LABELS, AGENT_MODEL_LABELS, AUTOMATION_RUN_STATUSES, CODEX_EFFORT_FULL_LABELS, CODEX_EFFORT_LABELS, CODEX_MODEL_EFFORTS (+26 more)

### Community 55 - "App.tsx"
Cohesion: 0.13
Nodes (6): FeasibilityBatchManager, toTriageResult(), TriageManager, RouteDeps, FeasibilityResult, TriageResult

### Community 56 - "CSV Parsing"
Cohesion: 0.11
Nodes (4): startParentSession(), SessionHubHandlers, SessionStartCallbacks, WorkerToolName

### Community 57 - "Community 57"
Cohesion: 0.17
Nodes (17): ensureConfig(), boot(), externalUrlFromNewWindowEvent(), forwardAtelierShortcut(), installApplicationMenu(), installMenuShortcutBridge(), menuShortcutActionSchema, navigationEventSchema (+9 more)

### Community 59 - "triageManager.ts"
Cohesion: 0.20
Nodes (16): buildContractConstraintsLines(), buildResponseFormatLines(), buildStrictRulesLines(), buildTicketLines(), buildTriageChannelPrompt(), buildTriagePlusChannelPrompt(), isEnglish(), readOnlyFramingLines() (+8 more)

### Community 60 - "Package Manifest"
Cohesion: 0.12
Nodes (21): ActiveReviewPass, log, orderedReviewKinds(), renderFinding(), renderPersistedReviewResult(), REVIEW_DISALLOWED_TOOLS, REVIEW_REPORT_LABELS_EN, REVIEW_REPORT_LABELS_FR (+13 more)

### Community 61 - "splitManager.ts"
Cohesion: 0.21
Nodes (19): applySizes(), collectTerminalIds(), findLeaf(), firstLeafId(), LeafNode, leafNodeSchema, makeLeaf(), nextNodeId() (+11 more)

### Community 63 - "Community 63"
Cohesion: 0.09
Nodes (29): DEFAULT_MODELS, AttachExecutionSessionInput, EnqueueAgentMessageInput, FinalizeExecutionInput, MarkAgentMessageAcceptedInput, MarkAgentMessageReceivedInput, MarkAgentMessageRejectedInput, NewProject (+21 more)

### Community 64 - "Composer Run Script"
Cohesion: 0.15
Nodes (22): ExecutionFinishStatus, LiveSession, log, PendingSessionMessage, previewToolInput(), renderSessionEvent(), SessionExecutionContext, SessionExecutionFinish (+14 more)

### Community 66 - "OpenPr"
Cohesion: 0.06
Nodes (5): reviewPublicationState(), SystemAdapter, log, UserTerminalManager, TerminalDescriptor

### Community 67 - "UserTerminalManager"
Cohesion: 0.15
Nodes (14): StatRecord, QuitConfirmModal(), QuitConfirmModalProps, StatCard(), StatCardProps, StatsView(), StatsViewProps, AlertDialog() (+6 more)

### Community 68 - "schema.test.ts"
Cohesion: 0.20
Nodes (5): reviewKey(), reviewPrompt(), verificationPrompt(), dedupeIdenticalFindings(), mergeAgentUsageByModel()

### Community 69 - "contract.test.ts"
Cohesion: 0.14
Nodes (22): ReviewResult, dedupeFindings(), DimensionFinding, findingAnchor(), FRENCH_STOP_WORD_PATTERN, FRENCH_STOP_WORDS, hasSimilarSummary(), isSameDefect() (+14 more)

### Community 70 - "CodexRuntimeStatus"
Cohesion: 0.18
Nodes (15): isCodexFastServiceTier(), summarizeSessionCosts(), totalTokensOfSessions(), executionCosts(), executionTokens(), projectStatRecord(), CostSummary(), MetaRow() (+7 more)

### Community 71 - "PostCSS Config"
Cohesion: 0.29
Nodes (6): name, overrides, zod, private, type, version

### Community 72 - "App.tsx"
Cohesion: 0.20
Nodes (14): AgentCard(), STATE_STRIPE_COLORS, TicketCard(), TicketCardProps, TriageDot(), truncateParentTitle(), ANIMATED_STAGES, formatRelativeDuration() (+6 more)

### Community 73 - "TerminalView.tsx"
Cohesion: 0.17
Nodes (3): childTranscriptPrefix(), DelegationManager, ReviewReportLabels

### Community 74 - "button.tsx"
Cohesion: 0.12
Nodes (11): analyzeResultSchema, compactTicketSchema, createResultSchema, errorResultSchema, projectResultSchema, startResultSchema, structuredContentResultSchema, textContentResultSchema (+3 more)

### Community 75 - "FakePaneStream"
Cohesion: 0.36
Nodes (13): buildProfilePipeline(), claudeDetail(), claudeSubagentDetail(), codexOrchestratorDetail(), codexSubagentParts(), describeProfile(), implementerNodeValue(), implementerSummary() (+5 more)

### Community 76 - "usePrdSearch.ts"
Cohesion: 0.16
Nodes (14): costByFamily(), costOf(), costOfModel(), costOfSessions(), CostSummary, FamilyPricing, ModelFamily, normalizeModel() (+6 more)

### Community 78 - "csv.ts"
Cohesion: 0.06
Nodes (46): wsClientEventSchema, App(), HOME_VIEW_OPTIONS, HomeView, AutomationView(), NAV_ENTRIES, NavEntry, Sidebar() (+38 more)

### Community 79 - "WorktreeSession"
Cohesion: 0.33
Nodes (3): listeners, mcp, ReplyArgsSchema

### Community 80 - "recordedAction.ts"
Cohesion: 0.23
Nodes (17): alternation(), COMMAND_WRAPPERS, commandSegments(), commandWords(), executableName(), launchedPackageScript(), launchesTypecheck(), OPTIONS_WITH_VALUE (+9 more)

### Community 81 - "terminalManager.ts"
Cohesion: 0.28
Nodes (13): abortReason(), computeCodeFingerprint(), FingerprintEntry, FingerprintPhase, hashFingerprintPaths(), isMissingFileError(), listFingerprintPaths(), log (+5 more)

### Community 86 - "codexCapabilities.ts"
Cohesion: 0.24
Nodes (10): TERMINAL_STAGES, applyTranscriptUpdate(), TranscriptState, transcriptText(), transcriptUpdateSchema, TerminalData, TerminalView(), TerminalViewProps (+2 more)

### Community 87 - "TerminalView.tsx"
Cohesion: 0.22
Nodes (4): McpTokenSource, createMcpSettingsController(), McpSettingsControllerDependencies, temporaryDirectories

### Community 89 - "usePrdSearch.ts"
Cohesion: 0.40
Nodes (5): MIME_EXTENSIONS, resolveExtension(), SavedUpload, saveUpload(), serveUpload()

### Community 90 - "transcriptBuffer.ts"
Cohesion: 0.14
Nodes (19): isProcessing(), ACTIVE_STAGES, COLUMN_ORDER, COLUMNS, ACTIVE_COLUMNS, Board(), BoardProps, isColumn() (+11 more)

### Community 91 - "AgentsView.tsx"
Cohesion: 0.22
Nodes (8): AtelierDesktopRpcSchema, DesktopRequests, McpSettingsMetadata, WebviewRequests, McpSettingsController, createMcpSettingsClient(), getMcpSettingsClient(), McpSettingsClient

### Community 92 - "ProjectConfig"
Cohesion: 0.10
Nodes (13): AckSystem, ActiveDelegation, ActiveReview, ClosableExecution, RecordedSession, RecordingSystemAdapter, RecordingSystem, RecordedSession (+5 more)

### Community 93 - "FakePaneStream"
Cohesion: 0.15
Nodes (8): sleep(), startAndApproveReviews(), submitReviews(), mapReviewApprovalRow(), mapReviewPassRow(), parsePersistedReviewFindings(), PersistedReviewResult, ReviewKind

### Community 94 - ".addComment"
Cohesion: 0.16
Nodes (10): canonicalJson(), CodexCommandHook, codexSessionPreToolUseHookHash(), JsonValue, createCodexProvider(), AppServerFixtureOptions, hookPathForSession(), options() (+2 more)

### Community 95 - "TicketConfigSummary.tsx"
Cohesion: 0.50
Nodes (3): appBundle, EMBEDDED_BINARIES, resourcesApp

### Community 97 - "RunningServer"
Cohesion: 0.11
Nodes (18): ANSI, appendToLogFile(), COLOR_ENABLED, disableFileLogging(), initLogFile(), isLevel(), Level, LEVEL_ORDER (+10 more)

### Community 98 - "splitManager.ts"
Cohesion: 0.21
Nodes (13): FAILURE_COLUMNS, SUCCESS_COLUMNS, OutcomeChart(), SuccessRateChart(), ThroughputChart(), nextWeek(), outcomeCounts(), projectCounts() (+5 more)

### Community 99 - "reviewPublishingGuard.ts"
Cohesion: 0.24
Nodes (10): GH_API_READ_METHOD_SET, GH_API_READ_METHODS, GH_API_WRITE_INPUT_PATTERN, GH_API_WRITE_LONG_FLAGS, GH_API_WRITE_METHODS, GH_API_WRITE_SHORT_FLAGS, GH_PR_PUBLISH_PATTERN, GH_PR_PUBLISH_SUBCOMMANDS (+2 more)

### Community 100 - "coordinator.ts"
Cohesion: 0.13
Nodes (11): directories, initializeParamsSchema, log, requestSchema, rpcError(), rpcResult(), rpcResponseSchema, toolCallParamsSchema (+3 more)

### Community 101 - "split.ts"
Cohesion: 0.22
Nodes (9): PrSelectRow(), KIND_BADGES, TicketBadges(), TicketBadgesProps, Badge(), BadgeProps, BadgeVariant, badgeVariants (+1 more)

### Community 102 - "DescriptionTab.tsx"
Cohesion: 0.11
Nodes (41): ProjectInfo, AgentProfileConfig(), AskPanelProps, CleanPrPanel(), CleanPrPanelProps, ImportTicketsPanel(), ImportTicketsPanelProps, NewTicketSheet() (+33 more)

### Community 103 - "TerminalSession"
Cohesion: 0.09
Nodes (14): RealPaneStream, PaneStream, dataMessage(), log, normalizeSeed(), safeParse(), send(), TerminalSession (+6 more)

### Community 104 - "usePrdSearch.ts"
Cohesion: 0.27
Nodes (11): groupOrientation(), layoutToSizes(), panelId(), panelPercent(), SplitTree(), SplitTreeProps, SplitOrientation, isShortcutDetail() (+3 more)

### Community 105 - "usePrdSearch.ts"
Cohesion: 0.27
Nodes (9): NOTE: Radix's dismissable layer registers its Escape listener on `document` in t, useCaptureEscape(), collectMatchRanges(), isShortcutDetail(), ShortcutDetail, supportsHighlightApi(), usePrdSearch(), UsePrdSearchOptions (+1 more)

### Community 106 - "nvmNode.ts"
Cohesion: 0.42
Nodes (7): bestInstalledMatch(), compareParts(), envWithProjectNode(), nvmNodeBinDir(), readNvmrc(), prepareProjectShell(), shellLiteral()

### Community 107 - "SlotPips.tsx"
Cohesion: 0.20
Nodes (5): FailedReformulation, ActionSystem, CapabilityCache, ReformulateOptions, CodexRuntimeStatus

### Community 108 - "uploads.ts"
Cohesion: 0.36
Nodes (7): effectivePort(), isAllowedHost(), isAllowedOrigin(), isAuthorized(), isLoopbackHost(), jsonResponse(), parseHost()

### Community 110 - "renderCollapsedDetails"
Cohesion: 0.33
Nodes (6): RFC-4180, CsvParseError, normalizeHeader(), ParsedTicketRow, ParsedTicketsCsv, parseTicketsCsv()

### Community 111 - "TicketOperations"
Cohesion: 0.20
Nodes (4): PublicMcpManager, isActive(), isBlocked(), TicketOperations

### Community 112 - ".start"
Cohesion: 0.20
Nodes (8): Block, blockText(), compactChunks(), firstCharCode(), TranscriptBuffer, trimBlockStart(), AgentStreamBlock, TranscriptUpdate

### Community 113 - "bootstrap.ts"
Cohesion: 0.36
Nodes (5): applyDesktopEnv(), DesktopRoots, ensureMcpToken(), regenerateMcpToken(), temporaryDirectories

### Community 114 - "createMcpServer"
Cohesion: 0.53
Nodes (5): createMcpServer(), invalidInput(), OutputValidator, toolError(), toolResult()

### Community 115 - "useLocalDraft.ts"
Cohesion: 0.09
Nodes (24): AskPanel(), DescriptionEdit, DescriptionTab(), DescriptionTabProps, NOTE: the draft now mirrors what was persisted, so it is no longer unsent text., OverviewTab(), OverviewTabProps, SUMMARY_COLUMNS (+16 more)

### Community 118 - "AgentSessionEvent"
Cohesion: 0.39
Nodes (4): SessionHandlerError, AgentProvider, AgentSessionEvent, runOneShotSession()

### Community 119 - "RunningServer"
Cohesion: 0.11
Nodes (13): SplitManager, ClientSocket, PROJECT_ROOT, NOTE: PRD generation holds the request open up to ~120s (REFORMULATE_TIMEOUT_MS), resolveServerPort(), serveStaticAsset(), SocketData, StartServerOptions (+5 more)

### Community 121 - "AgentsView.tsx"
Cohesion: 0.39
Nodes (7): AgentCardProps, AgentsView(), AgentsViewProps, hasLiveAgent(), normalize(), resolveProjectColor(), resolveProjectLabel()

### Community 122 - "useTickTimer.ts"
Cohesion: 0.39
Nodes (7): currentNow, getSnapshot(), startTicking(), stopTicking(), subscribe(), subscribers, useTickTimer()

## Knowledge Gaps
- **634 isolated node(s):** `temporaryDirectories`, `three`, `menuShortcutActionSchema`, `newWindowEventSchema`, `navigationEventSchema` (+629 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **24 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Ticket` connect `TicketCard.tsx` to `Contract Building & Slots`, `Ticket Action Panels`, `Fake System Adapter`, `Real System Adapter`, `Core Domain Concepts`, `Coordinator & Protocol`, `Stats Aggregation`, `Live Terminal Views`, `DB Row Schemas & Mappers`, `Dev Dependencies`, `Agents View & Ticket Cards`, `PRD Review & Markdown`, `User Terminal & Fake IO`, `NPM Scripts`, `Runtime Dependencies`, `Agent Profile Config`, `API Client Inputs`, `Chart Primitives`, `Session Hub Transcript`, `Modal Dialogs`, `Slot State`, `chart.tsx`, `Community 54`, `triageManager.ts`, `Package Manifest`, `Community 63`, `split.ts`, `OpenPr`, `schema.test.ts`, `CodexRuntimeStatus`, `App.tsx`, `TerminalView.tsx`, `csv.ts`, `codexCapabilities.ts`, `transcriptBuffer.ts`, `ProjectConfig`, `FakePaneStream`, `split.ts`, `DescriptionTab.tsx`, `useLocalDraft.ts`, `AgentsView.tsx`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Why does `SystemAdapter` connect `OpenPr` to `Composer Run Script`, `Desktop Bootstrap & Menus`, `schema.test.ts`, `Agent Profile Config`, `Settings & Profiles UI`, `TerminalSession`, `SlotPips.tsx`, `Board & Sidebar Layout`, `Coordinator & Protocol`, `Slot State`, `App.tsx`, `RunningServer`, `TicketCard.tsx`, `Client Hub & Watchdog`, `Cost & Pricing`, `Package Manifest`, `FakePaneStream`, `Agents View & Ticket Cards`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **Why does `Store` connect `chart.tsx` to `Feasibility Batch Management`, `Core Domain Concepts`, `Database Store Operations`, `Coordinator & Protocol`, `Stats Aggregation`, `Live Terminal Views`, `Dev Dependencies`, `Client Hub & Watchdog`, `Session Hub & Agent Session`, `Agents View & Ticket Cards`, `PRD Review & Markdown`, `NPM Scripts`, `Agent Profile Config`, `Modal Dialogs`, `Slot State`, `App.tsx`, `Package Manifest`, `TicketCard.tsx`, `Community 63`, `schema.test.ts`, `FakePaneStream`, `TerminalSession`, `RunningServer`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `createApiRoutes()` (e.g. with `isWebOnlyPath()` and `.onEvent()`) actually correct?**
  _`createApiRoutes()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `temporaryDirectories`, `three`, `menuShortcutActionSchema` to the rest of the system?**
  _645 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Contract Building & Slots` be split into smaller, more focused modules?**
  _Cohesion score 0.04251700680272109 - nodes in this community are weakly interconnected._
- **Should `Terminals UI & Notifications` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._