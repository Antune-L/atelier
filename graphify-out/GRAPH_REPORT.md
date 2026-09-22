# Graph Report - kanban-agents  (2026-09-22)

## Corpus Check
- 274 files · ~746,688 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3020 nodes · 8412 edges · 124 communities (112 shown, 12 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 57 edges (avg confidence: 0.67)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4b75da92`
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
- Community 82
- Community 83
- TicketCost.tsx
- createMcpServer
- usePrdSearch.ts
- .getReviewPass
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
- csv.ts
- azureRemote.ts
- reformulate.ts
- contract.test.ts
- Profile
- SlotPips.tsx
- AgentSessionEvent
- createMcpServer
- prUrl.ts
- useLocalDraft.ts
- settings.tsx
- WorkflowView.tsx
- connectCodexAppServer
- McpSettingsControllerDependencies
- repairPath.ts
- .analyzeTickets

## God Nodes (most connected - your core abstractions)
1. `Store` - 124 edges
2. `Ticket` - 113 edges
3. `SystemAdapter` - 77 edges
4. `cn()` - 73 edges
5. `FakeSystemAdapter` - 67 edges
6. `createApiRoutes()` - 65 edges
7. `RealSystemAdapter` - 64 edges
8. `SlotManager` - 53 edges
9. `ProjectInfo` - 51 edges
10. `DelegationManager` - 49 edges

## Surprising Connections (you probably didn't know these)
- `McpSettingsClient` --references--> `McpSettingsMetadata`  [EXTRACTED]
  src/web/src/lib/mcpSettings.ts → desktop/mcpRpc.ts
- `main()` --calls--> `migrateCodexCatalog()`  [EXTRACTED]
  scripts/downgrade-codex-catalog.ts → src/server/db/schema.ts
- `main()` --calls--> `assertCodexDowngradeSafe()`  [EXTRACTED]
  scripts/downgrade-codex-catalog.ts → src/server/db/schema.ts
- `StartExecutionInput` --references--> `ExecutionOwnerType`  [EXTRACTED]
  src/server/db/store.ts → src/shared/schemas.ts
- `TicketOperationsDeps` --references--> `Store`  [EXTRACTED]
  src/server/ticketOperations.ts → src/server/db/store.ts

## Import Cycles
- 3-file cycle: `src/server/config.ts -> src/server/db/store.ts -> src/server/db/rows.ts -> src/server/config.ts`

## Communities (124 total, 12 thin omitted)

### Community 0 - "Contract Building & Slots"
Cohesion: 0.03
Nodes (71): buildReformulatePrompt(), ActionExecutionOptions, actionExecutionOptionsSchema, agentMessageSchema, AnalyzeTicketsInput, appSettingsSchema, automationRunSchema, automationSchema (+63 more)

### Community 1 - "Terminals UI & Notifications"
Cohesion: 0.10
Nodes (20): analyzeTicketsInputSchema, analyzeTicketsOutputSchema, columnSchema, compactTicketSchema, createTodoTicketOutputSchema, editableTicketSchema, listProjectsInputSchema, listProjectsOutputSchema (+12 more)

### Community 2 - "Desktop Bootstrap & Menus"
Cohesion: 0.13
Nodes (8): featureBranch(), slotPath(), slugify(), mapSlotRow(), ClientSocket, Slot, WorktreeSession, BoardState

### Community 3 - "Feasibility Batch Management"
Cohesion: 0.06
Nodes (37): log, logRejection(), ToolHandler, ToolResult, TRIAGE_VERDICTS, AgentSettableStage, agentSettableStageSchema, askUserArgsSchema (+29 more)

### Community 4 - "Ticket Action Panels"
Cohesion: 0.11
Nodes (29): AgentCard(), AgentCardProps, AgentsView(), hasLiveAgent(), normalize(), KIND_BADGES, TicketBadges(), TicketBadgesProps (+21 more)

### Community 5 - "Fake System Adapter"
Cohesion: 0.06
Nodes (44): boundedCommandDetail(), BoundedCommandResult, runBoundedCommand(), safeJsonParse(), withJsonRequestFile(), escapeHtml(), renderCollapsedDetails(), renderOutsideDiffComment() (+36 more)

### Community 7 - "Settings & Profiles UI"
Cohesion: 0.08
Nodes (4): delay(), fakeShellPrompt(), FakeSystemAdapter, hexToBytes()

### Community 8 - "PR Selection & Slots Bar"
Cohesion: 0.11
Nodes (20): assertExecutionAvailable(), CODEX_LAUNCH_STATUS_MESSAGES, CodexCapabilityReader, ExecutionDefaults, ExecutionOverrides, FEASIBILITY_ENGINE_EXECUTION, resolveExecution(), resolveFeasibilityExecution() (+12 more)

### Community 9 - "Real System Adapter"
Cohesion: 0.06
Nodes (47): COMMIT_LANGUAGE_LABELS, COMMIT_LANGUAGES, AppSettings, AgentDefaultsSettings(), AppearanceSettings(), CODEX_STATUS_TONES, COMMIT_ROW, DefaultsRowSpec (+39 more)

### Community 10 - "Slot Config & Worktree Watch"
Cohesion: 0.18
Nodes (12): terminalServerMessageSchema, badgeLabelFor(), LiveTerminal(), LiveTerminalOptions, LiveTerminalProps, TerminalCell(), TerminalCellProps, TERMINAL_THEME (+4 more)

### Community 11 - "Core Domain Concepts"
Cohesion: 0.04
Nodes (47): agentMessageRowSchema, AutomationRow, automationRowSchema, AutomationRunRow, automationRunRowSchema, buildScripts(), CommentRow, commentRowSchema (+39 more)

### Community 12 - "Board & Sidebar Layout"
Cohesion: 0.07
Nodes (9): directories, detectInstallCommand(), realpathSafe(), RealSystemAdapter, resolveWorktreeScriptCommand(), setupOutputExcerpt(), shQuote(), DoneGateResult (+1 more)

### Community 13 - "Database Store Operations"
Cohesion: 0.06
Nodes (43): main(), scalar(), cleanTicket(), conflictTicket(), REVIEW_OPTS, reviewTicket(), TICKET_OPTS, CHILD_USAGE (+35 more)

### Community 14 - "Coordinator & Protocol"
Cohesion: 0.06
Nodes (37): agentPairError(), cleanDescription(), createApiRoutes(), createSplitChildren(), isBlocked(), isProcessing(), isSplitMother(), isWebOnlyPath() (+29 more)

### Community 15 - "API Routes & Reformulate"
Cohesion: 0.11
Nodes (21): CodexAppServerConnection, connectCodexAppServer(), verifyCodexBinaryVersion(), createCodexAgentSession(), inheritedMcpServerNames(), PreparedHook, prepareSkills(), threadConfig() (+13 more)

### Community 16 - "Stats Aggregation"
Cohesion: 0.29
Nodes (9): gitMetadataWritableRoots(), agentBaseEnv(), bestInstalledMatch(), compareParts(), envWithProjectNode(), nvmNodeBinDir(), readNvmrc(), prepareProjectShell() (+1 more)

### Community 17 - "Triage & Server Hub"
Cohesion: 0.08
Nodes (25): devDependencies, autoprefixer, class-variance-authority, clsx, concurrently, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities (+17 more)

### Community 18 - "Live Terminal Views"
Cohesion: 0.07
Nodes (37): isReviewFixSession(), AZURE_BASH_ALLOWLIST, AZURE_CLEAN_BASH_ALLOWLIST, BASH_ALLOWLIST, bashAllowlist(), buildFeasibilitySessionConfig(), buildImplementSessionConfig(), buildSplitSessionConfig() (+29 more)

### Community 19 - "Stage Progress & Display"
Cohesion: 0.08
Nodes (24): compilerOptions, allowImportingTsExtensions, baseUrl, esModuleInterop, isolatedModules, jsx, lib, module (+16 more)

### Community 20 - "Real Adapter GH/Composer"
Cohesion: 0.09
Nodes (28): Kind, KINDS, CodexTierSummary(), DurationChart(), ThroughputChart(), effectiveWorkDurationMs(), CodexTierSummary, DurationGroup (+20 more)

### Community 21 - "Store Types & Agent Knobs"
Cohesion: 0.09
Nodes (44): resolveBaseBranch(), buildAskContract(), buildCleanContract(), buildConflictResolutionContract(), buildFeasibilityBatchContract(), buildFeasibilityContextSection(), buildImplementingSteps(), buildMockupReviewStep() (+36 more)

### Community 22 - "DB Row Schemas & Mappers"
Cohesion: 0.18
Nodes (17): COLUMN_SORT_FIELD, BoardColumn(), compareFamilyMembers(), familyKeyOf(), groupTicketIds(), groupTicketsByFamily(), isSplitMother(), readCollapsed() (+9 more)

### Community 23 - "Dev Dependencies"
Cohesion: 0.09
Nodes (19): TicketCreationRequestConflictError, AnalyzeTicketRejectionReason, AnalyzeTicketsResult, CompactTicket, CreateTodoTicketInput, createTodoTicketInputSchema, CreateTodoTicketResult, ListTicketsInput (+11 more)

### Community 24 - "TypeScript Config"
Cohesion: 0.12
Nodes (24): ensureClaudeBinary(), bashCommandSchema, buildSettings(), claudeProvider, createSdkAgentSession(), denyBashHook(), denyNoVerifyHook, denyReviewPublishingHook (+16 more)

### Community 26 - "Cost & Pricing"
Cohesion: 0.11
Nodes (22): ActiveReviewPass, log, orderedReviewKinds(), renderPersistedReviewResult(), REVIEW_DISALLOWED_TOOLS, REVIEW_REPORT_LABELS_EN, REVIEW_REPORT_LABELS_FR, REVIEW_TOOLS (+14 more)

### Community 27 - "Workflow View & Lifecycle"
Cohesion: 0.06
Nodes (28): Architecture, Commands, Conventions (enforced — beyond the global ones in ~/.claude/CLAUDE.md), graphify, The dry-run safety model — read before running anything, What this is, Agent runtime (Agent SDK), Architecture (+20 more)

### Community 28 - "Stats Charts"
Cohesion: 0.07
Nodes (42): AgentMcpServerDefinition, agentMessageDeltaSchema, agentToml(), apiWriteDenyScript(), buildMcpServers(), ConfigObject, configReadResponseSchema, ConfigValue (+34 more)

### Community 29 - "Session Hub & Agent Session"
Cohesion: 0.15
Nodes (4): CodexAppServerOptions, CodexProviderDependencies, AppServerFixture, CodexRuntimeDependencies

### Community 30 - "Agents View & Ticket Cards"
Cohesion: 0.31
Nodes (4): mapWorktreeSessionRow(), enrichWorktreeSession(), failSplitMother(), TERMINAL_STAGES

### Community 31 - "PRD Review & Markdown"
Cohesion: 0.12
Nodes (11): CodexAppServerInitializationError, CodexAppServerNotification, CodexAppServerProtocolError, incomingSchema, initializeResponseSchema, log, PendingRequest, rpcErrorSchema (+3 more)

### Community 32 - "User Terminal & Fake IO"
Cohesion: 0.13
Nodes (24): ProjectInfo, AgentsViewProps, AskPanel(), AskPanelProps, BoardProps, CleanPrPanelProps, ImportTicketsPanel(), ImportTicketsPanelProps (+16 more)

### Community 33 - "Logging"
Cohesion: 0.10
Nodes (21): scripts, build:desktop, build:web, dev, dev:desktop, dev:proxy, dev:server, dev:web (+13 more)

### Community 34 - "Board Columns"
Cohesion: 0.16
Nodes (15): App(), HOME_VIEW_OPTIONS, HomeView, NewTicketSheet(), TerminalsView(), TerminalsViewProps, useTheme(), UseThemeResult (+7 more)

### Community 36 - "Runtime Dependencies"
Cohesion: 0.22
Nodes (18): applySizes(), collectTerminalIds(), findLeaf(), firstLeafId(), LeafNode, leafNodeSchema, makeLeaf(), nextNodeId() (+10 more)

### Community 37 - "Claude SDK Provider"
Cohesion: 0.09
Nodes (23): dependencies, @anthropic-ai/claude-agent-sdk, dompurify, elysia, @fontsource/ibm-plex-mono, @fontsource/ibm-plex-sans, marked, @modelcontextprotocol/sdk (+15 more)

### Community 38 - "Agent Profile Config"
Cohesion: 0.16
Nodes (5): AutomationManager, mapAutomationRow(), mapAutomationRunRow(), Automation, AutomationRun

### Community 39 - "Agent Coordinator Handlers"
Cohesion: 0.10
Nodes (28): artifactPath, assertPackageVersionInSync(), assertSdkVersionsInSync(), BUILT_DMG, ELECTROBUN_BIN, fail(), installedPackageVersion(), RELEASE_FOLDER (+20 more)

### Community 40 - "API Client Inputs"
Cohesion: 0.10
Nodes (27): ProfileConfig, McpSettings(), DragHandleAttributes, DragHandleListeners, ProfileRowHeader(), ProfileRowHeaderProps, ProfileRowProps, ProfilesSettings() (+19 more)

### Community 41 - "Ticket Config & Constants"
Cohesion: 0.11
Nodes (15): WsClientEvent, wsClientEventSchema, active, ensureNotificationPermission(), getAudioContext(), isSupported(), loadSoundBuffer(), playBuffer() (+7 more)

### Community 42 - "Ticket Detail & Triage UI"
Cohesion: 0.06
Nodes (60): AGENT_EFFORT_FULL_LABELS, AGENT_EFFORT_LABELS, AGENT_MODEL_FULL_LABELS, AGENT_MODEL_LABELS, AUTOMATION_RUN_STATUSES, CODEX_EFFORT_FULL_LABELS, CODEX_EFFORT_LABELS, CODEX_MODEL_EFFORTS (+52 more)

### Community 43 - "Demo Pipeline Concepts"
Cohesion: 0.15
Nodes (17): ACTIVE_BAR, AREA_CURSOR, AXIS_PROPS, BAR_CURSOR, CHART_PALETTE, colorAt(), DurationBars(), DurationDatum (+9 more)

### Community 44 - "Chart Primitives"
Cohesion: 0.40
Nodes (5): MIME_EXTENSIONS, resolveExtension(), SavedUpload, saveUpload(), serveUpload()

### Community 45 - "Session Hub Transcript"
Cohesion: 0.28
Nodes (13): abortReason(), computeCodeFingerprint(), FingerprintEntry, FingerprintPhase, hashFingerprintPaths(), isMissingFileError(), listFingerprintPaths(), log (+5 more)

### Community 46 - "Community 46"
Cohesion: 0.27
Nodes (15): Agent Implementation Config, Argus Code Review, Automated Tests (typecheck/lint/test), Claude Code Autonomous Agent, Ticket Contract Injection, Feasibility Analysis, Kanban Board (Atelier), Kanban Agents Demo (demo.gif) (+7 more)

### Community 47 - "Modal Dialogs"
Cohesion: 0.11
Nodes (4): startParentSession(), SessionHub, SessionHubHandlers, SessionStartCallbacks

### Community 48 - "Community 48"
Cohesion: 0.11
Nodes (17): CreateProjectInput, ManagedProject, UpdateProjectInput, vcsProviderSchema, ConnectionHint, DragHandleAttributes, DragHandleListeners, isPositiveIntegerString() (+9 more)

### Community 49 - "Slot State"
Cohesion: 0.11
Nodes (22): setup(), ResolvedExecution, DRY_RUN_VERDICT, FeasibilityGroup, FeasibilitySession, log, QueuedFeasibility, log (+14 more)

### Community 50 - "Stats Hooks & Cards"
Cohesion: 0.16
Nodes (12): ChartConfig, ChartContainer, ChartContainerProps, ChartContext, ChartContextValue, ChartLegendContent(), ChartLegendContentProps, ChartTooltipContent() (+4 more)

### Community 51 - "Community 51"
Cohesion: 0.15
Nodes (4): childTranscriptPrefix(), DelegationManager, reviewPrompt(), ReviewKind

### Community 52 - "chart.tsx"
Cohesion: 0.07
Nodes (27): ReviewPublicationState, extractPrUrl(), ghPrHeadSchema, ghPrSchema, ghPrStateSchema, ghRestPullSchema, ghRestReviewPagesSchema, ghRestReviewSchema (+19 more)

### Community 53 - "User Terminal Manager"
Cohesion: 0.33
Nodes (5): CONTEXT — domain glossary, Execution, Proposed (not yet built), Seams, Work items

### Community 54 - "Community 54"
Cohesion: 0.15
Nodes (32): AgentEffort, AgentModel, CodexEffort, CodexModel, Implementer, Orchestrator, AgentProfileConfig(), AgentProfileConfigProps (+24 more)

### Community 55 - "App.tsx"
Cohesion: 0.20
Nodes (3): FeasibilityBatchManager, toTriageResult(), FeasibilityResult

### Community 56 - "CSV Parsing"
Cohesion: 0.14
Nodes (26): ActiveDelegation, ActiveReview, ClosableExecution, ExecutionFinishStatus, LiveSession, log, PendingSessionMessage, previewToolInput() (+18 more)

### Community 57 - "Community 57"
Cohesion: 0.21
Nodes (14): ensureConfig(), boot(), externalUrlFromNewWindowEvent(), forwardAtelierShortcut(), installApplicationMenu(), installMenuShortcutBridge(), menuShortcutActionSchema, navigationEventSchema (+6 more)

### Community 58 - "File Uploads"
Cohesion: 0.36
Nodes (5): applyDesktopEnv(), DesktopRoots, ensureMcpToken(), regenerateMcpToken(), temporaryDirectories

### Community 59 - "triageManager.ts"
Cohesion: 0.21
Nodes (16): buildSplitChannelPrompt(), buildTicketLines(), isEnglish(), buildContractConstraintsLines(), buildResponseFormatLines(), buildStrictRulesLines(), buildTicketLines(), buildTriageChannelPrompt() (+8 more)

### Community 60 - "Package Manifest"
Cohesion: 0.20
Nodes (11): applyTranscriptUpdate(), TranscriptState, transcriptText(), transcriptUpdateSchema, FullscreenToggle(), FullscreenToggleProps, TerminalData, TerminalView() (+3 more)

### Community 61 - "splitManager.ts"
Cohesion: 0.05
Nodes (47): PrSelectRow(), PrSelectRowProps, ProviderRow(), NAV_ENTRIES, NavEntry, Sidebar(), SidebarProps, SidebarView (+39 more)

### Community 62 - "TicketCard.tsx"
Cohesion: 0.18
Nodes (8): addUsageByModel(), toUsageByModel(), TicketLifecycle, Stage, Ticket, DescriptionTabProps, PrdTabProps, TicketActionsProps

### Community 63 - "Community 63"
Cohesion: 0.05
Nodes (32): RecordingSystemAdapter, dryRunLog, fakeEncoder, CLAUDE_JSON_PATH, COMPOSER_BINARIES, INSTALL_COMMANDS, log, NON_INTERACTIVE_ENV (+24 more)

### Community 64 - "Composer Run Script"
Cohesion: 0.12
Nodes (10): AckSystem, RecordedSession, RecordingSystem, RecordedSession, RecordingSystem, RelaunchSystem, AgentProvider, AgentSessionHandle (+2 more)

### Community 65 - "split.ts"
Cohesion: 0.06
Nodes (41): DEFAULT_MODELS, ProjectKey, mapCommentRow(), mapTicketCreationRequestRow(), AttachExecutionSessionInput, AutomationPatch, EnqueueAgentMessageInput, FinalizeExecutionInput (+33 more)

### Community 66 - "OpenPr"
Cohesion: 0.16
Nodes (8): CodexAppServerRpcError, createCodexProvider(), AppServerFixtureOptions, hookPathForSession(), options(), RecordedRequest, waitFor(), WorkerMcpManager

### Community 67 - "UserTerminalManager"
Cohesion: 0.15
Nodes (7): FailedReformulation, ActionSystem, CapabilityCache, ReformulateOptions, CodexRuntimeStatus, codexRuntimeStatusSchema, runtime

### Community 68 - "schema.test.ts"
Cohesion: 0.09
Nodes (37): PrdAnnotator(), PrdAnnotatorProps, BREADCRUMB, NO_ANNOTATIONS, PrdReviewDialog(), PrdReviewDialogProps, PrdView(), ActivityTab() (+29 more)

### Community 69 - "reviewFindings.ts"
Cohesion: 0.15
Nodes (22): dedupeFindings(), DimensionFinding, findingAnchor(), FRENCH_STOP_WORD_PATTERN, FRENCH_STOP_WORDS, hasSimilarSummary(), isSameDefect(), isSelfRefuting() (+14 more)

### Community 71 - "PostCSS Config"
Cohesion: 0.29
Nodes (6): name, overrides, zod, private, type, version

### Community 72 - "App.tsx"
Cohesion: 0.07
Nodes (36): ACTIVE_STAGES, COLUMN_LABELS, PR_STATE_LABELS, ColumnActionsMenu(), ColumnActionsMenuProps, ColumnMenuItem, QuitConfirmModalProps, ActionContext (+28 more)

### Community 73 - "TerminalView.tsx"
Cohesion: 0.11
Nodes (27): FILLED_GLYPH_COLORS, StageProgressBar(), StageProgressBarProps, TICKET_TAB_LABELS, TicketTab, TicketTabs(), TicketTabsProps, availableTabs() (+19 more)

### Community 74 - "button.tsx"
Cohesion: 0.13
Nodes (19): AGENT_EFFORTS, AGENT_MODELS, AUTOMATION_TRIGGER_LABELS, AUTOMATION_TRIGGERS, AutomationRunStatus, AutomationTrigger, AutomationCard(), AutomationCardProps (+11 more)

### Community 75 - ".handleRequest"
Cohesion: 0.11
Nodes (14): analyzeResultSchema, compactTicketSchema, createResultSchema, errorResultSchema, ISOLATED_ENV_KEYS, projectResultSchema, savedEnv, startResultSchema (+6 more)

### Community 76 - "usePrdSearch.ts"
Cohesion: 0.15
Nodes (16): costByFamily(), costOf(), costOfModel(), costOfSessions(), CostSummary, FamilyPricing, MODEL_PRICING, ModelFamily (+8 more)

### Community 78 - "csv.ts"
Cohesion: 0.18
Nodes (15): isCodexFastServiceTier(), summarizeSessionCosts(), totalTokensOfSessions(), executionCosts(), executionTokens(), projectStatRecord(), CostSummary(), MetaRow() (+7 more)

### Community 79 - "WorktreeSession"
Cohesion: 0.33
Nodes (3): listeners, mcp, ReplyArgsSchema

### Community 80 - "recordedAction.ts"
Cohesion: 0.23
Nodes (17): alternation(), COMMAND_WRAPPERS, commandSegments(), commandWords(), executableName(), launchedPackageScript(), launchesTypecheck(), OPTIONS_WITH_VALUE (+9 more)

### Community 81 - "vcsCommands.ts"
Cohesion: 0.20
Nodes (7): AZURE_COMMANDS, COMMANDS_BY_PROVIDER, GITHUB_COMMANDS, PrDiffContext, VcsCleanCommands, AZ_SETTLED_THREAD_STATUSES, VCS_PROVIDER_LABELS

### Community 86 - "TicketCost.tsx"
Cohesion: 0.29
Nodes (8): Toaster(), COLUMN_NODE_COLOR, depthOf(), truncate(), WorkflowView(), WorkflowViewProps, WorktreeSessionsView(), useBoard()

### Community 87 - "createMcpServer"
Cohesion: 0.22
Nodes (5): reviewKey(), verificationPrompt(), dedupeIdenticalFindings(), mergeAgentUsageByModel(), AgentSessionEvent

### Community 89 - "usePrdSearch.ts"
Cohesion: 0.14
Nodes (20): Column, COLUMN_ORDER, COLUMNS, ACTIVE_COLUMNS, Board(), isColumn(), isLocked(), normalize() (+12 more)

### Community 90 - ".getReviewPass"
Cohesion: 0.20
Nodes (4): allowedReviewPasses(), mapReviewApprovalRow(), mapReviewPassRow(), parsePersistedReviewFindings()

### Community 91 - "AgentsView.tsx"
Cohesion: 0.20
Nodes (9): AtelierDesktopRpcSchema, DesktopRequests, McpSettingsMetadata, McpTokenSource, WebviewRequests, McpSettingsController, createMcpSettingsClient(), getMcpSettingsClient() (+1 more)

### Community 92 - "useCapabilities.ts"
Cohesion: 0.20
Nodes (8): Block, blockText(), compactChunks(), firstCharCode(), TranscriptBuffer, trimBlockStart(), AgentStreamBlock, TranscriptUpdate

### Community 93 - "ColumnActionsMenu.tsx"
Cohesion: 0.25
Nodes (7): Azure DevOps support — state file, Decisions (validated by the owner, 2026-09-21), Goal, Known blockers for lots 3 and 4, Open questions, Progress, Verified on this machine (az 2.90.0, azure-devops 1.0.8)

### Community 94 - ".addComment"
Cohesion: 0.09
Nodes (9): startFeasibilityTicket(), mapAgentMessageRow(), mapExecutionRunRow(), SqlUpdateBuilder, Store, runRecordedAction(), AgentMessage, ExecutionRun (+1 more)

### Community 95 - "TicketConfigSummary.tsx"
Cohesion: 0.50
Nodes (3): appBundle, EMBEDDED_BINARIES, resourcesApp

### Community 97 - "RunningServer"
Cohesion: 0.04
Nodes (53): log, Watchdog, log, runFirstBootSetup(), applyAppSettingsToModels(), PROJECT_ROOT, NOTE: PRD generation holds the request open up to ~120s (REFORMULATE_TIMEOUT_MS), resolveDataFile() (+45 more)

### Community 98 - "triageManager.ts"
Cohesion: 0.50
Nodes (7): groupOrientation(), layoutToSizes(), panelId(), panelPercent(), SplitTree(), SplitTreeProps, TreeNode

### Community 99 - "reviewPublishingGuard.ts"
Cohesion: 0.07
Nodes (35): API_GUARDS, API_READ_METHOD_SET, ApiDenyPatterns, ApiGuard, AZ_INVOKE_COMMAND, AZ_INVOKE_METHOD_LONG_FLAGS, AZ_INVOKE_WRITE_INPUT_LONG_FLAGS, AZ_PR_WRITE_PATTERN (+27 more)

### Community 100 - ".startVerification"
Cohesion: 0.17
Nodes (5): renderCollapsedFinding(), renderFinding(), ReviewReportLabels, verifiedFindings(), finding()

### Community 101 - "codexProvider.test.ts"
Cohesion: 0.23
Nodes (9): initializeParamsSchema, log, requestSchema, rpcError(), rpcResult(), toolCallParamsSchema, WorkerMcpHandlers, isWorkerToolName() (+1 more)

### Community 102 - "DescriptionTab.tsx"
Cohesion: 0.21
Nodes (9): CodexBinaryVersionError, require, resolveCodexBinary(), resolveCodexBinaryOverride(), TARGETS, canonicalJson(), CodexCommandHook, codexSessionPreToolUseHookHash() (+1 more)

### Community 103 - "TerminalSession"
Cohesion: 0.06
Nodes (17): FakePaneStream, RealPaneStream, PaneStream, dataMessage(), log, normalizeSeed(), safeParse(), send() (+9 more)

### Community 104 - "reviewPass.ts"
Cohesion: 0.22
Nodes (4): PublicMcpManager, isActive(), isBlocked(), TicketOperations

### Community 105 - ".finishTicket"
Cohesion: 0.36
Nodes (7): effectivePort(), isAllowedHost(), isAllowedOrigin(), isAuthorized(), isLoopbackHost(), jsonResponse(), parseHost()

### Community 106 - "csv.ts"
Cohesion: 0.33
Nodes (6): RFC-4180, CsvParseError, normalizeHeader(), ParsedTicketRow, ParsedTicketsCsv, parseTicketsCsv()

### Community 107 - "azureRemote.ts"
Cohesion: 0.40
Nodes (10): azureOrgUrl(), fromAzureSegments(), fromCollectionSegments(), fromLegacySegments(), fromSshSegments(), parseAzureRepoRef(), parseRemoteLocation(), RemoteLocation (+2 more)

### Community 110 - "Profile"
Cohesion: 0.48
Nodes (3): mapProfileRow(), nullableBooleanValue(), Profile

### Community 111 - "SlotPips.tsx"
Cohesion: 0.38
Nodes (6): ATTENTION_STATUSES, sessionOf(), SlotPips(), SlotPipsProps, STATUS_LABELS, STATUS_PIP_CLASSES

### Community 112 - "AgentSessionEvent"
Cohesion: 0.38
Nodes (4): formatCommitTimeout(), TimeoutUnit, timeoutUnitMs(), timeoutUnitOf()

### Community 113 - "createMcpServer"
Cohesion: 0.53
Nodes (5): createMcpServer(), invalidInput(), OutputValidator, toolError(), toolResult()

### Community 114 - "prUrl.ts"
Cohesion: 0.27
Nodes (9): NOTE: Radix's dismissable layer registers its Escape listener on `document` in t, useCaptureEscape(), collectMatchRanges(), isShortcutDetail(), ShortcutDetail, supportsHighlightApi(), usePrdSearch(), UsePrdSearchOptions (+1 more)

### Community 115 - "useLocalDraft.ts"
Cohesion: 0.40
Nodes (4): normalizeCreateInput(), requestKeyConflictMessage(), ticketDependencyError(), deriveTitleFromDescription()

### Community 116 - "settings.tsx"
Cohesion: 0.10
Nodes (39): pairedRuntimeCodexEffort(), UNKNOWN_CODEX_RUNTIME_STATUS, Capabilities, CleanPrPanel(), CodexAgentFields(), CodexConnectionStatus(), STATUS_LABELS, ProjectPrPicker() (+31 more)

### Community 117 - "WorkflowView.tsx"
Cohesion: 0.18
Nodes (14): FAILURE_COLUMNS, SUCCESS_COLUMNS, StatRecord, StatCard(), StatCardProps, StatEmpty(), OutcomeChart(), SuccessRateChart() (+6 more)

### Community 118 - "connectCodexAppServer"
Cohesion: 0.47
Nodes (5): SplitOrientation, isShortcutDetail(), ShortcutDetail, useTerminalShortcuts(), UseTerminalShortcutsOptions

### Community 120 - "repairPath.ts"
Cohesion: 0.67
Nodes (3): mergePaths(), PATH_PROBE_COMMAND, repairPath()

## Knowledge Gaps
- **703 isolated node(s):** `log`, `PROJECT_ROOT`, `ticketRowSchema`, `TicketRow`, `ticketCreationRequestRowSchema` (+698 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **12 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Ticket` connect `TicketCard.tsx` to `Contract Building & Slots`, `Desktop Bootstrap & Menus`, `Ticket Action Panels`, `Shared Zod Schemas`, `PR Selection & Slots Bar`, `Core Domain Concepts`, `Database Store Operations`, `Coordinator & Protocol`, `Live Terminal Views`, `Store Types & Agent Knobs`, `DB Row Schemas & Mappers`, `Dev Dependencies`, `Cost & Pricing`, `Agents View & Ticket Cards`, `User Terminal & Fake IO`, `Board Columns`, `NPM Scripts`, `Ticket Config & Constants`, `Ticket Detail & Triage UI`, `Slot State`, `Community 51`, `CSV Parsing`, `triageManager.ts`, `Package Manifest`, `splitManager.ts`, `split.ts`, `schema.test.ts`, `CodexRuntimeStatus`, `App.tsx`, `TerminalView.tsx`, `csv.ts`, `TicketCost.tsx`, `usePrdSearch.ts`, `.getReviewPass`, `.addComment`, `.startVerification`, `useLocalDraft.ts`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **Why does `Store` connect `.addComment` to `Desktop Bootstrap & Menus`, `Feasibility Batch Management`, `Shared Zod Schemas`, `PR Selection & Slots Bar`, `Core Domain Concepts`, `Database Store Operations`, `Coordinator & Protocol`, `Store Types & Agent Knobs`, `Dev Dependencies`, `Cost & Pricing`, `Agents View & Ticket Cards`, `NPM Scripts`, `Agent Profile Config`, `Slot State`, `Community 51`, `TicketCard.tsx`, `split.ts`, `csv.ts`, `createMcpServer`, `.getReviewPass`, `RunningServer`, `.startVerification`, `TerminalSession`, `Profile`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Why does `FakeSystemAdapter` connect `Settings & Profiles UI` to `Composer Run Script`, `RunningServer`, `UserTerminalManager`, `CodexRuntimeStatus`, `Database Store Operations`, `Slot State`, `CSV Parsing`, `Community 63`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **What connects `log`, `PROJECT_ROOT`, `NOTE: AppSettings carries no implementerModel/implementerEffort, so those two MO` to the rest of the system?**
  _714 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Contract Building & Slots` be split into smaller, more focused modules?**
  _Cohesion score 0.03322784810126582 - nodes in this community are weakly interconnected._
- **Should `Terminals UI & Notifications` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._
- **Should `Desktop Bootstrap & Menus` be split into smaller, more focused modules?**
  _Cohesion score 0.13076923076923078 - nodes in this community are weakly interconnected._