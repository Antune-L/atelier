# Graph Report - kanban-agents  (2026-10-02)

## Corpus Check
- 309 files · ~787,427 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3897 nodes · 10682 edges · 132 communities (123 shown, 9 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 80 edges (avg confidence: 0.66)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e700ac96`
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
- Comment
- repairPath.ts
- FakePaneStream
- useSavedFlash.ts
- PrNotificationMonitor
- ApiDenyPatterns
- connection.ts
- settings.tsx
- relaunch.ts
- AgentMessage
- ProjectPanel.tsx
- VcsConnectionResult
- useSavedFlash.ts
- TicketOperations
- TerminalSessionManager
- id
- $defs
- title
- preDraft
- McpSettingsControllerDependencies
- createMcpServer

## God Nodes (most connected - your core abstractions)
1. `Store` - 163 edges
2. `Ticket` - 117 edges
3. `SystemAdapter` - 88 edges
4. `cn()` - 86 edges
5. `FakeSystemAdapter` - 79 edges
6. `createApiRoutes()` - 73 edges
7. `RealSystemAdapter` - 73 edges
8. `ClientHub` - 56 edges
9. `ProjectInfo` - 56 edges
10. `SlotManager` - 56 edges

## Surprising Connections (you probably didn't know these)
- `McpSettingsClient` --references--> `McpSettingsMetadata`  [EXTRACTED]
  src/web/src/lib/mcpSettings.ts → desktop/mcpRpc.ts
- `main()` --calls--> `migrateCodexCatalog()`  [EXTRACTED]
  scripts/downgrade-codex-catalog.ts → src/server/db/schema.ts
- `main()` --calls--> `assertCodexDowngradeSafe()`  [EXTRACTED]
  scripts/downgrade-codex-catalog.ts → src/server/db/schema.ts
- `StartExecutionInput` --references--> `ExecutionOwnerType`  [EXTRACTED]
  src/server/db/store.ts → src/shared/schemas.ts
- `StageProgressBarProps` --references--> `Ticket`  [EXTRACTED]
  src/web/src/components/StageProgressBar.tsx → src/shared/schemas.ts

## Import Cycles
- None detected.

## Communities (132 total, 9 thin omitted)

### Community 0 - "Contract Building & Slots"
Cohesion: 0.03
Nodes (63): ActionExecutionOptions, actionExecutionOptionsSchema, agentMessageSchema, appSettingsSchema, automationRunSchema, automationSchema, baseBranchSchema, capabilitiesSchema (+55 more)

### Community 1 - "Terminals UI & Notifications"
Cohesion: 0.10
Nodes (20): analyzeTicketsInputSchema, analyzeTicketsOutputSchema, columnSchema, compactTicketSchema, createTodoTicketOutputSchema, editableTicketSchema, listProjectsInputSchema, listProjectsOutputSchema (+12 more)

### Community 2 - "Desktop Bootstrap & Menus"
Cohesion: 0.06
Nodes (22): log, ReformulateManager, SessionHub, log, Watchdog, ClientHub, ClientSocket, ClientSocketData (+14 more)

### Community 3 - "Feasibility Batch Management"
Cohesion: 0.07
Nodes (48): isPrNeedsAttention(), candidatesFor(), CardCandidate, CardsPanel(), pluralCards(), splitDescription(), ImportTicketsPanel(), ProjectPrPicker() (+40 more)

### Community 4 - "Ticket Action Panels"
Cohesion: 0.08
Nodes (32): CapturingSystem, AckSystem, ActiveDelegation, ActiveReview, ClosableExecution, RecordingSystem, ExecutionFinishStatus, LiveSession (+24 more)

### Community 5 - "Fake System Adapter"
Cohesion: 0.08
Nodes (36): PrdDocumentPatch, compileFeedback(), PrdAnnotation, prdAnnotationsSchema, FeedbackDraft, PrdAnnotator(), PrdAnnotatorProps, BREADCRUMB (+28 more)

### Community 6 - "Shared Zod Schemas"
Cohesion: 0.09
Nodes (31): RepoInspectionSource, CreateProjectInput, ManagedProject, UpdateProjectInput, vcsProviderSchema, ProjectListProps, ConnectionHint, CreateStep (+23 more)

### Community 7 - "Settings & Profiles UI"
Cohesion: 0.07
Nodes (6): delay(), fakeShellPrompt(), FakeSystemAdapter, hexToBytes(), ReviewDoneOptions, WorktreeSetupOptions

### Community 8 - "PR Selection & Slots Bar"
Cohesion: 0.12
Nodes (24): CompactTicket, ListTicketsInput, ACTIVE_STAGES, Column, COLUMN_LABELS, COLUMNS, ACTIVE_COLUMNS, Board() (+16 more)

### Community 9 - "Real System Adapter"
Cohesion: 0.06
Nodes (38): AGENT_EFFORT_LABELS, AUTOMATION_RUN_STATUSES, CODEX_EFFORT_LABELS, CODEX_MODEL_LABELS, CODEX_SEED_PROFILE, COMMENT_AUTHORS, CommentAuthor, COMMIT_LANGUAGE_LABELS (+30 more)

### Community 10 - "Slot Config & Worktree Watch"
Cohesion: 0.12
Nodes (12): directories, initializeParamsSchema, log, requestSchema, rpcError(), rpcResult(), rpcResponseSchema, toolCallParamsSchema (+4 more)

### Community 11 - "Core Domain Concepts"
Cohesion: 0.03
Nodes (63): agentMessageRowSchema, AutomationRow, automationRowSchema, AutomationRunRow, automationRunRowSchema, buildScripts(), CommentRow, commentRowSchema (+55 more)

### Community 12 - "Board & Sidebar Layout"
Cohesion: 0.08
Nodes (29): BOARD_FINDING_RENDER_STYLE, implementationScopesOverlap(), log, normalizeImplementationScope(), renderCollapsedFinding(), renderFinding(), renderPersistedReviewResult(), REVIEW_DISALLOWED_TOOLS (+21 more)

### Community 13 - "Database Store Operations"
Cohesion: 0.38
Nodes (6): ATTENTION_STATUSES, sessionOf(), SlotPips(), SlotPipsProps, STATUS_LABELS, STATUS_PIP_CLASSES

### Community 14 - "Coordinator & Protocol"
Cohesion: 0.07
Nodes (44): COLUMN_ORDER, FEASIBILITY_ENGINES, FeasibilityEngine, IMPLEMENTERS, STAGE_LABELS, FILLED_GLYPH_COLORS, StageProgressBar(), StageProgressBarProps (+36 more)

### Community 15 - "API Routes & Reformulate"
Cohesion: 0.06
Nodes (50): main(), scalar(), setup(), cleanTicket(), conflictTicket(), REVIEW_OPTS, reviewTicket(), TICKET_OPTS (+42 more)

### Community 16 - "Stats Aggregation"
Cohesion: 0.13
Nodes (3): startParentSession(), SessionHubHandlers, SessionStartCallbacks

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
Cohesion: 0.04
Nodes (73): FAILURE_COLUMNS, Kind, KINDS, SUCCESS_COLUMNS, StatRecord, StatCard(), StatCardProps, StatEmpty() (+65 more)

### Community 21 - "Store Types & Agent Knobs"
Cohesion: 0.08
Nodes (83): agent_context_html(), agent_entry_count(), axes_html(), axis_anchor(), axis_head_html(), axis_items(), axis_section_html(), axis_statuses() (+75 more)

### Community 22 - "DB Row Schemas & Mappers"
Cohesion: 0.06
Nodes (38): formatPrdDocumentIssues(), log, ToolHandler, ToolResult, TRIAGE_VERDICTS, AgentSettableStage, agentSettableStageSchema, askUserArgsSchema (+30 more)

### Community 23 - "Dev Dependencies"
Cohesion: 0.08
Nodes (70): ExecutionOverrides, AgentEffort, AgentModel, CodexEffort, CodexModel, Implementer, Orchestrator, Capabilities (+62 more)

### Community 24 - "TypeScript Config"
Cohesion: 0.13
Nodes (24): bashCommandSchema, buildSettings(), claudeProvider, createSdkAgentSession(), denyBashHook(), denyNoVerifyHook, denyReviewPublishingHook, denyTypecheckHook() (+16 more)

### Community 25 - "Client Hub & Watchdog"
Cohesion: 0.08
Nodes (15): AgentCoordinator, logRejection(), PendingSessionMessage, SessionExecutionContext, SessionMessageContext, SessionMessageStatus, SessionToolCall, mapAgentMessageRow() (+7 more)

### Community 26 - "Cost & Pricing"
Cohesion: 0.07
Nodes (28): buildAtelierConsolidateTurn(), buildAtelierPrompt(), buildAtelierRegenerationTurn(), buildAuthoringRules(), buildFraming(), buildHistory(), buildResearch(), buildRole() (+20 more)

### Community 27 - "Workflow View & Lifecycle"
Cohesion: 0.05
Nodes (31): Architecture, Commands, Conventions (enforced — beyond the global ones in ~/.claude/CLAUDE.md), graphify, The dry-run safety model — read before running anything, What this is, Agent runtime, Architecture (+23 more)

### Community 28 - "Stats Charts"
Cohesion: 0.06
Nodes (44): AgentMcpServerDefinition, codexCommandPolicyScript(), agentMessageDeltaSchema, agentToml(), apiWriteDenyScript(), buildMcpServers(), ConfigObject, configReadResponseSchema (+36 more)

### Community 29 - "Session Hub & Agent Session"
Cohesion: 0.05
Nodes (48): AtelierSessionInput, mapReviewApprovalRow(), mapReviewPassRow(), mapTicketCreationRequestRow(), AttachExecutionSessionInput, AutomationPatch, ConversationPatch, EnqueueAgentMessageInput (+40 more)

### Community 30 - "Agents View & Ticket Cards"
Cohesion: 0.47
Nodes (5): COLUMN_NODE_COLOR, depthOf(), truncate(), WorkflowView(), WorkflowViewProps

### Community 31 - "PRD Review & Markdown"
Cohesion: 0.13
Nodes (25): ReviewResult, ALSO_FLAGGED_PREFIX, dedupeFindings(), dedupeIdenticalFindings(), DimensionFinding, findingAnchor(), FRENCH_STOP_WORD_PATTERN, FRENCH_STOP_WORDS (+17 more)

### Community 32 - "User Terminal & Fake IO"
Cohesion: 0.07
Nodes (28): AnalyzeTicketsInput, AppSettings, CreateAskInput, CreateCleanInput, CreateCommentInput, createConversationSchema, CreateProfileInput, CreateReviewInput (+20 more)

### Community 33 - "Logging"
Cohesion: 0.10
Nodes (21): scripts, build:desktop, build:web, dev, dev:desktop, dev:proxy, dev:server, dev:web (+13 more)

### Community 34 - "Board Columns"
Cohesion: 0.14
Nodes (22): AppliedPath, copyDependencies(), copyPath(), DelegationWorkspace, ensureParentDirectory(), FileState, git(), installStagedPath() (+14 more)

### Community 35 - "NPM Scripts"
Cohesion: 0.15
Nodes (11): addUsageByModel(), toUsageByModel(), TicketLifecycle, createSplitChildren(), failSplitMother(), performSplit(), splitChildDefaults(), splitMotherBranch() (+3 more)

### Community 36 - "Runtime Dependencies"
Cohesion: 0.05
Nodes (41): NewReview, ProjectInUseError, attachment(), cleanDescription(), CONVERSATION_STATUS_FOR_PRD, conversationTitle(), log, orderSelectedTasks() (+33 more)

### Community 37 - "Claude SDK Provider"
Cohesion: 0.09
Nodes (22): dependencies, @anthropic-ai/claude-agent-sdk, dompurify, elysia, @fontsource/ibm-plex-mono, @fontsource/ibm-plex-sans, marked, @modelcontextprotocol/sdk (+14 more)

### Community 38 - "Agent Profile Config"
Cohesion: 0.08
Nodes (33): isCodexFastServiceTier(), costByFamily(), costOf(), costOfModel(), costOfSessions(), CostSummary, FamilyPricing, MODEL_PRICING (+25 more)

### Community 39 - "Agent Coordinator Handlers"
Cohesion: 0.17
Nodes (18): adopt(), compareVersions(), detectionCandidates(), detectUserInstall(), downloadAndVerifyTarball(), downloadPinnedBinary(), emitProgress(), ensureClaudeBinary() (+10 more)

### Community 40 - "API Client Inputs"
Cohesion: 0.07
Nodes (11): childTranscriptPrefix(), DelegationManager, orderedReviewKinds(), reviewKey(), sleep(), startAndApproveReviews(), submitReviews(), allowedReviewPasses() (+3 more)

### Community 41 - "Ticket Config & Constants"
Cohesion: 0.08
Nodes (35): isNotionUrl(), NOTION_HOSTS, ProjectInfo, AskPanelProps, CleanPrPanelProps, ImportTicketsPanelProps, NewTicketSheet(), ProjectPrPickerProps (+27 more)

### Community 42 - "Ticket Detail & Triage UI"
Cohesion: 0.14
Nodes (21): COLUMN_SORT_FIELD, BoardColumn(), compareFamilyMembers(), familyKeyOf(), groupTicketIds(), groupTicketsByFamily(), isSplitMother(), readCollapsed() (+13 more)

### Community 43 - "Demo Pipeline Concepts"
Cohesion: 0.07
Nodes (15): FakePaneStream, RealPaneStream, PaneStream, dataMessage(), log, normalizeSeed(), safeParse(), send() (+7 more)

### Community 44 - "Chart Primitives"
Cohesion: 0.31
Nodes (13): abortReason(), computeCodeFingerprint(), FingerprintEntry, FingerprintPhase, hashFingerprintPaths(), isMissingFileError(), listFingerprintPaths(), log (+5 more)

### Community 45 - "Session Hub Transcript"
Cohesion: 0.14
Nodes (15): artifactPath, assertPackageVersionInSync(), assertSdkVersionsInSync(), BUILT_DMG, ELECTROBUN_BIN, fail(), installedPackageVersion(), RELEASE_FOLDER (+7 more)

### Community 46 - "Community 46"
Cohesion: 0.27
Nodes (15): Agent Implementation Config, Argus Code Review, Automated Tests (typecheck/lint/test), Claude Code Autonomous Agent, Ticket Contract Injection, Feasibility Analysis, Kanban Board (Atelier), Kanban Agents Demo (demo.gif) (+7 more)

### Community 47 - "Modal Dialogs"
Cohesion: 0.16
Nodes (30): buildCleanContract(), buildConflictResolutionContract(), buildFeasibilityBatchContract(), buildFeasibilityContextSection(), buildImplementingSteps(), buildMockupReviewStep(), buildPlanningStep(), buildPrdBullet() (+22 more)

### Community 48 - "Community 48"
Cohesion: 0.09
Nodes (18): NewTicket, TicketCreationRequestConflictError, AnalyzeTicketRejectionReason, AnalyzeTicketsResult, CreateTodoTicketInput, createTodoTicketInputSchema, CreateTodoTicketResult, isActive() (+10 more)

### Community 49 - "Slot State"
Cohesion: 0.05
Nodes (52): AtelierPromptInput, SubmittedTurn, Conversation, ConversationMessage, PrdDocumentRecord, PrNotificationSyncStatus, WsClientEvent, CardsPanelProps (+44 more)

### Community 50 - "Stats Hooks & Cards"
Cohesion: 0.13
Nodes (18): buildRepoInspection(), formatProjectLabel(), LOCKFILE_NAMES, LOCKFILE_RUNNERS, PackageManifest, packageManifestSchema, PROVIDER_HOST_MARKERS, RepoFacts (+10 more)

### Community 51 - "Community 51"
Cohesion: 0.05
Nodes (6): detectInstallCommand(), realpathSafe(), RealSystemAdapter, resolveWorktreeScriptCommand(), setupOutputExcerpt(), shQuote()

### Community 52 - "repairPath.ts"
Cohesion: 0.06
Nodes (38): Block, blockText(), compactChunks(), firstCharCode(), TranscriptBuffer, trimBlockStart(), AgentStreamBlock, terminalServerMessageSchema (+30 more)

### Community 53 - "User Terminal Manager"
Cohesion: 0.33
Nodes (5): CONTEXT — domain glossary, Execution, Proposed (not yet built), Seams, Work items

### Community 54 - "Community 54"
Cohesion: 0.08
Nodes (7): DoneGateResult, ReviewHeadResult, FAKE_OPEN_PRS, FakeVcsClient, githubPrHeadRef(), VcsClient, VcsConnectionResult

### Community 55 - "App.tsx"
Cohesion: 0.13
Nodes (5): FeasibilityBatchManager, toTriageResult(), TriageManager, FeasibilityResult, TriageResult

### Community 56 - "CSV Parsing"
Cohesion: 0.08
Nodes (33): AGENT_MODEL_LABELS, AUTOMATION_TRIGGER_LABELS, AUTOMATION_TRIGGERS, AutomationRunStatus, AutomationTrigger, CreateAutomationInput, AutomationCard(), AutomationCardProps (+25 more)

### Community 57 - "Community 57"
Cohesion: 0.15
Nodes (16): App(), HOME_VIEW_OPTIONS, HomeView, FILTERS, isPending(), NotificationCenter(), NotificationFilter, useTheme() (+8 more)

### Community 58 - "File Uploads"
Cohesion: 0.18
Nodes (11): verifiedFindings(), DEFAULT_FINDING_RENDER_STYLE, FindingRenderStyle, finding(), FULL_REVIEW_KINDS, LIGHT_REVIEW_KINDS, passDimensionFindings(), publishedReviewFindings() (+3 more)

### Community 59 - "triageManager.ts"
Cohesion: 0.31
Nodes (13): buildContractConstraintsLines(), buildResponseFormatLines(), buildStrictRulesLines(), buildTicketLines(), buildTriageChannelPrompt(), buildTriagePlusChannelPrompt(), isEnglish(), readOnlyFramingLines() (+5 more)

### Community 60 - "Package Manifest"
Cohesion: 0.35
Nodes (9): gitMetadataWritableRoots(), agentBaseEnv(), bestInstalledMatch(), compareParts(), envWithProjectNode(), nvmNodeBinDir(), readNvmrc(), prepareProjectShell() (+1 more)

### Community 61 - "splitManager.ts"
Cohesion: 0.40
Nodes (4): PR review counting and publication correction state, Progress, Scope and decisions, Verification

### Community 62 - "TicketCard.tsx"
Cohesion: 0.08
Nodes (23): AGENTS_SKILLS_DIR, CLAUDE_JSON_PATH, CLAUDE_SKILLS_DIR, commandOutputOrNull(), COMPOSER_BINARIES, DEFAULT_CODEX_HOME, GitRemoteFacts, INSTALL_COMMANDS (+15 more)

### Community 63 - "Community 63"
Cohesion: 0.26
Nodes (16): ProfileConfig, ProfilePipeline(), ProfileRowHeaderProps, buildProfilePipeline(), claudeDetail(), claudeSubagentDetail(), codexOrchestratorDetail(), codexSubagentParts() (+8 more)

### Community 64 - "Composer Run Script"
Cohesion: 0.08
Nodes (46): axisIdSchema, DUPLICATE_ITEMS_ISSUE, hasDuplicates(), identifierSchema, isUnique(), nonEmptyTextArraySchema, PRD_LOCALES, PRD_REQUIREMENT_KINDS (+38 more)

### Community 65 - "split.ts"
Cohesion: 0.16
Nodes (11): AtelierDesktopRpcSchema, DesktopRequests, McpSettingsMetadata, McpTokenSource, WebviewRequests, createMcpSettingsController(), McpSettingsController, temporaryDirectories (+3 more)

### Community 66 - "prUrl.ts"
Cohesion: 0.19
Nodes (5): AutomationManager, mapAutomationRow(), mapAutomationRunRow(), Automation, AutomationRun

### Community 67 - "TerminalView.tsx"
Cohesion: 0.10
Nodes (32): AgentCard(), AgentCardProps, AgentsView(), AgentsViewProps, hasLiveAgent(), normalize(), AtelierView(), findPrdConversation() (+24 more)

### Community 68 - "schema.test.ts"
Cohesion: 0.11
Nodes (35): dragKeys(), groupCountLabel(), groupSortId(), ListGroup, ProjectList(), ProjectListRowProps, projectSortId(), SortableProjectGroup() (+27 more)

### Community 69 - "reviewFindings.ts"
Cohesion: 0.20
Nodes (7): AZURE_COMMANDS, COMMANDS_BY_PROVIDER, GITHUB_COMMANDS, PrDiffContext, VcsCleanCommands, AZ_SETTLED_THREAD_STATUSES, VCS_PROVIDER_LABELS

### Community 70 - "CodexRuntimeStatus"
Cohesion: 0.06
Nodes (47): ActiveReviewPass, assertExecutionAvailable(), CODEX_LAUNCH_STATUS_MESSAGES, CodexCapabilityReader, FEASIBILITY_ENGINE_EXECUTION, ResolvedExecution, resolveExecution(), resolveFeasibilityExecution() (+39 more)

### Community 71 - "PostCSS Config"
Cohesion: 0.29
Nodes (6): name, overrides, zod, private, type, version

### Community 72 - ".publishReviewUnderRepoLock"
Cohesion: 0.12
Nodes (15): PROJECT_ROOT, PrdRenderError, RENDERER_RELATIVE_PATH, renderPrdHtml(), RenderPrdHtmlInput, resolvePrdRendererPath(), TEMPLATE_PATH, closers (+7 more)

### Community 73 - "TerminalView.tsx"
Cohesion: 0.08
Nodes (46): AGENT_EFFORT_FULL_LABELS, AGENT_MODEL_FULL_LABELS, CODEX_EFFORT_FULL_LABELS, ConversationStatus, AtelierViewProps, ComposeState, PrdSeen, buildThread() (+38 more)

### Community 74 - "button.tsx"
Cohesion: 0.06
Nodes (42): fakeMissingKey(), ORCHESTRATOR_LABELS, ORCHESTRATORS, SkillStatus, availableSkillProviders(), expectedSkillPaths(), HOST_SKILL_ROOTS, missingSkillProviders() (+34 more)

### Community 75 - ".handleRequest"
Cohesion: 0.11
Nodes (14): analyzeResultSchema, compactTicketSchema, createResultSchema, errorResultSchema, ISOLATED_ENV_KEYS, projectResultSchema, savedEnv, startResultSchema (+6 more)

### Community 76 - "usePrdSearch.ts"
Cohesion: 0.08
Nodes (27): ActionSystem, CapabilityCache, CodexAppServerInitializationError, threadConfig(), accountResponseSchema, CodexRuntimeDependencies, hasExplicitCodexApiKey(), isProtocolIncompatibility() (+19 more)

### Community 78 - "csv.ts"
Cohesion: 0.06
Nodes (29): extractPrUrl(), fetchGithubOpenPrs(), ghAuthenticatedUserSchema, ghPrHeadSchema, ghPrSchema, ghPrStateSchema, ghRequestedPullPagesSchema, ghRequestedPullSchema (+21 more)

### Community 79 - "WorktreeSession"
Cohesion: 0.33
Nodes (3): listeners, mcp, ReplyArgsSchema

### Community 80 - "recordedAction.ts"
Cohesion: 0.24
Nodes (16): alternation(), COMMAND_WRAPPERS, commandSegments(), commandWords(), executableName(), launchedPackageScript(), launchesTypecheck(), OPTIONS_WITH_VALUE (+8 more)

### Community 81 - "index.ts"
Cohesion: 0.27
Nodes (11): boot(), externalUrlFromNewWindowEvent(), forwardAtelierShortcut(), installApplicationMenu(), installMenuShortcutBridge(), menuShortcutActionSchema, navigationEventSchema, newWindowEventSchema (+3 more)

### Community 82 - ".getReviewPass"
Cohesion: 0.06
Nodes (32): defaultProjectLookup(), resolveBaseBranch(), buildAskContract(), reviewPublicationEvent(), assertCodexImplementerAvailable(), featureBranch(), log, ReclaimOutcome (+24 more)

### Community 86 - "vcsCommands.ts"
Cohesion: 0.24
Nodes (8): effectivePort(), isAllowedHost(), isAllowedOrigin(), isAuthorized(), isLoopbackHost(), jsonResponse(), parseHost(), PublicMcpManager

### Community 89 - "usePrdSearch.ts"
Cohesion: 0.19
Nodes (8): FeasibilityStarter, isProcessing(), normalizeCreateInput(), requestKeyConflictMessage(), ticketDependencyError(), TicketOperations, isAllowedAgentPair(), deriveTitleFromDescription()

### Community 90 - "Profile"
Cohesion: 0.28
Nodes (8): ImplementSessionInput, VCS_PROVIDERS, VcsProvider, parsePrUrl(), PR_URL_SEGMENT, prNumberFromUrl(), PrUrlRef, ticketPrNumber()

### Community 92 - "TerminalSessionManager"
Cohesion: 0.46
Nodes (5): buildSplitChannelPrompt(), buildTicketLines(), isEnglish(), extractFigmaUrls(), hasMockups()

### Community 93 - "ColumnActionsMenu.tsx"
Cohesion: 0.25
Nodes (7): Azure DevOps support — state file, Decisions (validated by the owner, 2026-09-21), Goal, Known blockers for lots 3 and 4, Open questions, Progress, Verified on this machine (az 2.90.0, azure-devops 1.0.8)

### Community 94 - ".addComment"
Cohesion: 0.22
Nodes (9): projectConfigSchema, buildAppSettingsPatch(), LegacyConfig, legacyConfigSchema, LegacyModels, log, pickModel(), agentModelSchema (+1 more)

### Community 95 - "TicketConfigSummary.tsx"
Cohesion: 0.50
Nodes (3): appBundle, EMBEDDED_BINARIES, resourcesApp

### Community 97 - "RunningServer"
Cohesion: 0.13
Nodes (13): PROJECT_ROOT, NOTE: PRD generation holds the request open up to ~120s (REFORMULATE_TIMEOUT_MS), resolveDataFile(), resolveServerPort(), RunningServer, serveStaticAsset(), SocketData, startServer() (+5 more)

### Community 98 - "usePrdSearch.ts"
Cohesion: 0.06
Nodes (37): ReviewPublicationEvent, azureChangeEntrySchema, azureCommentSchema, azureCurrentIdentitySchema, AzureDevopsVcsClient, azureIdentitySchema, azureIterationChangesSchema, azureIterationListSchema (+29 more)

### Community 99 - "reviewPublishingGuard.ts"
Cohesion: 0.07
Nodes (35): API_GUARDS, API_READ_METHOD_SET, ApiDenyPatterns, ApiGuard, AZ_INVOKE_COMMAND, AZ_INVOKE_METHOD_LONG_FLAGS, AZ_INVOKE_WRITE_INPUT_LONG_FLAGS, AZ_PR_WRITE_PATTERN (+27 more)

### Community 100 - ".startVerification"
Cohesion: 0.08
Nodes (25): $ref, $ref, enum, $ref, $ref, properties, designConsiderations, goals (+17 more)

### Community 101 - "codexProvider.test.ts"
Cohesion: 0.33
Nodes (6): RFC-4180, CsvParseError, normalizeHeader(), ParsedTicketRow, ParsedTicketsCsv, parseTicketsCsv()

### Community 102 - "prd.schema.json"
Cohesion: 0.29
Nodes (6): additionalProperties, $id, required, $schema, title, type

### Community 104 - "uploads.ts"
Cohesion: 0.40
Nodes (4): MIME_EXTENSIONS, resolveExtension(), SavedUpload, saveUpload()

### Community 105 - "createMcpServer"
Cohesion: 0.09
Nodes (23): $ref, $ref, $ref, minLength, type, minLength, type, enum (+15 more)

### Community 106 - "usePrdSearch.ts"
Cohesion: 0.13
Nodes (10): appendToLogFile(), disableFileLogging(), initLogFile(), Logger, openLogStream(), paint(), rotateLogFile(), ScopedLogger (+2 more)

### Community 107 - "azureRemote.ts"
Cohesion: 0.35
Nodes (11): azureOrgUrl(), AzureRepoRef, fromAzureSegments(), fromCollectionSegments(), fromLegacySegments(), fromSshSegments(), parseAzureRepoRef(), parseRemoteLocation() (+3 more)

### Community 108 - "WorkflowView.tsx"
Cohesion: 0.09
Nodes (22): axes, designConsiderations, goals, id, locale, openQuestions, outOfScope, preDraft (+14 more)

### Community 109 - "Comment"
Cohesion: 0.40
Nodes (4): mapCommentRow(), Comment, ActivityTabProps, CommentRowProps

### Community 110 - "repairPath.ts"
Cohesion: 0.67
Nodes (3): mergePaths(), PATH_PROBE_COMMAND, repairPath()

### Community 111 - "FakePaneStream"
Cohesion: 0.13
Nodes (9): RecordingSystemAdapter, PublishReviewOptions, PublishReviewResult, ReviewPublicationState, GithubVcsClient, pullApiEndpoint(), reviewApiEndpoint(), rightSideDiffLines() (+1 more)

### Community 112 - "useSavedFlash.ts"
Cohesion: 0.31
Nodes (5): applyDesktopEnv(), DesktopRoots, ensureMcpToken(), regenerateMcpToken(), temporaryDirectories

### Community 114 - "ApiDenyPatterns"
Cohesion: 0.04
Nodes (30): startFeasibilityTicket(), mapConversationMessageRow(), mapConversationRow(), mapPrNotificationRow(), mapPrNotificationSyncRow(), mapProfileRow(), mapTicketRow(), nullableBooleanValue() (+22 more)

### Community 115 - "connection.ts"
Cohesion: 0.67
Nodes (3): BoundedCommandResult, connectionFailure(), connectionResult()

### Community 116 - "settings.tsx"
Cohesion: 0.05
Nodes (59): COMMIT_LANGUAGES, CodexAgentFields(), ProfilesSettings(), AgentDefaultsSettings(), CODEX_STATUS_TONES, COMMIT_ROW, DefaultsRowSpec, EFFORT_OPTIONS (+51 more)

### Community 119 - "AgentMessage"
Cohesion: 0.11
Nodes (19): items, maxItems, minItems, type, uniqueItems, $ref, axes, requirements (+11 more)

### Community 120 - "ProjectPanel.tsx"
Cohesion: 0.11
Nodes (17): Agent session (server), Architecture decisions, Atelier (conversation → PRD → cards) — implementation state, Contract injection, Follow-ups noticed in Lot A, Goal, Lot A public API (use these names in Lots B and C), Lot B public surface and deviations (read before Lot C/D) (+9 more)

### Community 121 - "VcsConnectionResult"
Cohesion: 0.07
Nodes (21): CodexAppServerConnection, CodexAppServerNotification, CodexAppServerOptions, CodexAppServerProtocolError, connectCodexAppServer(), incomingSchema, initializeResponseSchema, log (+13 more)

### Community 124 - "useSavedFlash.ts"
Cohesion: 0.15
Nodes (11): CodexAppServerRpcError, canonicalJson(), CodexCommandHook, codexSessionPreToolUseHookHash(), JsonValue, createCodexProvider(), AppServerFixtureOptions, hookPathForSession() (+3 more)

### Community 126 - "TicketOperations"
Cohesion: 0.12
Nodes (16): AssistantPart, AtelierManagerDeps, ConversationRuntime, describeToolUse(), log, CLAUDE_CONVERSATION, closers, CODEX_CONVERSATION (+8 more)

### Community 127 - "TerminalSessionManager"
Cohesion: 0.13
Nodes (16): nonEmptyStringArray, stringArray, items, type, uniqueItems, minLength, pattern, type (+8 more)

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

### Community 160 - "createMcpServer"
Cohesion: 0.43
Nodes (6): createMcpServer(), invalidInput(), listPublicProjects(), OutputValidator, toolError(), toolResult()

## Knowledge Gaps
- **965 isolated node(s):** `menuShortcutActionSchema`, `newWindowEventSchema`, `navigationEventSchema`, `ticketRowSchema`, `TicketRow` (+960 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Ticket` connect `NPM Scripts` to `Contract Building & Slots`, `Desktop Bootstrap & Menus`, `Feasibility Batch Management`, `Ticket Action Panels`, `Fake System Adapter`, `PR Selection & Slots Bar`, `Real System Adapter`, `Core Domain Concepts`, `Board & Sidebar Layout`, `Coordinator & Protocol`, `API Routes & Reformulate`, `Live Terminal Views`, `Dev Dependencies`, `Client Hub & Watchdog`, `Session Hub & Agent Session`, `Agents View & Ticket Cards`, `User Terminal & Fake IO`, `Runtime Dependencies`, `Agent Profile Config`, `API Client Inputs`, `Ticket Config & Constants`, `Ticket Detail & Triage UI`, `Modal Dialogs`, `Community 48`, `Slot State`, `repairPath.ts`, `CSV Parsing`, `Community 57`, `File Uploads`, `triageManager.ts`, `TerminalView.tsx`, `CodexRuntimeStatus`, `TerminalView.tsx`, `.getReviewPass`, `usePrdSearch.ts`, `Profile`, `createCodexAgentSession`, `TerminalSessionManager`, `TerminalSession`, `Comment`, `ApiDenyPatterns`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Why does `FakeSystemAdapter` connect `Settings & Profiles UI` to `Desktop Bootstrap & Menus`, `Ticket Action Panels`, `TerminalSession`, `.publishReviewUnderRepoLock`, `button.tsx`, `usePrdSearch.ts`, `FakePaneStream`, `API Routes & Reformulate`, `TicketCard.tsx`, `TicketOperations`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **Why does `Store` connect `ApiDenyPatterns` to `Desktop Bootstrap & Menus`, `Ticket Action Panels`, `Board & Sidebar Layout`, `API Routes & Reformulate`, `DB Row Schemas & Mappers`, `Client Hub & Watchdog`, `Cost & Pricing`, `Session Hub & Agent Session`, `NPM Scripts`, `Runtime Dependencies`, `API Client Inputs`, `Demo Pipeline Concepts`, `Modal Dialogs`, `Community 48`, `App.tsx`, `prUrl.ts`, `CodexRuntimeStatus`, `.publishReviewUnderRepoLock`, `.getReviewPass`, `.addComment`, `RunningServer`, `Comment`, `TicketOperations`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **What connects `menuShortcutActionSchema`, `newWindowEventSchema`, `navigationEventSchema` to the rest of the system?**
  _977 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Contract Building & Slots` be split into smaller, more focused modules?**
  _Cohesion score 0.031701631701631705 - nodes in this community are weakly interconnected._
- **Should `Terminals UI & Notifications` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._
- **Should `Desktop Bootstrap & Menus` be split into smaller, more focused modules?**
  _Cohesion score 0.0633879781420765 - nodes in this community are weakly interconnected._