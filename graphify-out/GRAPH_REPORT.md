# Graph Report - kanban-agents  (2026-09-30)

## Corpus Check
- 306 files · ~782,925 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3822 nodes · 9869 edges · 159 communities (143 shown, 16 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 59 edges (avg confidence: 0.62)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3e3fc331`
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
- sessionHub.test.ts
- useProjects.ts
- runRecordedAction
- $defs
- useTickTimer.ts
- title
- preDraft
- AgentMessage
- codexBinary.ts
- SlotPips.tsx
- uploads.ts
- settings.tsx
- prd.schema.json
- McpSettingsControllerDependencies
- sessionRolePolicy.ts
- useSavedFlash.ts
- CodexProviderDependencies
- permissionDiagnostics.ts
- PreparedAgents

## God Nodes (most connected - your core abstractions)
1. `Store` - 149 edges
2. `Ticket` - 95 edges
3. `SystemAdapter` - 79 edges
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
- `AppSettingsState` --references--> `AppSettings`  [EXTRACTED]
  src/web/src/hooks/useAppSettings.ts → src/shared/schemas.ts
- `StageProgressBarProps` --references--> `Ticket`  [EXTRACTED]
  src/web/src/components/StageProgressBar.tsx → src/shared/schemas.ts
- `TerminalTabProps` --references--> `Ticket`  [EXTRACTED]
  src/web/src/components/ticket-detail/TerminalTab.tsx → src/shared/schemas.ts
- `TicketActionsProps` --references--> `Ticket`  [EXTRACTED]
  src/web/src/components/ticket-detail/TicketActions.tsx → src/shared/schemas.ts

## Import Cycles
- None detected.

## Communities (159 total, 16 thin omitted)

### Community 0 - "Contract Building & Slots"
Cohesion: 0.02
Nodes (115): buildNotionImportPrompt(), CONVERSATION_STATUS_FOR_PRD, log, PrdCardDraft, ConversationStatus, ActionExecutionOptions, actionExecutionOptionsSchema, agentMessageSchema (+107 more)

### Community 1 - "Terminals UI & Notifications"
Cohesion: 0.06
Nodes (41): analyzeTicketsInputSchema, analyzeTicketsOutputSchema, columnSchema, compactTicketSchema, createMcpServer(), createTodoTicketOutputSchema, editableTicketSchema, effectivePort() (+33 more)

### Community 3 - "Feasibility Batch Management"
Cohesion: 0.09
Nodes (44): CONVERSATION_STATUS_LABELS, isNotionUrl(), NOTION_HOSTS, AskPanel(), AtelierViewProps, ComposeState, PrdSeen, buildThread() (+36 more)

### Community 4 - "Ticket Action Panels"
Cohesion: 0.15
Nodes (8): CapturingSystem, AckSystem, RecordingSystem, RecordedSession, RecordingSystem, CapturingSystem, AgentSessionHandle, AgentSessionOptions

### Community 5 - "Fake System Adapter"
Cohesion: 0.10
Nodes (28): RepoInspectionSource, CreateProjectInput, RepoInspection, UpdateProjectInput, ConnectionHint, CreateStep, isPositiveIntegerString(), isValidDraft() (+20 more)

### Community 6 - "Shared Zod Schemas"
Cohesion: 0.05
Nodes (58): PrdDocumentPatch, PrdAnnotation, prdAnnotationsSchema, FeedbackDraft, McpSettings(), PrdAnnotator(), PrdAnnotatorProps, BREADCRUMB (+50 more)

### Community 7 - "Settings & Profiles UI"
Cohesion: 0.06
Nodes (7): RelaunchSystem, delay(), fakeShellPrompt(), FakeSystemAdapter, hexToBytes(), ReviewDoneOptions, WorktreeSetupOptions

### Community 8 - "PR Selection & Slots Bar"
Cohesion: 0.27
Nodes (9): STATE_STRIPE_COLORS, TicketCard(), TicketCardProps, TriageDot(), truncateParentTitle(), ticketCardState(), ticketImplementationDuration(), ticketPrNumber() (+1 more)

### Community 9 - "Real System Adapter"
Cohesion: 0.06
Nodes (49): AGENT_EFFORT_LABELS, AGENT_MODEL_FULL_LABELS, AGENT_MODEL_LABELS, AUTOMATION_RUN_STATUSES, CODEX_EFFORT_FULL_LABELS, CODEX_EFFORT_LABELS, CODEX_MODEL_LABELS, COMMENT_AUTHORS (+41 more)

### Community 10 - "Slot Config & Worktree Watch"
Cohesion: 0.12
Nodes (12): directories, initializeParamsSchema, log, requestSchema, rpcError(), rpcResult(), rpcResponseSchema, toolCallParamsSchema (+4 more)

### Community 11 - "Core Domain Concepts"
Cohesion: 0.03
Nodes (62): agentMessageRowSchema, AutomationRow, automationRowSchema, AutomationRunRow, automationRunRowSchema, buildScripts(), CommentRow, commentRowSchema (+54 more)

### Community 12 - "Board & Sidebar Layout"
Cohesion: 0.22
Nodes (13): ManagedProject, dragKeys(), groupCountLabel(), groupSortId(), ListGroup, ProjectList(), ProjectListProps, ProjectListRowProps (+5 more)

### Community 13 - "Database Store Operations"
Cohesion: 0.09
Nodes (28): HOME_VIEW_OPTIONS, HomeView, NAV_ENTRIES, NavEntry, Sidebar(), SidebarProps, SidebarView, Toaster() (+20 more)

### Community 14 - "Coordinator & Protocol"
Cohesion: 0.15
Nodes (18): LaunchForm(), LaunchFormProps, formatErrorDetails(), OverviewTab(), OverviewTabProps, SUMMARY_COLUMNS, availableTabs(), hasSessionPane() (+10 more)

### Community 15 - "API Routes & Reformulate"
Cohesion: 0.07
Nodes (44): main(), scalar(), CLAUDE_CONVERSATION, closers, CODEX_CONVERSATION, setup(), TEMPLATE_PATH, TURN_END (+36 more)

### Community 17 - "Triage & Server Hub"
Cohesion: 0.08
Nodes (25): devDependencies, autoprefixer, class-variance-authority, clsx, concurrently, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities (+17 more)

### Community 18 - "Live Terminal Views"
Cohesion: 0.07
Nodes (40): isReviewFixSession(), ATELIER_WEB_TOOLS, AtelierSessionInput, AZURE_BASH_ALLOWLIST, AZURE_CLEAN_BASH_ALLOWLIST, BASH_ALLOWLIST, bashAllowlist(), buildFeasibilitySessionConfig() (+32 more)

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
Cohesion: 0.09
Nodes (34): ProjectInfo, AskPanelProps, CardsPanelProps, CleanPrPanel(), CleanPrPanelProps, ImportTicketsPanelProps, ProjectPrPicker(), ProjectPrPickerProps (+26 more)

### Community 23 - "Dev Dependencies"
Cohesion: 0.06
Nodes (42): defaultProjectLookup(), computeWorktreeAddresses(), log, SlotWatch, log, runFirstBootSetup(), applyAppSettingsToModels(), DEFAULT_MODELS (+34 more)

### Community 24 - "TypeScript Config"
Cohesion: 0.15
Nodes (20): bashCommandSchema, buildSettings(), claudeProvider, createSdkAgentSession(), denyBashHook(), denyNoVerifyHook, denyReviewPublishingHook, denyTypecheckHook() (+12 more)

### Community 25 - "Client Hub & Watchdog"
Cohesion: 0.15
Nodes (3): AgentCoordinator, SessionMessageContext, SessionToolCall

### Community 26 - "Cost & Pricing"
Cohesion: 0.06
Nodes (33): buildAtelierConsolidateTurn(), buildAtelierPrompt(), buildAtelierRegenerationTurn(), buildAuthoringRules(), buildFraming(), buildHistory(), buildResearch(), buildRole() (+25 more)

### Community 27 - "Workflow View & Lifecycle"
Cohesion: 0.06
Nodes (28): Architecture, Commands, Conventions (enforced — beyond the global ones in ~/.claude/CLAUDE.md), graphify, The dry-run safety model — read before running anything, What this is, Agent runtime, Architecture (+20 more)

### Community 28 - "Stats Charts"
Cohesion: 0.07
Nodes (28): agentMessageDeltaSchema, agentToml(), buildMcpServers(), ConfigObject, configReadResponseSchema, describeCodexError(), emptyResponseSchema, errorNotificationSchema (+20 more)

### Community 29 - "Session Hub & Agent Session"
Cohesion: 0.06
Nodes (43): AttachExecutionSessionInput, AutomationPatch, ConversationPatch, EnqueueAgentMessageInput, FinalizeExecutionInput, MarkAgentMessageAcceptedInput, MarkAgentMessageReceivedInput, MarkAgentMessageRejectedInput (+35 more)

### Community 30 - "Agents View & Ticket Cards"
Cohesion: 0.06
Nodes (40): formatPrdDocumentIssues(), log, logRejection(), ToolHandler, ToolResult, parseAtelierSessionKey(), AgentSettableStage, agentSettableStageSchema (+32 more)

### Community 31 - "PRD Review & Markdown"
Cohesion: 0.09
Nodes (36): ALSO_FLAGGED_PREFIX, dedupeFindings(), DEFAULT_FINDING_RENDER_STYLE, DimensionFinding, findingAnchor(), FindingRenderStyle, FRENCH_STOP_WORD_PATTERN, FRENCH_STOP_WORDS (+28 more)

### Community 32 - "User Terminal & Fake IO"
Cohesion: 0.15
Nodes (11): AgentMcpServerDefinition, AgentPermissionMode, AgentProvider, AgentSessionEvent, AgentSessionToolResult, AgentSubagentDefinition, AgentTurnUsage, HttpMcpServerDefinition (+3 more)

### Community 33 - "Logging"
Cohesion: 0.10
Nodes (21): scripts, build:desktop, build:web, dev, dev:desktop, dev:proxy, dev:server, dev:web (+13 more)

### Community 34 - "Board Columns"
Cohesion: 0.16
Nodes (22): AppliedPath, copyDependencies(), copyPath(), DelegationWorkspace, ensureParentDirectory(), FileState, git(), installStagedPath() (+14 more)

### Community 35 - "NPM Scripts"
Cohesion: 0.11
Nodes (12): ReformulateManager, Watchdog, stalledEventPayload(), TicketLifecycle, failSplitMother(), RouteDeps, TicketOperationsDeps, Stage (+4 more)

### Community 36 - "Runtime Dependencies"
Cohesion: 0.09
Nodes (19): cleanDescription(), createApiRoutes(), createSplitChildren(), isBlocked(), isSplitMother(), isWebOnlyPath(), jsonError(), normalizeRepoPath() (+11 more)

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
Cohesion: 0.13
Nodes (3): DelegationManager, renderCollapsedFinding(), renderFinding()

### Community 41 - "Ticket Config & Constants"
Cohesion: 0.29
Nodes (8): StatRecord, StatCard(), StatCardProps, StatEmpty(), StatsView(), StatsViewProps, useStats(), UseStatsResult

### Community 42 - "Ticket Detail & Triage UI"
Cohesion: 0.13
Nodes (19): ACTIVE_BAR, AREA_CURSOR, AXIS_PROPS, BAR_CURSOR, CHART_PALETTE, CodexTierSummary(), colorAt(), DurationBars() (+11 more)

### Community 43 - "Demo Pipeline Concepts"
Cohesion: 0.15
Nodes (7): FakePaneStream, PaneStream, dataMessage(), normalizeSeed(), send(), TerminalSession, visibleText()

### Community 44 - "Chart Primitives"
Cohesion: 0.31
Nodes (13): abortReason(), computeCodeFingerprint(), FingerprintEntry, FingerprintPhase, hashFingerprintPaths(), isMissingFileError(), listFingerprintPaths(), log (+5 more)

### Community 45 - "Session Hub Transcript"
Cohesion: 0.15
Nodes (3): assertCodexImplementerAvailable(), SlotManager, slotPath()

### Community 46 - "Community 46"
Cohesion: 0.27
Nodes (15): Agent Implementation Config, Argus Code Review, Automated Tests (typecheck/lint/test), Claude Code Autonomous Agent, Ticket Contract Injection, Feasibility Analysis, Kanban Board (Atelier), Kanban Agents Demo (demo.gif) (+7 more)

### Community 47 - "Modal Dialogs"
Cohesion: 0.13
Nodes (30): buildAskContract(), buildCleanContract(), buildConflictResolutionContract(), buildFeasibilityBatchContract(), buildFeasibilityContextSection(), buildImplementingSteps(), buildMockupReviewStep(), buildPlanningStep() (+22 more)

### Community 48 - "Community 48"
Cohesion: 0.11
Nodes (24): CompactTicket, ListTicketsInput, Column, COLUMN_LABELS, COLUMN_ORDER, COLUMNS, ACTIVE_COLUMNS, Board() (+16 more)

### Community 49 - "Slot State"
Cohesion: 0.09
Nodes (16): wsClientEventSchema, active, ensureNotificationPermission(), getAudioContext(), isSupported(), loadSoundBuffer(), playBuffer(), playNotificationSound() (+8 more)

### Community 50 - "Stats Hooks & Cards"
Cohesion: 0.16
Nodes (12): ChartConfig, ChartContainer, ChartContainerProps, ChartContext, ChartContextValue, ChartLegendContent(), ChartLegendContentProps, ChartTooltipContent() (+4 more)

### Community 52 - "repairPath.ts"
Cohesion: 0.06
Nodes (39): Block, blockText(), compactChunks(), firstCharCode(), TranscriptBuffer, trimBlockStart(), AgentStreamBlock, TERMINAL_STAGES (+31 more)

### Community 53 - "User Terminal Manager"
Cohesion: 0.33
Nodes (5): CONTEXT — domain glossary, Execution, Proposed (not yet built), Seams, Work items

### Community 54 - "Community 54"
Cohesion: 0.07
Nodes (28): extractPrUrl(), ghPrHeadSchema, ghPrSchema, ghPrStateSchema, ghRestPullSchema, ghRestReviewPagesSchema, ghRestReviewSchema, ghRestReviewsSchema (+20 more)

### Community 56 - "CSV Parsing"
Cohesion: 0.13
Nodes (23): isProcessing(), ACTIVE_STAGES, ColumnActionsMenu(), ColumnActionsMenuProps, ColumnMenuItem, ActionContext, buildActions(), ConfirmSpec (+15 more)

### Community 57 - "Community 57"
Cohesion: 0.18
Nodes (7): withJsonRequestFile(), ReviewPublicationState, GithubVcsClient, pullApiEndpoint(), reviewApiEndpoint(), rightSideDiffLines(), ReviewPublicationCheck

### Community 58 - "File Uploads"
Cohesion: 0.40
Nodes (8): agentBaseEnv(), bestInstalledMatch(), compareParts(), envWithProjectNode(), nvmNodeBinDir(), readNvmrc(), prepareProjectShell(), shellLiteral()

### Community 59 - "triageManager.ts"
Cohesion: 0.19
Nodes (18): buildContractConstraintsLines(), buildResponseFormatLines(), buildStrictRulesLines(), buildTicketLines(), buildTriageChannelPrompt(), buildTriagePlusChannelPrompt(), isEnglish(), readOnlyFramingLines() (+10 more)

### Community 60 - "Package Manifest"
Cohesion: 0.10
Nodes (28): RFC-4180, PRD_SPLIT_MODE_LABELS, PRD_SPLIT_MODES, PrdSplitMode, candidatesFor(), CardCandidate, CardsPanel(), pluralCards() (+20 more)

### Community 61 - "splitManager.ts"
Cohesion: 0.13
Nodes (18): buildRepoInspection(), formatProjectLabel(), LOCKFILE_NAMES, LOCKFILE_RUNNERS, PackageManifest, packageManifestSchema, PROVIDER_HOST_MARKERS, RepoFacts (+10 more)

### Community 62 - "TicketCard.tsx"
Cohesion: 0.08
Nodes (22): AGENTS_SKILLS_DIR, CLAUDE_JSON_PATH, CLAUDE_SKILLS_DIR, commandOutputOrNull(), COMPOSER_BINARIES, DEFAULT_CODEX_HOME, GitRemoteFacts, INSTALL_COMMANDS (+14 more)

### Community 63 - "Community 63"
Cohesion: 0.16
Nodes (11): CHILD_USAGE, FULL_REVIEW_KINDS, LIGHT_REVIEW_KINDS, newDelegatedTicket(), newReviewTicket(), RecordedSession, setup(), sleep() (+3 more)

### Community 64 - "Composer Run Script"
Cohesion: 0.07
Nodes (48): orderSelectedTasks(), prdCardDrafts(), axisIdSchema, DUPLICATE_ITEMS_ISSUE, hasDuplicates(), identifierSchema, isUnique(), nonEmptyTextArraySchema (+40 more)

### Community 65 - "split.ts"
Cohesion: 0.16
Nodes (11): AtelierDesktopRpcSchema, DesktopRequests, McpSettingsMetadata, McpTokenSource, WebviewRequests, createMcpSettingsController(), McpSettingsController, temporaryDirectories (+3 more)

### Community 66 - "prUrl.ts"
Cohesion: 0.18
Nodes (3): AutomationManager, Automation, AutomationRun

### Community 67 - "TerminalView.tsx"
Cohesion: 0.17
Nodes (18): COLUMN_SORT_FIELD, BoardColumn(), compareFamilyMembers(), familyKeyOf(), groupTicketIds(), groupTicketsByFamily(), isSplitMother(), readCollapsed() (+10 more)

### Community 68 - "schema.test.ts"
Cohesion: 0.22
Nodes (18): projectMatches(), ProjectsSettings(), readShowHidden(), referenceCommitTimeout(), writeShowHidden(), mostCommonValue(), shortenHomePath(), FilteredProjectGroup (+10 more)

### Community 69 - "reviewFindings.ts"
Cohesion: 0.09
Nodes (25): ActiveDelegation, ActiveReview, ActiveReviewPass, BOARD_FINDING_RENDER_STYLE, ClosableExecution, log, orderedReviewKinds(), renderPersistedReviewResult() (+17 more)

### Community 70 - "CodexRuntimeStatus"
Cohesion: 0.08
Nodes (36): AssistantPart, AtelierManagerDeps, ConversationRuntime, log, TOOL_DETAIL_KEYS, toolInputSchema, TurnState, resolveBaseBranch() (+28 more)

### Community 71 - "PostCSS Config"
Cohesion: 0.29
Nodes (6): name, overrides, zod, private, type, version

### Community 72 - "useAppSettings.ts"
Cohesion: 0.23
Nodes (10): artifactPath, assertPackageVersionInSync(), assertSdkVersionsInSync(), BUILT_DMG, ELECTROBUN_BIN, fail(), installedPackageVersion(), RELEASE_FOLDER (+2 more)

### Community 73 - "TerminalView.tsx"
Cohesion: 0.14
Nodes (43): AgentEffort, AgentModel, CodexEffort, CodexModel, Implementer, Orchestrator, AgentProfileConfig(), AgentProfileConfigProps (+35 more)

### Community 74 - "button.tsx"
Cohesion: 0.14
Nodes (17): expectedSkillPaths(), skillzerInstallCommand(), COPY_LABELS, CopyOutcome, InstallBlock(), installLine(), isFullyInstalled(), MISSING_DOT_CLASSES (+9 more)

### Community 75 - ".handleRequest"
Cohesion: 0.11
Nodes (13): analyzeResultSchema, compactTicketSchema, createResultSchema, errorResultSchema, ISOLATED_ENV_KEYS, projectResultSchema, savedEnv, startResultSchema (+5 more)

### Community 76 - "usePrdSearch.ts"
Cohesion: 0.20
Nodes (9): ActionSystem, CapabilityCache, CodexRuntimeModel, codexRuntimeModelSchema, CodexRuntimeStatus, codexRuntimeStatusSchema, pairedRuntimeCodexEffort(), UNKNOWN_CODEX_RUNTIME_STATUS (+1 more)

### Community 78 - "csv.ts"
Cohesion: 0.07
Nodes (13): RecordingSystemAdapter, DoneGateResult, PublishReviewOptions, PublishReviewResult, ReviewHeadResult, FAKE_OPEN_PRS, FakeVcsClient, githubPrHeadRef() (+5 more)

### Community 79 - "WorktreeSession"
Cohesion: 0.33
Nodes (3): listeners, mcp, ReplyArgsSchema

### Community 80 - "recordedAction.ts"
Cohesion: 0.23
Nodes (17): alternation(), COMMAND_WRAPPERS, commandSegments(), commandWords(), executableName(), launchedPackageScript(), launchesTypecheck(), OPTIONS_WITH_VALUE (+9 more)

### Community 81 - "index.ts"
Cohesion: 0.18
Nodes (16): boot(), externalUrlFromNewWindowEvent(), forwardAtelierShortcut(), installApplicationMenu(), installMenuShortcutBridge(), menuShortcutActionSchema, navigationEventSchema, newWindowEventSchema (+8 more)

### Community 82 - "TicketOperations"
Cohesion: 0.11
Nodes (31): AGENT_EFFORT_FULL_LABELS, ProfileConfig, DragHandleAttributes, DragHandleListeners, ProfilePipeline(), ProfileRowHeader(), ProfileRowHeaderProps, ProfileRowProps (+23 more)

### Community 86 - "useTickTimer.ts"
Cohesion: 0.17
Nodes (8): AZURE_COMMANDS, COMMANDS_BY_PROVIDER, GITHUB_COMMANDS, PrDiffContext, VcsCleanCommands, VcsCommandTable, AZ_SETTLED_THREAD_STATUSES, VCS_PROVIDER_LABELS

### Community 87 - "mcpSettings.ts"
Cohesion: 0.13
Nodes (16): AUTOMATION_TRIGGER_LABELS, AUTOMATION_TRIGGERS, AutomationRunStatus, AutomationTrigger, AutomationCard(), AutomationCardProps, AutomationFormProps, AutomationView() (+8 more)

### Community 89 - "usePrdSearch.ts"
Cohesion: 0.31
Nodes (10): AppSettingsState, flashSaved(), loadOnce(), patchAppSettings(), publish(), snapshot(), state, subscribe() (+2 more)

### Community 90 - "PaneStream"
Cohesion: 0.33
Nodes (9): useTheme(), UseThemeResult, applyTheme(), getStoredTheme(), isTheme(), Theme, ThemeOption, THEMES (+1 more)

### Community 91 - "bootstrap.ts"
Cohesion: 0.18
Nodes (11): accountResponseSchema, hasExplicitCodexApiKey(), isProtocolIncompatibility(), listRuntimeModels(), modelListResponseSchema, modelSchema, probeCodexRuntime(), status() (+3 more)

### Community 92 - "TerminalSessionManager"
Cohesion: 0.22
Nodes (13): isCodexFastServiceTier(), summarizeSessionCosts(), totalTokensOfSessions(), executionCosts(), executionTokens(), projectStatRecord(), CostSummary(), TicketCost() (+5 more)

### Community 93 - "ColumnActionsMenu.tsx"
Cohesion: 0.25
Nodes (7): Azure DevOps support — state file, Decisions (validated by the owner, 2026-09-21), Goal, Known blockers for lots 3 and 4, Open questions, Progress, Verified on this machine (az 2.90.0, azure-devops 1.0.8)

### Community 94 - ".addComment"
Cohesion: 0.06
Nodes (30): log, buildReformulatePrompt(), log, log, ClientHub, ClientSocketData, createLogger(), NativeNotify (+22 more)

### Community 95 - "TicketConfigSummary.tsx"
Cohesion: 0.50
Nodes (3): appBundle, EMBEDDED_BINARIES, resourcesApp

### Community 97 - "RunningServer"
Cohesion: 0.11
Nodes (14): PROJECT_ROOT, NOTE: PRD generation holds the request open up to ~120s (REFORMULATE_TIMEOUT_MS), resolveDataFile(), resolveServerPort(), RunningServer, serveStaticAsset(), SocketData, startServer() (+6 more)

### Community 98 - "usePrdSearch.ts"
Cohesion: 0.16
Nodes (10): runBoundedCommand(), safeJsonParse(), AzureDevopsVcsClient, prWebUrl(), readOriginRemote(), repoRefFromPrUrl(), repoRefFromRemote(), reviewStatusFromVotes() (+2 more)

### Community 99 - "reviewPublishingGuard.ts"
Cohesion: 0.07
Nodes (35): API_GUARDS, API_READ_METHOD_SET, ApiDenyPatterns, ApiGuard, AZ_INVOKE_COMMAND, AZ_INVOKE_METHOD_LONG_FLAGS, AZ_INVOKE_WRITE_INPUT_LONG_FLAGS, AZ_PR_WRITE_PATTERN (+27 more)

### Community 100 - ".startVerification"
Cohesion: 0.08
Nodes (25): $ref, $ref, enum, $ref, $ref, properties, designConsiderations, goals (+17 more)

### Community 101 - "codexProvider.test.ts"
Cohesion: 0.18
Nodes (16): Capabilities, CodexConnectionStatus(), STATUS_LABELS, clearRetry(), loadCapabilities(), LoadOptions, publish(), refreshCapabilities() (+8 more)

### Community 102 - ".start"
Cohesion: 0.29
Nodes (10): availableSkillProviders(), missingSkillProviders(), SkillsSettings(), missingSignature(), PreflightCopy, providerList(), readDismissedSignature(), SkillsPreflightDialog() (+2 more)

### Community 103 - "TerminalSession"
Cohesion: 0.06
Nodes (8): featureBranch(), reviewPublicationState(), slugify(), enrichWorktreeSession(), SystemAdapter, Slot, WorktreeSession, BoardState

### Community 104 - "settings.tsx"
Cohesion: 0.11
Nodes (13): CodexAppServerInitializationError, CodexAppServerProtocolError, CodexAppServerRpcError, connectCodexAppServer(), incomingSchema, initializeResponseSchema, log, PendingRequest (+5 more)

### Community 105 - "createMcpServer"
Cohesion: 0.09
Nodes (23): $ref, $ref, $ref, minLength, type, minLength, type, enum (+15 more)

### Community 106 - "usePrdSearch.ts"
Cohesion: 0.09
Nodes (20): WorktreeAddressWatcher, ANSI, appendToLogFile(), COLOR_ENABLED, disableFileLogging(), initLogFile(), isLevel(), Level (+12 more)

### Community 107 - "azureRemote.ts"
Cohesion: 0.40
Nodes (10): azureOrgUrl(), fromAzureSegments(), fromCollectionSegments(), fromLegacySegments(), fromSshSegments(), parseAzureRepoRef(), parseRemoteLocation(), RemoteLocation (+2 more)

### Community 108 - "WorkflowView.tsx"
Cohesion: 0.09
Nodes (22): axes, designConsiderations, goals, id, locale, openQuestions, outOfScope, preDraft (+14 more)

### Community 109 - "projectDisplay.ts"
Cohesion: 0.19
Nodes (3): reviewKey(), verifiedFindings(), mergeAgentUsageByModel()

### Community 111 - "FakePaneStream"
Cohesion: 0.09
Nodes (30): escapeHtml(), renderCollapsedDetails(), renderOutsideDiffComment(), renderOutsideDiffSection(), ReviewPublicationComment, ReviewPublicationEvent, azureChangeEntrySchema, azureCommentSchema (+22 more)

### Community 112 - "useSavedFlash.ts"
Cohesion: 0.31
Nodes (6): applyDesktopEnv(), DesktopRoots, ensureConfig(), ensureMcpToken(), regenerateMcpToken(), temporaryDirectories

### Community 113 - "repairPath.ts"
Cohesion: 0.18
Nodes (11): projectConfigSchema, buildAppSettingsPatch(), LegacyConfig, legacyConfigSchema, LegacyModels, log, migrateConfigJsonIfPresent(), parseLegacyConfig() (+3 more)

### Community 114 - "ApiDenyPatterns"
Cohesion: 0.08
Nodes (6): startFeasibilityTicket(), nullableBooleanValue(), parsePersistedReviewFindings(), SqlUpdateBuilder, Store, Profile

### Community 115 - "relaunch.ts"
Cohesion: 0.21
Nodes (4): PendingSessionMessage, StartExecutionInput, AgentMessage, ExecutionOwnerType

### Community 116 - "settings.tsx"
Cohesion: 0.07
Nodes (24): CODEX_STATUS_TONES, COMMIT_ROW, DefaultsRowSpec, EFFORT_OPTIONS, FEASIBILITY_ROW, IMPLEMENTATION_ROW, KnobGroupProps, LANGUAGE_OPTIONS (+16 more)

### Community 117 - "useAppSettings.ts"
Cohesion: 0.29
Nodes (6): HOST_SKILL_ROOTS, SKILL_REQUIREMENTS, SKILL_TIERS, SkillRequirement, SKILLS_CLI_AGENTS, SkillTier

### Community 118 - "StageProgressBar.tsx"
Cohesion: 0.29
Nodes (4): fakeMissingKey(), SkillStatus, MissingSkill, SkillsStatusListProps

### Community 119 - "AgentMessage"
Cohesion: 0.11
Nodes (19): items, maxItems, minItems, type, uniqueItems, $ref, axes, requirements (+11 more)

### Community 120 - "ProjectPanel.tsx"
Cohesion: 0.11
Nodes (17): Agent session (server), Architecture decisions, Atelier (conversation → PRD → cards) — implementation state, Contract injection, Follow-ups noticed in Lot A, Goal, Lot A public API (use these names in Lots B and C), Lot B public surface and deviations (read before Lot C/D) (+9 more)

### Community 121 - "VcsConnectionResult"
Cohesion: 0.17
Nodes (5): CodexAppServerConnection, CodexAppServerNotification, CodexAppServerOptions, AppServerFixture, CodexRuntimeDependencies

### Community 122 - "createMcpServer"
Cohesion: 0.24
Nodes (13): apiWriteDenyScript(), ConfigValue, extractCommandScript(), perSegmentScript(), prepareNoVerifyHook(), reviewPublishingGuardScript(), shellDeny(), shellDenyOnMatch() (+5 more)

### Community 123 - "AutomationView.tsx"
Cohesion: 0.18
Nodes (5): detectInstallCommand(), realpathSafe(), resolveWorktreeScriptCommand(), setupOutputExcerpt(), shQuote()

### Community 124 - "useSavedFlash.ts"
Cohesion: 0.15
Nodes (9): canonicalJson(), CodexCommandHook, codexSessionPreToolUseHookHash(), JsonValue, createCodexProvider(), AppServerFixtureOptions, hookPathForSession(), RecordedRequest (+1 more)

### Community 126 - "TicketOperations"
Cohesion: 0.10
Nodes (24): AtelierPromptInput, SubmittedTurn, ClientSocket, attachment(), conversationTitle(), createAtelierRoutes(), prdExportName(), settingsChanged() (+16 more)

### Community 127 - "TerminalSessionManager"
Cohesion: 0.13
Nodes (16): nonEmptyStringArray, stringArray, items, type, uniqueItems, minLength, pattern, type (+8 more)

### Community 130 - "renderPrdHtml.ts"
Cohesion: 0.22
Nodes (10): PROJECT_ROOT, PrdRenderError, RENDERER_RELATIVE_PATH, renderPrdHtml(), RenderPrdHtmlInput, resolvePrdRendererPath(), TEMPLATE_PATH, boundedCommandDetail() (+2 more)

### Community 131 - "AgentsView.tsx"
Cohesion: 0.16
Nodes (16): AgentCard(), AgentCardProps, AgentsView(), AgentsViewProps, hasLiveAgent(), normalize(), AtelierView(), findPrdConversation() (+8 more)

### Community 132 - "usePrdSearch.ts"
Cohesion: 0.26
Nodes (4): BoundedCommandResult, connectionFailure(), connectionResult(), VcsConnectionResult

### Community 133 - "StageProgressBar.tsx"
Cohesion: 0.29
Nodes (9): FILLED_GLYPH_COLORS, StageProgressBar(), StageProgressBarProps, CardState, DEAD_STAGES, PROGRESS_STAGES, stageCardState(), stageLabel() (+1 more)

### Community 134 - "id"
Cohesion: 0.15
Nodes (14): additionalProperties, properties, required, type, axis, id, maxLength, pattern (+6 more)

### Community 135 - "split.ts"
Cohesion: 0.26
Nodes (8): buildSplitChannelPrompt(), buildTicketLines(), isEnglish(), DRY_RUN_RESULT, log, PendingSplit, SplitManager, SplitResult

### Community 136 - "createAtelierRoutes"
Cohesion: 0.21
Nodes (9): columnSchema, MetaRow(), MetaRowProps, PrdOriginRowProps, STATUS_CONFIRMS, StatusConfirm, statusTitle(), TicketMeta() (+1 more)

### Community 137 - "performSplit"
Cohesion: 0.22
Nodes (3): childTranscriptPrefix(), implementationScopesOverlap(), normalizeImplementationScope()

### Community 139 - "sessionHub.test.ts"
Cohesion: 0.28
Nodes (7): SessionExecutionContext, SessionExecutionFinish, SessionExecutionUsage, SessionHandlerError, SessionMessageStatus, SessionStartConfig, USAGE

### Community 140 - "useProjects.ts"
Cohesion: 0.36
Nodes (8): App(), emit(), loadedSubscribers, loadOnce(), refreshProjects(), subscribers, useProjects(), useProjectsLoaded()

### Community 141 - "runRecordedAction"
Cohesion: 0.50
Nodes (3): serializeErrorDetails(), runRecordedAction(), ExecutionRun

### Community 142 - "$defs"
Cohesion: 0.17
Nodes (12): pattern, type, $defs, axisId, requirement, task, additionalProperties, required (+4 more)

### Community 143 - "useTickTimer.ts"
Cohesion: 0.39
Nodes (7): currentNow, getSnapshot(), startTicking(), stopTicking(), subscribe(), subscribers, useTickTimer()

### Community 144 - "title"
Cohesion: 0.18
Nodes (11): source, ref, title, minLength, type, additionalProperties, properties, required (+3 more)

### Community 145 - "preDraft"
Cohesion: 0.18
Nodes (11): additionalProperties, properties, required, type, preDraft, reuse, sharedSurfaces, sourcePriority (+3 more)

### Community 146 - "AgentMessage"
Cohesion: 0.07
Nodes (20): ExecutionFinishStatus, LiveSession, log, previewToolInput(), renderSessionEvent(), SessionHub, log, ReclaimOutcome (+12 more)

### Community 147 - "codexBinary.ts"
Cohesion: 0.33
Nodes (5): CodexBinaryVersionError, require, resolveCodexBinary(), resolveCodexBinaryOverride(), TARGETS

### Community 148 - "SlotPips.tsx"
Cohesion: 0.38
Nodes (6): ATTENTION_STATUSES, sessionOf(), SlotPips(), SlotPipsProps, STATUS_LABELS, STATUS_PIP_CLASSES

### Community 149 - "uploads.ts"
Cohesion: 0.40
Nodes (4): MIME_EXTENSIONS, resolveExtension(), SavedUpload, saveUpload()

### Community 150 - "settings.tsx"
Cohesion: 0.40
Nodes (5): DashedAddButton(), DashedAddButtonProps, footerMessage(), SettingsFooter(), SettingsFooterProps

### Community 151 - "prd.schema.json"
Cohesion: 0.29
Nodes (6): additionalProperties, $id, required, $schema, title, type

### Community 153 - "sessionRolePolicy.ts"
Cohesion: 0.60
Nodes (3): settingSourcesForRole(), workerToolsForRole(), WORKER_TOOLS

### Community 154 - "useSavedFlash.ts"
Cohesion: 0.50
Nodes (4): SavedFlag, SavedFlash, useSavedFlag(), useSavedFlash()

## Knowledge Gaps
- **957 isolated node(s):** `Permission refusals are specific to a command and session`, `Two agent providers: implement every host integration for both`, `LIGHT_REVIEW_KINDS`, `FULL_REVIEW_KINDS`, `log` (+952 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **16 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `SystemAdapter` connect `TerminalSession` to `prUrl.ts`, `NPM Scripts`, `usePrdSearch.ts`, `Fake System Adapter`, `CodexRuntimeStatus`, `split.ts`, `Settings & Profiles UI`, `Demo Pipeline Concepts`, `Session Hub Transcript`, `csv.ts`, `Profile`, `AgentMessage`, `Community 51`, `StageProgressBar.tsx`, `Dev Dependencies`, `TicketCard.tsx`, `Cost & Pricing`, `.addComment`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Why does `Ticket` connect `NPM Scripts` to `Contract Building & Slots`, `AgentsView.tsx`, `StageProgressBar.tsx`, `Shared Zod Schemas`, `split.ts`, `createAtelierRoutes`, `Real System Adapter`, `PR Selection & Slots Bar`, `Core Domain Concepts`, `Database Store Operations`, `API Routes & Reformulate`, `Stats Aggregation`, `AgentMessage`, `Dev Dependencies`, `Client Hub & Watchdog`, `Session Hub & Agent Session`, `PRD Review & Markdown`, `Session Hub Transcript`, `Community 48`, `Slot State`, `repairPath.ts`, `CSV Parsing`, `triageManager.ts`, `Package Manifest`, `Community 63`, `TerminalView.tsx`, `CodexRuntimeStatus`, `TerminalSessionManager`, `.addComment`, `TerminalSession`, `ApiDenyPatterns`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Why does `Store` connect `ApiDenyPatterns` to `Contract Building & Slots`, `split.ts`, `runRecordedAction`, `API Routes & Reformulate`, `AgentMessage`, `Dev Dependencies`, `Client Hub & Watchdog`, `Cost & Pricing`, `Session Hub & Agent Session`, `Agents View & Ticket Cards`, `PRD Review & Markdown`, `NPM Scripts`, `Runtime Dependencies`, `Session Hub Transcript`, `Modal Dialogs`, `Community 63`, `prUrl.ts`, `CodexRuntimeStatus`, `TerminalSessionManager`, `.addComment`, `RunningServer`, `TerminalSession`, `Profile`, `repairPath.ts`, `relaunch.ts`, `TicketOperations`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **What connects `Permission refusals are specific to a command and session`, `Two agent providers: implement every host integration for both`, `LIGHT_REVIEW_KINDS` to the rest of the system?**
  _969 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Contract Building & Slots` be split into smaller, more focused modules?**
  _Cohesion score 0.02438693943910039 - nodes in this community are weakly interconnected._
- **Should `Terminals UI & Notifications` be split into smaller, more focused modules?**
  _Cohesion score 0.05725490196078432 - nodes in this community are weakly interconnected._
- **Should `Feasibility Batch Management` be split into smaller, more focused modules?**
  _Cohesion score 0.0853302162478083 - nodes in this community are weakly interconnected._