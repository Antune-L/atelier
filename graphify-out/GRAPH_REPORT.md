# Graph Report - kanban-agents  (2026-10-03)

## Corpus Check
- 324 files · ~813,345 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 4165 nodes · 11391 edges · 141 communities (129 shown, 12 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 90 edges (avg confidence: 0.67)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f8d056f8`
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
- RunningServer
- usePrdSearch.ts
- reviewPublishingGuard.ts
- .startVerification
- codexProvider.test.ts
- prd.schema.json
- TerminalSession
- uploads.ts
- createMcpServer
- usePrdSearch.ts
- azureRemote.ts
- WorkflowView.tsx
- TicketMeta.tsx
- split.ts
- uploads.ts
- useSavedFlash.ts
- PreparedHook
- ApiDenyPatterns
- useSuppressEscapeBeep.ts
- settings.tsx
- runRecordedAction
- properties
- AgentMessage
- ProjectPanel.tsx
- VcsConnectionResult
- TicketOperationError
- StatCard.tsx
- useSavedFlash.ts
- AgentMessage
- TicketOperations
- TerminalSessionManager
- contract.test.ts
- WorkflowView.tsx
- .createTodoTicket
- useProjects.ts
- FakePaneStream
- .startReview
- id
- reformulate.ts
- isNotionUrl
- submitTriageArgsSchema
- $defs
- title
- preDraft

## God Nodes (most connected - your core abstractions)
1. `Store` - 176 edges
2. `Ticket` - 103 edges
3. `SystemAdapter` - 96 edges
4. `cn()` - 90 edges
5. `FakeSystemAdapter` - 85 edges
6. `createApiRoutes()` - 85 edges
7. `RealSystemAdapter` - 78 edges
8. `SlotManager` - 61 edges
9. `ProjectInfo` - 55 edges
10. `ClientHub` - 54 edges

## Surprising Connections (you probably didn't know these)
- `McpSettingsClient` --references--> `McpSettingsMetadata`  [EXTRACTED]
  src/web/src/lib/mcpSettings.ts → desktop/mcpRpc.ts
- `ValidationTab()` --indirect_call--> `delay()`  [INFERRED]
  src/web/src/components/ticket-detail/ValidationTab.tsx → src/server/system/fake.ts
- `main()` --calls--> `assertCodexDowngradeSafe()`  [EXTRACTED]
  scripts/downgrade-codex-catalog.ts → src/server/db/schema.ts
- `main()` --calls--> `migrateCodexCatalog()`  [EXTRACTED]
  scripts/downgrade-codex-catalog.ts → src/server/db/schema.ts
- `SubmittedTurn` --references--> `ConversationMessage`  [EXTRACTED]
  src/server/agents/atelierManager.ts → src/shared/schemas.ts

## Import Cycles
- None detected.

## Communities (141 total, 12 thin omitted)

### Community 0 - "Contract Building & Slots"
Cohesion: 0.02
Nodes (96): ActionExecutionOptions, actionExecutionOptionsSchema, AgentMessageChannel, agentMessageSchema, AnalyzeTicketsInput, appSettingsSchema, automationRunSchema, automationSchema (+88 more)

### Community 1 - "Terminals UI & Notifications"
Cohesion: 0.08
Nodes (28): analyzeTicketsInputSchema, analyzeTicketsOutputSchema, columnSchema, compactTicketSchema, createTodoTicketOutputSchema, editableTicketSchema, effectivePort(), isAllowedHost() (+20 more)

### Community 2 - "Desktop Bootstrap & Menus"
Cohesion: 0.07
Nodes (9): setup(), SessionHub, PendingSplit, SplitManager, TriageManager, ClientHub, PrNotificationMonitor, RouteDeps (+1 more)

### Community 3 - "Feasibility Batch Management"
Cohesion: 0.05
Nodes (85): AtelierPromptInput, Conversation, ConversationMessage, PrdDocumentRecord, PrNotification, PrNotificationSyncStatus, ProjectInfo, AgentCard() (+77 more)

### Community 4 - "Ticket Action Panels"
Cohesion: 0.12
Nodes (27): ExecutionFinishStatus, LiveSession, log, PendingSessionMessage, previewToolInput(), renderSessionEvent(), SessionExecutionContext, SessionExecutionFinish (+19 more)

### Community 5 - "Fake System Adapter"
Cohesion: 0.08
Nodes (27): hostnameFromSshConfig(), sshHostFromRemoteUrl(), fetchGithubOpenPrs(), ghAuthenticatedUserSchema, ghPrHeadSchema, ghPrSchema, ghPrStateSchema, ghRequestedPullPagesSchema (+19 more)

### Community 6 - "Shared Zod Schemas"
Cohesion: 0.17
Nodes (16): isCodexFastServiceTier(), summarizeSessionCosts(), totalTokensOfSessions(), ExecutionRun, executionCosts(), executionTokens(), projectStatRecord(), CostSummary() (+8 more)

### Community 7 - "Settings & Profiles UI"
Cohesion: 0.07
Nodes (4): delay(), fakeShellPrompt(), FakeSystemAdapter, hexToBytes()

### Community 8 - "PR Selection & Slots Bar"
Cohesion: 0.05
Nodes (59): main(), scalar(), CLAUDE_CONVERSATION, closers, CODEX_CONVERSATION, setup(), TEMPLATE_PATH, TURN_END (+51 more)

### Community 9 - "Real System Adapter"
Cohesion: 0.06
Nodes (37): AUTOMATION_RUN_STATUSES, AUTOMATION_TRIGGER_LABELS, AUTOMATION_TRIGGERS, AutomationRunStatus, AutomationTrigger, CODEX_EFFORT_LABELS, COMMENT_AUTHORS, CommentAuthor (+29 more)

### Community 10 - "Slot Config & Worktree Watch"
Cohesion: 0.09
Nodes (31): compileFeedback(), PrdAnnotation, prdAnnotationsSchema, FeedbackDraft, PrdAnnotator(), PrdAnnotatorProps, BREADCRUMB, NO_ANNOTATIONS (+23 more)

### Community 11 - "Core Domain Concepts"
Cohesion: 0.02
Nodes (73): agentMessageRowSchema, AutomationRow, automationRowSchema, AutomationRunRow, automationRunRowSchema, buildScripts(), CommentRow, commentRowSchema (+65 more)

### Community 12 - "Board & Sidebar Layout"
Cohesion: 0.15
Nodes (18): browserToolName(), preflightQualityBrowser(), QUALITY_BROWSER_TOOLS, QUALITY_DISABLED_BROWSER_TOOLS, QUALITY_OBSERVATION_TOOLS, QUALITY_REPOSITORY_TOOLS, qualityBrowserServer(), qualityCheckOutputExcerpts() (+10 more)

### Community 13 - "Database Store Operations"
Cohesion: 0.11
Nodes (30): RepoInspectionSource, RepoInspection, ConnectionHint, CreateStep, isPositiveIntegerString(), isValidDraft(), ProjectPanel(), TIMEOUT_UNITS (+22 more)

### Community 14 - "Coordinator & Protocol"
Cohesion: 0.12
Nodes (39): QualityRunStatus, TicketQuality, CREATOR_LABELS, CriteriaEditor(), HumanEvidenceEditor(), newCriterion(), QualityCriteriaPanel(), SOURCE_LABELS (+31 more)

### Community 15 - "API Routes & Reformulate"
Cohesion: 0.08
Nodes (27): ActionSystem, bashCommandSchema, buildSettings(), createSdkAgentSession(), denyBashHook(), denyNoVerifyHook, denyReviewPublishingHook, denyTypecheckHook() (+19 more)

### Community 16 - "Stats Aggregation"
Cohesion: 0.12
Nodes (3): startParentSession(), SessionHubHandlers, SessionStartCallbacks

### Community 17 - "Triage & Server Hub"
Cohesion: 0.08
Nodes (25): devDependencies, autoprefixer, class-variance-authority, clsx, concurrently, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities (+17 more)

### Community 18 - "Live Terminal Views"
Cohesion: 0.07
Nodes (39): ATELIER_WEB_TOOLS, AZURE_BASH_ALLOWLIST, AZURE_CLEAN_BASH_ALLOWLIST, BASH_ALLOWLIST, bashAllowlist(), buildFeasibilitySessionConfig(), buildImplementSessionConfig(), buildSplitSessionConfig() (+31 more)

### Community 19 - "Stage Progress & Display"
Cohesion: 0.08
Nodes (24): compilerOptions, allowImportingTsExtensions, baseUrl, esModuleInterop, isolatedModules, jsx, lib, module (+16 more)

### Community 20 - "Real Adapter GH/Composer"
Cohesion: 0.09
Nodes (32): FAILURE_COLUMNS, Kind, KINDS, SUCCESS_COLUMNS, DurationChart(), OutcomeChart(), SuccessRateChart(), ThroughputChart() (+24 more)

### Community 21 - "Store Types & Agent Knobs"
Cohesion: 0.08
Nodes (83): agent_context_html(), agent_entry_count(), axes_html(), axis_anchor(), axis_head_html(), axis_items(), axis_section_html(), axis_statuses() (+75 more)

### Community 22 - "DB Row Schemas & Mappers"
Cohesion: 0.07
Nodes (29): AgentSettableStage, agentSettableStageSchema, askUserArgsSchema, AssertNamesCovered, channelEventSchema, delegateImplementationArgsSchema, delegateReviewArgsSchema, doneArgsSchema (+21 more)

### Community 23 - "Dev Dependencies"
Cohesion: 0.05
Nodes (72): AssistantPart, AtelierManagerDeps, ConversationRuntime, describeToolUse(), log, SubmittedTurn, TOOL_DETAIL_KEYS, toolInputSchema (+64 more)

### Community 24 - "TypeScript Config"
Cohesion: 0.09
Nodes (31): Comment, ActivityTab(), ActivityTabProps, isUnanswered(), NO_COMMENT_COLUMNS, AUTHOR_BADGES, AuthorBadge(), CommentRow() (+23 more)

### Community 26 - "Cost & Pricing"
Cohesion: 0.14
Nodes (7): buildAtelierConsolidateTurn(), ACTIVITY_PROGRESS_KINDS, AtelierManager, emptyTurn(), labelWithNote(), atelierSessionKey(), buildAtelierSessionConfig()

### Community 27 - "Workflow View & Lifecycle"
Cohesion: 0.05
Nodes (32): Architecture, Commands, Conventions (enforced — beyond the global ones in ~/.claude/CLAUDE.md), graphify, The dry-run safety model — read before running anything, What this is, Agent runtime, Architecture (+24 more)

### Community 28 - "Stats Charts"
Cohesion: 0.05
Nodes (46): codexCommandPolicyScript(), agentMessageDeltaSchema, agentToml(), apiWriteDenyScript(), buildMcpServers(), CodexProviderDependencies, ConfigObject, configReadResponseSchema (+38 more)

### Community 29 - "Session Hub & Agent Session"
Cohesion: 0.11
Nodes (24): buildAtelierPrompt(), buildAtelierRegenerationTurn(), buildAuthoringRules(), buildFraming(), buildHistory(), buildResearch(), buildRole(), HISTORY_ROLE_LABELS (+16 more)

### Community 30 - "Agents View & Ticket Cards"
Cohesion: 0.06
Nodes (53): ACTIVE_STAGES, ORCHESTRATOR_LABELS, columnSchema, ColumnActionsMenu(), ColumnActionsMenuProps, ColumnMenuItem, FILLED_GLYPH_COLORS, StageProgressBar() (+45 more)

### Community 31 - "PRD Review & Markdown"
Cohesion: 0.06
Nodes (57): ActiveReviewPass, BOARD_FINDING_RENDER_STYLE, log, renderCollapsedFinding(), renderFinding(), REVIEW_DISALLOWED_TOOLS, REVIEW_REPORT_LABELS, REVIEW_REPORT_LABELS_EN (+49 more)

### Community 32 - "User Terminal & Fake IO"
Cohesion: 0.15
Nodes (7): orderedReviewKinds(), renderPersistedReviewResult(), allowedReviewPasses(), requiredReviewKinds(), renderChannelEvent(), renderImplementationDone(), parsePersistedReviewFindings()

### Community 33 - "Logging"
Cohesion: 0.10
Nodes (21): scripts, build:desktop, build:web, dev, dev:desktop, dev:proxy, dev:server, dev:web (+13 more)

### Community 34 - "Board Columns"
Cohesion: 0.14
Nodes (22): AppliedPath, copyDependencies(), copyPath(), DelegationWorkspace, ensureParentDirectory(), FileState, git(), installStagedPath() (+14 more)

### Community 35 - "NPM Scripts"
Cohesion: 0.12
Nodes (13): addUsageByModel(), toUsageByModel(), TicketLifecycle, TicketOperationsDeps, Stage, TERMINAL_STAGES, ErrorDetails, ErrorDetailsSource (+5 more)

### Community 36 - "Runtime Dependencies"
Cohesion: 0.09
Nodes (23): ARTIFACT_CONTENT_TYPES, createQualityRoutes(), QualityRouteDeps, manualQualityEvidenceSchema, nonEmptyTextSchema, projectValidationSchema, QualityCriteriaSnapshot, qualityCriteriaSnapshotSchema (+15 more)

### Community 37 - "Claude SDK Provider"
Cohesion: 0.09
Nodes (22): dependencies, @anthropic-ai/claude-agent-sdk, dompurify, elysia, @fontsource/ibm-plex-mono, @fontsource/ibm-plex-sans, marked, @modelcontextprotocol/sdk (+14 more)

### Community 38 - "Agent Profile Config"
Cohesion: 0.14
Nodes (17): costByFamily(), costOf(), costOfModel(), costOfSessions(), CostSummary, FamilyPricing, MODEL_PRICING, ModelFamily (+9 more)

### Community 39 - "Agent Coordinator Handlers"
Cohesion: 0.10
Nodes (29): artifactPath, assertPackageVersionInSync(), assertSdkVersionsInSync(), BUILT_DMG, ELECTROBUN_BIN, fail(), installedPackageVersion(), RELEASE_FOLDER (+21 more)

### Community 40 - "API Client Inputs"
Cohesion: 0.12
Nodes (6): childTranscriptPrefix(), DelegationManager, implementationScopesOverlap(), normalizeImplementationScope(), reviewKey(), mergeAgentUsageByModel()

### Community 41 - "Ticket Config & Constants"
Cohesion: 0.06
Nodes (89): ExecutionOverrides, pairedRuntimeCodexEffort(), AgentEffort, AgentModel, CodexEffort, CodexModel, FEASIBILITY_ENGINES, FeasibilityEngine (+81 more)

### Community 42 - "Ticket Detail & Triage UI"
Cohesion: 0.24
Nodes (7): CapabilityCache, CodexRuntimeModel, codexRuntimeModelSchema, CodexRuntimeStatus, codexRuntimeStatusSchema, UNKNOWN_CODEX_RUNTIME_STATUS, runtime

### Community 43 - "Demo Pipeline Concepts"
Cohesion: 0.11
Nodes (9): PaneStream, dataMessage(), normalizeSeed(), safeParse(), send(), TerminalSession, TerminalSessionManager, visibleText() (+1 more)

### Community 44 - "Chart Primitives"
Cohesion: 0.31
Nodes (13): abortReason(), computeCodeFingerprint(), FingerprintEntry, FingerprintPhase, hashFingerprintPaths(), isMissingFileError(), listFingerprintPaths(), log (+5 more)

### Community 45 - "Session Hub Transcript"
Cohesion: 0.22
Nodes (18): AGENT_EFFORT_FULL_LABELS, AGENT_MODEL_FULL_LABELS, CODEX_EFFORT_FULL_LABELS, CODEX_MODEL_LABELS, ProfilePipeline(), buildProfilePipeline(), claudeDetail(), claudeSubagentDetail() (+10 more)

### Community 46 - "Community 46"
Cohesion: 0.27
Nodes (15): Agent Implementation Config, Argus Code Review, Automated Tests (typecheck/lint/test), Claude Code Autonomous Agent, Ticket Contract Injection, Feasibility Analysis, Kanban Board (Atelier), Kanban Agents Demo (demo.gif) (+7 more)

### Community 47 - "Modal Dialogs"
Cohesion: 0.16
Nodes (29): buildAskContract(), buildCleanContract(), buildConflictResolutionContract(), buildFeasibilityBatchContract(), buildFeasibilityContextSection(), buildImplementingSteps(), buildMockupReviewStep(), buildPlanningStep() (+21 more)

### Community 48 - "Community 48"
Cohesion: 0.09
Nodes (19): NewTicket, TicketCreationRequestConflictError, AnalyzeTicketRejectionReason, AnalyzeTicketsResult, CreateTodoTicketInput, createTodoTicketInputSchema, CreateTodoTicketResult, log (+11 more)

### Community 50 - "Stats Hooks & Cards"
Cohesion: 0.10
Nodes (15): FailedReformulation, dryRunLog, fakeEncoder, fakeMissingKey(), NOTE: same dry-run stance as checkClaudeAvailable: every skill reported installe, GitWorktreeAddOptions, PaneSize, ReformulateOptions (+7 more)

### Community 51 - "Community 51"
Cohesion: 0.06
Nodes (7): realpathSafe(), RealSystemAdapter, DoneGateResult, PrepareReviewWorktreeOptions, PublishReviewResult, ReviewDoneOptions, ReviewHeadResult

### Community 52 - "repairPath.ts"
Cohesion: 0.06
Nodes (36): Block, blockText(), compactChunks(), firstCharCode(), TranscriptBuffer, trimBlockStart(), AgentStreamBlock, terminalServerMessageSchema (+28 more)

### Community 53 - "User Terminal Manager"
Cohesion: 0.33
Nodes (5): CONTEXT — domain glossary, Execution, Proposed (not yet built), Seams, Work items

### Community 54 - "Community 54"
Cohesion: 0.09
Nodes (15): CapturingSystem, AckSystem, ActiveDelegation, ActiveReview, ClosableExecution, RecordedSession, RecordingSystem, RecordedSession (+7 more)

### Community 55 - "App.tsx"
Cohesion: 0.17
Nodes (3): FeasibilityBatchManager, toTriageResult(), FeasibilityResult

### Community 56 - "CSV Parsing"
Cohesion: 0.05
Nodes (33): Watchdog, log, runFirstBootSetup(), listProjectKeys(), projectConfigSchema, ClientSocket, PROJECT_ROOT, NOTE: PRD generation holds the request open up to ~120s (REFORMULATE_TIMEOUT_MS) (+25 more)

### Community 57 - "Community 57"
Cohesion: 0.13
Nodes (8): RecordingSystemAdapter, withJsonRequestFile(), PublishReviewOptions, ReviewPublicationState, GithubVcsClient, pullApiEndpoint(), rightSideDiffLines(), ReviewPublicationCheck

### Community 58 - "File Uploads"
Cohesion: 0.16
Nodes (12): ChartConfig, ChartContainer, ChartContainerProps, ChartContext, ChartContextValue, ChartLegendContent(), ChartLegendContentProps, ChartTooltipContent() (+4 more)

### Community 59 - "triageManager.ts"
Cohesion: 0.23
Nodes (16): buildContractConstraintsLines(), buildResponseFormatLines(), buildStrictRulesLines(), buildTicketLines(), buildTriageChannelPrompt(), buildTriagePlusChannelPrompt(), isEnglish(), readOnlyFramingLines() (+8 more)

### Community 61 - "splitManager.ts"
Cohesion: 0.40
Nodes (4): PR review counting and publication correction state, Progress, Scope and decisions, Verification

### Community 62 - "TicketCard.tsx"
Cohesion: 0.07
Nodes (27): claudeProvider, AGENTS_SKILLS_DIR, CLAUDE_JSON_PATH, CLAUDE_SKILLS_DIR, commandOutputOrNull(), COMPOSER_BINARIES, DEFAULT_CODEX_HOME, detectInstallCommand() (+19 more)

### Community 63 - "Community 63"
Cohesion: 0.18
Nodes (17): COLUMN_SORT_FIELD, BoardColumn(), compareFamilyMembers(), familyKeyOf(), groupTicketIds(), groupTicketsByFamily(), isSplitMother(), readCollapsed() (+9 more)

### Community 64 - "Composer Run Script"
Cohesion: 0.07
Nodes (48): orderSelectedTasks(), prdCardDrafts(), axisIdSchema, DUPLICATE_ITEMS_ISSUE, hasDuplicates(), identifierSchema, isUnique(), nonEmptyTextArraySchema (+40 more)

### Community 65 - "split.ts"
Cohesion: 0.40
Nodes (10): azureOrgUrl(), fromAzureSegments(), fromCollectionSegments(), fromLegacySegments(), fromSshSegments(), parseAzureRepoRef(), parseRemoteLocation(), RemoteLocation (+2 more)

### Community 66 - "prUrl.ts"
Cohesion: 0.09
Nodes (16): ImplementSessionInput, AZURE_COMMANDS, COMMANDS_BY_PROVIDER, GITHUB_COMMANDS, PrDiffContext, VcsCleanCommands, VcsCommandTable, AZ_SETTLED_THREAD_STATUSES (+8 more)

### Community 67 - "TerminalView.tsx"
Cohesion: 0.07
Nodes (21): Slot, WsClientEvent, ATTENTION_STATUSES, sessionOf(), SlotPips(), SlotPipsProps, STATUS_LABELS, STATUS_PIP_CLASSES (+13 more)

### Community 68 - "schema.test.ts"
Cohesion: 0.10
Nodes (40): ManagedProject, ProjectPrPickerProps, dragKeys(), groupCountLabel(), groupSortId(), ListGroup, ProjectList(), ProjectListProps (+32 more)

### Community 69 - "reviewFindings.ts"
Cohesion: 0.12
Nodes (23): prepareQualityCriteria(), PrepareQualityCriteriaOptions, QUALITY_CONTEXT_FILES, repositoryContext(), QUALITY_NATIVE_DENIED_TOOLS, qualityErrorMessage(), QualityObservation, QualitySessionOptions (+15 more)

### Community 70 - "CodexRuntimeStatus"
Cohesion: 0.11
Nodes (19): AGENT_EFFORT_LABELS, AGENT_MODEL_LABELS, AutomationCard(), AutomationCardProps, AutomationFormProps, AutomationView(), EMPTY_FORM, formFromAutomation() (+11 more)

### Community 71 - "PostCSS Config"
Cohesion: 0.29
Nodes (6): name, overrides, zod, private, type, version

### Community 72 - ".publishReviewUnderRepoLock"
Cohesion: 0.07
Nodes (32): escapeHtml(), renderCollapsedDetails(), renderOutsideDiffComment(), renderOutsideDiffSection(), ReviewPublicationComment, azureChangeEntrySchema, azureCommentSchema, azureCurrentIdentitySchema (+24 more)

### Community 73 - "TerminalView.tsx"
Cohesion: 0.07
Nodes (55): RFC-4180, AskPanel(), AtelierAgentFields(), buildThread(), ConversationPanel(), researchSummary(), ThreadItem, LiveDot() (+47 more)

### Community 74 - "button.tsx"
Cohesion: 0.07
Nodes (39): ORCHESTRATORS, SkillStatus, availableSkillProviders(), expectedSkillPaths(), HOST_SKILL_ROOTS, missingSkillProviders(), SKILL_REQUIREMENTS, SKILL_TIERS (+31 more)

### Community 75 - ".handleRequest"
Cohesion: 0.11
Nodes (14): analyzeResultSchema, compactTicketSchema, createResultSchema, errorResultSchema, ISOLATED_ENV_KEYS, projectResultSchema, savedEnv, startResultSchema (+6 more)

### Community 76 - "usePrdSearch.ts"
Cohesion: 0.26
Nodes (8): PROJECT_ROOT, PrdRenderError, RENDERER_RELATIVE_PATH, renderPrdHtml(), RenderPrdHtmlInput, resolvePrdRendererPath(), TEMPLATE_PATH, PrdDocument

### Community 78 - "csv.ts"
Cohesion: 0.07
Nodes (10): FAKE_OPEN_PRS, FakeVcsClient, extractPrUrl(), githubPrHeadRef(), CreatePrResult, VcsClient, isPrNeedsAttention(), OpenPr (+2 more)

### Community 79 - "WorktreeSession"
Cohesion: 0.33
Nodes (3): listeners, mcp, ReplyArgsSchema

### Community 80 - "recordedAction.ts"
Cohesion: 0.23
Nodes (17): alternation(), COMMAND_WRAPPERS, commandSegments(), commandWords(), executableName(), launchedPackageScript(), launchesTypecheck(), OPTIONS_WITH_VALUE (+9 more)

### Community 81 - "index.ts"
Cohesion: 0.17
Nodes (17): ensureConfig(), boot(), externalUrlFromNewWindowEvent(), forwardAtelierShortcut(), installApplicationMenu(), installMenuShortcutBridge(), menuShortcutActionSchema, navigationEventSchema (+9 more)

### Community 82 - ".getReviewPass"
Cohesion: 0.12
Nodes (11): defaultProjectLookup(), groupFeasibilityTickets(), slotPath(), computeWorktreeAddresses(), getProject(), isProjectKey(), projectVcsProvider(), requireStore() (+3 more)

### Community 86 - "vcsCommands.ts"
Cohesion: 0.11
Nodes (20): ActiveQualityRun, CHECK_RUNNERS, CheckCommand, commandSucceeded(), configFingerprint(), DATABASE_ISOLATION_PLACEHOLDERS, databaseIsolationProblem(), environmentFor() (+12 more)

### Community 87 - "atelier.ts"
Cohesion: 0.14
Nodes (6): resolveBaseBranch(), resolveTemplatePaths(), TemplatePaths, getErrorMessage(), getErrorStack(), TriageResult

### Community 89 - "usePrdSearch.ts"
Cohesion: 0.13
Nodes (19): ACTIVE_BAR, AREA_CURSOR, AXIS_PROPS, BAR_CURSOR, CHART_PALETTE, CodexTierSummary(), colorAt(), DurationBars() (+11 more)

### Community 90 - "Profile"
Cohesion: 0.38
Nodes (6): featureBranch(), slugify(), createSplitChildren(), failSplitMother(), performSplit(), splitMotherBranch()

### Community 91 - "createCodexAgentSession"
Cohesion: 0.09
Nodes (22): Activation and retest, Baseline evidence and future acceptance needs, Behavior observed at the base revision, Capability and provider matrix, Checks and evidence, Criteria, providers, and delivery, Current implementation state — 2026-10-03, Earlier design and feasibility history (+14 more)

### Community 92 - "TerminalSessionManager"
Cohesion: 0.12
Nodes (15): 1. Register the associated repositories once, 2. Prepare the common isolated workspace, 3. Plan automatically, then implement, 4. Start the application from its instructions, 5. Validate and repair in the retained workspace, 6. Deliver one feature result, End-to-end flow, First acceptance scenarios (+7 more)

### Community 93 - "ColumnActionsMenu.tsx"
Cohesion: 0.25
Nodes (7): Azure DevOps support — state file, Decisions (validated by the owner, 2026-09-21), Goal, Known blockers for lots 3 and 4, Open questions, Progress, Verified on this machine (az 2.90.0, azure-devops 1.0.8)

### Community 94 - ".addComment"
Cohesion: 0.06
Nodes (34): formatPrdDocumentIssues(), log, logRejection(), ToolHandler, ToolResult, AttachExecutionSessionInput, AutomationPatch, EnqueueAgentMessageInput (+26 more)

### Community 95 - "TicketConfigSummary.tsx"
Cohesion: 0.50
Nodes (3): appBundle, EMBEDDED_BINARIES, resourcesApp

### Community 97 - "RunningServer"
Cohesion: 0.15
Nodes (18): buildRepoInspection(), formatProjectLabel(), LOCKFILE_NAMES, LOCKFILE_RUNNERS, PackageManifest, packageManifestSchema, PROVIDER_HOST_MARKERS, RepoFacts (+10 more)

### Community 98 - "usePrdSearch.ts"
Cohesion: 0.11
Nodes (19): boundedCommandDetail(), runBoundedCommand(), safeJsonParse(), ReviewPublicationEvent, AzureDevopsVcsClient, azurePath(), completionComment(), completionMarker() (+11 more)

### Community 99 - "reviewPublishingGuard.ts"
Cohesion: 0.07
Nodes (35): API_GUARDS, API_READ_METHOD_SET, ApiDenyPatterns, ApiGuard, AZ_INVOKE_COMMAND, AZ_INVOKE_METHOD_LONG_FLAGS, AZ_INVOKE_WRITE_INPUT_LONG_FLAGS, AZ_PR_WRITE_PATTERN (+27 more)

### Community 100 - ".startVerification"
Cohesion: 0.08
Nodes (25): $ref, $ref, enum, $ref, $ref, properties, designConsiderations, goals (+17 more)

### Community 101 - "codexProvider.test.ts"
Cohesion: 0.18
Nodes (11): accountResponseSchema, hasExplicitCodexApiKey(), isProtocolIncompatibility(), listRuntimeModels(), modelListResponseSchema, modelSchema, probeCodexRuntime(), status() (+3 more)

### Community 102 - "prd.schema.json"
Cohesion: 0.16
Nodes (13): CompactTicket, ListTicketsInput, Column, COLUMN_LABELS, BoardColumnProps, DEFAULT_OPEN, NOTE: an expanded column already owns the droppable id through its lane; registe, TerminalColumnsPanel() (+5 more)

### Community 103 - "TerminalSession"
Cohesion: 0.24
Nodes (12): COLUMN_ORDER, COLUMNS, ACTIVE_COLUMNS, Board(), BoardProps, isColumn(), isLocked(), normalize() (+4 more)

### Community 104 - "uploads.ts"
Cohesion: 0.13
Nodes (22): PendingRequest, agentBaseEnv(), bestInstalledMatch(), compareParts(), envWithProjectNode(), nvmNodeBinDir(), readNvmrc(), prepareProjectShell() (+14 more)

### Community 105 - "createMcpServer"
Cohesion: 0.09
Nodes (23): $ref, $ref, $ref, minLength, type, minLength, type, enum (+15 more)

### Community 106 - "usePrdSearch.ts"
Cohesion: 0.06
Nodes (23): SessionToolCall, appendToLogFile(), disableFileLogging(), initLogFile(), Logger, openLogStream(), paint(), rotateLogFile() (+15 more)

### Community 107 - "azureRemote.ts"
Cohesion: 0.26
Nodes (4): BoundedCommandResult, connectionFailure(), connectionResult(), VcsConnectionResult

### Community 108 - "WorkflowView.tsx"
Cohesion: 0.09
Nodes (22): axes, designConsiderations, goals, id, locale, openQuestions, outOfScope, preDraft (+14 more)

### Community 109 - "TicketMeta.tsx"
Cohesion: 0.22
Nodes (8): AtelierDesktopRpcSchema, DesktopRequests, McpSettingsMetadata, WebviewRequests, McpSettingsController, createMcpSettingsClient(), getMcpSettingsClient(), McpSettingsClient

### Community 110 - "split.ts"
Cohesion: 0.22
Nodes (4): McpTokenSource, createMcpSettingsController(), McpSettingsControllerDependencies, temporaryDirectories

### Community 111 - "uploads.ts"
Cohesion: 0.16
Nodes (5): CodexAppServerConnection, CodexAppServerNotification, CodexAppServerOptions, AppServerFixture, CodexRuntimeDependencies

### Community 112 - "useSavedFlash.ts"
Cohesion: 0.36
Nodes (9): getSnapshot(), INITIAL_SNAPSHOT, loadReviewCounts(), publish(), refreshReviewCounts(), reviewIdentity(), startRefreshing(), subscribe() (+1 more)

### Community 113 - "PreparedHook"
Cohesion: 0.29
Nodes (10): AppearanceSettings(), useTheme(), UseThemeResult, applyTheme(), getStoredTheme(), isTheme(), Theme, ThemeOption (+2 more)

### Community 114 - "ApiDenyPatterns"
Cohesion: 0.04
Nodes (20): nullableBooleanValue(), serializeErrorDetails(), SqlUpdateBuilder, Store, runRecordedAction(), attachment(), conversationTitle(), createApiRoutes() (+12 more)

### Community 115 - "useSuppressEscapeBeep.ts"
Cohesion: 0.29
Nodes (6): additionalProperties, $id, required, $schema, title, type

### Community 116 - "settings.tsx"
Cohesion: 0.04
Nodes (58): COMMIT_LANGUAGES, ProfileConfig, AppSettings, Profile, UpdateAppSettingsInput, DragHandleAttributes, DragHandleListeners, ProfileRowHeader() (+50 more)

### Community 118 - "properties"
Cohesion: 0.46
Nodes (5): buildSplitChannelPrompt(), buildTicketLines(), isEnglish(), extractFigmaUrls(), hasMockups()

### Community 119 - "AgentMessage"
Cohesion: 0.11
Nodes (19): items, maxItems, minItems, type, uniqueItems, $ref, axes, requirements (+11 more)

### Community 120 - "ProjectPanel.tsx"
Cohesion: 0.11
Nodes (17): Agent session (server), Architecture decisions, Atelier (conversation → PRD → cards) — implementation state, Contract injection, Follow-ups noticed in Lot A, Goal, Lot A public API (use these names in Lots B and C), Lot B public surface and deviations (read before Lot C/D) (+9 more)

### Community 121 - "VcsConnectionResult"
Cohesion: 0.11
Nodes (17): CodexAppServerInitializationError, CodexAppServerProtocolError, connectCodexAppServer(), incomingSchema, initializeResponseSchema, log, rpcErrorSchema, spawnCodexAppServer() (+9 more)

### Community 123 - "StatCard.tsx"
Cohesion: 0.40
Nodes (5): StatRecord, StatCard(), StatCardProps, StatEmpty(), UseStatsResult

### Community 124 - "useSavedFlash.ts"
Cohesion: 0.13
Nodes (10): CodexAppServerRpcError, canonicalJson(), CodexCommandHook, codexSessionPreToolUseHookHash(), JsonValue, createCodexProvider(), AppServerFixtureOptions, hookPathForSession() (+2 more)

### Community 125 - "AgentMessage"
Cohesion: 0.36
Nodes (5): applyDesktopEnv(), DesktopRoots, ensureMcpToken(), regenerateMcpToken(), temporaryDirectories

### Community 126 - "TicketOperations"
Cohesion: 0.18
Nodes (3): SlotManager, QualityGate, NotificationSoundKind

### Community 127 - "TerminalSessionManager"
Cohesion: 0.13
Nodes (16): nonEmptyStringArray, stringArray, items, type, uniqueItems, minLength, pattern, type (+8 more)

### Community 128 - "contract.test.ts"
Cohesion: 0.04
Nodes (50): buildNotionImportPrompt(), ProjectInUseError, agentPairError(), cleanDescription(), CONVERSATION_STATUS_FOR_PRD, jsonError(), log, PrdCardDraft (+42 more)

### Community 129 - "WorkflowView.tsx"
Cohesion: 0.47
Nodes (5): COLUMN_NODE_COLOR, depthOf(), truncate(), WorkflowView(), WorkflowViewProps

### Community 130 - ".createTodoTicket"
Cohesion: 0.15
Nodes (11): createMcpServer(), invalidInput(), listPublicProjects(), OutputValidator, toolError(), toolResult(), FeasibilityStarter, isActive() (+3 more)

### Community 131 - "useProjects.ts"
Cohesion: 0.07
Nodes (36): App(), HOME_VIEW_OPTIONS, HomeView, ReviewCountBadge(), NAV_ENTRIES, NavEntry, Sidebar(), SidebarProps (+28 more)

### Community 133 - ".startReview"
Cohesion: 0.67
Nodes (3): sleep(), startAndApproveReviews(), submitReviews()

### Community 134 - "id"
Cohesion: 0.15
Nodes (14): additionalProperties, properties, required, type, axis, id, maxLength, pattern (+6 more)

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
- **1048 isolated node(s):** `Permission refusals are specific to a command and session`, `Two agent providers: implement every host integration for both`, `Azure reviewer response nullability`, `Disposable quality verification`, `Current implementation state — 2026-10-03` (+1043 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **12 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Ticket` connect `NPM Scripts` to `contract.test.ts`, `Contract Building & Slots`, `WorkflowView.tsx`, `useProjects.ts`, `Feasibility Batch Management`, `.startReview`, `Shared Zod Schemas`, `reformulate.ts`, `PR Selection & Slots Bar`, `Real System Adapter`, `Core Domain Concepts`, `Live Terminal Views`, `Dev Dependencies`, `TypeScript Config`, `Client Hub & Watchdog`, `Agents View & Ticket Cards`, `PRD Review & Markdown`, `API Client Inputs`, `Ticket Config & Constants`, `Community 48`, `Slot State`, `Community 54`, `triageManager.ts`, `Community 63`, `prUrl.ts`, `TerminalView.tsx`, `CodexRuntimeStatus`, `TerminalView.tsx`, `.getReviewPass`, `atelier.ts`, `prd.schema.json`, `TerminalSession`, `properties`, `TicketOperations`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **Why does `Store` connect `ApiDenyPatterns` to `contract.test.ts`, `Desktop Bootstrap & Menus`, `PR Selection & Slots Bar`, `Coordinator & Protocol`, `Dev Dependencies`, `Client Hub & Watchdog`, `Cost & Pricing`, `PRD Review & Markdown`, `User Terminal & Fake IO`, `NPM Scripts`, `Runtime Dependencies`, `API Client Inputs`, `Modal Dialogs`, `Community 48`, `CSV Parsing`, `Package Manifest`, `.getReviewPass`, `vcsCommands.ts`, `atelier.ts`, `.addComment`, `TicketOperations`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **Why does `SystemAdapter` connect `Slot State` to `Desktop Bootstrap & Menus`, `TicketOperations`, `Ticket Action Panels`, `Settings & Profiles UI`, `API Client Inputs`, `Demo Pipeline Concepts`, `Stats Hooks & Cards`, `Community 51`, `.getReviewPass`, `vcsCommands.ts`, `Dev Dependencies`, `CSV Parsing`, `Cost & Pricing`, `Package Manifest`, `TicketCard.tsx`, `PRD Review & Markdown`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **What connects `Permission refusals are specific to a command and session`, `Two agent providers: implement every host integration for both`, `Azure reviewer response nullability` to the rest of the system?**
  _1060 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Contract Building & Slots` be split into smaller, more focused modules?**
  _Cohesion score 0.020820449391877962 - nodes in this community are weakly interconnected._
- **Should `Terminals UI & Notifications` be split into smaller, more focused modules?**
  _Cohesion score 0.08266129032258064 - nodes in this community are weakly interconnected._
- **Should `Desktop Bootstrap & Menus` be split into smaller, more focused modules?**
  _Cohesion score 0.07317073170731707 - nodes in this community are weakly interconnected._