# Graph Report - kanban-agents  (2026-09-25)

## Corpus Check
- 303 files · ~778,861 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3756 nodes · 9840 edges · 155 communities (146 shown, 9 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 72 edges (avg confidence: 0.65)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3e875aa9`
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
- store.ts
- id
- transcriptBuffer.ts
- TerminalView.tsx
- createAtelierRoutes
- CardsPanel.tsx
- codexBinary.ts
- PrdPanel.tsx
- usePrdSearch.ts
- $defs
- StageProgressBar.tsx
- title
- preDraft
- AgentMessage
- notifications.ts
- Profile
- SkillStatus
- skills.ts
- prd.schema.json
- setup
- notion.ts
- PRD_ANNOTATIONS_SCHEMA

## God Nodes (most connected - your core abstractions)
1. `Store` - 150 edges
2. `Ticket` - 115 edges
3. `FakeSystemAdapter` - 73 edges
4. `SystemAdapter` - 72 edges
5. `createApiRoutes()` - 69 edges
6. `RealSystemAdapter` - 66 edges
7. `cn()` - 59 edges
8. `ClientHub` - 53 edges
9. `ProjectInfo` - 53 edges
10. `SessionHub` - 52 edges

## Surprising Connections (you probably didn't know these)
- `McpSettingsClient` --references--> `McpSettingsMetadata`  [EXTRACTED]
  src/web/src/lib/mcpSettings.ts → desktop/mcpRpc.ts
- `SubmittedTurn` --references--> `ConversationMessage`  [EXTRACTED]
  src/server/agents/atelierManager.ts → src/shared/schemas.ts
- `TriageSessionInput` --references--> `Orchestrator`  [EXTRACTED]
  src/server/agents/sessionConfig.ts → src/shared/constants.ts
- `SplitSessionInput` --references--> `Orchestrator`  [EXTRACTED]
  src/server/agents/sessionConfig.ts → src/shared/constants.ts
- `FeasibilitySessionInput` --references--> `Orchestrator`  [EXTRACTED]
  src/server/agents/sessionConfig.ts → src/shared/constants.ts

## Import Cycles
- None detected.

## Communities (155 total, 9 thin omitted)

### Community 0 - "Contract Building & Slots"
Cohesion: 0.03
Nodes (83): ActionExecutionOptions, actionExecutionOptionsSchema, agentMessageSchema, AnalyzeTicketsInput, appSettingsSchema, automationRunSchema, automationSchema, baseBranchSchema (+75 more)

### Community 1 - "Terminals UI & Notifications"
Cohesion: 0.07
Nodes (36): analyzeTicketsInputSchema, analyzeTicketsOutputSchema, columnSchema, compactTicketSchema, createMcpServer(), createTodoTicketOutputSchema, editableTicketSchema, effectivePort() (+28 more)

### Community 2 - "Desktop Bootstrap & Menus"
Cohesion: 0.11
Nodes (17): createCodexAgentSession(), inheritedMcpServerNames(), PreparedHook, prepareSkills(), threadConfig(), accountResponseSchema, hasExplicitCodexApiKey(), isProtocolIncompatibility() (+9 more)

### Community 3 - "Feasibility Batch Management"
Cohesion: 0.06
Nodes (38): log, logRejection(), ToolHandler, ToolResult, TRIAGE_VERDICTS, AgentSettableStage, agentSettableStageSchema, askUserArgsSchema (+30 more)

### Community 4 - "Ticket Action Panels"
Cohesion: 0.08
Nodes (20): CapturingSystem, CLAUDE_CONVERSATION, closers, CODEX_CONVERSATION, TEMPLATE_PATH, TURN_END, AckSystem, ActiveDelegation (+12 more)

### Community 5 - "Fake System Adapter"
Cohesion: 0.09
Nodes (32): RepoInspectionSource, CreateProjectInput, ManagedProject, RepoInspection, UpdateProjectInput, vcsProviderSchema, ConnectionHint, CreateStep (+24 more)

### Community 6 - "Shared Zod Schemas"
Cohesion: 0.05
Nodes (59): AGENT_EFFORT_LABELS, AGENT_MODEL_LABELS, Comment, PrSelectRow(), ActivityTab(), ActivityTabProps, isUnanswered(), NO_COMMENT_COLUMNS (+51 more)

### Community 7 - "Settings & Profiles UI"
Cohesion: 0.05
Nodes (12): NewProject, ProjectPatch, ActionSystem, delay(), FakePaneStream, fakeShellPrompt(), FakeSystemAdapter, hexToBytes() (+4 more)

### Community 8 - "PR Selection & Slots Bar"
Cohesion: 0.20
Nodes (14): prNumberFromUrl(), AgentCard(), STATE_STRIPE_COLORS, TicketCard(), TicketCardProps, TriageDot(), truncateParentTitle(), ANIMATED_STAGES (+6 more)

### Community 9 - "Real System Adapter"
Cohesion: 0.05
Nodes (53): AUTOMATION_RUN_STATUSES, CODEX_EFFORT_FULL_LABELS, CODEX_EFFORT_LABELS, CODEX_MODEL_LABELS, COMMENT_AUTHORS, COMMIT_LANGUAGE_LABELS, CONVERSATION_MESSAGE_ROLES, CONVERSATION_SESSION_STATUSES (+45 more)

### Community 10 - "Slot Config & Worktree Watch"
Cohesion: 0.18
Nodes (17): COLUMN_SORT_FIELD, BoardColumn(), compareFamilyMembers(), familyKeyOf(), groupTicketIds(), groupTicketsByFamily(), isSplitMother(), readCollapsed() (+9 more)

### Community 11 - "Core Domain Concepts"
Cohesion: 0.04
Nodes (63): agentMessageRowSchema, AutomationRow, automationRowSchema, AutomationRunRow, automationRunRowSchema, buildScripts(), CommentRow, commentRowSchema (+55 more)

### Community 13 - "Database Store Operations"
Cohesion: 0.06
Nodes (52): RFC-4180, COMMIT_LANGUAGES, CommitLanguage, REVIEW_DEPTHS, commitLanguageSchema, ProjectInfo, reviewDepthSchema, AgentsViewProps (+44 more)

### Community 14 - "Coordinator & Protocol"
Cohesion: 0.09
Nodes (29): escapeHtml(), renderCollapsedDetails(), renderOutsideDiffComment(), renderOutsideDiffSection(), ReviewPublicationComment, azureChangeEntrySchema, azureCommentSchema, azureIdentitySchema (+21 more)

### Community 15 - "API Routes & Reformulate"
Cohesion: 0.08
Nodes (35): main(), scalar(), log, initProjectRegistry(), assertCodexDowngradeSafe(), backfillOrchestrator(), countRows(), createDatabase() (+27 more)

### Community 16 - "Stats Aggregation"
Cohesion: 0.10
Nodes (4): startParentSession(), SessionHub, SessionHubHandlers, SessionStartCallbacks

### Community 17 - "Triage & Server Hub"
Cohesion: 0.08
Nodes (25): devDependencies, autoprefixer, class-variance-authority, clsx, concurrently, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities (+17 more)

### Community 18 - "Live Terminal Views"
Cohesion: 0.05
Nodes (71): buildAskContract(), buildCleanContract(), buildConflictResolutionContract(), buildFeasibilityBatchContract(), buildFeasibilityContextSection(), buildImplementingSteps(), buildMockupReviewStep(), buildPlanningStep() (+63 more)

### Community 19 - "Stage Progress & Display"
Cohesion: 0.08
Nodes (24): compilerOptions, allowImportingTsExtensions, baseUrl, esModuleInterop, isolatedModules, jsx, lib, module (+16 more)

### Community 20 - "Real Adapter GH/Composer"
Cohesion: 0.09
Nodes (28): Kind, KINDS, CodexTierSummary(), DurationChart(), ThroughputChart(), effectiveWorkDurationMs(), CodexTierSummary, DurationGroup (+20 more)

### Community 21 - "Store Types & Agent Knobs"
Cohesion: 0.08
Nodes (83): agent_context_html(), agent_entry_count(), axes_html(), axis_anchor(), axis_head_html(), axis_items(), axis_section_html(), axis_statuses() (+75 more)

### Community 22 - "DB Row Schemas & Mappers"
Cohesion: 0.11
Nodes (28): dragKeys(), groupCountLabel(), groupSortId(), ListGroup, ProjectList(), ProjectListProps, ProjectListRowProps, projectSortId() (+20 more)

### Community 23 - "Dev Dependencies"
Cohesion: 0.08
Nodes (23): TicketCreationRequestConflictError, AnalyzeTicketRejectionReason, AnalyzeTicketsResult, CreateTodoTicketInput, createTodoTicketInputSchema, CreateTodoTicketResult, FeasibilityStarter, isActive() (+15 more)

### Community 24 - "TypeScript Config"
Cohesion: 0.13
Nodes (23): bashCommandSchema, buildSettings(), claudeProvider, createSdkAgentSession(), denyBashHook(), denyNoVerifyHook, denyReviewPublishingHook, denyTypecheckHook() (+15 more)

### Community 25 - "Client Hub & Watchdog"
Cohesion: 0.14
Nodes (5): AgentCoordinator, formatPrdDocumentIssues(), parseAtelierSessionKey(), SessionToolCall, RouteDeps

### Community 26 - "Cost & Pricing"
Cohesion: 0.09
Nodes (19): buildAtelierConsolidateTurn(), buildAtelierRegenerationTurn(), ACTIVITY_PROGRESS_KINDS, AssistantPart, AtelierManager, AtelierManagerDeps, ConversationRuntime, describeToolUse() (+11 more)

### Community 27 - "Workflow View & Lifecycle"
Cohesion: 0.05
Nodes (29): Architecture, Commands, Conventions (enforced — beyond the global ones in ~/.claude/CLAUDE.md), graphify, The dry-run safety model — read before running anything, What this is, Agent runtime (Agent SDK), Architecture (+21 more)

### Community 28 - "Stats Charts"
Cohesion: 0.07
Nodes (42): AgentMcpServerDefinition, agentMessageDeltaSchema, agentToml(), apiWriteDenyScript(), buildMcpServers(), ConfigObject, configReadResponseSchema, ConfigValue (+34 more)

### Community 29 - "Session Hub & Agent Session"
Cohesion: 0.10
Nodes (23): AUTOMATION_TRIGGER_LABELS, AUTOMATION_TRIGGERS, AutomationRunStatus, AutomationCard(), AutomationCardProps, AutomationFormProps, AutomationView(), EMPTY_FORM (+15 more)

### Community 30 - "Agents View & Ticket Cards"
Cohesion: 0.13
Nodes (11): directories, initializeParamsSchema, log, requestSchema, rpcError(), rpcResult(), rpcResponseSchema, toolCallParamsSchema (+3 more)

### Community 31 - "PRD Review & Markdown"
Cohesion: 0.12
Nodes (25): ReviewResult, ALSO_FLAGGED_PREFIX, dedupeFindings(), dedupeIdenticalFindings(), DimensionFinding, findingAnchor(), FRENCH_STOP_WORD_PATTERN, FRENCH_STOP_WORDS (+17 more)

### Community 32 - "User Terminal & Fake IO"
Cohesion: 0.15
Nodes (24): ExecutionFinishStatus, LiveSession, log, PendingSessionMessage, previewToolInput(), renderSessionEvent(), SessionExecutionContext, SessionExecutionFinish (+16 more)

### Community 33 - "Logging"
Cohesion: 0.10
Nodes (21): scripts, build:desktop, build:web, dev, dev:desktop, dev:proxy, dev:server, dev:web (+13 more)

### Community 34 - "Board Columns"
Cohesion: 0.39
Nodes (7): emit(), loadedSubscribers, loadOnce(), refreshProjects(), subscribers, useProjects(), useProjectsLoaded()

### Community 35 - "NPM Scripts"
Cohesion: 0.13
Nodes (10): buildReformulatePrompt(), ReformulateManager, stalledEventPayload(), TicketLifecycle, ErrorDetails, ErrorDetailsSource, parseTriageReport(), Ticket (+2 more)

### Community 36 - "Runtime Dependencies"
Cohesion: 0.05
Nodes (39): ProjectInUseError, attachment(), cleanDescription(), CONVERSATION_STATUS_FOR_PRD, conversationTitle(), log, orderSelectedTasks(), PrdCardDraft (+31 more)

### Community 37 - "Claude SDK Provider"
Cohesion: 0.09
Nodes (22): dependencies, @anthropic-ai/claude-agent-sdk, dompurify, elysia, @fontsource/ibm-plex-mono, @fontsource/ibm-plex-sans, marked, @modelcontextprotocol/sdk (+14 more)

### Community 38 - "Agent Profile Config"
Cohesion: 0.15
Nodes (16): costByFamily(), costOf(), costOfModel(), costOfSessions(), CostSummary, FamilyPricing, MODEL_PRICING, ModelFamily (+8 more)

### Community 39 - "Agent Coordinator Handlers"
Cohesion: 0.10
Nodes (28): artifactPath, assertPackageVersionInSync(), assertSdkVersionsInSync(), BUILT_DMG, ELECTROBUN_BIN, fail(), installedPackageVersion(), RELEASE_FOLDER (+20 more)

### Community 40 - "API Client Inputs"
Cohesion: 0.17
Nodes (4): childTranscriptPrefix(), DelegationManager, reviewKey(), mergeAgentUsageByModel()

### Community 41 - "Ticket Config & Constants"
Cohesion: 0.29
Nodes (8): StatRecord, StatCard(), StatCardProps, StatEmpty(), StatsView(), StatsViewProps, useStats(), UseStatsResult

### Community 42 - "Ticket Detail & Triage UI"
Cohesion: 0.12
Nodes (23): FAILURE_COLUMNS, SUCCESS_COLUMNS, ACTIVE_BAR, AREA_CURSOR, AXIS_PROPS, BAR_CURSOR, CHART_PALETTE, colorAt() (+15 more)

### Community 43 - "Demo Pipeline Concepts"
Cohesion: 0.10
Nodes (13): PaneStream, dataMessage(), log, normalizeSeed(), safeParse(), send(), TerminalSession, TerminalSessionManager (+5 more)

### Community 44 - "Chart Primitives"
Cohesion: 0.31
Nodes (13): abortReason(), computeCodeFingerprint(), FingerprintEntry, FingerprintPhase, hashFingerprintPaths(), isMissingFileError(), listFingerprintPaths(), log (+5 more)

### Community 45 - "Session Hub Transcript"
Cohesion: 0.10
Nodes (11): featureBranch(), SlotManager, slotPath(), slugify(), mapSlotRow(), mapWorktreeSessionRow(), enrichWorktreeSession(), failSplitMother() (+3 more)

### Community 46 - "Community 46"
Cohesion: 0.27
Nodes (15): Agent Implementation Config, Argus Code Review, Automated Tests (typecheck/lint/test), Claude Code Autonomous Agent, Ticket Contract Injection, Feasibility Analysis, Kanban Board (Atelier), Kanban Agents Demo (demo.gif) (+7 more)

### Community 47 - "Modal Dialogs"
Cohesion: 0.17
Nodes (8): AZURE_COMMANDS, COMMANDS_BY_PROVIDER, GITHUB_COMMANDS, PrDiffContext, VcsCleanCommands, VcsCommandTable, AZ_SETTLED_THREAD_STATUSES, VCS_PROVIDER_LABELS

### Community 48 - "Community 48"
Cohesion: 0.15
Nodes (18): COLUMN_ORDER, COLUMNS, ACTIVE_COLUMNS, Board(), BoardProps, isColumn(), isLocked(), normalize() (+10 more)

### Community 50 - "Stats Hooks & Cards"
Cohesion: 0.16
Nodes (12): ChartConfig, ChartContainer, ChartContainerProps, ChartContext, ChartContextValue, ChartLegendContent(), ChartLegendContentProps, ChartTooltipContent() (+4 more)

### Community 51 - "Community 51"
Cohesion: 0.09
Nodes (21): AGENTS_SKILLS_DIR, CLAUDE_JSON_PATH, CLAUDE_SKILLS_DIR, commandOutputOrNull(), COMPOSER_BINARIES, DEFAULT_CODEX_HOME, GitRemoteFacts, INSTALL_COMMANDS (+13 more)

### Community 52 - "repairPath.ts"
Cohesion: 0.16
Nodes (13): TERMINAL_STAGES, terminalServerMessageSchema, badgeLabelFor(), LiveTerminal(), LiveTerminalOptions, LiveTerminalProps, TerminalTab(), TerminalTabProps (+5 more)

### Community 53 - "User Terminal Manager"
Cohesion: 0.33
Nodes (5): CONTEXT — domain glossary, Execution, Proposed (not yet built), Seams, Work items

### Community 54 - "Community 54"
Cohesion: 0.07
Nodes (24): extractPrUrl(), ghPrHeadSchema, ghPrSchema, ghPrStateSchema, ghRestPullSchema, ghRestReviewPagesSchema, ghRestReviewSchema, ghRestReviewsSchema (+16 more)

### Community 55 - "App.tsx"
Cohesion: 0.11
Nodes (11): ActiveReviewPass, ResolvedExecution, FeasibilityBatchManager, FeasibilityGroup, FeasibilitySession, QueuedFeasibility, toTriageResult(), TriageManager (+3 more)

### Community 56 - "CSV Parsing"
Cohesion: 0.19
Nodes (15): ColumnActionsMenu(), ColumnActionsMenuProps, ColumnMenuItem, ActionContext, buildActions(), ConfirmSpec, errorMessage(), RETRY_STAGES (+7 more)

### Community 57 - "Community 57"
Cohesion: 0.17
Nodes (8): withJsonRequestFile(), ReviewPublicationState, GithubVcsClient, pullApiEndpoint(), reviewApiEndpoint(), rightSideDiffLines(), ReviewPublicationCheck, parsePrUrl()

### Community 58 - "File Uploads"
Cohesion: 0.35
Nodes (9): gitMetadataWritableRoots(), agentBaseEnv(), bestInstalledMatch(), compareParts(), envWithProjectNode(), nvmNodeBinDir(), readNvmrc(), prepareProjectShell() (+1 more)

### Community 59 - "triageManager.ts"
Cohesion: 0.18
Nodes (19): buildSplitChannelPrompt(), buildTicketLines(), isEnglish(), buildContractConstraintsLines(), buildResponseFormatLines(), buildStrictRulesLines(), buildTicketLines(), buildTriageChannelPrompt() (+11 more)

### Community 60 - "Package Manifest"
Cohesion: 0.18
Nodes (5): detectInstallCommand(), realpathSafe(), resolveWorktreeScriptCommand(), setupOutputExcerpt(), shQuote()

### Community 61 - "splitManager.ts"
Cohesion: 0.14
Nodes (21): AGENT_EFFORT_FULL_LABELS, CONVERSATION_STATUS_LABELS, UpdateConversationInput, AtelierView(), AtelierViewProps, findPrdConversation(), PrdSeen, buildThread() (+13 more)

### Community 62 - "TicketCard.tsx"
Cohesion: 0.10
Nodes (28): PrdAnnotation, prdAnnotationsSchema, FeedbackDraft, PrdAnnotator(), PrdAnnotatorProps, BREADCRUMB, NO_ANNOTATIONS, PrdReviewDialog() (+20 more)

### Community 63 - "Community 63"
Cohesion: 0.33
Nodes (9): useTheme(), UseThemeResult, applyTheme(), getStoredTheme(), isTheme(), Theme, ThemeOption, THEMES (+1 more)

### Community 64 - "Composer Run Script"
Cohesion: 0.23
Nodes (23): axisTitle(), Block, bulletList(), heading(), joinBlocks(), labelledList(), LABELS, listOrNone() (+15 more)

### Community 65 - "split.ts"
Cohesion: 0.13
Nodes (18): buildRepoInspection(), formatProjectLabel(), LOCKFILE_NAMES, LOCKFILE_RUNNERS, PackageManifest, packageManifestSchema, PROVIDER_HOST_MARKERS, RepoFacts (+10 more)

### Community 66 - "prUrl.ts"
Cohesion: 0.17
Nodes (5): AutomationManager, mapAutomationRow(), mapAutomationRunRow(), Automation, AutomationRun

### Community 67 - "TerminalView.tsx"
Cohesion: 0.40
Nodes (4): MIME_EXTENSIONS, resolveExtension(), SavedUpload, saveUpload()

### Community 68 - "schema.test.ts"
Cohesion: 0.22
Nodes (14): isProcessing(), ACTIVE_STAGES, availableTabs(), hasSessionPane(), initialTab(), isLocked(), isTextEntry(), KIND_TOKENS (+6 more)

### Community 69 - "reviewFindings.ts"
Cohesion: 0.10
Nodes (20): BOARD_FINDING_RENDER_STYLE, log, renderFinding(), REVIEW_DISALLOWED_TOOLS, REVIEW_REPORT_LABELS, REVIEW_REPORT_LABELS_EN, REVIEW_REPORT_LABELS_FR, REVIEW_TOOLS (+12 more)

### Community 70 - "CodexRuntimeStatus"
Cohesion: 0.06
Nodes (49): resolveBaseBranch(), assertExecutionAvailable(), CODEX_LAUNCH_STATUS_MESSAGES, CodexCapabilityReader, ExecutionDefaults, ExecutionOverrides, FEASIBILITY_ENGINE_EXECUTION, resolveExecution() (+41 more)

### Community 71 - "PostCSS Config"
Cohesion: 0.29
Nodes (6): name, overrides, zod, private, type, version

### Community 72 - "useAppSettings.ts"
Cohesion: 0.08
Nodes (23): axisIdSchema, DUPLICATE_ITEMS_ISSUE, hasDuplicates(), identifierSchema, isUnique(), nonEmptyTextArraySchema, PRD_LOCALES, PRD_REQUIREMENT_KINDS (+15 more)

### Community 73 - "TerminalView.tsx"
Cohesion: 0.18
Nodes (18): Capabilities, CodexConnectionStatus(), STATUS_LABELS, SessionDriverFields(), clearRetry(), loadCapabilities(), LoadOptions, publish() (+10 more)

### Community 74 - "button.tsx"
Cohesion: 0.14
Nodes (16): expectedSkillPaths(), skillzerInstallCommand(), COPY_LABELS, CopyOutcome, InstallBlock(), installLine(), isFullyInstalled(), MISSING_DOT_CLASSES (+8 more)

### Community 75 - ".handleRequest"
Cohesion: 0.06
Nodes (27): ClientSocket, PROJECT_ROOT, NOTE: PRD generation holds the request open up to ~120s (REFORMULATE_TIMEOUT_MS), resolveDataFile(), resolveServerPort(), RunningServer, serveStaticAsset(), SocketData (+19 more)

### Community 76 - "usePrdSearch.ts"
Cohesion: 0.14
Nodes (9): orderedReviewKinds(), renderPersistedReviewResult(), allowedReviewPasses(), requiredReviewKinds(), renderChannelEvent(), renderImplementationDone(), mapReviewApprovalRow(), mapReviewPassRow() (+1 more)

### Community 78 - "csv.ts"
Cohesion: 0.09
Nodes (9): DoneGateResult, ReviewHeadResult, FAKE_OPEN_PRS, FakeVcsClient, githubPrHeadRef(), VcsClient, isPrNeedsAttention(), OpenPr (+1 more)

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
Cohesion: 0.32
Nodes (14): AGENT_MODEL_FULL_LABELS, buildProfilePipeline(), claudeDetail(), claudeSubagentDetail(), codexOrchestratorDetail(), codexSubagentParts(), describeProfile(), implementerNodeValue() (+6 more)

### Community 86 - "useTickTimer.ts"
Cohesion: 0.27
Nodes (9): AgentCardProps, AgentsView(), hasLiveAgent(), normalize(), KIND_BADGES, TicketBadges(), TicketBadgesProps, resolveProjectColor() (+1 more)

### Community 87 - "mcpSettings.ts"
Cohesion: 0.09
Nodes (60): AtelierSessionInput, AttachExecutionSessionInput, AutomationPatch, ConversationPatch, EnqueueAgentMessageInput, FinalizeExecutionInput, MarkAgentMessageAcceptedInput, MarkAgentMessageReceivedInput (+52 more)

### Community 90 - "PaneStream"
Cohesion: 0.14
Nodes (11): RecordingSystemAdapter, GitWorktreeAddOptions, ImportNotionOptions, PaneSize, PrepareReviewWorktreeOptions, PublishReviewOptions, PublishReviewResult, ReviewDoneOptions (+3 more)

### Community 91 - "bootstrap.ts"
Cohesion: 0.20
Nodes (10): CapabilityCache, CodexRuntimeModel, codexRuntimeModelSchema, CodexRuntimeStatus, codexRuntimeStatusSchema, isCodexFastServiceTier(), pairedRuntimeCodexEffort(), UNKNOWN_CODEX_RUNTIME_STATUS (+2 more)

### Community 92 - "TerminalSessionManager"
Cohesion: 0.18
Nodes (14): summarizeSessionCosts(), totalTokensOfSessions(), executionCosts(), executionTokens(), projectStatRecord(), CostSummary(), MetaRow(), MetaRowProps (+6 more)

### Community 93 - "ColumnActionsMenu.tsx"
Cohesion: 0.25
Nodes (7): Azure DevOps support — state file, Decisions (validated by the owner, 2026-09-21), Goal, Known blockers for lots 3 and 4, Open questions, Progress, Verified on this machine (az 2.90.0, azure-devops 1.0.8)

### Community 94 - ".addComment"
Cohesion: 0.13
Nodes (3): Watchdog, ClientHub, Notifier

### Community 95 - "TicketConfigSummary.tsx"
Cohesion: 0.50
Nodes (3): appBundle, EMBEDDED_BINARIES, resourcesApp

### Community 97 - "RunningServer"
Cohesion: 0.22
Nodes (10): projectConfigSchema, buildAppSettingsPatch(), LegacyConfig, legacyConfigSchema, LegacyModels, log, migrateConfigJsonIfPresent(), parseLegacyConfig() (+2 more)

### Community 98 - "usePrdSearch.ts"
Cohesion: 0.14
Nodes (12): boundedCommandDetail(), runBoundedCommand(), safeJsonParse(), ReviewPublicationEvent, AzureDevopsVcsClient, prWebUrl(), readOriginRemote(), repoRefFromPrUrl() (+4 more)

### Community 99 - "reviewPublishingGuard.ts"
Cohesion: 0.07
Nodes (35): API_GUARDS, API_READ_METHOD_SET, ApiDenyPatterns, ApiGuard, AZ_INVOKE_COMMAND, AZ_INVOKE_METHOD_LONG_FLAGS, AZ_INVOKE_WRITE_INPUT_LONG_FLAGS, AZ_PR_WRITE_PATTERN (+27 more)

### Community 100 - ".startVerification"
Cohesion: 0.08
Nodes (25): $ref, $ref, enum, $ref, $ref, properties, designConsiderations, goals (+17 more)

### Community 101 - "codexProvider.test.ts"
Cohesion: 0.29
Nodes (10): availableSkillProviders(), missingSkillProviders(), SkillsSettings(), missingSignature(), PreflightCopy, providerList(), readDismissedSignature(), SkillsPreflightDialog() (+2 more)

### Community 102 - ".start"
Cohesion: 0.09
Nodes (4): startFeasibilityTicket(), mapConversationMessageRow(), SqlUpdateBuilder, Store

### Community 103 - "TerminalSession"
Cohesion: 0.06
Nodes (3): reviewPublicationEvent(), reviewPublicationState(), SystemAdapter

### Community 104 - "settings.tsx"
Cohesion: 0.14
Nodes (6): CodexAppServerConnection, CodexAppServerNotification, CodexAppServerOptions, CodexProviderDependencies, AppServerFixture, CodexRuntimeDependencies

### Community 105 - "createMcpServer"
Cohesion: 0.09
Nodes (23): $ref, $ref, $ref, minLength, type, minLength, type, enum (+15 more)

### Community 106 - "usePrdSearch.ts"
Cohesion: 0.07
Nodes (28): log, log, SlotWatch, WorktreeAddressWatcher, ANSI, appendToLogFile(), COLOR_ENABLED, disableFileLogging() (+20 more)

### Community 107 - "azureRemote.ts"
Cohesion: 0.40
Nodes (10): azureOrgUrl(), fromAzureSegments(), fromCollectionSegments(), fromLegacySegments(), fromSshSegments(), parseAzureRepoRef(), parseRemoteLocation(), RemoteLocation (+2 more)

### Community 108 - "WorkflowView.tsx"
Cohesion: 0.09
Nodes (22): axes, designConsiderations, goals, id, locale, openQuestions, outOfScope, preDraft (+14 more)

### Community 109 - "projectDisplay.ts"
Cohesion: 0.13
Nodes (14): NEW_CONVERSATION, openStore(), paths, TEMPLATE_PATH, NewPrdDocument, PrdRenderError, RENDERER_RELATIVE_PATH, renderPrdHtml() (+6 more)

### Community 110 - "Profile"
Cohesion: 0.06
Nodes (52): ProfileConfig, AppSettings, AgentProfileConfig(), DragHandleAttributes, DragHandleListeners, ProfilePipeline(), ProfileRow(), ProfileRowHeader() (+44 more)

### Community 111 - "FakePaneStream"
Cohesion: 0.39
Nodes (7): currentNow, getSnapshot(), startTicking(), stopTicking(), subscribe(), subscribers, useTickTimer()

### Community 112 - "useSavedFlash.ts"
Cohesion: 0.22
Nodes (8): App(), HOME_VIEW_OPTIONS, HomeView, NAV_ENTRIES, NavEntry, Sidebar(), SidebarProps, SidebarView

### Community 113 - "repairPath.ts"
Cohesion: 0.09
Nodes (19): CHILD_USAGE, FULL_REVIEW_KINDS, LIGHT_REVIEW_KINDS, newDelegatedTicket(), newReviewTicket(), RecordedSession, setup(), sleep() (+11 more)

### Community 114 - "ApiDenyPatterns"
Cohesion: 0.09
Nodes (18): mapCommentRow(), agentPairError(), createApiRoutes(), createSplitChildren(), isBlocked(), isSplitMother(), isWebOnlyPath(), jsonError() (+10 more)

### Community 115 - "relaunch.ts"
Cohesion: 0.47
Nodes (5): COLUMN_NODE_COLOR, depthOf(), truncate(), WorkflowView(), WorkflowViewProps

### Community 116 - "settings.tsx"
Cohesion: 0.07
Nodes (23): CODEX_STATUS_TONES, COMMIT_ROW, DefaultsRowSpec, EFFORT_OPTIONS, FEASIBILITY_ROW, IMPLEMENTATION_ROW, KnobGroupProps, LANGUAGE_OPTIONS (+15 more)

### Community 117 - "useAppSettings.ts"
Cohesion: 0.12
Nodes (13): CodexAppServerInitializationError, CodexAppServerProtocolError, CodexAppServerRpcError, connectCodexAppServer(), incomingSchema, initializeResponseSchema, log, PendingRequest (+5 more)

### Community 119 - "AgentMessage"
Cohesion: 0.11
Nodes (19): items, maxItems, minItems, type, uniqueItems, $ref, axes, requirements (+11 more)

### Community 120 - "ProjectPanel.tsx"
Cohesion: 0.11
Nodes (17): Agent session (server), Architecture decisions, Atelier (conversation → PRD → cards) — implementation state, Contract injection, Follow-ups noticed in Lot A, Goal, Lot A public API (use these names in Lots B and C), Lot B public surface and deviations (read before Lot C/D) (+9 more)

### Community 121 - "VcsConnectionResult"
Cohesion: 0.26
Nodes (4): BoundedCommandResult, connectionFailure(), connectionResult(), VcsConnectionResult

### Community 122 - "createMcpServer"
Cohesion: 0.19
Nodes (16): buildAtelierPrompt(), buildAuthoringRules(), buildFraming(), buildHistory(), buildResearch(), buildRole(), HISTORY_ROLE_LABELS, RESEARCH_CHECK_INSTRUCTIONS (+8 more)

### Community 123 - "projectDisplay.ts"
Cohesion: 0.38
Nodes (4): formatCommitTimeout(), TimeoutUnit, timeoutUnitMs(), timeoutUnitOf()

### Community 124 - "useSavedFlash.ts"
Cohesion: 0.18
Nodes (9): AgentProvider, AgentSessionEvent, createCodexProvider(), AppServerFixtureOptions, hookPathForSession(), options(), RecordedRequest, waitFor() (+1 more)

### Community 126 - "TicketOperations"
Cohesion: 0.26
Nodes (15): AtelierPromptInput, Conversation, ConversationMessage, ConversationPanelProps, byCreatedAt(), byRevision(), ConversationDetailView, DetailState (+7 more)

### Community 127 - "TerminalSessionManager"
Cohesion: 0.13
Nodes (16): nonEmptyStringArray, stringArray, items, type, uniqueItems, minLength, pattern, type (+8 more)

### Community 129 - "terminalManager.ts"
Cohesion: 0.15
Nodes (13): CompactTicket, ListTicketsInput, Column, COLUMN_LABELS, columnSchema, BoardColumnProps, TerminalColumnsPanelProps, PrdOriginRowProps (+5 more)

### Community 130 - "prUrl.ts"
Cohesion: 0.28
Nodes (12): AskPanel(), ComposeState, NewConversationForm(), NewConversationFormProps, seedMessage(), NewTicketSheet(), NewTicketSheetProps, AtelierSeed (+4 more)

### Community 131 - ".handleMessage"
Cohesion: 0.29
Nodes (4): serializeErrorDetails(), runRecordedAction(), ExecutionRun, ExecutionUsageByModel

### Community 132 - "isProcessing"
Cohesion: 0.19
Nodes (10): renderCollapsedFinding(), verifiedFindings(), DEFAULT_FINDING_RENDER_STYLE, FindingRenderStyle, keptFindings(), finding(), FULL_REVIEW_KINDS, LIGHT_REVIEW_KINDS (+2 more)

### Community 133 - "store.ts"
Cohesion: 0.16
Nodes (12): wsClientEventSchema, ATTENTION_STATUSES, sessionOf(), SlotPips(), SlotPipsProps, STATUS_LABELS, STATUS_PIP_CLASSES, CommentListener (+4 more)

### Community 134 - "id"
Cohesion: 0.15
Nodes (14): additionalProperties, properties, required, type, axis, id, maxLength, pattern (+6 more)

### Community 135 - "transcriptBuffer.ts"
Cohesion: 0.26
Nodes (8): Block, blockText(), compactChunks(), firstCharCode(), TranscriptBuffer, trimBlockStart(), AgentStreamBlock, TranscriptUpdate

### Community 136 - "TerminalView.tsx"
Cohesion: 0.26
Nodes (9): applyTranscriptUpdate(), TranscriptState, transcriptText(), transcriptUpdateSchema, FullscreenToggle(), FullscreenToggleProps, TerminalData, TerminalView() (+1 more)

### Community 137 - "createAtelierRoutes"
Cohesion: 0.26
Nodes (3): mapConversationRow(), createAtelierRoutes(), PrdDocumentRecord

### Community 138 - "CardsPanel.tsx"
Cohesion: 0.21
Nodes (11): PRD_SPLIT_MODE_LABELS, PRD_SPLIT_MODES, PrdSplitMode, AtelierAgentFields(), AtelierAgentFieldsProps, candidatesFor(), CardCandidate, CardsPanel() (+3 more)

### Community 139 - "codexBinary.ts"
Cohesion: 0.21
Nodes (9): CodexBinaryVersionError, require, resolveCodexBinary(), resolveCodexBinaryOverride(), TARGETS, canonicalJson(), CodexCommandHook, codexSessionPreToolUseHookHash() (+1 more)

### Community 140 - "PrdPanel.tsx"
Cohesion: 0.24
Nodes (9): LiveDot(), draftOf(), EXPORT_LINK_CLASSES, PrdPanel(), PrdPanelProps, BusyAction, useBusyAction(), atelierPrdExportUrl() (+1 more)

### Community 141 - "usePrdSearch.ts"
Cohesion: 0.26
Nodes (9): isShortcutDetail(), ShortcutDetail, NOTE: Radix's dismissable layer registers its Escape listener on `document` in t, useCaptureEscape(), collectMatchRanges(), supportsHighlightApi(), usePrdSearch(), UsePrdSearchOptions (+1 more)

### Community 142 - "$defs"
Cohesion: 0.17
Nodes (12): pattern, type, $defs, axisId, requirement, task, additionalProperties, required (+4 more)

### Community 143 - "StageProgressBar.tsx"
Cohesion: 0.25
Nodes (10): FILLED_GLYPH_COLORS, StageProgressBar(), StageProgressBarProps, CardState, DEAD_STAGES, PROGRESS_STAGES, stageCardState(), stageLabel() (+2 more)

### Community 144 - "title"
Cohesion: 0.18
Nodes (11): source, ref, title, minLength, type, additionalProperties, properties, required (+3 more)

### Community 145 - "preDraft"
Cohesion: 0.18
Nodes (11): additionalProperties, properties, required, type, preDraft, reuse, sharedSurfaces, sourcePriority (+3 more)

### Community 147 - "notifications.ts"
Cohesion: 0.31
Nodes (9): active, ensureNotificationPermission(), getAudioContext(), isSupported(), loadSoundBuffer(), playBuffer(), playNotificationSound(), showDesktopNotification() (+1 more)

### Community 148 - "Profile"
Cohesion: 0.48
Nodes (3): mapProfileRow(), nullableBooleanValue(), Profile

### Community 149 - "SkillStatus"
Cohesion: 0.29
Nodes (4): fakeMissingKey(), SkillStatus, MissingSkill, SkillsStatusListProps

### Community 150 - "skills.ts"
Cohesion: 0.29
Nodes (6): HOST_SKILL_ROOTS, SKILL_REQUIREMENTS, SKILL_TIERS, SkillRequirement, SKILLS_CLI_AGENTS, SkillTier

### Community 151 - "prd.schema.json"
Cohesion: 0.29
Nodes (6): additionalProperties, $id, required, $schema, title, type

### Community 152 - "setup"
Cohesion: 0.53
Nodes (3): setup(), setup(), setup()

## Knowledge Gaps
- **918 isolated node(s):** `Goal`, `Persistence (SQLite, `src/server/db`)`, `Shared contract (`src/shared`)`, `Agent session (server)`, `Routes (`/api/atelier/...`, French errors, zod `safeParse`)` (+913 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Store` connect `.start` to `Feasibility Batch Management`, `Ticket Action Panels`, `.handleMessage`, `createAtelierRoutes`, `API Routes & Reformulate`, `Live Terminal Views`, `AgentMessage`, `Profile`, `Dev Dependencies`, `Client Hub & Watchdog`, `Cost & Pricing`, `NPM Scripts`, `Runtime Dependencies`, `API Client Inputs`, `Demo Pipeline Concepts`, `Session Hub Transcript`, `prUrl.ts`, `reviewFindings.ts`, `CodexRuntimeStatus`, `.handleRequest`, `usePrdSearch.ts`, `mcpSettings.ts`, `TerminalSessionManager`, `.addComment`, `RunningServer`, `TerminalSession`, `usePrdSearch.ts`, `projectDisplay.ts`, `repairPath.ts`, `ApiDenyPatterns`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Why does `Ticket` connect `NPM Scripts` to `Contract Building & Slots`, `terminalManager.ts`, `Ticket Action Panels`, `isProcessing`, `Shared Zod Schemas`, `store.ts`, `PR Selection & Slots Bar`, `Real System Adapter`, `CardsPanel.tsx`, `Core Domain Concepts`, `Slot Config & Worktree Watch`, `Database Store Operations`, `API Routes & Reformulate`, `StageProgressBar.tsx`, `Live Terminal Views`, `Dev Dependencies`, `Client Hub & Watchdog`, `Session Hub & Agent Session`, `Runtime Dependencies`, `API Client Inputs`, `Session Hub Transcript`, `Community 48`, `Slot State`, `repairPath.ts`, `CSV Parsing`, `triageManager.ts`, `schema.test.ts`, `reviewFindings.ts`, `CodexRuntimeStatus`, `useTickTimer.ts`, `mcpSettings.ts`, `TerminalSessionManager`, `.start`, `TerminalSession`, `useSavedFlash.ts`, `repairPath.ts`, `relaunch.ts`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Why does `FakeSystemAdapter` connect `Settings & Profiles UI` to `User Terminal & Fake IO`, `Ticket Action Panels`, `CodexRuntimeStatus`, `API Routes & Reformulate`, `repairPath.ts`, `SkillStatus`, `PaneStream`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **What connects `Goal`, `Persistence (SQLite, `src/server/db`)`, `Shared contract (`src/shared`)` to the rest of the system?**
  _930 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Contract Building & Slots` be split into smaller, more focused modules?**
  _Cohesion score 0.029258098223615466 - nodes in this community are weakly interconnected._
- **Should `Terminals UI & Notifications` be split into smaller, more focused modules?**
  _Cohesion score 0.06755260243632337 - nodes in this community are weakly interconnected._
- **Should `Desktop Bootstrap & Menus` be split into smaller, more focused modules?**
  _Cohesion score 0.11384615384615385 - nodes in this community are weakly interconnected._