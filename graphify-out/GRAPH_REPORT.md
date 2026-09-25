# Graph Report - kanban-agents  (2026-09-25)

## Corpus Check
- 274 files · ~749,145 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3047 nodes · 8246 edges · 129 communities (115 shown, 14 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 52 edges (avg confidence: 0.67)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `32690d22`
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
- .startAgentSession

## God Nodes (most connected - your core abstractions)
1. `Store` - 122 edges
2. `Ticket` - 102 edges
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

## Communities (129 total, 14 thin omitted)

### Community 0 - "Contract Building & Slots"
Cohesion: 0.03
Nodes (81): buildReformulatePrompt(), TicketPatch, ActionExecutionOptions, actionExecutionOptionsSchema, agentMessageSchema, AnalyzeTicketsInput, appSettingsSchema, automationRunSchema (+73 more)

### Community 1 - "Terminals UI & Notifications"
Cohesion: 0.10
Nodes (20): analyzeTicketsInputSchema, analyzeTicketsOutputSchema, columnSchema, compactTicketSchema, createTodoTicketOutputSchema, editableTicketSchema, listProjectsInputSchema, listProjectsOutputSchema (+12 more)

### Community 2 - "Desktop Bootstrap & Menus"
Cohesion: 0.13
Nodes (11): resolveBaseBranch(), assertExecutionAvailable(), groupFeasibilityTickets(), assertCodexImplementerAvailable(), featureBranch(), slotPath(), slugify(), computeWorktreeAddresses() (+3 more)

### Community 3 - "Feasibility Batch Management"
Cohesion: 0.06
Nodes (39): log, ToolHandler, ToolResult, addUsageByModel(), toUsageByModel(), TRIAGE_VERDICTS, AgentSettableStage, agentSettableStageSchema (+31 more)

### Community 4 - "Ticket Action Panels"
Cohesion: 0.08
Nodes (39): AgentCard(), AgentCardProps, AgentsView(), hasLiveAgent(), normalize(), FILLED_GLYPH_COLORS, StageProgressBar(), StageProgressBarProps (+31 more)

### Community 5 - "Fake System Adapter"
Cohesion: 0.07
Nodes (31): azureChangeEntrySchema, azureCommentSchema, AzureDevopsVcsClient, azureIdentitySchema, azureIterationChangesSchema, azureIterationListSchema, azurePath(), AzurePrContext (+23 more)

### Community 7 - "Settings & Profiles UI"
Cohesion: 0.09
Nodes (3): delay(), FakeSystemAdapter, VcsProvider

### Community 8 - "PR Selection & Slots Bar"
Cohesion: 0.14
Nodes (15): CODEX_LAUNCH_STATUS_MESSAGES, CodexCapabilityReader, ExecutionDefaults, ExecutionOverrides, FEASIBILITY_ENGINE_EXECUTION, resolveExecution(), resolveFeasibilityExecution(), resolveTicketExecution() (+7 more)

### Community 9 - "Real System Adapter"
Cohesion: 0.07
Nodes (43): AppSettings, CreateProjectInput, UpdateProjectInput, vcsProviderSchema, ConnectionHint, DragHandleAttributes, DragHandleListeners, groupProjects() (+35 more)

### Community 10 - "Slot Config & Worktree Watch"
Cohesion: 0.15
Nodes (8): AckSystem, RecordedSession, RecordingSystem, RecordedSession, RecordingSystem, RelaunchSystem, AgentSessionHandle, AgentSessionOptions

### Community 11 - "Core Domain Concepts"
Cohesion: 0.04
Nodes (53): agentMessageRowSchema, AutomationRow, automationRowSchema, AutomationRunRow, automationRunRowSchema, buildScripts(), CommentRow, commentRowSchema (+45 more)

### Community 13 - "Database Store Operations"
Cohesion: 0.08
Nodes (53): isNotionUrl(), NOTION_HOSTS, ProjectInfo, AgentsViewProps, AskPanel(), AskPanelProps, CleanPrPanel(), CleanPrPanelProps (+45 more)

### Community 14 - "Coordinator & Protocol"
Cohesion: 0.05
Nodes (41): mapCommentRow(), ProjectInUseError, agentPairError(), cleanDescription(), createApiRoutes(), createSplitChildren(), isBlocked(), isProcessing() (+33 more)

### Community 15 - "API Routes & Reformulate"
Cohesion: 0.10
Nodes (23): CapabilityCache, threadConfig(), accountResponseSchema, hasExplicitCodexApiKey(), isProtocolIncompatibility(), listRuntimeModels(), modelListResponseSchema, modelSchema (+15 more)

### Community 16 - "Stats Aggregation"
Cohesion: 0.13
Nodes (3): mergeAgentUsageByModel(), SessionHubHandlers, SessionStartCallbacks

### Community 17 - "Triage & Server Hub"
Cohesion: 0.08
Nodes (25): devDependencies, autoprefixer, class-variance-authority, clsx, concurrently, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities (+17 more)

### Community 18 - "Live Terminal Views"
Cohesion: 0.08
Nodes (37): isReviewFixSession(), AZURE_BASH_ALLOWLIST, AZURE_CLEAN_BASH_ALLOWLIST, BASH_ALLOWLIST, bashAllowlist(), buildFeasibilitySessionConfig(), buildImplementSessionConfig(), buildSplitSessionConfig() (+29 more)

### Community 19 - "Stage Progress & Display"
Cohesion: 0.08
Nodes (24): compilerOptions, allowImportingTsExtensions, baseUrl, esModuleInterop, isolatedModules, jsx, lib, module (+16 more)

### Community 20 - "Real Adapter GH/Composer"
Cohesion: 0.11
Nodes (22): CODEX_EFFORT_LABELS, Kind, KINDS, CodexTierSummary(), DurationChart(), effectiveWorkDurationMs(), CodexTierSummary, DurationGroup (+14 more)

### Community 21 - "Store Types & Agent Knobs"
Cohesion: 0.16
Nodes (27): buildAskContract(), buildCleanContract(), buildConflictResolutionContract(), buildFeasibilityBatchContract(), buildFeasibilityContextSection(), buildImplementingSteps(), buildMockupReviewStep(), buildPlanningStep() (+19 more)

### Community 22 - "DB Row Schemas & Mappers"
Cohesion: 0.10
Nodes (27): cleanTicket(), conflictTicket(), REVIEW_OPTS, reviewTicket(), TICKET_OPTS, CHILD_USAGE, FULL_REVIEW_KINDS, LIGHT_REVIEW_KINDS (+19 more)

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
Cohesion: 0.07
Nodes (27): log, Watchdog, log, PROJECT_ROOT, NOTE: PRD generation holds the request open up to ~120s (REFORMULATE_TIMEOUT_MS), resolveDataFile(), resolveServerPort(), RunningServer (+19 more)

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
Cohesion: 0.14
Nodes (22): ExecutionFinishStatus, LiveSession, log, PendingSessionMessage, previewToolInput(), renderChannelEvent(), renderImplementationDone(), renderSessionEvent() (+14 more)

### Community 31 - "PRD Review & Markdown"
Cohesion: 0.08
Nodes (24): ActiveDelegation, ActiveReview, ActiveReviewPass, BOARD_FINDING_RENDER_STYLE, ClosableExecution, log, orderedReviewKinds(), renderPersistedReviewResult() (+16 more)

### Community 32 - "User Terminal & Fake IO"
Cohesion: 0.11
Nodes (28): ProfileConfig, DragHandleAttributes, DragHandleListeners, ProfilePipeline(), ProfileRow(), ProfileRowHeader(), ProfileRowHeaderProps, ProfileRowProps (+20 more)

### Community 33 - "Logging"
Cohesion: 0.10
Nodes (21): scripts, build:desktop, build:web, dev, dev:desktop, dev:proxy, dev:server, dev:web (+13 more)

### Community 34 - "Board Columns"
Cohesion: 0.08
Nodes (31): OverviewTab(), OverviewTabProps, SUMMARY_COLUMNS, PrdTab(), PrdTabProps, SectionHeader(), SectionHeaderProps, TICKET_TAB_LABELS (+23 more)

### Community 36 - "Runtime Dependencies"
Cohesion: 0.06
Nodes (44): WsClientEvent, QuitConfirmModal(), QuitConfirmModalProps, groupOrientation(), layoutToSizes(), panelId(), panelPercent(), SplitTree() (+36 more)

### Community 37 - "Claude SDK Provider"
Cohesion: 0.09
Nodes (23): dependencies, @anthropic-ai/claude-agent-sdk, dompurify, elysia, @fontsource/ibm-plex-mono, @fontsource/ibm-plex-sans, marked, @modelcontextprotocol/sdk (+15 more)

### Community 38 - "Agent Profile Config"
Cohesion: 0.19
Nodes (5): AutomationManager, mapAutomationRow(), mapAutomationRunRow(), Automation, AutomationRun

### Community 39 - "Agent Coordinator Handlers"
Cohesion: 0.10
Nodes (28): artifactPath, assertPackageVersionInSync(), assertSdkVersionsInSync(), BUILT_DMG, ELECTROBUN_BIN, fail(), installedPackageVersion(), RELEASE_FOLDER (+20 more)

### Community 41 - "Ticket Config & Constants"
Cohesion: 0.13
Nodes (22): PR_STATE_LABELS, ColumnActionsMenu(), ColumnActionsMenuProps, ColumnMenuItem, ActionContext, buildActions(), ConfirmSpec, errorMessage() (+14 more)

### Community 42 - "Ticket Detail & Triage UI"
Cohesion: 0.10
Nodes (18): BoundedCommandResult, ReviewPublicationEvent, connectionFailure(), connectionResult(), extractPrUrl(), ghPrHeadSchema, ghPrSchema, ghPrStateSchema (+10 more)

### Community 43 - "Demo Pipeline Concepts"
Cohesion: 0.12
Nodes (14): CLAUDE_JSON_PATH, COMPOSER_BINARIES, detectInstallCommand(), INSTALL_COMMANDS, log, NON_INTERACTIVE_ENV, NOTION_IMPORT_ALLOWED_TOOLS, NOTION_READ_TOOLS (+6 more)

### Community 44 - "Chart Primitives"
Cohesion: 0.22
Nodes (4): McpTokenSource, createMcpSettingsController(), McpSettingsControllerDependencies, temporaryDirectories

### Community 46 - "Community 46"
Cohesion: 0.27
Nodes (15): Agent Implementation Config, Argus Code Review, Automated Tests (typecheck/lint/test), Claude Code Autonomous Agent, Ticket Contract Injection, Feasibility Analysis, Kanban Board (Atelier), Kanban Agents Demo (demo.gif) (+7 more)

### Community 47 - "Modal Dialogs"
Cohesion: 0.11
Nodes (21): AUTOMATION_TRIGGER_LABELS, AUTOMATION_TRIGGERS, AutomationRunStatus, AutomationTrigger, CreateAutomationInput, AutomationCard(), AutomationCardProps, AutomationForm() (+13 more)

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
Cohesion: 0.15
Nodes (12): renderCollapsedFinding(), renderFinding(), DEFAULT_FINDING_RENDER_STYLE, FindingRenderStyle, reviewPublicationEvent(), allowedReviewPasses(), FULL_REVIEW_KINDS, LIGHT_REVIEW_KINDS (+4 more)

### Community 52 - "repairPath.ts"
Cohesion: 0.10
Nodes (24): TERMINAL_STAGES, terminalServerMessageSchema, applyTranscriptUpdate(), TranscriptState, transcriptText(), transcriptUpdateSchema, FullscreenToggle(), FullscreenToggleProps (+16 more)

### Community 53 - "User Terminal Manager"
Cohesion: 0.33
Nodes (5): CONTEXT — domain glossary, Execution, Proposed (not yet built), Seams, Work items

### Community 54 - "Community 54"
Cohesion: 0.14
Nodes (17): ACTIVE_BAR, AREA_CURSOR, AXIS_PROPS, BAR_CURSOR, CHART_PALETTE, colorAt(), DurationBars(), DurationDatum (+9 more)

### Community 56 - "CSV Parsing"
Cohesion: 0.35
Nodes (15): AgentEffort, AgentModel, CodexEffort, CodexModel, Implementer, Orchestrator, AgentProfileConfig(), AgentProfileConfigProps (+7 more)

### Community 57 - "Community 57"
Cohesion: 0.17
Nodes (17): ensureConfig(), boot(), externalUrlFromNewWindowEvent(), forwardAtelierShortcut(), installApplicationMenu(), installMenuShortcutBridge(), menuShortcutActionSchema, navigationEventSchema (+9 more)

### Community 59 - "triageManager.ts"
Cohesion: 0.22
Nodes (16): buildSplitChannelPrompt(), buildTicketLines(), isEnglish(), buildContractConstraintsLines(), buildResponseFormatLines(), buildStrictRulesLines(), buildTicketLines(), buildTriageChannelPrompt() (+8 more)

### Community 60 - "Package Manifest"
Cohesion: 0.25
Nodes (3): listPublicProjects(), PublicMcpManager, TicketOperations

### Community 61 - "splitManager.ts"
Cohesion: 0.09
Nodes (28): ProjectPrPicker(), ProjectPrPickerProps, PrSelectRow(), PrSelectRowProps, NAV_ENTRIES, NavEntry, Sidebar(), SidebarProps (+20 more)

### Community 62 - "TicketCard.tsx"
Cohesion: 0.20
Nodes (6): mapTicketRow(), TicketLifecycle, failSplitMother(), TicketOperationsDeps, Stage, Ticket

### Community 63 - "Community 63"
Cohesion: 0.12
Nodes (7): DoneGateResult, ReviewHeadResult, FAKE_OPEN_PRS, FakeVcsClient, githubPrHeadRef(), VcsClient, OpenPr

### Community 64 - "Composer Run Script"
Cohesion: 0.12
Nodes (18): FailedReformulation, ActionSystem, dryRunLog, fakeEncoder, escapeHtml(), renderCollapsedDetails(), renderOutsideDiffComment(), renderOutsideDiffSection() (+10 more)

### Community 65 - "split.ts"
Cohesion: 0.08
Nodes (26): mapTicketCreationRequestRow(), AttachExecutionSessionInput, AutomationPatch, EnqueueAgentMessageInput, FinalizeExecutionInput, MarkAgentMessageAcceptedInput, MarkAgentMessageReceivedInput, MarkAgentMessageRejectedInput (+18 more)

### Community 66 - "OpenPr"
Cohesion: 0.13
Nodes (12): CodexAppServerNotification, CodexAppServerRpcError, canonicalJson(), CodexCommandHook, codexSessionPreToolUseHookHash(), JsonValue, createCodexProvider(), AppServerFixtureOptions (+4 more)

### Community 67 - "TerminalView.tsx"
Cohesion: 0.15
Nodes (12): runFirstBootSetup(), projectConfigSchema, buildAppSettingsPatch(), LegacyConfig, legacyConfigSchema, LegacyModels, log, migrateConfigJsonIfPresent() (+4 more)

### Community 68 - "schema.test.ts"
Cohesion: 0.18
Nodes (18): Comment, ActivityTab(), ActivityTabProps, isUnanswered(), NO_COMMENT_COLUMNS, AUTHOR_BADGES, AuthorBadge(), CommentRow() (+10 more)

### Community 69 - "reviewFindings.ts"
Cohesion: 0.13
Nodes (23): ALSO_FLAGGED_PREFIX, dedupeFindings(), DimensionFinding, findingAnchor(), FRENCH_STOP_WORD_PATTERN, FRENCH_STOP_WORDS, hasSimilarSummary(), isSameDefect() (+15 more)

### Community 70 - "CodexRuntimeStatus"
Cohesion: 0.08
Nodes (35): wsClientEventSchema, App(), HOME_VIEW_OPTIONS, HomeView, Toaster(), TOOL_KINDS, ToolDialogs(), ToolKind (+27 more)

### Community 71 - "PostCSS Config"
Cohesion: 0.29
Nodes (6): name, overrides, zod, private, type, version

### Community 73 - "TerminalView.tsx"
Cohesion: 0.12
Nodes (30): Capabilities, CodexAgentFields(), CodexAgentFieldsProps, CodexConnectionStatus(), STATUS_LABELS, ImplementationAgentFields(), ProvidersSettings(), TabOption (+22 more)

### Community 74 - "button.tsx"
Cohesion: 0.06
Nodes (40): AGENT_EFFORT_FULL_LABELS, AGENT_EFFORT_LABELS, AGENT_MODEL_LABELS, AUTOMATION_RUN_STATUSES, CODEX_MODEL_LABELS, CODEX_SEED_PROFILE, COMMENT_AUTHORS, CommentAuthor (+32 more)

### Community 75 - ".handleRequest"
Cohesion: 0.11
Nodes (13): analyzeResultSchema, compactTicketSchema, createResultSchema, errorResultSchema, ISOLATED_ENV_KEYS, projectResultSchema, savedEnv, startResultSchema (+5 more)

### Community 76 - "usePrdSearch.ts"
Cohesion: 0.14
Nodes (21): isCodexFastServiceTier(), costByFamily(), costOf(), costOfModel(), costOfSessions(), CostSummary, FamilyPricing, MODEL_PRICING (+13 more)

### Community 78 - "csv.ts"
Cohesion: 0.13
Nodes (13): RecordingSystemAdapter, boundedCommandDetail(), runBoundedCommand(), safeJsonParse(), withJsonRequestFile(), PublishReviewOptions, PublishReviewResult, ReviewPublicationState (+5 more)

### Community 79 - "WorktreeSession"
Cohesion: 0.33
Nodes (3): listeners, mcp, ReplyArgsSchema

### Community 80 - "recordedAction.ts"
Cohesion: 0.24
Nodes (16): alternation(), COMMAND_WRAPPERS, commandSegments(), commandWords(), executableName(), launchedPackageScript(), launchesTypecheck(), OPTIONS_WITH_VALUE (+8 more)

### Community 81 - "vcsCommands.ts"
Cohesion: 0.18
Nodes (8): AZURE_COMMANDS, COMMANDS_BY_PROVIDER, GITHUB_COMMANDS, PrDiffContext, VcsCleanCommands, VcsCommandTable, AZ_SETTLED_THREAD_STATUSES, VCS_PROVIDER_LABELS

### Community 82 - "SplitTree.tsx"
Cohesion: 0.29
Nodes (15): AGENT_MODEL_FULL_LABELS, CODEX_EFFORT_FULL_LABELS, buildProfilePipeline(), claudeDetail(), claudeSubagentDetail(), codexOrchestratorDetail(), codexSubagentParts(), describeProfile() (+7 more)

### Community 86 - "TicketCost.tsx"
Cohesion: 0.38
Nodes (5): normalizeCreateInput(), requestKeyConflictMessage(), ticketDependencyError(), isAllowedAgentPair(), deriveTitleFromDescription()

### Community 87 - "codexBinary.ts"
Cohesion: 0.40
Nodes (5): CodexBinaryVersionError, require, resolveCodexBinary(), resolveCodexBinaryOverride(), TARGETS

### Community 89 - "usePrdSearch.ts"
Cohesion: 0.07
Nodes (41): CompactTicket, ListTicketsInput, Column, COLUMN_LABELS, COLUMN_ORDER, COLUMN_SORT_FIELD, COLUMNS, ACTIVE_COLUMNS (+33 more)

### Community 90 - "nvmNode.ts"
Cohesion: 0.35
Nodes (9): gitMetadataWritableRoots(), agentBaseEnv(), bestInstalledMatch(), compareParts(), envWithProjectNode(), nvmNodeBinDir(), readNvmrc(), prepareProjectShell() (+1 more)

### Community 91 - "FakePaneStream"
Cohesion: 0.20
Nodes (3): FakePaneStream, fakeShellPrompt(), hexToBytes()

### Community 92 - "useCapabilities.ts"
Cohesion: 0.20
Nodes (8): Block, blockText(), compactChunks(), firstCharCode(), TranscriptBuffer, trimBlockStart(), AgentStreamBlock, TranscriptUpdate

### Community 93 - "ColumnActionsMenu.tsx"
Cohesion: 0.25
Nodes (7): Azure DevOps support — state file, Decisions (validated by the owner, 2026-09-21), Goal, Known blockers for lots 3 and 4, Open questions, Progress, Verified on this machine (az 2.90.0, azure-devops 1.0.8)

### Community 94 - ".addComment"
Cohesion: 0.10
Nodes (15): setup(), setup(), log, ReformulateManager, SessionHub, DRY_RUN_VERDICT, log, TriageManager (+7 more)

### Community 95 - "TicketConfigSummary.tsx"
Cohesion: 0.50
Nodes (3): appBundle, EMBEDDED_BINARIES, resourcesApp

### Community 97 - "RunningServer"
Cohesion: 0.11
Nodes (18): ANSI, appendToLogFile(), COLOR_ENABLED, disableFileLogging(), initLogFile(), isLevel(), Level, LEVEL_ORDER (+10 more)

### Community 98 - "triageManager.ts"
Cohesion: 0.22
Nodes (9): AtelierDesktopRpcSchema, DesktopRequests, McpSettingsMetadata, WebviewRequests, McpSettingsController, McpSettings(), createMcpSettingsClient(), getMcpSettingsClient() (+1 more)

### Community 99 - "reviewPublishingGuard.ts"
Cohesion: 0.07
Nodes (35): API_GUARDS, API_READ_METHOD_SET, ApiDenyPatterns, ApiGuard, AZ_INVOKE_COMMAND, AZ_INVOKE_METHOD_LONG_FLAGS, AZ_INVOKE_WRITE_INPUT_LONG_FLAGS, AZ_PR_WRITE_PATTERN (+27 more)

### Community 100 - ".startVerification"
Cohesion: 0.12
Nodes (13): CodexAppServerInitializationError, CodexAppServerProtocolError, connectCodexAppServer(), incomingSchema, initializeResponseSchema, log, PendingRequest, rpcErrorSchema (+5 more)

### Community 101 - "codexProvider.test.ts"
Cohesion: 0.12
Nodes (13): directories, initializeParamsSchema, log, requestSchema, rpcError(), rpcResult(), rpcResponseSchema, toolCallParamsSchema (+5 more)

### Community 102 - ".start"
Cohesion: 0.26
Nodes (5): logRejection(), mapExecutionRunRow(), runRecordedAction(), ExecutionRun, ExecutionUsageByModel

### Community 103 - "TerminalSession"
Cohesion: 0.06
Nodes (13): PaneStream, SystemAdapter, dataMessage(), log, normalizeSeed(), safeParse(), send(), TerminalSession (+5 more)

### Community 104 - ".runWorktreeSetupScript"
Cohesion: 0.22
Nodes (4): realpathSafe(), resolveWorktreeScriptCommand(), setupOutputExcerpt(), shQuote()

### Community 106 - "usePrdSearch.ts"
Cohesion: 0.09
Nodes (31): PrdAnnotator(), PrdAnnotatorProps, BREADCRUMB, NO_ANNOTATIONS, PrdReviewDialog(), PrdReviewDialogProps, PrdView(), renderMarkdownToSafeHtml() (+23 more)

### Community 107 - "azureRemote.ts"
Cohesion: 0.35
Nodes (11): azureOrgUrl(), AzureRepoRef, fromAzureSegments(), fromCollectionSegments(), fromLegacySegments(), fromSshSegments(), parseAzureRepoRef(), parseRemoteLocation() (+3 more)

### Community 109 - "StageProgressBar.tsx"
Cohesion: 0.21
Nodes (13): FAILURE_COLUMNS, SUCCESS_COLUMNS, OutcomeChart(), SuccessRateChart(), ThroughputChart(), nextWeek(), outcomeCounts(), projectCounts() (+5 more)

### Community 110 - "Profile"
Cohesion: 0.09
Nodes (6): startFeasibilityTicket(), mapProfileRow(), nullableBooleanValue(), SqlUpdateBuilder, Store, Profile

### Community 112 - "mcpSettings.ts"
Cohesion: 0.30
Nodes (4): mapAgentMessageRow(), StartExecutionInput, AgentMessage, ExecutionOwnerType

### Community 113 - "createMcpServer"
Cohesion: 0.53
Nodes (5): createMcpServer(), invalidInput(), OutputValidator, toolError(), toolResult()

### Community 114 - "WorktreeSession"
Cohesion: 0.27
Nodes (4): mapWorktreeSessionRow(), enrichWorktreeSession(), WorktreeSession, BoardState

### Community 115 - "bootstrap.ts"
Cohesion: 0.36
Nodes (5): applyDesktopEnv(), DesktopRoots, ensureMcpToken(), regenerateMcpToken(), temporaryDirectories

### Community 116 - "settings.tsx"
Cohesion: 0.08
Nodes (27): AppearanceSettings(), CODEX_STATUS_TONES, COMMIT_ROW, DefaultsRowSpec, EFFORT_OPTIONS, FEASIBILITY_ROW, IMPLEMENTATION_ROW, KnobGroupProps (+19 more)

### Community 117 - "TicketMeta.tsx"
Cohesion: 0.16
Nodes (15): columnSchema, CostSummary(), MetaRow(), MetaRowProps, STATUS_CONFIRMS, StatusConfirm, statusTitle(), TicketMeta() (+7 more)

### Community 118 - "TicketConfigSummary.tsx"
Cohesion: 0.32
Nodes (6): agentEffortSchema, codexEffortSchema, codexModelSchema, inheritedLabel(), labelWithDefault(), TicketConfigSummary()

### Community 119 - "McpSettingsControllerDependencies"
Cohesion: 0.12
Nodes (18): ResolvedExecution, DRY_RUN_VERDICT, FeasibilityGroup, FeasibilitySession, log, QueuedFeasibility, toTriageResult(), log (+10 more)

### Community 120 - "useTickTimer.ts"
Cohesion: 0.36
Nodes (5): AgentProvider, AgentSessionEvent, AgentSessionToolResult, HttpMcpServerDefinition, runOneShotSession()

### Community 121 - "prUrl.ts"
Cohesion: 0.40
Nodes (5): VCS_PROVIDERS, parsePrUrl(), PR_URL_SEGMENT, prNumberFromUrl(), PrUrlRef

### Community 122 - "Comment"
Cohesion: 0.28
Nodes (3): confirmPrMerged(), unmergedReason(), PrState

### Community 123 - "StatRecord"
Cohesion: 0.33
Nodes (6): RFC-4180, CsvParseError, normalizeHeader(), ParsedTicketRow, ParsedTicketsCsv, parseTicketsCsv()

### Community 125 - "reformulate.ts"
Cohesion: 0.38
Nodes (6): ATTENTION_STATUSES, sessionOf(), SlotPips(), SlotPipsProps, STATUS_LABELS, STATUS_PIP_CLASSES

### Community 126 - "profileMatching.test.ts"
Cohesion: 0.67
Nodes (3): sleep(), startAndApproveReviews(), submitReviews()

### Community 127 - "prUrl.ts"
Cohesion: 0.36
Nodes (7): effectivePort(), isAllowedHost(), isAllowedOrigin(), isAuthorized(), isLoopbackHost(), jsonResponse(), parseHost()

## Knowledge Gaps
- **725 isolated node(s):** `log`, `ActiveDelegation`, `ReviewResult`, `{ $schema: _reviewSchemaDraft, ...REVIEW_OUTPUT_SCHEMA }`, `ActiveReview` (+720 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Ticket` connect `TicketCard.tsx` to `Contract Building & Slots`, `.startAgentSession`, `Desktop Bootstrap & Menus`, `Ticket Action Panels`, `Shared Zod Schemas`, `PR Selection & Slots Bar`, `Core Domain Concepts`, `Database Store Operations`, `Coordinator & Protocol`, `Live Terminal Views`, `Store Types & Agent Knobs`, `DB Row Schemas & Mappers`, `Dev Dependencies`, `Board Columns`, `NPM Scripts`, `Runtime Dependencies`, `Ticket Config & Constants`, `Session Hub Transcript`, `repairPath.ts`, `triageManager.ts`, `split.ts`, `schema.test.ts`, `CodexRuntimeStatus`, `button.tsx`, `usePrdSearch.ts`, `TicketCost.tsx`, `usePrdSearch.ts`, `.addComment`, `Profile`, `WorktreeSession`, `TicketMeta.tsx`, `TicketConfigSummary.tsx`, `McpSettingsControllerDependencies`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **Why does `RealSystemAdapter` connect `Board & Sidebar Layout` to `codexProvider.test.ts`, `App.tsx`, `.runWorktreeSetupScript`, `Demo Pipeline Concepts`, `RealPaneStream`, `Cost & Pricing`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Why does `Store` connect `Profile` to `Desktop Bootstrap & Menus`, `Feasibility Batch Management`, `Shared Zod Schemas`, `PR Selection & Slots Bar`, `Core Domain Concepts`, `Coordinator & Protocol`, `Store Types & Agent Knobs`, `DB Row Schemas & Mappers`, `Dev Dependencies`, `Cost & Pricing`, `NPM Scripts`, `Agent Profile Config`, `Session Hub Transcript`, `TicketCard.tsx`, `split.ts`, `TerminalView.tsx`, `.addComment`, `.start`, `TerminalSession`, `mcpSettings.ts`, `WorktreeSession`, `McpSettingsControllerDependencies`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **What connects `log`, `ActiveDelegation`, `ReviewResult` to the rest of the system?**
  _736 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Contract Building & Slots` be split into smaller, more focused modules?**
  _Cohesion score 0.030212234706616728 - nodes in this community are weakly interconnected._
- **Should `Terminals UI & Notifications` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._
- **Should `Desktop Bootstrap & Menus` be split into smaller, more focused modules?**
  _Cohesion score 0.13090418353576247 - nodes in this community are weakly interconnected._