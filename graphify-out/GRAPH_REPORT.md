# Graph Report - kanban-agents  (2026-09-25)

## Corpus Check
- 274 files · ~748,558 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3040 nodes · 8504 edges · 116 communities (107 shown, 9 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 54 edges (avg confidence: 0.67)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c0be5d1b`
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
- azureRemote.ts
- Profile
- SlotPips.tsx
- createMcpServer
- settings.tsx
- McpSettingsControllerDependencies
- ProjectSelect.tsx
- prUrl.ts

## God Nodes (most connected - your core abstractions)
1. `Store` - 124 edges
2. `Ticket` - 114 edges
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
- `ActiveReview` --references--> `Ticket`  [EXTRACTED]
  src/server/agents/delegationManager.ts → src/shared/schemas.ts
- `main()` --calls--> `migrateCodexCatalog()`  [EXTRACTED]
  scripts/downgrade-codex-catalog.ts → src/server/db/schema.ts
- `main()` --calls--> `assertCodexDowngradeSafe()`  [EXTRACTED]
  scripts/downgrade-codex-catalog.ts → src/server/db/schema.ts
- `StageProgressBarProps` --references--> `Ticket`  [EXTRACTED]
  src/web/src/components/StageProgressBar.tsx → src/shared/schemas.ts

## Import Cycles
- None detected.

## Communities (116 total, 9 thin omitted)

### Community 0 - "Contract Building & Slots"
Cohesion: 0.04
Nodes (67): ActionExecutionOptions, actionExecutionOptionsSchema, agentMessageSchema, AnalyzeTicketsInput, appSettingsSchema, automationRunSchema, automationSchema, baseBranchSchema (+59 more)

### Community 1 - "Terminals UI & Notifications"
Cohesion: 0.10
Nodes (20): analyzeTicketsInputSchema, analyzeTicketsOutputSchema, columnSchema, compactTicketSchema, createTodoTicketOutputSchema, editableTicketSchema, listProjectsInputSchema, listProjectsOutputSchema (+12 more)

### Community 2 - "Desktop Bootstrap & Menus"
Cohesion: 0.13
Nodes (8): slotPath(), mapSlotRow(), mapWorktreeSessionRow(), enrichWorktreeSession(), ClientSocket, Slot, WorktreeSession, BoardState

### Community 3 - "Feasibility Batch Management"
Cohesion: 0.06
Nodes (41): log, logRejection(), ToolHandler, ToolResult, addUsageByModel(), toUsageByModel(), WorkerMcpHandlers, AgentSettableStage (+33 more)

### Community 4 - "Ticket Action Panels"
Cohesion: 0.10
Nodes (30): AgentCard(), AgentCardProps, AgentsView(), AgentsViewProps, hasLiveAgent(), normalize(), DurationBars(), KIND_BADGES (+22 more)

### Community 5 - "Fake System Adapter"
Cohesion: 0.04
Nodes (65): boundedCommandDetail(), BoundedCommandResult, runBoundedCommand(), safeJsonParse(), withJsonRequestFile(), escapeHtml(), renderCollapsedDetails(), renderOutsideDiffComment() (+57 more)

### Community 6 - "Shared Zod Schemas"
Cohesion: 0.19
Nodes (3): SlotManager, failSplitMother(), TicketOperationsDeps

### Community 7 - "Settings & Profiles UI"
Cohesion: 0.08
Nodes (3): delay(), fakeShellPrompt(), FakeSystemAdapter

### Community 8 - "PR Selection & Slots Bar"
Cohesion: 0.15
Nodes (17): assertExecutionAvailable(), CODEX_LAUNCH_STATUS_MESSAGES, CodexCapabilityReader, ExecutionDefaults, FEASIBILITY_ENGINE_EXECUTION, resolveExecution(), resolveFeasibilityExecution(), resolveTicketExecution() (+9 more)

### Community 9 - "Real System Adapter"
Cohesion: 0.06
Nodes (47): AppSettings, CreateProjectInput, UpdateProjectInput, ConnectionHint, DragHandleAttributes, DragHandleListeners, groupProjects(), isPositiveIntegerString() (+39 more)

### Community 10 - "Slot Config & Worktree Watch"
Cohesion: 0.15
Nodes (8): AckSystem, RecordedSession, RecordingSystem, RecordedSession, RecordingSystem, RelaunchSystem, AgentSessionHandle, AgentSessionOptions

### Community 11 - "Core Domain Concepts"
Cohesion: 0.04
Nodes (54): agentMessageRowSchema, AutomationRow, automationRowSchema, AutomationRunRow, automationRunRowSchema, buildScripts(), CommentRow, commentRowSchema (+46 more)

### Community 12 - "Board & Sidebar Layout"
Cohesion: 0.07
Nodes (7): detectInstallCommand(), realpathSafe(), RealSystemAdapter, resolveWorktreeScriptCommand(), setupOutputExcerpt(), shQuote(), VcsProvider

### Community 13 - "Database Store Operations"
Cohesion: 0.21
Nodes (7): resolveBaseBranch(), groupFeasibilityTickets(), computeWorktreeAddresses(), getProject(), isProjectKey(), projectVcsProvider(), requireStore()

### Community 14 - "Coordinator & Protocol"
Cohesion: 0.06
Nodes (37): agentPairError(), cleanDescription(), createApiRoutes(), createSplitChildren(), isBlocked(), isProcessing(), isSplitMother(), isWebOnlyPath() (+29 more)

### Community 15 - "API Routes & Reformulate"
Cohesion: 0.10
Nodes (18): CodexAppServerConnection, CodexAppServerProtocolError, createCodexAgentSession(), inheritedMcpServerNames(), PreparedHook, prepareSkills(), threadConfig(), accountResponseSchema (+10 more)

### Community 16 - "Stats Aggregation"
Cohesion: 0.09
Nodes (6): setup(), startParentSession(), mergeAgentUsageByModel(), SessionHub, SessionHubHandlers, SessionStartCallbacks

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
Cohesion: 0.05
Nodes (63): AGENT_EFFORT_LABELS, CODEX_EFFORT_LABELS, FAILURE_COLUMNS, Kind, KINDS, SUCCESS_COLUMNS, StatRecord, StatCard() (+55 more)

### Community 21 - "Store Types & Agent Knobs"
Cohesion: 0.18
Nodes (25): buildAskContract(), buildCleanContract(), buildConflictResolutionContract(), buildFeasibilityContextSection(), buildImplementingSteps(), buildMockupReviewStep(), buildPlanningStep(), buildPrdBullet() (+17 more)

### Community 22 - "DB Row Schemas & Mappers"
Cohesion: 0.20
Nodes (16): BoardColumn(), compareFamilyMembers(), familyKeyOf(), groupTicketIds(), groupTicketsByFamily(), isSplitMother(), readCollapsed(), readSortDir() (+8 more)

### Community 23 - "Dev Dependencies"
Cohesion: 0.10
Nodes (18): NewTicket, TicketCreationRequestConflictError, AnalyzeTicketRejectionReason, AnalyzeTicketsResult, CreateTodoTicketInput, createTodoTicketInputSchema, CreateTodoTicketResult, isActive() (+10 more)

### Community 24 - "TypeScript Config"
Cohesion: 0.13
Nodes (23): bashCommandSchema, buildSettings(), claudeProvider, createSdkAgentSession(), denyBashHook(), denyNoVerifyHook, denyReviewPublishingHook, denyTypecheckHook() (+15 more)

### Community 26 - "Cost & Pricing"
Cohesion: 0.08
Nodes (23): Watchdog, PROJECT_ROOT, NOTE: PRD generation holds the request open up to ~120s (REFORMULATE_TIMEOUT_MS), resolveDataFile(), resolveServerPort(), RunningServer, serveStaticAsset(), SocketData (+15 more)

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
Cohesion: 0.12
Nodes (26): ExecutionFinishStatus, LiveSession, log, PendingSessionMessage, previewToolInput(), renderChannelEvent(), renderImplementationDone(), renderSessionEvent() (+18 more)

### Community 31 - "PRD Review & Markdown"
Cohesion: 0.08
Nodes (25): ActiveDelegation, ActiveReview, ActiveReviewPass, ClosableExecution, FEATURE_REVIEWER_OPTIONS, log, orderedReviewKinds(), renderPersistedReviewResult() (+17 more)

### Community 32 - "User Terminal & Fake IO"
Cohesion: 0.08
Nodes (50): RFC-4180, isNotionUrl(), NOTION_HOSTS, ProjectInfo, AgentProfileConfig(), AskPanelProps, CleanPrPanel(), CleanPrPanelProps (+42 more)

### Community 33 - "Logging"
Cohesion: 0.10
Nodes (21): scripts, build:desktop, build:web, dev, dev:desktop, dev:proxy, dev:server, dev:web (+13 more)

### Community 34 - "Board Columns"
Cohesion: 0.15
Nodes (14): AUTOMATION_TRIGGER_LABELS, AUTOMATION_TRIGGERS, AutomationRunStatus, AutomationTrigger, CreateAutomationInput, AutomationCard(), AutomationCardProps, AutomationFormProps (+6 more)

### Community 35 - "NPM Scripts"
Cohesion: 0.19
Nodes (3): AgentCoordinator, SessionToolCall, mapTicketRow()

### Community 36 - "Runtime Dependencies"
Cohesion: 0.06
Nodes (53): terminalServerMessageSchema, FullscreenToggle(), FullscreenToggleProps, badgeLabelFor(), LiveTerminal(), LiveTerminalOptions, LiveTerminalProps, groupOrientation() (+45 more)

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
Cohesion: 0.18
Nodes (7): CapabilityCache, CodexRuntimeModel, codexRuntimeModelSchema, CodexRuntimeStatus, codexRuntimeStatusSchema, UNKNOWN_CODEX_RUNTIME_STATUS, runtime

### Community 41 - "Ticket Config & Constants"
Cohesion: 0.09
Nodes (21): WsClientEvent, wsClientEventSchema, ATTENTION_STATUSES, sessionOf(), SlotPips(), SlotPipsProps, STATUS_LABELS, STATUS_PIP_CLASSES (+13 more)

### Community 42 - "Ticket Detail & Triage UI"
Cohesion: 0.21
Nodes (19): AGENT_EFFORT_FULL_LABELS, AGENT_MODEL_FULL_LABELS, CODEX_EFFORT_FULL_LABELS, CODEX_MODEL_LABELS, IMPLEMENTER_LABELS, ProfilePipeline(), buildProfilePipeline(), claudeDetail() (+11 more)

### Community 43 - "Demo Pipeline Concepts"
Cohesion: 0.29
Nodes (9): gitMetadataWritableRoots(), agentBaseEnv(), bestInstalledMatch(), compareParts(), envWithProjectNode(), nvmNodeBinDir(), readNvmrc(), prepareProjectShell() (+1 more)

### Community 44 - "Chart Primitives"
Cohesion: 0.19
Nodes (10): projectConfigSchema, buildAppSettingsPatch(), LegacyConfig, legacyConfigSchema, LegacyModels, log, migrateConfigJsonIfPresent(), parseLegacyConfig() (+2 more)

### Community 45 - "Session Hub Transcript"
Cohesion: 0.23
Nodes (10): artifactPath, assertPackageVersionInSync(), assertSdkVersionsInSync(), BUILT_DMG, ELECTROBUN_BIN, fail(), installedPackageVersion(), RELEASE_FOLDER (+2 more)

### Community 46 - "Community 46"
Cohesion: 0.27
Nodes (15): Agent Implementation Config, Argus Code Review, Automated Tests (typecheck/lint/test), Claude Code Autonomous Agent, Ticket Contract Injection, Feasibility Analysis, Kanban Board (Atelier), Kanban Agents Demo (demo.gif) (+7 more)

### Community 47 - "Modal Dialogs"
Cohesion: 0.08
Nodes (3): runFirstBootSetup(), SystemAdapter, safeParse()

### Community 48 - "Community 48"
Cohesion: 0.33
Nodes (9): useTheme(), UseThemeResult, applyTheme(), getStoredTheme(), isTheme(), Theme, ThemeOption, THEMES (+1 more)

### Community 49 - "Slot State"
Cohesion: 0.06
Nodes (40): main(), scalar(), log, setup(), ReformulateManager, log, initProjectRegistry(), assertCodexDowngradeSafe() (+32 more)

### Community 50 - "Stats Hooks & Cards"
Cohesion: 0.16
Nodes (12): ChartConfig, ChartContainer, ChartContainerProps, ChartContext, ChartContextValue, ChartLegendContent(), ChartLegendContentProps, ChartTooltipContent() (+4 more)

### Community 52 - "chart.tsx"
Cohesion: 0.18
Nodes (5): renderCollapsedFinding(), renderFinding(), mapReviewApprovalRow(), mapReviewPassRow(), parsePersistedReviewFindings()

### Community 53 - "User Terminal Manager"
Cohesion: 0.33
Nodes (5): CONTEXT — domain glossary, Execution, Proposed (not yet built), Seams, Work items

### Community 54 - "Community 54"
Cohesion: 0.15
Nodes (12): log, applyAppSettingsToModels(), DEFAULT_MODELS, log, PROJECT_ROOT, ProjectKey, NOTE: AppSettings carries no implementerModel/implementerEffort, so those two MO, NOTE: must live OUTSIDE any repo that has a node_modules: tsc auto-includes @typ (+4 more)

### Community 56 - "CSV Parsing"
Cohesion: 0.10
Nodes (47): ExecutionOverrides, AgentEffort, AgentModel, CodexEffort, CodexModel, Implementer, Orchestrator, AgentProfileConfigProps (+39 more)

### Community 57 - "Community 57"
Cohesion: 0.06
Nodes (35): applyDesktopEnv(), DesktopRoots, ensureConfig(), ensureMcpToken(), regenerateMcpToken(), temporaryDirectories, boot(), externalUrlFromNewWindowEvent() (+27 more)

### Community 58 - "File Uploads"
Cohesion: 0.29
Nodes (4): OpenPr, PrSelectRow(), PrSelectRowProps, isPrNeedsAttention()

### Community 59 - "triageManager.ts"
Cohesion: 0.25
Nodes (16): buildContractConstraintsLines(), buildResponseFormatLines(), buildStrictRulesLines(), buildTicketLines(), buildTriageChannelPrompt(), buildTriagePlusChannelPrompt(), isEnglish(), readOnlyFramingLines() (+8 more)

### Community 60 - "Package Manifest"
Cohesion: 0.22
Nodes (4): listProjectKeys(), listPublicProjects(), PublicMcpManager, TicketOperations

### Community 61 - "splitManager.ts"
Cohesion: 0.05
Nodes (59): AGENT_MODEL_LABELS, QuitConfirmModal(), QuitConfirmModalProps, ProviderRow(), TerminalsView(), AUTHOR_BADGES, AuthorBadge(), OverviewTab() (+51 more)

### Community 62 - "TicketCard.tsx"
Cohesion: 0.22
Nodes (3): TicketLifecycle, Stage, Ticket

### Community 63 - "Community 63"
Cohesion: 0.09
Nodes (9): DoneGateResult, ReviewHeadResult, FAKE_OPEN_PRS, FakeVcsClient, githubPrHeadRef(), CreatePrResult, VcsClient, PrState (+1 more)

### Community 64 - "Composer Run Script"
Cohesion: 0.08
Nodes (30): CHILD_USAGE, FULL_REVIEW_KINDS, LIGHT_REVIEW_KINDS, newDelegatedTicket(), newReviewTicket(), RecordingSystemAdapter, dryRunLog, fakeEncoder (+22 more)

### Community 65 - "split.ts"
Cohesion: 0.06
Nodes (41): mapAgentMessageRow(), mapTicketCreationRequestRow(), AttachExecutionSessionInput, AutomationPatch, EnqueueAgentMessageInput, FinalizeExecutionInput, MarkAgentMessageAcceptedInput, MarkAgentMessageReceivedInput (+33 more)

### Community 66 - "OpenPr"
Cohesion: 0.16
Nodes (10): canonicalJson(), CodexCommandHook, codexSessionPreToolUseHookHash(), JsonValue, createCodexProvider(), AppServerFixtureOptions, hookPathForSession(), options() (+2 more)

### Community 67 - "UserTerminalManager"
Cohesion: 0.26
Nodes (3): TriageManager, ACTIVE_STAGES, TriageResult

### Community 68 - "schema.test.ts"
Cohesion: 0.11
Nodes (29): PrdAnnotator(), PrdAnnotatorProps, BREADCRUMB, NO_ANNOTATIONS, PrdReviewDialog(), PrdReviewDialogProps, PrdView(), ActivityTab() (+21 more)

### Community 69 - "reviewFindings.ts"
Cohesion: 0.11
Nodes (29): dedupeFindings(), DimensionFinding, findingAnchor(), FRENCH_STOP_WORD_PATTERN, FRENCH_STOP_WORDS, hasSimilarSummary(), isSameDefect(), isSelfRefuting() (+21 more)

### Community 70 - "CodexRuntimeStatus"
Cohesion: 0.09
Nodes (32): App(), HOME_VIEW_OPTIONS, HomeView, AutomationView(), NAV_ENTRIES, NavEntry, Sidebar(), SidebarProps (+24 more)

### Community 71 - "PostCSS Config"
Cohesion: 0.29
Nodes (6): name, overrides, zod, private, type, version

### Community 72 - "App.tsx"
Cohesion: 0.14
Nodes (20): ColumnActionsMenu(), ColumnActionsMenuProps, ColumnMenuItem, ActionContext, buildActions(), ConfirmSpec, errorMessage(), RETRY_STAGES (+12 more)

### Community 73 - "TerminalView.tsx"
Cohesion: 0.10
Nodes (26): reviewApiEndpoint(), VCS_PROVIDERS, parsePrUrl(), PR_URL_SEGMENT, prNumberFromUrl(), PrUrlRef, FILLED_GLYPH_COLORS, StageProgressBar() (+18 more)

### Community 74 - "button.tsx"
Cohesion: 0.09
Nodes (22): AUTOMATION_RUN_STATUSES, CODEX_MODEL_EFFORTS, CODEX_SEED_PROFILE, COLUMN_SORT_FIELD, COMMENT_AUTHORS, CommentAuthor, DEFAULT_PROFILES, FEASIBILITY_ENGINE_LABELS (+14 more)

### Community 75 - ".handleRequest"
Cohesion: 0.11
Nodes (13): analyzeResultSchema, compactTicketSchema, createResultSchema, errorResultSchema, ISOLATED_ENV_KEYS, projectResultSchema, savedEnv, startResultSchema (+5 more)

### Community 76 - "usePrdSearch.ts"
Cohesion: 0.10
Nodes (27): isCodexFastServiceTier(), costByFamily(), costOf(), costOfModel(), costOfSessions(), CostSummary, FamilyPricing, MODEL_PRICING (+19 more)

### Community 78 - "csv.ts"
Cohesion: 0.31
Nodes (7): AskPanel(), DescriptionEdit, DescriptionTab(), DescriptionTabProps, NOTE: the draft now mirrors what was persisted, so it is no longer unsent text., handleMediaPaste(), isMedia()

### Community 79 - "WorktreeSession"
Cohesion: 0.33
Nodes (3): listeners, mcp, ReplyArgsSchema

### Community 80 - "recordedAction.ts"
Cohesion: 0.23
Nodes (17): alternation(), COMMAND_WRAPPERS, commandSegments(), commandWords(), executableName(), launchedPackageScript(), launchesTypecheck(), OPTIONS_WITH_VALUE (+9 more)

### Community 81 - "vcsCommands.ts"
Cohesion: 0.17
Nodes (9): AZURE_COMMANDS, COMMANDS_BY_PROVIDER, GITHUB_COMMANDS, PrDiffContext, VcsCleanCommands, vcsCommands(), VcsCommandTable, AZ_SETTLED_THREAD_STATUSES (+1 more)

### Community 86 - "TicketCost.tsx"
Cohesion: 0.38
Nodes (5): normalizeCreateInput(), requestKeyConflictMessage(), ticketDependencyError(), isAllowedAgentPair(), deriveTitleFromDescription()

### Community 87 - "createMcpServer"
Cohesion: 0.40
Nodes (5): CodexBinaryVersionError, require, resolveCodexBinary(), resolveCodexBinaryOverride(), TARGETS

### Community 89 - "usePrdSearch.ts"
Cohesion: 0.08
Nodes (33): CompactTicket, ListTicketsInput, Column, COLUMN_LABELS, COLUMN_ORDER, COLUMNS, ORCHESTRATOR_LABELS, columnSchema (+25 more)

### Community 90 - ".getReviewPass"
Cohesion: 0.31
Nodes (8): buildFeasibilityBatchContract(), cleanTicket(), conflictTicket(), REVIEW_OPTS, reviewTicket(), TICKET_OPTS, truncateDescription(), makeTicket()

### Community 92 - "useCapabilities.ts"
Cohesion: 0.15
Nodes (15): Block, blockText(), compactChunks(), firstCharCode(), TranscriptBuffer, trimBlockStart(), AgentStreamBlock, applyTranscriptUpdate() (+7 more)

### Community 93 - "ColumnActionsMenu.tsx"
Cohesion: 0.25
Nodes (7): Azure DevOps support — state file, Decisions (validated by the owner, 2026-09-21), Goal, Known blockers for lots 3 and 4, Open questions, Progress, Verified on this machine (az 2.90.0, azure-devops 1.0.8)

### Community 94 - ".addComment"
Cohesion: 0.27
Nodes (4): mapExecutionRunRow(), runRecordedAction(), ExecutionRun, ExecutionUsageByModel

### Community 95 - "TicketConfigSummary.tsx"
Cohesion: 0.50
Nodes (3): appBundle, EMBEDDED_BINARIES, resourcesApp

### Community 97 - "RunningServer"
Cohesion: 0.08
Nodes (31): ANSI, appendToLogFile(), COLOR_ENABLED, disableFileLogging(), initLogFile(), isLevel(), Level, LEVEL_ORDER (+23 more)

### Community 99 - "reviewPublishingGuard.ts"
Cohesion: 0.07
Nodes (35): API_GUARDS, API_READ_METHOD_SET, ApiDenyPatterns, ApiGuard, AZ_INVOKE_COMMAND, AZ_INVOKE_METHOD_LONG_FLAGS, AZ_INVOKE_WRITE_INPUT_LONG_FLAGS, AZ_PR_WRITE_PATTERN (+27 more)

### Community 100 - ".startVerification"
Cohesion: 0.12
Nodes (12): CodexAppServerInitializationError, CodexAppServerRpcError, connectCodexAppServer(), incomingSchema, initializeResponseSchema, log, PendingRequest, rpcErrorSchema (+4 more)

### Community 101 - "codexProvider.test.ts"
Cohesion: 0.13
Nodes (10): directories, initializeParamsSchema, log, requestSchema, rpcError(), rpcResult(), rpcResponseSchema, toolCallParamsSchema (+2 more)

### Community 102 - "DescriptionTab.tsx"
Cohesion: 0.21
Nodes (8): TICKET_OPTION, TicketOptionsToggleGroupProps, TicketOptionValues, ToggleGroup, ToggleGroupContext, ToggleGroupItem, Toggle, toggleVariants

### Community 103 - "TerminalSession"
Cohesion: 0.17
Nodes (11): PaneStream, dataMessage(), log, normalizeSeed(), send(), TerminalSession, TerminalSocket, TerminalSocketData (+3 more)

### Community 104 - "reviewPass.ts"
Cohesion: 0.67
Nodes (3): sleep(), startAndApproveReviews(), submitReviews()

### Community 105 - ".finishTicket"
Cohesion: 0.31
Nodes (9): ResolvedExecution, DRY_RUN_VERDICT, FeasibilityGroup, FeasibilitySession, log, QueuedFeasibility, toTriageResult(), ProjectConfig (+1 more)

### Community 107 - "azureRemote.ts"
Cohesion: 0.40
Nodes (10): azureOrgUrl(), fromAzureSegments(), fromCollectionSegments(), fromLegacySegments(), fromSshSegments(), parseAzureRepoRef(), parseRemoteLocation(), RemoteLocation (+2 more)

### Community 110 - "Profile"
Cohesion: 0.09
Nodes (7): startFeasibilityTicket(), mapProfileRow(), nullableBooleanValue(), SqlUpdateBuilder, Store, AgentMessage, Profile

### Community 111 - "SlotPips.tsx"
Cohesion: 0.18
Nodes (11): buildSplitChannelPrompt(), buildTicketLines(), isEnglish(), DRY_RUN_RESULT, log, PendingSplit, SplitManager, CommitLanguage (+3 more)

### Community 113 - "createMcpServer"
Cohesion: 0.27
Nodes (7): createMcpServer(), invalidInput(), OutputValidator, toolError(), toolResult(), FeasibilityStarter, isProcessing()

### Community 116 - "settings.tsx"
Cohesion: 0.06
Nodes (53): pairedRuntimeCodexEffort(), COMMIT_LANGUAGE_LABELS, COMMIT_LANGUAGES, Capabilities, CodexAgentFields(), CodexConnectionStatus(), STATUS_LABELS, AppearanceSettings() (+45 more)

### Community 119 - "McpSettingsControllerDependencies"
Cohesion: 0.08
Nodes (23): reviewPublicationEvent(), publishedReviewFindings(), codexImplementerKnobs(), assertCodexImplementerAvailable(), featureBranch(), log, ReclaimOutcome, reviewPublicationState() (+15 more)

### Community 120 - "ProjectSelect.tsx"
Cohesion: 0.17
Nodes (3): TerminalSessionManager, UserTerminalManager, TerminalDescriptor

### Community 127 - "prUrl.ts"
Cohesion: 0.36
Nodes (7): effectivePort(), isAllowedHost(), isAllowedOrigin(), isAuthorized(), isLoopbackHost(), jsonResponse(), parseHost()

## Knowledge Gaps
- **716 isolated node(s):** `LIGHT_REVIEW_KINDS`, `FULL_REVIEW_KINDS`, `log`, `ActiveDelegation`, `ReviewResult` (+711 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Ticket` connect `TicketCard.tsx` to `Contract Building & Slots`, `Desktop Bootstrap & Menus`, `Ticket Action Panels`, `Shared Zod Schemas`, `PR Selection & Slots Bar`, `Core Domain Concepts`, `Database Store Operations`, `Coordinator & Protocol`, `Live Terminal Views`, `Store Types & Agent Knobs`, `DB Row Schemas & Mappers`, `Dev Dependencies`, `Client Hub & Watchdog`, `PRD Review & Markdown`, `User Terminal & Fake IO`, `NPM Scripts`, `Ticket Config & Constants`, `Slot State`, `Community 51`, `chart.tsx`, `CSV Parsing`, `triageManager.ts`, `splitManager.ts`, `Composer Run Script`, `split.ts`, `schema.test.ts`, `reviewFindings.ts`, `CodexRuntimeStatus`, `App.tsx`, `TerminalView.tsx`, `usePrdSearch.ts`, `csv.ts`, `TicketCost.tsx`, `usePrdSearch.ts`, `reviewPass.ts`, `.finishTicket`, `csv.ts`, `Profile`, `SlotPips.tsx`, `McpSettingsControllerDependencies`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **Why does `SystemAdapter` connect `Modal Dialogs` to `Desktop Bootstrap & Menus`, `Shared Zod Schemas`, `Settings & Profiles UI`, `PR Selection & Slots Bar`, `Slot Config & Worktree Watch`, `Board & Sidebar Layout`, `Database Store Operations`, `Stats Aggregation`, `Cost & Pricing`, `Agents View & Ticket Cards`, `Agent Profile Config`, `API Client Inputs`, `Slot State`, `Community 54`, `File Uploads`, `Community 63`, `Composer Run Script`, `TerminalSession`, `.finishTicket`, `SlotPips.tsx`, `McpSettingsControllerDependencies`, `ProjectSelect.tsx`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Why does `FakeSystemAdapter` connect `Settings & Profiles UI` to `Composer Run Script`, `API Client Inputs`, `Slot Config & Worktree Watch`, `Modal Dialogs`, `Slot State`, `Cost & Pricing`, `Agents View & Ticket Cards`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **What connects `LIGHT_REVIEW_KINDS`, `FULL_REVIEW_KINDS`, `log` to the rest of the system?**
  _727 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Contract Building & Slots` be split into smaller, more focused modules?**
  _Cohesion score 0.03554239170677527 - nodes in this community are weakly interconnected._
- **Should `Terminals UI & Notifications` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._
- **Should `Desktop Bootstrap & Menus` be split into smaller, more focused modules?**
  _Cohesion score 0.12955465587044535 - nodes in this community are weakly interconnected._