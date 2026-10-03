# Graph Report - kanban-agents  (2026-10-03)

## Corpus Check
- 325 files · ~822,467 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 4218 nodes · 11463 edges · 144 communities (129 shown, 15 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 111 edges (avg confidence: 0.69)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `897d5c48`
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
- .publishReviewUnderRepoLock
- TerminalView.tsx
- button.tsx
- .handleRequest
- usePrdSearch.ts
- Community 77
- csv.ts
- WorktreeSession
- recordedAction.ts
- index.ts
- .getReviewPass
- Community 83
- vcsCommands.ts
- atelier.ts
- usePrdSearch.ts
- Profile
- createCodexAgentSession
- TerminalSessionManager
- ColumnActionsMenu.tsx
- .addComment
- TicketConfigSummary.tsx
- useTickTimer.ts
- Column
- usePrdSearch.ts
- reviewPublishingGuard.ts
- .startVerification
- codexProvider.test.ts
- delegationManager.test.ts
- recordOutcome
- mcpSettings.ts
- createMcpServer
- usePrdSearch.ts
- TicketCost.tsx
- WorkflowView.tsx
- TriageManager
- createCodexAgentSession
- uploads.ts
- useSavedFlash.ts
- PreparedHook
- ApiDenyPatterns
- useSuppressEscapeBeep.ts
- settings.tsx
- bootstrap.ts
- properties
- AgentMessage
- ProjectPanel.tsx
- profileSummary.ts
- TicketOperationError
- StatCard.tsx
- TicketOperations
- useReviewCounts.ts
- TicketOperations
- TerminalSessionManager
- contract.test.ts
- useConversationDetail.ts
- .handleRequest
- recordOutcome
- SlotPips.tsx
- PublishReviewOptions
- id
- performSplit
- reformulate.ts
- createMcpServer
- isNotionUrl
- isProcessing
- $defs
- title
- preDraft

## God Nodes (most connected - your core abstractions)
1. `Store` - 182 edges
2. `cn()` - 94 edges
3. `SystemAdapter` - 92 edges
4. `FakeSystemAdapter` - 85 edges
5. `Ticket` - 84 edges
6. `RealSystemAdapter` - 81 edges
7. `createApiRoutes()` - 80 edges
8. `SlotManager` - 70 edges
9. `VcsProvider` - 53 edges
10. `ProjectInfo` - 53 edges

## Surprising Connections (you probably didn't know these)
- `McpSettingsClient` --references--> `McpSettingsMetadata`  [EXTRACTED]
  src/web/src/lib/mcpSettings.ts → desktop/mcpRpc.ts
- `main()` --calls--> `migrateCodexCatalog()`  [EXTRACTED]
  scripts/downgrade-codex-catalog.ts → src/server/db/schema.ts
- `main()` --calls--> `assertCodexDowngradeSafe()`  [EXTRACTED]
  scripts/downgrade-codex-catalog.ts → src/server/db/schema.ts
- `HumanEvidenceEditor()` --calls--> `qualityErrorMessage()`  [EXTRACTED]
  src/web/src/components/ticket-detail/QualityCriteriaPanel.tsx → src/web/src/lib/qualityMessages.ts
- `ExecutionOverrides` --references--> `Orchestrator`  [EXTRACTED]
  src/server/agents/executionConfig.ts → src/shared/constants.ts

## Import Cycles
- None detected.

## Communities (144 total, 15 thin omitted)

### Community 0 - "Contract Building & Slots"
Cohesion: 0.01
Nodes (146): ActionExecutionOptions, actionExecutionOptionsSchema, AgentMessage, AgentMessageChannel, agentMessageChannelSchema, agentMessageSchema, agentMessageStatusSchema, AnalyzeTicketsInput (+138 more)

### Community 1 - "Terminals UI & Notifications"
Cohesion: 0.09
Nodes (21): analyzeTicketsInputSchema, analyzeTicketsOutputSchema, columnSchema, compactTicketSchema, createTodoTicketOutputSchema, editableTicketSchema, listProjectsInputSchema, listProjectsOutputSchema (+13 more)

### Community 2 - "Desktop Bootstrap & Menus"
Cohesion: 0.11
Nodes (22): defaultProjectLookup(), groupFeasibilityTickets(), computeWorktreeAddresses(), log, SlotWatch, log, runFirstBootSetup(), DEFAULT_MODELS (+14 more)

### Community 3 - "Feasibility Batch Management"
Cohesion: 0.04
Nodes (92): FEASIBILITY_ENGINES, IMPLEMENTERS, STAGE_LABELS, ProjectInfo, AgentCard(), AgentCardProps, AgentsViewProps, AskPanelProps (+84 more)

### Community 4 - "Ticket Action Panels"
Cohesion: 0.15
Nodes (24): ExecutionFinishStatus, LiveSession, log, PendingSessionMessage, previewToolInput(), renderChannelEvent(), renderImplementationDone(), renderSessionEvent() (+16 more)

### Community 5 - "Fake System Adapter"
Cohesion: 0.06
Nodes (40): escapeHtml(), renderCollapsedDetails(), renderOutsideDiffComment(), renderOutsideDiffSection(), ReviewPublicationComment, azureChangeEntrySchema, azureCommentSchema, azureCurrentIdentitySchema (+32 more)

### Community 7 - "Settings & Profiles UI"
Cohesion: 0.07
Nodes (5): delay(), fakeShellPrompt(), FakeSystemAdapter, ReviewDoneOptions, WorktreeSetupOptions

### Community 8 - "PR Selection & Slots Bar"
Cohesion: 0.14
Nodes (22): main(), scalar(), assertCodexDowngradeSafe(), backfillOrchestrator(), countRows(), createDatabase(), EXECUTION_MIGRATIONS, hasColumn() (+14 more)

### Community 9 - "Real System Adapter"
Cohesion: 0.12
Nodes (19): ValidationCommandOptions, ValidationCommandResult, ValidationDependencyResult, ValidationRevision, ValidationRevisionOptions, ValidationServiceHandle, assertIdentity(), captureValidationRevision() (+11 more)

### Community 10 - "Slot Config & Worktree Watch"
Cohesion: 0.05
Nodes (70): RFC-4180, FeasibilityEngine, PRD_SPLIT_MODE_LABELS, PRD_SPLIT_MODES, PrdSplitMode, candidatesFor(), CardCandidate, CardsPanel() (+62 more)

### Community 11 - "Core Domain Concepts"
Cohesion: 0.03
Nodes (83): agentMessageRowSchema, AutomationRow, automationRowSchema, AutomationRunRow, automationRunRowSchema, buildScripts(), CommentRow, commentRowSchema (+75 more)

### Community 12 - "Board & Sidebar Layout"
Cohesion: 0.11
Nodes (14): analyzeResultSchema, compactTicketSchema, createResultSchema, errorResultSchema, ISOLATED_ENV_KEYS, projectResultSchema, savedEnv, startResultSchema (+6 more)

### Community 13 - "Database Store Operations"
Cohesion: 0.06
Nodes (69): RepoInspectionSource, ManagedProject, dragKeys(), groupCountLabel(), groupSortId(), ListGroup, ProjectList(), ProjectListProps (+61 more)

### Community 14 - "Coordinator & Protocol"
Cohesion: 0.10
Nodes (38): QualityRunPhase, QualityCriteriaPanel(), ITERATION_STATUS_LABELS, iterationTitle(), QualityIterations(), QualityIterationSummary(), CLEANUP_LABELS, evidenceProvenance() (+30 more)

### Community 15 - "API Routes & Reformulate"
Cohesion: 0.11
Nodes (26): bashCommandSchema, buildSettings(), claudeProvider, createSdkAgentSession(), denyBashHook(), denyNoVerifyHook, denyReviewPublishingHook, denyTypecheckHook() (+18 more)

### Community 16 - "Stats Aggregation"
Cohesion: 0.07
Nodes (6): setup(), startParentSession(), SessionHub, SessionHubHandlers, SessionStartCallbacks, TranscriptUpdate

### Community 17 - "Triage & Server Hub"
Cohesion: 0.08
Nodes (25): devDependencies, autoprefixer, class-variance-authority, clsx, concurrently, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities (+17 more)

### Community 18 - "Live Terminal Views"
Cohesion: 0.05
Nodes (48): isReviewFixSession(), ATELIER_WEB_TOOLS, AZURE_BASH_ALLOWLIST, AZURE_CLEAN_BASH_ALLOWLIST, BASH_ALLOWLIST, bashAllowlist(), buildFeasibilitySessionConfig(), buildImplementSessionConfig() (+40 more)

### Community 19 - "Stage Progress & Display"
Cohesion: 0.08
Nodes (24): compilerOptions, allowImportingTsExtensions, baseUrl, esModuleInterop, isolatedModules, jsx, lib, module (+16 more)

### Community 20 - "Real Adapter GH/Composer"
Cohesion: 0.09
Nodes (32): FAILURE_COLUMNS, Kind, KINDS, SUCCESS_COLUMNS, ExecutionRun, DurationChart(), OutcomeChart(), SuccessRateChart() (+24 more)

### Community 21 - "Store Types & Agent Knobs"
Cohesion: 0.08
Nodes (83): agent_context_html(), agent_entry_count(), axes_html(), axis_anchor(), axis_head_html(), axis_items(), axis_section_html(), axis_statuses() (+75 more)

### Community 22 - "DB Row Schemas & Mappers"
Cohesion: 0.06
Nodes (31): TRIAGE_VERDICTS, AgentSettableStage, agentSettableStageSchema, askUserArgsSchema, AssertNamesCovered, channelEventSchema, delegateImplementationArgsSchema, delegateReviewArgsSchema (+23 more)

### Community 23 - "Dev Dependencies"
Cohesion: 0.10
Nodes (24): assertExecutionAvailable(), CODEX_LAUNCH_STATUS_MESSAGES, CodexCapabilityReader, ExecutionOverrides, FEASIBILITY_ENGINE_EXECUTION, resolveExecution(), resolveFeasibilityExecution(), resolveTicketExecution() (+16 more)

### Community 24 - "TypeScript Config"
Cohesion: 0.06
Nodes (46): ACTIVE_STAGES, App(), HOME_VIEW_OPTIONS, HomeView, NAV_ENTRIES, NavEntry, Sidebar(), SidebarProps (+38 more)

### Community 25 - "Client Hub & Watchdog"
Cohesion: 0.10
Nodes (8): AgentCoordinator, formatPrdDocumentIssues(), log, logRejection(), ToolHandler, ToolResult, TicketPatch, RouteDeps

### Community 26 - "Cost & Pricing"
Cohesion: 0.16
Nodes (4): AtelierManager, emptyTurn(), atelierSessionKey(), buildAtelierSessionConfig()

### Community 27 - "Workflow View & Lifecycle"
Cohesion: 0.05
Nodes (32): Architecture, Commands, Conventions (enforced — beyond the global ones in ~/.claude/CLAUDE.md), graphify, The dry-run safety model — read before running anything, What this is, Agent runtime, Architecture (+24 more)

### Community 28 - "Stats Charts"
Cohesion: 0.07
Nodes (44): AgentMcpServerDefinition, codexCommandPolicyScript(), agentMessageDeltaSchema, agentToml(), apiWriteDenyScript(), buildMcpServers(), ConfigObject, configReadResponseSchema (+36 more)

### Community 29 - "Session Hub & Agent Session"
Cohesion: 0.06
Nodes (75): codexRuntimeStatusSchema, isCodexFastServiceTier(), pairedRuntimeCodexEffort(), UNKNOWN_CODEX_RUNTIME_STATUS, pairedCodexEffort(), AskPanel(), AtelierAgentFields(), buildThread() (+67 more)

### Community 30 - "Agents View & Ticket Cards"
Cohesion: 0.11
Nodes (23): buildAtelierConsolidateTurn(), buildAtelierPrompt(), buildAtelierRegenerationTurn(), buildAuthoringRules(), buildFraming(), buildHistory(), buildResearch(), buildRole() (+15 more)

### Community 31 - "PRD Review & Markdown"
Cohesion: 0.06
Nodes (54): BOARD_FINDING_RENDER_STYLE, log, renderCollapsedFinding(), renderFinding(), REVIEW_DISALLOWED_TOOLS, REVIEW_REPORT_LABELS, REVIEW_REPORT_LABELS_EN, REVIEW_REPORT_LABELS_FR (+46 more)

### Community 32 - "User Terminal & Fake IO"
Cohesion: 0.22
Nodes (18): AtelierPromptInput, SubmittedTurn, Conversation, ConversationMessage, PrdDocumentRecord, CardsPanelProps, ConversationPanelProps, PrdPanelProps (+10 more)

### Community 33 - "Logging"
Cohesion: 0.10
Nodes (21): scripts, build:desktop, build:web, dev, dev:desktop, dev:proxy, dev:server, dev:web (+13 more)

### Community 34 - "Board Columns"
Cohesion: 0.16
Nodes (21): AppliedPath, copyDependencies(), copyPath(), DelegationWorkspace, ensureParentDirectory(), FileState, git(), installStagedPath() (+13 more)

### Community 35 - "NPM Scripts"
Cohesion: 0.12
Nodes (12): resolveBaseBranch(), ReformulateManager, TriageManager, stalledEventPayload(), TicketLifecycle, Stage, ErrorDetails, ErrorDetailsSource (+4 more)

### Community 36 - "Runtime Dependencies"
Cohesion: 0.08
Nodes (27): ARTIFACT_CONTENT_TYPES, QualityRouteDeps, manualQualityEvidenceSchema, nonEmptyTextSchema, qualityCriteriaSnapshotSchema, qualityCriterionSchema, qualityEnvironmentSchema, qualityGateSchema (+19 more)

### Community 37 - "Claude SDK Provider"
Cohesion: 0.09
Nodes (22): dependencies, @anthropic-ai/claude-agent-sdk, dompurify, elysia, @fontsource/ibm-plex-mono, @fontsource/ibm-plex-sans, marked, @modelcontextprotocol/sdk (+14 more)

### Community 38 - "Agent Profile Config"
Cohesion: 0.14
Nodes (17): costByFamily(), costOf(), costOfModel(), costOfSessions(), CostSummary, FamilyPricing, MODEL_PRICING, ModelFamily (+9 more)

### Community 39 - "Agent Coordinator Handlers"
Cohesion: 0.10
Nodes (27): artifactPath, assertPackageVersionInSync(), assertSdkVersionsInSync(), BUILT_DMG, ELECTROBUN_BIN, fail(), installedPackageVersion(), RELEASE_FOLDER (+19 more)

### Community 40 - "API Client Inputs"
Cohesion: 0.07
Nodes (17): childTranscriptPrefix(), DelegationManager, implementationScopesOverlap(), normalizeImplementationScope(), orderedReviewKinds(), renderPersistedReviewResult(), reviewKey(), dedupeIdenticalFindings() (+9 more)

### Community 41 - "Ticket Config & Constants"
Cohesion: 0.12
Nodes (19): AtelierSessionInput, RESEARCH_OPTION_KEYS, RESEARCH_OPTION_LABELS, ResearchOptionKey, enabledResearchOptionKeys(), ResearchOptions, researchOptionsFromKeys(), isResearchOptionKey() (+11 more)

### Community 42 - "Ticket Detail & Triage UI"
Cohesion: 0.24
Nodes (4): ActionSystem, CapabilityCache, ImportNotionOptions, CodexRuntimeStatus

### Community 43 - "Demo Pipeline Concepts"
Cohesion: 0.23
Nodes (4): PaneStream, dataMessage(), send(), TerminalSession

### Community 44 - "Chart Primitives"
Cohesion: 0.28
Nodes (13): abortReason(), computeCodeFingerprint(), FingerprintEntry, FingerprintPhase, hashFingerprintPaths(), isMissingFileError(), listFingerprintPaths(), log (+5 more)

### Community 45 - "Session Hub Transcript"
Cohesion: 0.16
Nodes (12): applyAppSettingsToModels(), initProjectRegistry(), createdPaths, reserveDbPath(), NEW_CONVERSATION, openStore(), paths, TEMPLATE_PATH (+4 more)

### Community 46 - "Community 46"
Cohesion: 0.27
Nodes (15): Agent Implementation Config, Argus Code Review, Automated Tests (typecheck/lint/test), Claude Code Autonomous Agent, Ticket Contract Injection, Feasibility Analysis, Kanban Board (Atelier), Kanban Agents Demo (demo.gif) (+7 more)

### Community 47 - "Modal Dialogs"
Cohesion: 0.18
Nodes (26): buildAskContract(), buildCleanContract(), buildConflictResolutionContract(), buildFeasibilityContextSection(), buildImplementingSteps(), buildMockupReviewStep(), buildPlanningStep(), buildPrdBullet() (+18 more)

### Community 48 - "Community 48"
Cohesion: 0.10
Nodes (17): NewTicket, TicketCreationRequestConflictError, AnalyzeTicketRejectionReason, AnalyzeTicketsResult, CompactTicket, CreateTodoTicketInput, createTodoTicketInputSchema, CreateTodoTicketResult (+9 more)

### Community 49 - "Slot State"
Cohesion: 0.09
Nodes (13): log, ClientHub, ClientSocket, ClientSocketData, Notifier, log, PrNotificationMonitor, AutomationRunStatus (+5 more)

### Community 50 - "Stats Hooks & Cards"
Cohesion: 0.17
Nodes (17): browserToolName(), preflightQualityBrowser(), QUALITY_BROWSER_TOOLS, QUALITY_DISABLED_BROWSER_TOOLS, QUALITY_OBSERVATION_TOOLS, QUALITY_REPOSITORY_TOOLS, qualityBrowserServer(), qualityCheckOutputExcerpts() (+9 more)

### Community 51 - "Community 51"
Cohesion: 0.06
Nodes (8): ActiveDelegation, detectInstallCommand(), RealSystemAdapter, DoneGateResult, ImplementationLotOptions, PrepareReviewWorktreeOptions, ValidationWorkspaceOptions, VcsProvider

### Community 52 - "repairPath.ts"
Cohesion: 0.06
Nodes (39): Block, blockText(), compactChunks(), firstCharCode(), TranscriptBuffer, trimBlockStart(), AgentStreamBlock, TERMINAL_STAGES (+31 more)

### Community 53 - "User Terminal Manager"
Cohesion: 0.33
Nodes (5): CONTEXT — domain glossary, Execution, Proposed (not yet built), Seams, Work items

### Community 54 - "Community 54"
Cohesion: 0.06
Nodes (26): CapturingSystem, AckSystem, startFeasibilityTicket(), ActiveReview, ClosableExecution, CHILD_USAGE, FULL_REVIEW_KINDS, LIGHT_REVIEW_KINDS (+18 more)

### Community 55 - "App.tsx"
Cohesion: 0.15
Nodes (11): ActiveReviewPass, ResolvedExecution, DRY_RUN_VERDICT, FeasibilityBatchManager, FeasibilityGroup, FeasibilitySession, log, QueuedFeasibility (+3 more)

### Community 56 - "CSV Parsing"
Cohesion: 0.16
Nodes (10): CLAUDE_CONVERSATION, closers, CODEX_CONVERSATION, setup(), TEMPLATE_PATH, TURN_END, setup(), parseAtelierSessionKey() (+2 more)

### Community 57 - "Community 57"
Cohesion: 0.14
Nodes (13): SessionToolCall, directories, initializeParamsSchema, log, requestSchema, rpcError(), rpcResult(), toolCallParamsSchema (+5 more)

### Community 58 - "File Uploads"
Cohesion: 0.16
Nodes (12): ChartConfig, ChartContainer, ChartContainerProps, ChartContext, ChartContextValue, ChartLegendContent(), ChartLegendContentProps, ChartTooltipContent() (+4 more)

### Community 59 - "triageManager.ts"
Cohesion: 0.12
Nodes (23): compileFeedback(), PrdAnnotation, prdAnnotationsSchema, FeedbackDraft, PrdAnnotatorProps, BREADCRUMB, NO_ANNOTATIONS, PrdReviewDialog() (+15 more)

### Community 61 - "splitManager.ts"
Cohesion: 0.40
Nodes (4): PR review counting and publication correction state, Progress, Scope and decisions, Verification

### Community 62 - "TicketCard.tsx"
Cohesion: 0.06
Nodes (49): AGENTS_SKILLS_DIR, CLAUDE_JSON_PATH, CLAUDE_SKILLS_DIR, commandOutputOrNull(), COMPOSER_BINARIES, DEFAULT_CODEX_HOME, GitRemoteFacts, INSTALL_COMMANDS (+41 more)

### Community 63 - "Community 63"
Cohesion: 0.08
Nodes (23): axisIdSchema, DUPLICATE_ITEMS_ISSUE, hasDuplicates(), identifierSchema, isUnique(), nonEmptyTextArraySchema, PRD_LOCALES, PRD_REQUIREMENT_KINDS (+15 more)

### Community 64 - "Composer Run Script"
Cohesion: 0.21
Nodes (23): axisTitle(), Block, bulletList(), heading(), joinBlocks(), labelledList(), LABELS, listOrNone() (+15 more)

### Community 65 - "split.ts"
Cohesion: 0.40
Nodes (10): azureOrgUrl(), fromAzureSegments(), fromCollectionSegments(), fromLegacySegments(), fromSshSegments(), parseAzureRepoRef(), parseRemoteLocation(), RemoteLocation (+2 more)

### Community 66 - "prUrl.ts"
Cohesion: 0.17
Nodes (9): closers, conversationDetailSchema, TEMPLATE_PATH, ticketsResponseSchema, BASE_TICKET, conversationMessageSchema, conversationSchema, prdDocumentRecordSchema (+1 more)

### Community 67 - "TerminalView.tsx"
Cohesion: 0.12
Nodes (22): NotificationSoundKind, PrNotification, PrNotificationSyncStatus, WorktreeSession, active, COMPLETION_FREQUENCIES, ensureNotificationPermission(), getAudioContext() (+14 more)

### Community 69 - "reviewFindings.ts"
Cohesion: 0.11
Nodes (24): prepareQualityCriteria(), PrepareQualityCriteriaOptions, QUALITY_CONTEXT_FILES, repositoryContext(), deniedCommandShape(), QUALITY_NATIVE_DENIED_TOOLS, qualityErrorMessage(), QualityObservation (+16 more)

### Community 70 - "CodexRuntimeStatus"
Cohesion: 0.06
Nodes (50): Column, COLUMN_LABELS, COLUMN_ORDER, COLUMN_SORT_FIELD, COLUMNS, AgentsView(), normalize(), ACTIVE_COLUMNS (+42 more)

### Community 71 - "PostCSS Config"
Cohesion: 0.29
Nodes (6): name, overrides, zod, private, type, version

### Community 72 - ".publishReviewUnderRepoLock"
Cohesion: 0.05
Nodes (48): boundedCommandDetail(), BoundedCommandResult, runBoundedCommand(), safeJsonParse(), withJsonRequestFile(), ReviewPublicationEvent, ReviewPublicationState, AzureDevopsVcsClient (+40 more)

### Community 73 - "TerminalView.tsx"
Cohesion: 0.17
Nodes (15): CONVERSATION_STATUS_LABELS, ConversationStatus, AtelierViewProps, ComposeState, findPrdConversation(), PrdSeen, LiveDot(), NewConversationFormProps (+7 more)

### Community 74 - "button.tsx"
Cohesion: 0.08
Nodes (35): ORCHESTRATORS, availableSkillProviders(), expectedSkillPaths(), HOST_SKILL_ROOTS, missingSkillProviders(), SKILL_TIERS, SkillRequirement, SKILLS_CLI_AGENTS (+27 more)

### Community 76 - "usePrdSearch.ts"
Cohesion: 0.12
Nodes (16): ensureClaudeBinary(), SDK_EFFORTS, toSdkAgents(), toSdkEffort(), gitMetadataWritableRoots(), agentBaseEnv(), bestInstalledMatch(), compareParts() (+8 more)

### Community 78 - "csv.ts"
Cohesion: 0.05
Nodes (26): FailedReformulation, dryRunLog, fakeEncoder, fakeMissingKey(), hexToBytes(), NOTE: same dry-run stance as checkClaudeAvailable: every skill reported installe, GitWorktreeAddOptions, PaneSize (+18 more)

### Community 79 - "WorktreeSession"
Cohesion: 0.33
Nodes (3): listeners, mcp, ReplyArgsSchema

### Community 80 - "recordedAction.ts"
Cohesion: 0.24
Nodes (16): alternation(), COMMAND_WRAPPERS, commandSegments(), commandWords(), executableName(), launchedPackageScript(), launchesTypecheck(), OPTIONS_WITH_VALUE (+8 more)

### Community 81 - "index.ts"
Cohesion: 0.17
Nodes (17): ensureConfig(), boot(), externalUrlFromNewWindowEvent(), forwardAtelierShortcut(), installApplicationMenu(), installMenuShortcutBridge(), menuShortcutActionSchema, navigationEventSchema (+9 more)

### Community 82 - ".getReviewPass"
Cohesion: 0.12
Nodes (21): StatEmpty(), ACTIVE_BAR, AREA_CURSOR, AXIS_PROPS, BAR_CURSOR, CHART_PALETTE, CodexTierSummary(), colorAt() (+13 more)

### Community 86 - "vcsCommands.ts"
Cohesion: 0.20
Nodes (7): configFingerprint(), environmentFor(), fingerprint(), QualityManager, QualityManagerDependencies, sourceFingerprint(), QualityValidationRun

### Community 87 - "atelier.ts"
Cohesion: 0.29
Nodes (10): AppearanceSettings(), useTheme(), UseThemeResult, applyTheme(), getStoredTheme(), isTheme(), Theme, ThemeOption (+2 more)

### Community 89 - "usePrdSearch.ts"
Cohesion: 0.09
Nodes (14): log, Watchdog, PROJECT_ROOT, NOTE: PRD generation holds the request open up to ~120s (REFORMULATE_TIMEOUT_MS), resolveDataFile(), resolveServerPort(), serveStaticAsset(), SocketData (+6 more)

### Community 90 - "Profile"
Cohesion: 0.22
Nodes (9): featureBranch(), log, ReclaimOutcome, reviewPublicationState(), SETUP_PHASES, SlotManagerConfig, slugify(), ReviewPass (+1 more)

### Community 91 - "createCodexAgentSession"
Cohesion: 0.08
Nodes (25): Activation and retest, Baseline evidence and future acceptance needs, Behavior observed at the base revision, Capability and provider matrix, Checks and evidence, Criteria, providers, and delivery, Current follow-up state — 2026-10-03, Current iteration work — 2026-10-03 (+17 more)

### Community 92 - "TerminalSessionManager"
Cohesion: 0.12
Nodes (15): 1. Register the associated repositories once, 2. Prepare the common isolated workspace, 3. Plan automatically, then implement, 4. Start the application from its instructions, 5. Validate and repair in the retained workspace, 6. Deliver one feature result, End-to-end flow, First acceptance scenarios (+7 more)

### Community 93 - "ColumnActionsMenu.tsx"
Cohesion: 0.25
Nodes (7): Azure DevOps support — state file, Decisions (validated by the owner, 2026-09-21), Goal, Known blockers for lots 3 and 4, Open questions, Progress, Verified on this machine (az 2.90.0, azure-devops 1.0.8)

### Community 94 - ".addComment"
Cohesion: 0.16
Nodes (29): AgentEffort, AgentModel, CodexEffort, CodexModel, Implementer, Orchestrator, agentEffortSchema, Capabilities (+21 more)

### Community 95 - "TicketConfigSummary.tsx"
Cohesion: 0.50
Nodes (3): appBundle, EMBEDDED_BINARIES, resourcesApp

### Community 97 - "Column"
Cohesion: 0.29
Nodes (9): ManualQualityEvidenceInput, QualityCriterion, TicketQuality, CREATOR_LABELS, CriteriaEditor(), HumanEvidenceEditor(), newCriterion(), QualityCriteriaPanelProps (+1 more)

### Community 98 - "usePrdSearch.ts"
Cohesion: 0.22
Nodes (8): AtelierDesktopRpcSchema, DesktopRequests, McpSettingsMetadata, WebviewRequests, McpSettingsController, createMcpSettingsClient(), getMcpSettingsClient(), McpSettingsClient

### Community 99 - "reviewPublishingGuard.ts"
Cohesion: 0.07
Nodes (35): API_GUARDS, API_READ_METHOD_SET, ApiDenyPatterns, ApiGuard, AZ_INVOKE_COMMAND, AZ_INVOKE_METHOD_LONG_FLAGS, AZ_INVOKE_WRITE_INPUT_LONG_FLAGS, AZ_PR_WRITE_PATTERN (+27 more)

### Community 100 - ".startVerification"
Cohesion: 0.08
Nodes (25): $ref, $ref, enum, $ref, $ref, properties, designConsiderations, goals (+17 more)

### Community 101 - "codexProvider.test.ts"
Cohesion: 0.23
Nodes (16): buildContractConstraintsLines(), buildResponseFormatLines(), buildStrictRulesLines(), buildTicketLines(), buildTriageChannelPrompt(), buildTriagePlusChannelPrompt(), isEnglish(), readOnlyFramingLines() (+8 more)

### Community 103 - "recordOutcome"
Cohesion: 0.27
Nodes (9): buildFeasibilityBatchContract(), cleanTicket(), conflictTicket(), REVIEW_OPTS, reviewTicket(), TICKET_OPTS, truncateDescription(), makeTicket() (+1 more)

### Community 104 - "mcpSettings.ts"
Cohesion: 0.22
Nodes (4): McpTokenSource, createMcpSettingsController(), McpSettingsControllerDependencies, temporaryDirectories

### Community 105 - "createMcpServer"
Cohesion: 0.09
Nodes (23): $ref, $ref, $ref, minLength, type, minLength, type, enum (+15 more)

### Community 106 - "usePrdSearch.ts"
Cohesion: 0.09
Nodes (20): ANSI, appendToLogFile(), COLOR_ENABLED, createLogger(), disableFileLogging(), initLogFile(), isLevel(), Level (+12 more)

### Community 107 - "TicketCost.tsx"
Cohesion: 0.18
Nodes (14): summarizeSessionCosts(), totalTokensOfSessions(), executionCosts(), executionTokens(), projectStatRecord(), CostSummary(), MetaRow(), MetaRowProps (+6 more)

### Community 108 - "WorkflowView.tsx"
Cohesion: 0.09
Nodes (22): axes, designConsiderations, goals, id, locale, openQuestions, outOfScope, preDraft (+14 more)

### Community 109 - "TriageManager"
Cohesion: 0.16
Nodes (10): canonicalJson(), CodexCommandHook, codexSessionPreToolUseHookHash(), JsonValue, createCodexProvider(), AppServerFixtureOptions, hookPathForSession(), options() (+2 more)

### Community 110 - "createCodexAgentSession"
Cohesion: 0.11
Nodes (18): buildReformulatePrompt(), log, WorktreeAddressWatcher, projectConfigSchema, buildAppSettingsPatch(), LegacyConfig, legacyConfigSchema, LegacyModels (+10 more)

### Community 111 - "uploads.ts"
Cohesion: 0.04
Nodes (43): CodexAppServerConnection, CodexAppServerInitializationError, CodexAppServerNotification, CodexAppServerOptions, CodexAppServerProtocolError, CodexAppServerRpcError, connectCodexAppServer(), incomingSchema (+35 more)

### Community 114 - "ApiDenyPatterns"
Cohesion: 0.05
Nodes (11): mapAutomationRunRow(), mapPrNotificationRow(), mapQualityCriteriaSnapshotRow(), mapQualityValidationRunRow(), nullableBooleanValue(), serializeErrorDetails(), SqlUpdateBuilder, Store (+3 more)

### Community 115 - "useSuppressEscapeBeep.ts"
Cohesion: 0.29
Nodes (6): additionalProperties, $id, required, $schema, title, type

### Community 116 - "settings.tsx"
Cohesion: 0.04
Nodes (63): COMMIT_LANGUAGES, ProfileConfig, AppSettings, Profile, UpdateAppSettingsInput, McpSettings(), DragHandleAttributes, DragHandleListeners (+55 more)

### Community 117 - "bootstrap.ts"
Cohesion: 0.36
Nodes (5): applyDesktopEnv(), DesktopRoots, ensureMcpToken(), regenerateMcpToken(), temporaryDirectories

### Community 118 - "properties"
Cohesion: 0.29
Nodes (7): log, normalizeSeed(), TerminalSocket, TerminalSocketData, visibleText(), terminalClientMessageSchema, TerminalServerMessage

### Community 119 - "AgentMessage"
Cohesion: 0.11
Nodes (19): items, maxItems, minItems, type, uniqueItems, $ref, axes, requirements (+11 more)

### Community 120 - "ProjectPanel.tsx"
Cohesion: 0.11
Nodes (17): Agent session (server), Architecture decisions, Atelier (conversation → PRD → cards) — implementation state, Contract injection, Follow-ups noticed in Lot A, Goal, Lot A public API (use these names in Lots B and C), Lot B public surface and deviations (read before Lot C/D) (+9 more)

### Community 121 - "profileSummary.ts"
Cohesion: 0.05
Nodes (59): AGENT_EFFORT_FULL_LABELS, AGENT_EFFORT_LABELS, AGENT_MODEL_FULL_LABELS, AGENT_MODEL_LABELS, AUTOMATION_RUN_STATUSES, AUTOMATION_TRIGGER_LABELS, AUTOMATION_TRIGGERS, AutomationTrigger (+51 more)

### Community 122 - "TicketOperationError"
Cohesion: 0.23
Nodes (9): PROJECT_ROOT, PrdRenderError, RENDERER_RELATIVE_PATH, renderPrdHtml(), RenderPrdHtmlInput, resolvePrdRendererPath(), TEMPLATE_PATH, PrdDocument (+1 more)

### Community 123 - "StatCard.tsx"
Cohesion: 0.33
Nodes (7): StatRecord, StatCard(), StatCardProps, StatsView(), StatsViewProps, useStats(), UseStatsResult

### Community 124 - "TicketOperations"
Cohesion: 0.18
Nodes (5): listPublicProjects(), PublicMcpManager, normalizeCreateInput(), requestKeyConflictMessage(), TicketOperations

### Community 125 - "useReviewCounts.ts"
Cohesion: 0.35
Nodes (10): getSnapshot(), INITIAL_SNAPSHOT, loadReviewCounts(), publish(), refreshReviewCounts(), reviewIdentity(), startRefreshing(), subscribe() (+2 more)

### Community 126 - "TicketOperations"
Cohesion: 0.10
Nodes (10): assertCodexImplementerAvailable(), SlotManager, slotPath(), addUsageByModel(), toUsageByModel(), mapQualityIterationRow(), mapSlotRow(), failSplitMother() (+2 more)

### Community 127 - "TerminalSessionManager"
Cohesion: 0.13
Nodes (16): nonEmptyStringArray, stringArray, items, type, uniqueItems, minLength, pattern, type (+8 more)

### Community 128 - "contract.test.ts"
Cohesion: 0.08
Nodes (34): NewReview, createQualityRoutes(), agentPairError(), attachment(), cleanDescription(), CONVERSATION_STATUS_FOR_PRD, conversationTitle(), createApiRoutes() (+26 more)

### Community 129 - "useConversationDetail.ts"
Cohesion: 0.40
Nodes (4): MIME_EXTENSIONS, resolveExtension(), SavedUpload, saveUpload()

### Community 130 - ".handleRequest"
Cohesion: 0.36
Nodes (7): effectivePort(), isAllowedHost(), isAllowedOrigin(), isAuthorized(), isLoopbackHost(), jsonResponse(), parseHost()

### Community 132 - "SlotPips.tsx"
Cohesion: 0.36
Nodes (7): Slot, ATTENTION_STATUSES, sessionOf(), SlotPips(), SlotPipsProps, STATUS_LABELS, STATUS_PIP_CLASSES

### Community 134 - "id"
Cohesion: 0.15
Nodes (14): additionalProperties, properties, required, type, axis, id, maxLength, pattern (+6 more)

### Community 136 - "reformulate.ts"
Cohesion: 0.15
Nodes (14): ActiveQualityRun, CHECK_RUNNERS, CheckCommand, commandSucceeded(), DATABASE_ISOLATION_PLACEHOLDERS, databaseIsolationProblem(), log, outputFor() (+6 more)

### Community 137 - "createMcpServer"
Cohesion: 0.25
Nodes (7): createMcpServer(), invalidInput(), OutputValidator, toolError(), toolResult(), FeasibilityStarter, isProcessing()

### Community 142 - "$defs"
Cohesion: 0.17
Nodes (12): pattern, type, $defs, axisId, requirement, task, additionalProperties, required (+4 more)

### Community 144 - "title"
Cohesion: 0.18
Nodes (11): source, ref, title, minLength, type, additionalProperties, properties, required (+3 more)

### Community 145 - "preDraft"
Cohesion: 0.18
Nodes (11): additionalProperties, properties, required, type, preDraft, reuse, sharedSurfaces, sourcePriority (+3 more)

## Knowledge Gaps
- **1113 isolated node(s):** `Permission refusals are specific to a command and session`, `Two agent providers: implement every host integration for both`, `Azure reviewer response nullability`, `Disposable quality verification`, `Current iteration work — 2026-10-03` (+1108 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **15 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Store` connect `ApiDenyPatterns` to `contract.test.ts`, `Desktop Bootstrap & Menus`, `reformulate.ts`, `Core Domain Concepts`, `Stats Aggregation`, `Dev Dependencies`, `Client Hub & Watchdog`, `Cost & Pricing`, `Agents View & Ticket Cards`, `PRD Review & Markdown`, `NPM Scripts`, `Runtime Dependencies`, `API Client Inputs`, `Ticket Detail & Triage UI`, `Session Hub Transcript`, `Modal Dialogs`, `Community 48`, `Slot State`, `Community 54`, `App.tsx`, `CSV Parsing`, `Package Manifest`, `prUrl.ts`, `schema.test.ts`, `csv.ts`, `vcsCommands.ts`, `usePrdSearch.ts`, `Profile`, `recordOutcome`, `TicketCost.tsx`, `createCodexAgentSession`, `PreparedHook`, `properties`, `TicketOperations`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **Why does `SystemAdapter` connect `.handleRequest` to `Desktop Bootstrap & Menus`, `Ticket Action Panels`, `PublishReviewOptions`, `Settings & Profiles UI`, `Stats Aggregation`, `Dev Dependencies`, `Cost & Pricing`, `Agents View & Ticket Cards`, `PRD Review & Markdown`, `NPM Scripts`, `API Client Inputs`, `Ticket Detail & Triage UI`, `Demo Pipeline Concepts`, `Slot State`, `Community 51`, `App.tsx`, `Package Manifest`, `TicketCard.tsx`, `csv.ts`, `createCodexAgentSession`, `PreparedHook`, `properties`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Why does `FakeSystemAdapter` connect `Settings & Profiles UI` to `prUrl.ts`, `Ticket Action Panels`, `Real System Adapter`, `Ticket Detail & Triage UI`, `.handleRequest`, `Session Hub Transcript`, `csv.ts`, `Community 54`, `CSV Parsing`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **What connects `Permission refusals are specific to a command and session`, `Two agent providers: implement every host integration for both`, `Azure reviewer response nullability` to the rest of the system?**
  _1125 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Contract Building & Slots` be split into smaller, more focused modules?**
  _Cohesion score 0.013604208235080718 - nodes in this community are weakly interconnected._
- **Should `Terminals UI & Notifications` be split into smaller, more focused modules?**
  _Cohesion score 0.09090909090909091 - nodes in this community are weakly interconnected._
- **Should `Desktop Bootstrap & Menus` be split into smaller, more focused modules?**
  _Cohesion score 0.1103448275862069 - nodes in this community are weakly interconnected._