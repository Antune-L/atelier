# Graph Report - kanban-agents  (2026-09-25)

## Corpus Check
- 267 files · ~747,204 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3033 nodes · 8449 edges · 131 communities (119 shown, 12 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 58 edges (avg confidence: 0.67)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `fa248a3c`
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
- createMcpServer
- .handleRequest
- TicketMeta.tsx
- .createTodoTicket
- Atelier
- .renderReviewReport
- routes.codex.test.ts
- .startReview
- profileMatching.test.ts

## God Nodes (most connected - your core abstractions)
1. `Store` - 122 edges
2. `Ticket` - 114 edges
3. `SystemAdapter` - 73 edges
4. `cn()` - 72 edges
5. `FakeSystemAdapter` - 66 edges
6. `RealSystemAdapter` - 64 edges
7. `SlotManager` - 53 edges
8. `VcsProvider` - 52 edges
9. `ProjectInfo` - 50 edges
10. `DelegationManager` - 48 edges

## Surprising Connections (you probably didn't know these)
- `McpSettingsClient` --references--> `McpSettingsMetadata`  [EXTRACTED]
  src/web/src/lib/mcpSettings.ts → desktop/mcpRpc.ts
- `StageProgressBarProps` --references--> `Ticket`  [EXTRACTED]
  src/web/src/components/StageProgressBar.tsx → src/shared/schemas.ts
- `DescriptionTabProps` --references--> `Ticket`  [EXTRACTED]
  src/web/src/components/ticket-detail/DescriptionTab.tsx → src/shared/schemas.ts
- `PrdTabProps` --references--> `Ticket`  [EXTRACTED]
  src/web/src/components/ticket-detail/PrdTab.tsx → src/shared/schemas.ts
- `TerminalTabProps` --references--> `Ticket`  [EXTRACTED]
  src/web/src/components/ticket-detail/TerminalTab.tsx → src/shared/schemas.ts

## Import Cycles
- 3-file cycle: `src/server/config.ts -> src/server/db/store.ts -> src/server/db/rows.ts -> src/server/config.ts`
- 3-file cycle: `src/server/agents/worktreeAddresses.ts -> src/server/config.ts -> src/server/db/store.ts -> src/server/agents/worktreeAddresses.ts`

## Communities (131 total, 12 thin omitted)

### Community 0 - "Contract Building & Slots"
Cohesion: 0.04
Nodes (66): ActionExecutionOptions, actionExecutionOptionsSchema, agentMessageSchema, AnalyzeTicketsInput, AppSettings, appSettingsSchema, automationRunSchema, automationSchema (+58 more)

### Community 1 - "Terminals UI & Notifications"
Cohesion: 0.10
Nodes (20): analyzeTicketsInputSchema, analyzeTicketsOutputSchema, columnSchema, compactTicketSchema, createTodoTicketOutputSchema, editableTicketSchema, listProjectsInputSchema, listProjectsOutputSchema (+12 more)

### Community 2 - "Desktop Bootstrap & Menus"
Cohesion: 0.12
Nodes (21): threadConfig(), accountResponseSchema, hasExplicitCodexApiKey(), isProtocolIncompatibility(), listRuntimeModels(), modelListResponseSchema, modelSchema, probeCodexRuntime() (+13 more)

### Community 3 - "Feasibility Batch Management"
Cohesion: 0.07
Nodes (36): log, ToolHandler, ToolResult, TRIAGE_VERDICTS, AgentSettableStage, agentSettableStageSchema, askUserArgsSchema, AssertNamesCovered (+28 more)

### Community 4 - "Ticket Action Panels"
Cohesion: 0.12
Nodes (11): AckSystem, ActiveDelegation, ClosableExecution, RecordingSystem, RecordedSession, RecordingSystem, RelaunchSystem, AgentProvider (+3 more)

### Community 5 - "Fake System Adapter"
Cohesion: 0.06
Nodes (39): BoundedCommandResult, runBoundedCommand(), safeJsonParse(), ReviewPublicationEvent, azureChangeEntrySchema, azureCommentSchema, AzureDevopsVcsClient, azureIdentitySchema (+31 more)

### Community 6 - "Shared Zod Schemas"
Cohesion: 0.13
Nodes (19): PrdAnnotatorProps, BREADCRUMB, NO_ANNOTATIONS, PrdReviewDialog(), PrdReviewDialogProps, Sheet(), SHEET_PUSHED_OFFSET, SHEET_WIDTH (+11 more)

### Community 7 - "Settings & Profiles UI"
Cohesion: 0.08
Nodes (7): delay(), fakeShellPrompt(), FakeSystemAdapter, hexToBytes(), ReviewDoneOptions, WorktreeSetupOptions, VcsProvider

### Community 8 - "PR Selection & Slots Bar"
Cohesion: 0.09
Nodes (35): FEASIBILITY_ENGINES, IMPLEMENTERS, ORCHESTRATORS, STAGE_LABELS, AgentCard(), FILLED_GLYPH_COLORS, StageProgressBar(), StageProgressBarProps (+27 more)

### Community 9 - "Real System Adapter"
Cohesion: 0.08
Nodes (37): CreateProjectInput, UpdateProjectInput, vcsProviderSchema, ConnectionHint, DragHandleAttributes, DragHandleListeners, groupProjects(), groupSortId() (+29 more)

### Community 10 - "Slot Config & Worktree Watch"
Cohesion: 0.11
Nodes (24): main(), scalar(), assertCodexDowngradeSafe(), backfillOrchestrator(), countRows(), createDatabase(), EXECUTION_MIGRATIONS, hasColumn() (+16 more)

### Community 11 - "Core Domain Concepts"
Cohesion: 0.04
Nodes (54): agentMessageRowSchema, AutomationRow, automationRowSchema, AutomationRunRow, automationRunRowSchema, buildScripts(), CommentRow, commentRowSchema (+46 more)

### Community 12 - "Board & Sidebar Layout"
Cohesion: 0.04
Nodes (21): CLAUDE_JSON_PATH, COMPOSER_BINARIES, detectInstallCommand(), INSTALL_COMMANDS, log, NON_INTERACTIVE_ENV, NOTION_IMPORT_ALLOWED_TOOLS, NOTION_READ_TOOLS (+13 more)

### Community 13 - "Database Store Operations"
Cohesion: 0.08
Nodes (41): RFC-4180, isNotionUrl(), NOTION_HOSTS, ProjectInfo, AgentProfileConfig(), AgentsViewProps, AskPanelProps, CleanPrPanelProps (+33 more)

### Community 14 - "Coordinator & Protocol"
Cohesion: 0.34
Nodes (13): ProfilePipeline(), buildProfilePipeline(), claudeDetail(), claudeSubagentDetail(), codexOrchestratorDetail(), codexSubagentParts(), implementerNodeValue(), implementerSummary() (+5 more)

### Community 15 - "API Routes & Reformulate"
Cohesion: 0.10
Nodes (17): CodexAppServerInitializationError, CodexAppServerProtocolError, connectCodexAppServer(), incomingSchema, initializeResponseSchema, log, PendingRequest, rpcErrorSchema (+9 more)

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
Cohesion: 0.09
Nodes (31): FAILURE_COLUMNS, Kind, KINDS, SUCCESS_COLUMNS, CodexTierSummary(), DurationChart(), ThroughputChart(), effectiveWorkDurationMs() (+23 more)

### Community 21 - "Store Types & Agent Knobs"
Cohesion: 0.17
Nodes (26): buildFeasibilityBatchContract(), buildFeasibilityContextSection(), buildImplementingSteps(), buildMockupReviewStep(), buildPlanningStep(), buildPrdBullet(), buildReviewContract(), buildReviewFixLines() (+18 more)

### Community 22 - "DB Row Schemas & Mappers"
Cohesion: 0.17
Nodes (17): PrdTab(), TICKET_TAB_LABELS, TicketTab, TicketTabs(), TicketTabsProps, availableTabs(), hasSessionPane(), initialTab() (+9 more)

### Community 23 - "Dev Dependencies"
Cohesion: 0.10
Nodes (17): TicketCreationRequestConflictError, AnalyzeTicketRejectionReason, AnalyzeTicketsResult, CreateTodoTicketInput, createTodoTicketInputSchema, CreateTodoTicketResult, isActive(), isBlocked() (+9 more)

### Community 24 - "TypeScript Config"
Cohesion: 0.13
Nodes (23): bashCommandSchema, buildSettings(), claudeProvider, createSdkAgentSession(), denyBashHook(), denyNoVerifyHook, denyReviewPublishingHook, denyTypecheckHook() (+15 more)

### Community 25 - "Client Hub & Watchdog"
Cohesion: 0.15
Nodes (4): AgentCoordinator, logRejection(), SessionToolCall, getErrorStack()

### Community 26 - "Cost & Pricing"
Cohesion: 0.18
Nodes (17): COLUMN_SORT_FIELD, BoardColumn(), compareFamilyMembers(), familyKeyOf(), groupTicketIds(), groupTicketsByFamily(), isSplitMother(), readCollapsed() (+9 more)

### Community 27 - "Workflow View & Lifecycle"
Cohesion: 0.12
Nodes (11): Architecture, Commands, Conventions (enforced — beyond the global ones in ~/.claude/CLAUDE.md), graphify, The dry-run safety model — read before running anything, What this is, Agent runtime (Agent SDK), Architecture (+3 more)

### Community 28 - "Stats Charts"
Cohesion: 0.07
Nodes (42): AgentMcpServerDefinition, agentMessageDeltaSchema, agentToml(), apiWriteDenyScript(), buildMcpServers(), ConfigObject, configReadResponseSchema, ConfigValue (+34 more)

### Community 29 - "Session Hub & Agent Session"
Cohesion: 0.10
Nodes (10): CodexAppServerConnection, CodexAppServerNotification, CodexAppServerOptions, CodexProviderDependencies, createCodexAgentSession(), inheritedMcpServerNames(), PreparedHook, prepareSkills() (+2 more)

### Community 30 - "Agents View & Ticket Cards"
Cohesion: 0.13
Nodes (11): directories, initializeParamsSchema, log, requestSchema, rpcError(), rpcResult(), rpcResponseSchema, toolCallParamsSchema (+3 more)

### Community 31 - "PRD Review & Markdown"
Cohesion: 0.15
Nodes (11): CodexAppServerRpcError, canonicalJson(), CodexCommandHook, codexSessionPreToolUseHookHash(), JsonValue, createCodexProvider(), AppServerFixtureOptions, hookPathForSession() (+3 more)

### Community 32 - "User Terminal & Fake IO"
Cohesion: 0.16
Nodes (24): ExecutionFinishStatus, LiveSession, log, PendingSessionMessage, previewToolInput(), renderSessionEvent(), SessionExecutionContext, SessionExecutionFinish (+16 more)

### Community 33 - "Logging"
Cohesion: 0.10
Nodes (21): scripts, build:desktop, build:web, dev, dev:desktop, dev:proxy, dev:server, dev:web (+13 more)

### Community 34 - "Board Columns"
Cohesion: 0.29
Nodes (8): Toaster(), COLUMN_NODE_COLOR, depthOf(), truncate(), WorkflowView(), WorkflowViewProps, WorktreeSessionsView(), useBoard()

### Community 35 - "NPM Scripts"
Cohesion: 0.16
Nodes (5): addUsageByModel(), toUsageByModel(), TicketLifecycle, ErrorDetailsSource, Ticket

### Community 36 - "Runtime Dependencies"
Cohesion: 0.09
Nodes (29): DEFAULT_MODELS, AttachExecutionSessionInput, EnqueueAgentMessageInput, FinalizeExecutionInput, MarkAgentMessageAcceptedInput, MarkAgentMessageReceivedInput, MarkAgentMessageRejectedInput, NewProject (+21 more)

### Community 37 - "Claude SDK Provider"
Cohesion: 0.09
Nodes (22): dependencies, @anthropic-ai/claude-agent-sdk, dompurify, elysia, @fontsource/ibm-plex-mono, @fontsource/ibm-plex-sans, marked, @modelcontextprotocol/sdk (+14 more)

### Community 38 - "Agent Profile Config"
Cohesion: 0.12
Nodes (22): isCodexFastServiceTier(), costByFamily(), costOf(), costOfModel(), costOfSessions(), CostSummary, FamilyPricing, MODEL_PRICING (+14 more)

### Community 39 - "Agent Coordinator Handlers"
Cohesion: 0.17
Nodes (18): adopt(), compareVersions(), detectionCandidates(), detectUserInstall(), downloadAndVerifyTarball(), downloadPinnedBinary(), emitProgress(), ensureClaudeBinary() (+10 more)

### Community 40 - "API Client Inputs"
Cohesion: 0.16
Nodes (5): childTranscriptPrefix(), DelegationManager, reviewKey(), mergeAgentUsageByModel(), AgentSessionEvent

### Community 41 - "Ticket Config & Constants"
Cohesion: 0.13
Nodes (22): ACTIVE_STAGES, ColumnActionsMenu(), ColumnActionsMenuProps, ColumnMenuItem, ActionContext, buildActions(), ConfirmSpec, errorMessage() (+14 more)

### Community 42 - "Ticket Detail & Triage UI"
Cohesion: 0.15
Nodes (17): ACTIVE_BAR, AREA_CURSOR, AXIS_PROPS, BAR_CURSOR, CHART_PALETTE, colorAt(), DurationBars(), DurationDatum (+9 more)

### Community 43 - "Demo Pipeline Concepts"
Cohesion: 0.16
Nodes (11): PaneStream, dataMessage(), log, normalizeSeed(), send(), TerminalSession, TerminalSocket, TerminalSocketData (+3 more)

### Community 44 - "Chart Primitives"
Cohesion: 0.31
Nodes (13): abortReason(), computeCodeFingerprint(), FingerprintEntry, FingerprintPhase, hashFingerprintPaths(), isMissingFileError(), listFingerprintPaths(), log (+5 more)

### Community 45 - "Session Hub Transcript"
Cohesion: 0.13
Nodes (8): slotPath(), mapSlotRow(), mapWorktreeSessionRow(), enrichWorktreeSession(), ClientSocket, Slot, WorktreeSession, BoardState

### Community 46 - "Community 46"
Cohesion: 0.27
Nodes (15): Agent Implementation Config, Argus Code Review, Automated Tests (typecheck/lint/test), Claude Code Autonomous Agent, Ticket Contract Injection, Feasibility Analysis, Kanban Board (Atelier), Kanban Agents Demo (demo.gif) (+7 more)

### Community 47 - "Modal Dialogs"
Cohesion: 0.20
Nodes (7): AZURE_COMMANDS, COMMANDS_BY_PROVIDER, GITHUB_COMMANDS, PrDiffContext, VcsCleanCommands, AZ_SETTLED_THREAD_STATUSES, VCS_PROVIDER_LABELS

### Community 48 - "Community 48"
Cohesion: 0.12
Nodes (11): agentPairError(), createApiRoutes(), isBlocked(), isProcessing(), isSplitMother(), isWebOnlyPath(), jsonError(), PaneReader (+3 more)

### Community 49 - "Slot State"
Cohesion: 0.11
Nodes (24): cleanTicket(), conflictTicket(), REVIEW_OPTS, reviewTicket(), TICKET_OPTS, CHILD_USAGE, FULL_REVIEW_KINDS, LIGHT_REVIEW_KINDS (+16 more)

### Community 50 - "Stats Hooks & Cards"
Cohesion: 0.16
Nodes (12): ChartConfig, ChartContainer, ChartContainerProps, ChartContext, ChartContextValue, ChartLegendContent(), ChartLegendContentProps, ChartTooltipContent() (+4 more)

### Community 51 - "Community 51"
Cohesion: 0.36
Nodes (3): CapabilityCache, CodexRuntimeStatus, runtime

### Community 52 - "repairPath.ts"
Cohesion: 0.10
Nodes (23): terminalServerMessageSchema, applyTranscriptUpdate(), TranscriptState, transcriptText(), transcriptUpdateSchema, FullscreenToggle(), FullscreenToggleProps, badgeLabelFor() (+15 more)

### Community 53 - "User Terminal Manager"
Cohesion: 0.33
Nodes (5): CONTEXT — domain glossary, Execution, Proposed (not yet built), Seams, Work items

### Community 54 - "Community 54"
Cohesion: 0.15
Nodes (8): RecordingSystemAdapter, boundedCommandDetail(), PublishReviewOptions, PublishReviewResult, ReviewPublicationState, GithubVcsClient, pullApiEndpoint(), ReviewPublicationCheck

### Community 55 - "App.tsx"
Cohesion: 0.13
Nodes (3): FeasibilityBatchManager, TriageManager, TriageResult

### Community 56 - "CSV Parsing"
Cohesion: 0.40
Nodes (4): mapCommentRow(), Comment, ActivityTabProps, CommentRowProps

### Community 57 - "Community 57"
Cohesion: 0.11
Nodes (13): AtelierDesktopRpcSchema, DesktopRequests, McpSettingsMetadata, McpTokenSource, WebviewRequests, createMcpSettingsController(), McpSettingsController, McpSettingsControllerDependencies (+5 more)

### Community 58 - "File Uploads"
Cohesion: 0.10
Nodes (14): FailedReformulation, dryRunLog, fakeEncoder, escapeHtml(), renderCollapsedDetails(), renderOutsideDiffComment(), renderOutsideDiffSection(), GitWorktreeAddOptions (+6 more)

### Community 59 - "triageManager.ts"
Cohesion: 0.38
Nodes (11): buildContractConstraintsLines(), buildResponseFormatLines(), buildStrictRulesLines(), buildTicketLines(), buildTriageChannelPrompt(), buildTriagePlusChannelPrompt(), isEnglish(), readOnlyFramingLines() (+3 more)

### Community 60 - "Package Manifest"
Cohesion: 0.33
Nodes (9): ReviewPrPanel(), getSnapshot(), INITIAL_SNAPSHOT, loadReviewCounts(), publish(), refreshReviewCounts(), subscribe(), subscribers (+1 more)

### Community 61 - "splitManager.ts"
Cohesion: 0.09
Nodes (30): resolveBaseBranch(), buildAskContract(), buildCleanContract(), buildConflictResolutionContract(), assertExecutionAvailable(), reviewPublicationEvent(), finding(), passDimensionFindings() (+22 more)

### Community 62 - "TicketCard.tsx"
Cohesion: 0.11
Nodes (26): ActivityTab(), isUnanswered(), NO_COMMENT_COLUMNS, AUTHOR_BADGES, AuthorBadge(), CommentRow(), DescriptionEdit, DescriptionTab() (+18 more)

### Community 63 - "Community 63"
Cohesion: 0.08
Nodes (10): DoneGateResult, ReviewHeadResult, FAKE_OPEN_PRS, FakeVcsClient, githubPrHeadRef(), VcsClient, isPrNeedsAttention(), OpenPr (+2 more)

### Community 64 - "Composer Run Script"
Cohesion: 0.35
Nodes (9): gitMetadataWritableRoots(), agentBaseEnv(), bestInstalledMatch(), compareParts(), envWithProjectNode(), nvmNodeBinDir(), readNvmrc(), prepareProjectShell() (+1 more)

### Community 65 - "split.ts"
Cohesion: 0.22
Nodes (11): StatRecord, StatCard(), StatCardProps, StatEmpty(), OutcomeChart(), SuccessRateChart(), StatsView(), StatsViewProps (+3 more)

### Community 67 - "TerminalView.tsx"
Cohesion: 0.13
Nodes (13): PROJECT_ROOT, NOTE: PRD generation holds the request open up to ~120s (REFORMULATE_TIMEOUT_MS), resolveDataFile(), resolveServerPort(), RunningServer, serveStaticAsset(), SocketData, startServer() (+5 more)

### Community 68 - "schema.test.ts"
Cohesion: 0.06
Nodes (44): PrdAnnotator(), ProjectPrPicker(), ProjectPrPickerProps, groupProjects(), groupReviewCount(), initialExpandedGroups(), normalizeSearch(), projectGroupIdentity() (+36 more)

### Community 69 - "reviewFindings.ts"
Cohesion: 0.11
Nodes (29): ReviewResult, ALSO_FLAGGED_PREFIX, dedupeFindings(), dedupeIdenticalFindings(), DEFAULT_FINDING_RENDER_STYLE, DimensionFinding, findingAnchor(), FRENCH_STOP_WORD_PATTERN (+21 more)

### Community 70 - "CodexRuntimeStatus"
Cohesion: 0.09
Nodes (21): WsClientEvent, wsClientEventSchema, ATTENTION_STATUSES, sessionOf(), SlotPips(), SlotPipsProps, STATUS_LABELS, STATUS_PIP_CLASSES (+13 more)

### Community 71 - "PostCSS Config"
Cohesion: 0.29
Nodes (6): name, overrides, zod, private, type, version

### Community 72 - "useAppSettings.ts"
Cohesion: 0.10
Nodes (11): setup(), setup(), SessionHub, Block, blockText(), compactChunks(), firstCharCode(), TranscriptBuffer (+3 more)

### Community 73 - "TerminalView.tsx"
Cohesion: 0.11
Nodes (37): AskPanel(), CleanPrPanel(), CodexConnectionStatus(), STATUS_LABELS, ImplementationAgentFields(), SessionDriverFields(), TriageSection(), Button (+29 more)

### Community 74 - "button.tsx"
Cohesion: 0.09
Nodes (27): AGENT_EFFORT_FULL_LABELS, AGENT_EFFORT_LABELS, AGENT_MODEL_FULL_LABELS, AGENT_MODEL_LABELS, AUTOMATION_RUN_STATUSES, CODEX_EFFORT_FULL_LABELS, CODEX_EFFORT_LABELS, CODEX_MODEL_LABELS (+19 more)

### Community 75 - ".handleRequest"
Cohesion: 0.11
Nodes (13): analyzeResultSchema, compactTicketSchema, createResultSchema, errorResultSchema, ISOLATED_ENV_KEYS, projectResultSchema, savedEnv, startResultSchema (+5 more)

### Community 76 - "usePrdSearch.ts"
Cohesion: 0.24
Nodes (9): CostSummary(), MetaRow(), MetaRowProps, TicketCost(), TicketCostProps, formatTokens(), formatUsd(), TOKEN_FORMATTER (+1 more)

### Community 78 - "csv.ts"
Cohesion: 0.06
Nodes (32): withJsonRequestFile(), extractPrUrl(), ghPrHeadSchema, ghPrSchema, ghPrStateSchema, ghRestPullSchema, ghRestReviewPagesSchema, ghRestReviewSchema (+24 more)

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
Cohesion: 0.11
Nodes (24): ActiveReview, ActiveReviewPass, CODEX_LAUNCH_STATUS_MESSAGES, CodexCapabilityReader, ExecutionDefaults, FEASIBILITY_ENGINE_EXECUTION, ResolvedExecution, resolveExecution() (+16 more)

### Community 86 - "useTickTimer.ts"
Cohesion: 0.23
Nodes (10): artifactPath, assertPackageVersionInSync(), assertSdkVersionsInSync(), BUILT_DMG, ELECTROBUN_BIN, fail(), installedPackageVersion(), RELEASE_FOLDER (+2 more)

### Community 87 - "mcpSettings.ts"
Cohesion: 0.24
Nodes (25): ExecutionOverrides, ProjectKey, NewAsk, NewClean, NewProfile, NewReview, NewTicket, ProfilePatch (+17 more)

### Community 89 - "usePrdSearch.ts"
Cohesion: 0.11
Nodes (24): CompactTicket, ListTicketsInput, Column, COLUMN_LABELS, COLUMN_ORDER, COLUMNS, ACTIVE_COLUMNS, Board() (+16 more)

### Community 90 - "PaneStream"
Cohesion: 0.11
Nodes (21): AutomationPatch, NewAutomation, AUTOMATION_TRIGGER_LABELS, AUTOMATION_TRIGGERS, AutomationRunStatus, AutomationTrigger, CreateAutomationInput, AutomationCard() (+13 more)

### Community 91 - "bootstrap.ts"
Cohesion: 0.31
Nodes (5): applyDesktopEnv(), DesktopRoots, ensureMcpToken(), regenerateMcpToken(), temporaryDirectories

### Community 93 - "ColumnActionsMenu.tsx"
Cohesion: 0.25
Nodes (7): Azure DevOps support — state file, Decisions (validated by the owner, 2026-09-21), Goal, Known blockers for lots 3 and 4, Open questions, Progress, Verified on this machine (az 2.90.0, azure-devops 1.0.8)

### Community 94 - ".addComment"
Cohesion: 0.11
Nodes (17): log, log, ReformulateManager, DRY_RUN_VERDICT, log, TriageSession, log, Watchdog (+9 more)

### Community 95 - "TicketConfigSummary.tsx"
Cohesion: 0.50
Nodes (3): appBundle, EMBEDDED_BINARIES, resourcesApp

### Community 97 - "RunningServer"
Cohesion: 0.29
Nodes (7): projectConfigSchema, buildAppSettingsPatch(), LegacyConfig, legacyConfigSchema, LegacyModels, log, pickModel()

### Community 98 - "usePrdSearch.ts"
Cohesion: 0.33
Nodes (7): isShortcutDetail(), ShortcutDetail, collectMatchRanges(), supportsHighlightApi(), usePrdSearch(), UsePrdSearchOptions, UsePrdSearchResult

### Community 99 - "reviewPublishingGuard.ts"
Cohesion: 0.07
Nodes (35): API_GUARDS, API_READ_METHOD_SET, ApiDenyPatterns, ApiGuard, AZ_INVOKE_COMMAND, AZ_INVOKE_METHOD_LONG_FLAGS, AZ_INVOKE_WRITE_INPUT_LONG_FLAGS, AZ_PR_WRITE_PATTERN (+27 more)

### Community 100 - ".startVerification"
Cohesion: 0.10
Nodes (21): BOARD_FINDING_RENDER_STYLE, log, renderFinding(), renderPersistedReviewResult(), REVIEW_DISALLOWED_TOOLS, REVIEW_REPORT_LABELS, REVIEW_REPORT_LABELS_EN, REVIEW_REPORT_LABELS_FR (+13 more)

### Community 101 - "codexProvider.test.ts"
Cohesion: 0.14
Nodes (17): App(), HOME_VIEW_OPTIONS, HomeView, NAV_ENTRIES, NavEntry, Sidebar(), SidebarProps, SidebarView (+9 more)

### Community 102 - ".start"
Cohesion: 0.05
Nodes (20): AutomationManager, startFeasibilityTicket(), ProjectConfig, mapAgentMessageRow(), mapAutomationRow(), mapAutomationRunRow(), mapProfileRow(), nullableBooleanValue() (+12 more)

### Community 103 - "TerminalSession"
Cohesion: 0.06
Nodes (4): log, runFirstBootSetup(), SystemAdapter, SLOT_COUNT

### Community 104 - "settings.tsx"
Cohesion: 0.15
Nodes (18): AgentCardProps, AgentsView(), hasLiveAgent(), normalize(), KIND_BADGES, TicketBadges(), TicketBadgesProps, resolveProjectColor() (+10 more)

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
Cohesion: 0.15
Nodes (12): Azure DevOps: review and clean behaviour, Claude Code skills (real mode), Codex agents (optional), Desktop app (macOS, optional), Development, Electrobun dev on a new machine, Environment variables, Getting started (+4 more)

### Community 109 - "projectDisplay.ts"
Cohesion: 0.46
Nodes (5): buildSplitChannelPrompt(), buildTicketLines(), isEnglish(), extractFigmaUrls(), hasMockups()

### Community 110 - "Profile"
Cohesion: 0.09
Nodes (32): ProfileConfig, DragHandleAttributes, DragHandleListeners, ProfileRow(), ProfileRowHeader(), ProfileRowHeaderProps, ProfileRowProps, ProfilesSettings() (+24 more)

### Community 112 - "useSavedFlash.ts"
Cohesion: 0.19
Nodes (6): orderedReviewKinds(), allowedReviewPasses(), requiredReviewKinds(), mapReviewApprovalRow(), mapReviewPassRow(), parsePersistedReviewFindings()

### Community 113 - "repairPath.ts"
Cohesion: 0.67
Nodes (3): mergePaths(), PATH_PROBE_COMMAND, repairPath()

### Community 114 - "ApiDenyPatterns"
Cohesion: 0.09
Nodes (28): cleanDescription(), createSplitChildren(), failSplitMother(), log, performSplit(), prSummaryLines(), reviewDescription(), splitChildDefaults() (+20 more)

### Community 116 - "settings.tsx"
Cohesion: 0.06
Nodes (44): COMMIT_LANGUAGES, CodexAgentFields(), AgentDefaultsSettings(), AppearanceSettings(), CODEX_STATUS_TONES, COMMIT_ROW, DefaultsRowSpec, EFFORT_OPTIONS (+36 more)

### Community 119 - "delegationManager.test.ts"
Cohesion: 0.22
Nodes (4): listProjectKeys(), listPublicProjects(), PublicMcpManager, TicketOperations

### Community 121 - "WorktreeAddressWatcher"
Cohesion: 0.22
Nodes (4): SplitManager, WorktreeAddressWatcher, spawnCodexAppServer(), getErrorMessage()

### Community 122 - "createMcpServer"
Cohesion: 0.27
Nodes (7): createMcpServer(), invalidInput(), OutputValidator, toolError(), toolResult(), FeasibilityStarter, isProcessing()

### Community 123 - ".handleRequest"
Cohesion: 0.36
Nodes (7): effectivePort(), isAllowedHost(), isAllowedOrigin(), isAuthorized(), isLoopbackHost(), jsonResponse(), parseHost()

### Community 124 - "TicketMeta.tsx"
Cohesion: 0.36
Nodes (7): columnSchema, STATUS_CONFIRMS, StatusConfirm, statusTitle(), TicketMeta(), resolveProjectLabel(), finishedKindLabel()

### Community 125 - ".createTodoTicket"
Cohesion: 0.38
Nodes (5): normalizeCreateInput(), requestKeyConflictMessage(), ticketDependencyError(), isAllowedAgentPair(), deriveTitleFromDescription()

### Community 126 - "Atelier"
Cohesion: 0.33
Nodes (5): Atelier, Documentation, How it works, Local MCP, Quickstart

### Community 129 - ".startReview"
Cohesion: 0.67
Nodes (3): sleep(), startAndApproveReviews(), submitReviews()

## Knowledge Gaps
- **699 isolated node(s):** `Quickstart`, `Local MCP`, `How it works`, `Documentation`, `log` (+694 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **12 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Ticket` connect `NPM Scripts` to `Contract Building & Slots`, `.startReview`, `PR Selection & Slots Bar`, `Core Domain Concepts`, `Database Store Operations`, `Live Terminal Views`, `Store Types & Agent Knobs`, `DB Row Schemas & Mappers`, `Dev Dependencies`, `Client Hub & Watchdog`, `Cost & Pricing`, `Board Columns`, `Runtime Dependencies`, `Agent Profile Config`, `API Client Inputs`, `Ticket Config & Constants`, `Session Hub Transcript`, `Slot State`, `repairPath.ts`, `CSV Parsing`, `triageManager.ts`, `splitManager.ts`, `TicketCard.tsx`, `prUrl.ts`, `schema.test.ts`, `reviewFindings.ts`, `CodexRuntimeStatus`, `TerminalView.tsx`, `button.tsx`, `usePrdSearch.ts`, `TicketOperations`, `mcpSettings.ts`, `usePrdSearch.ts`, `.addComment`, `.startVerification`, `codexProvider.test.ts`, `.start`, `TerminalSession`, `settings.tsx`, `projectDisplay.ts`, `useSavedFlash.ts`, `ApiDenyPatterns`, `reformulate.ts`, `TicketMeta.tsx`, `.createTodoTicket`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **Why does `VcsProvider` connect `Settings & Profiles UI` to `prUrl.ts`, `Runtime Dependencies`, `Fake System Adapter`, `TerminalSession`, `Real System Adapter`, `button.tsx`, `Board & Sidebar Layout`, `csv.ts`, `Modal Dialogs`, `Slot State`, `Live Terminal Views`, `Community 54`, `File Uploads`, `splitManager.ts`, `Community 63`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Why does `Store` connect `.start` to `Feasibility Batch Management`, `Store Types & Agent Knobs`, `Dev Dependencies`, `Client Hub & Watchdog`, `NPM Scripts`, `Runtime Dependencies`, `Agent Profile Config`, `API Client Inputs`, `Session Hub Transcript`, `Slot State`, `CSV Parsing`, `splitManager.ts`, `prUrl.ts`, `useAppSettings.ts`, `TicketOperations`, `.addComment`, `RunningServer`, `.startVerification`, `TerminalSession`, `useSavedFlash.ts`, `WorktreeAddressWatcher`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **What connects `Quickstart`, `Local MCP`, `How it works` to the rest of the system?**
  _710 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Contract Building & Slots` be split into smaller, more focused modules?**
  _Cohesion score 0.037267080745341616 - nodes in this community are weakly interconnected._
- **Should `Terminals UI & Notifications` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._
- **Should `Desktop Bootstrap & Menus` be split into smaller, more focused modules?**
  _Cohesion score 0.11822660098522167 - nodes in this community are weakly interconnected._