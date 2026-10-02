# Graph Report - kanban-agents  (2026-10-02)

## Corpus Check
- 309 files · ~787,441 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3897 nodes · 11386 edges · 129 communities (120 shown, 9 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 82 edges (avg confidence: 0.66)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `00b8c75b`
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
- settings.tsx
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
2. `Ticket` - 116 edges
3. `SystemAdapter` - 88 edges
4. `cn()` - 86 edges
5. `createApiRoutes()` - 83 edges
6. `FakeSystemAdapter` - 79 edges
7. `RealSystemAdapter` - 75 edges
8. `VcsProvider` - 61 edges
9. `SlotManager` - 59 edges
10. `getErrorMessage()` - 58 edges

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

## Communities (129 total, 9 thin omitted)

### Community 0 - "Contract Building & Slots"
Cohesion: 0.03
Nodes (65): ActionExecutionOptions, actionExecutionOptionsSchema, agentMessageSchema, appSettingsSchema, automationRunSchema, automationSchema, baseBranchSchema, capabilitiesSchema (+57 more)

### Community 1 - "Terminals UI & Notifications"
Cohesion: 0.10
Nodes (20): analyzeTicketsInputSchema, analyzeTicketsOutputSchema, columnSchema, compactTicketSchema, createTodoTicketOutputSchema, editableTicketSchema, listProjectsInputSchema, listProjectsOutputSchema (+12 more)

### Community 2 - "Desktop Bootstrap & Menus"
Cohesion: 0.07
Nodes (30): log, log, ReformulateManager, DRY_RUN_VERDICT, log, TriageSession, log, Watchdog (+22 more)

### Community 3 - "Feasibility Batch Management"
Cohesion: 0.04
Nodes (78): compileFeedback(), Comment, PrdAnnotation, prdAnnotationsSchema, FeedbackDraft, PrdAnnotator(), PrdAnnotatorProps, BREADCRUMB (+70 more)

### Community 4 - "Ticket Action Panels"
Cohesion: 0.10
Nodes (13): CapturingSystem, AckSystem, ActiveDelegation, ClosableExecution, RecordingSystem, RecordedSession, RecordingSystem, RelaunchSystem (+5 more)

### Community 5 - "Fake System Adapter"
Cohesion: 0.06
Nodes (31): extractPrUrl(), ghAuthenticatedUserSchema, ghPrHeadSchema, ghPrSchema, ghPrStateSchema, ghRequestedPullPagesSchema, ghRequestedPullSchema, ghRestPullSchema (+23 more)

### Community 6 - "Shared Zod Schemas"
Cohesion: 0.09
Nodes (33): ProfileConfig, Profile, McpSettings(), DragHandleAttributes, DragHandleListeners, ProfileRow(), ProfileRowHeader(), ProfileRowHeaderProps (+25 more)

### Community 7 - "Settings & Profiles UI"
Cohesion: 0.07
Nodes (5): delay(), fakeShellPrompt(), FakeSystemAdapter, ReviewDoneOptions, WorktreeSetupOptions

### Community 8 - "PR Selection & Slots Bar"
Cohesion: 0.12
Nodes (24): CompactTicket, ListTicketsInput, ACTIVE_STAGES, Column, COLUMN_LABELS, COLUMNS, ACTIVE_COLUMNS, Board() (+16 more)

### Community 9 - "Real System Adapter"
Cohesion: 0.04
Nodes (57): AGENT_EFFORT_LABELS, AGENT_MODEL_LABELS, AUTOMATION_RUN_STATUSES, AUTOMATION_TRIGGER_LABELS, AUTOMATION_TRIGGERS, CODEX_EFFORT_LABELS, CODEX_MODEL_LABELS, COMMENT_AUTHORS (+49 more)

### Community 10 - "Slot Config & Worktree Watch"
Cohesion: 0.21
Nodes (9): initializeParamsSchema, log, requestSchema, rpcError(), rpcResult(), toolCallParamsSchema, WorkerMcpHandlers, isWorkerToolName() (+1 more)

### Community 11 - "Core Domain Concepts"
Cohesion: 0.03
Nodes (69): agentMessageRowSchema, AutomationRow, automationRowSchema, AutomationRunRow, automationRunRowSchema, buildScripts(), CommentRow, commentRowSchema (+61 more)

### Community 12 - "Board & Sidebar Layout"
Cohesion: 0.07
Nodes (36): renderCollapsedFinding(), escapeHtml(), renderCollapsedDetails(), renderOutsideDiffComment(), renderOutsideDiffSection(), ReviewPublicationComment, ReviewPublicationEvent, azureChangeEntrySchema (+28 more)

### Community 13 - "Database Store Operations"
Cohesion: 0.15
Nodes (16): App(), HOME_VIEW_OPTIONS, HomeView, FILTERS, isPending(), NotificationCenter(), NotificationFilter, useTheme() (+8 more)

### Community 14 - "Coordinator & Protocol"
Cohesion: 0.14
Nodes (19): COLUMN_ORDER, PrdTab(), TICKET_TAB_LABELS, TicketTab, TicketTabs(), TicketTabsProps, availableTabs(), hasSessionPane() (+11 more)

### Community 15 - "API Routes & Reformulate"
Cohesion: 0.05
Nodes (57): main(), scalar(), setup(), cleanTicket(), conflictTicket(), REVIEW_OPTS, reviewTicket(), TICKET_OPTS (+49 more)

### Community 16 - "Stats Aggregation"
Cohesion: 0.07
Nodes (7): SessionHub, SessionHubHandlers, SessionStartCallbacks, SplitManager, TriageManager, RouteDeps, TriageResult

### Community 17 - "Triage & Server Hub"
Cohesion: 0.08
Nodes (25): devDependencies, autoprefixer, class-variance-authority, clsx, concurrently, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities (+17 more)

### Community 18 - "Live Terminal Views"
Cohesion: 0.07
Nodes (34): isReviewFixSession(), ATELIER_WEB_TOOLS, AZURE_BASH_ALLOWLIST, AZURE_CLEAN_BASH_ALLOWLIST, BASH_ALLOWLIST, bashAllowlist(), buildImplementSessionConfig(), CODEX_READONLY_TOOLS (+26 more)

### Community 19 - "Stage Progress & Display"
Cohesion: 0.08
Nodes (24): compilerOptions, allowImportingTsExtensions, baseUrl, esModuleInterop, isolatedModules, jsx, lib, module (+16 more)

### Community 20 - "Real Adapter GH/Composer"
Cohesion: 0.10
Nodes (26): Kind, KINDS, DurationChart(), ThroughputChart(), CodexTierSummary, DurationGroup, effectiveEffortLabel(), effectiveModelLabel() (+18 more)

### Community 21 - "Store Types & Agent Knobs"
Cohesion: 0.08
Nodes (83): agent_context_html(), agent_entry_count(), axes_html(), axis_anchor(), axis_head_html(), axis_items(), axis_section_html(), axis_statuses() (+75 more)

### Community 22 - "DB Row Schemas & Mappers"
Cohesion: 0.05
Nodes (63): formatPrdDocumentIssues(), log, ToolHandler, ToolResult, ExecutionFinishStatus, LiveSession, log, PendingSessionMessage (+55 more)

### Community 23 - "Dev Dependencies"
Cohesion: 0.06
Nodes (31): AnalyzeTicketsInput, AppSettings, CreateAskInput, CreateAutomationInput, CreateCleanInput, CreateCommentInput, createConversationSchema, CreateProfileInput (+23 more)

### Community 24 - "TypeScript Config"
Cohesion: 0.12
Nodes (25): bashCommandSchema, buildSettings(), claudeProvider, createSdkAgentSession(), denyBashHook(), denyNoVerifyHook, denyReviewPublishingHook, denyTypecheckHook() (+17 more)

### Community 25 - "Client Hub & Watchdog"
Cohesion: 0.11
Nodes (7): AgentCoordinator, logRejection(), SessionToolCall, mapAgentMessageRow(), mapCommentRow(), getErrorStack(), AgentMessage

### Community 26 - "Cost & Pricing"
Cohesion: 0.11
Nodes (15): buildAtelierConsolidateTurn(), buildAtelierPrompt(), buildAtelierRegenerationTurn(), buildAuthoringRules(), buildFraming(), buildHistory(), buildResearch(), buildRole() (+7 more)

### Community 27 - "Workflow View & Lifecycle"
Cohesion: 0.05
Nodes (31): Architecture, Commands, Conventions (enforced — beyond the global ones in ~/.claude/CLAUDE.md), graphify, The dry-run safety model — read before running anything, What this is, Agent runtime, Architecture (+23 more)

### Community 28 - "Stats Charts"
Cohesion: 0.06
Nodes (46): AgentMcpServerDefinition, codexCommandPolicyScript(), agentMessageDeltaSchema, agentToml(), apiWriteDenyScript(), buildMcpServers(), ConfigObject, configReadResponseSchema (+38 more)

### Community 29 - "Session Hub & Agent Session"
Cohesion: 0.18
Nodes (36): AtelierSessionInput, ProjectKey, AutomationPatch, ConversationPatch, NewAsk, NewAutomation, NewClean, NewConversation (+28 more)

### Community 30 - "Agents View & Ticket Cards"
Cohesion: 0.47
Nodes (5): COLUMN_NODE_COLOR, depthOf(), truncate(), WorkflowView(), WorkflowViewProps

### Community 31 - "PRD Review & Markdown"
Cohesion: 0.06
Nodes (55): BOARD_FINDING_RENDER_STYLE, implementationScopesOverlap(), log, normalizeImplementationScope(), renderFinding(), renderPersistedReviewResult(), REVIEW_DISALLOWED_TOOLS, REVIEW_REPORT_LABELS (+47 more)

### Community 32 - "User Terminal & Fake IO"
Cohesion: 0.13
Nodes (22): AgentCard(), AgentCardProps, AgentsView(), AgentsViewProps, hasLiveAgent(), normalize(), AtelierView(), findPrdConversation() (+14 more)

### Community 33 - "Logging"
Cohesion: 0.10
Nodes (21): scripts, build:desktop, build:web, dev, dev:desktop, dev:proxy, dev:server, dev:web (+13 more)

### Community 34 - "Board Columns"
Cohesion: 0.16
Nodes (21): AppliedPath, copyDependencies(), copyPath(), DelegationWorkspace, ensureParentDirectory(), FileState, git(), installStagedPath() (+13 more)

### Community 35 - "NPM Scripts"
Cohesion: 0.15
Nodes (10): startFeasibilityTicket(), addUsageByModel(), toUsageByModel(), TicketLifecycle, createSplitChildren(), failSplitMother(), performSplit(), splitMotherBranch() (+2 more)

### Community 36 - "Runtime Dependencies"
Cohesion: 0.05
Nodes (44): buildNotionImportPrompt(), ProjectInUseError, attachment(), cleanDescription(), CONVERSATION_STATUS_FOR_PRD, conversationTitle(), isProcessing(), isWebOnlyPath() (+36 more)

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
Cohesion: 0.08
Nodes (12): childTranscriptPrefix(), DelegationManager, orderedReviewKinds(), reviewKey(), assertExecutionAvailable(), FindingRenderStyle, finding(), allowedReviewPasses() (+4 more)

### Community 41 - "Ticket Config & Constants"
Cohesion: 0.06
Nodes (67): RFC-4180, ProjectInfo, AgentProfileConfig(), AskPanel(), AskPanelProps, NewConversationForm(), NewConversationFormProps, seedMessage() (+59 more)

### Community 42 - "Ticket Detail & Triage UI"
Cohesion: 0.11
Nodes (5): ActionSystem, PaneReader, CapabilityCache, ImportNotionOptions, CodexRuntimeStatus

### Community 43 - "Demo Pipeline Concepts"
Cohesion: 0.07
Nodes (15): FakePaneStream, RealPaneStream, PaneStream, dataMessage(), log, normalizeSeed(), safeParse(), send() (+7 more)

### Community 44 - "Chart Primitives"
Cohesion: 0.28
Nodes (13): abortReason(), computeCodeFingerprint(), FingerprintEntry, FingerprintPhase, hashFingerprintPaths(), isMissingFileError(), listFingerprintPaths(), log (+5 more)

### Community 45 - "Session Hub Transcript"
Cohesion: 0.11
Nodes (12): setup(), resolveDataFile(), resolveServerPort(), startServer(), parseLegacyConfig(), PrNotificationMonitor, isBlocked(), isSplitMother() (+4 more)

### Community 46 - "Community 46"
Cohesion: 0.27
Nodes (15): Agent Implementation Config, Argus Code Review, Automated Tests (typecheck/lint/test), Claude Code Autonomous Agent, Ticket Contract Injection, Feasibility Analysis, Kanban Board (Atelier), Kanban Agents Demo (demo.gif) (+7 more)

### Community 47 - "Modal Dialogs"
Cohesion: 0.22
Nodes (21): buildCleanContract(), buildConflictResolutionContract(), buildFeasibilityBatchContract(), buildReviewContract(), buildReviewFixLines(), buildReviewPublicationStep(), buildReviewSteps(), buildSessionFramingLine() (+13 more)

### Community 48 - "Community 48"
Cohesion: 0.10
Nodes (17): TicketCreationRequestConflictError, AnalyzeTicketRejectionReason, AnalyzeTicketsResult, CreateTodoTicketInput, createTodoTicketInputSchema, CreateTodoTicketResult, log, normalizeCreateInput() (+9 more)

### Community 49 - "Slot State"
Cohesion: 0.06
Nodes (37): AtelierPromptInput, PRD_SPLIT_MODE_LABELS, PRD_SPLIT_MODES, PrdSplitMode, Conversation, ConversationMessage, PrdDocumentRecord, WsClientEvent (+29 more)

### Community 50 - "Stats Hooks & Cards"
Cohesion: 0.14
Nodes (17): ACTIVE_BAR, AREA_CURSOR, AXIS_PROPS, BAR_CURSOR, CHART_PALETTE, CodexTierSummary(), colorAt(), DurationBars() (+9 more)

### Community 51 - "Community 51"
Cohesion: 0.06
Nodes (12): ImplementSessionInput, NewProject, ProjectPatch, detectInstallCommand(), realpathSafe(), RealSystemAdapter, resolveWorktreeScriptCommand(), setupOutputExcerpt() (+4 more)

### Community 52 - "repairPath.ts"
Cohesion: 0.06
Nodes (38): Block, blockText(), compactChunks(), firstCharCode(), TranscriptBuffer, trimBlockStart(), AgentStreamBlock, terminalServerMessageSchema (+30 more)

### Community 53 - "User Terminal Manager"
Cohesion: 0.33
Nodes (5): CONTEXT — domain glossary, Execution, Proposed (not yet built), Seams, Work items

### Community 54 - "Community 54"
Cohesion: 0.27
Nodes (4): BoundedCommandResult, connectionFailure(), connectionResult(), VcsConnectionResult

### Community 55 - "App.tsx"
Cohesion: 0.17
Nodes (3): FeasibilityBatchManager, toTriageResult(), FeasibilityResult

### Community 56 - "CSV Parsing"
Cohesion: 0.14
Nodes (21): ColumnActionsMenu(), ColumnActionsMenuProps, ColumnMenuItem, ActionContext, buildActions(), ConfirmSpec, errorMessage(), RETRY_STAGES (+13 more)

### Community 57 - "Community 57"
Cohesion: 0.17
Nodes (16): isCodexFastServiceTier(), summarizeSessionCosts(), totalTokensOf(), totalTokensOfSessions(), executionCosts(), executionTokens(), projectStatRecord(), CostSummary() (+8 more)

### Community 58 - "File Uploads"
Cohesion: 0.16
Nodes (12): ChartConfig, ChartContainer, ChartContainerProps, ChartContext, ChartContextValue, ChartLegendContent(), ChartLegendContentProps, ChartTooltipContent() (+4 more)

### Community 59 - "triageManager.ts"
Cohesion: 0.13
Nodes (23): buildContractConstraintsLines(), buildResponseFormatLines(), buildStrictRulesLines(), buildTicketLines(), buildTriageChannelPrompt(), buildTriagePlusChannelPrompt(), isEnglish(), readOnlyFramingLines() (+15 more)

### Community 60 - "Package Manifest"
Cohesion: 0.18
Nodes (14): FAILURE_COLUMNS, SUCCESS_COLUMNS, StatRecord, StatCard(), StatCardProps, StatEmpty(), OutcomeChart(), SuccessRateChart() (+6 more)

### Community 61 - "splitManager.ts"
Cohesion: 0.40
Nodes (4): PR review counting and publication correction state, Progress, Scope and decisions, Verification

### Community 62 - "TicketCard.tsx"
Cohesion: 0.06
Nodes (46): directories, AGENTS_SKILLS_DIR, CLAUDE_JSON_PATH, CLAUDE_SKILLS_DIR, commandOutputOrNull(), COMPOSER_BINARIES, DEFAULT_CODEX_HOME, GitRemoteFacts (+38 more)

### Community 63 - "Community 63"
Cohesion: 0.19
Nodes (11): ensureClaudeBinary(), dispatchClaudeMessage(), gitMetadataWritableRoots(), agentBaseEnv(), bestInstalledMatch(), compareParts(), envWithProjectNode(), nvmNodeBinDir() (+3 more)

### Community 64 - "Composer Run Script"
Cohesion: 0.07
Nodes (48): orderSelectedTasks(), prdCardDrafts(), axisIdSchema, DUPLICATE_ITEMS_ISSUE, hasDuplicates(), identifierSchema, isUnique(), nonEmptyTextArraySchema (+40 more)

### Community 65 - "split.ts"
Cohesion: 0.22
Nodes (8): AtelierDesktopRpcSchema, DesktopRequests, McpSettingsMetadata, WebviewRequests, McpSettingsController, createMcpSettingsClient(), getMcpSettingsClient(), McpSettingsClient

### Community 66 - "prUrl.ts"
Cohesion: 0.18
Nodes (17): COLUMN_SORT_FIELD, BoardColumn(), compareFamilyMembers(), familyKeyOf(), groupTicketIds(), groupTicketsByFamily(), isSplitMother(), readCollapsed() (+9 more)

### Community 67 - "TerminalView.tsx"
Cohesion: 0.10
Nodes (32): FILLED_GLYPH_COLORS, StageProgressBar(), StageProgressBarProps, TriageSection(), STATE_STRIPE_COLORS, TicketCard(), TicketCardProps, TriageDot() (+24 more)

### Community 68 - "schema.test.ts"
Cohesion: 0.05
Nodes (71): RepoInspectionSource, ManagedProject, dragKeys(), groupCountLabel(), groupSortId(), ListGroup, ProjectList(), ProjectListProps (+63 more)

### Community 69 - "reviewFindings.ts"
Cohesion: 0.20
Nodes (12): active, COMPLETION_FREQUENCIES, ensureNotificationPermission(), getAudioContext(), getStoredSoundEnabled(), isSupported(), playNotificationSound(), playTones() (+4 more)

### Community 70 - "CodexRuntimeStatus"
Cohesion: 0.08
Nodes (33): ActiveReview, ActiveReviewPass, CODEX_LAUNCH_STATUS_MESSAGES, CodexCapabilityReader, ExecutionOverrides, FEASIBILITY_ENGINE_EXECUTION, ResolvedExecution, resolveExecution() (+25 more)

### Community 71 - "PostCSS Config"
Cohesion: 0.29
Nodes (6): name, overrides, zod, private, type, version

### Community 72 - ".publishReviewUnderRepoLock"
Cohesion: 0.20
Nodes (7): AZURE_COMMANDS, COMMANDS_BY_PROVIDER, GITHUB_COMMANDS, PrDiffContext, VcsCleanCommands, AZ_SETTLED_THREAD_STATUSES, VCS_PROVIDER_LABELS

### Community 73 - "TerminalView.tsx"
Cohesion: 0.08
Nodes (41): AGENT_EFFORT_FULL_LABELS, AGENT_MODEL_FULL_LABELS, CODEX_EFFORT_FULL_LABELS, CONVERSATION_STATUS_LABELS, ConversationStatus, enabledResearchOptionKeys(), AtelierViewProps, ComposeState (+33 more)

### Community 74 - "button.tsx"
Cohesion: 0.07
Nodes (48): ORCHESTRATOR_LABELS, ORCHESTRATORS, availableSkillProviders(), expectedSkillPaths(), HOST_SKILL_ROOTS, missingSkillProviders(), SKILL_REQUIREMENTS, SKILL_TIERS (+40 more)

### Community 75 - ".handleRequest"
Cohesion: 0.11
Nodes (14): analyzeResultSchema, compactTicketSchema, createResultSchema, errorResultSchema, ISOLATED_ENV_KEYS, projectResultSchema, savedEnv, startResultSchema (+6 more)

### Community 76 - "usePrdSearch.ts"
Cohesion: 0.08
Nodes (17): RecordingSystemAdapter, FailedReformulation, dryRunLog, fakeEncoder, fakeMissingKey(), hexToBytes(), NOTE: same dry-run stance as checkClaudeAvailable: every skill reported installe, GitWorktreeAddOptions (+9 more)

### Community 78 - "csv.ts"
Cohesion: 0.07
Nodes (13): DoneGateResult, ReviewHeadResult, ReviewPublicationState, FAKE_OPEN_PRS, FakeVcsClient, githubPrHeadRef(), CreatePrResult, ReviewPublicationCheck (+5 more)

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
Cohesion: 0.09
Nodes (19): defaultProjectLookup(), resolveBaseBranch(), buildAskContract(), groupFeasibilityTickets(), assertCodexImplementerAvailable(), SlotManager, slotPath(), resolveTemplatePaths() (+11 more)

### Community 86 - "vcsCommands.ts"
Cohesion: 0.36
Nodes (7): effectivePort(), isAllowedHost(), isAllowedOrigin(), isAuthorized(), isLoopbackHost(), jsonResponse(), parseHost()

### Community 89 - "usePrdSearch.ts"
Cohesion: 0.47
Nodes (4): agentPairError(), ticketDependencyError(), isAllowedAgentPair(), deriveTitleFromDescription()

### Community 90 - "Profile"
Cohesion: 0.22
Nodes (4): PublicMcpManager, isActive(), isBlocked(), TicketOperations

### Community 92 - "TerminalSessionManager"
Cohesion: 0.28
Nodes (9): buildFeasibilityContextSection(), buildImplementingSteps(), buildMockupReviewStep(), buildPlanningStep(), buildPrdBullet(), buildTicketContract(), buildValidatedPrdSection(), buildVerifyStep() (+1 more)

### Community 93 - "ColumnActionsMenu.tsx"
Cohesion: 0.25
Nodes (7): Azure DevOps support — state file, Decisions (validated by the owner, 2026-09-21), Goal, Known blockers for lots 3 and 4, Open questions, Progress, Verified on this machine (az 2.90.0, azure-devops 1.0.8)

### Community 94 - ".addComment"
Cohesion: 0.06
Nodes (37): projectConfigSchema, mapReviewApprovalRow(), AttachExecutionSessionInput, EnqueueAgentMessageInput, FinalizeExecutionInput, MarkAgentMessageAcceptedInput, MarkAgentMessageReceivedInput, MarkAgentMessageRejectedInput (+29 more)

### Community 95 - "TicketConfigSummary.tsx"
Cohesion: 0.50
Nodes (3): appBundle, EMBEDDED_BINARIES, resourcesApp

### Community 98 - "usePrdSearch.ts"
Cohesion: 0.09
Nodes (18): boundedCommandDetail(), runBoundedCommand(), safeJsonParse(), withJsonRequestFile(), AzureDevopsVcsClient, prWebUrl(), readOriginRemote(), repoRefFromPrUrl() (+10 more)

### Community 99 - "reviewPublishingGuard.ts"
Cohesion: 0.07
Nodes (35): API_GUARDS, API_READ_METHOD_SET, ApiDenyPatterns, ApiGuard, AZ_INVOKE_COMMAND, AZ_INVOKE_METHOD_LONG_FLAGS, AZ_INVOKE_WRITE_INPUT_LONG_FLAGS, AZ_PR_WRITE_PATTERN (+27 more)

### Community 100 - ".startVerification"
Cohesion: 0.08
Nodes (25): $ref, $ref, enum, $ref, $ref, properties, designConsiderations, goals (+17 more)

### Community 102 - "prd.schema.json"
Cohesion: 0.29
Nodes (6): additionalProperties, $id, required, $schema, title, type

### Community 103 - "TerminalSession"
Cohesion: 0.05
Nodes (15): reviewPublicationEvent(), publishedReviewFindings(), featureBranch(), log, ReclaimOutcome, reviewPublicationState(), SETUP_PHASES, SlotManagerConfig (+7 more)

### Community 105 - "createMcpServer"
Cohesion: 0.09
Nodes (23): $ref, $ref, $ref, minLength, type, minLength, type, enum (+15 more)

### Community 106 - "usePrdSearch.ts"
Cohesion: 0.09
Nodes (19): ANSI, appendToLogFile(), COLOR_ENABLED, disableFileLogging(), initLogFile(), isLevel(), Level, LEVEL_ORDER (+11 more)

### Community 107 - "azureRemote.ts"
Cohesion: 0.40
Nodes (10): azureOrgUrl(), fromAzureSegments(), fromCollectionSegments(), fromLegacySegments(), fromSshSegments(), parseAzureRepoRef(), parseRemoteLocation(), RemoteLocation (+2 more)

### Community 108 - "WorkflowView.tsx"
Cohesion: 0.09
Nodes (22): axes, designConsiderations, goals, id, locale, openQuestions, outOfScope, preDraft (+14 more)

### Community 109 - "TicketMeta.tsx"
Cohesion: 0.28
Nodes (7): columnSchema, PrdOriginRowProps, STATUS_CONFIRMS, StatusConfirm, statusTitle(), TicketMeta(), finishedKindLabel()

### Community 110 - "split.ts"
Cohesion: 0.46
Nodes (5): buildSplitChannelPrompt(), buildTicketLines(), isEnglish(), extractFigmaUrls(), hasMockups()

### Community 111 - "uploads.ts"
Cohesion: 0.40
Nodes (5): MIME_EXTENSIONS, resolveExtension(), SavedUpload, saveUpload(), serveUpload()

### Community 112 - "useSavedFlash.ts"
Cohesion: 0.36
Nodes (5): applyDesktopEnv(), DesktopRoots, ensureMcpToken(), regenerateMcpToken(), temporaryDirectories

### Community 114 - "ApiDenyPatterns"
Cohesion: 0.04
Nodes (25): AutomationManager, mapAutomationRow(), mapAutomationRunRow(), mapConversationMessageRow(), mapConversationRow(), mapPrNotificationRow(), mapPrNotificationSyncRow(), mapProfileRow() (+17 more)

### Community 116 - "settings.tsx"
Cohesion: 0.05
Nodes (65): Capabilities, AtelierAgentFields(), CleanPrPanel(), CodexAgentFields(), CodexAgentFieldsProps, CodexConnectionStatus(), STATUS_LABELS, ImplementationAgentFields() (+57 more)

### Community 119 - "AgentMessage"
Cohesion: 0.11
Nodes (19): items, maxItems, minItems, type, uniqueItems, $ref, axes, requirements (+11 more)

### Community 120 - "ProjectPanel.tsx"
Cohesion: 0.11
Nodes (17): Agent session (server), Architecture decisions, Atelier (conversation → PRD → cards) — implementation state, Contract injection, Follow-ups noticed in Lot A, Goal, Lot A public API (use these names in Lots B and C), Lot B public surface and deviations (read before Lot C/D) (+9 more)

### Community 121 - "VcsConnectionResult"
Cohesion: 0.06
Nodes (33): CodexAppServerConnection, CodexAppServerInitializationError, CodexAppServerProtocolError, CodexAppServerRpcError, connectCodexAppServer(), incomingSchema, initializeResponseSchema, log (+25 more)

### Community 124 - "useSavedFlash.ts"
Cohesion: 0.09
Nodes (14): CodexAppServerNotification, CodexAppServerOptions, canonicalJson(), CodexCommandHook, codexSessionPreToolUseHookHash(), JsonValue, CodexProviderDependencies, createCodexProvider() (+6 more)

### Community 126 - "TicketOperations"
Cohesion: 0.06
Nodes (32): ACTIVITY_PROGRESS_KINDS, AssistantPart, AtelierManagerDeps, ConversationRuntime, describeToolUse(), log, SubmittedTurn, CLAUDE_CONVERSATION (+24 more)

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

### Community 152 - "McpSettingsControllerDependencies"
Cohesion: 0.22
Nodes (4): McpTokenSource, createMcpSettingsController(), McpSettingsControllerDependencies, temporaryDirectories

### Community 160 - "createMcpServer"
Cohesion: 0.43
Nodes (6): createMcpServer(), invalidInput(), listPublicProjects(), OutputValidator, toolError(), toolResult()

## Knowledge Gaps
- **925 isolated node(s):** `HomeView`, `HOME_VIEW_OPTIONS`, `NotificationFilter`, `FILTERS`, `temporaryDirectories` (+920 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Ticket` connect `NPM Scripts` to `Contract Building & Slots`, `Desktop Bootstrap & Menus`, `Feasibility Batch Management`, `PR Selection & Slots Bar`, `Real System Adapter`, `Core Domain Concepts`, `Coordinator & Protocol`, `API Routes & Reformulate`, `Live Terminal Views`, `Dev Dependencies`, `Client Hub & Watchdog`, `Session Hub & Agent Session`, `Agents View & Ticket Cards`, `PRD Review & Markdown`, `User Terminal & Fake IO`, `Runtime Dependencies`, `API Client Inputs`, `Ticket Config & Constants`, `Modal Dialogs`, `Community 48`, `Slot State`, `Community 51`, `repairPath.ts`, `CSV Parsing`, `Community 57`, `triageManager.ts`, `prUrl.ts`, `TerminalView.tsx`, `CodexRuntimeStatus`, `.getReviewPass`, `usePrdSearch.ts`, `createCodexAgentSession`, `.addComment`, `TerminalSession`, `TicketMeta.tsx`, `split.ts`, `ApiDenyPatterns`, `settings.tsx`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Why does `Store` connect `ApiDenyPatterns` to `Desktop Bootstrap & Menus`, `API Routes & Reformulate`, `Stats Aggregation`, `DB Row Schemas & Mappers`, `Client Hub & Watchdog`, `Cost & Pricing`, `PRD Review & Markdown`, `NPM Scripts`, `Runtime Dependencies`, `API Client Inputs`, `Demo Pipeline Concepts`, `Modal Dialogs`, `Community 48`, `App.tsx`, `CodexRuntimeStatus`, `.getReviewPass`, `.addComment`, `TerminalSession`, `TicketOperations`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Why does `DelegationManager` connect `API Client Inputs` to `Desktop Bootstrap & Menus`, `NPM Scripts`, `TerminalSession`, `Session Hub Transcript`, `API Routes & Reformulate`, `DB Row Schemas & Mappers`, `Client Hub & Watchdog`, `TicketOperations`, `PRD Review & Markdown`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **What connects `HomeView`, `HOME_VIEW_OPTIONS`, `NotificationFilter` to the rest of the system?**
  _937 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Contract Building & Slots` be split into smaller, more focused modules?**
  _Cohesion score 0.030728709394205442 - nodes in this community are weakly interconnected._
- **Should `Terminals UI & Notifications` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._
- **Should `Desktop Bootstrap & Menus` be split into smaller, more focused modules?**
  _Cohesion score 0.06965174129353234 - nodes in this community are weakly interconnected._