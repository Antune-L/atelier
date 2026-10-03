# Graph Report - kanban-agents  (2026-10-03)

## Corpus Check
- 326 files · ~822,916 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 4222 nodes · 12642 edges · 146 communities (129 shown, 17 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 112 edges (avg confidence: 0.7)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `127b8530`
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
- dialog.tsx
- isProcessing
- codexBinary.ts
- $defs
- isNotionUrl
- title
- preDraft

## God Nodes (most connected - your core abstractions)
1. `Store` - 182 edges
2. `Ticket` - 126 edges
3. `SystemAdapter` - 96 edges
4. `cn()` - 96 edges
5. `createApiRoutes()` - 88 edges
6. `FakeSystemAdapter` - 85 edges
7. `RealSystemAdapter` - 81 edges
8. `getErrorMessage()` - 72 edges
9. `SlotManager` - 71 edges
10. `Orchestrator` - 63 edges

## Surprising Connections (you probably didn't know these)
- `McpSettingsClient` --references--> `McpSettingsMetadata`  [EXTRACTED]
  src/web/src/lib/mcpSettings.ts → desktop/mcpRpc.ts
- `main()` --calls--> `assertCodexDowngradeSafe()`  [EXTRACTED]
  scripts/downgrade-codex-catalog.ts → src/server/db/schema.ts
- `main()` --calls--> `migrateCodexCatalog()`  [EXTRACTED]
  scripts/downgrade-codex-catalog.ts → src/server/db/schema.ts
- `RecordedSession` --references--> `AgentSessionOptions`  [EXTRACTED]
  src/server/agents/delegationManager.test.ts → src/server/system/agentSession.ts
- `ActiveReviewPass` --references--> `ResolvedExecution`  [EXTRACTED]
  src/server/agents/delegationManager.ts → src/server/agents/executionConfig.ts

## Import Cycles
- 3-file cycle: `src/server/config.ts -> src/server/db/store.ts -> src/server/db/rows.ts -> src/server/config.ts`
- 3-file cycle: `src/server/agents/worktreeAddresses.ts -> src/server/config.ts -> src/server/db/store.ts -> src/server/agents/worktreeAddresses.ts`

## Communities (146 total, 17 thin omitted)

### Community 0 - "Contract Building & Slots"
Cohesion: 0.03
Nodes (97): ActionExecutionOptions, actionExecutionOptionsSchema, agentMessageSchema, AnalyzeTicketsInput, appSettingsSchema, automationRunSchema, automationSchema, baseBranchSchema (+89 more)

### Community 1 - "Terminals UI & Notifications"
Cohesion: 0.10
Nodes (20): analyzeTicketsInputSchema, analyzeTicketsOutputSchema, columnSchema, compactTicketSchema, createTodoTicketOutputSchema, editableTicketSchema, listProjectsInputSchema, listProjectsOutputSchema (+12 more)

### Community 2 - "Desktop Bootstrap & Menus"
Cohesion: 0.05
Nodes (56): resolveBaseBranch(), startFeasibilityTicket(), assertExecutionAvailable(), CODEX_LAUNCH_STATUS_MESSAGES, CodexCapabilityReader, ExecutionOverrides, FEASIBILITY_ENGINE_EXECUTION, ResolvedExecution (+48 more)

### Community 3 - "Feasibility Batch Management"
Cohesion: 0.06
Nodes (58): isProcessing(), ACTIVE_STAGES, TriageVerdict, AgentCard(), AgentCardProps, AgentsView(), hasLiveAgent(), normalize() (+50 more)

### Community 4 - "Ticket Action Panels"
Cohesion: 0.12
Nodes (27): ExecutionFinishStatus, LiveSession, log, PendingSessionMessage, previewToolInput(), renderChannelEvent(), renderImplementationDone(), renderSessionEvent() (+19 more)

### Community 5 - "Fake System Adapter"
Cohesion: 0.08
Nodes (23): axisIdSchema, DUPLICATE_ITEMS_ISSUE, hasDuplicates(), identifierSchema, isUnique(), nonEmptyTextArraySchema, PRD_LOCALES, PRD_REQUIREMENT_KINDS (+15 more)

### Community 6 - "Shared Zod Schemas"
Cohesion: 0.05
Nodes (36): sshHostFromRemoteUrl(), extractPrUrl(), fetchGithubOpenPrs(), ghAuthenticatedUserSchema, ghPrHeadSchema, ghPrSchema, ghPrStateSchema, ghRequestedPullPagesSchema (+28 more)

### Community 7 - "Settings & Profiles UI"
Cohesion: 0.06
Nodes (7): delay(), fakeShellPrompt(), FakeSystemAdapter, ReviewDoneOptions, ValidationCommandOptions, ValidationDependencyResult, WorktreeSetupOptions

### Community 8 - "PR Selection & Slots Bar"
Cohesion: 0.06
Nodes (52): main(), scalar(), CLAUDE_CONVERSATION, closers, CODEX_CONVERSATION, setup(), TEMPLATE_PATH, TURN_END (+44 more)

### Community 9 - "Real System Adapter"
Cohesion: 0.04
Nodes (53): FailedReformulation, AgentProvider, gitMetadataWritableRoots(), agentBaseEnv(), bestInstalledMatch(), compareParts(), envWithProjectNode(), nvmNodeBinDir() (+45 more)

### Community 10 - "Slot Config & Worktree Watch"
Cohesion: 0.05
Nodes (65): COLUMN_ORDER, Comment, PrdAnnotator(), ProjectPrPickerProps, ProjectSelectProps, PrSelectRow(), StatsView(), StatsViewProps (+57 more)

### Community 11 - "Core Domain Concepts"
Cohesion: 0.03
Nodes (67): agentMessageRowSchema, AutomationRow, automationRowSchema, AutomationRunRow, automationRunRowSchema, buildScripts(), CommentRow, commentRowSchema (+59 more)

### Community 12 - "Board & Sidebar Layout"
Cohesion: 0.10
Nodes (15): analyzeResultSchema, compactTicketSchema, createResultSchema, errorResultSchema, ISOLATED_ENV_KEYS, projectResultSchema, savedEnv, startResultSchema (+7 more)

### Community 13 - "Database Store Operations"
Cohesion: 0.18
Nodes (24): projectMatches(), ProjectsSettings(), readShowHidden(), referenceCommitTimeout(), writeShowHidden(), groupReviewCount(), initialExpandedGroups(), projectInitial() (+16 more)

### Community 14 - "Coordinator & Protocol"
Cohesion: 0.08
Nodes (47): ORCHESTRATOR_LABELS, ManualQualityEvidenceInput, QualityCriteriaSnapshot, QualityCriterion, QualityGate, QualityRunPhase, QualityRunStatus, CREATOR_LABELS (+39 more)

### Community 15 - "API Routes & Reformulate"
Cohesion: 0.10
Nodes (30): logRejection(), bashCommandSchema, buildSettings(), claudeProvider, createSdkAgentSession(), denyBashHook(), denyNoVerifyHook, denyReviewPublishingHook (+22 more)

### Community 16 - "Stats Aggregation"
Cohesion: 0.12
Nodes (3): startParentSession(), SessionHubHandlers, SessionStartCallbacks

### Community 17 - "Triage & Server Hub"
Cohesion: 0.08
Nodes (25): devDependencies, autoprefixer, class-variance-authority, clsx, concurrently, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities (+17 more)

### Community 18 - "Live Terminal Views"
Cohesion: 0.07
Nodes (33): ATELIER_WEB_TOOLS, AZURE_BASH_ALLOWLIST, AZURE_CLEAN_BASH_ALLOWLIST, BASH_ALLOWLIST, bashAllowlist(), buildImplementSessionConfig(), CODEX_READONLY_TOOLS, codexKnobs() (+25 more)

### Community 19 - "Stage Progress & Display"
Cohesion: 0.08
Nodes (24): compilerOptions, allowImportingTsExtensions, baseUrl, esModuleInterop, isolatedModules, jsx, lib, module (+16 more)

### Community 20 - "Real Adapter GH/Composer"
Cohesion: 0.11
Nodes (24): CODEX_EFFORT_LABELS, FAILURE_COLUMNS, Kind, KINDS, OutcomeChart(), SuccessRateChart(), ThroughputChart(), effectiveWorkDurationMs() (+16 more)

### Community 21 - "Store Types & Agent Knobs"
Cohesion: 0.08
Nodes (83): agent_context_html(), agent_entry_count(), axes_html(), axis_anchor(), axis_head_html(), axis_items(), axis_section_html(), axis_statuses() (+75 more)

### Community 22 - "DB Row Schemas & Mappers"
Cohesion: 0.06
Nodes (39): formatPrdDocumentIssues(), log, ToolHandler, ToolResult, TRIAGE_VERDICTS, AgentSettableStage, agentSettableStageSchema, askUserArgsSchema (+31 more)

### Community 23 - "Dev Dependencies"
Cohesion: 0.12
Nodes (18): AtelierSessionInput, RESEARCH_OPTION_KEYS, RESEARCH_OPTION_LABELS, ResearchOptionKey, ResearchOptions, researchOptionsFromKeys(), isResearchOptionKey(), ResearchFields() (+10 more)

### Community 24 - "TypeScript Config"
Cohesion: 0.08
Nodes (34): availableSkillProviders(), missingSkillProviders(), App(), HOME_VIEW_OPTIONS, HomeView, SkillsSettings(), NAV_ENTRIES, NavEntry (+26 more)

### Community 26 - "Cost & Pricing"
Cohesion: 0.10
Nodes (18): buildAtelierConsolidateTurn(), buildAtelierPrompt(), buildAtelierRegenerationTurn(), buildAuthoringRules(), buildFraming(), buildHistory(), buildResearch(), buildRole() (+10 more)

### Community 27 - "Workflow View & Lifecycle"
Cohesion: 0.05
Nodes (32): Architecture, Commands, Conventions (enforced — beyond the global ones in ~/.claude/CLAUDE.md), graphify, The dry-run safety model — read before running anything, What this is, Agent runtime, Architecture (+24 more)

### Community 28 - "Stats Charts"
Cohesion: 0.07
Nodes (44): AgentMcpServerDefinition, codexCommandPolicyScript(), agentMessageDeltaSchema, agentToml(), apiWriteDenyScript(), buildMcpServers(), ConfigObject, configReadResponseSchema (+36 more)

### Community 29 - "Session Hub & Agent Session"
Cohesion: 0.06
Nodes (42): AUTOMATION_TRIGGER_LABELS, AUTOMATION_TRIGGERS, COLUMN_LABELS, PRD_SPLIT_MODE_LABELS, PRD_SPLIT_MODES, candidatesFor(), CardCandidate, CardsPanel() (+34 more)

### Community 31 - "PRD Review & Markdown"
Cohesion: 0.04
Nodes (69): ActiveReviewPass, BOARD_FINDING_RENDER_STYLE, implementationScopesOverlap(), log, normalizeImplementationScope(), orderedReviewKinds(), renderCollapsedFinding(), renderFinding() (+61 more)

### Community 32 - "User Terminal & Fake IO"
Cohesion: 0.20
Nodes (17): qualityErrorMessage(), browserToolName(), preflightQualityBrowser(), QUALITY_BROWSER_TOOLS, QUALITY_DISABLED_BROWSER_TOOLS, QUALITY_OBSERVATION_TOOLS, QUALITY_REPOSITORY_TOOLS, qualityBrowserServer() (+9 more)

### Community 33 - "Logging"
Cohesion: 0.10
Nodes (21): scripts, build:desktop, build:web, dev, dev:desktop, dev:proxy, dev:server, dev:web (+13 more)

### Community 34 - "Board Columns"
Cohesion: 0.13
Nodes (23): ActiveDelegation, AppliedPath, copyDependencies(), copyPath(), DelegationWorkspace, ensureParentDirectory(), FileState, git() (+15 more)

### Community 35 - "NPM Scripts"
Cohesion: 0.15
Nodes (9): addUsageByModel(), toUsageByModel(), stalledEventPayload(), TicketLifecycle, TERMINAL_STAGES, ErrorDetailsSource, Ticket, TerminalTab() (+1 more)

### Community 36 - "Runtime Dependencies"
Cohesion: 0.08
Nodes (27): ARTIFACT_CONTENT_TYPES, QualityRouteDeps, manualQualityEvidenceSchema, nonEmptyTextSchema, projectValidationSchema, qualityCriteriaSnapshotSchema, qualityCriterionSchema, qualityEnvironmentSchema (+19 more)

### Community 37 - "Claude SDK Provider"
Cohesion: 0.09
Nodes (22): dependencies, @anthropic-ai/claude-agent-sdk, dompurify, elysia, @fontsource/ibm-plex-mono, @fontsource/ibm-plex-sans, marked, @modelcontextprotocol/sdk (+14 more)

### Community 38 - "Agent Profile Config"
Cohesion: 0.16
Nodes (15): costByFamily(), costOf(), costOfModel(), costOfSessions(), CostSummary, FamilyPricing, MODEL_PRICING, ModelFamily (+7 more)

### Community 39 - "Agent Coordinator Handlers"
Cohesion: 0.09
Nodes (29): artifactPath, assertPackageVersionInSync(), assertSdkVersionsInSync(), BUILT_DMG, ELECTROBUN_BIN, fail(), installedPackageVersion(), RELEASE_FOLDER (+21 more)

### Community 40 - "API Client Inputs"
Cohesion: 0.14
Nodes (4): childTranscriptPrefix(), DelegationManager, reviewKey(), mergeAgentUsageByModel()

### Community 41 - "Ticket Config & Constants"
Cohesion: 0.21
Nodes (14): ManagedProject, dragKeys(), groupCountLabel(), groupSortId(), ListGroup, ProjectList(), ProjectListProps, ProjectListRowProps (+6 more)

### Community 42 - "Ticket Detail & Triage UI"
Cohesion: 0.11
Nodes (5): ActionSystem, PaneReader, CapabilityCache, ImportNotionOptions, CodexRuntimeStatus

### Community 43 - "Demo Pipeline Concepts"
Cohesion: 0.10
Nodes (31): RepoInspectionSource, CreateProjectInput, UpdateProjectInput, vcsProviderSchema, ConnectionHint, CreateStep, isPositiveIntegerString(), isValidDraft() (+23 more)

### Community 44 - "Chart Primitives"
Cohesion: 0.28
Nodes (13): abortReason(), computeCodeFingerprint(), FingerprintEntry, FingerprintPhase, hashFingerprintPaths(), isMissingFileError(), listFingerprintPaths(), log (+5 more)

### Community 45 - "Session Hub Transcript"
Cohesion: 0.07
Nodes (34): DEFAULT_MODELS, mapQualityEvidenceRow(), mapTicketCreationRequestRow(), mapWorktreeSessionRow(), AttachExecutionSessionInput, CreateQualityIterationInput, EnqueueAgentMessageInput, enrichWorktreeSession() (+26 more)

### Community 46 - "Community 46"
Cohesion: 0.27
Nodes (15): Agent Implementation Config, Argus Code Review, Automated Tests (typecheck/lint/test), Claude Code Autonomous Agent, Ticket Contract Injection, Feasibility Analysis, Kanban Board (Atelier), Kanban Agents Demo (demo.gif) (+7 more)

### Community 47 - "Modal Dialogs"
Cohesion: 0.11
Nodes (42): defaultProjectLookup(), buildAskContract(), buildCleanContract(), buildConflictResolutionContract(), buildFeasibilityBatchContract(), buildFeasibilityContextSection(), buildImplementingSteps(), buildMockupReviewStep() (+34 more)

### Community 48 - "Community 48"
Cohesion: 0.10
Nodes (18): TicketCreationRequestConflictError, AnalyzeTicketRejectionReason, AnalyzeTicketsResult, CreateTodoTicketInput, createTodoTicketInputSchema, CreateTodoTicketResult, isActive(), isBlocked() (+10 more)

### Community 49 - "Slot State"
Cohesion: 0.06
Nodes (30): log, log, ReformulateManager, SessionHub, log, Watchdog, ClientHub, ClientSocket (+22 more)

### Community 50 - "Stats Hooks & Cards"
Cohesion: 0.18
Nodes (8): featureBranch(), slugify(), mapSlotRow(), createSplitChildren(), failSplitMother(), performSplit(), splitMotherBranch(), Slot

### Community 51 - "Community 51"
Cohesion: 0.08
Nodes (4): RealSystemAdapter, DoneGateResult, PrepareReviewWorktreeOptions, VcsProvider

### Community 52 - "repairPath.ts"
Cohesion: 0.06
Nodes (36): Block, blockText(), compactChunks(), firstCharCode(), TranscriptBuffer, trimBlockStart(), AgentStreamBlock, terminalServerMessageSchema (+28 more)

### Community 53 - "User Terminal Manager"
Cohesion: 0.33
Nodes (5): CONTEXT — domain glossary, Execution, Proposed (not yet built), Seams, Work items

### Community 54 - "Community 54"
Cohesion: 0.12
Nodes (11): CapturingSystem, AckSystem, ActiveReview, ClosableExecution, RecordingSystem, RecordedSession, RecordingSystem, RelaunchSystem (+3 more)

### Community 55 - "App.tsx"
Cohesion: 0.21
Nodes (3): FeasibilityBatchManager, toTriageResult(), FeasibilityResult

### Community 56 - "CSV Parsing"
Cohesion: 0.11
Nodes (20): inheritedMcpServerNames(), prepareSkills(), threadConfig(), accountResponseSchema, hasExplicitCodexApiKey(), isProtocolIncompatibility(), listRuntimeModels(), modelListResponseSchema (+12 more)

### Community 57 - "Community 57"
Cohesion: 0.14
Nodes (11): directories, initializeParamsSchema, log, requestSchema, rpcError(), rpcResult(), rpcResponseSchema, toolCallParamsSchema (+3 more)

### Community 58 - "File Uploads"
Cohesion: 0.16
Nodes (12): ChartConfig, ChartContainer, ChartContainerProps, ChartContext, ChartContextValue, ChartLegendContent(), ChartLegendContentProps, ChartTooltipContent() (+4 more)

### Community 59 - "triageManager.ts"
Cohesion: 0.12
Nodes (25): compileFeedback(), PrdAnnotation, prdAnnotationsSchema, FeedbackDraft, PrdAnnotatorProps, BREADCRUMB, NO_ANNOTATIONS, PrdReviewDialog() (+17 more)

### Community 60 - "Package Manifest"
Cohesion: 0.23
Nodes (4): AutomationManager, mapAutomationRow(), RouteDeps, Automation

### Community 61 - "splitManager.ts"
Cohesion: 0.40
Nodes (4): PR review counting and publication correction state, Progress, Scope and decisions, Verification

### Community 62 - "TicketCard.tsx"
Cohesion: 0.11
Nodes (23): commandOutputOrNull(), readPackageManifest(), resolveSshHostname(), buildRepoInspection(), formatProjectLabel(), hostnameFromSshConfig(), LOCKFILE_NAMES, LOCKFILE_RUNNERS (+15 more)

### Community 64 - "Composer Run Script"
Cohesion: 0.21
Nodes (23): axisTitle(), Block, bulletList(), heading(), joinBlocks(), labelledList(), LABELS, listOrNone() (+15 more)

### Community 65 - "split.ts"
Cohesion: 0.40
Nodes (10): azureOrgUrl(), fromAzureSegments(), fromCollectionSegments(), fromLegacySegments(), fromSshSegments(), parseAzureRepoRef(), parseRemoteLocation(), RemoteLocation (+2 more)

### Community 66 - "prUrl.ts"
Cohesion: 0.14
Nodes (21): ColumnActionsMenu(), ColumnActionsMenuProps, ColumnMenuItem, ActionContext, buildActions(), ConfirmSpec, errorMessage(), RETRY_STAGES (+13 more)

### Community 67 - "TerminalView.tsx"
Cohesion: 0.23
Nodes (9): dataMessage(), log, normalizeSeed(), send(), TerminalSocket, TerminalSocketData, visibleText(), terminalClientMessageSchema (+1 more)

### Community 68 - "schema.test.ts"
Cohesion: 0.33
Nodes (9): useTheme(), UseThemeResult, applyTheme(), getStoredTheme(), isTheme(), Theme, ThemeOption, THEMES (+1 more)

### Community 69 - "reviewFindings.ts"
Cohesion: 0.11
Nodes (24): prepareQualityCriteria(), PrepareQualityCriteriaOptions, QUALITY_CONTEXT_FILES, repositoryContext(), deniedCommandShape(), QUALITY_NATIVE_DENIED_TOOLS, QualityObservation, QualityPermissionDiagnostic (+16 more)

### Community 70 - "CodexRuntimeStatus"
Cohesion: 0.08
Nodes (39): CompactTicket, ListTicketsInput, Column, COLUMN_SORT_FIELD, COLUMNS, ACTIVE_COLUMNS, Board(), isColumn() (+31 more)

### Community 71 - "PostCSS Config"
Cohesion: 0.29
Nodes (6): name, overrides, zod, private, type, version

### Community 72 - ".publishReviewUnderRepoLock"
Cohesion: 0.06
Nodes (47): boundedCommandDetail(), BoundedCommandResult, runBoundedCommand(), safeJsonParse(), withJsonRequestFile(), ReviewPublicationEvent, azureChangeEntrySchema, azureCommentSchema (+39 more)

### Community 73 - "TerminalView.tsx"
Cohesion: 0.12
Nodes (24): ConversationStatus, AtelierAgentFields(), buildThread(), ConversationPanel(), researchSummary(), ThreadItem, LiveDot(), draftOf() (+16 more)

### Community 74 - "button.tsx"
Cohesion: 0.07
Nodes (40): Capabilities, expectedSkillPaths(), SKILL_TIERS, SkillTier, skillzerInstallCommand(), CodexConnectionStatus(), STATUS_LABELS, COPY_LABELS (+32 more)

### Community 76 - "usePrdSearch.ts"
Cohesion: 0.15
Nodes (6): CodexAppServerConnection, CodexAppServerNotification, CodexAppServerOptions, CodexProviderDependencies, AppServerFixture, CodexRuntimeDependencies

### Community 78 - "csv.ts"
Cohesion: 0.05
Nodes (21): RecordingSystemAdapter, renderOutsideDiffComment(), renderOutsideDiffSection(), PublishReviewOptions, PublishReviewResult, ReviewHeadResult, ReviewPublicationComment, ReviewPublicationState (+13 more)

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
Nodes (18): ACTIVE_BAR, AREA_CURSOR, AXIS_PROPS, BAR_CURSOR, CHART_PALETTE, colorAt(), DurationBars(), DurationDatum (+10 more)

### Community 86 - "vcsCommands.ts"
Cohesion: 0.20
Nodes (7): configFingerprint(), fingerprint(), QualityManager, sourceFingerprint(), QualityIteration, QualityValidationRun, TicketQuality

### Community 87 - "atelier.ts"
Cohesion: 0.11
Nodes (21): AtelierPromptInput, ACTIVITY_PROGRESS_KINDS, AssistantPart, AtelierManagerDeps, ConversationRuntime, log, SubmittedTurn, TOOL_DETAIL_KEYS (+13 more)

### Community 90 - "Profile"
Cohesion: 0.19
Nodes (10): CHILD_USAGE, FULL_REVIEW_KINDS, LIGHT_REVIEW_KINDS, newDelegatedTicket(), newReviewTicket(), RecordedSession, setup(), sleep() (+2 more)

### Community 91 - "createCodexAgentSession"
Cohesion: 0.07
Nodes (26): Activation and retest, Baseline evidence and future acceptance needs, Behavior observed at the base revision, Capability and provider matrix, Checks and evidence, Criteria, providers, and delivery, Current follow-up state — 2026-10-03, Current iteration work — 2026-10-03 (+18 more)

### Community 92 - "TerminalSessionManager"
Cohesion: 0.12
Nodes (15): 1. Register the associated repositories once, 2. Prepare the common isolated workspace, 3. Plan automatically, then implement, 4. Start the application from its instructions, 5. Validate and repair in the retained workspace, 6. Deliver one feature result, End-to-end flow, First acceptance scenarios (+7 more)

### Community 93 - "ColumnActionsMenu.tsx"
Cohesion: 0.25
Nodes (7): Azure DevOps support — state file, Decisions (validated by the owner, 2026-09-21), Goal, Known blockers for lots 3 and 4, Open questions, Progress, Verified on this machine (az 2.90.0, azure-devops 1.0.8)

### Community 94 - ".addComment"
Cohesion: 0.11
Nodes (55): ProjectKey, AutomationPatch, ConversationPatch, NewAsk, NewAutomation, NewClean, NewConversation, NewProfile (+47 more)

### Community 95 - "TicketConfigSummary.tsx"
Cohesion: 0.50
Nodes (3): appBundle, EMBEDDED_BINARIES, resourcesApp

### Community 97 - "Column"
Cohesion: 0.24
Nodes (9): CodexTierSummary(), DurationChart(), effectiveEffortLabel(), effectiveModelLabel(), meanDurationByEffort(), meanDurationByModel(), meanExecutionDuration(), summarizeCodexTiers() (+1 more)

### Community 98 - "usePrdSearch.ts"
Cohesion: 0.20
Nodes (9): AtelierDesktopRpcSchema, DesktopRequests, McpSettingsMetadata, McpTokenSource, WebviewRequests, McpSettingsController, createMcpSettingsClient(), getMcpSettingsClient() (+1 more)

### Community 99 - "reviewPublishingGuard.ts"
Cohesion: 0.07
Nodes (35): API_GUARDS, API_READ_METHOD_SET, ApiDenyPatterns, ApiGuard, AZ_INVOKE_COMMAND, AZ_INVOKE_METHOD_LONG_FLAGS, AZ_INVOKE_WRITE_INPUT_LONG_FLAGS, AZ_PR_WRITE_PATTERN (+27 more)

### Community 100 - ".startVerification"
Cohesion: 0.08
Nodes (25): $ref, $ref, enum, $ref, $ref, properties, designConsiderations, goals (+17 more)

### Community 101 - "codexProvider.test.ts"
Cohesion: 0.23
Nodes (16): buildContractConstraintsLines(), buildResponseFormatLines(), buildStrictRulesLines(), buildTicketLines(), buildTriageChannelPrompt(), buildTriagePlusChannelPrompt(), isEnglish(), readOnlyFramingLines() (+8 more)

### Community 102 - "delegationManager.test.ts"
Cohesion: 0.05
Nodes (41): ATTENTION_STATUSES, sessionOf(), SlotPips(), SlotPipsProps, STATUS_LABELS, STATUS_PIP_CLASSES, byCreatedAt(), byRevision() (+33 more)

### Community 104 - "mcpSettings.ts"
Cohesion: 0.22
Nodes (3): createMcpSettingsController(), McpSettingsControllerDependencies, temporaryDirectories

### Community 105 - "createMcpServer"
Cohesion: 0.09
Nodes (23): $ref, $ref, $ref, minLength, type, minLength, type, enum (+15 more)

### Community 106 - "usePrdSearch.ts"
Cohesion: 0.13
Nodes (10): appendToLogFile(), disableFileLogging(), initLogFile(), Logger, openLogStream(), paint(), rotateLogFile(), ScopedLogger (+2 more)

### Community 107 - "TicketCost.tsx"
Cohesion: 0.16
Nodes (17): isCodexFastServiceTier(), summarizeSessionCosts(), totalTokensOf(), totalTokensOfSessions(), SessionUsage, executionCosts(), executionTokens(), projectStatRecord() (+9 more)

### Community 108 - "WorkflowView.tsx"
Cohesion: 0.09
Nodes (22): axes, designConsiderations, goals, id, locale, openQuestions, outOfScope, preDraft (+14 more)

### Community 109 - "TriageManager"
Cohesion: 0.14
Nodes (11): CodexAppServerRpcError, canonicalJson(), CodexCommandHook, codexSessionPreToolUseHookHash(), JsonValue, createCodexProvider(), AppServerFixtureOptions, hookPathForSession() (+3 more)

### Community 110 - "createCodexAgentSession"
Cohesion: 0.15
Nodes (14): runFirstBootSetup(), applyAppSettingsToModels(), projectConfigSchema, buildAppSettingsPatch(), LegacyConfig, legacyConfigSchema, LegacyModels, log (+6 more)

### Community 111 - "uploads.ts"
Cohesion: 0.09
Nodes (18): CodexAppServerInitializationError, CodexAppServerProtocolError, connectCodexAppServer(), incomingSchema, initializeResponseSchema, log, PendingRequest, rpcErrorSchema (+10 more)

### Community 113 - "PreparedHook"
Cohesion: 0.38
Nodes (5): StatRecord, StatCard(), StatCardProps, StatEmpty(), UseStatsResult

### Community 114 - "ApiDenyPatterns"
Cohesion: 0.05
Nodes (30): mapAgentMessageRow(), mapAutomationRunRow(), mapCommentRow(), mapConversationMessageRow(), mapExecutionRunRow(), mapPrdDocumentRow(), mapPrNotificationRow(), mapPrNotificationSyncRow() (+22 more)

### Community 115 - "useSuppressEscapeBeep.ts"
Cohesion: 0.29
Nodes (6): additionalProperties, $id, required, $schema, title, type

### Community 116 - "settings.tsx"
Cohesion: 0.05
Nodes (56): COMMIT_LANGUAGES, ProfileConfig, DragHandleAttributes, DragHandleListeners, ProfileRowHeaderProps, ProfileRowProps, ProfilesSettings(), NOTE: the saved flag lives here because a saved row remounts (its key carries up (+48 more)

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
Cohesion: 0.06
Nodes (51): AGENT_EFFORT_FULL_LABELS, AGENT_EFFORT_LABELS, AGENT_MODEL_FULL_LABELS, AGENT_MODEL_LABELS, AUTOMATION_RUN_STATUSES, CODEX_EFFORT_FULL_LABELS, CODEX_MODEL_LABELS, COMMENT_AUTHORS (+43 more)

### Community 122 - "TicketOperationError"
Cohesion: 0.21
Nodes (10): PROJECT_ROOT, NewPrdDocument, PrdRenderError, RENDERER_RELATIVE_PATH, renderPrdHtml(), RenderPrdHtmlInput, resolvePrdRendererPath(), TEMPLATE_PATH (+2 more)

### Community 124 - "TicketOperations"
Cohesion: 0.19
Nodes (8): FeasibilityStarter, isProcessing(), normalizeCreateInput(), requestKeyConflictMessage(), ticketDependencyError(), TicketOperations, isAllowedAgentPair(), deriveTitleFromDescription()

### Community 125 - "useReviewCounts.ts"
Cohesion: 0.08
Nodes (55): RFC-4180, ProjectInfo, AgentsViewProps, AskPanel(), AskPanelProps, ComposeState, NewConversationForm(), NewConversationFormProps (+47 more)

### Community 126 - "TicketOperations"
Cohesion: 0.09
Nodes (8): SlotManager, slotPath(), resolveDataFile(), resolveServerPort(), startServer(), createSystemAdapter(), TicketOperationsDeps, NotificationSoundKind

### Community 127 - "TerminalSessionManager"
Cohesion: 0.13
Nodes (16): nonEmptyStringArray, stringArray, items, type, uniqueItems, minLength, pattern, type (+8 more)

### Community 128 - "contract.test.ts"
Cohesion: 0.05
Nodes (46): buildNotionImportPrompt(), ProjectInUseError, attachment(), cleanDescription(), CONVERSATION_STATUS_FOR_PRD, conversationTitle(), isWebOnlyPath(), log (+38 more)

### Community 129 - "useConversationDetail.ts"
Cohesion: 0.40
Nodes (5): MIME_EXTENSIONS, resolveExtension(), SavedUpload, saveUpload(), serveUpload()

### Community 130 - ".handleRequest"
Cohesion: 0.24
Nodes (8): effectivePort(), isAllowedHost(), isAllowedOrigin(), isAuthorized(), isLoopbackHost(), jsonResponse(), parseHost(), PublicMcpManager

### Community 131 - "recordOutcome"
Cohesion: 0.09
Nodes (15): dryRunLog, fakeEncoder, fakeMissingKey(), hexToBytes(), NOTE: same dry-run stance as checkClaudeAvailable: every skill reported installe, GitWorktreeAddOptions, PaneSize, ORCHESTRATORS (+7 more)

### Community 132 - "SlotPips.tsx"
Cohesion: 0.47
Nodes (4): VALIDATION_SECTION_PLACEHOLDERS, ValidationSkeleton(), PREPARATION_COMMAND_SUMMARIES, ValidationTab()

### Community 133 - "PublishReviewOptions"
Cohesion: 0.20
Nodes (3): ProjectConfig, SqlUpdateBuilder, PrNotificationMonitor

### Community 134 - "id"
Cohesion: 0.15
Nodes (14): additionalProperties, properties, required, type, axis, id, maxLength, pattern (+6 more)

### Community 136 - "reformulate.ts"
Cohesion: 0.10
Nodes (20): ActiveQualityRun, CHECK_RUNNERS, CheckCommand, commandSucceeded(), DATABASE_ISOLATION_PLACEHOLDERS, databaseIsolationProblem(), environmentFor(), log (+12 more)

### Community 137 - "createMcpServer"
Cohesion: 0.43
Nodes (6): createMcpServer(), invalidInput(), listPublicProjects(), OutputValidator, toolError(), toolResult()

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
- **1010 isolated node(s):** `Validation loading follow-up — 2026-10-03`, `Current iteration work — 2026-10-03`, `Previous verified follow-up`, `Current follow-up state — 2026-10-03`, `Activation and retest` (+1005 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **17 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Ticket` connect `NPM Scripts` to `contract.test.ts`, `Contract Building & Slots`, `Desktop Bootstrap & Menus`, `Feasibility Batch Management`, `reformulate.ts`, `PR Selection & Slots Bar`, `Slot Config & Worktree Watch`, `Core Domain Concepts`, `isProcessing`, `codexBinary.ts`, `Live Terminal Views`, `TypeScript Config`, `Client Hub & Watchdog`, `Session Hub & Agent Session`, `Agents View & Ticket Cards`, `PRD Review & Markdown`, `API Client Inputs`, `Session Hub Transcript`, `Modal Dialogs`, `Community 48`, `Slot State`, `Stats Hooks & Cards`, `Community 54`, `prUrl.ts`, `CodexRuntimeStatus`, `vcsCommands.ts`, `Profile`, `.addComment`, `codexProvider.test.ts`, `delegationManager.test.ts`, `TicketCost.tsx`, `ApiDenyPatterns`, `profileSummary.ts`, `TicketOperations`, `useReviewCounts.ts`, `TicketOperations`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Why does `Store` connect `ApiDenyPatterns` to `contract.test.ts`, `Desktop Bootstrap & Menus`, `Ticket Action Panels`, `PublishReviewOptions`, `PR Selection & Slots Bar`, `reformulate.ts`, `DB Row Schemas & Mappers`, `Client Hub & Watchdog`, `Cost & Pricing`, `Agents View & Ticket Cards`, `PRD Review & Markdown`, `NPM Scripts`, `Runtime Dependencies`, `API Client Inputs`, `Session Hub Transcript`, `Modal Dialogs`, `Community 48`, `Slot State`, `Stats Hooks & Cards`, `Package Manifest`, `Community 63`, `TerminalView.tsx`, `vcsCommands.ts`, `atelier.ts`, `Profile`, `recordOutcome`, `createCodexAgentSession`, `TicketOperations`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Why does `DoneGateResult` connect `Community 51` to `Desktop Bootstrap & Menus`, `recordOutcome`, `Shared Zod Schemas`, `Settings & Profiles UI`, `.publishReviewUnderRepoLock`, `Real System Adapter`, `csv.ts`, `TicketOperations`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `createApiRoutes()` (e.g. with `.ticket()` and `isWebOnlyPath()`) actually correct?**
  _`createApiRoutes()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Validation loading follow-up — 2026-10-03`, `Current iteration work — 2026-10-03`, `Previous verified follow-up` to the rest of the system?**
  _1022 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Contract Building & Slots` be split into smaller, more focused modules?**
  _Cohesion score 0.025043680838672103 - nodes in this community are weakly interconnected._
- **Should `Terminals UI & Notifications` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._