# Graph Report - kanban-agents  (2026-10-03)

## Corpus Check
- 326 files · ~824,453 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 4230 nodes · 12714 edges · 133 communities (124 shown, 9 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 113 edges (avg confidence: 0.7)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `901b4e11`
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
- AutomationView.tsx
- reviewFindings.ts
- CodexRuntimeStatus
- PostCSS Config
- .publishReviewUnderRepoLock
- TerminalView.tsx
- button.tsx
- .handleRequest
- atelierManager.test.ts
- Community 77
- statistics.ts
- WorktreeSession
- recordedAction.ts
- index.ts
- .getReviewPass
- Community 83
- vcsCommands.ts
- atelier.ts
- createMcpServer
- Profile
- createCodexAgentSession
- TerminalSessionManager
- ColumnActionsMenu.tsx
- .addComment
- TicketConfigSummary.tsx
- useTickTimer.ts
- ProjectList.tsx
- usePrdSearch.ts
- reviewPublishingGuard.ts
- .startVerification
- runRecordedAction
- delegationManager.test.ts
- useAppSettings.ts
- mcpSettings.ts
- createMcpServer
- usePrdSearch.ts
- CodexAppServerConnection
- WorkflowView.tsx
- TriageManager
- createCodexAgentSession
- useSavedFlash.ts
- PreparedHook
- ApiDenyPatterns
- useSuppressEscapeBeep.ts
- settings.tsx
- bootstrap.ts
- AgentMessage
- ProjectPanel.tsx
- TicketOperationError
- theme.ts
- useReviewCounts.ts
- TerminalSessionManager
- contract.test.ts
- useConversationDetail.ts
- PublishReviewOptions
- id
- reformulate.ts
- createCodexAgentSession
- isProcessing
- $defs
- title
- preDraft

## God Nodes (most connected - your core abstractions)
1. `Store` - 182 edges
2. `Ticket` - 127 edges
3. `cn()` - 98 edges
4. `SystemAdapter` - 96 edges
5. `createApiRoutes()` - 88 edges
6. `FakeSystemAdapter` - 85 edges
7. `RealSystemAdapter` - 81 edges
8. `getErrorMessage()` - 72 edges
9. `SlotManager` - 71 edges
10. `Orchestrator` - 64 edges

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

## Communities (133 total, 9 thin omitted)

### Community 0 - "Contract Building & Slots"
Cohesion: 0.03
Nodes (78): AUTOMATION_RUN_STATUSES, COMMENT_AUTHORS, CONVERSATION_MESSAGE_ROLES, CONVERSATION_SESSION_STATUSES, CONVERSATION_STATUSES, PR_REVIEW_STATUSES, PRD_DOCUMENT_STATUSES, REPO_INSPECTION_SOURCES (+70 more)

### Community 1 - "Terminals UI & Notifications"
Cohesion: 0.07
Nodes (37): analyzeTicketsInputSchema, analyzeTicketsOutputSchema, columnSchema, compactTicketSchema, createMcpServer(), createTodoTicketOutputSchema, editableTicketSchema, effectivePort() (+29 more)

### Community 2 - "Desktop Bootstrap & Menus"
Cohesion: 0.13
Nodes (20): AssistantPart, AtelierManagerDeps, ConversationRuntime, describeToolUse(), log, TOOL_DETAIL_KEYS, toolInputSchema, truncate() (+12 more)

### Community 3 - "Feasibility Batch Management"
Cohesion: 0.04
Nodes (77): CODEX_MODEL_EFFORTS, FEASIBILITY_ENGINES, IMPLEMENTERS, STAGE_LABELS, AgentCard(), AgentCardProps, AgentsView(), AgentsViewProps (+69 more)

### Community 4 - "Ticket Action Panels"
Cohesion: 0.11
Nodes (26): ExecutionFinishStatus, LiveSession, log, PendingSessionMessage, previewToolInput(), renderSessionEvent(), SessionExecutionContext, SessionExecutionFinish (+18 more)

### Community 5 - "Fake System Adapter"
Cohesion: 0.05
Nodes (98): AtelierSessionInput, ProjectKey, AttachExecutionSessionInput, AutomationPatch, ConversationPatch, CreateQualityIterationInput, EnqueueAgentMessageInput, FinalizeExecutionInput (+90 more)

### Community 6 - "Shared Zod Schemas"
Cohesion: 0.07
Nodes (31): BoundedCommandResult, withJsonRequestFile(), hostnameFromSshConfig(), connectionFailure(), connectionResult(), fetchGithubOpenPrs(), ghAuthenticatedUserSchema, ghPrHeadSchema (+23 more)

### Community 7 - "Settings & Profiles UI"
Cohesion: 0.06
Nodes (6): delay(), fakeShellPrompt(), FakeSystemAdapter, hexToBytes(), ReviewDoneOptions, WorktreeSetupOptions

### Community 8 - "PR Selection & Slots Bar"
Cohesion: 0.05
Nodes (58): main(), scalar(), CLAUDE_CONVERSATION, closers, CODEX_CONVERSATION, setup(), TEMPLATE_PATH, TURN_END (+50 more)

### Community 9 - "Real System Adapter"
Cohesion: 0.04
Nodes (64): environmentFor(), directories, AGENTS_SKILLS_DIR, CLAUDE_JSON_PATH, CLAUDE_SKILLS_DIR, commandOutputOrNull(), COMPOSER_BINARIES, DEFAULT_CODEX_HOME (+56 more)

### Community 10 - "Slot Config & Worktree Watch"
Cohesion: 0.04
Nodes (88): CONVERSATION_STATUS_LABELS, PRD_SPLIT_MODE_LABELS, PRD_SPLIT_MODES, PrdSplitMode, compileFeedback(), Comment, PrdAnnotation, prdAnnotationsSchema (+80 more)

### Community 11 - "Core Domain Concepts"
Cohesion: 0.03
Nodes (70): agentMessageRowSchema, AutomationRow, automationRowSchema, AutomationRunRow, automationRunRowSchema, buildScripts(), CommentRow, commentRowSchema (+62 more)

### Community 12 - "Board & Sidebar Layout"
Cohesion: 0.11
Nodes (14): analyzeResultSchema, compactTicketSchema, createResultSchema, errorResultSchema, ISOLATED_ENV_KEYS, projectResultSchema, savedEnv, startResultSchema (+6 more)

### Community 13 - "Database Store Operations"
Cohesion: 0.26
Nodes (15): projectMatches(), ProjectsSettings(), readShowHidden(), referenceCommitTimeout(), writeShowHidden(), mostCommonValue(), FilteredProjectGroup, filterProjectGroups() (+7 more)

### Community 14 - "Coordinator & Protocol"
Cohesion: 0.08
Nodes (55): ORCHESTRATOR_LABELS, QualityCriteriaSnapshot, QualityPreflight, QualityResponse, QualityRunPhase, CREATOR_LABELS, CriteriaEditor(), HumanEvidenceEditor() (+47 more)

### Community 15 - "API Routes & Reformulate"
Cohesion: 0.09
Nodes (33): ensureClaudeBinary(), bashCommandSchema, buildSettings(), claudeProvider, createSdkAgentSession(), denyNoVerifyHook, denyReviewPublishingHook, dispatchClaudeMessage() (+25 more)

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
Cohesion: 0.10
Nodes (30): FAILURE_COLUMNS, Kind, KINDS, SUCCESS_COLUMNS, DurationChart(), SuccessRateChart(), ThroughputChart(), effectiveWorkDurationMs() (+22 more)

### Community 21 - "Store Types & Agent Knobs"
Cohesion: 0.08
Nodes (83): agent_context_html(), agent_entry_count(), axes_html(), axis_anchor(), axis_head_html(), axis_items(), axis_section_html(), axis_statuses() (+75 more)

### Community 22 - "DB Row Schemas & Mappers"
Cohesion: 0.06
Nodes (31): TRIAGE_VERDICTS, AgentSettableStage, agentSettableStageSchema, askUserArgsSchema, AssertNamesCovered, channelEventSchema, delegateImplementationArgsSchema, delegateReviewArgsSchema (+23 more)

### Community 23 - "Dev Dependencies"
Cohesion: 0.13
Nodes (21): RESEARCH_OPTION_KEYS, RESEARCH_OPTION_LABELS, ResearchOptionKey, enabledResearchOptionKeys(), researchOptionsFromKeys(), buildThread(), ConversationPanel(), researchSummary() (+13 more)

### Community 24 - "TypeScript Config"
Cohesion: 0.18
Nodes (11): CHILD_USAGE, FULL_REVIEW_KINDS, LIGHT_REVIEW_KINDS, newDelegatedTicket(), newReviewTicket(), RecordedSession, setup(), sleep() (+3 more)

### Community 25 - "Client Hub & Watchdog"
Cohesion: 0.10
Nodes (7): AgentCoordinator, formatPrdDocumentIssues(), SessionToolCall, mapTicketRow(), ACTIVE_STAGES, TERMINAL_STAGES, TriageResult

### Community 26 - "Cost & Pricing"
Cohesion: 0.10
Nodes (16): buildAtelierConsolidateTurn(), buildAtelierPrompt(), buildAtelierRegenerationTurn(), buildAuthoringRules(), buildFraming(), buildHistory(), buildResearch(), buildRole() (+8 more)

### Community 27 - "Workflow View & Lifecycle"
Cohesion: 0.05
Nodes (32): Architecture, Commands, Conventions (enforced — beyond the global ones in ~/.claude/CLAUDE.md), graphify, The dry-run safety model — read before running anything, What this is, Agent runtime, Architecture (+24 more)

### Community 28 - "Stats Charts"
Cohesion: 0.06
Nodes (48): AgentMcpServerDefinition, codexCommandPolicyScript(), canonicalJson(), CodexCommandHook, codexSessionPreToolUseHookHash(), JsonValue, agentMessageDeltaSchema, agentToml() (+40 more)

### Community 29 - "Session Hub & Agent Session"
Cohesion: 0.10
Nodes (38): AGENT_EFFORT_FULL_LABELS, AGENT_MODEL_FULL_LABELS, CODEX_EFFORT_FULL_LABELS, ProfileConfig, DragHandleAttributes, DragHandleListeners, ProfilePipeline(), ProfileRow() (+30 more)

### Community 30 - "Agents View & Ticket Cards"
Cohesion: 0.07
Nodes (11): ReviewHeadResult, FAKE_OPEN_PRS, FakeVcsClient, extractPrUrl(), githubPrHeadRef(), CreatePrResult, ReviewRequestSnapshot, VcsClient (+3 more)

### Community 31 - "PRD Review & Markdown"
Cohesion: 0.10
Nodes (32): ReviewResult, ALSO_FLAGGED_PREFIX, dedupeFindings(), dedupeIdenticalFindings(), DEFAULT_FINDING_RENDER_STYLE, DimensionFinding, findingAnchor(), FRENCH_STOP_WORD_PATTERN (+24 more)

### Community 33 - "Logging"
Cohesion: 0.10
Nodes (21): scripts, build:desktop, build:web, dev, dev:desktop, dev:proxy, dev:server, dev:web (+13 more)

### Community 34 - "Board Columns"
Cohesion: 0.14
Nodes (22): AppliedPath, copyDependencies(), copyPath(), DelegationWorkspace, ensureParentDirectory(), FileState, git(), installStagedPath() (+14 more)

### Community 35 - "NPM Scripts"
Cohesion: 0.10
Nodes (9): slotPath(), slugify(), mapSlotRow(), TicketLifecycle, createSplitChildren(), failSplitMother(), performSplit(), splitMotherBranch() (+1 more)

### Community 36 - "Runtime Dependencies"
Cohesion: 0.08
Nodes (28): ARTIFACT_CONTENT_TYPES, createQualityRoutes(), QualityRouteDeps, manualQualityEvidenceSchema, nonEmptyTextSchema, projectValidationSchema, qualityCriteriaSnapshotSchema, qualityCriterionSchema (+20 more)

### Community 37 - "Claude SDK Provider"
Cohesion: 0.09
Nodes (22): dependencies, @anthropic-ai/claude-agent-sdk, dompurify, elysia, @fontsource/ibm-plex-mono, @fontsource/ibm-plex-sans, marked, @modelcontextprotocol/sdk (+14 more)

### Community 38 - "Agent Profile Config"
Cohesion: 0.16
Nodes (15): costByFamily(), costOf(), costOfModel(), costOfSessions(), CostSummary, FamilyPricing, MODEL_PRICING, ModelFamily (+7 more)

### Community 39 - "Agent Coordinator Handlers"
Cohesion: 0.18
Nodes (17): adopt(), compareVersions(), detectionCandidates(), detectUserInstall(), downloadAndVerifyTarball(), downloadPinnedBinary(), emitProgress(), isCompatibleCli() (+9 more)

### Community 40 - "API Client Inputs"
Cohesion: 0.06
Nodes (22): childTranscriptPrefix(), DelegationManager, implementationScopesOverlap(), normalizeImplementationScope(), orderedReviewKinds(), reviewKey(), verifiedFindings(), FindingRenderStyle (+14 more)

### Community 41 - "Ticket Config & Constants"
Cohesion: 0.23
Nodes (10): artifactPath, assertPackageVersionInSync(), assertSdkVersionsInSync(), BUILT_DMG, ELECTROBUN_BIN, fail(), installedPackageVersion(), RELEASE_FOLDER (+2 more)

### Community 42 - "Ticket Detail & Triage UI"
Cohesion: 0.26
Nodes (3): ActionSystem, CapabilityCache, CodexRuntimeStatus

### Community 43 - "Demo Pipeline Concepts"
Cohesion: 0.13
Nodes (23): CreateProjectInput, UpdateProjectInput, vcsProviderSchema, ConnectionHint, CreateStep, isPositiveIntegerString(), isValidDraft(), ProjectPanel() (+15 more)

### Community 44 - "Chart Primitives"
Cohesion: 0.28
Nodes (13): abortReason(), computeCodeFingerprint(), FingerprintEntry, FingerprintPhase, hashFingerprintPaths(), isMissingFileError(), listFingerprintPaths(), log (+5 more)

### Community 45 - "Session Hub Transcript"
Cohesion: 0.06
Nodes (41): log, log, logRejection(), ToolHandler, ToolResult, DRY_RUN_VERDICT, FeasibilityGroup, log (+33 more)

### Community 46 - "Community 46"
Cohesion: 0.27
Nodes (15): Agent Implementation Config, Argus Code Review, Automated Tests (typecheck/lint/test), Claude Code Autonomous Agent, Ticket Contract Injection, Feasibility Analysis, Kanban Board (Atelier), Kanban Agents Demo (demo.gif) (+7 more)

### Community 47 - "Modal Dialogs"
Cohesion: 0.09
Nodes (40): buildFeasibilityBatchContract(), buildFeasibilityContextSection(), buildImplementingSteps(), buildMockupReviewStep(), buildPlanningStep(), buildPrdBullet(), buildReviewContract(), buildReviewFixLines() (+32 more)

### Community 48 - "Community 48"
Cohesion: 0.09
Nodes (23): TicketCreationRequestConflictError, AnalyzeTicketRejectionReason, AnalyzeTicketsResult, CreateTodoTicketInput, CreateTodoTicketResult, FeasibilityStarter, isActive(), isBlocked() (+15 more)

### Community 49 - "Slot State"
Cohesion: 0.04
Nodes (43): Watchdog, log, runFirstBootSetup(), applyAppSettingsToModels(), listProjectKeys(), projectConfigSchema, PROJECT_ROOT, NOTE: PRD generation holds the request open up to ~120s (REFORMULATE_TIMEOUT_MS) (+35 more)

### Community 50 - "Stats Hooks & Cards"
Cohesion: 0.16
Nodes (7): assertCodexImplementerAvailable(), featureBranch(), SlotManager, mapQualityIterationRow(), getErrorMessage(), QualityGate, QualityIteration

### Community 51 - "Community 51"
Cohesion: 0.07
Nodes (8): realpathSafe(), RealSystemAdapter, resolveWorktreeScriptCommand(), setupOutputExcerpt(), shQuote(), DoneGateResult, PrepareReviewWorktreeOptions, VcsProvider

### Community 52 - "repairPath.ts"
Cohesion: 0.06
Nodes (37): Block, blockText(), compactChunks(), firstCharCode(), TranscriptBuffer, trimBlockStart(), AgentStreamBlock, terminalServerMessageSchema (+29 more)

### Community 53 - "User Terminal Manager"
Cohesion: 0.33
Nodes (5): CONTEXT — domain glossary, Execution, Proposed (not yet built), Seams, Work items

### Community 54 - "Community 54"
Cohesion: 0.06
Nodes (31): CapturingSystem, AckSystem, ActiveDelegation, RecordingSystem, QualitySessionOptions, QualityValidatorOptions, RecordedSession, RecordingSystem (+23 more)

### Community 55 - "App.tsx"
Cohesion: 0.14
Nodes (3): FeasibilityBatchManager, toTriageResult(), FeasibilityResult

### Community 56 - "CSV Parsing"
Cohesion: 0.06
Nodes (35): CodexAppServerConnection, CodexAppServerInitializationError, CodexAppServerProtocolError, CodexAppServerRpcError, connectCodexAppServer(), incomingSchema, initializeResponseSchema, log (+27 more)

### Community 57 - "Community 57"
Cohesion: 0.05
Nodes (42): renderCollapsedFinding(), escapeHtml(), renderCollapsedDetails(), renderOutsideDiffComment(), renderOutsideDiffSection(), ReviewPublicationComment, azureChangeEntrySchema, azureCommentSchema (+34 more)

### Community 58 - "File Uploads"
Cohesion: 0.16
Nodes (12): ChartConfig, ChartContainer, ChartContainerProps, ChartContext, ChartContextValue, ChartLegendContent(), ChartLegendContentProps, ChartTooltipContent() (+4 more)

### Community 59 - "triageManager.ts"
Cohesion: 0.09
Nodes (28): ActiveReview, ActiveReviewPass, BOARD_FINDING_RENDER_STYLE, ClosableExecution, log, renderFinding(), renderPersistedReviewResult(), REVIEW_DISALLOWED_TOOLS (+20 more)

### Community 60 - "Package Manifest"
Cohesion: 0.17
Nodes (5): AutomationManager, mapAutomationRow(), mapAutomationRunRow(), Automation, AutomationRun

### Community 61 - "splitManager.ts"
Cohesion: 0.40
Nodes (4): PR review counting and publication correction state, Progress, Scope and decisions, Verification

### Community 62 - "TicketCard.tsx"
Cohesion: 0.16
Nodes (9): RecordingSystemAdapter, boundedCommandDetail(), PublishReviewOptions, PublishReviewResult, ReviewPublicationState, GithubVcsClient, pullApiEndpoint(), reviewApiEndpoint() (+1 more)

### Community 63 - "Community 63"
Cohesion: 0.04
Nodes (74): CompactTicket, ListTicketsInput, Column, COLUMN_LABELS, COLUMN_ORDER, COLUMN_SORT_FIELD, COLUMNS, PR_STATE_LABELS (+66 more)

### Community 64 - "Composer Run Script"
Cohesion: 0.21
Nodes (23): axisTitle(), Block, bulletList(), heading(), joinBlocks(), labelledList(), LABELS, listOrNone() (+15 more)

### Community 65 - "split.ts"
Cohesion: 0.40
Nodes (10): azureOrgUrl(), fromAzureSegments(), fromCollectionSegments(), fromLegacySegments(), fromSshSegments(), parseAzureRepoRef(), parseRemoteLocation(), RemoteLocation (+2 more)

### Community 66 - "prUrl.ts"
Cohesion: 0.08
Nodes (23): axisIdSchema, DUPLICATE_ITEMS_ISSUE, hasDuplicates(), identifierSchema, isUnique(), nonEmptyTextArraySchema, PRD_LOCALES, PRD_REQUIREMENT_KINDS (+15 more)

### Community 67 - "TerminalView.tsx"
Cohesion: 0.17
Nodes (19): qualityErrorMessage(), browserToolName(), preflightQualityBrowser(), QUALITY_BROWSER_TOOLS, QUALITY_DISABLED_BROWSER_TOOLS, QUALITY_OBSERVATION_TOOLS, QUALITY_REPOSITORY_TOOLS, qualityBrowserServer() (+11 more)

### Community 68 - "AutomationView.tsx"
Cohesion: 0.17
Nodes (12): RepoInspectionSource, AdvancedSection(), AdvancedSectionProps, Field(), FolderStep(), FolderStepProps, INSPECTION_SOURCE_LABELS, InspectionBanners() (+4 more)

### Community 69 - "reviewFindings.ts"
Cohesion: 0.12
Nodes (24): prepareQualityCriteria(), PrepareQualityCriteriaOptions, QUALITY_CONTEXT_FILES, repositoryContext(), deniedCommandShape(), QUALITY_NATIVE_DENIED_TOOLS, QualityObservation, QualityPermissionDiagnostic (+16 more)

### Community 70 - "CodexRuntimeStatus"
Cohesion: 0.06
Nodes (45): AGENT_EFFORTS, AGENT_MODELS, AUTOMATION_TRIGGER_LABELS, AUTOMATION_TRIGGERS, AutomationRunStatus, App(), HOME_VIEW_OPTIONS, HomeView (+37 more)

### Community 71 - "PostCSS Config"
Cohesion: 0.29
Nodes (6): name, overrides, zod, private, type, version

### Community 72 - ".publishReviewUnderRepoLock"
Cohesion: 0.12
Nodes (13): runBoundedCommand(), safeJsonParse(), ReviewPublicationEvent, AzureDevopsVcsClient, completionComment(), completionMarker(), prWebUrl(), readOriginRemote() (+5 more)

### Community 74 - "button.tsx"
Cohesion: 0.08
Nodes (36): fakeMissingKey(), ORCHESTRATORS, SkillStatus, availableSkillProviders(), expectedSkillPaths(), HOST_SKILL_ROOTS, missingSkillProviders(), SKILL_REQUIREMENTS (+28 more)

### Community 75 - ".handleRequest"
Cohesion: 0.07
Nodes (15): FakePaneStream, RealPaneStream, PaneStream, dataMessage(), log, normalizeSeed(), safeParse(), send() (+7 more)

### Community 76 - "atelierManager.test.ts"
Cohesion: 0.36
Nodes (4): mapWorktreeSessionRow(), enrichWorktreeSession(), WorktreeSession, BoardState

### Community 78 - "statistics.ts"
Cohesion: 0.19
Nodes (14): isCodexFastServiceTier(), summarizeSessionCosts(), totalTokensOf(), totalTokensOfSessions(), executionCosts(), executionTokens(), projectStatRecord(), CostSummary() (+6 more)

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
Cohesion: 0.14
Nodes (17): ACTIVE_BAR, AREA_CURSOR, AXIS_PROPS, BAR_CURSOR, CHART_PALETTE, colorAt(), DurationBars(), DurationDatum (+9 more)

### Community 86 - "vcsCommands.ts"
Cohesion: 0.15
Nodes (11): commandSucceeded(), configFingerprint(), fingerprint(), outputFor(), QualityManager, sourceFingerprint(), technicalRunAccepted(), ValidationCommandResult (+3 more)

### Community 87 - "atelier.ts"
Cohesion: 0.11
Nodes (21): AtelierPromptInput, SubmittedTurn, mapConversationMessageRow(), mapConversationRow(), createAtelierRoutes(), Conversation, ConversationMessage, PrdDocumentRecord (+13 more)

### Community 89 - "createMcpServer"
Cohesion: 0.48
Nodes (3): mapProfileRow(), nullableBooleanValue(), Profile

### Community 90 - "Profile"
Cohesion: 0.21
Nodes (16): buildContractConstraintsLines(), buildResponseFormatLines(), buildStrictRulesLines(), buildTicketLines(), buildTriageChannelPrompt(), buildTriagePlusChannelPrompt(), isEnglish(), readOnlyFramingLines() (+8 more)

### Community 91 - "createCodexAgentSession"
Cohesion: 0.07
Nodes (28): Activation and retest, Baseline evidence and future acceptance needs, Behavior observed at the base revision, Capability and provider matrix, Checks and evidence, Criteria, providers, and delivery, Current follow-up state — 2026-10-03, Current iteration work — 2026-10-03 (+20 more)

### Community 92 - "TerminalSessionManager"
Cohesion: 0.12
Nodes (15): 1. Register the associated repositories once, 2. Prepare the common isolated workspace, 3. Plan automatically, then implement, 4. Start the application from its instructions, 5. Validate and repair in the retained workspace, 6. Deliver one feature result, End-to-end flow, First acceptance scenarios (+7 more)

### Community 93 - "ColumnActionsMenu.tsx"
Cohesion: 0.25
Nodes (7): Azure DevOps support — state file, Decisions (validated by the owner, 2026-09-21), Goal, Known blockers for lots 3 and 4, Open questions, Progress, Verified on this machine (az 2.90.0, azure-devops 1.0.8)

### Community 94 - ".addComment"
Cohesion: 0.18
Nodes (16): Capabilities, CodexConnectionStatus(), STATUS_LABELS, clearRetry(), loadCapabilities(), LoadOptions, publish(), refreshCapabilities() (+8 more)

### Community 95 - "TicketConfigSummary.tsx"
Cohesion: 0.50
Nodes (3): appBundle, EMBEDDED_BINARIES, resourcesApp

### Community 97 - "ProjectList.tsx"
Cohesion: 0.21
Nodes (14): ManagedProject, dragKeys(), groupCountLabel(), groupSortId(), ListGroup, ProjectList(), ProjectListProps, ProjectListRowProps (+6 more)

### Community 98 - "usePrdSearch.ts"
Cohesion: 0.22
Nodes (8): AtelierDesktopRpcSchema, DesktopRequests, McpSettingsMetadata, WebviewRequests, McpSettingsController, createMcpSettingsClient(), getMcpSettingsClient(), McpSettingsClient

### Community 99 - "reviewPublishingGuard.ts"
Cohesion: 0.07
Nodes (35): API_GUARDS, API_READ_METHOD_SET, ApiDenyPatterns, ApiGuard, AZ_INVOKE_COMMAND, AZ_INVOKE_METHOD_LONG_FLAGS, AZ_INVOKE_WRITE_INPUT_LONG_FLAGS, AZ_PR_WRITE_PATTERN (+27 more)

### Community 100 - ".startVerification"
Cohesion: 0.08
Nodes (25): $ref, $ref, enum, $ref, $ref, properties, designConsiderations, goals (+17 more)

### Community 101 - "runRecordedAction"
Cohesion: 0.12
Nodes (5): startFeasibilityTicket(), serializeErrorDetails(), SqlUpdateBuilder, runRecordedAction(), ExecutionRun

### Community 102 - "delegationManager.test.ts"
Cohesion: 0.06
Nodes (35): PrNotificationSyncStatus, ATTENTION_STATUSES, sessionOf(), SlotPips(), SlotPipsProps, STATUS_LABELS, STATUS_PIP_CLASSES, getSnapshot() (+27 more)

### Community 103 - "useAppSettings.ts"
Cohesion: 0.06
Nodes (31): AnalyzeTicketsInput, AppSettings, CreateAskInput, CreateAutomationInput, CreateCleanInput, CreateCommentInput, createConversationSchema, CreateProfileInput (+23 more)

### Community 104 - "mcpSettings.ts"
Cohesion: 0.22
Nodes (4): McpTokenSource, createMcpSettingsController(), McpSettingsControllerDependencies, temporaryDirectories

### Community 105 - "createMcpServer"
Cohesion: 0.09
Nodes (23): $ref, $ref, $ref, minLength, type, minLength, type, enum (+15 more)

### Community 106 - "usePrdSearch.ts"
Cohesion: 0.10
Nodes (17): ANSI, appendToLogFile(), COLOR_ENABLED, disableFileLogging(), isLevel(), Level, LEVEL_ORDER, LEVEL_TAG (+9 more)

### Community 107 - "CodexAppServerConnection"
Cohesion: 0.13
Nodes (5): CodexAppServerNotification, CodexAppServerOptions, CodexProviderDependencies, AppServerFixture, CodexRuntimeDependencies

### Community 108 - "WorkflowView.tsx"
Cohesion: 0.09
Nodes (22): axes, designConsiderations, goals, id, locale, openQuestions, outOfScope, preDraft (+14 more)

### Community 109 - "TriageManager"
Cohesion: 0.43
Nodes (6): emit(), loadedSubscribers, loadOnce(), refreshProjects(), subscribers, useProjectsLoaded()

### Community 113 - "PreparedHook"
Cohesion: 0.21
Nodes (11): StatRecord, StatCard(), StatCardProps, StatEmpty(), CodexTierSummary(), OutcomeChart(), StatsView(), StatsViewProps (+3 more)

### Community 114 - "ApiDenyPatterns"
Cohesion: 0.10
Nodes (7): ProjectConfig, mapPrNotificationRow(), mapPrNotificationSyncRow(), mapQualityCriteriaSnapshotRow(), mapQualityValidationRunRow(), Store, PrNotification

### Community 115 - "useSuppressEscapeBeep.ts"
Cohesion: 0.29
Nodes (6): additionalProperties, $id, required, $schema, title, type

### Community 116 - "settings.tsx"
Cohesion: 0.05
Nodes (56): CodexAgentFields(), McpSettings(), ValidationConfigFieldsProps, AgentDefaultsSettings(), AppearanceSettings(), CODEX_STATUS_TONES, COMMIT_ROW, DefaultsRowSpec (+48 more)

### Community 117 - "bootstrap.ts"
Cohesion: 0.36
Nodes (5): applyDesktopEnv(), DesktopRoots, ensureMcpToken(), regenerateMcpToken(), temporaryDirectories

### Community 119 - "AgentMessage"
Cohesion: 0.11
Nodes (19): items, maxItems, minItems, type, uniqueItems, $ref, axes, requirements (+11 more)

### Community 120 - "ProjectPanel.tsx"
Cohesion: 0.11
Nodes (17): Agent session (server), Architecture decisions, Atelier (conversation → PRD → cards) — implementation state, Contract injection, Follow-ups noticed in Lot A, Goal, Lot A public API (use these names in Lots B and C), Lot B public surface and deviations (read before Lot C/D) (+9 more)

### Community 122 - "TicketOperationError"
Cohesion: 0.23
Nodes (9): PROJECT_ROOT, NewPrdDocument, PrdRenderError, RENDERER_RELATIVE_PATH, renderPrdHtml(), RenderPrdHtmlInput, resolvePrdRendererPath(), TEMPLATE_PATH (+1 more)

### Community 124 - "theme.ts"
Cohesion: 0.33
Nodes (9): useTheme(), UseThemeResult, applyTheme(), getStoredTheme(), isTheme(), Theme, ThemeOption, THEMES (+1 more)

### Community 125 - "useReviewCounts.ts"
Cohesion: 0.07
Nodes (68): RFC-4180, ProjectInfo, AgentProfileConfig(), AskPanel(), AskPanelProps, AtelierAgentFields(), ComposeState, NewConversationForm() (+60 more)

### Community 127 - "TerminalSessionManager"
Cohesion: 0.13
Nodes (16): nonEmptyStringArray, stringArray, items, type, uniqueItems, minLength, pattern, type (+8 more)

### Community 128 - "contract.test.ts"
Cohesion: 0.10
Nodes (14): mapCommentRow(), agentPairError(), createApiRoutes(), isBlocked(), isProcessing(), isSplitMother(), isWebOnlyPath(), jsonError() (+6 more)

### Community 129 - "useConversationDetail.ts"
Cohesion: 0.04
Nodes (47): buildNotionImportPrompt(), ProjectInUseError, attachment(), cleanDescription(), CONVERSATION_STATUS_FOR_PRD, conversationTitle(), log, orderSelectedTasks() (+39 more)

### Community 133 - "PublishReviewOptions"
Cohesion: 0.14
Nodes (3): ClientSocket, PrNotificationMonitor, WsClientEvent

### Community 134 - "id"
Cohesion: 0.15
Nodes (14): additionalProperties, properties, required, type, axis, id, maxLength, pattern (+6 more)

### Community 136 - "reformulate.ts"
Cohesion: 0.19
Nodes (10): ActiveQualityRun, CHECK_RUNNERS, CheckCommand, DATABASE_ISOLATION_PLACEHOLDERS, databaseIsolationProblem(), log, QualityManagerDependencies, KeyedMutex (+2 more)

### Community 140 - "isProcessing"
Cohesion: 0.10
Nodes (22): defaultProjectLookup(), resolveBaseBranch(), buildAskContract(), buildCleanContract(), buildConflictResolutionContract(), log, ReclaimOutcome, SETUP_PHASES (+14 more)

### Community 142 - "$defs"
Cohesion: 0.17
Nodes (12): pattern, type, $defs, axisId, requirement, task, additionalProperties, required (+4 more)

### Community 144 - "title"
Cohesion: 0.18
Nodes (11): source, ref, title, minLength, type, additionalProperties, properties, required (+3 more)

### Community 145 - "preDraft"
Cohesion: 0.18
Nodes (11): additionalProperties, properties, required, type, preDraft, reuse, sharedSurfaces, sourcePriority (+3 more)

## Knowledge Gaps
- **1014 isolated node(s):** `Validation skeleton pulse — 2026-10-03`, `Precise refusal identification — 2026-10-03`, `Validation loading follow-up — 2026-10-03`, `Current iteration work — 2026-10-03`, `Previous verified follow-up` (+1009 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Ticket` connect `API Client Inputs` to `Contract Building & Slots`, `useConversationDetail.ts`, `Desktop Bootstrap & Menus`, `Feasibility Batch Management`, `Fake System Adapter`, `reformulate.ts`, `PR Selection & Slots Bar`, `Slot Config & Worktree Watch`, `Core Domain Concepts`, `isProcessing`, `Coordinator & Protocol`, `Live Terminal Views`, `TypeScript Config`, `Client Hub & Watchdog`, `PRD Review & Markdown`, `User Terminal & Fake IO`, `NPM Scripts`, `Session Hub Transcript`, `Modal Dialogs`, `Community 48`, `Stats Hooks & Cards`, `repairPath.ts`, `triageManager.ts`, `Community 63`, `CodexRuntimeStatus`, `atelierManager.test.ts`, `statistics.ts`, `vcsCommands.ts`, `Profile`, `runRecordedAction`, `delegationManager.test.ts`, `useAppSettings.ts`, `createCodexAgentSession`, `useReviewCounts.ts`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Why does `Store` connect `ApiDenyPatterns` to `contract.test.ts`, `useConversationDetail.ts`, `Desktop Bootstrap & Menus`, `Ticket Action Panels`, `Fake System Adapter`, `PublishReviewOptions`, `PR Selection & Slots Bar`, `reformulate.ts`, `isProcessing`, `TypeScript Config`, `Client Hub & Watchdog`, `Cost & Pricing`, `NPM Scripts`, `Runtime Dependencies`, `API Client Inputs`, `Session Hub Transcript`, `Modal Dialogs`, `Community 48`, `Slot State`, `Stats Hooks & Cards`, `triageManager.ts`, `Package Manifest`, `TerminalView.tsx`, `.handleRequest`, `atelierManager.test.ts`, `statistics.ts`, `vcsCommands.ts`, `atelier.ts`, `createMcpServer`, `runRecordedAction`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Why does `FakeSystemAdapter` connect `Settings & Profiles UI` to `User Terminal & Fake IO`, `Ticket Action Panels`, `PR Selection & Slots Bar`, `Real System Adapter`, `Ticket Detail & Triage UI`, `button.tsx`, `Session Hub Transcript`, `Slot State`, `Community 54`, `TypeScript Config`, `TicketCard.tsx`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `createApiRoutes()` (e.g. with `.ticket()` and `isWebOnlyPath()`) actually correct?**
  _`createApiRoutes()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Validation skeleton pulse — 2026-10-03`, `Precise refusal identification — 2026-10-03`, `Validation loading follow-up — 2026-10-03` to the rest of the system?**
  _1026 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Contract Building & Slots` be split into smaller, more focused modules?**
  _Cohesion score 0.025895814513700693 - nodes in this community are weakly interconnected._
- **Should `Terminals UI & Notifications` be split into smaller, more focused modules?**
  _Cohesion score 0.06553911205073996 - nodes in this community are weakly interconnected._