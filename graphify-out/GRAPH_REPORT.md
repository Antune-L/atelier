# Graph Report - kanban-agents  (2026-09-13)

## Corpus Check
- 261 files · ~729,196 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2788 nodes · 7712 edges · 129 communities (102 shown, 27 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 56 edges (avg confidence: 0.67)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `bc6fdef8`
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
- FakePaneStream
- usePrdSearch.ts
- Community 77
- csv.ts
- WorktreeSession
- recordedAction.ts
- terminalManager.ts
- Community 82
- Community 83
- codexCapabilities.ts
- TerminalView.tsx
- usePrdSearch.ts
- transcriptBuffer.ts
- AgentsView.tsx
- ProjectConfig
- FakePaneStream
- .addComment
- TicketConfigSummary.tsx
- useTickTimer.ts
- RunningServer
- splitManager.ts
- reviewPublishingGuard.ts
- coordinator.ts
- split.ts
- DescriptionTab.tsx
- TerminalSession
- nvmNode.ts
- SlotPips.tsx
- uploads.ts
- Board.tsx
- renderCollapsedDetails
- .start
- createMcpServer
- useLocalDraft.ts
- useTickTimer.ts
- profileMatching.test.ts
- RunningServer
- isNotionUrl
- Contract (pipeline instructions)
- Coordinator
- Done Gate
- Kind (ticket pipeline type)
- Protocol (wire format source of truth)
- SessionHub
- Slot (git-worktree execution unit)
- SlotManager
- Stage (pipeline state)
- Ticket
- Ticket Lifecycle
- Triage / Feasibility

## God Nodes (most connected - your core abstractions)
1. `Store` - 123 edges
2. `Ticket` - 108 edges
3. `cn()` - 76 edges
4. `SystemAdapter` - 75 edges
5. `RealSystemAdapter` - 68 edges
6. `FakeSystemAdapter` - 64 edges
7. `createApiRoutes()` - 62 edges
8. `ProjectInfo` - 50 edges
9. `SlotManager` - 49 edges
10. `DelegationManager` - 48 edges

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
- None detected.

## Communities (129 total, 27 thin omitted)

### Community 0 - "Contract Building & Slots"
Cohesion: 0.04
Nodes (63): ActionExecutionOptions, actionExecutionOptionsSchema, agentMessageSchema, AnalyzeTicketsInput, appSettingsSchema, automationRunSchema, automationSchema, baseBranchSchema (+55 more)

### Community 1 - "Terminals UI & Notifications"
Cohesion: 0.10
Nodes (20): analyzeTicketsInputSchema, analyzeTicketsOutputSchema, columnSchema, compactTicketSchema, createTodoTicketOutputSchema, editableTicketSchema, listProjectsInputSchema, listProjectsOutputSchema (+12 more)

### Community 2 - "Desktop Bootstrap & Menus"
Cohesion: 0.11
Nodes (14): dryRunLog, FAKE_OPEN_PRS, fakeEncoder, hexToBytes(), GitWorktreeAddOptions, ImportNotionOptions, PaneSize, PrepareReviewWorktreeOptions (+6 more)

### Community 3 - "Feasibility Batch Management"
Cohesion: 0.06
Nodes (37): log, logRejection(), ToolHandler, ToolResult, TRIAGE_VERDICTS, AgentSettableStage, agentSettableStageSchema, askUserArgsSchema (+29 more)

### Community 5 - "Fake System Adapter"
Cohesion: 0.15
Nodes (21): codexRuntimeStatusSchema, isCodexFastServiceTier(), pairedRuntimeCodexEffort(), UNKNOWN_CODEX_RUNTIME_STATUS, pairedCodexEffort(), Capabilities, CodexAgentFields(), CodexConnectionStatus() (+13 more)

### Community 6 - "Shared Zod Schemas"
Cohesion: 0.10
Nodes (28): PrdAnnotator(), PrdAnnotatorProps, BREADCRUMB, NO_ANNOTATIONS, PrdReviewDialog(), PrdReviewDialogProps, OverviewTab(), OverviewTabProps (+20 more)

### Community 7 - "Settings & Profiles UI"
Cohesion: 0.08
Nodes (3): delay(), fakeShellPrompt(), FakeSystemAdapter

### Community 8 - "PR Selection & Slots Bar"
Cohesion: 0.13
Nodes (20): ACTIVE_BAR, AREA_CURSOR, AXIS_PROPS, BAR_CURSOR, CHART_PALETTE, colorAt(), DurationBars(), DurationDatum (+12 more)

### Community 9 - "Real System Adapter"
Cohesion: 0.08
Nodes (27): AgentDefaultsSettings(), AppearanceSettings(), CODEX_STATUS_TONES, COMMIT_ROW, DefaultsRowSpec, EFFORT_OPTIONS, FEASIBILITY_ROW, IMPLEMENTATION_ROW (+19 more)

### Community 10 - "Slot Config & Worktree Watch"
Cohesion: 0.06
Nodes (41): Block, blockText(), compactChunks(), firstCharCode(), TranscriptBuffer, trimBlockStart(), AgentStreamBlock, TERMINAL_STAGES (+33 more)

### Community 11 - "Core Domain Concepts"
Cohesion: 0.04
Nodes (50): agentMessageRowSchema, AutomationRow, automationRowSchema, AutomationRunRow, automationRunRowSchema, buildScripts(), CommentRow, commentRowSchema (+42 more)

### Community 12 - "Board & Sidebar Layout"
Cohesion: 0.09
Nodes (3): RealSystemAdapter, DoneGateResult, ReviewHeadResult

### Community 13 - "Database Store Operations"
Cohesion: 0.12
Nodes (22): main(), scalar(), assertCodexDowngradeSafe(), backfillOrchestrator(), countRows(), createDatabase(), EXECUTION_MIGRATIONS, hasColumn() (+14 more)

### Community 14 - "Coordinator & Protocol"
Cohesion: 0.10
Nodes (12): SlotManager, addUsageByModel(), toUsageByModel(), mapSlotRow(), mapTicketRow(), TicketLifecycle, failSplitMother(), Slot (+4 more)

### Community 15 - "API Routes & Reformulate"
Cohesion: 0.11
Nodes (42): AgentEffort, AgentModel, CodexEffort, CodexModel, Implementer, Orchestrator, ProfileConfig, AgentProfileConfigProps (+34 more)

### Community 16 - "Stats Aggregation"
Cohesion: 0.20
Nodes (11): projectConfigSchema, buildAppSettingsPatch(), LegacyConfig, legacyConfigSchema, LegacyModels, log, migrateConfigJsonIfPresent(), parseLegacyConfig() (+3 more)

### Community 17 - "Triage & Server Hub"
Cohesion: 0.08
Nodes (25): devDependencies, autoprefixer, class-variance-authority, clsx, concurrently, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities (+17 more)

### Community 18 - "Live Terminal Views"
Cohesion: 0.19
Nodes (21): buildFeasibilityBatchContract(), buildFeasibilityContextSection(), buildImplementingSteps(), buildMockupReviewStep(), buildPlanningStep(), buildPrdBullet(), buildReviewContract(), buildReviewFixLines() (+13 more)

### Community 19 - "Stage Progress & Display"
Cohesion: 0.08
Nodes (24): compilerOptions, allowImportingTsExtensions, baseUrl, esModuleInterop, isolatedModules, jsx, lib, module (+16 more)

### Community 20 - "Real Adapter GH/Composer"
Cohesion: 0.09
Nodes (33): FAILURE_COLUMNS, Kind, KINDS, SUCCESS_COLUMNS, agentEffortSchema, codexEffortSchema, codexModelSchema, DurationChart() (+25 more)

### Community 21 - "Store Types & Agent Knobs"
Cohesion: 0.21
Nodes (11): AutomationView(), toCreateInput(), Toaster(), COLUMN_NODE_COLOR, depthOf(), truncate(), WorkflowView(), WorkflowViewProps (+3 more)

### Community 22 - "DB Row Schemas & Mappers"
Cohesion: 0.16
Nodes (18): ColumnActionsMenu(), ColumnActionsMenuProps, ColumnMenuItem, ActionContext, buildActions(), ConfirmSpec, errorMessage(), RETRY_STAGES (+10 more)

### Community 23 - "Dev Dependencies"
Cohesion: 0.08
Nodes (21): NewTicket, TicketCreationRequestConflictError, AnalyzeTicketRejectionReason, AnalyzeTicketsResult, CompactTicket, CreateTodoTicketInput, createTodoTicketInputSchema, CreateTodoTicketResult (+13 more)

### Community 24 - "TypeScript Config"
Cohesion: 0.10
Nodes (27): AgentProvider, AgentSessionEvent, ensureClaudeBinary(), bashCommandSchema, buildSettings(), claudeProvider, createSdkAgentSession(), denyBashHook() (+19 more)

### Community 25 - "Client Hub & Watchdog"
Cohesion: 0.08
Nodes (28): buildAskContract(), buildCleanContract(), buildConflictResolutionContract(), groupFeasibilityTickets(), reviewPublicationEvent(), finding(), passDimensionFindings(), publishedReviewFindings() (+20 more)

### Community 26 - "Cost & Pricing"
Cohesion: 0.07
Nodes (25): BoundedCommandResult, CLAUDE_JSON_PATH, COMPOSER_BINARIES, detectInstallCommand(), extractPrUrl(), ghPrHeadSchema, ghPrSchema, ghPrStateSchema (+17 more)

### Community 27 - "Workflow View & Lifecycle"
Cohesion: 0.12
Nodes (11): Architecture, Commands, Conventions (enforced — beyond the global ones in ~/.claude/CLAUDE.md), graphify, The dry-run safety model — read before running anything, What this is, Agent runtime (Agent SDK), Architecture (+3 more)

### Community 28 - "Stats Charts"
Cohesion: 0.07
Nodes (39): agentMessageDeltaSchema, agentToml(), buildMcpServers(), ConfigObject, configReadResponseSchema, ConfigValue, describeCodexError(), emptyResponseSchema (+31 more)

### Community 29 - "Session Hub & Agent Session"
Cohesion: 0.19
Nodes (8): RecordingSystemAdapter, reviewApiEndpoint(), rightSideDiffLines(), runBoundedReviewCommand(), safeJsonParse(), PublishReviewOptions, PublishReviewResult, ReviewDoneOptions

### Community 30 - "Agents View & Ticket Cards"
Cohesion: 0.10
Nodes (19): assertExecutionAvailable(), CODEX_LAUNCH_STATUS_MESSAGES, CodexCapabilityReader, ExecutionDefaults, ExecutionOverrides, FEASIBILITY_ENGINE_EXECUTION, resolveExecution(), resolveFeasibilityExecution() (+11 more)

### Community 31 - "PRD Review & Markdown"
Cohesion: 0.06
Nodes (36): agentPairError(), cleanDescription(), createApiRoutes(), createSplitChildren(), isBlocked(), isProcessing(), isSplitMother(), isWebOnlyPath() (+28 more)

### Community 32 - "User Terminal & Fake IO"
Cohesion: 0.09
Nodes (31): isReviewFixSession(), BASH_ALLOWLIST, buildFeasibilitySessionConfig(), buildImplementSessionConfig(), buildSplitSessionConfig(), buildTriageSessionConfig(), CODEX_READONLY_TOOLS, codexKnobs() (+23 more)

### Community 33 - "Logging"
Cohesion: 0.10
Nodes (21): scripts, build:desktop, build:web, dev, dev:desktop, dev:proxy, dev:server, dev:web (+13 more)

### Community 34 - "Board Columns"
Cohesion: 0.12
Nodes (13): CodexAppServerInitializationError, CodexAppServerProtocolError, CodexAppServerRpcError, connectCodexAppServer(), incomingSchema, initializeResponseSchema, log, PendingRequest (+5 more)

### Community 36 - "Runtime Dependencies"
Cohesion: 0.07
Nodes (39): COLUMN_ORDER, PrdView(), PrSelectRow(), PrdTab(), TICKET_TAB_LABELS, TicketTab, TicketTabs(), TicketTabsProps (+31 more)

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
Cohesion: 0.17
Nodes (11): Claude Code skills (real mode), Codex agents (optional), Desktop app (macOS, optional), Development, Electrobun dev on a new machine, Environment variables, Getting started, Real mode (+3 more)

### Community 41 - "Ticket Config & Constants"
Cohesion: 0.14
Nodes (6): CodexAppServerConnection, CodexAppServerNotification, CodexAppServerOptions, CodexProviderDependencies, AppServerFixture, CodexRuntimeDependencies

### Community 43 - "Demo Pipeline Concepts"
Cohesion: 0.07
Nodes (40): AppSettings, CreateProjectInput, ManagedProject, UpdateProjectInput, isPositiveIntegerString(), isValidDraft(), ProjectListRow(), ProjectListRowProps (+32 more)

### Community 44 - "Chart Primitives"
Cohesion: 0.06
Nodes (54): COLUMN_SORT_FIELD, AgentCard(), AgentCardProps, AgentsView(), hasLiveAgent(), normalize(), BoardColumn(), compareFamilyMembers() (+46 more)

### Community 45 - "Session Hub Transcript"
Cohesion: 0.21
Nodes (9): columnSchema, STATUS_CONFIRMS, StatusConfirm, statusTitle(), TicketMeta(), ConfirmActionsProps, ConfirmPopover(), ConfirmProps (+1 more)

### Community 46 - "Community 46"
Cohesion: 0.27
Nodes (15): Agent Implementation Config, Argus Code Review, Automated Tests (typecheck/lint/test), Claude Code Autonomous Agent, Ticket Contract Injection, Feasibility Analysis, Kanban Board (Atelier), Kanban Agents Demo (demo.gif) (+7 more)

### Community 47 - "Modal Dialogs"
Cohesion: 0.10
Nodes (26): cleanTicket(), conflictTicket(), REVIEW_OPTS, reviewTicket(), TICKET_OPTS, CHILD_USAGE, FULL_REVIEW_KINDS, LIGHT_REVIEW_KINDS (+18 more)

### Community 48 - "Community 48"
Cohesion: 0.10
Nodes (20): CodexBinaryVersionError, require, resolveCodexBinary(), resolveCodexBinaryOverride(), TARGETS, inheritedMcpServerNames(), prepareSkills(), threadConfig() (+12 more)

### Community 49 - "Slot State"
Cohesion: 0.09
Nodes (18): log, resolveBaseBranch(), DRY_RUN_VERDICT, log, DRY_RUN_VERDICT, log, TriageManager, TriageSession (+10 more)

### Community 50 - "Stats Hooks & Cards"
Cohesion: 0.16
Nodes (12): ChartConfig, ChartContainer, ChartContainerProps, ChartContext, ChartContextValue, ChartLegendContent(), ChartLegendContentProps, ChartTooltipContent() (+4 more)

### Community 51 - "Community 51"
Cohesion: 0.33
Nodes (9): useTheme(), UseThemeResult, applyTheme(), getStoredTheme(), isTheme(), Theme, ThemeOption, THEMES (+1 more)

### Community 52 - "chart.tsx"
Cohesion: 0.10
Nodes (7): mapProfileRow(), mapTicketCreationRequestRow(), nullableBooleanValue(), SqlUpdateBuilder, Store, AgentMessage, Profile

### Community 53 - "User Terminal Manager"
Cohesion: 0.33
Nodes (5): CONTEXT — domain glossary, Execution, Proposed (not yet built), Seams, Work items

### Community 54 - "Community 54"
Cohesion: 0.05
Nodes (64): AGENT_EFFORT_LABELS, AGENT_EFFORTS, AGENT_MODEL_LABELS, AGENT_MODELS, AUTOMATION_RUN_STATUSES, AUTOMATION_TRIGGER_LABELS, AUTOMATION_TRIGGERS, AutomationRunStatus (+56 more)

### Community 55 - "App.tsx"
Cohesion: 0.16
Nodes (9): ActiveReviewPass, ResolvedExecution, FeasibilityBatchManager, FeasibilityGroup, FeasibilitySession, QueuedFeasibility, toTriageResult(), ProjectConfig (+1 more)

### Community 57 - "Community 57"
Cohesion: 0.17
Nodes (17): applyDesktopEnv(), DesktopRoots, ensureConfig(), ensureMcpToken(), regenerateMcpToken(), temporaryDirectories, boot(), externalUrlFromNewWindowEvent() (+9 more)

### Community 59 - "triageManager.ts"
Cohesion: 0.39
Nodes (11): buildContractConstraintsLines(), buildResponseFormatLines(), buildStrictRulesLines(), buildTicketLines(), buildTriageChannelPrompt(), buildTriagePlusChannelPrompt(), isEnglish(), readOnlyFramingLines() (+3 more)

### Community 60 - "Package Manifest"
Cohesion: 0.39
Nodes (6): buildSplitChannelPrompt(), buildTicketLines(), isEnglish(), CommitLanguage, extractFigmaUrls(), hasMockups()

### Community 61 - "splitManager.ts"
Cohesion: 0.13
Nodes (32): QuitConfirmModal(), groupOrientation(), layoutToSizes(), panelId(), panelPercent(), SplitTree(), SplitTreeProps, applySizes() (+24 more)

### Community 63 - "Community 63"
Cohesion: 0.06
Nodes (39): mapAgentMessageRow(), mapWorktreeSessionRow(), AttachExecutionSessionInput, AutomationPatch, EnqueueAgentMessageInput, enrichWorktreeSession(), FinalizeExecutionInput, MarkAgentMessageAcceptedInput (+31 more)

### Community 64 - "Composer Run Script"
Cohesion: 0.12
Nodes (26): ActiveDelegation, ActiveReview, ClosableExecution, ExecutionFinishStatus, LiveSession, log, PendingSessionMessage, previewToolInput() (+18 more)

### Community 65 - "split.ts"
Cohesion: 0.19
Nodes (7): buildReformulatePrompt(), log, ReformulateManager, mapExecutionRunRow(), runRecordedAction(), ExecutionRun, parseTriageReport()

### Community 66 - "OpenPr"
Cohesion: 0.07
Nodes (3): slotPath(), slugify(), SystemAdapter

### Community 67 - "UserTerminalManager"
Cohesion: 0.26
Nodes (9): StatRecord, StatCard(), StatCardProps, StatEmpty(), CodexTierSummary(), StatsView(), StatsViewProps, useStats() (+1 more)

### Community 69 - "contract.test.ts"
Cohesion: 0.06
Nodes (50): log, orderedReviewKinds(), renderCollapsedFinding(), renderFinding(), renderPersistedReviewResult(), REVIEW_DISALLOWED_TOOLS, REVIEW_REPORT_LABELS_EN, REVIEW_REPORT_LABELS_FR (+42 more)

### Community 70 - "CodexRuntimeStatus"
Cohesion: 0.18
Nodes (14): summarizeSessionCosts(), totalTokensOfSessions(), executionCosts(), executionTokens(), projectStatRecord(), CostSummary(), MetaRow(), MetaRowProps (+6 more)

### Community 71 - "PostCSS Config"
Cohesion: 0.29
Nodes (6): name, overrides, zod, private, type, version

### Community 72 - "App.tsx"
Cohesion: 0.38
Nodes (6): ATTENTION_STATUSES, sessionOf(), SlotPips(), SlotPipsProps, STATUS_LABELS, STATUS_PIP_CLASSES

### Community 73 - "TerminalView.tsx"
Cohesion: 0.11
Nodes (8): childTranscriptPrefix(), DelegationManager, reviewKey(), ReviewReportLabels, mergeAgentUsageByModel(), mapReviewApprovalRow(), mapReviewPassRow(), parsePersistedReviewFindings()

### Community 74 - "button.tsx"
Cohesion: 0.12
Nodes (11): analyzeResultSchema, compactTicketSchema, createResultSchema, errorResultSchema, projectResultSchema, startResultSchema, structuredContentResultSchema, textContentResultSchema (+3 more)

### Community 75 - "FakePaneStream"
Cohesion: 0.25
Nodes (16): AGENT_EFFORT_FULL_LABELS, AGENT_MODEL_FULL_LABELS, CODEX_EFFORT_FULL_LABELS, ProfilePipeline(), buildProfilePipeline(), claudeDetail(), claudeSubagentDetail(), codexOrchestratorDetail() (+8 more)

### Community 76 - "usePrdSearch.ts"
Cohesion: 0.15
Nodes (14): costByFamily(), costOf(), costOfModel(), costOfSessions(), CostSummary, FamilyPricing, ModelFamily, normalizeModel() (+6 more)

### Community 78 - "csv.ts"
Cohesion: 0.12
Nodes (20): App(), HOME_VIEW_OPTIONS, HomeView, NAV_ENTRIES, NavEntry, Sidebar(), SidebarProps, SidebarView (+12 more)

### Community 79 - "WorktreeSession"
Cohesion: 0.33
Nodes (3): listeners, mcp, ReplyArgsSchema

### Community 80 - "recordedAction.ts"
Cohesion: 0.23
Nodes (17): alternation(), COMMAND_WRAPPERS, commandSegments(), commandWords(), executableName(), launchedPackageScript(), launchesTypecheck(), OPTIONS_WITH_VALUE (+9 more)

### Community 81 - "terminalManager.ts"
Cohesion: 0.33
Nodes (5): Atelier, Documentation, How it works, MCP local, Quickstart

### Community 87 - "TerminalView.tsx"
Cohesion: 0.22
Nodes (4): McpTokenSource, createMcpSettingsController(), McpSettingsControllerDependencies, temporaryDirectories

### Community 89 - "usePrdSearch.ts"
Cohesion: 0.40
Nodes (4): MIME_EXTENSIONS, resolveExtension(), SavedUpload, saveUpload()

### Community 90 - "transcriptBuffer.ts"
Cohesion: 0.67
Nodes (3): mergePaths(), PATH_PROBE_COMMAND, repairPath()

### Community 91 - "AgentsView.tsx"
Cohesion: 0.22
Nodes (9): AtelierDesktopRpcSchema, DesktopRequests, McpSettingsMetadata, WebviewRequests, McpSettingsController, McpSettings(), createMcpSettingsClient(), getMcpSettingsClient() (+1 more)

### Community 92 - "ProjectConfig"
Cohesion: 0.16
Nodes (8): AckSystem, RecordedSession, RecordingSystem, RecordedSession, RecordingSystem, RelaunchSystem, AgentSessionHandle, AgentSessionOptions

### Community 93 - "FakePaneStream"
Cohesion: 0.67
Nodes (3): sleep(), startAndApproveReviews(), submitReviews()

### Community 94 - ".addComment"
Cohesion: 0.16
Nodes (10): canonicalJson(), CodexCommandHook, codexSessionPreToolUseHookHash(), JsonValue, createCodexProvider(), AppServerFixtureOptions, hookPathForSession(), options() (+2 more)

### Community 95 - "TicketConfigSummary.tsx"
Cohesion: 0.50
Nodes (3): appBundle, EMBEDDED_BINARIES, resourcesApp

### Community 97 - "RunningServer"
Cohesion: 0.07
Nodes (32): ANSI, appendToLogFile(), COLOR_ENABLED, disableFileLogging(), initLogFile(), isLevel(), Level, LEVEL_ORDER (+24 more)

### Community 99 - "reviewPublishingGuard.ts"
Cohesion: 0.24
Nodes (10): GH_API_READ_METHOD_SET, GH_API_READ_METHODS, GH_API_WRITE_INPUT_PATTERN, GH_API_WRITE_LONG_FLAGS, GH_API_WRITE_METHODS, GH_API_WRITE_SHORT_FLAGS, GH_PR_PUBLISH_PATTERN, GH_PR_PUBLISH_SUBCOMMANDS (+2 more)

### Community 100 - "coordinator.ts"
Cohesion: 0.18
Nodes (9): directories, initializeParamsSchema, log, requestSchema, rpcError(), rpcResult(), toolCallParamsSchema, WorkerMcpManager (+1 more)

### Community 101 - "split.ts"
Cohesion: 0.19
Nodes (14): WsClientEvent, wsClientEventSchema, active, ensureNotificationPermission(), getAudioContext(), isSupported(), loadSoundBuffer(), playBuffer() (+6 more)

### Community 102 - "DescriptionTab.tsx"
Cohesion: 0.11
Nodes (41): REVIEW_DEPTHS, ReviewDepth, ProjectInfo, AgentProfileConfig(), AgentsViewProps, AskPanelProps, CleanPrPanel(), CleanPrPanelProps (+33 more)

### Community 103 - "TerminalSession"
Cohesion: 0.07
Nodes (17): RealPaneStream, PaneStream, dataMessage(), log, normalizeSeed(), safeParse(), send(), TerminalSession (+9 more)

### Community 106 - "nvmNode.ts"
Cohesion: 0.42
Nodes (7): bestInstalledMatch(), compareParts(), envWithProjectNode(), nvmNodeBinDir(), readNvmrc(), prepareProjectShell(), shellLiteral()

### Community 107 - "SlotPips.tsx"
Cohesion: 0.20
Nodes (5): FailedReformulation, ActionSystem, CapabilityCache, ReformulateOptions, CodexRuntimeStatus

### Community 108 - "uploads.ts"
Cohesion: 0.24
Nodes (8): effectivePort(), isAllowedHost(), isAllowedOrigin(), isAuthorized(), isLoopbackHost(), jsonResponse(), parseHost(), PublicMcpManager

### Community 109 - "Board.tsx"
Cohesion: 0.13
Nodes (21): Column, COLUMN_LABELS, COLUMNS, ACTIVE_COLUMNS, Board(), BoardProps, isColumn(), isLocked() (+13 more)

### Community 110 - "renderCollapsedDetails"
Cohesion: 0.29
Nodes (7): RFC-4180, ImportTicketsPanel(), CsvParseError, normalizeHeader(), ParsedTicketRow, ParsedTicketsCsv, parseTicketsCsv()

### Community 114 - "createMcpServer"
Cohesion: 0.53
Nodes (5): createMcpServer(), invalidInput(), OutputValidator, toolError(), toolResult()

### Community 115 - "useLocalDraft.ts"
Cohesion: 0.10
Nodes (28): AskPanel(), QuitConfirmModalProps, ActivityTab(), isUnanswered(), NO_COMMENT_COLUMNS, AUTHOR_BADGES, AuthorBadge(), CommentRow() (+20 more)

### Community 116 - "useTickTimer.ts"
Cohesion: 0.21
Nodes (6): FeasibilityStarter, isProcessing(), normalizeCreateInput(), ticketDependencyError(), TicketOperations, deriveTitleFromDescription()

### Community 119 - "RunningServer"
Cohesion: 0.13
Nodes (13): PROJECT_ROOT, NOTE: PRD generation holds the request open up to ~120s (REFORMULATE_TIMEOUT_MS), resolveServerPort(), RunningServer, serveStaticAsset(), SocketData, startServer(), StartServerOptions (+5 more)

### Community 120 - "isNotionUrl"
Cohesion: 0.33
Nodes (6): isNotionUrl(), NOTION_HOSTS, NewTicketSheet(), LaunchForm(), dependencyCandidates(), NON_DEPENDABLE_COLUMNS

## Knowledge Gaps
- **657 isolated node(s):** `Quickstart`, `MCP local`, `How it works`, `Documentation`, `temporaryDirectories` (+652 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **27 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Ticket` connect `Coordinator & Protocol` to `Contract Building & Slots`, `Ticket Action Panels`, `Shared Zod Schemas`, `Slot Config & Worktree Watch`, `Core Domain Concepts`, `Live Terminal Views`, `Store Types & Agent Knobs`, `DB Row Schemas & Mappers`, `Dev Dependencies`, `Client Hub & Watchdog`, `Agents View & Ticket Cards`, `PRD Review & Markdown`, `User Terminal & Fake IO`, `NPM Scripts`, `Runtime Dependencies`, `Chart Primitives`, `Session Hub Transcript`, `Modal Dialogs`, `Slot State`, `chart.tsx`, `Community 54`, `triageManager.ts`, `Package Manifest`, `Community 63`, `Composer Run Script`, `split.ts`, `OpenPr`, `contract.test.ts`, `CodexRuntimeStatus`, `TerminalView.tsx`, `csv.ts`, `FakePaneStream`, `split.ts`, `DescriptionTab.tsx`, `Board.tsx`, `useLocalDraft.ts`, `useTickTimer.ts`?**
  _High betweenness centrality (0.092) - this node is a cross-community bridge._
- **Why does `SystemAdapter` connect `OpenPr` to `Composer Run Script`, `split.ts`, `Desktop Bootstrap & Menus`, `coordinator.ts`, `contract.test.ts`, `Agent Profile Config`, `Settings & Profiles UI`, `TerminalSession`, `SlotPips.tsx`, `Board & Sidebar Layout`, `Coordinator & Protocol`, `.start`, `Slot State`, `Client Hub & Watchdog`, `Cost & Pricing`, `Agents View & Ticket Cards`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Why does `Store` connect `chart.tsx` to `Feasibility Batch Management`, `Core Domain Concepts`, `Coordinator & Protocol`, `Stats Aggregation`, `Live Terminal Views`, `Dev Dependencies`, `Client Hub & Watchdog`, `Agents View & Ticket Cards`, `PRD Review & Markdown`, `NPM Scripts`, `Agent Profile Config`, `Modal Dialogs`, `Slot State`, `TicketCard.tsx`, `Community 63`, `split.ts`, `contract.test.ts`, `CodexRuntimeStatus`, `TerminalView.tsx`, `TerminalSession`, `.start`, `RunningServer`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **What connects `Quickstart`, `MCP local`, `How it works` to the rest of the system?**
  _668 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Contract Building & Slots` be split into smaller, more focused modules?**
  _Cohesion score 0.0380952380952381 - nodes in this community are weakly interconnected._
- **Should `Terminals UI & Notifications` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._
- **Should `Desktop Bootstrap & Menus` be split into smaller, more focused modules?**
  _Cohesion score 0.10869565217391304 - nodes in this community are weakly interconnected._