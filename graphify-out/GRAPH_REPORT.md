# Graph Report - kanban-agents  (2026-09-22)

## Corpus Check
- 273 files · ~745,935 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3008 nodes · 8318 edges · 129 communities (118 shown, 11 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 53 edges (avg confidence: 0.66)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `561d72c8`
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
- ColumnActionsMenu.tsx
- resolveTemplatePaths
- profileMatching.test.ts
- uploads.ts
- createCodexProvider
- PrSelectRow.tsx
- useSavedFlash.ts
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

## Communities (129 total, 11 thin omitted)

### Community 0 - "Contract Building & Slots"
Cohesion: 0.04
Nodes (51): ActionExecutionOptions, actionExecutionOptionsSchema, agentMessageSchema, appSettingsSchema, automationRunSchema, automationSchema, baseBranchSchema, capabilitiesSchema (+43 more)

### Community 1 - "Terminals UI & Notifications"
Cohesion: 0.09
Nodes (27): analyzeTicketsInputSchema, analyzeTicketsOutputSchema, columnSchema, compactTicketSchema, createTodoTicketOutputSchema, editableTicketSchema, effectivePort(), isAllowedHost() (+19 more)

### Community 2 - "Desktop Bootstrap & Menus"
Cohesion: 0.10
Nodes (10): assertCodexImplementerAvailable(), SlotManager, slotPath(), mapSlotRow(), mapWorktreeSessionRow(), enrichWorktreeSession(), TERMINAL_STAGES, Slot (+2 more)

### Community 3 - "Feasibility Batch Management"
Cohesion: 0.07
Nodes (36): log, ToolHandler, ToolResult, addUsageByModel(), toUsageByModel(), TRIAGE_VERDICTS, AgentSettableStage, agentSettableStageSchema (+28 more)

### Community 4 - "Ticket Action Panels"
Cohesion: 0.13
Nodes (20): AGENT_EFFORT_LABELS, AGENT_MODEL_LABELS, AutomationCard(), AutomationCardProps, AutomationFormProps, AutomationView(), EMPTY_FORM, formFromAutomation() (+12 more)

### Community 5 - "Fake System Adapter"
Cohesion: 0.07
Nodes (38): boundedCommandDetail(), runBoundedCommand(), safeJsonParse(), renderOutsideDiffComment(), renderOutsideDiffSection(), ReviewPublicationComment, ReviewPublicationEvent, azureChangeEntrySchema (+30 more)

### Community 6 - "Shared Zod Schemas"
Cohesion: 0.07
Nodes (27): BoundedCommandResult, withJsonRequestFile(), connectionFailure(), connectionResult(), extractPrUrl(), ghPrHeadSchema, ghPrSchema, ghPrStateSchema (+19 more)

### Community 7 - "Settings & Profiles UI"
Cohesion: 0.07
Nodes (6): delay(), fakeShellPrompt(), FakeSystemAdapter, hexToBytes(), ReviewDoneOptions, WorktreeSetupOptions

### Community 8 - "PR Selection & Slots Bar"
Cohesion: 0.16
Nodes (14): assertExecutionAvailable(), CODEX_LAUNCH_STATUS_MESSAGES, CodexCapabilityReader, ExecutionDefaults, FEASIBILITY_ENGINE_EXECUTION, resolveExecution(), resolveFeasibilityExecution(), resolveTicketExecution() (+6 more)

### Community 9 - "Real System Adapter"
Cohesion: 0.08
Nodes (27): AgentDefaultsSettings(), AppearanceSettings(), CODEX_STATUS_TONES, COMMIT_ROW, DefaultsRowSpec, EFFORT_OPTIONS, FEASIBILITY_ROW, IMPLEMENTATION_ROW (+19 more)

### Community 10 - "Slot Config & Worktree Watch"
Cohesion: 0.18
Nodes (12): terminalServerMessageSchema, badgeLabelFor(), LiveTerminal(), LiveTerminalOptions, LiveTerminalProps, TerminalCell(), TerminalCellProps, TERMINAL_THEME (+4 more)

### Community 11 - "Core Domain Concepts"
Cohesion: 0.04
Nodes (48): agentMessageRowSchema, AutomationRow, automationRowSchema, AutomationRunRow, automationRunRowSchema, buildScripts(), CommentRow, commentRowSchema (+40 more)

### Community 12 - "Board & Sidebar Layout"
Cohesion: 0.04
Nodes (26): NewProject, ProjectPatch, CLAUDE_JSON_PATH, COMPOSER_BINARIES, detectInstallCommand(), INSTALL_COMMANDS, log, NON_INTERACTIVE_ENV (+18 more)

### Community 13 - "Database Store Operations"
Cohesion: 0.09
Nodes (35): main(), scalar(), cleanTicket(), conflictTicket(), REVIEW_OPTS, reviewTicket(), TICKET_OPTS, assertCodexDowngradeSafe() (+27 more)

### Community 14 - "Coordinator & Protocol"
Cohesion: 0.07
Nodes (30): ProjectInUseError, agentPairError(), cleanDescription(), isWebOnlyPath(), jsonError(), log, prSummaryLines(), reviewDescription() (+22 more)

### Community 15 - "API Routes & Reformulate"
Cohesion: 0.15
Nodes (14): accountResponseSchema, hasExplicitCodexApiKey(), isProtocolIncompatibility(), listRuntimeModels(), modelListResponseSchema, modelSchema, probeCodexRuntime(), status() (+6 more)

### Community 16 - "Stats Aggregation"
Cohesion: 0.40
Nodes (8): agentBaseEnv(), bestInstalledMatch(), compareParts(), envWithProjectNode(), nvmNodeBinDir(), readNvmrc(), prepareProjectShell(), shellLiteral()

### Community 17 - "Triage & Server Hub"
Cohesion: 0.08
Nodes (25): devDependencies, autoprefixer, class-variance-authority, clsx, concurrently, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities (+17 more)

### Community 18 - "Live Terminal Views"
Cohesion: 0.08
Nodes (36): AZURE_BASH_ALLOWLIST, AZURE_CLEAN_BASH_ALLOWLIST, BASH_ALLOWLIST, bashAllowlist(), buildFeasibilitySessionConfig(), buildImplementSessionConfig(), buildSplitSessionConfig(), buildTriageSessionConfig() (+28 more)

### Community 19 - "Stage Progress & Display"
Cohesion: 0.08
Nodes (24): compilerOptions, allowImportingTsExtensions, baseUrl, esModuleInterop, isolatedModules, jsx, lib, module (+16 more)

### Community 20 - "Real Adapter GH/Composer"
Cohesion: 0.09
Nodes (28): Kind, KINDS, codexModelSchema, CodexTierSummary(), DurationChart(), ThroughputChart(), effectiveWorkDurationMs(), CodexTierSummary (+20 more)

### Community 21 - "Store Types & Agent Knobs"
Cohesion: 0.10
Nodes (44): buildAskContract(), buildCleanContract(), buildConflictResolutionContract(), buildFeasibilityContextSection(), buildImplementingSteps(), buildMockupReviewStep(), buildPlanningStep(), buildPrdBullet() (+36 more)

### Community 22 - "DB Row Schemas & Mappers"
Cohesion: 0.07
Nodes (47): COLUMN_SORT_FIELD, AgentCard(), AgentCardProps, AgentsView(), AgentsViewProps, hasLiveAgent(), normalize(), BoardColumn() (+39 more)

### Community 23 - "Dev Dependencies"
Cohesion: 0.10
Nodes (20): TicketCreationRequestConflictError, AnalyzeTicketRejectionReason, AnalyzeTicketsResult, CreateTodoTicketInput, createTodoTicketInputSchema, CreateTodoTicketResult, log, normalizeCreateInput() (+12 more)

### Community 24 - "TypeScript Config"
Cohesion: 0.12
Nodes (25): logRejection(), ensureClaudeBinary(), bashCommandSchema, buildSettings(), claudeProvider, createSdkAgentSession(), denyBashHook(), denyNoVerifyHook (+17 more)

### Community 25 - "Client Hub & Watchdog"
Cohesion: 0.09
Nodes (30): Comment, AskPanel(), ActivityTab(), ActivityTabProps, isUnanswered(), NO_COMMENT_COLUMNS, AUTHOR_BADGES, AuthorBadge() (+22 more)

### Community 26 - "Cost & Pricing"
Cohesion: 0.09
Nodes (22): ActiveDelegation, ActiveReviewPass, ClosableExecution, log, orderedReviewKinds(), renderCollapsedFinding(), renderPersistedReviewResult(), REVIEW_DISALLOWED_TOOLS (+14 more)

### Community 27 - "Workflow View & Lifecycle"
Cohesion: 0.06
Nodes (28): Architecture, Commands, Conventions (enforced — beyond the global ones in ~/.claude/CLAUDE.md), graphify, The dry-run safety model — read before running anything, What this is, Agent runtime (Agent SDK), Architecture (+20 more)

### Community 28 - "Stats Charts"
Cohesion: 0.07
Nodes (28): agentMessageDeltaSchema, agentToml(), buildMcpServers(), ConfigObject, configReadResponseSchema, describeCodexError(), emptyResponseSchema, errorNotificationSchema (+20 more)

### Community 29 - "Session Hub & Agent Session"
Cohesion: 0.17
Nodes (5): CodexAppServerConnection, CodexAppServerNotification, CodexAppServerOptions, AppServerFixture, CodexRuntimeDependencies

### Community 31 - "PRD Review & Markdown"
Cohesion: 0.12
Nodes (13): CodexAppServerInitializationError, CodexAppServerProtocolError, connectCodexAppServer(), incomingSchema, initializeResponseSchema, log, PendingRequest, rpcErrorSchema (+5 more)

### Community 32 - "User Terminal & Fake IO"
Cohesion: 0.11
Nodes (28): agentEffortSchema, Capabilities, codexEffortSchema, DragHandleAttributes, DragHandleListeners, ProfileRow(), ProfileRowHeader(), ProfileRowProps (+20 more)

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
Cohesion: 0.16
Nodes (6): AutomationManager, mapAutomationRow(), mapAutomationRunRow(), AutomationRunStatus, Automation, AutomationRun

### Community 39 - "Agent Coordinator Handlers"
Cohesion: 0.11
Nodes (27): artifactPath, assertPackageVersionInSync(), assertSdkVersionsInSync(), BUILT_DMG, ELECTROBUN_BIN, fail(), installedPackageVersion(), RELEASE_FOLDER (+19 more)

### Community 40 - "API Client Inputs"
Cohesion: 0.13
Nodes (25): AGENT_EFFORT_FULL_LABELS, AGENT_MODEL_FULL_LABELS, CODEX_EFFORT_FULL_LABELS, CODEX_EFFORT_LABELS, CODEX_MODEL_LABELS, FEASIBILITY_ENGINE_LABELS, IMPLEMENTER_LABELS, ORCHESTRATOR_LABELS (+17 more)

### Community 41 - "Ticket Config & Constants"
Cohesion: 0.08
Nodes (24): WsClientEvent, wsClientEventSchema, Toaster(), COLUMN_NODE_COLOR, depthOf(), truncate(), WorkflowView(), WorkflowViewProps (+16 more)

### Community 42 - "Ticket Detail & Triage UI"
Cohesion: 0.11
Nodes (17): AUTOMATION_RUN_STATUSES, AUTOMATION_TRIGGER_LABELS, AUTOMATION_TRIGGERS, COMMENT_AUTHORS, COMMIT_LANGUAGE_LABELS, COMMIT_LANGUAGES, FEASIBILITY_ENGINES, IMPLEMENTERS (+9 more)

### Community 43 - "Demo Pipeline Concepts"
Cohesion: 0.11
Nodes (25): FAILURE_COLUMNS, SUCCESS_COLUMNS, StatEmpty(), ACTIVE_BAR, AREA_CURSOR, AXIS_PROPS, BAR_CURSOR, CHART_PALETTE (+17 more)

### Community 44 - "Chart Primitives"
Cohesion: 0.10
Nodes (17): Watchdog, PROJECT_ROOT, NOTE: PRD generation holds the request open up to ~120s (REFORMULATE_TIMEOUT_MS), resolveDataFile(), resolveServerPort(), RunningServer, serveStaticAsset(), SocketData (+9 more)

### Community 45 - "Session Hub Transcript"
Cohesion: 0.31
Nodes (13): abortReason(), computeCodeFingerprint(), FingerprintEntry, FingerprintPhase, hashFingerprintPaths(), isMissingFileError(), listFingerprintPaths(), log (+5 more)

### Community 46 - "Community 46"
Cohesion: 0.27
Nodes (15): Agent Implementation Config, Argus Code Review, Automated Tests (typecheck/lint/test), Claude Code Autonomous Agent, Ticket Contract Injection, Feasibility Analysis, Kanban Board (Atelier), Kanban Agents Demo (demo.gif) (+7 more)

### Community 47 - "Modal Dialogs"
Cohesion: 0.08
Nodes (6): mergeAgentUsageByModel(), previewToolInput(), renderSessionEvent(), SessionHub, SessionHubHandlers, SessionStartCallbacks

### Community 48 - "Community 48"
Cohesion: 0.14
Nodes (14): CreateProjectInput, ManagedProject, UpdateProjectInput, vcsProviderSchema, ConnectionHint, isPositiveIntegerString(), isValidDraft(), ProjectListRowProps (+6 more)

### Community 49 - "Slot State"
Cohesion: 0.09
Nodes (23): log, setup(), startFeasibilityTicket(), log, ReformulateManager, DRY_RUN_VERDICT, log, TriageSession (+15 more)

### Community 50 - "Stats Hooks & Cards"
Cohesion: 0.16
Nodes (12): ChartConfig, ChartContainer, ChartContainerProps, ChartContext, ChartContextValue, ChartLegendContent(), ChartLegendContentProps, ChartTooltipContent() (+4 more)

### Community 51 - "Community 51"
Cohesion: 0.10
Nodes (6): childTranscriptPrefix(), DelegationManager, ReviewReportLabels, mapReviewApprovalRow(), mapReviewPassRow(), parsePersistedReviewFindings()

### Community 52 - "chart.tsx"
Cohesion: 0.25
Nodes (12): McpSettings(), AppSettingsState, flashSaved(), loadOnce(), patchAppSettings(), publish(), snapshot(), state (+4 more)

### Community 53 - "User Terminal Manager"
Cohesion: 0.33
Nodes (5): CONTEXT — domain glossary, Execution, Proposed (not yet built), Seams, Work items

### Community 54 - "Community 54"
Cohesion: 0.22
Nodes (27): ExecutionOverrides, ProjectKey, AutomationPatch, NewAsk, NewAutomation, NewClean, NewProfile, NewReview (+19 more)

### Community 55 - "App.tsx"
Cohesion: 0.10
Nodes (14): resolveBaseBranch(), buildFeasibilityBatchContract(), truncateDescription(), ResolvedExecution, DRY_RUN_VERDICT, FeasibilityBatchManager, FeasibilityGroup, FeasibilitySession (+6 more)

### Community 56 - "CSV Parsing"
Cohesion: 0.14
Nodes (24): ExecutionFinishStatus, LiveSession, log, PendingSessionMessage, renderChannelEvent(), renderImplementationDone(), SessionExecutionContext, SessionExecutionFinish (+16 more)

### Community 57 - "Community 57"
Cohesion: 0.17
Nodes (17): ensureConfig(), boot(), externalUrlFromNewWindowEvent(), forwardAtelierShortcut(), installApplicationMenu(), installMenuShortcutBridge(), menuShortcutActionSchema, navigationEventSchema (+9 more)

### Community 58 - "File Uploads"
Cohesion: 0.36
Nodes (5): applyDesktopEnv(), DesktopRoots, ensureMcpToken(), regenerateMcpToken(), temporaryDirectories

### Community 59 - "triageManager.ts"
Cohesion: 0.31
Nodes (13): buildContractConstraintsLines(), buildResponseFormatLines(), buildStrictRulesLines(), buildTicketLines(), buildTriageChannelPrompt(), buildTriagePlusChannelPrompt(), isEnglish(), readOnlyFramingLines() (+5 more)

### Community 60 - "Package Manifest"
Cohesion: 0.20
Nodes (11): applyTranscriptUpdate(), TranscriptState, transcriptText(), transcriptUpdateSchema, FullscreenToggle(), FullscreenToggleProps, TerminalData, TerminalView() (+3 more)

### Community 61 - "splitManager.ts"
Cohesion: 0.07
Nodes (38): FILLED_GLYPH_COLORS, StageProgressBar(), TICKET_TAB_LABELS, TicketTab, TicketTabs(), TicketTabsProps, availableTabs(), hasSessionPane() (+30 more)

### Community 62 - "TicketCard.tsx"
Cohesion: 0.19
Nodes (6): TicketLifecycle, Ticket, TriageResult, StageProgressBarProps, DescriptionTabProps, PrdTabProps

### Community 63 - "Community 63"
Cohesion: 0.15
Nodes (8): RecordingSystemAdapter, PublishReviewOptions, PublishReviewResult, ReviewPublicationState, GithubVcsClient, pullApiEndpoint(), rightSideDiffLines(), ReviewPublicationCheck

### Community 64 - "Composer Run Script"
Cohesion: 0.14
Nodes (10): AckSystem, RecordingSystem, RecordedSession, RecordingSystem, RelaunchSystem, AgentProvider, AgentSessionEvent, AgentSessionHandle (+2 more)

### Community 65 - "split.ts"
Cohesion: 0.10
Nodes (26): DEFAULT_MODELS, AttachExecutionSessionInput, EnqueueAgentMessageInput, FinalizeExecutionInput, MarkAgentMessageAcceptedInput, MarkAgentMessageReceivedInput, MarkAgentMessageRejectedInput, persistedReviewFindingsSchema (+18 more)

### Community 66 - "OpenPr"
Cohesion: 0.15
Nodes (9): CodexAppServerRpcError, canonicalJson(), CodexCommandHook, codexSessionPreToolUseHookHash(), JsonValue, AppServerFixtureOptions, hookPathForSession(), RecordedRequest (+1 more)

### Community 67 - "UserTerminalManager"
Cohesion: 0.33
Nodes (3): FailedReformulation, ActionSystem, ReformulateOptions

### Community 68 - "schema.test.ts"
Cohesion: 0.11
Nodes (25): PrdAnnotator(), PrdAnnotatorProps, BREADCRUMB, NO_ANNOTATIONS, PrdReviewDialog(), PrdReviewDialogProps, ABSOLUTE_UPLOAD_PATH, ImageLightboxProps (+17 more)

### Community 69 - "contract.test.ts"
Cohesion: 0.15
Nodes (19): dedupeFindings(), findingAnchor(), FRENCH_STOP_WORD_PATTERN, FRENCH_STOP_WORDS, hasSimilarSummary(), isSameDefect(), isSelfRefuting(), jaccard() (+11 more)

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
Nodes (18): AnalyzeTicketsInput, CreateAskInput, CreateAutomationInput, CreateCleanInput, CreateCommentInput, CreateProfileInput, CreateReviewInput, CreateTicketInput (+10 more)

### Community 74 - "button.tsx"
Cohesion: 0.11
Nodes (18): log, SlotWatch, WorktreeAddressWatcher, runFirstBootSetup(), applyAppSettingsToModels(), projectConfigSchema, buildAppSettingsPatch(), LegacyConfig (+10 more)

### Community 75 - ".handleRequest"
Cohesion: 0.18
Nodes (15): isCodexFastServiceTier(), summarizeSessionCosts(), totalTokensOfSessions(), executionCosts(), executionTokens(), projectStatRecord(), CostSummary(), MetaRow() (+7 more)

### Community 76 - "usePrdSearch.ts"
Cohesion: 0.17
Nodes (14): costByFamily(), costOf(), costOfModel(), costOfSessions(), CostSummary, FamilyPricing, MODEL_PRICING, ModelFamily (+6 more)

### Community 78 - "csv.ts"
Cohesion: 0.25
Nodes (8): CapabilityCache, CodexRuntimeModel, codexRuntimeModelSchema, CodexRuntimeStatus, codexRuntimeStatusSchema, pairedRuntimeCodexEffort(), UNKNOWN_CODEX_RUNTIME_STATUS, pairedCodexEffort()

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
Cohesion: 0.18
Nodes (6): DesktopRequests, McpTokenSource, WebviewRequests, createMcpSettingsController(), McpSettingsControllerDependencies, temporaryDirectories

### Community 86 - "TicketCost.tsx"
Cohesion: 0.07
Nodes (43): App(), HOME_VIEW_OPTIONS, HomeView, PrdView(), QuitConfirmModal(), QuitConfirmModalProps, NAV_ENTRIES, NavEntry (+35 more)

### Community 87 - "createMcpServer"
Cohesion: 0.17
Nodes (10): CHILD_USAGE, FULL_REVIEW_KINDS, LIGHT_REVIEW_KINDS, newDelegatedTicket(), newReviewTicket(), RecordedSession, setup(), sleep() (+2 more)

### Community 89 - "usePrdSearch.ts"
Cohesion: 0.16
Nodes (10): CompactTicket, ListTicketsInput, Column, BoardColumnProps, DEFAULT_OPEN, NOTE: an expanded column already owns the droppable id through its lane; registe, TerminalColumnsPanelProps, TerminalRowButton() (+2 more)

### Community 90 - "uploads.ts"
Cohesion: 0.26
Nodes (11): isProcessing(), ACTIVE_STAGES, COLUMN_ORDER, COLUMNS, ACTIVE_COLUMNS, Board(), BoardProps, isColumn() (+3 more)

### Community 91 - "AgentsView.tsx"
Cohesion: 0.27
Nodes (6): AtelierDesktopRpcSchema, McpSettingsMetadata, McpSettingsController, createMcpSettingsClient(), getMcpSettingsClient(), McpSettingsClient

### Community 92 - "useCapabilities.ts"
Cohesion: 0.26
Nodes (8): Block, blockText(), compactChunks(), firstCharCode(), TranscriptBuffer, trimBlockStart(), AgentStreamBlock, TranscriptUpdate

### Community 93 - "ColumnActionsMenu.tsx"
Cohesion: 0.25
Nodes (7): Azure DevOps support — state file, Decisions (validated by the owner, 2026-09-21), Goal, Known blockers for lots 3 and 4, Open questions, Progress, Verified on this machine (az 2.90.0, azure-devops 1.0.8)

### Community 94 - ".addComment"
Cohesion: 0.07
Nodes (15): renderFinding(), mapAgentMessageRow(), mapExecutionRunRow(), mapProfileRow(), mapTicketRow(), parseSessionUsage(), nullableBooleanValue(), SqlUpdateBuilder (+7 more)

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

### Community 101 - "codexProvider.test.ts"
Cohesion: 0.12
Nodes (13): directories, initializeParamsSchema, log, requestSchema, rpcError(), rpcResult(), rpcResponseSchema, toolCallParamsSchema (+5 more)

### Community 102 - "DescriptionTab.tsx"
Cohesion: 0.11
Nodes (36): CleanPrPanel(), CleanPrPanelProps, CodexAgentFields(), CodexConnectionStatus(), STATUS_LABELS, ImplementationAgentFields(), ProjectPrPicker(), ProjectPrPickerProps (+28 more)

### Community 103 - "TerminalSession"
Cohesion: 0.08
Nodes (10): FakePaneStream, PaneStream, dataMessage(), normalizeSeed(), safeParse(), send(), TerminalSession, TerminalSessionManager (+2 more)

### Community 104 - "reviewPass.ts"
Cohesion: 0.17
Nodes (13): ActiveReview, ReviewResult, DimensionFinding, keptFindings(), finding(), FULL_REVIEW_KINDS, LIGHT_REVIEW_KINDS, passDimensionFindings() (+5 more)

### Community 105 - ".finishTicket"
Cohesion: 0.21
Nodes (8): TICKET_OPTION, TicketOptionsToggleGroupProps, TicketOptionValues, ToggleGroup, ToggleGroupContext, ToggleGroupItem, Toggle, toggleVariants

### Community 106 - ".publishReviewUnderRepoLock"
Cohesion: 0.39
Nodes (6): buildSplitChannelPrompt(), buildTicketLines(), isEnglish(), CommitLanguage, extractFigmaUrls(), hasMockups()

### Community 107 - "azureRemote.ts"
Cohesion: 0.40
Nodes (10): azureOrgUrl(), fromAzureSegments(), fromCollectionSegments(), fromLegacySegments(), fromSshSegments(), parseAzureRepoRef(), parseRemoteLocation(), RemoteLocation (+2 more)

### Community 109 - "contract.test.ts"
Cohesion: 0.27
Nodes (12): apiWriteDenyScript(), ConfigValue, extractCommandScript(), perSegmentScript(), prepareNoVerifyHook(), reviewPublishingGuardScript(), shellDeny(), shellDenyOnMatch() (+4 more)

### Community 110 - "Profile"
Cohesion: 0.09
Nodes (13): featureBranch(), slugify(), mapCommentRow(), createApiRoutes(), createSplitChildren(), failSplitMother(), isBlocked(), isSplitMother() (+5 more)

### Community 111 - "agentSession.ts"
Cohesion: 0.28
Nodes (8): COLUMN_LABELS, columnSchema, STATUS_CONFIRMS, StatusConfirm, statusTitle(), TicketMeta(), TicketMetaProps, finishedKindLabel()

### Community 112 - "AgentSessionEvent"
Cohesion: 0.36
Nodes (8): ActionContext, buildActions(), ConfirmSpec, errorMessage(), RETRY_STAGES, TicketAction, TicketActions(), TicketActionsProps

### Community 114 - "prUrl.ts"
Cohesion: 0.27
Nodes (9): NOTE: Radix's dismissable layer registers its Escape listener on `document` in t, useCaptureEscape(), collectMatchRanges(), isShortcutDetail(), ShortcutDetail, supportsHighlightApi(), usePrdSearch(), UsePrdSearchOptions (+1 more)

### Community 115 - "useLocalDraft.ts"
Cohesion: 0.09
Nodes (8): DoneGateResult, ReviewHeadResult, FAKE_OPEN_PRS, FakeVcsClient, githubPrHeadRef(), CreatePrResult, VcsClient, PrState

### Community 116 - "settings.tsx"
Cohesion: 0.08
Nodes (40): RFC-4180, isNotionUrl(), NOTION_HOSTS, ProjectInfo, StatRecord, AgentProfileConfig(), AskPanelProps, ImportTicketsPanel() (+32 more)

### Community 117 - "WorkflowView.tsx"
Cohesion: 0.13
Nodes (11): createMcpServer(), invalidInput(), OutputValidator, PublicMcpManager, toolError(), toolResult(), FeasibilityStarter, isActive() (+3 more)

### Community 119 - "ColumnActionsMenu.tsx"
Cohesion: 0.38
Nodes (4): formatCommitTimeout(), TimeoutUnit, timeoutUnitMs(), timeoutUnitOf()

### Community 121 - "profileMatching.test.ts"
Cohesion: 0.40
Nodes (5): CodexBinaryVersionError, require, resolveCodexBinary(), resolveCodexBinaryOverride(), TARGETS

### Community 122 - "uploads.ts"
Cohesion: 0.40
Nodes (5): MIME_EXTENSIONS, resolveExtension(), SavedUpload, saveUpload(), serveUpload()

### Community 124 - "createCodexProvider"
Cohesion: 0.40
Nodes (3): createCodexAgentSession(), createCodexProvider(), PreparedHook

### Community 125 - "PrSelectRow.tsx"
Cohesion: 0.29
Nodes (4): OpenPr, PrSelectRow(), PrSelectRowProps, isPrNeedsAttention()

### Community 126 - "useSavedFlash.ts"
Cohesion: 0.50
Nodes (4): SavedFlag, SavedFlash, useSavedFlag(), useSavedFlash()

### Community 129 - "ApiDenyPatterns"
Cohesion: 0.67
Nodes (4): ApiDenyPatterns, ereFlagAlternatives(), ereMethod(), ereWriteInput()

## Knowledge Gaps
- **684 isolated node(s):** `name`, `version`, `private`, `type`, `dev` (+679 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Ticket` connect `TicketCard.tsx` to `Contract Building & Slots`, `Desktop Bootstrap & Menus`, `Ticket Action Panels`, `PR Selection & Slots Bar`, `Core Domain Concepts`, `Database Store Operations`, `Coordinator & Protocol`, `Live Terminal Views`, `Store Types & Agent Knobs`, `DB Row Schemas & Mappers`, `Dev Dependencies`, `Client Hub & Watchdog`, `Cost & Pricing`, `Agents View & Ticket Cards`, `NPM Scripts`, `API Client Inputs`, `Ticket Config & Constants`, `Slot State`, `Community 51`, `App.tsx`, `triageManager.ts`, `Package Manifest`, `splitManager.ts`, `split.ts`, `TerminalView.tsx`, `.handleRequest`, `TicketCost.tsx`, `createMcpServer`, `usePrdSearch.ts`, `uploads.ts`, `.addComment`, `.startVerification`, `reviewPass.ts`, `.publishReviewUnderRepoLock`, `reformulate.ts`, `Profile`, `agentSession.ts`, `AgentSessionEvent`, `settings.tsx`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **Why does `SystemAdapter` connect `Agents View & Ticket Cards` to `Desktop Bootstrap & Menus`, `Shared Zod Schemas`, `Settings & Profiles UI`, `PR Selection & Slots Bar`, `Board & Sidebar Layout`, `Store Types & Agent Knobs`, `Cost & Pricing`, `Agent Profile Config`, `Modal Dialogs`, `Slot State`, `Community 51`, `App.tsx`, `CSV Parsing`, `.addComment`, `.startVerification`, `TerminalSession`, `bootstrap.ts`, `useLocalDraft.ts`, `PrSelectRow.tsx`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **Why does `boot()` connect `Community 57` to `File Uploads`, `Chart Primitives`, `Community 82`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _695 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Contract Building & Slots` be split into smaller, more focused modules?**
  _Cohesion score 0.03918722786647315 - nodes in this community are weakly interconnected._
- **Should `Terminals UI & Notifications` be split into smaller, more focused modules?**
  _Cohesion score 0.09113300492610837 - nodes in this community are weakly interconnected._
- **Should `Desktop Bootstrap & Menus` be split into smaller, more focused modules?**
  _Cohesion score 0.09939637826961771 - nodes in this community are weakly interconnected._