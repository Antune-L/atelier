# Graph Report - kanban-agents  (2026-10-03)

## Corpus Check
- 320 files · ~806,165 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 4109 nodes · 11228 edges · 134 communities (127 shown, 7 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 105 edges (avg confidence: 0.69)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `feaa6296`
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
- prd.schema.json
- TerminalSession
- uploads.ts
- createMcpServer
- usePrdSearch.ts
- azureRemote.ts
- WorkflowView.tsx
- TicketMeta.tsx
- split.ts
- uploads.ts
- useSavedFlash.ts
- PreparedHook
- ApiDenyPatterns
- useSuppressEscapeBeep.ts
- settings.tsx
- runRecordedAction
- properties
- AgentMessage
- ProjectPanel.tsx
- VcsConnectionResult
- Board.tsx
- PrState
- useSavedFlash.ts
- AgentMessage
- TicketOperations
- TerminalSessionManager
- id
- $defs
- title
- preDraft
- createMcpServer

## God Nodes (most connected - your core abstractions)
1. `Store` - 176 edges
2. `Ticket` - 122 edges
3. `SystemAdapter` - 93 edges
4. `cn()` - 86 edges
5. `FakeSystemAdapter` - 84 edges
6. `createApiRoutes()` - 78 edges
7. `RealSystemAdapter` - 78 edges
8. `SlotManager` - 62 edges
9. `ProjectInfo` - 56 edges
10. `SessionHub` - 52 edges

## Surprising Connections (you probably didn't know these)
- `McpSettingsClient` --references--> `McpSettingsMetadata`  [EXTRACTED]
  src/web/src/lib/mcpSettings.ts → desktop/mcpRpc.ts
- `QualityValidatorResult` --references--> `QualityEvidence`  [EXTRACTED]
  src/server/agents/qualityValidator.ts → src/shared/quality.ts
- `main()` --calls--> `migrateCodexCatalog()`  [EXTRACTED]
  scripts/downgrade-codex-catalog.ts → src/server/db/schema.ts
- `main()` --calls--> `assertCodexDowngradeSafe()`  [EXTRACTED]
  scripts/downgrade-codex-catalog.ts → src/server/db/schema.ts
- `RecordedSession` --references--> `AgentSessionOptions`  [EXTRACTED]
  src/server/agents/delegationManager.test.ts → src/server/system/agentSession.ts

## Import Cycles
- 3-file cycle: `src/server/config.ts -> src/server/db/store.ts -> src/server/db/rows.ts -> src/server/config.ts`

## Communities (134 total, 7 thin omitted)

### Community 0 - "Contract Building & Slots"
Cohesion: 0.02
Nodes (127): buildReformulatePrompt(), cleanDescription(), CONVERSATION_STATUS_FOR_PRD, log, orderSelectedTasks(), PrdCardDraft, prdCardDrafts(), prSummaryLines() (+119 more)

### Community 1 - "Terminals UI & Notifications"
Cohesion: 0.08
Nodes (29): analyzeTicketsInputSchema, analyzeTicketsOutputSchema, columnSchema, compactTicketSchema, createTodoTicketOutputSchema, editableTicketSchema, effectivePort(), isAllowedHost() (+21 more)

### Community 2 - "Desktop Bootstrap & Menus"
Cohesion: 0.08
Nodes (18): log, log, ReformulateManager, log, Watchdog, ClientHub, ClientSocket, ClientSocketData (+10 more)

### Community 3 - "Feasibility Batch Management"
Cohesion: 0.04
Nodes (84): PrdDocumentPatch, compileFeedback(), PrdAnnotation, prdAnnotationsSchema, EXPORT_LINK_CLASSES, FeedbackDraft, FILTERS, isPending() (+76 more)

### Community 4 - "Ticket Action Panels"
Cohesion: 0.06
Nodes (27): CapturingSystem, CLAUDE_CONVERSATION, closers, CODEX_CONVERSATION, TEMPLATE_PATH, TURN_END, AckSystem, RecordingSystem (+19 more)

### Community 5 - "Fake System Adapter"
Cohesion: 0.06
Nodes (34): BoundedCommandResult, hostnameFromSshConfig(), sshHostFromRemoteUrl(), connectionFailure(), connectionResult(), extractPrUrl(), fetchGithubOpenPrs(), ghAuthenticatedUserSchema (+26 more)

### Community 6 - "Shared Zod Schemas"
Cohesion: 0.16
Nodes (18): ExecutionFinishStatus, LiveSession, log, PendingSessionMessage, previewToolInput(), renderSessionEvent(), SessionExecutionContext, SessionExecutionFinish (+10 more)

### Community 7 - "Settings & Profiles UI"
Cohesion: 0.07
Nodes (5): delay(), fakeShellPrompt(), FakeSystemAdapter, ReviewDoneOptions, WorktreeSetupOptions

### Community 8 - "PR Selection & Slots Bar"
Cohesion: 0.16
Nodes (13): CompactTicket, ListTicketsInput, Column, COLUMN_LABELS, BoardColumnProps, DEFAULT_OPEN, NOTE: an expanded column already owns the droppable id through its lane; registe, TerminalColumnsPanel() (+5 more)

### Community 9 - "Real System Adapter"
Cohesion: 0.05
Nodes (54): AGENT_EFFORT_LABELS, AGENT_EFFORTS, AGENT_MODEL_LABELS, AGENT_MODELS, AUTOMATION_RUN_STATUSES, AUTOMATION_TRIGGER_LABELS, AUTOMATION_TRIGGERS, AutomationRunStatus (+46 more)

### Community 10 - "Slot Config & Worktree Watch"
Cohesion: 0.12
Nodes (12): directories, initializeParamsSchema, log, requestSchema, rpcError(), rpcResult(), rpcResponseSchema, toolCallParamsSchema (+4 more)

### Community 11 - "Core Domain Concepts"
Cohesion: 0.03
Nodes (62): agentMessageRowSchema, AutomationRow, automationRowSchema, AutomationRunRow, automationRunRowSchema, buildScripts(), CommentRow, commentRowSchema (+54 more)

### Community 12 - "Board & Sidebar Layout"
Cohesion: 0.09
Nodes (28): buildAtelierPrompt(), buildAtelierRegenerationTurn(), buildAuthoringRules(), buildFraming(), buildHistory(), buildResearch(), buildRole(), HISTORY_ROLE_LABELS (+20 more)

### Community 13 - "Database Store Operations"
Cohesion: 0.14
Nodes (19): projectValidationSchema, CreateProjectInput, ManagedProject, UpdateProjectInput, vcsProviderSchema, ProjectListProps, ConnectionHint, CreateStep (+11 more)

### Community 14 - "Coordinator & Protocol"
Cohesion: 0.15
Nodes (23): QualityValidatorOptions, ManualQualityEvidenceInput, QualityCriterion, QualityEvidence, TicketQuality, CriteriaEditor(), newCriterion(), QualityCriteriaPanel() (+15 more)

### Community 15 - "API Routes & Reformulate"
Cohesion: 0.06
Nodes (55): main(), scalar(), setup(), cleanTicket(), conflictTicket(), REVIEW_OPTS, reviewTicket(), TICKET_OPTS (+47 more)

### Community 16 - "Stats Aggregation"
Cohesion: 0.08
Nodes (4): setup(), SessionHub, SessionHubHandlers, SessionStartCallbacks

### Community 17 - "Triage & Server Hub"
Cohesion: 0.08
Nodes (25): devDependencies, autoprefixer, class-variance-authority, clsx, concurrently, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities (+17 more)

### Community 18 - "Live Terminal Views"
Cohesion: 0.05
Nodes (49): isReviewFixSession(), ATELIER_WEB_TOOLS, AZURE_BASH_ALLOWLIST, AZURE_CLEAN_BASH_ALLOWLIST, BASH_ALLOWLIST, bashAllowlist(), buildFeasibilitySessionConfig(), buildImplementSessionConfig() (+41 more)

### Community 19 - "Stage Progress & Display"
Cohesion: 0.08
Nodes (24): compilerOptions, allowImportingTsExtensions, baseUrl, esModuleInterop, isolatedModules, jsx, lib, module (+16 more)

### Community 20 - "Real Adapter GH/Composer"
Cohesion: 0.10
Nodes (22): Kind, KINDS, codexEffortSchema, CodexTierSummary(), DurationChart(), CodexTierSummary, DurationGroup, effectiveEffortLabel() (+14 more)

### Community 21 - "Store Types & Agent Knobs"
Cohesion: 0.08
Nodes (83): agent_context_html(), agent_entry_count(), axes_html(), axis_anchor(), axis_head_html(), axis_items(), axis_section_html(), axis_statuses() (+75 more)

### Community 22 - "DB Row Schemas & Mappers"
Cohesion: 0.07
Nodes (38): formatPrdDocumentIssues(), log, ToolHandler, ToolResult, AgentSettableStage, agentSettableStageSchema, askUserArgsSchema, AssertNamesCovered (+30 more)

### Community 23 - "Dev Dependencies"
Cohesion: 0.15
Nodes (18): buildRepoInspection(), formatProjectLabel(), LOCKFILE_NAMES, LOCKFILE_RUNNERS, PackageManifest, packageManifestSchema, PROVIDER_HOST_MARKERS, RepoFacts (+10 more)

### Community 24 - "TypeScript Config"
Cohesion: 0.14
Nodes (21): bashCommandSchema, buildSettings(), claudeProvider, createSdkAgentSession(), denyBashHook(), denyNoVerifyHook, denyReviewPublishingHook, denyTypecheckHook() (+13 more)

### Community 26 - "Cost & Pricing"
Cohesion: 0.10
Nodes (17): buildAtelierConsolidateTurn(), ACTIVITY_PROGRESS_KINDS, AssistantPart, AtelierManager, AtelierManagerDeps, ConversationRuntime, describeToolUse(), emptyTurn() (+9 more)

### Community 27 - "Workflow View & Lifecycle"
Cohesion: 0.05
Nodes (32): Architecture, Commands, Conventions (enforced — beyond the global ones in ~/.claude/CLAUDE.md), graphify, The dry-run safety model — read before running anything, What this is, Agent runtime, Architecture (+24 more)

### Community 28 - "Stats Charts"
Cohesion: 0.06
Nodes (31): AgentMcpServerDefinition, agentMessageDeltaSchema, agentToml(), buildMcpServers(), ConfigObject, configReadResponseSchema, describeCodexError(), emptyResponseSchema (+23 more)

### Community 29 - "Session Hub & Agent Session"
Cohesion: 0.07
Nodes (77): pairedRuntimeCodexEffort(), AgentEffort, AgentModel, CodexEffort, CodexModel, Implementer, Orchestrator, ProfileConfig (+69 more)

### Community 30 - "Agents View & Ticket Cards"
Cohesion: 0.05
Nodes (51): App(), HOME_VIEW_OPTIONS, HomeView, ColumnActionsMenu(), ColumnActionsMenuProps, ColumnMenuItem, NAV_ENTRIES, NavEntry (+43 more)

### Community 31 - "PRD Review & Markdown"
Cohesion: 0.05
Nodes (64): ActiveDelegation, ActiveReview, BOARD_FINDING_RENDER_STYLE, ClosableExecution, log, orderedReviewKinds(), renderFinding(), renderPersistedReviewResult() (+56 more)

### Community 32 - "User Terminal & Fake IO"
Cohesion: 0.18
Nodes (12): Block, blockText(), compactChunks(), firstCharCode(), TranscriptBuffer, trimBlockStart(), AgentStreamBlock, applyTranscriptUpdate() (+4 more)

### Community 33 - "Logging"
Cohesion: 0.10
Nodes (21): scripts, build:desktop, build:web, dev, dev:desktop, dev:proxy, dev:server, dev:web (+13 more)

### Community 34 - "Board Columns"
Cohesion: 0.14
Nodes (22): AppliedPath, copyDependencies(), copyPath(), DelegationWorkspace, ensureParentDirectory(), FileState, git(), installStagedPath() (+14 more)

### Community 35 - "NPM Scripts"
Cohesion: 0.14
Nodes (12): resolveBaseBranch(), TriageManager, TicketLifecycle, TicketOperationsDeps, Stage, ErrorDetailsSource, Ticket, TriageResult (+4 more)

### Community 36 - "Runtime Dependencies"
Cohesion: 0.10
Nodes (20): ARTIFACT_CONTENT_TYPES, QualityRouteDeps, manualQualityEvidenceSchema, nonEmptyTextSchema, qualityCriteriaSnapshotSchema, qualityCriterionSchema, qualityEnvironmentSchema, qualityGateSchema (+12 more)

### Community 37 - "Claude SDK Provider"
Cohesion: 0.09
Nodes (22): dependencies, @anthropic-ai/claude-agent-sdk, dompurify, elysia, @fontsource/ibm-plex-mono, @fontsource/ibm-plex-sans, marked, @modelcontextprotocol/sdk (+14 more)

### Community 38 - "Agent Profile Config"
Cohesion: 0.15
Nodes (16): costByFamily(), costOf(), costOfModel(), costOfSessions(), CostSummary, FamilyPricing, MODEL_PRICING, ModelFamily (+8 more)

### Community 39 - "Agent Coordinator Handlers"
Cohesion: 0.10
Nodes (28): artifactPath, assertPackageVersionInSync(), assertSdkVersionsInSync(), BUILT_DMG, ELECTROBUN_BIN, fail(), installedPackageVersion(), RELEASE_FOLDER (+20 more)

### Community 40 - "API Client Inputs"
Cohesion: 0.07
Nodes (13): childTranscriptPrefix(), DelegationManager, implementationScopesOverlap(), normalizeImplementationScope(), reviewKey(), allowedReviewPasses(), mergeAgentUsageByModel(), addUsageByModel() (+5 more)

### Community 41 - "Ticket Config & Constants"
Cohesion: 0.08
Nodes (44): RFC-4180, isNotionUrl(), NOTION_HOSTS, ProjectInfo, AskPanel(), AskPanelProps, ComposeState, NewConversationForm() (+36 more)

### Community 42 - "Ticket Detail & Triage UI"
Cohesion: 0.24
Nodes (7): CapabilityCache, CodexRuntimeModel, codexRuntimeModelSchema, CodexRuntimeStatus, codexRuntimeStatusSchema, UNKNOWN_CODEX_RUNTIME_STATUS, runtime

### Community 43 - "Demo Pipeline Concepts"
Cohesion: 0.08
Nodes (14): FakePaneStream, PaneStream, dataMessage(), log, normalizeSeed(), safeParse(), send(), TerminalSession (+6 more)

### Community 44 - "Chart Primitives"
Cohesion: 0.31
Nodes (13): abortReason(), computeCodeFingerprint(), FingerprintEntry, FingerprintPhase, hashFingerprintPaths(), isMissingFileError(), listFingerprintPaths(), log (+5 more)

### Community 45 - "Session Hub Transcript"
Cohesion: 0.18
Nodes (16): TICKET_TAB_LABELS, TicketTab, TicketTabs(), TicketTabsProps, availableTabs(), hasSessionPane(), initialTab(), isLocked() (+8 more)

### Community 46 - "Community 46"
Cohesion: 0.27
Nodes (15): Agent Implementation Config, Argus Code Review, Automated Tests (typecheck/lint/test), Claude Code Autonomous Agent, Ticket Contract Injection, Feasibility Analysis, Kanban Board (Atelier), Kanban Agents Demo (demo.gif) (+7 more)

### Community 47 - "Modal Dialogs"
Cohesion: 0.17
Nodes (25): buildFeasibilityBatchContract(), buildFeasibilityContextSection(), buildImplementingSteps(), buildMockupReviewStep(), buildPlanningStep(), buildPrdBullet(), buildReviewContract(), buildReviewFixLines() (+17 more)

### Community 48 - "Community 48"
Cohesion: 0.08
Nodes (24): TicketCreationRequestConflictError, AnalyzeTicketRejectionReason, AnalyzeTicketsResult, CreateTodoTicketInput, createTodoTicketInputSchema, CreateTodoTicketResult, FeasibilityStarter, isActive() (+16 more)

### Community 49 - "Slot State"
Cohesion: 0.08
Nodes (26): AtelierPromptInput, SubmittedTurn, mapConversationMessageRow(), mapConversationRow(), mapPrdDocumentRow(), parseJsonColumn(), parsePrdAnnotations(), parseResearchOptions() (+18 more)

### Community 50 - "Stats Hooks & Cards"
Cohesion: 0.15
Nodes (15): ACTIVE_BAR, AREA_CURSOR, AXIS_PROPS, BAR_CURSOR, CHART_PALETTE, colorAt(), DurationBars(), DurationDatum (+7 more)

### Community 51 - "Community 51"
Cohesion: 0.06
Nodes (8): detectInstallCommand(), realpathSafe(), RealSystemAdapter, resolveWorktreeScriptCommand(), setupOutputExcerpt(), shQuote(), DoneGateResult, PrepareReviewWorktreeOptions

### Community 52 - "repairPath.ts"
Cohesion: 0.09
Nodes (24): TERMINAL_STAGES, terminalServerMessageSchema, FullscreenToggle(), FullscreenToggleProps, badgeLabelFor(), LiveTerminal(), LiveTerminalOptions, LiveTerminalProps (+16 more)

### Community 53 - "User Terminal Manager"
Cohesion: 0.33
Nodes (5): CONTEXT — domain glossary, Execution, Proposed (not yet built), Seams, Work items

### Community 54 - "Community 54"
Cohesion: 0.19
Nodes (16): defaultProjectLookup(), buildAskContract(), buildCleanContract(), buildConflictResolutionContract(), commitLanguageDirective(), groupFeasibilityTickets(), featureBranch(), log (+8 more)

### Community 55 - "App.tsx"
Cohesion: 0.21
Nodes (3): FeasibilityBatchManager, toTriageResult(), FeasibilityResult

### Community 56 - "CSV Parsing"
Cohesion: 0.20
Nodes (13): codexCommandPolicyScript(), apiWriteDenyScript(), ConfigValue, extractCommandScript(), perSegmentScript(), prepareNoVerifyHook(), reviewPublishingGuardScript(), shellDeny() (+5 more)

### Community 57 - "Community 57"
Cohesion: 0.18
Nodes (15): isCodexFastServiceTier(), summarizeSessionCosts(), totalTokensOfSessions(), executionCosts(), executionTokens(), projectStatRecord(), CostSummary(), MetaRow() (+7 more)

### Community 58 - "File Uploads"
Cohesion: 0.16
Nodes (12): ChartConfig, ChartContainer, ChartContainerProps, ChartContext, ChartContextValue, ChartLegendContent(), ChartLegendContentProps, ChartTooltipContent() (+4 more)

### Community 59 - "triageManager.ts"
Cohesion: 0.29
Nodes (13): buildContractConstraintsLines(), buildResponseFormatLines(), buildStrictRulesLines(), buildTicketLines(), buildTriageChannelPrompt(), buildTriagePlusChannelPrompt(), isEnglish(), readOnlyFramingLines() (+5 more)

### Community 60 - "Package Manifest"
Cohesion: 0.17
Nodes (5): AutomationManager, mapAutomationRow(), mapAutomationRunRow(), Automation, AutomationRun

### Community 61 - "splitManager.ts"
Cohesion: 0.40
Nodes (4): PR review counting and publication correction state, Progress, Scope and decisions, Verification

### Community 62 - "TicketCard.tsx"
Cohesion: 0.04
Nodes (56): FailedReformulation, ActionSystem, dryRunLog, fakeEncoder, fakeMissingKey(), hexToBytes(), NOTE: same dry-run stance as checkClaudeAvailable: every skill reported installe, AGENTS_SKILLS_DIR (+48 more)

### Community 63 - "Community 63"
Cohesion: 0.16
Nodes (17): BrowserObservation, browserToolName(), preflightQualityBrowser(), QUALITY_BROWSER_TOOLS, QUALITY_DISABLED_BROWSER_TOOLS, QUALITY_NATIVE_DENIED_TOOLS, QUALITY_OBSERVATION_TOOLS, qualityBrowserServer() (+9 more)

### Community 64 - "Composer Run Script"
Cohesion: 0.06
Nodes (55): PROJECT_ROOT, PrdRenderError, RENDERER_RELATIVE_PATH, renderPrdHtml(), RenderPrdHtmlInput, resolvePrdRendererPath(), TEMPLATE_PATH, axisIdSchema (+47 more)

### Community 65 - "split.ts"
Cohesion: 0.15
Nodes (8): RepoInspectionSource, AdvancedSection(), AdvancedSectionProps, FolderStepProps, INSPECTION_SOURCE_LABELS, InspectionBannersProps, RepoPathInputProps, Suggestion

### Community 66 - "prUrl.ts"
Cohesion: 0.18
Nodes (17): COLUMN_SORT_FIELD, BoardColumn(), compareFamilyMembers(), familyKeyOf(), groupTicketIds(), groupTicketsByFamily(), isSplitMother(), readCollapsed() (+9 more)

### Community 67 - "TerminalView.tsx"
Cohesion: 0.06
Nodes (58): FEASIBILITY_ENGINES, FeasibilityEngine, IMPLEMENTERS, ORCHESTRATOR_LABELS, STAGE_LABELS, prNumberFromUrl(), columnSchema, AgentCard() (+50 more)

### Community 68 - "schema.test.ts"
Cohesion: 0.08
Nodes (51): dragKeys(), groupCountLabel(), groupSortId(), ListGroup, ProjectList(), ProjectListRowProps, projectSortId(), SortableProjectGroup() (+43 more)

### Community 69 - "reviewFindings.ts"
Cohesion: 0.06
Nodes (29): PRD_SPLIT_MODE_LABELS, PRD_SPLIT_MODES, PrdSplitMode, Conversation, PrNotificationSyncStatus, WsClientEvent, candidatesFor(), CardCandidate (+21 more)

### Community 70 - "CodexRuntimeStatus"
Cohesion: 0.10
Nodes (27): ActiveReviewPass, assertExecutionAvailable(), CODEX_LAUNCH_STATUS_MESSAGES, CodexCapabilityReader, ExecutionOverrides, FEASIBILITY_ENGINE_EXECUTION, ResolvedExecution, resolveExecution() (+19 more)

### Community 71 - "PostCSS Config"
Cohesion: 0.29
Nodes (6): name, overrides, zod, private, type, version

### Community 72 - ".publishReviewUnderRepoLock"
Cohesion: 0.20
Nodes (12): active, COMPLETION_FREQUENCIES, ensureNotificationPermission(), getAudioContext(), getStoredSoundEnabled(), isSupported(), playNotificationSound(), playTones() (+4 more)

### Community 73 - "TerminalView.tsx"
Cohesion: 0.12
Nodes (25): AGENT_EFFORT_FULL_LABELS, AGENT_MODEL_FULL_LABELS, CODEX_EFFORT_FULL_LABELS, CONVERSATION_STATUS_LABELS, ConversationStatus, AtelierView(), AtelierViewProps, findPrdConversation() (+17 more)

### Community 74 - "button.tsx"
Cohesion: 0.08
Nodes (37): ORCHESTRATORS, availableSkillProviders(), expectedSkillPaths(), HOST_SKILL_ROOTS, missingSkillProviders(), SKILL_REQUIREMENTS, SKILL_TIERS, SkillRequirement (+29 more)

### Community 75 - ".handleRequest"
Cohesion: 0.11
Nodes (14): analyzeResultSchema, compactTicketSchema, createResultSchema, errorResultSchema, ISOLATED_ENV_KEYS, projectResultSchema, savedEnv, startResultSchema (+6 more)

### Community 76 - "usePrdSearch.ts"
Cohesion: 0.21
Nodes (13): FAILURE_COLUMNS, SUCCESS_COLUMNS, OutcomeChart(), SuccessRateChart(), ThroughputChart(), nextWeek(), outcomeCounts(), projectCounts() (+5 more)

### Community 78 - "csv.ts"
Cohesion: 0.06
Nodes (15): RecordingSystemAdapter, PublishReviewOptions, PublishReviewResult, ReviewHeadResult, FAKE_OPEN_PRS, FakeVcsClient, githubPrHeadRef(), CreatePrResult (+7 more)

### Community 79 - "WorktreeSession"
Cohesion: 0.33
Nodes (3): listeners, mcp, ReplyArgsSchema

### Community 80 - "recordedAction.ts"
Cohesion: 0.23
Nodes (17): alternation(), COMMAND_WRAPPERS, commandSegments(), commandWords(), executableName(), launchedPackageScript(), launchesTypecheck(), OPTIONS_WITH_VALUE (+9 more)

### Community 81 - "index.ts"
Cohesion: 0.07
Nodes (34): applyDesktopEnv(), DesktopRoots, ensureConfig(), ensureMcpToken(), regenerateMcpToken(), temporaryDirectories, boot(), externalUrlFromNewWindowEvent() (+26 more)

### Community 82 - ".getReviewPass"
Cohesion: 0.10
Nodes (11): assertCodexImplementerAvailable(), SlotManager, slotPath(), mapSlotRow(), mapWorktreeSessionRow(), enrichWorktreeSession(), failSplitMother(), QualityGate (+3 more)

### Community 86 - "vcsCommands.ts"
Cohesion: 0.28
Nodes (5): configFingerprint(), fingerprint(), QualityManager, sourceFingerprint(), QualityValidationRun

### Community 87 - "atelier.ts"
Cohesion: 0.08
Nodes (25): log, SlotWatch, WorktreeAddressWatcher, log, listProjectKeys(), log, projectConfigSchema, NOTE: AppSettings carries no implementerModel/implementerEffort, so those two MO (+17 more)

### Community 89 - "usePrdSearch.ts"
Cohesion: 0.09
Nodes (18): agentPairError(), createApiRoutes(), createSplitChildren(), isBlocked(), isProcessing(), isSplitMother(), isWebOnlyPath(), jsonError() (+10 more)

### Community 90 - "Profile"
Cohesion: 0.22
Nodes (3): SDK_EFFORTS, toSdkEffort(), RealPaneStream

### Community 91 - "createCodexAgentSession"
Cohesion: 0.10
Nodes (19): Activation and use, Baseline evidence and future acceptance needs, Behavior observed at the base revision, Capability and provider matrix, Checks and evidence, Criteria, providers, and delivery, Current guarantees and limitations, Current implementation state — 2026-10-03 (+11 more)

### Community 92 - "TerminalSessionManager"
Cohesion: 0.12
Nodes (16): 1. Import one logical project, 2. Associate repository tickets when a request spans them, 3. Validate the selected combination when claiming integrated behavior, Acceptance scenarios for a future implementation, Agora, Alternatives and tradeoffs, Current state and scope, Decisions still needed (+8 more)

### Community 93 - "ColumnActionsMenu.tsx"
Cohesion: 0.25
Nodes (7): Azure DevOps support — state file, Decisions (validated by the owner, 2026-09-21), Goal, Known blockers for lots 3 and 4, Open questions, Progress, Verified on this machine (az 2.90.0, azure-devops 1.0.8)

### Community 94 - ".addComment"
Cohesion: 0.05
Nodes (45): DEFAULT_MODELS, ProjectKey, mapCommentRow(), mapPrNotificationSyncRow(), AttachExecutionSessionInput, AutomationPatch, EnqueueAgentMessageInput, FinalizeExecutionInput (+37 more)

### Community 95 - "TicketConfigSummary.tsx"
Cohesion: 0.50
Nodes (3): appBundle, EMBEDDED_BINARIES, resourcesApp

### Community 97 - "RunningServer"
Cohesion: 0.12
Nodes (13): PROJECT_ROOT, NOTE: PRD generation holds the request open up to ~120s (REFORMULATE_TIMEOUT_MS), resolveDataFile(), resolveServerPort(), RunningServer, serveStaticAsset(), SocketData, startServer() (+5 more)

### Community 98 - "usePrdSearch.ts"
Cohesion: 0.09
Nodes (19): boundedCommandDetail(), runBoundedCommand(), safeJsonParse(), withJsonRequestFile(), ReviewPublicationEvent, ReviewPublicationState, AzureDevopsVcsClient, completionComment() (+11 more)

### Community 99 - "reviewPublishingGuard.ts"
Cohesion: 0.07
Nodes (35): API_GUARDS, API_READ_METHOD_SET, ApiDenyPatterns, ApiGuard, AZ_INVOKE_COMMAND, AZ_INVOKE_METHOD_LONG_FLAGS, AZ_INVOKE_WRITE_INPUT_LONG_FLAGS, AZ_PR_WRITE_PATTERN (+27 more)

### Community 100 - ".startVerification"
Cohesion: 0.08
Nodes (25): $ref, $ref, enum, $ref, $ref, properties, designConsiderations, goals (+17 more)

### Community 101 - "codexProvider.test.ts"
Cohesion: 0.16
Nodes (11): CodexAppServerInitializationError, accountResponseSchema, hasExplicitCodexApiKey(), isProtocolIncompatibility(), listRuntimeModels(), modelListResponseSchema, modelSchema, probeCodexRuntime() (+3 more)

### Community 102 - "prd.schema.json"
Cohesion: 0.13
Nodes (14): ActiveQualityRun, CHECK_RUNNERS, CheckCommand, commandSucceeded(), DATABASE_ISOLATION_PLACEHOLDERS, databaseIsolationProblem(), environmentFor(), log (+6 more)

### Community 103 - "TerminalSession"
Cohesion: 0.05
Nodes (3): reviewPublicationState(), runFirstBootSetup(), SystemAdapter

### Community 104 - "uploads.ts"
Cohesion: 0.40
Nodes (8): agentBaseEnv(), bestInstalledMatch(), compareParts(), envWithProjectNode(), nvmNodeBinDir(), readNvmrc(), prepareProjectShell(), shellLiteral()

### Community 105 - "createMcpServer"
Cohesion: 0.09
Nodes (23): $ref, $ref, $ref, minLength, type, minLength, type, enum (+15 more)

### Community 106 - "usePrdSearch.ts"
Cohesion: 0.11
Nodes (18): ANSI, appendToLogFile(), COLOR_ENABLED, disableFileLogging(), initLogFile(), isLevel(), Level, LEVEL_ORDER (+10 more)

### Community 107 - "azureRemote.ts"
Cohesion: 0.06
Nodes (48): renderCollapsedFinding(), escapeHtml(), renderCollapsedDetails(), renderOutsideDiffComment(), renderOutsideDiffSection(), ReviewPublicationComment, azureChangeEntrySchema, azureCommentSchema (+40 more)

### Community 108 - "WorkflowView.tsx"
Cohesion: 0.09
Nodes (22): axes, designConsiderations, goals, id, locale, openQuestions, outOfScope, preDraft (+14 more)

### Community 109 - "TicketMeta.tsx"
Cohesion: 0.17
Nodes (5): CodexAppServerConnection, CodexAppServerNotification, CodexAppServerOptions, AppServerFixture, CodexRuntimeDependencies

### Community 110 - "split.ts"
Cohesion: 0.46
Nodes (5): buildSplitChannelPrompt(), buildTicketLines(), isEnglish(), extractFigmaUrls(), hasMockups()

### Community 111 - "uploads.ts"
Cohesion: 0.40
Nodes (4): MIME_EXTENSIONS, resolveExtension(), SavedUpload, saveUpload()

### Community 112 - "useSavedFlash.ts"
Cohesion: 0.38
Nodes (5): StatRecord, StatCard(), StatCardProps, StatEmpty(), UseStatsResult

### Community 113 - "PreparedHook"
Cohesion: 0.32
Nodes (14): ProfilePipeline(), buildProfilePipeline(), claudeDetail(), claudeSubagentDetail(), codexOrchestratorDetail(), codexSubagentParts(), describeProfile(), implementerNodeValue() (+6 more)

### Community 114 - "ApiDenyPatterns"
Cohesion: 0.05
Nodes (16): startFeasibilityTicket(), ProjectConfig, mapPrNotificationRow(), mapProfileRow(), mapQualityCriteriaSnapshotRow(), mapQualityEvidenceRow(), mapQualityValidationRunRow(), mapTicketCreationRequestRow() (+8 more)

### Community 115 - "useSuppressEscapeBeep.ts"
Cohesion: 0.29
Nodes (6): additionalProperties, $id, required, $schema, title, type

### Community 116 - "settings.tsx"
Cohesion: 0.04
Nodes (64): AppSettings, draftOf(), PrdPanel(), McpSettings(), ProfilesSettings(), AgentDefaultsSettings(), CODEX_STATUS_TONES, COMMIT_ROW (+56 more)

### Community 117 - "runRecordedAction"
Cohesion: 0.36
Nodes (4): logRejection(), serializeErrorDetails(), runRecordedAction(), ExecutionRun

### Community 119 - "AgentMessage"
Cohesion: 0.11
Nodes (19): items, maxItems, minItems, type, uniqueItems, $ref, axes, requirements (+11 more)

### Community 120 - "ProjectPanel.tsx"
Cohesion: 0.11
Nodes (17): Agent session (server), Architecture decisions, Atelier (conversation → PRD → cards) — implementation state, Contract injection, Follow-ups noticed in Lot A, Goal, Lot A public API (use these names in Lots B and C), Lot B public surface and deviations (read before Lot C/D) (+9 more)

### Community 121 - "VcsConnectionResult"
Cohesion: 0.12
Nodes (14): CodexAppServerProtocolError, CodexAppServerRpcError, connectCodexAppServer(), incomingSchema, initializeResponseSchema, log, PendingRequest, rpcErrorSchema (+6 more)

### Community 122 - "Board.tsx"
Cohesion: 0.23
Nodes (13): ACTIVE_STAGES, COLUMN_ORDER, COLUMNS, ACTIVE_COLUMNS, Board(), BoardProps, isColumn(), isLocked() (+5 more)

### Community 124 - "useSavedFlash.ts"
Cohesion: 0.21
Nodes (9): CodexBinaryVersionError, require, resolveCodexBinary(), resolveCodexBinaryOverride(), TARGETS, canonicalJson(), CodexCommandHook, codexSessionPreToolUseHookHash() (+1 more)

### Community 125 - "AgentMessage"
Cohesion: 0.30
Nodes (4): mapAgentMessageRow(), StartExecutionInput, AgentMessage, ExecutionOwnerType

### Community 127 - "TerminalSessionManager"
Cohesion: 0.13
Nodes (16): nonEmptyStringArray, stringArray, items, type, uniqueItems, minLength, pattern, type (+8 more)

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

### Community 160 - "createMcpServer"
Cohesion: 0.36
Nodes (6): createMcpServer(), invalidInput(), listPublicProjects(), OutputValidator, toolError(), toolResult()

## Knowledge Gaps
- **1016 isolated node(s):** `Permission refusals are specific to a command and session`, `Two agent providers: implement every host integration for both`, `Azure reviewer response nullability`, `Disposable quality verification`, `Current implementation state — 2026-10-03` (+1011 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Ticket` connect `NPM Scripts` to `Contract Building & Slots`, `Desktop Bootstrap & Menus`, `Feasibility Batch Management`, `PR Selection & Slots Bar`, `Real System Adapter`, `Core Domain Concepts`, `Coordinator & Protocol`, `API Routes & Reformulate`, `Live Terminal Views`, `Client Hub & Watchdog`, `Session Hub & Agent Session`, `Agents View & Ticket Cards`, `PRD Review & Markdown`, `API Client Inputs`, `Ticket Config & Constants`, `Session Hub Transcript`, `Modal Dialogs`, `Community 48`, `repairPath.ts`, `Community 54`, `Community 57`, `triageManager.ts`, `prUrl.ts`, `TerminalView.tsx`, `reviewFindings.ts`, `CodexRuntimeStatus`, `.getReviewPass`, `vcsCommands.ts`, `.addComment`, `prd.schema.json`, `TerminalSession`, `split.ts`, `ApiDenyPatterns`, `Board.tsx`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **Why does `RealSystemAdapter` connect `Community 51` to `Board Columns`, `Ticket Action Panels`, `prd.schema.json`, `TerminalSession`, `Slot Config & Worktree Watch`, `Demo Pipeline Concepts`, `csv.ts`, `Profile`, `TicketCard.tsx`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Why does `Store` connect `ApiDenyPatterns` to `Contract Building & Slots`, `Desktop Bootstrap & Menus`, `Ticket Action Panels`, `Core Domain Concepts`, `API Routes & Reformulate`, `Stats Aggregation`, `DB Row Schemas & Mappers`, `Client Hub & Watchdog`, `Cost & Pricing`, `PRD Review & Markdown`, `NPM Scripts`, `Runtime Dependencies`, `API Client Inputs`, `Demo Pipeline Concepts`, `Modal Dialogs`, `Community 48`, `Slot State`, `Community 54`, `Community 57`, `Package Manifest`, `CodexRuntimeStatus`, `.getReviewPass`, `vcsCommands.ts`, `atelier.ts`, `usePrdSearch.ts`, `.addComment`, `RunningServer`, `prd.schema.json`, `runRecordedAction`, `AgentMessage`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **What connects `Permission refusals are specific to a command and session`, `Two agent providers: implement every host integration for both`, `Azure reviewer response nullability` to the rest of the system?**
  _1028 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Contract Building & Slots` be split into smaller, more focused modules?**
  _Cohesion score 0.02210750757490742 - nodes in this community are weakly interconnected._
- **Should `Terminals UI & Notifications` be split into smaller, more focused modules?**
  _Cohesion score 0.0766488413547237 - nodes in this community are weakly interconnected._
- **Should `Desktop Bootstrap & Menus` be split into smaller, more focused modules?**
  _Cohesion score 0.08490566037735849 - nodes in this community are weakly interconnected._