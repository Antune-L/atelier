# Graph Report - kanban-agents  (2026-09-09)

## Corpus Check
- 252 files · ~721,127 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2663 nodes · 7336 edges · 113 communities (87 shown, 26 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 58 edges (avg confidence: 0.68)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f7a5ae18`
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
- chart.tsx
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
- UserTerminalManager
- schema.test.ts
- contract.test.ts
- CodexRuntimeStatus
- PostCSS Config
- App.tsx
- TerminalView.tsx
- button.tsx
- FakePaneStream
- usePrdSearch.ts
- Community 77
- csv.ts
- WorktreeSession
- recordedAction.ts
- terminalManager.ts
- Community 82
- Community 83
- codexCapabilities.ts
- usePrdSearch.ts
- AgentsView.tsx
- ProjectConfig
- FakePaneStream
- .addComment
- TicketConfigSummary.tsx
- useTickTimer.ts
- RunningServer
- coordinator.ts
- DescriptionTab.tsx
- TerminalSession
- nvmNode.ts
- Board.tsx
- Contract (pipeline instructions)
- Coordinator
- Done Gate
- Kind (ticket pipeline type)
- Protocol (wire format source of truth)
- SessionHub
- Slot (git-worktree execution unit)
- SlotManager
- Stage (pipeline state)
- Ticket
- Ticket Lifecycle
- Triage / Feasibility

## God Nodes (most connected - your core abstractions)
1. `Store` - 120 edges
2. `Ticket` - 104 edges
3. `cn()` - 79 edges
4. `SystemAdapter` - 73 edges
5. `createApiRoutes()` - 69 edges
6. `RealSystemAdapter` - 68 edges
7. `FakeSystemAdapter` - 64 edges
8. `SlotManager` - 51 edges
9. `DelegationManager` - 49 edges
10. `ProjectInfo` - 48 edges

## Surprising Connections (you probably didn't know these)
- `verifiedFindings()` --indirect_call--> `finding()`  [INFERRED]
  src/server/agents/delegationManager.ts → src/server/agents/reviewFindings.test.ts
- `ImplementSessionInput` --references--> `Ticket`  [EXTRACTED]
  src/server/agents/sessionConfig.ts → src/shared/schemas.ts
- `main()` --calls--> `migrateCodexCatalog()`  [EXTRACTED]
  scripts/downgrade-codex-catalog.ts → src/server/db/schema.ts
- `main()` --calls--> `assertCodexDowngradeSafe()`  [EXTRACTED]
  scripts/downgrade-codex-catalog.ts → src/server/db/schema.ts
- `createCodexProvider()` --indirect_call--> `options()`  [INFERRED]
  src/server/system/codexProvider.ts → src/server/system/codexProvider.test.ts

## Import Cycles
- None detected.

## Communities (113 total, 26 thin omitted)

### Community 0 - "Contract Building & Slots"
Cohesion: 0.04
Nodes (67): buildPrdPrompt(), ActionExecutionOptions, actionExecutionOptionsSchema, agentMessageSchema, AnalyzeTicketsInput, appSettingsSchema, automationRunSchema, automationSchema (+59 more)

### Community 1 - "Terminals UI & Notifications"
Cohesion: 0.27
Nodes (6): reviewApiEndpoint(), runBoundedReviewCommand(), safeJsonParse(), PublishReviewOptions, PublishReviewResult, ReviewDoneOptions

### Community 2 - "Desktop Bootstrap & Menus"
Cohesion: 0.09
Nodes (35): RFC-4180, ProjectInfo, AskPanelProps, CleanPrPanel(), CleanPrPanelProps, ImportTicketsPanel(), ImportTicketsPanelProps, NewTicketSheetProps (+27 more)

### Community 3 - "Feasibility Batch Management"
Cohesion: 0.06
Nodes (37): log, logRejection(), ToolHandler, ToolResult, getErrorStack(), AgentSettableStage, agentSettableStageSchema, askUserArgsSchema (+29 more)

### Community 4 - "Ticket Action Panels"
Cohesion: 0.05
Nodes (53): WsClientEvent, wsClientEventSchema, QuitConfirmModal(), ATTENTION_STATUSES, sessionOf(), SlotPips(), SlotPipsProps, STATUS_LABELS (+45 more)

### Community 5 - "Fake System Adapter"
Cohesion: 0.13
Nodes (13): WorktreeAddressWatcher, projectConfigSchema, buildAppSettingsPatch(), LegacyConfig, legacyConfigSchema, LegacyModels, log, migrateConfigJsonIfPresent() (+5 more)

### Community 6 - "Shared Zod Schemas"
Cohesion: 0.20
Nodes (9): CapabilityCache, CodexRuntimeModel, codexRuntimeModelSchema, CodexRuntimeStatus, codexRuntimeStatusSchema, pairedRuntimeCodexEffort(), CODEX_MODEL_EFFORTS, pairedCodexEffort() (+1 more)

### Community 7 - "Settings & Profiles UI"
Cohesion: 0.08
Nodes (4): delay(), fakeShellPrompt(), FakeSystemAdapter, hexToBytes()

### Community 8 - "PR Selection & Slots Bar"
Cohesion: 0.15
Nodes (15): ACTIVE_BAR, AREA_CURSOR, AXIS_PROPS, BAR_CURSOR, CHART_PALETTE, colorAt(), DurationDatum, KindChart() (+7 more)

### Community 9 - "Real System Adapter"
Cohesion: 0.07
Nodes (31): ProfilesSettings(), CODEX_STATUS_TONES, COMMIT_ROW, DefaultsRowSpec, EFFORT_OPTIONS, FEASIBILITY_ROW, IMPLEMENTATION_ROW, KnobGroupProps (+23 more)

### Community 10 - "Slot Config & Worktree Watch"
Cohesion: 0.25
Nodes (13): AppSettings, AgentDefaultsSettings(), AppSettingsState, flashSaved(), loadOnce(), patchAppSettings(), publish(), snapshot() (+5 more)

### Community 11 - "Core Domain Concepts"
Cohesion: 0.04
Nodes (46): agentMessageRowSchema, AutomationRow, automationRowSchema, AutomationRunRow, automationRunRowSchema, buildScripts(), CommentRow, commentRowSchema (+38 more)

### Community 12 - "Board & Sidebar Layout"
Cohesion: 0.09
Nodes (3): RealSystemAdapter, DoneGateResult, ReviewHeadResult

### Community 14 - "Coordinator & Protocol"
Cohesion: 0.21
Nodes (6): TicketLifecycle, failSplitMother(), Ticket, StageProgressBarProps, DescriptionTabProps, PrdTabProps

### Community 15 - "API Routes & Reformulate"
Cohesion: 0.10
Nodes (27): CreateProjectInput, ManagedProject, UpdateProjectInput, isPositiveIntegerString(), isValidDraft(), ProjectListRow(), ProjectListRowProps, ProjectPanel() (+19 more)

### Community 16 - "Stats Aggregation"
Cohesion: 0.17
Nodes (8): TriageManager, RouteDeps, log, TerminalSocket, TerminalSocketData, log, UserTerminalManager, TerminalDescriptor

### Community 17 - "Triage & Server Hub"
Cohesion: 0.08
Nodes (25): devDependencies, autoprefixer, class-variance-authority, clsx, concurrently, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities (+17 more)

### Community 18 - "Live Terminal Views"
Cohesion: 0.21
Nodes (10): StatRecord, StatCard(), StatCardProps, StatEmpty(), CodexTierSummary(), CostSummary(), OutcomeChart(), useStats() (+2 more)

### Community 19 - "Stage Progress & Display"
Cohesion: 0.08
Nodes (24): compilerOptions, allowImportingTsExtensions, baseUrl, esModuleInterop, isolatedModules, jsx, lib, module (+16 more)

### Community 20 - "Real Adapter GH/Composer"
Cohesion: 0.10
Nodes (31): FAILURE_COLUMNS, Kind, KINDS, SUCCESS_COLUMNS, DurationChart(), SuccessRateChart(), ThroughputChart(), effectiveWorkDurationMs() (+23 more)

### Community 21 - "Store Types & Agent Knobs"
Cohesion: 0.19
Nodes (9): CodexBinaryVersionError, require, resolveCodexBinary(), resolveCodexBinaryOverride(), TARGETS, canonicalJson(), CodexCommandHook, codexSessionPreToolUseHookHash() (+1 more)

### Community 22 - "DB Row Schemas & Mappers"
Cohesion: 0.13
Nodes (23): isProcessing(), ACTIVE_STAGES, ColumnActionsMenu(), ColumnActionsMenuProps, ColumnMenuItem, ActionContext, buildActions(), ConfirmSpec (+15 more)

### Community 23 - "Dev Dependencies"
Cohesion: 0.07
Nodes (30): mapAgentMessageRow(), AttachExecutionSessionInput, AutomationPatch, EnqueueAgentMessageInput, FinalizeExecutionInput, MarkAgentMessageAcceptedInput, MarkAgentMessageReceivedInput, MarkAgentMessageRejectedInput (+22 more)

### Community 24 - "TypeScript Config"
Cohesion: 0.07
Nodes (49): bashCommandSchema, buildSettings(), createSdkAgentSession(), denyBashHook(), denyNoVerifyHook, denyReviewPublishingHook, denyTypecheckHook(), dispatchClaudeMessage() (+41 more)

### Community 25 - "Client Hub & Watchdog"
Cohesion: 0.08
Nodes (30): ActiveReviewPass, log, orderedReviewKinds(), renderCollapsedFinding(), renderFinding(), renderPersistedReviewResult(), REVIEW_DISALLOWED_TOOLS, REVIEW_REPORT_LABELS_EN (+22 more)

### Community 26 - "Cost & Pricing"
Cohesion: 0.07
Nodes (27): claudeProvider, BoundedCommandResult, CLAUDE_JSON_PATH, COMPOSER_BINARIES, detectInstallCommand(), extractPrUrl(), ghPrHeadSchema, ghPrSchema (+19 more)

### Community 27 - "Workflow View & Lifecycle"
Cohesion: 0.06
Nodes (26): Architecture, Commands, Conventions (enforced — beyond the global ones in ~/.claude/CLAUDE.md), graphify, The dry-run safety model — read before running anything, What this is, Agent runtime (Agent SDK), Architecture (+18 more)

### Community 28 - "Stats Charts"
Cohesion: 0.07
Nodes (40): AgentMcpServerDefinition, agentMessageDeltaSchema, agentToml(), buildMcpServers(), ConfigObject, configReadResponseSchema, ConfigValue, describeCodexError() (+32 more)

### Community 29 - "Session Hub & Agent Session"
Cohesion: 0.31
Nodes (4): mapWorktreeSessionRow(), enrichWorktreeSession(), WorktreeSession, BoardState

### Community 30 - "Agents View & Ticket Cards"
Cohesion: 0.07
Nodes (38): resolveBaseBranch(), assertExecutionAvailable(), CODEX_LAUNCH_STATUS_MESSAGES, CodexCapabilityReader, ExecutionDefaults, FEASIBILITY_ENGINE_EXECUTION, resolveExecution(), resolveFeasibilityExecution() (+30 more)

### Community 31 - "PRD Review & Markdown"
Cohesion: 0.05
Nodes (44): buildNotionImportPrompt(), agentPairError(), cleanDescription(), createApiRoutes(), createSplitChildren(), dependencyError(), isBlocked(), isSplitMother() (+36 more)

### Community 32 - "User Terminal & Fake IO"
Cohesion: 0.06
Nodes (56): buildAskContract(), buildCleanContract(), buildConflictResolutionContract(), buildFeasibilityBatchContract(), buildFeasibilityContextSection(), buildImplementingSteps(), buildMockupReviewStep(), buildPlanningStep() (+48 more)

### Community 33 - "Logging"
Cohesion: 0.10
Nodes (21): scripts, build:desktop, build:web, dev, dev:desktop, dev:proxy, dev:server, dev:web (+13 more)

### Community 34 - "Board Columns"
Cohesion: 0.28
Nodes (13): abortReason(), computeCodeFingerprint(), FingerprintEntry, FingerprintPhase, hashFingerprintPaths(), isMissingFileError(), listFingerprintPaths(), log (+5 more)

### Community 36 - "Runtime Dependencies"
Cohesion: 0.07
Nodes (44): PrSelectRow(), AUTHOR_BADGES, AuthorBadge(), CommentRow(), LaunchForm(), LaunchFormProps, OverviewTab(), OverviewTabProps (+36 more)

### Community 37 - "Claude SDK Provider"
Cohesion: 0.09
Nodes (23): dependencies, @anthropic-ai/claude-agent-sdk, dompurify, elysia, @fontsource/ibm-plex-mono, @fontsource/ibm-plex-sans, marked, @modelcontextprotocol/sdk (+15 more)

### Community 38 - "Agent Profile Config"
Cohesion: 0.18
Nodes (5): AutomationManager, mapAutomationRow(), mapAutomationRunRow(), Automation, AutomationRun

### Community 39 - "Agent Coordinator Handlers"
Cohesion: 0.10
Nodes (28): artifactPath, assertPackageVersionInSync(), assertSdkVersionsInSync(), BUILT_DMG, ELECTROBUN_BIN, fail(), installedPackageVersion(), RELEASE_FOLDER (+20 more)

### Community 40 - "API Client Inputs"
Cohesion: 0.15
Nodes (4): FailedReformulation, ActionSystem, RealPaneStream, ReformulateOptions

### Community 41 - "Ticket Config & Constants"
Cohesion: 0.10
Nodes (11): CodexAppServerConnection, CodexAppServerOptions, connectCodexAppServer(), spawnCodexAppServer(), CodexProviderDependencies, createCodexAgentSession(), inheritedMcpServerNames(), PreparedHook (+3 more)

### Community 43 - "Demo Pipeline Concepts"
Cohesion: 0.09
Nodes (4): startParentSession(), SessionHub, SessionHubHandlers, SessionStartCallbacks

### Community 44 - "Chart Primitives"
Cohesion: 0.18
Nodes (17): COLUMN_SORT_FIELD, BoardColumn(), compareFamilyMembers(), familyKeyOf(), groupTicketIds(), groupTicketsByFamily(), isSplitMother(), readCollapsed() (+9 more)

### Community 45 - "Session Hub Transcript"
Cohesion: 0.18
Nodes (10): main(), scalar(), assertCodexDowngradeSafe(), countRows(), migrateCodexCatalog(), recordConfigurationMigration(), createdPaths, reserveDbPath() (+2 more)

### Community 46 - "Community 46"
Cohesion: 0.27
Nodes (15): Agent Implementation Config, Argus Code Review, Automated Tests (typecheck/lint/test), Claude Code Autonomous Agent, Ticket Contract Injection, Feasibility Analysis, Kanban Board (Atelier), Kanban Agents Demo (demo.gif) (+7 more)

### Community 47 - "Modal Dialogs"
Cohesion: 0.17
Nodes (10): CHILD_USAGE, FULL_REVIEW_KINDS, LIGHT_REVIEW_KINDS, newDelegatedTicket(), newReviewTicket(), setup(), sleep(), startAndApproveReviews() (+2 more)

### Community 48 - "Community 48"
Cohesion: 0.16
Nodes (13): CodexAppServerInitializationError, accountResponseSchema, hasExplicitCodexApiKey(), isProtocolIncompatibility(), listRuntimeModels(), modelListResponseSchema, modelSchema, probeCodexRuntime() (+5 more)

### Community 49 - "Slot State"
Cohesion: 0.07
Nodes (34): log, setup(), ResolvedExecution, DRY_RUN_VERDICT, FeasibilityGroup, FeasibilitySession, log, QueuedFeasibility (+26 more)

### Community 50 - "Stats Hooks & Cards"
Cohesion: 0.16
Nodes (12): ChartConfig, ChartContainer, ChartContainerProps, ChartContext, ChartContextValue, ChartLegendContent(), ChartLegendContentProps, ChartTooltipContent() (+4 more)

### Community 51 - "Community 51"
Cohesion: 0.13
Nodes (3): SlotManager, mapSlotRow(), Slot

### Community 52 - "chart.tsx"
Cohesion: 0.33
Nodes (4): mapCommentRow(), Comment, ActivityTabProps, CommentRowProps

### Community 53 - "User Terminal Manager"
Cohesion: 0.33
Nodes (5): CONTEXT — domain glossary, Execution, Proposed (not yet built), Seams, Work items

### Community 54 - "Community 54"
Cohesion: 0.06
Nodes (42): AGENT_EFFORT_LABELS, AGENT_MODEL_LABELS, AUTOMATION_RUN_STATUSES, AUTOMATION_TRIGGER_LABELS, AUTOMATION_TRIGGERS, AutomationRunStatus, AutomationTrigger, CODEX_EFFORT_LABELS (+34 more)

### Community 55 - "App.tsx"
Cohesion: 0.11
Nodes (4): FeasibilityBatchManager, toTriageResult(), FeasibilityResult, TriageResult

### Community 56 - "CSV Parsing"
Cohesion: 0.26
Nodes (11): AppearanceSettings(), matchesQuery(), useTheme(), UseThemeResult, applyTheme(), getStoredTheme(), isTheme(), Theme (+3 more)

### Community 57 - "Community 57"
Cohesion: 0.16
Nodes (18): applyDesktopEnv(), DesktopRoots, ensureConfig(), boot(), externalUrlFromNewWindowEvent(), forwardAtelierShortcut(), installApplicationMenu(), installMenuShortcutBridge() (+10 more)

### Community 59 - "triageManager.ts"
Cohesion: 0.17
Nodes (20): buildSplitChannelPrompt(), buildTicketLines(), isEnglish(), buildContractConstraintsLines(), buildResponseFormatLines(), buildStrictRulesLines(), buildTicketLines(), buildTriageChannelPrompt() (+12 more)

### Community 60 - "Package Manifest"
Cohesion: 0.40
Nodes (5): TicketPatch, ReformulateStatus, SessionUsage, TriageStatus, TriageVerdict

### Community 62 - "TicketCard.tsx"
Cohesion: 0.67
Nodes (3): fakeAppServer(), temporaryDirectories, writeFixture()

### Community 63 - "Community 63"
Cohesion: 0.10
Nodes (53): ExecutionOverrides, UNKNOWN_CODEX_RUNTIME_STATUS, AgentEffort, AgentModel, CodexEffort, CodexModel, Implementer, Orchestrator (+45 more)

### Community 64 - "Composer Run Script"
Cohesion: 0.12
Nodes (25): ExecutionFinishStatus, LiveSession, log, PendingSessionMessage, previewToolInput(), renderSessionEvent(), SessionExecutionContext, SessionExecutionFinish (+17 more)

### Community 66 - "OpenPr"
Cohesion: 0.09
Nodes (3): slotPath(), slugify(), SystemAdapter

### Community 67 - "UserTerminalManager"
Cohesion: 0.39
Nodes (7): currentNow, getSnapshot(), startTicking(), stopTicking(), subscribe(), subscribers, useTickTimer()

### Community 68 - "schema.test.ts"
Cohesion: 0.09
Nodes (10): mapExecutionRunRow(), mapProfileRow(), nullableBooleanValue(), SqlUpdateBuilder, Store, runRecordedAction(), AgentMessage, ExecutionRun (+2 more)

### Community 69 - "contract.test.ts"
Cohesion: 0.11
Nodes (29): ReviewResult, dedupeFindings(), dedupeIdenticalFindings(), DimensionFinding, findingAnchor(), FRENCH_STOP_WORD_PATTERN, FRENCH_STOP_WORDS, hasSimilarSummary() (+21 more)

### Community 70 - "CodexRuntimeStatus"
Cohesion: 0.11
Nodes (12): dryRunLog, FAKE_OPEN_PRS, fakeEncoder, GitWorktreeAddOptions, ImportNotionOptions, PaneSize, PrepareReviewWorktreeOptions, ReviewPublicationComment (+4 more)

### Community 71 - "PostCSS Config"
Cohesion: 0.29
Nodes (6): name, overrides, zod, private, type, version

### Community 72 - "App.tsx"
Cohesion: 0.18
Nodes (16): AgentCard(), DurationBars(), STATE_STRIPE_COLORS, TicketCard(), TicketCardProps, TriageDot(), truncateParentTitle(), ANIMATED_STAGES (+8 more)

### Community 73 - "TerminalView.tsx"
Cohesion: 0.09
Nodes (11): childTranscriptPrefix(), DelegationManager, reviewKey(), reviewPrompt(), ReviewReportLabels, verificationPrompt(), verifiedFindings(), mergeAgentUsageByModel() (+3 more)

### Community 75 - "FakePaneStream"
Cohesion: 0.13
Nodes (27): AGENT_EFFORT_FULL_LABELS, AGENT_MODEL_FULL_LABELS, CODEX_EFFORT_FULL_LABELS, CODEX_MODEL_LABELS, IMPLEMENTER_LABELS, ProfileConfig, DragHandleAttributes, DragHandleListeners (+19 more)

### Community 76 - "usePrdSearch.ts"
Cohesion: 0.15
Nodes (19): isCodexFastServiceTier(), costByFamily(), costOf(), costOfModel(), costOfSessions(), CostSummary, FamilyPricing, ModelFamily (+11 more)

### Community 78 - "csv.ts"
Cohesion: 0.08
Nodes (36): App(), HOME_VIEW_OPTIONS, HomeView, ProjectsSettings(), NAV_ENTRIES, NavEntry, Sidebar(), SidebarProps (+28 more)

### Community 79 - "WorktreeSession"
Cohesion: 0.33
Nodes (3): listeners, mcp, ReplyArgsSchema

### Community 81 - "terminalManager.ts"
Cohesion: 0.06
Nodes (50): ORCHESTRATOR_LABELS, STAGE_LABELS, columnSchema, FILLED_GLYPH_COLORS, StageProgressBar(), MetaRow(), MetaRowProps, STATUS_CONFIRMS (+42 more)

### Community 89 - "usePrdSearch.ts"
Cohesion: 0.06
Nodes (41): Block, blockText(), compactChunks(), firstCharCode(), TranscriptBuffer, trimBlockStart(), AgentStreamBlock, TERMINAL_STAGES (+33 more)

### Community 91 - "AgentsView.tsx"
Cohesion: 0.24
Nodes (10): AgentCardProps, AgentsView(), AgentsViewProps, hasLiveAgent(), normalize(), KIND_BADGES, TicketBadges(), TicketBadgesProps (+2 more)

### Community 92 - "ProjectConfig"
Cohesion: 0.09
Nodes (14): AckSystem, ActiveDelegation, ActiveReview, ClosableExecution, RecordedSession, RecordingSystemAdapter, RecordingSystem, RecordedSession (+6 more)

### Community 94 - ".addComment"
Cohesion: 0.10
Nodes (14): CodexAppServerNotification, CodexAppServerProtocolError, CodexAppServerRpcError, incomingSchema, initializeResponseSchema, log, PendingRequest, rpcErrorSchema (+6 more)

### Community 95 - "TicketConfigSummary.tsx"
Cohesion: 0.50
Nodes (3): appBundle, EMBEDDED_BINARIES, resourcesApp

### Community 97 - "RunningServer"
Cohesion: 0.07
Nodes (28): PROJECT_ROOT, NOTE: PRD generation holds the request open up to ~120s (REFORMULATE_TIMEOUT_MS), RunningServer, serveStaticAsset(), SocketData, startServer(), StartServerOptions, STATIC_CONTENT_TYPES (+20 more)

### Community 100 - "coordinator.ts"
Cohesion: 0.14
Nodes (11): directories, initializeParamsSchema, log, requestSchema, rpcError(), rpcResult(), rpcResponseSchema, toolCallParamsSchema (+3 more)

### Community 102 - "DescriptionTab.tsx"
Cohesion: 0.07
Nodes (46): isNotionUrl(), NOTION_HOSTS, NewTicketSheet(), PrdAnnotator(), PrdAnnotatorProps, BREADCRUMB, NO_ANNOTATIONS, PrdReviewDialog() (+38 more)

### Community 103 - "TerminalSession"
Cohesion: 0.11
Nodes (9): PaneStream, dataMessage(), normalizeSeed(), safeParse(), send(), TerminalSession, TerminalSessionManager, visibleText() (+1 more)

### Community 106 - "nvmNode.ts"
Cohesion: 0.42
Nodes (7): bestInstalledMatch(), compareParts(), envWithProjectNode(), nvmNodeBinDir(), readNvmrc(), prepareProjectShell(), shellLiteral()

### Community 109 - "Board.tsx"
Cohesion: 0.13
Nodes (22): Column, COLUMN_LABELS, COLUMN_ORDER, COLUMNS, ACTIVE_COLUMNS, Board(), BoardProps, isColumn() (+14 more)

## Knowledge Gaps
- **613 isolated node(s):** `What this is`, `Commands`, `graphify`, `The dry-run safety model — read before running anything`, `Architecture` (+608 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **26 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Ticket` connect `Coordinator & Protocol` to `Contract Building & Slots`, `Desktop Bootstrap & Menus`, `Ticket Action Panels`, `Core Domain Concepts`, `DB Row Schemas & Mappers`, `Dev Dependencies`, `Client Hub & Watchdog`, `Session Hub & Agent Session`, `Agents View & Ticket Cards`, `PRD Review & Markdown`, `User Terminal & Fake IO`, `NPM Scripts`, `Runtime Dependencies`, `Chart Primitives`, `Modal Dialogs`, `Slot State`, `Community 51`, `chart.tsx`, `Community 54`, `App.tsx`, `triageManager.ts`, `Community 63`, `split.ts`, `OpenPr`, `schema.test.ts`, `App.tsx`, `TerminalView.tsx`, `usePrdSearch.ts`, `csv.ts`, `terminalManager.ts`, `codexCapabilities.ts`, `usePrdSearch.ts`, `AgentsView.tsx`, `ProjectConfig`, `DescriptionTab.tsx`, `Board.tsx`?**
  _High betweenness centrality (0.069) - this node is a cross-community bridge._
- **Why does `SystemAdapter` connect `OpenPr` to `Composer Run Script`, `Agent Profile Config`, `CodexRuntimeStatus`, `Settings & Profiles UI`, `TerminalSession`, `TerminalView.tsx`, `Demo Pipeline Concepts`, `Board & Sidebar Layout`, `Stats Aggregation`, `Slot State`, `Community 51`, `App.tsx`, `Client Hub & Watchdog`, `Cost & Pricing`, `Agents View & Ticket Cards`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **Why does `Store` connect `schema.test.ts` to `Feasibility Batch Management`, `Fake System Adapter`, `Core Domain Concepts`, `Coordinator & Protocol`, `Stats Aggregation`, `Dev Dependencies`, `Client Hub & Watchdog`, `Session Hub & Agent Session`, `Agents View & Ticket Cards`, `PRD Review & Markdown`, `User Terminal & Fake IO`, `NPM Scripts`, `Agent Profile Config`, `Demo Pipeline Concepts`, `Modal Dialogs`, `Slot State`, `Community 51`, `chart.tsx`, `OpenPr`, `contract.test.ts`, `TerminalView.tsx`, `codexCapabilities.ts`, `RunningServer`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `createApiRoutes()` (e.g. with `isWebOnlyPath()` and `.onEvent()`) actually correct?**
  _`createApiRoutes()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `What this is`, `Commands`, `graphify` to the rest of the system?**
  _624 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Contract Building & Slots` be split into smaller, more focused modules?**
  _Cohesion score 0.036384976525821594 - nodes in this community are weakly interconnected._
- **Should `Desktop Bootstrap & Menus` be split into smaller, more focused modules?**
  _Cohesion score 0.08973172987974098 - nodes in this community are weakly interconnected._