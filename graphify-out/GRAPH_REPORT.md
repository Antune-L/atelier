# Graph Report - kanban-agents  (2026-09-25)

## Corpus Check
- 271 files · ~747,706 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3043 nodes · 8791 edges · 126 communities (118 shown, 8 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 60 edges (avg confidence: 0.67)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8a70b1ca`
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
- useAppSettings.ts
- StageProgressBar.tsx
- AgentMessage
- ProjectPanel.tsx
- usePrdSearch.ts
- createMcpServer
- projectDisplay.ts
- useSavedFlash.ts

## God Nodes (most connected - your core abstractions)
1. `Store` - 128 edges
2. `Ticket` - 113 edges
3. `SystemAdapter` - 76 edges
4. `createApiRoutes()` - 72 edges
5. `FakeSystemAdapter` - 68 edges
6. `RealSystemAdapter` - 66 edges
7. `cn()` - 66 edges
8. `SlotManager` - 57 edges
9. `VcsProvider` - 56 edges
10. `DelegationManager` - 50 edges

## Surprising Connections (you probably didn't know these)
- `McpSettingsClient` --references--> `McpSettingsMetadata`  [EXTRACTED]
  src/web/src/lib/mcpSettings.ts → desktop/mcpRpc.ts
- `AppearanceSettings()` --calls--> `matchesQuery()`  [EXTRACTED]
  src/web/src/components/SettingsModal.tsx → src/web/src/lib/search.ts
- `AgentDefaultsSettings()` --calls--> `matchesQuery()`  [EXTRACTED]
  src/web/src/components/SettingsModal.tsx → src/web/src/lib/search.ts
- `main()` --calls--> `assertCodexDowngradeSafe()`  [EXTRACTED]
  scripts/downgrade-codex-catalog.ts → src/server/db/schema.ts
- `main()` --calls--> `migrateCodexCatalog()`  [EXTRACTED]
  scripts/downgrade-codex-catalog.ts → src/server/db/schema.ts

## Import Cycles
- 3-file cycle: `src/server/config.ts -> src/server/db/store.ts -> src/server/db/rows.ts -> src/server/config.ts`
- 3-file cycle: `src/server/agents/worktreeAddresses.ts -> src/server/config.ts -> src/server/db/store.ts -> src/server/agents/worktreeAddresses.ts`

## Communities (126 total, 8 thin omitted)

### Community 0 - "Contract Building & Slots"
Cohesion: 0.04
Nodes (68): ActionExecutionOptions, actionExecutionOptionsSchema, agentMessageSchema, AnalyzeTicketsInput, appSettingsSchema, automationRunSchema, automationSchema, baseBranchSchema (+60 more)

### Community 1 - "Terminals UI & Notifications"
Cohesion: 0.09
Nodes (27): analyzeTicketsInputSchema, analyzeTicketsOutputSchema, columnSchema, compactTicketSchema, createTodoTicketOutputSchema, editableTicketSchema, effectivePort(), isAllowedHost() (+19 more)

### Community 2 - "Desktop Bootstrap & Menus"
Cohesion: 0.09
Nodes (23): connectCodexAppServer(), CodexBinaryVersionError, require, resolveCodexBinary(), resolveCodexBinaryOverride(), TARGETS, verifyCodexBinaryVersion(), createCodexAgentSession() (+15 more)

### Community 3 - "Feasibility Batch Management"
Cohesion: 0.08
Nodes (23): TRIAGE_VERDICTS, AgentSettableStage, agentSettableStageSchema, AssertNamesCovered, channelEventSchema, delegateImplementationArgsSchema, delegateReviewArgsSchema, doneArgsSchema (+15 more)

### Community 4 - "Ticket Action Panels"
Cohesion: 0.11
Nodes (12): AckSystem, ActiveDelegation, ClosableExecution, RecordedSession, RecordingSystem, RecordedSession, RecordingSystem, RelaunchSystem (+4 more)

### Community 5 - "Fake System Adapter"
Cohesion: 0.14
Nodes (11): boundedCommandDetail(), runBoundedCommand(), safeJsonParse(), AzureDevopsVcsClient, prWebUrl(), readOriginRemote(), repoRefFromPrUrl(), repoRefFromRemote() (+3 more)

### Community 6 - "Shared Zod Schemas"
Cohesion: 0.15
Nodes (9): orderedReviewKinds(), renderPersistedReviewResult(), allowedReviewPasses(), requiredReviewKinds(), renderChannelEvent(), renderImplementationDone(), mapReviewApprovalRow(), mapReviewPassRow() (+1 more)

### Community 7 - "Settings & Profiles UI"
Cohesion: 0.08
Nodes (3): delay(), fakeShellPrompt(), FakeSystemAdapter

### Community 8 - "PR Selection & Slots Bar"
Cohesion: 0.16
Nodes (19): AgentCard(), STATE_STRIPE_COLORS, TicketCard(), TicketCardProps, TriageDot(), truncateParentTitle(), currentNow, getSnapshot() (+11 more)

### Community 9 - "Real System Adapter"
Cohesion: 0.26
Nodes (11): dragKeys(), groupCountLabel(), groupSortId(), ListGroup, ProjectList(), ProjectListProps, ProjectListRowProps, projectSortId() (+3 more)

### Community 10 - "Slot Config & Worktree Watch"
Cohesion: 0.12
Nodes (19): cleanTicket(), conflictTicket(), REVIEW_OPTS, reviewTicket(), TICKET_OPTS, CHILD_USAGE, FULL_REVIEW_KINDS, LIGHT_REVIEW_KINDS (+11 more)

### Community 11 - "Core Domain Concepts"
Cohesion: 0.04
Nodes (54): agentMessageRowSchema, AutomationRow, automationRowSchema, AutomationRunRow, automationRunRowSchema, CommentRow, commentRowSchema, executionRunRowSchema (+46 more)

### Community 12 - "Board & Sidebar Layout"
Cohesion: 0.05
Nodes (5): NewProject, ProjectPatch, RealSystemAdapter, SystemAdapter, VcsProvider

### Community 13 - "Database Store Operations"
Cohesion: 0.07
Nodes (56): RFC-4180, CommitLanguage, ProjectInfo, AgentsViewProps, AskPanel(), AskPanelProps, BoardProps, CleanPrPanel() (+48 more)

### Community 14 - "Coordinator & Protocol"
Cohesion: 0.09
Nodes (31): escapeHtml(), renderCollapsedDetails(), renderOutsideDiffComment(), renderOutsideDiffSection(), ReviewPublicationComment, azureChangeEntrySchema, azureCommentSchema, azureIdentitySchema (+23 more)

### Community 15 - "API Routes & Reformulate"
Cohesion: 0.14
Nodes (22): main(), scalar(), assertCodexDowngradeSafe(), backfillOrchestrator(), countRows(), createDatabase(), EXECUTION_MIGRATIONS, hasColumn() (+14 more)

### Community 16 - "Stats Aggregation"
Cohesion: 0.08
Nodes (6): SessionHubHandlers, SessionStartCallbacks, WorktreeAddressWatcher, spawnCodexAppServer(), getErrorMessage(), getErrorStack()

### Community 17 - "Triage & Server Hub"
Cohesion: 0.08
Nodes (25): devDependencies, autoprefixer, class-variance-authority, clsx, concurrently, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities (+17 more)

### Community 18 - "Live Terminal Views"
Cohesion: 0.08
Nodes (35): isReviewFixSession(), AZURE_BASH_ALLOWLIST, AZURE_CLEAN_BASH_ALLOWLIST, BASH_ALLOWLIST, bashAllowlist(), buildFeasibilitySessionConfig(), buildImplementSessionConfig(), buildSplitSessionConfig() (+27 more)

### Community 19 - "Stage Progress & Display"
Cohesion: 0.08
Nodes (24): compilerOptions, allowImportingTsExtensions, baseUrl, esModuleInterop, isolatedModules, jsx, lib, module (+16 more)

### Community 20 - "Real Adapter GH/Composer"
Cohesion: 0.09
Nodes (28): Kind, KINDS, CodexTierSummary(), DurationChart(), ThroughputChart(), effectiveWorkDurationMs(), CodexTierSummary, DurationGroup (+20 more)

### Community 21 - "Store Types & Agent Knobs"
Cohesion: 0.17
Nodes (26): buildFeasibilityBatchContract(), buildFeasibilityContextSection(), buildImplementingSteps(), buildMockupReviewStep(), buildPlanningStep(), buildPrdBullet(), buildReviewContract(), buildReviewFixLines() (+18 more)

### Community 22 - "DB Row Schemas & Mappers"
Cohesion: 0.30
Nodes (12): projectMatches(), ProjectsSettings(), readShowHidden(), referenceCommitTimeout(), writeShowHidden(), FilteredProjectGroup, filterProjectGroups(), GroupableProject (+4 more)

### Community 23 - "Dev Dependencies"
Cohesion: 0.08
Nodes (23): TicketCreationRequestConflictError, agentPairError(), AnalyzeTicketRejectionReason, AnalyzeTicketsResult, CompactTicket, CreateTodoTicketInput, createTodoTicketInputSchema, CreateTodoTicketResult (+15 more)

### Community 24 - "TypeScript Config"
Cohesion: 0.12
Nodes (24): ensureClaudeBinary(), bashCommandSchema, buildSettings(), claudeProvider, createSdkAgentSession(), denyBashHook(), denyNoVerifyHook, denyReviewPublishingHook (+16 more)

### Community 26 - "Cost & Pricing"
Cohesion: 0.17
Nodes (6): AutomationManager, mapAutomationRow(), mapAutomationRunRow(), AutomationRunStatus, Automation, AutomationRun

### Community 27 - "Workflow View & Lifecycle"
Cohesion: 0.06
Nodes (28): Architecture, Commands, Conventions (enforced — beyond the global ones in ~/.claude/CLAUDE.md), graphify, The dry-run safety model — read before running anything, What this is, Agent runtime (Agent SDK), Architecture (+20 more)

### Community 28 - "Stats Charts"
Cohesion: 0.07
Nodes (42): AgentMcpServerDefinition, agentMessageDeltaSchema, agentToml(), apiWriteDenyScript(), buildMcpServers(), ConfigObject, configReadResponseSchema, ConfigValue (+34 more)

### Community 29 - "Session Hub & Agent Session"
Cohesion: 0.18
Nodes (17): COLUMN_SORT_FIELD, BoardColumn(), compareFamilyMembers(), familyKeyOf(), groupTicketIds(), groupTicketsByFamily(), isSplitMother(), readCollapsed() (+9 more)

### Community 30 - "Agents View & Ticket Cards"
Cohesion: 0.16
Nodes (10): initializeParamsSchema, log, requestSchema, rpcError(), rpcResult(), toolCallParamsSchema, WorkerMcpHandlers, WorkerMcpManager (+2 more)

### Community 31 - "PRD Review & Markdown"
Cohesion: 0.16
Nodes (10): canonicalJson(), CodexCommandHook, codexSessionPreToolUseHookHash(), JsonValue, createCodexProvider(), AppServerFixtureOptions, hookPathForSession(), options() (+2 more)

### Community 32 - "User Terminal & Fake IO"
Cohesion: 0.13
Nodes (23): ExecutionFinishStatus, LiveSession, log, PendingSessionMessage, previewToolInput(), renderSessionEvent(), SessionExecutionContext, SessionExecutionFinish (+15 more)

### Community 33 - "Logging"
Cohesion: 0.10
Nodes (21): scripts, build:desktop, build:web, dev, dev:desktop, dev:proxy, dev:server, dev:web (+13 more)

### Community 34 - "Board Columns"
Cohesion: 0.39
Nodes (7): emit(), loadedSubscribers, loadOnce(), refreshProjects(), subscribers, useProjects(), useProjectsLoaded()

### Community 35 - "NPM Scripts"
Cohesion: 0.17
Nodes (6): addUsageByModel(), toUsageByModel(), mapTicketRow(), TicketLifecycle, failSplitMother(), Ticket

### Community 36 - "Runtime Dependencies"
Cohesion: 0.06
Nodes (46): AGENT_EFFORT_LABELS, AGENT_MODEL_LABELS, AUTOMATION_RUN_STATUSES, CODEX_EFFORT_FULL_LABELS, CODEX_EFFORT_LABELS, CODEX_MODEL_EFFORTS, CODEX_MODEL_LABELS, CODEX_SEED_PROFILE (+38 more)

### Community 37 - "Claude SDK Provider"
Cohesion: 0.09
Nodes (22): dependencies, @anthropic-ai/claude-agent-sdk, dompurify, elysia, @fontsource/ibm-plex-mono, @fontsource/ibm-plex-sans, marked, @modelcontextprotocol/sdk (+14 more)

### Community 38 - "Agent Profile Config"
Cohesion: 0.15
Nodes (16): costByFamily(), costOf(), costOfModel(), costOfSessions(), CostSummary, FamilyPricing, MODEL_PRICING, ModelFamily (+8 more)

### Community 39 - "Agent Coordinator Handlers"
Cohesion: 0.18
Nodes (17): adopt(), compareVersions(), detectionCandidates(), detectUserInstall(), downloadAndVerifyTarball(), downloadPinnedBinary(), emitProgress(), isCompatibleCli() (+9 more)

### Community 40 - "API Client Inputs"
Cohesion: 0.16
Nodes (5): childTranscriptPrefix(), DelegationManager, reviewKey(), mergeAgentUsageByModel(), AgentSessionEvent

### Community 41 - "Ticket Config & Constants"
Cohesion: 0.17
Nodes (17): isProcessing(), ACTIVE_STAGES, ColumnActionsMenu(), ColumnActionsMenuProps, ColumnMenuItem, ActionContext, buildActions(), ConfirmSpec (+9 more)

### Community 42 - "Ticket Detail & Triage UI"
Cohesion: 0.12
Nodes (23): FAILURE_COLUMNS, SUCCESS_COLUMNS, ACTIVE_BAR, AREA_CURSOR, AXIS_PROPS, BAR_CURSOR, CHART_PALETTE, colorAt() (+15 more)

### Community 43 - "Demo Pipeline Concepts"
Cohesion: 0.07
Nodes (15): FakePaneStream, RealPaneStream, PaneStream, dataMessage(), log, normalizeSeed(), safeParse(), send() (+7 more)

### Community 44 - "Chart Primitives"
Cohesion: 0.28
Nodes (13): abortReason(), computeCodeFingerprint(), FingerprintEntry, FingerprintPhase, hashFingerprintPaths(), isMissingFileError(), listFingerprintPaths(), log (+5 more)

### Community 45 - "Session Hub Transcript"
Cohesion: 0.12
Nodes (6): slotPath(), mapSlotRow(), mapWorktreeSessionRow(), enrichWorktreeSession(), WorktreeSession, BoardState

### Community 46 - "Community 46"
Cohesion: 0.27
Nodes (15): Agent Implementation Config, Argus Code Review, Automated Tests (typecheck/lint/test), Claude Code Autonomous Agent, Ticket Contract Injection, Feasibility Analysis, Kanban Board (Atelier), Kanban Agents Demo (demo.gif) (+7 more)

### Community 47 - "Modal Dialogs"
Cohesion: 0.20
Nodes (7): AZURE_COMMANDS, COMMANDS_BY_PROVIDER, GITHUB_COMMANDS, PrDiffContext, VcsCleanCommands, AZ_SETTLED_THREAD_STATUSES, VCS_PROVIDER_LABELS

### Community 48 - "Community 48"
Cohesion: 0.07
Nodes (42): Column, COLUMN_LABELS, COLUMN_ORDER, COLUMNS, PR_STATE_LABELS, ACTIVE_COLUMNS, Board(), isColumn() (+34 more)

### Community 49 - "Slot State"
Cohesion: 0.09
Nodes (21): WsClientEvent, wsClientEventSchema, ATTENTION_STATUSES, sessionOf(), SlotPips(), SlotPipsProps, STATUS_LABELS, STATUS_PIP_CLASSES (+13 more)

### Community 50 - "Stats Hooks & Cards"
Cohesion: 0.16
Nodes (12): ChartConfig, ChartContainer, ChartContainerProps, ChartContext, ChartContextValue, ChartLegendContent(), ChartLegendContentProps, ChartTooltipContent() (+4 more)

### Community 51 - "Community 51"
Cohesion: 0.06
Nodes (37): RecordingSystemAdapter, FailedReformulation, ActionSystem, CapabilityCache, directories, dryRunLog, fakeEncoder, hexToBytes() (+29 more)

### Community 52 - "repairPath.ts"
Cohesion: 0.13
Nodes (15): TERMINAL_STAGES, terminalServerMessageSchema, FullscreenToggle(), FullscreenToggleProps, badgeLabelFor(), LiveTerminal(), LiveTerminalOptions, LiveTerminalProps (+7 more)

### Community 53 - "User Terminal Manager"
Cohesion: 0.33
Nodes (5): CONTEXT — domain glossary, Execution, Proposed (not yet built), Seams, Work items

### Community 54 - "Community 54"
Cohesion: 0.07
Nodes (31): BoundedCommandResult, withJsonRequestFile(), ReviewPublicationEvent, connectionFailure(), connectionResult(), ghPrHeadSchema, ghPrSchema, ghPrStateSchema (+23 more)

### Community 55 - "App.tsx"
Cohesion: 0.21
Nodes (3): FeasibilityBatchManager, toTriageResult(), FeasibilityResult

### Community 56 - "CSV Parsing"
Cohesion: 0.07
Nodes (32): AUTOMATION_TRIGGER_LABELS, AUTOMATION_TRIGGERS, AutomationCard(), AutomationCardProps, AutomationFormProps, AutomationView(), EMPTY_FORM, formFromAutomation() (+24 more)

### Community 57 - "Community 57"
Cohesion: 0.24
Nodes (7): AtelierDesktopRpcSchema, McpSettingsMetadata, McpSettingsController, McpSettings(), createMcpSettingsClient(), getMcpSettingsClient(), McpSettingsClient

### Community 58 - "File Uploads"
Cohesion: 0.29
Nodes (9): gitMetadataWritableRoots(), agentBaseEnv(), bestInstalledMatch(), compareParts(), envWithProjectNode(), nvmNodeBinDir(), readNvmrc(), prepareProjectShell() (+1 more)

### Community 59 - "triageManager.ts"
Cohesion: 0.27
Nodes (15): buildContractConstraintsLines(), buildResponseFormatLines(), buildStrictRulesLines(), buildTicketLines(), buildTriageChannelPrompt(), buildTriagePlusChannelPrompt(), isEnglish(), readOnlyFramingLines() (+7 more)

### Community 60 - "Package Manifest"
Cohesion: 0.21
Nodes (10): sleep(), startAndApproveReviews(), submitReviews(), DEFAULT_FINDING_RENDER_STYLE, DimensionFinding, FULL_REVIEW_KINDS, LIGHT_REVIEW_KINDS, ReviewPass (+2 more)

### Community 61 - "splitManager.ts"
Cohesion: 0.08
Nodes (32): resolveBaseBranch(), buildAskContract(), buildCleanContract(), buildConflictResolutionContract(), assertExecutionAvailable(), resolveExecution(), resolveFeasibilityExecution(), resolveTicketExecution() (+24 more)

### Community 62 - "TicketCard.tsx"
Cohesion: 0.14
Nodes (23): PrdAnnotator(), PrdAnnotatorProps, BREADCRUMB, NO_ANNOTATIONS, PrdReviewDialog(), PrdReviewDialogProps, Textarea, DraftUpdate (+15 more)

### Community 63 - "Community 63"
Cohesion: 0.21
Nodes (12): App(), HOME_VIEW_OPTIONS, HomeView, useTheme(), UseThemeResult, applyTheme(), getStoredTheme(), isTheme() (+4 more)

### Community 64 - "Composer Run Script"
Cohesion: 0.19
Nodes (7): ReformulateManager, TriageManager, serializeErrorDetails(), Store, runRecordedAction(), RouteDeps, ExecutionRun

### Community 65 - "split.ts"
Cohesion: 0.29
Nodes (8): StatRecord, StatCard(), StatCardProps, StatEmpty(), StatsView(), StatsViewProps, useStats(), UseStatsResult

### Community 66 - "prUrl.ts"
Cohesion: 0.13
Nodes (9): setup(), setup(), SessionHub, DRY_RUN_RESULT, log, PendingSplit, SplitManager, initProjectRegistry() (+1 more)

### Community 67 - "TerminalView.tsx"
Cohesion: 0.10
Nodes (17): log, PROJECT_ROOT, NOTE: PRD generation holds the request open up to ~120s (REFORMULATE_TIMEOUT_MS), resolveDataFile(), resolveServerPort(), RunningServer, serveStaticAsset(), SocketData (+9 more)

### Community 68 - "schema.test.ts"
Cohesion: 0.04
Nodes (70): PrSelectRow(), NAV_ENTRIES, NavEntry, Sidebar(), SidebarProps, SidebarView, ActivityTab(), isUnanswered() (+62 more)

### Community 69 - "reviewFindings.ts"
Cohesion: 0.14
Nodes (21): ALSO_FLAGGED_PREFIX, dedupeFindings(), dedupeIdenticalFindings(), findingAnchor(), FRENCH_STOP_WORD_PATTERN, FRENCH_STOP_WORDS, hasSimilarSummary(), isSameDefect() (+13 more)

### Community 70 - "CodexRuntimeStatus"
Cohesion: 0.13
Nodes (16): CODEX_LAUNCH_STATUS_MESSAGES, CodexCapabilityReader, ExecutionDefaults, ExecutionOverrides, FEASIBILITY_ENGINE_EXECUTION, log, DRY_RUN_VERDICT, log (+8 more)

### Community 71 - "PostCSS Config"
Cohesion: 0.29
Nodes (6): name, overrides, zod, private, type, version

### Community 72 - "useAppSettings.ts"
Cohesion: 0.36
Nodes (4): ProjectConfig, buildScripts(), mapProjectRow(), parseWorktreePorts()

### Community 73 - "TerminalView.tsx"
Cohesion: 0.12
Nodes (26): CodexRuntimeModel, codexRuntimeModelSchema, codexRuntimeStatusSchema, pairedRuntimeCodexEffort(), UNKNOWN_CODEX_RUNTIME_STATUS, CodexAgentFields(), CodexConnectionStatus(), STATUS_LABELS (+18 more)

### Community 74 - "button.tsx"
Cohesion: 0.11
Nodes (18): log, logRejection(), ToolHandler, ToolResult, stalledEventPayload(), buildErrorDetails(), describeCause(), ErrorDetailsContext (+10 more)

### Community 75 - ".handleRequest"
Cohesion: 0.11
Nodes (13): analyzeResultSchema, compactTicketSchema, createResultSchema, errorResultSchema, ISOLATED_ENV_KEYS, projectResultSchema, savedEnv, startResultSchema (+5 more)

### Community 76 - "usePrdSearch.ts"
Cohesion: 0.27
Nodes (9): AgentCardProps, AgentsView(), hasLiveAgent(), normalize(), KIND_BADGES, TicketBadges(), TicketBadgesProps, resolveProjectColor() (+1 more)

### Community 78 - "csv.ts"
Cohesion: 0.06
Nodes (17): DoneGateResult, PublishReviewResult, ReviewHeadResult, ReviewPublicationState, FAKE_OPEN_PRS, FakeVcsClient, extractPrUrl(), githubPrHeadRef() (+9 more)

### Community 79 - "WorktreeSession"
Cohesion: 0.33
Nodes (3): listeners, mcp, ReplyArgsSchema

### Community 80 - "recordedAction.ts"
Cohesion: 0.23
Nodes (17): alternation(), COMMAND_WRAPPERS, commandSegments(), commandWords(), executableName(), launchedPackageScript(), launchesTypecheck(), OPTIONS_WITH_VALUE (+9 more)

### Community 81 - "index.ts"
Cohesion: 0.18
Nodes (16): boot(), externalUrlFromNewWindowEvent(), forwardAtelierShortcut(), installApplicationMenu(), installMenuShortcutBridge(), menuShortcutActionSchema, navigationEventSchema, newWindowEventSchema (+8 more)

### Community 82 - "TicketOperations"
Cohesion: 0.11
Nodes (12): CodexAppServerInitializationError, CodexAppServerNotification, CodexAppServerProtocolError, CodexAppServerRpcError, incomingSchema, initializeResponseSchema, log, PendingRequest (+4 more)

### Community 86 - "useTickTimer.ts"
Cohesion: 0.23
Nodes (10): artifactPath, assertPackageVersionInSync(), assertSdkVersionsInSync(), BUILT_DMG, ELECTROBUN_BIN, fail(), installedPackageVersion(), RELEASE_FOLDER (+2 more)

### Community 87 - "mcpSettings.ts"
Cohesion: 0.10
Nodes (56): DEFAULT_MODELS, ProjectKey, AttachExecutionSessionInput, AutomationPatch, EnqueueAgentMessageInput, FinalizeExecutionInput, MarkAgentMessageAcceptedInput, MarkAgentMessageReceivedInput (+48 more)

### Community 89 - "usePrdSearch.ts"
Cohesion: 0.36
Nodes (6): createMcpServer(), invalidInput(), listPublicProjects(), OutputValidator, toolError(), toolResult()

### Community 90 - "PaneStream"
Cohesion: 0.40
Nodes (5): MIME_EXTENSIONS, resolveExtension(), SavedUpload, saveUpload(), serveUpload()

### Community 91 - "bootstrap.ts"
Cohesion: 0.31
Nodes (6): applyDesktopEnv(), DesktopRoots, ensureConfig(), ensureMcpToken(), regenerateMcpToken(), temporaryDirectories

### Community 92 - "TerminalSessionManager"
Cohesion: 0.18
Nodes (15): isCodexFastServiceTier(), summarizeSessionCosts(), totalTokensOfSessions(), executionCosts(), executionTokens(), projectStatRecord(), CostSummary(), MetaRow() (+7 more)

### Community 93 - "ColumnActionsMenu.tsx"
Cohesion: 0.25
Nodes (7): Azure DevOps support — state file, Decisions (validated by the owner, 2026-09-21), Goal, Known blockers for lots 3 and 4, Open questions, Progress, Verified on this machine (az 2.90.0, azure-devops 1.0.8)

### Community 94 - ".addComment"
Cohesion: 0.10
Nodes (14): log, DRY_RUN_VERDICT, FeasibilityGroup, log, QueuedFeasibility, log, Watchdog, ClientHub (+6 more)

### Community 95 - "TicketConfigSummary.tsx"
Cohesion: 0.50
Nodes (3): appBundle, EMBEDDED_BINARIES, resourcesApp

### Community 97 - "RunningServer"
Cohesion: 0.13
Nodes (14): runFirstBootSetup(), applyAppSettingsToModels(), projectConfigSchema, buildAppSettingsPatch(), LegacyConfig, legacyConfigSchema, LegacyModels, log (+6 more)

### Community 98 - "usePrdSearch.ts"
Cohesion: 0.18
Nodes (6): DesktopRequests, McpTokenSource, WebviewRequests, createMcpSettingsController(), McpSettingsControllerDependencies, temporaryDirectories

### Community 99 - "reviewPublishingGuard.ts"
Cohesion: 0.07
Nodes (35): API_GUARDS, API_READ_METHOD_SET, ApiDenyPatterns, ApiGuard, AZ_INVOKE_COMMAND, AZ_INVOKE_METHOD_LONG_FLAGS, AZ_INVOKE_WRITE_INPUT_LONG_FLAGS, AZ_PR_WRITE_PATTERN (+27 more)

### Community 100 - ".startVerification"
Cohesion: 0.09
Nodes (24): ActiveReview, ActiveReviewPass, BOARD_FINDING_RENDER_STYLE, log, REVIEW_DISALLOWED_TOOLS, REVIEW_REPORT_LABELS, REVIEW_REPORT_LABELS_EN, REVIEW_REPORT_LABELS_FR (+16 more)

### Community 101 - "codexProvider.test.ts"
Cohesion: 0.20
Nodes (8): Block, blockText(), compactChunks(), firstCharCode(), TranscriptBuffer, trimBlockStart(), AgentStreamBlock, TranscriptUpdate

### Community 102 - ".start"
Cohesion: 0.09
Nodes (6): startFeasibilityTicket(), mapProfileRow(), mapTicketCreationRequestRow(), nullableBooleanValue(), SqlUpdateBuilder, Profile

### Community 103 - "TerminalSession"
Cohesion: 0.16
Nodes (3): SlotManager, ErrorDetailsSource, Slot

### Community 104 - "settings.tsx"
Cohesion: 0.17
Nodes (5): CodexAppServerConnection, CodexAppServerOptions, CodexProviderDependencies, AppServerFixture, CodexRuntimeDependencies

### Community 106 - "usePrdSearch.ts"
Cohesion: 0.09
Nodes (19): ANSI, appendToLogFile(), COLOR_ENABLED, disableFileLogging(), initLogFile(), isLevel(), Level, LEVEL_ORDER (+11 more)

### Community 107 - "azureRemote.ts"
Cohesion: 0.40
Nodes (10): azureOrgUrl(), fromAzureSegments(), fromCollectionSegments(), fromLegacySegments(), fromSshSegments(), parseAzureRepoRef(), parseRemoteLocation(), RemoteLocation (+2 more)

### Community 109 - "projectDisplay.ts"
Cohesion: 0.46
Nodes (5): buildSplitChannelPrompt(), buildTicketLines(), isEnglish(), extractFigmaUrls(), hasMockups()

### Community 110 - "Profile"
Cohesion: 0.10
Nodes (39): AGENT_EFFORT_FULL_LABELS, AGENT_MODEL_FULL_LABELS, ProfileConfig, Capabilities, AgentProfileConfig(), DragHandleAttributes, DragHandleListeners, ProfilePipeline() (+31 more)

### Community 112 - "useSavedFlash.ts"
Cohesion: 0.18
Nodes (6): renderCollapsedFinding(), renderFinding(), verifiedFindings(), FindingRenderStyle, finding(), passDimensionFindings()

### Community 113 - "repairPath.ts"
Cohesion: 0.27
Nodes (9): applyTranscriptUpdate(), TranscriptState, transcriptText(), transcriptUpdateSchema, TerminalData, TerminalView(), TerminalViewProps, NOTE: Radix's dismissable layer registers its Escape listener on `document` in t (+1 more)

### Community 114 - "ApiDenyPatterns"
Cohesion: 0.06
Nodes (37): buildNotionImportPrompt(), ProjectInUseError, cleanDescription(), createApiRoutes(), createSplitChildren(), isBlocked(), isSplitMother(), isWebOnlyPath() (+29 more)

### Community 115 - "relaunch.ts"
Cohesion: 0.29
Nodes (10): groupReviewCount(), initialExpandedGroups(), projectInitial(), ProjectSelect(), ProjectSelectOption, ProjectSelectProps, groupProjects(), projectGroupIdentity() (+2 more)

### Community 116 - "settings.tsx"
Cohesion: 0.07
Nodes (25): AgentDefaultsSettings(), AppearanceSettings(), CODEX_STATUS_TONES, COMMIT_ROW, DefaultsRowSpec, EFFORT_OPTIONS, FEASIBILITY_ROW, IMPLEMENTATION_ROW (+17 more)

### Community 117 - "useAppSettings.ts"
Cohesion: 0.28
Nodes (11): AppSettingsState, flashSaved(), loadOnce(), patchAppSettings(), publish(), snapshot(), state, subscribe() (+3 more)

### Community 118 - "StageProgressBar.tsx"
Cohesion: 0.25
Nodes (10): FILLED_GLYPH_COLORS, StageProgressBar(), StageProgressBarProps, CardState, DEAD_STAGES, PROGRESS_STAGES, stageCardState(), stageLabel() (+2 more)

### Community 120 - "ProjectPanel.tsx"
Cohesion: 0.31
Nodes (7): ConnectionHint, isPositiveIntegerString(), isValidDraft(), ProjectPanel(), ProjectPanelProps, TIMEOUT_UNITS, toVcsProvider()

### Community 121 - "usePrdSearch.ts"
Cohesion: 0.33
Nodes (7): isShortcutDetail(), ShortcutDetail, collectMatchRanges(), supportsHighlightApi(), usePrdSearch(), UsePrdSearchOptions, UsePrdSearchResult

### Community 122 - "createMcpServer"
Cohesion: 0.22
Nodes (4): PublicMcpManager, isActive(), isBlocked(), TicketOperations

### Community 123 - "projectDisplay.ts"
Cohesion: 0.38
Nodes (4): formatCommitTimeout(), TimeoutUnit, timeoutUnitMs(), timeoutUnitOf()

### Community 124 - "useSavedFlash.ts"
Cohesion: 0.50
Nodes (4): SavedFlag, SavedFlash, useSavedFlag(), useSavedFlash()

## Knowledge Gaps
- **692 isolated node(s):** `HomeView`, `HOME_VIEW_OPTIONS`, `ProjectSelectOption`, `ProjectSelectProps`, `THEME_OPTIONS` (+687 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Ticket` connect `NPM Scripts` to `Contract Building & Slots`, `Shared Zod Schemas`, `PR Selection & Slots Bar`, `Slot Config & Worktree Watch`, `Core Domain Concepts`, `Database Store Operations`, `Live Terminal Views`, `Store Types & Agent Knobs`, `Dev Dependencies`, `Client Hub & Watchdog`, `Session Hub & Agent Session`, `Runtime Dependencies`, `API Client Inputs`, `Ticket Config & Constants`, `Session Hub Transcript`, `Community 48`, `Slot State`, `repairPath.ts`, `triageManager.ts`, `Package Manifest`, `splitManager.ts`, `schema.test.ts`, `CodexRuntimeStatus`, `button.tsx`, `usePrdSearch.ts`, `mcpSettings.ts`, `TerminalSessionManager`, `.addComment`, `.startVerification`, `.start`, `TerminalSession`, `WorkflowView.tsx`, `projectDisplay.ts`, `useSavedFlash.ts`, `ApiDenyPatterns`, `StageProgressBar.tsx`?**
  _High betweenness centrality (0.071) - this node is a cross-community bridge._
- **Why does `Store` connect `Composer Run Script` to `Shared Zod Schemas`, `Slot Config & Worktree Watch`, `Core Domain Concepts`, `API Routes & Reformulate`, `Store Types & Agent Knobs`, `Dev Dependencies`, `Client Hub & Watchdog`, `Cost & Pricing`, `User Terminal & Fake IO`, `NPM Scripts`, `API Client Inputs`, `Demo Pipeline Concepts`, `Session Hub Transcript`, `Package Manifest`, `splitManager.ts`, `prUrl.ts`, `TerminalView.tsx`, `CodexRuntimeStatus`, `useAppSettings.ts`, `button.tsx`, `mcpSettings.ts`, `.addComment`, `RunningServer`, `.startVerification`, `.start`, `TerminalSession`, `useSavedFlash.ts`, `ApiDenyPatterns`, `AgentMessage`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Why does `DelegationManager` connect `API Client Inputs` to `Composer Run Script`, `prUrl.ts`, `NPM Scripts`, `.startVerification`, `TerminalView.tsx`, `Shared Zod Schemas`, `button.tsx`, `Slot Config & Worktree Watch`, `Stats Aggregation`, `useSavedFlash.ts`, `Package Manifest`, `splitManager.ts`, `.addComment`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `createApiRoutes()` (e.g. with `isWebOnlyPath()` and `.onEvent()`) actually correct?**
  _`createApiRoutes()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `HomeView`, `HOME_VIEW_OPTIONS`, `ProjectSelectOption` to the rest of the system?**
  _703 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Contract Building & Slots` be split into smaller, more focused modules?**
  _Cohesion score 0.03614916286149163 - nodes in this community are weakly interconnected._
- **Should `Terminals UI & Notifications` be split into smaller, more focused modules?**
  _Cohesion score 0.09113300492610837 - nodes in this community are weakly interconnected._