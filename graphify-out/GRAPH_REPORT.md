# Graph Report - kanban-agents  (2026-09-05)

## Corpus Check
- 225 files · ~702,552 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2375 nodes · 6288 edges · 129 communities (95 shown, 34 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 46 edges (avg confidence: 0.68)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5da2a50c`
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
- CLAUDE.md Doc
- fake.ts
- logger.ts
- PostCSS Config
- Community 72
- TerminalSessionManager
- codexBinary.ts
- FakePaneStream
- usePrdSearch.ts
- Community 77
- useTerminalShortcuts.ts
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
- usage.ts
- buildMcpServers
- coordinator.ts
- CodexProviderDependencies
- reformulate.ts
- Composer 2.5 path (run_composer.sh)
- agentToml
- shellQuote
- PreparedAgents
- submitTriageArgsSchema
- FakePaneStream
- Board.tsx
- useProfiles.ts
- useSavedFlash.ts
- CodexRuntimeDependencies
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
- TicketCost.tsx
- .handleMessage

## God Nodes (most connected - your core abstractions)
1. `Store` - 109 edges
2. `Ticket` - 71 edges
3. `SystemAdapter` - 68 edges
4. `cn()` - 63 edges
5. `FakeSystemAdapter` - 59 edges
6. `RealSystemAdapter` - 55 edges
7. `SlotManager` - 45 edges
8. `SessionHub` - 44 edges
9. `Orchestrator` - 40 edges
10. `ProjectInfo` - 39 edges

## Surprising Connections (you probably didn't know these)
- `ExecutionOverrides` --references--> `Orchestrator`  [EXTRACTED]
  src/server/agents/executionConfig.ts → src/shared/constants.ts
- `FeasibilitySessionInput` --references--> `Orchestrator`  [EXTRACTED]
  src/server/agents/sessionConfig.ts → src/shared/constants.ts
- `SplitSessionInput` --references--> `Orchestrator`  [EXTRACTED]
  src/server/agents/sessionConfig.ts → src/shared/constants.ts
- `TriageSessionInput` --references--> `Orchestrator`  [EXTRACTED]
  src/server/agents/sessionConfig.ts → src/shared/constants.ts
- `StageProgressBarProps` --references--> `Ticket`  [EXTRACTED]
  src/web/src/components/StageProgressBar.tsx → src/shared/schemas.ts

## Import Cycles
- 3-file cycle: `src/server/config.ts -> src/server/db/store.ts -> src/server/db/rows.ts -> src/server/config.ts`
- 3-file cycle: `src/server/agents/worktreeAddresses.ts -> src/server/config.ts -> src/server/db/store.ts -> src/server/agents/worktreeAddresses.ts`

## Communities (129 total, 34 thin omitted)

### Community 0 - "Contract Building & Slots"
Cohesion: 0.03
Nodes (73): ActionExecutionOptions, actionExecutionOptionsSchema, agentMessageSchema, AnalyzeTicketsInput, appSettingsSchema, automationRunSchema, automationSchema, baseBranchSchema (+65 more)

### Community 1 - "Terminals UI & Notifications"
Cohesion: 0.05
Nodes (61): COLUMN_LABELS, COLUMN_SORT_FIELD, AgentCard(), AgentCardProps, AgentsView(), AgentsViewProps, hasLiveAgent(), normalize() (+53 more)

### Community 2 - "Desktop Bootstrap & Menus"
Cohesion: 0.11
Nodes (40): isNotionUrl(), NOTION_HOSTS, ProjectInfo, AgentProfileConfig(), AskPanel(), AskPanelProps, CleanPrPanel(), CleanPrPanelProps (+32 more)

### Community 3 - "Feasibility Batch Management"
Cohesion: 0.15
Nodes (8): RealPaneStream, PaneStream, dataMessage(), normalizeSeed(), send(), TerminalSession, visibleText(), TerminalServerMessage

### Community 4 - "Ticket Action Panels"
Cohesion: 0.05
Nodes (52): WsClientEvent, wsClientEventSchema, groupOrientation(), layoutToSizes(), panelId(), panelPercent(), SplitTree(), SplitTreeProps (+44 more)

### Community 5 - "Fake System Adapter"
Cohesion: 0.09
Nodes (21): log, SlotWatch, WorktreeAddressWatcher, applyAppSettingsToModels(), listProjectKeys(), PROJECT_ROOT, projectConfigSchema, NOTE: AppSettings carries no implementerModel/implementerEffort, so those two MO (+13 more)

### Community 6 - "Shared Zod Schemas"
Cohesion: 0.09
Nodes (36): main(), scalar(), cleanTicket(), conflictTicket(), REVIEW_OPTS, reviewTicket(), TICKET_OPTS, initProjectRegistry() (+28 more)

### Community 8 - "PR Selection & Slots Bar"
Cohesion: 0.39
Nodes (6): buildSplitChannelPrompt(), buildTicketLines(), isEnglish(), CommitLanguage, extractFigmaUrls(), hasMockups()

### Community 9 - "Real System Adapter"
Cohesion: 0.07
Nodes (28): COMMIT_LANGUAGE_LABELS, COMMIT_LANGUAGES, AppearanceSettings(), CODEX_STATUS_TONES, COMMIT_ROW, DefaultsRowSpec, EFFORT_OPTIONS, FEASIBILITY_ROW (+20 more)

### Community 10 - "Slot Config & Worktree Watch"
Cohesion: 0.18
Nodes (33): ProjectKey, AutomationPatch, NewAsk, NewAutomation, NewClean, NewProfile, NewReview, NewTicket (+25 more)

### Community 11 - "Core Domain Concepts"
Cohesion: 0.04
Nodes (47): agentMessageRowSchema, AutomationRow, automationRowSchema, AutomationRunRow, automationRunRowSchema, buildScripts(), CommentRow, commentRowSchema (+39 more)

### Community 12 - "Board & Sidebar Layout"
Cohesion: 0.24
Nodes (10): Capabilities, CodexConnectionStatus(), STATUS_LABELS, loadCapabilities(), publish(), refreshCapabilities(), snapshot(), subscribe() (+2 more)

### Community 13 - "Database Store Operations"
Cohesion: 0.15
Nodes (11): AgentMcpServerDefinition, AgentPermissionMode, AgentProvider, AgentSessionEvent, AgentSessionToolResult, AgentSubagentDefinition, AgentTurnUsage, HttpMcpServerDefinition (+3 more)

### Community 15 - "API Routes & Reformulate"
Cohesion: 0.20
Nodes (15): isPositiveIntegerString(), isValidDraft(), ProjectListRow(), ProjectListRowProps, ProjectPanel(), ProjectPanelProps, ProjectsSettings(), referenceCommitTimeout() (+7 more)

### Community 16 - "Stats Aggregation"
Cohesion: 0.07
Nodes (5): RealSystemAdapter, safeJsonParse(), DoneGateResult, ReviewDoneOptions, SpawnShellOptions

### Community 17 - "Triage & Server Hub"
Cohesion: 0.08
Nodes (25): devDependencies, autoprefixer, class-variance-authority, clsx, concurrently, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities (+17 more)

### Community 18 - "Live Terminal Views"
Cohesion: 0.12
Nodes (12): directories, initializeParamsSchema, log, requestSchema, rpcError(), rpcResult(), rpcResponseSchema, toolCallParamsSchema (+4 more)

### Community 19 - "Stage Progress & Display"
Cohesion: 0.08
Nodes (24): compilerOptions, allowImportingTsExtensions, baseUrl, esModuleInterop, isolatedModules, jsx, lib, module (+16 more)

### Community 20 - "Real Adapter GH/Composer"
Cohesion: 0.09
Nodes (34): FAILURE_COLUMNS, Kind, KINDS, SUCCESS_COLUMNS, CodexTierSummary(), DurationChart(), OutcomeChart(), SuccessRateChart() (+26 more)

### Community 21 - "Store Types & Agent Knobs"
Cohesion: 0.11
Nodes (12): CodexAppServerInitializationError, CodexAppServerNotification, CodexAppServerOptions, CodexAppServerProtocolError, CodexAppServerRpcError, errorMessage(), incomingSchema, initializeResponseSchema (+4 more)

### Community 23 - "Dev Dependencies"
Cohesion: 0.19
Nodes (9): TICKET_OPTION, TicketOptionsToggleGroup(), TicketOptionsToggleGroupProps, TicketOptionValues, ToggleGroup, ToggleGroupContext, ToggleGroupItem, Toggle (+1 more)

### Community 24 - "TypeScript Config"
Cohesion: 0.17
Nodes (17): bashCommandSchema, buildSettings(), claudeProvider, createSdkAgentSession(), denyNoVerifyHook(), dispatchClaudeMessage(), HIDDEN_COMMIT_ATTRIBUTION, pumpStream() (+9 more)

### Community 25 - "Client Hub & Watchdog"
Cohesion: 0.15
Nodes (18): PrdAnnotator(), PrdAnnotatorProps, ABSOLUTE_UPLOAD_PATH, ImageLightboxProps, LightboxImage, Markdown(), MarkdownProps, OPEN_KEYS (+10 more)

### Community 26 - "Cost & Pricing"
Cohesion: 0.09
Nodes (21): CLAUDE_JSON_PATH, COMPOSER_BINARIES, detectInstallCommand(), extractPrUrl(), ghPrSchema, ghPrStateSchema, ghReviewSchema, ghReviewsSchema (+13 more)

### Community 27 - "Workflow View & Lifecycle"
Cohesion: 0.06
Nodes (26): Architecture, Commands, Conventions (enforced — beyond the global ones in ~/.claude/CLAUDE.md), graphify, The dry-run safety model — read before running anything, What this is, Agent runtime (Agent SDK), Architecture (+18 more)

### Community 28 - "Stats Charts"
Cohesion: 0.08
Nodes (20): agentMessageDeltaSchema, ConfigObject, configReadResponseSchema, describeCodexError(), emptyResponseSchema, errorNotificationSchema, itemLifecycleSchema, mcpProgressSchema (+12 more)

### Community 30 - "Agents View & Ticket Cards"
Cohesion: 0.26
Nodes (3): FeasibilityBatchManager, toTriageResult(), FeasibilityResult

### Community 31 - "PRD Review & Markdown"
Cohesion: 0.33
Nodes (8): agentEffortSchema, codexEffortSchema, codexModelSchema, resolveAgentDefaults(), resolveCodexEffort(), resolveCodexModel(), resolveEffort(), resolveModel()

### Community 32 - "User Terminal & Fake IO"
Cohesion: 0.09
Nodes (28): BASH_ALLOWLIST, buildFeasibilitySessionConfig(), buildImplementSessionConfig(), buildSplitSessionConfig(), buildTriageSessionConfig(), CODEX_READONLY_TOOLS, codexKnobs(), CONTRACT_SKILLS (+20 more)

### Community 33 - "Logging"
Cohesion: 0.10
Nodes (21): scripts, build:desktop, build:web, dev, dev:desktop, dev:proxy, dev:server, dev:web (+13 more)

### Community 34 - "Board Columns"
Cohesion: 0.12
Nodes (13): ActiveDelegation, ActiveReviewPass, ClosableExecution, dedupeFindings(), FULL_REVIEW_KINDS, LIGHT_REVIEW_KINDS, log, requiredReviewKinds() (+5 more)

### Community 35 - "NPM Scripts"
Cohesion: 0.16
Nodes (4): AgentCoordinator, SessionToolCall, isProcessing(), ACTIVE_STAGES

### Community 36 - "Runtime Dependencies"
Cohesion: 0.24
Nodes (13): AppSettings, UpdateAppSettingsInput, AgentDefaultsSettings(), AppSettingsState, flashSaved(), loadOnce(), patchAppSettings(), publish() (+5 more)

### Community 37 - "Claude SDK Provider"
Cohesion: 0.11
Nodes (19): dependencies, @anthropic-ai/claude-agent-sdk, dompurify, elysia, marked, @modelcontextprotocol/sdk, nanoid, @openai/codex-sdk (+11 more)

### Community 38 - "Agent Profile Config"
Cohesion: 0.16
Nodes (6): AutomationManager, mapAutomationRow(), mapAutomationRunRow(), AutomationRunStatus, Automation, AutomationRun

### Community 39 - "Agent Coordinator Handlers"
Cohesion: 0.19
Nodes (18): adopt(), compareVersions(), detectionCandidates(), detectUserInstall(), downloadAndVerifyTarball(), downloadPinnedBinary(), emitProgress(), ensureClaudeBinary() (+10 more)

### Community 40 - "API Client Inputs"
Cohesion: 0.18
Nodes (11): AUTOMATION_TRIGGER_LABELS, AUTOMATION_TRIGGERS, AutomationCard(), AutomationCardProps, AutomationFormProps, EMPTY_FORM, formFromAutomation(), RUN_STATUS_LABEL (+3 more)

### Community 43 - "Demo Pipeline Concepts"
Cohesion: 0.10
Nodes (27): assertExecutionAvailable(), CODEX_LAUNCH_STATUS_MESSAGES, CodexCapabilityReader, ExecutionDefaults, ExecutionOverrides, FEASIBILITY_ENGINE_EXECUTION, ResolvedExecution, resolveExecution() (+19 more)

### Community 44 - "Chart Primitives"
Cohesion: 0.33
Nodes (9): useTheme(), UseThemeResult, applyTheme(), getStoredTheme(), isTheme(), Theme, ThemeOption, THEMES (+1 more)

### Community 45 - "Session Hub Transcript"
Cohesion: 0.13
Nodes (20): ACTIVE_BAR, AREA_CURSOR, AXIS_PROPS, BAR_CURSOR, CHART_PALETTE, colorAt(), CostSummary(), DurationBars() (+12 more)

### Community 46 - "Community 46"
Cohesion: 0.27
Nodes (15): Agent Implementation Config, Argus Code Review, Automated Tests (typecheck/lint/test), Claude Code Autonomous Agent, Ticket Contract Injection, Feasibility Analysis, Kanban Board (Atelier), Kanban Agents Demo (demo.gif) (+7 more)

### Community 47 - "Modal Dialogs"
Cohesion: 0.11
Nodes (28): TERMINAL_STAGES, PrdReviewDialog(), PrdReviewDialogProps, QuitConfirmModal(), QuitConfirmModalProps, AUTHOR_BADGES, AuthorBadge(), CommentRow() (+20 more)

### Community 48 - "Community 48"
Cohesion: 0.13
Nodes (11): cleanDescription(), createApiRoutes(), dependencyError(), isBlocked(), isSplitMother(), isWebOnlyPath(), PaneReader, reviewDescription() (+3 more)

### Community 49 - "Slot State"
Cohesion: 0.13
Nodes (10): log, log, ReformulateManager, log, Watchdog, ClientHub, ClientSocket, ClientSocketData (+2 more)

### Community 50 - "Stats Hooks & Cards"
Cohesion: 0.25
Nodes (6): mapExecutionRunRow(), mapTicketRow(), parseSessionUsage(), runRecordedAction(), ExecutionRun, ExecutionUsageByModel

### Community 51 - "Community 51"
Cohesion: 0.13
Nodes (12): groupFeasibilityTickets(), slotPath(), slugify(), computeWorktreeAddresses(), getProject(), isProjectKey(), mapSlotRow(), mapWorktreeSessionRow() (+4 more)

### Community 52 - "chart.tsx"
Cohesion: 0.16
Nodes (12): ChartConfig, ChartContainer, ChartContainerProps, ChartContext, ChartContextValue, ChartLegendContent(), ChartLegendContentProps, ChartTooltipContent() (+4 more)

### Community 53 - "User Terminal Manager"
Cohesion: 0.33
Nodes (5): CONTEXT — domain glossary, Execution, Proposed (not yet built), Seams, Work items

### Community 54 - "Community 54"
Cohesion: 0.14
Nodes (8): CHILD_USAGE, FULL_REVIEW_KINDS, LIGHT_REVIEW_KINDS, RecordedSession, RecordingSystemAdapter, setup(), sleep(), startAndApproveReviews()

### Community 55 - "App.tsx"
Cohesion: 0.19
Nodes (9): codexImplementerKnobs(), assertCodexImplementerAvailable(), log, ReclaimOutcome, SETUP_PHASES, SlotManagerConfig, resolveTemplatePaths(), TemplatePaths (+1 more)

### Community 57 - "Community 57"
Cohesion: 0.16
Nodes (18): applyDesktopEnv(), DesktopRoots, ensureConfig(), boot(), externalUrlFromNewWindowEvent(), forwardAtelierShortcut(), installApplicationMenu(), installMenuShortcutBridge() (+10 more)

### Community 60 - "Package Manifest"
Cohesion: 0.07
Nodes (41): AGENT_EFFORT_LABELS, AGENT_MODEL_LABELS, AUTOMATION_RUN_STATUSES, CODEX_EFFORT_LABELS, CODEX_MODEL_LABELS, COMMENT_AUTHORS, FEASIBILITY_ENGINE_LABELS, FEASIBILITY_ENGINES (+33 more)

### Community 61 - "splitManager.ts"
Cohesion: 0.08
Nodes (40): App(), HOME_VIEW_OPTIONS, HomeView, AutomationView(), PrdView(), loadCollapsed(), NAV_ENTRIES, NavEntry (+32 more)

### Community 62 - "TicketCard.tsx"
Cohesion: 0.07
Nodes (31): agentPairError(), createSplitChildren(), failSplitMother(), jsonError(), log, performSplit(), splitChildDefaults(), splitMotherBranch() (+23 more)

### Community 63 - "Community 63"
Cohesion: 0.14
Nodes (3): startParentSession(), SessionHubHandlers, SessionStartCallbacks

### Community 64 - "Composer Run Script"
Cohesion: 0.25
Nodes (6): createCodexAgentSession(), createCodexProvider(), PreparedHook, AppServerFixtureOptions, options(), RecordedRequest

### Community 65 - "split.ts"
Cohesion: 0.19
Nodes (23): buildAskContract(), buildCleanContract(), buildConflictResolutionContract(), buildFeasibilityBatchContract(), buildFeasibilityContextSection(), buildImplementingSteps(), buildMockupReviewStep(), buildPlanningStep() (+15 more)

### Community 67 - "UserTerminalManager"
Cohesion: 0.36
Nodes (3): mapAgentMessageRow(), AgentMessage, ExecutionOwnerType

### Community 68 - "CLAUDE.md Doc"
Cohesion: 0.07
Nodes (33): ActiveReview, ReviewResult, DEFAULT_MODELS, mapCommentRow(), mapReviewApprovalRow(), mapReviewPassRow(), AttachExecutionSessionInput, EnqueueAgentMessageInput (+25 more)

### Community 69 - "fake.ts"
Cohesion: 0.12
Nodes (5): TriageManager, TerminalSessionManager, UserTerminalManager, TerminalDescriptor, TriageResult

### Community 70 - "logger.ts"
Cohesion: 0.33
Nodes (6): RFC-4180, CsvParseError, normalizeHeader(), ParsedTicketRow, ParsedTicketsCsv, parseTicketsCsv()

### Community 71 - "PostCSS Config"
Cohesion: 0.29
Nodes (6): name, overrides, zod, private, type, version

### Community 73 - "TerminalSessionManager"
Cohesion: 0.48
Nodes (3): mapProfileRow(), nullableBooleanValue(), Profile

### Community 74 - "codexBinary.ts"
Cohesion: 0.42
Nodes (7): bestInstalledMatch(), compareParts(), envWithProjectNode(), nvmNodeBinDir(), readNvmrc(), prepareProjectShell(), shellLiteral()

### Community 75 - "FakePaneStream"
Cohesion: 0.14
Nodes (18): DragHandleAttributes, DragHandleListeners, ProfileRow(), ProfileRowHeader(), ProfileRowHeaderProps, ProfileRowProps, ProfilesSettings(), NOTE: the saved flag lives here because a saved row remounts (its key carries up (+10 more)

### Community 76 - "usePrdSearch.ts"
Cohesion: 0.13
Nodes (24): costByFamily(), costOf(), costOfModel(), costOfSessions(), CostSummary, FamilyPricing, ModelFamily, normalizeModel() (+16 more)

### Community 78 - "useTerminalShortcuts.ts"
Cohesion: 0.31
Nodes (13): buildContractConstraintsLines(), buildResponseFormatLines(), buildStrictRulesLines(), buildTicketLines(), buildTriageChannelPrompt(), buildTriagePlusChannelPrompt(), isEnglish(), readOnlyFramingLines() (+5 more)

### Community 79 - "WorktreeSession"
Cohesion: 0.33
Nodes (3): listeners, mcp, ReplyArgsSchema

### Community 80 - "Community 80"
Cohesion: 0.20
Nodes (14): accountResponseSchema, modelListResponseSchema, modelSchema, toCodexRuntimeModels(), CodexRuntimeModel, codexRuntimeModelSchema, codexRuntimeStatusSchema, isCodexFastServiceTier() (+6 more)

### Community 81 - ".handleMessage"
Cohesion: 0.23
Nodes (17): AGENT_EFFORT_FULL_LABELS, AGENT_MODEL_FULL_LABELS, CODEX_EFFORT_FULL_LABELS, ProfileConfig, ProfilePipeline(), buildProfilePipeline(), claudeDetail(), claudeSubagentDetail() (+9 more)

### Community 86 - "codexHookTrust.ts"
Cohesion: 0.17
Nodes (9): CodexAppServerConnection, connectCodexAppServer(), hasExplicitCodexApiKey(), isProtocolIncompatibility(), listRuntimeModels(), probeCodexRuntime(), status(), CatalogPage (+1 more)

### Community 87 - "prd.ts"
Cohesion: 0.11
Nodes (21): log, ToolHandler, ToolResult, ExecutionFinishStatus, LiveSession, log, PendingSessionMessage, previewToolInput() (+13 more)

### Community 91 - "reformulate.ts"
Cohesion: 0.16
Nodes (4): childTranscriptPrefix(), DelegationManager, reviewKey(), mergeAgentUsageByModel()

### Community 92 - "ProjectConfig"
Cohesion: 0.12
Nodes (10): FailedReformulation, ActionSystem, dryRunLog, FAKE_OPEN_PRS, fakeEncoder, GitWorktreeAddOptions, ImportNotionOptions, PaneSize (+2 more)

### Community 93 - "FakePaneStream"
Cohesion: 0.15
Nodes (5): Logger, paint(), ScopedLogger, serializeFields(), timestamp()

### Community 94 - ".addComment"
Cohesion: 0.19
Nodes (10): CodexBinaryVersionError, require, resolveCodexBinary(), resolveCodexBinaryOverride(), TARGETS, verifyCodexBinaryVersion(), canonicalJson(), CodexCommandHook (+2 more)

### Community 95 - "TicketConfigSummary.tsx"
Cohesion: 0.50
Nodes (3): appBundle, EMBEDDED_BINARIES, resourcesApp

### Community 97 - "RunningServer"
Cohesion: 0.07
Nodes (32): log, runFirstBootSetup(), PROJECT_ROOT, NOTE: PRD generation holds the request open up to ~120s (REFORMULATE_TIMEOUT_MS), RunningServer, serveStaticAsset(), SocketData, startServer() (+24 more)

### Community 98 - "usage.ts"
Cohesion: 0.23
Nodes (10): artifactPath, assertPackageVersionInSync(), assertSdkVersionsInSync(), BUILT_DMG, ELECTROBUN_BIN, fail(), installedPackageVersion(), RELEASE_FOLDER (+2 more)

### Community 99 - "buildMcpServers"
Cohesion: 0.50
Nodes (4): buildMcpServers(), mcpConfig(), resolveBackendPort(), setConfigEntry()

### Community 100 - "coordinator.ts"
Cohesion: 0.07
Nodes (28): Stage, TRIAGE_VERDICTS, AgentSettableStage, agentSettableStageSchema, askUserArgsSchema, AssertNamesCovered, channelEventSchema, delegateImplementationArgsSchema (+20 more)

### Community 103 - "Composer 2.5 path (run_composer.sh)"
Cohesion: 0.24
Nodes (5): AckSystem, RecordingSystem, RelaunchSystem, AgentSessionHandle, AgentSessionOptions

### Community 104 - "agentToml"
Cohesion: 0.67
Nodes (3): agentToml(), prepareAgents(), tomlString()

### Community 105 - "shellQuote"
Cohesion: 0.67
Nodes (3): ConfigValue, prepareNoVerifyHook(), shellQuote()

### Community 108 - "FakePaneStream"
Cohesion: 0.20
Nodes (3): FakePaneStream, fakeShellPrompt(), hexToBytes()

### Community 109 - "Board.tsx"
Cohesion: 0.25
Nodes (10): Column, COLUMN_ORDER, COLUMNS, Board(), BoardProps, isColumn(), isLocked(), normalize() (+2 more)

### Community 110 - "useProfiles.ts"
Cohesion: 0.53
Nodes (5): emit(), loadOnce(), refreshProfiles(), subscribers, useProfiles()

### Community 111 - "useSavedFlash.ts"
Cohesion: 0.50
Nodes (4): SavedFlag, SavedFlash, useSavedFlag(), useSavedFlash()

### Community 139 - "performSplit"
Cohesion: 0.08
Nodes (30): Block, blockText(), compactChunks(), firstCharCode(), TranscriptBuffer, trimBlockStart(), AgentStreamBlock, terminalServerMessageSchema (+22 more)

### Community 142 - "TicketCost.tsx"
Cohesion: 0.29
Nodes (8): StatRecord, StatCard(), StatCardProps, StatEmpty(), StatsView(), StatsViewProps, useStats(), UseStatsResult

### Community 144 - ".handleMessage"
Cohesion: 0.39
Nodes (4): OpenPr, PrSelectRow(), PrSelectRowProps, isPrNeedsAttention()

## Knowledge Gaps
- **573 isolated node(s):** `log`, `dryRunLog`, `FAKE_OPEN_PRS`, `fakeEncoder`, `log` (+568 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **34 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Ticket` connect `Coordinator & Protocol` to `Contract Building & Slots`, `Terminals UI & Notifications`, `Desktop Bootstrap & Menus`, `Ticket Action Panels`, `Shared Zod Schemas`, `PR Selection & Slots Bar`, `Core Domain Concepts`, `Session Hub & Agent Session`, `Demo Pipeline Concepts`, `Modal Dialogs`, `Slot State`, `Community 51`, `App.tsx`, `triageManager.ts`, `Package Manifest`, `splitManager.ts`, `TicketCard.tsx`, `split.ts`, `OpenPr`, `CLAUDE.md Doc`, `usePrdSearch.ts`, `useTerminalShortcuts.ts`, `reformulate.ts`, `Board.tsx`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **Why does `RealSystemAdapter` connect `Stats Aggregation` to `RunningServer`, `OpenPr`, `Feasibility Batch Management`, `.handleMessage`, `Live Terminal Views`, `Cost & Pricing`, `ProjectConfig`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **Why does `Store` connect `triageManager.ts` to `RunningServer`, `OpenPr`, `UserTerminalManager`, `CLAUDE.md Doc`, `Fake System Adapter`, `Agent Profile Config`, `Shared Zod Schemas`, `fake.ts`, `TerminalSessionManager`, `Demo Pipeline Concepts`, `Core Domain Concepts`, `usePrdSearch.ts`, `Coordinator & Protocol`, `Slot State`, `Stats Hooks & Cards`, `Community 51`, `App.tsx`, `Session Hub & Agent Session`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **What connects `log`, `dryRunLog`, `FAKE_OPEN_PRS` to the rest of the system?**
  _578 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Contract Building & Slots` be split into smaller, more focused modules?**
  _Cohesion score 0.033300033300033303 - nodes in this community are weakly interconnected._
- **Should `Terminals UI & Notifications` be split into smaller, more focused modules?**
  _Cohesion score 0.0546583850931677 - nodes in this community are weakly interconnected._
- **Should `Desktop Bootstrap & Menus` be split into smaller, more focused modules?**
  _Cohesion score 0.10633484162895927 - nodes in this community are weakly interconnected._