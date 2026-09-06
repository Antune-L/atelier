# Graph Report - kanban-agents  (2026-09-06)

## Corpus Check
- 226 files · ~702,861 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2393 nodes · 6745 edges · 122 communities (92 shown, 30 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 47 edges (avg confidence: 0.69)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8b91fca7`
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
- useTickTimer.ts
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
- codexHookTrust.ts
- prd.ts
- Community 89
- Community 90
- reformulate.ts
- ProjectConfig
- FakePaneStream
- .addComment
- TicketConfigSummary.tsx
- useTickTimer.ts
- RunningServer
- oneShotSession.ts
- .addComment
- coordinator.ts
- RealPaneStream
- reformulate.ts
- Composer 2.5 path (run_composer.sh)
- isNotionUrl
- profileMatching.test.ts
- FakePaneStream
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
- performSplit

## God Nodes (most connected - your core abstractions)
1. `Store` - 119 edges
2. `SystemAdapter` - 72 edges
3. `createApiRoutes()` - 71 edges
4. `Ticket` - 66 edges
5. `FakeSystemAdapter` - 61 edges
6. `RealSystemAdapter` - 56 edges
7. `cn()` - 52 edges
8. `SlotManager` - 49 edges
9. `SessionHub` - 46 edges
10. `ClientHub` - 42 edges

## Surprising Connections (you probably didn't know these)
- `main()` --calls--> `assertCodexDowngradeSafe()`  [EXTRACTED]
  scripts/downgrade-codex-catalog.ts → src/server/db/schema.ts
- `main()` --calls--> `migrateCodexCatalog()`  [EXTRACTED]
  scripts/downgrade-codex-catalog.ts → src/server/db/schema.ts
- `TriageSessionInput` --references--> `Orchestrator`  [EXTRACTED]
  src/server/agents/sessionConfig.ts → src/shared/constants.ts
- `SplitSessionInput` --references--> `Orchestrator`  [EXTRACTED]
  src/server/agents/sessionConfig.ts → src/shared/constants.ts
- `FeasibilitySessionInput` --references--> `Orchestrator`  [EXTRACTED]
  src/server/agents/sessionConfig.ts → src/shared/constants.ts

## Import Cycles
- 3-file cycle: `src/server/config.ts -> src/server/db/store.ts -> src/server/db/rows.ts -> src/server/config.ts`
- 3-file cycle: `src/server/agents/worktreeAddresses.ts -> src/server/config.ts -> src/server/db/store.ts -> src/server/agents/worktreeAddresses.ts`

## Communities (122 total, 30 thin omitted)

### Community 0 - "Contract Building & Slots"
Cohesion: 0.04
Nodes (67): ActionExecutionOptions, actionExecutionOptionsSchema, agentMessageSchema, AnalyzeTicketsInput, appSettingsSchema, automationRunSchema, automationSchema, baseBranchSchema (+59 more)

### Community 1 - "Terminals UI & Notifications"
Cohesion: 0.06
Nodes (56): AgentCard(), AgentCardProps, AgentsView(), AgentsViewProps, hasLiveAgent(), normalize(), BoardColumn(), BoardColumnProps (+48 more)

### Community 2 - "Desktop Bootstrap & Menus"
Cohesion: 0.11
Nodes (44): ProjectInfo, AskPanel(), AskPanelProps, CleanPrPanel(), CleanPrPanelProps, ImportTicketsPanel(), ImportTicketsPanelProps, NewTicketDialog() (+36 more)

### Community 3 - "Feasibility Batch Management"
Cohesion: 0.38
Nodes (6): ATTENTION_STATUSES, sessionOf(), SlotPips(), SlotPipsProps, STATUS_LABELS, STATUS_PIP_CLASSES

### Community 4 - "Ticket Action Panels"
Cohesion: 0.05
Nodes (52): WsClientEvent, wsClientEventSchema, groupOrientation(), layoutToSizes(), panelId(), panelPercent(), SplitTree(), SplitTreeProps (+44 more)

### Community 5 - "Fake System Adapter"
Cohesion: 0.08
Nodes (26): log, SlotWatch, WorktreeAddressWatcher, runFirstBootSetup(), applyAppSettingsToModels(), DEFAULT_MODELS, initProjectRegistry(), listProjectKeys() (+18 more)

### Community 6 - "Shared Zod Schemas"
Cohesion: 0.18
Nodes (17): backfillOrchestrator(), createDatabase(), EXECUTION_MIGRATIONS, hasColumn(), insertProfile(), migrate(), PROFILE_MIGRATIONS, REVIEW_PASS_MIGRATIONS (+9 more)

### Community 7 - "Settings & Profiles UI"
Cohesion: 0.09
Nodes (3): delay(), fakeShellPrompt(), FakeSystemAdapter

### Community 8 - "PR Selection & Slots Bar"
Cohesion: 0.10
Nodes (22): AttachExecutionSessionInput, EnqueueAgentMessageInput, FinalizeExecutionInput, MarkAgentMessageAcceptedInput, MarkAgentMessageReceivedInput, MarkAgentMessageRejectedInput, NewProject, persistedReviewFindingsSchema (+14 more)

### Community 9 - "Real System Adapter"
Cohesion: 0.08
Nodes (27): AgentDefaultsSettings(), AppearanceSettings(), CODEX_STATUS_TONES, COMMIT_ROW, DefaultsRowSpec, EFFORT_OPTIONS, FEASIBILITY_ROW, IMPLEMENTATION_ROW (+19 more)

### Community 10 - "Slot Config & Worktree Watch"
Cohesion: 0.20
Nodes (31): ExecutionOverrides, ProjectKey, AutomationPatch, NewAsk, NewAutomation, NewClean, NewProfile, NewReview (+23 more)

### Community 11 - "Core Domain Concepts"
Cohesion: 0.04
Nodes (48): agentMessageRowSchema, AutomationRow, automationRowSchema, AutomationRunRow, automationRunRowSchema, buildScripts(), CommentRow, commentRowSchema (+40 more)

### Community 12 - "Board & Sidebar Layout"
Cohesion: 0.10
Nodes (29): CodexAgentFields(), CodexConnectionStatus(), STATUS_LABELS, ImplementationAgentFields(), ProvidersSettings(), loadCapabilities(), publish(), refreshCapabilities() (+21 more)

### Community 14 - "Coordinator & Protocol"
Cohesion: 0.16
Nodes (5): addUsageByModel(), toUsageByModel(), TicketLifecycle, ACTIVE_STAGES, Ticket

### Community 15 - "API Routes & Reformulate"
Cohesion: 0.11
Nodes (26): isPositiveIntegerString(), isValidDraft(), ProjectListRow(), ProjectListRowProps, ProjectPanel(), ProjectPanelProps, ProjectsSettings(), referenceCommitTimeout() (+18 more)

### Community 16 - "Stats Aggregation"
Cohesion: 0.07
Nodes (6): directories, extractPrUrl(), RealSystemAdapter, safeJsonParse(), DoneGateResult, ReviewDoneOptions

### Community 17 - "Triage & Server Hub"
Cohesion: 0.08
Nodes (25): devDependencies, autoprefixer, class-variance-authority, clsx, concurrently, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities (+17 more)

### Community 18 - "Live Terminal Views"
Cohesion: 0.16
Nodes (10): initializeParamsSchema, log, requestSchema, rpcError(), rpcResult(), rpcResponseSchema, toolCallParamsSchema, WorkerMcpHandlers (+2 more)

### Community 19 - "Stage Progress & Display"
Cohesion: 0.08
Nodes (24): compilerOptions, allowImportingTsExtensions, baseUrl, esModuleInterop, isolatedModules, jsx, lib, module (+16 more)

### Community 20 - "Real Adapter GH/Composer"
Cohesion: 0.09
Nodes (33): FAILURE_COLUMNS, Kind, KINDS, SUCCESS_COLUMNS, CodexTierSummary(), DurationChart(), OutcomeChart(), SuccessRateChart() (+25 more)

### Community 21 - "Store Types & Agent Knobs"
Cohesion: 0.12
Nodes (12): CodexAppServerInitializationError, CodexAppServerProtocolError, CodexAppServerRpcError, connectCodexAppServer(), errorMessage(), incomingSchema, initializeResponseSchema, PendingRequest (+4 more)

### Community 22 - "DB Row Schemas & Mappers"
Cohesion: 0.21
Nodes (8): FailedReformulation, ActionSystem, AgentSessionEvent, ensureClaudeBinary(), toSdkEffort(), ImportNotionOptions, ReformulateOptions, RunAutomationOptions

### Community 23 - "Dev Dependencies"
Cohesion: 0.10
Nodes (25): StatRecord, TabButton(), PrSelectRow(), StatCard(), StatCardProps, StatsView(), StatsViewProps, TICKET_OPTION (+17 more)

### Community 24 - "TypeScript Config"
Cohesion: 0.15
Nodes (16): bashCommandSchema, buildSettings(), claudeProvider, createSdkAgentSession(), denyNoVerifyHook(), dispatchClaudeMessage(), HIDDEN_COMMIT_ATTRIBUTION, pumpStream() (+8 more)

### Community 25 - "Client Hub & Watchdog"
Cohesion: 0.13
Nodes (17): PrdAnnotator(), ABSOLUTE_UPLOAD_PATH, ImageLightboxProps, LightboxImage, Markdown(), MarkdownProps, OPEN_KEYS, purifier (+9 more)

### Community 26 - "Cost & Pricing"
Cohesion: 0.09
Nodes (20): CLAUDE_JSON_PATH, COMPOSER_BINARIES, detectInstallCommand(), ghPrSchema, ghPrStateSchema, ghReviewSchema, ghReviewsSchema, INSTALL_COMMANDS (+12 more)

### Community 27 - "Workflow View & Lifecycle"
Cohesion: 0.06
Nodes (26): Architecture, Commands, Conventions (enforced — beyond the global ones in ~/.claude/CLAUDE.md), graphify, The dry-run safety model — read before running anything, What this is, Agent runtime (Agent SDK), Architecture (+18 more)

### Community 28 - "Stats Charts"
Cohesion: 0.07
Nodes (32): AgentMcpServerDefinition, agentMessageDeltaSchema, agentToml(), buildMcpServers(), ConfigObject, configReadResponseSchema, ConfigValue, describeCodexError() (+24 more)

### Community 30 - "Agents View & Ticket Cards"
Cohesion: 0.10
Nodes (25): ActiveReview, ActiveReviewPass, assertExecutionAvailable(), CODEX_LAUNCH_STATUS_MESSAGES, CodexCapabilityReader, ExecutionDefaults, FEASIBILITY_ENGINE_EXECUTION, ResolvedExecution (+17 more)

### Community 32 - "User Terminal & Fake IO"
Cohesion: 0.09
Nodes (28): BASH_ALLOWLIST, buildFeasibilitySessionConfig(), buildImplementSessionConfig(), buildSplitSessionConfig(), buildTriageSessionConfig(), CODEX_READONLY_TOOLS, codexKnobs(), CONTRACT_SKILLS (+20 more)

### Community 33 - "Logging"
Cohesion: 0.10
Nodes (21): scripts, build:desktop, build:web, dev, dev:desktop, dev:proxy, dev:server, dev:web (+13 more)

### Community 34 - "Board Columns"
Cohesion: 0.17
Nodes (12): FULL_REVIEW_KINDS, LIGHT_REVIEW_KINDS, log, REVIEW_DISALLOWED_TOOLS, REVIEW_TOOLS, reviewPrompt(), ReviewResult, verificationPrompt() (+4 more)

### Community 35 - "NPM Scripts"
Cohesion: 0.19
Nodes (3): AgentCoordinator, SessionToolCall, mapTicketRow()

### Community 36 - "Runtime Dependencies"
Cohesion: 0.22
Nodes (5): dedupeFindings(), requiredReviewKinds(), mapReviewApprovalRow(), mapReviewPassRow(), parsePersistedReviewFindings()

### Community 37 - "Claude SDK Provider"
Cohesion: 0.10
Nodes (21): dependencies, @anthropic-ai/claude-agent-sdk, dompurify, elysia, @fontsource/ibm-plex-mono, @fontsource/ibm-plex-sans, marked, @modelcontextprotocol/sdk (+13 more)

### Community 38 - "Agent Profile Config"
Cohesion: 0.14
Nodes (7): AutomationManager, log, mapAutomationRow(), mapAutomationRunRow(), AutomationRunStatus, Automation, AutomationRun

### Community 39 - "Agent Coordinator Handlers"
Cohesion: 0.10
Nodes (27): artifactPath, assertPackageVersionInSync(), assertSdkVersionsInSync(), BUILT_DMG, ELECTROBUN_BIN, fail(), installedPackageVersion(), RELEASE_FOLDER (+19 more)

### Community 40 - "API Client Inputs"
Cohesion: 0.12
Nodes (18): AUTOMATION_TRIGGER_LABELS, AUTOMATION_TRIGGERS, CreateAutomationInput, AutomationCard(), AutomationCardProps, AutomationFormProps, AutomationView(), EMPTY_FORM (+10 more)

### Community 41 - "Ticket Config & Constants"
Cohesion: 0.18
Nodes (5): CodexAppServerConnection, CodexAppServerOptions, CodexProviderDependencies, AppServerFixture, CodexRuntimeDependencies

### Community 43 - "Demo Pipeline Concepts"
Cohesion: 0.31
Nodes (5): DRY_RUN_RESULT, log, PendingSplit, SplitManager, SplitResult

### Community 44 - "Chart Primitives"
Cohesion: 0.33
Nodes (9): useTheme(), UseThemeResult, applyTheme(), getStoredTheme(), isTheme(), Theme, ThemeOption, THEMES (+1 more)

### Community 45 - "Session Hub Transcript"
Cohesion: 0.11
Nodes (21): StatEmpty(), ACTIVE_BAR, AREA_CURSOR, AXIS_PROPS, BAR_CURSOR, CHART_PALETTE, colorAt(), CostSummary() (+13 more)

### Community 46 - "Community 46"
Cohesion: 0.27
Nodes (15): Agent Implementation Config, Argus Code Review, Automated Tests (typecheck/lint/test), Claude Code Autonomous Agent, Ticket Contract Injection, Feasibility Analysis, Kanban Board (Atelier), Kanban Agents Demo (demo.gif) (+7 more)

### Community 47 - "Modal Dialogs"
Cohesion: 0.10
Nodes (30): TERMINAL_STAGES, PrdReviewDialog(), PrdReviewDialogProps, QuitConfirmModal(), QuitConfirmModalProps, TerminalsView(), TerminalsViewProps, AUTHOR_BADGES (+22 more)

### Community 48 - "Community 48"
Cohesion: 0.11
Nodes (10): cleanDescription(), createApiRoutes(), dependencyError(), isBlocked(), isProcessing(), isSplitMother(), isWebOnlyPath(), PaneReader (+2 more)

### Community 49 - "Slot State"
Cohesion: 0.12
Nodes (17): log, ReformulateManager, codexImplementerKnobs(), assertCodexImplementerAvailable(), log, ReclaimOutcome, SETUP_PHASES, SlotManagerConfig (+9 more)

### Community 50 - "Stats Hooks & Cards"
Cohesion: 0.10
Nodes (8): mapAgentMessageRow(), mapExecutionRunRow(), SqlUpdateBuilder, Store, runRecordedAction(), AgentMessage, ExecutionRun, ExecutionUsageByModel

### Community 51 - "Community 51"
Cohesion: 0.15
Nodes (7): slotPath(), mapSlotRow(), mapWorktreeSessionRow(), enrichWorktreeSession(), Slot, WorktreeSession, BoardState

### Community 52 - "chart.tsx"
Cohesion: 0.16
Nodes (12): ChartConfig, ChartContainer, ChartContainerProps, ChartContext, ChartContextValue, ChartLegendContent(), ChartLegendContentProps, ChartTooltipContent() (+4 more)

### Community 53 - "User Terminal Manager"
Cohesion: 0.33
Nodes (5): CONTEXT — domain glossary, Execution, Proposed (not yet built), Seams, Work items

### Community 54 - "Community 54"
Cohesion: 0.28
Nodes (11): AppSettingsState, flashSaved(), loadOnce(), patchAppSettings(), publish(), snapshot(), state, subscribe() (+3 more)

### Community 55 - "App.tsx"
Cohesion: 0.15
Nodes (12): resolveBaseBranch(), buildAskContract(), buildCleanContract(), buildConflictResolutionContract(), groupFeasibilityTickets(), resolveTemplatePaths(), TemplatePaths, computeWorktreeAddresses() (+4 more)

### Community 56 - "CSV Parsing"
Cohesion: 0.38
Nodes (6): slugify(), createSplitChildren(), failSplitMother(), performSplit(), splitChildDefaults(), splitMotherBranch()

### Community 57 - "Community 57"
Cohesion: 0.16
Nodes (18): applyDesktopEnv(), DesktopRoots, ensureConfig(), boot(), externalUrlFromNewWindowEvent(), forwardAtelierShortcut(), installApplicationMenu(), installMenuShortcutBridge() (+10 more)

### Community 60 - "Package Manifest"
Cohesion: 0.07
Nodes (32): AGENT_EFFORT_FULL_LABELS, AGENT_EFFORT_LABELS, AGENT_MODEL_FULL_LABELS, AGENT_MODEL_LABELS, AUTOMATION_RUN_STATUSES, CODEX_EFFORT_FULL_LABELS, CODEX_EFFORT_LABELS, CODEX_MODEL_LABELS (+24 more)

### Community 61 - "splitManager.ts"
Cohesion: 0.38
Nodes (6): Column, COLUMN_NODE_COLOR, depthOf(), truncate(), WorkflowView(), WorkflowViewProps

### Community 62 - "TicketCard.tsx"
Cohesion: 0.06
Nodes (31): buildNotionImportPrompt(), buildPrdPrompt(), ProjectInUseError, agentPairError(), jsonError(), log, isAllowedAgentPair(), analyzeTicketsSchema (+23 more)

### Community 64 - "Composer Run Script"
Cohesion: 0.14
Nodes (10): CodexAppServerNotification, canonicalJson(), CodexCommandHook, codexSessionPreToolUseHookHash(), JsonValue, createCodexProvider(), AppServerFixtureOptions, options() (+2 more)

### Community 65 - "split.ts"
Cohesion: 0.10
Nodes (40): buildFeasibilityBatchContract(), buildFeasibilityContextSection(), buildImplementingSteps(), buildMockupReviewStep(), buildPlanningStep(), buildPrdBullet(), buildReviewContract(), buildReviewFixLines() (+32 more)

### Community 66 - "OpenPr"
Cohesion: 0.10
Nodes (9): PaneStream, dataMessage(), normalizeSeed(), safeParse(), send(), TerminalSession, TerminalSessionManager, visibleText() (+1 more)

### Community 67 - "UserTerminalManager"
Cohesion: 0.40
Nodes (5): MIME_EXTENSIONS, resolveExtension(), SavedUpload, saveUpload(), serveUpload()

### Community 68 - "schema.test.ts"
Cohesion: 0.27
Nodes (5): createdPaths, reserveDbPath(), paths, removeDbFiles(), tmpDbPath()

### Community 69 - "contract.test.ts"
Cohesion: 0.29
Nodes (8): cleanTicket(), conflictTicket(), REVIEW_OPTS, reviewTicket(), TICKET_OPTS, BASE_TICKET, makeTicket(), ticketSchema

### Community 71 - "PostCSS Config"
Cohesion: 0.29
Nodes (6): name, overrides, zod, private, type, version

### Community 72 - "App.tsx"
Cohesion: 0.24
Nodes (8): App(), HOME_VIEW_OPTIONS, HomeView, NAV_ENTRIES, NavEntry, Sidebar(), SidebarProps, SidebarView

### Community 73 - "useTickTimer.ts"
Cohesion: 0.39
Nodes (7): currentNow, getSnapshot(), startTicking(), stopTicking(), subscribe(), subscribers, useTickTimer()

### Community 74 - "codexBinary.ts"
Cohesion: 0.42
Nodes (7): bestInstalledMatch(), compareParts(), envWithProjectNode(), nvmNodeBinDir(), readNvmrc(), prepareProjectShell(), shellLiteral()

### Community 75 - "FakePaneStream"
Cohesion: 0.11
Nodes (27): DragHandleAttributes, DragHandleListeners, ProfileRow(), ProfileRowHeader(), ProfileRowHeaderProps, ProfileRowProps, ProfilesSettings(), NOTE: the saved flag lives here because a saved row remounts (its key carries up (+19 more)

### Community 76 - "usePrdSearch.ts"
Cohesion: 0.12
Nodes (26): isCodexFastServiceTier(), costByFamily(), costOf(), costOfModel(), costOfSessions(), CostSummary, FamilyPricing, ModelFamily (+18 more)

### Community 78 - "csv.ts"
Cohesion: 0.33
Nodes (6): RFC-4180, CsvParseError, normalizeHeader(), ParsedTicketRow, ParsedTicketsCsv, parseTicketsCsv()

### Community 79 - "WorktreeSession"
Cohesion: 0.33
Nodes (3): listeners, mcp, ReplyArgsSchema

### Community 80 - "Community 80"
Cohesion: 0.12
Nodes (21): threadConfig(), accountResponseSchema, hasExplicitCodexApiKey(), isProtocolIncompatibility(), listRuntimeModels(), modelListResponseSchema, modelSchema, probeCodexRuntime() (+13 more)

### Community 81 - ".handleMessage"
Cohesion: 0.34
Nodes (13): ProfilePipeline(), buildProfilePipeline(), claudeDetail(), claudeSubagentDetail(), codexOrchestratorDetail(), codexSubagentParts(), implementerNodeValue(), implementerSummary() (+5 more)

### Community 86 - "codexHookTrust.ts"
Cohesion: 0.25
Nodes (4): createCodexAgentSession(), inheritedMcpServerNames(), PreparedHook, prepareSkills()

### Community 87 - "prd.ts"
Cohesion: 0.13
Nodes (26): ActiveDelegation, ClosableExecution, ExecutionFinishStatus, LiveSession, log, PendingSessionMessage, previewToolInput(), renderChannelEvent() (+18 more)

### Community 89 - "Community 89"
Cohesion: 0.43
Nodes (6): main(), scalar(), assertCodexDowngradeSafe(), countRows(), migrateCodexCatalog(), recordConfigurationMigration()

### Community 90 - "Community 90"
Cohesion: 0.48
Nodes (3): mapProfileRow(), nullableBooleanValue(), Profile

### Community 91 - "reformulate.ts"
Cohesion: 0.23
Nodes (4): DelegationManager, reviewKey(), setup(), ReviewKind

### Community 92 - "ProjectConfig"
Cohesion: 0.14
Nodes (9): dryRunLog, FAKE_OPEN_PRS, fakeEncoder, hexToBytes(), GitWorktreeAddOptions, PaneSize, SpawnShellOptions, OpenPr (+1 more)

### Community 93 - "FakePaneStream"
Cohesion: 0.15
Nodes (5): Logger, paint(), ScopedLogger, serializeFields(), timestamp()

### Community 94 - ".addComment"
Cohesion: 0.40
Nodes (5): CodexBinaryVersionError, require, resolveCodexBinary(), resolveCodexBinaryOverride(), TARGETS

### Community 95 - "TicketConfigSummary.tsx"
Cohesion: 0.50
Nodes (3): appBundle, EMBEDDED_BINARIES, resourcesApp

### Community 97 - "RunningServer"
Cohesion: 0.07
Nodes (28): Watchdog, log, PROJECT_ROOT, NOTE: PRD generation holds the request open up to ~120s (REFORMULATE_TIMEOUT_MS), RunningServer, serveStaticAsset(), SocketData, startServer() (+20 more)

### Community 99 - ".addComment"
Cohesion: 0.50
Nodes (3): mapCommentRow(), CommentAuthor, Comment

### Community 100 - "coordinator.ts"
Cohesion: 0.07
Nodes (34): log, ToolHandler, ToolResult, Stage, TRIAGE_VERDICTS, AgentSettableStage, agentSettableStageSchema, askUserArgsSchema (+26 more)

### Community 103 - "Composer 2.5 path (run_composer.sh)"
Cohesion: 0.09
Nodes (15): AckSystem, CHILD_USAGE, FULL_REVIEW_KINDS, LIGHT_REVIEW_KINDS, RecordedSession, RecordingSystemAdapter, sleep(), startAndApproveReviews() (+7 more)

### Community 109 - "Board.tsx"
Cohesion: 0.16
Nodes (15): ACTIVE_COLUMNS, Board(), BoardProps, isColumn(), isLocked(), normalize(), TERMINAL_COLUMNS, DEFAULT_OPEN (+7 more)

### Community 139 - "performSplit"
Cohesion: 0.08
Nodes (30): Block, blockText(), compactChunks(), firstCharCode(), TranscriptBuffer, trimBlockStart(), AgentStreamBlock, terminalServerMessageSchema (+22 more)

## Knowledge Gaps
- **559 isolated node(s):** `name`, `version`, `private`, `type`, `dev` (+554 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **30 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Store` connect `Stats Hooks & Cards` to `Fake System Adapter`, `PR Selection & Slots Bar`, `Core Domain Concepts`, `Coordinator & Protocol`, `Agents View & Ticket Cards`, `PRD Review & Markdown`, `Board Columns`, `NPM Scripts`, `Runtime Dependencies`, `Agent Profile Config`, `Demo Pipeline Concepts`, `Community 48`, `Slot State`, `Community 51`, `TicketCard.tsx`, `split.ts`, `schema.test.ts`, `contract.test.ts`, `usePrdSearch.ts`, `prd.ts`, `Community 90`, `reformulate.ts`, `RunningServer`, `.addComment`, `coordinator.ts`, `Composer 2.5 path (run_composer.sh)`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **Why does `Ticket` connect `Coordinator & Protocol` to `Contract Building & Slots`, `Desktop Bootstrap & Menus`, `Ticket Action Panels`, `PR Selection & Slots Bar`, `Core Domain Concepts`, `Session Hub & Agent Session`, `Agents View & Ticket Cards`, `PRD Review & Markdown`, `User Terminal & Fake IO`, `Board Columns`, `NPM Scripts`, `Modal Dialogs`, `Slot State`, `Community 51`, `App.tsx`, `triageManager.ts`, `Package Manifest`, `splitManager.ts`, `TicketCard.tsx`, `split.ts`, `contract.test.ts`, `usePrdSearch.ts`, `reformulate.ts`, `reformulate.ts`, `Composer 2.5 path (run_composer.sh)`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Why does `SystemAdapter` connect `PRD Review & Markdown` to `Settings & Profiles UI`, `Stats Aggregation`, `Cost & Pricing`, `Session Hub & Agent Session`, `Agents View & Ticket Cards`, `Board Columns`, `Runtime Dependencies`, `Agent Profile Config`, `Demo Pipeline Concepts`, `Slot State`, `Stats Hooks & Cards`, `Community 51`, `App.tsx`, `OpenPr`, `CodexRuntimeStatus`, `prd.ts`, `reformulate.ts`, `ProjectConfig`, `RunningServer`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `createApiRoutes()` (e.g. with `isWebOnlyPath()` and `.onEvent()`) actually correct?**
  _`createApiRoutes()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _566 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Contract Building & Slots` be split into smaller, more focused modules?**
  _Cohesion score 0.037267080745341616 - nodes in this community are weakly interconnected._
- **Should `Terminals UI & Notifications` be split into smaller, more focused modules?**
  _Cohesion score 0.05734767025089606 - nodes in this community are weakly interconnected._