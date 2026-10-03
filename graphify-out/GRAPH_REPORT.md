# Graph Report - kanban-agents  (2026-10-03)

## Corpus Check
- 321 files · ~809,743 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 4119 nodes · 12137 edges · 147 communities (130 shown, 17 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 108 edges (avg confidence: 0.69)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1c478575`
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
- contract.test.ts
- .handleRequest
- .createTodoTicket
- useProjects.ts
- .start
- WorktreeAddressWatcher
- id
- Logger
- useSavedFlash.ts
- RunningServer
- isProcessing
- reformulate.ts
- resolveTemplatePaths
- GitWorktreeAddOptions
- $defs
- isNotionUrl
- title
- preDraft
- createMcpServer

## God Nodes (most connected - your core abstractions)
1. `Store` - 176 edges
2. `Ticket` - 121 edges
3. `SystemAdapter` - 95 edges
4. `cn()` - 90 edges
5. `createApiRoutes()` - 85 edges
6. `FakeSystemAdapter` - 84 edges
7. `RealSystemAdapter` - 80 edges
8. `getErrorMessage()` - 65 edges
9. `SlotManager` - 63 edges
10. `VcsProvider` - 61 edges

## Surprising Connections (you probably didn't know these)
- `McpSettingsClient` --references--> `McpSettingsMetadata`  [EXTRACTED]
  src/web/src/lib/mcpSettings.ts → desktop/mcpRpc.ts
- `main()` --calls--> `assertCodexDowngradeSafe()`  [EXTRACTED]
  scripts/downgrade-codex-catalog.ts → src/server/db/schema.ts
- `main()` --calls--> `migrateCodexCatalog()`  [EXTRACTED]
  scripts/downgrade-codex-catalog.ts → src/server/db/schema.ts
- `RecordedSession` --references--> `AgentSessionOptions`  [EXTRACTED]
  src/server/agents/delegationManager.test.ts → src/server/system/agentSession.ts
- `ExecutionOverrides` --references--> `Orchestrator`  [EXTRACTED]
  src/server/agents/executionConfig.ts → src/shared/constants.ts

## Import Cycles
- 3-file cycle: `src/server/config.ts -> src/server/db/store.ts -> src/server/db/rows.ts -> src/server/config.ts`
- 3-file cycle: `src/server/agents/worktreeAddresses.ts -> src/server/config.ts -> src/server/db/store.ts -> src/server/agents/worktreeAddresses.ts`

## Communities (147 total, 17 thin omitted)

### Community 0 - "Contract Building & Slots"
Cohesion: 0.02
Nodes (99): ActionExecutionOptions, actionExecutionOptionsSchema, agentMessageSchema, AnalyzeTicketsInput, appSettingsSchema, automationRunSchema, automationSchema, baseBranchSchema (+91 more)

### Community 1 - "Terminals UI & Notifications"
Cohesion: 0.09
Nodes (27): analyzeTicketsInputSchema, analyzeTicketsOutputSchema, columnSchema, compactTicketSchema, createTodoTicketOutputSchema, editableTicketSchema, effectivePort(), isAllowedHost() (+19 more)

### Community 2 - "Desktop Bootstrap & Menus"
Cohesion: 0.05
Nodes (69): defaultProjectLookup(), log, buildAskContract(), log, logRejection(), ToolHandler, ToolResult, DRY_RUN_VERDICT (+61 more)

### Community 3 - "Feasibility Batch Management"
Cohesion: 0.06
Nodes (55): COLUMN_SORT_FIELD, AgentCard(), AgentCardProps, AgentsView(), hasLiveAgent(), normalize(), AtelierView(), findPrdConversation() (+47 more)

### Community 4 - "Ticket Action Panels"
Cohesion: 0.04
Nodes (55): CapturingSystem, CLAUDE_CONVERSATION, closers, CODEX_CONVERSATION, TEMPLATE_PATH, TURN_END, AckSystem, ActiveDelegation (+47 more)

### Community 5 - "Fake System Adapter"
Cohesion: 0.06
Nodes (34): extractPrUrl(), fetchGithubOpenPrs(), ghAuthenticatedUserSchema, ghPrHeadSchema, ghPrSchema, ghPrStateSchema, ghRequestedPullPagesSchema, ghRequestedPullSchema (+26 more)

### Community 6 - "Shared Zod Schemas"
Cohesion: 0.11
Nodes (25): ExecutionFinishStatus, LiveSession, log, PendingSessionMessage, previewToolInput(), renderChannelEvent(), renderImplementationDone(), renderSessionEvent() (+17 more)

### Community 7 - "Settings & Profiles UI"
Cohesion: 0.10
Nodes (3): delay(), FakeSystemAdapter, WorktreeSetupOptions

### Community 8 - "PR Selection & Slots Bar"
Cohesion: 0.13
Nodes (25): main(), scalar(), assertCodexDowngradeSafe(), backfillOrchestrator(), countRows(), createDatabase(), EXECUTION_MIGRATIONS, hasColumn() (+17 more)

### Community 9 - "Real System Adapter"
Cohesion: 0.06
Nodes (53): AGENT_EFFORT_FULL_LABELS, AGENT_EFFORT_LABELS, AGENT_MODEL_FULL_LABELS, AGENT_MODEL_LABELS, AUTOMATION_RUN_STATUSES, CODEX_EFFORT_FULL_LABELS, CODEX_EFFORT_LABELS, CODEX_MODEL_EFFORTS (+45 more)

### Community 10 - "Slot Config & Worktree Watch"
Cohesion: 0.05
Nodes (72): RFC-4180, compileFeedback(), PrdAnnotation, prdAnnotationsSchema, draftOf(), EXPORT_LINK_CLASSES, FeedbackDraft, PrdPanel() (+64 more)

### Community 11 - "Core Domain Concepts"
Cohesion: 0.03
Nodes (64): agentMessageRowSchema, AutomationRow, automationRowSchema, AutomationRunRow, automationRunRowSchema, CommentRow, commentRowSchema, conversationMessageRowSchema (+56 more)

### Community 12 - "Board & Sidebar Layout"
Cohesion: 0.15
Nodes (13): RESEARCH_OPTION_KEYS, RESEARCH_OPTION_LABELS, researchOptionsFromKeys(), isResearchOptionKey(), TICKET_OPTION, TicketOptionsToggleGroup(), TicketOptionsToggleGroupProps, TicketOptionValues (+5 more)

### Community 13 - "Database Store Operations"
Cohesion: 0.14
Nodes (22): projectValidationSchema, CreateProjectInput, UpdateProjectInput, vcsProviderSchema, ConnectionHint, CreateStep, isPositiveIntegerString(), isValidDraft() (+14 more)

### Community 14 - "Coordinator & Protocol"
Cohesion: 0.17
Nodes (23): CriteriaEditor(), HumanEvidenceEditor(), newCriterion(), QualityCriteriaPanel(), QualityCriteriaPanelProps, SOURCE_LABELS, CLEANUP_LABELS, evidenceProvenance() (+15 more)

### Community 15 - "API Routes & Reformulate"
Cohesion: 0.13
Nodes (17): cleanTicket(), conflictTicket(), REVIEW_OPTS, reviewTicket(), TICKET_OPTS, createdPaths, reserveDbPath(), NEW_CONVERSATION (+9 more)

### Community 16 - "Stats Aggregation"
Cohesion: 0.08
Nodes (7): startParentSession(), SessionHub, SessionHubHandlers, SessionStartCallbacks, WorktreeAddressWatcher, getErrorMessage(), TranscriptUpdate

### Community 17 - "Triage & Server Hub"
Cohesion: 0.08
Nodes (25): devDependencies, autoprefixer, class-variance-authority, clsx, concurrently, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities (+17 more)

### Community 18 - "Live Terminal Views"
Cohesion: 0.07
Nodes (38): isReviewFixSession(), ATELIER_WEB_TOOLS, AZURE_BASH_ALLOWLIST, AZURE_CLEAN_BASH_ALLOWLIST, BASH_ALLOWLIST, bashAllowlist(), buildFeasibilitySessionConfig(), buildImplementSessionConfig() (+30 more)

### Community 19 - "Stage Progress & Display"
Cohesion: 0.08
Nodes (24): compilerOptions, allowImportingTsExtensions, baseUrl, esModuleInterop, isolatedModules, jsx, lib, module (+16 more)

### Community 20 - "Real Adapter GH/Composer"
Cohesion: 0.11
Nodes (22): Kind, KINDS, CodexTierSummary(), DurationChart(), effectiveWorkDurationMs(), CodexTierSummary, DurationGroup, effectiveEffortLabel() (+14 more)

### Community 21 - "Store Types & Agent Knobs"
Cohesion: 0.08
Nodes (83): agent_context_html(), agent_entry_count(), axes_html(), axis_anchor(), axis_head_html(), axis_items(), axis_section_html(), axis_statuses() (+75 more)

### Community 22 - "DB Row Schemas & Mappers"
Cohesion: 0.06
Nodes (31): TRIAGE_VERDICTS, AgentSettableStage, agentSettableStageSchema, askUserArgsSchema, AssertNamesCovered, channelEventSchema, delegateImplementationArgsSchema, delegateReviewArgsSchema (+23 more)

### Community 23 - "Dev Dependencies"
Cohesion: 0.13
Nodes (10): setup(), setup(), FeasibilityGroup, QueuedFeasibility, ProjectConfig, buildScripts(), mapProjectRow(), parseWorktreePorts() (+2 more)

### Community 24 - "TypeScript Config"
Cohesion: 0.09
Nodes (34): isProcessing(), ACTIVE_STAGES, Comment, FILLED_GLYPH_COLORS, StageProgressBar(), StageProgressBarProps, ActivityTab(), ActivityTabProps (+26 more)

### Community 25 - "Client Hub & Watchdog"
Cohesion: 0.16
Nodes (3): AgentCoordinator, formatPrdDocumentIssues(), SessionToolCall

### Community 26 - "Cost & Pricing"
Cohesion: 0.10
Nodes (18): buildAtelierConsolidateTurn(), buildAtelierRegenerationTurn(), ACTIVITY_PROGRESS_KINDS, AssistantPart, AtelierManager, AtelierManagerDeps, ConversationRuntime, describeToolUse() (+10 more)

### Community 27 - "Workflow View & Lifecycle"
Cohesion: 0.05
Nodes (32): Architecture, Commands, Conventions (enforced — beyond the global ones in ~/.claude/CLAUDE.md), graphify, The dry-run safety model — read before running anything, What this is, Agent runtime, Architecture (+24 more)

### Community 28 - "Stats Charts"
Cohesion: 0.06
Nodes (45): AgentMcpServerDefinition, codexCommandPolicyScript(), agentMessageDeltaSchema, agentToml(), apiWriteDenyScript(), buildMcpServers(), ConfigObject, configReadResponseSchema (+37 more)

### Community 29 - "Session Hub & Agent Session"
Cohesion: 0.14
Nodes (42): AtelierSessionInput, ProjectKey, AutomationPatch, ConversationPatch, NewAsk, NewAutomation, NewClean, NewConversation (+34 more)

### Community 30 - "Agents View & Ticket Cards"
Cohesion: 0.08
Nodes (32): AUTOMATION_TRIGGER_LABELS, AUTOMATION_TRIGGERS, AutomationCard(), AutomationCardProps, AutomationFormProps, AutomationView(), EMPTY_FORM, formFromAutomation() (+24 more)

### Community 31 - "PRD Review & Markdown"
Cohesion: 0.05
Nodes (62): ActiveReview, ActiveReviewPass, BOARD_FINDING_RENDER_STYLE, implementationScopesOverlap(), log, normalizeImplementationScope(), renderCollapsedFinding(), renderFinding() (+54 more)

### Community 32 - "User Terminal & Fake IO"
Cohesion: 0.27
Nodes (4): BoundedCommandResult, connectionFailure(), connectionResult(), VcsConnectionResult

### Community 33 - "Logging"
Cohesion: 0.10
Nodes (21): scripts, build:desktop, build:web, dev, dev:desktop, dev:proxy, dev:server, dev:web (+13 more)

### Community 34 - "Board Columns"
Cohesion: 0.16
Nodes (21): AppliedPath, copyDependencies(), copyPath(), DelegationWorkspace, ensureParentDirectory(), FileState, git(), installStagedPath() (+13 more)

### Community 35 - "NPM Scripts"
Cohesion: 0.13
Nodes (12): addUsageByModel(), toUsageByModel(), stalledEventPayload(), TicketLifecycle, ErrorDetails, ErrorDetailsSource, NotificationSoundKind, Ticket (+4 more)

### Community 36 - "Runtime Dependencies"
Cohesion: 0.09
Nodes (23): ARTIFACT_CONTENT_TYPES, createQualityRoutes(), QualityRouteDeps, ManualQualityEvidenceInput, manualQualityEvidenceSchema, nonEmptyTextSchema, qualityCriteriaSnapshotSchema, qualityCriterionSchema (+15 more)

### Community 37 - "Claude SDK Provider"
Cohesion: 0.09
Nodes (22): dependencies, @anthropic-ai/claude-agent-sdk, dompurify, elysia, @fontsource/ibm-plex-mono, @fontsource/ibm-plex-sans, marked, @modelcontextprotocol/sdk (+14 more)

### Community 38 - "Agent Profile Config"
Cohesion: 0.15
Nodes (16): costByFamily(), costOf(), costOfModel(), costOfSessions(), CostSummary, FamilyPricing, MODEL_PRICING, ModelFamily (+8 more)

### Community 39 - "Agent Coordinator Handlers"
Cohesion: 0.18
Nodes (17): adopt(), compareVersions(), detectionCandidates(), detectUserInstall(), downloadAndVerifyTarball(), downloadPinnedBinary(), emitProgress(), isCompatibleCli() (+9 more)

### Community 40 - "API Client Inputs"
Cohesion: 0.08
Nodes (12): childTranscriptPrefix(), DelegationManager, orderedReviewKinds(), renderPersistedReviewResult(), reviewKey(), allowedReviewPasses(), requiredReviewKinds(), mergeAgentUsageByModel() (+4 more)

### Community 41 - "Ticket Config & Constants"
Cohesion: 0.08
Nodes (54): agentEffortSchema, agentModelSchema, Capabilities, codexEffortSchema, codexModelSchema, CleanPrPanel(), CodexAgentFields(), CodexConnectionStatus() (+46 more)

### Community 42 - "Ticket Detail & Triage UI"
Cohesion: 0.17
Nodes (9): CapabilityCache, CodexRuntimeModel, codexRuntimeModelSchema, CodexRuntimeStatus, codexRuntimeStatusSchema, pairedRuntimeCodexEffort(), UNKNOWN_CODEX_RUNTIME_STATUS, pairedCodexEffort() (+1 more)

### Community 43 - "Demo Pipeline Concepts"
Cohesion: 0.08
Nodes (11): FakePaneStream, RealPaneStream, PaneStream, dataMessage(), normalizeSeed(), safeParse(), send(), TerminalSession (+3 more)

### Community 44 - "Chart Primitives"
Cohesion: 0.28
Nodes (13): abortReason(), computeCodeFingerprint(), FingerprintEntry, FingerprintPhase, hashFingerprintPaths(), isMissingFileError(), listFingerprintPaths(), log (+5 more)

### Community 45 - "Session Hub Transcript"
Cohesion: 0.21
Nodes (14): ManagedProject, dragKeys(), groupCountLabel(), groupSortId(), ListGroup, ProjectList(), ProjectListProps, ProjectListRowProps (+6 more)

### Community 46 - "Community 46"
Cohesion: 0.27
Nodes (15): Agent Implementation Config, Argus Code Review, Automated Tests (typecheck/lint/test), Claude Code Autonomous Agent, Ticket Contract Injection, Feasibility Analysis, Kanban Board (Atelier), Kanban Agents Demo (demo.gif) (+7 more)

### Community 47 - "Modal Dialogs"
Cohesion: 0.14
Nodes (32): buildCleanContract(), buildConflictResolutionContract(), buildFeasibilityBatchContract(), buildFeasibilityContextSection(), buildImplementingSteps(), buildMockupReviewStep(), buildPlanningStep(), buildPrdBullet() (+24 more)

### Community 48 - "Community 48"
Cohesion: 0.10
Nodes (17): TicketCreationRequestConflictError, AnalyzeTicketRejectionReason, AnalyzeTicketsResult, CreateTodoTicketInput, createTodoTicketInputSchema, CreateTodoTicketResult, isActive(), isBlocked() (+9 more)

### Community 49 - "Slot State"
Cohesion: 0.12
Nodes (19): AtelierPromptInput, SubmittedTurn, mapConversationMessageRow(), Conversation, ConversationMessage, PrdDocumentRecord, ConversationPanelProps, PrdPanelProps (+11 more)

### Community 50 - "Stats Hooks & Cards"
Cohesion: 0.15
Nodes (15): ACTIVE_BAR, AREA_CURSOR, AXIS_PROPS, BAR_CURSOR, CHART_PALETTE, colorAt(), DurationBars(), DurationDatum (+7 more)

### Community 51 - "Community 51"
Cohesion: 0.05
Nodes (14): NewProject, ProjectPatch, detectInstallCommand(), realpathSafe(), RealSystemAdapter, resolveWorktreeScriptCommand(), setupOutputExcerpt(), shQuote() (+6 more)

### Community 52 - "repairPath.ts"
Cohesion: 0.06
Nodes (37): Block, blockText(), compactChunks(), firstCharCode(), TranscriptBuffer, trimBlockStart(), AgentStreamBlock, terminalServerMessageSchema (+29 more)

### Community 53 - "User Terminal Manager"
Cohesion: 0.33
Nodes (5): CONTEXT — domain glossary, Execution, Proposed (not yet built), Seams, Work items

### Community 54 - "Community 54"
Cohesion: 0.08
Nodes (23): axisIdSchema, DUPLICATE_ITEMS_ISSUE, hasDuplicates(), identifierSchema, isUnique(), nonEmptyTextArraySchema, PRD_LOCALES, PRD_REQUIREMENT_KINDS (+15 more)

### Community 55 - "App.tsx"
Cohesion: 0.17
Nodes (3): FeasibilityBatchManager, toTriageResult(), FeasibilityResult

### Community 56 - "CSV Parsing"
Cohesion: 0.19
Nodes (10): CHILD_USAGE, FULL_REVIEW_KINDS, LIGHT_REVIEW_KINDS, newDelegatedTicket(), newReviewTicket(), RecordedSession, setup(), sleep() (+2 more)

### Community 57 - "Community 57"
Cohesion: 0.18
Nodes (15): isCodexFastServiceTier(), summarizeSessionCosts(), totalTokensOfSessions(), executionCosts(), executionTokens(), projectStatRecord(), CostSummary(), MetaRow() (+7 more)

### Community 58 - "File Uploads"
Cohesion: 0.16
Nodes (12): ChartConfig, ChartContainer, ChartContainerProps, ChartContext, ChartContextValue, ChartLegendContent(), ChartLegendContentProps, ChartTooltipContent() (+4 more)

### Community 59 - "triageManager.ts"
Cohesion: 0.25
Nodes (15): buildContractConstraintsLines(), buildResponseFormatLines(), buildStrictRulesLines(), buildTicketLines(), buildTriageChannelPrompt(), buildTriagePlusChannelPrompt(), isEnglish(), readOnlyFramingLines() (+7 more)

### Community 60 - "Package Manifest"
Cohesion: 0.17
Nodes (6): AutomationManager, mapAutomationRow(), mapAutomationRunRow(), AutomationRunStatus, Automation, AutomationRun

### Community 61 - "splitManager.ts"
Cohesion: 0.40
Nodes (4): PR review counting and publication correction state, Progress, Scope and decisions, Verification

### Community 62 - "TicketCard.tsx"
Cohesion: 0.06
Nodes (45): claudeProvider, AGENTS_SKILLS_DIR, CLAUDE_JSON_PATH, CLAUDE_SKILLS_DIR, commandOutputOrNull(), COMPOSER_BINARIES, DEFAULT_CODEX_HOME, GitRemoteFacts (+37 more)

### Community 63 - "Community 63"
Cohesion: 0.18
Nodes (11): RepoInspectionSource, AdvancedSection(), AdvancedSectionProps, FolderStep(), FolderStepProps, INSPECTION_SOURCE_LABELS, InspectionBanners(), InspectionBannersProps (+3 more)

### Community 64 - "Composer Run Script"
Cohesion: 0.21
Nodes (23): axisTitle(), Block, bulletList(), heading(), joinBlocks(), labelledList(), LABELS, listOrNone() (+15 more)

### Community 65 - "split.ts"
Cohesion: 0.40
Nodes (10): azureOrgUrl(), fromAzureSegments(), fromCollectionSegments(), fromLegacySegments(), fromSshSegments(), parseAzureRepoRef(), parseRemoteLocation(), RemoteLocation (+2 more)

### Community 66 - "prUrl.ts"
Cohesion: 0.06
Nodes (45): CompactTicket, ListTicketsInput, Column, COLUMN_LABELS, COLUMN_ORDER, COLUMNS, columnSchema, ProjectInfo (+37 more)

### Community 67 - "TerminalView.tsx"
Cohesion: 0.04
Nodes (49): WsClientEvent, App(), HOME_VIEW_OPTIONS, HomeView, NAV_ENTRIES, NavEntry, Sidebar(), SidebarProps (+41 more)

### Community 68 - "schema.test.ts"
Cohesion: 0.21
Nodes (18): projectMatches(), ProjectsSettings(), readShowHidden(), referenceCommitTimeout(), writeShowHidden(), AppearanceSettings(), mostCommonValue(), FilteredProjectGroup (+10 more)

### Community 69 - "reviewFindings.ts"
Cohesion: 0.31
Nodes (9): buildAtelierPrompt(), buildAuthoringRules(), buildFraming(), buildHistory(), buildResearch(), buildRole(), HISTORY_ROLE_LABELS, RESEARCH_CHECK_INSTRUCTIONS (+1 more)

### Community 70 - "CodexRuntimeStatus"
Cohesion: 0.14
Nodes (17): assertExecutionAvailable(), CODEX_LAUNCH_STATUS_MESSAGES, CodexCapabilityReader, ExecutionOverrides, FEASIBILITY_ENGINE_EXECUTION, resolveExecution(), resolveFeasibilityExecution(), resolveTicketExecution() (+9 more)

### Community 71 - "PostCSS Config"
Cohesion: 0.29
Nodes (6): name, overrides, zod, private, type, version

### Community 72 - ".publishReviewUnderRepoLock"
Cohesion: 0.20
Nodes (12): active, COMPLETION_FREQUENCIES, ensureNotificationPermission(), getAudioContext(), getStoredSoundEnabled(), isSupported(), playNotificationSound(), playTones() (+4 more)

### Community 73 - "TerminalView.tsx"
Cohesion: 0.06
Nodes (67): CONVERSATION_STATUS_LABELS, ConversationStatus, PRD_SPLIT_MODE_LABELS, PRD_SPLIT_MODES, PrdSplitMode, enabledResearchOptionKeys(), AskPanel(), AtelierAgentFields() (+59 more)

### Community 74 - "button.tsx"
Cohesion: 0.05
Nodes (52): fakeMissingKey(), AppSettings, SkillStatus, availableSkillProviders(), expectedSkillPaths(), HOST_SKILL_ROOTS, missingSkillProviders(), SKILL_REQUIREMENTS (+44 more)

### Community 75 - ".handleRequest"
Cohesion: 0.11
Nodes (14): analyzeResultSchema, compactTicketSchema, createResultSchema, errorResultSchema, ISOLATED_ENV_KEYS, projectResultSchema, savedEnv, startResultSchema (+6 more)

### Community 76 - "usePrdSearch.ts"
Cohesion: 0.21
Nodes (10): PROJECT_ROOT, NewPrdDocument, PrdRenderError, RENDERER_RELATIVE_PATH, renderPrdHtml(), RenderPrdHtmlInput, resolvePrdRendererPath(), TEMPLATE_PATH (+2 more)

### Community 78 - "csv.ts"
Cohesion: 0.08
Nodes (8): DoneGateResult, ReviewHeadResult, FAKE_OPEN_PRS, FakeVcsClient, githubPrHeadRef(), CreatePrResult, VcsClient, PrState

### Community 79 - "WorktreeSession"
Cohesion: 0.33
Nodes (3): listeners, mcp, ReplyArgsSchema

### Community 80 - "recordedAction.ts"
Cohesion: 0.20
Nodes (19): denyBashHook(), denyTypecheckHook(), alternation(), COMMAND_WRAPPERS, commandSegments(), commandWords(), executableName(), launchedPackageScript() (+11 more)

### Community 81 - "index.ts"
Cohesion: 0.17
Nodes (17): ensureConfig(), boot(), externalUrlFromNewWindowEvent(), forwardAtelierShortcut(), installApplicationMenu(), installMenuShortcutBridge(), menuShortcutActionSchema, navigationEventSchema (+9 more)

### Community 82 - ".getReviewPass"
Cohesion: 0.12
Nodes (8): featureBranch(), slotPath(), slugify(), mapSlotRow(), mapWorktreeSessionRow(), enrichWorktreeSession(), Slot, WorktreeSession

### Community 86 - "vcsCommands.ts"
Cohesion: 0.07
Nodes (32): commandSucceeded(), configFingerprint(), DATABASE_ISOLATION_PLACEHOLDERS, databaseIsolationProblem(), environmentFor(), fingerprint(), outputFor(), QualityManager (+24 more)

### Community 87 - "atelier.ts"
Cohesion: 0.19
Nodes (10): projectConfigSchema, buildAppSettingsPatch(), LegacyConfig, legacyConfigSchema, LegacyModels, log, migrateConfigJsonIfPresent(), parseLegacyConfig() (+2 more)

### Community 89 - "usePrdSearch.ts"
Cohesion: 0.05
Nodes (50): buildNotionImportPrompt(), mapConversationRow(), ProjectInUseError, agentPairError(), attachment(), cleanDescription(), CONVERSATION_STATUS_FOR_PRD, conversationTitle() (+42 more)

### Community 91 - "createCodexAgentSession"
Cohesion: 0.10
Nodes (19): Activation and use, Baseline evidence and future acceptance needs, Behavior observed at the base revision, Capability and provider matrix, Checks and evidence, Criteria, providers, and delivery, Current guarantees and limitations, Current implementation state — 2026-10-03 (+11 more)

### Community 92 - "TerminalSessionManager"
Cohesion: 0.10
Nodes (19): 1. Import one logical project and supply useful common context, 2. Associate repository tickets when a request spans them, 3. Validate the selected combination when claiming integrated behavior, Acceptance scenarios for a future implementation, Agora, Alternatives and tradeoffs, Current state and scope, Decisions still needed (+11 more)

### Community 93 - "ColumnActionsMenu.tsx"
Cohesion: 0.25
Nodes (7): Azure DevOps support — state file, Decisions (validated by the owner, 2026-09-21), Goal, Known blockers for lots 3 and 4, Open questions, Progress, Verified on this machine (az 2.90.0, azure-devops 1.0.8)

### Community 94 - ".addComment"
Cohesion: 0.07
Nodes (31): DEFAULT_MODELS, mapQualityCriteriaSnapshotRow(), mapQualityEvidenceRow(), mapTicketCreationRequestRow(), AttachExecutionSessionInput, EnqueueAgentMessageInput, FinalizeExecutionInput, MarkAgentMessageAcceptedInput (+23 more)

### Community 95 - "TicketConfigSummary.tsx"
Cohesion: 0.50
Nodes (3): appBundle, EMBEDDED_BINARIES, resourcesApp

### Community 97 - "RunningServer"
Cohesion: 0.12
Nodes (6): mapTicketRow(), resolveDataFile(), resolveServerPort(), startServer(), configureClaudeProvisionDir(), createTicketOperations()

### Community 98 - "usePrdSearch.ts"
Cohesion: 0.09
Nodes (17): boundedCommandDetail(), runBoundedCommand(), safeJsonParse(), withJsonRequestFile(), ReviewPublicationState, AzureDevopsVcsClient, prWebUrl(), readOriginRemote() (+9 more)

### Community 99 - "reviewPublishingGuard.ts"
Cohesion: 0.07
Nodes (35): API_GUARDS, API_READ_METHOD_SET, ApiDenyPatterns, ApiGuard, AZ_INVOKE_COMMAND, AZ_INVOKE_METHOD_LONG_FLAGS, AZ_INVOKE_WRITE_INPUT_LONG_FLAGS, AZ_PR_WRITE_PATTERN (+27 more)

### Community 100 - ".startVerification"
Cohesion: 0.08
Nodes (25): $ref, $ref, enum, $ref, $ref, properties, designConsiderations, goals (+17 more)

### Community 101 - "codexProvider.test.ts"
Cohesion: 0.11
Nodes (19): CodexBinaryVersionError, require, resolveCodexBinary(), resolveCodexBinaryOverride(), TARGETS, inheritedMcpServerNames(), prepareSkills(), threadConfig() (+11 more)

### Community 103 - "TerminalSession"
Cohesion: 0.06
Nodes (7): ActiveQualityRun, CHECK_RUNNERS, CheckCommand, log, QualityManagerDependencies, KeyedMutex, SystemAdapter

### Community 104 - "uploads.ts"
Cohesion: 0.14
Nodes (22): gitMetadataWritableRoots(), agentBaseEnv(), bestInstalledMatch(), compareParts(), envWithProjectNode(), nvmNodeBinDir(), readNvmrc(), prepareProjectShell() (+14 more)

### Community 105 - "createMcpServer"
Cohesion: 0.09
Nodes (23): $ref, $ref, $ref, minLength, type, minLength, type, enum (+15 more)

### Community 106 - "usePrdSearch.ts"
Cohesion: 0.07
Nodes (28): ANSI, appendToLogFile(), COLOR_ENABLED, disableFileLogging(), initLogFile(), isLevel(), Level, LEVEL_ORDER (+20 more)

### Community 107 - "azureRemote.ts"
Cohesion: 0.06
Nodes (38): RecordingSystemAdapter, escapeHtml(), renderCollapsedDetails(), renderOutsideDiffComment(), renderOutsideDiffSection(), PublishReviewOptions, PublishReviewResult, ReviewPublicationComment (+30 more)

### Community 108 - "WorkflowView.tsx"
Cohesion: 0.09
Nodes (22): axes, designConsiderations, goals, id, locale, openQuestions, outOfScope, preDraft (+14 more)

### Community 109 - "TicketMeta.tsx"
Cohesion: 0.22
Nodes (8): AtelierDesktopRpcSchema, DesktopRequests, McpSettingsMetadata, WebviewRequests, McpSettingsController, createMcpSettingsClient(), getMcpSettingsClient(), McpSettingsClient

### Community 110 - "split.ts"
Cohesion: 0.60
Nodes (4): buildSplitChannelPrompt(), buildTicketLines(), isEnglish(), CommitLanguage

### Community 111 - "uploads.ts"
Cohesion: 0.23
Nodes (10): artifactPath, assertPackageVersionInSync(), assertSdkVersionsInSync(), BUILT_DMG, ELECTROBUN_BIN, fail(), installedPackageVersion(), RELEASE_FOLDER (+2 more)

### Community 112 - "useSavedFlash.ts"
Cohesion: 0.16
Nodes (16): FAILURE_COLUMNS, SUCCESS_COLUMNS, StatRecord, StatCard(), StatCardProps, StatEmpty(), OutcomeChart(), SuccessRateChart() (+8 more)

### Community 113 - "PreparedHook"
Cohesion: 0.33
Nodes (9): useTheme(), UseThemeResult, applyTheme(), getStoredTheme(), isTheme(), Theme, ThemeOption, THEMES (+1 more)

### Community 114 - "ApiDenyPatterns"
Cohesion: 0.05
Nodes (24): startFeasibilityTicket(), mapCommentRow(), mapPrNotificationRow(), mapPrNotificationSyncRow(), mapProfileRow(), nullableBooleanValue(), SqlUpdateBuilder, createApiRoutes() (+16 more)

### Community 115 - "useSuppressEscapeBeep.ts"
Cohesion: 0.29
Nodes (6): additionalProperties, $id, required, $schema, title, type

### Community 116 - "settings.tsx"
Cohesion: 0.05
Nodes (46): COMMIT_LANGUAGES, McpSettings(), DragHandleAttributes, DragHandleListeners, ProfileRowHeader(), ProfileRowProps, ProfilesSettings(), NOTE: the saved flag lives here because a saved row remounts (its key carries up (+38 more)

### Community 117 - "runRecordedAction"
Cohesion: 0.22
Nodes (4): McpTokenSource, createMcpSettingsController(), McpSettingsControllerDependencies, temporaryDirectories

### Community 118 - "properties"
Cohesion: 0.20
Nodes (7): AZURE_COMMANDS, COMMANDS_BY_PROVIDER, GITHUB_COMMANDS, PrDiffContext, VcsCleanCommands, AZ_SETTLED_THREAD_STATUSES, VCS_PROVIDER_LABELS

### Community 119 - "AgentMessage"
Cohesion: 0.11
Nodes (19): items, maxItems, minItems, type, uniqueItems, $ref, axes, requirements (+11 more)

### Community 120 - "ProjectPanel.tsx"
Cohesion: 0.11
Nodes (17): Agent session (server), Architecture decisions, Atelier (conversation → PRD → cards) — implementation state, Contract injection, Follow-ups noticed in Lot A, Goal, Lot A public API (use these names in Lots B and C), Lot B public surface and deviations (read before Lot C/D) (+9 more)

### Community 121 - "VcsConnectionResult"
Cohesion: 0.07
Nodes (19): CodexAppServerConnection, CodexAppServerInitializationError, CodexAppServerNotification, CodexAppServerOptions, CodexAppServerProtocolError, connectCodexAppServer(), incomingSchema, initializeResponseSchema (+11 more)

### Community 124 - "useSavedFlash.ts"
Cohesion: 0.14
Nodes (11): CodexAppServerRpcError, canonicalJson(), CodexCommandHook, codexSessionPreToolUseHookHash(), JsonValue, createCodexProvider(), AppServerFixtureOptions, hookPathForSession() (+3 more)

### Community 125 - "AgentMessage"
Cohesion: 0.36
Nodes (5): applyDesktopEnv(), DesktopRoots, ensureMcpToken(), regenerateMcpToken(), temporaryDirectories

### Community 126 - "TicketOperations"
Cohesion: 0.17
Nodes (4): resolveBaseBranch(), SlotManager, TicketOperationsDeps, QualityGate

### Community 127 - "TerminalSessionManager"
Cohesion: 0.13
Nodes (16): nonEmptyStringArray, stringArray, items, type, uniqueItems, minLength, pattern, type (+8 more)

### Community 128 - "contract.test.ts"
Cohesion: 0.40
Nodes (5): MIME_EXTENSIONS, resolveExtension(), SavedUpload, saveUpload(), serveUpload()

### Community 130 - ".createTodoTicket"
Cohesion: 0.19
Nodes (7): FeasibilityStarter, isProcessing(), normalizeCreateInput(), requestKeyConflictMessage(), ticketDependencyError(), TicketOperations, deriveTitleFromDescription()

### Community 131 - "useProjects.ts"
Cohesion: 0.39
Nodes (7): emit(), loadedSubscribers, loadOnce(), refreshProjects(), subscribers, useProjects(), useProjectsLoaded()

### Community 134 - "id"
Cohesion: 0.15
Nodes (14): additionalProperties, properties, required, type, axis, id, maxLength, pattern (+6 more)

### Community 138 - "isProcessing"
Cohesion: 0.50
Nodes (5): ThroughputChart(), nextWeek(), startOfWeek(), WEEK_LABEL_FORMATTER, weeklyThroughput

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
Cohesion: 0.43
Nodes (6): createMcpServer(), invalidInput(), listPublicProjects(), OutputValidator, toolError(), toolResult()

## Knowledge Gaps
- **991 isolated node(s):** `Permission refusals are specific to a command and session`, `Two agent providers: implement every host integration for both`, `Azure reviewer response nullability`, `Disposable quality verification`, `Current implementation state — 2026-10-03` (+986 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **17 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `SystemAdapter` connect `TerminalSession` to `Contract Building & Slots`, `Desktop Bootstrap & Menus`, `Ticket Action Panels`, `Shared Zod Schemas`, `Settings & Profiles UI`, `Cost & Pricing`, `PRD Review & Markdown`, `User Terminal & Fake IO`, `API Client Inputs`, `Ticket Detail & Triage UI`, `Demo Pipeline Concepts`, `Community 51`, `Package Manifest`, `TicketCard.tsx`, `CodexRuntimeStatus`, `button.tsx`, `csv.ts`, `.getReviewPass`, `TicketOperations`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Why does `RealSystemAdapter` connect `Community 51` to `Desktop Bootstrap & Menus`, `Ticket Action Panels`, `WorktreeAddressWatcher`, `useSavedFlash.ts`, `GitWorktreeAddOptions`, `User Terminal & Fake IO`, `Agent Coordinator Handlers`, `Ticket Detail & Triage UI`, `Demo Pipeline Concepts`, `Chart Primitives`, `TicketCard.tsx`, `button.tsx`, `csv.ts`, `vcsCommands.ts`, `Profile`, `usePrdSearch.ts`, `TerminalSession`, `uploads.ts`, `usePrdSearch.ts`, `azureRemote.ts`, `useSavedFlash.ts`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **Why does `Ticket` connect `NPM Scripts` to `Contract Building & Slots`, `Desktop Bootstrap & Menus`, `.createTodoTicket`, `Feasibility Batch Management`, `Real System Adapter`, `Slot Config & Worktree Watch`, `reformulate.ts`, `Core Domain Concepts`, `API Routes & Reformulate`, `Live Terminal Views`, `TypeScript Config`, `Client Hub & Watchdog`, `Session Hub & Agent Session`, `Agents View & Ticket Cards`, `PRD Review & Markdown`, `API Client Inputs`, `Ticket Config & Constants`, `Modal Dialogs`, `Community 48`, `repairPath.ts`, `CSV Parsing`, `Community 57`, `triageManager.ts`, `prUrl.ts`, `TerminalView.tsx`, `CodexRuntimeStatus`, `TerminalView.tsx`, `.getReviewPass`, `vcsCommands.ts`, `usePrdSearch.ts`, `.addComment`, `RunningServer`, `TerminalSession`, `split.ts`, `ApiDenyPatterns`, `TicketOperations`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `createApiRoutes()` (e.g. with `.ticket()` and `isWebOnlyPath()`) actually correct?**
  _`createApiRoutes()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Permission refusals are specific to a command and session`, `Two agent providers: implement every host integration for both`, `Azure reviewer response nullability` to the rest of the system?**
  _1003 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Contract Building & Slots` be split into smaller, more focused modules?**
  _Cohesion score 0.02435897435897436 - nodes in this community are weakly interconnected._
- **Should `Terminals UI & Notifications` be split into smaller, more focused modules?**
  _Cohesion score 0.09113300492610837 - nodes in this community are weakly interconnected._