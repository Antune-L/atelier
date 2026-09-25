# Graph Report - kanban-agents  (2026-09-25)

## Corpus Check
- 274 files · ~749,033 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3044 nodes · 8233 edges · 128 communities (118 shown, 10 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 54 edges (avg confidence: 0.67)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `65c923d6`
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
- OpenPr
- TerminalView.tsx
- schema.test.ts
- reviewFindings.ts
- CodexRuntimeStatus
- PostCSS Config
- TerminalView.tsx
- button.tsx
- .handleRequest
- usePrdSearch.ts
- Community 77
- csv.ts
- WorktreeSession
- recordedAction.ts
- vcsCommands.ts
- SplitTree.tsx
- Community 83
- TicketCost.tsx
- codexBinary.ts
- usePrdSearch.ts
- nvmNode.ts
- FakePaneStream
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
- .start
- TerminalSession
- .runWorktreeSetupScript
- AgentsView.tsx
- usePrdSearch.ts
- azureRemote.ts
- StageProgressBar.tsx
- Profile
- RealPaneStream
- mcpSettings.ts
- createMcpServer
- WorktreeSession
- bootstrap.ts
- settings.tsx
- TicketMeta.tsx
- TicketConfigSummary.tsx
- McpSettingsControllerDependencies
- useTickTimer.ts
- prUrl.ts
- Comment
- StatRecord
- RunningServer
- reformulate.ts
- profileMatching.test.ts
- prUrl.ts

## God Nodes (most connected - your core abstractions)
1. `Store` - 122 edges
2. `Ticket` - 103 edges
3. `cn()` - 83 edges
4. `SystemAdapter` - 73 edges
5. `FakeSystemAdapter` - 67 edges
6. `RealSystemAdapter` - 61 edges
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

## Communities (128 total, 10 thin omitted)

### Community 0 - "Contract Building & Slots"
Cohesion: 0.04
Nodes (69): TicketPatch, ActionExecutionOptions, actionExecutionOptionsSchema, agentMessageSchema, AnalyzeTicketsInput, appSettingsSchema, automationRunSchema, automationSchema (+61 more)

### Community 1 - "Terminals UI & Notifications"
Cohesion: 0.10
Nodes (20): analyzeTicketsInputSchema, analyzeTicketsOutputSchema, columnSchema, compactTicketSchema, createTodoTicketOutputSchema, editableTicketSchema, listProjectsInputSchema, listProjectsOutputSchema (+12 more)

### Community 2 - "Desktop Bootstrap & Menus"
Cohesion: 0.14
Nodes (8): groupFeasibilityTickets(), slotPath(), computeWorktreeAddresses(), getProject(), isProjectKey(), projectVcsProvider(), mapSlotRow(), Slot

### Community 3 - "Feasibility Batch Management"
Cohesion: 0.06
Nodes (38): log, ToolHandler, ToolResult, addUsageByModel(), toUsageByModel(), AgentSettableStage, agentSettableStageSchema, askUserArgsSchema (+30 more)

### Community 4 - "Ticket Action Panels"
Cohesion: 0.23
Nodes (13): AgentCard(), STATE_STRIPE_COLORS, TicketCard(), TicketCardProps, TriageDot(), truncateParentTitle(), formatRelativeDuration(), isStageAnimated() (+5 more)

### Community 5 - "Fake System Adapter"
Cohesion: 0.07
Nodes (31): azureChangeEntrySchema, azureCommentSchema, AzureDevopsVcsClient, azureIdentitySchema, azureIterationChangesSchema, azureIterationListSchema, azurePath(), AzurePrContext (+23 more)

### Community 6 - "Shared Zod Schemas"
Cohesion: 0.16
Nodes (7): resolveBaseBranch(), assertExecutionAvailable(), assertCodexImplementerAvailable(), SlotManager, resolveTemplatePaths(), failSplitMother(), getErrorMessage()

### Community 7 - "Settings & Profiles UI"
Cohesion: 0.09
Nodes (3): delay(), FakeSystemAdapter, VcsProvider

### Community 8 - "PR Selection & Slots Bar"
Cohesion: 0.06
Nodes (46): CODEX_LAUNCH_STATUS_MESSAGES, CodexCapabilityReader, ExecutionDefaults, ExecutionOverrides, FEASIBILITY_ENGINE_EXECUTION, ResolvedExecution, resolveExecution(), resolveFeasibilityExecution() (+38 more)

### Community 9 - "Real System Adapter"
Cohesion: 0.07
Nodes (43): AppSettings, CreateProjectInput, UpdateProjectInput, vcsProviderSchema, ConnectionHint, DragHandleAttributes, DragHandleListeners, groupProjects() (+35 more)

### Community 10 - "Slot Config & Worktree Watch"
Cohesion: 0.16
Nodes (8): AckSystem, RecordedSession, RecordingSystem, RecordedSession, RecordingSystem, RelaunchSystem, AgentSessionHandle, AgentSessionOptions

### Community 11 - "Core Domain Concepts"
Cohesion: 0.04
Nodes (46): agentMessageRowSchema, AutomationRow, automationRowSchema, AutomationRunRow, automationRunRowSchema, buildScripts(), CommentRow, commentRowSchema (+38 more)

### Community 13 - "Database Store Operations"
Cohesion: 0.09
Nodes (41): RFC-4180, CleanPrPanel(), ImportTicketsPanel(), PrdAnnotator(), PrdAnnotatorProps, BREADCRUMB, NO_ANNOTATIONS, PrdReviewDialog() (+33 more)

### Community 14 - "Coordinator & Protocol"
Cohesion: 0.07
Nodes (32): ProjectInUseError, cleanDescription(), createSplitChildren(), log, performSplit(), prSummaryLines(), reviewDescription(), splitChildDefaults() (+24 more)

### Community 15 - "API Routes & Reformulate"
Cohesion: 0.18
Nodes (12): threadConfig(), accountResponseSchema, hasExplicitCodexApiKey(), isProtocolIncompatibility(), listRuntimeModels(), modelListResponseSchema, modelSchema, probeCodexRuntime() (+4 more)

### Community 16 - "Stats Aggregation"
Cohesion: 0.08
Nodes (7): startParentSession(), mergeAgentUsageByModel(), previewToolInput(), renderSessionEvent(), SessionHub, SessionHubHandlers, SessionStartCallbacks

### Community 17 - "Triage & Server Hub"
Cohesion: 0.08
Nodes (25): devDependencies, autoprefixer, class-variance-authority, clsx, concurrently, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities (+17 more)

### Community 18 - "Live Terminal Views"
Cohesion: 0.07
Nodes (35): isReviewFixSession(), AZURE_BASH_ALLOWLIST, AZURE_CLEAN_BASH_ALLOWLIST, BASH_ALLOWLIST, bashAllowlist(), buildFeasibilitySessionConfig(), buildImplementSessionConfig(), buildTriageSessionConfig() (+27 more)

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
Cohesion: 0.13
Nodes (23): bashCommandSchema, buildSettings(), claudeProvider, createSdkAgentSession(), denyBashHook(), denyNoVerifyHook, denyReviewPublishingHook, denyTypecheckHook() (+15 more)

### Community 25 - "Client Hub & Watchdog"
Cohesion: 0.31
Nodes (13): abortReason(), computeCodeFingerprint(), FingerprintEntry, FingerprintPhase, hashFingerprintPaths(), isMissingFileError(), listFingerprintPaths(), log (+5 more)

### Community 26 - "Cost & Pricing"
Cohesion: 0.09
Nodes (20): setup(), SplitManager, PROJECT_ROOT, NOTE: PRD generation holds the request open up to ~120s (REFORMULATE_TIMEOUT_MS), resolveDataFile(), resolveServerPort(), serveStaticAsset(), SocketData (+12 more)

### Community 27 - "Workflow View & Lifecycle"
Cohesion: 0.06
Nodes (28): Architecture, Commands, Conventions (enforced — beyond the global ones in ~/.claude/CLAUDE.md), graphify, The dry-run safety model — read before running anything, What this is, Agent runtime (Agent SDK), Architecture (+20 more)

### Community 28 - "Stats Charts"
Cohesion: 0.07
Nodes (42): AgentMcpServerDefinition, agentMessageDeltaSchema, agentToml(), apiWriteDenyScript(), buildMcpServers(), ConfigObject, configReadResponseSchema, ConfigValue (+34 more)

### Community 29 - "Session Hub & Agent Session"
Cohesion: 0.11
Nodes (9): CodexAppServerConnection, CodexAppServerOptions, CodexProviderDependencies, createCodexAgentSession(), inheritedMcpServerNames(), PreparedHook, prepareSkills(), AppServerFixture (+1 more)

### Community 30 - "Agents View & Ticket Cards"
Cohesion: 0.15
Nodes (22): ExecutionFinishStatus, LiveSession, log, PendingSessionMessage, renderChannelEvent(), renderImplementationDone(), SessionExecutionContext, SessionExecutionFinish (+14 more)

### Community 31 - "PRD Review & Markdown"
Cohesion: 0.05
Nodes (32): ActiveDelegation, ActiveReview, ActiveReviewPass, childTranscriptPrefix(), ClosableExecution, DelegationManager, FEATURE_REVIEWER_OPTIONS, log (+24 more)

### Community 32 - "User Terminal & Fake IO"
Cohesion: 0.11
Nodes (25): commitLanguageSchema, ProjectInfo, reviewDepthSchema, AgentsViewProps, AskPanelProps, CleanPrPanelProps, ImportTicketsPanelProps, NewTicketSheetProps (+17 more)

### Community 33 - "Logging"
Cohesion: 0.10
Nodes (21): scripts, build:desktop, build:web, dev, dev:desktop, dev:proxy, dev:server, dev:web (+13 more)

### Community 34 - "Board Columns"
Cohesion: 0.06
Nodes (53): PrSelectRow(), ProviderRow(), AUTHOR_BADGES, AuthorBadge(), CommentRow(), OverviewTab(), OverviewTabProps, SUMMARY_COLUMNS (+45 more)

### Community 35 - "NPM Scripts"
Cohesion: 0.12
Nodes (5): AgentCoordinator, logRejection(), SessionToolCall, spawnCodexAppServer(), getErrorStack()

### Community 36 - "Runtime Dependencies"
Cohesion: 0.21
Nodes (19): applySizes(), collectTerminalIds(), findLeaf(), firstLeafId(), LeafNode, leafNodeSchema, makeLeaf(), nextNodeId() (+11 more)

### Community 37 - "Claude SDK Provider"
Cohesion: 0.09
Nodes (23): dependencies, @anthropic-ai/claude-agent-sdk, dompurify, elysia, @fontsource/ibm-plex-mono, @fontsource/ibm-plex-sans, marked, @modelcontextprotocol/sdk (+15 more)

### Community 38 - "Agent Profile Config"
Cohesion: 0.27
Nodes (3): AutomationManager, mapAutomationRow(), Automation

### Community 39 - "Agent Coordinator Handlers"
Cohesion: 0.10
Nodes (29): artifactPath, assertPackageVersionInSync(), assertSdkVersionsInSync(), BUILT_DMG, ELECTROBUN_BIN, fail(), installedPackageVersion(), RELEASE_FOLDER (+21 more)

### Community 40 - "API Client Inputs"
Cohesion: 0.48
Nodes (3): mapProfileRow(), nullableBooleanValue(), Profile

### Community 41 - "Ticket Config & Constants"
Cohesion: 0.05
Nodes (42): WsClientEvent, wsClientEventSchema, ColumnActionsMenu(), ColumnActionsMenuProps, ColumnMenuItem, ATTENTION_STATUSES, sessionOf(), SlotPips() (+34 more)

### Community 42 - "Ticket Detail & Triage UI"
Cohesion: 0.08
Nodes (23): escapeHtml(), renderCollapsedDetails(), renderOutsideDiffComment(), renderOutsideDiffSection(), ReviewPublicationComment, extractPrUrl(), ghPrHeadSchema, ghPrSchema (+15 more)

### Community 43 - "Demo Pipeline Concepts"
Cohesion: 0.12
Nodes (14): CLAUDE_JSON_PATH, COMPOSER_BINARIES, detectInstallCommand(), INSTALL_COMMANDS, log, NON_INTERACTIVE_ENV, NOTION_IMPORT_ALLOWED_TOOLS, NOTION_READ_TOOLS (+6 more)

### Community 44 - "Chart Primitives"
Cohesion: 0.22
Nodes (4): McpTokenSource, createMcpSettingsController(), McpSettingsControllerDependencies, temporaryDirectories

### Community 45 - "Session Hub Transcript"
Cohesion: 0.14
Nodes (10): agentPairError(), createApiRoutes(), isBlocked(), isProcessing(), isSplitMother(), isWebOnlyPath(), jsonError(), PaneReader (+2 more)

### Community 46 - "Community 46"
Cohesion: 0.27
Nodes (15): Agent Implementation Config, Argus Code Review, Automated Tests (typecheck/lint/test), Claude Code Autonomous Agent, Ticket Contract Injection, Feasibility Analysis, Kanban Board (Atelier), Kanban Agents Demo (demo.gif) (+7 more)

### Community 47 - "Modal Dialogs"
Cohesion: 0.13
Nodes (17): AUTOMATION_TRIGGER_LABELS, AUTOMATION_TRIGGERS, AutomationRunStatus, AutomationTrigger, CreateAutomationInput, AutomationCard(), AutomationCardProps, AutomationFormProps (+9 more)

### Community 48 - "Community 48"
Cohesion: 0.33
Nodes (9): useTheme(), UseThemeResult, applyTheme(), getStoredTheme(), isTheme(), Theme, ThemeOption, THEMES (+1 more)

### Community 49 - "Slot State"
Cohesion: 0.07
Nodes (42): main(), scalar(), cleanTicket(), conflictTicket(), REVIEW_OPTS, reviewTicket(), TICKET_OPTS, setup() (+34 more)

### Community 50 - "Stats Hooks & Cards"
Cohesion: 0.16
Nodes (12): ChartConfig, ChartContainer, ChartContainerProps, ChartContext, ChartContextValue, ChartLegendContent(), ChartLegendContentProps, ChartTooltipContent() (+4 more)

### Community 51 - "Community 51"
Cohesion: 0.18
Nodes (9): CapabilityCache, CodexRuntimeModel, codexRuntimeModelSchema, CodexRuntimeStatus, codexRuntimeStatusSchema, pairedRuntimeCodexEffort(), UNKNOWN_CODEX_RUNTIME_STATUS, pairedCodexEffort() (+1 more)

### Community 52 - "repairPath.ts"
Cohesion: 0.18
Nodes (12): terminalServerMessageSchema, badgeLabelFor(), LiveTerminal(), LiveTerminalOptions, LiveTerminalProps, TerminalCell(), TerminalCellProps, TERMINAL_THEME (+4 more)

### Community 53 - "User Terminal Manager"
Cohesion: 0.33
Nodes (5): CONTEXT — domain glossary, Execution, Proposed (not yet built), Seams, Work items

### Community 54 - "Community 54"
Cohesion: 0.11
Nodes (23): ACTIVE_BAR, AREA_CURSOR, AXIS_PROPS, BAR_CURSOR, CHART_PALETTE, colorAt(), CostSummary(), DurationBars() (+15 more)

### Community 55 - "App.tsx"
Cohesion: 0.21
Nodes (3): FeasibilityBatchManager, toTriageResult(), FeasibilityResult

### Community 56 - "CSV Parsing"
Cohesion: 0.16
Nodes (31): AgentEffort, AgentModel, CodexEffort, CodexModel, Implementer, Orchestrator, Capabilities, AgentProfileConfig() (+23 more)

### Community 57 - "Community 57"
Cohesion: 0.17
Nodes (17): ensureConfig(), boot(), externalUrlFromNewWindowEvent(), forwardAtelierShortcut(), installApplicationMenu(), installMenuShortcutBridge(), menuShortcutActionSchema, navigationEventSchema (+9 more)

### Community 59 - "triageManager.ts"
Cohesion: 0.15
Nodes (22): buildSplitChannelPrompt(), buildTicketLines(), isEnglish(), buildContractConstraintsLines(), buildResponseFormatLines(), buildStrictRulesLines(), buildTicketLines(), buildTriageChannelPrompt() (+14 more)

### Community 60 - "Package Manifest"
Cohesion: 0.25
Nodes (3): listPublicProjects(), PublicMcpManager, TicketOperations

### Community 61 - "splitManager.ts"
Cohesion: 0.19
Nodes (9): TICKET_OPTION, TicketOptionsToggleGroup(), TicketOptionsToggleGroupProps, TicketOptionValues, ToggleGroup, ToggleGroupContext, ToggleGroupItem, Toggle (+1 more)

### Community 62 - "TicketCard.tsx"
Cohesion: 0.20
Nodes (5): mapTicketRow(), TicketLifecycle, ACTIVE_STAGES, Stage, Ticket

### Community 63 - "Community 63"
Cohesion: 0.09
Nodes (9): DoneGateResult, ReviewHeadResult, FAKE_OPEN_PRS, FakeVcsClient, githubPrHeadRef(), VcsClient, OpenPr, VcsConnectionResult (+1 more)

### Community 64 - "Composer Run Script"
Cohesion: 0.16
Nodes (13): FailedReformulation, ActionSystem, dryRunLog, fakeEncoder, GitWorktreeAddOptions, ImportNotionOptions, PaneSize, PrepareReviewWorktreeOptions (+5 more)

### Community 65 - "split.ts"
Cohesion: 0.05
Nodes (42): projectConfigSchema, mapAgentMessageRow(), mapReviewApprovalRow(), mapReviewPassRow(), mapTicketCreationRequestRow(), AttachExecutionSessionInput, AutomationPatch, EnqueueAgentMessageInput (+34 more)

### Community 66 - "OpenPr"
Cohesion: 0.18
Nodes (9): AgentProvider, AgentSessionEvent, createCodexProvider(), AppServerFixtureOptions, hookPathForSession(), options(), RecordedRequest, waitFor() (+1 more)

### Community 67 - "TerminalView.tsx"
Cohesion: 0.20
Nodes (11): applyTranscriptUpdate(), TranscriptState, transcriptText(), transcriptUpdateSchema, FullscreenToggle(), FullscreenToggleProps, TerminalData, TerminalView() (+3 more)

### Community 68 - "schema.test.ts"
Cohesion: 0.13
Nodes (24): isNotionUrl(), NOTION_HOSTS, AskPanel(), NewTicketSheet(), ActivityTab(), isUnanswered(), NO_COMMENT_COLUMNS, DescriptionEdit (+16 more)

### Community 69 - "reviewFindings.ts"
Cohesion: 0.10
Nodes (30): dedupeFindings(), DimensionFinding, findingAnchor(), FRENCH_STOP_WORD_PATTERN, FRENCH_STOP_WORDS, hasSimilarSummary(), isSameDefect(), isSelfRefuting() (+22 more)

### Community 70 - "CodexRuntimeStatus"
Cohesion: 0.06
Nodes (45): App(), HOME_VIEW_OPTIONS, HomeView, QuitConfirmModal(), QuitConfirmModalProps, NAV_ENTRIES, NavEntry, Sidebar() (+37 more)

### Community 71 - "PostCSS Config"
Cohesion: 0.29
Nodes (6): name, overrides, zod, private, type, version

### Community 73 - "TerminalView.tsx"
Cohesion: 0.17
Nodes (21): CodexAgentFields(), CodexConnectionStatus(), STATUS_LABELS, ProvidersSettings(), clearRetry(), loadCapabilities(), LoadOptions, publish() (+13 more)

### Community 74 - "button.tsx"
Cohesion: 0.07
Nodes (46): AGENT_EFFORT_FULL_LABELS, AGENT_MODEL_FULL_LABELS, AUTOMATION_RUN_STATUSES, CODEX_EFFORT_FULL_LABELS, CODEX_MODEL_LABELS, CODEX_SEED_PROFILE, COMMENT_AUTHORS, CommentAuthor (+38 more)

### Community 75 - ".handleRequest"
Cohesion: 0.11
Nodes (13): analyzeResultSchema, compactTicketSchema, createResultSchema, errorResultSchema, ISOLATED_ENV_KEYS, projectResultSchema, savedEnv, startResultSchema (+5 more)

### Community 76 - "usePrdSearch.ts"
Cohesion: 0.13
Nodes (22): isCodexFastServiceTier(), costByFamily(), costOf(), costOfModel(), costOfSessions(), CostSummary, FamilyPricing, MODEL_PRICING (+14 more)

### Community 78 - "csv.ts"
Cohesion: 0.15
Nodes (13): boundedCommandDetail(), BoundedCommandResult, runBoundedCommand(), safeJsonParse(), withJsonRequestFile(), ReviewPublicationState, connectionFailure(), connectionResult() (+5 more)

### Community 79 - "WorktreeSession"
Cohesion: 0.33
Nodes (3): listeners, mcp, ReplyArgsSchema

### Community 80 - "recordedAction.ts"
Cohesion: 0.23
Nodes (17): alternation(), COMMAND_WRAPPERS, commandSegments(), commandWords(), executableName(), launchedPackageScript(), launchesTypecheck(), OPTIONS_WITH_VALUE (+9 more)

### Community 81 - "vcsCommands.ts"
Cohesion: 0.18
Nodes (8): AZURE_COMMANDS, COMMANDS_BY_PROVIDER, GITHUB_COMMANDS, PrDiffContext, VcsCleanCommands, VcsCommandTable, AZ_SETTLED_THREAD_STATUSES, VCS_PROVIDER_LABELS

### Community 82 - "SplitTree.tsx"
Cohesion: 0.27
Nodes (11): groupOrientation(), layoutToSizes(), panelId(), panelPercent(), SplitTree(), SplitTreeProps, SplitOrientation, isShortcutDetail() (+3 more)

### Community 86 - "TicketCost.tsx"
Cohesion: 0.38
Nodes (5): normalizeCreateInput(), requestKeyConflictMessage(), ticketDependencyError(), isAllowedAgentPair(), deriveTitleFromDescription()

### Community 87 - "codexBinary.ts"
Cohesion: 0.21
Nodes (9): CodexBinaryVersionError, require, resolveCodexBinary(), resolveCodexBinaryOverride(), TARGETS, canonicalJson(), CodexCommandHook, codexSessionPreToolUseHookHash() (+1 more)

### Community 89 - "usePrdSearch.ts"
Cohesion: 0.11
Nodes (24): CompactTicket, ListTicketsInput, Column, COLUMN_LABELS, COLUMN_ORDER, COLUMNS, ACTIVE_COLUMNS, Board() (+16 more)

### Community 90 - "nvmNode.ts"
Cohesion: 0.35
Nodes (9): gitMetadataWritableRoots(), agentBaseEnv(), bestInstalledMatch(), compareParts(), envWithProjectNode(), nvmNodeBinDir(), readNvmrc(), prepareProjectShell() (+1 more)

### Community 91 - "FakePaneStream"
Cohesion: 0.20
Nodes (3): FakePaneStream, fakeShellPrompt(), hexToBytes()

### Community 92 - "useCapabilities.ts"
Cohesion: 0.26
Nodes (8): Block, blockText(), compactChunks(), firstCharCode(), TranscriptBuffer, trimBlockStart(), AgentStreamBlock, TranscriptUpdate

### Community 93 - "ColumnActionsMenu.tsx"
Cohesion: 0.25
Nodes (7): Azure DevOps support — state file, Decisions (validated by the owner, 2026-09-21), Goal, Known blockers for lots 3 and 4, Open questions, Progress, Verified on this machine (az 2.90.0, azure-devops 1.0.8)

### Community 94 - ".addComment"
Cohesion: 0.12
Nodes (11): log, startFeasibilityTicket(), ReformulateManager, log, Watchdog, ClientHub, ClientSocket, ClientSocketData (+3 more)

### Community 95 - "TicketConfigSummary.tsx"
Cohesion: 0.50
Nodes (3): appBundle, EMBEDDED_BINARIES, resourcesApp

### Community 97 - "RunningServer"
Cohesion: 0.13
Nodes (10): appendToLogFile(), disableFileLogging(), initLogFile(), Logger, openLogStream(), paint(), rotateLogFile(), ScopedLogger (+2 more)

### Community 98 - "triageManager.ts"
Cohesion: 0.20
Nodes (9): AtelierDesktopRpcSchema, DesktopRequests, McpSettingsMetadata, WebviewRequests, McpSettingsController, McpSettings(), createMcpSettingsClient(), getMcpSettingsClient() (+1 more)

### Community 99 - "reviewPublishingGuard.ts"
Cohesion: 0.07
Nodes (35): API_GUARDS, API_READ_METHOD_SET, ApiDenyPatterns, ApiGuard, AZ_INVOKE_COMMAND, AZ_INVOKE_METHOD_LONG_FLAGS, AZ_INVOKE_WRITE_INPUT_LONG_FLAGS, AZ_PR_WRITE_PATTERN (+27 more)

### Community 100 - ".startVerification"
Cohesion: 0.10
Nodes (14): CodexAppServerInitializationError, CodexAppServerNotification, CodexAppServerProtocolError, CodexAppServerRpcError, connectCodexAppServer(), incomingSchema, initializeResponseSchema, log (+6 more)

### Community 101 - "codexProvider.test.ts"
Cohesion: 0.13
Nodes (12): directories, initializeParamsSchema, log, requestSchema, rpcError(), rpcResult(), rpcResponseSchema, toolCallParamsSchema (+4 more)

### Community 103 - "TerminalSession"
Cohesion: 0.05
Nodes (16): runFirstBootSetup(), PaneStream, SystemAdapter, dataMessage(), log, normalizeSeed(), safeParse(), send() (+8 more)

### Community 104 - ".runWorktreeSetupScript"
Cohesion: 0.22
Nodes (4): realpathSafe(), resolveWorktreeScriptCommand(), setupOutputExcerpt(), shQuote()

### Community 105 - "AgentsView.tsx"
Cohesion: 0.27
Nodes (9): AgentCardProps, AgentsView(), hasLiveAgent(), normalize(), KIND_BADGES, TicketBadges(), TicketBadgesProps, resolveProjectColor() (+1 more)

### Community 106 - "usePrdSearch.ts"
Cohesion: 0.27
Nodes (9): NOTE: Radix's dismissable layer registers its Escape listener on `document` in t, useCaptureEscape(), collectMatchRanges(), isShortcutDetail(), ShortcutDetail, supportsHighlightApi(), usePrdSearch(), UsePrdSearchOptions (+1 more)

### Community 107 - "azureRemote.ts"
Cohesion: 0.35
Nodes (11): azureOrgUrl(), AzureRepoRef, fromAzureSegments(), fromCollectionSegments(), fromLegacySegments(), fromSshSegments(), parseAzureRepoRef(), parseRemoteLocation() (+3 more)

### Community 109 - "StageProgressBar.tsx"
Cohesion: 0.29
Nodes (9): FILLED_GLYPH_COLORS, StageProgressBar(), StageProgressBarProps, CardState, DEAD_STAGES, PROGRESS_STAGES, stageCardState(), stageLabel() (+1 more)

### Community 110 - "Profile"
Cohesion: 0.08
Nodes (10): mapAutomationRunRow(), mapExecutionRunRow(), SqlUpdateBuilder, Store, migrateConfigJsonIfPresent(), runRecordedAction(), AgentMessage, AutomationRun (+2 more)

### Community 112 - "mcpSettings.ts"
Cohesion: 0.32
Nodes (3): RecordingSystemAdapter, PublishReviewOptions, PublishReviewResult

### Community 113 - "createMcpServer"
Cohesion: 0.53
Nodes (5): createMcpServer(), invalidInput(), OutputValidator, toolError(), toolResult()

### Community 114 - "WorktreeSession"
Cohesion: 0.36
Nodes (4): mapWorktreeSessionRow(), enrichWorktreeSession(), WorktreeSession, BoardState

### Community 115 - "bootstrap.ts"
Cohesion: 0.36
Nodes (5): applyDesktopEnv(), DesktopRoots, ensureMcpToken(), regenerateMcpToken(), temporaryDirectories

### Community 116 - "settings.tsx"
Cohesion: 0.05
Nodes (48): ProfileConfig, DragHandleAttributes, DragHandleListeners, ProfilePipeline(), ProfileRowHeader(), ProfileRowHeaderProps, ProfileRowProps, ProfilesSettings() (+40 more)

### Community 117 - "TicketMeta.tsx"
Cohesion: 0.22
Nodes (10): ORCHESTRATOR_LABELS, columnSchema, MetaRow(), MetaRowProps, STATUS_CONFIRMS, StatusConfirm, statusTitle(), TicketMeta() (+2 more)

### Community 118 - "TicketConfigSummary.tsx"
Cohesion: 0.32
Nodes (6): agentEffortSchema, codexEffortSchema, codexModelSchema, inheritedLabel(), labelWithDefault(), TicketConfigSummary()

### Community 119 - "McpSettingsControllerDependencies"
Cohesion: 0.09
Nodes (17): reviewPublicationEvent(), publishedReviewFindings(), codexImplementerKnobs(), featureBranch(), log, ReclaimOutcome, reviewPublicationState(), SETUP_PHASES (+9 more)

### Community 120 - "useTickTimer.ts"
Cohesion: 0.39
Nodes (7): currentNow, getSnapshot(), startTicking(), stopTicking(), subscribe(), subscribers, useTickTimer()

### Community 121 - "prUrl.ts"
Cohesion: 0.40
Nodes (5): VCS_PROVIDERS, parsePrUrl(), PR_URL_SEGMENT, prNumberFromUrl(), PrUrlRef

### Community 122 - "Comment"
Cohesion: 0.40
Nodes (4): mapCommentRow(), Comment, ActivityTabProps, CommentRowProps

### Community 123 - "StatRecord"
Cohesion: 0.40
Nodes (5): StatRecord, StatCard(), StatCardProps, StatEmpty(), UseStatsResult

### Community 127 - "prUrl.ts"
Cohesion: 0.36
Nodes (7): effectivePort(), isAllowedHost(), isAllowedOrigin(), isAuthorized(), isLoopbackHost(), jsonResponse(), parseHost()

## Knowledge Gaps
- **723 isolated node(s):** `What this is`, `Commands`, `graphify`, `The dry-run safety model — read before running anything`, `Architecture` (+718 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Ticket` connect `TicketCard.tsx` to `Contract Building & Slots`, `Desktop Bootstrap & Menus`, `Ticket Action Panels`, `Shared Zod Schemas`, `PR Selection & Slots Bar`, `Core Domain Concepts`, `Coordinator & Protocol`, `Live Terminal Views`, `Store Types & Agent Knobs`, `DB Row Schemas & Mappers`, `Dev Dependencies`, `User Terminal & Fake IO`, `Board Columns`, `NPM Scripts`, `Ticket Config & Constants`, `Slot State`, `CSV Parsing`, `triageManager.ts`, `split.ts`, `TerminalView.tsx`, `schema.test.ts`, `reviewFindings.ts`, `CodexRuntimeStatus`, `button.tsx`, `usePrdSearch.ts`, `TicketCost.tsx`, `usePrdSearch.ts`, `.addComment`, `AgentsView.tsx`, `StageProgressBar.tsx`, `Profile`, `WorktreeSession`, `TicketMeta.tsx`, `TicketConfigSummary.tsx`, `McpSettingsControllerDependencies`, `Comment`, `reformulate.ts`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **Why does `Store` connect `Profile` to `Desktop Bootstrap & Menus`, `Feasibility Batch Management`, `Shared Zod Schemas`, `PR Selection & Slots Bar`, `Core Domain Concepts`, `Coordinator & Protocol`, `Store Types & Agent Knobs`, `Dev Dependencies`, `Cost & Pricing`, `NPM Scripts`, `Agent Profile Config`, `API Client Inputs`, `Session Hub Transcript`, `Slot State`, `TicketCard.tsx`, `split.ts`, `.addComment`, `TerminalSession`, `WorktreeSession`, `McpSettingsControllerDependencies`, `Comment`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **Why does `RealSystemAdapter` connect `Board & Sidebar Layout` to `codexProvider.test.ts`, `PR Selection & Slots Bar`, `App.tsx`, `.runWorktreeSetupScript`, `Demo Pipeline Concepts`, `RealPaneStream`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **What connects `What this is`, `Commands`, `graphify` to the rest of the system?**
  _734 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Contract Building & Slots` be split into smaller, more focused modules?**
  _Cohesion score 0.03517215845982969 - nodes in this community are weakly interconnected._
- **Should `Terminals UI & Notifications` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._
- **Should `Desktop Bootstrap & Menus` be split into smaller, more focused modules?**
  _Cohesion score 0.13535353535353536 - nodes in this community are weakly interconnected._