# Graph Report - kanban-agents-skills-preflight  (2026-09-25)

## Corpus Check
- 272 files · ~748,980 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3079 nodes · 8535 edges · 129 communities (119 shown, 10 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 61 edges (avg confidence: 0.66)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5628739f`
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
- usePrdSearch.ts
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
- usePrdSearch.ts
- createMcpServer
- projectDisplay.ts
- useSavedFlash.ts
- Logger
- listProjectKeys

## God Nodes (most connected - your core abstractions)
1. `Store` - 126 edges
2. `Ticket` - 114 edges
3. `SystemAdapter` - 77 edges
4. `FakeSystemAdapter` - 69 edges
5. `cn()` - 65 edges
6. `RealSystemAdapter` - 64 edges
7. `SlotManager` - 55 edges
8. `DelegationManager` - 50 edges
9. `ProjectInfo` - 47 edges
10. `SessionHub` - 45 edges

## Surprising Connections (you probably didn't know these)
- `McpSettingsClient` --references--> `McpSettingsMetadata`  [EXTRACTED]
  src/web/src/lib/mcpSettings.ts → desktop/mcpRpc.ts
- `StageProgressBarProps` --references--> `Ticket`  [EXTRACTED]
  src/web/src/components/StageProgressBar.tsx → src/shared/schemas.ts
- `DescriptionTabProps` --references--> `Ticket`  [EXTRACTED]
  src/web/src/components/ticket-detail/DescriptionTab.tsx → src/shared/schemas.ts
- `PrdTabProps` --references--> `Ticket`  [EXTRACTED]
  src/web/src/components/ticket-detail/PrdTab.tsx → src/shared/schemas.ts
- `TerminalTabProps` --references--> `Ticket`  [EXTRACTED]
  src/web/src/components/ticket-detail/TerminalTab.tsx → src/shared/schemas.ts

## Import Cycles
- 3-file cycle: `src/server/config.ts -> src/server/db/store.ts -> src/server/db/rows.ts -> src/server/config.ts`
- 3-file cycle: `src/server/agents/worktreeAddresses.ts -> src/server/config.ts -> src/server/db/store.ts -> src/server/agents/worktreeAddresses.ts`

## Communities (129 total, 10 thin omitted)

### Community 0 - "Contract Building & Slots"
Cohesion: 0.03
Nodes (87): log, ActionExecutionOptions, actionExecutionOptionsSchema, agentMessageSchema, AnalyzeTicketsInput, analyzeTicketsSchema, appSettingsSchema, automationRunSchema (+79 more)

### Community 1 - "Terminals UI & Notifications"
Cohesion: 0.10
Nodes (26): analyzeTicketsInputSchema, analyzeTicketsOutputSchema, columnSchema, compactTicketSchema, createTodoTicketOutputSchema, editableTicketSchema, effectivePort(), isAllowedHost() (+18 more)

### Community 2 - "Desktop Bootstrap & Menus"
Cohesion: 0.12
Nodes (18): CodexAppServerProtocolError, CodexBinaryVersionError, require, resolveCodexBinary(), resolveCodexBinaryOverride(), TARGETS, threadConfig(), accountResponseSchema (+10 more)

### Community 3 - "Feasibility Batch Management"
Cohesion: 0.07
Nodes (36): log, ToolHandler, ToolResult, TRIAGE_VERDICTS, AgentSettableStage, agentSettableStageSchema, askUserArgsSchema, AssertNamesCovered (+28 more)

### Community 4 - "Ticket Action Panels"
Cohesion: 0.14
Nodes (9): AckSystem, RecordingSystem, RecordedSession, RecordingSystem, RelaunchSystem, AgentProvider, AgentSessionHandle, AgentSessionOptions (+1 more)

### Community 5 - "Fake System Adapter"
Cohesion: 0.24
Nodes (8): boundedCommandDetail(), runBoundedCommand(), prWebUrl(), readOriginRemote(), repoRefFromRemote(), reviewStatusFromVotes(), stripHeadsPrefix(), AzureRepoRef

### Community 6 - "Shared Zod Schemas"
Cohesion: 0.15
Nodes (9): orderedReviewKinds(), renderPersistedReviewResult(), allowedReviewPasses(), requiredReviewKinds(), renderChannelEvent(), renderImplementationDone(), mapReviewApprovalRow(), mapReviewPassRow() (+1 more)

### Community 7 - "Settings & Profiles UI"
Cohesion: 0.08
Nodes (7): delay(), fakeShellPrompt(), FakeSystemAdapter, hexToBytes(), GitWorktreeAddOptions, ReviewDoneOptions, WorktreeSetupOptions

### Community 8 - "PR Selection & Slots Bar"
Cohesion: 0.10
Nodes (30): AgentCard(), AgentCardProps, AgentsView(), hasLiveAgent(), normalize(), KIND_BADGES, TicketBadges(), TicketBadgesProps (+22 more)

### Community 9 - "Real System Adapter"
Cohesion: 0.10
Nodes (38): prNumberFromUrl(), AskPanel(), CodexAgentFields(), ImplementationAgentFields(), ReviewPrPanel(), SessionDriverFields(), TriageSection(), Label (+30 more)

### Community 10 - "Slot Config & Worktree Watch"
Cohesion: 0.14
Nodes (13): CHILD_USAGE, FULL_REVIEW_KINDS, LIGHT_REVIEW_KINDS, newDelegatedTicket(), newReviewTicket(), RecordedSession, setup(), sleep() (+5 more)

### Community 11 - "Core Domain Concepts"
Cohesion: 0.04
Nodes (48): agentMessageRowSchema, AutomationRow, automationRowSchema, AutomationRunRow, automationRunRowSchema, CommentRow, commentRowSchema, executionRunRowSchema (+40 more)

### Community 12 - "Board & Sidebar Layout"
Cohesion: 0.06
Nodes (5): detectInstallCommand(), realpathSafe(), RealSystemAdapter, setupOutputExcerpt(), PrepareReviewWorktreeOptions

### Community 13 - "Database Store Operations"
Cohesion: 0.11
Nodes (27): ProjectInfo, AgentsViewProps, AskPanelProps, BoardProps, CleanPrPanel(), CleanPrPanelProps, ImportTicketsPanelProps, NewTicketSheetProps (+19 more)

### Community 14 - "Coordinator & Protocol"
Cohesion: 0.09
Nodes (29): escapeHtml(), renderCollapsedDetails(), renderOutsideDiffComment(), renderOutsideDiffSection(), ReviewPublicationComment, azureChangeEntrySchema, azureCommentSchema, azureIdentitySchema (+21 more)

### Community 15 - "API Routes & Reformulate"
Cohesion: 0.09
Nodes (31): main(), scalar(), setup(), startFeasibilityTicket(), initProjectRegistry(), assertCodexDowngradeSafe(), backfillOrchestrator(), countRows() (+23 more)

### Community 16 - "Stats Aggregation"
Cohesion: 0.13
Nodes (3): SessionHubHandlers, SessionStartCallbacks, AgentSessionEvent

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
Cohesion: 0.09
Nodes (32): FAILURE_COLUMNS, Kind, KINDS, SUCCESS_COLUMNS, CodexTierSummary(), DurationChart(), ThroughputChart(), effectiveWorkDurationMs() (+24 more)

### Community 21 - "Store Types & Agent Knobs"
Cohesion: 0.17
Nodes (26): buildFeasibilityBatchContract(), buildFeasibilityContextSection(), buildImplementingSteps(), buildMockupReviewStep(), buildPlanningStep(), buildPrdBullet(), buildReviewContract(), buildReviewFixLines() (+18 more)

### Community 22 - "DB Row Schemas & Mappers"
Cohesion: 0.08
Nodes (39): dragKeys(), groupCountLabel(), groupSortId(), ListGroup, ProjectList(), ProjectListProps, ProjectListRowProps, projectSortId() (+31 more)

### Community 23 - "Dev Dependencies"
Cohesion: 0.09
Nodes (19): TicketCreationRequestConflictError, AnalyzeTicketRejectionReason, AnalyzeTicketsResult, CreateTodoTicketInput, createTodoTicketInputSchema, CreateTodoTicketResult, log, normalizeCreateInput() (+11 more)

### Community 24 - "TypeScript Config"
Cohesion: 0.12
Nodes (25): logRejection(), bashCommandSchema, buildSettings(), claudeProvider, createSdkAgentSession(), denyBashHook(), denyNoVerifyHook, denyReviewPublishingHook (+17 more)

### Community 25 - "Client Hub & Watchdog"
Cohesion: 0.16
Nodes (5): AgentCoordinator, SessionToolCall, isProcessing(), ticketDependencyError(), ACTIVE_STAGES

### Community 26 - "Cost & Pricing"
Cohesion: 0.15
Nodes (6): AutomationManager, mapAutomationRow(), mapAutomationRunRow(), AutomationRunStatus, Automation, AutomationRun

### Community 27 - "Workflow View & Lifecycle"
Cohesion: 0.06
Nodes (28): Architecture, Commands, Conventions (enforced — beyond the global ones in ~/.claude/CLAUDE.md), graphify, The dry-run safety model — read before running anything, What this is, Agent runtime (Agent SDK), Architecture (+20 more)

### Community 28 - "Stats Charts"
Cohesion: 0.07
Nodes (42): AgentMcpServerDefinition, agentMessageDeltaSchema, agentToml(), apiWriteDenyScript(), buildMcpServers(), ConfigObject, configReadResponseSchema, ConfigValue (+34 more)

### Community 29 - "Session Hub & Agent Session"
Cohesion: 0.12
Nodes (20): AGENT_EFFORT_LABELS, AGENT_MODEL_LABELS, AutomationCard(), AutomationCardProps, AutomationFormProps, AutomationView(), EMPTY_FORM, formFromAutomation() (+12 more)

### Community 30 - "Agents View & Ticket Cards"
Cohesion: 0.16
Nodes (11): directories, initializeParamsSchema, log, requestSchema, rpcError(), rpcResult(), toolCallParamsSchema, WorkerMcpHandlers (+3 more)

### Community 31 - "PRD Review & Markdown"
Cohesion: 0.15
Nodes (11): CodexAppServerRpcError, canonicalJson(), CodexCommandHook, codexSessionPreToolUseHookHash(), JsonValue, createCodexProvider(), AppServerFixtureOptions, hookPathForSession() (+3 more)

### Community 32 - "User Terminal & Fake IO"
Cohesion: 0.14
Nodes (24): ActiveDelegation, ClosableExecution, ExecutionFinishStatus, LiveSession, log, PendingSessionMessage, previewToolInput(), renderSessionEvent() (+16 more)

### Community 33 - "Logging"
Cohesion: 0.10
Nodes (21): scripts, build:desktop, build:web, dev, dev:desktop, dev:proxy, dev:server, dev:web (+13 more)

### Community 34 - "Board Columns"
Cohesion: 0.39
Nodes (7): emit(), loadedSubscribers, loadOnce(), refreshProjects(), subscribers, useProjects(), useProjectsLoaded()

### Community 35 - "NPM Scripts"
Cohesion: 0.12
Nodes (7): TriageManager, addUsageByModel(), toUsageByModel(), mapTicketRow(), TicketLifecycle, Ticket, TriageResult

### Community 36 - "Runtime Dependencies"
Cohesion: 0.07
Nodes (31): ImplementSessionInput, NewProject, ProjectPatch, AUTOMATION_RUN_STATUSES, AUTOMATION_TRIGGER_LABELS, AUTOMATION_TRIGGERS, CODEX_EFFORT_LABELS, CODEX_MODEL_EFFORTS (+23 more)

### Community 37 - "Claude SDK Provider"
Cohesion: 0.09
Nodes (22): dependencies, @anthropic-ai/claude-agent-sdk, dompurify, elysia, @fontsource/ibm-plex-mono, @fontsource/ibm-plex-sans, marked, @modelcontextprotocol/sdk (+14 more)

### Community 38 - "Agent Profile Config"
Cohesion: 0.14
Nodes (16): costByFamily(), costOf(), costOfModel(), costOfSessions(), CostSummary, FamilyPricing, MODEL_PRICING, ModelFamily (+8 more)

### Community 39 - "Agent Coordinator Handlers"
Cohesion: 0.20
Nodes (17): adopt(), compareVersions(), detectionCandidates(), detectUserInstall(), downloadAndVerifyTarball(), downloadPinnedBinary(), emitProgress(), isCompatibleCli() (+9 more)

### Community 40 - "API Client Inputs"
Cohesion: 0.17
Nodes (4): childTranscriptPrefix(), DelegationManager, reviewKey(), mergeAgentUsageByModel()

### Community 41 - "Ticket Config & Constants"
Cohesion: 0.14
Nodes (16): formatErrorDetails(), OverviewTab(), OverviewTabProps, SUMMARY_COLUMNS, PrdTab(), PrdTabProps, ABSOLUTE_UPLOAD_PATH, ImageLightboxProps (+8 more)

### Community 42 - "Ticket Detail & Triage UI"
Cohesion: 0.12
Nodes (24): ACTIVE_BAR, AREA_CURSOR, AXIS_PROPS, BAR_CURSOR, CHART_PALETTE, colorAt(), CostSummary(), DurationBars() (+16 more)

### Community 43 - "Demo Pipeline Concepts"
Cohesion: 0.07
Nodes (15): FakePaneStream, RealPaneStream, PaneStream, dataMessage(), log, normalizeSeed(), safeParse(), send() (+7 more)

### Community 44 - "Chart Primitives"
Cohesion: 0.31
Nodes (13): abortReason(), computeCodeFingerprint(), FingerprintEntry, FingerprintPhase, hashFingerprintPaths(), isMissingFileError(), listFingerprintPaths(), log (+5 more)

### Community 45 - "Session Hub Transcript"
Cohesion: 0.13
Nodes (9): SlotManager, slotPath(), mapSlotRow(), mapWorktreeSessionRow(), enrichWorktreeSession(), getErrorMessage(), Slot, WorktreeSession (+1 more)

### Community 46 - "Community 46"
Cohesion: 0.27
Nodes (15): Agent Implementation Config, Argus Code Review, Automated Tests (typecheck/lint/test), Claude Code Autonomous Agent, Ticket Contract Injection, Feasibility Analysis, Kanban Board (Atelier), Kanban Agents Demo (demo.gif) (+7 more)

### Community 47 - "Modal Dialogs"
Cohesion: 0.20
Nodes (7): AZURE_COMMANDS, COMMANDS_BY_PROVIDER, GITHUB_COMMANDS, PrDiffContext, VcsCleanCommands, AZ_SETTLED_THREAD_STATUSES, VCS_PROVIDER_LABELS

### Community 48 - "Community 48"
Cohesion: 0.06
Nodes (48): CompactTicket, ListTicketsInput, Column, COLUMN_LABELS, COLUMN_ORDER, COLUMN_SORT_FIELD, COLUMNS, ORCHESTRATOR_LABELS (+40 more)

### Community 49 - "Slot State"
Cohesion: 0.09
Nodes (20): wsClientEventSchema, ATTENTION_STATUSES, sessionOf(), SlotPips(), SlotPipsProps, STATUS_LABELS, STATUS_PIP_CLASSES, active (+12 more)

### Community 50 - "Stats Hooks & Cards"
Cohesion: 0.16
Nodes (12): ChartConfig, ChartContainer, ChartContainerProps, ChartContext, ChartContextValue, ChartLegendContent(), ChartLegendContentProps, ChartTooltipContent() (+4 more)

### Community 51 - "Community 51"
Cohesion: 0.07
Nodes (24): dryRunLog, fakeEncoder, NOTE: same dry-run stance as checkClaudeAvailable: every skill reported installe, CLAUDE_JSON_PATH, CLAUDE_SKILLS_DIR, COMPOSER_BINARIES, INSTALL_COMMANDS, log (+16 more)

### Community 52 - "repairPath.ts"
Cohesion: 0.06
Nodes (38): Block, blockText(), compactChunks(), firstCharCode(), TranscriptBuffer, trimBlockStart(), AgentStreamBlock, terminalServerMessageSchema (+30 more)

### Community 53 - "User Terminal Manager"
Cohesion: 0.33
Nodes (5): CONTEXT — domain glossary, Execution, Proposed (not yet built), Seams, Work items

### Community 54 - "Community 54"
Cohesion: 0.08
Nodes (23): ghPrHeadSchema, ghPrSchema, ghPrStateSchema, ghRestPullSchema, ghRestReviewPagesSchema, ghRestReviewSchema, ghRestReviewsSchema, GithubRepoRef (+15 more)

### Community 55 - "App.tsx"
Cohesion: 0.14
Nodes (11): ActiveReview, ActiveReviewPass, ResolvedExecution, DRY_RUN_VERDICT, FeasibilityBatchManager, FeasibilityGroup, FeasibilitySession, log (+3 more)

### Community 56 - "CSV Parsing"
Cohesion: 0.10
Nodes (28): ColumnActionsMenu(), ColumnActionsMenuProps, ColumnMenuItem, ActionContext, buildActions(), ConfirmSpec, errorMessage(), RETRY_STAGES (+20 more)

### Community 57 - "Community 57"
Cohesion: 0.16
Nodes (4): extractPrUrl(), githubPrHeadRef(), GithubVcsClient, ReviewPublicationCheck

### Community 58 - "File Uploads"
Cohesion: 0.35
Nodes (9): gitMetadataWritableRoots(), agentBaseEnv(), bestInstalledMatch(), compareParts(), envWithProjectNode(), nvmNodeBinDir(), readNvmrc(), prepareProjectShell() (+1 more)

### Community 59 - "triageManager.ts"
Cohesion: 0.19
Nodes (19): buildContractConstraintsLines(), buildResponseFormatLines(), buildStrictRulesLines(), buildTicketLines(), buildTriageChannelPrompt(), buildTriagePlusChannelPrompt(), isEnglish(), readOnlyFramingLines() (+11 more)

### Community 60 - "Package Manifest"
Cohesion: 0.21
Nodes (11): ReviewResult, dedupeIdenticalFindings(), DEFAULT_FINDING_RENDER_STYLE, DimensionFinding, FULL_REVIEW_KINDS, LIGHT_REVIEW_KINDS, PersistedReviewResult, ReviewPass (+3 more)

### Community 61 - "splitManager.ts"
Cohesion: 0.07
Nodes (38): resolveBaseBranch(), buildAskContract(), buildCleanContract(), buildConflictResolutionContract(), assertExecutionAvailable(), resolveExecution(), resolveFeasibilityExecution(), resolveTicketExecution() (+30 more)

### Community 62 - "TicketCard.tsx"
Cohesion: 0.14
Nodes (23): PrdAnnotator(), PrdAnnotatorProps, BREADCRUMB, NO_ANNOTATIONS, PrdReviewDialog(), PrdReviewDialogProps, renderMarkdownToSafeHtml(), DraftUpdate (+15 more)

### Community 63 - "Community 63"
Cohesion: 0.33
Nodes (9): useTheme(), UseThemeResult, applyTheme(), getStoredTheme(), isTheme(), Theme, ThemeOption, THEMES (+1 more)

### Community 64 - "Composer Run Script"
Cohesion: 0.27
Nodes (5): mapExecutionRunRow(), parseErrorDetails(), serializeErrorDetails(), runRecordedAction(), ExecutionRun

### Community 65 - "split.ts"
Cohesion: 0.38
Nodes (5): StatRecord, StatCard(), StatCardProps, StatEmpty(), UseStatsResult

### Community 67 - "TerminalView.tsx"
Cohesion: 0.11
Nodes (18): PROJECT_ROOT, NOTE: PRD generation holds the request open up to ~120s (REFORMULATE_TIMEOUT_MS), resolveDataFile(), resolveServerPort(), RunningServer, serveStaticAsset(), SocketData, startServer() (+10 more)

### Community 68 - "schema.test.ts"
Cohesion: 0.06
Nodes (60): RFC-4180, isNotionUrl(), NOTION_HOSTS, Comment, AgentProfileConfig(), ImportTicketsPanel(), NewTicketSheet(), ProjectSelect() (+52 more)

### Community 69 - "reviewFindings.ts"
Cohesion: 0.14
Nodes (21): ALSO_FLAGGED_PREFIX, dedupeFindings(), findingAnchor(), FRENCH_STOP_WORD_PATTERN, FRENCH_STOP_WORDS, hasSimilarSummary(), isSameDefect(), isSelfRefuting() (+13 more)

### Community 70 - "CodexRuntimeStatus"
Cohesion: 0.10
Nodes (21): cleanTicket(), conflictTicket(), REVIEW_OPTS, reviewTicket(), TICKET_OPTS, CODEX_LAUNCH_STATUS_MESSAGES, CodexCapabilityReader, ExecutionDefaults (+13 more)

### Community 71 - "PostCSS Config"
Cohesion: 0.29
Nodes (6): name, overrides, zod, private, type, version

### Community 72 - "useAppSettings.ts"
Cohesion: 0.24
Nodes (5): ProjectConfig, buildScripts(), mapProjectRow(), parseWorktreePorts(), SqlUpdateBuilder

### Community 73 - "TerminalView.tsx"
Cohesion: 0.20
Nodes (15): CodexConnectionStatus(), STATUS_LABELS, clearRetry(), loadCapabilities(), LoadOptions, publish(), refreshCapabilities(), RETRY_DELAYS_MS (+7 more)

### Community 74 - "button.tsx"
Cohesion: 0.15
Nodes (16): SKILL_TIERS, SkillRequirement, SkillTier, skillzerInstallCommand(), COPY_LABELS, CopyOutcome, expectedSkillPath(), InstallBlock() (+8 more)

### Community 75 - ".handleRequest"
Cohesion: 0.11
Nodes (13): analyzeResultSchema, compactTicketSchema, createResultSchema, errorResultSchema, ISOLATED_ENV_KEYS, projectResultSchema, savedEnv, startResultSchema (+5 more)

### Community 76 - "usePrdSearch.ts"
Cohesion: 0.26
Nodes (16): AGENT_EFFORT_FULL_LABELS, AGENT_MODEL_FULL_LABELS, CODEX_EFFORT_FULL_LABELS, buildProfilePipeline(), claudeDetail(), claudeSubagentDetail(), codexOrchestratorDetail(), codexSubagentParts() (+8 more)

### Community 78 - "csv.ts"
Cohesion: 0.08
Nodes (12): RecordingSystemAdapter, DoneGateResult, PublishReviewOptions, PublishReviewResult, ReviewHeadResult, ReviewPublicationState, FAKE_OPEN_PRS, FakeVcsClient (+4 more)

### Community 79 - "WorktreeSession"
Cohesion: 0.33
Nodes (3): listeners, mcp, ReplyArgsSchema

### Community 80 - "recordedAction.ts"
Cohesion: 0.23
Nodes (17): alternation(), COMMAND_WRAPPERS, commandSegments(), commandWords(), executableName(), launchedPackageScript(), launchesTypecheck(), OPTIONS_WITH_VALUE (+9 more)

### Community 81 - "index.ts"
Cohesion: 0.06
Nodes (35): applyDesktopEnv(), DesktopRoots, ensureConfig(), ensureMcpToken(), regenerateMcpToken(), temporaryDirectories, boot(), externalUrlFromNewWindowEvent() (+27 more)

### Community 82 - "TicketOperations"
Cohesion: 0.13
Nodes (12): CodexAppServerInitializationError, connectCodexAppServer(), incomingSchema, initializeResponseSchema, log, PendingRequest, rpcErrorSchema, spawnCodexAppServer() (+4 more)

### Community 86 - "useTickTimer.ts"
Cohesion: 0.23
Nodes (10): artifactPath, assertPackageVersionInSync(), assertSdkVersionsInSync(), BUILT_DMG, ELECTROBUN_BIN, fail(), installedPackageVersion(), RELEASE_FOLDER (+2 more)

### Community 87 - "mcpSettings.ts"
Cohesion: 0.11
Nodes (49): ProjectKey, AttachExecutionSessionInput, AutomationPatch, EnqueueAgentMessageInput, FinalizeExecutionInput, MarkAgentMessageAcceptedInput, MarkAgentMessageReceivedInput, MarkAgentMessageRejectedInput (+41 more)

### Community 89 - "usePrdSearch.ts"
Cohesion: 0.53
Nodes (5): createMcpServer(), invalidInput(), OutputValidator, toolError(), toolResult()

### Community 90 - "PaneStream"
Cohesion: 0.40
Nodes (5): MIME_EXTENSIONS, resolveExtension(), SavedUpload, saveUpload(), serveUpload()

### Community 91 - "bootstrap.ts"
Cohesion: 0.27
Nodes (7): CapabilityCache, CodexRuntimeModel, codexRuntimeModelSchema, CodexRuntimeStatus, codexRuntimeStatusSchema, pairedRuntimeCodexEffort(), UNKNOWN_CODEX_RUNTIME_STATUS

### Community 92 - "TerminalSessionManager"
Cohesion: 0.23
Nodes (12): isCodexFastServiceTier(), summarizeSessionCosts(), totalTokensOfSessions(), executionCosts(), executionTokens(), projectStatRecord(), MetaRow(), MetaRowProps (+4 more)

### Community 93 - "ColumnActionsMenu.tsx"
Cohesion: 0.25
Nodes (7): Azure DevOps support — state file, Decisions (validated by the owner, 2026-09-21), Goal, Known blockers for lots 3 and 4, Open questions, Progress, Verified on this machine (az 2.90.0, azure-devops 1.0.8)

### Community 94 - ".addComment"
Cohesion: 0.11
Nodes (11): ClientHub, ClientSocket, stalledEventPayload(), Notifier, TicketOperationsDeps, TERMINAL_STAGES, buildErrorDetails(), describeCause() (+3 more)

### Community 95 - "TicketConfigSummary.tsx"
Cohesion: 0.50
Nodes (3): appBundle, EMBEDDED_BINARIES, resourcesApp

### Community 97 - "RunningServer"
Cohesion: 0.27
Nodes (9): projectConfigSchema, buildAppSettingsPatch(), LegacyConfig, legacyConfigSchema, LegacyModels, log, migrateConfigJsonIfPresent(), parseLegacyConfig() (+1 more)

### Community 99 - "reviewPublishingGuard.ts"
Cohesion: 0.07
Nodes (35): API_GUARDS, API_READ_METHOD_SET, ApiDenyPatterns, ApiGuard, AZ_INVOKE_COMMAND, AZ_INVOKE_METHOD_LONG_FLAGS, AZ_INVOKE_WRITE_INPUT_LONG_FLAGS, AZ_PR_WRITE_PATTERN (+27 more)

### Community 100 - ".startVerification"
Cohesion: 0.09
Nodes (20): BOARD_FINDING_RENDER_STYLE, log, renderCollapsedFinding(), renderFinding(), REVIEW_DISALLOWED_TOOLS, REVIEW_REPORT_LABELS, REVIEW_REPORT_LABELS_EN, REVIEW_REPORT_LABELS_FR (+12 more)

### Community 101 - "codexProvider.test.ts"
Cohesion: 0.21
Nodes (10): App(), HOME_VIEW_OPTIONS, HomeView, missingSignature(), PreflightCopy, readDismissedSignature(), SkillsPreflightDialog(), SkillsPreflightDialogProps (+2 more)

### Community 104 - "settings.tsx"
Cohesion: 0.10
Nodes (10): CodexAppServerConnection, CodexAppServerNotification, CodexAppServerOptions, CodexProviderDependencies, createCodexAgentSession(), inheritedMcpServerNames(), PreparedHook, prepareSkills() (+2 more)

### Community 105 - "createMcpServer"
Cohesion: 0.24
Nodes (4): isPrNeedsAttention(), OpenPr, PrSelectRow(), PrSelectRowProps

### Community 106 - "usePrdSearch.ts"
Cohesion: 0.14
Nodes (17): ANSI, appendToLogFile(), COLOR_ENABLED, disableFileLogging(), initLogFile(), isLevel(), Level, LEVEL_ORDER (+9 more)

### Community 107 - "azureRemote.ts"
Cohesion: 0.40
Nodes (10): azureOrgUrl(), fromAzureSegments(), fromCollectionSegments(), fromLegacySegments(), fromSshSegments(), parseAzureRepoRef(), parseRemoteLocation(), RemoteLocation (+2 more)

### Community 108 - "WorkflowView.tsx"
Cohesion: 0.10
Nodes (14): log, buildReformulatePrompt(), log, ReformulateManager, ClientSocketData, NativeNotify, FailedReformulation, ActionSystem (+6 more)

### Community 109 - "projectDisplay.ts"
Cohesion: 0.46
Nodes (5): buildSplitChannelPrompt(), buildTicketLines(), isEnglish(), extractFigmaUrls(), hasMockups()

### Community 110 - "Profile"
Cohesion: 0.08
Nodes (35): ProfileConfig, agentEffortSchema, agentModelSchema, codexEffortSchema, codexModelSchema, DragHandleAttributes, DragHandleListeners, ProfilePipeline() (+27 more)

### Community 111 - "FakePaneStream"
Cohesion: 0.20
Nodes (4): log, Watchdog, createLogger(), rpcResponseSchema

### Community 112 - "useSavedFlash.ts"
Cohesion: 0.29
Nodes (4): safeJsonParse(), withJsonRequestFile(), githubRepoKey(), parseGithubRemote()

### Community 113 - "repairPath.ts"
Cohesion: 0.36
Nodes (8): getSnapshot(), INITIAL_SNAPSHOT, loadReviewCounts(), publish(), refreshReviewCounts(), subscribe(), subscribers, useReviewCounts()

### Community 114 - "ApiDenyPatterns"
Cohesion: 0.09
Nodes (20): agentPairError(), cleanDescription(), createApiRoutes(), createSplitChildren(), failSplitMother(), isBlocked(), isProcessing(), isSplitMother() (+12 more)

### Community 115 - "relaunch.ts"
Cohesion: 0.29
Nodes (3): log, runFirstBootSetup(), SLOT_COUNT

### Community 116 - "settings.tsx"
Cohesion: 0.07
Nodes (25): CODEX_STATUS_TONES, COMMIT_ROW, DefaultsRowSpec, EFFORT_OPTIONS, FEASIBILITY_ROW, IMPLEMENTATION_ROW, KnobGroupProps, LANGUAGE_OPTIONS (+17 more)

### Community 117 - "useAppSettings.ts"
Cohesion: 0.21
Nodes (14): applyAppSettingsToModels(), AppSettings, UpdateAppSettingsInput, AppSettingsState, flashSaved(), loadOnce(), patchAppSettings(), publish() (+6 more)

### Community 118 - "StageProgressBar.tsx"
Cohesion: 0.13
Nodes (24): FILLED_GLYPH_COLORS, StageProgressBar(), StageProgressBarProps, TICKET_TAB_LABELS, TicketTab, TicketTabs(), TicketTabsProps, availableTabs() (+16 more)

### Community 119 - "AgentMessage"
Cohesion: 0.35
Nodes (3): mapAgentMessageRow(), AgentMessage, ExecutionOwnerType

### Community 120 - "ProjectPanel.tsx"
Cohesion: 0.48
Nodes (3): mapProfileRow(), nullableBooleanValue(), Profile

### Community 121 - "usePrdSearch.ts"
Cohesion: 0.48
Nodes (3): BoundedCommandResult, connectionFailure(), connectionResult()

### Community 122 - "createMcpServer"
Cohesion: 0.17
Nodes (5): PublicMcpManager, FeasibilityStarter, isActive(), isBlocked(), TicketOperations

### Community 123 - "projectDisplay.ts"
Cohesion: 0.38
Nodes (4): formatCommitTimeout(), TimeoutUnit, timeoutUnitMs(), timeoutUnitOf()

## Knowledge Gaps
- **709 isolated node(s):** `log`, `dryRunLog`, `fakeEncoder`, `log`, `CLAUDE_JSON_PATH` (+704 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Ticket` connect `NPM Scripts` to `Contract Building & Slots`, `Shared Zod Schemas`, `PR Selection & Slots Bar`, `Real System Adapter`, `Slot Config & Worktree Watch`, `Core Domain Concepts`, `Database Store Operations`, `Live Terminal Views`, `Store Types & Agent Knobs`, `Dev Dependencies`, `Client Hub & Watchdog`, `Session Hub & Agent Session`, `Runtime Dependencies`, `API Client Inputs`, `Ticket Config & Constants`, `Session Hub Transcript`, `Community 48`, `Slot State`, `repairPath.ts`, `App.tsx`, `CSV Parsing`, `triageManager.ts`, `Package Manifest`, `splitManager.ts`, `schema.test.ts`, `CodexRuntimeStatus`, `mcpSettings.ts`, `TerminalSessionManager`, `.addComment`, `.startVerification`, `codexProvider.test.ts`, `.start`, `TerminalSession`, `WorkflowView.tsx`, `projectDisplay.ts`, `StageProgressBar.tsx`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **Why does `Store` connect `.start` to `Feasibility Batch Management`, `Shared Zod Schemas`, `Slot Config & Worktree Watch`, `Core Domain Concepts`, `API Routes & Reformulate`, `Store Types & Agent Knobs`, `Dev Dependencies`, `Client Hub & Watchdog`, `Cost & Pricing`, `NPM Scripts`, `Demo Pipeline Concepts`, `Session Hub Transcript`, `App.tsx`, `triageManager.ts`, `Package Manifest`, `splitManager.ts`, `Composer Run Script`, `prUrl.ts`, `TerminalView.tsx`, `CodexRuntimeStatus`, `useAppSettings.ts`, `mcpSettings.ts`, `.addComment`, `RunningServer`, `.startVerification`, `WorkflowView.tsx`, `FakePaneStream`, `relaunch.ts`, `useAppSettings.ts`, `AgentMessage`, `ProjectPanel.tsx`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Why does `RealSystemAdapter` connect `Board & Sidebar Layout` to `Settings & Profiles UI`, `TerminalSession`, `createMcpServer`, `Demo Pipeline Concepts`, `WorkflowView.tsx`, `csv.ts`, `Community 51`, `Agents View & Ticket Cards`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **What connects `log`, `dryRunLog`, `fakeEncoder` to the rest of the system?**
  _721 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Contract Building & Slots` be split into smaller, more focused modules?**
  _Cohesion score 0.032491818606825616 - nodes in this community are weakly interconnected._
- **Should `Terminals UI & Notifications` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._
- **Should `Desktop Bootstrap & Menus` be split into smaller, more focused modules?**
  _Cohesion score 0.12318840579710146 - nodes in this community are weakly interconnected._