# Graph Report - kanban-agents  (2026-09-22)

## Corpus Check
- 273 files · ~746,114 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3014 nodes · 8236 edges · 135 communities (122 shown, 13 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 54 edges (avg confidence: 0.66)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `da7f9ba7`
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
- .handleRequest
- usePrdSearch.ts
- Community 77
- csv.ts
- WorktreeSession
- recordedAction.ts
- vcsCommands.ts
- Community 82
- Community 83
- TicketCost.tsx
- createMcpServer
- usePrdSearch.ts
- uploads.ts
- AgentsView.tsx
- useCapabilities.ts
- ColumnActionsMenu.tsx
- .addComment
- TicketConfigSummary.tsx
- useTickTimer.ts
- RunningServer
- triageManager.ts
- reviewPublishingGuard.ts
- .startVerification
- codexProvider.test.ts
- DescriptionTab.tsx
- TerminalSession
- reviewPass.ts
- .finishTicket
- .publishReviewUnderRepoLock
- azureRemote.ts
- reformulate.ts
- contract.test.ts
- Profile
- agentSession.ts
- AgentSessionEvent
- bootstrap.ts
- prUrl.ts
- useLocalDraft.ts
- settings.tsx
- WorkflowView.tsx
- connectCodexAppServer
- ColumnActionsMenu.tsx
- resolveTemplatePaths
- profileMatching.test.ts
- uploads.ts
- useTickTimer.ts
- createCodexProvider
- PrSelectRow.tsx
- useSavedFlash.ts
- useTerminalShortcuts.ts
- CodexProviderDependencies
- ApiDenyPatterns
- PreparedAgents
- Comment
- FakePaneStream
- KeyedMutex

## God Nodes (most connected - your core abstractions)
1. `Store` - 123 edges
2. `Ticket` - 113 edges
3. `SystemAdapter` - 75 edges
4. `cn()` - 74 edges
5. `FakeSystemAdapter` - 67 edges
6. `RealSystemAdapter` - 63 edges
7. `createApiRoutes()` - 61 edges
8. `SlotManager` - 55 edges
9. `VcsProvider` - 53 edges
10. `ProjectInfo` - 50 edges

## Surprising Connections (you probably didn't know these)
- `McpSettingsClient` --references--> `McpSettingsMetadata`  [EXTRACTED]
  src/web/src/lib/mcpSettings.ts → desktop/mcpRpc.ts
- `TriageSessionInput` --references--> `Orchestrator`  [EXTRACTED]
  src/server/agents/sessionConfig.ts → src/shared/constants.ts
- `SplitSessionInput` --references--> `Orchestrator`  [EXTRACTED]
  src/server/agents/sessionConfig.ts → src/shared/constants.ts
- `FeasibilitySessionInput` --references--> `Orchestrator`  [EXTRACTED]
  src/server/agents/sessionConfig.ts → src/shared/constants.ts
- `main()` --calls--> `migrateCodexCatalog()`  [EXTRACTED]
  scripts/downgrade-codex-catalog.ts → src/server/db/schema.ts

## Import Cycles
- 3-file cycle: `src/server/config.ts -> src/server/db/store.ts -> src/server/db/rows.ts -> src/server/config.ts`

## Communities (135 total, 13 thin omitted)

### Community 0 - "Contract Building & Slots"
Cohesion: 0.04
Nodes (68): ActionExecutionOptions, actionExecutionOptionsSchema, agentMessageSchema, AnalyzeTicketsInput, appSettingsSchema, automationRunSchema, automationSchema, baseBranchSchema (+60 more)

### Community 1 - "Terminals UI & Notifications"
Cohesion: 0.07
Nodes (36): analyzeTicketsInputSchema, analyzeTicketsOutputSchema, columnSchema, compactTicketSchema, createMcpServer(), createTodoTicketOutputSchema, editableTicketSchema, effectivePort() (+28 more)

### Community 2 - "Desktop Bootstrap & Menus"
Cohesion: 0.15
Nodes (4): SlotManager, mapSlotRow(), failSplitMother(), Slot

### Community 3 - "Feasibility Batch Management"
Cohesion: 0.06
Nodes (37): log, logRejection(), ToolHandler, ToolResult, addUsageByModel(), toUsageByModel(), TRIAGE_VERDICTS, AgentSettableStage (+29 more)

### Community 4 - "Ticket Action Panels"
Cohesion: 0.15
Nodes (20): AgentCard(), FILLED_GLYPH_COLORS, StageProgressBar(), StageProgressBarProps, STATE_STRIPE_COLORS, TicketCard(), TicketCardProps, TriageDot() (+12 more)

### Community 5 - "Fake System Adapter"
Cohesion: 0.07
Nodes (38): boundedCommandDetail(), BoundedCommandResult, runBoundedCommand(), safeJsonParse(), withJsonRequestFile(), azureChangeEntrySchema, azureCommentSchema, AzureDevopsVcsClient (+30 more)

### Community 6 - "Shared Zod Schemas"
Cohesion: 0.16
Nodes (10): codexImplementerKnobs(), assertCodexImplementerAvailable(), featureBranch(), log, ReclaimOutcome, reviewPublicationState(), SETUP_PHASES, SlotManagerConfig (+2 more)

### Community 7 - "Settings & Profiles UI"
Cohesion: 0.08
Nodes (4): delay(), fakeShellPrompt(), FakeSystemAdapter, ReviewDoneOptions

### Community 8 - "PR Selection & Slots Bar"
Cohesion: 0.10
Nodes (24): assertExecutionAvailable(), CODEX_LAUNCH_STATUS_MESSAGES, CodexCapabilityReader, ExecutionDefaults, ExecutionOverrides, FEASIBILITY_ENGINE_EXECUTION, ResolvedExecution, resolveExecution() (+16 more)

### Community 9 - "Real System Adapter"
Cohesion: 0.07
Nodes (29): COMMIT_LANGUAGE_LABELS, COMMIT_LANGUAGES, AgentDefaultsSettings(), AppearanceSettings(), CODEX_STATUS_TONES, COMMIT_ROW, DefaultsRowSpec, EFFORT_OPTIONS (+21 more)

### Community 10 - "Slot Config & Worktree Watch"
Cohesion: 0.15
Nodes (14): terminalServerMessageSchema, badgeLabelFor(), LiveTerminal(), LiveTerminalOptions, LiveTerminalProps, TerminalCell(), TerminalCellProps, TerminalTab() (+6 more)

### Community 11 - "Core Domain Concepts"
Cohesion: 0.04
Nodes (47): agentMessageRowSchema, AutomationRow, automationRowSchema, AutomationRunRow, automationRunRowSchema, buildScripts(), CommentRow, commentRowSchema (+39 more)

### Community 12 - "Board & Sidebar Layout"
Cohesion: 0.08
Nodes (5): RealSystemAdapter, DoneGateResult, PrepareReviewWorktreeOptions, SpawnShellOptions, VcsProvider

### Community 13 - "Database Store Operations"
Cohesion: 0.13
Nodes (24): main(), scalar(), assertCodexDowngradeSafe(), backfillOrchestrator(), countRows(), createDatabase(), EXECUTION_MIGRATIONS, hasColumn() (+16 more)

### Community 14 - "Coordinator & Protocol"
Cohesion: 0.07
Nodes (29): ProjectInUseError, cleanDescription(), createSplitChildren(), log, performSplit(), prSummaryLines(), reviewDescription(), splitChildDefaults() (+21 more)

### Community 15 - "API Routes & Reformulate"
Cohesion: 0.23
Nodes (11): accountResponseSchema, hasExplicitCodexApiKey(), isProtocolIncompatibility(), listRuntimeModels(), modelListResponseSchema, modelSchema, probeCodexRuntime(), status() (+3 more)

### Community 16 - "Stats Aggregation"
Cohesion: 0.40
Nodes (8): agentBaseEnv(), bestInstalledMatch(), compareParts(), envWithProjectNode(), nvmNodeBinDir(), readNvmrc(), prepareProjectShell(), shellLiteral()

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
Nodes (31): FAILURE_COLUMNS, Kind, KINDS, SUCCESS_COLUMNS, DurationChart(), OutcomeChart(), SuccessRateChart(), ThroughputChart() (+23 more)

### Community 21 - "Store Types & Agent Knobs"
Cohesion: 0.19
Nodes (25): buildAskContract(), buildCleanContract(), buildConflictResolutionContract(), buildFeasibilityContextSection(), buildImplementingSteps(), buildMockupReviewStep(), buildPlanningStep(), buildPrdBullet() (+17 more)

### Community 22 - "DB Row Schemas & Mappers"
Cohesion: 0.18
Nodes (17): COLUMN_SORT_FIELD, BoardColumn(), compareFamilyMembers(), familyKeyOf(), groupTicketIds(), groupTicketsByFamily(), isSplitMother(), readCollapsed() (+9 more)

### Community 23 - "Dev Dependencies"
Cohesion: 0.09
Nodes (22): AnalyzeTicketRejectionReason, AnalyzeTicketsResult, CreateTodoTicketInput, CreateTodoTicketResult, FeasibilityStarter, isActive(), isBlocked(), isProcessing() (+14 more)

### Community 24 - "TypeScript Config"
Cohesion: 0.13
Nodes (22): bashCommandSchema, buildSettings(), claudeProvider, createSdkAgentSession(), denyBashHook(), denyNoVerifyHook, denyReviewPublishingHook, denyTypecheckHook() (+14 more)

### Community 25 - "Client Hub & Watchdog"
Cohesion: 0.12
Nodes (23): isNotionUrl(), NOTION_HOSTS, AskPanel(), NewTicketSheet(), ActivityTab(), isUnanswered(), NO_COMMENT_COLUMNS, DescriptionEdit (+15 more)

### Community 26 - "Cost & Pricing"
Cohesion: 0.09
Nodes (23): ActiveDelegation, ActiveReview, ActiveReviewPass, ClosableExecution, log, orderedReviewKinds(), renderCollapsedFinding(), renderFinding() (+15 more)

### Community 27 - "Workflow View & Lifecycle"
Cohesion: 0.06
Nodes (28): Architecture, Commands, Conventions (enforced — beyond the global ones in ~/.claude/CLAUDE.md), graphify, The dry-run safety model — read before running anything, What this is, Agent runtime (Agent SDK), Architecture (+20 more)

### Community 28 - "Stats Charts"
Cohesion: 0.07
Nodes (28): agentMessageDeltaSchema, agentToml(), buildMcpServers(), ConfigObject, configReadResponseSchema, describeCodexError(), emptyResponseSchema, errorNotificationSchema (+20 more)

### Community 29 - "Session Hub & Agent Session"
Cohesion: 0.21
Nodes (4): CodexAppServerConnection, CodexAppServerOptions, AppServerFixture, CodexRuntimeDependencies

### Community 30 - "Agents View & Ticket Cards"
Cohesion: 0.06
Nodes (9): groupFeasibilityTickets(), slotPath(), computeWorktreeAddresses(), getProject(), isProjectKey(), projectVcsProvider(), SystemAdapter, UserTerminalManager (+1 more)

### Community 31 - "PRD Review & Markdown"
Cohesion: 0.15
Nodes (8): CodexAppServerInitializationError, CodexAppServerNotification, CodexAppServerProtocolError, CodexAppServerRpcError, incomingSchema, initializeResponseSchema, log, rpcErrorSchema

### Community 32 - "User Terminal & Fake IO"
Cohesion: 0.12
Nodes (25): DragHandleAttributes, DragHandleListeners, ProfileRow(), ProfileRowHeader(), ProfileRowProps, ProfilesSettings(), NOTE: the saved flag lives here because a saved row remounts (its key carries up, sameDraft() (+17 more)

### Community 33 - "Logging"
Cohesion: 0.10
Nodes (21): scripts, build:desktop, build:web, dev, dev:desktop, dev:proxy, dev:server, dev:web (+13 more)

### Community 34 - "Board Columns"
Cohesion: 0.33
Nodes (9): useTheme(), UseThemeResult, applyTheme(), getStoredTheme(), isTheme(), Theme, ThemeOption, THEMES (+1 more)

### Community 36 - "Runtime Dependencies"
Cohesion: 0.22
Nodes (18): applySizes(), collectTerminalIds(), findLeaf(), firstLeafId(), LeafNode, leafNodeSchema, makeLeaf(), nextNodeId() (+10 more)

### Community 37 - "Claude SDK Provider"
Cohesion: 0.09
Nodes (23): dependencies, @anthropic-ai/claude-agent-sdk, dompurify, elysia, @fontsource/ibm-plex-mono, @fontsource/ibm-plex-sans, marked, @modelcontextprotocol/sdk (+15 more)

### Community 38 - "Agent Profile Config"
Cohesion: 0.17
Nodes (6): AutomationManager, mapAutomationRow(), mapAutomationRunRow(), AutomationRunStatus, Automation, AutomationRun

### Community 39 - "Agent Coordinator Handlers"
Cohesion: 0.10
Nodes (28): artifactPath, assertPackageVersionInSync(), assertSdkVersionsInSync(), BUILT_DMG, ELECTROBUN_BIN, fail(), installedPackageVersion(), RELEASE_FOLDER (+20 more)

### Community 40 - "API Client Inputs"
Cohesion: 0.19
Nodes (20): AGENT_EFFORT_FULL_LABELS, AGENT_MODEL_FULL_LABELS, CODEX_EFFORT_FULL_LABELS, IMPLEMENTER_LABELS, ProfileConfig, ProfilePipeline(), ProfileRowHeaderProps, buildProfilePipeline() (+12 more)

### Community 41 - "Ticket Config & Constants"
Cohesion: 0.05
Nodes (34): analyzeResultSchema, compactTicketSchema, createResultSchema, errorResultSchema, ISOLATED_ENV_KEYS, projectResultSchema, savedEnv, startResultSchema (+26 more)

### Community 42 - "Ticket Detail & Triage UI"
Cohesion: 0.09
Nodes (24): AUTOMATION_RUN_STATUSES, AUTOMATION_TRIGGER_LABELS, AUTOMATION_TRIGGERS, CODEX_EFFORT_LABELS, CODEX_EFFORTS, CODEX_MODEL_EFFORTS, CODEX_MODEL_LABELS, COMMENT_AUTHORS (+16 more)

### Community 43 - "Demo Pipeline Concepts"
Cohesion: 0.10
Nodes (25): ACTIVE_BAR, AREA_CURSOR, AXIS_PROPS, BAR_CURSOR, CHART_PALETTE, CodexTierSummary(), colorAt(), CostSummary() (+17 more)

### Community 44 - "Chart Primitives"
Cohesion: 0.14
Nodes (12): PROJECT_ROOT, NOTE: PRD generation holds the request open up to ~120s (REFORMULATE_TIMEOUT_MS), resolveDataFile(), resolveServerPort(), RunningServer, serveStaticAsset(), SocketData, startServer() (+4 more)

### Community 45 - "Session Hub Transcript"
Cohesion: 0.31
Nodes (13): abortReason(), computeCodeFingerprint(), FingerprintEntry, FingerprintPhase, hashFingerprintPaths(), isMissingFileError(), listFingerprintPaths(), log (+5 more)

### Community 46 - "Community 46"
Cohesion: 0.27
Nodes (15): Agent Implementation Config, Argus Code Review, Automated Tests (typecheck/lint/test), Claude Code Autonomous Agent, Ticket Contract Injection, Feasibility Analysis, Kanban Board (Atelier), Kanban Agents Demo (demo.gif) (+7 more)

### Community 47 - "Modal Dialogs"
Cohesion: 0.13
Nodes (3): mergeAgentUsageByModel(), SessionHubHandlers, SessionStartCallbacks

### Community 48 - "Community 48"
Cohesion: 0.14
Nodes (14): CreateProjectInput, ManagedProject, UpdateProjectInput, vcsProviderSchema, ConnectionHint, isPositiveIntegerString(), isValidDraft(), ProjectListRowProps (+6 more)

### Community 49 - "Slot State"
Cohesion: 0.10
Nodes (16): log, log, ReformulateManager, DRY_RUN_VERDICT, log, TriageSession, log, Watchdog (+8 more)

### Community 50 - "Stats Hooks & Cards"
Cohesion: 0.16
Nodes (12): ChartConfig, ChartContainer, ChartContainerProps, ChartContext, ChartContextValue, ChartLegendContent(), ChartLegendContentProps, ChartTooltipContent() (+4 more)

### Community 52 - "chart.tsx"
Cohesion: 0.18
Nodes (15): AppSettingsState, flashSaved(), loadOnce(), patchAppSettings(), publish(), snapshot(), state, subscribe() (+7 more)

### Community 53 - "User Terminal Manager"
Cohesion: 0.33
Nodes (5): CONTEXT — domain glossary, Execution, Proposed (not yet built), Seams, Work items

### Community 54 - "Community 54"
Cohesion: 0.11
Nodes (48): ProjectKey, AutomationPatch, NewAsk, NewAutomation, NewClean, NewProfile, NewReview, NewTicket (+40 more)

### Community 55 - "App.tsx"
Cohesion: 0.13
Nodes (5): FeasibilityBatchManager, toTriageResult(), TriageManager, FeasibilityResult, TriageResult

### Community 56 - "CSV Parsing"
Cohesion: 0.13
Nodes (26): ExecutionFinishStatus, LiveSession, log, PendingSessionMessage, previewToolInput(), renderChannelEvent(), renderImplementationDone(), renderSessionEvent() (+18 more)

### Community 57 - "Community 57"
Cohesion: 0.17
Nodes (17): ensureConfig(), boot(), externalUrlFromNewWindowEvent(), forwardAtelierShortcut(), installApplicationMenu(), installMenuShortcutBridge(), menuShortcutActionSchema, navigationEventSchema (+9 more)

### Community 58 - "File Uploads"
Cohesion: 0.36
Nodes (5): applyDesktopEnv(), DesktopRoots, ensureMcpToken(), regenerateMcpToken(), temporaryDirectories

### Community 59 - "triageManager.ts"
Cohesion: 0.17
Nodes (20): buildSplitChannelPrompt(), buildTicketLines(), isEnglish(), buildContractConstraintsLines(), buildResponseFormatLines(), buildStrictRulesLines(), buildTicketLines(), buildTriageChannelPrompt() (+12 more)

### Community 60 - "Package Manifest"
Cohesion: 0.21
Nodes (11): applyTranscriptUpdate(), TranscriptState, transcriptText(), transcriptUpdateSchema, FullscreenToggle(), FullscreenToggleProps, TerminalData, TerminalView() (+3 more)

### Community 61 - "splitManager.ts"
Cohesion: 0.05
Nodes (59): AGENT_MODEL_LABELS, AUTHOR_BADGES, AuthorBadge(), CommentRow(), LaunchForm(), OverviewTab(), OverviewTabProps, SUMMARY_COLUMNS (+51 more)

### Community 62 - "TicketCard.tsx"
Cohesion: 0.19
Nodes (5): TicketLifecycle, Stage, Ticket, DescriptionTabProps, PrdTabProps

### Community 63 - "Community 63"
Cohesion: 0.15
Nodes (11): ReviewPublicationState, GithubVcsClient, pullApiEndpoint(), reviewApiEndpoint(), rightSideDiffLines(), ReviewPublicationCheck, VCS_PROVIDERS, parsePrUrl() (+3 more)

### Community 64 - "Composer Run Script"
Cohesion: 0.18
Nodes (7): AckSystem, RecordingSystem, RecordedSession, RecordingSystem, RelaunchSystem, AgentSessionHandle, AgentSessionOptions

### Community 65 - "split.ts"
Cohesion: 0.08
Nodes (26): resolveBaseBranch(), mapTicketCreationRequestRow(), mapTicketRow(), parseSessionUsage(), AttachExecutionSessionInput, EnqueueAgentMessageInput, FinalizeExecutionInput, MarkAgentMessageAcceptedInput (+18 more)

### Community 66 - "OpenPr"
Cohesion: 0.13
Nodes (11): AgentProvider, AgentSessionEvent, canonicalJson(), CodexCommandHook, codexSessionPreToolUseHookHash(), JsonValue, AppServerFixtureOptions, hookPathForSession() (+3 more)

### Community 67 - "UserTerminalManager"
Cohesion: 0.06
Nodes (24): FailedReformulation, ActionSystem, CLAUDE_JSON_PATH, COMPOSER_BINARIES, detectInstallCommand(), INSTALL_COMMANDS, log, NON_INTERACTIVE_ENV (+16 more)

### Community 68 - "schema.test.ts"
Cohesion: 0.21
Nodes (15): PrdAnnotator(), PrdAnnotatorProps, BREADCRUMB, NO_ANNOTATIONS, PrdReviewDialog(), PrdReviewDialogProps, AnnotatedHtml, compileFeedback() (+7 more)

### Community 69 - "contract.test.ts"
Cohesion: 0.13
Nodes (23): ReviewResult, dedupeFindings(), DimensionFinding, findingAnchor(), FRENCH_STOP_WORD_PATTERN, FRENCH_STOP_WORDS, hasSimilarSummary(), isSameDefect() (+15 more)

### Community 70 - "CodexRuntimeStatus"
Cohesion: 0.14
Nodes (15): buildFeasibilityBatchContract(), cleanTicket(), conflictTicket(), REVIEW_OPTS, reviewTicket(), TICKET_OPTS, truncateDescription(), createdPaths (+7 more)

### Community 71 - "PostCSS Config"
Cohesion: 0.29
Nodes (6): name, overrides, zod, private, type, version

### Community 72 - "App.tsx"
Cohesion: 0.09
Nodes (24): AGENT_EFFORT_LABELS, AutomationCard(), AutomationCardProps, AutomationFormProps, AutomationView(), EMPTY_FORM, formFromAutomation(), RUN_STATUS_LABEL (+16 more)

### Community 74 - "button.tsx"
Cohesion: 0.07
Nodes (31): setup(), log, SlotWatch, WorktreeAddressWatcher, log, runFirstBootSetup(), applyAppSettingsToModels(), DEFAULT_MODELS (+23 more)

### Community 75 - ".handleRequest"
Cohesion: 0.27
Nodes (9): AgentCardProps, AgentsView(), hasLiveAgent(), normalize(), KIND_BADGES, TicketBadges(), TicketBadgesProps, resolveProjectColor() (+1 more)

### Community 76 - "usePrdSearch.ts"
Cohesion: 0.13
Nodes (22): isCodexFastServiceTier(), costByFamily(), costOf(), costOfModel(), costOfSessions(), CostSummary, FamilyPricing, MODEL_PRICING (+14 more)

### Community 78 - "csv.ts"
Cohesion: 0.32
Nodes (6): CapabilityCache, CodexRuntimeStatus, codexRuntimeStatusSchema, pairedRuntimeCodexEffort(), UNKNOWN_CODEX_RUNTIME_STATUS, pairedCodexEffort()

### Community 79 - "WorktreeSession"
Cohesion: 0.33
Nodes (3): listeners, mcp, ReplyArgsSchema

### Community 80 - "recordedAction.ts"
Cohesion: 0.23
Nodes (17): alternation(), COMMAND_WRAPPERS, commandSegments(), commandWords(), executableName(), launchedPackageScript(), launchesTypecheck(), OPTIONS_WITH_VALUE (+9 more)

### Community 81 - "vcsCommands.ts"
Cohesion: 0.20
Nodes (7): AZURE_COMMANDS, COMMANDS_BY_PROVIDER, GITHUB_COMMANDS, PrDiffContext, VcsCleanCommands, AZ_SETTLED_THREAD_STATUSES, VCS_PROVIDER_LABELS

### Community 82 - "Community 82"
Cohesion: 0.22
Nodes (4): McpTokenSource, createMcpSettingsController(), McpSettingsControllerDependencies, temporaryDirectories

### Community 86 - "TicketCost.tsx"
Cohesion: 0.06
Nodes (47): App(), HOME_VIEW_OPTIONS, HomeView, QuitConfirmModal(), QuitConfirmModalProps, NAV_ENTRIES, NavEntry, Sidebar() (+39 more)

### Community 87 - "createMcpServer"
Cohesion: 0.13
Nodes (12): CHILD_USAGE, FULL_REVIEW_KINDS, LIGHT_REVIEW_KINDS, newDelegatedTicket(), newReviewTicket(), RecordedSession, RecordingSystemAdapter, setup() (+4 more)

### Community 89 - "usePrdSearch.ts"
Cohesion: 0.15
Nodes (11): CompactTicket, ListTicketsInput, Column, BoardColumnProps, DEFAULT_OPEN, NOTE: an expanded column already owns the droppable id through its lane; registe, TerminalColumnsPanelProps, TerminalRowButton() (+3 more)

### Community 90 - "uploads.ts"
Cohesion: 0.31
Nodes (9): COLUMN_ORDER, COLUMNS, ACTIVE_COLUMNS, Board(), BoardProps, isColumn(), isLocked(), normalize() (+1 more)

### Community 91 - "AgentsView.tsx"
Cohesion: 0.20
Nodes (9): AtelierDesktopRpcSchema, DesktopRequests, McpSettingsMetadata, WebviewRequests, McpSettingsController, McpSettings(), createMcpSettingsClient(), getMcpSettingsClient() (+1 more)

### Community 92 - "useCapabilities.ts"
Cohesion: 0.26
Nodes (8): Block, blockText(), compactChunks(), firstCharCode(), TranscriptBuffer, trimBlockStart(), AgentStreamBlock, TranscriptUpdate

### Community 93 - "ColumnActionsMenu.tsx"
Cohesion: 0.25
Nodes (7): Azure DevOps support — state file, Decisions (validated by the owner, 2026-09-21), Goal, Known blockers for lots 3 and 4, Open questions, Progress, Verified on this machine (az 2.90.0, azure-devops 1.0.8)

### Community 94 - ".addComment"
Cohesion: 0.08
Nodes (11): startFeasibilityTicket(), mapAgentMessageRow(), mapExecutionRunRow(), mapProfileRow(), nullableBooleanValue(), SqlUpdateBuilder, Store, runRecordedAction() (+3 more)

### Community 95 - "TicketConfigSummary.tsx"
Cohesion: 0.50
Nodes (3): appBundle, EMBEDDED_BINARIES, resourcesApp

### Community 97 - "RunningServer"
Cohesion: 0.11
Nodes (18): ANSI, appendToLogFile(), COLOR_ENABLED, disableFileLogging(), initLogFile(), isLevel(), Level, LEVEL_ORDER (+10 more)

### Community 98 - "triageManager.ts"
Cohesion: 0.50
Nodes (7): groupOrientation(), layoutToSizes(), panelId(), panelPercent(), SplitTree(), SplitTreeProps, TreeNode

### Community 99 - "reviewPublishingGuard.ts"
Cohesion: 0.07
Nodes (31): API_GUARDS, API_READ_METHOD_SET, ApiGuard, AZ_INVOKE_COMMAND, AZ_INVOKE_METHOD_LONG_FLAGS, AZ_INVOKE_WRITE_INPUT_LONG_FLAGS, AZ_PR_WRITE_PATTERN, AZ_PR_WRITE_SUBCOMMANDS (+23 more)

### Community 100 - ".startVerification"
Cohesion: 0.22
Nodes (4): reviewKey(), reviewPrompt(), verificationPrompt(), verifiedFindings()

### Community 101 - "codexProvider.test.ts"
Cohesion: 0.12
Nodes (13): directories, initializeParamsSchema, log, requestSchema, rpcError(), rpcResult(), rpcResponseSchema, toolCallParamsSchema (+5 more)

### Community 102 - "DescriptionTab.tsx"
Cohesion: 0.14
Nodes (23): CodexAgentFields(), CodexConnectionStatus(), STATUS_LABELS, ProvidersSettings(), TerminalsView(), clearRetry(), loadCapabilities(), LoadOptions (+15 more)

### Community 103 - "TerminalSession"
Cohesion: 0.11
Nodes (13): PaneStream, dataMessage(), log, normalizeSeed(), safeParse(), send(), TerminalSession, TerminalSessionManager (+5 more)

### Community 104 - "reviewPass.ts"
Cohesion: 0.25
Nodes (9): keptFindings(), finding(), FULL_REVIEW_KINDS, LIGHT_REVIEW_KINDS, passDimensionFindings(), publishedReviewFindings(), requiredReviewKinds(), ReviewPass (+1 more)

### Community 105 - ".finishTicket"
Cohesion: 0.20
Nodes (4): ReviewReportLabels, mapReviewApprovalRow(), mapReviewPassRow(), parsePersistedReviewFindings()

### Community 106 - ".publishReviewUnderRepoLock"
Cohesion: 0.31
Nodes (4): mapWorktreeSessionRow(), enrichWorktreeSession(), WorktreeSession, BoardState

### Community 107 - "azureRemote.ts"
Cohesion: 0.40
Nodes (10): azureOrgUrl(), fromAzureSegments(), fromCollectionSegments(), fromLegacySegments(), fromSshSegments(), parseAzureRepoRef(), parseRemoteLocation(), RemoteLocation (+2 more)

### Community 109 - "contract.test.ts"
Cohesion: 0.27
Nodes (12): apiWriteDenyScript(), ConfigValue, extractCommandScript(), perSegmentScript(), prepareNoVerifyHook(), reviewPublishingGuardScript(), shellDeny(), shellDenyOnMatch() (+4 more)

### Community 110 - "Profile"
Cohesion: 0.13
Nodes (11): agentPairError(), createApiRoutes(), isBlocked(), isProcessing(), isSplitMother(), isWebOnlyPath(), jsonError(), PaneReader (+3 more)

### Community 111 - "agentSession.ts"
Cohesion: 0.22
Nodes (10): COLUMN_LABELS, columnSchema, MetaRow(), MetaRowProps, STATUS_CONFIRMS, StatusConfirm, statusTitle(), TicketMeta() (+2 more)

### Community 112 - "AgentSessionEvent"
Cohesion: 0.36
Nodes (8): ActionContext, buildActions(), ConfirmSpec, errorMessage(), RETRY_STAGES, TicketAction, TicketActions(), TicketActionsProps

### Community 113 - "bootstrap.ts"
Cohesion: 0.29
Nodes (7): RFC-4180, ImportTicketsPanel(), CsvParseError, normalizeHeader(), ParsedTicketRow, ParsedTicketsCsv, parseTicketsCsv()

### Community 114 - "prUrl.ts"
Cohesion: 0.36
Nodes (7): collectMatchRanges(), isShortcutDetail(), ShortcutDetail, supportsHighlightApi(), usePrdSearch(), UsePrdSearchOptions, UsePrdSearchResult

### Community 115 - "useLocalDraft.ts"
Cohesion: 0.05
Nodes (32): dryRunLog, fakeEncoder, hexToBytes(), renderOutsideDiffComment(), renderOutsideDiffSection(), GitWorktreeAddOptions, PublishReviewResult, ReviewHeadResult (+24 more)

### Community 116 - "settings.tsx"
Cohesion: 0.12
Nodes (36): ProjectInfo, AgentProfileConfig(), AgentsViewProps, AskPanelProps, CleanPrPanel(), CleanPrPanelProps, ImportTicketsPanelProps, NewTicketSheetProps (+28 more)

### Community 117 - "WorkflowView.tsx"
Cohesion: 0.32
Nodes (5): StatRecord, StatCard(), StatCardProps, StatEmpty(), UseStatsResult

### Community 118 - "connectCodexAppServer"
Cohesion: 0.29
Nodes (5): connectCodexAppServer(), fakeAppServer(), temporaryDirectories, writeFixture(), verifyCodexBinaryVersion()

### Community 119 - "ColumnActionsMenu.tsx"
Cohesion: 0.38
Nodes (4): formatCommitTimeout(), TimeoutUnit, timeoutUnitMs(), timeoutUnitOf()

### Community 121 - "profileMatching.test.ts"
Cohesion: 0.40
Nodes (5): CodexBinaryVersionError, require, resolveCodexBinary(), resolveCodexBinaryOverride(), TARGETS

### Community 122 - "uploads.ts"
Cohesion: 0.40
Nodes (4): MIME_EXTENSIONS, resolveExtension(), SavedUpload, saveUpload()

### Community 123 - "useTickTimer.ts"
Cohesion: 0.38
Nodes (6): currentNow, getSnapshot(), startTicking(), stopTicking(), subscribe(), subscribers

### Community 124 - "createCodexProvider"
Cohesion: 0.40
Nodes (3): createCodexAgentSession(), createCodexProvider(), PreparedHook

### Community 125 - "PrSelectRow.tsx"
Cohesion: 0.29
Nodes (4): OpenPr, PrSelectRow(), PrSelectRowProps, isPrNeedsAttention()

### Community 127 - "useTerminalShortcuts.ts"
Cohesion: 0.47
Nodes (5): SplitOrientation, isShortcutDetail(), ShortcutDetail, useTerminalShortcuts(), UseTerminalShortcutsOptions

### Community 129 - "ApiDenyPatterns"
Cohesion: 0.67
Nodes (4): ApiDenyPatterns, ereFlagAlternatives(), ereMethod(), ereWriteInput()

### Community 132 - "Comment"
Cohesion: 0.40
Nodes (4): mapCommentRow(), Comment, ActivityTabProps, CommentRowProps

## Knowledge Gaps
- **689 isolated node(s):** `PROJECT_ROOT`, `WEB_DIST_SUBPATH`, `StartServerOptions`, `SocketData`, `STATIC_CONTENT_TYPES` (+684 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Ticket` connect `TicketCard.tsx` to `Contract Building & Slots`, `Desktop Bootstrap & Menus`, `Ticket Action Panels`, `Comment`, `Shared Zod Schemas`, `PR Selection & Slots Bar`, `Slot Config & Worktree Watch`, `Core Domain Concepts`, `Coordinator & Protocol`, `Live Terminal Views`, `Store Types & Agent Knobs`, `DB Row Schemas & Mappers`, `Dev Dependencies`, `Client Hub & Watchdog`, `Cost & Pricing`, `Agents View & Ticket Cards`, `NPM Scripts`, `Ticket Config & Constants`, `Ticket Detail & Triage UI`, `Slot State`, `Community 51`, `Community 54`, `triageManager.ts`, `splitManager.ts`, `split.ts`, `CodexRuntimeStatus`, `.handleRequest`, `usePrdSearch.ts`, `TicketCost.tsx`, `createMcpServer`, `usePrdSearch.ts`, `uploads.ts`, `.addComment`, `.startVerification`, `reviewPass.ts`, `.publishReviewUnderRepoLock`, `reformulate.ts`, `agentSession.ts`, `AgentSessionEvent`, `settings.tsx`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **Why does `SystemAdapter` connect `Agents View & Ticket Cards` to `Desktop Bootstrap & Menus`, `UserTerminalManager`, `.startVerification`, `Agent Profile Config`, `Settings & Profiles UI`, `PR Selection & Slots Bar`, `TerminalView.tsx`, `button.tsx`, `TerminalSession`, `Board & Sidebar Layout`, `Shared Zod Schemas`, `Slot State`, `useLocalDraft.ts`, `Community 51`, `CSV Parsing`, `Cost & Pricing`, `PrSelectRow.tsx`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._
- **Why does `RealSystemAdapter` connect `Board & Sidebar Layout` to `UserTerminalManager`, `codexProvider.test.ts`, `TerminalSession`, `Slot State`, `useLocalDraft.ts`, `createCodexProvider`, `Agents View & Ticket Cards`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **What connects `PROJECT_ROOT`, `WEB_DIST_SUBPATH`, `StartServerOptions` to the rest of the system?**
  _700 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Contract Building & Slots` be split into smaller, more focused modules?**
  _Cohesion score 0.03517215845982969 - nodes in this community are weakly interconnected._
- **Should `Terminals UI & Notifications` be split into smaller, more focused modules?**
  _Cohesion score 0.06852497096399536 - nodes in this community are weakly interconnected._
- **Should `Feasibility Batch Management` be split into smaller, more focused modules?**
  _Cohesion score 0.0641025641025641 - nodes in this community are weakly interconnected._