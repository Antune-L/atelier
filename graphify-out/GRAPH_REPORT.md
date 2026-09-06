# Graph Report - kanban-agents  (2026-09-06)

## Corpus Check
- 245 files · ~705,595 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2492 nodes · 6510 edges · 132 communities (106 shown, 26 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 44 edges (avg confidence: 0.68)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `19f5af15`
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
- codexBinary.ts
- FakePaneStream
- usePrdSearch.ts
- Community 77
- csv.ts
- WorktreeSession
- Community 80
- .handleMessage
- Community 82
- Community 83
- CodexAppServerOptions
- prd.ts
- usePrdSearch.ts
- Community 90
- reformulate.ts
- ProjectConfig
- FakePaneStream
- .addComment
- TicketConfigSummary.tsx
- useTickTimer.ts
- RunningServer
- TriageManager
- profileMatching.test.ts
- coordinator.ts
- codexRuntime.ts
- reformulate.ts
- .start
- useProjects.ts
- theme.ts
- nvmNode.ts
- WorktreeSessionsView.tsx
- agentDefaults.ts
- Board.tsx
- TerminalsView.tsx
- csv.ts
- SlotPips.tsx
- settings.tsx
- projectDisplay.ts
- useProfiles.ts
- .addComment
- notion.ts
- FullscreenToggle.tsx
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
- performSplit

## God Nodes (most connected - your core abstractions)
1. `Store` - 119 edges
2. `SystemAdapter` - 72 edges
3. `Ticket` - 72 edges
4. `createApiRoutes()` - 71 edges
5. `FakeSystemAdapter` - 61 edges
6. `RealSystemAdapter` - 56 edges
7. `SlotManager` - 49 edges
8. `SessionHub` - 46 edges
9. `ClientHub` - 42 edges
10. `DelegationManager` - 38 edges

## Surprising Connections (you probably didn't know these)
- `main()` --calls--> `assertCodexDowngradeSafe()`  [EXTRACTED]
  scripts/downgrade-codex-catalog.ts → src/server/db/schema.ts
- `main()` --calls--> `migrateCodexCatalog()`  [EXTRACTED]
  scripts/downgrade-codex-catalog.ts → src/server/db/schema.ts
- `ExecutionOverrides` --references--> `Orchestrator`  [EXTRACTED]
  src/server/agents/executionConfig.ts → src/shared/constants.ts
- `TriageSessionInput` --references--> `Orchestrator`  [EXTRACTED]
  src/server/agents/sessionConfig.ts → src/shared/constants.ts
- `SplitSessionInput` --references--> `Orchestrator`  [EXTRACTED]
  src/server/agents/sessionConfig.ts → src/shared/constants.ts

## Import Cycles
- 3-file cycle: `src/server/config.ts -> src/server/db/store.ts -> src/server/db/rows.ts -> src/server/config.ts`
- 3-file cycle: `src/server/agents/worktreeAddresses.ts -> src/server/config.ts -> src/server/db/store.ts -> src/server/agents/worktreeAddresses.ts`

## Communities (132 total, 26 thin omitted)

### Community 0 - "Contract Building & Slots"
Cohesion: 0.04
Nodes (66): ActionExecutionOptions, actionExecutionOptionsSchema, agentMessageSchema, AnalyzeTicketsInput, appSettingsSchema, automationRunSchema, automationSchema, baseBranchSchema (+58 more)

### Community 1 - "Terminals UI & Notifications"
Cohesion: 0.16
Nodes (20): TERMINAL_STAGES, AgentCard(), AgentCardProps, AgentsView(), hasLiveAgent(), normalize(), resolveProjectColor(), TicketCard() (+12 more)

### Community 2 - "Desktop Bootstrap & Menus"
Cohesion: 0.11
Nodes (28): AgentProfileConfig(), AgentProfileConfigProps, AskPanelProps, CleanPrPanelProps, CodexAgentFields(), CodexAgentFieldsProps, ImplementationAgentFieldsProps, ImportTicketsPanel() (+20 more)

### Community 3 - "Feasibility Batch Management"
Cohesion: 0.07
Nodes (33): log, ToolHandler, ToolResult, TRIAGE_VERDICTS, AgentSettableStage, agentSettableStageSchema, askUserArgsSchema, AssertNamesCovered (+25 more)

### Community 4 - "Ticket Action Panels"
Cohesion: 0.11
Nodes (15): WsClientEvent, wsClientEventSchema, active, ensureNotificationPermission(), getAudioContext(), isSupported(), loadSoundBuffer(), playBuffer() (+7 more)

### Community 5 - "Fake System Adapter"
Cohesion: 0.10
Nodes (19): log, ReclaimOutcome, SETUP_PHASES, SlotManagerConfig, log, SlotWatch, WorktreeAddressWatcher, projectConfigSchema (+11 more)

### Community 6 - "Shared Zod Schemas"
Cohesion: 0.11
Nodes (24): main(), scalar(), assertCodexDowngradeSafe(), backfillOrchestrator(), countRows(), createDatabase(), EXECUTION_MIGRATIONS, hasColumn() (+16 more)

### Community 7 - "Settings & Profiles UI"
Cohesion: 0.08
Nodes (4): delay(), fakeShellPrompt(), FakeSystemAdapter, ReviewDoneOptions

### Community 8 - "PR Selection & Slots Bar"
Cohesion: 0.09
Nodes (28): DEFAULT_MODELS, AttachExecutionSessionInput, EnqueueAgentMessageInput, FinalizeExecutionInput, MarkAgentMessageAcceptedInput, MarkAgentMessageReceivedInput, MarkAgentMessageRejectedInput, NewProject (+20 more)

### Community 9 - "Real System Adapter"
Cohesion: 0.08
Nodes (27): AgentDefaultsSettings(), AppearanceSettings(), CODEX_STATUS_TONES, COMMIT_ROW, DefaultsRowSpec, EFFORT_OPTIONS, FEASIBILITY_ROW, IMPLEMENTATION_ROW (+19 more)

### Community 10 - "Slot Config & Worktree Watch"
Cohesion: 0.25
Nodes (23): ProjectKey, AutomationPatch, NewAsk, NewAutomation, NewClean, NewProfile, NewReview, NewTicket (+15 more)

### Community 11 - "Core Domain Concepts"
Cohesion: 0.04
Nodes (48): agentMessageRowSchema, AutomationRow, automationRowSchema, AutomationRunRow, automationRunRowSchema, buildScripts(), CommentRow, commentRowSchema (+40 more)

### Community 12 - "Board & Sidebar Layout"
Cohesion: 0.24
Nodes (12): UNKNOWN_CODEX_RUNTIME_STATUS, Capabilities, CodexConnectionStatus(), STATUS_LABELS, loadCapabilities(), publish(), refreshCapabilities(), snapshot() (+4 more)

### Community 13 - "Database Store Operations"
Cohesion: 0.08
Nodes (35): ProjectInfo, StatRecord, AgentsViewProps, StatCard(), StatCardProps, StatEmpty(), ACTIVE_BAR, AREA_CURSOR (+27 more)

### Community 14 - "Coordinator & Protocol"
Cohesion: 0.17
Nodes (6): addUsageByModel(), toUsageByModel(), TicketLifecycle, failSplitMother(), ACTIVE_STAGES, Ticket

### Community 15 - "API Routes & Reformulate"
Cohesion: 0.21
Nodes (8): isPositiveIntegerString(), isValidDraft(), ProjectListRowProps, ProjectPanel(), ProjectPanelProps, ProjectsSettings(), referenceCommitTimeout(), TIMEOUT_UNITS

### Community 16 - "Stats Aggregation"
Cohesion: 0.08
Nodes (4): RealSystemAdapter, safeJsonParse(), DoneGateResult, SpawnShellOptions

### Community 17 - "Triage & Server Hub"
Cohesion: 0.08
Nodes (25): devDependencies, autoprefixer, class-variance-authority, clsx, concurrently, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities (+17 more)

### Community 18 - "Live Terminal Views"
Cohesion: 0.13
Nodes (18): BREADCRUMB, NO_ANNOTATIONS, PrdReviewDialog(), PrdReviewDialogProps, PrdView(), Sheet(), SHEET_PUSHED_OFFSET, SHEET_WIDTH (+10 more)

### Community 19 - "Stage Progress & Display"
Cohesion: 0.08
Nodes (24): compilerOptions, allowImportingTsExtensions, baseUrl, esModuleInterop, isolatedModules, jsx, lib, module (+16 more)

### Community 20 - "Real Adapter GH/Composer"
Cohesion: 0.08
Nodes (36): AGENT_EFFORT_LABELS, AGENT_MODEL_LABELS, CODEX_EFFORT_LABELS, FAILURE_COLUMNS, Kind, KINDS, SUCCESS_COLUMNS, CodexTierSummary() (+28 more)

### Community 21 - "Store Types & Agent Knobs"
Cohesion: 0.14
Nodes (11): CodexAppServerInitializationError, CodexAppServerProtocolError, connectCodexAppServer(), errorMessage(), incomingSchema, initializeResponseSchema, PendingRequest, rpcErrorSchema (+3 more)

### Community 22 - "DB Row Schemas & Mappers"
Cohesion: 0.14
Nodes (20): ColumnActionsMenu(), ColumnActionsMenuProps, ColumnMenuItem, ActionContext, buildActions(), ConfirmSpec, errorMessage(), RETRY_STAGES (+12 more)

### Community 23 - "Dev Dependencies"
Cohesion: 0.18
Nodes (13): AutomationCard(), AutomationCardProps, AutomationForm(), AutomationFormProps, AutomationView(), EMPTY_FORM, formFromAutomation(), FormState (+5 more)

### Community 24 - "TypeScript Config"
Cohesion: 0.09
Nodes (29): SessionStartConfig, AgentPermissionMode, AgentProvider, AgentSessionEvent, AgentSessionToolResult, AgentSubagentDefinition, HttpMcpServerDefinition, StdioMcpServerDefinition (+21 more)

### Community 25 - "Client Hub & Watchdog"
Cohesion: 0.13
Nodes (21): NewTicketSheet(), ActivityTab(), ActivityTabProps, isUnanswered(), NO_COMMENT_COLUMNS, AUTHOR_BADGES, CommentRow(), CommentRowProps (+13 more)

### Community 26 - "Cost & Pricing"
Cohesion: 0.09
Nodes (21): CLAUDE_JSON_PATH, COMPOSER_BINARIES, detectInstallCommand(), extractPrUrl(), ghPrSchema, ghPrStateSchema, ghReviewSchema, ghReviewsSchema (+13 more)

### Community 27 - "Workflow View & Lifecycle"
Cohesion: 0.06
Nodes (26): Architecture, Commands, Conventions (enforced — beyond the global ones in ~/.claude/CLAUDE.md), graphify, The dry-run safety model — read before running anything, What this is, Agent runtime (Agent SDK), Architecture (+18 more)

### Community 28 - "Stats Charts"
Cohesion: 0.07
Nodes (32): AgentMcpServerDefinition, agentMessageDeltaSchema, agentToml(), buildMcpServers(), ConfigObject, configReadResponseSchema, ConfigValue, describeCodexError() (+24 more)

### Community 30 - "Agents View & Ticket Cards"
Cohesion: 0.13
Nodes (19): assertExecutionAvailable(), CODEX_LAUNCH_STATUS_MESSAGES, CodexCapabilityReader, ExecutionDefaults, ExecutionOverrides, FEASIBILITY_ENGINE_EXECUTION, resolveExecution(), resolveFeasibilityExecution() (+11 more)

### Community 31 - "PRD Review & Markdown"
Cohesion: 0.07
Nodes (3): SystemAdapter, UserTerminalManager, TerminalDescriptor

### Community 32 - "User Terminal & Fake IO"
Cohesion: 0.09
Nodes (29): BASH_ALLOWLIST, buildFeasibilitySessionConfig(), buildImplementSessionConfig(), buildSplitSessionConfig(), buildTriageSessionConfig(), CODEX_READONLY_TOOLS, codexImplementerKnobs(), codexKnobs() (+21 more)

### Community 33 - "Logging"
Cohesion: 0.10
Nodes (21): scripts, build:desktop, build:web, dev, dev:desktop, dev:proxy, dev:server, dev:web (+13 more)

### Community 34 - "Board Columns"
Cohesion: 0.27
Nodes (4): mapExecutionRunRow(), runRecordedAction(), ExecutionRun, ExecutionUsageByModel

### Community 37 - "Claude SDK Provider"
Cohesion: 0.09
Nodes (23): dependencies, @anthropic-ai/claude-agent-sdk, dompurify, elysia, @fontsource/ibm-plex-mono, @fontsource/ibm-plex-sans, marked, @modelcontextprotocol/sdk (+15 more)

### Community 38 - "Agent Profile Config"
Cohesion: 0.16
Nodes (5): AutomationManager, mapAutomationRow(), mapAutomationRunRow(), Automation, AutomationRun

### Community 39 - "Agent Coordinator Handlers"
Cohesion: 0.10
Nodes (27): artifactPath, assertPackageVersionInSync(), assertSdkVersionsInSync(), BUILT_DMG, ELECTROBUN_BIN, fail(), installedPackageVersion(), RELEASE_FOLDER (+19 more)

### Community 40 - "API Client Inputs"
Cohesion: 0.20
Nodes (20): applySizes(), collectTerminalIds(), findLeaf(), firstLeafId(), LeafNode, leafNodeSchema, makeLeaf(), nextNodeId() (+12 more)

### Community 41 - "Ticket Config & Constants"
Cohesion: 0.06
Nodes (29): FEASIBILITY_ENGINE_LABELS, FEASIBILITY_ENGINES, IMPLEMENTERS, ORCHESTRATORS, STAGE_LABELS, AGENT_EFFORT_FULL_OPTIONS, AGENT_EFFORT_OPTIONS, AGENT_MODEL_FULL_OPTIONS (+21 more)

### Community 43 - "Demo Pipeline Concepts"
Cohesion: 0.08
Nodes (27): LaunchForm(), LaunchFormProps, OverviewTab(), OverviewTabProps, SUMMARY_COLUMNS, PrdTab(), PrdTabProps, SectionHeader() (+19 more)

### Community 44 - "Chart Primitives"
Cohesion: 0.19
Nodes (17): BoardColumn(), compareFamilyMembers(), familyKeyOf(), groupTicketIds(), groupTicketsByFamily(), isSplitMother(), readCollapsed(), readSortDir() (+9 more)

### Community 45 - "Session Hub Transcript"
Cohesion: 0.15
Nodes (12): Block, blockText(), compactChunks(), firstCharCode(), TranscriptBuffer, trimBlockStart(), AgentStreamBlock, applyTranscriptUpdate() (+4 more)

### Community 46 - "Community 46"
Cohesion: 0.27
Nodes (15): Agent Implementation Config, Argus Code Review, Automated Tests (typecheck/lint/test), Claude Code Autonomous Agent, Ticket Contract Injection, Feasibility Analysis, Kanban Board (Atelier), Kanban Agents Demo (demo.gif) (+7 more)

### Community 47 - "Modal Dialogs"
Cohesion: 0.18
Nodes (16): TICKET_TAB_LABELS, TicketTab, TicketTabs(), TicketTabsProps, availableTabs(), hasSessionPane(), initialTab(), isLocked() (+8 more)

### Community 48 - "Community 48"
Cohesion: 0.18
Nodes (5): mapProfileRow(), nullableBooleanValue(), createApiRoutes(), PaneReader, Profile

### Community 49 - "Slot State"
Cohesion: 0.11
Nodes (13): setup(), DRY_RUN_VERDICT, log, log, ReformulateManager, SessionHub, log, ClientHub (+5 more)

### Community 50 - "Stats Hooks & Cards"
Cohesion: 0.16
Nodes (3): ProjectConfig, Store, migrateConfigJsonIfPresent()

### Community 51 - "Community 51"
Cohesion: 0.13
Nodes (13): groupFeasibilityTickets(), assertCodexImplementerAvailable(), slotPath(), slugify(), computeWorktreeAddresses(), getProject(), isProjectKey(), mapSlotRow() (+5 more)

### Community 52 - "chart.tsx"
Cohesion: 0.16
Nodes (12): ChartConfig, ChartContainer, ChartContainerProps, ChartContext, ChartContextValue, ChartLegendContent(), ChartLegendContentProps, ChartTooltipContent() (+4 more)

### Community 53 - "User Terminal Manager"
Cohesion: 0.33
Nodes (5): CONTEXT — domain glossary, Execution, Proposed (not yet built), Seams, Work items

### Community 54 - "Community 54"
Cohesion: 0.16
Nodes (17): AppSettings, UpdateAppSettingsInput, AppSettingsState, flashSaved(), loadOnce(), patchAppSettings(), publish(), snapshot() (+9 more)

### Community 55 - "App.tsx"
Cohesion: 0.18
Nodes (3): FeasibilityBatchManager, toTriageResult(), FeasibilityResult

### Community 56 - "CSV Parsing"
Cohesion: 0.12
Nodes (19): ActiveReview, ActiveReviewPass, FULL_REVIEW_KINDS, LIGHT_REVIEW_KINDS, log, REVIEW_DISALLOWED_TOOLS, REVIEW_TOOLS, reviewPrompt() (+11 more)

### Community 57 - "Community 57"
Cohesion: 0.16
Nodes (18): applyDesktopEnv(), DesktopRoots, ensureConfig(), boot(), externalUrlFromNewWindowEvent(), forwardAtelierShortcut(), installApplicationMenu(), installMenuShortcutBridge() (+10 more)

### Community 59 - "triageManager.ts"
Cohesion: 0.28
Nodes (14): buildContractConstraintsLines(), buildResponseFormatLines(), buildStrictRulesLines(), buildTicketLines(), buildTriageChannelPrompt(), buildTriagePlusChannelPrompt(), isEnglish(), readOnlyFramingLines() (+6 more)

### Community 60 - "Package Manifest"
Cohesion: 0.13
Nodes (13): AUTOMATION_RUN_STATUSES, AUTOMATION_TRIGGER_LABELS, AUTOMATION_TRIGGERS, AutomationRunStatus, COLUMN_ORDER, COLUMN_SORT_FIELD, COLUMNS, COMMENT_AUTHORS (+5 more)

### Community 61 - "splitManager.ts"
Cohesion: 0.22
Nodes (10): MetaRow(), MetaRowProps, STATUS_CONFIRMS, StatusConfirm, statusTitle(), TicketMeta(), TicketMetaProps, TicketCost() (+2 more)

### Community 62 - "TicketCard.tsx"
Cohesion: 0.05
Nodes (42): buildNotionImportPrompt(), buildPrdPrompt(), agentPairError(), cleanDescription(), createSplitChildren(), dependencyError(), isBlocked(), isProcessing() (+34 more)

### Community 63 - "Community 63"
Cohesion: 0.35
Nodes (3): mapAgentMessageRow(), AgentMessage, ExecutionOwnerType

### Community 64 - "Composer Run Script"
Cohesion: 0.38
Nodes (6): ExecutionFinishStatus, log, previewToolInput(), renderChannelEvent(), renderImplementationDone(), renderSessionEvent()

### Community 65 - "split.ts"
Cohesion: 0.12
Nodes (32): buildAskContract(), buildCleanContract(), buildConflictResolutionContract(), buildFeasibilityBatchContract(), buildFeasibilityContextSection(), buildImplementingSteps(), buildMockupReviewStep(), buildPlanningStep() (+24 more)

### Community 66 - "OpenPr"
Cohesion: 0.08
Nodes (15): FakePaneStream, RealPaneStream, PaneStream, dataMessage(), log, normalizeSeed(), safeParse(), send() (+7 more)

### Community 67 - "UserTerminalManager"
Cohesion: 0.40
Nodes (5): MIME_EXTENSIONS, resolveExtension(), SavedUpload, saveUpload(), serveUpload()

### Community 68 - "schema.test.ts"
Cohesion: 0.12
Nodes (21): cleanTicket(), conflictTicket(), REVIEW_OPTS, reviewTicket(), TICKET_OPTS, CHILD_USAGE, FULL_REVIEW_KINDS, LIGHT_REVIEW_KINDS (+13 more)

### Community 69 - "contract.test.ts"
Cohesion: 0.12
Nodes (8): dryRunLog, FAKE_OPEN_PRS, fakeEncoder, hexToBytes(), GitWorktreeAddOptions, PaneSize, OpenPr, ProjectPanelState

### Community 70 - "CodexRuntimeStatus"
Cohesion: 0.16
Nodes (5): FailedReformulation, ActionSystem, CapabilityCache, ReformulateOptions, CodexRuntimeStatus

### Community 71 - "PostCSS Config"
Cohesion: 0.29
Nodes (6): name, overrides, zod, private, type, version

### Community 72 - "App.tsx"
Cohesion: 0.09
Nodes (25): NAV_ENTRIES, NavEntry, Sidebar(), SidebarProps, SidebarView, FILLED_GLYPH_COLORS, StageProgressBar(), StageProgressBarProps (+17 more)

### Community 74 - "codexBinary.ts"
Cohesion: 0.27
Nodes (11): groupOrientation(), layoutToSizes(), panelId(), panelPercent(), SplitTree(), SplitTreeProps, SplitOrientation, isShortcutDetail() (+3 more)

### Community 75 - "FakePaneStream"
Cohesion: 0.18
Nodes (11): ImplementationAgentFields(), DragHandleAttributes, DragHandleListeners, ProfileRow(), ProfileRowHeader(), ProfileRowHeaderProps, ProfileRowProps, ProfilesSettings() (+3 more)

### Community 76 - "usePrdSearch.ts"
Cohesion: 0.14
Nodes (21): isCodexFastServiceTier(), costByFamily(), costOf(), costOfModel(), costOfSessions(), CostSummary, FamilyPricing, ModelFamily (+13 more)

### Community 78 - "csv.ts"
Cohesion: 0.09
Nodes (27): App(), HOME_VIEW_OPTIONS, HomeView, AskPanel(), ACTIVE_COLUMNS, Board(), BoardProps, isColumn() (+19 more)

### Community 79 - "WorktreeSession"
Cohesion: 0.33
Nodes (3): listeners, mcp, ReplyArgsSchema

### Community 80 - "Community 80"
Cohesion: 0.13
Nodes (13): CodexAppServerConnection, createCodexAgentSession(), inheritedMcpServerNames(), PreparedHook, prepareSkills(), threadConfig(), hasExplicitCodexApiKey(), isProtocolIncompatibility() (+5 more)

### Community 81 - ".handleMessage"
Cohesion: 0.19
Nodes (20): AGENT_EFFORT_FULL_LABELS, AGENT_MODEL_FULL_LABELS, CODEX_EFFORT_FULL_LABELS, CODEX_MODEL_LABELS, IMPLEMENTER_LABELS, ORCHESTRATOR_LABELS, ProfileConfig, buildProfilePipeline() (+12 more)

### Community 86 - "CodexAppServerOptions"
Cohesion: 0.14
Nodes (5): CodexAppServerNotification, CodexAppServerOptions, CodexProviderDependencies, AppServerFixture, CodexRuntimeDependencies

### Community 87 - "prd.ts"
Cohesion: 0.20
Nodes (10): PrSelectRow(), PrSelectRowProps, KIND_BADGES, TicketBadges(), TicketBadgesProps, Badge(), BadgeProps, BadgeVariant (+2 more)

### Community 89 - "usePrdSearch.ts"
Cohesion: 0.14
Nodes (18): badgeLabelFor(), LiveTerminal(), LiveTerminalOptions, LiveTerminalProps, TerminalData, TerminalView(), TerminalViewProps, TerminalTab() (+10 more)

### Community 90 - "Community 90"
Cohesion: 0.22
Nodes (5): dedupeFindings(), requiredReviewKinds(), mapReviewApprovalRow(), mapReviewPassRow(), parsePersistedReviewFindings()

### Community 91 - "reformulate.ts"
Cohesion: 0.14
Nodes (3): startParentSession(), SessionHubHandlers, SessionStartCallbacks

### Community 92 - "ProjectConfig"
Cohesion: 0.08
Nodes (22): AckSystem, ActiveDelegation, ClosableExecution, RecordedSession, RecordingSystemAdapter, RecordingSystem, LiveSession, PendingSessionMessage (+14 more)

### Community 93 - "FakePaneStream"
Cohesion: 0.15
Nodes (5): Logger, paint(), ScopedLogger, serializeFields(), timestamp()

### Community 94 - ".addComment"
Cohesion: 0.21
Nodes (9): CodexBinaryVersionError, require, resolveCodexBinary(), resolveCodexBinaryOverride(), TARGETS, canonicalJson(), CodexCommandHook, codexSessionPreToolUseHookHash() (+1 more)

### Community 95 - "TicketConfigSummary.tsx"
Cohesion: 0.50
Nodes (3): appBundle, EMBEDDED_BINARIES, resourcesApp

### Community 97 - "RunningServer"
Cohesion: 0.07
Nodes (30): log, setup(), Watchdog, log, runFirstBootSetup(), listProjectKeys(), requireStore(), PROJECT_ROOT (+22 more)

### Community 98 - "TriageManager"
Cohesion: 0.50
Nodes (3): resolveBaseBranch(), TriageManager, TriageResult

### Community 99 - "profileMatching.test.ts"
Cohesion: 0.50
Nodes (3): profileSchema, matchesCodexImplementer(), inheritedProfile

### Community 100 - "coordinator.ts"
Cohesion: 0.09
Nodes (16): directories, createCodexProvider(), AppServerFixtureOptions, options(), RecordedRequest, initializeParamsSchema, log, requestSchema (+8 more)

### Community 101 - "codexRuntime.ts"
Cohesion: 0.23
Nodes (9): CodexAppServerRpcError, accountResponseSchema, modelListResponseSchema, modelSchema, CodexRuntimeModel, codexRuntimeModelSchema, codexRuntimeStatusSchema, pairedRuntimeCodexEffort() (+1 more)

### Community 104 - "useProjects.ts"
Cohesion: 0.24
Nodes (10): emit(), loadedSubscribers, loadOnce(), refreshProjects(), subscribers, useProjects(), useProjectsLoaded(), api (+2 more)

### Community 105 - "theme.ts"
Cohesion: 0.33
Nodes (9): useTheme(), UseThemeResult, applyTheme(), getStoredTheme(), isTheme(), Theme, ThemeOption, THEMES (+1 more)

### Community 106 - "nvmNode.ts"
Cohesion: 0.42
Nodes (7): bestInstalledMatch(), compareParts(), envWithProjectNode(), nvmNodeBinDir(), readNvmrc(), prepareProjectShell(), shellLiteral()

### Community 107 - "WorktreeSessionsView.tsx"
Cohesion: 0.33
Nodes (7): COLUMN_NODE_COLOR, depthOf(), truncate(), WorkflowView(), WorkflowViewProps, WorktreeSessionsView(), useBoard()

### Community 108 - "agentDefaults.ts"
Cohesion: 0.33
Nodes (8): agentEffortSchema, codexEffortSchema, codexModelSchema, resolveAgentDefaults(), resolveCodexEffort(), resolveCodexModel(), resolveEffort(), resolveModel()

### Community 109 - "Board.tsx"
Cohesion: 0.18
Nodes (9): Column, COLUMN_LABELS, BoardColumnProps, DEFAULT_OPEN, NOTE: an expanded column already owns the droppable id through its lane; registe, TerminalColumnsPanelProps, TerminalRowButton(), TerminalRowButtonProps (+1 more)

### Community 110 - "TerminalsView.tsx"
Cohesion: 0.32
Nodes (5): QuitConfirmModal(), QuitConfirmModalProps, Button, ButtonProps, buttonVariants

### Community 111 - "csv.ts"
Cohesion: 0.33
Nodes (6): RFC-4180, CsvParseError, normalizeHeader(), ParsedTicketRow, ParsedTicketsCsv, parseTicketsCsv()

### Community 112 - "SlotPips.tsx"
Cohesion: 0.38
Nodes (6): ATTENTION_STATUSES, sessionOf(), SlotPips(), SlotPipsProps, STATUS_LABELS, STATUS_PIP_CLASSES

### Community 113 - "settings.tsx"
Cohesion: 0.33
Nodes (4): DashedAddButtonProps, footerMessage(), SettingsFooter(), SettingsFooterProps

### Community 114 - "projectDisplay.ts"
Cohesion: 0.38
Nodes (4): formatCommitTimeout(), TimeoutUnit, timeoutUnitMs(), timeoutUnitOf()

### Community 115 - "useProfiles.ts"
Cohesion: 0.53
Nodes (5): emit(), loadOnce(), refreshProfiles(), subscribers, useProfiles()

### Community 116 - ".addComment"
Cohesion: 0.50
Nodes (3): mapCommentRow(), CommentAuthor, Comment

### Community 139 - "performSplit"
Cohesion: 0.23
Nodes (8): terminalServerMessageSchema, TerminalCell(), TerminalCellProps, TERMINAL_THEME, terminalWsUrl(), textEncoder, useXtermSocket, UseXtermSocketOptions

## Knowledge Gaps
- **609 isolated node(s):** `name`, `version`, `private`, `type`, `dev` (+604 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **26 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Ticket` connect `Coordinator & Protocol` to `Contract Building & Slots`, `Terminals UI & Notifications`, `Ticket Action Panels`, `Fake System Adapter`, `PR Selection & Slots Bar`, `Core Domain Concepts`, `Database Store Operations`, `Session Hub & Agent Session`, `Agents View & Ticket Cards`, `PRD Review & Markdown`, `User Terminal & Fake IO`, `NPM Scripts`, `Runtime Dependencies`, `Ticket Config & Constants`, `Chart Primitives`, `Community 48`, `Slot State`, `Stats Hooks & Cards`, `Community 51`, `CSV Parsing`, `triageManager.ts`, `TicketCard.tsx`, `split.ts`, `schema.test.ts`, `App.tsx`, `TerminalView.tsx`, `usePrdSearch.ts`, `prd.ts`, `reformulate.ts`, `.start`, `WorktreeSessionsView.tsx`, `Board.tsx`?**
  _High betweenness centrality (0.066) - this node is a cross-community bridge._
- **Why does `TerminalView()` connect `usePrdSearch.ts` to `Terminals UI & Notifications`, `Demo Pipeline Concepts`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **Why does `SystemAdapter` connect `PRD Review & Markdown` to `Composer Run Script`, `RunningServer`, `OpenPr`, `Fake System Adapter`, `Agent Profile Config`, `contract.test.ts`, `Settings & Profiles UI`, `CodexRuntimeStatus`, `Community 90`, `TerminalView.tsx`, `Stats Aggregation`, `Slot State`, `Community 51`, `CSV Parsing`, `TypeScript Config`, `Cost & Pricing`, `Session Hub & Agent Session`, `Agents View & Ticket Cards`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `createApiRoutes()` (e.g. with `isWebOnlyPath()` and `.onEvent()`) actually correct?**
  _`createApiRoutes()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _620 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Contract Building & Slots` be split into smaller, more focused modules?**
  _Cohesion score 0.03793691389599318 - nodes in this community are weakly interconnected._
- **Should `Desktop Bootstrap & Menus` be split into smaller, more focused modules?**
  _Cohesion score 0.11212121212121212 - nodes in this community are weakly interconnected._