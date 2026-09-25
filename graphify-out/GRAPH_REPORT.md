# Graph Report - kanban-agents  (2026-09-25)

## Corpus Check
- 276 files · ~751,496 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3138 nodes · 8743 edges · 126 communities (115 shown, 11 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 61 edges (avg confidence: 0.66)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7b386fd1`
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
- createMcpServer
- projectDisplay.ts
- useSavedFlash.ts

## God Nodes (most connected - your core abstractions)
1. `Store` - 126 edges
2. `Ticket` - 114 edges
3. `SystemAdapter` - 78 edges
4. `FakeSystemAdapter` - 70 edges
5. `RealSystemAdapter` - 68 edges
6. `cn()` - 65 edges
7. `VcsProvider` - 58 edges
8. `SlotManager` - 55 edges
9. `DelegationManager` - 50 edges
10. `ProjectInfo` - 47 edges

## Surprising Connections (you probably didn't know these)
- `McpSettingsClient` --references--> `McpSettingsMetadata`  [EXTRACTED]
  src/web/src/lib/mcpSettings.ts → desktop/mcpRpc.ts
- `ExecutionOverrides` --references--> `Orchestrator`  [EXTRACTED]
  src/server/agents/executionConfig.ts → src/shared/constants.ts
- `FeasibilitySessionInput` --references--> `Orchestrator`  [EXTRACTED]
  src/server/agents/sessionConfig.ts → src/shared/constants.ts
- `SplitSessionInput` --references--> `Orchestrator`  [EXTRACTED]
  src/server/agents/sessionConfig.ts → src/shared/constants.ts
- `TriageSessionInput` --references--> `Orchestrator`  [EXTRACTED]
  src/server/agents/sessionConfig.ts → src/shared/constants.ts

## Import Cycles
- 3-file cycle: `src/server/config.ts -> src/server/db/store.ts -> src/server/db/rows.ts -> src/server/config.ts`
- 3-file cycle: `src/server/agents/worktreeAddresses.ts -> src/server/config.ts -> src/server/db/store.ts -> src/server/agents/worktreeAddresses.ts`

## Communities (126 total, 11 thin omitted)

### Community 0 - "Contract Building & Slots"
Cohesion: 0.03
Nodes (78): AUTOMATION_RUN_STATUSES, COMMENT_AUTHORS, PR_REVIEW_STATUSES, REPO_INSPECTION_SOURCES, STAGES, ActionExecutionOptions, actionExecutionOptionsSchema, agentMessageSchema (+70 more)

### Community 1 - "Terminals UI & Notifications"
Cohesion: 0.08
Nodes (28): analyzeTicketsInputSchema, analyzeTicketsOutputSchema, columnSchema, compactTicketSchema, createTodoTicketOutputSchema, editableTicketSchema, effectivePort(), isAllowedHost() (+20 more)

### Community 2 - "Desktop Bootstrap & Menus"
Cohesion: 0.10
Nodes (23): CodexAppServerConnection, connectCodexAppServer(), CodexBinaryVersionError, require, resolveCodexBinary(), resolveCodexBinaryOverride(), TARGETS, verifyCodexBinaryVersion() (+15 more)

### Community 3 - "Feasibility Batch Management"
Cohesion: 0.06
Nodes (38): log, logRejection(), ToolHandler, ToolResult, TRIAGE_VERDICTS, getErrorStack(), AgentSettableStage, agentSettableStageSchema (+30 more)

### Community 4 - "Ticket Action Panels"
Cohesion: 0.08
Nodes (28): cleanTicket(), conflictTicket(), REVIEW_OPTS, reviewTicket(), TICKET_OPTS, AckSystem, ActiveDelegation, ClosableExecution (+20 more)

### Community 5 - "Fake System Adapter"
Cohesion: 0.09
Nodes (30): RepoInspectionSource, ManagedProject, RepoInspection, vcsProviderSchema, ConnectionHint, CreateStep, isPositiveIntegerString(), isValidDraft() (+22 more)

### Community 6 - "Shared Zod Schemas"
Cohesion: 0.10
Nodes (23): AttachExecutionSessionInput, EnqueueAgentMessageInput, FinalizeExecutionInput, MarkAgentMessageAcceptedInput, MarkAgentMessageReceivedInput, MarkAgentMessageRejectedInput, persistedReviewFindingsSchema, persistedReviewStatusSchema (+15 more)

### Community 7 - "Settings & Profiles UI"
Cohesion: 0.08
Nodes (4): delay(), fakeShellPrompt(), FakeSystemAdapter, hexToBytes()

### Community 8 - "PR Selection & Slots Bar"
Cohesion: 0.21
Nodes (14): AgentCard(), STATE_STRIPE_COLORS, TicketCard(), TicketCardProps, TriageDot(), truncateParentTitle(), ANIMATED_STAGES, formatRelativeDuration() (+6 more)

### Community 9 - "Real System Adapter"
Cohesion: 0.06
Nodes (59): pairedRuntimeCodexEffort(), AGENT_EFFORT_FULL_LABELS, AGENT_EFFORT_LABELS, AGENT_MODEL_FULL_LABELS, AGENT_MODEL_LABELS, CODEX_EFFORT_FULL_LABELS, CODEX_EFFORT_LABELS, CODEX_MODEL_EFFORTS (+51 more)

### Community 10 - "Slot Config & Worktree Watch"
Cohesion: 0.18
Nodes (17): COLUMN_SORT_FIELD, BoardColumn(), compareFamilyMembers(), familyKeyOf(), groupTicketIds(), groupTicketsByFamily(), isSplitMother(), readCollapsed() (+9 more)

### Community 11 - "Core Domain Concepts"
Cohesion: 0.04
Nodes (55): agentMessageRowSchema, AutomationRow, automationRowSchema, AutomationRunRow, automationRunRowSchema, buildScripts(), CommentRow, commentRowSchema (+47 more)

### Community 13 - "Database Store Operations"
Cohesion: 0.08
Nodes (45): RFC-4180, isNotionUrl(), NOTION_HOSTS, ProjectInfo, AgentProfileConfig(), AgentsViewProps, AskPanel(), AskPanelProps (+37 more)

### Community 14 - "Coordinator & Protocol"
Cohesion: 0.09
Nodes (30): escapeHtml(), renderCollapsedDetails(), renderOutsideDiffComment(), renderOutsideDiffSection(), ReviewPublicationComment, azureChangeEntrySchema, azureCommentSchema, azureIdentitySchema (+22 more)

### Community 15 - "API Routes & Reformulate"
Cohesion: 0.11
Nodes (25): main(), scalar(), assertCodexDowngradeSafe(), backfillOrchestrator(), countRows(), createDatabase(), EXECUTION_MIGRATIONS, hasColumn() (+17 more)

### Community 17 - "Triage & Server Hub"
Cohesion: 0.08
Nodes (25): devDependencies, autoprefixer, class-variance-authority, clsx, concurrently, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities (+17 more)

### Community 18 - "Live Terminal Views"
Cohesion: 0.08
Nodes (32): isReviewFixSession(), AZURE_BASH_ALLOWLIST, AZURE_CLEAN_BASH_ALLOWLIST, BASH_ALLOWLIST, bashAllowlist(), buildImplementSessionConfig(), CODEX_READONLY_TOOLS, codexKnobs() (+24 more)

### Community 19 - "Stage Progress & Display"
Cohesion: 0.08
Nodes (24): compilerOptions, allowImportingTsExtensions, baseUrl, esModuleInterop, isolatedModules, jsx, lib, module (+16 more)

### Community 20 - "Real Adapter GH/Composer"
Cohesion: 0.09
Nodes (31): FAILURE_COLUMNS, Kind, KINDS, SUCCESS_COLUMNS, DurationChart(), SuccessRateChart(), ThroughputChart(), effectiveWorkDurationMs() (+23 more)

### Community 21 - "Store Types & Agent Knobs"
Cohesion: 0.18
Nodes (25): buildFeasibilityBatchContract(), buildFeasibilityContextSection(), buildImplementingSteps(), buildMockupReviewStep(), buildPlanningStep(), buildPrdBullet(), buildReviewContract(), buildReviewFixLines() (+17 more)

### Community 22 - "DB Row Schemas & Mappers"
Cohesion: 0.19
Nodes (17): groupReviewCount(), initialExpandedGroups(), projectInitial(), ProjectSelect(), ProjectSelectOption, ProjectSelectProps, FilteredProjectGroup, filterProjectGroups() (+9 more)

### Community 23 - "Dev Dependencies"
Cohesion: 0.10
Nodes (18): TicketCreationRequestConflictError, AnalyzeTicketRejectionReason, AnalyzeTicketsResult, CreateTodoTicketInput, createTodoTicketInputSchema, CreateTodoTicketResult, log, normalizeCreateInput() (+10 more)

### Community 24 - "TypeScript Config"
Cohesion: 0.12
Nodes (22): bashCommandSchema, buildSettings(), claudeProvider, createSdkAgentSession(), denyBashHook(), denyNoVerifyHook, denyReviewPublishingHook, denyTypecheckHook() (+14 more)

### Community 26 - "Cost & Pricing"
Cohesion: 0.20
Nodes (9): AtelierDesktopRpcSchema, DesktopRequests, McpSettingsMetadata, WebviewRequests, McpSettingsController, McpSettings(), createMcpSettingsClient(), getMcpSettingsClient() (+1 more)

### Community 27 - "Workflow View & Lifecycle"
Cohesion: 0.06
Nodes (28): Architecture, Commands, Conventions (enforced — beyond the global ones in ~/.claude/CLAUDE.md), graphify, The dry-run safety model — read before running anything, What this is, Agent runtime (Agent SDK), Architecture (+20 more)

### Community 28 - "Stats Charts"
Cohesion: 0.07
Nodes (42): AgentMcpServerDefinition, agentMessageDeltaSchema, agentToml(), apiWriteDenyScript(), buildMcpServers(), ConfigObject, configReadResponseSchema, ConfigValue (+34 more)

### Community 29 - "Session Hub & Agent Session"
Cohesion: 0.09
Nodes (27): AGENT_EFFORTS, AGENT_MODELS, AUTOMATION_TRIGGER_LABELS, AUTOMATION_TRIGGERS, AutomationRunStatus, AutomationCard(), AutomationCardProps, AutomationForm() (+19 more)

### Community 30 - "Agents View & Ticket Cards"
Cohesion: 0.12
Nodes (13): directories, initializeParamsSchema, log, requestSchema, rpcError(), rpcResult(), rpcResponseSchema, toolCallParamsSchema (+5 more)

### Community 31 - "PRD Review & Markdown"
Cohesion: 0.17
Nodes (10): canonicalJson(), CodexCommandHook, codexSessionPreToolUseHookHash(), JsonValue, createCodexProvider(), AppServerFixtureOptions, hookPathForSession(), options() (+2 more)

### Community 32 - "User Terminal & Fake IO"
Cohesion: 0.15
Nodes (24): renderPersistedReviewResult(), ExecutionFinishStatus, LiveSession, log, PendingSessionMessage, previewToolInput(), renderChannelEvent(), renderImplementationDone() (+16 more)

### Community 33 - "Logging"
Cohesion: 0.10
Nodes (21): scripts, build:desktop, build:web, dev, dev:desktop, dev:proxy, dev:server, dev:web (+13 more)

### Community 34 - "Board Columns"
Cohesion: 0.39
Nodes (7): emit(), loadedSubscribers, loadOnce(), refreshProjects(), subscribers, useProjects(), useProjectsLoaded()

### Community 35 - "NPM Scripts"
Cohesion: 0.16
Nodes (8): addUsageByModel(), toUsageByModel(), mapTicketRow(), TicketLifecycle, ErrorDetailsSource, Ticket, DescriptionTabProps, PrdTabProps

### Community 36 - "Runtime Dependencies"
Cohesion: 0.25
Nodes (3): NewProject, ProjectPatch, VcsProvider

### Community 37 - "Claude SDK Provider"
Cohesion: 0.09
Nodes (22): dependencies, @anthropic-ai/claude-agent-sdk, dompurify, elysia, @fontsource/ibm-plex-mono, @fontsource/ibm-plex-sans, marked, @modelcontextprotocol/sdk (+14 more)

### Community 38 - "Agent Profile Config"
Cohesion: 0.12
Nodes (24): isCodexFastServiceTier(), costByFamily(), costOf(), costOfModel(), costOfSessions(), CostSummary, FamilyPricing, MODEL_PRICING (+16 more)

### Community 39 - "Agent Coordinator Handlers"
Cohesion: 0.11
Nodes (27): artifactPath, assertPackageVersionInSync(), assertSdkVersionsInSync(), BUILT_DMG, ELECTROBUN_BIN, fail(), installedPackageVersion(), RELEASE_FOLDER (+19 more)

### Community 40 - "API Client Inputs"
Cohesion: 0.06
Nodes (21): childTranscriptPrefix(), DelegationManager, orderedReviewKinds(), renderCollapsedFinding(), reviewerRules(), reviewKey(), reviewPrompt(), sleep() (+13 more)

### Community 41 - "Ticket Config & Constants"
Cohesion: 0.24
Nodes (10): TERMINAL_STAGES, applyTranscriptUpdate(), TranscriptState, transcriptText(), transcriptUpdateSchema, TerminalData, TerminalView(), TerminalViewProps (+2 more)

### Community 42 - "Ticket Detail & Triage UI"
Cohesion: 0.09
Nodes (33): StatRecord, StatCard(), StatCardProps, StatEmpty(), ACTIVE_BAR, AREA_CURSOR, AXIS_PROPS, BAR_CURSOR (+25 more)

### Community 43 - "Demo Pipeline Concepts"
Cohesion: 0.08
Nodes (14): FakePaneStream, PaneStream, dataMessage(), log, normalizeSeed(), safeParse(), send(), TerminalSession (+6 more)

### Community 44 - "Chart Primitives"
Cohesion: 0.31
Nodes (13): abortReason(), computeCodeFingerprint(), FingerprintEntry, FingerprintPhase, hashFingerprintPaths(), isMissingFileError(), listFingerprintPaths(), log (+5 more)

### Community 45 - "Session Hub Transcript"
Cohesion: 0.10
Nodes (14): resolveBaseBranch(), featureBranch(), SlotManager, slotPath(), slugify(), mapSlotRow(), mapWorktreeSessionRow(), enrichWorktreeSession() (+6 more)

### Community 46 - "Community 46"
Cohesion: 0.27
Nodes (15): Agent Implementation Config, Argus Code Review, Automated Tests (typecheck/lint/test), Claude Code Autonomous Agent, Ticket Contract Injection, Feasibility Analysis, Kanban Board (Atelier), Kanban Agents Demo (demo.gif) (+7 more)

### Community 47 - "Modal Dialogs"
Cohesion: 0.22
Nodes (6): AZURE_COMMANDS, COMMANDS_BY_PROVIDER, GITHUB_COMMANDS, PrDiffContext, VcsCleanCommands, AZ_SETTLED_THREAD_STATUSES

### Community 48 - "Community 48"
Cohesion: 0.12
Nodes (23): CompactTicket, ListTicketsInput, Column, COLUMN_LABELS, COLUMNS, ACTIVE_COLUMNS, Board(), BoardProps (+15 more)

### Community 49 - "Slot State"
Cohesion: 0.09
Nodes (21): WsClientEvent, wsClientEventSchema, ATTENTION_STATUSES, sessionOf(), SlotPips(), SlotPipsProps, STATUS_LABELS, STATUS_PIP_CLASSES (+13 more)

### Community 50 - "Stats Hooks & Cards"
Cohesion: 0.16
Nodes (12): ChartConfig, ChartContainer, ChartContainerProps, ChartContext, ChartContextValue, ChartLegendContent(), ChartLegendContentProps, ChartTooltipContent() (+4 more)

### Community 51 - "Community 51"
Cohesion: 0.07
Nodes (41): CLAUDE_JSON_PATH, CLAUDE_SKILLS_DIR, commandOutputOrNull(), COMPOSER_BINARIES, GitRemoteFacts, INSTALL_COMMANDS, log, NO_GIT_REMOTE_FACTS (+33 more)

### Community 52 - "repairPath.ts"
Cohesion: 0.16
Nodes (12): terminalServerMessageSchema, FullscreenToggle(), FullscreenToggleProps, badgeLabelFor(), LiveTerminal(), LiveTerminalOptions, LiveTerminalProps, TERMINAL_THEME (+4 more)

### Community 53 - "User Terminal Manager"
Cohesion: 0.33
Nodes (5): CONTEXT — domain glossary, Execution, Proposed (not yet built), Seams, Work items

### Community 54 - "Community 54"
Cohesion: 0.08
Nodes (30): BoundedCommandResult, ReviewPublicationEvent, connectionFailure(), connectionResult(), ghPrHeadSchema, ghPrSchema, ghPrStateSchema, ghRestPullSchema (+22 more)

### Community 55 - "App.tsx"
Cohesion: 0.21
Nodes (3): FeasibilityBatchManager, toTriageResult(), FeasibilityResult

### Community 56 - "CSV Parsing"
Cohesion: 0.16
Nodes (18): isProcessing(), ACTIVE_STAGES, PR_STATE_LABELS, ColumnActionsMenu(), ColumnActionsMenuProps, ColumnMenuItem, ActionContext, buildActions() (+10 more)

### Community 57 - "Community 57"
Cohesion: 0.21
Nodes (6): boundedCommandDetail(), runBoundedCommand(), safeJsonParse(), withJsonRequestFile(), GithubVcsClient, pullApiEndpoint()

### Community 58 - "File Uploads"
Cohesion: 0.35
Nodes (9): gitMetadataWritableRoots(), agentBaseEnv(), bestInstalledMatch(), compareParts(), envWithProjectNode(), nvmNodeBinDir(), readNvmrc(), prepareProjectShell() (+1 more)

### Community 59 - "triageManager.ts"
Cohesion: 0.39
Nodes (11): buildContractConstraintsLines(), buildResponseFormatLines(), buildStrictRulesLines(), buildTicketLines(), buildTriageChannelPrompt(), buildTriagePlusChannelPrompt(), isEnglish(), readOnlyFramingLines() (+3 more)

### Community 60 - "Package Manifest"
Cohesion: 0.18
Nodes (6): detectInstallCommand(), realpathSafe(), resolveWorktreeScriptCommand(), setupOutputExcerpt(), shQuote(), WorktreeSetupOptions

### Community 61 - "splitManager.ts"
Cohesion: 0.10
Nodes (12): buildAskContract(), buildCleanContract(), buildConflictResolutionContract(), resolveTemplatePaths(), SplitManager, TriageManager, computeWorktreeAddresses(), getProject() (+4 more)

### Community 62 - "TicketCard.tsx"
Cohesion: 0.06
Nodes (54): PrdAnnotator(), PrdAnnotatorProps, BREADCRUMB, NO_ANNOTATIONS, PrdReviewDialog(), PrdReviewDialogProps, ActivityTab(), isUnanswered() (+46 more)

### Community 63 - "Community 63"
Cohesion: 0.40
Nodes (8): useTheme(), UseThemeResult, applyTheme(), getStoredTheme(), isTheme(), Theme, ThemeOption, THEMES

### Community 64 - "Composer Run Script"
Cohesion: 0.26
Nodes (11): dragKeys(), groupCountLabel(), groupSortId(), ListGroup, ProjectList(), ProjectListProps, ProjectListRowProps, projectSortId() (+3 more)

### Community 65 - "split.ts"
Cohesion: 0.26
Nodes (9): isShortcutDetail(), ShortcutDetail, NOTE: Radix's dismissable layer registers its Escape listener on `document` in t, useCaptureEscape(), collectMatchRanges(), supportsHighlightApi(), usePrdSearch(), UsePrdSearchOptions (+1 more)

### Community 66 - "prUrl.ts"
Cohesion: 0.20
Nodes (8): Block, blockText(), compactChunks(), firstCharCode(), TranscriptBuffer, trimBlockStart(), AgentStreamBlock, TranscriptUpdate

### Community 67 - "TerminalView.tsx"
Cohesion: 0.09
Nodes (23): setup(), Watchdog, PROJECT_ROOT, NOTE: PRD generation holds the request open up to ~120s (REFORMULATE_TIMEOUT_MS), resolveDataFile(), resolveServerPort(), serveStaticAsset(), SocketData (+15 more)

### Community 68 - "schema.test.ts"
Cohesion: 0.05
Nodes (59): COLUMN_ORDER, ProjectPrPicker(), ProjectPrPickerProps, PrSelectRow(), NAV_ENTRIES, NavEntry, Sidebar(), SidebarProps (+51 more)

### Community 69 - "reviewFindings.ts"
Cohesion: 0.06
Nodes (56): BOARD_FINDING_RENDER_STYLE, log, renderFinding(), REVIEW_DISALLOWED_TOOLS, REVIEW_REPORT_LABELS, REVIEW_REPORT_LABELS_EN, REVIEW_REPORT_LABELS_FR, REVIEW_TOOLS (+48 more)

### Community 70 - "CodexRuntimeStatus"
Cohesion: 0.10
Nodes (28): ActiveReview, ActiveReviewPass, assertExecutionAvailable(), CODEX_LAUNCH_STATUS_MESSAGES, CodexCapabilityReader, ExecutionDefaults, ExecutionOverrides, FEASIBILITY_ENGINE_EXECUTION (+20 more)

### Community 71 - "PostCSS Config"
Cohesion: 0.29
Nodes (6): name, overrides, zod, private, type, version

### Community 72 - "useAppSettings.ts"
Cohesion: 0.22
Nodes (4): McpTokenSource, createMcpSettingsController(), McpSettingsControllerDependencies, temporaryDirectories

### Community 73 - "TerminalView.tsx"
Cohesion: 0.22
Nodes (14): Capabilities, clearRetry(), loadCapabilities(), LoadOptions, publish(), refreshCapabilities(), RETRY_DELAYS_MS, RETRYABLE_CODEX_STATUSES (+6 more)

### Community 74 - "button.tsx"
Cohesion: 0.15
Nodes (16): SKILL_REQUIREMENTS, SKILL_TIERS, SkillRequirement, SkillTier, skillzerInstallCommand(), COPY_LABELS, CopyOutcome, expectedSkillPath() (+8 more)

### Community 75 - ".handleRequest"
Cohesion: 0.11
Nodes (13): analyzeResultSchema, compactTicketSchema, createResultSchema, errorResultSchema, ISOLATED_ENV_KEYS, projectResultSchema, savedEnv, startResultSchema (+5 more)

### Community 76 - "usePrdSearch.ts"
Cohesion: 0.31
Nodes (5): AgentProvider, AgentSessionEvent, AgentSessionToolResult, HttpMcpServerDefinition, runOneShotSession()

### Community 78 - "csv.ts"
Cohesion: 0.08
Nodes (9): DoneGateResult, ReviewHeadResult, FAKE_OPEN_PRS, FakeVcsClient, githubPrHeadRef(), VcsClient, isPrNeedsAttention(), OpenPr (+1 more)

### Community 79 - "WorktreeSession"
Cohesion: 0.33
Nodes (3): listeners, mcp, ReplyArgsSchema

### Community 80 - "recordedAction.ts"
Cohesion: 0.23
Nodes (17): alternation(), COMMAND_WRAPPERS, commandSegments(), commandWords(), executableName(), launchedPackageScript(), launchesTypecheck(), OPTIONS_WITH_VALUE (+9 more)

### Community 81 - "index.ts"
Cohesion: 0.17
Nodes (17): ensureConfig(), boot(), externalUrlFromNewWindowEvent(), forwardAtelierShortcut(), installApplicationMenu(), installMenuShortcutBridge(), menuShortcutActionSchema, navigationEventSchema (+9 more)

### Community 82 - "TicketOperations"
Cohesion: 0.11
Nodes (12): CodexAppServerInitializationError, CodexAppServerProtocolError, CodexAppServerRpcError, incomingSchema, initializeResponseSchema, log, PendingRequest, rpcErrorSchema (+4 more)

### Community 86 - "useTickTimer.ts"
Cohesion: 0.27
Nodes (9): AgentCardProps, AgentsView(), hasLiveAgent(), normalize(), KIND_BADGES, TicketBadges(), TicketBadgesProps, resolveProjectColor() (+1 more)

### Community 87 - "mcpSettings.ts"
Cohesion: 0.20
Nodes (31): ProjectKey, AutomationPatch, NewAsk, NewAutomation, NewClean, NewProfile, NewReview, NewTicket (+23 more)

### Community 89 - "usePrdSearch.ts"
Cohesion: 0.29
Nodes (4): ReviewPublicationState, extractPrUrl(), CreatePrResult, ReviewPublicationCheck

### Community 90 - "PaneStream"
Cohesion: 0.31
Nodes (3): RecordingSystemAdapter, PublishReviewOptions, PublishReviewResult

### Community 91 - "bootstrap.ts"
Cohesion: 0.17
Nodes (9): ActionSystem, CapabilityCache, CodexRuntimeModel, codexRuntimeModelSchema, CodexRuntimeStatus, codexRuntimeStatusSchema, UNKNOWN_CODEX_RUNTIME_STATUS, STATUS_LABELS (+1 more)

### Community 92 - "TerminalSessionManager"
Cohesion: 0.24
Nodes (9): columnSchema, MetaRow(), MetaRowProps, STATUS_CONFIRMS, StatusConfirm, statusTitle(), TicketMeta(), TicketCostProps (+1 more)

### Community 93 - "ColumnActionsMenu.tsx"
Cohesion: 0.25
Nodes (7): Azure DevOps support — state file, Decisions (validated by the owner, 2026-09-21), Goal, Known blockers for lots 3 and 4, Open questions, Progress, Verified on this machine (az 2.90.0, azure-devops 1.0.8)

### Community 94 - ".addComment"
Cohesion: 0.11
Nodes (13): setup(), log, ReformulateManager, SessionHub, DRY_RUN_VERDICT, log, TriageSession, log (+5 more)

### Community 95 - "TicketConfigSummary.tsx"
Cohesion: 0.50
Nodes (3): appBundle, EMBEDDED_BINARIES, resourcesApp

### Community 97 - "RunningServer"
Cohesion: 0.08
Nodes (27): log, log, SlotWatch, log, runFirstBootSetup(), applyAppSettingsToModels(), DEFAULT_MODELS, listProjectKeys() (+19 more)

### Community 98 - "usePrdSearch.ts"
Cohesion: 0.15
Nodes (8): AzureDevopsVcsClient, prWebUrl(), readOriginRemote(), repoRefFromPrUrl(), repoRefFromRemote(), reviewStatusFromVotes(), stripHeadsPrefix(), AzureRepoRef

### Community 99 - "reviewPublishingGuard.ts"
Cohesion: 0.07
Nodes (35): API_GUARDS, API_READ_METHOD_SET, ApiDenyPatterns, ApiGuard, AZ_INVOKE_COMMAND, AZ_INVOKE_METHOD_LONG_FLAGS, AZ_INVOKE_WRITE_INPUT_LONG_FLAGS, AZ_PR_WRITE_PATTERN (+27 more)

### Community 100 - ".startVerification"
Cohesion: 0.36
Nodes (5): applyDesktopEnv(), DesktopRoots, ensureMcpToken(), regenerateMcpToken(), temporaryDirectories

### Community 101 - "codexProvider.test.ts"
Cohesion: 0.19
Nodes (9): SkillStatus, missingSignature(), PreflightCopy, readDismissedSignature(), SkillsPreflightDialog(), SkillsPreflightDialogProps, writeDismissedSignature(), SkillsStatusList() (+1 more)

### Community 102 - ".start"
Cohesion: 0.05
Nodes (19): AutomationManager, startFeasibilityTicket(), ProjectConfig, mapAgentMessageRow(), mapAutomationRow(), mapAutomationRunRow(), mapExecutionRunRow(), mapProfileRow() (+11 more)

### Community 104 - "settings.tsx"
Cohesion: 0.14
Nodes (5): CodexAppServerNotification, CodexAppServerOptions, CodexProviderDependencies, AppServerFixture, CodexRuntimeDependencies

### Community 105 - "createMcpServer"
Cohesion: 0.32
Nodes (3): confirmPrMerged(), unmergedReason(), PrState

### Community 106 - "usePrdSearch.ts"
Cohesion: 0.11
Nodes (18): ANSI, appendToLogFile(), COLOR_ENABLED, disableFileLogging(), initLogFile(), isLevel(), Level, LEVEL_ORDER (+10 more)

### Community 107 - "azureRemote.ts"
Cohesion: 0.40
Nodes (10): azureOrgUrl(), fromAzureSegments(), fromCollectionSegments(), fromLegacySegments(), fromSshSegments(), parseAzureRepoRef(), parseRemoteLocation(), RemoteLocation (+2 more)

### Community 108 - "WorkflowView.tsx"
Cohesion: 0.22
Nodes (10): FailedReformulation, dryRunLog, fakeEncoder, NOTE: same dry-run stance as checkClaudeAvailable: every skill reported installe, GitWorktreeAddOptions, ImportNotionOptions, PrepareReviewWorktreeOptions, ReformulateOptions (+2 more)

### Community 109 - "projectDisplay.ts"
Cohesion: 0.46
Nodes (5): buildSplitChannelPrompt(), buildTicketLines(), isEnglish(), extractFigmaUrls(), hasMockups()

### Community 110 - "Profile"
Cohesion: 0.09
Nodes (41): ProfileConfig, DragHandleAttributes, DragHandleListeners, ProfilePipeline(), ProfileRow(), ProfileRowHeader(), ProfileRowHeaderProps, ProfileRowProps (+33 more)

### Community 111 - "FakePaneStream"
Cohesion: 0.39
Nodes (7): currentNow, getSnapshot(), startTicking(), stopTicking(), subscribe(), subscribers, useTickTimer()

### Community 112 - "useSavedFlash.ts"
Cohesion: 0.33
Nodes (4): App(), HOME_VIEW_OPTIONS, HomeView, root

### Community 113 - "repairPath.ts"
Cohesion: 0.33
Nodes (9): ReviewPrPanel(), getSnapshot(), INITIAL_SNAPSHOT, loadReviewCounts(), publish(), refreshReviewCounts(), subscribe(), subscribers (+1 more)

### Community 114 - "ApiDenyPatterns"
Cohesion: 0.06
Nodes (43): agentPairError(), cleanDescription(), createApiRoutes(), createSplitChildren(), failSplitMother(), isBlocked(), isSplitMother(), isWebOnlyPath() (+35 more)

### Community 115 - "relaunch.ts"
Cohesion: 0.47
Nodes (5): COLUMN_NODE_COLOR, depthOf(), truncate(), WorkflowView(), WorkflowViewProps

### Community 116 - "settings.tsx"
Cohesion: 0.07
Nodes (25): CODEX_STATUS_TONES, COMMIT_ROW, DefaultsRowSpec, EFFORT_OPTIONS, FEASIBILITY_ROW, IMPLEMENTATION_ROW, KnobGroupProps, LANGUAGE_OPTIONS (+17 more)

### Community 117 - "useAppSettings.ts"
Cohesion: 0.18
Nodes (16): AppSettings, AppSettingsState, flashSaved(), loadOnce(), patchAppSettings(), publish(), snapshot(), state (+8 more)

### Community 122 - "createMcpServer"
Cohesion: 0.15
Nodes (11): createMcpServer(), invalidInput(), listPublicProjects(), OutputValidator, toolError(), toolResult(), FeasibilityStarter, isActive() (+3 more)

### Community 123 - "projectDisplay.ts"
Cohesion: 0.38
Nodes (4): formatCommitTimeout(), TimeoutUnit, timeoutUnitMs(), timeoutUnitOf()

## Knowledge Gaps
- **721 isolated node(s):** `log`, `dryRunLog`, `fakeEncoder`, `log`, `CLAUDE_JSON_PATH` (+716 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Ticket` connect `NPM Scripts` to `Contract Building & Slots`, `Ticket Action Panels`, `Shared Zod Schemas`, `PR Selection & Slots Bar`, `Real System Adapter`, `Slot Config & Worktree Watch`, `Core Domain Concepts`, `Database Store Operations`, `Live Terminal Views`, `Store Types & Agent Knobs`, `Dev Dependencies`, `Client Hub & Watchdog`, `Agent Profile Config`, `API Client Inputs`, `Ticket Config & Constants`, `Session Hub Transcript`, `Community 48`, `Slot State`, `CSV Parsing`, `triageManager.ts`, `splitManager.ts`, `TicketCard.tsx`, `schema.test.ts`, `reviewFindings.ts`, `CodexRuntimeStatus`, `useTickTimer.ts`, `mcpSettings.ts`, `TerminalSessionManager`, `.addComment`, `.start`, `TerminalSession`, `projectDisplay.ts`, `useSavedFlash.ts`, `ApiDenyPatterns`, `relaunch.ts`, `ProjectPanel.tsx`?**
  _High betweenness centrality (0.066) - this node is a cross-community bridge._
- **Why does `Store` connect `.start` to `Feasibility Batch Management`, `Ticket Action Panels`, `Shared Zod Schemas`, `Core Domain Concepts`, `API Routes & Reformulate`, `Store Types & Agent Knobs`, `Dev Dependencies`, `Client Hub & Watchdog`, `NPM Scripts`, `API Client Inputs`, `Demo Pipeline Concepts`, `Session Hub Transcript`, `splitManager.ts`, `TerminalView.tsx`, `reviewFindings.ts`, `CodexRuntimeStatus`, `.addComment`, `RunningServer`, `TerminalSession`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Why does `SystemAdapter` connect `TerminalSession` to `User Terminal & Fake IO`, `RunningServer`, `reviewFindings.ts`, `CodexRuntimeStatus`, `.start`, `Settings & Profiles UI`, `codexProvider.test.ts`, `API Client Inputs`, `Demo Pipeline Concepts`, `WorkflowView.tsx`, `Board & Sidebar Layout`, `Session Hub Transcript`, `csv.ts`, `Community 51`, `Fake System Adapter`, `splitManager.ts`, `.addComment`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **What connects `log`, `dryRunLog`, `fakeEncoder` to the rest of the system?**
  _733 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Contract Building & Slots` be split into smaller, more focused modules?**
  _Cohesion score 0.031616982836495035 - nodes in this community are weakly interconnected._
- **Should `Terminals UI & Notifications` be split into smaller, more focused modules?**
  _Cohesion score 0.08266129032258064 - nodes in this community are weakly interconnected._
- **Should `Desktop Bootstrap & Menus` be split into smaller, more focused modules?**
  _Cohesion score 0.0962566844919786 - nodes in this community are weakly interconnected._