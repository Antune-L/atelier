# Graph Report - kanban-agents  (2026-09-15)

## Corpus Check
- 261 files · ~732,368 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2811 nodes · 7119 edges · 133 communities (100 shown, 33 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 44 edges (avg confidence: 0.64)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `97f80461`
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
- TicketCost.tsx
- TerminalView.tsx
- usePrdSearch.ts
- useProjects.ts
- AgentsView.tsx
- ProjectConfig
- ColumnActionsMenu.tsx
- .addComment
- TicketConfigSummary.tsx
- useTickTimer.ts
- RunningServer
- triageManager.ts
- reviewPublishingGuard.ts
- coordinator.ts
- codexProvider.test.ts
- DescriptionTab.tsx
- TerminalSession
- AutomationView.tsx
- .finishTicket
- nvmNode.ts
- isNotionUrl
- uploads.ts
- nvmNode.ts
- Profile
- .start
- createMcpServer
- useLocalDraft.ts
- useSavedFlash.ts
- TicketMeta.tsx
- performSplit
- RunningServer
- slotTemplates.ts
- reviewMarkdown.ts
- submitTriageArgsSchema
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
1. `Store` - 119 edges
2. `cn()` - 79 edges
3. `SystemAdapter` - 72 edges
4. `createApiRoutes()` - 70 edges
5. `RealSystemAdapter` - 68 edges
6. `FakeSystemAdapter` - 65 edges
7. `Ticket` - 63 edges
8. `SlotManager` - 55 edges
9. `ProjectInfo` - 50 edges
10. `DelegationManager` - 48 edges

## Surprising Connections (you probably didn't know these)
- `McpSettingsClient` --references--> `McpSettingsMetadata`  [EXTRACTED]
  src/web/src/lib/mcpSettings.ts → desktop/mcpRpc.ts
- `RecordedSession` --references--> `AgentSessionOptions`  [EXTRACTED]
  src/server/agents/delegationManager.test.ts → src/server/system/agentSession.ts
- `main()` --calls--> `assertCodexDowngradeSafe()`  [EXTRACTED]
  scripts/downgrade-codex-catalog.ts → src/server/db/schema.ts
- `main()` --calls--> `migrateCodexCatalog()`  [EXTRACTED]
  scripts/downgrade-codex-catalog.ts → src/server/db/schema.ts
- `reviewTicket()` --calls--> `makeTicket()`  [EXTRACTED]
  src/server/agents/contract.test.ts → src/server/testing/fixtures.ts

## Import Cycles
- None detected.

## Communities (133 total, 33 thin omitted)

### Community 0 - "Contract Building & Slots"
Cohesion: 0.03
Nodes (84): AUTOMATION_RUN_STATUSES, COMMENT_AUTHORS, REVIEW_DEPTHS, STAGES, isNotionUrl(), NOTION_HOSTS, ActionExecutionOptions, actionExecutionOptionsSchema (+76 more)

### Community 1 - "Terminals UI & Notifications"
Cohesion: 0.09
Nodes (21): analyzeTicketsInputSchema, analyzeTicketsOutputSchema, columnSchema, compactTicketSchema, createTodoTicketOutputSchema, editableTicketSchema, listProjectsInputSchema, listProjectsOutputSchema (+13 more)

### Community 2 - "Desktop Bootstrap & Menus"
Cohesion: 0.11
Nodes (18): WorktreeAddressWatcher, ANSI, COLOR_ENABLED, isLevel(), Level, LEVEL_ORDER, LEVEL_TAG, resolveThreshold() (+10 more)

### Community 3 - "Feasibility Batch Management"
Cohesion: 0.07
Nodes (29): TRIAGE_VERDICTS, AgentSettableStage, agentSettableStageSchema, askUserArgsSchema, AssertNamesCovered, channelEventSchema, delegateImplementationArgsSchema, delegateReviewArgsSchema (+21 more)

### Community 4 - "Ticket Action Panels"
Cohesion: 0.08
Nodes (27): Comment, Slot, WorktreeSession, WsClientEvent, wsClientEventSchema, ATTENTION_STATUSES, sessionOf(), SlotPips() (+19 more)

### Community 5 - "Fake System Adapter"
Cohesion: 0.24
Nodes (7): CapabilityCache, CodexRuntimeStatus, codexRuntimeStatusSchema, pairedRuntimeCodexEffort(), UNKNOWN_CODEX_RUNTIME_STATUS, pairedCodexEffort(), runtime

### Community 7 - "Settings & Profiles UI"
Cohesion: 0.08
Nodes (5): delay(), fakeShellPrompt(), FakeSystemAdapter, hexToBytes(), DoneGateResult

### Community 8 - "PR Selection & Slots Bar"
Cohesion: 0.08
Nodes (31): StatRecord, StatCard(), StatCardProps, StatEmpty(), ACTIVE_BAR, AREA_CURSOR, AXIS_PROPS, BAR_CURSOR (+23 more)

### Community 9 - "Real System Adapter"
Cohesion: 0.07
Nodes (33): COMMIT_LANGUAGE_LABELS, COMMIT_LANGUAGES, CodexAgentFields(), AppearanceSettings(), CODEX_STATUS_TONES, COMMIT_ROW, DefaultsRowSpec, EFFORT_OPTIONS (+25 more)

### Community 10 - "Slot Config & Worktree Watch"
Cohesion: 0.18
Nodes (12): terminalServerMessageSchema, badgeLabelFor(), LiveTerminal(), LiveTerminalOptions, LiveTerminalProps, TerminalCell(), TerminalCellProps, TERMINAL_THEME (+4 more)

### Community 11 - "Core Domain Concepts"
Cohesion: 0.03
Nodes (50): agentMessageRowSchema, AutomationRow, automationRowSchema, AutomationRunRow, automationRunRowSchema, buildScripts(), CommentRow, commentRowSchema (+42 more)

### Community 12 - "Board & Sidebar Layout"
Cohesion: 0.21
Nodes (5): renderOutsideDiffComment(), reviewApiEndpoint(), rightSideDiffLines(), runBoundedReviewCommand(), safeJsonParse()

### Community 13 - "Database Store Operations"
Cohesion: 0.14
Nodes (23): main(), scalar(), assertCodexDowngradeSafe(), backfillOrchestrator(), countRows(), createDatabase(), EXECUTION_MIGRATIONS, hasColumn() (+15 more)

### Community 16 - "Stats Aggregation"
Cohesion: 0.14
Nodes (16): RecordingSystemAdapter, dryRunLog, FAKE_OPEN_PRS, fakeEncoder, GitWorktreeAddOptions, ImportNotionOptions, PaneSize, PrepareReviewWorktreeOptions (+8 more)

### Community 17 - "Triage & Server Hub"
Cohesion: 0.08
Nodes (25): devDependencies, autoprefixer, class-variance-authority, clsx, concurrently, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities (+17 more)

### Community 18 - "Live Terminal Views"
Cohesion: 0.09
Nodes (30): BASH_ALLOWLIST, buildFeasibilitySessionConfig(), buildImplementSessionConfig(), buildSplitSessionConfig(), buildTriageSessionConfig(), CODEX_READONLY_TOOLS, codexImplementerKnobs(), codexKnobs() (+22 more)

### Community 19 - "Stage Progress & Display"
Cohesion: 0.08
Nodes (24): compilerOptions, allowImportingTsExtensions, baseUrl, esModuleInterop, isolatedModules, jsx, lib, module (+16 more)

### Community 20 - "Real Adapter GH/Composer"
Cohesion: 0.08
Nodes (35): FAILURE_COLUMNS, Kind, KINDS, SUCCESS_COLUMNS, agentEffortSchema, codexEffortSchema, codexModelSchema, DurationChart() (+27 more)

### Community 21 - "Store Types & Agent Knobs"
Cohesion: 0.21
Nodes (22): buildAskContract(), buildCleanContract(), buildConflictResolutionContract(), buildFeasibilityContextSection(), buildImplementingSteps(), buildMockupReviewStep(), buildPlanningStep(), buildPrdBullet() (+14 more)

### Community 22 - "DB Row Schemas & Mappers"
Cohesion: 0.14
Nodes (19): isProcessing(), ACTIVE_STAGES, COLUMN_LABELS, COLUMN_ORDER, COLUMNS, ACTIVE_COLUMNS, Board(), isColumn() (+11 more)

### Community 23 - "Dev Dependencies"
Cohesion: 0.09
Nodes (20): NewTicket, TicketCreationRequestConflictError, AnalyzeTicketRejectionReason, AnalyzeTicketsResult, createTicketOperations(), CreateTodoTicketInput, createTodoTicketInputSchema, CreateTodoTicketResult (+12 more)

### Community 24 - "TypeScript Config"
Cohesion: 0.14
Nodes (22): bashCommandSchema, buildSettings(), claudeProvider, createSdkAgentSession(), denyBashHook(), denyNoVerifyHook, denyReviewPublishingHook, denyTypecheckHook() (+14 more)

### Community 25 - "Client Hub & Watchdog"
Cohesion: 0.19
Nodes (8): agentPairError(), FeasibilityStarter, isProcessing(), normalizeCreateInput(), ticketDependencyError(), TicketOperations, isAllowedAgentPair(), deriveTitleFromDescription()

### Community 26 - "Cost & Pricing"
Cohesion: 0.07
Nodes (25): BoundedCommandResult, CLAUDE_JSON_PATH, COMPOSER_BINARIES, detectInstallCommand(), extractPrUrl(), ghPrHeadSchema, ghPrSchema, ghPrStateSchema (+17 more)

### Community 27 - "Workflow View & Lifecycle"
Cohesion: 0.06
Nodes (27): Architecture, Commands, Conventions (enforced — beyond the global ones in ~/.claude/CLAUDE.md), graphify, The dry-run safety model — read before running anything, What this is, Agent runtime (Agent SDK), Architecture (+19 more)

### Community 28 - "Stats Charts"
Cohesion: 0.07
Nodes (39): agentMessageDeltaSchema, agentToml(), buildMcpServers(), ConfigObject, configReadResponseSchema, ConfigValue, describeCodexError(), emptyResponseSchema (+31 more)

### Community 30 - "Agents View & Ticket Cards"
Cohesion: 0.06
Nodes (4): RouteDeps, SystemAdapter, UserTerminalManager, TerminalDescriptor

### Community 31 - "PRD Review & Markdown"
Cohesion: 0.05
Nodes (40): CodexAppServerConnection, CodexAppServerInitializationError, CodexAppServerNotification, CodexAppServerOptions, CodexAppServerProtocolError, CodexAppServerRpcError, connectCodexAppServer(), incomingSchema (+32 more)

### Community 32 - "User Terminal & Fake IO"
Cohesion: 0.07
Nodes (45): Profile, McpSettings(), DragHandleAttributes, DragHandleListeners, ProfileRowHeader(), ProfileRowHeaderProps, ProfileRowProps, ProfilesSettings() (+37 more)

### Community 33 - "Logging"
Cohesion: 0.10
Nodes (21): scripts, build:desktop, build:web, dev, dev:desktop, dev:proxy, dev:server, dev:web (+13 more)

### Community 34 - "Board Columns"
Cohesion: 0.33
Nodes (9): useTheme(), UseThemeResult, applyTheme(), getStoredTheme(), isTheme(), Theme, ThemeOption, THEMES (+1 more)

### Community 36 - "Runtime Dependencies"
Cohesion: 0.18
Nodes (17): COLUMN_SORT_FIELD, BoardColumn(), compareFamilyMembers(), familyKeyOf(), groupTicketIds(), groupTicketsByFamily(), isSplitMother(), readCollapsed() (+9 more)

### Community 37 - "Claude SDK Provider"
Cohesion: 0.09
Nodes (23): dependencies, @anthropic-ai/claude-agent-sdk, dompurify, elysia, @fontsource/ibm-plex-mono, @fontsource/ibm-plex-sans, marked, @modelcontextprotocol/sdk (+15 more)

### Community 39 - "Agent Coordinator Handlers"
Cohesion: 0.10
Nodes (28): artifactPath, assertPackageVersionInSync(), assertSdkVersionsInSync(), BUILT_DMG, ELECTROBUN_BIN, fail(), installedPackageVersion(), RELEASE_FOLDER (+20 more)

### Community 40 - "API Client Inputs"
Cohesion: 0.15
Nodes (11): buildFeasibilityBatchContract(), cleanTicket(), conflictTicket(), REVIEW_OPTS, reviewTicket(), TICKET_OPTS, truncateDescription(), createdPaths (+3 more)

### Community 41 - "Ticket Config & Constants"
Cohesion: 0.21
Nodes (19): applySizes(), collectTerminalIds(), findLeaf(), firstLeafId(), LeafNode, leafNodeSchema, makeLeaf(), nextNodeId() (+11 more)

### Community 43 - "Demo Pipeline Concepts"
Cohesion: 0.17
Nodes (29): ExecutionOverrides, AgentEffort, AgentModel, CodexEffort, CodexModel, Implementer, Orchestrator, AgentProfileConfig() (+21 more)

### Community 44 - "Chart Primitives"
Cohesion: 0.08
Nodes (38): TERMINAL_STAGES, AgentCard(), AgentCardProps, AgentsView(), AgentsViewProps, hasLiveAgent(), normalize(), FILLED_GLYPH_COLORS (+30 more)

### Community 45 - "Session Hub Transcript"
Cohesion: 0.12
Nodes (22): TICKET_TAB_LABELS, TicketTab, TicketTabs(), TicketTabsProps, availableTabs(), hasSessionPane(), initialTab(), isLocked() (+14 more)

### Community 46 - "Community 46"
Cohesion: 0.27
Nodes (15): Agent Implementation Config, Argus Code Review, Automated Tests (typecheck/lint/test), Claude Code Autonomous Agent, Ticket Contract Injection, Feasibility Analysis, Kanban Board (Atelier), Kanban Agents Demo (demo.gif) (+7 more)

### Community 47 - "Modal Dialogs"
Cohesion: 0.23
Nodes (17): AGENT_EFFORT_FULL_LABELS, AGENT_MODEL_FULL_LABELS, CODEX_EFFORT_FULL_LABELS, ProfileConfig, ProfilePipeline(), buildProfilePipeline(), claudeDetail(), claudeSubagentDetail() (+9 more)

### Community 48 - "Community 48"
Cohesion: 0.24
Nodes (8): effectivePort(), isAllowedHost(), isAllowedOrigin(), isAuthorized(), isLoopbackHost(), jsonResponse(), parseHost(), PublicMcpManager

### Community 49 - "Slot State"
Cohesion: 0.12
Nodes (12): log, log, initProjectRegistry(), paths, ClientHub, ClientSocket, ClientSocketData, NativeNotify (+4 more)

### Community 50 - "Stats Hooks & Cards"
Cohesion: 0.16
Nodes (12): ChartConfig, ChartContainer, ChartContainerProps, ChartContext, ChartContextValue, ChartLegendContent(), ChartLegendContentProps, ChartTooltipContent() (+4 more)

### Community 52 - "chart.tsx"
Cohesion: 0.13
Nodes (5): assertCodexImplementerAvailable(), SlotManager, enrichWorktreeSession(), failSplitMother(), performSplit()

### Community 53 - "User Terminal Manager"
Cohesion: 0.33
Nodes (5): CONTEXT — domain glossary, Execution, Proposed (not yet built), Seams, Work items

### Community 54 - "Community 54"
Cohesion: 0.10
Nodes (28): AGENT_EFFORT_LABELS, AGENT_MODEL_LABELS, CODEX_EFFORT_LABELS, CODEX_MODEL_LABELS, CommentAuthor, FEASIBILITY_ENGINE_LABELS, FEASIBILITY_ENGINES, FeasibilityEngine (+20 more)

### Community 55 - "App.tsx"
Cohesion: 0.14
Nodes (5): startFeasibilityTicket(), FeasibilityBatchManager, toTriageResult(), ReformulateManager, Watchdog

### Community 56 - "CSV Parsing"
Cohesion: 0.08
Nodes (6): setup(), mergeAgentUsageByModel(), SessionHub, SessionHubHandlers, SessionStartCallbacks, getErrorStack()

### Community 57 - "Community 57"
Cohesion: 0.07
Nodes (32): applyDesktopEnv(), DesktopRoots, ensureConfig(), ensureMcpToken(), regenerateMcpToken(), temporaryDirectories, boot(), externalUrlFromNewWindowEvent() (+24 more)

### Community 59 - "triageManager.ts"
Cohesion: 0.15
Nodes (22): buildSplitChannelPrompt(), buildTicketLines(), isEnglish(), buildContractConstraintsLines(), buildResponseFormatLines(), buildStrictRulesLines(), buildTicketLines(), buildTriageChannelPrompt() (+14 more)

### Community 60 - "Package Manifest"
Cohesion: 0.11
Nodes (17): ActiveDelegation, ActiveReview, ActiveReviewPass, ClosableExecution, log, orderedReviewKinds(), renderPersistedReviewResult(), REVIEW_DISALLOWED_TOOLS (+9 more)

### Community 61 - "splitManager.ts"
Cohesion: 0.26
Nodes (6): resolveBaseBranch(), DRY_RUN_VERDICT, log, TriageManager, TriageSession, TriageResult

### Community 63 - "Community 63"
Cohesion: 0.08
Nodes (24): AttachExecutionSessionInput, AutomationPatch, EnqueueAgentMessageInput, FinalizeExecutionInput, MarkAgentMessageAcceptedInput, MarkAgentMessageReceivedInput, MarkAgentMessageRejectedInput, NewAsk (+16 more)

### Community 64 - "Composer Run Script"
Cohesion: 0.16
Nodes (7): AckSystem, RecordingSystem, RecordedSession, RecordingSystem, RelaunchSystem, AgentSessionHandle, AgentSessionOptions

### Community 65 - "split.ts"
Cohesion: 0.14
Nodes (21): assertExecutionAvailable(), CODEX_LAUNCH_STATUS_MESSAGES, CodexCapabilityReader, ExecutionDefaults, FEASIBILITY_ENGINE_EXECUTION, ResolvedExecution, resolveExecution(), resolveFeasibilityExecution() (+13 more)

### Community 66 - "OpenPr"
Cohesion: 0.24
Nodes (13): AppSettings, UpdateAppSettingsInput, AgentDefaultsSettings(), AppSettingsState, flashSaved(), loadOnce(), patchAppSettings(), publish() (+5 more)

### Community 67 - "UserTerminalManager"
Cohesion: 0.20
Nodes (8): Block, blockText(), compactChunks(), firstCharCode(), TranscriptBuffer, trimBlockStart(), AgentStreamBlock, TranscriptUpdate

### Community 68 - "schema.test.ts"
Cohesion: 0.21
Nodes (15): PrdAnnotator(), PrdAnnotatorProps, BREADCRUMB, NO_ANNOTATIONS, PrdReviewDialog(), PrdReviewDialogProps, AnnotatedHtml, compileFeedback() (+7 more)

### Community 69 - "contract.test.ts"
Cohesion: 0.13
Nodes (24): dedupeFindings(), DimensionFinding, findingAnchor(), FRENCH_STOP_WORD_PATTERN, FRENCH_STOP_WORDS, hasSimilarSummary(), isSameDefect(), isSelfRefuting() (+16 more)

### Community 70 - "CodexRuntimeStatus"
Cohesion: 0.07
Nodes (25): PROJECT_ROOT, NOTE: PRD generation holds the request open up to ~120s (REFORMULATE_TIMEOUT_MS), resolveDataFile(), resolveServerPort(), RunningServer, serveStaticAsset(), SocketData, startServer() (+17 more)

### Community 71 - "PostCSS Config"
Cohesion: 0.29
Nodes (6): name, overrides, zod, private, type, version

### Community 72 - "App.tsx"
Cohesion: 0.15
Nodes (20): ColumnActionsMenu(), ColumnActionsMenuProps, ColumnMenuItem, ActionContext, buildActions(), ConfirmSpec, errorMessage(), RETRY_STAGES (+12 more)

### Community 74 - "button.tsx"
Cohesion: 0.19
Nodes (11): QuitConfirmModal(), QuitConfirmModalProps, TerminalsView(), AlertDialog(), AlertDialogProps, Button, ButtonProps, buttonVariants (+3 more)

### Community 75 - "FakePaneStream"
Cohesion: 0.18
Nodes (12): FULL_REVIEW_KINDS, LIGHT_REVIEW_KINDS, passDimensionFindings(), publishedReviewFindings(), requiredReviewKinds(), log, ReclaimOutcome, reviewPublicationState() (+4 more)

### Community 76 - "usePrdSearch.ts"
Cohesion: 0.14
Nodes (20): isCodexFastServiceTier(), costByFamily(), costOf(), costOfModel(), costOfSessions(), CostSummary, FamilyPricing, ModelFamily (+12 more)

### Community 78 - "csv.ts"
Cohesion: 0.07
Nodes (51): RFC-4180, ProjectInfo, App(), HOME_VIEW_OPTIONS, HomeView, AskPanelProps, AutomationView(), CleanPrPanelProps (+43 more)

### Community 79 - "WorktreeSession"
Cohesion: 0.33
Nodes (3): listeners, mcp, ReplyArgsSchema

### Community 80 - "recordedAction.ts"
Cohesion: 0.23
Nodes (17): alternation(), COMMAND_WRAPPERS, commandSegments(), commandWords(), executableName(), launchedPackageScript(), launchesTypecheck(), OPTIONS_WITH_VALUE (+9 more)

### Community 81 - "terminalManager.ts"
Cohesion: 0.31
Nodes (13): abortReason(), computeCodeFingerprint(), FingerprintEntry, FingerprintPhase, hashFingerprintPaths(), isMissingFileError(), listFingerprintPaths(), log (+5 more)

### Community 86 - "TicketCost.tsx"
Cohesion: 0.09
Nodes (27): OpenPr, PrSelectRow(), PrSelectRowProps, ProviderRow(), NAV_ENTRIES, NavEntry, Sidebar(), SidebarProps (+19 more)

### Community 87 - "TerminalView.tsx"
Cohesion: 0.20
Nodes (6): FailedReformulation, ActionSystem, AgentProvider, AgentSessionEvent, runOneShotSession(), ReformulateOptions

### Community 89 - "usePrdSearch.ts"
Cohesion: 0.26
Nodes (9): applyTranscriptUpdate(), TranscriptState, transcriptText(), transcriptUpdateSchema, FullscreenToggle(), FullscreenToggleProps, TerminalData, TerminalView() (+1 more)

### Community 90 - "useProjects.ts"
Cohesion: 0.27
Nodes (11): groupOrientation(), layoutToSizes(), panelId(), panelPercent(), SplitTree(), SplitTreeProps, SplitOrientation, isShortcutDetail() (+3 more)

### Community 91 - "AgentsView.tsx"
Cohesion: 0.31
Nodes (5): DRY_RUN_RESULT, log, PendingSplit, SplitManager, SplitResult

### Community 92 - "ProjectConfig"
Cohesion: 0.27
Nodes (9): NOTE: Radix's dismissable layer registers its Escape listener on `document` in t, useCaptureEscape(), collectMatchRanges(), isShortcutDetail(), ShortcutDetail, supportsHighlightApi(), usePrdSearch(), UsePrdSearchOptions (+1 more)

### Community 93 - "ColumnActionsMenu.tsx"
Cohesion: 0.29
Nodes (3): renderCollapsedFinding(), renderFinding(), ReviewReportLabels

### Community 94 - ".addComment"
Cohesion: 0.07
Nodes (3): nullableBooleanValue(), Store, runRecordedAction()

### Community 95 - "TicketConfigSummary.tsx"
Cohesion: 0.50
Nodes (3): appBundle, EMBEDDED_BINARIES, resourcesApp

### Community 97 - "RunningServer"
Cohesion: 0.06
Nodes (24): SessionToolCall, appendToLogFile(), disableFileLogging(), initLogFile(), Logger, openLogStream(), paint(), rotateLogFile() (+16 more)

### Community 98 - "triageManager.ts"
Cohesion: 0.12
Nodes (20): groupFeasibilityTickets(), computeWorktreeAddresses(), log, SlotWatch, log, runFirstBootSetup(), applyAppSettingsToModels(), DEFAULT_MODELS (+12 more)

### Community 99 - "reviewPublishingGuard.ts"
Cohesion: 0.24
Nodes (10): GH_API_READ_METHOD_SET, GH_API_READ_METHODS, GH_API_WRITE_INPUT_PATTERN, GH_API_WRITE_LONG_FLAGS, GH_API_WRITE_METHODS, GH_API_WRITE_SHORT_FLAGS, GH_PR_PUBLISH_PATTERN, GH_PR_PUBLISH_SUBCOMMANDS (+2 more)

### Community 100 - "coordinator.ts"
Cohesion: 0.33
Nodes (5): log, logRejection(), ToolHandler, ToolResult, TicketPatch

### Community 101 - "codexProvider.test.ts"
Cohesion: 0.11
Nodes (8): createCodexAgentSession(), createCodexProvider(), PreparedHook, AppServerFixture, AppServerFixtureOptions, hookPathForSession(), RecordedRequest, waitFor()

### Community 102 - "DescriptionTab.tsx"
Cohesion: 0.13
Nodes (31): AskPanel(), CleanPrPanel(), CodexConnectionStatus(), STATUS_LABELS, ProjectPrPicker(), ProjectPrPickerProps, ReviewPrPanel(), SessionDriverFields() (+23 more)

### Community 103 - "TerminalSession"
Cohesion: 0.10
Nodes (13): PaneStream, dataMessage(), log, normalizeSeed(), safeParse(), send(), TerminalSession, TerminalSessionManager (+5 more)

### Community 104 - "AutomationView.tsx"
Cohesion: 0.14
Nodes (15): AUTOMATION_TRIGGER_LABELS, AUTOMATION_TRIGGERS, AutomationRunStatus, AutomationTrigger, AutomationRun, CreateAutomationInput, AutomationCard(), AutomationCardProps (+7 more)

### Community 105 - ".finishTicket"
Cohesion: 0.14
Nodes (18): CompactTicket, Column, Ticket, BoardProps, BoardColumnProps, TerminalColumnsPanelProps, DescriptionTabProps, PrdTabProps (+10 more)

### Community 106 - "nvmNode.ts"
Cohesion: 0.17
Nodes (10): CHILD_USAGE, FULL_REVIEW_KINDS, LIGHT_REVIEW_KINDS, newDelegatedTicket(), newReviewTicket(), RecordedSession, setup(), sleep() (+2 more)

### Community 107 - "isNotionUrl"
Cohesion: 0.33
Nodes (5): featureBranch(), slugify(), createSplitChildren(), splitChildDefaults(), splitMotherBranch()

### Community 109 - "nvmNode.ts"
Cohesion: 0.23
Nodes (9): gitMetadataWritableRoots(), agentBaseEnv(), bestInstalledMatch(), compareParts(), envWithProjectNode(), nvmNodeBinDir(), readNvmrc(), prepareProjectShell() (+1 more)

### Community 110 - "Profile"
Cohesion: 0.11
Nodes (6): SqlUpdateBuilder, migrateConfigJsonIfPresent(), createApiRoutes(), isBlocked(), isSplitMother(), PaneReader

### Community 111 - ".start"
Cohesion: 0.22
Nodes (11): columnSchema, MetaRow(), MetaRowProps, STATUS_CONFIRMS, StatusConfirm, statusTitle(), TicketMeta(), resolveProjectLabel() (+3 more)

### Community 114 - "createMcpServer"
Cohesion: 0.53
Nodes (5): createMcpServer(), invalidInput(), OutputValidator, toolError(), toolResult()

### Community 115 - "useLocalDraft.ts"
Cohesion: 0.08
Nodes (36): ActivityTab(), isUnanswered(), NO_COMMENT_COLUMNS, AUTHOR_BADGES, AuthorBadge(), CommentRow(), DescriptionEdit, DescriptionTab() (+28 more)

### Community 121 - "TicketMeta.tsx"
Cohesion: 0.05
Nodes (35): buildNotionImportPrompt(), buildPrdPrompt(), ProjectInUseError, cleanDescription(), isWebOnlyPath(), jsonError(), log, reviewDescription() (+27 more)

### Community 122 - "performSplit"
Cohesion: 0.12
Nodes (27): ExecutionFinishStatus, LiveSession, log, PendingSessionMessage, previewToolInput(), renderChannelEvent(), renderImplementationDone(), renderSessionEvent() (+19 more)

## Knowledge Gaps
- **675 isolated node(s):** `PROJECT_ROOT`, `WEB_DIST_SUBPATH`, `StartServerOptions`, `SocketData`, `STATIC_CONTENT_TYPES` (+670 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **33 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `SlotManager` connect `chart.tsx` to `coordinator.ts`, `FakePaneStream`, `Coordinator & Protocol`, `Slot State`, `Dev Dependencies`, `Store Types & Agent Knobs`, `Agents View & Ticket Cards`, `TicketCard.tsx`, `TicketMeta.tsx`, `.addComment`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **Why does `Store` connect `.addComment` to `Desktop Bootstrap & Menus`, `Coordinator & Protocol`, `Store Types & Agent Knobs`, `Dev Dependencies`, `Agents View & Ticket Cards`, `NPM Scripts`, `Agent Profile Config`, `API Client Inputs`, `Slot State`, `chart.tsx`, `App.tsx`, `CSV Parsing`, `splitManager.ts`, `TicketCard.tsx`, `Community 63`, `split.ts`, `FakePaneStream`, `usePrdSearch.ts`, `AgentsView.tsx`, `triageManager.ts`, `coordinator.ts`, `TerminalSession`, `nvmNode.ts`, `Profile`, `TicketMeta.tsx`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Why does `RealSystemAdapter` connect `API Routes & Reformulate` to `RunningServer`, `triageManager.ts`, `codexProvider.test.ts`, `Board & Sidebar Layout`, `nvmNode.ts`, `Cost & Pricing`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `createApiRoutes()` (e.g. with `isWebOnlyPath()` and `.onEvent()`) actually correct?**
  _`createApiRoutes()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `PROJECT_ROOT`, `WEB_DIST_SUBPATH`, `StartServerOptions` to the rest of the system?**
  _686 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Contract Building & Slots` be split into smaller, more focused modules?**
  _Cohesion score 0.02846441947565543 - nodes in this community are weakly interconnected._
- **Should `Terminals UI & Notifications` be split into smaller, more focused modules?**
  _Cohesion score 0.09090909090909091 - nodes in this community are weakly interconnected._