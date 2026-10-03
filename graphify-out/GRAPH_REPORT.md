# Graph Report - kanban-agents  (2026-10-03)

## Corpus Check
- 326 files · ~824,318 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 4229 nodes · 12533 edges · 145 communities (133 shown, 12 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 106 edges (avg confidence: 0.69)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `aaa9f653`
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
- AutomationView.tsx
- reviewFindings.ts
- CodexRuntimeStatus
- PostCSS Config
- .publishReviewUnderRepoLock
- TerminalView.tsx
- button.tsx
- .handleRequest
- atelierManager.test.ts
- Community 77
- statistics.ts
- WorktreeSession
- recordedAction.ts
- index.ts
- .getReviewPass
- Community 83
- vcsCommands.ts
- atelier.ts
- createMcpServer
- Profile
- createCodexAgentSession
- TerminalSessionManager
- ColumnActionsMenu.tsx
- .addComment
- TicketConfigSummary.tsx
- useTickTimer.ts
- ProjectList.tsx
- usePrdSearch.ts
- reviewPublishingGuard.ts
- .startVerification
- runRecordedAction
- delegationManager.test.ts
- useAppSettings.ts
- mcpSettings.ts
- createMcpServer
- usePrdSearch.ts
- CodexAppServerConnection
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
- prepareNoVerifyHook
- theme.ts
- useReviewCounts.ts
- TicketOperations
- TerminalSessionManager
- contract.test.ts
- useConversationDetail.ts
- performSplit
- recordOutcome
- RealPaneStream
- PublishReviewOptions
- id
- projectDisplay.ts
- reformulate.ts
- CodexProviderDependencies
- createCodexAgentSession
- isNotionUrl
- isProcessing
- ValidationSkeleton.tsx
- $defs
- title
- preDraft

## God Nodes (most connected - your core abstractions)
1. `Store` - 182 edges
2. `Ticket` - 126 edges
3. `SystemAdapter` - 96 edges
4. `cn()` - 92 edges
5. `createApiRoutes()` - 88 edges
6. `FakeSystemAdapter` - 85 edges
7. `RealSystemAdapter` - 81 edges
8. `SlotManager` - 71 edges
9. `getErrorMessage()` - 67 edges
10. `Orchestrator` - 61 edges

## Surprising Connections (you probably didn't know these)
- `McpSettingsClient` --references--> `McpSettingsMetadata`  [EXTRACTED]
  src/web/src/lib/mcpSettings.ts → desktop/mcpRpc.ts
- `main()` --calls--> `assertCodexDowngradeSafe()`  [EXTRACTED]
  scripts/downgrade-codex-catalog.ts → src/server/db/schema.ts
- `main()` --calls--> `migrateCodexCatalog()`  [EXTRACTED]
  scripts/downgrade-codex-catalog.ts → src/server/db/schema.ts
- `SubmittedTurn` --references--> `ConversationMessage`  [EXTRACTED]
  src/server/agents/atelierManager.ts → src/shared/schemas.ts
- `RecordedSession` --references--> `AgentSessionOptions`  [EXTRACTED]
  src/server/agents/delegationManager.test.ts → src/server/system/agentSession.ts

## Import Cycles
- 3-file cycle: `src/server/config.ts -> src/server/db/store.ts -> src/server/db/rows.ts -> src/server/config.ts`
- 3-file cycle: `src/server/agents/worktreeAddresses.ts -> src/server/config.ts -> src/server/db/store.ts -> src/server/agents/worktreeAddresses.ts`

## Communities (145 total, 12 thin omitted)

### Community 0 - "Contract Building & Slots"
Cohesion: 0.02
Nodes (132): buildNotionImportPrompt(), ProjectInUseError, CONVERSATION_STATUS_FOR_PRD, log, PrdCardDraft, splitChildDefaults(), AUTOMATION_RUN_STATUSES, COMMENT_AUTHORS (+124 more)

### Community 1 - "Terminals UI & Notifications"
Cohesion: 0.08
Nodes (28): analyzeTicketsInputSchema, analyzeTicketsOutputSchema, columnSchema, compactTicketSchema, createTodoTicketOutputSchema, editableTicketSchema, effectivePort(), isAllowedHost() (+20 more)

### Community 2 - "Desktop Bootstrap & Menus"
Cohesion: 0.06
Nodes (50): defaultProjectLookup(), resolveBaseBranch(), buildAskContract(), assertExecutionAvailable(), CODEX_LAUNCH_STATUS_MESSAGES, CodexCapabilityReader, ExecutionOverrides, FEASIBILITY_ENGINE_EXECUTION (+42 more)

### Community 3 - "Feasibility Batch Management"
Cohesion: 0.04
Nodes (93): isProcessing(), ACTIVE_STAGES, COLUMN_LABELS, COLUMN_ORDER, TERMINAL_STAGES, applyTranscriptUpdate(), TranscriptState, transcriptText() (+85 more)

### Community 4 - "Ticket Action Panels"
Cohesion: 0.12
Nodes (26): ExecutionFinishStatus, LiveSession, log, PendingSessionMessage, previewToolInput(), renderSessionEvent(), SessionExecutionContext, SessionExecutionFinish (+18 more)

### Community 5 - "Fake System Adapter"
Cohesion: 0.16
Nodes (39): AtelierSessionInput, ProjectKey, AutomationPatch, ConversationPatch, NewAsk, NewAutomation, NewClean, NewConversation (+31 more)

### Community 6 - "Shared Zod Schemas"
Cohesion: 0.05
Nodes (40): BoundedCommandResult, sshHostFromRemoteUrl(), connectionFailure(), connectionResult(), fetchGithubOpenPrs(), ghAuthenticatedUserSchema, ghPrHeadSchema, ghPrSchema (+32 more)

### Community 7 - "Settings & Profiles UI"
Cohesion: 0.05
Nodes (16): FailedReformulation, ActionSystem, delay(), dryRunLog, fakeEncoder, fakeMissingKey(), fakeShellPrompt(), FakeSystemAdapter (+8 more)

### Community 8 - "PR Selection & Slots Bar"
Cohesion: 0.10
Nodes (27): main(), scalar(), assertCodexDowngradeSafe(), backfillOrchestrator(), countRows(), createDatabase(), EXECUTION_MIGRATIONS, hasColumn() (+19 more)

### Community 9 - "Real System Adapter"
Cohesion: 0.05
Nodes (48): environmentFor(), agentBaseEnv(), bestInstalledMatch(), compareParts(), envWithProjectNode(), nvmNodeBinDir(), readNvmrc(), prepareProjectShell() (+40 more)

### Community 10 - "Slot Config & Worktree Watch"
Cohesion: 0.06
Nodes (52): compileFeedback(), PrdAnnotation, prdAnnotationsSchema, FeedbackDraft, PrdAnnotatorProps, BREADCRUMB, NO_ANNOTATIONS, PrdReviewDialog() (+44 more)

### Community 11 - "Core Domain Concepts"
Cohesion: 0.03
Nodes (74): agentMessageRowSchema, AutomationRow, automationRowSchema, AutomationRunRow, automationRunRowSchema, buildScripts(), CommentRow, commentRowSchema (+66 more)

### Community 12 - "Board & Sidebar Layout"
Cohesion: 0.11
Nodes (14): analyzeResultSchema, compactTicketSchema, createResultSchema, errorResultSchema, ISOLATED_ENV_KEYS, projectResultSchema, savedEnv, startResultSchema (+6 more)

### Community 13 - "Database Store Operations"
Cohesion: 0.21
Nodes (18): projectMatches(), ProjectsSettings(), readShowHidden(), referenceCommitTimeout(), writeShowHidden(), AppearanceSettings(), mostCommonValue(), FilteredProjectGroup (+10 more)

### Community 14 - "Coordinator & Protocol"
Cohesion: 0.10
Nodes (47): ManualQualityEvidenceInput, QualityCriteriaSnapshot, QualityCriterion, QualityRunPhase, CREATOR_LABELS, CriteriaEditor(), HumanEvidenceEditor(), newCriterion() (+39 more)

### Community 15 - "API Routes & Reformulate"
Cohesion: 0.12
Nodes (23): ensureClaudeBinary(), bashCommandSchema, buildSettings(), claudeProvider, createSdkAgentSession(), denyBashHook(), denyNoVerifyHook, denyReviewPublishingHook (+15 more)

### Community 16 - "Stats Aggregation"
Cohesion: 0.08
Nodes (3): SessionHub, SessionHubHandlers, SessionStartCallbacks

### Community 17 - "Triage & Server Hub"
Cohesion: 0.08
Nodes (25): devDependencies, autoprefixer, class-variance-authority, clsx, concurrently, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities (+17 more)

### Community 18 - "Live Terminal Views"
Cohesion: 0.07
Nodes (38): isReviewFixSession(), ATELIER_WEB_TOOLS, AZURE_BASH_ALLOWLIST, AZURE_CLEAN_BASH_ALLOWLIST, BASH_ALLOWLIST, bashAllowlist(), buildFeasibilitySessionConfig(), buildImplementSessionConfig() (+30 more)

### Community 19 - "Stage Progress & Display"
Cohesion: 0.08
Nodes (24): compilerOptions, allowImportingTsExtensions, baseUrl, esModuleInterop, isolatedModules, jsx, lib, module (+16 more)

### Community 20 - "Real Adapter GH/Composer"
Cohesion: 0.08
Nodes (31): Kind, KINDS, agentEffortSchema, codexEffortSchema, codexModelSchema, CodexTierSummary(), DurationChart(), ThroughputChart() (+23 more)

### Community 21 - "Store Types & Agent Knobs"
Cohesion: 0.08
Nodes (83): agent_context_html(), agent_entry_count(), axes_html(), axis_anchor(), axis_head_html(), axis_items(), axis_section_html(), axis_statuses() (+75 more)

### Community 22 - "DB Row Schemas & Mappers"
Cohesion: 0.07
Nodes (37): log, ToolHandler, ToolResult, settingSourcesForRole(), workerToolsForRole(), TRIAGE_VERDICTS, AgentSettableStage, agentSettableStageSchema (+29 more)

### Community 23 - "Dev Dependencies"
Cohesion: 0.14
Nodes (16): RESEARCH_OPTION_KEYS, RESEARCH_OPTION_LABELS, ResearchOptionKey, enabledResearchOptionKeys(), researchOptionsFromKeys(), isResearchOptionKey(), ResearchFields(), TICKET_OPTION (+8 more)

### Community 24 - "TypeScript Config"
Cohesion: 0.10
Nodes (25): cleanTicket(), conflictTicket(), REVIEW_OPTS, reviewTicket(), TICKET_OPTS, CHILD_USAGE, FULL_REVIEW_KINDS, LIGHT_REVIEW_KINDS (+17 more)

### Community 25 - "Client Hub & Watchdog"
Cohesion: 0.15
Nodes (5): AgentCoordinator, formatPrdDocumentIssues(), logRejection(), SessionToolCall, getErrorStack()

### Community 26 - "Cost & Pricing"
Cohesion: 0.17
Nodes (4): AtelierManager, emptyTurn(), atelierSessionKey(), buildAtelierSessionConfig()

### Community 27 - "Workflow View & Lifecycle"
Cohesion: 0.05
Nodes (32): Architecture, Commands, Conventions (enforced — beyond the global ones in ~/.claude/CLAUDE.md), graphify, The dry-run safety model — read before running anything, What this is, Agent runtime, Architecture (+24 more)

### Community 28 - "Stats Charts"
Cohesion: 0.06
Nodes (30): agentMessageDeltaSchema, agentToml(), buildMcpServers(), ConfigObject, configReadResponseSchema, describeCodexError(), emptyResponseSchema, errorNotificationSchema (+22 more)

### Community 29 - "Session Hub & Agent Session"
Cohesion: 0.08
Nodes (39): AGENT_EFFORT_FULL_LABELS, AGENT_EFFORT_LABELS, AGENT_MODEL_FULL_LABELS, AGENT_MODEL_LABELS, CODEX_EFFORT_FULL_LABELS, CODEX_EFFORT_LABELS, CODEX_MODEL_EFFORTS, CODEX_MODEL_LABELS (+31 more)

### Community 30 - "Agents View & Ticket Cards"
Cohesion: 0.05
Nodes (17): RecordingSystemAdapter, PublishReviewOptions, ReviewHeadResult, ReviewPublicationState, FAKE_OPEN_PRS, FakeVcsClient, extractPrUrl(), githubPrHeadRef() (+9 more)

### Community 31 - "PRD Review & Markdown"
Cohesion: 0.05
Nodes (67): ActiveReview, ActiveReviewPass, BOARD_FINDING_RENDER_STYLE, log, orderedReviewKinds(), renderCollapsedFinding(), renderFinding(), renderPersistedReviewResult() (+59 more)

### Community 33 - "Logging"
Cohesion: 0.10
Nodes (21): scripts, build:desktop, build:web, dev, dev:desktop, dev:proxy, dev:server, dev:web (+13 more)

### Community 34 - "Board Columns"
Cohesion: 0.13
Nodes (23): ActiveDelegation, AppliedPath, copyDependencies(), copyPath(), DelegationWorkspace, ensureParentDirectory(), FileState, git() (+15 more)

### Community 35 - "NPM Scripts"
Cohesion: 0.13
Nodes (9): addUsageByModel(), toUsageByModel(), TicketLifecycle, ErrorDetailsSource, Ticket, StageProgressBarProps, DescriptionTabProps, PrdTabProps (+1 more)

### Community 36 - "Runtime Dependencies"
Cohesion: 0.08
Nodes (28): ARTIFACT_CONTENT_TYPES, createQualityRoutes(), QualityRouteDeps, manualQualityEvidenceSchema, nonEmptyTextSchema, qualityCriteriaSnapshotSchema, qualityCriterionSchema, qualityEnvironmentSchema (+20 more)

### Community 37 - "Claude SDK Provider"
Cohesion: 0.09
Nodes (22): dependencies, @anthropic-ai/claude-agent-sdk, dompurify, elysia, @fontsource/ibm-plex-mono, @fontsource/ibm-plex-sans, marked, @modelcontextprotocol/sdk (+14 more)

### Community 38 - "Agent Profile Config"
Cohesion: 0.14
Nodes (17): costByFamily(), costOf(), costOfModel(), costOfSessions(), CostSummary, FamilyPricing, MODEL_PRICING, ModelFamily (+9 more)

### Community 39 - "Agent Coordinator Handlers"
Cohesion: 0.17
Nodes (18): adopt(), compareVersions(), configureClaudeProvisionDir(), detectionCandidates(), detectUserInstall(), downloadAndVerifyTarball(), downloadPinnedBinary(), emitProgress() (+10 more)

### Community 40 - "API Client Inputs"
Cohesion: 0.09
Nodes (7): childTranscriptPrefix(), DelegationManager, implementationScopesOverlap(), normalizeImplementationScope(), reviewKey(), allowedReviewPasses(), mergeAgentUsageByModel()

### Community 41 - "Ticket Config & Constants"
Cohesion: 0.23
Nodes (10): artifactPath, assertPackageVersionInSync(), assertSdkVersionsInSync(), BUILT_DMG, ELECTROBUN_BIN, fail(), installedPackageVersion(), RELEASE_FOLDER (+2 more)

### Community 42 - "Ticket Detail & Triage UI"
Cohesion: 0.21
Nodes (6): CapabilityCache, CodexRuntimeModel, codexRuntimeModelSchema, CodexRuntimeStatus, codexRuntimeStatusSchema, UNKNOWN_CODEX_RUNTIME_STATUS

### Community 43 - "Demo Pipeline Concepts"
Cohesion: 0.10
Nodes (29): RepoInspectionSource, projectValidationSchema, CreateProjectInput, UpdateProjectInput, vcsProviderSchema, ConnectionHint, CreateStep, isPositiveIntegerString() (+21 more)

### Community 44 - "Chart Primitives"
Cohesion: 0.28
Nodes (13): abortReason(), computeCodeFingerprint(), FingerprintEntry, FingerprintPhase, hashFingerprintPaths(), isMissingFileError(), listFingerprintPaths(), log (+5 more)

### Community 45 - "Session Hub Transcript"
Cohesion: 0.07
Nodes (40): log, AttachExecutionSessionInput, CreateQualityIterationInput, EnqueueAgentMessageInput, FinalizeExecutionInput, MarkAgentMessageAcceptedInput, MarkAgentMessageReceivedInput, MarkAgentMessageRejectedInput (+32 more)

### Community 46 - "Community 46"
Cohesion: 0.27
Nodes (15): Agent Implementation Config, Argus Code Review, Automated Tests (typecheck/lint/test), Claude Code Autonomous Agent, Ticket Contract Injection, Feasibility Analysis, Kanban Board (Atelier), Kanban Agents Demo (demo.gif) (+7 more)

### Community 47 - "Modal Dialogs"
Cohesion: 0.16
Nodes (30): buildCleanContract(), buildConflictResolutionContract(), buildFeasibilityBatchContract(), buildFeasibilityContextSection(), buildImplementingSteps(), buildMockupReviewStep(), buildPlanningStep(), buildPrdBullet() (+22 more)

### Community 48 - "Community 48"
Cohesion: 0.10
Nodes (18): TicketCreationRequestConflictError, AnalyzeTicketRejectionReason, AnalyzeTicketsResult, CreateTodoTicketInput, createTodoTicketInputSchema, CreateTodoTicketResult, log, normalizeCreateInput() (+10 more)

### Community 49 - "Slot State"
Cohesion: 0.05
Nodes (25): setup(), ReformulateManager, TriageManager, Watchdog, ClientHub, ClientSocket, PROJECT_ROOT, NOTE: PRD generation holds the request open up to ~120s (REFORMULATE_TIMEOUT_MS) (+17 more)

### Community 50 - "Stats Hooks & Cards"
Cohesion: 0.11
Nodes (12): featureBranch(), SlotManager, slotPath(), slugify(), resolveTemplatePaths(), mapQualityIterationRow(), mapSlotRow(), mapWorktreeSessionRow() (+4 more)

### Community 51 - "Community 51"
Cohesion: 0.07
Nodes (8): realpathSafe(), RealSystemAdapter, resolveWorktreeScriptCommand(), setupOutputExcerpt(), shQuote(), DoneGateResult, PrepareReviewWorktreeOptions, VcsProvider

### Community 52 - "repairPath.ts"
Cohesion: 0.10
Nodes (21): terminalServerMessageSchema, FullscreenToggle(), FullscreenToggleProps, badgeLabelFor(), LiveTerminal(), LiveTerminalOptions, LiveTerminalProps, isShortcutDetail() (+13 more)

### Community 53 - "User Terminal Manager"
Cohesion: 0.33
Nodes (5): CONTEXT — domain glossary, Execution, Proposed (not yet built), Seams, Work items

### Community 54 - "Community 54"
Cohesion: 0.10
Nodes (13): CapturingSystem, AckSystem, startFeasibilityTicket(), ClosableExecution, RecordingSystem, RecordedSession, RecordingSystem, RelaunchSystem (+5 more)

### Community 55 - "App.tsx"
Cohesion: 0.21
Nodes (3): FeasibilityBatchManager, toTriageResult(), FeasibilityResult

### Community 56 - "CSV Parsing"
Cohesion: 0.13
Nodes (16): CodexBinaryVersionError, require, resolveCodexBinary(), resolveCodexBinaryOverride(), TARGETS, accountResponseSchema, hasExplicitCodexApiKey(), isProtocolIncompatibility() (+8 more)

### Community 57 - "Community 57"
Cohesion: 0.13
Nodes (11): directories, initializeParamsSchema, log, requestSchema, rpcError(), rpcResult(), rpcResponseSchema, toolCallParamsSchema (+3 more)

### Community 58 - "File Uploads"
Cohesion: 0.16
Nodes (12): ChartConfig, ChartContainer, ChartContainerProps, ChartContext, ChartContextValue, ChartLegendContent(), ChartLegendContentProps, ChartTooltipContent() (+4 more)

### Community 59 - "triageManager.ts"
Cohesion: 0.10
Nodes (23): buildAtelierConsolidateTurn(), buildAtelierPrompt(), buildAtelierRegenerationTurn(), buildAuthoringRules(), buildFraming(), buildHistory(), buildResearch(), buildRole() (+15 more)

### Community 60 - "Package Manifest"
Cohesion: 0.16
Nodes (7): AutomationManager, log, mapAutomationRow(), mapAutomationRunRow(), AutomationRunStatus, Automation, AutomationRun

### Community 61 - "splitManager.ts"
Cohesion: 0.40
Nodes (4): PR review counting and publication correction state, Progress, Scope and decisions, Verification

### Community 62 - "TicketCard.tsx"
Cohesion: 0.12
Nodes (23): commandOutputOrNull(), readPackageManifest(), resolveSshHostname(), buildRepoInspection(), formatProjectLabel(), hostnameFromSshConfig(), LOCKFILE_NAMES, LOCKFILE_RUNNERS (+15 more)

### Community 63 - "Community 63"
Cohesion: 0.13
Nodes (21): CompactTicket, ListTicketsInput, Column, COLUMNS, ACTIVE_COLUMNS, Board(), BoardProps, isColumn() (+13 more)

### Community 64 - "Composer Run Script"
Cohesion: 0.07
Nodes (48): orderSelectedTasks(), prdCardDrafts(), axisIdSchema, DUPLICATE_ITEMS_ISSUE, hasDuplicates(), identifierSchema, isUnique(), nonEmptyTextArraySchema (+40 more)

### Community 65 - "split.ts"
Cohesion: 0.40
Nodes (10): azureOrgUrl(), fromAzureSegments(), fromCollectionSegments(), fromLegacySegments(), fromSshSegments(), parseAzureRepoRef(), parseRemoteLocation(), RemoteLocation (+2 more)

### Community 66 - "prUrl.ts"
Cohesion: 0.15
Nodes (20): COLUMN_SORT_FIELD, BoardColumn(), compareFamilyMembers(), familyKeyOf(), groupTicketIds(), groupTicketsByFamily(), isSplitMother(), readCollapsed() (+12 more)

### Community 67 - "TerminalView.tsx"
Cohesion: 0.46
Nodes (5): buildSplitChannelPrompt(), buildTicketLines(), isEnglish(), extractFigmaUrls(), hasMockups()

### Community 68 - "AutomationView.tsx"
Cohesion: 0.12
Nodes (18): AUTOMATION_TRIGGER_LABELS, AUTOMATION_TRIGGERS, AutomationCard(), AutomationCardProps, AutomationFormProps, AutomationView(), EMPTY_FORM, formFromAutomation() (+10 more)

### Community 69 - "reviewFindings.ts"
Cohesion: 0.08
Nodes (42): prepareQualityCriteria(), PrepareQualityCriteriaOptions, QUALITY_CONTEXT_FILES, repositoryContext(), deniedCommandShape(), QUALITY_NATIVE_DENIED_TOOLS, qualityErrorMessage(), QualityObservation (+34 more)

### Community 70 - "CodexRuntimeStatus"
Cohesion: 0.07
Nodes (43): App(), HOME_VIEW_OPTIONS, HomeView, NAV_ENTRIES, NavEntry, Sidebar(), SidebarProps, SidebarView (+35 more)

### Community 71 - "PostCSS Config"
Cohesion: 0.29
Nodes (6): name, overrides, zod, private, type, version

### Community 72 - ".publishReviewUnderRepoLock"
Cohesion: 0.05
Nodes (50): boundedCommandDetail(), runBoundedCommand(), safeJsonParse(), withJsonRequestFile(), escapeHtml(), renderCollapsedDetails(), renderOutsideDiffComment(), renderOutsideDiffSection() (+42 more)

### Community 73 - "TerminalView.tsx"
Cohesion: 0.07
Nodes (58): CONVERSATION_STATUS_LABELS, ConversationStatus, PRD_SPLIT_MODE_LABELS, PRD_SPLIT_MODES, PrdSplitMode, AskPanel(), AtelierViewProps, ComposeState (+50 more)

### Community 74 - "button.tsx"
Cohesion: 0.07
Nodes (38): ORCHESTRATORS, SkillStatus, availableSkillProviders(), expectedSkillPaths(), HOST_SKILL_ROOTS, missingSkillProviders(), SKILL_REQUIREMENTS, SKILL_TIERS (+30 more)

### Community 75 - ".handleRequest"
Cohesion: 0.08
Nodes (14): FakePaneStream, PaneStream, dataMessage(), log, normalizeSeed(), safeParse(), send(), TerminalSession (+6 more)

### Community 76 - "atelierManager.test.ts"
Cohesion: 0.16
Nodes (12): CLAUDE_CONVERSATION, closers, CODEX_CONVERSATION, setup(), TEMPLATE_PATH, TURN_END, setup(), parseAtelierSessionKey() (+4 more)

### Community 78 - "statistics.ts"
Cohesion: 0.18
Nodes (15): isCodexFastServiceTier(), summarizeSessionCosts(), totalTokensOfSessions(), executionCosts(), executionTokens(), projectStatRecord(), CostSummary(), MetaRow() (+7 more)

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
Nodes (23): FAILURE_COLUMNS, SUCCESS_COLUMNS, ACTIVE_BAR, AREA_CURSOR, AXIS_PROPS, BAR_CURSOR, CHART_PALETTE, colorAt() (+15 more)

### Community 86 - "vcsCommands.ts"
Cohesion: 0.21
Nodes (6): configFingerprint(), fingerprint(), QualityManager, sourceFingerprint(), QualityValidationRun, TicketQuality

### Community 87 - "atelier.ts"
Cohesion: 0.10
Nodes (29): AtelierPromptInput, mapConversationMessageRow(), mapConversationRow(), mapPrdDocumentRow(), parseJsonColumn(), parsePrdAnnotations(), parseResearchOptions(), attachment() (+21 more)

### Community 89 - "createMcpServer"
Cohesion: 0.15
Nodes (11): createMcpServer(), invalidInput(), listPublicProjects(), OutputValidator, toolError(), toolResult(), FeasibilityStarter, isActive() (+3 more)

### Community 90 - "Profile"
Cohesion: 0.27
Nodes (15): buildContractConstraintsLines(), buildResponseFormatLines(), buildStrictRulesLines(), buildTicketLines(), buildTriageChannelPrompt(), buildTriagePlusChannelPrompt(), isEnglish(), readOnlyFramingLines() (+7 more)

### Community 91 - "createCodexAgentSession"
Cohesion: 0.07
Nodes (27): Activation and retest, Baseline evidence and future acceptance needs, Behavior observed at the base revision, Capability and provider matrix, Checks and evidence, Criteria, providers, and delivery, Current follow-up state — 2026-10-03, Current iteration work — 2026-10-03 (+19 more)

### Community 92 - "TerminalSessionManager"
Cohesion: 0.12
Nodes (15): 1. Register the associated repositories once, 2. Prepare the common isolated workspace, 3. Plan automatically, then implement, 4. Start the application from its instructions, 5. Validate and repair in the retained workspace, 6. Deliver one feature result, End-to-end flow, First acceptance scenarios (+7 more)

### Community 93 - "ColumnActionsMenu.tsx"
Cohesion: 0.25
Nodes (7): Azure DevOps support — state file, Decisions (validated by the owner, 2026-09-21), Goal, Known blockers for lots 3 and 4, Open questions, Progress, Verified on this machine (az 2.90.0, azure-devops 1.0.8)

### Community 94 - ".addComment"
Cohesion: 0.08
Nodes (57): pairedRuntimeCodexEffort(), Capabilities, AtelierAgentFields(), CodexAgentFields(), CodexConnectionStatus(), STATUS_LABELS, ImplementationAgentFields(), ProfileRow() (+49 more)

### Community 95 - "TicketConfigSummary.tsx"
Cohesion: 0.50
Nodes (3): appBundle, EMBEDDED_BINARIES, resourcesApp

### Community 97 - "ProjectList.tsx"
Cohesion: 0.21
Nodes (14): ManagedProject, dragKeys(), groupCountLabel(), groupSortId(), ListGroup, ProjectList(), ProjectListProps, ProjectListRowProps (+6 more)

### Community 98 - "usePrdSearch.ts"
Cohesion: 0.22
Nodes (8): AtelierDesktopRpcSchema, DesktopRequests, McpSettingsMetadata, WebviewRequests, McpSettingsController, createMcpSettingsClient(), getMcpSettingsClient(), McpSettingsClient

### Community 99 - "reviewPublishingGuard.ts"
Cohesion: 0.07
Nodes (35): API_GUARDS, API_READ_METHOD_SET, ApiDenyPatterns, ApiGuard, AZ_INVOKE_COMMAND, AZ_INVOKE_METHOD_LONG_FLAGS, AZ_INVOKE_WRITE_INPUT_LONG_FLAGS, AZ_PR_WRITE_PATTERN (+27 more)

### Community 100 - ".startVerification"
Cohesion: 0.08
Nodes (25): $ref, $ref, enum, $ref, $ref, properties, designConsiderations, goals (+17 more)

### Community 101 - "runRecordedAction"
Cohesion: 0.24
Nodes (6): mapProfileRow(), nullableBooleanValue(), serializeErrorDetails(), runRecordedAction(), ExecutionRun, Profile

### Community 102 - "delegationManager.test.ts"
Cohesion: 0.05
Nodes (37): PrNotificationSyncStatus, WsClientEvent, ATTENTION_STATUSES, sessionOf(), SlotPips(), SlotPipsProps, STATUS_LABELS, STATUS_PIP_CLASSES (+29 more)

### Community 103 - "useAppSettings.ts"
Cohesion: 0.23
Nodes (13): AppSettings, UpdateAppSettingsInput, AgentDefaultsSettings(), AppSettingsState, flashSaved(), loadOnce(), patchAppSettings(), publish() (+5 more)

### Community 104 - "mcpSettings.ts"
Cohesion: 0.22
Nodes (4): McpTokenSource, createMcpSettingsController(), McpSettingsControllerDependencies, temporaryDirectories

### Community 105 - "createMcpServer"
Cohesion: 0.09
Nodes (23): $ref, $ref, $ref, minLength, type, minLength, type, enum (+15 more)

### Community 106 - "usePrdSearch.ts"
Cohesion: 0.14
Nodes (17): ANSI, appendToLogFile(), COLOR_ENABLED, disableFileLogging(), initLogFile(), isLevel(), Level, LEVEL_ORDER (+9 more)

### Community 107 - "CodexAppServerConnection"
Cohesion: 0.19
Nodes (5): CodexAppServerConnection, CodexAppServerNotification, CodexAppServerOptions, AppServerFixture, CodexRuntimeDependencies

### Community 108 - "WorkflowView.tsx"
Cohesion: 0.09
Nodes (22): axes, designConsiderations, goals, id, locale, openQuestions, outOfScope, preDraft (+14 more)

### Community 109 - "TriageManager"
Cohesion: 0.13
Nodes (10): CodexAppServerRpcError, canonicalJson(), CodexCommandHook, codexSessionPreToolUseHookHash(), JsonValue, createCodexProvider(), AppServerFixtureOptions, hookPathForSession() (+2 more)

### Community 110 - "createCodexAgentSession"
Cohesion: 0.12
Nodes (19): log, SlotWatch, DEFAULT_MODELS, log, projectConfigSchema, NOTE: AppSettings carries no implementerModel/implementerEffort, so those two MO, NOTE: must live OUTSIDE any repo that has a node_modules: tsc auto-includes @typ, SLOTS_ROOT (+11 more)

### Community 111 - "uploads.ts"
Cohesion: 0.12
Nodes (13): CodexAppServerInitializationError, CodexAppServerProtocolError, connectCodexAppServer(), incomingSchema, initializeResponseSchema, log, PendingRequest, rpcErrorSchema (+5 more)

### Community 113 - "PreparedHook"
Cohesion: 0.29
Nodes (8): StatRecord, StatCard(), StatCardProps, StatEmpty(), StatsView(), StatsViewProps, useStats(), UseStatsResult

### Community 114 - "ApiDenyPatterns"
Cohesion: 0.07
Nodes (7): mapAgentMessageRow(), mapPrNotificationRow(), mapQualityCriteriaSnapshotRow(), mapQualityValidationRunRow(), Store, AgentMessage, PrNotification

### Community 115 - "useSuppressEscapeBeep.ts"
Cohesion: 0.29
Nodes (6): additionalProperties, $id, required, $schema, title, type

### Community 116 - "settings.tsx"
Cohesion: 0.05
Nodes (52): COMMIT_LANGUAGES, CommitLanguage, ProfileConfig, DragHandleAttributes, DragHandleListeners, ProfileRowHeader(), ProfileRowHeaderProps, ProfileRowProps (+44 more)

### Community 117 - "bootstrap.ts"
Cohesion: 0.36
Nodes (5): applyDesktopEnv(), DesktopRoots, ensureMcpToken(), regenerateMcpToken(), temporaryDirectories

### Community 118 - "properties"
Cohesion: 0.20
Nodes (7): AZURE_COMMANDS, COMMANDS_BY_PROVIDER, GITHUB_COMMANDS, PrDiffContext, VcsCleanCommands, AZ_SETTLED_THREAD_STATUSES, VCS_PROVIDER_LABELS

### Community 119 - "AgentMessage"
Cohesion: 0.11
Nodes (19): items, maxItems, minItems, type, uniqueItems, $ref, axes, requirements (+11 more)

### Community 120 - "ProjectPanel.tsx"
Cohesion: 0.11
Nodes (17): Agent session (server), Architecture decisions, Atelier (conversation → PRD → cards) — implementation state, Contract injection, Follow-ups noticed in Lot A, Goal, Lot A public API (use these names in Lots B and C), Lot B public surface and deviations (read before Lot C/D) (+9 more)

### Community 121 - "profileSummary.ts"
Cohesion: 0.26
Nodes (8): Block, blockText(), compactChunks(), firstCharCode(), TranscriptBuffer, trimBlockStart(), AgentStreamBlock, TranscriptUpdate

### Community 122 - "TicketOperationError"
Cohesion: 0.11
Nodes (17): PROJECT_ROOT, NewPrdDocument, PrdRenderError, RENDERER_RELATIVE_PATH, renderPrdHtml(), RenderPrdHtmlInput, resolvePrdRendererPath(), TEMPLATE_PATH (+9 more)

### Community 123 - "prepareNoVerifyHook"
Cohesion: 0.24
Nodes (13): codexCommandPolicyScript(), apiWriteDenyScript(), ConfigValue, extractCommandScript(), perSegmentScript(), prepareNoVerifyHook(), reviewPublishingGuardScript(), shellDeny() (+5 more)

### Community 124 - "theme.ts"
Cohesion: 0.33
Nodes (9): useTheme(), UseThemeResult, applyTheme(), getStoredTheme(), isTheme(), Theme, ThemeOption, THEMES (+1 more)

### Community 125 - "useReviewCounts.ts"
Cohesion: 0.09
Nodes (33): RFC-4180, ProjectInfo, AgentsViewProps, AskPanelProps, CleanPrPanel(), CleanPrPanelProps, ImportTicketsPanel(), ImportTicketsPanelProps (+25 more)

### Community 127 - "TerminalSessionManager"
Cohesion: 0.13
Nodes (16): nonEmptyStringArray, stringArray, items, type, uniqueItems, minLength, pattern, type (+8 more)

### Community 128 - "contract.test.ts"
Cohesion: 0.11
Nodes (16): agentPairError(), cleanDescription(), createApiRoutes(), isBlocked(), isSplitMother(), isWebOnlyPath(), jsonError(), normalizeRepoPath() (+8 more)

### Community 129 - "useConversationDetail.ts"
Cohesion: 0.40
Nodes (5): MIME_EXTENSIONS, resolveExtension(), SavedUpload, saveUpload(), serveUpload()

### Community 130 - "performSplit"
Cohesion: 0.60
Nodes (4): createSplitChildren(), failSplitMother(), performSplit(), splitMotherBranch()

### Community 131 - "recordOutcome"
Cohesion: 0.40
Nodes (4): log, PermissionDenial, permissionDenialSchema, qualityPermissionBlockReasonSchema

### Community 133 - "PublishReviewOptions"
Cohesion: 0.20
Nodes (3): ProjectConfig, SqlUpdateBuilder, PrNotificationMonitor

### Community 134 - "id"
Cohesion: 0.15
Nodes (14): additionalProperties, properties, required, type, axis, id, maxLength, pattern (+6 more)

### Community 135 - "projectDisplay.ts"
Cohesion: 0.60
Nodes (4): formatCommitTimeout(), TimeoutUnit, timeoutUnitMs(), timeoutUnitOf()

### Community 136 - "reformulate.ts"
Cohesion: 0.12
Nodes (17): ActiveQualityRun, CHECK_RUNNERS, CheckCommand, commandSucceeded(), DATABASE_ISOLATION_PLACEHOLDERS, databaseIsolationProblem(), log, outputFor() (+9 more)

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
- **1016 isolated node(s):** `Permission refusals are specific to a command and session`, `Two agent providers: implement every host integration for both`, `Azure reviewer response nullability`, `Disposable quality verification`, `Precise refusal identification — 2026-10-03` (+1011 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **12 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Store` connect `ApiDenyPatterns` to `Contract Building & Slots`, `Desktop Bootstrap & Menus`, `Ticket Action Panels`, `PublishReviewOptions`, `reformulate.ts`, `Core Domain Concepts`, `Stats Aggregation`, `DB Row Schemas & Mappers`, `TypeScript Config`, `Client Hub & Watchdog`, `Cost & Pricing`, `PRD Review & Markdown`, `NPM Scripts`, `Runtime Dependencies`, `API Client Inputs`, `Session Hub Transcript`, `Modal Dialogs`, `Community 48`, `Slot State`, `Stats Hooks & Cards`, `Community 54`, `triageManager.ts`, `Package Manifest`, `.handleRequest`, `atelierManager.test.ts`, `vcsCommands.ts`, `atelier.ts`, `runRecordedAction`, `useAppSettings.ts`, `createCodexAgentSession`, `TicketOperationError`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **Why does `SystemAdapter` connect `User Terminal & Fake IO` to `Contract Building & Slots`, `Desktop Bootstrap & Menus`, `Ticket Action Panels`, `PublishReviewOptions`, `Shared Zod Schemas`, `Settings & Profiles UI`, `reformulate.ts`, `Real System Adapter`, `Stats Aggregation`, `Cost & Pricing`, `Agents View & Ticket Cards`, `PRD Review & Markdown`, `NPM Scripts`, `API Client Inputs`, `Ticket Detail & Triage UI`, `Session Hub Transcript`, `Slot State`, `Stats Hooks & Cards`, `Community 51`, `triageManager.ts`, `Package Manifest`, `button.tsx`, `.handleRequest`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Why does `Ticket` connect `NPM Scripts` to `Contract Building & Slots`, `Desktop Bootstrap & Menus`, `Feasibility Batch Management`, `Fake System Adapter`, `reformulate.ts`, `Slot Config & Worktree Watch`, `Core Domain Concepts`, `Live Terminal Views`, `TypeScript Config`, `Client Hub & Watchdog`, `Session Hub & Agent Session`, `PRD Review & Markdown`, `API Client Inputs`, `Session Hub Transcript`, `Modal Dialogs`, `Community 48`, `Stats Hooks & Cards`, `Community 63`, `prUrl.ts`, `TerminalView.tsx`, `AutomationView.tsx`, `CodexRuntimeStatus`, `TerminalView.tsx`, `statistics.ts`, `vcsCommands.ts`, `Profile`, `.addComment`, `delegationManager.test.ts`, `ApiDenyPatterns`, `useReviewCounts.ts`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `createApiRoutes()` (e.g. with `.ticket()` and `isWebOnlyPath()`) actually correct?**
  _`createApiRoutes()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Permission refusals are specific to a command and session`, `Two agent providers: implement every host integration for both`, `Azure reviewer response nullability` to the rest of the system?**
  _1028 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Contract Building & Slots` be split into smaller, more focused modules?**
  _Cohesion score 0.02056737588652482 - nodes in this community are weakly interconnected._
- **Should `Terminals UI & Notifications` be split into smaller, more focused modules?**
  _Cohesion score 0.08266129032258064 - nodes in this community are weakly interconnected._