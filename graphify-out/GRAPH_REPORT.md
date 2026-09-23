# Graph Report - kanban-agents  (2026-09-23)

## Corpus Check
- 274 files · ~747,917 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3032 nodes · 8395 edges · 131 communities (112 shown, 19 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 57 edges (avg confidence: 0.67)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c79894b5`
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
- ProjectSelect.tsx
- dialog.tsx
- AgentMessage
- TerminalSessionManager
- OverviewTab.tsx
- prUrl.ts
- SlotPips.tsx
- FakePaneStream
- .handleMessage

## God Nodes (most connected - your core abstractions)
1. `Store` - 124 edges
2. `Ticket` - 113 edges
3. `SystemAdapter` - 77 edges
4. `FakeSystemAdapter` - 67 edges
5. `cn()` - 67 edges
6. `createApiRoutes()` - 65 edges
7. `RealSystemAdapter` - 64 edges
8. `SlotManager` - 53 edges
9. `ProjectInfo` - 49 edges
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

## Communities (131 total, 19 thin omitted)

### Community 0 - "Contract Building & Slots"
Cohesion: 0.03
Nodes (72): ActionExecutionOptions, actionExecutionOptionsSchema, agentMessageSchema, AnalyzeTicketsInput, appSettingsSchema, automationRunSchema, automationSchema, baseBranchSchema (+64 more)

### Community 1 - "Terminals UI & Notifications"
Cohesion: 0.09
Nodes (27): analyzeTicketsInputSchema, analyzeTicketsOutputSchema, columnSchema, compactTicketSchema, createTodoTicketOutputSchema, editableTicketSchema, effectivePort(), isAllowedHost() (+19 more)

### Community 2 - "Desktop Bootstrap & Menus"
Cohesion: 0.10
Nodes (9): featureBranch(), slotPath(), slugify(), mapSlotRow(), mapWorktreeSessionRow(), enrichWorktreeSession(), Slot, WorktreeSession (+1 more)

### Community 3 - "Feasibility Batch Management"
Cohesion: 0.07
Nodes (35): log, logRejection(), ToolHandler, ToolResult, TRIAGE_VERDICTS, getErrorStack(), AgentSettableStage, agentSettableStageSchema (+27 more)

### Community 4 - "Ticket Action Panels"
Cohesion: 0.15
Nodes (19): AgentCard(), FILLED_GLYPH_COLORS, StageProgressBar(), StageProgressBarProps, STATE_STRIPE_COLORS, TicketCard(), TicketCardProps, TriageDot() (+11 more)

### Community 5 - "Fake System Adapter"
Cohesion: 0.07
Nodes (38): renderCollapsedFinding(), RecordingSystemAdapter, withJsonRequestFile(), escapeHtml(), renderCollapsedDetails(), renderOutsideDiffComment(), renderOutsideDiffSection(), PublishReviewOptions (+30 more)

### Community 7 - "Settings & Profiles UI"
Cohesion: 0.07
Nodes (12): delay(), dryRunLog, fakeEncoder, fakeShellPrompt(), FakeSystemAdapter, hexToBytes(), GitWorktreeAddOptions, ReviewDoneOptions (+4 more)

### Community 8 - "PR Selection & Slots Bar"
Cohesion: 0.12
Nodes (20): assertExecutionAvailable(), CODEX_LAUNCH_STATUS_MESSAGES, CodexCapabilityReader, ExecutionDefaults, FEASIBILITY_ENGINE_EXECUTION, resolveExecution(), resolveFeasibilityExecution(), resolveTicketExecution() (+12 more)

### Community 9 - "Real System Adapter"
Cohesion: 0.06
Nodes (47): AppSettings, McpSettings(), AgentDefaultsSettings(), AppearanceSettings(), CODEX_STATUS_TONES, COMMIT_ROW, DefaultsRowSpec, EFFORT_OPTIONS (+39 more)

### Community 10 - "Slot Config & Worktree Watch"
Cohesion: 0.16
Nodes (14): terminalServerMessageSchema, badgeLabelFor(), LiveTerminal(), LiveTerminalOptions, LiveTerminalProps, TerminalCell(), TerminalCellProps, NOTE: Radix's dismissable layer registers its Escape listener on `document` in t (+6 more)

### Community 11 - "Core Domain Concepts"
Cohesion: 0.04
Nodes (47): agentMessageRowSchema, AutomationRow, automationRowSchema, AutomationRunRow, automationRunRowSchema, buildScripts(), CommentRow, commentRowSchema (+39 more)

### Community 12 - "Board & Sidebar Layout"
Cohesion: 0.08
Nodes (4): directories, detectInstallCommand(), RealSystemAdapter, PrepareReviewWorktreeOptions

### Community 13 - "Database Store Operations"
Cohesion: 0.06
Nodes (46): main(), scalar(), buildFeasibilityBatchContract(), cleanTicket(), conflictTicket(), REVIEW_OPTS, reviewTicket(), TICKET_OPTS (+38 more)

### Community 14 - "Coordinator & Protocol"
Cohesion: 0.06
Nodes (37): agentPairError(), cleanDescription(), createApiRoutes(), createSplitChildren(), isBlocked(), isProcessing(), isSplitMother(), isWebOnlyPath() (+29 more)

### Community 15 - "API Routes & Reformulate"
Cohesion: 0.10
Nodes (20): CodexBinaryVersionError, require, resolveCodexBinary(), resolveCodexBinaryOverride(), TARGETS, inheritedMcpServerNames(), prepareSkills(), threadConfig() (+12 more)

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
Nodes (29): FAILURE_COLUMNS, Kind, KINDS, SUCCESS_COLUMNS, DurationChart(), ThroughputChart(), effectiveWorkDurationMs(), CodexTierSummary (+21 more)

### Community 21 - "Store Types & Agent Knobs"
Cohesion: 0.19
Nodes (25): buildCleanContract(), buildConflictResolutionContract(), buildFeasibilityContextSection(), buildImplementingSteps(), buildMockupReviewStep(), buildPlanningStep(), buildPrdBullet(), buildReviewContract() (+17 more)

### Community 22 - "DB Row Schemas & Mappers"
Cohesion: 0.20
Nodes (16): BoardColumn(), compareFamilyMembers(), familyKeyOf(), groupTicketIds(), groupTicketsByFamily(), isSplitMother(), readCollapsed(), readSortDir() (+8 more)

### Community 23 - "Dev Dependencies"
Cohesion: 0.09
Nodes (20): TicketCreationRequestConflictError, AnalyzeTicketRejectionReason, AnalyzeTicketsResult, CompactTicket, CreateTodoTicketInput, createTodoTicketInputSchema, CreateTodoTicketResult, isActive() (+12 more)

### Community 24 - "TypeScript Config"
Cohesion: 0.12
Nodes (23): ensureClaudeBinary(), bashCommandSchema, buildSettings(), claudeProvider, createSdkAgentSession(), denyBashHook(), denyNoVerifyHook, denyReviewPublishingHook (+15 more)

### Community 26 - "Cost & Pricing"
Cohesion: 0.08
Nodes (23): Watchdog, runFirstBootSetup(), applyAppSettingsToModels(), PROJECT_ROOT, NOTE: PRD generation holds the request open up to ~120s (REFORMULATE_TIMEOUT_MS), resolveDataFile(), resolveServerPort(), serveStaticAsset() (+15 more)

### Community 27 - "Workflow View & Lifecycle"
Cohesion: 0.06
Nodes (28): Architecture, Commands, Conventions (enforced — beyond the global ones in ~/.claude/CLAUDE.md), graphify, The dry-run safety model — read before running anything, What this is, Agent runtime (Agent SDK), Architecture (+20 more)

### Community 28 - "Stats Charts"
Cohesion: 0.07
Nodes (42): AgentMcpServerDefinition, agentMessageDeltaSchema, agentToml(), apiWriteDenyScript(), buildMcpServers(), ConfigObject, configReadResponseSchema, ConfigValue (+34 more)

### Community 29 - "Session Hub & Agent Session"
Cohesion: 0.12
Nodes (7): CodexAppServerConnection, CodexAppServerOptions, CodexProviderDependencies, createCodexAgentSession(), PreparedHook, AppServerFixture, CodexRuntimeDependencies

### Community 30 - "Agents View & Ticket Cards"
Cohesion: 0.13
Nodes (24): ExecutionFinishStatus, LiveSession, log, PendingSessionMessage, previewToolInput(), renderImplementationDone(), renderSessionEvent(), SessionExecutionContext (+16 more)

### Community 31 - "PRD Review & Markdown"
Cohesion: 0.12
Nodes (13): CodexAppServerInitializationError, CodexAppServerNotification, CodexAppServerProtocolError, connectCodexAppServer(), incomingSchema, initializeResponseSchema, log, PendingRequest (+5 more)

### Community 32 - "User Terminal & Fake IO"
Cohesion: 0.11
Nodes (23): ProjectInfo, AgentsViewProps, AskPanel(), AskPanelProps, CleanPrPanelProps, ImportTicketsPanel(), ImportTicketsPanelProps, NewTicketSheet() (+15 more)

### Community 33 - "Logging"
Cohesion: 0.10
Nodes (21): scripts, build:desktop, build:web, dev, dev:desktop, dev:proxy, dev:server, dev:web (+13 more)

### Community 34 - "Board Columns"
Cohesion: 0.22
Nodes (12): AgentCardProps, AgentsView(), hasLiveAgent(), normalize(), KIND_BADGES, TicketBadges(), TicketBadgesProps, resolveProjectColor() (+4 more)

### Community 36 - "Runtime Dependencies"
Cohesion: 0.21
Nodes (19): applySizes(), collectTerminalIds(), findLeaf(), firstLeafId(), LeafNode, leafNodeSchema, makeLeaf(), nextNodeId() (+11 more)

### Community 37 - "Claude SDK Provider"
Cohesion: 0.09
Nodes (23): dependencies, @anthropic-ai/claude-agent-sdk, dompurify, elysia, @fontsource/ibm-plex-mono, @fontsource/ibm-plex-sans, marked, @modelcontextprotocol/sdk (+15 more)

### Community 38 - "Agent Profile Config"
Cohesion: 0.17
Nodes (5): AutomationManager, mapAutomationRow(), mapAutomationRunRow(), Automation, AutomationRun

### Community 39 - "Agent Coordinator Handlers"
Cohesion: 0.10
Nodes (27): artifactPath, assertPackageVersionInSync(), assertSdkVersionsInSync(), BUILT_DMG, ELECTROBUN_BIN, fail(), installedPackageVersion(), RELEASE_FOLDER (+19 more)

### Community 40 - "API Client Inputs"
Cohesion: 0.07
Nodes (22): FailedReformulation, ActionSystem, CapabilityCache, CLAUDE_JSON_PATH, COMPOSER_BINARIES, INSTALL_COMMANDS, log, NON_INTERACTIVE_ENV (+14 more)

### Community 41 - "Ticket Config & Constants"
Cohesion: 0.19
Nodes (14): WsClientEvent, wsClientEventSchema, active, ensureNotificationPermission(), getAudioContext(), isSupported(), loadSoundBuffer(), playBuffer() (+6 more)

### Community 42 - "Ticket Detail & Triage UI"
Cohesion: 0.05
Nodes (67): AGENT_EFFORT_FULL_LABELS, AGENT_EFFORT_LABELS, AGENT_MODEL_FULL_LABELS, AGENT_MODEL_LABELS, AUTOMATION_RUN_STATUSES, CODEX_EFFORT_FULL_LABELS, CODEX_EFFORT_LABELS, CODEX_MODEL_LABELS (+59 more)

### Community 43 - "Demo Pipeline Concepts"
Cohesion: 0.11
Nodes (28): ACTIVE_BAR, AREA_CURSOR, AXIS_PROPS, BAR_CURSOR, CHART_PALETTE, CodexTierSummary(), colorAt(), CostSummary() (+20 more)

### Community 44 - "Chart Primitives"
Cohesion: 0.40
Nodes (5): MIME_EXTENSIONS, resolveExtension(), SavedUpload, saveUpload(), serveUpload()

### Community 45 - "Session Hub Transcript"
Cohesion: 0.28
Nodes (13): abortReason(), computeCodeFingerprint(), FingerprintEntry, FingerprintPhase, hashFingerprintPaths(), isMissingFileError(), listFingerprintPaths(), log (+5 more)

### Community 46 - "Community 46"
Cohesion: 0.27
Nodes (15): Agent Implementation Config, Argus Code Review, Automated Tests (typecheck/lint/test), Claude Code Autonomous Agent, Ticket Contract Injection, Feasibility Analysis, Kanban Board (Atelier), Kanban Agents Demo (demo.gif) (+7 more)

### Community 48 - "Community 48"
Cohesion: 0.08
Nodes (29): App(), HOME_VIEW_OPTIONS, HomeView, ConnectionHint, DragHandleAttributes, DragHandleListeners, groupProjects(), isPositiveIntegerString() (+21 more)

### Community 49 - "Slot State"
Cohesion: 0.10
Nodes (19): log, DRY_RUN_VERDICT, FeasibilityGroup, log, QueuedFeasibility, log, ReformulateManager, SessionHub (+11 more)

### Community 50 - "Stats Hooks & Cards"
Cohesion: 0.16
Nodes (12): ChartConfig, ChartContainer, ChartContainerProps, ChartContext, ChartContextValue, ChartLegendContent(), ChartLegendContentProps, ChartTooltipContent() (+4 more)

### Community 51 - "Community 51"
Cohesion: 0.05
Nodes (15): childTranscriptPrefix(), DelegationManager, renderFinding(), reviewKey(), reviewPrompt(), ReviewReportLabels, startParentSession(), verificationPrompt() (+7 more)

### Community 52 - "chart.tsx"
Cohesion: 0.14
Nodes (12): boundedCommandDetail(), runBoundedCommand(), safeJsonParse(), AzureDevopsVcsClient, prWebUrl(), readOriginRemote(), repoRefFromPrUrl(), repoRefFromRemote() (+4 more)

### Community 53 - "User Terminal Manager"
Cohesion: 0.33
Nodes (5): CONTEXT — domain glossary, Execution, Proposed (not yet built), Seams, Work items

### Community 54 - "Community 54"
Cohesion: 0.11
Nodes (42): ExecutionOverrides, AgentEffort, AgentModel, CodexEffort, CodexModel, Implementer, Orchestrator, AgentProfileConfig() (+34 more)

### Community 55 - "App.tsx"
Cohesion: 0.16
Nodes (3): FeasibilityBatchManager, toTriageResult(), FeasibilityResult

### Community 56 - "CSV Parsing"
Cohesion: 0.12
Nodes (26): ProfileConfig, DragHandleAttributes, DragHandleListeners, ProfileRow(), ProfileRowHeader(), ProfileRowHeaderProps, ProfileRowProps, ProfilesSettings() (+18 more)

### Community 57 - "Community 57"
Cohesion: 0.17
Nodes (17): ensureConfig(), boot(), externalUrlFromNewWindowEvent(), forwardAtelierShortcut(), installApplicationMenu(), installMenuShortcutBridge(), menuShortcutActionSchema, navigationEventSchema (+9 more)

### Community 58 - "File Uploads"
Cohesion: 0.36
Nodes (5): applyDesktopEnv(), DesktopRoots, ensureMcpToken(), regenerateMcpToken(), temporaryDirectories

### Community 59 - "triageManager.ts"
Cohesion: 0.28
Nodes (14): buildContractConstraintsLines(), buildResponseFormatLines(), buildStrictRulesLines(), buildTicketLines(), buildTriageChannelPrompt(), buildTriagePlusChannelPrompt(), isEnglish(), readOnlyFramingLines() (+6 more)

### Community 60 - "Package Manifest"
Cohesion: 0.26
Nodes (9): applyTranscriptUpdate(), TranscriptState, transcriptText(), transcriptUpdateSchema, FullscreenToggle(), FullscreenToggleProps, TerminalData, TerminalView() (+1 more)

### Community 61 - "splitManager.ts"
Cohesion: 0.05
Nodes (51): ProviderRow(), NAV_ENTRIES, NavEntry, Sidebar(), SidebarProps, SidebarView, ActivityTab(), isUnanswered() (+43 more)

### Community 62 - "TicketCard.tsx"
Cohesion: 0.16
Nodes (9): addUsageByModel(), toUsageByModel(), TicketLifecycle, ACTIVE_STAGES, Stage, Ticket, TriageResult, DescriptionTabProps (+1 more)

### Community 63 - "Community 63"
Cohesion: 0.08
Nodes (8): DoneGateResult, ReviewHeadResult, FakeVcsClient, extractPrUrl(), githubPrHeadRef(), GithubVcsClient, pullApiEndpoint(), VcsClient

### Community 64 - "Composer Run Script"
Cohesion: 0.11
Nodes (12): AckSystem, ActiveDelegation, ClosableExecution, RecordedSession, RecordingSystem, RecordedSession, RecordingSystem, RelaunchSystem (+4 more)

### Community 65 - "split.ts"
Cohesion: 0.06
Nodes (39): DEFAULT_MODELS, ProjectKey, mapTicketCreationRequestRow(), AttachExecutionSessionInput, AutomationPatch, EnqueueAgentMessageInput, FinalizeExecutionInput, MarkAgentMessageAcceptedInput (+31 more)

### Community 66 - "OpenPr"
Cohesion: 0.14
Nodes (11): CodexAppServerRpcError, canonicalJson(), CodexCommandHook, codexSessionPreToolUseHookHash(), JsonValue, createCodexProvider(), AppServerFixtureOptions, hookPathForSession() (+3 more)

### Community 68 - "schema.test.ts"
Cohesion: 0.11
Nodes (21): PrdAnnotator(), PrdAnnotatorProps, BREADCRUMB, NO_ANNOTATIONS, PrdReviewDialog(), PrdReviewDialogProps, PrdView(), Sheet() (+13 more)

### Community 69 - "reviewFindings.ts"
Cohesion: 0.06
Nodes (51): ActiveReview, ActiveReviewPass, log, orderedReviewKinds(), renderPersistedReviewResult(), REVIEW_DISALLOWED_TOOLS, REVIEW_REPORT_LABELS_EN, REVIEW_REPORT_LABELS_FR (+43 more)

### Community 70 - "CodexRuntimeStatus"
Cohesion: 0.26
Nodes (9): Toaster(), COLUMN_NODE_COLOR, depthOf(), truncate(), WorkflowView(), WorkflowViewProps, WorktreeSessionsView(), WorktreeSessionsViewProps (+1 more)

### Community 71 - "PostCSS Config"
Cohesion: 0.29
Nodes (6): name, overrides, zod, private, type, version

### Community 72 - "App.tsx"
Cohesion: 0.13
Nodes (22): PR_STATE_LABELS, ColumnActionsMenu(), ColumnActionsMenuProps, ColumnMenuItem, ActionContext, buildActions(), ConfirmSpec, errorMessage() (+14 more)

### Community 73 - "TerminalView.tsx"
Cohesion: 0.11
Nodes (22): QuitConfirmModalProps, TICKET_TAB_LABELS, TicketTab, TicketTabs(), TicketTabsProps, availableTabs(), hasSessionPane(), initialTab() (+14 more)

### Community 74 - "button.tsx"
Cohesion: 0.12
Nodes (19): AUTOMATION_TRIGGER_LABELS, AUTOMATION_TRIGGERS, AutomationRunStatus, AutomationTrigger, CreateAutomationInput, AutomationCard(), AutomationCardProps, AutomationForm() (+11 more)

### Community 75 - ".handleRequest"
Cohesion: 0.11
Nodes (13): analyzeResultSchema, compactTicketSchema, createResultSchema, errorResultSchema, ISOLATED_ENV_KEYS, projectResultSchema, savedEnv, startResultSchema (+5 more)

### Community 76 - "usePrdSearch.ts"
Cohesion: 0.11
Nodes (25): costByFamily(), costOf(), costOfModel(), costOfSessions(), CostSummary, FamilyPricing, MODEL_PRICING, ModelFamily (+17 more)

### Community 78 - "csv.ts"
Cohesion: 0.21
Nodes (10): COLUMN_LABELS, columnSchema, MetaRow(), MetaRowProps, STATUS_CONFIRMS, StatusConfirm, statusTitle(), TicketMeta() (+2 more)

### Community 79 - "WorktreeSession"
Cohesion: 0.33
Nodes (3): listeners, mcp, ReplyArgsSchema

### Community 80 - "recordedAction.ts"
Cohesion: 0.23
Nodes (17): alternation(), COMMAND_WRAPPERS, commandSegments(), commandWords(), executableName(), launchedPackageScript(), launchesTypecheck(), OPTIONS_WITH_VALUE (+9 more)

### Community 81 - "vcsCommands.ts"
Cohesion: 0.22
Nodes (6): AZURE_COMMANDS, COMMANDS_BY_PROVIDER, GITHUB_COMMANDS, PrDiffContext, VcsCleanCommands, AZ_SETTLED_THREAD_STATUSES

### Community 82 - "Community 82"
Cohesion: 0.22
Nodes (4): McpTokenSource, createMcpSettingsController(), McpSettingsControllerDependencies, temporaryDirectories

### Community 86 - "TicketCost.tsx"
Cohesion: 0.40
Nodes (4): mapCommentRow(), Comment, ActivityTabProps, CommentRowProps

### Community 87 - "createMcpServer"
Cohesion: 0.07
Nodes (26): BoundedCommandResult, connectionFailure(), connectionResult(), ghPrHeadSchema, ghPrSchema, ghPrStateSchema, ghRestPullSchema, ghRestReviewPagesSchema (+18 more)

### Community 89 - "usePrdSearch.ts"
Cohesion: 0.14
Nodes (20): Column, COLUMN_ORDER, COLUMNS, ACTIVE_COLUMNS, Board(), BoardProps, isColumn(), isLocked() (+12 more)

### Community 91 - "AgentsView.tsx"
Cohesion: 0.22
Nodes (8): AtelierDesktopRpcSchema, DesktopRequests, McpSettingsMetadata, WebviewRequests, McpSettingsController, createMcpSettingsClient(), getMcpSettingsClient(), McpSettingsClient

### Community 92 - "useCapabilities.ts"
Cohesion: 0.17
Nodes (8): Block, blockText(), compactChunks(), firstCharCode(), TranscriptBuffer, trimBlockStart(), AgentStreamBlock, TranscriptUpdate

### Community 93 - "ColumnActionsMenu.tsx"
Cohesion: 0.25
Nodes (7): Azure DevOps support — state file, Decisions (validated by the owner, 2026-09-21), Goal, Known blockers for lots 3 and 4, Open questions, Progress, Verified on this machine (az 2.90.0, azure-devops 1.0.8)

### Community 94 - ".addComment"
Cohesion: 0.16
Nodes (5): startFeasibilityTicket(), mapExecutionRunRow(), SqlUpdateBuilder, runRecordedAction(), ExecutionRun

### Community 95 - "TicketConfigSummary.tsx"
Cohesion: 0.50
Nodes (3): appBundle, EMBEDDED_BINARIES, resourcesApp

### Community 97 - "RunningServer"
Cohesion: 0.06
Nodes (31): WorktreeAddressWatcher, projectConfigSchema, ANSI, appendToLogFile(), COLOR_ENABLED, createLogger(), disableFileLogging(), initLogFile() (+23 more)

### Community 98 - "triageManager.ts"
Cohesion: 0.27
Nodes (11): groupOrientation(), layoutToSizes(), panelId(), panelPercent(), SplitTree(), SplitTreeProps, SplitOrientation, isShortcutDetail() (+3 more)

### Community 99 - "reviewPublishingGuard.ts"
Cohesion: 0.07
Nodes (35): API_GUARDS, API_READ_METHOD_SET, ApiDenyPatterns, ApiGuard, AZ_INVOKE_COMMAND, AZ_INVOKE_METHOD_LONG_FLAGS, AZ_INVOKE_WRITE_INPUT_LONG_FLAGS, AZ_PR_WRITE_PATTERN (+27 more)

### Community 101 - "codexProvider.test.ts"
Cohesion: 0.21
Nodes (10): initializeParamsSchema, log, requestSchema, rpcError(), rpcResult(), toolCallParamsSchema, WorkerMcpHandlers, isWorkerToolName() (+2 more)

### Community 102 - "DescriptionTab.tsx"
Cohesion: 0.39
Nodes (7): currentNow, getSnapshot(), startTicking(), stopTicking(), subscribe(), subscribers, useTickTimer()

### Community 104 - "reviewPass.ts"
Cohesion: 0.32
Nodes (5): StatRecord, StatCard(), StatCardProps, StatEmpty(), UseStatsResult

### Community 106 - "csv.ts"
Cohesion: 0.33
Nodes (6): RFC-4180, CsvParseError, normalizeHeader(), ParsedTicketRow, ParsedTicketsCsv, parseTicketsCsv()

### Community 107 - "azureRemote.ts"
Cohesion: 0.40
Nodes (10): azureOrgUrl(), fromAzureSegments(), fromCollectionSegments(), fromLegacySegments(), fromSshSegments(), parseAzureRepoRef(), parseRemoteLocation(), RemoteLocation (+2 more)

### Community 108 - "reformulate.ts"
Cohesion: 0.23
Nodes (9): dataMessage(), log, normalizeSeed(), send(), TerminalSocket, TerminalSocketData, visibleText(), terminalClientMessageSchema (+1 more)

### Community 109 - "contract.test.ts"
Cohesion: 0.60
Nodes (3): PrSelectRow(), PrSelectRowProps, isPrNeedsAttention()

### Community 110 - "Profile"
Cohesion: 0.48
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
Cohesion: 0.36
Nodes (7): collectMatchRanges(), isShortcutDetail(), ShortcutDetail, supportsHighlightApi(), usePrdSearch(), UsePrdSearchOptions, UsePrdSearchResult

### Community 115 - "useLocalDraft.ts"
Cohesion: 0.19
Nodes (7): FeasibilityStarter, isProcessing(), normalizeCreateInput(), requestKeyConflictMessage(), ticketDependencyError(), TicketOperations, deriveTitleFromDescription()

### Community 116 - "settings.tsx"
Cohesion: 0.11
Nodes (27): codexRuntimeStatusSchema, isCodexFastServiceTier(), pairedRuntimeCodexEffort(), UNKNOWN_CODEX_RUNTIME_STATUS, pairedCodexEffort(), Capabilities, CodexAgentFields(), CodexConnectionStatus() (+19 more)

### Community 117 - "WorkflowView.tsx"
Cohesion: 0.39
Nodes (7): emit(), loadedSubscribers, loadOnce(), refreshProjects(), subscribers, useProjects(), useProjectsLoaded()

### Community 119 - "McpSettingsControllerDependencies"
Cohesion: 0.10
Nodes (26): resolveBaseBranch(), buildAskContract(), groupFeasibilityTickets(), codexImplementerKnobs(), assertCodexImplementerAvailable(), log, ReclaimOutcome, SETUP_PHASES (+18 more)

### Community 120 - "ProjectSelect.tsx"
Cohesion: 0.17
Nodes (15): UpdateTicketInput, groupProjects(), initialExpandedGroups(), normalizeSearch(), ProjectGroup, projectGroupIdentity(), projectInitial(), ProjectSelect() (+7 more)

### Community 121 - "dialog.tsx"
Cohesion: 0.67
Nodes (3): TERMINAL_STAGES, TerminalTab(), TerminalTabProps

### Community 128 - "SlotPips.tsx"
Cohesion: 0.38
Nodes (6): ATTENTION_STATUSES, sessionOf(), SlotPips(), SlotPipsProps, STATUS_LABELS, STATUS_PIP_CLASSES

## Knowledge Gaps
- **708 isolated node(s):** `PrdAnnotatorProps`, `ProjectSelectOption`, `ProjectGroup`, `ProjectSelectProps`, `BranchComboboxProps` (+703 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **19 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Ticket` connect `TicketCard.tsx` to `Contract Building & Slots`, `Desktop Bootstrap & Menus`, `Ticket Action Panels`, `Shared Zod Schemas`, `PR Selection & Slots Bar`, `Core Domain Concepts`, `Database Store Operations`, `Coordinator & Protocol`, `Live Terminal Views`, `Store Types & Agent Knobs`, `DB Row Schemas & Mappers`, `Dev Dependencies`, `User Terminal & Fake IO`, `Board Columns`, `NPM Scripts`, `Ticket Config & Constants`, `Ticket Detail & Triage UI`, `Community 48`, `Slot State`, `Community 51`, `triageManager.ts`, `splitManager.ts`, `split.ts`, `UserTerminalManager`, `reviewFindings.ts`, `CodexRuntimeStatus`, `App.tsx`, `TerminalView.tsx`, `usePrdSearch.ts`, `csv.ts`, `TicketCost.tsx`, `usePrdSearch.ts`, `.addComment`, `.startVerification`, `SlotPips.tsx`, `useLocalDraft.ts`, `McpSettingsControllerDependencies`, `ProjectSelect.tsx`, `dialog.tsx`, `OverviewTab.tsx`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **Why does `getErrorMessage()` connect `RunningServer` to `Desktop Bootstrap & Menus`, `reviewFindings.ts`, `Shared Zod Schemas`, `PR Selection & Slots Bar`, `API Client Inputs`, `Database Store Operations`, `Slot State`, `Community 51`, `Agents View & Ticket Cards`, `McpSettingsControllerDependencies`, `App.tsx`, `TypeScript Config`, `Cost & Pricing`, `Stats Charts`, `Session Hub & Agent Session`, `TicketCard.tsx`, `PRD Review & Markdown`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Why does `Store` connect `Slot State` to `Desktop Bootstrap & Menus`, `Feasibility Batch Management`, `Shared Zod Schemas`, `PR Selection & Slots Bar`, `Database Store Operations`, `Coordinator & Protocol`, `Store Types & Agent Knobs`, `Dev Dependencies`, `Cost & Pricing`, `Agents View & Ticket Cards`, `NPM Scripts`, `Agent Profile Config`, `Community 51`, `TicketCard.tsx`, `split.ts`, `reviewFindings.ts`, `TicketCost.tsx`, `.addComment`, `RunningServer`, `.startVerification`, `reviewPass.ts`, `reformulate.ts`, `Profile`, `McpSettingsControllerDependencies`, `AgentMessage`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **What connects `PrdAnnotatorProps`, `ProjectSelectOption`, `ProjectGroup` to the rest of the system?**
  _719 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Contract Building & Slots` be split into smaller, more focused modules?**
  _Cohesion score 0.033106134371957155 - nodes in this community are weakly interconnected._
- **Should `Terminals UI & Notifications` be split into smaller, more focused modules?**
  _Cohesion score 0.09113300492610837 - nodes in this community are weakly interconnected._
- **Should `Desktop Bootstrap & Menus` be split into smaller, more focused modules?**
  _Cohesion score 0.10453283996299723 - nodes in this community are weakly interconnected._