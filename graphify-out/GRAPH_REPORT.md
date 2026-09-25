# Graph Report - kanban-agents  (2026-09-25)

## Corpus Check
- 276 files · ~751,030 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3080 nodes · 8764 edges · 119 communities (113 shown, 6 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 50 edges (avg confidence: 0.65)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7e899a5d`
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

## God Nodes (most connected - your core abstractions)
1. `Store` - 126 edges
2. `Ticket` - 114 edges
3. `cn()` - 82 edges
4. `SystemAdapter` - 78 edges
5. `FakeSystemAdapter` - 68 edges
6. `RealSystemAdapter` - 66 edges
7. `createApiRoutes()` - 61 edges
8. `SlotManager` - 55 edges
9. `ProjectInfo` - 52 edges
10. `DelegationManager` - 50 edges

## Surprising Connections (you probably didn't know these)
- `McpSettingsClient` --references--> `McpSettingsMetadata`  [EXTRACTED]
  src/web/src/lib/mcpSettings.ts → desktop/mcpRpc.ts
- `StageProgressBarProps` --references--> `Ticket`  [EXTRACTED]
  src/web/src/components/StageProgressBar.tsx → src/shared/schemas.ts
- `TerminalTabProps` --references--> `Ticket`  [EXTRACTED]
  src/web/src/components/ticket-detail/TerminalTab.tsx → src/shared/schemas.ts
- `TicketActionsProps` --references--> `Ticket`  [EXTRACTED]
  src/web/src/components/ticket-detail/TicketActions.tsx → src/shared/schemas.ts
- `TicketBadgesProps` --references--> `Ticket`  [EXTRACTED]
  src/web/src/components/TicketBadges.tsx → src/shared/schemas.ts

## Import Cycles
- None detected.

## Communities (119 total, 6 thin omitted)

### Community 0 - "Contract Building & Slots"
Cohesion: 0.03
Nodes (69): ActionExecutionOptions, actionExecutionOptionsSchema, agentMessageSchema, AnalyzeTicketsInput, appSettingsSchema, automationRunSchema, automationSchema, baseBranchSchema (+61 more)

### Community 1 - "Terminals UI & Notifications"
Cohesion: 0.10
Nodes (20): analyzeTicketsInputSchema, analyzeTicketsOutputSchema, columnSchema, compactTicketSchema, createTodoTicketOutputSchema, editableTicketSchema, listProjectsInputSchema, listProjectsOutputSchema (+12 more)

### Community 2 - "Desktop Bootstrap & Menus"
Cohesion: 0.15
Nodes (8): RecordingSystemAdapter, PublishReviewOptions, PublishReviewResult, ReviewPublicationState, GithubVcsClient, pullApiEndpoint(), rightSideDiffLines(), ReviewPublicationCheck

### Community 3 - "Feasibility Batch Management"
Cohesion: 0.05
Nodes (66): log, logRejection(), ToolHandler, ToolResult, ActiveDelegation, ClosableExecution, ExecutionFinishStatus, LiveSession (+58 more)

### Community 4 - "Ticket Action Panels"
Cohesion: 0.12
Nodes (26): AgentCard(), AgentCardProps, AgentsView(), AgentsViewProps, hasLiveAgent(), normalize(), STATE_STRIPE_COLORS, TicketCard() (+18 more)

### Community 5 - "Fake System Adapter"
Cohesion: 0.07
Nodes (36): boundedCommandDetail(), runBoundedCommand(), safeJsonParse(), ReviewPublicationEvent, azureChangeEntrySchema, azureCommentSchema, AzureDevopsVcsClient, azureIdentitySchema (+28 more)

### Community 6 - "Shared Zod Schemas"
Cohesion: 0.17
Nodes (3): SlotManager, failSplitMother(), TicketOperationsDeps

### Community 7 - "Settings & Profiles UI"
Cohesion: 0.07
Nodes (5): delay(), fakeShellPrompt(), FakeSystemAdapter, ReviewDoneOptions, VcsProvider

### Community 8 - "PR Selection & Slots Bar"
Cohesion: 0.06
Nodes (54): resolveBaseBranch(), buildAskContract(), buildFeasibilityBatchContract(), ActiveReviewPass, assertExecutionAvailable(), CODEX_LAUNCH_STATUS_MESSAGES, CodexCapabilityReader, ExecutionDefaults (+46 more)

### Community 9 - "Real System Adapter"
Cohesion: 0.10
Nodes (25): CreateProjectInput, ManagedProject, UpdateProjectInput, vcsProviderSchema, ConnectionHint, DragHandleAttributes, DragHandleListeners, groupProjects() (+17 more)

### Community 10 - "Slot Config & Worktree Watch"
Cohesion: 0.11
Nodes (23): StatEmpty(), ACTIVE_BAR, AREA_CURSOR, AXIS_PROPS, BAR_CURSOR, CHART_PALETTE, colorAt(), CostSummary() (+15 more)

### Community 11 - "Core Domain Concepts"
Cohesion: 0.04
Nodes (47): agentMessageRowSchema, AutomationRow, automationRowSchema, AutomationRunRow, automationRunRowSchema, buildScripts(), CommentRow, commentRowSchema (+39 more)

### Community 12 - "Board & Sidebar Layout"
Cohesion: 0.08
Nodes (4): RealSystemAdapter, DoneGateResult, PrepareReviewWorktreeOptions, WorktreeSetupOptions

### Community 13 - "Database Store Operations"
Cohesion: 0.14
Nodes (23): ProjectPrPickerProps, groupProjects(), groupReviewCount(), initialExpandedGroups(), normalizeSearch(), ProjectGroup, projectGroupIdentity(), projectInitial() (+15 more)

### Community 14 - "Coordinator & Protocol"
Cohesion: 0.11
Nodes (12): nullableBooleanValue(), agentPairError(), createApiRoutes(), isBlocked(), isProcessing(), isSplitMother(), isWebOnlyPath(), jsonError() (+4 more)

### Community 15 - "API Routes & Reformulate"
Cohesion: 0.11
Nodes (21): CodexAppServerProtocolError, threadConfig(), accountResponseSchema, hasExplicitCodexApiKey(), isProtocolIncompatibility(), listRuntimeModels(), modelListResponseSchema, modelSchema (+13 more)

### Community 16 - "Stats Aggregation"
Cohesion: 0.13
Nodes (3): startParentSession(), SessionHubHandlers, SessionStartCallbacks

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
Cohesion: 0.08
Nodes (35): FAILURE_COLUMNS, Kind, KINDS, SUCCESS_COLUMNS, codexModelSchema, CodexTierSummary(), DurationChart(), OutcomeChart() (+27 more)

### Community 21 - "Store Types & Agent Knobs"
Cohesion: 0.17
Nodes (28): buildCleanContract(), buildConflictResolutionContract(), buildFeasibilityContextSection(), buildImplementingSteps(), buildMockupReviewStep(), buildPlanningStep(), buildPrdBullet(), buildReviewContract() (+20 more)

### Community 22 - "DB Row Schemas & Mappers"
Cohesion: 0.20
Nodes (8): CHILD_USAGE, FULL_REVIEW_KINDS, LIGHT_REVIEW_KINDS, newDelegatedTicket(), newReviewTicket(), setup(), BASE_TICKET, ticketSchema

### Community 23 - "Dev Dependencies"
Cohesion: 0.10
Nodes (18): NewTicket, TicketCreationRequestConflictError, AnalyzeTicketRejectionReason, AnalyzeTicketsResult, CreateTodoTicketInput, createTodoTicketInputSchema, CreateTodoTicketResult, isActive() (+10 more)

### Community 24 - "TypeScript Config"
Cohesion: 0.15
Nodes (19): bashCommandSchema, buildSettings(), claudeProvider, createSdkAgentSession(), denyBashHook(), denyNoVerifyHook, denyReviewPublishingHook, denyTypecheckHook() (+11 more)

### Community 25 - "Client Hub & Watchdog"
Cohesion: 0.28
Nodes (13): abortReason(), computeCodeFingerprint(), FingerprintEntry, FingerprintPhase, hashFingerprintPaths(), isMissingFileError(), listFingerprintPaths(), log (+5 more)

### Community 26 - "Cost & Pricing"
Cohesion: 0.40
Nodes (5): MIME_EXTENSIONS, resolveExtension(), SavedUpload, saveUpload(), serveUpload()

### Community 27 - "Workflow View & Lifecycle"
Cohesion: 0.06
Nodes (28): Architecture, Commands, Conventions (enforced — beyond the global ones in ~/.claude/CLAUDE.md), graphify, The dry-run safety model — read before running anything, What this is, Agent runtime (Agent SDK), Architecture (+20 more)

### Community 28 - "Stats Charts"
Cohesion: 0.07
Nodes (42): AgentMcpServerDefinition, agentMessageDeltaSchema, agentToml(), apiWriteDenyScript(), buildMcpServers(), ConfigObject, configReadResponseSchema, ConfigValue (+34 more)

### Community 29 - "Session Hub & Agent Session"
Cohesion: 0.14
Nodes (5): CodexAppServerConnection, CodexAppServerOptions, CodexProviderDependencies, AppServerFixture, CodexRuntimeDependencies

### Community 30 - "Agents View & Ticket Cards"
Cohesion: 0.17
Nodes (19): COLUMN_SORT_FIELD, BoardColumn(), compareFamilyMembers(), familyKeyOf(), groupTicketIds(), groupTicketsByFamily(), isSplitMother(), readCollapsed() (+11 more)

### Community 31 - "PRD Review & Markdown"
Cohesion: 0.23
Nodes (8): Block, blockText(), compactChunks(), firstCharCode(), TranscriptBuffer, trimBlockStart(), AgentStreamBlock, TranscriptUpdate

### Community 32 - "User Terminal & Fake IO"
Cohesion: 0.14
Nodes (9): AckSystem, RecordedSession, RecordingSystem, RecordedSession, RecordingSystem, RelaunchSystem, AgentProvider, AgentSessionOptions (+1 more)

### Community 33 - "Logging"
Cohesion: 0.10
Nodes (21): scripts, build:desktop, build:web, dev, dev:desktop, dev:proxy, dev:server, dev:web (+13 more)

### Community 34 - "Board Columns"
Cohesion: 0.06
Nodes (48): PrSelectRow(), ProviderRow(), NAV_ENTRIES, NavEntry, Sidebar(), SidebarProps, SidebarView, AUTHOR_BADGES (+40 more)

### Community 36 - "Runtime Dependencies"
Cohesion: 0.20
Nodes (10): WsClientEvent, active, ensureNotificationPermission(), getAudioContext(), isSupported(), loadSoundBuffer(), playBuffer(), playNotificationSound() (+2 more)

### Community 37 - "Claude SDK Provider"
Cohesion: 0.09
Nodes (23): dependencies, @anthropic-ai/claude-agent-sdk, dompurify, elysia, @fontsource/ibm-plex-mono, @fontsource/ibm-plex-sans, marked, @modelcontextprotocol/sdk (+15 more)

### Community 38 - "Agent Profile Config"
Cohesion: 0.19
Nodes (3): AutomationManager, Automation, AutomationRun

### Community 39 - "Agent Coordinator Handlers"
Cohesion: 0.10
Nodes (28): artifactPath, assertPackageVersionInSync(), assertSdkVersionsInSync(), BUILT_DMG, ELECTROBUN_BIN, fail(), installedPackageVersion(), RELEASE_FOLDER (+20 more)

### Community 40 - "API Client Inputs"
Cohesion: 0.09
Nodes (11): childTranscriptPrefix(), DelegationManager, reviewerRules(), reviewKey(), reviewPrompt(), sleep(), startAndApproveReviews(), submitReviews() (+3 more)

### Community 41 - "Ticket Config & Constants"
Cohesion: 0.14
Nodes (21): ColumnActionsMenu(), ColumnActionsMenuProps, ColumnMenuItem, ActionContext, buildActions(), ConfirmSpec, errorMessage(), RETRY_STAGES (+13 more)

### Community 42 - "Ticket Detail & Triage UI"
Cohesion: 0.19
Nodes (10): cleanTicket(), conflictTicket(), REVIEW_OPTS, reviewTicket(), TICKET_OPTS, createdPaths, reserveDbPath(), makeTicket() (+2 more)

### Community 43 - "Demo Pipeline Concepts"
Cohesion: 0.39
Nodes (6): buildSplitChannelPrompt(), buildTicketLines(), isEnglish(), CommitLanguage, extractFigmaUrls(), hasMockups()

### Community 44 - "Chart Primitives"
Cohesion: 0.22
Nodes (3): createMcpSettingsController(), McpSettingsControllerDependencies, temporaryDirectories

### Community 45 - "Session Hub Transcript"
Cohesion: 0.09
Nodes (9): featureBranch(), slotPath(), slugify(), enrichWorktreeSession(), ClientSocket, TERMINAL_STAGES, Slot, WorktreeSession (+1 more)

### Community 46 - "Community 46"
Cohesion: 0.27
Nodes (15): Agent Implementation Config, Argus Code Review, Automated Tests (typecheck/lint/test), Claude Code Autonomous Agent, Ticket Contract Injection, Feasibility Analysis, Kanban Board (Atelier), Kanban Agents Demo (demo.gif) (+7 more)

### Community 47 - "Modal Dialogs"
Cohesion: 0.07
Nodes (36): AUTOMATION_TRIGGER_LABELS, AUTOMATION_TRIGGERS, AutomationRunStatus, AutomationTrigger, CreateAutomationInput, AutomationCard(), AutomationCardProps, AutomationFormProps (+28 more)

### Community 48 - "Community 48"
Cohesion: 0.33
Nodes (9): useTheme(), UseThemeResult, applyTheme(), getStoredTheme(), isTheme(), Theme, ThemeOption, THEMES (+1 more)

### Community 49 - "Slot State"
Cohesion: 0.12
Nodes (25): main(), scalar(), assertCodexDowngradeSafe(), backfillOrchestrator(), countRows(), createDatabase(), EXECUTION_MIGRATIONS, hasColumn() (+17 more)

### Community 50 - "Stats Hooks & Cards"
Cohesion: 0.16
Nodes (12): ChartConfig, ChartContainer, ChartContainerProps, ChartContext, ChartContextValue, ChartLegendContent(), ChartLegendContentProps, ChartTooltipContent() (+4 more)

### Community 51 - "Community 51"
Cohesion: 0.06
Nodes (35): AttachExecutionSessionInput, AutomationPatch, EnqueueAgentMessageInput, FinalizeExecutionInput, MarkAgentMessageAcceptedInput, MarkAgentMessageReceivedInput, MarkAgentMessageRejectedInput, NewAsk (+27 more)

### Community 52 - "repairPath.ts"
Cohesion: 0.16
Nodes (14): terminalServerMessageSchema, badgeLabelFor(), LiveTerminal(), LiveTerminalOptions, LiveTerminalProps, TerminalCell(), TerminalCellProps, NOTE: Radix's dismissable layer registers its Escape listener on `document` in t (+6 more)

### Community 53 - "User Terminal Manager"
Cohesion: 0.33
Nodes (5): CONTEXT — domain glossary, Execution, Proposed (not yet built), Seams, Work items

### Community 54 - "Community 54"
Cohesion: 0.21
Nodes (19): applySizes(), collectTerminalIds(), findLeaf(), firstLeafId(), LeafNode, leafNodeSchema, makeLeaf(), nextNodeId() (+11 more)

### Community 55 - "App.tsx"
Cohesion: 0.29
Nodes (4): FeasibilityBatchManager, toTriageResult(), ProjectConfig, FeasibilityResult

### Community 56 - "CSV Parsing"
Cohesion: 0.11
Nodes (46): ExecutionOverrides, AgentEffort, AgentModel, CodexEffort, CodexModel, Implementer, Orchestrator, Capabilities (+38 more)

### Community 57 - "Community 57"
Cohesion: 0.17
Nodes (17): ensureConfig(), boot(), externalUrlFromNewWindowEvent(), forwardAtelierShortcut(), installApplicationMenu(), installMenuShortcutBridge(), menuShortcutActionSchema, navigationEventSchema (+9 more)

### Community 58 - "File Uploads"
Cohesion: 0.19
Nodes (4): ActionSystem, CapabilityCache, CodexRuntimeStatus, runtime

### Community 59 - "triageManager.ts"
Cohesion: 0.31
Nodes (13): buildContractConstraintsLines(), buildResponseFormatLines(), buildStrictRulesLines(), buildTicketLines(), buildTriageChannelPrompt(), buildTriagePlusChannelPrompt(), isEnglish(), readOnlyFramingLines() (+5 more)

### Community 60 - "Package Manifest"
Cohesion: 0.18
Nodes (3): addUsageByModel(), toUsageByModel(), ACTIVE_STAGES

### Community 61 - "splitManager.ts"
Cohesion: 0.12
Nodes (33): isNotionUrl(), NOTION_HOSTS, AskPanel(), CleanPrPanel(), NewTicketSheet(), PrdAnnotator(), PrdAnnotatorProps, ProjectPrPicker() (+25 more)

### Community 62 - "TicketCard.tsx"
Cohesion: 0.19
Nodes (6): TicketLifecycle, Stage, Ticket, TriageResult, DescriptionTabProps, PrdTabProps

### Community 63 - "Community 63"
Cohesion: 0.08
Nodes (9): ReviewHeadResult, FAKE_OPEN_PRS, FakeVcsClient, githubPrHeadRef(), CreatePrResult, VcsClient, isPrNeedsAttention(), OpenPr (+1 more)

### Community 64 - "Composer Run Script"
Cohesion: 0.05
Nodes (48): renderCollapsedFinding(), FailedReformulation, ensureClaudeBinary(), dispatchClaudeMessage(), SDK_EFFORTS, toSdkAgents(), toSdkEffort(), gitMetadataWritableRoots() (+40 more)

### Community 65 - "split.ts"
Cohesion: 0.20
Nodes (11): applyTranscriptUpdate(), TranscriptState, transcriptText(), transcriptUpdateSchema, FullscreenToggle(), FullscreenToggleProps, TerminalData, TerminalView() (+3 more)

### Community 66 - "OpenPr"
Cohesion: 0.21
Nodes (9): CodexBinaryVersionError, require, resolveCodexBinary(), resolveCodexBinaryOverride(), TARGETS, canonicalJson(), CodexCommandHook, codexSessionPreToolUseHookHash() (+1 more)

### Community 67 - "TerminalView.tsx"
Cohesion: 0.04
Nodes (50): Watchdog, log, runFirstBootSetup(), listProjectKeys(), PROJECT_ROOT, NOTE: PRD generation holds the request open up to ~120s (REFORMULATE_TIMEOUT_MS), resolveDataFile(), resolveServerPort() (+42 more)

### Community 68 - "schema.test.ts"
Cohesion: 0.13
Nodes (23): BREADCRUMB, NO_ANNOTATIONS, PrdReviewDialog(), PrdReviewDialogProps, ActivityTab(), isUnanswered(), NO_COMMENT_COLUMNS, DraftUpdate (+15 more)

### Community 69 - "reviewFindings.ts"
Cohesion: 0.06
Nodes (55): ActiveReview, BOARD_FINDING_RENDER_STYLE, log, orderedReviewKinds(), renderFinding(), renderPersistedReviewResult(), REVIEW_DISALLOWED_TOOLS, REVIEW_REPORT_LABELS (+47 more)

### Community 70 - "CodexRuntimeStatus"
Cohesion: 0.05
Nodes (57): ProjectInfo, StatRecord, App(), HOME_VIEW_OPTIONS, HomeView, AskPanelProps, CleanPrPanelProps, NewTicketSheetProps (+49 more)

### Community 71 - "PostCSS Config"
Cohesion: 0.29
Nodes (6): name, overrides, zod, private, type, version

### Community 72 - "App.tsx"
Cohesion: 0.27
Nodes (11): groupOrientation(), layoutToSizes(), panelId(), panelPercent(), SplitTree(), SplitTreeProps, SplitOrientation, isShortcutDetail() (+3 more)

### Community 73 - "TerminalView.tsx"
Cohesion: 0.19
Nodes (12): RFC-4180, ImportTicketsPanel(), ImportTicketsPanelProps, PrdView(), Switch, SwitchProps, useAgentKnobs(), CsvParseError (+4 more)

### Community 74 - "button.tsx"
Cohesion: 0.07
Nodes (43): AGENT_EFFORT_FULL_LABELS, AGENT_EFFORT_LABELS, AGENT_MODEL_FULL_LABELS, AGENT_MODEL_LABELS, AUTOMATION_RUN_STATUSES, CODEX_EFFORT_FULL_LABELS, CODEX_EFFORT_LABELS, CODEX_MODEL_LABELS (+35 more)

### Community 75 - ".handleRequest"
Cohesion: 0.11
Nodes (14): analyzeResultSchema, compactTicketSchema, createResultSchema, errorResultSchema, ISOLATED_ENV_KEYS, projectResultSchema, savedEnv, startResultSchema (+6 more)

### Community 76 - "usePrdSearch.ts"
Cohesion: 0.15
Nodes (16): costByFamily(), costOf(), costOfModel(), costOfSessions(), CostSummary, FamilyPricing, MODEL_PRICING, ModelFamily (+8 more)

### Community 78 - "csv.ts"
Cohesion: 0.07
Nodes (30): BoundedCommandResult, withJsonRequestFile(), connectionFailure(), connectionResult(), extractPrUrl(), ghPrHeadSchema, ghPrSchema, ghPrStateSchema (+22 more)

### Community 79 - "WorktreeSession"
Cohesion: 0.33
Nodes (3): listeners, mcp, ReplyArgsSchema

### Community 80 - "recordedAction.ts"
Cohesion: 0.23
Nodes (17): alternation(), COMMAND_WRAPPERS, commandSegments(), commandWords(), executableName(), launchedPackageScript(), launchesTypecheck(), OPTIONS_WITH_VALUE (+9 more)

### Community 81 - "vcsCommands.ts"
Cohesion: 0.20
Nodes (7): AZURE_COMMANDS, COMMANDS_BY_PROVIDER, GITHUB_COMMANDS, PrDiffContext, VcsCleanCommands, AZ_SETTLED_THREAD_STATUSES, VCS_PROVIDER_LABELS

### Community 82 - "TicketOperations"
Cohesion: 0.20
Nodes (4): PublicMcpManager, FeasibilityStarter, isProcessing(), TicketOperations

### Community 86 - "useTickTimer.ts"
Cohesion: 0.36
Nodes (5): applyDesktopEnv(), DesktopRoots, ensureMcpToken(), regenerateMcpToken(), temporaryDirectories

### Community 87 - "codexBinary.ts"
Cohesion: 0.38
Nodes (5): normalizeCreateInput(), requestKeyConflictMessage(), ticketDependencyError(), isAllowedAgentPair(), deriveTitleFromDescription()

### Community 89 - "usePrdSearch.ts"
Cohesion: 0.11
Nodes (24): CompactTicket, ListTicketsInput, Column, COLUMN_LABELS, COLUMN_ORDER, COLUMNS, ACTIVE_COLUMNS, Board() (+16 more)

### Community 90 - "nvmNode.ts"
Cohesion: 0.22
Nodes (4): confirmPrMerged(), unmergedReason(), PR_STATE_LABELS, PrState

### Community 91 - ".onMessageStatus"
Cohesion: 0.36
Nodes (7): collectMatchRanges(), isShortcutDetail(), ShortcutDetail, supportsHighlightApi(), usePrdSearch(), UsePrdSearchOptions, UsePrdSearchResult

### Community 92 - "WorktreeAddressWatcher"
Cohesion: 0.29
Nodes (9): FILLED_GLYPH_COLORS, StageProgressBar(), StageProgressBarProps, CardState, DEAD_STAGES, PROGRESS_STAGES, stageCardState(), stageLabel() (+1 more)

### Community 93 - "ColumnActionsMenu.tsx"
Cohesion: 0.25
Nodes (7): Azure DevOps support — state file, Decisions (validated by the owner, 2026-09-21), Goal, Known blockers for lots 3 and 4, Open questions, Progress, Verified on this machine (az 2.90.0, azure-devops 1.0.8)

### Community 94 - ".addComment"
Cohesion: 0.09
Nodes (16): log, setup(), log, ReformulateManager, SessionHub, DRY_RUN_VERDICT, log, TriageManager (+8 more)

### Community 95 - "TicketConfigSummary.tsx"
Cohesion: 0.50
Nodes (3): appBundle, EMBEDDED_BINARIES, resourcesApp

### Community 97 - "RunningServer"
Cohesion: 0.06
Nodes (26): WorktreeAddressWatcher, buildAppSettingsPatch(), LegacyConfig, legacyConfigSchema, LegacyModels, log, migrateConfigJsonIfPresent(), parseLegacyConfig() (+18 more)

### Community 98 - "triageManager.ts"
Cohesion: 0.18
Nodes (10): AtelierDesktopRpcSchema, DesktopRequests, McpSettingsMetadata, McpTokenSource, WebviewRequests, McpSettingsController, McpSettings(), createMcpSettingsClient() (+2 more)

### Community 99 - "reviewPublishingGuard.ts"
Cohesion: 0.07
Nodes (31): API_GUARDS, API_READ_METHOD_SET, ApiGuard, AZ_INVOKE_COMMAND, AZ_INVOKE_METHOD_LONG_FLAGS, AZ_INVOKE_WRITE_INPUT_LONG_FLAGS, AZ_PR_WRITE_PATTERN, AZ_PR_WRITE_SUBCOMMANDS (+23 more)

### Community 100 - ".startVerification"
Cohesion: 0.15
Nodes (9): connectCodexAppServer(), fakeAppServer(), temporaryDirectories, writeFixture(), verifyCodexBinaryVersion(), createCodexAgentSession(), inheritedMcpServerNames(), PreparedHook (+1 more)

### Community 101 - "codexProvider.test.ts"
Cohesion: 0.42
Nodes (7): isCodexFastServiceTier(), summarizeSessionCosts(), totalTokensOfSessions(), executionCosts(), executionTokens(), projectStatRecord(), TicketCost()

### Community 102 - ".start"
Cohesion: 0.15
Nodes (4): startFeasibilityTicket(), runRecordedAction(), AgentMessage, ExecutionRun

### Community 103 - "TerminalSession"
Cohesion: 0.07
Nodes (11): FakePaneStream, RealPaneStream, PaneStream, dataMessage(), normalizeSeed(), safeParse(), send(), TerminalSession (+3 more)

### Community 104 - ".runWorktreeSetupScript"
Cohesion: 0.36
Nodes (7): effectivePort(), isAllowedHost(), isAllowedOrigin(), isAuthorized(), isLoopbackHost(), jsonResponse(), parseHost()

### Community 105 - "createMcpServer"
Cohesion: 0.43
Nodes (6): createMcpServer(), invalidInput(), listPublicProjects(), OutputValidator, toolError(), toolResult()

### Community 106 - "usePrdSearch.ts"
Cohesion: 0.15
Nodes (5): Logger, paint(), ScopedLogger, serializeFields(), timestamp()

### Community 107 - "azureRemote.ts"
Cohesion: 0.40
Nodes (10): azureOrgUrl(), fromAzureSegments(), fromCollectionSegments(), fromLegacySegments(), fromSshSegments(), parseAzureRepoRef(), parseRemoteLocation(), RemoteLocation (+2 more)

### Community 109 - "projectDisplay.ts"
Cohesion: 0.38
Nodes (4): formatCommitTimeout(), TimeoutUnit, timeoutUnitMs(), timeoutUnitOf()

### Community 110 - "Profile"
Cohesion: 0.10
Nodes (32): ProfileConfig, DragHandleAttributes, DragHandleListeners, ProfilePipeline(), ProfileRowHeader(), ProfileRowHeaderProps, ProfileRowProps, NOTE: the saved flag lives here because a saved row remounts (its key carries up (+24 more)

### Community 111 - "isProcessing"
Cohesion: 0.50
Nodes (3): Comment, ActivityTabProps, CommentRowProps

### Community 112 - "prd.ts"
Cohesion: 0.07
Nodes (30): cleanDescription(), createSplitChildren(), log, performSplit(), prSummaryLines(), reviewDescription(), RouteDeps, splitChildDefaults() (+22 more)

### Community 114 - "ApiDenyPatterns"
Cohesion: 0.67
Nodes (4): ApiDenyPatterns, ereFlagAlternatives(), ereMethod(), ereWriteInput()

### Community 115 - "isNotionUrl"
Cohesion: 0.50
Nodes (3): KIND_BADGES, TicketBadges(), TicketBadgesProps

### Community 116 - "settings.tsx"
Cohesion: 0.06
Nodes (51): pairedRuntimeCodexEffort(), AppSettings, CodexAgentFields(), ProfilesSettings(), AgentDefaultsSettings(), AppearanceSettings(), CODEX_STATUS_TONES, COMMIT_ROW (+43 more)

### Community 117 - "TicketMeta.tsx"
Cohesion: 0.24
Nodes (9): columnSchema, MetaRow(), MetaRowProps, STATUS_CONFIRMS, StatusConfirm, statusTitle(), TicketMeta(), TicketCostProps (+1 more)

## Knowledge Gaps
- **716 isolated node(s):** `SlotStatus`, `persistedReviewStatusSchema`, `reviewVerdictSchema`, `reviewVerificationStatusSchema`, `persistedReviewFindingsSchema` (+711 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Ticket` connect `TicketCard.tsx` to `Contract Building & Slots`, `Ticket Action Panels`, `Shared Zod Schemas`, `Settings & Profiles UI`, `PR Selection & Slots Bar`, `Core Domain Concepts`, `Live Terminal Views`, `Store Types & Agent Knobs`, `DB Row Schemas & Mappers`, `Dev Dependencies`, `Agents View & Ticket Cards`, `Board Columns`, `NPM Scripts`, `Runtime Dependencies`, `API Client Inputs`, `Ticket Config & Constants`, `Demo Pipeline Concepts`, `Session Hub Transcript`, `Modal Dialogs`, `Community 51`, `triageManager.ts`, `Package Manifest`, `splitManager.ts`, `split.ts`, `schema.test.ts`, `reviewFindings.ts`, `CodexRuntimeStatus`, `button.tsx`, `codexBinary.ts`, `usePrdSearch.ts`, `WorktreeAddressWatcher`, `.addComment`, `codexProvider.test.ts`, `.start`, `isProcessing`, `prd.ts`, `reformulate.ts`, `isNotionUrl`, `TicketMeta.tsx`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **Why does `Store` connect `.addComment` to `Feasibility Batch Management`, `Shared Zod Schemas`, `PR Selection & Slots Bar`, `Coordinator & Protocol`, `Store Types & Agent Knobs`, `DB Row Schemas & Mappers`, `Dev Dependencies`, `NPM Scripts`, `Agent Profile Config`, `API Client Inputs`, `Ticket Detail & Triage UI`, `Session Hub Transcript`, `Slot State`, `Community 51`, `Package Manifest`, `TicketCard.tsx`, `TerminalView.tsx`, `reviewFindings.ts`, `RunningServer`, `codexProvider.test.ts`, `.start`, `isProcessing`, `prd.ts`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Why does `DelegationManager` connect `API Client Inputs` to `Feasibility Batch Management`, `TerminalView.tsx`, `reviewFindings.ts`, `.start`, `PR Selection & Slots Bar`, `DB Row Schemas & Mappers`, `Package Manifest`, `.addComment`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **What connects `SlotStatus`, `persistedReviewStatusSchema`, `reviewVerdictSchema` to the rest of the system?**
  _727 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Contract Building & Slots` be split into smaller, more focused modules?**
  _Cohesion score 0.033873873873873875 - nodes in this community are weakly interconnected._
- **Should `Terminals UI & Notifications` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._
- **Should `Feasibility Batch Management` be split into smaller, more focused modules?**
  _Cohesion score 0.04525418748163385 - nodes in this community are weakly interconnected._