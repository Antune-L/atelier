# Graph Report - kanban-agents  (2026-09-25)

## Corpus Check
- 277 files · ~752,274 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3155 nodes · 8612 edges · 133 communities (120 shown, 13 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 62 edges (avg confidence: 0.66)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `06237ca1`
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
- prUrl.ts
- TerminalView.tsx
- schema.test.ts
- reviewFindings.ts
- CodexRuntimeStatus
- PostCSS Config
- useAppSettings.ts
- TerminalView.tsx
- button.tsx
- .handleRequest
- usePrdSearch.ts
- Community 77
- csv.ts
- WorktreeSession
- recordedAction.ts
- index.ts
- TicketOperations
- Community 83
- useTickTimer.ts
- mcpSettings.ts
- PaneStream
- bootstrap.ts
- TerminalSessionManager
- ColumnActionsMenu.tsx
- .addComment
- TicketConfigSummary.tsx
- useTickTimer.ts
- RunningServer
- usePrdSearch.ts
- reviewPublishingGuard.ts
- .startVerification
- codexProvider.test.ts
- .start
- TerminalSession
- settings.tsx
- createMcpServer
- usePrdSearch.ts
- azureRemote.ts
- WorkflowView.tsx
- projectDisplay.ts
- Profile
- FakePaneStream
- useSavedFlash.ts
- repairPath.ts
- ApiDenyPatterns
- relaunch.ts
- settings.tsx
- useAppSettings.ts
- StageProgressBar.tsx
- AgentMessage
- ProjectPanel.tsx
- VcsConnectionResult
- createMcpServer
- projectDisplay.ts
- useSavedFlash.ts
- TicketOperations
- TerminalSessionManager
- terminalManager.ts
- prUrl.ts
- .handleMessage
- isProcessing

## God Nodes (most connected - your core abstractions)
1. `Store` - 126 edges
2. `Ticket` - 114 edges
3. `SystemAdapter` - 74 edges
4. `FakeSystemAdapter` - 69 edges
5. `RealSystemAdapter` - 66 edges
6. `cn()` - 65 edges
7. `SlotManager` - 55 edges
8. `DelegationManager` - 50 edges
9. `ProjectInfo` - 47 edges
10. `SessionHub` - 45 edges

## Surprising Connections (you probably didn't know these)
- `McpSettingsClient` --references--> `McpSettingsMetadata`  [EXTRACTED]
  src/web/src/lib/mcpSettings.ts → desktop/mcpRpc.ts
- `AppSettingsState` --references--> `AppSettings`  [EXTRACTED]
  src/web/src/hooks/useAppSettings.ts → src/shared/schemas.ts
- `StageProgressBarProps` --references--> `Ticket`  [EXTRACTED]
  src/web/src/components/StageProgressBar.tsx → src/shared/schemas.ts
- `DescriptionTabProps` --references--> `Ticket`  [EXTRACTED]
  src/web/src/components/ticket-detail/DescriptionTab.tsx → src/shared/schemas.ts
- `PrdTabProps` --references--> `Ticket`  [EXTRACTED]
  src/web/src/components/ticket-detail/PrdTab.tsx → src/shared/schemas.ts

## Import Cycles
- 3-file cycle: `src/server/config.ts -> src/server/db/store.ts -> src/server/db/rows.ts -> src/server/config.ts`
- 3-file cycle: `src/server/agents/worktreeAddresses.ts -> src/server/config.ts -> src/server/db/store.ts -> src/server/agents/worktreeAddresses.ts`

## Communities (133 total, 13 thin omitted)

### Community 0 - "Contract Building & Slots"
Cohesion: 0.03
Nodes (73): ActionExecutionOptions, actionExecutionOptionsSchema, agentMessageSchema, AnalyzeTicketsInput, appSettingsSchema, automationRunSchema, automationSchema, baseBranchSchema (+65 more)

### Community 1 - "Terminals UI & Notifications"
Cohesion: 0.10
Nodes (20): analyzeTicketsInputSchema, analyzeTicketsOutputSchema, columnSchema, compactTicketSchema, createTodoTicketOutputSchema, editableTicketSchema, listProjectsInputSchema, listProjectsOutputSchema (+12 more)

### Community 2 - "Desktop Bootstrap & Menus"
Cohesion: 0.07
Nodes (33): CodexAppServerConnection, CodexAppServerInitializationError, CodexAppServerProtocolError, connectCodexAppServer(), incomingSchema, initializeResponseSchema, log, rpcErrorSchema (+25 more)

### Community 3 - "Feasibility Batch Management"
Cohesion: 0.07
Nodes (34): log, logRejection(), ToolHandler, ToolResult, TRIAGE_VERDICTS, AgentSettableStage, agentSettableStageSchema, askUserArgsSchema (+26 more)

### Community 4 - "Ticket Action Panels"
Cohesion: 0.12
Nodes (11): AckSystem, RecordedSession, RecordingSystem, RecordedSession, RecordingSystem, RelaunchSystem, AgentProvider, AgentSessionHandle (+3 more)

### Community 5 - "Fake System Adapter"
Cohesion: 0.09
Nodes (32): RepoInspectionSource, CreateProjectInput, ManagedProject, RepoInspection, UpdateProjectInput, vcsProviderSchema, ConnectionHint, CreateStep (+24 more)

### Community 6 - "Shared Zod Schemas"
Cohesion: 0.05
Nodes (54): AGENT_EFFORT_LABELS, AGENT_MODEL_LABELS, AutomationCard(), AutomationCardProps, AutomationFormProps, AutomationView(), EMPTY_FORM, formFromAutomation() (+46 more)

### Community 7 - "Settings & Profiles UI"
Cohesion: 0.06
Nodes (7): FailedReformulation, delay(), fakeMissingKey(), FakePaneStream, fakeShellPrompt(), FakeSystemAdapter, hexToBytes()

### Community 8 - "PR Selection & Slots Bar"
Cohesion: 0.16
Nodes (20): AgentCard(), AgentCardProps, AgentsView(), AgentsViewProps, hasLiveAgent(), normalize(), resolveProjectColor(), resolveProjectLabel() (+12 more)

### Community 9 - "Real System Adapter"
Cohesion: 0.05
Nodes (60): pairedRuntimeCodexEffort(), AUTOMATION_RUN_STATUSES, AUTOMATION_TRIGGER_LABELS, AUTOMATION_TRIGGERS, CODEX_EFFORT_LABELS, CODEX_MODEL_EFFORTS, CODEX_MODEL_LABELS, COMMENT_AUTHORS (+52 more)

### Community 10 - "Slot Config & Worktree Watch"
Cohesion: 0.18
Nodes (17): COLUMN_SORT_FIELD, BoardColumn(), compareFamilyMembers(), familyKeyOf(), groupTicketIds(), groupTicketsByFamily(), isSplitMother(), readCollapsed() (+9 more)

### Community 11 - "Core Domain Concepts"
Cohesion: 0.04
Nodes (52): agentMessageRowSchema, AutomationRow, automationRowSchema, AutomationRunRow, automationRunRowSchema, buildScripts(), CommentRow, commentRowSchema (+44 more)

### Community 13 - "Database Store Operations"
Cohesion: 0.09
Nodes (39): RFC-4180, AskPanel(), CleanPrPanel(), ImportTicketsPanel(), ProjectPrPicker(), ProjectPrPickerProps, ReviewPrPanel(), SessionDriverFields() (+31 more)

### Community 14 - "Coordinator & Protocol"
Cohesion: 0.10
Nodes (27): renderOutsideDiffComment(), renderOutsideDiffSection(), ReviewPublicationComment, azureChangeEntrySchema, azureCommentSchema, azureIdentitySchema, azureIterationChangesSchema, azureIterationListSchema (+19 more)

### Community 15 - "API Routes & Reformulate"
Cohesion: 0.10
Nodes (29): main(), scalar(), groupFeasibilityTickets(), assertCodexDowngradeSafe(), backfillOrchestrator(), countRows(), createDatabase(), EXECUTION_MIGRATIONS (+21 more)

### Community 16 - "Stats Aggregation"
Cohesion: 0.13
Nodes (3): startParentSession(), SessionHubHandlers, SessionStartCallbacks

### Community 17 - "Triage & Server Hub"
Cohesion: 0.08
Nodes (25): devDependencies, autoprefixer, class-variance-authority, clsx, concurrently, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities (+17 more)

### Community 18 - "Live Terminal Views"
Cohesion: 0.08
Nodes (34): isReviewFixSession(), AZURE_BASH_ALLOWLIST, AZURE_CLEAN_BASH_ALLOWLIST, BASH_ALLOWLIST, bashAllowlist(), buildFeasibilitySessionConfig(), buildImplementSessionConfig(), buildSplitSessionConfig() (+26 more)

### Community 19 - "Stage Progress & Display"
Cohesion: 0.08
Nodes (24): compilerOptions, allowImportingTsExtensions, baseUrl, esModuleInterop, isolatedModules, jsx, lib, module (+16 more)

### Community 20 - "Real Adapter GH/Composer"
Cohesion: 0.10
Nodes (31): FAILURE_COLUMNS, Kind, KINDS, SUCCESS_COLUMNS, DurationChart(), SuccessRateChart(), effectiveWorkDurationMs(), CodexTierSummary (+23 more)

### Community 21 - "Store Types & Agent Knobs"
Cohesion: 0.19
Nodes (26): buildCleanContract(), buildConflictResolutionContract(), buildFeasibilityContextSection(), buildImplementingSteps(), buildMockupReviewStep(), buildPlanningStep(), buildPrdBullet(), buildReviewContract() (+18 more)

### Community 22 - "DB Row Schemas & Mappers"
Cohesion: 0.19
Nodes (17): groupReviewCount(), initialExpandedGroups(), projectInitial(), ProjectSelect(), ProjectSelectOption, ProjectSelectProps, FilteredProjectGroup, filterProjectGroups() (+9 more)

### Community 23 - "Dev Dependencies"
Cohesion: 0.09
Nodes (19): TicketCreationRequestConflictError, AnalyzeTicketRejectionReason, AnalyzeTicketsResult, CreateTodoTicketInput, createTodoTicketInputSchema, CreateTodoTicketResult, isActive(), isBlocked() (+11 more)

### Community 24 - "TypeScript Config"
Cohesion: 0.14
Nodes (22): bashCommandSchema, buildSettings(), claudeProvider, createSdkAgentSession(), denyBashHook(), denyNoVerifyHook, denyReviewPublishingHook, denyTypecheckHook() (+14 more)

### Community 26 - "Cost & Pricing"
Cohesion: 0.20
Nodes (9): AtelierDesktopRpcSchema, DesktopRequests, McpSettingsMetadata, WebviewRequests, McpSettingsController, McpSettings(), createMcpSettingsClient(), getMcpSettingsClient() (+1 more)

### Community 27 - "Workflow View & Lifecycle"
Cohesion: 0.05
Nodes (29): Architecture, Commands, Conventions (enforced — beyond the global ones in ~/.claude/CLAUDE.md), graphify, The dry-run safety model — read before running anything, What this is, Agent runtime (Agent SDK), Architecture (+21 more)

### Community 28 - "Stats Charts"
Cohesion: 0.06
Nodes (46): AgentMcpServerDefinition, canonicalJson(), CodexCommandHook, codexSessionPreToolUseHookHash(), JsonValue, agentMessageDeltaSchema, agentToml(), apiWriteDenyScript() (+38 more)

### Community 29 - "Session Hub & Agent Session"
Cohesion: 0.08
Nodes (35): isNotionUrl(), NOTION_HOSTS, NewTicketSheet(), DescriptionEdit, DescriptionTab(), DescriptionTabProps, NOTE: the draft now mirrors what was persisted, so it is no longer unsent text., LaunchForm() (+27 more)

### Community 30 - "Agents View & Ticket Cards"
Cohesion: 0.12
Nodes (13): directories, initializeParamsSchema, log, requestSchema, rpcError(), rpcResult(), rpcResponseSchema, toolCallParamsSchema (+5 more)

### Community 31 - "PRD Review & Markdown"
Cohesion: 0.13
Nodes (23): ALSO_FLAGGED_PREFIX, dedupeFindings(), dedupeIdenticalFindings(), findingAnchor(), FRENCH_STOP_WORD_PATTERN, FRENCH_STOP_WORDS, hasSimilarSummary(), isSameDefect() (+15 more)

### Community 32 - "User Terminal & Fake IO"
Cohesion: 0.12
Nodes (25): ActiveDelegation, ClosableExecution, ExecutionFinishStatus, LiveSession, log, PendingSessionMessage, previewToolInput(), renderSessionEvent() (+17 more)

### Community 33 - "Logging"
Cohesion: 0.10
Nodes (21): scripts, build:desktop, build:web, dev, dev:desktop, dev:proxy, dev:server, dev:web (+13 more)

### Community 34 - "Board Columns"
Cohesion: 0.39
Nodes (7): emit(), loadedSubscribers, loadOnce(), refreshProjects(), subscribers, useProjects(), useProjectsLoaded()

### Community 35 - "NPM Scripts"
Cohesion: 0.14
Nodes (8): addUsageByModel(), toUsageByModel(), mapTicketRow(), TicketLifecycle, TERMINAL_STAGES, Ticket, TerminalTab(), TerminalTabProps

### Community 36 - "Runtime Dependencies"
Cohesion: 0.12
Nodes (5): ImplementSessionInput, NewProject, ProjectPatch, PrepareReviewWorktreeOptions, VcsProvider

### Community 37 - "Claude SDK Provider"
Cohesion: 0.09
Nodes (22): dependencies, @anthropic-ai/claude-agent-sdk, dompurify, elysia, @fontsource/ibm-plex-mono, @fontsource/ibm-plex-sans, marked, @modelcontextprotocol/sdk (+14 more)

### Community 38 - "Agent Profile Config"
Cohesion: 0.12
Nodes (22): isCodexFastServiceTier(), costByFamily(), costOf(), costOfModel(), costOfSessions(), CostSummary, FamilyPricing, MODEL_PRICING (+14 more)

### Community 39 - "Agent Coordinator Handlers"
Cohesion: 0.11
Nodes (27): artifactPath, assertPackageVersionInSync(), assertSdkVersionsInSync(), BUILT_DMG, ELECTROBUN_BIN, fail(), installedPackageVersion(), RELEASE_FOLDER (+19 more)

### Community 40 - "API Client Inputs"
Cohesion: 0.17
Nodes (5): childTranscriptPrefix(), DelegationManager, reviewKey(), mergeAgentUsageByModel(), AgentSessionEvent

### Community 41 - "Ticket Config & Constants"
Cohesion: 0.12
Nodes (20): ProjectInfo, StatRecord, AskPanelProps, CleanPrPanelProps, ImportTicketsPanelProps, NewTicketSheetProps, ReviewPrPanelProps, StatCard() (+12 more)

### Community 42 - "Ticket Detail & Triage UI"
Cohesion: 0.14
Nodes (17): ACTIVE_BAR, AREA_CURSOR, AXIS_PROPS, BAR_CURSOR, CHART_PALETTE, colorAt(), DurationBars(), DurationDatum (+9 more)

### Community 43 - "Demo Pipeline Concepts"
Cohesion: 0.42
Nodes (4): PaneStream, dataMessage(), send(), TerminalSession

### Community 44 - "Chart Primitives"
Cohesion: 0.31
Nodes (13): abortReason(), computeCodeFingerprint(), FingerprintEntry, FingerprintPhase, hashFingerprintPaths(), isMissingFileError(), listFingerprintPaths(), log (+5 more)

### Community 45 - "Session Hub Transcript"
Cohesion: 0.10
Nodes (17): resolveBaseBranch(), buildAskContract(), featureBranch(), slotPath(), slugify(), resolveTemplatePaths(), TemplatePaths, computeWorktreeAddresses() (+9 more)

### Community 46 - "Community 46"
Cohesion: 0.27
Nodes (15): Agent Implementation Config, Argus Code Review, Automated Tests (typecheck/lint/test), Claude Code Autonomous Agent, Ticket Contract Injection, Feasibility Analysis, Kanban Board (Atelier), Kanban Agents Demo (demo.gif) (+7 more)

### Community 47 - "Modal Dialogs"
Cohesion: 0.22
Nodes (6): AZURE_COMMANDS, COMMANDS_BY_PROVIDER, GITHUB_COMMANDS, PrDiffContext, VcsCleanCommands, AZ_SETTLED_THREAD_STATUSES

### Community 48 - "Community 48"
Cohesion: 0.11
Nodes (25): CompactTicket, ListTicketsInput, Column, COLUMN_LABELS, COLUMN_ORDER, COLUMNS, ACTIVE_COLUMNS, Board() (+17 more)

### Community 49 - "Slot State"
Cohesion: 0.09
Nodes (20): wsClientEventSchema, ATTENTION_STATUSES, sessionOf(), SlotPips(), SlotPipsProps, STATUS_LABELS, STATUS_PIP_CLASSES, active (+12 more)

### Community 50 - "Stats Hooks & Cards"
Cohesion: 0.16
Nodes (12): ChartConfig, ChartContainer, ChartContainerProps, ChartContext, ChartContextValue, ChartLegendContent(), ChartLegendContentProps, ChartTooltipContent() (+4 more)

### Community 51 - "Community 51"
Cohesion: 0.09
Nodes (21): AGENTS_SKILLS_DIR, CLAUDE_JSON_PATH, CLAUDE_SKILLS_DIR, commandOutputOrNull(), COMPOSER_BINARIES, DEFAULT_CODEX_HOME, GitRemoteFacts, INSTALL_COMMANDS (+13 more)

### Community 52 - "repairPath.ts"
Cohesion: 0.06
Nodes (36): Block, blockText(), compactChunks(), firstCharCode(), TranscriptBuffer, trimBlockStart(), AgentStreamBlock, terminalServerMessageSchema (+28 more)

### Community 53 - "User Terminal Manager"
Cohesion: 0.33
Nodes (5): CONTEXT — domain glossary, Execution, Proposed (not yet built), Seams, Work items

### Community 54 - "Community 54"
Cohesion: 0.07
Nodes (24): extractPrUrl(), ghPrHeadSchema, ghPrSchema, ghPrStateSchema, ghRestPullSchema, ghRestReviewPagesSchema, ghRestReviewSchema, ghRestReviewsSchema (+16 more)

### Community 55 - "App.tsx"
Cohesion: 0.14
Nodes (5): FeasibilityBatchManager, toTriageResult(), TriageManager, FeasibilityResult, TriageResult

### Community 56 - "CSV Parsing"
Cohesion: 0.16
Nodes (18): isProcessing(), ACTIVE_STAGES, PR_STATE_LABELS, ColumnActionsMenu(), ColumnActionsMenuProps, ColumnMenuItem, ActionContext, buildActions() (+10 more)

### Community 57 - "Community 57"
Cohesion: 0.21
Nodes (6): ReviewPublicationState, GithubVcsClient, pullApiEndpoint(), reviewApiEndpoint(), rightSideDiffLines(), ReviewPublicationCheck

### Community 58 - "File Uploads"
Cohesion: 0.35
Nodes (9): gitMetadataWritableRoots(), agentBaseEnv(), bestInstalledMatch(), compareParts(), envWithProjectNode(), nvmNodeBinDir(), readNvmrc(), prepareProjectShell() (+1 more)

### Community 59 - "triageManager.ts"
Cohesion: 0.27
Nodes (15): buildContractConstraintsLines(), buildResponseFormatLines(), buildStrictRulesLines(), buildTicketLines(), buildTriageChannelPrompt(), buildTriagePlusChannelPrompt(), isEnglish(), readOnlyFramingLines() (+7 more)

### Community 60 - "Package Manifest"
Cohesion: 0.18
Nodes (5): detectInstallCommand(), realpathSafe(), resolveWorktreeScriptCommand(), setupOutputExcerpt(), shQuote()

### Community 61 - "splitManager.ts"
Cohesion: 0.16
Nodes (3): SlotManager, projectVcsProvider(), mapSlotRow()

### Community 62 - "TicketCard.tsx"
Cohesion: 0.10
Nodes (30): mapCommentRow(), Comment, PrdAnnotatorProps, BREADCRUMB, NO_ANNOTATIONS, PrdReviewDialog(), PrdReviewDialogProps, ActivityTab() (+22 more)

### Community 63 - "Community 63"
Cohesion: 0.33
Nodes (9): useTheme(), UseThemeResult, applyTheme(), getStoredTheme(), isTheme(), Theme, ThemeOption, THEMES (+1 more)

### Community 64 - "Composer Run Script"
Cohesion: 0.26
Nodes (11): dragKeys(), groupCountLabel(), groupSortId(), ListGroup, ProjectList(), ProjectListProps, ProjectListRowProps, projectSortId() (+3 more)

### Community 65 - "split.ts"
Cohesion: 0.13
Nodes (18): buildRepoInspection(), formatProjectLabel(), LOCKFILE_NAMES, LOCKFILE_RUNNERS, PackageManifest, packageManifestSchema, PROVIDER_HOST_MARKERS, RepoFacts (+10 more)

### Community 66 - "prUrl.ts"
Cohesion: 0.19
Nodes (4): AutomationManager, log, mapAutomationRow(), Automation

### Community 67 - "TerminalView.tsx"
Cohesion: 0.08
Nodes (22): Watchdog, PROJECT_ROOT, NOTE: PRD generation holds the request open up to ~120s (REFORMULATE_TIMEOUT_MS), resolveDataFile(), resolveServerPort(), serveStaticAsset(), SocketData, startServer() (+14 more)

### Community 68 - "schema.test.ts"
Cohesion: 0.09
Nodes (31): FILLED_GLYPH_COLORS, StageProgressBar(), StageProgressBarProps, TICKET_TAB_LABELS, TicketTab, TicketTabs(), TicketTabsProps, availableTabs() (+23 more)

### Community 69 - "reviewFindings.ts"
Cohesion: 0.06
Nodes (42): BOARD_FINDING_RENDER_STYLE, log, orderedReviewKinds(), renderCollapsedFinding(), renderFinding(), renderPersistedReviewResult(), REVIEW_DISALLOWED_TOOLS, REVIEW_REPORT_LABELS (+34 more)

### Community 70 - "CodexRuntimeStatus"
Cohesion: 0.07
Nodes (34): ActiveReview, ActiveReviewPass, assertExecutionAvailable(), CODEX_LAUNCH_STATUS_MESSAGES, CodexCapabilityReader, ExecutionDefaults, FEASIBILITY_ENGINE_EXECUTION, ResolvedExecution (+26 more)

### Community 71 - "PostCSS Config"
Cohesion: 0.29
Nodes (6): name, overrides, zod, private, type, version

### Community 72 - "useAppSettings.ts"
Cohesion: 0.22
Nodes (4): McpTokenSource, createMcpSettingsController(), McpSettingsControllerDependencies, temporaryDirectories

### Community 73 - "TerminalView.tsx"
Cohesion: 0.20
Nodes (15): CodexConnectionStatus(), STATUS_LABELS, clearRetry(), loadCapabilities(), LoadOptions, publish(), refreshCapabilities(), RETRY_DELAYS_MS (+7 more)

### Community 74 - "button.tsx"
Cohesion: 0.11
Nodes (22): expectedSkillPaths(), HOST_SKILL_ROOTS, SKILL_REQUIREMENTS, SKILL_TIERS, SkillRequirement, SKILLS_CLI_AGENTS, SkillTier, skillzerInstallCommand() (+14 more)

### Community 75 - ".handleRequest"
Cohesion: 0.11
Nodes (13): analyzeResultSchema, compactTicketSchema, createResultSchema, errorResultSchema, ISOLATED_ENV_KEYS, projectResultSchema, savedEnv, startResultSchema (+5 more)

### Community 76 - "usePrdSearch.ts"
Cohesion: 0.13
Nodes (4): allowedReviewPasses(), mapReviewApprovalRow(), mapReviewPassRow(), parsePersistedReviewFindings()

### Community 78 - "csv.ts"
Cohesion: 0.09
Nodes (9): DoneGateResult, ReviewHeadResult, FAKE_OPEN_PRS, FakeVcsClient, githubPrHeadRef(), VcsClient, isPrNeedsAttention(), OpenPr (+1 more)

### Community 79 - "WorktreeSession"
Cohesion: 0.33
Nodes (3): listeners, mcp, ReplyArgsSchema

### Community 80 - "recordedAction.ts"
Cohesion: 0.24
Nodes (16): alternation(), COMMAND_WRAPPERS, commandSegments(), commandWords(), executableName(), launchedPackageScript(), launchesTypecheck(), OPTIONS_WITH_VALUE (+8 more)

### Community 81 - "index.ts"
Cohesion: 0.17
Nodes (17): ensureConfig(), boot(), externalUrlFromNewWindowEvent(), forwardAtelierShortcut(), installApplicationMenu(), installMenuShortcutBridge(), menuShortcutActionSchema, navigationEventSchema (+9 more)

### Community 82 - "TicketOperations"
Cohesion: 0.24
Nodes (17): AGENT_EFFORT_FULL_LABELS, AGENT_MODEL_FULL_LABELS, CODEX_EFFORT_FULL_LABELS, ProfilePipeline(), buildProfilePipeline(), claudeDetail(), claudeSubagentDetail(), codexOrchestratorDetail() (+9 more)

### Community 86 - "useTickTimer.ts"
Cohesion: 0.50
Nodes (3): KIND_BADGES, TicketBadges(), TicketBadgesProps

### Community 87 - "mcpSettings.ts"
Cohesion: 0.08
Nodes (59): ExecutionOverrides, DEFAULT_MODELS, ProjectKey, mapAutomationRunRow(), AttachExecutionSessionInput, AutomationPatch, EnqueueAgentMessageInput, FinalizeExecutionInput (+51 more)

### Community 90 - "PaneStream"
Cohesion: 0.16
Nodes (9): RecordingSystemAdapter, GitWorktreeAddOptions, PaneSize, PublishReviewOptions, PublishReviewResult, ReviewDoneOptions, RunAutomationOptions, SpawnShellOptions (+1 more)

### Community 91 - "bootstrap.ts"
Cohesion: 0.18
Nodes (9): ActionSystem, CapabilityCache, ImportNotionOptions, CodexRuntimeModel, codexRuntimeModelSchema, CodexRuntimeStatus, codexRuntimeStatusSchema, UNKNOWN_CODEX_RUNTIME_STATUS (+1 more)

### Community 92 - "TerminalSessionManager"
Cohesion: 0.24
Nodes (9): CostSummary(), MetaRow(), MetaRowProps, TicketCost(), TicketCostProps, formatTokens(), formatUsd(), TOKEN_FORMATTER (+1 more)

### Community 93 - "ColumnActionsMenu.tsx"
Cohesion: 0.25
Nodes (7): Azure DevOps support — state file, Decisions (validated by the owner, 2026-09-21), Goal, Known blockers for lots 3 and 4, Open questions, Progress, Verified on this machine (az 2.90.0, azure-devops 1.0.8)

### Community 94 - ".addComment"
Cohesion: 0.08
Nodes (20): setup(), DRY_RUN_VERDICT, FeasibilityGroup, log, QueuedFeasibility, log, ReformulateManager, SessionHub (+12 more)

### Community 95 - "TicketConfigSummary.tsx"
Cohesion: 0.50
Nodes (3): appBundle, EMBEDDED_BINARIES, resourcesApp

### Community 97 - "RunningServer"
Cohesion: 0.09
Nodes (26): log, SlotWatch, log, runFirstBootSetup(), applyAppSettingsToModels(), initProjectRegistry(), listProjectKeys(), log (+18 more)

### Community 98 - "usePrdSearch.ts"
Cohesion: 0.13
Nodes (13): boundedCommandDetail(), runBoundedCommand(), safeJsonParse(), withJsonRequestFile(), ReviewPublicationEvent, AzureDevopsVcsClient, prWebUrl(), readOriginRemote() (+5 more)

### Community 99 - "reviewPublishingGuard.ts"
Cohesion: 0.07
Nodes (35): API_GUARDS, API_READ_METHOD_SET, ApiDenyPatterns, ApiGuard, AZ_INVOKE_COMMAND, AZ_INVOKE_METHOD_LONG_FLAGS, AZ_INVOKE_WRITE_INPUT_LONG_FLAGS, AZ_PR_WRITE_PATTERN (+27 more)

### Community 100 - ".startVerification"
Cohesion: 0.36
Nodes (5): applyDesktopEnv(), DesktopRoots, ensureMcpToken(), regenerateMcpToken(), temporaryDirectories

### Community 101 - "codexProvider.test.ts"
Cohesion: 0.18
Nodes (13): SkillStatus, availableSkillProviders(), missingSkillProviders(), SkillsSettings(), missingSignature(), MissingSkill, PreflightCopy, providerList() (+5 more)

### Community 102 - ".start"
Cohesion: 0.07
Nodes (13): startFeasibilityTicket(), ProjectConfig, mapAgentMessageRow(), mapProfileRow(), mapTicketCreationRequestRow(), nullableBooleanValue(), serializeErrorDetails(), SqlUpdateBuilder (+5 more)

### Community 104 - "settings.tsx"
Cohesion: 0.09
Nodes (12): CodexAppServerNotification, CodexAppServerOptions, CodexAppServerRpcError, CodexProviderDependencies, createCodexProvider(), AppServerFixture, AppServerFixtureOptions, hookPathForSession() (+4 more)

### Community 106 - "usePrdSearch.ts"
Cohesion: 0.09
Nodes (20): WorktreeAddressWatcher, ANSI, appendToLogFile(), COLOR_ENABLED, disableFileLogging(), initLogFile(), isLevel(), Level (+12 more)

### Community 107 - "azureRemote.ts"
Cohesion: 0.40
Nodes (10): azureOrgUrl(), fromAzureSegments(), fromCollectionSegments(), fromLegacySegments(), fromSshSegments(), parseAzureRepoRef(), parseRemoteLocation(), RemoteLocation (+2 more)

### Community 108 - "WorkflowView.tsx"
Cohesion: 0.23
Nodes (10): buildFeasibilityBatchContract(), cleanTicket(), conflictTicket(), REVIEW_OPTS, reviewTicket(), TICKET_OPTS, truncateDescription(), BASE_TICKET (+2 more)

### Community 109 - "projectDisplay.ts"
Cohesion: 0.46
Nodes (5): buildSplitChannelPrompt(), buildTicketLines(), isEnglish(), extractFigmaUrls(), hasMockups()

### Community 110 - "Profile"
Cohesion: 0.11
Nodes (28): ProfileConfig, AgentProfileConfig(), DragHandleAttributes, DragHandleListeners, ProfileRow(), ProfileRowHeader(), ProfileRowHeaderProps, ProfileRowProps (+20 more)

### Community 111 - "FakePaneStream"
Cohesion: 0.39
Nodes (7): currentNow, getSnapshot(), startTicking(), stopTicking(), subscribe(), subscribers, useTickTimer()

### Community 112 - "useSavedFlash.ts"
Cohesion: 0.40
Nodes (3): App(), HOME_VIEW_OPTIONS, HomeView

### Community 113 - "repairPath.ts"
Cohesion: 0.23
Nodes (9): CHILD_USAGE, FULL_REVIEW_KINDS, LIGHT_REVIEW_KINDS, newDelegatedTicket(), newReviewTicket(), setup(), sleep(), startAndApproveReviews() (+1 more)

### Community 114 - "ApiDenyPatterns"
Cohesion: 0.06
Nodes (43): agentPairError(), cleanDescription(), createApiRoutes(), createSplitChildren(), failSplitMother(), isBlocked(), isSplitMother(), isWebOnlyPath() (+35 more)

### Community 115 - "relaunch.ts"
Cohesion: 0.47
Nodes (5): COLUMN_NODE_COLOR, depthOf(), truncate(), WorkflowView(), WorkflowViewProps

### Community 116 - "settings.tsx"
Cohesion: 0.07
Nodes (23): CODEX_STATUS_TONES, COMMIT_ROW, DefaultsRowSpec, EFFORT_OPTIONS, FEASIBILITY_ROW, IMPLEMENTATION_ROW, KnobGroupProps, LANGUAGE_OPTIONS (+15 more)

### Community 117 - "useAppSettings.ts"
Cohesion: 0.18
Nodes (15): AppSettingsState, flashSaved(), loadOnce(), patchAppSettings(), publish(), snapshot(), state, subscribe() (+7 more)

### Community 121 - "VcsConnectionResult"
Cohesion: 0.33
Nodes (4): BoundedCommandResult, connectionFailure(), connectionResult(), VcsConnectionResult

### Community 122 - "createMcpServer"
Cohesion: 0.53
Nodes (5): createMcpServer(), invalidInput(), OutputValidator, toolError(), toolResult()

### Community 123 - "projectDisplay.ts"
Cohesion: 0.38
Nodes (4): formatCommitTimeout(), TimeoutUnit, timeoutUnitMs(), timeoutUnitOf()

### Community 124 - "useSavedFlash.ts"
Cohesion: 0.36
Nodes (7): effectivePort(), isAllowedHost(), isAllowedOrigin(), isAuthorized(), isLoopbackHost(), jsonResponse(), parseHost()

### Community 126 - "TicketOperations"
Cohesion: 0.25
Nodes (3): listPublicProjects(), PublicMcpManager, TicketOperations

### Community 129 - "terminalManager.ts"
Cohesion: 0.29
Nodes (7): log, normalizeSeed(), TerminalSocket, TerminalSocketData, visibleText(), terminalClientMessageSchema, TerminalServerMessage

### Community 130 - "prUrl.ts"
Cohesion: 0.40
Nodes (5): VCS_PROVIDERS, parsePrUrl(), PR_URL_SEGMENT, prNumberFromUrl(), PrUrlRef

## Knowledge Gaps
- **742 isolated node(s):** `What this is`, `Commands`, `graphify`, `The dry-run safety model — read before running anything`, `Architecture` (+737 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Ticket` connect `NPM Scripts` to `Contract Building & Slots`, `Shared Zod Schemas`, `PR Selection & Slots Bar`, `Real System Adapter`, `Slot Config & Worktree Watch`, `Core Domain Concepts`, `Live Terminal Views`, `Store Types & Agent Knobs`, `Dev Dependencies`, `Client Hub & Watchdog`, `Session Hub & Agent Session`, `Runtime Dependencies`, `Agent Profile Config`, `API Client Inputs`, `Ticket Config & Constants`, `Session Hub Transcript`, `Community 48`, `Slot State`, `CSV Parsing`, `triageManager.ts`, `splitManager.ts`, `TicketCard.tsx`, `schema.test.ts`, `reviewFindings.ts`, `CodexRuntimeStatus`, `usePrdSearch.ts`, `useTickTimer.ts`, `mcpSettings.ts`, `TerminalSessionManager`, `.addComment`, `.start`, `createMcpServer`, `WorkflowView.tsx`, `projectDisplay.ts`, `useSavedFlash.ts`, `repairPath.ts`, `ApiDenyPatterns`, `relaunch.ts`, `ProjectPanel.tsx`?**
  _High betweenness centrality (0.070) - this node is a cross-community bridge._
- **Why does `RealSystemAdapter` connect `Board & Sidebar Layout` to `TerminalView.tsx`, `codexProvider.test.ts`, `Community 51`, `StageProgressBar.tsx`, `usePrdSearch.ts`, `Package Manifest`, `Agents View & Ticket Cards`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Why does `Store` connect `.start` to `terminalManager.ts`, `Feasibility Batch Management`, `API Routes & Reformulate`, `Store Types & Agent Knobs`, `Dev Dependencies`, `Client Hub & Watchdog`, `User Terminal & Fake IO`, `NPM Scripts`, `Agent Profile Config`, `API Client Inputs`, `Session Hub Transcript`, `splitManager.ts`, `TicketCard.tsx`, `prUrl.ts`, `TerminalView.tsx`, `reviewFindings.ts`, `CodexRuntimeStatus`, `usePrdSearch.ts`, `mcpSettings.ts`, `.addComment`, `RunningServer`, `createMcpServer`, `WorkflowView.tsx`, `repairPath.ts`, `TerminalSessionManager`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **What connects `What this is`, `Commands`, `graphify` to the rest of the system?**
  _754 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Contract Building & Slots` be split into smaller, more focused modules?**
  _Cohesion score 0.03383458646616541 - nodes in this community are weakly interconnected._
- **Should `Terminals UI & Notifications` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._
- **Should `Desktop Bootstrap & Menus` be split into smaller, more focused modules?**
  _Cohesion score 0.0700354609929078 - nodes in this community are weakly interconnected._