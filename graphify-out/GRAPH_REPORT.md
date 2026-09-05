# Graph Report - kanban-agents  (2026-09-05)

## Corpus Check
- 218 files · ~698,229 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2283 nodes · 6145 edges · 127 communities (96 shown, 31 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 45 edges (avg confidence: 0.69)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c513f949`
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
- Webhook MCP
- Package Manifest
- splitManager.ts
- TicketCard.tsx
- Community 63
- Composer Run Script
- migration.ts
- OpenPr
- WorkflowView.tsx
- CLAUDE.md Doc
- fake.ts
- logger.ts
- PostCSS Config
- Community 72
- React Root Mount
- Theme Flash Guard
- Community 75
- usePrdSearch.ts
- Community 77
- useTerminalShortcuts.ts
- WorktreeSession
- Community 80
- uploads.ts
- Community 82
- Community 83
- FakePaneStream
- prd.ts
- Community 89
- Community 90
- reformulate.ts
- ProjectConfig
- FakePaneStream
- slotManager.ts
- TicketConfigSummary.tsx
- useTickTimer.ts
- Backend (routes tool calls, verifies gates)
- withCost
- split.ts
- coordinator.ts
- @anthropic-ai/claude-agent-sdk
- Composer 2.5 path (run_composer.sh)
- Databases (kanban.db / kanban-real.db)
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
- notifications.ts
- TicketCost.tsx
- ProjectConfig
- .handleMessage
- Profile
- .addComment
- SplitManager
- reformulate.ts

## God Nodes (most connected - your core abstractions)
1. `Store` - 119 edges
2. `Ticket` - 80 edges
3. `createApiRoutes()` - 66 edges
4. `SystemAdapter` - 61 edges
5. `FakeSystemAdapter` - 60 edges
6. `RealSystemAdapter` - 55 edges
7. `cn()` - 50 edges
8. `SlotManager` - 49 edges
9. `SessionHub` - 46 edges
10. `Orchestrator` - 40 edges

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

## Communities (127 total, 31 thin omitted)

### Community 0 - "Contract Building & Slots"
Cohesion: 0.04
Nodes (45): ActionExecutionOptions, actionExecutionOptionsSchema, agentMessageSchema, appSettingsSchema, automationRunSchema, automationSchema, baseBranchSchema, commentAuthorSchema (+37 more)

### Community 1 - "Terminals UI & Notifications"
Cohesion: 0.05
Nodes (61): buildSplitChannelPrompt(), buildTicketLines(), isEnglish(), COLUMN_LABELS, COLUMN_SORT_FIELD, CommitLanguage, TERMINAL_STAGES, extractFigmaUrls() (+53 more)

### Community 2 - "Desktop Bootstrap & Menus"
Cohesion: 0.10
Nodes (22): ProjectInfo, AgentsViewProps, AskPanelProps, CleanPrPanelProps, ImportTicketsPanelProps, NewTicketDialogProps, ProjectPrPicker(), ProjectPrPickerProps (+14 more)

### Community 3 - "Feasibility Batch Management"
Cohesion: 0.09
Nodes (14): RealPaneStream, PaneStream, dataMessage(), log, normalizeSeed(), safeParse(), send(), TerminalSession (+6 more)

### Community 4 - "Ticket Action Panels"
Cohesion: 0.07
Nodes (46): terminalServerMessageSchema, FullscreenToggle(), FullscreenToggleProps, badgeLabelFor(), LiveTerminal(), LiveTerminalOptions, LiveTerminalProps, groupOrientation() (+38 more)

### Community 5 - "Fake System Adapter"
Cohesion: 0.21
Nodes (11): buildAskContract(), buildCleanContract(), groupFeasibilityTickets(), computeWorktreeAddresses(), log, runFirstBootSetup(), getProject(), isProjectKey() (+3 more)

### Community 6 - "Shared Zod Schemas"
Cohesion: 0.11
Nodes (24): main(), scalar(), assertCodexDowngradeSafe(), backfillOrchestrator(), countRows(), createDatabase(), EXECUTION_MIGRATIONS, hasColumn() (+16 more)

### Community 7 - "Settings & Profiles UI"
Cohesion: 0.09
Nodes (3): delay(), fakeShellPrompt(), FakeSystemAdapter

### Community 8 - "PR Selection & Slots Bar"
Cohesion: 0.19
Nodes (22): buildConflictResolutionContract(), buildFeasibilityBatchContract(), buildFeasibilityContextSection(), buildImplementingSteps(), buildMockupReviewStep(), buildPlanningStep(), buildPrdBullet(), buildReviewContract() (+14 more)

### Community 9 - "Real System Adapter"
Cohesion: 0.13
Nodes (13): COMMIT_LANGUAGE_LABELS, COMMIT_LANGUAGES, DragHandleAttributes, DragHandleListeners, LANGUAGE_OPTIONS, ProfileRowProps, ProfilesSettings(), renderTab() (+5 more)

### Community 10 - "Slot Config & Worktree Watch"
Cohesion: 0.17
Nodes (33): ProjectKey, AutomationPatch, NewAsk, NewAutomation, NewClean, NewProfile, NewReview, NewTicket (+25 more)

### Community 11 - "Core Domain Concepts"
Cohesion: 0.04
Nodes (47): agentMessageRowSchema, AutomationRow, automationRowSchema, AutomationRunRow, automationRunRowSchema, buildScripts(), CommentRow, commentRowSchema (+39 more)

### Community 12 - "Board & Sidebar Layout"
Cohesion: 0.12
Nodes (27): Capabilities, AskPanel(), CleanPrPanel(), CodexConnectionStatus(), STATUS_LABELS, ImportTicketsPanel(), NewTicketDialog(), Tab (+19 more)

### Community 13 - "Database Store Operations"
Cohesion: 0.12
Nodes (11): AckSystem, ActiveDelegation, ClosableExecution, RecordedSession, RecordingSystemAdapter, RecordingSystem, RecordedSession, RecordingSystem (+3 more)

### Community 14 - "Coordinator & Protocol"
Cohesion: 0.22
Nodes (4): ReformulateManager, TicketLifecycle, RouteDeps, Ticket

### Community 15 - "API Routes & Reformulate"
Cohesion: 0.12
Nodes (19): AgentProvider, ensureClaudeBinary(), bashCommandSchema, buildSettings(), claudeProvider, createSdkAgentSession(), denyNoVerifyHook(), dispatchClaudeMessage() (+11 more)

### Community 16 - "Stats Aggregation"
Cohesion: 0.07
Nodes (9): detectInstallCommand(), realpathSafe(), RealSystemAdapter, resolveWorktreeScriptCommand(), safeJsonParse(), shQuote(), DoneGateResult, ReviewDoneOptions (+1 more)

### Community 17 - "Triage & Server Hub"
Cohesion: 0.08
Nodes (25): devDependencies, autoprefixer, class-variance-authority, clsx, concurrently, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities (+17 more)

### Community 18 - "Live Terminal Views"
Cohesion: 0.12
Nodes (11): directories, initializeParamsSchema, log, requestSchema, rpcError(), rpcResult(), rpcResponseSchema, toolCallParamsSchema (+3 more)

### Community 19 - "Stage Progress & Display"
Cohesion: 0.08
Nodes (24): compilerOptions, allowImportingTsExtensions, baseUrl, esModuleInterop, isolatedModules, jsx, lib, module (+16 more)

### Community 20 - "Real Adapter GH/Composer"
Cohesion: 0.11
Nodes (25): FAILURE_COLUMNS, Kind, KINDS, SUCCESS_COLUMNS, DurationChart(), SuccessRateChart(), effectiveWorkDurationMs(), CodexTierSummary (+17 more)

### Community 21 - "Store Types & Agent Knobs"
Cohesion: 0.12
Nodes (12): CodexAppServerInitializationError, CodexAppServerProtocolError, CodexAppServerRpcError, connectCodexAppServer(), errorMessage(), incomingSchema, initializeResponseSchema, PendingRequest (+4 more)

### Community 22 - "DB Row Schemas & Mappers"
Cohesion: 0.12
Nodes (19): cleanTicket(), conflictTicket(), REVIEW_OPTS, reviewTicket(), TICKET_OPTS, CHILD_USAGE, FULL_REVIEW_KINDS, LIGHT_REVIEW_KINDS (+11 more)

### Community 23 - "Dev Dependencies"
Cohesion: 0.14
Nodes (16): ActiveReview, ActiveReviewPass, FULL_REVIEW_KINDS, LIGHT_REVIEW_KINDS, log, REVIEW_DISALLOWED_TOOLS, REVIEW_TOOLS, reviewPrompt() (+8 more)

### Community 24 - "TypeScript Config"
Cohesion: 0.11
Nodes (23): bestInstalledMatch(), compareParts(), envWithProjectNode(), nvmNodeBinDir(), readNvmrc(), prepareProjectShell(), shellLiteral(), CLAUDE_JSON_PATH (+15 more)

### Community 25 - "Client Hub & Watchdog"
Cohesion: 0.11
Nodes (25): PrdAnnotator(), PrdAnnotatorProps, ABSOLUTE_UPLOAD_PATH, ImageLightboxProps, LightboxImage, Markdown(), MarkdownProps, OPEN_KEYS (+17 more)

### Community 26 - "Cost & Pricing"
Cohesion: 0.11
Nodes (10): log, Watchdog, mapCommentRow(), ClientHub, ClientSocket, ClientSocketData, NativeNotify, Notifier (+2 more)

### Community 27 - "Workflow View & Lifecycle"
Cohesion: 0.10
Nodes (15): Architecture, Commands, Conventions (enforced — beyond the global ones in ~/.claude/CLAUDE.md), graphify, The dry-run safety model — read before running anything, What this is, Agent runtime (Agent SDK), Architecture (+7 more)

### Community 28 - "Stats Charts"
Cohesion: 0.07
Nodes (32): AgentMcpServerDefinition, agentMessageDeltaSchema, agentToml(), buildMcpServers(), ConfigObject, configReadResponseSchema, ConfigValue, describeCodexError() (+24 more)

### Community 29 - "Session Hub & Agent Session"
Cohesion: 0.53
Nodes (5): emit(), loadOnce(), refreshProfiles(), subscribers, useProfiles()

### Community 30 - "Agents View & Ticket Cards"
Cohesion: 0.17
Nodes (3): FeasibilityBatchManager, TriageManager, TriageResult

### Community 31 - "PRD Review & Markdown"
Cohesion: 0.24
Nodes (11): agentEffortSchema, AgentProfileConfig(), ImplementationAgentFields(), resolveAgentDefaults(), resolveCodexEffort(), resolveCodexModel(), resolveEffort(), resolveModel() (+3 more)

### Community 32 - "User Terminal & Fake IO"
Cohesion: 0.09
Nodes (27): BASH_ALLOWLIST, buildFeasibilitySessionConfig(), buildImplementSessionConfig(), buildTriageSessionConfig(), CODEX_READONLY_TOOLS, codexKnobs(), CONTRACT_SKILLS, DENIED_BUILTIN_AGENTS (+19 more)

### Community 33 - "Logging"
Cohesion: 0.10
Nodes (21): scripts, build:desktop, build:web, dev, dev:desktop, dev:proxy, dev:server, dev:web (+13 more)

### Community 34 - "Board Columns"
Cohesion: 0.16
Nodes (9): slotPath(), slugify(), mapSlotRow(), mapWorktreeSessionRow(), enrichWorktreeSession(), failSplitMother(), Slot, WorktreeSession (+1 more)

### Community 35 - "NPM Scripts"
Cohesion: 0.18
Nodes (3): AgentCoordinator, SessionToolCall, CommentAuthor

### Community 36 - "Runtime Dependencies"
Cohesion: 0.22
Nodes (5): dedupeFindings(), requiredReviewKinds(), mapReviewApprovalRow(), mapReviewPassRow(), parsePersistedReviewFindings()

### Community 37 - "Claude SDK Provider"
Cohesion: 0.11
Nodes (19): dependencies, @anthropic-ai/claude-agent-sdk, dompurify, elysia, marked, @modelcontextprotocol/sdk, nanoid, @openai/codex-sdk (+11 more)

### Community 38 - "Agent Profile Config"
Cohesion: 0.17
Nodes (7): AutomationManager, log, mapAutomationRow(), mapAutomationRunRow(), AutomationRunStatus, Automation, AutomationRun

### Community 39 - "Agent Coordinator Handlers"
Cohesion: 0.11
Nodes (27): artifactPath, assertPackageVersionInSync(), assertSdkVersionsInSync(), BUILT_DMG, ELECTROBUN_BIN, fail(), installedPackageVersion(), RELEASE_FOLDER (+19 more)

### Community 40 - "API Client Inputs"
Cohesion: 0.21
Nodes (13): PrdReviewDialogProps, QuitConfirmModal(), QuitConfirmModalProps, Button, ButtonProps, buttonVariants, ConfirmDialogProps, Modal() (+5 more)

### Community 41 - "Ticket Config & Constants"
Cohesion: 0.20
Nodes (4): CodexAppServerNotification, CodexAppServerOptions, AppServerFixture, CodexRuntimeDependencies

### Community 43 - "Demo Pipeline Concepts"
Cohesion: 0.13
Nodes (21): assertExecutionAvailable(), CODEX_LAUNCH_STATUS_MESSAGES, CodexCapabilityReader, ExecutionDefaults, ExecutionOverrides, FEASIBILITY_ENGINE_EXECUTION, resolveExecution(), resolveFeasibilityExecution() (+13 more)

### Community 44 - "Chart Primitives"
Cohesion: 0.33
Nodes (9): useTheme(), UseThemeResult, applyTheme(), getStoredTheme(), isTheme(), Theme, ThemeOption, THEMES (+1 more)

### Community 45 - "Session Hub Transcript"
Cohesion: 0.11
Nodes (25): ACTIVE_BAR, AREA_CURSOR, AXIS_PROPS, BAR_CURSOR, CHART_PALETTE, CodexTierSummary(), colorAt(), CostSummary() (+17 more)

### Community 46 - "Community 46"
Cohesion: 0.27
Nodes (15): Agent Implementation Config, Argus Code Review, Automated Tests (typecheck/lint/test), Claude Code Autonomous Agent, Ticket Contract Injection, Feasibility Analysis, Kanban Board (Atelier), Kanban Agents Demo (demo.gif) (+7 more)

### Community 47 - "Modal Dialogs"
Cohesion: 0.09
Nodes (19): AnalyzeTicketsInput, CreateAskInput, CreateCleanInput, CreateCommentInput, CreateProfileInput, CreateReviewInput, CreateTicketInput, GeneratePrdInput (+11 more)

### Community 48 - "Community 48"
Cohesion: 0.17
Nodes (3): resolveBaseBranch(), ProjectConfig, Store

### Community 49 - "Slot State"
Cohesion: 0.11
Nodes (13): setup(), PROJECT_ROOT, NOTE: PRD generation holds the request open up to ~120s (REFORMULATE_TIMEOUT_MS), RunningServer, serveStaticAsset(), SocketData, startServer(), StartServerOptions (+5 more)

### Community 50 - "Stats Hooks & Cards"
Cohesion: 0.35
Nodes (4): log, runRecordedAction(), ExecutionRun, ExecutionUsageByModel

### Community 52 - "chart.tsx"
Cohesion: 0.16
Nodes (12): ChartConfig, ChartContainer, ChartContainerProps, ChartContext, ChartContextValue, ChartLegendContent(), ChartLegendContentProps, ChartTooltipContent() (+4 more)

### Community 53 - "User Terminal Manager"
Cohesion: 0.33
Nodes (5): CONTEXT — domain glossary, Execution, Proposed (not yet built), Seams, Work items

### Community 54 - "Community 54"
Cohesion: 0.10
Nodes (23): ColumnActionsMenu(), ColumnActionsMenuProps, ColumnMenuItem, sessionOf(), SlotsBar(), SlotsBarProps, Stat(), StatProps (+15 more)

### Community 55 - "App.tsx"
Cohesion: 0.11
Nodes (21): AUTOMATION_TRIGGER_LABELS, AUTOMATION_TRIGGERS, CreateAutomationInput, AutomationCard(), AutomationCardProps, AutomationForm(), AutomationFormProps, AutomationView() (+13 more)

### Community 56 - "CSV Parsing"
Cohesion: 0.33
Nodes (4): mapTicketRow(), parseSessionUsage(), StatRecord, UseStatsResult

### Community 57 - "Community 57"
Cohesion: 0.31
Nodes (10): boot(), externalUrlFromNewWindowEvent(), forwardAtelierShortcut(), installApplicationMenu(), installMenuShortcutBridge(), menuShortcutActionSchema, newWindowEventSchema, resolveRoots() (+2 more)

### Community 59 - "Webhook MCP"
Cohesion: 0.11
Nodes (25): App(), HOME_VIEW_OPTIONS, HomeView, loadCollapsed(), NAV_ENTRIES, NavEntry, Sidebar(), SidebarProps (+17 more)

### Community 60 - "Package Manifest"
Cohesion: 0.07
Nodes (44): isProcessing(), ACTIVE_STAGES, AGENT_EFFORT_LABELS, AGENT_MODEL_LABELS, AUTOMATION_RUN_STATUSES, CODEX_EFFORT_LABELS, CODEX_MODEL_EFFORTS, CODEX_MODEL_LABELS (+36 more)

### Community 61 - "splitManager.ts"
Cohesion: 0.18
Nodes (11): CreateProjectInput, ManagedProject, UpdateProjectInput, AddProjectForm(), AddProjectFormProps, isPositiveIntegerString(), isValidDraft(), ProjectFieldsProps (+3 more)

### Community 62 - "TicketCard.tsx"
Cohesion: 0.07
Nodes (29): ProjectInUseError, agentPairError(), isBlocked(), isSplitMother(), jsonError(), log, isAllowedAgentPair(), analyzeTicketsSchema (+21 more)

### Community 63 - "Community 63"
Cohesion: 0.08
Nodes (6): setup(), startParentSession(), renderChannelEvent(), SessionHub, SessionHubHandlers, SessionStartCallbacks

### Community 64 - "Composer Run Script"
Cohesion: 0.23
Nodes (8): canonicalJson(), CodexCommandHook, codexSessionPreToolUseHookHash(), JsonValue, createCodexProvider(), AppServerFixtureOptions, options(), RecordedRequest

### Community 65 - "migration.ts"
Cohesion: 0.18
Nodes (6): CodexAppServerConnection, CodexProviderDependencies, createCodexAgentSession(), inheritedMcpServerNames(), PreparedHook, prepareSkills()

### Community 66 - "OpenPr"
Cohesion: 0.08
Nodes (5): createLogger(), SystemAdapter, log, UserTerminalManager, TerminalDescriptor

### Community 67 - "WorkflowView.tsx"
Cohesion: 0.17
Nodes (11): Claude Code skills (real mode), Codex agents (optional), Desktop app (macOS, optional), Development, Electrobun dev on a new machine, Environment variables, Getting started, Real mode (+3 more)

### Community 68 - "CLAUDE.md Doc"
Cohesion: 0.09
Nodes (27): DEFAULT_MODELS, AttachExecutionSessionInput, EnqueueAgentMessageInput, FinalizeExecutionInput, MarkAgentMessageAcceptedInput, MarkAgentMessageReceivedInput, MarkAgentMessageRejectedInput, NewProject (+19 more)

### Community 69 - "fake.ts"
Cohesion: 0.40
Nodes (4): MIME_EXTENSIONS, resolveExtension(), SavedUpload, saveUpload()

### Community 70 - "logger.ts"
Cohesion: 0.33
Nodes (8): COLUMN_ORDER, COLUMNS, Board(), BoardProps, isColumn(), isLocked(), normalize(), ConfirmDialog()

### Community 71 - "PostCSS Config"
Cohesion: 0.29
Nodes (6): name, overrides, zod, private, type, version

### Community 72 - "Community 72"
Cohesion: 0.09
Nodes (22): CapabilityCache, threadConfig(), accountResponseSchema, hasExplicitCodexApiKey(), isProtocolIncompatibility(), listRuntimeModels(), modelListResponseSchema, modelSchema (+14 more)

### Community 73 - "React Root Mount"
Cohesion: 0.33
Nodes (6): RFC-4180, CsvParseError, normalizeHeader(), ParsedTicketRow, ParsedTicketsCsv, parseTicketsCsv()

### Community 74 - "Theme Flash Guard"
Cohesion: 0.33
Nodes (6): DRY_RUN_VERDICT, FeasibilityGroup, log, QueuedFeasibility, toTriageResult(), FeasibilityResult

### Community 75 - "Community 75"
Cohesion: 0.40
Nodes (5): CodexBinaryVersionError, require, resolveCodexBinary(), resolveCodexBinaryOverride(), TARGETS

### Community 76 - "usePrdSearch.ts"
Cohesion: 0.17
Nodes (14): costByFamily(), costOf(), costOfModel(), costOfSessions(), CostSummary, FamilyPricing, ModelFamily, normalizeModel() (+6 more)

### Community 78 - "useTerminalShortcuts.ts"
Cohesion: 0.44
Nodes (10): buildContractConstraintsLines(), buildResponseFormatLines(), buildStrictRulesLines(), buildTicketLines(), buildTriageChannelPrompt(), buildTriagePlusChannelPrompt(), isEnglish(), readOnlyFramingLines() (+2 more)

### Community 79 - "WorktreeSession"
Cohesion: 0.33
Nodes (3): listeners, mcp, ReplyArgsSchema

### Community 80 - "Community 80"
Cohesion: 0.11
Nodes (15): WsClientEvent, wsClientEventSchema, active, ensureNotificationPermission(), getAudioContext(), isSupported(), loadSoundBuffer(), playBuffer() (+7 more)

### Community 87 - "prd.ts"
Cohesion: 0.11
Nodes (25): ExecutionFinishStatus, LiveSession, log, PendingSessionMessage, previewToolInput(), renderSessionEvent(), SessionExecutionContext, SessionExecutionFinish (+17 more)

### Community 91 - "reformulate.ts"
Cohesion: 0.18
Nodes (4): DelegationManager, reviewKey(), mergeAgentUsageByModel(), ReviewKind

### Community 92 - "ProjectConfig"
Cohesion: 0.12
Nodes (12): FailedReformulation, ActionSystem, dryRunLog, FAKE_OPEN_PRS, fakeEncoder, hexToBytes(), GitWorktreeAddOptions, ImportNotionOptions (+4 more)

### Community 93 - "FakePaneStream"
Cohesion: 0.05
Nodes (30): log, SlotWatch, WorktreeAddressWatcher, projectConfigSchema, SLOTS_ROOT, ANSI, COLOR_ENABLED, isLevel() (+22 more)

### Community 95 - "TicketConfigSummary.tsx"
Cohesion: 0.50
Nodes (3): appBundle, EMBEDDED_BINARIES, resourcesApp

### Community 97 - "Backend (routes tool calls, verifies gates)"
Cohesion: 0.67
Nodes (3): mergePaths(), PATH_PROBE_COMMAND, repairPath()

### Community 100 - "coordinator.ts"
Cohesion: 0.06
Nodes (35): log, ToolHandler, ToolResult, workerToolsForRole(), TRIAGE_VERDICTS, AgentSettableStage, agentSettableStageSchema, askUserArgsSchema (+27 more)

### Community 139 - "performSplit"
Cohesion: 0.15
Nodes (15): Block, blockText(), compactChunks(), firstCharCode(), TranscriptBuffer, trimBlockStart(), AgentStreamBlock, applyTranscriptUpdate() (+7 more)

### Community 140 - "notifications.ts"
Cohesion: 0.50
Nodes (5): ThroughputChart(), nextWeek(), startOfWeek(), WEEK_LABEL_FORMATTER, weeklyThroughput

### Community 142 - "TicketCost.tsx"
Cohesion: 0.26
Nodes (11): isCodexFastServiceTier(), summarizeSessionCosts(), tokenBreakdownOf(), totalTokensOfSessions(), executionCosts(), executionTokens(), projectStatRecord(), TicketCost() (+3 more)

### Community 144 - ".handleMessage"
Cohesion: 0.39
Nodes (4): OpenPr, PrSelectRow(), PrSelectRowProps, isPrNeedsAttention()

### Community 145 - "Profile"
Cohesion: 0.48
Nodes (3): mapProfileRow(), nullableBooleanValue(), Profile

### Community 147 - ".addComment"
Cohesion: 0.12
Nodes (12): cleanDescription(), createApiRoutes(), createSplitChildren(), dependencyError(), isWebOnlyPath(), PaneReader, performSplit(), reviewDescription() (+4 more)

### Community 149 - "SplitManager"
Cohesion: 0.29
Nodes (6): buildSplitSessionConfig(), DRY_RUN_RESULT, log, PendingSplit, SplitManager, SplitResult

## Knowledge Gaps
- **530 isolated node(s):** `What this is`, `Commands`, `graphify`, `The dry-run safety model — read before running anything`, `Architecture` (+525 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **31 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `SystemAdapter` connect `OpenPr` to `Board Columns`, `Feasibility Batch Management`, `Runtime Dependencies`, `Fake System Adapter`, `Agent Profile Config`, `Settings & Profiles UI`, `Demo Pipeline Concepts`, `Coordinator & Protocol`, `Stats Aggregation`, `.handleMessage`, `Community 51`, `prd.ts`, `Dev Dependencies`, `TypeScript Config`, `Cost & Pricing`, `reformulate.ts`, `ProjectConfig`, `Community 63`?**
  _High betweenness centrality (0.071) - this node is a cross-community bridge._
- **Why does `Ticket` connect `Coordinator & Protocol` to `Contract Building & Slots`, `Terminals UI & Notifications`, `Desktop Bootstrap & Menus`, `Fake System Adapter`, `PR Selection & Slots Bar`, `Core Domain Concepts`, `TicketCost.tsx`, `ProjectConfig`, `DB Row Schemas & Mappers`, `Dev Dependencies`, `reformulate.ts`, `Cost & Pricing`, `User Terminal & Fake IO`, `Board Columns`, `NPM Scripts`, `Demo Pipeline Concepts`, `Modal Dialogs`, `Community 48`, `Stats Hooks & Cards`, `Community 51`, `Webhook MCP`, `Package Manifest`, `TicketCard.tsx`, `OpenPr`, `CLAUDE.md Doc`, `logger.ts`, `Theme Flash Guard`, `useTerminalShortcuts.ts`, `Community 80`, `reformulate.ts`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **Why does `Store` connect `Community 48` to `Feasibility Batch Management`, `Fake System Adapter`, `Shared Zod Schemas`, `PR Selection & Slots Bar`, `Core Domain Concepts`, `Coordinator & Protocol`, `ProjectConfig`, `TicketCost.tsx`, `Profile`, `.addComment`, `SplitManager`, `DB Row Schemas & Mappers`, `Dev Dependencies`, `Cost & Pricing`, `Board Columns`, `NPM Scripts`, `Runtime Dependencies`, `Agent Profile Config`, `Demo Pipeline Concepts`, `Slot State`, `Stats Hooks & Cards`, `Community 51`, `CSV Parsing`, `TicketCard.tsx`, `Community 63`, `OpenPr`, `CLAUDE.md Doc`, `Theme Flash Guard`, `prd.ts`, `reformulate.ts`, `ProjectConfig`, `FakePaneStream`, `slotManager.ts`, `coordinator.ts`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `createApiRoutes()` (e.g. with `isWebOnlyPath()` and `.onEvent()`) actually correct?**
  _`createApiRoutes()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `What this is`, `Commands`, `graphify` to the rest of the system?**
  _534 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Contract Building & Slots` be split into smaller, more focused modules?**
  _Cohesion score 0.04440333024976873 - nodes in this community are weakly interconnected._
- **Should `Terminals UI & Notifications` be split into smaller, more focused modules?**
  _Cohesion score 0.05432595573440644 - nodes in this community are weakly interconnected._