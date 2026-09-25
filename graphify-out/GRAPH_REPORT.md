# Graph Report - kanban-agents  (2026-09-25)

## Corpus Check
- 276 files · ~751,566 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3083 nodes · 9035 edges · 121 communities (112 shown, 9 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 59 edges (avg confidence: 0.67)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e01dfcdb`
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
- ApiDenyPatterns
- isNotionUrl
- settings.tsx
- TicketMeta.tsx
- notionImport.ts
- delegationManager.test.ts
- reformulate.ts

## God Nodes (most connected - your core abstractions)
1. `Store` - 128 edges
2. `Ticket` - 114 edges
3. `cn()` - 81 edges
4. `SystemAdapter` - 78 edges
5. `createApiRoutes()` - 74 edges
6. `FakeSystemAdapter` - 68 edges
7. `RealSystemAdapter` - 66 edges
8. `SlotManager` - 57 edges
9. `VcsProvider` - 57 edges
10. `ProjectInfo` - 52 edges

## Surprising Connections (you probably didn't know these)
- `McpSettingsClient` --references--> `McpSettingsMetadata`  [EXTRACTED]
  src/web/src/lib/mcpSettings.ts → desktop/mcpRpc.ts
- `main()` --calls--> `assertCodexDowngradeSafe()`  [EXTRACTED]
  scripts/downgrade-codex-catalog.ts → src/server/db/schema.ts
- `main()` --calls--> `migrateCodexCatalog()`  [EXTRACTED]
  scripts/downgrade-codex-catalog.ts → src/server/db/schema.ts
- `ActiveReviewPass` --references--> `ResolvedExecution`  [EXTRACTED]
  src/server/agents/delegationManager.ts → src/server/agents/executionConfig.ts
- `TriageSessionInput` --references--> `Orchestrator`  [EXTRACTED]
  src/server/agents/sessionConfig.ts → src/shared/constants.ts

## Import Cycles
- 3-file cycle: `src/server/config.ts -> src/server/db/store.ts -> src/server/db/rows.ts -> src/server/config.ts`
- 3-file cycle: `src/server/agents/worktreeAddresses.ts -> src/server/config.ts -> src/server/db/store.ts -> src/server/agents/worktreeAddresses.ts`

## Communities (121 total, 9 thin omitted)

### Community 0 - "Contract Building & Slots"
Cohesion: 0.04
Nodes (68): ActionExecutionOptions, actionExecutionOptionsSchema, agentMessageSchema, AnalyzeTicketsInput, appSettingsSchema, automationRunSchema, automationSchema, baseBranchSchema (+60 more)

### Community 1 - "Terminals UI & Notifications"
Cohesion: 0.08
Nodes (33): analyzeTicketsInputSchema, analyzeTicketsOutputSchema, columnSchema, compactTicketSchema, createMcpServer(), createTodoTicketOutputSchema, editableTicketSchema, effectivePort() (+25 more)

### Community 2 - "Desktop Bootstrap & Menus"
Cohesion: 0.11
Nodes (12): createCodexAgentSession(), inheritedMcpServerNames(), PreparedHook, prepareSkills(), threadConfig(), hasExplicitCodexApiKey(), isProtocolIncompatibility(), listRuntimeModels() (+4 more)

### Community 3 - "Feasibility Batch Management"
Cohesion: 0.06
Nodes (38): log, logRejection(), ToolHandler, ToolResult, TRIAGE_VERDICTS, getErrorStack(), AgentSettableStage, agentSettableStageSchema (+30 more)

### Community 4 - "Ticket Action Panels"
Cohesion: 0.14
Nodes (21): ALSO_FLAGGED_PREFIX, dedupeFindings(), dedupeIdenticalFindings(), findingAnchor(), FRENCH_STOP_WORD_PATTERN, FRENCH_STOP_WORDS, hasSimilarSummary(), isSameDefect() (+13 more)

### Community 5 - "Fake System Adapter"
Cohesion: 0.10
Nodes (14): boundedCommandDetail(), runBoundedCommand(), safeJsonParse(), withJsonRequestFile(), AzureDevopsVcsClient, prWebUrl(), readOriginRemote(), repoRefFromPrUrl() (+6 more)

### Community 6 - "Shared Zod Schemas"
Cohesion: 0.15
Nodes (4): SlotManager, projectVcsProvider(), failSplitMother(), TicketOperationsDeps

### Community 7 - "Settings & Profiles UI"
Cohesion: 0.08
Nodes (4): delay(), fakeShellPrompt(), FakeSystemAdapter, ReviewDoneOptions

### Community 8 - "PR Selection & Slots Bar"
Cohesion: 0.15
Nodes (19): isNotionUrl(), NOTION_HOSTS, NewTicketSheet(), NewTicketSheetProps, LaunchForm(), LaunchFormProps, Select, COLUMN_NODE_COLOR (+11 more)

### Community 9 - "Real System Adapter"
Cohesion: 0.06
Nodes (52): AppSettings, CreateProjectInput, UpdateProjectInput, vcsProviderSchema, ConnectionHint, DragHandleAttributes, DragHandleListeners, groupProjects() (+44 more)

### Community 10 - "Slot Config & Worktree Watch"
Cohesion: 0.08
Nodes (27): RecordingSystemAdapter, PublishReviewOptions, PublishReviewResult, azureChangeEntrySchema, azureCommentSchema, azureIdentitySchema, azureIterationChangesSchema, azureIterationListSchema (+19 more)

### Community 11 - "Core Domain Concepts"
Cohesion: 0.04
Nodes (49): agentMessageRowSchema, AutomationRow, automationRowSchema, AutomationRunRow, automationRunRowSchema, buildScripts(), CommentRow, commentRowSchema (+41 more)

### Community 12 - "Board & Sidebar Layout"
Cohesion: 0.08
Nodes (6): NewProject, ProjectPatch, RealSystemAdapter, DoneGateResult, PrepareReviewWorktreeOptions, VcsProvider

### Community 13 - "Database Store Operations"
Cohesion: 0.08
Nodes (39): ProjectInfo, StatRecord, AgentsViewProps, AskPanelProps, CleanPrPanelProps, groupProjects(), groupReviewCount(), initialExpandedGroups() (+31 more)

### Community 14 - "Coordinator & Protocol"
Cohesion: 0.10
Nodes (27): resolveBaseBranch(), buildAskContract(), buildCleanContract(), buildConflictResolutionContract(), groupFeasibilityTickets(), codexImplementerKnobs(), assertCodexImplementerAvailable(), log (+19 more)

### Community 15 - "API Routes & Reformulate"
Cohesion: 0.13
Nodes (12): CodexAppServerProtocolError, CodexAppServerRpcError, connectCodexAppServer(), incomingSchema, initializeResponseSchema, log, PendingRequest, rpcErrorSchema (+4 more)

### Community 16 - "Stats Aggregation"
Cohesion: 0.12
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
Nodes (25): FAILURE_COLUMNS, Kind, KINDS, SUCCESS_COLUMNS, OutcomeChart(), SuccessRateChart(), ThroughputChart(), effectiveWorkDurationMs() (+17 more)

### Community 21 - "Store Types & Agent Knobs"
Cohesion: 0.17
Nodes (26): buildFeasibilityBatchContract(), buildFeasibilityContextSection(), buildImplementingSteps(), buildMockupReviewStep(), buildPlanningStep(), buildPrdBullet(), buildReviewContract(), buildReviewFixLines() (+18 more)

### Community 22 - "DB Row Schemas & Mappers"
Cohesion: 0.07
Nodes (43): Comment, ActivityTab(), ActivityTabProps, isUnanswered(), NO_COMMENT_COLUMNS, AUTHOR_BADGES, CommentRow(), CommentRowProps (+35 more)

### Community 23 - "Dev Dependencies"
Cohesion: 0.07
Nodes (27): TicketCreationRequestConflictError, agentPairError(), AnalyzeTicketRejectionReason, AnalyzeTicketsResult, CreateTodoTicketInput, createTodoTicketInputSchema, CreateTodoTicketResult, FeasibilityStarter (+19 more)

### Community 24 - "TypeScript Config"
Cohesion: 0.14
Nodes (21): bashCommandSchema, buildSettings(), claudeProvider, createSdkAgentSession(), denyBashHook(), denyNoVerifyHook, denyReviewPublishingHook, denyTypecheckHook() (+13 more)

### Community 25 - "Client Hub & Watchdog"
Cohesion: 0.28
Nodes (13): abortReason(), computeCodeFingerprint(), FingerprintEntry, FingerprintPhase, hashFingerprintPaths(), isMissingFileError(), listFingerprintPaths(), log (+5 more)

### Community 26 - "Cost & Pricing"
Cohesion: 0.14
Nodes (27): renderPersistedReviewResult(), ExecutionFinishStatus, LiveSession, log, PendingSessionMessage, previewToolInput(), renderChannelEvent(), renderImplementationDone() (+19 more)

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
Cohesion: 0.06
Nodes (56): COLUMN_SORT_FIELD, AgentCard(), AgentCardProps, AgentsView(), hasLiveAgent(), normalize(), BoardColumn(), compareFamilyMembers() (+48 more)

### Community 31 - "PRD Review & Markdown"
Cohesion: 0.20
Nodes (8): Block, blockText(), compactChunks(), firstCharCode(), TranscriptBuffer, trimBlockStart(), AgentStreamBlock, TranscriptUpdate

### Community 32 - "User Terminal & Fake IO"
Cohesion: 0.11
Nodes (12): AckSystem, ActiveDelegation, ClosableExecution, RecordedSession, RecordingSystem, RecordedSession, RecordingSystem, RelaunchSystem (+4 more)

### Community 33 - "Logging"
Cohesion: 0.10
Nodes (21): scripts, build:desktop, build:web, dev, dev:desktop, dev:proxy, dev:server, dev:web (+13 more)

### Community 34 - "Board Columns"
Cohesion: 0.09
Nodes (28): ProjectPrPicker(), ProjectPrPickerProps, PrSelectRow(), AuthorBadge(), TICKET_TAB_LABELS, TicketTab, TicketTabs(), TicketTabsProps (+20 more)

### Community 35 - "NPM Scripts"
Cohesion: 0.14
Nodes (3): AgentCoordinator, SessionToolCall, mapTicketRow()

### Community 36 - "Runtime Dependencies"
Cohesion: 0.11
Nodes (24): DEFAULT_MODELS, AttachExecutionSessionInput, EnqueueAgentMessageInput, FinalizeExecutionInput, MarkAgentMessageAcceptedInput, MarkAgentMessageReceivedInput, MarkAgentMessageRejectedInput, persistedReviewFindingsSchema (+16 more)

### Community 37 - "Claude SDK Provider"
Cohesion: 0.09
Nodes (23): dependencies, @anthropic-ai/claude-agent-sdk, dompurify, elysia, @fontsource/ibm-plex-mono, @fontsource/ibm-plex-sans, marked, @modelcontextprotocol/sdk (+15 more)

### Community 38 - "Agent Profile Config"
Cohesion: 0.16
Nodes (5): AutomationManager, mapAutomationRow(), mapAutomationRunRow(), Automation, AutomationRun

### Community 39 - "Agent Coordinator Handlers"
Cohesion: 0.18
Nodes (17): adopt(), compareVersions(), detectionCandidates(), detectUserInstall(), downloadAndVerifyTarball(), downloadPinnedBinary(), emitProgress(), isCompatibleCli() (+9 more)

### Community 40 - "API Client Inputs"
Cohesion: 0.15
Nodes (5): childTranscriptPrefix(), DelegationManager, reviewKey(), mergeAgentUsageByModel(), AgentSessionEvent

### Community 41 - "Ticket Config & Constants"
Cohesion: 0.15
Nodes (20): ColumnActionsMenu(), ColumnActionsMenuProps, ColumnMenuItem, ActionContext, buildActions(), ConfirmSpec, errorMessage(), RETRY_STAGES (+12 more)

### Community 42 - "Ticket Detail & Triage UI"
Cohesion: 0.14
Nodes (18): StatEmpty(), ACTIVE_BAR, AREA_CURSOR, AXIS_PROPS, BAR_CURSOR, CHART_PALETTE, colorAt(), DurationBars() (+10 more)

### Community 43 - "Demo Pipeline Concepts"
Cohesion: 0.46
Nodes (5): buildSplitChannelPrompt(), buildTicketLines(), isEnglish(), extractFigmaUrls(), hasMockups()

### Community 44 - "Chart Primitives"
Cohesion: 0.22
Nodes (4): McpTokenSource, createMcpSettingsController(), McpSettingsControllerDependencies, temporaryDirectories

### Community 45 - "Session Hub Transcript"
Cohesion: 0.10
Nodes (11): featureBranch(), slotPath(), slugify(), mapSlotRow(), mapWorktreeSessionRow(), enrichWorktreeSession(), ClientSocket, TERMINAL_STAGES (+3 more)

### Community 46 - "Community 46"
Cohesion: 0.27
Nodes (15): Agent Implementation Config, Argus Code Review, Automated Tests (typecheck/lint/test), Claude Code Autonomous Agent, Ticket Contract Injection, Feasibility Analysis, Kanban Board (Atelier), Kanban Agents Demo (demo.gif) (+7 more)

### Community 47 - "Modal Dialogs"
Cohesion: 0.10
Nodes (23): RFC-4180, AutomationCard(), AutomationCardProps, AutomationForm(), AutomationFormProps, AutomationView(), EMPTY_FORM, formFromAutomation() (+15 more)

### Community 48 - "Community 48"
Cohesion: 0.13
Nodes (10): createApiRoutes(), createSplitChildren(), isBlocked(), isSplitMother(), jsonError(), PaneReader, performSplit(), splitChildDefaults() (+2 more)

### Community 49 - "Slot State"
Cohesion: 0.06
Nodes (45): main(), scalar(), cleanTicket(), conflictTicket(), REVIEW_OPTS, reviewTicket(), TICKET_OPTS, CHILD_USAGE (+37 more)

### Community 50 - "Stats Hooks & Cards"
Cohesion: 0.16
Nodes (12): ChartConfig, ChartContainer, ChartContainerProps, ChartContext, ChartContextValue, ChartLegendContent(), ChartLegendContentProps, ChartTooltipContent() (+4 more)

### Community 51 - "Community 51"
Cohesion: 0.21
Nodes (29): ExecutionOverrides, ProjectKey, AutomationPatch, NewAsk, NewAutomation, NewClean, NewProfile, NewReview (+21 more)

### Community 52 - "repairPath.ts"
Cohesion: 0.18
Nodes (12): terminalServerMessageSchema, badgeLabelFor(), LiveTerminal(), LiveTerminalOptions, LiveTerminalProps, TerminalCell(), TerminalCellProps, TERMINAL_THEME (+4 more)

### Community 53 - "User Terminal Manager"
Cohesion: 0.33
Nodes (5): CONTEXT — domain glossary, Execution, Proposed (not yet built), Seams, Work items

### Community 54 - "Community 54"
Cohesion: 0.22
Nodes (18): applySizes(), collectTerminalIds(), findLeaf(), firstLeafId(), LeafNode, leafNodeSchema, makeLeaf(), nextNodeId() (+10 more)

### Community 55 - "App.tsx"
Cohesion: 0.17
Nodes (3): FeasibilityBatchManager, toTriageResult(), FeasibilityResult

### Community 56 - "CSV Parsing"
Cohesion: 0.15
Nodes (25): AskPanel(), CodexAgentFields(), CodexAgentFieldsProps, ImplementationAgentFields(), ProfileRow(), SessionDriverFields(), TabOption, Tabs() (+17 more)

### Community 57 - "Community 57"
Cohesion: 0.21
Nodes (14): ensureConfig(), boot(), externalUrlFromNewWindowEvent(), forwardAtelierShortcut(), installApplicationMenu(), installMenuShortcutBridge(), menuShortcutActionSchema, navigationEventSchema (+6 more)

### Community 58 - "File Uploads"
Cohesion: 0.05
Nodes (39): FailedReformulation, ActionSystem, CapabilityCache, directories, dryRunLog, fakeEncoder, hexToBytes(), CLAUDE_JSON_PATH (+31 more)

### Community 59 - "triageManager.ts"
Cohesion: 0.28
Nodes (14): buildContractConstraintsLines(), buildResponseFormatLines(), buildStrictRulesLines(), buildTicketLines(), buildTriageChannelPrompt(), buildTriagePlusChannelPrompt(), isEnglish(), readOnlyFramingLines() (+6 more)

### Community 60 - "Package Manifest"
Cohesion: 0.15
Nodes (18): COMMIT_LANGUAGE_LABELS, COMMIT_LANGUAGES, CommitLanguage, REVIEW_DEPTH_LABELS, REVIEW_DEPTHS, commitLanguageSchema, reviewDepthSchema, CleanPrPanel() (+10 more)

### Community 61 - "splitManager.ts"
Cohesion: 0.10
Nodes (25): App(), HOME_VIEW_OPTIONS, HomeView, NAV_ENTRIES, NavEntry, Sidebar(), SidebarProps, SidebarView (+17 more)

### Community 62 - "TicketCard.tsx"
Cohesion: 0.17
Nodes (8): addUsageByModel(), toUsageByModel(), TicketLifecycle, Ticket, TriageResult, DescriptionTabProps, PrdTabProps, TicketActionsProps

### Community 63 - "Community 63"
Cohesion: 0.08
Nodes (8): ReviewHeadResult, FAKE_OPEN_PRS, FakeVcsClient, githubPrHeadRef(), VcsClient, isPrNeedsAttention(), OpenPr, PrSelectRowProps

### Community 64 - "Composer Run Script"
Cohesion: 0.35
Nodes (9): gitMetadataWritableRoots(), agentBaseEnv(), bestInstalledMatch(), compareParts(), envWithProjectNode(), nvmNodeBinDir(), readNvmrc(), prepareProjectShell() (+1 more)

### Community 65 - "split.ts"
Cohesion: 0.20
Nodes (11): applyTranscriptUpdate(), TranscriptState, transcriptText(), transcriptUpdateSchema, FullscreenToggle(), FullscreenToggleProps, TerminalData, TerminalView() (+3 more)

### Community 66 - "OpenPr"
Cohesion: 0.16
Nodes (10): canonicalJson(), CodexCommandHook, codexSessionPreToolUseHookHash(), JsonValue, createCodexProvider(), AppServerFixtureOptions, hookPathForSession(), options() (+2 more)

### Community 67 - "TerminalView.tsx"
Cohesion: 0.07
Nodes (27): Watchdog, PROJECT_ROOT, NOTE: PRD generation holds the request open up to ~120s (REFORMULATE_TIMEOUT_MS), resolveDataFile(), resolveServerPort(), RunningServer, serveStaticAsset(), SocketData (+19 more)

### Community 68 - "schema.test.ts"
Cohesion: 0.13
Nodes (26): PrdAnnotator(), PrdAnnotatorProps, BREADCRUMB, NO_ANNOTATIONS, PrdReviewDialog(), PrdReviewDialogProps, PrdView(), Textarea (+18 more)

### Community 69 - "reviewFindings.ts"
Cohesion: 0.07
Nodes (37): ActiveReview, ActiveReviewPass, BOARD_FINDING_RENDER_STYLE, log, renderCollapsedFinding(), renderFinding(), REVIEW_DISALLOWED_TOOLS, REVIEW_REPORT_LABELS (+29 more)

### Community 70 - "CodexRuntimeStatus"
Cohesion: 0.09
Nodes (20): WsClientEvent, ATTENTION_STATUSES, sessionOf(), SlotPips(), SlotPipsProps, STATUS_LABELS, STATUS_PIP_CLASSES, active (+12 more)

### Community 71 - "PostCSS Config"
Cohesion: 0.29
Nodes (6): name, overrides, zod, private, type, version

### Community 72 - "App.tsx"
Cohesion: 0.50
Nodes (7): groupOrientation(), layoutToSizes(), panelId(), panelPercent(), SplitTree(), SplitTreeProps, TreeNode

### Community 73 - "TerminalView.tsx"
Cohesion: 0.18
Nodes (16): Capabilities, CodexConnectionStatus(), STATUS_LABELS, clearRetry(), loadCapabilities(), LoadOptions, publish(), refreshCapabilities() (+8 more)

### Community 74 - "button.tsx"
Cohesion: 0.07
Nodes (38): AGENT_EFFORT_FULL_LABELS, AGENT_EFFORT_LABELS, AGENT_MODEL_FULL_LABELS, AGENT_MODEL_LABELS, AUTOMATION_RUN_STATUSES, AUTOMATION_TRIGGER_LABELS, AUTOMATION_TRIGGERS, AutomationRunStatus (+30 more)

### Community 75 - ".handleRequest"
Cohesion: 0.10
Nodes (15): analyzeResultSchema, compactTicketSchema, createResultSchema, errorResultSchema, ISOLATED_ENV_KEYS, projectResultSchema, savedEnv, startResultSchema (+7 more)

### Community 76 - "usePrdSearch.ts"
Cohesion: 0.16
Nodes (15): costByFamily(), costOf(), costOfModel(), costOfSessions(), CostSummary, FamilyPricing, MODEL_PRICING, ModelFamily (+7 more)

### Community 78 - "csv.ts"
Cohesion: 0.06
Nodes (33): ReviewPublicationState, extractPrUrl(), ghPrHeadSchema, ghPrSchema, ghPrStateSchema, ghRestPullSchema, ghRestReviewPagesSchema, ghRestReviewSchema (+25 more)

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
Cohesion: 0.18
Nodes (16): assertExecutionAvailable(), CODEX_LAUNCH_STATUS_MESSAGES, CodexCapabilityReader, ExecutionDefaults, FEASIBILITY_ENGINE_EXECUTION, ResolvedExecution, resolveExecution(), resolveFeasibilityExecution() (+8 more)

### Community 86 - "useTickTimer.ts"
Cohesion: 0.23
Nodes (10): artifactPath, assertPackageVersionInSync(), assertSdkVersionsInSync(), BUILT_DMG, ELECTROBUN_BIN, fail(), installedPackageVersion(), RELEASE_FOLDER (+2 more)

### Community 87 - "codexBinary.ts"
Cohesion: 0.15
Nodes (15): CodexAppServerInitializationError, CodexBinaryVersionError, require, resolveCodexBinary(), resolveCodexBinaryOverride(), TARGETS, accountResponseSchema, modelListResponseSchema (+7 more)

### Community 89 - "usePrdSearch.ts"
Cohesion: 0.08
Nodes (34): isProcessing(), CompactTicket, ListTicketsInput, ACTIVE_STAGES, Column, COLUMN_LABELS, COLUMN_ORDER, COLUMNS (+26 more)

### Community 90 - "nvmNode.ts"
Cohesion: 0.18
Nodes (4): orderedReviewKinds(), mapReviewApprovalRow(), mapReviewPassRow(), parsePersistedReviewFindings()

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
Cohesion: 0.12
Nodes (12): log, setup(), log, ReformulateManager, SessionHub, TriageManager, log, ClientHub (+4 more)

### Community 95 - "TicketConfigSummary.tsx"
Cohesion: 0.50
Nodes (3): appBundle, EMBEDDED_BINARIES, resourcesApp

### Community 98 - "triageManager.ts"
Cohesion: 0.20
Nodes (9): AtelierDesktopRpcSchema, DesktopRequests, McpSettingsMetadata, WebviewRequests, McpSettingsController, McpSettings(), createMcpSettingsClient(), getMcpSettingsClient() (+1 more)

### Community 99 - "reviewPublishingGuard.ts"
Cohesion: 0.07
Nodes (35): API_GUARDS, API_READ_METHOD_SET, ApiDenyPatterns, ApiGuard, AZ_INVOKE_COMMAND, AZ_INVOKE_METHOD_LONG_FLAGS, AZ_INVOKE_WRITE_INPUT_LONG_FLAGS, AZ_PR_WRITE_PATTERN (+27 more)

### Community 100 - ".startVerification"
Cohesion: 0.32
Nodes (4): mapExecutionRunRow(), runRecordedAction(), ExecutionRun, ExecutionUsageByModel

### Community 101 - "codexProvider.test.ts"
Cohesion: 0.33
Nodes (9): useTheme(), UseThemeResult, applyTheme(), getStoredTheme(), isTheme(), Theme, ThemeOption, THEMES (+1 more)

### Community 103 - "TerminalSession"
Cohesion: 0.05
Nodes (16): RealPaneStream, PaneStream, SystemAdapter, dataMessage(), log, normalizeSeed(), safeParse(), send() (+8 more)

### Community 105 - "createMcpServer"
Cohesion: 0.31
Nodes (4): BoundedCommandResult, connectionFailure(), connectionResult(), VcsConnectionResult

### Community 106 - "usePrdSearch.ts"
Cohesion: 0.05
Nodes (38): DRY_RUN_RESULT, log, DRY_RUN_VERDICT, log, TriageSession, log, SlotWatch, WorktreeAddressWatcher (+30 more)

### Community 107 - "azureRemote.ts"
Cohesion: 0.40
Nodes (10): azureOrgUrl(), fromAzureSegments(), fromCollectionSegments(), fromLegacySegments(), fromSshSegments(), parseAzureRepoRef(), parseRemoteLocation(), RemoteLocation (+2 more)

### Community 108 - "oneShotSession.ts"
Cohesion: 0.24
Nodes (9): CodexTierSummary(), DurationChart(), effectiveEffortLabel(), effectiveModelLabel(), meanDurationByEffort(), meanDurationByModel(), meanExecutionDuration(), summarizeCodexTiers() (+1 more)

### Community 109 - "projectDisplay.ts"
Cohesion: 0.36
Nodes (4): PendingSplit, SplitManager, spawnCodexAppServer(), SplitResult

### Community 110 - "Profile"
Cohesion: 0.12
Nodes (30): ProfileConfig, AgentProfileConfig(), DragHandleAttributes, DragHandleListeners, ProfilePipeline(), ProfileRowHeader(), ProfileRowHeaderProps, ProfileRowProps (+22 more)

### Community 112 - "prd.ts"
Cohesion: 0.05
Nodes (38): buildNotionImportPrompt(), buildPrdPrompt(), ProjectInUseError, cleanDescription(), isWebOnlyPath(), log, prSummaryLines(), reviewDescription() (+30 more)

### Community 113 - "reformulate.ts"
Cohesion: 0.36
Nodes (5): applyDesktopEnv(), DesktopRoots, ensureMcpToken(), regenerateMcpToken(), temporaryDirectories

### Community 114 - "ApiDenyPatterns"
Cohesion: 0.48
Nodes (3): mapProfileRow(), nullableBooleanValue(), Profile

### Community 115 - "isNotionUrl"
Cohesion: 0.47
Nodes (5): SplitOrientation, isShortcutDetail(), ShortcutDetail, useTerminalShortcuts(), UseTerminalShortcutsOptions

### Community 116 - "settings.tsx"
Cohesion: 0.08
Nodes (27): AgentDefaultsSettings(), AppearanceSettings(), CODEX_STATUS_TONES, COMMIT_ROW, DefaultsRowSpec, EFFORT_OPTIONS, FEASIBILITY_ROW, IMPLEMENTATION_ROW (+19 more)

### Community 117 - "TicketMeta.tsx"
Cohesion: 0.16
Nodes (16): isCodexFastServiceTier(), summarizeSessionCosts(), totalTokensOf(), totalTokensOfSessions(), executionCosts(), executionTokens(), projectStatRecord(), CostSummary() (+8 more)

### Community 119 - "delegationManager.test.ts"
Cohesion: 0.67
Nodes (3): mergePaths(), PATH_PROBE_COMMAND, repairPath()

## Knowledge Gaps
- **695 isolated node(s):** `THEME_OPTIONS`, `LANGUAGE_OPTIONS`, `MODEL_OPTIONS`, `EFFORT_OPTIONS`, `SETTINGS_GROUPS` (+690 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Ticket` connect `TicketCard.tsx` to `Contract Building & Slots`, `Shared Zod Schemas`, `PR Selection & Slots Bar`, `Core Domain Concepts`, `Database Store Operations`, `Coordinator & Protocol`, `Live Terminal Views`, `Store Types & Agent Knobs`, `DB Row Schemas & Mappers`, `Dev Dependencies`, `Agents View & Ticket Cards`, `NPM Scripts`, `Runtime Dependencies`, `API Client Inputs`, `Ticket Config & Constants`, `Demo Pipeline Concepts`, `Session Hub Transcript`, `Slot State`, `Community 51`, `triageManager.ts`, `splitManager.ts`, `split.ts`, `reviewFindings.ts`, `CodexRuntimeStatus`, `button.tsx`, `TicketOperations`, `usePrdSearch.ts`, `nvmNode.ts`, `.addComment`, `.start`, `TerminalSession`, `prd.ts`, `TicketMeta.tsx`, `reformulate.ts`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **Why does `Store` connect `.start` to `Feasibility Batch Management`, `Shared Zod Schemas`, `Coordinator & Protocol`, `Store Types & Agent Knobs`, `Dev Dependencies`, `NPM Scripts`, `Runtime Dependencies`, `Agent Profile Config`, `API Client Inputs`, `Session Hub Transcript`, `Community 48`, `Slot State`, `TicketCard.tsx`, `TerminalView.tsx`, `reviewFindings.ts`, `TicketOperations`, `nvmNode.ts`, `.addComment`, `RunningServer`, `.startVerification`, `TerminalSession`, `.runWorktreeSetupScript`, `usePrdSearch.ts`, `isProcessing`, `prd.ts`, `ApiDenyPatterns`, `TicketMeta.tsx`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **Why does `getErrorMessage()` connect `usePrdSearch.ts` to `Desktop Bootstrap & Menus`, `Shared Zod Schemas`, `Coordinator & Protocol`, `API Routes & Reformulate`, `Stats Aggregation`, `TypeScript Config`, `Cost & Pricing`, `Stats Charts`, `Session Hub Transcript`, `Community 48`, `Slot State`, `App.tsx`, `File Uploads`, `TicketCard.tsx`, `TerminalView.tsx`, `reviewFindings.ts`, `TicketOperations`, `codexBinary.ts`, `nvmNode.ts`, `.addComment`, `RunningServer`, `TerminalSession`, `projectDisplay.ts`, `prd.ts`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `createApiRoutes()` (e.g. with `isWebOnlyPath()` and `.onEvent()`) actually correct?**
  _`createApiRoutes()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `THEME_OPTIONS`, `LANGUAGE_OPTIONS`, `MODEL_OPTIONS` to the rest of the system?**
  _706 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Contract Building & Slots` be split into smaller, more focused modules?**
  _Cohesion score 0.03560250391236307 - nodes in this community are weakly interconnected._
- **Should `Terminals UI & Notifications` be split into smaller, more focused modules?**
  _Cohesion score 0.07965860597439545 - nodes in this community are weakly interconnected._