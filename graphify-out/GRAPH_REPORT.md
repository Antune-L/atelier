# Graph Report - kanban-agents  (2026-09-30)

## Corpus Check
- 305 files · ~782,093 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3816 nodes · 10044 edges · 144 communities (134 shown, 10 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 60 edges (avg confidence: 0.62)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `76478273`
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
- VcsConnectionResult
- createMcpServer
- AutomationView.tsx
- useSavedFlash.ts
- prMerge.ts
- TicketOperations
- TerminalSessionManager
- slotTemplates.ts
- KeyedMutex
- renderPrdHtml.ts
- AgentsView.tsx
- usePrdSearch.ts
- StageProgressBar.tsx
- id
- split.ts
- createAtelierRoutes
- performSplit
- WorktreeAddressWatcher
- $defs
- title
- preDraft
- AgentMessage
- prd.schema.json

## God Nodes (most connected - your core abstractions)
1. `Store` - 152 edges
2. `Ticket` - 110 edges
3. `SystemAdapter` - 83 edges
4. `cn()` - 79 edges
5. `FakeSystemAdapter` - 78 edges
6. `createApiRoutes()` - 77 edges
7. `RealSystemAdapter` - 71 edges
8. `SlotManager` - 58 edges
9. `DelegationManager` - 55 edges
10. `SessionHub` - 52 edges

## Surprising Connections (you probably didn't know these)
- `McpSettingsClient` --references--> `McpSettingsMetadata`  [EXTRACTED]
  src/web/src/lib/mcpSettings.ts → desktop/mcpRpc.ts
- `ImplementSessionInput` --references--> `Ticket`  [EXTRACTED]
  src/server/agents/sessionConfig.ts → src/shared/schemas.ts
- `StageProgressBarProps` --references--> `Ticket`  [EXTRACTED]
  src/web/src/components/StageProgressBar.tsx → src/shared/schemas.ts
- `TerminalTabProps` --references--> `Ticket`  [EXTRACTED]
  src/web/src/components/ticket-detail/TerminalTab.tsx → src/shared/schemas.ts
- `TicketActionsProps` --references--> `Ticket`  [EXTRACTED]
  src/web/src/components/ticket-detail/TicketActions.tsx → src/shared/schemas.ts

## Import Cycles
- None detected.

## Communities (144 total, 10 thin omitted)

### Community 0 - "Contract Building & Slots"
Cohesion: 0.03
Nodes (79): formatPrdDocumentIssues(), log, logRejection(), ToolHandler, ToolResult, askUserArgsSchema, delegateImplementationArgsSchema, delegateReviewArgsSchema (+71 more)

### Community 1 - "Terminals UI & Notifications"
Cohesion: 0.07
Nodes (37): analyzeTicketsInputSchema, analyzeTicketsOutputSchema, columnSchema, compactTicketSchema, createMcpServer(), createTodoTicketOutputSchema, editableTicketSchema, effectivePort() (+29 more)

### Community 2 - "Desktop Bootstrap & Menus"
Cohesion: 0.29
Nodes (4): createCodexAgentSession(), inheritedMcpServerNames(), PreparedHook, prepareSkills()

### Community 3 - "Feasibility Batch Management"
Cohesion: 0.08
Nodes (44): CONVERSATION_STATUS_LABELS, PRD_SPLIT_MODE_LABELS, PRD_SPLIT_MODES, PrdSplitMode, Conversation, AtelierViewProps, ComposeState, PrdSeen (+36 more)

### Community 4 - "Ticket Action Panels"
Cohesion: 0.09
Nodes (17): CapturingSystem, CLAUDE_CONVERSATION, closers, CODEX_CONVERSATION, TEMPLATE_PATH, TURN_END, AckSystem, RecordingSystem (+9 more)

### Community 5 - "Fake System Adapter"
Cohesion: 0.05
Nodes (62): RepoInspectionSource, CreateProjectInput, UpdateProjectInput, vcsProviderSchema, ConnectionHint, CreateStep, isPositiveIntegerString(), isValidDraft() (+54 more)

### Community 6 - "Shared Zod Schemas"
Cohesion: 0.05
Nodes (57): RESEARCH_OPTION_KEYS, ResearchOptionKey, enabledResearchOptionKeys(), researchOptionsFromKeys(), isResearchOptionKey(), ResearchFields(), PrdAnnotator(), PrSelectRow() (+49 more)

### Community 7 - "Settings & Profiles UI"
Cohesion: 0.06
Nodes (13): RelaunchSystem, FailedReformulation, delay(), dryRunLog, fakeEncoder, fakeMissingKey(), fakeShellPrompt(), FakeSystemAdapter (+5 more)

### Community 8 - "PR Selection & Slots Bar"
Cohesion: 0.15
Nodes (20): prNumberFromUrl(), AgentCard(), STATE_STRIPE_COLORS, TicketCard(), TicketCardProps, TriageDot(), truncateParentTitle(), currentNow (+12 more)

### Community 9 - "Real System Adapter"
Cohesion: 0.05
Nodes (47): FULL_REVIEW_KINDS, LIGHT_REVIEW_KINDS, AGENT_EFFORT_LABELS, AGENT_MODEL_LABELS, AUTOMATION_RUN_STATUSES, AUTOMATION_TRIGGER_LABELS, AUTOMATION_TRIGGERS, AutomationRunStatus (+39 more)

### Community 10 - "Slot Config & Worktree Watch"
Cohesion: 0.12
Nodes (13): directories, initializeParamsSchema, log, requestSchema, rpcError(), rpcResult(), rpcResponseSchema, toolCallParamsSchema (+5 more)

### Community 11 - "Core Domain Concepts"
Cohesion: 0.03
Nodes (62): agentMessageRowSchema, AutomationRow, automationRowSchema, AutomationRunRow, automationRunRowSchema, buildScripts(), CommentRow, commentRowSchema (+54 more)

### Community 12 - "Board & Sidebar Layout"
Cohesion: 0.06
Nodes (33): AnalyzeTicketsInput, Comment, CreateAskInput, CreateAutomationInput, CreateCleanInput, CreateCommentInput, createConversationSchema, CreateProfileInput (+25 more)

### Community 13 - "Database Store Operations"
Cohesion: 0.08
Nodes (23): axisIdSchema, DUPLICATE_ITEMS_ISSUE, hasDuplicates(), identifierSchema, isUnique(), nonEmptyTextArraySchema, PRD_LOCALES, PRD_REQUIREMENT_KINDS (+15 more)

### Community 14 - "Coordinator & Protocol"
Cohesion: 0.15
Nodes (18): LaunchForm(), LaunchFormProps, formatErrorDetails(), OverviewTab(), OverviewTabProps, SUMMARY_COLUMNS, availableTabs(), hasSessionPane() (+10 more)

### Community 15 - "API Routes & Reformulate"
Cohesion: 0.08
Nodes (38): main(), scalar(), setup(), setup(), initProjectRegistry(), assertCodexDowngradeSafe(), backfillOrchestrator(), countRows() (+30 more)

### Community 17 - "Triage & Server Hub"
Cohesion: 0.08
Nodes (25): devDependencies, autoprefixer, class-variance-authority, clsx, concurrently, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities (+17 more)

### Community 18 - "Live Terminal Views"
Cohesion: 0.07
Nodes (39): isReviewFixSession(), ATELIER_WEB_TOOLS, AZURE_BASH_ALLOWLIST, AZURE_CLEAN_BASH_ALLOWLIST, BASH_ALLOWLIST, bashAllowlist(), buildFeasibilitySessionConfig(), buildImplementSessionConfig() (+31 more)

### Community 19 - "Stage Progress & Display"
Cohesion: 0.08
Nodes (24): compilerOptions, allowImportingTsExtensions, baseUrl, esModuleInterop, isolatedModules, jsx, lib, module (+16 more)

### Community 20 - "Real Adapter GH/Composer"
Cohesion: 0.10
Nodes (23): Kind, KINDS, CodexTierSummary(), DurationChart(), effectiveWorkDurationMs(), ticketImplementationDuration(), CodexTierSummary, DurationGroup (+15 more)

### Community 21 - "Store Types & Agent Knobs"
Cohesion: 0.08
Nodes (83): agent_context_html(), agent_entry_count(), axes_html(), axis_anchor(), axis_head_html(), axis_items(), axis_section_html(), axis_statuses() (+75 more)

### Community 22 - "DB Row Schemas & Mappers"
Cohesion: 0.06
Nodes (74): RFC-4180, isNotionUrl(), NOTION_HOSTS, ProjectInfo, AskPanel(), AskPanelProps, NewConversationForm(), seedMessage() (+66 more)

### Community 23 - "Dev Dependencies"
Cohesion: 0.06
Nodes (40): defaultProjectLookup(), groupFeasibilityTickets(), computeWorktreeAddresses(), log, SlotWatch, log, runFirstBootSetup(), applyAppSettingsToModels() (+32 more)

### Community 24 - "TypeScript Config"
Cohesion: 0.13
Nodes (24): bashCommandSchema, buildSettings(), claudeProvider, createSdkAgentSession(), denyBashHook(), denyNoVerifyHook, denyReviewPublishingHook, denyTypecheckHook() (+16 more)

### Community 25 - "Client Hub & Watchdog"
Cohesion: 0.14
Nodes (5): AgentCoordinator, SessionMessageContext, SessionToolCall, ticketDependencyError(), deriveTitleFromDescription()

### Community 26 - "Cost & Pricing"
Cohesion: 0.09
Nodes (19): buildAtelierConsolidateTurn(), buildAtelierRegenerationTurn(), ACTIVITY_PROGRESS_KINDS, AssistantPart, AtelierManager, AtelierManagerDeps, ConversationRuntime, describeToolUse() (+11 more)

### Community 27 - "Workflow View & Lifecycle"
Cohesion: 0.06
Nodes (28): Architecture, Commands, Conventions (enforced — beyond the global ones in ~/.claude/CLAUDE.md), graphify, The dry-run safety model — read before running anything, What this is, Agent runtime, Architecture (+20 more)

### Community 28 - "Stats Charts"
Cohesion: 0.06
Nodes (43): codexCommandPolicyScript(), agentMessageDeltaSchema, agentToml(), apiWriteDenyScript(), buildMcpServers(), CodexProviderDependencies, ConfigObject, configReadResponseSchema (+35 more)

### Community 29 - "Session Hub & Agent Session"
Cohesion: 0.05
Nodes (45): AtelierSessionInput, SessionStartConfig, AttachExecutionSessionInput, AutomationPatch, ConversationPatch, EnqueueAgentMessageInput, FinalizeExecutionInput, MarkAgentMessageAcceptedInput (+37 more)

### Community 30 - "Agents View & Ticket Cards"
Cohesion: 0.11
Nodes (17): AgentSettableStage, agentSettableStageSchema, AssertNamesCovered, channelEventSchema, reviewFindingSeveritySchema, reviewFindingVerificationSchema, reviewKindSchema, SplitChildMcpInput (+9 more)

### Community 31 - "PRD Review & Markdown"
Cohesion: 0.11
Nodes (27): ALSO_FLAGGED_PREFIX, dedupeFindings(), DEFAULT_FINDING_RENDER_STYLE, findingAnchor(), FRENCH_STOP_WORD_PATTERN, FRENCH_STOP_WORDS, hasSimilarSummary(), isSameDefect() (+19 more)

### Community 32 - "User Terminal & Fake IO"
Cohesion: 0.15
Nodes (11): AgentMcpServerDefinition, AgentPermissionMode, AgentProvider, AgentSessionEvent, AgentSessionToolResult, AgentSubagentDefinition, AgentTurnUsage, HttpMcpServerDefinition (+3 more)

### Community 33 - "Logging"
Cohesion: 0.10
Nodes (21): scripts, build:desktop, build:web, dev, dev:desktop, dev:proxy, dev:server, dev:web (+13 more)

### Community 34 - "Board Columns"
Cohesion: 0.23
Nodes (19): AppliedPath, copyDependencies(), copyPath(), ensureParentDirectory(), FileState, git(), installStagedPath(), integrateChanges() (+11 more)

### Community 35 - "NPM Scripts"
Cohesion: 0.18
Nodes (8): ReformulateManager, TicketLifecycle, RouteDeps, Stage, ErrorDetailsSource, Ticket, DescriptionTabProps, PrdTabProps

### Community 36 - "Runtime Dependencies"
Cohesion: 0.04
Nodes (47): buildNotionImportPrompt(), ProjectInUseError, cleanDescription(), CONVERSATION_STATUS_FOR_PRD, isBlocked(), isSplitMother(), isWebOnlyPath(), log (+39 more)

### Community 37 - "Claude SDK Provider"
Cohesion: 0.09
Nodes (22): dependencies, @anthropic-ai/claude-agent-sdk, dompurify, elysia, @fontsource/ibm-plex-mono, @fontsource/ibm-plex-sans, marked, @modelcontextprotocol/sdk (+14 more)

### Community 38 - "Agent Profile Config"
Cohesion: 0.16
Nodes (15): costByFamily(), costOf(), costOfModel(), costOfSessions(), CostSummary, FamilyPricing, MODEL_PRICING, ModelFamily (+7 more)

### Community 39 - "Agent Coordinator Handlers"
Cohesion: 0.18
Nodes (17): adopt(), compareVersions(), detectionCandidates(), detectUserInstall(), downloadAndVerifyTarball(), downloadPinnedBinary(), emitProgress(), isCompatibleCli() (+9 more)

### Community 40 - "API Client Inputs"
Cohesion: 0.07
Nodes (8): childTranscriptPrefix(), DelegationManager, implementationScopesOverlap(), normalizeImplementationScope(), renderCollapsedFinding(), reviewKey(), verifiedFindings(), mergeAgentUsageByModel()

### Community 41 - "Ticket Config & Constants"
Cohesion: 0.40
Nodes (5): StatRecord, StatCard(), StatCardProps, StatEmpty(), UseStatsResult

### Community 42 - "Ticket Detail & Triage UI"
Cohesion: 0.15
Nodes (16): ACTIVE_BAR, AREA_CURSOR, AXIS_PROPS, BAR_CURSOR, CHART_PALETTE, colorAt(), DurationBars(), DurationDatum (+8 more)

### Community 43 - "Demo Pipeline Concepts"
Cohesion: 0.06
Nodes (15): FakePaneStream, RealPaneStream, PaneStream, dataMessage(), log, normalizeSeed(), safeParse(), send() (+7 more)

### Community 44 - "Chart Primitives"
Cohesion: 0.31
Nodes (13): abortReason(), computeCodeFingerprint(), FingerprintEntry, FingerprintPhase, hashFingerprintPaths(), isMissingFileError(), listFingerprintPaths(), log (+5 more)

### Community 45 - "Session Hub Transcript"
Cohesion: 0.10
Nodes (7): assertCodexImplementerAvailable(), SlotManager, slotPath(), enrichWorktreeSession(), Slot, WorktreeSession, BoardState

### Community 46 - "Community 46"
Cohesion: 0.27
Nodes (15): Agent Implementation Config, Argus Code Review, Automated Tests (typecheck/lint/test), Claude Code Autonomous Agent, Ticket Contract Injection, Feasibility Analysis, Kanban Board (Atelier), Kanban Agents Demo (demo.gif) (+7 more)

### Community 47 - "Modal Dialogs"
Cohesion: 0.23
Nodes (15): buildFeasibilityBatchContract(), buildFeasibilityContextSection(), buildImplementingSteps(), buildMockupReviewStep(), buildPlanningStep(), buildPrdBullet(), buildSessionFramingLine(), buildTicketContract() (+7 more)

### Community 48 - "Community 48"
Cohesion: 0.07
Nodes (35): isProcessing(), CompactTicket, ListTicketsInput, ACTIVE_STAGES, Column, COLUMN_LABELS, COLUMN_ORDER, COLUMNS (+27 more)

### Community 49 - "Slot State"
Cohesion: 0.05
Nodes (47): WsClientEvent, App(), HOME_VIEW_OPTIONS, HomeView, AtelierView(), findPrdConversation(), ATTENTION_STATUSES, sessionOf() (+39 more)

### Community 50 - "Stats Hooks & Cards"
Cohesion: 0.16
Nodes (12): ChartConfig, ChartContainer, ChartContainerProps, ChartContext, ChartContextValue, ChartLegendContent(), ChartLegendContentProps, ChartTooltipContent() (+4 more)

### Community 51 - "Community 51"
Cohesion: 0.04
Nodes (32): ensureClaudeBinary(), AGENTS_SKILLS_DIR, CLAUDE_JSON_PATH, CLAUDE_SKILLS_DIR, commandOutputOrNull(), COMPOSER_BINARIES, DEFAULT_CODEX_HOME, detectInstallCommand() (+24 more)

### Community 52 - "repairPath.ts"
Cohesion: 0.16
Nodes (12): terminalServerMessageSchema, FullscreenToggle(), FullscreenToggleProps, badgeLabelFor(), LiveTerminal(), LiveTerminalOptions, LiveTerminalProps, TERMINAL_THEME (+4 more)

### Community 53 - "User Terminal Manager"
Cohesion: 0.33
Nodes (5): CONTEXT — domain glossary, Execution, Proposed (not yet built), Seams, Work items

### Community 54 - "Community 54"
Cohesion: 0.04
Nodes (41): BoundedCommandResult, withJsonRequestFile(), connectionFailure(), connectionResult(), FAKE_OPEN_PRS, extractPrUrl(), ghPrHeadSchema, ghPrSchema (+33 more)

### Community 55 - "App.tsx"
Cohesion: 0.16
Nodes (12): startFeasibilityTicket(), ResolvedExecution, DRY_RUN_VERDICT, FeasibilityBatchManager, FeasibilityGroup, FeasibilitySession, log, QueuedFeasibility (+4 more)

### Community 56 - "CSV Parsing"
Cohesion: 0.14
Nodes (21): ColumnActionsMenu(), ColumnActionsMenuProps, ColumnMenuItem, ActionContext, buildActions(), ConfirmSpec, errorMessage(), RETRY_STAGES (+13 more)

### Community 57 - "Community 57"
Cohesion: 0.14
Nodes (8): RecordingSystemAdapter, boundedCommandDetail(), PublishReviewOptions, PublishReviewResult, ReviewPublicationState, GithubVcsClient, pullApiEndpoint(), ReviewPublicationCheck

### Community 58 - "File Uploads"
Cohesion: 0.40
Nodes (8): agentBaseEnv(), bestInstalledMatch(), compareParts(), envWithProjectNode(), nvmNodeBinDir(), readNvmrc(), prepareProjectShell(), shellLiteral()

### Community 59 - "triageManager.ts"
Cohesion: 0.23
Nodes (16): buildContractConstraintsLines(), buildResponseFormatLines(), buildStrictRulesLines(), buildTicketLines(), buildTriageChannelPrompt(), buildTriagePlusChannelPrompt(), isEnglish(), readOnlyFramingLines() (+8 more)

### Community 60 - "Package Manifest"
Cohesion: 0.13
Nodes (10): resolveBaseBranch(), TriageManager, closers, conversationDetailSchema, TEMPLATE_PATH, ticketsResponseSchema, conversationMessageSchema, conversationSchema (+2 more)

### Community 61 - "splitManager.ts"
Cohesion: 0.13
Nodes (18): buildRepoInspection(), formatProjectLabel(), LOCKFILE_NAMES, LOCKFILE_RUNNERS, PackageManifest, packageManifestSchema, PROVIDER_HOST_MARKERS, RepoFacts (+10 more)

### Community 62 - "TicketCard.tsx"
Cohesion: 0.11
Nodes (24): PrdDocumentPatch, PrdAnnotation, prdAnnotationsSchema, FeedbackDraft, PrdAnnotatorProps, BREADCRUMB, NO_ANNOTATIONS, PrdReviewDialog() (+16 more)

### Community 63 - "Community 63"
Cohesion: 0.15
Nodes (13): CHILD_USAGE, FULL_REVIEW_KINDS, LIGHT_REVIEW_KINDS, newDelegatedTicket(), newReviewTicket(), RecordedSession, setup(), sleep() (+5 more)

### Community 64 - "Composer Run Script"
Cohesion: 0.19
Nodes (25): orderSelectedTasks(), prdCardDrafts(), axisTitle(), Block, bulletList(), heading(), joinBlocks(), labelledList() (+17 more)

### Community 65 - "split.ts"
Cohesion: 0.12
Nodes (12): AtelierDesktopRpcSchema, DesktopRequests, McpSettingsMetadata, McpTokenSource, WebviewRequests, createMcpSettingsController(), McpSettingsController, McpSettingsControllerDependencies (+4 more)

### Community 66 - "prUrl.ts"
Cohesion: 0.16
Nodes (3): AutomationManager, Automation, AutomationRun

### Community 67 - "TerminalView.tsx"
Cohesion: 0.18
Nodes (17): COLUMN_SORT_FIELD, BoardColumn(), compareFamilyMembers(), familyKeyOf(), groupTicketIds(), groupTicketsByFamily(), isSplitMother(), readCollapsed() (+9 more)

### Community 68 - "schema.test.ts"
Cohesion: 0.17
Nodes (13): AtelierPromptInput, buildAtelierPrompt(), buildAuthoringRules(), buildFraming(), buildHistory(), buildResearch(), buildRole(), HISTORY_ROLE_LABELS (+5 more)

### Community 69 - "reviewFindings.ts"
Cohesion: 0.08
Nodes (30): ActiveReview, ActiveReviewPass, BOARD_FINDING_RENDER_STYLE, ClosableExecution, log, orderedReviewKinds(), renderFinding(), renderPersistedReviewResult() (+22 more)

### Community 70 - "CodexRuntimeStatus"
Cohesion: 0.17
Nodes (14): assertExecutionAvailable(), CODEX_LAUNCH_STATUS_MESSAGES, CodexCapabilityReader, FEASIBILITY_ENGINE_EXECUTION, resolveExecution(), resolveFeasibilityExecution(), resolveTicketExecution(), READY_CODEX (+6 more)

### Community 71 - "PostCSS Config"
Cohesion: 0.29
Nodes (6): name, overrides, zod, private, type, version

### Community 72 - "useAppSettings.ts"
Cohesion: 0.23
Nodes (10): artifactPath, assertPackageVersionInSync(), assertSdkVersionsInSync(), BUILT_DMG, ELECTROBUN_BIN, fail(), installedPackageVersion(), RELEASE_FOLDER (+2 more)

### Community 73 - "TerminalView.tsx"
Cohesion: 0.06
Nodes (76): ExecutionOverrides, AgentEffort, AgentModel, CodexEffort, CodexModel, FEASIBILITY_ENGINES, FeasibilityEngine, Implementer (+68 more)

### Community 74 - "button.tsx"
Cohesion: 0.15
Nodes (16): expectedSkillPaths(), skillzerInstallCommand(), COPY_LABELS, CopyOutcome, InstallBlock(), installLine(), isFullyInstalled(), MISSING_DOT_CLASSES (+8 more)

### Community 75 - ".handleRequest"
Cohesion: 0.11
Nodes (14): analyzeResultSchema, compactTicketSchema, createResultSchema, errorResultSchema, ISOLATED_ENV_KEYS, projectResultSchema, savedEnv, startResultSchema (+6 more)

### Community 76 - "usePrdSearch.ts"
Cohesion: 0.20
Nodes (9): CapabilityCache, CodexRuntimeModel, codexRuntimeModelSchema, CodexRuntimeStatus, codexRuntimeStatusSchema, pairedRuntimeCodexEffort(), UNKNOWN_CODEX_RUNTIME_STATUS, pairedCodexEffort() (+1 more)

### Community 78 - "csv.ts"
Cohesion: 0.12
Nodes (4): DoneGateResult, ReviewHeadResult, FakeVcsClient, VcsClient

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
Cohesion: 0.10
Nodes (35): AGENT_EFFORT_FULL_LABELS, AGENT_MODEL_FULL_LABELS, CODEX_EFFORT_FULL_LABELS, CODEX_MODEL_LABELS, IMPLEMENTER_LABELS, ProfileConfig, DragHandleAttributes, DragHandleListeners (+27 more)

### Community 86 - "useTickTimer.ts"
Cohesion: 0.17
Nodes (8): AZURE_COMMANDS, COMMANDS_BY_PROVIDER, GITHUB_COMMANDS, PrDiffContext, VcsCleanCommands, VcsCommandTable, AZ_SETTLED_THREAD_STATUSES, VCS_PROVIDER_LABELS

### Community 87 - "mcpSettings.ts"
Cohesion: 0.21
Nodes (13): FAILURE_COLUMNS, SUCCESS_COLUMNS, OutcomeChart(), SuccessRateChart(), ThroughputChart(), nextWeek(), outcomeCounts(), projectCounts() (+5 more)

### Community 89 - "usePrdSearch.ts"
Cohesion: 0.29
Nodes (11): AppSettings, AppSettingsState, flashSaved(), loadOnce(), patchAppSettings(), publish(), snapshot(), state (+3 more)

### Community 90 - "PaneStream"
Cohesion: 0.33
Nodes (9): useTheme(), UseThemeResult, applyTheme(), getStoredTheme(), isTheme(), Theme, ThemeOption, THEMES (+1 more)

### Community 91 - "bootstrap.ts"
Cohesion: 0.11
Nodes (18): CodexAppServerInitializationError, CodexBinaryVersionError, require, resolveCodexBinary(), resolveCodexBinaryOverride(), TARGETS, accountResponseSchema, CodexRuntimeDependencies (+10 more)

### Community 92 - "TerminalSessionManager"
Cohesion: 0.18
Nodes (15): isCodexFastServiceTier(), summarizeSessionCosts(), totalTokensOfSessions(), executionCosts(), executionTokens(), projectStatRecord(), CostSummary(), MetaRow() (+7 more)

### Community 93 - "ColumnActionsMenu.tsx"
Cohesion: 0.25
Nodes (7): Azure DevOps support — state file, Decisions (validated by the owner, 2026-09-21), Goal, Known blockers for lots 3 and 4, Open questions, Progress, Verified on this machine (az 2.90.0, azure-devops 1.0.8)

### Community 94 - ".addComment"
Cohesion: 0.09
Nodes (19): log, log, DRY_RUN_VERDICT, log, TriageSession, log, Watchdog, ClientHub (+11 more)

### Community 95 - "TicketConfigSummary.tsx"
Cohesion: 0.50
Nodes (3): appBundle, EMBEDDED_BINARIES, resourcesApp

### Community 97 - "RunningServer"
Cohesion: 0.12
Nodes (14): PROJECT_ROOT, NOTE: PRD generation holds the request open up to ~120s (REFORMULATE_TIMEOUT_MS), resolveDataFile(), resolveServerPort(), RunningServer, serveStaticAsset(), SocketData, startServer() (+6 more)

### Community 98 - "usePrdSearch.ts"
Cohesion: 0.07
Nodes (34): runBoundedCommand(), safeJsonParse(), azureChangeEntrySchema, azureCommentSchema, AzureDevopsVcsClient, azureIdentitySchema, azureIterationChangesSchema, azureIterationListSchema (+26 more)

### Community 99 - "reviewPublishingGuard.ts"
Cohesion: 0.07
Nodes (35): API_GUARDS, API_READ_METHOD_SET, ApiDenyPatterns, ApiGuard, AZ_INVOKE_COMMAND, AZ_INVOKE_METHOD_LONG_FLAGS, AZ_INVOKE_WRITE_INPUT_LONG_FLAGS, AZ_PR_WRITE_PATTERN (+27 more)

### Community 100 - ".startVerification"
Cohesion: 0.08
Nodes (25): $ref, $ref, enum, $ref, $ref, properties, designConsiderations, goals (+17 more)

### Community 101 - "codexProvider.test.ts"
Cohesion: 0.22
Nodes (7): buildAskContract(), buildCleanContract(), buildConflictResolutionContract(), buildSpecializedFraming(), commitLanguageDirective(), REVIEW_OPTS, TICKET_OPTS

### Community 102 - ".start"
Cohesion: 0.29
Nodes (10): availableSkillProviders(), missingSkillProviders(), SkillsSettings(), missingSignature(), PreflightCopy, providerList(), readDismissedSignature(), SkillsPreflightDialog() (+2 more)

### Community 104 - "settings.tsx"
Cohesion: 0.10
Nodes (15): CodexAppServerConnection, CodexAppServerNotification, CodexAppServerOptions, CodexAppServerProtocolError, connectCodexAppServer(), incomingSchema, initializeResponseSchema, log (+7 more)

### Community 105 - "createMcpServer"
Cohesion: 0.09
Nodes (23): $ref, $ref, $ref, minLength, type, minLength, type, enum (+15 more)

### Community 106 - "usePrdSearch.ts"
Cohesion: 0.11
Nodes (18): ANSI, appendToLogFile(), COLOR_ENABLED, disableFileLogging(), initLogFile(), isLevel(), Level, LEVEL_ORDER (+10 more)

### Community 107 - "azureRemote.ts"
Cohesion: 0.40
Nodes (10): azureOrgUrl(), fromAzureSegments(), fromCollectionSegments(), fromLegacySegments(), fromSshSegments(), parseAzureRepoRef(), parseRemoteLocation(), RemoteLocation (+2 more)

### Community 108 - "WorkflowView.tsx"
Cohesion: 0.09
Nodes (22): axes, designConsiderations, goals, id, locale, openQuestions, outOfScope, preDraft (+14 more)

### Community 109 - "projectDisplay.ts"
Cohesion: 0.42
Nodes (9): buildReviewContract(), buildReviewFixLines(), buildReviewPublicationStep(), buildReviewSteps(), commitLanguageLabel(), resolveReviewLanguage(), reviewCalls(), reviewKinds() (+1 more)

### Community 110 - "Profile"
Cohesion: 0.33
Nodes (6): featureBranch(), log, ReclaimOutcome, SETUP_PHASES, SlotManagerConfig, slugify()

### Community 111 - "FakePaneStream"
Cohesion: 0.17
Nodes (9): ActionSystem, escapeHtml(), renderCollapsedDetails(), renderOutsideDiffComment(), renderOutsideDiffSection(), GitWorktreeAddOptions, ImportNotionOptions, PaneSize (+1 more)

### Community 112 - "useSavedFlash.ts"
Cohesion: 0.36
Nodes (5): applyDesktopEnv(), DesktopRoots, ensureMcpToken(), regenerateMcpToken(), temporaryDirectories

### Community 113 - "repairPath.ts"
Cohesion: 0.20
Nodes (11): projectConfigSchema, buildAppSettingsPatch(), LegacyConfig, legacyConfigSchema, LegacyModels, log, migrateConfigJsonIfPresent(), parseLegacyConfig() (+3 more)

### Community 114 - "ApiDenyPatterns"
Cohesion: 0.06
Nodes (12): PendingSessionMessage, nullableBooleanValue(), serializeErrorDetails(), SqlUpdateBuilder, Store, runRecordedAction(), createApiRoutes(), PaneReader (+4 more)

### Community 115 - "relaunch.ts"
Cohesion: 0.27
Nodes (4): ActiveDelegation, DelegationWorkspace, workspacePath(), ImplementationLotOptions

### Community 116 - "settings.tsx"
Cohesion: 0.07
Nodes (24): CODEX_STATUS_TONES, COMMIT_ROW, DefaultsRowSpec, EFFORT_OPTIONS, FEASIBILITY_ROW, IMPLEMENTATION_ROW, KnobGroupProps, LANGUAGE_OPTIONS (+16 more)

### Community 117 - "useAppSettings.ts"
Cohesion: 0.29
Nodes (6): HOST_SKILL_ROOTS, SKILL_REQUIREMENTS, SKILL_TIERS, SkillRequirement, SKILLS_CLI_AGENTS, SkillTier

### Community 118 - "StageProgressBar.tsx"
Cohesion: 0.33
Nodes (3): SkillStatus, MissingSkill, SkillsStatusListProps

### Community 119 - "AgentMessage"
Cohesion: 0.11
Nodes (19): items, maxItems, minItems, type, uniqueItems, $ref, axes, requirements (+11 more)

### Community 120 - "ProjectPanel.tsx"
Cohesion: 0.11
Nodes (17): Agent session (server), Architecture decisions, Atelier (conversation → PRD → cards) — implementation state, Contract injection, Follow-ups noticed in Lot A, Goal, Lot A public API (use these names in Lots B and C), Lot B public surface and deviations (read before Lot C/D) (+9 more)

### Community 122 - "createMcpServer"
Cohesion: 0.24
Nodes (10): TERMINAL_STAGES, applyTranscriptUpdate(), TranscriptState, transcriptText(), transcriptUpdateSchema, TerminalData, TerminalView(), TerminalViewProps (+2 more)

### Community 123 - "AutomationView.tsx"
Cohesion: 0.26
Nodes (8): Block, blockText(), compactChunks(), firstCharCode(), TranscriptBuffer, trimBlockStart(), AgentStreamBlock, TranscriptUpdate

### Community 124 - "useSavedFlash.ts"
Cohesion: 0.13
Nodes (10): CodexAppServerRpcError, canonicalJson(), CodexCommandHook, codexSessionPreToolUseHookHash(), JsonValue, createCodexProvider(), AppServerFixtureOptions, hookPathForSession() (+2 more)

### Community 126 - "TicketOperations"
Cohesion: 0.23
Nodes (11): PrdDocumentRecord, byCreatedAt(), byRevision(), ConversationDetailView, DetailState, EMPTY_STATE, mergeById(), useConversationDetail() (+3 more)

### Community 127 - "TerminalSessionManager"
Cohesion: 0.13
Nodes (16): nonEmptyStringArray, stringArray, items, type, uniqueItems, minLength, pattern, type (+8 more)

### Community 130 - "renderPrdHtml.ts"
Cohesion: 0.23
Nodes (9): PROJECT_ROOT, PrdRenderError, RENDERER_RELATIVE_PATH, renderPrdHtml(), RenderPrdHtmlInput, resolvePrdRendererPath(), TEMPLATE_PATH, PrdDocument (+1 more)

### Community 131 - "AgentsView.tsx"
Cohesion: 0.24
Nodes (10): AgentCardProps, AgentsView(), AgentsViewProps, hasLiveAgent(), normalize(), KIND_BADGES, TicketBadges(), TicketBadgesProps (+2 more)

### Community 132 - "usePrdSearch.ts"
Cohesion: 0.26
Nodes (9): isShortcutDetail(), ShortcutDetail, NOTE: Radix's dismissable layer registers its Escape listener on `document` in t, useCaptureEscape(), collectMatchRanges(), supportsHighlightApi(), usePrdSearch(), UsePrdSearchOptions (+1 more)

### Community 133 - "StageProgressBar.tsx"
Cohesion: 0.25
Nodes (10): FILLED_GLYPH_COLORS, StageProgressBar(), StageProgressBarProps, CardState, DEAD_STAGES, PROGRESS_STAGES, stageCardState(), stageLabel() (+2 more)

### Community 134 - "id"
Cohesion: 0.15
Nodes (14): additionalProperties, properties, required, type, axis, id, maxLength, pattern (+6 more)

### Community 135 - "split.ts"
Cohesion: 0.33
Nodes (7): FindingRenderStyle, buildSplitChannelPrompt(), buildTicketLines(), isEnglish(), CommitLanguage, extractFigmaUrls(), hasMockups()

### Community 136 - "createAtelierRoutes"
Cohesion: 0.25
Nodes (9): agentPairError(), attachment(), conversationTitle(), createAtelierRoutes(), jsonError(), prdExportName(), settingsChanged(), ticketOperationError() (+1 more)

### Community 137 - "performSplit"
Cohesion: 0.38
Nodes (5): createSplitChildren(), failSplitMother(), performSplit(), splitChildDefaults(), splitMotherBranch()

### Community 142 - "$defs"
Cohesion: 0.17
Nodes (12): pattern, type, $defs, axisId, requirement, task, additionalProperties, required (+4 more)

### Community 144 - "title"
Cohesion: 0.18
Nodes (11): source, ref, title, minLength, type, additionalProperties, properties, required (+3 more)

### Community 145 - "preDraft"
Cohesion: 0.18
Nodes (11): additionalProperties, properties, required, type, preDraft, reuse, sharedSurfaces, sourcePriority (+3 more)

### Community 146 - "AgentMessage"
Cohesion: 0.12
Nodes (11): ExecutionFinishStatus, LiveSession, log, previewToolInput(), renderSessionEvent(), SessionExecutionContext, SessionExecutionFinish, SessionExecutionUsage (+3 more)

### Community 151 - "prd.schema.json"
Cohesion: 0.29
Nodes (6): additionalProperties, $id, required, $schema, title, type

## Knowledge Gaps
- **945 isolated node(s):** `KIND_TOKENS`, `STATE_TOKEN_COLORS`, `TicketDetailProps`, `LaunchFormProps`, `OverviewTabProps` (+940 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `SystemAdapter` connect `TerminalSession` to `prUrl.ts`, `reviewFindings.ts`, `CodexRuntimeStatus`, `Settings & Profiles UI`, `API Client Inputs`, `Demo Pipeline Concepts`, `Session Hub Transcript`, `FakePaneStream`, `AgentMessage`, `Community 51`, `Dev Dependencies`, `StageProgressBar.tsx`, `App.tsx`, `Cost & Pricing`, `.addComment`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **Why does `Ticket` connect `NPM Scripts` to `Contract Building & Slots`, `AgentsView.tsx`, `Feasibility Batch Management`, `StageProgressBar.tsx`, `Shared Zod Schemas`, `split.ts`, `PR Selection & Slots Bar`, `Real System Adapter`, `Core Domain Concepts`, `Board & Sidebar Layout`, `API Routes & Reformulate`, `Live Terminal Views`, `DB Row Schemas & Mappers`, `Dev Dependencies`, `Client Hub & Watchdog`, `Session Hub & Agent Session`, `Runtime Dependencies`, `API Client Inputs`, `Session Hub Transcript`, `Modal Dialogs`, `Community 48`, `Slot State`, `App.tsx`, `CSV Parsing`, `triageManager.ts`, `Package Manifest`, `Community 63`, `TerminalView.tsx`, `reviewFindings.ts`, `CodexRuntimeStatus`, `TerminalView.tsx`, `TerminalSessionManager`, `.addComment`, `TerminalSession`, `Profile`, `ApiDenyPatterns`, `VcsConnectionResult`, `createMcpServer`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **Why does `Store` connect `ApiDenyPatterns` to `Contract Building & Slots`, `Ticket Action Panels`, `Settings & Profiles UI`, `performSplit`, `API Routes & Reformulate`, `AgentMessage`, `Dev Dependencies`, `Client Hub & Watchdog`, `Cost & Pricing`, `Session Hub & Agent Session`, `NPM Scripts`, `Runtime Dependencies`, `API Client Inputs`, `Demo Pipeline Concepts`, `Session Hub Transcript`, `Modal Dialogs`, `App.tsx`, `Package Manifest`, `Community 63`, `prUrl.ts`, `schema.test.ts`, `reviewFindings.ts`, `CodexRuntimeStatus`, `TerminalSessionManager`, `.addComment`, `RunningServer`, `codexProvider.test.ts`, `TerminalSession`, `Profile`, `repairPath.ts`, `TicketOperations`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **What connects `KIND_TOKENS`, `STATE_TOKEN_COLORS`, `TicketDetailProps` to the rest of the system?**
  _957 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Contract Building & Slots` be split into smaller, more focused modules?**
  _Cohesion score 0.02909197766676462 - nodes in this community are weakly interconnected._
- **Should `Terminals UI & Notifications` be split into smaller, more focused modules?**
  _Cohesion score 0.06755260243632337 - nodes in this community are weakly interconnected._
- **Should `Feasibility Batch Management` be split into smaller, more focused modules?**
  _Cohesion score 0.07966457023060797 - nodes in this community are weakly interconnected._