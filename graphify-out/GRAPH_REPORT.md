# Graph Report - kanban-agents  (2026-09-23)

## Corpus Check
- 276 files · ~768,063 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3028 nodes · 8415 edges · 122 communities (113 shown, 9 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 57 edges (avg confidence: 0.67)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d9f2bfd3`
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

## God Nodes (most connected - your core abstractions)
1. `Store` - 124 edges
2. `Ticket` - 113 edges
3. `SystemAdapter` - 77 edges
4. `cn()` - 71 edges
5. `FakeSystemAdapter` - 67 edges
6. `createApiRoutes()` - 65 edges
7. `RealSystemAdapter` - 64 edges
8. `SlotManager` - 53 edges
9. `ProjectInfo` - 52 edges
10. `DelegationManager` - 49 edges

## Surprising Connections (you probably didn't know these)
- `McpSettingsClient` --references--> `McpSettingsMetadata`  [EXTRACTED]
  src/web/src/lib/mcpSettings.ts → desktop/mcpRpc.ts
- `main()` --calls--> `migrateCodexCatalog()`  [EXTRACTED]
  scripts/downgrade-codex-catalog.ts → src/server/db/schema.ts
- `main()` --calls--> `assertCodexDowngradeSafe()`  [EXTRACTED]
  scripts/downgrade-codex-catalog.ts → src/server/db/schema.ts
- `TicketOperationsDeps` --references--> `Store`  [EXTRACTED]
  src/server/ticketOperations.ts → src/server/db/store.ts
- `CompactTicket` --references--> `Ticket`  [EXTRACTED]
  src/server/ticketOperations.ts → src/shared/schemas.ts

## Import Cycles
- 3-file cycle: `src/server/config.ts -> src/server/db/store.ts -> src/server/db/rows.ts -> src/server/config.ts`

## Communities (122 total, 9 thin omitted)

### Community 0 - "Contract Building & Slots"
Cohesion: 0.03
Nodes (74): buildReformulatePrompt(), ActionExecutionOptions, actionExecutionOptionsSchema, agentMessageSchema, AnalyzeTicketsInput, appSettingsSchema, automationRunSchema, automationSchema (+66 more)

### Community 1 - "Terminals UI & Notifications"
Cohesion: 0.09
Nodes (27): analyzeTicketsInputSchema, analyzeTicketsOutputSchema, columnSchema, compactTicketSchema, createTodoTicketOutputSchema, editableTicketSchema, effectivePort(), isAllowedHost() (+19 more)

### Community 2 - "Desktop Bootstrap & Menus"
Cohesion: 0.12
Nodes (10): featureBranch(), SlotManager, slugify(), mapSlotRow(), mapWorktreeSessionRow(), enrichWorktreeSession(), TERMINAL_STAGES, Slot (+2 more)

### Community 3 - "Feasibility Batch Management"
Cohesion: 0.06
Nodes (56): log, ToolHandler, ToolResult, ExecutionFinishStatus, LiveSession, log, PendingSessionMessage, previewToolInput() (+48 more)

### Community 4 - "Ticket Action Panels"
Cohesion: 0.10
Nodes (30): prNumberFromUrl(), AgentCard(), AgentCardProps, AgentsView(), AgentsViewProps, hasLiveAgent(), normalize(), KIND_BADGES (+22 more)

### Community 5 - "Fake System Adapter"
Cohesion: 0.08
Nodes (30): escapeHtml(), renderCollapsedDetails(), renderOutsideDiffComment(), renderOutsideDiffSection(), ReviewPublicationComment, ReviewPublicationEvent, azureChangeEntrySchema, azureCommentSchema (+22 more)

### Community 6 - "Shared Zod Schemas"
Cohesion: 0.15
Nodes (3): resolveBaseBranch(), slotPath(), mapTicketRow()

### Community 7 - "Settings & Profiles UI"
Cohesion: 0.08
Nodes (6): delay(), fakeShellPrompt(), FakeSystemAdapter, hexToBytes(), ReviewDoneOptions, WorktreeSetupOptions

### Community 8 - "PR Selection & Slots Bar"
Cohesion: 0.08
Nodes (33): assertExecutionAvailable(), CODEX_LAUNCH_STATUS_MESSAGES, CodexCapabilityReader, ExecutionDefaults, FEASIBILITY_ENGINE_EXECUTION, resolveExecution(), resolveFeasibilityExecution(), resolveTicketExecution() (+25 more)

### Community 9 - "Real System Adapter"
Cohesion: 0.04
Nodes (65): ProfileConfig, AppSettings, DragHandleAttributes, DragHandleListeners, ProfileRowHeaderProps, ProfileRowProps, ProfilesSettings(), NOTE: the saved flag lives here because a saved row remounts (its key carries up (+57 more)

### Community 10 - "Slot Config & Worktree Watch"
Cohesion: 0.18
Nodes (12): terminalServerMessageSchema, badgeLabelFor(), LiveTerminal(), LiveTerminalOptions, LiveTerminalProps, TerminalCell(), TerminalCellProps, TERMINAL_THEME (+4 more)

### Community 11 - "Core Domain Concepts"
Cohesion: 0.04
Nodes (50): agentMessageRowSchema, AutomationRow, automationRowSchema, AutomationRunRow, automationRunRowSchema, buildScripts(), CommentRow, commentRowSchema (+42 more)

### Community 12 - "Board & Sidebar Layout"
Cohesion: 0.06
Nodes (11): detectInstallCommand(), realpathSafe(), RealSystemAdapter, resolveWorktreeScriptCommand(), setupOutputExcerpt(), shQuote(), PaneSize, VCS_PROVIDERS (+3 more)

### Community 13 - "Database Store Operations"
Cohesion: 0.15
Nodes (21): main(), scalar(), assertCodexDowngradeSafe(), backfillOrchestrator(), countRows(), createDatabase(), EXECUTION_MIGRATIONS, hasColumn() (+13 more)

### Community 14 - "Coordinator & Protocol"
Cohesion: 0.06
Nodes (37): agentPairError(), cleanDescription(), createApiRoutes(), createSplitChildren(), isBlocked(), isProcessing(), isSplitMother(), isWebOnlyPath() (+29 more)

### Community 15 - "API Routes & Reformulate"
Cohesion: 0.12
Nodes (15): CodexAppServerConnection, connectCodexAppServer(), verifyCodexBinaryVersion(), createCodexAgentSession(), inheritedMcpServerNames(), PreparedHook, prepareSkills(), threadConfig() (+7 more)

### Community 16 - "Stats Aggregation"
Cohesion: 0.29
Nodes (9): gitMetadataWritableRoots(), agentBaseEnv(), bestInstalledMatch(), compareParts(), envWithProjectNode(), nvmNodeBinDir(), readNvmrc(), prepareProjectShell() (+1 more)

### Community 17 - "Triage & Server Hub"
Cohesion: 0.08
Nodes (25): devDependencies, autoprefixer, class-variance-authority, clsx, concurrently, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities (+17 more)

### Community 18 - "Live Terminal Views"
Cohesion: 0.08
Nodes (31): isReviewFixSession(), AZURE_BASH_ALLOWLIST, AZURE_CLEAN_BASH_ALLOWLIST, BASH_ALLOWLIST, bashAllowlist(), buildImplementSessionConfig(), CODEX_READONLY_TOOLS, codexKnobs() (+23 more)

### Community 19 - "Stage Progress & Display"
Cohesion: 0.08
Nodes (24): compilerOptions, allowImportingTsExtensions, baseUrl, esModuleInterop, isolatedModules, jsx, lib, module (+16 more)

### Community 20 - "Real Adapter GH/Composer"
Cohesion: 0.10
Nodes (26): FAILURE_COLUMNS, Kind, KINDS, SUCCESS_COLUMNS, OutcomeChart(), SuccessRateChart(), ThroughputChart(), effectiveWorkDurationMs() (+18 more)

### Community 21 - "Store Types & Agent Knobs"
Cohesion: 0.17
Nodes (27): buildAskContract(), buildCleanContract(), buildConflictResolutionContract(), buildFeasibilityBatchContract(), buildFeasibilityContextSection(), buildImplementingSteps(), buildMockupReviewStep(), buildPlanningStep() (+19 more)

### Community 22 - "DB Row Schemas & Mappers"
Cohesion: 0.18
Nodes (17): COLUMN_SORT_FIELD, BoardColumn(), compareFamilyMembers(), familyKeyOf(), groupTicketIds(), groupTicketsByFamily(), isSplitMother(), readCollapsed() (+9 more)

### Community 23 - "Dev Dependencies"
Cohesion: 0.09
Nodes (20): TicketCreationRequestConflictError, AnalyzeTicketRejectionReason, AnalyzeTicketsResult, CompactTicket, CreateTodoTicketInput, createTodoTicketInputSchema, CreateTodoTicketResult, isActive() (+12 more)

### Community 24 - "TypeScript Config"
Cohesion: 0.14
Nodes (20): bashCommandSchema, buildSettings(), createSdkAgentSession(), denyBashHook(), denyNoVerifyHook, denyReviewPublishingHook, denyTypecheckHook(), dispatchClaudeMessage() (+12 more)

### Community 26 - "Cost & Pricing"
Cohesion: 0.15
Nodes (10): runBoundedCommand(), safeJsonParse(), AzureDevopsVcsClient, prWebUrl(), readOriginRemote(), repoRefFromPrUrl(), repoRefFromRemote(), reviewStatusFromVotes() (+2 more)

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
Cohesion: 0.17
Nodes (12): cleanTicket(), conflictTicket(), REVIEW_OPTS, reviewTicket(), TICKET_OPTS, createdPaths, reserveDbPath(), paths (+4 more)

### Community 31 - "PRD Review & Markdown"
Cohesion: 0.12
Nodes (11): CodexAppServerInitializationError, CodexAppServerProtocolError, CodexAppServerRpcError, incomingSchema, initializeResponseSchema, log, PendingRequest, rpcErrorSchema (+3 more)

### Community 32 - "User Terminal & Fake IO"
Cohesion: 0.08
Nodes (39): ProjectInfo, UpdateTicketInput, AskPanel(), AskPanelProps, BoardProps, CleanPrPanelProps, ImportTicketsPanel(), ImportTicketsPanelProps (+31 more)

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
Cohesion: 0.19
Nodes (5): AutomationManager, mapAutomationRow(), mapAutomationRunRow(), Automation, AutomationRun

### Community 39 - "Agent Coordinator Handlers"
Cohesion: 0.17
Nodes (18): adopt(), compareVersions(), configureClaudeProvisionDir(), detectionCandidates(), detectUserInstall(), downloadAndVerifyTarball(), downloadPinnedBinary(), emitProgress() (+10 more)

### Community 40 - "API Client Inputs"
Cohesion: 0.13
Nodes (14): AgentProvider, claudeProvider, runOneShotSession(), CLAUDE_JSON_PATH, COMPOSER_BINARIES, INSTALL_COMMANDS, log, NON_INTERACTIVE_ENV (+6 more)

### Community 41 - "Ticket Config & Constants"
Cohesion: 0.09
Nodes (21): WsClientEvent, wsClientEventSchema, ATTENTION_STATUSES, sessionOf(), SlotPips(), SlotPipsProps, STATUS_LABELS, STATUS_PIP_CLASSES (+13 more)

### Community 42 - "Ticket Detail & Triage UI"
Cohesion: 0.05
Nodes (67): AGENT_EFFORT_FULL_LABELS, AGENT_EFFORT_LABELS, AGENT_MODEL_FULL_LABELS, AGENT_MODEL_LABELS, AUTOMATION_RUN_STATUSES, CODEX_EFFORT_FULL_LABELS, CODEX_EFFORT_LABELS, CODEX_MODEL_EFFORTS (+59 more)

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
Cohesion: 0.10
Nodes (5): logRejection(), startParentSession(), SessionHub, SessionHubHandlers, SessionStartCallbacks

### Community 48 - "Community 48"
Cohesion: 0.09
Nodes (20): CreateProjectInput, ManagedProject, UpdateProjectInput, vcsProviderSchema, App(), HOME_VIEW_OPTIONS, HomeView, ConnectionHint (+12 more)

### Community 49 - "Slot State"
Cohesion: 0.05
Nodes (34): log, setup(), log, ReformulateManager, DRY_RUN_VERDICT, log, TriageManager, TriageSession (+26 more)

### Community 50 - "Stats Hooks & Cards"
Cohesion: 0.16
Nodes (12): ChartConfig, ChartContainer, ChartContainerProps, ChartContext, ChartContextValue, ChartLegendContent(), ChartLegendContentProps, ChartTooltipContent() (+4 more)

### Community 51 - "Community 51"
Cohesion: 0.08
Nodes (14): childTranscriptPrefix(), DelegationManager, reviewKey(), reviewPrompt(), setup(), verificationPrompt(), verifiedFindings(), dedupeIdenticalFindings() (+6 more)

### Community 52 - "chart.tsx"
Cohesion: 0.08
Nodes (26): RecordingSystemAdapter, boundedCommandDetail(), PublishReviewOptions, PublishReviewResult, ReviewPublicationState, FAKE_OPEN_PRS, extractPrUrl(), ghPrHeadSchema (+18 more)

### Community 53 - "User Terminal Manager"
Cohesion: 0.33
Nodes (5): CONTEXT — domain glossary, Execution, Proposed (not yet built), Seams, Work items

### Community 54 - "Community 54"
Cohesion: 0.11
Nodes (41): ExecutionOverrides, AgentEffort, AgentModel, CodexEffort, CodexModel, FeasibilityEngine, Implementer, Orchestrator (+33 more)

### Community 55 - "App.tsx"
Cohesion: 0.21
Nodes (11): ResolvedExecution, DRY_RUN_VERDICT, FeasibilityBatchManager, FeasibilityGroup, FeasibilitySession, log, QueuedFeasibility, toTriageResult() (+3 more)

### Community 56 - "CSV Parsing"
Cohesion: 0.15
Nodes (5): Logger, paint(), ScopedLogger, serializeFields(), timestamp()

### Community 57 - "Community 57"
Cohesion: 0.17
Nodes (17): ensureConfig(), boot(), externalUrlFromNewWindowEvent(), forwardAtelierShortcut(), installApplicationMenu(), installMenuShortcutBridge(), menuShortcutActionSchema, navigationEventSchema (+9 more)

### Community 58 - "File Uploads"
Cohesion: 0.36
Nodes (5): applyDesktopEnv(), DesktopRoots, ensureMcpToken(), regenerateMcpToken(), temporaryDirectories

### Community 59 - "triageManager.ts"
Cohesion: 0.24
Nodes (16): buildContractConstraintsLines(), buildResponseFormatLines(), buildStrictRulesLines(), buildTicketLines(), buildTriageChannelPrompt(), buildTriagePlusChannelPrompt(), isEnglish(), readOnlyFramingLines() (+8 more)

### Community 60 - "Package Manifest"
Cohesion: 0.20
Nodes (11): applyTranscriptUpdate(), TranscriptState, transcriptText(), transcriptUpdateSchema, FullscreenToggle(), FullscreenToggleProps, TerminalData, TerminalView() (+3 more)

### Community 61 - "splitManager.ts"
Cohesion: 0.19
Nodes (9): TICKET_OPTION, TicketOptionsToggleGroup(), TicketOptionsToggleGroupProps, TicketOptionValues, ToggleGroup, ToggleGroupContext, ToggleGroupItem, Toggle (+1 more)

### Community 62 - "TicketCard.tsx"
Cohesion: 0.13
Nodes (8): startFeasibilityTicket(), addUsageByModel(), toUsageByModel(), mapTicketCreationRequestRow(), TicketLifecycle, failSplitMother(), ACTIVE_STAGES, Ticket

### Community 63 - "Community 63"
Cohesion: 0.12
Nodes (4): DoneGateResult, ReviewHeadResult, FakeVcsClient, VcsClient

### Community 64 - "Composer Run Script"
Cohesion: 0.09
Nodes (19): AckSystem, ActiveDelegation, ActiveReview, ClosableExecution, CHILD_USAGE, FULL_REVIEW_KINDS, LIGHT_REVIEW_KINDS, newDelegatedTicket() (+11 more)

### Community 65 - "split.ts"
Cohesion: 0.07
Nodes (37): DEFAULT_MODELS, ProjectKey, AttachExecutionSessionInput, AutomationPatch, EnqueueAgentMessageInput, FinalizeExecutionInput, MarkAgentMessageAcceptedInput, MarkAgentMessageReceivedInput (+29 more)

### Community 66 - "OpenPr"
Cohesion: 0.16
Nodes (10): canonicalJson(), CodexCommandHook, codexSessionPreToolUseHookHash(), JsonValue, createCodexProvider(), AppServerFixtureOptions, hookPathForSession(), options() (+2 more)

### Community 67 - "UserTerminalManager"
Cohesion: 0.23
Nodes (3): ActionSystem, CapabilityCache, CodexRuntimeStatus

### Community 68 - "schema.test.ts"
Cohesion: 0.05
Nodes (67): PrdAnnotator(), PrdAnnotatorProps, BREADCRUMB, NO_ANNOTATIONS, PrdReviewDialog(), PrdReviewDialogProps, PrdView(), NAV_ENTRIES (+59 more)

### Community 69 - "reviewFindings.ts"
Cohesion: 0.06
Nodes (48): ActiveReviewPass, log, orderedReviewKinds(), renderCollapsedFinding(), renderFinding(), renderPersistedReviewResult(), REVIEW_DISALLOWED_TOOLS, REVIEW_REPORT_LABELS_EN (+40 more)

### Community 70 - "CodexRuntimeStatus"
Cohesion: 0.23
Nodes (10): artifactPath, assertPackageVersionInSync(), assertSdkVersionsInSync(), BUILT_DMG, ELECTROBUN_BIN, fail(), installedPackageVersion(), RELEASE_FOLDER (+2 more)

### Community 71 - "PostCSS Config"
Cohesion: 0.29
Nodes (6): name, overrides, zod, private, type, version

### Community 72 - "App.tsx"
Cohesion: 0.09
Nodes (27): ColumnActionsMenu(), ColumnActionsMenuProps, ColumnMenuItem, QuitConfirmModalProps, ActionContext, buildActions(), ConfirmSpec, errorMessage() (+19 more)

### Community 73 - "TerminalView.tsx"
Cohesion: 0.11
Nodes (23): OverviewTab(), SUMMARY_COLUMNS, TICKET_TAB_LABELS, TicketTab, TicketTabs(), TicketTabsProps, availableTabs(), hasSessionPane() (+15 more)

### Community 74 - "button.tsx"
Cohesion: 0.09
Nodes (24): AUTOMATION_TRIGGER_LABELS, AUTOMATION_TRIGGERS, AutomationRunStatus, AutomationTrigger, ORCHESTRATOR_LABELS, columnSchema, CreateAutomationInput, AutomationCard() (+16 more)

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

### Community 82 - "Community 82"
Cohesion: 0.22
Nodes (3): createMcpSettingsController(), McpSettingsControllerDependencies, temporaryDirectories

### Community 86 - "TicketCost.tsx"
Cohesion: 0.26
Nodes (9): Toaster(), COLUMN_NODE_COLOR, depthOf(), truncate(), WorkflowView(), WorkflowViewProps, WorktreeSessionsView(), WorktreeSessionsViewProps (+1 more)

### Community 87 - "createMcpServer"
Cohesion: 0.26
Nodes (5): BoundedCommandResult, withJsonRequestFile(), connectionFailure(), connectionResult(), VcsConnectionResult

### Community 89 - "usePrdSearch.ts"
Cohesion: 0.13
Nodes (21): Column, COLUMN_LABELS, COLUMN_ORDER, COLUMNS, ACTIVE_COLUMNS, Board(), isColumn(), isLocked() (+13 more)

### Community 90 - ".getReviewPass"
Cohesion: 0.23
Nodes (4): ensureClaudeBinary(), SDK_EFFORTS, toSdkEffort(), RealPaneStream

### Community 91 - "AgentsView.tsx"
Cohesion: 0.18
Nodes (10): AtelierDesktopRpcSchema, DesktopRequests, McpSettingsMetadata, McpTokenSource, WebviewRequests, McpSettingsController, McpSettings(), createMcpSettingsClient() (+2 more)

### Community 92 - "useCapabilities.ts"
Cohesion: 0.17
Nodes (8): Block, blockText(), compactChunks(), firstCharCode(), TranscriptBuffer, trimBlockStart(), AgentStreamBlock, TranscriptUpdate

### Community 93 - "ColumnActionsMenu.tsx"
Cohesion: 0.25
Nodes (7): Azure DevOps support — state file, Decisions (validated by the owner, 2026-09-21), Goal, Known blockers for lots 3 and 4, Open questions, Progress, Verified on this machine (az 2.90.0, azure-devops 1.0.8)

### Community 94 - ".addComment"
Cohesion: 0.12
Nodes (8): mapAgentMessageRow(), mapExecutionRunRow(), SqlUpdateBuilder, StartExecutionInput, runRecordedAction(), AgentMessage, ExecutionOwnerType, ExecutionRun

### Community 95 - "TicketConfigSummary.tsx"
Cohesion: 0.50
Nodes (3): appBundle, EMBEDDED_BINARIES, resourcesApp

### Community 97 - "RunningServer"
Cohesion: 0.05
Nodes (50): codexImplementerKnobs(), assertCodexImplementerAvailable(), log, ReclaimOutcome, SETUP_PHASES, SlotManagerConfig, WorktreeAddressWatcher, applyAppSettingsToModels() (+42 more)

### Community 98 - "triageManager.ts"
Cohesion: 0.27
Nodes (11): groupOrientation(), layoutToSizes(), panelId(), panelPercent(), SplitTree(), SplitTreeProps, SplitOrientation, isShortcutDetail() (+3 more)

### Community 99 - "reviewPublishingGuard.ts"
Cohesion: 0.07
Nodes (35): API_GUARDS, API_READ_METHOD_SET, ApiDenyPatterns, ApiGuard, AZ_INVOKE_COMMAND, AZ_INVOKE_METHOD_LONG_FLAGS, AZ_INVOKE_WRITE_INPUT_LONG_FLAGS, AZ_PR_WRITE_PATTERN (+27 more)

### Community 100 - ".startVerification"
Cohesion: 0.25
Nodes (5): OpenPr, PrSelectRow(), PrSelectRowProps, ProjectPanelState, isPrNeedsAttention()

### Community 101 - "codexProvider.test.ts"
Cohesion: 0.13
Nodes (11): directories, initializeParamsSchema, log, requestSchema, rpcError(), rpcResult(), rpcResponseSchema, toolCallParamsSchema (+3 more)

### Community 102 - "DescriptionTab.tsx"
Cohesion: 0.17
Nodes (14): CodexBinaryVersionError, require, resolveCodexBinary(), resolveCodexBinaryOverride(), TARGETS, accountResponseSchema, modelListResponseSchema, modelSchema (+6 more)

### Community 103 - "TerminalSession"
Cohesion: 0.08
Nodes (10): FakePaneStream, PaneStream, dataMessage(), normalizeSeed(), safeParse(), send(), TerminalSession, TerminalSessionManager (+2 more)

### Community 105 - ".finishTicket"
Cohesion: 0.24
Nodes (4): confirmPrMerged(), unmergedReason(), PR_STATE_LABELS, PrState

### Community 106 - "csv.ts"
Cohesion: 0.33
Nodes (6): RFC-4180, CsvParseError, normalizeHeader(), ParsedTicketRow, ParsedTicketsCsv, parseTicketsCsv()

### Community 107 - "azureRemote.ts"
Cohesion: 0.40
Nodes (10): azureOrgUrl(), fromAzureSegments(), fromCollectionSegments(), fromLegacySegments(), fromSshSegments(), parseAzureRepoRef(), parseRemoteLocation(), RemoteLocation (+2 more)

### Community 109 - "contract.test.ts"
Cohesion: 0.24
Nodes (9): CodexTierSummary(), DurationChart(), effectiveEffortLabel(), effectiveModelLabel(), meanDurationByEffort(), meanDurationByModel(), meanExecutionDuration(), summarizeCodexTiers() (+1 more)

### Community 110 - "Profile"
Cohesion: 0.23
Nodes (3): mapProfileRow(), nullableBooleanValue(), Profile

### Community 111 - "SlotPips.tsx"
Cohesion: 0.39
Nodes (6): buildSplitChannelPrompt(), buildTicketLines(), isEnglish(), CommitLanguage, extractFigmaUrls(), hasMockups()

### Community 112 - "AgentSessionEvent"
Cohesion: 0.38
Nodes (4): formatCommitTimeout(), TimeoutUnit, timeoutUnitMs(), timeoutUnitOf()

### Community 113 - "createMcpServer"
Cohesion: 0.43
Nodes (6): createMcpServer(), invalidInput(), listPublicProjects(), OutputValidator, toolError(), toolResult()

### Community 114 - "prUrl.ts"
Cohesion: 0.27
Nodes (9): NOTE: Radix's dismissable layer registers its Escape listener on `document` in t, useCaptureEscape(), collectMatchRanges(), isShortcutDetail(), ShortcutDetail, supportsHighlightApi(), usePrdSearch(), UsePrdSearchOptions (+1 more)

### Community 115 - "useLocalDraft.ts"
Cohesion: 0.19
Nodes (7): FeasibilityStarter, isProcessing(), normalizeCreateInput(), requestKeyConflictMessage(), ticketDependencyError(), TicketOperations, deriveTitleFromDescription()

### Community 116 - "settings.tsx"
Cohesion: 0.11
Nodes (35): CleanPrPanel(), CodexAgentFields(), CodexConnectionStatus(), STATUS_LABELS, ProjectPrPicker(), ReviewPrPanel(), SessionDriverFields(), ProvidersSettings() (+27 more)

### Community 117 - "WorkflowView.tsx"
Cohesion: 0.39
Nodes (7): emit(), loadedSubscribers, loadOnce(), refreshProjects(), subscribers, useProjects(), useProjectsLoaded()

## Knowledge Gaps
- **704 isolated node(s):** `log`, `PROJECT_ROOT`, `ticketRowSchema`, `TicketRow`, `ticketCreationRequestRowSchema` (+699 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Ticket` connect `TicketCard.tsx` to `Contract Building & Slots`, `Desktop Bootstrap & Menus`, `Ticket Action Panels`, `Shared Zod Schemas`, `PR Selection & Slots Bar`, `Core Domain Concepts`, `Coordinator & Protocol`, `Live Terminal Views`, `Store Types & Agent Knobs`, `DB Row Schemas & Mappers`, `Dev Dependencies`, `User Terminal & Fake IO`, `NPM Scripts`, `Ticket Config & Constants`, `Ticket Detail & Triage UI`, `Community 48`, `Slot State`, `Community 51`, `Community 54`, `App.tsx`, `triageManager.ts`, `Package Manifest`, `Composer Run Script`, `split.ts`, `schema.test.ts`, `reviewFindings.ts`, `App.tsx`, `TerminalView.tsx`, `button.tsx`, `csv.ts`, `TicketCost.tsx`, `usePrdSearch.ts`, `RunningServer`, `SlotPips.tsx`, `useLocalDraft.ts`, `settings.tsx`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._
- **Why does `Store` connect `Slot State` to `Desktop Bootstrap & Menus`, `Feasibility Batch Management`, `Shared Zod Schemas`, `PR Selection & Slots Bar`, `Core Domain Concepts`, `Coordinator & Protocol`, `Store Types & Agent Knobs`, `Dev Dependencies`, `Agents View & Ticket Cards`, `NPM Scripts`, `Agent Profile Config`, `Modal Dialogs`, `Community 51`, `App.tsx`, `TicketCard.tsx`, `Composer Run Script`, `split.ts`, `reviewFindings.ts`, `csv.ts`, `.addComment`, `RunningServer`, `Profile`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Why does `SystemAdapter` connect `Slot State` to `RunningServer`, `Desktop Bootstrap & Menus`, `Feasibility Batch Management`, `UserTerminalManager`, `reviewFindings.ts`, `Shared Zod Schemas`, `Settings & Profiles UI`, `PR Selection & Slots Bar`, `API Client Inputs`, `TerminalSession`, `.finishTicket`, `Board & Sidebar Layout`, `.startVerification`, `Agent Profile Config`, `Modal Dialogs`, `Community 51`, `createMcpServer`, `App.tsx`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **What connects `log`, `PROJECT_ROOT`, `NOTE: AppSettings carries no implementerModel/implementerEffort, so those two MO` to the rest of the system?**
  _715 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Contract Building & Slots` be split into smaller, more focused modules?**
  _Cohesion score 0.032030561269468114 - nodes in this community are weakly interconnected._
- **Should `Terminals UI & Notifications` be split into smaller, more focused modules?**
  _Cohesion score 0.09113300492610837 - nodes in this community are weakly interconnected._
- **Should `Desktop Bootstrap & Menus` be split into smaller, more focused modules?**
  _Cohesion score 0.116701607267645 - nodes in this community are weakly interconnected._