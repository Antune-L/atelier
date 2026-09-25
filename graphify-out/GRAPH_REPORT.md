# Graph Report - kanban-agents  (2026-09-25)

## Corpus Check
- 274 files · ~748,590 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3039 nodes · 8363 edges · 117 communities (109 shown, 8 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 54 edges (avg confidence: 0.67)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `63e734ba`
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
- TerminalSession
- .finishTicket
- azureRemote.ts
- Profile
- mcpSettings.ts
- createMcpServer
- TicketConfigSummary.tsx
- bootstrap.ts
- settings.tsx
- TicketMeta.tsx
- McpSettingsControllerDependencies
- Comment
- TicketPatch
- ReviewPrPanel.tsx
- reformulate.ts
- prUrl.ts
- profileMatching.test.ts

## God Nodes (most connected - your core abstractions)
1. `Store` - 122 edges
2. `Ticket` - 103 edges
3. `cn()` - 83 edges
4. `SystemAdapter` - 75 edges
5. `FakeSystemAdapter` - 67 edges
6. `RealSystemAdapter` - 64 edges
7. `createApiRoutes()` - 61 edges
8. `SlotManager` - 55 edges
9. `ProjectInfo` - 52 edges
10. `DelegationManager` - 50 edges

## Surprising Connections (you probably didn't know these)
- `McpSettingsClient` --references--> `McpSettingsMetadata`  [EXTRACTED]
  src/web/src/lib/mcpSettings.ts → desktop/mcpRpc.ts
- `main()` --calls--> `migrateCodexCatalog()`  [EXTRACTED]
  scripts/downgrade-codex-catalog.ts → src/server/db/schema.ts
- `main()` --calls--> `assertCodexDowngradeSafe()`  [EXTRACTED]
  scripts/downgrade-codex-catalog.ts → src/server/db/schema.ts
- `StageProgressBarProps` --references--> `Ticket`  [EXTRACTED]
  src/web/src/components/StageProgressBar.tsx → src/shared/schemas.ts
- `DescriptionTabProps` --references--> `Ticket`  [EXTRACTED]
  src/web/src/components/ticket-detail/DescriptionTab.tsx → src/shared/schemas.ts

## Import Cycles
- None detected.

## Communities (117 total, 8 thin omitted)

### Community 0 - "Contract Building & Slots"
Cohesion: 0.04
Nodes (63): ActionExecutionOptions, actionExecutionOptionsSchema, agentMessageSchema, AnalyzeTicketsInput, appSettingsSchema, automationRunSchema, automationSchema, baseBranchSchema (+55 more)

### Community 1 - "Terminals UI & Notifications"
Cohesion: 0.10
Nodes (20): analyzeTicketsInputSchema, analyzeTicketsOutputSchema, columnSchema, compactTicketSchema, createTodoTicketOutputSchema, editableTicketSchema, listProjectsInputSchema, listProjectsOutputSchema (+12 more)

### Community 2 - "Desktop Bootstrap & Menus"
Cohesion: 0.14
Nodes (8): mapSlotRow(), mapWorktreeSessionRow(), enrichWorktreeSession(), ClientSocket, failSplitMother(), Slot, WorktreeSession, BoardState

### Community 3 - "Feasibility Batch Management"
Cohesion: 0.06
Nodes (39): log, ToolHandler, ToolResult, addUsageByModel(), toUsageByModel(), TRIAGE_VERDICTS, AgentSettableStage, agentSettableStageSchema (+31 more)

### Community 4 - "Ticket Action Panels"
Cohesion: 0.12
Nodes (27): AgentCard(), AgentCardProps, AgentsView(), AgentsViewProps, hasLiveAgent(), normalize(), resolveProjectColor(), STATE_STRIPE_COLORS (+19 more)

### Community 5 - "Fake System Adapter"
Cohesion: 0.07
Nodes (29): azureChangeEntrySchema, azureCommentSchema, AzureDevopsVcsClient, azureIdentitySchema, azureIterationChangesSchema, azureIterationListSchema, azurePath(), AzurePrContext (+21 more)

### Community 7 - "Settings & Profiles UI"
Cohesion: 0.08
Nodes (3): delay(), fakeShellPrompt(), FakeSystemAdapter

### Community 8 - "PR Selection & Slots Bar"
Cohesion: 0.10
Nodes (25): assertExecutionAvailable(), CODEX_LAUNCH_STATUS_MESSAGES, CodexCapabilityReader, ExecutionDefaults, ExecutionOverrides, FEASIBILITY_ENGINE_EXECUTION, ResolvedExecution, resolveExecution() (+17 more)

### Community 9 - "Real System Adapter"
Cohesion: 0.07
Nodes (42): AppSettings, CreateProjectInput, UpdateProjectInput, ConnectionHint, DragHandleAttributes, DragHandleListeners, groupProjects(), isPositiveIntegerString() (+34 more)

### Community 10 - "Slot Config & Worktree Watch"
Cohesion: 0.15
Nodes (8): AckSystem, RecordedSession, RecordingSystem, RecordedSession, RecordingSystem, RelaunchSystem, AgentSessionHandle, AgentSessionOptions

### Community 11 - "Core Domain Concepts"
Cohesion: 0.04
Nodes (46): agentMessageRowSchema, AutomationRow, automationRowSchema, AutomationRunRow, automationRunRowSchema, buildScripts(), CommentRow, commentRowSchema (+38 more)

### Community 12 - "Board & Sidebar Layout"
Cohesion: 0.10
Nodes (4): runBoundedCommand(), detectInstallCommand(), RealSystemAdapter, VcsProvider

### Community 13 - "Database Store Operations"
Cohesion: 0.07
Nodes (26): escapeHtml(), renderCollapsedDetails(), renderOutsideDiffComment(), renderOutsideDiffSection(), ReviewPublicationComment, extractPrUrl(), ghPrHeadSchema, ghPrSchema (+18 more)

### Community 14 - "Coordinator & Protocol"
Cohesion: 0.07
Nodes (29): ProjectInUseError, cleanDescription(), createSplitChildren(), log, performSplit(), prSummaryLines(), reviewDescription(), splitChildDefaults() (+21 more)

### Community 15 - "API Routes & Reformulate"
Cohesion: 0.10
Nodes (19): CodexAppServerConnection, createCodexAgentSession(), inheritedMcpServerNames(), PreparedHook, prepareSkills(), threadConfig(), accountResponseSchema, CodexRuntimeDependencies (+11 more)

### Community 16 - "Stats Aggregation"
Cohesion: 0.08
Nodes (7): startParentSession(), mergeAgentUsageByModel(), previewToolInput(), renderSessionEvent(), SessionHub, SessionHubHandlers, SessionStartCallbacks

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
Cohesion: 0.08
Nodes (36): AGENT_EFFORT_LABELS, AGENT_MODEL_LABELS, CODEX_EFFORT_LABELS, FAILURE_COLUMNS, Kind, KINDS, SUCCESS_COLUMNS, CodexTierSummary() (+28 more)

### Community 21 - "Store Types & Agent Knobs"
Cohesion: 0.16
Nodes (27): buildAskContract(), buildCleanContract(), buildConflictResolutionContract(), buildFeasibilityBatchContract(), buildFeasibilityContextSection(), buildImplementingSteps(), buildMockupReviewStep(), buildPlanningStep() (+19 more)

### Community 22 - "DB Row Schemas & Mappers"
Cohesion: 0.18
Nodes (17): COLUMN_SORT_FIELD, BoardColumn(), compareFamilyMembers(), familyKeyOf(), groupTicketIds(), groupTicketsByFamily(), isSplitMother(), readCollapsed() (+9 more)

### Community 23 - "Dev Dependencies"
Cohesion: 0.10
Nodes (18): NewTicket, TicketCreationRequestConflictError, AnalyzeTicketRejectionReason, AnalyzeTicketsResult, CreateTodoTicketInput, createTodoTicketInputSchema, CreateTodoTicketResult, isActive() (+10 more)

### Community 24 - "TypeScript Config"
Cohesion: 0.15
Nodes (20): bashCommandSchema, buildSettings(), claudeProvider, createSdkAgentSession(), denyBashHook(), denyNoVerifyHook, denyReviewPublishingHook, denyTypecheckHook() (+12 more)

### Community 26 - "Cost & Pricing"
Cohesion: 0.06
Nodes (35): setup(), Watchdog, log, runFirstBootSetup(), projectConfigSchema, PROJECT_ROOT, NOTE: PRD generation holds the request open up to ~120s (REFORMULATE_TIMEOUT_MS), resolveDataFile() (+27 more)

### Community 27 - "Workflow View & Lifecycle"
Cohesion: 0.06
Nodes (28): Architecture, Commands, Conventions (enforced — beyond the global ones in ~/.claude/CLAUDE.md), graphify, The dry-run safety model — read before running anything, What this is, Agent runtime (Agent SDK), Architecture (+20 more)

### Community 28 - "Stats Charts"
Cohesion: 0.07
Nodes (42): AgentMcpServerDefinition, agentMessageDeltaSchema, agentToml(), apiWriteDenyScript(), buildMcpServers(), ConfigObject, configReadResponseSchema, ConfigValue (+34 more)

### Community 29 - "Session Hub & Agent Session"
Cohesion: 0.16
Nodes (4): CodexAppServerNotification, CodexAppServerOptions, CodexProviderDependencies, AppServerFixture

### Community 30 - "Agents View & Ticket Cards"
Cohesion: 0.14
Nodes (24): ExecutionFinishStatus, LiveSession, log, PendingSessionMessage, renderChannelEvent(), renderImplementationDone(), SessionExecutionContext, SessionExecutionFinish (+16 more)

### Community 31 - "PRD Review & Markdown"
Cohesion: 0.05
Nodes (32): ActiveDelegation, ActiveReview, ActiveReviewPass, childTranscriptPrefix(), ClosableExecution, DelegationManager, FEATURE_REVIEWER_OPTIONS, log (+24 more)

### Community 32 - "User Terminal & Fake IO"
Cohesion: 0.07
Nodes (46): RFC-4180, isNotionUrl(), NOTION_HOSTS, ProjectInfo, AskPanelProps, CleanPrPanelProps, ImportTicketsPanel(), ImportTicketsPanelProps (+38 more)

### Community 33 - "Logging"
Cohesion: 0.10
Nodes (21): scripts, build:desktop, build:web, dev, dev:desktop, dev:proxy, dev:server, dev:web (+13 more)

### Community 34 - "Board Columns"
Cohesion: 0.13
Nodes (17): AUTOMATION_TRIGGER_LABELS, AUTOMATION_TRIGGERS, AutomationRunStatus, AutomationTrigger, CreateAutomationInput, AutomationCard(), AutomationCardProps, AutomationFormProps (+9 more)

### Community 35 - "NPM Scripts"
Cohesion: 0.17
Nodes (3): AgentCoordinator, SessionToolCall, mapTicketRow()

### Community 36 - "Runtime Dependencies"
Cohesion: 0.05
Nodes (64): terminalServerMessageSchema, applyTranscriptUpdate(), TranscriptState, transcriptText(), transcriptUpdateSchema, FullscreenToggle(), FullscreenToggleProps, badgeLabelFor() (+56 more)

### Community 37 - "Claude SDK Provider"
Cohesion: 0.09
Nodes (23): dependencies, @anthropic-ai/claude-agent-sdk, dompurify, elysia, @fontsource/ibm-plex-mono, @fontsource/ibm-plex-sans, marked, @modelcontextprotocol/sdk (+15 more)

### Community 38 - "Agent Profile Config"
Cohesion: 0.17
Nodes (5): AutomationManager, mapAutomationRow(), mapAutomationRunRow(), Automation, AutomationRun

### Community 39 - "Agent Coordinator Handlers"
Cohesion: 0.18
Nodes (17): adopt(), compareVersions(), detectionCandidates(), detectUserInstall(), downloadAndVerifyTarball(), downloadPinnedBinary(), emitProgress(), isCompatibleCli() (+9 more)

### Community 40 - "API Client Inputs"
Cohesion: 0.36
Nodes (3): connectionFailure(), connectionResult(), VcsConnectionResult

### Community 41 - "Ticket Config & Constants"
Cohesion: 0.19
Nodes (14): WsClientEvent, wsClientEventSchema, active, ensureNotificationPermission(), getAudioContext(), isSupported(), loadSoundBuffer(), playBuffer() (+6 more)

### Community 42 - "Ticket Detail & Triage UI"
Cohesion: 0.21
Nodes (19): AGENT_EFFORT_FULL_LABELS, AGENT_MODEL_FULL_LABELS, CODEX_EFFORT_FULL_LABELS, CODEX_MODEL_LABELS, IMPLEMENTER_LABELS, ProfilePipeline(), buildProfilePipeline(), claudeDetail() (+11 more)

### Community 43 - "Demo Pipeline Concepts"
Cohesion: 0.29
Nodes (9): gitMetadataWritableRoots(), agentBaseEnv(), bestInstalledMatch(), compareParts(), envWithProjectNode(), nvmNodeBinDir(), readNvmrc(), prepareProjectShell() (+1 more)

### Community 44 - "Chart Primitives"
Cohesion: 0.11
Nodes (25): cleanTicket(), conflictTicket(), REVIEW_OPTS, reviewTicket(), TICKET_OPTS, CHILD_USAGE, FULL_REVIEW_KINDS, LIGHT_REVIEW_KINDS (+17 more)

### Community 45 - "Session Hub Transcript"
Cohesion: 0.23
Nodes (10): artifactPath, assertPackageVersionInSync(), assertSdkVersionsInSync(), BUILT_DMG, ELECTROBUN_BIN, fail(), installedPackageVersion(), RELEASE_FOLDER (+2 more)

### Community 46 - "Community 46"
Cohesion: 0.27
Nodes (15): Agent Implementation Config, Argus Code Review, Automated Tests (typecheck/lint/test), Claude Code Autonomous Agent, Ticket Contract Injection, Feasibility Analysis, Kanban Board (Atelier), Kanban Agents Demo (demo.gif) (+7 more)

### Community 47 - "Modal Dialogs"
Cohesion: 0.06
Nodes (3): SystemAdapter, UserTerminalManager, TerminalDescriptor

### Community 48 - "Community 48"
Cohesion: 0.33
Nodes (9): useTheme(), UseThemeResult, applyTheme(), getStoredTheme(), isTheme(), Theme, ThemeOption, THEMES (+1 more)

### Community 49 - "Slot State"
Cohesion: 0.12
Nodes (23): main(), scalar(), assertCodexDowngradeSafe(), backfillOrchestrator(), countRows(), createDatabase(), EXECUTION_MIGRATIONS, hasColumn() (+15 more)

### Community 50 - "Stats Hooks & Cards"
Cohesion: 0.16
Nodes (12): ChartConfig, ChartContainer, ChartContainerProps, ChartContext, ChartContextValue, ChartLegendContent(), ChartLegendContentProps, ChartTooltipContent() (+4 more)

### Community 51 - "Community 51"
Cohesion: 0.38
Nodes (6): ATTENTION_STATUSES, sessionOf(), SlotPips(), SlotPipsProps, STATUS_LABELS, STATUS_PIP_CLASSES

### Community 53 - "User Terminal Manager"
Cohesion: 0.33
Nodes (5): CONTEXT — domain glossary, Execution, Proposed (not yet built), Seams, Work items

### Community 54 - "Community 54"
Cohesion: 0.09
Nodes (31): StatRecord, StatCard(), StatCardProps, StatEmpty(), ACTIVE_BAR, AREA_CURSOR, AXIS_PROPS, BAR_CURSOR (+23 more)

### Community 56 - "CSV Parsing"
Cohesion: 0.19
Nodes (27): AgentEffort, AgentModel, CodexEffort, CodexModel, Implementer, Orchestrator, AgentProfileConfig(), AgentProfileConfigProps (+19 more)

### Community 57 - "Community 57"
Cohesion: 0.17
Nodes (17): ensureConfig(), boot(), externalUrlFromNewWindowEvent(), forwardAtelierShortcut(), installApplicationMenu(), installMenuShortcutBridge(), menuShortcutActionSchema, navigationEventSchema (+9 more)

### Community 58 - "File Uploads"
Cohesion: 0.20
Nodes (10): PrSelectRow(), PrSelectRowProps, KIND_BADGES, TicketBadges(), TicketBadgesProps, Badge(), BadgeProps, BadgeVariant (+2 more)

### Community 59 - "triageManager.ts"
Cohesion: 0.16
Nodes (22): buildSplitChannelPrompt(), buildTicketLines(), isEnglish(), buildContractConstraintsLines(), buildResponseFormatLines(), buildStrictRulesLines(), buildTicketLines(), buildTriageChannelPrompt() (+14 more)

### Community 60 - "Package Manifest"
Cohesion: 0.22
Nodes (4): listProjectKeys(), listPublicProjects(), PublicMcpManager, TicketOperations

### Community 61 - "splitManager.ts"
Cohesion: 0.06
Nodes (49): ProjectPrPicker(), ProjectPrPickerProps, NAV_ENTRIES, NavEntry, Sidebar(), SidebarProps, SidebarView, FILLED_GLYPH_COLORS (+41 more)

### Community 62 - "TicketCard.tsx"
Cohesion: 0.16
Nodes (5): startFeasibilityTicket(), TicketLifecycle, ACTIVE_STAGES, Stage, Ticket

### Community 63 - "Community 63"
Cohesion: 0.10
Nodes (7): DoneGateResult, ReviewHeadResult, FAKE_OPEN_PRS, FakeVcsClient, githubPrHeadRef(), VcsClient, OpenPr

### Community 64 - "Composer Run Script"
Cohesion: 0.06
Nodes (33): FailedReformulation, ActionSystem, AgentSessionEvent, CapabilityCache, dryRunLog, fakeEncoder, hexToBytes(), CLAUDE_JSON_PATH (+25 more)

### Community 65 - "split.ts"
Cohesion: 0.07
Nodes (32): mapAgentMessageRow(), mapReviewApprovalRow(), mapReviewPassRow(), mapTicketCreationRequestRow(), AttachExecutionSessionInput, AutomationPatch, EnqueueAgentMessageInput, FinalizeExecutionInput (+24 more)

### Community 66 - "OpenPr"
Cohesion: 0.16
Nodes (10): canonicalJson(), CodexCommandHook, codexSessionPreToolUseHookHash(), JsonValue, createCodexProvider(), AppServerFixtureOptions, hookPathForSession(), options() (+2 more)

### Community 67 - "UserTerminalManager"
Cohesion: 0.13
Nodes (11): agentPairError(), createApiRoutes(), isBlocked(), isProcessing(), isSplitMother(), isWebOnlyPath(), jsonError(), PaneReader (+3 more)

### Community 68 - "schema.test.ts"
Cohesion: 0.06
Nodes (55): PrdAnnotator(), PrdAnnotatorProps, BREADCRUMB, NO_ANNOTATIONS, PrdReviewDialog(), PrdReviewDialogProps, QuitConfirmModal(), QuitConfirmModalProps (+47 more)

### Community 69 - "reviewFindings.ts"
Cohesion: 0.11
Nodes (29): dedupeFindings(), DimensionFinding, findingAnchor(), FRENCH_STOP_WORD_PATTERN, FRENCH_STOP_WORDS, hasSimilarSummary(), isSameDefect(), isSelfRefuting() (+21 more)

### Community 70 - "CodexRuntimeStatus"
Cohesion: 0.10
Nodes (28): App(), HOME_VIEW_OPTIONS, HomeView, Toaster(), TOOL_KINDS, ToolDialogs(), ToolKind, ToolMeta (+20 more)

### Community 71 - "PostCSS Config"
Cohesion: 0.29
Nodes (6): name, overrides, zod, private, type, version

### Community 72 - "App.tsx"
Cohesion: 0.13
Nodes (22): PR_STATE_LABELS, ColumnActionsMenu(), ColumnActionsMenuProps, ColumnMenuItem, ActionContext, buildActions(), ConfirmSpec, errorMessage() (+14 more)

### Community 73 - "TerminalView.tsx"
Cohesion: 0.07
Nodes (53): codexRuntimeStatusSchema, isCodexFastServiceTier(), pairedRuntimeCodexEffort(), UNKNOWN_CODEX_RUNTIME_STATUS, FeasibilityEngine, ORCHESTRATOR_LABELS, pairedCodexEffort(), Capabilities (+45 more)

### Community 74 - "button.tsx"
Cohesion: 0.10
Nodes (19): AUTOMATION_RUN_STATUSES, CODEX_MODEL_EFFORTS, CODEX_SEED_PROFILE, COMMENT_AUTHORS, CommentAuthor, DEFAULT_PROFILES, FEASIBILITY_ENGINE_LABELS, FEASIBILITY_ENGINES (+11 more)

### Community 75 - ".handleRequest"
Cohesion: 0.09
Nodes (14): RunningServer, analyzeResultSchema, compactTicketSchema, createResultSchema, errorResultSchema, ISOLATED_ENV_KEYS, projectResultSchema, savedEnv (+6 more)

### Community 76 - "usePrdSearch.ts"
Cohesion: 0.11
Nodes (24): costByFamily(), costOf(), costOfModel(), costOfSessions(), CostSummary, FamilyPricing, MODEL_PRICING, ModelFamily (+16 more)

### Community 78 - "csv.ts"
Cohesion: 0.12
Nodes (13): RecordingSystemAdapter, boundedCommandDetail(), BoundedCommandResult, safeJsonParse(), withJsonRequestFile(), PublishReviewOptions, PublishReviewResult, ReviewPublicationState (+5 more)

### Community 79 - "WorktreeSession"
Cohesion: 0.33
Nodes (3): listeners, mcp, ReplyArgsSchema

### Community 80 - "recordedAction.ts"
Cohesion: 0.23
Nodes (17): alternation(), COMMAND_WRAPPERS, commandSegments(), commandWords(), executableName(), launchedPackageScript(), launchesTypecheck(), OPTIONS_WITH_VALUE (+9 more)

### Community 81 - "vcsCommands.ts"
Cohesion: 0.18
Nodes (8): AZURE_COMMANDS, COMMANDS_BY_PROVIDER, GITHUB_COMMANDS, PrDiffContext, VcsCleanCommands, VcsCommandTable, AZ_SETTLED_THREAD_STATUSES, VCS_PROVIDER_LABELS

### Community 82 - "Community 82"
Cohesion: 0.21
Nodes (6): AgentProvider, ensureClaudeBinary(), dispatchClaudeMessage(), pumpStream(), safeDispatchClaudeMessage(), runOneShotSession()

### Community 86 - "TicketCost.tsx"
Cohesion: 0.38
Nodes (5): normalizeCreateInput(), requestKeyConflictMessage(), ticketDependencyError(), isAllowedAgentPair(), deriveTitleFromDescription()

### Community 87 - "createMcpServer"
Cohesion: 0.40
Nodes (5): CodexBinaryVersionError, require, resolveCodexBinary(), resolveCodexBinaryOverride(), TARGETS

### Community 89 - "usePrdSearch.ts"
Cohesion: 0.11
Nodes (24): CompactTicket, ListTicketsInput, Column, COLUMN_LABELS, COLUMN_ORDER, COLUMNS, ACTIVE_COLUMNS, Board() (+16 more)

### Community 92 - "useCapabilities.ts"
Cohesion: 0.23
Nodes (8): Block, blockText(), compactChunks(), firstCharCode(), TranscriptBuffer, trimBlockStart(), AgentStreamBlock, TranscriptUpdate

### Community 93 - "ColumnActionsMenu.tsx"
Cohesion: 0.25
Nodes (7): Azure DevOps support — state file, Decisions (validated by the owner, 2026-09-21), Goal, Known blockers for lots 3 and 4, Open questions, Progress, Verified on this machine (az 2.90.0, azure-devops 1.0.8)

### Community 94 - ".addComment"
Cohesion: 0.13
Nodes (14): log, log, ReformulateManager, DRY_RUN_VERDICT, log, TriageSession, log, ClientHub (+6 more)

### Community 95 - "TicketConfigSummary.tsx"
Cohesion: 0.50
Nodes (3): appBundle, EMBEDDED_BINARIES, resourcesApp

### Community 97 - "RunningServer"
Cohesion: 0.08
Nodes (31): ANSI, appendToLogFile(), COLOR_ENABLED, disableFileLogging(), initLogFile(), isLevel(), Level, LEVEL_ORDER (+23 more)

### Community 98 - "triageManager.ts"
Cohesion: 0.20
Nodes (9): AtelierDesktopRpcSchema, DesktopRequests, McpSettingsMetadata, WebviewRequests, McpSettingsController, McpSettings(), createMcpSettingsClient(), getMcpSettingsClient() (+1 more)

### Community 99 - "reviewPublishingGuard.ts"
Cohesion: 0.07
Nodes (35): API_GUARDS, API_READ_METHOD_SET, ApiDenyPatterns, ApiGuard, AZ_INVOKE_COMMAND, AZ_INVOKE_METHOD_LONG_FLAGS, AZ_INVOKE_WRITE_INPUT_LONG_FLAGS, AZ_PR_WRITE_PATTERN (+27 more)

### Community 100 - ".startVerification"
Cohesion: 0.12
Nodes (13): CodexAppServerInitializationError, CodexAppServerProtocolError, CodexAppServerRpcError, connectCodexAppServer(), incomingSchema, initializeResponseSchema, log, PendingRequest (+5 more)

### Community 101 - "codexProvider.test.ts"
Cohesion: 0.13
Nodes (10): directories, initializeParamsSchema, log, requestSchema, rpcError(), rpcResult(), rpcResponseSchema, toolCallParamsSchema (+2 more)

### Community 103 - "TerminalSession"
Cohesion: 0.08
Nodes (15): FakePaneStream, RealPaneStream, PaneStream, dataMessage(), log, normalizeSeed(), safeParse(), send() (+7 more)

### Community 105 - ".finishTicket"
Cohesion: 0.13
Nodes (6): TriageManager, WorktreeAddressWatcher, spawnCodexAppServer(), getErrorMessage(), getErrorStack(), TriageResult

### Community 107 - "azureRemote.ts"
Cohesion: 0.35
Nodes (11): azureOrgUrl(), AzureRepoRef, fromAzureSegments(), fromCollectionSegments(), fromLegacySegments(), fromSshSegments(), parseAzureRepoRef(), parseRemoteLocation() (+3 more)

### Community 110 - "Profile"
Cohesion: 0.08
Nodes (13): logRejection(), setup(), mapExecutionRunRow(), mapProfileRow(), nullableBooleanValue(), SqlUpdateBuilder, Store, runRecordedAction() (+5 more)

### Community 112 - "mcpSettings.ts"
Cohesion: 0.22
Nodes (4): McpTokenSource, createMcpSettingsController(), McpSettingsControllerDependencies, temporaryDirectories

### Community 113 - "createMcpServer"
Cohesion: 0.27
Nodes (7): createMcpServer(), invalidInput(), OutputValidator, toolError(), toolResult(), FeasibilityStarter, isProcessing()

### Community 114 - "TicketConfigSummary.tsx"
Cohesion: 0.28
Nodes (7): agentEffortSchema, agentModelSchema, codexEffortSchema, codexModelSchema, inheritedLabel(), labelWithDefault(), TicketConfigSummary()

### Community 115 - "bootstrap.ts"
Cohesion: 0.36
Nodes (5): applyDesktopEnv(), DesktopRoots, ensureMcpToken(), regenerateMcpToken(), temporaryDirectories

### Community 116 - "settings.tsx"
Cohesion: 0.05
Nodes (47): COMMIT_LANGUAGE_LABELS, COMMIT_LANGUAGES, DragHandleAttributes, DragHandleListeners, ProfileRowHeader(), ProfileRowProps, ProfilesSettings(), NOTE: the saved flag lives here because a saved row remounts (its key carries up (+39 more)

### Community 117 - "TicketMeta.tsx"
Cohesion: 0.36
Nodes (7): columnSchema, STATUS_CONFIRMS, StatusConfirm, statusTitle(), TicketMeta(), resolveProjectLabel(), finishedKindLabel()

### Community 119 - "McpSettingsControllerDependencies"
Cohesion: 0.09
Nodes (25): resolveBaseBranch(), groupFeasibilityTickets(), reviewPublicationEvent(), publishedReviewFindings(), codexImplementerKnobs(), assertCodexImplementerAvailable(), featureBranch(), log (+17 more)

### Community 122 - "Comment"
Cohesion: 0.40
Nodes (4): mapCommentRow(), Comment, ActivityTabProps, CommentRowProps

### Community 123 - "TicketPatch"
Cohesion: 0.40
Nodes (5): TicketPatch, ReformulateStatus, SessionUsage, TriageStatus, TriageVerdict

### Community 124 - "ReviewPrPanel.tsx"
Cohesion: 0.40
Nodes (4): commitLanguageSchema, reviewDepthSchema, ReviewPrPanel(), ReviewPrPanelProps

### Community 127 - "prUrl.ts"
Cohesion: 0.36
Nodes (7): effectivePort(), isAllowedHost(), isAllowedOrigin(), isAuthorized(), isLoopbackHost(), jsonResponse(), parseHost()

## Knowledge Gaps
- **719 isolated node(s):** `log`, `ActiveDelegation`, `ReviewResult`, `{ $schema: _reviewSchemaDraft, ...REVIEW_OUTPUT_SCHEMA }`, `ActiveReview` (+714 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Ticket` connect `TicketCard.tsx` to `Contract Building & Slots`, `Desktop Bootstrap & Menus`, `Ticket Action Panels`, `Shared Zod Schemas`, `PR Selection & Slots Bar`, `Core Domain Concepts`, `Coordinator & Protocol`, `Live Terminal Views`, `Store Types & Agent Knobs`, `DB Row Schemas & Mappers`, `Dev Dependencies`, `Client Hub & Watchdog`, `User Terminal & Fake IO`, `NPM Scripts`, `Runtime Dependencies`, `Ticket Config & Constants`, `Chart Primitives`, `Modal Dialogs`, `File Uploads`, `triageManager.ts`, `splitManager.ts`, `split.ts`, `schema.test.ts`, `reviewFindings.ts`, `CodexRuntimeStatus`, `App.tsx`, `TerminalView.tsx`, `usePrdSearch.ts`, `TicketCost.tsx`, `usePrdSearch.ts`, `.addComment`, `TicketConfigSummary.tsx`, `TicketMeta.tsx`, `McpSettingsControllerDependencies`, `Comment`, `reformulate.ts`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Why does `Store` connect `Profile` to `Desktop Bootstrap & Menus`, `Feasibility Batch Management`, `Shared Zod Schemas`, `PR Selection & Slots Bar`, `Core Domain Concepts`, `Coordinator & Protocol`, `Store Types & Agent Knobs`, `Dev Dependencies`, `Cost & Pricing`, `NPM Scripts`, `Agent Profile Config`, `Chart Primitives`, `Modal Dialogs`, `TicketCard.tsx`, `split.ts`, `UserTerminalManager`, `.addComment`, `TerminalSession`, `.finishTicket`, `McpSettingsControllerDependencies`, `Comment`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Why does `FakeSystemAdapter` connect `Settings & Profiles UI` to `Composer Run Script`, `Slot Config & Worktree Watch`, `Chart Primitives`, `csv.ts`, `Modal Dialogs`, `Agents View & Ticket Cards`, `Cost & Pricing`, `.addComment`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **What connects `log`, `ActiveDelegation`, `ReviewResult` to the rest of the system?**
  _730 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Contract Building & Slots` be split into smaller, more focused modules?**
  _Cohesion score 0.038191395961369626 - nodes in this community are weakly interconnected._
- **Should `Terminals UI & Notifications` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._
- **Should `Desktop Bootstrap & Menus` be split into smaller, more focused modules?**
  _Cohesion score 0.13513513513513514 - nodes in this community are weakly interconnected._