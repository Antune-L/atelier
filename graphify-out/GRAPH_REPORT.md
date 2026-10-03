# Graph Report - kanban-agents  (2026-10-03)

## Corpus Check
- 324 files · ~814,648 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 4172 nodes · 12268 edges · 142 communities (134 shown, 8 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 108 edges (avg confidence: 0.69)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9e8c4938`
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
- VcsConnectionResult
- TicketOperationError
- StatCard.tsx
- useSavedFlash.ts
- codexCommandPolicy.ts
- TicketOperations
- TerminalSessionManager
- contract.test.ts
- csv.ts
- .createTodoTicket
- useProjects.ts
- FakePaneStream
- uploads.ts
- id
- performSplit
- reformulate.ts
- ResearchOptions
- isNotionUrl
- $defs
- title
- preDraft

## God Nodes (most connected - your core abstractions)
1. `Store` - 176 edges
2. `Ticket` - 121 edges
3. `SystemAdapter` - 96 edges
4. `cn()` - 90 edges
5. `createApiRoutes()` - 85 edges
6. `FakeSystemAdapter` - 85 edges
7. `RealSystemAdapter` - 81 edges
8. `getErrorMessage()` - 65 edges
9. `SlotManager` - 63 edges
10. `Orchestrator` - 61 edges

## Surprising Connections (you probably didn't know these)
- `McpSettingsClient` --references--> `McpSettingsMetadata`  [EXTRACTED]
  src/web/src/lib/mcpSettings.ts → desktop/mcpRpc.ts
- `RecordedSession` --references--> `AgentSessionOptions`  [EXTRACTED]
  src/server/agents/delegationManager.test.ts → src/server/system/agentSession.ts
- `main()` --calls--> `assertCodexDowngradeSafe()`  [EXTRACTED]
  scripts/downgrade-codex-catalog.ts → src/server/db/schema.ts
- `main()` --calls--> `migrateCodexCatalog()`  [EXTRACTED]
  scripts/downgrade-codex-catalog.ts → src/server/db/schema.ts
- `SubmittedTurn` --references--> `ConversationMessage`  [EXTRACTED]
  src/server/agents/atelierManager.ts → src/shared/schemas.ts

## Import Cycles
- 3-file cycle: `src/server/config.ts -> src/server/db/store.ts -> src/server/db/rows.ts -> src/server/config.ts`
- 3-file cycle: `src/server/agents/worktreeAddresses.ts -> src/server/config.ts -> src/server/db/store.ts -> src/server/agents/worktreeAddresses.ts`

## Communities (142 total, 8 thin omitted)

### Community 0 - "Contract Building & Slots"
Cohesion: 0.02
Nodes (128): buildNotionImportPrompt(), cleanDescription(), CONVERSATION_STATUS_FOR_PRD, log, PrdCardDraft, prSummaryLines(), reviewDescription(), reviewTicketInput() (+120 more)

### Community 1 - "Terminals UI & Notifications"
Cohesion: 0.09
Nodes (27): analyzeTicketsInputSchema, analyzeTicketsOutputSchema, columnSchema, compactTicketSchema, createTodoTicketOutputSchema, editableTicketSchema, effectivePort(), isAllowedHost() (+19 more)

### Community 2 - "Desktop Bootstrap & Menus"
Cohesion: 0.06
Nodes (49): Comment, FILLED_GLYPH_COLORS, StageProgressBar(), ActivityTab(), ActivityTabProps, isUnanswered(), NO_COMMENT_COLUMNS, CommentRow() (+41 more)

### Community 3 - "Feasibility Batch Management"
Cohesion: 0.06
Nodes (59): ConversationStatus, ORCHESTRATOR_LABELS, AgentCard(), AgentCardProps, AgentsView(), hasLiveAgent(), normalize(), AtelierView() (+51 more)

### Community 4 - "Ticket Action Panels"
Cohesion: 0.14
Nodes (24): ExecutionFinishStatus, LiveSession, log, PendingSessionMessage, previewToolInput(), renderSessionEvent(), SessionExecutionContext, SessionExecutionFinish (+16 more)

### Community 5 - "Fake System Adapter"
Cohesion: 0.05
Nodes (55): RecordingSystemAdapter, RENDERER_RELATIVE_PATH, renderPrdHtml(), resolvePrdRendererPath(), boundedCommandDetail(), BoundedCommandResult, runBoundedCommand(), withJsonRequestFile() (+47 more)

### Community 6 - "Shared Zod Schemas"
Cohesion: 0.08
Nodes (28): ActiveReview, ActiveReviewPass, BOARD_FINDING_RENDER_STYLE, log, renderFinding(), renderPersistedReviewResult(), REVIEW_DISALLOWED_TOOLS, REVIEW_REPORT_LABELS (+20 more)

### Community 7 - "Settings & Profiles UI"
Cohesion: 0.06
Nodes (7): delay(), fakeShellPrompt(), FakeSystemAdapter, ReviewDoneOptions, ValidationCommandOptions, ValidationDependencyResult, WorktreeSetupOptions

### Community 8 - "PR Selection & Slots Bar"
Cohesion: 0.06
Nodes (51): main(), scalar(), CLAUDE_CONVERSATION, closers, CODEX_CONVERSATION, setup(), TEMPLATE_PATH, TURN_END (+43 more)

### Community 9 - "Real System Adapter"
Cohesion: 0.07
Nodes (32): AUTOMATION_RUN_STATUSES, AUTOMATION_TRIGGER_LABELS, AUTOMATION_TRIGGERS, CODEX_EFFORT_LABELS, CODEX_MODEL_LABELS, COMMENT_AUTHORS, CommentAuthor, COMMIT_LANGUAGE_LABELS (+24 more)

### Community 10 - "Slot Config & Worktree Watch"
Cohesion: 0.05
Nodes (59): compileFeedback(), PrdAnnotation, prdAnnotationsSchema, draftOf(), EXPORT_LINK_CLASSES, FeedbackDraft, PrdPanel(), AutomationCard() (+51 more)

### Community 11 - "Core Domain Concepts"
Cohesion: 0.03
Nodes (68): agentMessageRowSchema, AutomationRow, automationRowSchema, AutomationRunRow, automationRunRowSchema, buildScripts(), CommentRow, commentRowSchema (+60 more)

### Community 12 - "Board & Sidebar Layout"
Cohesion: 0.10
Nodes (15): analyzeResultSchema, compactTicketSchema, createResultSchema, errorResultSchema, ISOLATED_ENV_KEYS, projectResultSchema, savedEnv, startResultSchema (+7 more)

### Community 13 - "Database Store Operations"
Cohesion: 0.10
Nodes (32): RepoInspectionSource, CreateProjectInput, UpdateProjectInput, vcsProviderSchema, ConnectionHint, CreateStep, isPositiveIntegerString(), isValidDraft() (+24 more)

### Community 14 - "Coordinator & Protocol"
Cohesion: 0.14
Nodes (22): CREATOR_LABELS, CriteriaEditor(), newCriterion(), QualityCriteriaPanel(), QualityCriteriaPanelProps, SOURCE_LABELS, CLEANUP_LABELS, evidenceProvenance() (+14 more)

### Community 15 - "API Routes & Reformulate"
Cohesion: 0.11
Nodes (27): bashCommandSchema, buildSettings(), claudeProvider, createSdkAgentSession(), denyBashHook(), denyNoVerifyHook, denyReviewPublishingHook, denyTypecheckHook() (+19 more)

### Community 16 - "Stats Aggregation"
Cohesion: 0.07
Nodes (8): logRejection(), setup(), SessionHub, SessionHubHandlers, SessionStartCallbacks, SplitManager, RouteDeps, getErrorStack()

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
Cohesion: 0.11
Nodes (21): Kind, KINDS, CodexTierSummary(), DurationChart(), CodexTierSummary, DurationGroup, effectiveEffortLabel(), effectiveModelLabel() (+13 more)

### Community 21 - "Store Types & Agent Knobs"
Cohesion: 0.08
Nodes (83): agent_context_html(), agent_entry_count(), axes_html(), axis_anchor(), axis_head_html(), axis_items(), axis_section_html(), axis_statuses() (+75 more)

### Community 22 - "DB Row Schemas & Mappers"
Cohesion: 0.07
Nodes (36): formatPrdDocumentIssues(), log, ToolHandler, ToolResult, TRIAGE_VERDICTS, AgentSettableStage, agentSettableStageSchema, askUserArgsSchema (+28 more)

### Community 23 - "Dev Dependencies"
Cohesion: 0.07
Nodes (31): log, DRY_RUN_VERDICT, FeasibilityGroup, log, QueuedFeasibility, log, ReformulateManager, DRY_RUN_VERDICT (+23 more)

### Community 24 - "TypeScript Config"
Cohesion: 0.08
Nodes (33): App(), HOME_VIEW_OPTIONS, HomeView, NAV_ENTRIES, NavEntry, Sidebar(), SidebarProps, SidebarView (+25 more)

### Community 25 - "Client Hub & Watchdog"
Cohesion: 0.11
Nodes (6): AgentCoordinator, orderedReviewKinds(), allowedReviewPasses(), requiredReviewKinds(), SessionToolCall, ticketDependencyError()

### Community 26 - "Cost & Pricing"
Cohesion: 0.06
Nodes (39): buildAtelierConsolidateTurn(), buildAtelierPrompt(), buildAtelierRegenerationTurn(), buildAuthoringRules(), buildFraming(), buildHistory(), buildResearch(), buildRole() (+31 more)

### Community 27 - "Workflow View & Lifecycle"
Cohesion: 0.05
Nodes (32): Architecture, Commands, Conventions (enforced — beyond the global ones in ~/.claude/CLAUDE.md), graphify, The dry-run safety model — read before running anything, What this is, Agent runtime, Architecture (+24 more)

### Community 28 - "Stats Charts"
Cohesion: 0.07
Nodes (43): codexCommandPolicyScript(), agentMessageDeltaSchema, agentToml(), apiWriteDenyScript(), buildMcpServers(), ConfigObject, configReadResponseSchema, ConfigValue (+35 more)

### Community 29 - "Session Hub & Agent Session"
Cohesion: 0.26
Nodes (26): ProjectKey, ConversationPatch, NewAsk, NewClean, NewConversation, NewProfile, NewReview, NewTicket (+18 more)

### Community 30 - "Agents View & Ticket Cards"
Cohesion: 0.15
Nodes (19): ColumnActionsMenu(), ColumnActionsMenuProps, ColumnMenuItem, ActionContext, buildActions(), ConfirmSpec, errorMessage(), RETRY_STAGES (+11 more)

### Community 31 - "PRD Review & Markdown"
Cohesion: 0.10
Nodes (36): ReviewResult, ALSO_FLAGGED_PREFIX, dedupeFindings(), dedupeIdenticalFindings(), DEFAULT_FINDING_RENDER_STYLE, DimensionFinding, findingAnchor(), FindingRenderStyle (+28 more)

### Community 32 - "User Terminal & Fake IO"
Cohesion: 0.10
Nodes (28): AtelierPromptInput, mapConversationMessageRow(), mapConversationRow(), mapPrdDocumentRow(), parseJsonColumn(), parsePrdAnnotations(), parseResearchOptions(), attachment() (+20 more)

### Community 33 - "Logging"
Cohesion: 0.10
Nodes (21): scripts, build:desktop, build:web, dev, dev:desktop, dev:proxy, dev:server, dev:web (+13 more)

### Community 34 - "Board Columns"
Cohesion: 0.16
Nodes (21): AppliedPath, copyDependencies(), copyPath(), DelegationWorkspace, ensureParentDirectory(), FileState, git(), installStagedPath() (+13 more)

### Community 35 - "NPM Scripts"
Cohesion: 0.11
Nodes (14): resolveBaseBranch(), SlotManager, mapTicketRow(), TicketLifecycle, TicketOperationsDeps, Stage, TERMINAL_STAGES, ErrorDetailsSource (+6 more)

### Community 36 - "Runtime Dependencies"
Cohesion: 0.08
Nodes (26): ARTIFACT_CONTENT_TYPES, createQualityRoutes(), QualityRouteDeps, ManualQualityEvidenceInput, manualQualityEvidenceSchema, nonEmptyTextSchema, projectValidationSchema, qualityCriteriaSnapshotSchema (+18 more)

### Community 37 - "Claude SDK Provider"
Cohesion: 0.09
Nodes (22): dependencies, @anthropic-ai/claude-agent-sdk, dompurify, elysia, @fontsource/ibm-plex-mono, @fontsource/ibm-plex-sans, marked, @modelcontextprotocol/sdk (+14 more)

### Community 38 - "Agent Profile Config"
Cohesion: 0.12
Nodes (23): isCodexFastServiceTier(), costByFamily(), costOf(), costOfModel(), costOfSessions(), CostSummary, FamilyPricing, MODEL_PRICING (+15 more)

### Community 39 - "Agent Coordinator Handlers"
Cohesion: 0.10
Nodes (28): artifactPath, assertPackageVersionInSync(), assertSdkVersionsInSync(), BUILT_DMG, ELECTROBUN_BIN, fail(), installedPackageVersion(), RELEASE_FOLDER (+20 more)

### Community 40 - "API Client Inputs"
Cohesion: 0.08
Nodes (11): childTranscriptPrefix(), DelegationManager, implementationScopesOverlap(), normalizeImplementationScope(), renderCollapsedFinding(), reviewKey(), finding(), passDimensionFindings() (+3 more)

### Community 41 - "Ticket Config & Constants"
Cohesion: 0.07
Nodes (72): AGENT_EFFORT_LABELS, AGENT_MODEL_LABELS, prNumberFromUrl(), AgentProfileConfig(), AskPanel(), AtelierAgentFields(), NewConversationForm(), seedMessage() (+64 more)

### Community 42 - "Ticket Detail & Triage UI"
Cohesion: 0.24
Nodes (4): ActionSystem, CapabilityCache, ImportNotionOptions, CodexRuntimeStatus

### Community 43 - "Demo Pipeline Concepts"
Cohesion: 0.10
Nodes (13): PaneStream, dataMessage(), log, normalizeSeed(), safeParse(), send(), TerminalSession, TerminalSessionManager (+5 more)

### Community 44 - "Chart Primitives"
Cohesion: 0.28
Nodes (13): abortReason(), computeCodeFingerprint(), FingerprintEntry, FingerprintPhase, hashFingerprintPaths(), isMissingFileError(), listFingerprintPaths(), log (+5 more)

### Community 45 - "Session Hub Transcript"
Cohesion: 0.21
Nodes (18): AGENT_EFFORT_FULL_LABELS, AGENT_MODEL_FULL_LABELS, CODEX_EFFORT_FULL_LABELS, IMPLEMENTER_LABELS, ProfileConfig, ProfilePipeline(), buildProfilePipeline(), claudeDetail() (+10 more)

### Community 46 - "Community 46"
Cohesion: 0.27
Nodes (15): Agent Implementation Config, Argus Code Review, Automated Tests (typecheck/lint/test), Claude Code Autonomous Agent, Ticket Contract Injection, Feasibility Analysis, Kanban Board (Atelier), Kanban Agents Demo (demo.gif) (+7 more)

### Community 47 - "Modal Dialogs"
Cohesion: 0.14
Nodes (33): buildAskContract(), buildCleanContract(), buildConflictResolutionContract(), buildFeasibilityBatchContract(), buildFeasibilityContextSection(), buildImplementingSteps(), buildMockupReviewStep(), buildPlanningStep() (+25 more)

### Community 48 - "Community 48"
Cohesion: 0.09
Nodes (21): TicketCreationRequestConflictError, AnalyzeTicketRejectionReason, AnalyzeTicketsResult, CreateTodoTicketInput, createTodoTicketInputSchema, CreateTodoTicketResult, isActive(), isBlocked() (+13 more)

### Community 50 - "Stats Hooks & Cards"
Cohesion: 0.28
Nodes (6): commandSucceeded(), outputFor(), ValidationCommandResult, ValidationServiceHandle, QualityEnvironment, QualityValidationRun

### Community 51 - "Community 51"
Cohesion: 0.06
Nodes (12): ActiveDelegation, detectInstallCommand(), realpathSafe(), RealSystemAdapter, resolveWorktreeScriptCommand(), setupOutputExcerpt(), shQuote(), DoneGateResult (+4 more)

### Community 52 - "repairPath.ts"
Cohesion: 0.06
Nodes (38): Block, blockText(), compactChunks(), firstCharCode(), TranscriptBuffer, trimBlockStart(), AgentStreamBlock, terminalServerMessageSchema (+30 more)

### Community 53 - "User Terminal Manager"
Cohesion: 0.33
Nodes (5): CONTEXT — domain glossary, Execution, Proposed (not yet built), Seams, Work items

### Community 54 - "Community 54"
Cohesion: 0.10
Nodes (13): CapturingSystem, AckSystem, ClosableExecution, RecordingSystem, RecordedSession, RecordingSystem, RelaunchSystem, CapturingSystem (+5 more)

### Community 55 - "App.tsx"
Cohesion: 0.21
Nodes (3): FeasibilityBatchManager, toTriageResult(), FeasibilityResult

### Community 56 - "CSV Parsing"
Cohesion: 0.07
Nodes (16): Watchdog, PROJECT_ROOT, NOTE: PRD generation holds the request open up to ~120s (REFORMULATE_TIMEOUT_MS), resolveDataFile(), resolveServerPort(), RunningServer, serveStaticAsset(), SocketData (+8 more)

### Community 57 - "Community 57"
Cohesion: 0.14
Nodes (12): directories, initializeParamsSchema, log, requestSchema, rpcError(), rpcResult(), rpcResponseSchema, toolCallParamsSchema (+4 more)

### Community 58 - "File Uploads"
Cohesion: 0.16
Nodes (12): ChartConfig, ChartContainer, ChartContainerProps, ChartContext, ChartContextValue, ChartLegendContent(), ChartLegendContentProps, ChartTooltipContent() (+4 more)

### Community 59 - "triageManager.ts"
Cohesion: 0.23
Nodes (16): buildContractConstraintsLines(), buildResponseFormatLines(), buildStrictRulesLines(), buildTicketLines(), buildTriageChannelPrompt(), buildTriagePlusChannelPrompt(), isEnglish(), readOnlyFramingLines() (+8 more)

### Community 60 - "Package Manifest"
Cohesion: 0.20
Nodes (4): AutomationManager, mapAutomationRow(), Automation, AutomationRun

### Community 61 - "splitManager.ts"
Cohesion: 0.40
Nodes (4): PR review counting and publication correction state, Progress, Scope and decisions, Verification

### Community 62 - "TicketCard.tsx"
Cohesion: 0.04
Nodes (56): FailedReformulation, ensureClaudeBinary(), dispatchClaudeMessage(), gitMetadataWritableRoots(), agentBaseEnv(), bestInstalledMatch(), compareParts(), envWithProjectNode() (+48 more)

### Community 63 - "Community 63"
Cohesion: 0.16
Nodes (6): ProjectConfig, mapPrNotificationRow(), mapPrNotificationSyncRow(), SqlUpdateBuilder, PrNotification, PrNotificationSyncStatus

### Community 64 - "Composer Run Script"
Cohesion: 0.07
Nodes (51): NewPrdDocument, RenderPrdHtmlInput, orderSelectedTasks(), prdCardDrafts(), axisIdSchema, DUPLICATE_ITEMS_ISSUE, hasDuplicates(), identifierSchema (+43 more)

### Community 65 - "split.ts"
Cohesion: 0.40
Nodes (10): azureOrgUrl(), fromAzureSegments(), fromCollectionSegments(), fromLegacySegments(), fromSshSegments(), parseAzureRepoRef(), parseRemoteLocation(), RemoteLocation (+2 more)

### Community 66 - "prUrl.ts"
Cohesion: 0.20
Nodes (7): AZURE_COMMANDS, COMMANDS_BY_PROVIDER, GITHUB_COMMANDS, PrDiffContext, VcsCleanCommands, AZ_SETTLED_THREAD_STATUSES, VCS_PROVIDER_LABELS

### Community 67 - "TerminalView.tsx"
Cohesion: 0.09
Nodes (13): active, COMPLETION_FREQUENCIES, ensureNotificationPermission(), getAudioContext(), getStoredSoundEnabled(), isSupported(), playNotificationSound(), playTones() (+5 more)

### Community 68 - "schema.test.ts"
Cohesion: 0.11
Nodes (35): dragKeys(), groupCountLabel(), groupSortId(), ListGroup, ProjectList(), ProjectListRowProps, projectSortId(), SortableProjectGroup() (+27 more)

### Community 69 - "reviewFindings.ts"
Cohesion: 0.13
Nodes (17): prepareQualityCriteria(), PrepareQualityCriteriaOptions, QUALITY_CONTEXT_FILES, repositoryContext(), deniedCommandShape(), QUALITY_NATIVE_DENIED_TOOLS, QualityObservation, QualityPermissionDiagnostic (+9 more)

### Community 70 - "CodexRuntimeStatus"
Cohesion: 0.18
Nodes (17): COLUMN_SORT_FIELD, BoardColumn(), compareFamilyMembers(), familyKeyOf(), groupTicketIds(), groupTicketsByFamily(), isSplitMother(), readCollapsed() (+9 more)

### Community 71 - "PostCSS Config"
Cohesion: 0.29
Nodes (6): name, overrides, zod, private, type, version

### Community 72 - ".publishReviewUnderRepoLock"
Cohesion: 0.05
Nodes (52): safeJsonParse(), escapeHtml(), renderCollapsedDetails(), renderOutsideDiffComment(), renderOutsideDiffSection(), ReviewPublicationComment, ReviewPublicationEvent, azureChangeEntrySchema (+44 more)

### Community 73 - "TerminalView.tsx"
Cohesion: 0.10
Nodes (30): candidatesFor(), CardCandidate, CardsPanel(), pluralCards(), splitDescription(), buildThread(), ConversationPanel(), researchSummary() (+22 more)

### Community 74 - "button.tsx"
Cohesion: 0.06
Nodes (50): ORCHESTRATORS, Capabilities, availableSkillProviders(), expectedSkillPaths(), HOST_SKILL_ROOTS, missingSkillProviders(), SKILL_REQUIREMENTS, SKILL_TIERS (+42 more)

### Community 75 - ".handleRequest"
Cohesion: 0.13
Nodes (12): QualityCriteriaSnapshot, QualityRunPhase, TicketQuality, formatQualityCriterionText(), formatQualityEvidenceSummary(), formatQualityGateMessage(), formatQualityMessage(), QUALITY_FAILURE_LABELS (+4 more)

### Community 76 - "usePrdSearch.ts"
Cohesion: 0.20
Nodes (17): qualityErrorMessage(), browserToolName(), preflightQualityBrowser(), QUALITY_BROWSER_TOOLS, QUALITY_DISABLED_BROWSER_TOOLS, QUALITY_OBSERVATION_TOOLS, QUALITY_REPOSITORY_TOOLS, qualityBrowserServer() (+9 more)

### Community 78 - "csv.ts"
Cohesion: 0.05
Nodes (26): dryRunLog, fakeEncoder, fakeMissingKey(), hexToBytes(), NOTE: same dry-run stance as checkClaudeAvailable: every skill reported installe, formatProjectLabel(), GitWorktreeAddOptions, PaneSize (+18 more)

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
Cohesion: 0.14
Nodes (16): StatEmpty(), ACTIVE_BAR, AREA_CURSOR, AXIS_PROPS, BAR_CURSOR, CHART_PALETTE, colorAt(), DurationBars() (+8 more)

### Community 86 - "vcsCommands.ts"
Cohesion: 0.27
Nodes (4): configFingerprint(), fingerprint(), QualityManager, sourceFingerprint()

### Community 87 - "atelier.ts"
Cohesion: 0.15
Nodes (14): ActiveQualityRun, CHECK_RUNNERS, CheckCommand, DATABASE_ISOLATION_PLACEHOLDERS, databaseIsolationProblem(), environmentFor(), log, QualityManagerDependencies (+6 more)

### Community 89 - "usePrdSearch.ts"
Cohesion: 0.17
Nodes (13): projectConfigSchema, buildAppSettingsPatch(), LegacyConfig, legacyConfigSchema, LegacyModels, log, migrateConfigJsonIfPresent(), parseLegacyConfig() (+5 more)

### Community 90 - "Profile"
Cohesion: 0.23
Nodes (13): isProcessing(), ACTIVE_STAGES, COLUMN_ORDER, COLUMNS, ACTIVE_COLUMNS, Board(), BoardProps, isColumn() (+5 more)

### Community 91 - "createCodexAgentSession"
Cohesion: 0.08
Nodes (23): Activation and retest, Baseline evidence and future acceptance needs, Behavior observed at the base revision, Capability and provider matrix, Checks and evidence, Criteria, providers, and delivery, Current follow-up state — 2026-10-03, Earlier design and feasibility history (+15 more)

### Community 92 - "TerminalSessionManager"
Cohesion: 0.12
Nodes (15): 1. Register the associated repositories once, 2. Prepare the common isolated workspace, 3. Plan automatically, then implement, 4. Start the application from its instructions, 5. Validate and repair in the retained workspace, 6. Deliver one feature result, End-to-end flow, First acceptance scenarios (+7 more)

### Community 93 - "ColumnActionsMenu.tsx"
Cohesion: 0.25
Nodes (7): Azure DevOps support — state file, Decisions (validated by the owner, 2026-09-21), Goal, Known blockers for lots 3 and 4, Open questions, Progress, Verified on this machine (az 2.90.0, azure-devops 1.0.8)

### Community 94 - ".addComment"
Cohesion: 0.07
Nodes (36): DEFAULT_MODELS, AttachExecutionSessionInput, AutomationPatch, EnqueueAgentMessageInput, FinalizeExecutionInput, MarkAgentMessageAcceptedInput, MarkAgentMessageReceivedInput, MarkAgentMessageRejectedInput (+28 more)

### Community 95 - "TicketConfigSummary.tsx"
Cohesion: 0.50
Nodes (3): appBundle, EMBEDDED_BINARIES, resourcesApp

### Community 97 - "Column"
Cohesion: 0.18
Nodes (12): CompactTicket, ListTicketsInput, Column, COLUMN_LABELS, BoardColumnProps, DEFAULT_OPEN, NOTE: an expanded column already owns the droppable id through its lane; registe, TerminalColumnsPanel() (+4 more)

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
Cohesion: 0.11
Nodes (19): CodexAppServerInitializationError, threadConfig(), accountResponseSchema, hasExplicitCodexApiKey(), isProtocolIncompatibility(), listRuntimeModels(), modelListResponseSchema, modelSchema (+11 more)

### Community 102 - "delegationManager.test.ts"
Cohesion: 0.21
Nodes (10): CHILD_USAGE, FULL_REVIEW_KINDS, LIGHT_REVIEW_KINDS, newDelegatedTicket(), newReviewTicket(), RecordedSession, sleep(), startAndApproveReviews() (+2 more)

### Community 103 - "recordOutcome"
Cohesion: 0.21
Nodes (13): FAILURE_COLUMNS, SUCCESS_COLUMNS, OutcomeChart(), SuccessRateChart(), ThroughputChart(), nextWeek(), outcomeCounts(), projectCounts() (+5 more)

### Community 104 - "mcpSettings.ts"
Cohesion: 0.22
Nodes (4): McpTokenSource, createMcpSettingsController(), McpSettingsControllerDependencies, temporaryDirectories

### Community 105 - "createMcpServer"
Cohesion: 0.09
Nodes (23): $ref, $ref, $ref, minLength, type, minLength, type, enum (+15 more)

### Community 106 - "usePrdSearch.ts"
Cohesion: 0.11
Nodes (18): ANSI, appendToLogFile(), COLOR_ENABLED, disableFileLogging(), initLogFile(), isLevel(), Level, LEVEL_ORDER (+10 more)

### Community 107 - "TicketCost.tsx"
Cohesion: 0.24
Nodes (9): CostSummary(), MetaRow(), MetaRowProps, TicketCost(), TicketCostProps, formatTokens(), formatUsd(), TOKEN_FORMATTER (+1 more)

### Community 108 - "WorkflowView.tsx"
Cohesion: 0.09
Nodes (22): axes, designConsiderations, goals, id, locale, openQuestions, outOfScope, preDraft (+14 more)

### Community 110 - "createCodexAgentSession"
Cohesion: 0.22
Nodes (4): createCodexAgentSession(), inheritedMcpServerNames(), PreparedHook, prepareSkills()

### Community 111 - "uploads.ts"
Cohesion: 0.08
Nodes (17): CodexAppServerConnection, CodexAppServerNotification, CodexAppServerOptions, CodexAppServerProtocolError, connectCodexAppServer(), incomingSchema, initializeResponseSchema, log (+9 more)

### Community 112 - "useSavedFlash.ts"
Cohesion: 0.35
Nodes (10): getSnapshot(), INITIAL_SNAPSHOT, loadReviewCounts(), publish(), refreshReviewCounts(), reviewIdentity(), startRefreshing(), subscribe() (+2 more)

### Community 113 - "PreparedHook"
Cohesion: 0.29
Nodes (10): AppearanceSettings(), useTheme(), UseThemeResult, applyTheme(), getStoredTheme(), isTheme(), Theme, ThemeOption (+2 more)

### Community 114 - "ApiDenyPatterns"
Cohesion: 0.06
Nodes (13): startFeasibilityTicket(), mapAgentMessageRow(), mapAutomationRunRow(), mapQualityCriteriaSnapshotRow(), mapQualityValidationRunRow(), serializeErrorDetails(), Store, runRecordedAction() (+5 more)

### Community 115 - "useSuppressEscapeBeep.ts"
Cohesion: 0.29
Nodes (6): additionalProperties, $id, required, $schema, title, type

### Community 116 - "settings.tsx"
Cohesion: 0.05
Nodes (50): COMMIT_LANGUAGES, McpSettings(), DragHandleAttributes, DragHandleListeners, ProfileRowHeader(), ProfileRowProps, ProfilesSettings(), NOTE: the saved flag lives here because a saved row remounts (its key carries up (+42 more)

### Community 117 - "bootstrap.ts"
Cohesion: 0.36
Nodes (5): applyDesktopEnv(), DesktopRoots, ensureMcpToken(), regenerateMcpToken(), temporaryDirectories

### Community 118 - "properties"
Cohesion: 0.15
Nodes (16): CODEX_LAUNCH_STATUS_MESSAGES, CodexCapabilityReader, ExecutionOverrides, FEASIBILITY_ENGINE_EXECUTION, resolveExecution(), resolveFeasibilityExecution(), resolveTicketExecution(), READY_CODEX (+8 more)

### Community 119 - "AgentMessage"
Cohesion: 0.11
Nodes (19): items, maxItems, minItems, type, uniqueItems, $ref, axes, requirements (+11 more)

### Community 120 - "ProjectPanel.tsx"
Cohesion: 0.11
Nodes (17): Agent session (server), Architecture decisions, Atelier (conversation → PRD → cards) — implementation state, Contract injection, Follow-ups noticed in Lot A, Goal, Lot A public API (use these names in Lots B and C), Lot B public surface and deviations (read before Lot C/D) (+9 more)

### Community 121 - "VcsConnectionResult"
Cohesion: 0.33
Nodes (6): CodexBinaryVersionError, require, resolveCodexBinary(), resolveCodexBinaryOverride(), TARGETS, verifyCodexBinaryVersion()

### Community 122 - "TicketOperationError"
Cohesion: 0.08
Nodes (21): log, ReclaimOutcome, SETUP_PHASES, SlotManagerConfig, resolveTemplatePaths(), TemplatePaths, log, SlotWatch (+13 more)

### Community 123 - "StatCard.tsx"
Cohesion: 0.10
Nodes (26): ProjectInfo, StatRecord, AgentsViewProps, AskPanelProps, ComposeState, CardsPanelProps, NewConversationFormProps, CleanPrPanelProps (+18 more)

### Community 124 - "useSavedFlash.ts"
Cohesion: 0.14
Nodes (11): CodexAppServerRpcError, canonicalJson(), CodexCommandHook, codexSessionPreToolUseHookHash(), JsonValue, createCodexProvider(), AppServerFixtureOptions, hookPathForSession() (+3 more)

### Community 125 - "codexCommandPolicy.ts"
Cohesion: 0.50
Nodes (6): CODEX_VALIDATOR_READ_ALLOW, isCodexReadOnlyRgNoMatchCommand(), matchesCodexBashAllowlist(), isQualityRepositoryPath(), qualityReadScopeAllows(), qualityReadToolAllowed()

### Community 126 - "TicketOperations"
Cohesion: 0.10
Nodes (19): defaultProjectLookup(), assertExecutionAvailable(), groupFeasibilityTickets(), assertCodexImplementerAvailable(), featureBranch(), slotPath(), slugify(), computeWorktreeAddresses() (+11 more)

### Community 127 - "TerminalSessionManager"
Cohesion: 0.13
Nodes (16): nonEmptyStringArray, stringArray, items, type, uniqueItems, minLength, pattern, type (+8 more)

### Community 128 - "contract.test.ts"
Cohesion: 0.09
Nodes (18): mapCommentRow(), mapProfileRow(), nullableBooleanValue(), agentPairError(), createApiRoutes(), isBlocked(), isSplitMother(), isWebOnlyPath() (+10 more)

### Community 129 - "csv.ts"
Cohesion: 0.33
Nodes (6): RFC-4180, CsvParseError, normalizeHeader(), ParsedTicketRow, ParsedTicketsCsv, parseTicketsCsv()

### Community 130 - ".createTodoTicket"
Cohesion: 0.13
Nodes (11): listProjectKeys(), createMcpServer(), invalidInput(), listPublicProjects(), OutputValidator, PublicMcpManager, toolError(), toolResult() (+3 more)

### Community 131 - "useProjects.ts"
Cohesion: 0.47
Nodes (5): COLUMN_NODE_COLOR, depthOf(), truncate(), WorkflowView(), WorkflowViewProps

### Community 133 - "uploads.ts"
Cohesion: 0.40
Nodes (5): MIME_EXTENSIONS, resolveExtension(), SavedUpload, saveUpload(), serveUpload()

### Community 134 - "id"
Cohesion: 0.15
Nodes (14): additionalProperties, properties, required, type, axis, id, maxLength, pattern (+6 more)

### Community 135 - "performSplit"
Cohesion: 0.60
Nodes (4): createSplitChildren(), failSplitMother(), performSplit(), splitMotherBranch()

### Community 137 - "ResearchOptions"
Cohesion: 0.67
Nodes (3): AtelierSessionInput, ResearchOptions, ResearchFieldsProps

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
- **1005 isolated node(s):** `Current follow-up state — 2026-10-03`, `Activation and retest`, `Earlier design and feasibility history`, `Historical verified automatic workflow follow-up — baseline f8d056f`, `Historical exact-ticket Claude timeout — before the corrective retry` (+1000 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Ticket` connect `NPM Scripts` to `Contract Building & Slots`, `Desktop Bootstrap & Menus`, `Feasibility Batch Management`, `useProjects.ts`, `Shared Zod Schemas`, `reformulate.ts`, `PR Selection & Slots Bar`, `Slot Config & Worktree Watch`, `Core Domain Concepts`, `Real System Adapter`, `Live Terminal Views`, `Dev Dependencies`, `TypeScript Config`, `Client Hub & Watchdog`, `Agents View & Ticket Cards`, `PRD Review & Markdown`, `Agent Profile Config`, `API Client Inputs`, `Ticket Config & Constants`, `Modal Dialogs`, `Community 48`, `Slot State`, `Stats Hooks & Cards`, `repairPath.ts`, `triageManager.ts`, `TerminalView.tsx`, `CodexRuntimeStatus`, `TerminalView.tsx`, `vcsCommands.ts`, `atelier.ts`, `Profile`, `.addComment`, `Column`, `delegationManager.test.ts`, `TicketCost.tsx`, `ApiDenyPatterns`, `properties`, `TicketOperationError`, `StatCard.tsx`, `TicketOperations`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **Why does `SystemAdapter` connect `Slot State` to `Ticket Action Panels`, `Shared Zod Schemas`, `Settings & Profiles UI`, `Stats Aggregation`, `Dev Dependencies`, `Cost & Pricing`, `NPM Scripts`, `API Client Inputs`, `Ticket Detail & Triage UI`, `Demo Pipeline Concepts`, `Community 51`, `CSV Parsing`, `Package Manifest`, `TicketCard.tsx`, `csv.ts`, `atelier.ts`, `properties`, `TicketOperationError`, `TicketOperations`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Why does `Store` connect `ApiDenyPatterns` to `contract.test.ts`, `Contract Building & Slots`, `Ticket Action Panels`, `Shared Zod Schemas`, `PR Selection & Slots Bar`, `Stats Aggregation`, `DB Row Schemas & Mappers`, `Dev Dependencies`, `Client Hub & Watchdog`, `Cost & Pricing`, `User Terminal & Fake IO`, `NPM Scripts`, `Runtime Dependencies`, `Agent Profile Config`, `API Client Inputs`, `Demo Pipeline Concepts`, `Modal Dialogs`, `Community 48`, `Slot State`, `CSV Parsing`, `Package Manifest`, `Community 63`, `vcsCommands.ts`, `atelier.ts`, `usePrdSearch.ts`, `.addComment`, `delegationManager.test.ts`, `TriageManager`, `properties`, `TicketOperationError`, `TicketOperations`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `createApiRoutes()` (e.g. with `.ticket()` and `isWebOnlyPath()`) actually correct?**
  _`createApiRoutes()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Current follow-up state — 2026-10-03`, `Activation and retest`, `Earlier design and feasibility history` to the rest of the system?**
  _1017 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Contract Building & Slots` be split into smaller, more focused modules?**
  _Cohesion score 0.02211166390270868 - nodes in this community are weakly interconnected._
- **Should `Terminals UI & Notifications` be split into smaller, more focused modules?**
  _Cohesion score 0.09113300492610837 - nodes in this community are weakly interconnected._