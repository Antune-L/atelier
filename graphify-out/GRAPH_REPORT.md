# Graph Report - kanban-agents  (2026-10-01)

## Corpus Check
- 307 files · ~784,443 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3843 nodes · 10703 edges · 139 communities (127 shown, 12 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 74 edges (avg confidence: 0.65)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `facc4a60`
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
- AgentMessage
- usePrdSearch.ts
- split.ts
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
- settings.tsx
- createMcpServer
- usePrdSearch.ts
- azureRemote.ts
- WorkflowView.tsx
- repairPath.ts
- .startReview
- FakePaneStream
- useSavedFlash.ts
- reformulate.ts
- ApiDenyPatterns
- relaunch.ts
- settings.tsx
- .startReviewNow
- codexBinary.ts
- AgentMessage
- ProjectPanel.tsx
- VcsConnectionResult
- recordedAction.ts
- TriageManager
- useSavedFlash.ts
- .handleRequest
- TicketOperations
- TerminalSessionManager
- Profile
- prd.schema.json
- weeklyThroughput
- isProcessing
- id
- $defs
- title
- preDraft
- McpSettingsControllerDependencies
- createMcpServer

## God Nodes (most connected - your core abstractions)
1. `Store` - 148 edges
2. `Ticket` - 103 edges
3. `cn()` - 86 edges
4. `SystemAdapter` - 85 edges
5. `FakeSystemAdapter` - 78 edges
6. `RealSystemAdapter` - 74 edges
7. `VcsProvider` - 58 edges
8. `SlotManager` - 57 edges
9. `DelegationManager` - 55 edges
10. `Orchestrator` - 54 edges

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

## Communities (139 total, 12 thin omitted)

### Community 0 - "Contract Building & Slots"
Cohesion: 0.02
Nodes (124): buildReformulatePrompt(), isNotionUrl(), NOTION_HOSTS, ActionExecutionOptions, actionExecutionOptionsSchema, agentMessageSchema, AnalyzeTicketsInput, appSettingsSchema (+116 more)

### Community 1 - "Terminals UI & Notifications"
Cohesion: 0.10
Nodes (20): analyzeTicketsInputSchema, analyzeTicketsOutputSchema, columnSchema, compactTicketSchema, createTodoTicketOutputSchema, editableTicketSchema, listProjectsInputSchema, listProjectsOutputSchema (+12 more)

### Community 2 - "Desktop Bootstrap & Menus"
Cohesion: 0.06
Nodes (47): main(), scalar(), log, log, ReformulateManager, log, assertCodexDowngradeSafe(), backfillOrchestrator() (+39 more)

### Community 3 - "Feasibility Batch Management"
Cohesion: 0.06
Nodes (59): AGENT_EFFORT_LABELS, AGENT_MODEL_LABELS, AgentProfileConfig(), AutomationCard(), AutomationCardProps, AutomationFormProps, AutomationView(), EMPTY_FORM (+51 more)

### Community 4 - "Ticket Action Panels"
Cohesion: 0.11
Nodes (13): CapturingSystem, AckSystem, RecordingSystem, RecordedSession, RecordingSystem, RelaunchSystem, CapturingSystem, AgentSessionHandle (+5 more)

### Community 5 - "Fake System Adapter"
Cohesion: 0.18
Nodes (17): COLUMN_SORT_FIELD, BoardColumn(), compareFamilyMembers(), familyKeyOf(), groupTicketIds(), groupTicketsByFamily(), isSplitMother(), readCollapsed() (+9 more)

### Community 6 - "Shared Zod Schemas"
Cohesion: 0.13
Nodes (19): ACTIVE_BAR, AREA_CURSOR, AXIS_PROPS, BAR_CURSOR, CHART_PALETTE, CodexTierSummary(), colorAt(), DurationBars() (+11 more)

### Community 7 - "Settings & Profiles UI"
Cohesion: 0.06
Nodes (9): NewProject, ProjectPatch, delay(), fakeShellPrompt(), FakeSystemAdapter, hexToBytes(), ReviewDoneOptions, WorktreeSetupOptions (+1 more)

### Community 8 - "PR Selection & Slots Bar"
Cohesion: 0.12
Nodes (24): CompactTicket, ListTicketsInput, ACTIVE_STAGES, Column, COLUMN_LABELS, COLUMNS, ACTIVE_COLUMNS, Board() (+16 more)

### Community 9 - "Real System Adapter"
Cohesion: 0.06
Nodes (68): pairedRuntimeCodexEffort(), UNKNOWN_CODEX_RUNTIME_STATUS, agentEffortSchema, Capabilities, AtelierAgentFields(), CleanPrPanel(), CodexAgentFields(), CodexAgentFieldsProps (+60 more)

### Community 10 - "Slot Config & Worktree Watch"
Cohesion: 0.14
Nodes (12): directories, initializeParamsSchema, log, requestSchema, rpcError(), rpcResult(), rpcResponseSchema, toolCallParamsSchema (+4 more)

### Community 11 - "Core Domain Concepts"
Cohesion: 0.03
Nodes (71): agentMessageRowSchema, AutomationRow, automationRowSchema, AutomationRunRow, automationRunRowSchema, buildScripts(), CommentRow, commentRowSchema (+63 more)

### Community 12 - "Board & Sidebar Layout"
Cohesion: 0.13
Nodes (17): RESEARCH_OPTION_KEYS, ResearchOptionKey, enabledResearchOptionKeys(), researchOptionsFromKeys(), isResearchOptionKey(), ResearchFields(), ResearchFieldsProps, TICKET_OPTION (+9 more)

### Community 13 - "Database Store Operations"
Cohesion: 0.05
Nodes (57): RFC-4180, ProjectInfo, App(), HOME_VIEW_OPTIONS, HomeView, AskPanelProps, CleanPrPanelProps, ImportTicketsPanel() (+49 more)

### Community 14 - "Coordinator & Protocol"
Cohesion: 0.14
Nodes (19): COLUMN_ORDER, PrdTab(), TICKET_TAB_LABELS, TicketTab, TicketTabs(), TicketTabsProps, availableTabs(), hasSessionPane() (+11 more)

### Community 15 - "API Routes & Reformulate"
Cohesion: 0.06
Nodes (36): CLAUDE_CONVERSATION, closers, CODEX_CONVERSATION, setup(), TEMPLATE_PATH, TURN_END, cleanTicket(), conflictTicket() (+28 more)

### Community 16 - "Stats Aggregation"
Cohesion: 0.08
Nodes (9): startParentSession(), mergeAgentUsageByModel(), SessionHub, SessionHubHandlers, SessionStartCallbacks, PendingSplit, SplitManager, AgentSessionEvent (+1 more)

### Community 17 - "Triage & Server Hub"
Cohesion: 0.08
Nodes (25): devDependencies, autoprefixer, class-variance-authority, clsx, concurrently, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities (+17 more)

### Community 18 - "Live Terminal Views"
Cohesion: 0.07
Nodes (38): ATELIER_WEB_TOOLS, AZURE_BASH_ALLOWLIST, AZURE_CLEAN_BASH_ALLOWLIST, BASH_ALLOWLIST, bashAllowlist(), buildFeasibilitySessionConfig(), buildImplementSessionConfig(), buildSplitSessionConfig() (+30 more)

### Community 19 - "Stage Progress & Display"
Cohesion: 0.08
Nodes (24): compilerOptions, allowImportingTsExtensions, baseUrl, esModuleInterop, isolatedModules, jsx, lib, module (+16 more)

### Community 20 - "Real Adapter GH/Composer"
Cohesion: 0.10
Nodes (27): FAILURE_COLUMNS, Kind, KINDS, SUCCESS_COLUMNS, DurationChart(), OutcomeChart(), SuccessRateChart(), effectiveWorkDurationMs() (+19 more)

### Community 21 - "Store Types & Agent Knobs"
Cohesion: 0.08
Nodes (83): agent_context_html(), agent_entry_count(), axes_html(), axis_anchor(), axis_head_html(), axis_items(), axis_section_html(), axis_statuses() (+75 more)

### Community 22 - "DB Row Schemas & Mappers"
Cohesion: 0.40
Nodes (4): normalizeCreateInput(), requestKeyConflictMessage(), ticketDependencyError(), deriveTitleFromDescription()

### Community 23 - "Dev Dependencies"
Cohesion: 0.20
Nodes (10): projectConfigSchema, buildAppSettingsPatch(), LegacyConfig, legacyConfigSchema, LegacyModels, log, parseLegacyConfig(), pickModel() (+2 more)

### Community 24 - "TypeScript Config"
Cohesion: 0.12
Nodes (23): ensureClaudeBinary(), bashCommandSchema, buildSettings(), claudeProvider, createSdkAgentSession(), denyBashHook(), denyNoVerifyHook, denyReviewPublishingHook (+15 more)

### Community 26 - "Cost & Pricing"
Cohesion: 0.09
Nodes (18): buildAtelierConsolidateTurn(), buildAtelierPrompt(), buildAtelierRegenerationTurn(), buildAuthoringRules(), buildFraming(), buildHistory(), buildResearch(), buildRole() (+10 more)

### Community 27 - "Workflow View & Lifecycle"
Cohesion: 0.05
Nodes (30): Architecture, Commands, Conventions (enforced — beyond the global ones in ~/.claude/CLAUDE.md), graphify, The dry-run safety model — read before running anything, What this is, Agent runtime, Architecture (+22 more)

### Community 28 - "Stats Charts"
Cohesion: 0.06
Nodes (46): AgentMcpServerDefinition, codexCommandPolicyScript(), agentMessageDeltaSchema, agentToml(), apiWriteDenyScript(), buildMcpServers(), ConfigObject, configReadResponseSchema (+38 more)

### Community 29 - "Session Hub & Agent Session"
Cohesion: 0.20
Nodes (32): AtelierSessionInput, ProjectKey, AutomationPatch, ConversationPatch, NewAsk, NewAutomation, NewClean, NewConversation (+24 more)

### Community 30 - "Agents View & Ticket Cards"
Cohesion: 0.05
Nodes (68): formatPrdDocumentIssues(), log, logRejection(), ToolHandler, ToolResult, ExecutionFinishStatus, LiveSession, log (+60 more)

### Community 31 - "PRD Review & Markdown"
Cohesion: 0.09
Nodes (37): ALSO_FLAGGED_PREFIX, dedupeFindings(), DEFAULT_FINDING_RENDER_STYLE, DimensionFinding, findingAnchor(), FindingRenderStyle, FRENCH_STOP_WORD_PATTERN, FRENCH_STOP_WORDS (+29 more)

### Community 32 - "User Terminal & Fake IO"
Cohesion: 0.08
Nodes (32): DEFAULT_MODELS, mapReviewApprovalRow(), mapReviewPassRow(), AttachExecutionSessionInput, EnqueueAgentMessageInput, FinalizeExecutionInput, MarkAgentMessageAcceptedInput, MarkAgentMessageReceivedInput (+24 more)

### Community 33 - "Logging"
Cohesion: 0.10
Nodes (21): scripts, build:desktop, build:web, dev, dev:desktop, dev:proxy, dev:server, dev:web (+13 more)

### Community 34 - "Board Columns"
Cohesion: 0.13
Nodes (23): ActiveDelegation, AppliedPath, copyDependencies(), copyPath(), DelegationWorkspace, ensureParentDirectory(), FileState, git() (+15 more)

### Community 35 - "NPM Scripts"
Cohesion: 0.15
Nodes (7): stalledEventPayload(), TicketLifecycle, ErrorDetailsSource, Ticket, DescriptionTabProps, PrdTabProps, TicketActionsProps

### Community 36 - "Runtime Dependencies"
Cohesion: 0.08
Nodes (33): agentPairError(), attachment(), cleanDescription(), CONVERSATION_STATUS_FOR_PRD, conversationTitle(), createApiRoutes(), createAtelierRoutes(), createSplitChildren() (+25 more)

### Community 37 - "Claude SDK Provider"
Cohesion: 0.09
Nodes (22): dependencies, @anthropic-ai/claude-agent-sdk, dompurify, elysia, @fontsource/ibm-plex-mono, @fontsource/ibm-plex-sans, marked, @modelcontextprotocol/sdk (+14 more)

### Community 38 - "Agent Profile Config"
Cohesion: 0.17
Nodes (14): costByFamily(), costOf(), costOfModel(), costOfSessions(), CostSummary, FamilyPricing, MODEL_PRICING, ModelFamily (+6 more)

### Community 39 - "Agent Coordinator Handlers"
Cohesion: 0.17
Nodes (18): adopt(), compareVersions(), configureClaudeProvisionDir(), detectionCandidates(), detectUserInstall(), downloadAndVerifyTarball(), downloadPinnedBinary(), emitProgress() (+10 more)

### Community 40 - "API Client Inputs"
Cohesion: 0.18
Nodes (3): childTranscriptPrefix(), implementationScopesOverlap(), normalizeImplementationScope()

### Community 41 - "Ticket Config & Constants"
Cohesion: 0.20
Nodes (12): isCodexFastServiceTier(), summarizeSessionCosts(), totalTokensOf(), totalTokensOfSessions(), StatRecord, executionCosts(), executionTokens(), projectStatRecord() (+4 more)

### Community 42 - "Ticket Detail & Triage UI"
Cohesion: 0.11
Nodes (27): RepoInspectionSource, ConnectionHint, CreateStep, isPositiveIntegerString(), isValidDraft(), ProjectPanel(), TIMEOUT_UNITS, toVcsProvider() (+19 more)

### Community 43 - "Demo Pipeline Concepts"
Cohesion: 0.14
Nodes (8): FakePaneStream, PaneStream, dataMessage(), normalizeSeed(), send(), TerminalSession, visibleText(), TerminalServerMessage

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
Cohesion: 0.13
Nodes (35): buildCleanContract(), buildConflictResolutionContract(), buildFeasibilityBatchContract(), buildFeasibilityContextSection(), buildImplementingSteps(), buildMockupReviewStep(), buildPlanningStep(), buildPrdBullet() (+27 more)

### Community 48 - "Community 48"
Cohesion: 0.10
Nodes (18): TicketCreationRequestConflictError, AnalyzeTicketRejectionReason, AnalyzeTicketsResult, CreateTodoTicketInput, createTodoTicketInputSchema, CreateTodoTicketResult, isActive(), isBlocked() (+10 more)

### Community 49 - "Slot State"
Cohesion: 0.07
Nodes (23): WsClientEvent, ATTENTION_STATUSES, sessionOf(), SlotPips(), SlotPipsProps, STATUS_LABELS, STATUS_PIP_CLASSES, active (+15 more)

### Community 50 - "Stats Hooks & Cards"
Cohesion: 0.16
Nodes (12): ChartConfig, ChartContainer, ChartContainerProps, ChartContext, ChartContextValue, ChartLegendContent(), ChartLegendContentProps, ChartTooltipContent() (+4 more)

### Community 51 - "Community 51"
Cohesion: 0.07
Nodes (9): runBoundedCommand(), detectInstallCommand(), realpathSafe(), RealSystemAdapter, resolveWorktreeScriptCommand(), setupOutputExcerpt(), shQuote(), DoneGateResult (+1 more)

### Community 52 - "repairPath.ts"
Cohesion: 0.06
Nodes (39): Block, blockText(), compactChunks(), firstCharCode(), TranscriptBuffer, trimBlockStart(), AgentStreamBlock, TERMINAL_STAGES (+31 more)

### Community 53 - "User Terminal Manager"
Cohesion: 0.33
Nodes (5): CONTEXT — domain glossary, Execution, Proposed (not yet built), Seams, Work items

### Community 54 - "Community 54"
Cohesion: 0.10
Nodes (22): extractPrUrl(), fetchGithubOpenPrs(), ghPrHeadSchema, ghPrSchema, ghPrStateSchema, ghRestPullSchema, ghRestReviewPagesSchema, ghRestReviewSchema (+14 more)

### Community 55 - "App.tsx"
Cohesion: 0.21
Nodes (3): FeasibilityBatchManager, toTriageResult(), FeasibilityResult

### Community 56 - "CSV Parsing"
Cohesion: 0.15
Nodes (20): ColumnActionsMenu(), ColumnActionsMenuProps, ColumnMenuItem, ActionContext, buildActions(), ConfirmSpec, errorMessage(), RETRY_STAGES (+12 more)

### Community 57 - "Community 57"
Cohesion: 0.23
Nodes (10): artifactPath, assertPackageVersionInSync(), assertSdkVersionsInSync(), BUILT_DMG, ELECTROBUN_BIN, fail(), installedPackageVersion(), RELEASE_FOLDER (+2 more)

### Community 58 - "File Uploads"
Cohesion: 0.29
Nodes (9): gitMetadataWritableRoots(), agentBaseEnv(), bestInstalledMatch(), compareParts(), envWithProjectNode(), nvmNodeBinDir(), readNvmrc(), prepareProjectShell() (+1 more)

### Community 59 - "triageManager.ts"
Cohesion: 0.21
Nodes (17): buildContractConstraintsLines(), buildResponseFormatLines(), buildStrictRulesLines(), buildTicketLines(), buildTriageChannelPrompt(), buildTriagePlusChannelPrompt(), isEnglish(), readOnlyFramingLines() (+9 more)

### Community 60 - "Package Manifest"
Cohesion: 0.13
Nodes (10): assertCodexImplementerAvailable(), featureBranch(), SlotManager, slotPath(), slugify(), mapSlotRow(), mapWorktreeSessionRow(), enrichWorktreeSession() (+2 more)

### Community 61 - "splitManager.ts"
Cohesion: 0.40
Nodes (4): PR review counting and publication correction state, Progress, Scope and decisions, Verification

### Community 62 - "TicketCard.tsx"
Cohesion: 0.07
Nodes (43): AGENTS_SKILLS_DIR, CLAUDE_JSON_PATH, CLAUDE_SKILLS_DIR, commandOutputOrNull(), COMPOSER_BINARIES, DEFAULT_CODEX_HOME, GitRemoteFacts, INSTALL_COMMANDS (+35 more)

### Community 63 - "Community 63"
Cohesion: 0.25
Nodes (3): listPublicProjects(), PublicMcpManager, TicketOperations

### Community 64 - "Composer Run Script"
Cohesion: 0.05
Nodes (59): PROJECT_ROOT, NewPrdDocument, PrdRenderError, RENDERER_RELATIVE_PATH, renderPrdHtml(), RenderPrdHtmlInput, resolvePrdRendererPath(), TEMPLATE_PATH (+51 more)

### Community 65 - "split.ts"
Cohesion: 0.22
Nodes (8): AtelierDesktopRpcSchema, DesktopRequests, McpSettingsMetadata, WebviewRequests, McpSettingsController, createMcpSettingsClient(), getMcpSettingsClient(), McpSettingsClient

### Community 66 - "prUrl.ts"
Cohesion: 0.16
Nodes (6): AutomationManager, mapAutomationRow(), mapAutomationRunRow(), AutomationRunStatus, Automation, AutomationRun

### Community 67 - "TerminalView.tsx"
Cohesion: 0.11
Nodes (29): AgentCard(), AgentCardProps, AgentsView(), AgentsViewProps, hasLiveAgent(), normalize(), KIND_BADGES, TicketBadges() (+21 more)

### Community 68 - "schema.test.ts"
Cohesion: 0.11
Nodes (37): ManagedProject, dragKeys(), groupCountLabel(), groupSortId(), ListGroup, ProjectList(), ProjectListProps, ProjectListRowProps (+29 more)

### Community 69 - "reviewFindings.ts"
Cohesion: 0.09
Nodes (22): ActiveReview, ActiveReviewPass, BOARD_FINDING_RENDER_STYLE, ClosableExecution, log, orderedReviewKinds(), renderPersistedReviewResult(), REVIEW_DISALLOWED_TOOLS (+14 more)

### Community 70 - "CodexRuntimeStatus"
Cohesion: 0.05
Nodes (62): AssistantPart, AtelierManagerDeps, ConversationRuntime, defaultProjectLookup(), describeToolUse(), log, TOOL_DETAIL_KEYS, toolInputSchema (+54 more)

### Community 71 - "PostCSS Config"
Cohesion: 0.29
Nodes (6): name, overrides, zod, private, type, version

### Community 73 - "TerminalView.tsx"
Cohesion: 0.09
Nodes (43): AskPanel(), AtelierView(), AtelierViewProps, ComposeState, findPrdConversation(), PrdSeen, candidatesFor(), CardCandidate (+35 more)

### Community 74 - "button.tsx"
Cohesion: 0.07
Nodes (42): fakeMissingKey(), ORCHESTRATOR_LABELS, ORCHESTRATORS, SkillStatus, availableSkillProviders(), expectedSkillPaths(), HOST_SKILL_ROOTS, missingSkillProviders() (+34 more)

### Community 75 - ".handleRequest"
Cohesion: 0.11
Nodes (14): analyzeResultSchema, compactTicketSchema, createResultSchema, errorResultSchema, ISOLATED_ENV_KEYS, projectResultSchema, savedEnv, startResultSchema (+6 more)

### Community 76 - "usePrdSearch.ts"
Cohesion: 0.18
Nodes (7): ActionSystem, CapabilityCache, CodexRuntimeModel, codexRuntimeModelSchema, CodexRuntimeStatus, codexRuntimeStatusSchema, runtime

### Community 78 - "csv.ts"
Cohesion: 0.07
Nodes (12): ReviewHeadResult, ReviewPublicationState, FAKE_OPEN_PRS, FakeVcsClient, githubPrHeadRef(), CreatePrResult, ReviewPublicationCheck, VcsClient (+4 more)

### Community 79 - "WorktreeSession"
Cohesion: 0.33
Nodes (3): listeners, mcp, ReplyArgsSchema

### Community 80 - "recordedAction.ts"
Cohesion: 0.23
Nodes (17): alternation(), COMMAND_WRAPPERS, commandSegments(), commandWords(), executableName(), launchedPackageScript(), launchesTypecheck(), OPTIONS_WITH_VALUE (+9 more)

### Community 81 - "index.ts"
Cohesion: 0.17
Nodes (17): ensureConfig(), boot(), externalUrlFromNewWindowEvent(), forwardAtelierShortcut(), installApplicationMenu(), installMenuShortcutBridge(), menuShortcutActionSchema, navigationEventSchema (+9 more)

### Community 86 - "vcsCommands.ts"
Cohesion: 0.20
Nodes (7): AZURE_COMMANDS, COMMANDS_BY_PROVIDER, GITHUB_COMMANDS, PrDiffContext, VcsCleanCommands, AZ_SETTLED_THREAD_STATUSES, VCS_PROVIDER_LABELS

### Community 89 - "usePrdSearch.ts"
Cohesion: 0.06
Nodes (33): AUTOMATION_RUN_STATUSES, AUTOMATION_TRIGGER_LABELS, AUTOMATION_TRIGGERS, CODEX_EFFORT_FULL_LABELS, CODEX_EFFORT_LABELS, CODEX_MODEL_LABELS, COMMENT_AUTHORS, CommentAuthor (+25 more)

### Community 90 - "split.ts"
Cohesion: 0.12
Nodes (7): RecordingSystemAdapter, PublishReviewOptions, PublishReviewResult, GithubVcsClient, pullApiEndpoint(), reviewApiEndpoint(), rightSideDiffLines()

### Community 92 - "TerminalSessionManager"
Cohesion: 0.11
Nodes (21): columnSchema, CostSummary(), MetaRow(), MetaRowProps, formatErrorDetails(), OverviewTab(), OverviewTabProps, SUMMARY_COLUMNS (+13 more)

### Community 93 - "ColumnActionsMenu.tsx"
Cohesion: 0.25
Nodes (7): Azure DevOps support — state file, Decisions (validated by the owner, 2026-09-21), Goal, Known blockers for lots 3 and 4, Open questions, Progress, Verified on this machine (az 2.90.0, azure-devops 1.0.8)

### Community 94 - ".addComment"
Cohesion: 0.07
Nodes (21): setup(), Watchdog, PROJECT_ROOT, NOTE: PRD generation holds the request open up to ~120s (REFORMULATE_TIMEOUT_MS), resolveDataFile(), resolveServerPort(), serveStaticAsset(), SocketData (+13 more)

### Community 95 - "TicketConfigSummary.tsx"
Cohesion: 0.50
Nodes (3): appBundle, EMBEDDED_BINARIES, resourcesApp

### Community 98 - "usePrdSearch.ts"
Cohesion: 0.06
Nodes (37): ReviewPublicationEvent, azureChangeEntrySchema, azureCommentSchema, AzureDevopsVcsClient, azureIdentitySchema, azureIterationChangesSchema, azureIterationListSchema, azurePath() (+29 more)

### Community 99 - "reviewPublishingGuard.ts"
Cohesion: 0.07
Nodes (35): API_GUARDS, API_READ_METHOD_SET, ApiDenyPatterns, ApiGuard, AZ_INVOKE_COMMAND, AZ_INVOKE_METHOD_LONG_FLAGS, AZ_INVOKE_WRITE_INPUT_LONG_FLAGS, AZ_PR_WRITE_PATTERN (+27 more)

### Community 100 - ".startVerification"
Cohesion: 0.08
Nodes (25): $ref, $ref, enum, $ref, $ref, properties, designConsiderations, goals (+17 more)

### Community 101 - "codexProvider.test.ts"
Cohesion: 0.33
Nodes (6): VCS_PROVIDERS, parsePrUrl(), PR_URL_SEGMENT, prNumberFromUrl(), PrUrlRef, ticketPrNumber()

### Community 102 - "RealPaneStream"
Cohesion: 0.22
Nodes (3): AgentProvider, runOneShotSession(), RealPaneStream

### Community 103 - "TerminalSession"
Cohesion: 0.05
Nodes (3): SystemAdapter, safeParse(), TerminalSessionManager

### Community 104 - "settings.tsx"
Cohesion: 0.13
Nodes (16): CodexAppServerConnection, connectCodexAppServer(), spawnCodexAppServer(), createCodexAgentSession(), accountResponseSchema, CodexRuntimeDependencies, hasExplicitCodexApiKey(), isProtocolIncompatibility() (+8 more)

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

### Community 109 - "repairPath.ts"
Cohesion: 0.12
Nodes (22): PrdAnnotation, prdAnnotationsSchema, FeedbackDraft, PrdAnnotatorProps, BREADCRUMB, NO_ANNOTATIONS, PrdReviewDialog(), PrdReviewDialogProps (+14 more)

### Community 110 - ".startReview"
Cohesion: 0.67
Nodes (3): sleep(), startAndApproveReviews(), submitReviews()

### Community 111 - "FakePaneStream"
Cohesion: 0.53
Nodes (5): escapeHtml(), renderCollapsedDetails(), renderOutsideDiffComment(), renderOutsideDiffSection(), ReviewPublicationComment

### Community 112 - "useSavedFlash.ts"
Cohesion: 0.36
Nodes (5): applyDesktopEnv(), DesktopRoots, ensureMcpToken(), regenerateMcpToken(), temporaryDirectories

### Community 113 - "reformulate.ts"
Cohesion: 0.13
Nodes (20): FEASIBILITY_ENGINES, IMPLEMENTERS, STAGE_LABELS, FILLED_GLYPH_COLORS, StageProgressBar(), StageProgressBarProps, BadgeVariant, CardState (+12 more)

### Community 114 - "ApiDenyPatterns"
Cohesion: 0.07
Nodes (5): startFeasibilityTicket(), ProjectConfig, SqlUpdateBuilder, Store, migrateConfigJsonIfPresent()

### Community 115 - "relaunch.ts"
Cohesion: 0.22
Nodes (18): AGENT_EFFORT_FULL_LABELS, AGENT_MODEL_FULL_LABELS, ProfileConfig, ProfilePipeline(), ProfileRowHeaderProps, buildProfilePipeline(), claudeDetail(), claudeSubagentDetail() (+10 more)

### Community 116 - "settings.tsx"
Cohesion: 0.05
Nodes (57): AppSettings, McpSettings(), DragHandleAttributes, DragHandleListeners, ProfileRowHeader(), ProfileRowProps, ProfilesSettings(), NOTE: the saved flag lives here because a saved row remounts (its key carries up (+49 more)

### Community 118 - "codexBinary.ts"
Cohesion: 0.19
Nodes (10): CodexBinaryVersionError, require, resolveCodexBinary(), resolveCodexBinaryOverride(), TARGETS, verifyCodexBinaryVersion(), canonicalJson(), CodexCommandHook (+2 more)

### Community 119 - "AgentMessage"
Cohesion: 0.11
Nodes (19): items, maxItems, minItems, type, uniqueItems, $ref, axes, requirements (+11 more)

### Community 120 - "ProjectPanel.tsx"
Cohesion: 0.11
Nodes (17): Agent session (server), Architecture decisions, Atelier (conversation → PRD → cards) — implementation state, Contract injection, Follow-ups noticed in Lot A, Goal, Lot A public API (use these names in Lots B and C), Lot B public surface and deviations (read before Lot C/D) (+9 more)

### Community 121 - "VcsConnectionResult"
Cohesion: 0.12
Nodes (11): CodexAppServerInitializationError, CodexAppServerProtocolError, CodexAppServerRpcError, incomingSchema, initializeResponseSchema, log, PendingRequest, rpcErrorSchema (+3 more)

### Community 122 - "recordedAction.ts"
Cohesion: 0.32
Nodes (6): serializeErrorDetails(), runRecordedAction(), buildErrorDetails(), describeCause(), ExecutionRun, ExecutionUsageByModel

### Community 124 - "useSavedFlash.ts"
Cohesion: 0.10
Nodes (10): CodexAppServerNotification, CodexAppServerOptions, CodexProviderDependencies, createCodexProvider(), AppServerFixture, AppServerFixtureOptions, hookPathForSession(), options() (+2 more)

### Community 125 - ".handleRequest"
Cohesion: 0.36
Nodes (7): effectivePort(), isAllowedHost(), isAllowedOrigin(), isAuthorized(), isLoopbackHost(), jsonResponse(), parseHost()

### Community 126 - "TicketOperations"
Cohesion: 0.18
Nodes (20): AtelierPromptInput, SubmittedTurn, mapConversationMessageRow(), Conversation, ConversationMessage, PrdDocumentRecord, CardsPanelProps, ConversationPanelProps (+12 more)

### Community 127 - "TerminalSessionManager"
Cohesion: 0.13
Nodes (16): nonEmptyStringArray, stringArray, items, type, uniqueItems, minLength, pattern, type (+8 more)

### Community 128 - "Profile"
Cohesion: 0.48
Nodes (3): mapProfileRow(), nullableBooleanValue(), Profile

### Community 129 - "prd.schema.json"
Cohesion: 0.29
Nodes (6): additionalProperties, $id, required, $schema, title, type

### Community 130 - "weeklyThroughput"
Cohesion: 0.50
Nodes (5): ThroughputChart(), nextWeek(), startOfWeek(), WEEK_LABEL_FORMATTER, weeklyThroughput

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
Cohesion: 0.53
Nodes (5): createMcpServer(), invalidInput(), OutputValidator, toolError(), toolResult()

## Knowledge Gaps
- **940 isolated node(s):** `Permission refusals are specific to a command and session`, `Two agent providers: implement every host integration for both`, `Scope and decisions`, `Progress`, `Verification` (+935 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **12 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Ticket` connect `NPM Scripts` to `Contract Building & Slots`, `Desktop Bootstrap & Menus`, `Feasibility Batch Management`, `Fake System Adapter`, `PR Selection & Slots Bar`, `Core Domain Concepts`, `Database Store Operations`, `Coordinator & Protocol`, `API Routes & Reformulate`, `Live Terminal Views`, `DB Row Schemas & Mappers`, `Client Hub & Watchdog`, `Session Hub & Agent Session`, `PRD Review & Markdown`, `User Terminal & Fake IO`, `Ticket Config & Constants`, `Modal Dialogs`, `Community 48`, `Slot State`, `repairPath.ts`, `CSV Parsing`, `triageManager.ts`, `Package Manifest`, `TerminalView.tsx`, `CodexRuntimeStatus`, `TerminalView.tsx`, `usePrdSearch.ts`, `TerminalSessionManager`, `TerminalSession`, `reformulate.ts`, `ApiDenyPatterns`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Why does `SystemAdapter` connect `TerminalSession` to `Desktop Bootstrap & Menus`, `prUrl.ts`, `NPM Scripts`, `reviewFindings.ts`, `CodexRuntimeStatus`, `Settings & Profiles UI`, `API Client Inputs`, `.publishReviewUnderRepoLock`, `Demo Pipeline Concepts`, `csv.ts`, `Stats Aggregation`, `.getReviewPass`, `Community 51`, `.startReviewNow`, `TicketCard.tsx`, `Cost & Pricing`, `Package Manifest`, `Agents View & Ticket Cards`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `FakeSystemAdapter` connect `Settings & Profiles UI` to `Desktop Bootstrap & Menus`, `Ticket Action Panels`, `CodexRuntimeStatus`, `TerminalSession`, `button.tsx`, `usePrdSearch.ts`, `API Routes & Reformulate`, `Community 51`, `split.ts`, `Agents View & Ticket Cards`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **What connects `Permission refusals are specific to a command and session`, `Two agent providers: implement every host integration for both`, `Scope and decisions` to the rest of the system?**
  _952 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Contract Building & Slots` be split into smaller, more focused modules?**
  _Cohesion score 0.019142689371697004 - nodes in this community are weakly interconnected._
- **Should `Terminals UI & Notifications` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._
- **Should `Desktop Bootstrap & Menus` be split into smaller, more focused modules?**
  _Cohesion score 0.056150600454397924 - nodes in this community are weakly interconnected._