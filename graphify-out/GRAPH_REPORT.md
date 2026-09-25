# Graph Report - kanban-agents  (2026-09-25)

## Corpus Check
- 276 files · ~752,144 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3095 nodes · 8597 edges · 128 communities (113 shown, 15 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 59 edges (avg confidence: 0.67)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2320cbc7`
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
- TicketOperations
- Community 83
- useTickTimer.ts
- codexBinary.ts
- usePrdSearch.ts
- nvmNode.ts
- .onMessageStatus
- WorktreeAddressWatcher
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
- createMcpServer
- usePrdSearch.ts
- azureRemote.ts
- oneShotSession.ts
- projectDisplay.ts
- Profile
- isProcessing
- prd.ts
- reformulate.ts
- ApiDenyPatterns
- isNotionUrl
- settings.tsx
- TicketMeta.tsx
- notionImport.ts
- delegationManager.test.ts
- reformulate.ts
- WorktreeAddressWatcher
- performSplit
- RealPaneStream
- TerminalDescriptor
- .handleMessage
- isProcessing
- slotTemplates.ts

## God Nodes (most connected - your core abstractions)
1. `Store` - 128 edges
2. `Ticket` - 114 edges
3. `cn()` - 81 edges
4. `SystemAdapter` - 76 edges
5. `createApiRoutes()` - 74 edges
6. `FakeSystemAdapter` - 68 edges
7. `RealSystemAdapter` - 66 edges
8. `SlotManager` - 56 edges
9. `VcsProvider` - 54 edges
10. `ProjectInfo` - 52 edges

## Surprising Connections (you probably didn't know these)
- `McpSettingsClient` --references--> `McpSettingsMetadata`  [EXTRACTED]
  src/web/src/lib/mcpSettings.ts → desktop/mcpRpc.ts
- `main()` --calls--> `migrateCodexCatalog()`  [EXTRACTED]
  scripts/downgrade-codex-catalog.ts → src/server/db/schema.ts
- `main()` --calls--> `assertCodexDowngradeSafe()`  [EXTRACTED]
  scripts/downgrade-codex-catalog.ts → src/server/db/schema.ts
- `StageProgressBarProps` --references--> `Ticket`  [EXTRACTED]
  src/web/src/components/StageProgressBar.tsx → src/shared/schemas.ts
- `TerminalTabProps` --references--> `Ticket`  [EXTRACTED]
  src/web/src/components/ticket-detail/TerminalTab.tsx → src/shared/schemas.ts

## Import Cycles
- None detected.

## Communities (128 total, 15 thin omitted)

### Community 0 - "Contract Building & Slots"
Cohesion: 0.03
Nodes (95): buildNotionImportPrompt(), buildPrdPrompt(), buildReformulatePrompt(), log, ActionExecutionOptions, actionExecutionOptionsSchema, agentMessageSchema, AnalyzeTicketsInput (+87 more)

### Community 1 - "Terminals UI & Notifications"
Cohesion: 0.10
Nodes (20): analyzeTicketsInputSchema, analyzeTicketsOutputSchema, columnSchema, compactTicketSchema, createTodoTicketOutputSchema, editableTicketSchema, listProjectsInputSchema, listProjectsOutputSchema (+12 more)

### Community 2 - "Desktop Bootstrap & Menus"
Cohesion: 0.10
Nodes (17): createCodexAgentSession(), inheritedMcpServerNames(), PreparedHook, prepareSkills(), threadConfig(), accountResponseSchema, hasExplicitCodexApiKey(), isProtocolIncompatibility() (+9 more)

### Community 3 - "Feasibility Batch Management"
Cohesion: 0.05
Nodes (43): SessionToolCall, directories, initializeParamsSchema, log, requestSchema, rpcError(), rpcResult(), rpcResponseSchema (+35 more)

### Community 4 - "Ticket Action Panels"
Cohesion: 0.14
Nodes (23): ReviewResult, ALSO_FLAGGED_PREFIX, dedupeFindings(), DimensionFinding, findingAnchor(), FRENCH_STOP_WORD_PATTERN, FRENCH_STOP_WORDS, hasSimilarSummary() (+15 more)

### Community 5 - "Fake System Adapter"
Cohesion: 0.07
Nodes (40): runBoundedCommand(), safeJsonParse(), escapeHtml(), renderCollapsedDetails(), renderOutsideDiffComment(), renderOutsideDiffSection(), ReviewPublicationComment, ReviewPublicationEvent (+32 more)

### Community 7 - "Settings & Profiles UI"
Cohesion: 0.07
Nodes (5): FailedReformulation, delay(), fakeShellPrompt(), FakeSystemAdapter, hexToBytes()

### Community 8 - "PR Selection & Slots Bar"
Cohesion: 0.10
Nodes (28): FILLED_GLYPH_COLORS, StageProgressBar(), StageProgressBarProps, formatErrorDetails(), OverviewTab(), OverviewTabProps, SUMMARY_COLUMNS, PrdTab() (+20 more)

### Community 9 - "Real System Adapter"
Cohesion: 0.05
Nodes (53): AZURE_COMMANDS, COMMANDS_BY_PROVIDER, GITHUB_COMMANDS, PrDiffContext, VcsCleanCommands, AZ_SETTLED_THREAD_STATUSES, VCS_PROVIDER_LABELS, AppSettings (+45 more)

### Community 10 - "Slot Config & Worktree Watch"
Cohesion: 0.15
Nodes (21): main(), scalar(), assertCodexDowngradeSafe(), backfillOrchestrator(), countRows(), createDatabase(), EXECUTION_MIGRATIONS, hasColumn() (+13 more)

### Community 11 - "Core Domain Concepts"
Cohesion: 0.04
Nodes (50): agentMessageRowSchema, AutomationRow, automationRowSchema, AutomationRunRow, automationRunRowSchema, buildScripts(), CommentRow, commentRowSchema (+42 more)

### Community 12 - "Board & Sidebar Layout"
Cohesion: 0.06
Nodes (8): detectInstallCommand(), realpathSafe(), RealSystemAdapter, resolveWorktreeScriptCommand(), setupOutputExcerpt(), shQuote(), DoneGateResult, VcsProvider

### Community 13 - "Database Store Operations"
Cohesion: 0.09
Nodes (44): RFC-4180, ProjectInfo, AgentsViewProps, AskPanel(), AskPanelProps, CleanPrPanel(), CleanPrPanelProps, ImportTicketsPanel() (+36 more)

### Community 14 - "Coordinator & Protocol"
Cohesion: 0.15
Nodes (9): assertCodexImplementerAvailable(), log, ReclaimOutcome, reviewPublicationState(), SETUP_PHASES, SlotManagerConfig, spawnCodexAppServer(), getErrorStack() (+1 more)

### Community 15 - "API Routes & Reformulate"
Cohesion: 0.11
Nodes (13): CodexAppServerInitializationError, CodexAppServerProtocolError, CodexAppServerRpcError, connectCodexAppServer(), incomingSchema, initializeResponseSchema, log, PendingRequest (+5 more)

### Community 16 - "Stats Aggregation"
Cohesion: 0.07
Nodes (5): startParentSession(), mergeAgentUsageByModel(), SessionHub, SessionHubHandlers, SessionStartCallbacks

### Community 17 - "Triage & Server Hub"
Cohesion: 0.08
Nodes (25): devDependencies, autoprefixer, class-variance-authority, clsx, concurrently, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities (+17 more)

### Community 18 - "Live Terminal Views"
Cohesion: 0.08
Nodes (33): AZURE_BASH_ALLOWLIST, AZURE_CLEAN_BASH_ALLOWLIST, BASH_ALLOWLIST, bashAllowlist(), buildFeasibilitySessionConfig(), buildImplementSessionConfig(), buildTriageSessionConfig(), CODEX_READONLY_TOOLS (+25 more)

### Community 19 - "Stage Progress & Display"
Cohesion: 0.08
Nodes (24): compilerOptions, allowImportingTsExtensions, baseUrl, esModuleInterop, isolatedModules, jsx, lib, module (+16 more)

### Community 20 - "Real Adapter GH/Composer"
Cohesion: 0.09
Nodes (32): FAILURE_COLUMNS, Kind, KINDS, SUCCESS_COLUMNS, DurationChart(), SuccessRateChart(), ThroughputChart(), effectiveWorkDurationMs() (+24 more)

### Community 21 - "Store Types & Agent Knobs"
Cohesion: 0.15
Nodes (32): buildAskContract(), buildCleanContract(), buildConflictResolutionContract(), buildFeasibilityBatchContract(), buildFeasibilityContextSection(), buildImplementingSteps(), buildMockupReviewStep(), buildPlanningStep() (+24 more)

### Community 22 - "DB Row Schemas & Mappers"
Cohesion: 0.07
Nodes (42): AUTOMATION_TRIGGER_LABELS, AUTOMATION_TRIGGERS, AutomationTrigger, CreateAutomationInput, AutomationCard(), AutomationCardProps, AutomationFormProps, EMPTY_FORM (+34 more)

### Community 23 - "Dev Dependencies"
Cohesion: 0.11
Nodes (16): NewTicket, TicketCreationRequestConflictError, AnalyzeTicketRejectionReason, AnalyzeTicketsResult, CreateTodoTicketInput, createTodoTicketInputSchema, CreateTodoTicketResult, log (+8 more)

### Community 24 - "TypeScript Config"
Cohesion: 0.13
Nodes (23): bashCommandSchema, buildSettings(), claudeProvider, createSdkAgentSession(), denyBashHook(), denyNoVerifyHook, denyReviewPublishingHook, denyTypecheckHook() (+15 more)

### Community 25 - "Client Hub & Watchdog"
Cohesion: 0.28
Nodes (13): abortReason(), computeCodeFingerprint(), FingerprintEntry, FingerprintPhase, hashFingerprintPaths(), isMissingFileError(), listFingerprintPaths(), log (+5 more)

### Community 26 - "Cost & Pricing"
Cohesion: 0.17
Nodes (19): COLUMN_SORT_FIELD, BoardColumn(), compareFamilyMembers(), familyKeyOf(), groupTicketIds(), groupTicketsByFamily(), isSplitMother(), readCollapsed() (+11 more)

### Community 27 - "Workflow View & Lifecycle"
Cohesion: 0.06
Nodes (28): Architecture, Commands, Conventions (enforced — beyond the global ones in ~/.claude/CLAUDE.md), graphify, The dry-run safety model — read before running anything, What this is, Agent runtime (Agent SDK), Architecture (+20 more)

### Community 28 - "Stats Charts"
Cohesion: 0.07
Nodes (42): AgentMcpServerDefinition, agentMessageDeltaSchema, agentToml(), apiWriteDenyScript(), buildMcpServers(), ConfigObject, configReadResponseSchema, ConfigValue (+34 more)

### Community 29 - "Session Hub & Agent Session"
Cohesion: 0.14
Nodes (6): CodexAppServerConnection, CodexAppServerNotification, CodexAppServerOptions, CodexProviderDependencies, AppServerFixture, CodexRuntimeDependencies

### Community 30 - "Agents View & Ticket Cards"
Cohesion: 0.11
Nodes (27): AgentCard(), AgentCardProps, AgentsView(), hasLiveAgent(), normalize(), KIND_BADGES, TicketBadges(), TicketBadgesProps (+19 more)

### Community 31 - "PRD Review & Markdown"
Cohesion: 0.12
Nodes (14): Block, blockText(), compactChunks(), firstCharCode(), TranscriptBuffer, trimBlockStart(), AgentStreamBlock, createCodexProvider() (+6 more)

### Community 32 - "User Terminal & Fake IO"
Cohesion: 0.08
Nodes (36): AckSystem, ActiveDelegation, ActiveReview, ClosableExecution, RecordedSession, RecordingSystem, ExecutionFinishStatus, LiveSession (+28 more)

### Community 33 - "Logging"
Cohesion: 0.10
Nodes (21): scripts, build:desktop, build:web, dev, dev:desktop, dev:proxy, dev:server, dev:web (+13 more)

### Community 34 - "Board Columns"
Cohesion: 0.14
Nodes (14): LaunchForm(), TICKET_OPTION, TicketOptionsToggleGroup(), TicketOptionsToggleGroupProps, TicketOptionValues, Select, ToggleGroup, ToggleGroupContext (+6 more)

### Community 36 - "Runtime Dependencies"
Cohesion: 0.06
Nodes (41): mapAgentMessageRow(), mapCommentRow(), mapTicketCreationRequestRow(), AttachExecutionSessionInput, AutomationPatch, EnqueueAgentMessageInput, FinalizeExecutionInput, MarkAgentMessageAcceptedInput (+33 more)

### Community 37 - "Claude SDK Provider"
Cohesion: 0.09
Nodes (23): dependencies, @anthropic-ai/claude-agent-sdk, dompurify, elysia, @fontsource/ibm-plex-mono, @fontsource/ibm-plex-sans, marked, @modelcontextprotocol/sdk (+15 more)

### Community 38 - "Agent Profile Config"
Cohesion: 0.18
Nodes (5): AutomationManager, mapAutomationRow(), mapAutomationRunRow(), Automation, AutomationRun

### Community 39 - "Agent Coordinator Handlers"
Cohesion: 0.17
Nodes (18): adopt(), compareVersions(), configureClaudeProvisionDir(), detectionCandidates(), detectUserInstall(), downloadAndVerifyTarball(), downloadPinnedBinary(), emitProgress() (+10 more)

### Community 40 - "API Client Inputs"
Cohesion: 0.11
Nodes (9): childTranscriptPrefix(), DelegationManager, reviewKey(), dedupeIdenticalFindings(), allowedReviewPasses(), mapReviewApprovalRow(), mapReviewPassRow(), parsePersistedReviewFindings() (+1 more)

### Community 41 - "Ticket Config & Constants"
Cohesion: 0.13
Nodes (23): isProcessing(), ACTIVE_STAGES, ColumnActionsMenu(), ColumnActionsMenuProps, ColumnMenuItem, ActionContext, buildActions(), ConfirmSpec (+15 more)

### Community 42 - "Ticket Detail & Triage UI"
Cohesion: 0.11
Nodes (23): ACTIVE_BAR, AREA_CURSOR, AXIS_PROPS, BAR_CURSOR, CHART_PALETTE, CodexTierSummary(), colorAt(), CostSummary() (+15 more)

### Community 43 - "Demo Pipeline Concepts"
Cohesion: 0.23
Nodes (9): dataMessage(), log, normalizeSeed(), send(), TerminalSocket, TerminalSocketData, visibleText(), terminalClientMessageSchema (+1 more)

### Community 44 - "Chart Primitives"
Cohesion: 0.22
Nodes (4): McpTokenSource, createMcpSettingsController(), McpSettingsControllerDependencies, temporaryDirectories

### Community 45 - "Session Hub Transcript"
Cohesion: 0.15
Nodes (10): featureBranch(), SlotManager, slugify(), mapSlotRow(), mapWorktreeSessionRow(), enrichWorktreeSession(), TicketOperationsDeps, getErrorMessage() (+2 more)

### Community 46 - "Community 46"
Cohesion: 0.27
Nodes (15): Agent Implementation Config, Argus Code Review, Automated Tests (typecheck/lint/test), Claude Code Autonomous Agent, Ticket Contract Injection, Feasibility Analysis, Kanban Board (Atelier), Kanban Agents Demo (demo.gif) (+7 more)

### Community 48 - "Community 48"
Cohesion: 0.11
Nodes (14): mapProfileRow(), nullableBooleanValue(), cleanDescription(), createApiRoutes(), isBlocked(), isSplitMother(), isWebOnlyPath(), jsonError() (+6 more)

### Community 49 - "Slot State"
Cohesion: 0.10
Nodes (22): cleanTicket(), conflictTicket(), REVIEW_OPTS, reviewTicket(), TICKET_OPTS, CHILD_USAGE, FULL_REVIEW_KINDS, LIGHT_REVIEW_KINDS (+14 more)

### Community 50 - "Stats Hooks & Cards"
Cohesion: 0.16
Nodes (12): ChartConfig, ChartContainer, ChartContainerProps, ChartContext, ChartContextValue, ChartLegendContent(), ChartLegendContentProps, ChartTooltipContent() (+4 more)

### Community 51 - "Community 51"
Cohesion: 0.18
Nodes (28): AgentEffort, AgentModel, CodexEffort, CodexModel, Implementer, Orchestrator, AgentProfileConfig(), AgentProfileConfigProps (+20 more)

### Community 52 - "repairPath.ts"
Cohesion: 0.16
Nodes (14): terminalServerMessageSchema, badgeLabelFor(), LiveTerminal(), LiveTerminalOptions, LiveTerminalProps, TerminalCell(), TerminalCellProps, NOTE: Radix's dismissable layer registers its Escape listener on `document` in t (+6 more)

### Community 53 - "User Terminal Manager"
Cohesion: 0.33
Nodes (5): CONTEXT — domain glossary, Execution, Proposed (not yet built), Seams, Work items

### Community 54 - "Community 54"
Cohesion: 0.23
Nodes (18): applySizes(), findLeaf(), firstLeafId(), LeafNode, leafNodeSchema, makeLeaf(), nextNodeId(), parseTree() (+10 more)

### Community 55 - "App.tsx"
Cohesion: 0.11
Nodes (8): startFeasibilityTicket(), FeasibilityBatchManager, toTriageResult(), ReformulateManager, TriageManager, RouteDeps, FeasibilityResult, TriageResult

### Community 56 - "CSV Parsing"
Cohesion: 0.20
Nodes (4): confirmPrMerged(), unmergedReason(), PR_STATE_LABELS, PrState

### Community 57 - "Community 57"
Cohesion: 0.17
Nodes (17): ensureConfig(), boot(), externalUrlFromNewWindowEvent(), forwardAtelierShortcut(), installApplicationMenu(), installMenuShortcutBridge(), menuShortcutActionSchema, navigationEventSchema (+9 more)

### Community 58 - "File Uploads"
Cohesion: 0.07
Nodes (31): RecordingSystemAdapter, ActionSystem, CapabilityCache, dryRunLog, fakeEncoder, CLAUDE_JSON_PATH, COMPOSER_BINARIES, INSTALL_COMMANDS (+23 more)

### Community 59 - "triageManager.ts"
Cohesion: 0.25
Nodes (16): buildContractConstraintsLines(), buildResponseFormatLines(), buildStrictRulesLines(), buildTicketLines(), buildTriageChannelPrompt(), buildTriagePlusChannelPrompt(), isEnglish(), readOnlyFramingLines() (+8 more)

### Community 60 - "Package Manifest"
Cohesion: 0.16
Nodes (20): groupProjects(), groupReviewCount(), initialExpandedGroups(), normalizeSearch(), projectGroupIdentity(), projectInitial(), ProjectSelect(), ProjectSelectOption (+12 more)

### Community 61 - "splitManager.ts"
Cohesion: 0.09
Nodes (29): App(), HOME_VIEW_OPTIONS, HomeView, AutomationView(), NAV_ENTRIES, NavEntry, Sidebar(), SidebarProps (+21 more)

### Community 62 - "TicketCard.tsx"
Cohesion: 0.25
Nodes (5): TicketLifecycle, ErrorDetailsSource, Ticket, DescriptionTabProps, PrdTabProps

### Community 63 - "Community 63"
Cohesion: 0.07
Nodes (9): ReviewHeadResult, FAKE_OPEN_PRS, FakeVcsClient, githubPrHeadRef(), CreatePrResult, VcsClient, isPrNeedsAttention(), OpenPr (+1 more)

### Community 64 - "Composer Run Script"
Cohesion: 0.20
Nodes (10): ensureClaudeBinary(), gitMetadataWritableRoots(), agentBaseEnv(), bestInstalledMatch(), compareParts(), envWithProjectNode(), nvmNodeBinDir(), readNvmrc() (+2 more)

### Community 65 - "split.ts"
Cohesion: 0.19
Nodes (12): TERMINAL_STAGES, applyTranscriptUpdate(), TranscriptState, transcriptText(), transcriptUpdateSchema, FullscreenToggle(), FullscreenToggleProps, TerminalData (+4 more)

### Community 66 - "OpenPr"
Cohesion: 0.21
Nodes (9): CodexBinaryVersionError, require, resolveCodexBinary(), resolveCodexBinaryOverride(), TARGETS, canonicalJson(), CodexCommandHook, codexSessionPreToolUseHookHash() (+1 more)

### Community 67 - "TerminalView.tsx"
Cohesion: 0.13
Nodes (15): PROJECT_ROOT, NOTE: PRD generation holds the request open up to ~120s (REFORMULATE_TIMEOUT_MS), resolveDataFile(), resolveServerPort(), RunningServer, serveStaticAsset(), SocketData, startServer() (+7 more)

### Community 68 - "schema.test.ts"
Cohesion: 0.08
Nodes (39): isNotionUrl(), NOTION_HOSTS, NewTicketSheet(), BREADCRUMB, NO_ANNOTATIONS, PrdReviewDialog(), PrdReviewDialogProps, PrdView() (+31 more)

### Community 69 - "reviewFindings.ts"
Cohesion: 0.06
Nodes (40): ActiveReviewPass, BOARD_FINDING_RENDER_STYLE, log, orderedReviewKinds(), renderCollapsedFinding(), renderFinding(), renderPersistedReviewResult(), REVIEW_DISALLOWED_TOOLS (+32 more)

### Community 70 - "CodexRuntimeStatus"
Cohesion: 0.11
Nodes (15): WsClientEvent, active, ensureNotificationPermission(), getAudioContext(), isSupported(), loadSoundBuffer(), playBuffer(), playNotificationSound() (+7 more)

### Community 71 - "PostCSS Config"
Cohesion: 0.29
Nodes (6): name, overrides, zod, private, type, version

### Community 72 - "App.tsx"
Cohesion: 0.57
Nodes (6): groupOrientation(), layoutToSizes(), panelId(), panelPercent(), SplitTree(), SplitTreeProps

### Community 73 - "TerminalView.tsx"
Cohesion: 0.15
Nodes (23): pairedRuntimeCodexEffort(), UNKNOWN_CODEX_RUNTIME_STATUS, Capabilities, CodexAgentFields(), CodexConnectionStatus(), STATUS_LABELS, clearRetry(), loadCapabilities() (+15 more)

### Community 74 - "button.tsx"
Cohesion: 0.06
Nodes (57): AGENT_EFFORT_FULL_LABELS, AGENT_EFFORT_LABELS, AGENT_MODEL_FULL_LABELS, AGENT_MODEL_LABELS, AUTOMATION_RUN_STATUSES, CODEX_EFFORT_FULL_LABELS, CODEX_EFFORT_LABELS, CODEX_MODEL_EFFORTS (+49 more)

### Community 75 - ".handleRequest"
Cohesion: 0.11
Nodes (14): analyzeResultSchema, compactTicketSchema, createResultSchema, errorResultSchema, ISOLATED_ENV_KEYS, projectResultSchema, savedEnv, startResultSchema (+6 more)

### Community 76 - "usePrdSearch.ts"
Cohesion: 0.13
Nodes (23): isCodexFastServiceTier(), costByFamily(), costOf(), costOfModel(), costOfSessions(), CostSummary, FamilyPricing, MODEL_PRICING (+15 more)

### Community 78 - "csv.ts"
Cohesion: 0.07
Nodes (33): boundedCommandDetail(), withJsonRequestFile(), PublishReviewResult, ReviewPublicationState, extractPrUrl(), ghPrHeadSchema, ghPrSchema, ghPrStateSchema (+25 more)

### Community 79 - "WorktreeSession"
Cohesion: 0.33
Nodes (3): listeners, mcp, ReplyArgsSchema

### Community 80 - "recordedAction.ts"
Cohesion: 0.23
Nodes (17): alternation(), COMMAND_WRAPPERS, commandSegments(), commandWords(), executableName(), launchedPackageScript(), launchesTypecheck(), OPTIONS_WITH_VALUE (+9 more)

### Community 81 - "vcsCommands.ts"
Cohesion: 0.26
Nodes (9): StatRecord, StatCard(), StatCardProps, StatEmpty(), OutcomeChart(), StatsView(), StatsViewProps, useStats() (+1 more)

### Community 82 - "TicketOperations"
Cohesion: 0.07
Nodes (43): resolveBaseBranch(), assertExecutionAvailable(), CODEX_LAUNCH_STATUS_MESSAGES, CodexCapabilityReader, ExecutionDefaults, ExecutionOverrides, FEASIBILITY_ENGINE_EXECUTION, ResolvedExecution (+35 more)

### Community 86 - "useTickTimer.ts"
Cohesion: 0.23
Nodes (10): artifactPath, assertPackageVersionInSync(), assertSdkVersionsInSync(), BUILT_DMG, ELECTROBUN_BIN, fail(), installedPackageVersion(), RELEASE_FOLDER (+2 more)

### Community 89 - "usePrdSearch.ts"
Cohesion: 0.11
Nodes (24): CompactTicket, ListTicketsInput, Column, COLUMN_LABELS, COLUMN_ORDER, COLUMNS, ACTIVE_COLUMNS, Board() (+16 more)

### Community 90 - "nvmNode.ts"
Cohesion: 0.22
Nodes (8): log, logRejection(), ToolHandler, ToolResult, submitFeasibilityArgsSchema, submitSplitArgsSchema, submitTriageArgsSchema, updateStageArgsSchema

### Community 91 - ".onMessageStatus"
Cohesion: 0.36
Nodes (7): collectMatchRanges(), isShortcutDetail(), ShortcutDetail, supportsHighlightApi(), usePrdSearch(), UsePrdSearchOptions, UsePrdSearchResult

### Community 92 - "WorktreeAddressWatcher"
Cohesion: 0.22
Nodes (4): PublicMcpManager, isActive(), isBlocked(), TicketOperations

### Community 93 - "ColumnActionsMenu.tsx"
Cohesion: 0.25
Nodes (7): Azure DevOps support — state file, Decisions (validated by the owner, 2026-09-21), Goal, Known blockers for lots 3 and 4, Open questions, Progress, Verified on this machine (az 2.90.0, azure-devops 1.0.8)

### Community 94 - ".addComment"
Cohesion: 0.11
Nodes (12): log, setup(), log, Watchdog, applyAppSettingsToModels(), initProjectRegistry(), ClientHub, ClientSocket (+4 more)

### Community 95 - "TicketConfigSummary.tsx"
Cohesion: 0.50
Nodes (3): appBundle, EMBEDDED_BINARIES, resourcesApp

### Community 97 - "RunningServer"
Cohesion: 0.17
Nodes (11): projectConfigSchema, buildAppSettingsPatch(), LegacyConfig, legacyConfigSchema, LegacyModels, log, migrateConfigJsonIfPresent(), parseLegacyConfig() (+3 more)

### Community 98 - "triageManager.ts"
Cohesion: 0.20
Nodes (9): AtelierDesktopRpcSchema, DesktopRequests, McpSettingsMetadata, WebviewRequests, McpSettingsController, McpSettings(), createMcpSettingsClient(), getMcpSettingsClient() (+1 more)

### Community 99 - "reviewPublishingGuard.ts"
Cohesion: 0.07
Nodes (35): API_GUARDS, API_READ_METHOD_SET, ApiDenyPatterns, ApiGuard, AZ_INVOKE_COMMAND, AZ_INVOKE_METHOD_LONG_FLAGS, AZ_INVOKE_WRITE_INPUT_LONG_FLAGS, AZ_PR_WRITE_PATTERN (+27 more)

### Community 100 - ".startVerification"
Cohesion: 0.38
Nodes (3): serializeErrorDetails(), runRecordedAction(), ExecutionRun

### Community 101 - "codexProvider.test.ts"
Cohesion: 0.33
Nodes (9): useTheme(), UseThemeResult, applyTheme(), getStoredTheme(), isTheme(), Theme, ThemeOption, THEMES (+1 more)

### Community 102 - ".start"
Cohesion: 0.09
Nodes (3): SqlUpdateBuilder, Store, AgentMessage

### Community 104 - ".runWorktreeSetupScript"
Cohesion: 0.25
Nodes (7): ToolMeta, AlertDialog(), AlertDialogProps, Dialog(), DIALOG_WIDTH, DialogProps, DialogSize

### Community 105 - "createMcpServer"
Cohesion: 0.26
Nodes (4): BoundedCommandResult, connectionFailure(), connectionResult(), VcsConnectionResult

### Community 106 - "usePrdSearch.ts"
Cohesion: 0.11
Nodes (18): ANSI, appendToLogFile(), COLOR_ENABLED, disableFileLogging(), initLogFile(), isLevel(), Level, LEVEL_ORDER (+10 more)

### Community 107 - "azureRemote.ts"
Cohesion: 0.40
Nodes (10): azureOrgUrl(), fromAzureSegments(), fromCollectionSegments(), fromLegacySegments(), fromSshSegments(), parseAzureRepoRef(), parseRemoteLocation(), RemoteLocation (+2 more)

### Community 108 - "oneShotSession.ts"
Cohesion: 0.39
Nodes (5): stalledEventPayload(), buildErrorDetails(), describeCause(), ErrorDetailsContext, ErrorDetails

### Community 109 - "projectDisplay.ts"
Cohesion: 0.21
Nodes (10): buildSplitSessionConfig(), buildSplitChannelPrompt(), buildTicketLines(), isEnglish(), DRY_RUN_RESULT, log, PendingSplit, SplitManager (+2 more)

### Community 110 - "Profile"
Cohesion: 0.13
Nodes (21): ProfileConfig, DragHandleAttributes, DragHandleListeners, ProfileRowHeader(), ProfileRowHeaderProps, ProfileRowProps, ProfilesSettings(), NOTE: the saved flag lives here because a saved row remounts (its key carries up (+13 more)

### Community 111 - "isProcessing"
Cohesion: 0.36
Nodes (7): effectivePort(), isAllowedHost(), isAllowedOrigin(), isAuthorized(), isLoopbackHost(), jsonResponse(), parseHost()

### Community 112 - "prd.ts"
Cohesion: 0.40
Nodes (5): MIME_EXTENSIONS, resolveExtension(), SavedUpload, saveUpload(), serveUpload()

### Community 113 - "reformulate.ts"
Cohesion: 0.36
Nodes (5): applyDesktopEnv(), DesktopRoots, ensureMcpToken(), regenerateMcpToken(), temporaryDirectories

### Community 114 - "ApiDenyPatterns"
Cohesion: 0.32
Nodes (6): agentPairError(), normalizeCreateInput(), requestKeyConflictMessage(), ticketDependencyError(), isAllowedAgentPair(), deriveTitleFromDescription()

### Community 115 - "isNotionUrl"
Cohesion: 0.26
Nodes (9): QuitConfirmModal(), QuitConfirmModalProps, collectTerminalIds(), SplitOrientation, TerminalsView(), isShortcutDetail(), ShortcutDetail, useTerminalShortcuts() (+1 more)

### Community 116 - "settings.tsx"
Cohesion: 0.08
Nodes (27): AgentDefaultsSettings(), AppearanceSettings(), CODEX_STATUS_TONES, COMMIT_ROW, DefaultsRowSpec, EFFORT_OPTIONS, FEASIBILITY_ROW, IMPLEMENTATION_ROW (+19 more)

### Community 117 - "TicketMeta.tsx"
Cohesion: 0.23
Nodes (10): columnSchema, MetaRow(), MetaRowProps, STATUS_CONFIRMS, StatusConfirm, statusTitle(), TicketMeta(), TicketCostProps (+2 more)

### Community 119 - "delegationManager.test.ts"
Cohesion: 0.43
Nodes (6): createMcpServer(), invalidInput(), listPublicProjects(), OutputValidator, toolError(), toolResult()

### Community 120 - "reformulate.ts"
Cohesion: 0.38
Nodes (6): ATTENTION_STATUSES, sessionOf(), SlotPips(), SlotPipsProps, STATUS_LABELS, STATUS_PIP_CLASSES

### Community 122 - "performSplit"
Cohesion: 0.47
Nodes (5): createSplitChildren(), failSplitMother(), performSplit(), splitChildDefaults(), splitMotherBranch()

## Knowledge Gaps
- **729 isolated node(s):** `log`, `ToolResult`, `ToolHandler`, `ReclaimOutcome`, `log` (+724 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **15 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Ticket` connect `TicketCard.tsx` to `Contract Building & Slots`, `Shared Zod Schemas`, `PR Selection & Slots Bar`, `Core Domain Concepts`, `Database Store Operations`, `Coordinator & Protocol`, `Live Terminal Views`, `Store Types & Agent Knobs`, `DB Row Schemas & Mappers`, `Dev Dependencies`, `Cost & Pricing`, `Agents View & Ticket Cards`, `User Terminal & Fake IO`, `Board Columns`, `NPM Scripts`, `Runtime Dependencies`, `API Client Inputs`, `Ticket Config & Constants`, `Session Hub Transcript`, `Slot State`, `Community 51`, `App.tsx`, `triageManager.ts`, `splitManager.ts`, `split.ts`, `schema.test.ts`, `reviewFindings.ts`, `CodexRuntimeStatus`, `button.tsx`, `usePrdSearch.ts`, `TicketOperations`, `usePrdSearch.ts`, `.addComment`, `.start`, `oneShotSession.ts`, `projectDisplay.ts`, `ApiDenyPatterns`, `TicketMeta.tsx`?**
  _High betweenness centrality (0.080) - this node is a cross-community bridge._
- **Why does `FakeSystemAdapter` connect `Settings & Profiles UI` to `User Terminal & Fake IO`, `TerminalSession`, `Slot State`, `TicketOperations`, `File Uploads`, `.addComment`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `SessionHub` connect `Stats Aggregation` to `User Terminal & Fake IO`, `Contract Building & Slots`, `TerminalView.tsx`, `reviewFindings.ts`, `projectDisplay.ts`, `Coordinator & Protocol`, `Slot State`, `TicketOperations`, `App.tsx`, `File Uploads`, `.addComment`, `PRD Review & Markdown`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `createApiRoutes()` (e.g. with `isWebOnlyPath()` and `.onEvent()`) actually correct?**
  _`createApiRoutes()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `log`, `ToolResult`, `ToolHandler` to the rest of the system?**
  _740 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Contract Building & Slots` be split into smaller, more focused modules?**
  _Cohesion score 0.0289395070948469 - nodes in this community are weakly interconnected._
- **Should `Terminals UI & Notifications` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._