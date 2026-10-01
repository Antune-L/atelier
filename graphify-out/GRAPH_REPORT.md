# Graph Report - kanban-agents  (2026-10-01)

## Corpus Check
- 307 files · ~784,491 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3844 nodes · 11167 edges · 125 communities (118 shown, 7 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 79 edges (avg confidence: 0.66)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0c005785`
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
- .publishReviewUnderRepoLock
- TerminalView.tsx
- button.tsx
- .handleRequest
- usePrdSearch.ts
- Community 77
- csv.ts
- WorktreeSession
- recordedAction.ts
- index.ts
- .getReviewPass
- Community 83
- vcsCommands.ts
- atelier.ts
- usePrdSearch.ts
- Profile
- createCodexAgentSession
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
- RealPaneStream
- TerminalSession
- createMcpServer
- usePrdSearch.ts
- azureRemote.ts
- WorkflowView.tsx
- FakePaneStream
- useSavedFlash.ts
- ApiDenyPatterns
- settings.tsx
- AgentMessage
- ProjectPanel.tsx
- VcsConnectionResult
- useSavedFlash.ts
- TicketOperations
- TerminalSessionManager
- prd.schema.json
- id
- $defs
- title
- preDraft
- McpSettingsControllerDependencies
- createMcpServer

## God Nodes (most connected - your core abstractions)
1. `Store` - 152 edges
2. `Ticket` - 116 edges
3. `cn()` - 88 edges
4. `SystemAdapter` - 85 edges
5. `createApiRoutes()` - 79 edges
6. `FakeSystemAdapter` - 78 edges
7. `RealSystemAdapter` - 74 edges
8. `SlotManager` - 59 edges
9. `VcsProvider` - 58 edges
10. `DelegationManager` - 55 edges

## Surprising Connections (you probably didn't know these)
- `McpSettingsClient` --references--> `McpSettingsMetadata`  [EXTRACTED]
  src/web/src/lib/mcpSettings.ts → desktop/mcpRpc.ts
- `main()` --calls--> `assertCodexDowngradeSafe()`  [EXTRACTED]
  scripts/downgrade-codex-catalog.ts → src/server/db/schema.ts
- `main()` --calls--> `migrateCodexCatalog()`  [EXTRACTED]
  scripts/downgrade-codex-catalog.ts → src/server/db/schema.ts
- `ExecutionOverrides` --references--> `Orchestrator`  [EXTRACTED]
  src/server/agents/executionConfig.ts → src/shared/constants.ts
- `TriageSessionInput` --references--> `Orchestrator`  [EXTRACTED]
  src/server/agents/sessionConfig.ts → src/shared/constants.ts

## Import Cycles
- 3-file cycle: `src/server/config.ts -> src/server/db/store.ts -> src/server/db/rows.ts -> src/server/config.ts`
- 3-file cycle: `src/server/agents/worktreeAddresses.ts -> src/server/config.ts -> src/server/db/store.ts -> src/server/agents/worktreeAddresses.ts`

## Communities (125 total, 7 thin omitted)

### Community 0 - "Contract Building & Slots"
Cohesion: 0.02
Nodes (111): buildReformulatePrompt(), AUTOMATION_RUN_STATUSES, COMMENT_AUTHORS, CONVERSATION_MESSAGE_ROLES, CONVERSATION_SESSION_STATUSES, CONVERSATION_STATUSES, PR_REVIEW_STATUSES, PRD_DOCUMENT_STATUSES (+103 more)

### Community 1 - "Terminals UI & Notifications"
Cohesion: 0.08
Nodes (28): analyzeTicketsInputSchema, analyzeTicketsOutputSchema, columnSchema, compactTicketSchema, createTodoTicketOutputSchema, editableTicketSchema, effectivePort(), isAllowedHost() (+20 more)

### Community 2 - "Desktop Bootstrap & Menus"
Cohesion: 0.08
Nodes (25): log, log, ReformulateManager, SessionHub, log, ReclaimOutcome, SETUP_PHASES, SlotManagerConfig (+17 more)

### Community 3 - "Feasibility Batch Management"
Cohesion: 0.06
Nodes (56): PRD_SPLIT_MODE_LABELS, PRD_SPLIT_MODES, PrdSplitMode, candidatesFor(), CardCandidate, CardsPanel(), pluralCards(), splitDescription() (+48 more)

### Community 4 - "Ticket Action Panels"
Cohesion: 0.10
Nodes (14): CapturingSystem, AckSystem, ActiveDelegation, ClosableExecution, RecordedSession, RecordingSystem, RecordedSession, RecordingSystem (+6 more)

### Community 5 - "Fake System Adapter"
Cohesion: 0.15
Nodes (20): COLUMN_SORT_FIELD, BoardColumn(), compareFamilyMembers(), familyKeyOf(), groupTicketIds(), groupTicketsByFamily(), isSplitMother(), readCollapsed() (+12 more)

### Community 6 - "Shared Zod Schemas"
Cohesion: 0.11
Nodes (24): ACTIVE_BAR, AREA_CURSOR, AXIS_PROPS, BAR_CURSOR, CHART_PALETTE, CodexTierSummary(), colorAt(), CostSummary() (+16 more)

### Community 7 - "Settings & Profiles UI"
Cohesion: 0.07
Nodes (3): delay(), fakeShellPrompt(), FakeSystemAdapter

### Community 8 - "PR Selection & Slots Bar"
Cohesion: 0.11
Nodes (25): CompactTicket, ListTicketsInput, Column, COLUMN_LABELS, COLUMNS, ACTIVE_COLUMNS, Board(), BoardProps (+17 more)

### Community 9 - "Real System Adapter"
Cohesion: 0.05
Nodes (67): AGENT_EFFORT_LABELS, AGENT_EFFORTS, AGENT_MODEL_LABELS, AGENT_MODELS, AUTOMATION_TRIGGER_LABELS, AUTOMATION_TRIGGERS, AutomationRunStatus, CODEX_EFFORT_LABELS (+59 more)

### Community 10 - "Slot Config & Worktree Watch"
Cohesion: 0.14
Nodes (11): directories, initializeParamsSchema, log, requestSchema, rpcError(), rpcResult(), rpcResponseSchema, toolCallParamsSchema (+3 more)

### Community 11 - "Core Domain Concepts"
Cohesion: 0.03
Nodes (67): agentMessageRowSchema, AutomationRow, automationRowSchema, AutomationRunRow, automationRunRowSchema, buildScripts(), CommentRow, commentRowSchema (+59 more)

### Community 12 - "Board & Sidebar Layout"
Cohesion: 0.09
Nodes (32): RepoInspectionSource, CreateProjectInput, UpdateProjectInput, vcsProviderSchema, ConnectionHint, CreateStep, isPositiveIntegerString(), isValidDraft() (+24 more)

### Community 13 - "Database Store Operations"
Cohesion: 0.08
Nodes (34): App(), HOME_VIEW_OPTIONS, HomeView, NAV_ENTRIES, NavEntry, Sidebar(), SidebarProps, SidebarView (+26 more)

### Community 14 - "Coordinator & Protocol"
Cohesion: 0.10
Nodes (26): COLUMN_ORDER, ActivityTab(), isUnanswered(), NO_COMMENT_COLUMNS, PrdTab(), TICKET_TAB_LABELS, TicketTab, TicketTabs() (+18 more)

### Community 15 - "API Routes & Reformulate"
Cohesion: 0.05
Nodes (57): main(), scalar(), CLAUDE_CONVERSATION, closers, CODEX_CONVERSATION, setup(), TEMPLATE_PATH, TURN_END (+49 more)

### Community 16 - "Stats Aggregation"
Cohesion: 0.08
Nodes (6): startParentSession(), SessionHubHandlers, SessionStartCallbacks, PendingSplit, AgentSessionEvent, SplitResult

### Community 17 - "Triage & Server Hub"
Cohesion: 0.08
Nodes (25): devDependencies, autoprefixer, class-variance-authority, clsx, concurrently, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities (+17 more)

### Community 18 - "Live Terminal Views"
Cohesion: 0.07
Nodes (35): isReviewFixSession(), ATELIER_WEB_TOOLS, AZURE_BASH_ALLOWLIST, AZURE_CLEAN_BASH_ALLOWLIST, BASH_ALLOWLIST, bashAllowlist(), buildImplementSessionConfig(), CODEX_READONLY_TOOLS (+27 more)

### Community 19 - "Stage Progress & Display"
Cohesion: 0.08
Nodes (24): compilerOptions, allowImportingTsExtensions, baseUrl, esModuleInterop, isolatedModules, jsx, lib, module (+16 more)

### Community 20 - "Real Adapter GH/Composer"
Cohesion: 0.08
Nodes (36): FAILURE_COLUMNS, Kind, KINDS, SUCCESS_COLUMNS, agentEffortSchema, codexEffortSchema, codexModelSchema, DurationChart() (+28 more)

### Community 21 - "Store Types & Agent Knobs"
Cohesion: 0.08
Nodes (83): agent_context_html(), agent_entry_count(), axes_html(), axis_anchor(), axis_head_html(), axis_items(), axis_section_html(), axis_statuses() (+75 more)

### Community 22 - "DB Row Schemas & Mappers"
Cohesion: 0.06
Nodes (30): TRIAGE_VERDICTS, AgentSettableStage, agentSettableStageSchema, askUserArgsSchema, AssertNamesCovered, channelEventSchema, delegateImplementationArgsSchema, delegateReviewArgsSchema (+22 more)

### Community 23 - "Dev Dependencies"
Cohesion: 0.08
Nodes (29): applyAppSettingsToModels(), mapReviewApprovalRow(), mapReviewPassRow(), mapTicketCreationRequestRow(), AttachExecutionSessionInput, EnqueueAgentMessageInput, FinalizeExecutionInput, MarkAgentMessageAcceptedInput (+21 more)

### Community 24 - "TypeScript Config"
Cohesion: 0.10
Nodes (28): ensureClaudeBinary(), bashCommandSchema, buildSettings(), claudeProvider, createSdkAgentSession(), denyBashHook(), denyNoVerifyHook, denyReviewPublishingHook (+20 more)

### Community 25 - "Client Hub & Watchdog"
Cohesion: 0.16
Nodes (3): AgentCoordinator, formatPrdDocumentIssues(), SessionToolCall

### Community 26 - "Cost & Pricing"
Cohesion: 0.13
Nodes (9): buildAtelierConsolidateTurn(), ACTIVITY_PROGRESS_KINDS, AtelierManager, describeToolUse(), emptyTurn(), labelWithNote(), truncate(), atelierSessionKey() (+1 more)

### Community 27 - "Workflow View & Lifecycle"
Cohesion: 0.05
Nodes (31): Architecture, Commands, Conventions (enforced — beyond the global ones in ~/.claude/CLAUDE.md), graphify, The dry-run safety model — read before running anything, What this is, Agent runtime, Architecture (+23 more)

### Community 28 - "Stats Charts"
Cohesion: 0.07
Nodes (42): codexCommandPolicyScript(), agentMessageDeltaSchema, agentToml(), apiWriteDenyScript(), buildMcpServers(), ConfigObject, configReadResponseSchema, ConfigValue (+34 more)

### Community 29 - "Session Hub & Agent Session"
Cohesion: 0.09
Nodes (62): AtelierSessionInput, ProjectKey, AutomationPatch, ConversationPatch, NewAsk, NewAutomation, NewClean, NewConversation (+54 more)

### Community 30 - "Agents View & Ticket Cards"
Cohesion: 0.10
Nodes (31): log, logRejection(), ToolHandler, ToolResult, ExecutionFinishStatus, LiveSession, log, PendingSessionMessage (+23 more)

### Community 31 - "PRD Review & Markdown"
Cohesion: 0.06
Nodes (58): BOARD_FINDING_RENDER_STYLE, log, renderFinding(), renderPersistedReviewResult(), REVIEW_DISALLOWED_TOOLS, REVIEW_REPORT_LABELS, REVIEW_REPORT_LABELS_EN, REVIEW_REPORT_LABELS_FR (+50 more)

### Community 32 - "User Terminal & Fake IO"
Cohesion: 0.60
Nodes (4): slugify(), createSplitChildren(), performSplit(), splitMotherBranch()

### Community 33 - "Logging"
Cohesion: 0.10
Nodes (21): scripts, build:desktop, build:web, dev, dev:desktop, dev:proxy, dev:server, dev:web (+13 more)

### Community 34 - "Board Columns"
Cohesion: 0.16
Nodes (22): AppliedPath, copyDependencies(), copyPath(), DelegationWorkspace, ensureParentDirectory(), FileState, git(), installStagedPath() (+14 more)

### Community 35 - "NPM Scripts"
Cohesion: 0.13
Nodes (7): startFeasibilityTicket(), TicketLifecycle, TicketOperationsDeps, TERMINAL_STAGES, Ticket, DescriptionTabProps, PrdTabProps

### Community 36 - "Runtime Dependencies"
Cohesion: 0.04
Nodes (52): buildNotionImportPrompt(), ProjectInUseError, agentPairError(), cleanDescription(), CONVERSATION_STATUS_FOR_PRD, createApiRoutes(), isBlocked(), isSplitMother() (+44 more)

### Community 37 - "Claude SDK Provider"
Cohesion: 0.09
Nodes (22): dependencies, @anthropic-ai/claude-agent-sdk, dompurify, elysia, @fontsource/ibm-plex-mono, @fontsource/ibm-plex-sans, marked, @modelcontextprotocol/sdk (+14 more)

### Community 38 - "Agent Profile Config"
Cohesion: 0.13
Nodes (23): costByFamily(), costOf(), costOfModel(), costOfSessions(), CostSummary, FamilyPricing, MODEL_PRICING, ModelFamily (+15 more)

### Community 39 - "Agent Coordinator Handlers"
Cohesion: 0.10
Nodes (28): artifactPath, assertPackageVersionInSync(), assertSdkVersionsInSync(), BUILT_DMG, ELECTROBUN_BIN, fail(), installedPackageVersion(), RELEASE_FOLDER (+20 more)

### Community 40 - "API Client Inputs"
Cohesion: 0.07
Nodes (15): childTranscriptPrefix(), DelegationManager, implementationScopesOverlap(), normalizeImplementationScope(), orderedReviewKinds(), reviewKey(), sleep(), startAndApproveReviews() (+7 more)

### Community 41 - "Ticket Config & Constants"
Cohesion: 0.08
Nodes (54): RFC-4180, ProjectInfo, AskPanel(), AskPanelProps, AtelierAgentFields(), AtelierAgentFieldsProps, ComposeState, CardsPanelProps (+46 more)

### Community 42 - "Ticket Detail & Triage UI"
Cohesion: 0.11
Nodes (26): PrdDocumentPatch, PrdDocumentStatus, compileFeedback(), PrdAnnotation, prdAnnotationsSchema, FeedbackDraft, PrdAnnotatorProps, BREADCRUMB (+18 more)

### Community 43 - "Demo Pipeline Concepts"
Cohesion: 0.09
Nodes (14): RealPaneStream, PaneStream, dataMessage(), log, normalizeSeed(), safeParse(), send(), TerminalSession (+6 more)

### Community 44 - "Chart Primitives"
Cohesion: 0.28
Nodes (13): abortReason(), computeCodeFingerprint(), FingerprintEntry, FingerprintPhase, hashFingerprintPaths(), isMissingFileError(), listFingerprintPaths(), log (+5 more)

### Community 45 - "Session Hub Transcript"
Cohesion: 0.33
Nodes (9): useTheme(), UseThemeResult, applyTheme(), getStoredTheme(), isTheme(), Theme, ThemeOption, THEMES (+1 more)

### Community 46 - "Community 46"
Cohesion: 0.27
Nodes (15): Agent Implementation Config, Argus Code Review, Automated Tests (typecheck/lint/test), Claude Code Autonomous Agent, Ticket Contract Injection, Feasibility Analysis, Kanban Board (Atelier), Kanban Agents Demo (demo.gif) (+7 more)

### Community 47 - "Modal Dialogs"
Cohesion: 0.18
Nodes (20): buildCleanContract(), buildConflictResolutionContract(), buildFeasibilityBatchContract(), buildFeasibilityContextSection(), buildImplementingSteps(), buildMockupReviewStep(), buildPlanningStep(), buildPrdBullet() (+12 more)

### Community 48 - "Community 48"
Cohesion: 0.09
Nodes (25): TicketCreationRequestConflictError, isProcessing(), AnalyzeTicketRejectionReason, AnalyzeTicketsResult, CreateTodoTicketInput, createTodoTicketInputSchema, CreateTodoTicketResult, isActive() (+17 more)

### Community 49 - "Slot State"
Cohesion: 0.06
Nodes (32): WsClientEvent, ATTENTION_STATUSES, sessionOf(), SlotPips(), SlotPipsProps, STATUS_LABELS, STATUS_PIP_CLASSES, getSnapshot() (+24 more)

### Community 50 - "Stats Hooks & Cards"
Cohesion: 0.46
Nodes (5): buildSplitChannelPrompt(), buildTicketLines(), isEnglish(), extractFigmaUrls(), hasMockups()

### Community 51 - "Community 51"
Cohesion: 0.06
Nodes (12): NewProject, ProjectPatch, detectInstallCommand(), realpathSafe(), RealSystemAdapter, resolveWorktreeScriptCommand(), setupOutputExcerpt(), shQuote() (+4 more)

### Community 52 - "repairPath.ts"
Cohesion: 0.06
Nodes (38): Block, blockText(), compactChunks(), firstCharCode(), TranscriptBuffer, trimBlockStart(), AgentStreamBlock, terminalServerMessageSchema (+30 more)

### Community 53 - "User Terminal Manager"
Cohesion: 0.33
Nodes (5): CONTEXT — domain glossary, Execution, Proposed (not yet built), Seams, Work items

### Community 54 - "Community 54"
Cohesion: 0.07
Nodes (40): boundedCommandDetail(), BoundedCommandResult, runBoundedCommand(), safeJsonParse(), withJsonRequestFile(), hostnameFromSshConfig(), ReviewPublicationState, connectionFailure() (+32 more)

### Community 55 - "App.tsx"
Cohesion: 0.21
Nodes (3): FeasibilityBatchManager, toTriageResult(), FeasibilityResult

### Community 56 - "CSV Parsing"
Cohesion: 0.16
Nodes (18): ActionContext, buildActions(), ConfirmSpec, errorMessage(), RETRY_STAGES, TicketAction, TicketActions(), TicketActionsProps (+10 more)

### Community 57 - "Community 57"
Cohesion: 0.18
Nodes (16): Capabilities, CodexConnectionStatus(), STATUS_LABELS, clearRetry(), loadCapabilities(), LoadOptions, publish(), refreshCapabilities() (+8 more)

### Community 58 - "File Uploads"
Cohesion: 0.29
Nodes (9): gitMetadataWritableRoots(), agentBaseEnv(), bestInstalledMatch(), compareParts(), envWithProjectNode(), nvmNodeBinDir(), readNvmrc(), prepareProjectShell() (+1 more)

### Community 59 - "triageManager.ts"
Cohesion: 0.39
Nodes (11): buildContractConstraintsLines(), buildResponseFormatLines(), buildStrictRulesLines(), buildTicketLines(), buildTriageChannelPrompt(), buildTriagePlusChannelPrompt(), isEnglish(), readOnlyFramingLines() (+3 more)

### Community 60 - "Package Manifest"
Cohesion: 0.12
Nodes (9): resolveBaseBranch(), assertExecutionAvailable(), assertCodexImplementerAvailable(), SlotManager, stalledEventPayload(), failSplitMother(), ErrorDetails, ErrorDetailsSource (+1 more)

### Community 61 - "splitManager.ts"
Cohesion: 0.40
Nodes (4): PR review counting and publication correction state, Progress, Scope and decisions, Verification

### Community 62 - "TicketCard.tsx"
Cohesion: 0.07
Nodes (42): AGENTS_SKILLS_DIR, CLAUDE_JSON_PATH, CLAUDE_SKILLS_DIR, commandOutputOrNull(), COMPOSER_BINARIES, DEFAULT_CODEX_HOME, GitRemoteFacts, INSTALL_COMMANDS (+34 more)

### Community 63 - "Community 63"
Cohesion: 0.32
Nodes (14): ProfilePipeline(), buildProfilePipeline(), claudeDetail(), claudeSubagentDetail(), codexOrchestratorDetail(), codexSubagentParts(), describeProfile(), implementerNodeValue() (+6 more)

### Community 64 - "Composer Run Script"
Cohesion: 0.07
Nodes (48): orderSelectedTasks(), prdCardDrafts(), axisIdSchema, DUPLICATE_ITEMS_ISSUE, hasDuplicates(), identifierSchema, isUnique(), nonEmptyTextArraySchema (+40 more)

### Community 65 - "split.ts"
Cohesion: 0.22
Nodes (8): AtelierDesktopRpcSchema, DesktopRequests, McpSettingsMetadata, WebviewRequests, McpSettingsController, createMcpSettingsClient(), getMcpSettingsClient(), McpSettingsClient

### Community 66 - "prUrl.ts"
Cohesion: 0.24
Nodes (3): AutomationManager, mapAutomationRow(), Automation

### Community 67 - "TerminalView.tsx"
Cohesion: 0.11
Nodes (28): AgentCard(), AgentCardProps, AgentsView(), AgentsViewProps, hasLiveAgent(), normalize(), KIND_BADGES, TicketBadges() (+20 more)

### Community 68 - "schema.test.ts"
Cohesion: 0.10
Nodes (38): dragKeys(), groupCountLabel(), groupSortId(), ListGroup, ProjectList(), ProjectListRowProps, projectSortId(), SortableProjectGroup() (+30 more)

### Community 69 - "reviewFindings.ts"
Cohesion: 0.16
Nodes (12): ChartConfig, ChartContainer, ChartContainerProps, ChartContext, ChartContextValue, ChartLegendContent(), ChartLegendContentProps, ChartTooltipContent() (+4 more)

### Community 70 - "CodexRuntimeStatus"
Cohesion: 0.06
Nodes (41): AssistantPart, AtelierManagerDeps, ConversationRuntime, log, TOOL_DETAIL_KEYS, toolInputSchema, TurnState, ActiveReview (+33 more)

### Community 71 - "PostCSS Config"
Cohesion: 0.29
Nodes (6): name, overrides, zod, private, type, version

### Community 72 - ".publishReviewUnderRepoLock"
Cohesion: 0.23
Nodes (9): PROJECT_ROOT, NewPrdDocument, PrdRenderError, RENDERER_RELATIVE_PATH, renderPrdHtml(), RenderPrdHtmlInput, resolvePrdRendererPath(), TEMPLATE_PATH (+1 more)

### Community 73 - "TerminalView.tsx"
Cohesion: 0.09
Nodes (36): AGENT_EFFORT_FULL_LABELS, AGENT_MODEL_FULL_LABELS, CODEX_EFFORT_FULL_LABELS, CONVERSATION_STATUS_LABELS, ConversationStatus, RESEARCH_OPTION_KEYS, RESEARCH_OPTION_LABELS, ResearchOptionKey (+28 more)

### Community 74 - "button.tsx"
Cohesion: 0.08
Nodes (35): ORCHESTRATORS, SkillStatus, availableSkillProviders(), expectedSkillPaths(), HOST_SKILL_ROOTS, missingSkillProviders(), SKILL_REQUIREMENTS, SKILL_TIERS (+27 more)

### Community 75 - ".handleRequest"
Cohesion: 0.11
Nodes (14): analyzeResultSchema, compactTicketSchema, createResultSchema, errorResultSchema, ISOLATED_ENV_KEYS, projectResultSchema, savedEnv, startResultSchema (+6 more)

### Community 76 - "usePrdSearch.ts"
Cohesion: 0.20
Nodes (4): ActionSystem, CapabilityCache, ImportNotionOptions, CodexRuntimeStatus

### Community 78 - "csv.ts"
Cohesion: 0.05
Nodes (26): RecordingSystemAdapter, FailedReformulation, dryRunLog, fakeEncoder, fakeMissingKey(), hexToBytes(), NOTE: same dry-run stance as checkClaudeAvailable: every skill reported installe, DoneGateResult (+18 more)

### Community 79 - "WorktreeSession"
Cohesion: 0.33
Nodes (3): listeners, mcp, ReplyArgsSchema

### Community 80 - "recordedAction.ts"
Cohesion: 0.24
Nodes (16): alternation(), COMMAND_WRAPPERS, commandSegments(), commandWords(), executableName(), launchedPackageScript(), launchesTypecheck(), OPTIONS_WITH_VALUE (+8 more)

### Community 81 - "index.ts"
Cohesion: 0.17
Nodes (17): ensureConfig(), boot(), externalUrlFromNewWindowEvent(), forwardAtelierShortcut(), installApplicationMenu(), installMenuShortcutBridge(), menuShortcutActionSchema, navigationEventSchema (+9 more)

### Community 82 - ".getReviewPass"
Cohesion: 0.10
Nodes (18): defaultProjectLookup(), buildAskContract(), groupFeasibilityTickets(), featureBranch(), slotPath(), resolveTemplatePaths(), TemplatePaths, computeWorktreeAddresses() (+10 more)

### Community 86 - "vcsCommands.ts"
Cohesion: 0.20
Nodes (7): AZURE_COMMANDS, COMMANDS_BY_PROVIDER, GITHUB_COMMANDS, PrDiffContext, VcsCleanCommands, AZ_SETTLED_THREAD_STATUSES, VCS_PROVIDER_LABELS

### Community 87 - "atelier.ts"
Cohesion: 0.31
Nodes (9): buildAtelierPrompt(), buildAtelierRegenerationTurn(), buildAuthoringRules(), buildFraming(), buildHistory(), buildResearch(), buildRole(), HISTORY_ROLE_LABELS (+1 more)

### Community 89 - "usePrdSearch.ts"
Cohesion: 0.40
Nodes (10): buildReviewContract(), buildReviewFixLines(), buildReviewSteps(), commitLanguageLabel(), resolveReviewLanguage(), reviewCalls(), reviewKinds(), reviewStyleHeaderLines() (+2 more)

### Community 90 - "Profile"
Cohesion: 0.48
Nodes (3): mapProfileRow(), nullableBooleanValue(), Profile

### Community 92 - "TerminalSessionManager"
Cohesion: 0.20
Nodes (10): columnSchema, MetaRow(), MetaRowProps, PrdOriginRowProps, STATUS_CONFIRMS, StatusConfirm, statusTitle(), TicketMeta() (+2 more)

### Community 93 - "ColumnActionsMenu.tsx"
Cohesion: 0.25
Nodes (7): Azure DevOps support — state file, Decisions (validated by the owner, 2026-09-21), Goal, Known blockers for lots 3 and 4, Open questions, Progress, Verified on this machine (az 2.90.0, azure-devops 1.0.8)

### Community 94 - ".addComment"
Cohesion: 0.06
Nodes (32): setup(), Watchdog, WorktreeAddressWatcher, log, runFirstBootSetup(), listProjectKeys(), projectConfigSchema, PROJECT_ROOT (+24 more)

### Community 95 - "TicketConfigSummary.tsx"
Cohesion: 0.50
Nodes (3): appBundle, EMBEDDED_BINARIES, resourcesApp

### Community 98 - "usePrdSearch.ts"
Cohesion: 0.06
Nodes (35): azureChangeEntrySchema, azureCommentSchema, AzureDevopsVcsClient, azureIdentitySchema, azureIterationChangesSchema, azureIterationListSchema, azurePath(), azurePolicyListSchema (+27 more)

### Community 99 - "reviewPublishingGuard.ts"
Cohesion: 0.07
Nodes (35): API_GUARDS, API_READ_METHOD_SET, ApiDenyPatterns, ApiGuard, AZ_INVOKE_COMMAND, AZ_INVOKE_METHOD_LONG_FLAGS, AZ_INVOKE_WRITE_INPUT_LONG_FLAGS, AZ_PR_WRITE_PATTERN (+27 more)

### Community 100 - ".startVerification"
Cohesion: 0.08
Nodes (25): $ref, $ref, enum, $ref, $ref, properties, designConsiderations, goals (+17 more)

### Community 101 - "codexProvider.test.ts"
Cohesion: 0.33
Nodes (6): VCS_PROVIDERS, parsePrUrl(), PR_URL_SEGMENT, prNumberFromUrl(), PrUrlRef, ticketPrNumber()

### Community 105 - "createMcpServer"
Cohesion: 0.09
Nodes (23): $ref, $ref, $ref, minLength, type, minLength, type, enum (+15 more)

### Community 106 - "usePrdSearch.ts"
Cohesion: 0.11
Nodes (18): ANSI, appendToLogFile(), COLOR_ENABLED, disableFileLogging(), initLogFile(), isLevel(), Level, LEVEL_ORDER (+10 more)

### Community 107 - "azureRemote.ts"
Cohesion: 0.35
Nodes (11): azureOrgUrl(), AzureRepoRef, fromAzureSegments(), fromCollectionSegments(), fromLegacySegments(), fromSshSegments(), parseAzureRepoRef(), parseRemoteLocation() (+3 more)

### Community 108 - "WorkflowView.tsx"
Cohesion: 0.09
Nodes (22): axes, designConsiderations, goals, id, locale, openQuestions, outOfScope, preDraft (+14 more)

### Community 111 - "FakePaneStream"
Cohesion: 0.43
Nodes (6): renderCollapsedFinding(), escapeHtml(), renderCollapsedDetails(), renderOutsideDiffComment(), renderOutsideDiffSection(), ReviewPublicationComment

### Community 112 - "useSavedFlash.ts"
Cohesion: 0.36
Nodes (5): applyDesktopEnv(), DesktopRoots, ensureMcpToken(), regenerateMcpToken(), temporaryDirectories

### Community 114 - "ApiDenyPatterns"
Cohesion: 0.08
Nodes (10): ProjectConfig, mapAgentMessageRow(), mapAutomationRunRow(), serializeErrorDetails(), SqlUpdateBuilder, Store, runRecordedAction(), AgentMessage (+2 more)

### Community 116 - "settings.tsx"
Cohesion: 0.05
Nodes (56): codexRuntimeStatusSchema, isCodexFastServiceTier(), pairedRuntimeCodexEffort(), UNKNOWN_CODEX_RUNTIME_STATUS, COMMIT_LANGUAGES, CommitLanguage, pairedCodexEffort(), CodexAgentFields() (+48 more)

### Community 119 - "AgentMessage"
Cohesion: 0.11
Nodes (19): items, maxItems, minItems, type, uniqueItems, $ref, axes, requirements (+11 more)

### Community 120 - "ProjectPanel.tsx"
Cohesion: 0.11
Nodes (17): Agent session (server), Architecture decisions, Atelier (conversation → PRD → cards) — implementation state, Contract injection, Follow-ups noticed in Lot A, Goal, Lot A public API (use these names in Lots B and C), Lot B public surface and deviations (read before Lot C/D) (+9 more)

### Community 121 - "VcsConnectionResult"
Cohesion: 0.05
Nodes (41): CodexAppServerConnection, CodexAppServerInitializationError, CodexAppServerNotification, CodexAppServerOptions, CodexAppServerProtocolError, CodexAppServerRpcError, connectCodexAppServer(), incomingSchema (+33 more)

### Community 124 - "useSavedFlash.ts"
Cohesion: 0.16
Nodes (10): canonicalJson(), CodexCommandHook, codexSessionPreToolUseHookHash(), JsonValue, createCodexProvider(), AppServerFixtureOptions, hookPathForSession(), options() (+2 more)

### Community 126 - "TicketOperations"
Cohesion: 0.11
Nodes (24): AtelierPromptInput, SubmittedTurn, mapConversationMessageRow(), attachment(), conversationTitle(), createAtelierRoutes(), prdExportName(), settingsChanged() (+16 more)

### Community 127 - "TerminalSessionManager"
Cohesion: 0.13
Nodes (16): nonEmptyStringArray, stringArray, items, type, uniqueItems, minLength, pattern, type (+8 more)

### Community 129 - "prd.schema.json"
Cohesion: 0.29
Nodes (6): additionalProperties, $id, required, $schema, title, type

### Community 134 - "id"
Cohesion: 0.15
Nodes (14): additionalProperties, properties, required, type, axis, id, maxLength, pattern (+6 more)

### Community 142 - "$defs"
Cohesion: 0.17
Nodes (12): pattern, type, $defs, axisId, requirement, task, additionalProperties, required (+4 more)

### Community 144 - "title"
Cohesion: 0.18
Nodes (11): source, ref, title, minLength, type, additionalProperties, properties, required (+3 more)

### Community 145 - "preDraft"
Cohesion: 0.18
Nodes (11): additionalProperties, properties, required, type, preDraft, reuse, sharedSurfaces, sourcePriority (+3 more)

### Community 152 - "McpSettingsControllerDependencies"
Cohesion: 0.22
Nodes (4): McpTokenSource, createMcpSettingsController(), McpSettingsControllerDependencies, temporaryDirectories

### Community 160 - "createMcpServer"
Cohesion: 0.20
Nodes (8): createMcpServer(), invalidInput(), listPublicProjects(), OutputValidator, toolError(), toolResult(), FeasibilityStarter, TicketOperations

## Knowledge Gaps
- **909 isolated node(s):** `Permission refusals are specific to a command and session`, `Two agent providers: implement every host integration for both`, `Azure reviewer response nullability`, `PR_STATE_BY_AZURE_STATUS`, `VOTE_BY_EVENT` (+904 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Ticket` connect `NPM Scripts` to `Contract Building & Slots`, `Desktop Bootstrap & Menus`, `Feasibility Batch Management`, `Fake System Adapter`, `PR Selection & Slots Bar`, `Real System Adapter`, `Core Domain Concepts`, `Database Store Operations`, `Coordinator & Protocol`, `API Routes & Reformulate`, `Live Terminal Views`, `Dev Dependencies`, `Client Hub & Watchdog`, `Session Hub & Agent Session`, `PRD Review & Markdown`, `Runtime Dependencies`, `Agent Profile Config`, `API Client Inputs`, `Ticket Config & Constants`, `Modal Dialogs`, `Community 48`, `Slot State`, `Stats Hooks & Cards`, `repairPath.ts`, `CSV Parsing`, `triageManager.ts`, `Package Manifest`, `TerminalView.tsx`, `CodexRuntimeStatus`, `.getReviewPass`, `TerminalSessionManager`, `TerminalSession`, `ApiDenyPatterns`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **Why does `Store` connect `ApiDenyPatterns` to `Desktop Bootstrap & Menus`, `Core Domain Concepts`, `API Routes & Reformulate`, `Dev Dependencies`, `Client Hub & Watchdog`, `Cost & Pricing`, `Agents View & Ticket Cards`, `PRD Review & Markdown`, `NPM Scripts`, `Runtime Dependencies`, `API Client Inputs`, `Demo Pipeline Concepts`, `Modal Dialogs`, `Community 48`, `Package Manifest`, `prUrl.ts`, `CodexRuntimeStatus`, `.getReviewPass`, `Profile`, `.addComment`, `TicketOperations`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Why does `RealSystemAdapter` connect `Community 51` to `Ticket Action Panels`, `Agent Coordinator Handlers`, `TerminalSession`, `Slot Config & Worktree Watch`, `button.tsx`, `usePrdSearch.ts`, `Chart Primitives`, `csv.ts`, `Demo Pipeline Concepts`, `Community 54`, `TypeScript Config`, `.addComment`, `File Uploads`, `useSavedFlash.ts`, `TicketCard.tsx`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **What connects `Permission refusals are specific to a command and session`, `Two agent providers: implement every host integration for both`, `Azure reviewer response nullability` to the rest of the system?**
  _921 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Contract Building & Slots` be split into smaller, more focused modules?**
  _Cohesion score 0.02193419740777667 - nodes in this community are weakly interconnected._
- **Should `Terminals UI & Notifications` be split into smaller, more focused modules?**
  _Cohesion score 0.08266129032258064 - nodes in this community are weakly interconnected._
- **Should `Desktop Bootstrap & Menus` be split into smaller, more focused modules?**
  _Cohesion score 0.07688492063492064 - nodes in this community are weakly interconnected._