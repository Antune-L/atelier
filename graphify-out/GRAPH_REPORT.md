# Graph Report - kanban-agents  (2026-09-22)

## Corpus Check
- 273 files · ~745,760 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3006 nodes · 8321 edges · 132 communities (124 shown, 8 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 53 edges (avg confidence: 0.66)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4efddbcb`
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
- Comment
- ColumnActionsMenu.tsx
- resolveTemplatePaths
- profileMatching.test.ts
- uploads.ts
- recordOutcome
- createCodexProvider
- PrSelectRow.tsx
- useSavedFlash.ts
- codexAppServer.test.ts
- CodexProviderDependencies
- ApiDenyPatterns
- PreparedAgents

## God Nodes (most connected - your core abstractions)
1. `Store` - 124 edges
2. `Ticket` - 113 edges
3. `SystemAdapter` - 75 edges
4. `cn()` - 74 edges
5. `FakeSystemAdapter` - 67 edges
6. `createApiRoutes()` - 63 edges
7. `RealSystemAdapter` - 63 edges
8. `SlotManager` - 56 edges
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

## Communities (132 total, 8 thin omitted)

### Community 0 - "Contract Building & Slots"
Cohesion: 0.04
Nodes (66): ActionExecutionOptions, actionExecutionOptionsSchema, agentMessageSchema, AnalyzeTicketsInput, appSettingsSchema, automationRunSchema, automationSchema, baseBranchSchema (+58 more)

### Community 1 - "Terminals UI & Notifications"
Cohesion: 0.08
Nodes (22): analyzeTicketsInputSchema, analyzeTicketsOutputSchema, columnSchema, compactTicketSchema, createTodoTicketOutputSchema, editableTicketSchema, listProjectsInputSchema, listProjectsOutputSchema (+14 more)

### Community 2 - "Desktop Bootstrap & Menus"
Cohesion: 0.14
Nodes (3): assertCodexImplementerAvailable(), SlotManager, mapSlotRow()

### Community 3 - "Feasibility Batch Management"
Cohesion: 0.07
Nodes (36): log, ToolHandler, ToolResult, addUsageByModel(), toUsageByModel(), TRIAGE_VERDICTS, AgentSettableStage, agentSettableStageSchema (+28 more)

### Community 4 - "Ticket Action Panels"
Cohesion: 0.14
Nodes (16): AUTOMATION_TRIGGER_LABELS, AUTOMATION_TRIGGERS, CreateAutomationInput, AutomationCard(), AutomationCardProps, AutomationFormProps, AutomationView(), EMPTY_FORM (+8 more)

### Community 5 - "Fake System Adapter"
Cohesion: 0.10
Nodes (16): boundedCommandDetail(), runBoundedCommand(), safeJsonParse(), ReviewPublicationState, AzureDevopsVcsClient, prWebUrl(), readOriginRemote(), repoRefFromPrUrl() (+8 more)

### Community 6 - "Shared Zod Schemas"
Cohesion: 0.08
Nodes (22): BoundedCommandResult, withJsonRequestFile(), connectionFailure(), connectionResult(), extractPrUrl(), ghPrHeadSchema, ghPrSchema, ghPrStateSchema (+14 more)

### Community 7 - "Settings & Profiles UI"
Cohesion: 0.08
Nodes (3): delay(), fakeShellPrompt(), FakeSystemAdapter

### Community 8 - "PR Selection & Slots Bar"
Cohesion: 0.09
Nodes (30): resolveBaseBranch(), assertExecutionAvailable(), CODEX_LAUNCH_STATUS_MESSAGES, CodexCapabilityReader, ExecutionDefaults, FEASIBILITY_ENGINE_EXECUTION, resolveExecution(), resolveFeasibilityExecution() (+22 more)

### Community 9 - "Real System Adapter"
Cohesion: 0.07
Nodes (29): COMMIT_LANGUAGE_LABELS, COMMIT_LANGUAGES, AgentDefaultsSettings(), AppearanceSettings(), CODEX_STATUS_TONES, COMMIT_ROW, DefaultsRowSpec, EFFORT_OPTIONS (+21 more)

### Community 10 - "Slot Config & Worktree Watch"
Cohesion: 0.18
Nodes (12): terminalServerMessageSchema, badgeLabelFor(), LiveTerminal(), LiveTerminalOptions, LiveTerminalProps, TerminalCell(), TerminalCellProps, TERMINAL_THEME (+4 more)

### Community 11 - "Core Domain Concepts"
Cohesion: 0.04
Nodes (50): agentMessageRowSchema, AutomationRow, automationRowSchema, AutomationRunRow, automationRunRowSchema, buildScripts(), CommentRow, commentRowSchema (+42 more)

### Community 12 - "Board & Sidebar Layout"
Cohesion: 0.06
Nodes (7): detectInstallCommand(), realpathSafe(), RealSystemAdapter, resolveWorktreeScriptCommand(), setupOutputExcerpt(), shQuote(), VcsProvider

### Community 13 - "Database Store Operations"
Cohesion: 0.08
Nodes (37): main(), scalar(), cleanTicket(), conflictTicket(), REVIEW_OPTS, reviewTicket(), TICKET_OPTS, assertCodexDowngradeSafe() (+29 more)

### Community 14 - "Coordinator & Protocol"
Cohesion: 0.08
Nodes (25): cleanDescription(), isWebOnlyPath(), log, prSummaryLines(), reviewDescription(), createAskSchema, createAutomationSchema, createCleanSchema (+17 more)

### Community 15 - "API Routes & Reformulate"
Cohesion: 0.18
Nodes (11): accountResponseSchema, hasExplicitCodexApiKey(), isProtocolIncompatibility(), listRuntimeModels(), modelListResponseSchema, modelSchema, probeCodexRuntime(), status() (+3 more)

### Community 16 - "Stats Aggregation"
Cohesion: 0.40
Nodes (8): agentBaseEnv(), bestInstalledMatch(), compareParts(), envWithProjectNode(), nvmNodeBinDir(), readNvmrc(), prepareProjectShell(), shellLiteral()

### Community 17 - "Triage & Server Hub"
Cohesion: 0.08
Nodes (25): devDependencies, autoprefixer, class-variance-authority, clsx, concurrently, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities (+17 more)

### Community 18 - "Live Terminal Views"
Cohesion: 0.08
Nodes (36): isReviewFixSession(), AZURE_BASH_ALLOWLIST, AZURE_CLEAN_BASH_ALLOWLIST, BASH_ALLOWLIST, bashAllowlist(), buildFeasibilitySessionConfig(), buildImplementSessionConfig(), buildSplitSessionConfig() (+28 more)

### Community 19 - "Stage Progress & Display"
Cohesion: 0.08
Nodes (24): compilerOptions, allowImportingTsExtensions, baseUrl, esModuleInterop, isolatedModules, jsx, lib, module (+16 more)

### Community 20 - "Real Adapter GH/Composer"
Cohesion: 0.10
Nodes (26): Kind, KINDS, agentEffortSchema, DurationChart(), ThroughputChart(), effectiveWorkDurationMs(), CodexTierSummary, DurationGroup (+18 more)

### Community 21 - "Store Types & Agent Knobs"
Cohesion: 0.12
Nodes (38): buildAskContract(), buildCleanContract(), buildConflictResolutionContract(), buildFeasibilityBatchContract(), buildFeasibilityContextSection(), buildImplementingSteps(), buildMockupReviewStep(), buildPlanningStep() (+30 more)

### Community 22 - "DB Row Schemas & Mappers"
Cohesion: 0.14
Nodes (22): COLUMN_SORT_FIELD, AgentsView(), hasLiveAgent(), normalize(), BoardColumn(), compareFamilyMembers(), familyKeyOf(), groupTicketIds() (+14 more)

### Community 23 - "Dev Dependencies"
Cohesion: 0.10
Nodes (21): AnalyzeTicketRejectionReason, AnalyzeTicketsResult, CreateTodoTicketInput, CreateTodoTicketResult, isActive(), isBlocked(), log, normalizeCreateInput() (+13 more)

### Community 24 - "TypeScript Config"
Cohesion: 0.12
Nodes (25): logRejection(), ensureClaudeBinary(), bashCommandSchema, buildSettings(), claudeProvider, createSdkAgentSession(), denyBashHook(), denyNoVerifyHook (+17 more)

### Community 25 - "Client Hub & Watchdog"
Cohesion: 0.11
Nodes (26): Comment, ActivityTab(), ActivityTabProps, isUnanswered(), NO_COMMENT_COLUMNS, AUTHOR_BADGES, AuthorBadge(), CommentRow() (+18 more)

### Community 26 - "Cost & Pricing"
Cohesion: 0.10
Nodes (19): ActiveDelegation, ActiveReviewPass, ClosableExecution, log, orderedReviewKinds(), renderCollapsedFinding(), renderPersistedReviewResult(), REVIEW_DISALLOWED_TOOLS (+11 more)

### Community 27 - "Workflow View & Lifecycle"
Cohesion: 0.06
Nodes (28): Architecture, Commands, Conventions (enforced — beyond the global ones in ~/.claude/CLAUDE.md), graphify, The dry-run safety model — read before running anything, What this is, Agent runtime (Agent SDK), Architecture (+20 more)

### Community 28 - "Stats Charts"
Cohesion: 0.07
Nodes (28): agentMessageDeltaSchema, agentToml(), buildMcpServers(), ConfigObject, configReadResponseSchema, describeCodexError(), emptyResponseSchema, errorNotificationSchema (+20 more)

### Community 29 - "Session Hub & Agent Session"
Cohesion: 0.28
Nodes (3): CodexAppServerNotification, CodexAppServerOptions, AppServerFixture

### Community 30 - "Agents View & Ticket Cards"
Cohesion: 0.07
Nodes (5): reviewPublicationState(), slotPath(), SystemAdapter, UserTerminalManager, TerminalDescriptor

### Community 31 - "PRD Review & Markdown"
Cohesion: 0.13
Nodes (9): CodexAppServerInitializationError, CodexAppServerProtocolError, CodexAppServerRpcError, incomingSchema, initializeResponseSchema, log, PendingRequest, rpcErrorSchema (+1 more)

### Community 32 - "User Terminal & Fake IO"
Cohesion: 0.10
Nodes (32): codexEffortSchema, codexModelSchema, AgentProfileConfig(), ImplementationAgentFields(), DragHandleAttributes, DragHandleListeners, ProfileRow(), ProfileRowHeader() (+24 more)

### Community 33 - "Logging"
Cohesion: 0.10
Nodes (21): scripts, build:desktop, build:web, dev, dev:desktop, dev:proxy, dev:server, dev:web (+13 more)

### Community 34 - "Board Columns"
Cohesion: 0.33
Nodes (9): useTheme(), UseThemeResult, applyTheme(), getStoredTheme(), isTheme(), Theme, ThemeOption, THEMES (+1 more)

### Community 36 - "Runtime Dependencies"
Cohesion: 0.21
Nodes (19): applySizes(), collectTerminalIds(), findLeaf(), firstLeafId(), LeafNode, leafNodeSchema, makeLeaf(), nextNodeId() (+11 more)

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
Cohesion: 0.21
Nodes (19): AGENT_EFFORT_FULL_LABELS, AGENT_MODEL_FULL_LABELS, CODEX_EFFORT_FULL_LABELS, ProfileConfig, ProfilePipeline(), ProfileRowHeaderProps, buildProfilePipeline(), claudeDetail() (+11 more)

### Community 41 - "Ticket Config & Constants"
Cohesion: 0.07
Nodes (28): WsClientEvent, ATTENTION_STATUSES, sessionOf(), SlotPips(), SlotPipsProps, STATUS_LABELS, STATUS_PIP_CLASSES, Toaster() (+20 more)

### Community 42 - "Ticket Detail & Triage UI"
Cohesion: 0.10
Nodes (23): AGENT_EFFORT_LABELS, AGENT_MODEL_LABELS, AUTOMATION_RUN_STATUSES, CODEX_EFFORT_LABELS, CODEX_MODEL_EFFORTS, CODEX_MODEL_LABELS, COMMENT_AUTHORS, FEASIBILITY_ENGINE_LABELS (+15 more)

### Community 43 - "Demo Pipeline Concepts"
Cohesion: 0.13
Nodes (20): ACTIVE_BAR, AREA_CURSOR, AXIS_PROPS, BAR_CURSOR, CHART_PALETTE, CodexTierSummary(), colorAt(), DurationBars() (+12 more)

### Community 44 - "Chart Primitives"
Cohesion: 0.08
Nodes (31): renderOutsideDiffComment(), renderOutsideDiffSection(), ReviewPublicationComment, azureChangeEntrySchema, azureCommentSchema, azureIdentitySchema, azureIterationChangesSchema, azureIterationListSchema (+23 more)

### Community 45 - "Session Hub Transcript"
Cohesion: 0.31
Nodes (13): abortReason(), computeCodeFingerprint(), FingerprintEntry, FingerprintPhase, hashFingerprintPaths(), isMissingFileError(), listFingerprintPaths(), log (+5 more)

### Community 46 - "Community 46"
Cohesion: 0.27
Nodes (15): Agent Implementation Config, Argus Code Review, Automated Tests (typecheck/lint/test), Claude Code Autonomous Agent, Ticket Contract Injection, Feasibility Analysis, Kanban Board (Atelier), Kanban Agents Demo (demo.gif) (+7 more)

### Community 47 - "Modal Dialogs"
Cohesion: 0.08
Nodes (5): setup(), mergeAgentUsageByModel(), SessionHub, SessionHubHandlers, SessionStartCallbacks

### Community 48 - "Community 48"
Cohesion: 0.14
Nodes (14): CreateProjectInput, ManagedProject, UpdateProjectInput, vcsProviderSchema, ConnectionHint, isPositiveIntegerString(), isValidDraft(), ProjectListRowProps (+6 more)

### Community 49 - "Slot State"
Cohesion: 0.12
Nodes (11): log, log, ReformulateManager, log, Watchdog, initProjectRegistry(), ClientHub, ClientSocket (+3 more)

### Community 50 - "Stats Hooks & Cards"
Cohesion: 0.16
Nodes (12): ChartConfig, ChartContainer, ChartContainerProps, ChartContext, ChartContextValue, ChartLegendContent(), ChartLegendContentProps, ChartTooltipContent() (+4 more)

### Community 51 - "Community 51"
Cohesion: 0.19
Nodes (3): childTranscriptPrefix(), DelegationManager, setup()

### Community 52 - "chart.tsx"
Cohesion: 0.26
Nodes (12): AppSettings, AppSettingsState, flashSaved(), loadOnce(), patchAppSettings(), publish(), snapshot(), state (+4 more)

### Community 53 - "User Terminal Manager"
Cohesion: 0.33
Nodes (5): CONTEXT — domain glossary, Execution, Proposed (not yet built), Seams, Work items

### Community 54 - "Community 54"
Cohesion: 0.08
Nodes (58): ExecutionOverrides, DEFAULT_MODELS, ProjectKey, AttachExecutionSessionInput, AutomationPatch, EnqueueAgentMessageInput, FinalizeExecutionInput, MarkAgentMessageAcceptedInput (+50 more)

### Community 55 - "App.tsx"
Cohesion: 0.15
Nodes (5): ResolvedExecution, FeasibilityBatchManager, toTriageResult(), TriageManager, FeasibilityResult

### Community 56 - "CSV Parsing"
Cohesion: 0.10
Nodes (29): ExecutionFinishStatus, LiveSession, log, PendingSessionMessage, previewToolInput(), renderChannelEvent(), renderImplementationDone(), renderSessionEvent() (+21 more)

### Community 57 - "Community 57"
Cohesion: 0.17
Nodes (17): ensureConfig(), boot(), externalUrlFromNewWindowEvent(), forwardAtelierShortcut(), installApplicationMenu(), installMenuShortcutBridge(), menuShortcutActionSchema, navigationEventSchema (+9 more)

### Community 58 - "File Uploads"
Cohesion: 0.36
Nodes (5): applyDesktopEnv(), DesktopRoots, ensureMcpToken(), regenerateMcpToken(), temporaryDirectories

### Community 59 - "triageManager.ts"
Cohesion: 0.17
Nodes (21): buildSplitChannelPrompt(), buildTicketLines(), isEnglish(), buildContractConstraintsLines(), buildResponseFormatLines(), buildStrictRulesLines(), buildTicketLines(), buildTriageChannelPrompt() (+13 more)

### Community 60 - "Package Manifest"
Cohesion: 0.20
Nodes (11): applyTranscriptUpdate(), TranscriptState, transcriptText(), transcriptUpdateSchema, FullscreenToggle(), FullscreenToggleProps, TerminalData, TerminalView() (+3 more)

### Community 61 - "splitManager.ts"
Cohesion: 0.07
Nodes (35): StatsView(), StatsViewProps, TICKET_TAB_LABELS, TicketTab, TicketTabs(), TicketTabsProps, availableTabs(), hasSessionPane() (+27 more)

### Community 62 - "TicketCard.tsx"
Cohesion: 0.15
Nodes (7): startFeasibilityTicket(), TicketLifecycle, Stage, Ticket, TriageResult, DescriptionTabProps, PrdTabProps

### Community 63 - "Community 63"
Cohesion: 0.16
Nodes (6): mapWorktreeSessionRow(), enrichWorktreeSession(), TERMINAL_STAGES, Slot, WorktreeSession, BoardState

### Community 64 - "Composer Run Script"
Cohesion: 0.18
Nodes (7): AckSystem, RecordingSystem, RecordedSession, RecordingSystem, RelaunchSystem, AgentSessionHandle, AgentSessionOptions

### Community 65 - "split.ts"
Cohesion: 0.39
Nodes (7): currentNow, getSnapshot(), startTicking(), stopTicking(), subscribe(), subscribers, useTickTimer()

### Community 66 - "OpenPr"
Cohesion: 0.17
Nodes (8): canonicalJson(), CodexCommandHook, codexSessionPreToolUseHookHash(), JsonValue, AppServerFixtureOptions, hookPathForSession(), RecordedRequest, waitFor()

### Community 67 - "UserTerminalManager"
Cohesion: 0.33
Nodes (3): FailedReformulation, ActionSystem, ReformulateOptions

### Community 68 - "schema.test.ts"
Cohesion: 0.10
Nodes (24): PrdAnnotator(), BREADCRUMB, NO_ANNOTATIONS, PrdReviewDialog(), PrdReviewDialogProps, PrdView(), ABSOLUTE_UPLOAD_PATH, ImageLightboxProps (+16 more)

### Community 69 - "contract.test.ts"
Cohesion: 0.10
Nodes (31): ReviewResult, dedupeFindings(), DimensionFinding, findingAnchor(), FRENCH_STOP_WORD_PATTERN, FRENCH_STOP_WORDS, hasSimilarSummary(), isSameDefect() (+23 more)

### Community 70 - "CodexRuntimeStatus"
Cohesion: 0.11
Nodes (14): analyzeResultSchema, compactTicketSchema, createResultSchema, errorResultSchema, ISOLATED_ENV_KEYS, projectResultSchema, savedEnv, startResultSchema (+6 more)

### Community 71 - "PostCSS Config"
Cohesion: 0.29
Nodes (6): name, overrides, zod, private, type, version

### Community 72 - "App.tsx"
Cohesion: 0.18
Nodes (13): ColumnActionsMenu(), ColumnActionsMenuProps, ColumnMenuItem, ConfirmActionsProps, ConfirmBody(), ConfirmDialog(), ConfirmPopover(), ConfirmProps (+5 more)

### Community 73 - "TerminalView.tsx"
Cohesion: 0.09
Nodes (38): AgentCard(), AgentCardProps, FILLED_GLYPH_COLORS, StageProgressBar(), StageProgressBarProps, KIND_BADGES, TicketBadges(), TicketBadgesProps (+30 more)

### Community 74 - "button.tsx"
Cohesion: 0.05
Nodes (38): log, SlotWatch, WorktreeAddressWatcher, log, runFirstBootSetup(), applyAppSettingsToModels(), listProjectKeys(), SLOTS_ROOT (+30 more)

### Community 75 - ".handleRequest"
Cohesion: 0.17
Nodes (13): columnSchema, CostSummary(), MetaRow(), MetaRowProps, STATUS_CONFIRMS, StatusConfirm, statusTitle(), TicketMeta() (+5 more)

### Community 76 - "usePrdSearch.ts"
Cohesion: 0.14
Nodes (20): isCodexFastServiceTier(), costByFamily(), costOf(), costOfModel(), costOfSessions(), CostSummary, FamilyPricing, ModelFamily (+12 more)

### Community 78 - "csv.ts"
Cohesion: 0.24
Nodes (7): CapabilityCache, CodexRuntimeModel, codexRuntimeModelSchema, CodexRuntimeStatus, codexRuntimeStatusSchema, UNKNOWN_CODEX_RUNTIME_STATUS, runtime

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
Cohesion: 0.09
Nodes (29): App(), HOME_VIEW_OPTIONS, HomeView, QuitConfirmModal(), QuitConfirmModalProps, NAV_ENTRIES, NavEntry, Sidebar() (+21 more)

### Community 87 - "createMcpServer"
Cohesion: 0.21
Nodes (9): CHILD_USAGE, FULL_REVIEW_KINDS, LIGHT_REVIEW_KINDS, newDelegatedTicket(), newReviewTicket(), RecordedSession, sleep(), startAndApproveReviews() (+1 more)

### Community 89 - "usePrdSearch.ts"
Cohesion: 0.14
Nodes (12): CompactTicket, ListTicketsInput, Column, COLUMN_LABELS, BoardColumnProps, DEFAULT_OPEN, NOTE: an expanded column already owns the droppable id through its lane; registe, TerminalColumnsPanelProps (+4 more)

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
Cohesion: 0.09
Nodes (8): mapAgentMessageRow(), mapExecutionRunRow(), SqlUpdateBuilder, Store, runRecordedAction(), AgentMessage, ExecutionRun, ExecutionUsageByModel

### Community 95 - "TicketConfigSummary.tsx"
Cohesion: 0.50
Nodes (3): appBundle, EMBEDDED_BINARIES, resourcesApp

### Community 97 - "RunningServer"
Cohesion: 0.11
Nodes (18): ANSI, appendToLogFile(), COLOR_ENABLED, disableFileLogging(), initLogFile(), isLevel(), Level, LEVEL_ORDER (+10 more)

### Community 98 - "triageManager.ts"
Cohesion: 0.27
Nodes (11): groupOrientation(), layoutToSizes(), panelId(), panelPercent(), SplitTree(), SplitTreeProps, SplitOrientation, isShortcutDetail() (+3 more)

### Community 99 - "reviewPublishingGuard.ts"
Cohesion: 0.07
Nodes (31): API_GUARDS, API_READ_METHOD_SET, ApiGuard, AZ_INVOKE_COMMAND, AZ_INVOKE_METHOD_LONG_FLAGS, AZ_INVOKE_WRITE_INPUT_LONG_FLAGS, AZ_PR_WRITE_PATTERN, AZ_PR_WRITE_SUBCOMMANDS (+23 more)

### Community 100 - ".startVerification"
Cohesion: 0.22
Nodes (3): reviewKey(), verificationPrompt(), verifiedFindings()

### Community 101 - "codexProvider.test.ts"
Cohesion: 0.12
Nodes (13): directories, initializeParamsSchema, log, requestSchema, rpcError(), rpcResult(), rpcResponseSchema, toolCallParamsSchema (+5 more)

### Community 102 - "DescriptionTab.tsx"
Cohesion: 0.10
Nodes (44): pairedRuntimeCodexEffort(), Capabilities, AskPanel(), CleanPrPanel(), CodexAgentFields(), CodexConnectionStatus(), STATUS_LABELS, PrdAnnotatorProps (+36 more)

### Community 103 - "TerminalSession"
Cohesion: 0.08
Nodes (11): FakePaneStream, RealPaneStream, PaneStream, dataMessage(), normalizeSeed(), safeParse(), send(), TerminalSession (+3 more)

### Community 104 - "reviewPass.ts"
Cohesion: 0.24
Nodes (3): ActiveReview, reviewPrompt(), ReviewKind

### Community 105 - ".finishTicket"
Cohesion: 0.28
Nodes (7): featureBranch(), slugify(), createSplitChildren(), failSplitMother(), performSplit(), splitChildDefaults(), splitMotherBranch()

### Community 106 - ".publishReviewUnderRepoLock"
Cohesion: 0.15
Nodes (5): renderFinding(), ReviewReportLabels, mapReviewApprovalRow(), mapReviewPassRow(), parsePersistedReviewFindings()

### Community 107 - "azureRemote.ts"
Cohesion: 0.40
Nodes (10): azureOrgUrl(), fromAzureSegments(), fromCollectionSegments(), fromLegacySegments(), fromSshSegments(), parseAzureRepoRef(), parseRemoteLocation(), RemoteLocation (+2 more)

### Community 109 - "contract.test.ts"
Cohesion: 0.27
Nodes (12): apiWriteDenyScript(), ConfigValue, extractCommandScript(), perSegmentScript(), prepareNoVerifyHook(), reviewPublishingGuardScript(), shellDeny(), shellDenyOnMatch() (+4 more)

### Community 110 - "Profile"
Cohesion: 0.11
Nodes (13): mapCommentRow(), mapProfileRow(), nullableBooleanValue(), agentPairError(), createApiRoutes(), isBlocked(), isSplitMother(), jsonError() (+5 more)

### Community 111 - "agentSession.ts"
Cohesion: 0.24
Nodes (8): effectivePort(), isAllowedHost(), isAllowedOrigin(), isAuthorized(), isLoopbackHost(), jsonResponse(), parseHost(), PublicMcpManager

### Community 112 - "AgentSessionEvent"
Cohesion: 0.29
Nodes (10): isProcessing(), ACTIVE_STAGES, ActionContext, buildActions(), ConfirmSpec, errorMessage(), RETRY_STAGES, TicketAction (+2 more)

### Community 113 - "bootstrap.ts"
Cohesion: 0.40
Nodes (5): StatRecord, StatCard(), StatCardProps, StatEmpty(), UseStatsResult

### Community 114 - "prUrl.ts"
Cohesion: 0.27
Nodes (9): NOTE: Radix's dismissable layer registers its Escape listener on `document` in t, useCaptureEscape(), collectMatchRanges(), isShortcutDetail(), ShortcutDetail, supportsHighlightApi(), usePrdSearch(), UsePrdSearchOptions (+1 more)

### Community 115 - "useLocalDraft.ts"
Cohesion: 0.05
Nodes (34): RecordingSystemAdapter, dryRunLog, fakeEncoder, hexToBytes(), CLAUDE_JSON_PATH, COMPOSER_BINARIES, INSTALL_COMMANDS, log (+26 more)

### Community 116 - "settings.tsx"
Cohesion: 0.08
Nodes (35): RFC-4180, isNotionUrl(), NOTION_HOSTS, ProjectInfo, AgentsViewProps, AskPanelProps, CleanPrPanelProps, ImportTicketsPanel() (+27 more)

### Community 117 - "WorkflowView.tsx"
Cohesion: 0.27
Nodes (7): createMcpServer(), invalidInput(), OutputValidator, toolError(), toolResult(), FeasibilityStarter, isProcessing()

### Community 118 - "Comment"
Cohesion: 0.25
Nodes (4): CodexAppServerConnection, connectCodexAppServer(), verifyCodexBinaryVersion(), CodexRuntimeDependencies

### Community 119 - "ColumnActionsMenu.tsx"
Cohesion: 0.38
Nodes (4): formatCommitTimeout(), TimeoutUnit, timeoutUnitMs(), timeoutUnitOf()

### Community 121 - "profileMatching.test.ts"
Cohesion: 0.40
Nodes (5): CodexBinaryVersionError, require, resolveCodexBinary(), resolveCodexBinaryOverride(), TARGETS

### Community 122 - "uploads.ts"
Cohesion: 0.40
Nodes (5): MIME_EXTENSIONS, resolveExtension(), SavedUpload, saveUpload(), serveUpload()

### Community 123 - "recordOutcome"
Cohesion: 0.40
Nodes (6): FAILURE_COLUMNS, SUCCESS_COLUMNS, OutcomeChart(), SuccessRateChart(), outcomeCounts(), recordOutcome()

### Community 124 - "createCodexProvider"
Cohesion: 0.40
Nodes (3): createCodexAgentSession(), createCodexProvider(), PreparedHook

### Community 125 - "PrSelectRow.tsx"
Cohesion: 0.60
Nodes (3): PrSelectRow(), PrSelectRowProps, isPrNeedsAttention()

### Community 126 - "useSavedFlash.ts"
Cohesion: 0.50
Nodes (4): SavedFlag, SavedFlash, useSavedFlag(), useSavedFlash()

### Community 127 - "codexAppServer.test.ts"
Cohesion: 0.67
Nodes (3): fakeAppServer(), temporaryDirectories, writeFixture()

### Community 129 - "ApiDenyPatterns"
Cohesion: 0.67
Nodes (4): ApiDenyPatterns, ereFlagAlternatives(), ereMethod(), ereWriteInput()

## Knowledge Gaps
- **682 isolated node(s):** `What this is`, `Commands`, `graphify`, `The dry-run safety model — read before running anything`, `Architecture` (+677 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Ticket` connect `TicketCard.tsx` to `Contract Building & Slots`, `Desktop Bootstrap & Menus`, `PR Selection & Slots Bar`, `Core Domain Concepts`, `Database Store Operations`, `Coordinator & Protocol`, `Live Terminal Views`, `Store Types & Agent Knobs`, `DB Row Schemas & Mappers`, `Dev Dependencies`, `Client Hub & Watchdog`, `Cost & Pricing`, `Agents View & Ticket Cards`, `NPM Scripts`, `Ticket Config & Constants`, `Ticket Detail & Triage UI`, `Slot State`, `Community 51`, `Community 54`, `triageManager.ts`, `Package Manifest`, `splitManager.ts`, `Community 63`, `contract.test.ts`, `TerminalView.tsx`, `.handleRequest`, `usePrdSearch.ts`, `TicketCost.tsx`, `createMcpServer`, `usePrdSearch.ts`, `uploads.ts`, `.addComment`, `DescriptionTab.tsx`, `reviewPass.ts`, `.publishReviewUnderRepoLock`, `reformulate.ts`, `AgentSessionEvent`, `settings.tsx`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._
- **Why does `Store` connect `.addComment` to `Desktop Bootstrap & Menus`, `Feasibility Batch Management`, `PR Selection & Slots Bar`, `Core Domain Concepts`, `Database Store Operations`, `Coordinator & Protocol`, `Store Types & Agent Knobs`, `Dev Dependencies`, `Cost & Pricing`, `Agents View & Ticket Cards`, `NPM Scripts`, `Agent Profile Config`, `Slot State`, `Community 54`, `CSV Parsing`, `TicketCard.tsx`, `Community 63`, `button.tsx`, `usePrdSearch.ts`, `createMcpServer`, `.startVerification`, `.finishTicket`, `.publishReviewUnderRepoLock`, `Profile`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Why does `DelegationManager` connect `Community 51` to `NPM Scripts`, `Feasibility Batch Management`, `.startVerification`, `reviewPass.ts`, `.publishReviewUnderRepoLock`, `button.tsx`, `Slot State`, `Store Types & Agent Knobs`, `createMcpServer`, `TicketCard.tsx`, `Cost & Pricing`, `Agents View & Ticket Cards`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **What connects `What this is`, `Commands`, `graphify` to the rest of the system?**
  _693 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Contract Building & Slots` be split into smaller, more focused modules?**
  _Cohesion score 0.03560250391236307 - nodes in this community are weakly interconnected._
- **Should `Terminals UI & Notifications` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._
- **Should `Desktop Bootstrap & Menus` be split into smaller, more focused modules?**
  _Cohesion score 0.13630229419703105 - nodes in this community are weakly interconnected._