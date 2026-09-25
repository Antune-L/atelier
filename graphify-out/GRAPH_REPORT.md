# Graph Report - kanban-agents  (2026-09-25)

## Corpus Check
- 276 files · ~751,564 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3083 nodes · 8875 edges · 126 communities (118 shown, 8 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 50 edges (avg confidence: 0.65)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `82b78e4c`
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
- OpenPr
- TerminalView.tsx
- schema.test.ts
- reviewFindings.ts
- CodexRuntimeStatus
- PostCSS Config
- App.tsx
- TerminalView.tsx
- button.tsx
- .handleRequest
- usePrdSearch.ts
- Community 77
- csv.ts
- WorktreeSession
- recordedAction.ts
- vcsCommands.ts
- TicketOperations
- Community 83
- useTickTimer.ts
- codexBinary.ts
- usePrdSearch.ts
- nvmNode.ts
- .onMessageStatus
- WorktreeAddressWatcher
- ColumnActionsMenu.tsx
- .addComment
- TicketConfigSummary.tsx
- useTickTimer.ts
- RunningServer
- triageManager.ts
- reviewPublishingGuard.ts
- .startVerification
- codexProvider.test.ts
- .start
- TerminalSession
- .runWorktreeSetupScript
- createMcpServer
- usePrdSearch.ts
- azureRemote.ts
- oneShotSession.ts
- projectDisplay.ts
- Profile
- isProcessing
- prd.ts
- reformulate.ts
- isNotionUrl
- settings.tsx
- TicketMeta.tsx
- notionImport.ts
- delegationManager.test.ts
- store.ts
- bootstrap.ts
- projectDisplay.ts
- RunningServer
- reformulate.ts

## God Nodes (most connected - your core abstractions)
1. `Store` - 128 edges
2. `Ticket` - 114 edges
3. `cn()` - 79 edges
4. `SystemAdapter` - 78 edges
5. `FakeSystemAdapter` - 68 edges
6. `RealSystemAdapter` - 66 edges
7. `createApiRoutes()` - 62 edges
8. `VcsProvider` - 57 edges
9. `SlotManager` - 55 edges
10. `ProjectInfo` - 52 edges

## Surprising Connections (you probably didn't know these)
- `McpSettingsClient` --references--> `McpSettingsMetadata`  [EXTRACTED]
  src/web/src/lib/mcpSettings.ts → desktop/mcpRpc.ts
- `main()` --calls--> `migrateCodexCatalog()`  [EXTRACTED]
  scripts/downgrade-codex-catalog.ts → src/server/db/schema.ts
- `main()` --calls--> `assertCodexDowngradeSafe()`  [EXTRACTED]
  scripts/downgrade-codex-catalog.ts → src/server/db/schema.ts
- `FeasibilitySessionInput` --references--> `Orchestrator`  [EXTRACTED]
  src/server/agents/sessionConfig.ts → src/shared/constants.ts
- `SplitSessionInput` --references--> `Orchestrator`  [EXTRACTED]
  src/server/agents/sessionConfig.ts → src/shared/constants.ts

## Import Cycles
- None detected.

## Communities (126 total, 8 thin omitted)

### Community 0 - "Contract Building & Slots"
Cohesion: 0.04
Nodes (68): ActionExecutionOptions, actionExecutionOptionsSchema, agentMessageSchema, AnalyzeTicketsInput, appSettingsSchema, automationRunSchema, automationSchema, baseBranchSchema (+60 more)

### Community 1 - "Terminals UI & Notifications"
Cohesion: 0.10
Nodes (20): analyzeTicketsInputSchema, analyzeTicketsOutputSchema, columnSchema, compactTicketSchema, createTodoTicketOutputSchema, editableTicketSchema, listProjectsInputSchema, listProjectsOutputSchema (+12 more)

### Community 2 - "Desktop Bootstrap & Menus"
Cohesion: 0.11
Nodes (15): createCodexAgentSession(), inheritedMcpServerNames(), PreparedHook, prepareSkills(), threadConfig(), accountResponseSchema, hasExplicitCodexApiKey(), isProtocolIncompatibility() (+7 more)

### Community 3 - "Feasibility Batch Management"
Cohesion: 0.06
Nodes (37): initializeParamsSchema, log, requestSchema, rpcError(), rpcResult(), toolCallParamsSchema, WorkerMcpHandlers, TRIAGE_VERDICTS (+29 more)

### Community 4 - "Ticket Action Panels"
Cohesion: 0.12
Nodes (27): ReviewResult, ALSO_FLAGGED_PREFIX, dedupeFindings(), DEFAULT_FINDING_RENDER_STYLE, DimensionFinding, findingAnchor(), FRENCH_STOP_WORD_PATTERN, FRENCH_STOP_WORDS (+19 more)

### Community 5 - "Fake System Adapter"
Cohesion: 0.08
Nodes (35): BoundedCommandResult, escapeHtml(), renderCollapsedDetails(), renderOutsideDiffComment(), renderOutsideDiffSection(), ReviewPublicationComment, azureChangeEntrySchema, azureCommentSchema (+27 more)

### Community 6 - "Shared Zod Schemas"
Cohesion: 0.17
Nodes (3): SlotManager, failSplitMother(), TicketOperationsDeps

### Community 7 - "Settings & Profiles UI"
Cohesion: 0.08
Nodes (9): NewProject, ProjectPatch, delay(), fakeShellPrompt(), FakeSystemAdapter, hexToBytes(), ReviewDoneOptions, WorktreeSetupOptions (+1 more)

### Community 8 - "PR Selection & Slots Bar"
Cohesion: 0.17
Nodes (16): isNotionUrl(), NOTION_HOSTS, NewTicketSheet(), NewTicketSheetProps, LaunchForm(), LaunchFormProps, Toaster(), Select (+8 more)

### Community 9 - "Real System Adapter"
Cohesion: 0.10
Nodes (25): CreateProjectInput, ManagedProject, UpdateProjectInput, vcsProviderSchema, ConnectionHint, DragHandleAttributes, DragHandleListeners, groupProjects() (+17 more)

### Community 10 - "Slot Config & Worktree Watch"
Cohesion: 0.15
Nodes (6): AzureDevopsVcsClient, prWebUrl(), repoRefFromPrUrl(), reviewStatusFromVotes(), stripHeadsPrefix(), AzureRepoRef

### Community 11 - "Core Domain Concepts"
Cohesion: 0.03
Nodes (50): agentMessageRowSchema, AutomationRow, automationRowSchema, AutomationRunRow, automationRunRowSchema, buildScripts(), CommentRow, commentRowSchema (+42 more)

### Community 12 - "Board & Sidebar Layout"
Cohesion: 0.06
Nodes (7): directories, detectInstallCommand(), realpathSafe(), RealSystemAdapter, resolveWorktreeScriptCommand(), setupOutputExcerpt(), shQuote()

### Community 13 - "Database Store Operations"
Cohesion: 0.08
Nodes (37): RFC-4180, ProjectInfo, AgentProfileConfig(), AgentsViewProps, AskPanelProps, CleanPrPanelProps, ImportTicketsPanel(), ImportTicketsPanelProps (+29 more)

### Community 14 - "Coordinator & Protocol"
Cohesion: 0.07
Nodes (44): resolveBaseBranch(), buildAskContract(), buildCleanContract(), buildConflictResolutionContract(), assertExecutionAvailable(), CODEX_LAUNCH_STATUS_MESSAGES, CodexCapabilityReader, ExecutionDefaults (+36 more)

### Community 15 - "API Routes & Reformulate"
Cohesion: 0.09
Nodes (18): CodexAppServerInitializationError, CodexAppServerProtocolError, CodexAppServerRpcError, connectCodexAppServer(), incomingSchema, initializeResponseSchema, log, PendingRequest (+10 more)

### Community 16 - "Stats Aggregation"
Cohesion: 0.13
Nodes (3): startParentSession(), SessionHubHandlers, SessionStartCallbacks

### Community 17 - "Triage & Server Hub"
Cohesion: 0.08
Nodes (25): devDependencies, autoprefixer, class-variance-authority, clsx, concurrently, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities (+17 more)

### Community 18 - "Live Terminal Views"
Cohesion: 0.08
Nodes (35): isReviewFixSession(), AZURE_BASH_ALLOWLIST, AZURE_CLEAN_BASH_ALLOWLIST, BASH_ALLOWLIST, bashAllowlist(), buildFeasibilitySessionConfig(), buildImplementSessionConfig(), buildSplitSessionConfig() (+27 more)

### Community 19 - "Stage Progress & Display"
Cohesion: 0.08
Nodes (24): compilerOptions, allowImportingTsExtensions, baseUrl, esModuleInterop, isolatedModules, jsx, lib, module (+16 more)

### Community 20 - "Real Adapter GH/Composer"
Cohesion: 0.10
Nodes (24): FAILURE_COLUMNS, Kind, KINDS, SUCCESS_COLUMNS, agentEffortSchema, codexEffortSchema, codexModelSchema, ThroughputChart() (+16 more)

### Community 21 - "Store Types & Agent Knobs"
Cohesion: 0.17
Nodes (26): buildFeasibilityBatchContract(), buildFeasibilityContextSection(), buildImplementingSteps(), buildMockupReviewStep(), buildPlanningStep(), buildPrdBullet(), buildReviewContract(), buildReviewFixLines() (+18 more)

### Community 22 - "DB Row Schemas & Mappers"
Cohesion: 0.11
Nodes (21): DescriptionEdit, DescriptionTab(), NOTE: the draft now mirrors what was persisted, so it is no longer unsent text., OverviewTab(), OverviewTabProps, SUMMARY_COLUMNS, PrdTab(), SectionHeader() (+13 more)

### Community 23 - "Dev Dependencies"
Cohesion: 0.11
Nodes (15): TicketCreationRequestConflictError, AnalyzeTicketRejectionReason, AnalyzeTicketsResult, CreateTodoTicketInput, createTodoTicketInputSchema, CreateTodoTicketResult, log, StartTicketResult (+7 more)

### Community 24 - "TypeScript Config"
Cohesion: 0.14
Nodes (21): bashCommandSchema, buildSettings(), claudeProvider, createSdkAgentSession(), denyBashHook(), denyNoVerifyHook, denyReviewPublishingHook, denyTypecheckHook() (+13 more)

### Community 25 - "Client Hub & Watchdog"
Cohesion: 0.28
Nodes (13): abortReason(), computeCodeFingerprint(), FingerprintEntry, FingerprintPhase, hashFingerprintPaths(), isMissingFileError(), listFingerprintPaths(), log (+5 more)

### Community 26 - "Cost & Pricing"
Cohesion: 0.40
Nodes (5): MIME_EXTENSIONS, resolveExtension(), SavedUpload, saveUpload(), serveUpload()

### Community 27 - "Workflow View & Lifecycle"
Cohesion: 0.06
Nodes (28): Architecture, Commands, Conventions (enforced — beyond the global ones in ~/.claude/CLAUDE.md), graphify, The dry-run safety model — read before running anything, What this is, Agent runtime (Agent SDK), Architecture (+20 more)

### Community 28 - "Stats Charts"
Cohesion: 0.07
Nodes (42): AgentMcpServerDefinition, agentMessageDeltaSchema, agentToml(), apiWriteDenyScript(), buildMcpServers(), ConfigObject, configReadResponseSchema, ConfigValue (+34 more)

### Community 29 - "Session Hub & Agent Session"
Cohesion: 0.14
Nodes (6): CodexAppServerConnection, CodexAppServerNotification, CodexAppServerOptions, CodexProviderDependencies, AppServerFixture, CodexRuntimeDependencies

### Community 30 - "Agents View & Ticket Cards"
Cohesion: 0.11
Nodes (28): AgentCard(), AgentCardProps, AgentsView(), hasLiveAgent(), normalize(), KIND_BADGES, TicketBadges(), TicketBadgesProps (+20 more)

### Community 31 - "PRD Review & Markdown"
Cohesion: 0.20
Nodes (8): Block, blockText(), compactChunks(), firstCharCode(), TranscriptBuffer, trimBlockStart(), AgentStreamBlock, TranscriptUpdate

### Community 32 - "User Terminal & Fake IO"
Cohesion: 0.11
Nodes (12): AckSystem, ActiveReview, ClosableExecution, RecordedSession, RecordingSystem, RecordedSession, RecordingSystem, RelaunchSystem (+4 more)

### Community 33 - "Logging"
Cohesion: 0.10
Nodes (21): scripts, build:desktop, build:web, dev, dev:desktop, dev:proxy, dev:server, dev:web (+13 more)

### Community 34 - "Board Columns"
Cohesion: 0.10
Nodes (26): ProjectPrPicker(), ProjectPrPickerProps, PrSelectRow(), NAV_ENTRIES, NavEntry, Sidebar(), SidebarProps, SidebarView (+18 more)

### Community 36 - "Runtime Dependencies"
Cohesion: 0.12
Nodes (21): TICKET_TAB_LABELS, TicketTab, TicketTabs(), TicketTabsProps, availableTabs(), hasSessionPane(), initialTab(), isLocked() (+13 more)

### Community 37 - "Claude SDK Provider"
Cohesion: 0.09
Nodes (23): dependencies, @anthropic-ai/claude-agent-sdk, dompurify, elysia, @fontsource/ibm-plex-mono, @fontsource/ibm-plex-sans, marked, @modelcontextprotocol/sdk (+15 more)

### Community 38 - "Agent Profile Config"
Cohesion: 0.17
Nodes (4): AutomationManager, AutomationRunStatus, Automation, AutomationRun

### Community 39 - "Agent Coordinator Handlers"
Cohesion: 0.18
Nodes (17): adopt(), compareVersions(), detectionCandidates(), detectUserInstall(), downloadAndVerifyTarball(), downloadPinnedBinary(), emitProgress(), isCompatibleCli() (+9 more)

### Community 40 - "API Client Inputs"
Cohesion: 0.10
Nodes (9): childTranscriptPrefix(), DelegationManager, reviewKey(), dedupeIdenticalFindings(), allowedReviewPasses(), mergeAgentUsageByModel(), parsePersistedReviewFindings(), AgentSessionEvent (+1 more)

### Community 41 - "Ticket Config & Constants"
Cohesion: 0.13
Nodes (22): isProcessing(), ACTIVE_STAGES, ColumnActionsMenu(), ColumnActionsMenuProps, ColumnMenuItem, ActionContext, buildActions(), ConfirmSpec (+14 more)

### Community 42 - "Ticket Detail & Triage UI"
Cohesion: 0.12
Nodes (22): StatEmpty(), ACTIVE_BAR, AREA_CURSOR, AXIS_PROPS, BAR_CURSOR, CHART_PALETTE, colorAt(), DurationBars() (+14 more)

### Community 43 - "Demo Pipeline Concepts"
Cohesion: 0.46
Nodes (5): buildSplitChannelPrompt(), buildTicketLines(), isEnglish(), extractFigmaUrls(), hasMockups()

### Community 44 - "Chart Primitives"
Cohesion: 0.22
Nodes (4): McpTokenSource, createMcpSettingsController(), McpSettingsControllerDependencies, temporaryDirectories

### Community 46 - "Community 46"
Cohesion: 0.27
Nodes (15): Agent Implementation Config, Argus Code Review, Automated Tests (typecheck/lint/test), Claude Code Autonomous Agent, Ticket Contract Injection, Feasibility Analysis, Kanban Board (Atelier), Kanban Agents Demo (demo.gif) (+7 more)

### Community 47 - "Modal Dialogs"
Cohesion: 0.10
Nodes (28): Comment, AutomationCard(), AutomationCardProps, AutomationForm(), AutomationFormProps, AutomationView(), EMPTY_FORM, formFromAutomation() (+20 more)

### Community 48 - "Community 48"
Cohesion: 0.23
Nodes (17): AGENT_EFFORT_FULL_LABELS, AGENT_MODEL_FULL_LABELS, CODEX_EFFORT_FULL_LABELS, ORCHESTRATOR_LABELS, ProfilePipeline(), buildProfilePipeline(), claudeDetail(), claudeSubagentDetail() (+9 more)

### Community 49 - "Slot State"
Cohesion: 0.08
Nodes (38): main(), scalar(), cleanTicket(), conflictTicket(), REVIEW_OPTS, reviewTicket(), TICKET_OPTS, applyAppSettingsToModels() (+30 more)

### Community 50 - "Stats Hooks & Cards"
Cohesion: 0.16
Nodes (12): ChartConfig, ChartContainer, ChartContainerProps, ChartContext, ChartContextValue, ChartLegendContent(), ChartLegendContentProps, ChartTooltipContent() (+4 more)

### Community 51 - "Community 51"
Cohesion: 0.10
Nodes (52): ExecutionOverrides, AttachExecutionSessionInput, AutomationPatch, EnqueueAgentMessageInput, FinalizeExecutionInput, MarkAgentMessageAcceptedInput, MarkAgentMessageReceivedInput, MarkAgentMessageRejectedInput (+44 more)

### Community 52 - "repairPath.ts"
Cohesion: 0.18
Nodes (12): terminalServerMessageSchema, badgeLabelFor(), LiveTerminal(), LiveTerminalOptions, LiveTerminalProps, TerminalCell(), TerminalCellProps, TERMINAL_THEME (+4 more)

### Community 53 - "User Terminal Manager"
Cohesion: 0.33
Nodes (5): CONTEXT — domain glossary, Execution, Proposed (not yet built), Seams, Work items

### Community 54 - "Community 54"
Cohesion: 0.21
Nodes (19): applySizes(), collectTerminalIds(), findLeaf(), firstLeafId(), LeafNode, leafNodeSchema, makeLeaf(), nextNodeId() (+11 more)

### Community 55 - "App.tsx"
Cohesion: 0.14
Nodes (4): FeasibilityBatchManager, toTriageResult(), FeasibilityResult, TriageResult

### Community 56 - "CSV Parsing"
Cohesion: 0.09
Nodes (31): FEASIBILITY_ENGINES, IMPLEMENTERS, ORCHESTRATORS, STAGE_LABELS, CodexAgentFields(), ImplementationAgentFields(), ProvidersSettings(), FILLED_GLYPH_COLORS (+23 more)

### Community 57 - "Community 57"
Cohesion: 0.17
Nodes (17): ensureConfig(), boot(), externalUrlFromNewWindowEvent(), forwardAtelierShortcut(), installApplicationMenu(), installMenuShortcutBridge(), menuShortcutActionSchema, navigationEventSchema (+9 more)

### Community 58 - "File Uploads"
Cohesion: 0.06
Nodes (29): RecordingSystemAdapter, FailedReformulation, ActionSystem, CapabilityCache, dryRunLog, fakeEncoder, CLAUDE_JSON_PATH, COMPOSER_BINARIES (+21 more)

### Community 59 - "triageManager.ts"
Cohesion: 0.18
Nodes (19): buildContractConstraintsLines(), buildResponseFormatLines(), buildStrictRulesLines(), buildTicketLines(), buildTriageChannelPrompt(), buildTriagePlusChannelPrompt(), isEnglish(), readOnlyFramingLines() (+11 more)

### Community 60 - "Package Manifest"
Cohesion: 0.36
Nodes (8): getSnapshot(), INITIAL_SNAPSHOT, loadReviewCounts(), publish(), refreshReviewCounts(), subscribe(), subscribers, useReviewCounts()

### Community 61 - "splitManager.ts"
Cohesion: 0.09
Nodes (32): App(), HOME_VIEW_OPTIONS, HomeView, QuitConfirmModal(), QuitConfirmModalProps, TerminalsView(), TOOL_KINDS, ToolDialogs() (+24 more)

### Community 62 - "TicketCard.tsx"
Cohesion: 0.14
Nodes (10): addUsageByModel(), toUsageByModel(), TicketLifecycle, Stage, TERMINAL_STAGES, Ticket, DescriptionTabProps, PrdTabProps (+2 more)

### Community 63 - "Community 63"
Cohesion: 0.06
Nodes (10): DoneGateResult, ReviewHeadResult, FAKE_OPEN_PRS, FakeVcsClient, githubPrHeadRef(), CreatePrResult, VcsClient, isPrNeedsAttention() (+2 more)

### Community 64 - "Composer Run Script"
Cohesion: 0.35
Nodes (9): gitMetadataWritableRoots(), agentBaseEnv(), bestInstalledMatch(), compareParts(), envWithProjectNode(), nvmNodeBinDir(), readNvmrc(), prepareProjectShell() (+1 more)

### Community 65 - "split.ts"
Cohesion: 0.26
Nodes (9): applyTranscriptUpdate(), TranscriptState, transcriptText(), transcriptUpdateSchema, FullscreenToggle(), FullscreenToggleProps, TerminalData, TerminalView() (+1 more)

### Community 66 - "OpenPr"
Cohesion: 0.16
Nodes (10): canonicalJson(), CodexCommandHook, codexSessionPreToolUseHookHash(), JsonValue, createCodexProvider(), AppServerFixtureOptions, hookPathForSession(), options() (+2 more)

### Community 67 - "TerminalView.tsx"
Cohesion: 0.09
Nodes (18): setup(), Watchdog, PROJECT_ROOT, NOTE: PRD generation holds the request open up to ~120s (REFORMULATE_TIMEOUT_MS), resolveDataFile(), resolveServerPort(), serveStaticAsset(), SocketData (+10 more)

### Community 68 - "schema.test.ts"
Cohesion: 0.14
Nodes (22): PrdAnnotator(), PrdAnnotatorProps, BREADCRUMB, NO_ANNOTATIONS, PrdReviewDialog(), PrdReviewDialogProps, DraftUpdate, parseJson() (+14 more)

### Community 69 - "reviewFindings.ts"
Cohesion: 0.07
Nodes (29): ActiveReviewPass, BOARD_FINDING_RENDER_STYLE, log, orderedReviewKinds(), renderCollapsedFinding(), renderFinding(), renderPersistedReviewResult(), REVIEW_DISALLOWED_TOOLS (+21 more)

### Community 70 - "CodexRuntimeStatus"
Cohesion: 0.13
Nodes (11): WsClientEvent, active, ensureNotificationPermission(), getAudioContext(), isSupported(), loadSoundBuffer(), playBuffer(), playNotificationSound() (+3 more)

### Community 71 - "PostCSS Config"
Cohesion: 0.29
Nodes (6): name, overrides, zod, private, type, version

### Community 72 - "App.tsx"
Cohesion: 0.27
Nodes (11): groupOrientation(), layoutToSizes(), panelId(), panelPercent(), SplitTree(), SplitTreeProps, SplitOrientation, isShortcutDetail() (+3 more)

### Community 73 - "TerminalView.tsx"
Cohesion: 0.11
Nodes (36): UNKNOWN_CODEX_RUNTIME_STATUS, Capabilities, AskPanel(), CleanPrPanel(), CodexConnectionStatus(), STATUS_LABELS, ReviewPrPanel(), SessionDriverFields() (+28 more)

### Community 74 - "button.tsx"
Cohesion: 0.09
Nodes (27): FindingRenderStyle, FULL_REVIEW_KINDS, LIGHT_REVIEW_KINDS, ReviewPass, AGENT_EFFORT_LABELS, AGENT_MODEL_LABELS, AUTOMATION_RUN_STATUSES, AUTOMATION_TRIGGER_LABELS (+19 more)

### Community 75 - ".handleRequest"
Cohesion: 0.10
Nodes (15): analyzeResultSchema, compactTicketSchema, createResultSchema, errorResultSchema, ISOLATED_ENV_KEYS, projectResultSchema, savedEnv, startResultSchema (+7 more)

### Community 76 - "usePrdSearch.ts"
Cohesion: 0.15
Nodes (16): costByFamily(), costOf(), costOfModel(), costOfSessions(), CostSummary, FamilyPricing, MODEL_PRICING, ModelFamily (+8 more)

### Community 78 - "csv.ts"
Cohesion: 0.08
Nodes (30): boundedCommandDetail(), runBoundedCommand(), safeJsonParse(), withJsonRequestFile(), ReviewPublicationEvent, ReviewPublicationState, extractPrUrl(), ghPrHeadSchema (+22 more)

### Community 79 - "WorktreeSession"
Cohesion: 0.33
Nodes (3): listeners, mcp, ReplyArgsSchema

### Community 80 - "recordedAction.ts"
Cohesion: 0.23
Nodes (17): alternation(), COMMAND_WRAPPERS, commandSegments(), commandWords(), executableName(), launchedPackageScript(), launchesTypecheck(), OPTIONS_WITH_VALUE (+9 more)

### Community 81 - "vcsCommands.ts"
Cohesion: 0.20
Nodes (7): AZURE_COMMANDS, COMMANDS_BY_PROVIDER, GITHUB_COMMANDS, PrDiffContext, VcsCleanCommands, AZ_SETTLED_THREAD_STATUSES, VCS_PROVIDER_LABELS

### Community 82 - "TicketOperations"
Cohesion: 0.22
Nodes (4): PublicMcpManager, isActive(), isBlocked(), TicketOperations

### Community 86 - "useTickTimer.ts"
Cohesion: 0.23
Nodes (10): artifactPath, assertPackageVersionInSync(), assertSdkVersionsInSync(), BUILT_DMG, ELECTROBUN_BIN, fail(), installedPackageVersion(), RELEASE_FOLDER (+2 more)

### Community 87 - "codexBinary.ts"
Cohesion: 0.32
Nodes (6): agentPairError(), normalizeCreateInput(), requestKeyConflictMessage(), ticketDependencyError(), isAllowedAgentPair(), deriveTitleFromDescription()

### Community 89 - "usePrdSearch.ts"
Cohesion: 0.11
Nodes (24): CompactTicket, ListTicketsInput, Column, COLUMN_LABELS, COLUMN_ORDER, COLUMNS, ACTIVE_COLUMNS, Board() (+16 more)

### Community 90 - "nvmNode.ts"
Cohesion: 0.22
Nodes (4): confirmPrMerged(), unmergedReason(), PR_STATE_LABELS, PrState

### Community 91 - ".onMessageStatus"
Cohesion: 0.27
Nodes (9): NOTE: Radix's dismissable layer registers its Escape listener on `document` in t, useCaptureEscape(), collectMatchRanges(), isShortcutDetail(), ShortcutDetail, supportsHighlightApi(), usePrdSearch(), UsePrdSearchOptions (+1 more)

### Community 92 - "WorktreeAddressWatcher"
Cohesion: 0.48
Nodes (3): ensureClaudeBinary(), SDK_EFFORTS, toSdkEffort()

### Community 93 - "ColumnActionsMenu.tsx"
Cohesion: 0.25
Nodes (7): Azure DevOps support — state file, Decisions (validated by the owner, 2026-09-21), Goal, Known blockers for lots 3 and 4, Open questions, Progress, Verified on this machine (az 2.90.0, azure-devops 1.0.8)

### Community 94 - ".addComment"
Cohesion: 0.08
Nodes (28): log, log, ToolHandler, ToolResult, DRY_RUN_VERDICT, log, log, ReformulateManager (+20 more)

### Community 95 - "TicketConfigSummary.tsx"
Cohesion: 0.50
Nodes (3): appBundle, EMBEDDED_BINARIES, resourcesApp

### Community 97 - "RunningServer"
Cohesion: 0.09
Nodes (21): logRejection(), DRY_RUN_RESULT, log, PendingSplit, SplitManager, WorktreeAddressWatcher, projectConfigSchema, buildAppSettingsPatch() (+13 more)

### Community 98 - "triageManager.ts"
Cohesion: 0.20
Nodes (10): AtelierDesktopRpcSchema, DesktopRequests, McpSettingsMetadata, WebviewRequests, McpSettingsController, McpSettings(), errorMessage(), createMcpSettingsClient() (+2 more)

### Community 99 - "reviewPublishingGuard.ts"
Cohesion: 0.07
Nodes (35): API_GUARDS, API_READ_METHOD_SET, ApiDenyPatterns, ApiGuard, AZ_INVOKE_COMMAND, AZ_INVOKE_METHOD_LONG_FLAGS, AZ_INVOKE_WRITE_INPUT_LONG_FLAGS, AZ_PR_WRITE_PATTERN (+27 more)

### Community 100 - ".startVerification"
Cohesion: 0.13
Nodes (24): ActiveDelegation, ExecutionFinishStatus, LiveSession, log, PendingSessionMessage, previewToolInput(), renderSessionEvent(), SessionExecutionContext (+16 more)

### Community 101 - "codexProvider.test.ts"
Cohesion: 0.08
Nodes (4): featureBranch(), slotPath(), slugify(), SystemAdapter

### Community 102 - ".start"
Cohesion: 0.06
Nodes (19): setup(), startFeasibilityTicket(), nullableBooleanValue(), SqlUpdateBuilder, Store, runRecordedAction(), createApiRoutes(), createSplitChildren() (+11 more)

### Community 103 - "TerminalSession"
Cohesion: 0.07
Nodes (11): FakePaneStream, RealPaneStream, PaneStream, dataMessage(), normalizeSeed(), safeParse(), send(), TerminalSession (+3 more)

### Community 104 - ".runWorktreeSetupScript"
Cohesion: 0.36
Nodes (7): effectivePort(), isAllowedHost(), isAllowedOrigin(), isAuthorized(), isLoopbackHost(), jsonResponse(), parseHost()

### Community 105 - "createMcpServer"
Cohesion: 0.43
Nodes (6): createMcpServer(), invalidInput(), listPublicProjects(), OutputValidator, toolError(), toolResult()

### Community 106 - "usePrdSearch.ts"
Cohesion: 0.09
Nodes (19): ANSI, appendToLogFile(), COLOR_ENABLED, disableFileLogging(), initLogFile(), isLevel(), Level, LEVEL_ORDER (+11 more)

### Community 107 - "azureRemote.ts"
Cohesion: 0.40
Nodes (10): azureOrgUrl(), fromAzureSegments(), fromCollectionSegments(), fromLegacySegments(), fromSshSegments(), parseAzureRepoRef(), parseRemoteLocation(), RemoteLocation (+2 more)

### Community 108 - "oneShotSession.ts"
Cohesion: 0.18
Nodes (11): StatRecord, CodexTierSummary(), DurationChart(), UseStatsResult, effectiveEffortLabel(), effectiveModelLabel(), meanDurationByEffort(), meanDurationByModel() (+3 more)

### Community 109 - "projectDisplay.ts"
Cohesion: 0.17
Nodes (18): COLUMN_SORT_FIELD, BoardColumn(), compareFamilyMembers(), familyKeyOf(), groupTicketIds(), groupTicketsByFamily(), isSplitMother(), readCollapsed() (+10 more)

### Community 110 - "Profile"
Cohesion: 0.10
Nodes (32): ProfileConfig, DragHandleAttributes, DragHandleListeners, ProfileRow(), ProfileRowHeader(), ProfileRowHeaderProps, ProfileRowProps, ProfilesSettings() (+24 more)

### Community 111 - "isProcessing"
Cohesion: 0.27
Nodes (12): AppSettings, AgentDefaultsSettings(), AppSettingsState, flashSaved(), loadOnce(), patchAppSettings(), publish(), snapshot() (+4 more)

### Community 112 - "prd.ts"
Cohesion: 0.07
Nodes (29): cleanDescription(), isWebOnlyPath(), log, prSummaryLines(), reviewDescription(), RouteDeps, toManagedProject(), createAskSchema (+21 more)

### Community 113 - "reformulate.ts"
Cohesion: 0.23
Nodes (10): columnSchema, MetaRow(), MetaRowProps, STATUS_CONFIRMS, StatusConfirm, statusTitle(), TicketMeta(), resolveProjectLabel() (+2 more)

### Community 115 - "isNotionUrl"
Cohesion: 0.40
Nodes (5): VCS_PROVIDERS, parsePrUrl(), PR_URL_SEGMENT, prNumberFromUrl(), PrUrlRef

### Community 116 - "settings.tsx"
Cohesion: 0.07
Nodes (36): AppearanceSettings(), CODEX_STATUS_TONES, COMMIT_ROW, DefaultsRowSpec, EFFORT_OPTIONS, FEASIBILITY_ROW, IMPLEMENTATION_ROW, KnobGroupProps (+28 more)

### Community 117 - "TicketMeta.tsx"
Cohesion: 0.21
Nodes (14): isCodexFastServiceTier(), summarizeSessionCosts(), totalTokensOfSessions(), SessionUsage, executionCosts(), executionTokens(), projectStatRecord(), CostSummary() (+6 more)

### Community 119 - "delegationManager.test.ts"
Cohesion: 0.27
Nodes (8): CHILD_USAGE, FULL_REVIEW_KINDS, LIGHT_REVIEW_KINDS, newDelegatedTicket(), newReviewTicket(), sleep(), startAndApproveReviews(), submitReviews()

### Community 120 - "store.ts"
Cohesion: 0.24
Nodes (6): enrichWorktreeSession(), WorktreeSession, BoardState, CommentListener, Listener, Toast

### Community 121 - "bootstrap.ts"
Cohesion: 0.36
Nodes (5): applyDesktopEnv(), DesktopRoots, ensureMcpToken(), regenerateMcpToken(), temporaryDirectories

### Community 122 - "projectDisplay.ts"
Cohesion: 0.38
Nodes (4): formatCommitTimeout(), TimeoutUnit, timeoutUnitMs(), timeoutUnitOf()

## Knowledge Gaps
- **702 isolated node(s):** `TICKET_MIGRATIONS`, `PROFILE_MIGRATIONS`, `EXECUTION_MIGRATIONS`, `REVIEW_RESULT_MIGRATIONS`, `PROJECT_MIGRATIONS` (+697 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Ticket` connect `TicketCard.tsx` to `Contract Building & Slots`, `Shared Zod Schemas`, `PR Selection & Slots Bar`, `Core Domain Concepts`, `Database Store Operations`, `Coordinator & Protocol`, `Live Terminal Views`, `Store Types & Agent Knobs`, `DB Row Schemas & Mappers`, `Dev Dependencies`, `Agents View & Ticket Cards`, `User Terminal & Fake IO`, `NPM Scripts`, `Runtime Dependencies`, `API Client Inputs`, `Ticket Config & Constants`, `Demo Pipeline Concepts`, `Session Hub Transcript`, `Modal Dialogs`, `Slot State`, `Community 51`, `CSV Parsing`, `triageManager.ts`, `splitManager.ts`, `reviewFindings.ts`, `CodexRuntimeStatus`, `TerminalView.tsx`, `button.tsx`, `codexBinary.ts`, `usePrdSearch.ts`, `.addComment`, `.start`, `projectDisplay.ts`, `prd.ts`, `reformulate.ts`, `ApiDenyPatterns`, `TicketMeta.tsx`, `delegationManager.test.ts`, `store.ts`, `reformulate.ts`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Why does `Store` connect `.start` to `Shared Zod Schemas`, `Coordinator & Protocol`, `Store Types & Agent Knobs`, `Dev Dependencies`, `NPM Scripts`, `Agent Profile Config`, `API Client Inputs`, `Session Hub Transcript`, `Modal Dialogs`, `Slot State`, `Community 51`, `TicketCard.tsx`, `TerminalView.tsx`, `reviewFindings.ts`, `.addComment`, `RunningServer`, `.startVerification`, `codexProvider.test.ts`, `oneShotSession.ts`, `prd.ts`, `ApiDenyPatterns`, `delegationManager.test.ts`, `store.ts`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Why does `SystemAdapter` connect `codexProvider.test.ts` to `RunningServer`, `.startVerification`, `reviewFindings.ts`, `Agent Profile Config`, `Settings & Profiles UI`, `TerminalSession`, `nvmNode.ts`, `API Client Inputs`, `Shared Zod Schemas`, `Board & Sidebar Layout`, `Session Hub Transcript`, `Coordinator & Protocol`, `File Uploads`, `.addComment`, `Community 63`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **What connects `TICKET_MIGRATIONS`, `PROFILE_MIGRATIONS`, `EXECUTION_MIGRATIONS` to the rest of the system?**
  _713 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Contract Building & Slots` be split into smaller, more focused modules?**
  _Cohesion score 0.0350076103500761 - nodes in this community are weakly interconnected._
- **Should `Terminals UI & Notifications` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._
- **Should `Desktop Bootstrap & Menus` be split into smaller, more focused modules?**
  _Cohesion score 0.11 - nodes in this community are weakly interconnected._