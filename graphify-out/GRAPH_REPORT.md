# Graph Report - .  (2026-06-29)

## Corpus Check
- 44 files · ~642,145 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1574 nodes · 3509 edges · 91 communities (78 shown, 13 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 26 edges (avg confidence: 0.8)
- Token cost: 44,000 input · 2,000 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 80|Community 80]]
- [[_COMMUNITY_Community 82|Community 82]]
- [[_COMMUNITY_Community 86|Community 86]]
- [[_COMMUNITY_Community 87|Community 87]]
- [[_COMMUNITY_Community 89|Community 89]]
- [[_COMMUNITY_Community 90|Community 90]]

## God Nodes (most connected - your core abstractions)
1. `Store` - 72 edges
2. `Ticket` - 70 edges
3. `RealSystemAdapter` - 49 edges
4. `cn()` - 48 edges
5. `SlotManager` - 45 edges
6. `FakeSystemAdapter` - 43 edges
7. `ProjectInfo` - 39 edges
8. `getProject()` - 32 edges
9. `isProjectKey()` - 30 edges
10. `ClientHub` - 27 edges

## Surprising Connections (you probably didn't know these)
- `boot()` --calls--> `startServer()`  [INFERRED]
  desktop/index.ts → src/server/index.ts
- `Kind (ticket pipeline type)` --conceptually_related_to--> `argus (argus-review) skill`  [INFERRED]
  CONTEXT.md → README.md
- `Kind (ticket pipeline type)` --conceptually_related_to--> `minos-pr-feedback skill`  [INFERRED]
  CONTEXT.md → README.md
- `Contract (pipeline instructions)` --references--> `argus (argus-review) skill`  [EXTRACTED]
  CONTEXT.md → README.md
- `Contract (pipeline instructions)` --references--> `composer-implement skill`  [EXTRACTED]
  CONTEXT.md → README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Agent session lifecycle (per ticket)** — agents_session_hub, agents_slot_manager, agents_coordinator, agents_pipeline_contract, agents_slots, agents_done_gate [INFERRED 0.85]
- **Side-effect boundary implementations** — agents_system_adapter, agents_fake_system_adapter, agents_real_system_adapter [EXTRACTED 1.00]
- **In-process SDK agent protocol** — agents_claude_agent_sdk, agents_query_streaming_input, agents_in_process_mcp_server, agents_worker_tools, agents_channel_events [INFERRED 0.85]

## Communities (91 total, 13 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.07
Nodes (31): buildAskContract(), buildCleanContract(), buildConflictResolutionContract(), buildFeasibilityContextSection(), buildImplementingSteps(), buildPlanningStep(), buildReviewContract(), buildReviewFixLines() (+23 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (41): buildSplitSessionConfig(), buildSplitChannelPrompt(), buildTicketLines(), isEnglish(), DRY_RUN_RESULT, log, PendingSplit, SplitManager (+33 more)

### Community 2 - "Community 2"
Cohesion: 0.04
Nodes (57): COMMENT_AUTHORS, REVIEW_DEPTHS, STAGES, AnalyzeTicketsInput, appSettingsSchema, baseBranchSchema, capabilitiesSchema, commentAuthorSchema (+49 more)

### Community 3 - "Community 3"
Cohesion: 0.09
Nodes (4): delay(), fakeShellPrompt(), FakeSystemAdapter, hexToBytes()

### Community 4 - "Community 4"
Cohesion: 0.08
Nodes (16): dataMessage(), log, normalizeSeed(), safeParse(), send(), TerminalSession, TerminalSessionManager, TerminalSocket (+8 more)

### Community 5 - "Community 5"
Cohesion: 0.06
Nodes (31): buildNotionImportPrompt(), buildPrdPrompt(), createSplitChildren(), failSplitMother(), isBlocked(), isSplitMother(), log, PaneReader (+23 more)

### Community 6 - "Community 6"
Cohesion: 0.10
Nodes (5): mapProfileRow(), Store, AppSettings, Profile, UpdateAppSettingsInput

### Community 7 - "Community 7"
Cohesion: 0.07
Nodes (31): addUsageByModel(), log, ToolHandler, ToolResult, toUsageByModel(), SessionToolCall, TRIAGE_VERDICTS, AgentSettableStage (+23 more)

### Community 8 - "Community 8"
Cohesion: 0.09
Nodes (12): DRY_RUN_VERDICT, log, TriageSession, log, Watchdog, ClientHub, ClientSocket, ClientSocketData (+4 more)

### Community 9 - "Community 9"
Cohesion: 0.08
Nodes (3): RealSystemAdapter, safeJsonParse(), DoneGateResult

### Community 10 - "Community 10"
Cohesion: 0.07
Nodes (30): buildScripts(), CommentRow, commentRowSchema, mapProjectRow(), mapTicketRow(), parseSessionUsage(), parseWorktreePorts(), ProfileRow (+22 more)

### Community 11 - "Community 11"
Cohesion: 0.10
Nodes (23): ColumnActionsMenu(), ColumnActionsMenuProps, ColumnMenuItem, QuitConfirmModal(), TerminalsView(), TerminalsViewProps, useTerminalShortcuts(), cn() (+15 more)

### Community 12 - "Community 12"
Cohesion: 0.10
Nodes (17): LiveSession, log, previewToolInput(), renderChannelEvent(), renderSessionEvent(), SessionHub, SessionHubHandlers, SessionStartConfig (+9 more)

### Community 13 - "Community 13"
Cohesion: 0.16
Nodes (21): AgentsViewProps, AskPanelProps, CleanPrPanel(), CleanPrPanelProps, NewTicketDialogProps, ProjectPrPicker(), ProjectPrPickerProps, ProjectSelectProps (+13 more)

### Community 14 - "Community 14"
Cohesion: 0.10
Nodes (26): effectiveWorkDurationMs(), CostGroup, DurationGroup, KIND_LABELS, KindCount, kindCounts(), meanDurationByEffort(), meanDurationByKey() (+18 more)

### Community 15 - "Community 15"
Cohesion: 0.09
Nodes (20): CLAUDE_JSON_PATH, COMPOSER_BINARIES, detectInstallCommand(), extractPrUrl(), ghPrSchema, ghPrStateSchema, ghReviewSchema, ghReviewsSchema (+12 more)

### Community 16 - "Community 16"
Cohesion: 0.13
Nodes (23): loadTree(), saveTree(), storageKey(), useTerminals, ShortcutDetail, UseTerminalShortcutsOptions, SplitTreeProps, applySizes() (+15 more)

### Community 17 - "Community 17"
Cohesion: 0.08
Nodes (25): devDependencies, autoprefixer, class-variance-authority, clsx, concurrently, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities (+17 more)

### Community 18 - "Community 18"
Cohesion: 0.13
Nodes (13): log, createLogger(), log, dryRunLog, FAKE_OPEN_PRS, fakeEncoder, GitWorktreeAddOptions, ImportNotionOptions (+5 more)

### Community 19 - "Community 19"
Cohesion: 0.08
Nodes (24): compilerOptions, allowImportingTsExtensions, baseUrl, esModuleInterop, isolatedModules, jsx, lib, module (+16 more)

### Community 20 - "Community 20"
Cohesion: 0.16
Nodes (17): Tab, TAB_TITLES, TabButtonProps, PrdReviewDialog(), PrdReviewDialogProps, QuitConfirmModalProps, Button, ButtonProps (+9 more)

### Community 21 - "Community 21"
Cohesion: 0.11
Nodes (15): BoardColumn(), BoardColumnProps, DEFAULT_COLLAPSED, familyKeyOf(), groupTicketsByFamily(), isSplitMother(), RenderGroup, resolveAnalyzeAllTitle() (+7 more)

### Community 22 - "Community 22"
Cohesion: 0.15
Nodes (21): formatTokens(), TicketCost(), TicketCostProps, TOKEN_FORMATTER, USD_FORMATTER, AGENT_MODEL_LABELS, costByFamily(), costOf() (+13 more)

### Community 23 - "Community 23"
Cohesion: 0.10
Nodes (22): argus review (native subagent), Backend (routes tool calls, verifies gates), Bun runtime, Channel events (ticket/answer/prd_validated/nudge/user_comment), @anthropic-ai/claude-agent-sdk, Column vs Stage axes, Composer 2.5 path (run_composer.sh), Server-verified done gate (+14 more)

### Community 24 - "Community 24"
Cohesion: 0.13
Nodes (15): PrdAnnotator(), PrdAnnotatorProps, PrdView(), ShortcutDetail, usePrdSearch(), UsePrdSearchOptions, UsePrdSearchResult, AnnotatedHtml (+7 more)

### Community 25 - "Community 25"
Cohesion: 0.13
Nodes (18): StatsViewProps, ACTIVE_BAR, AREA_CURSOR, AXIS_PROPS, BAR_CURSOR, CHART_PALETTE, CostChart(), DurationChart() (+10 more)

### Community 26 - "Community 26"
Cohesion: 0.14
Nodes (7): TicketBadgesProps, TicketCardProps, COLUMN_NODE_COLOR, WorkflowView(), WorkflowViewProps, TicketLifecycle, Ticket

### Community 27 - "Community 27"
Cohesion: 0.12
Nodes (22): Channel (agent<->backend link), Column (board lane), Contract (pipeline instructions), Coordinator, Done Gate, Kind (ticket pipeline type), Protocol (wire format source of truth), SessionHub (+14 more)

### Community 28 - "Community 28"
Cohesion: 0.17
Nodes (6): buildFeasibilityBatchContract(), DRY_RUN_VERDICT, FeasibilityBatchManager, log, toTriageResult(), FeasibilityResult

### Community 29 - "Community 29"
Cohesion: 0.13
Nodes (15): NAV_ENTRIES, NavEntry, Sidebar(), SidebarProps, SidebarView, emit(), loadedSubscribers, refreshProjects() (+7 more)

### Community 30 - "Community 30"
Cohesion: 0.14
Nodes (18): mapCommentRow(), NewClean, NewProject, NewReview, ProjectInUseError, ProjectPatch, SlotStatus, SqlBindValue (+10 more)

### Community 31 - "Community 31"
Cohesion: 0.14
Nodes (13): ANSI, COLOR_ENABLED, isLevel(), Level, LEVEL_ORDER, LEVEL_TAG, Logger, paint() (+5 more)

### Community 32 - "Community 32"
Cohesion: 0.13
Nodes (19): BASH_ALLOWLIST, buildFeasibilitySessionConfig(), buildImplementSessionConfig(), buildTriageSessionConfig(), DENIED_BUILTIN_AGENTS, feasibilityScoutAgent(), FeasibilitySessionInput, IMPLEMENTER_SAFE_TOOLS (+11 more)

### Community 33 - "Community 33"
Cohesion: 0.10
Nodes (20): scripts, build:desktop, build:web, dev, dev:desktop, dev:proxy, dev:server, dev:web (+12 more)

### Community 34 - "Community 34"
Cohesion: 0.13
Nodes (17): PROGRESS_BAR_COLORS, StageProgressBar(), StageProgressBarProps, ANIMATED_STAGES, BadgeVariant, DATETIME_FORMAT, NON_DEPENDABLE_COLUMNS, prNumberFromUrl() (+9 more)

### Community 35 - "Community 35"
Cohesion: 0.16
Nodes (15): NewTicketDialog(), resolveProjectLabel(), AUTHOR_BADGES, CommentRow(), CommentRowProps, isLocked(), TicketDetail(), TriageSection() (+7 more)

### Community 36 - "Community 36"
Cohesion: 0.12
Nodes (12): DragHandleAttributes, DragHandleListeners, IMPLEMENTER_OPTIONS, LANGUAGE_OPTIONS, ProfileRowProps, renderTab(), SettingsModal(), SettingsModalProps (+4 more)

### Community 37 - "Community 37"
Cohesion: 0.11
Nodes (18): dependencies, @anthropic-ai/claude-agent-sdk, dompurify, elysia, marked, @modelcontextprotocol/sdk, nanoid, papaparse (+10 more)

### Community 38 - "Community 38"
Cohesion: 0.16
Nodes (15): WORKER_TOOLS, resolveClaudeBinary(), bashCommandSchema, buildSettings(), claudeProvider, createSdkAgentSession(), dispatch(), HIDDEN_COMMIT_ATTRIBUTION (+7 more)

### Community 39 - "Community 39"
Cohesion: 0.14
Nodes (12): badgeLabelFor(), LiveTerminal(), LiveTerminalOptions, LiveTerminalProps, WorktreeSessionsView(), WorktreeSessionsViewProps, TERMINAL_THEME, terminalWsUrl() (+4 more)

### Community 41 - "Community 41"
Cohesion: 0.22
Nodes (13): AgentProfileConfig(), ImplementationAgentFields(), loadOnce(), subscribers, UNKNOWN_CAPABILITIES, useCapabilities(), useProfiles(), resolveAgentDefaults() (+5 more)

### Community 42 - "Community 42"
Cohesion: 0.17
Nodes (11): active, ensureNotificationPermission(), getAudioContext(), isSupported(), playNotificationSound(), showDesktopNotification(), Window, CommentListener (+3 more)

### Community 43 - "Community 43"
Cohesion: 0.14
Nodes (13): runFirstBootSetup(), PROJECT_ROOT, RunningServer, serveStaticAsset(), SocketData, startServer(), StartServerOptions, STATIC_CONTENT_TYPES (+5 more)

### Community 44 - "Community 44"
Cohesion: 0.16
Nodes (12): AddProjectForm(), AddProjectFormProps, isPositiveIntegerString(), isValidDraft(), ProjectFieldsProps, ProjectRow(), ProjectRowProps, ProjectsSettings() (+4 more)

### Community 45 - "Community 45"
Cohesion: 0.19
Nodes (10): applyDesktopEnv(), DesktopRoots, ensureConfig(), boot(), installApplicationMenu(), installMenuShortcutBridge(), menuShortcutActionSchema, newWindowEventSchema (+2 more)

### Community 46 - "Community 46"
Cohesion: 0.27
Nodes (15): Agent Implementation Config, Argus Code Review, Automated Tests (typecheck/lint/test), Claude Code Autonomous Agent, Ticket Contract Injection, Feasibility Analysis, Kanban Board (Atelier), Kanban Agents Demo (demo.gif) (+7 more)

### Community 47 - "Community 47"
Cohesion: 0.20
Nodes (10): AgentCardProps, AgentsView(), normalize(), TicketBadges(), resolveProjectColor(), TERMINAL_STAGES, Badge(), BadgeProps (+2 more)

### Community 48 - "Community 48"
Cohesion: 0.21
Nodes (8): AskPanel(), AGENT_EFFORT_OPTIONS, AGENT_MODEL_OPTIONS, handleMediaPaste(), IMPLEMENTERS, TabOption, Tabs(), TabsProps

### Community 49 - "Community 49"
Cohesion: 0.15
Nodes (10): ImportTicketsPanel(), ImportTicketsPanelProps, ProjectSelect(), useAgentKnobs(), CsvParseError, ParsedTicketRow, ParsedTicketsCsv, parseTicketsCsv() (+2 more)

### Community 51 - "Community 51"
Cohesion: 0.16
Nodes (12): ChartConfig, ChartContainer, ChartContainerProps, ChartContext, ChartContextValue, ChartLegendContent(), ChartLegendContentProps, ChartTooltipContent() (+4 more)

### Community 52 - "Community 52"
Cohesion: 0.38
Nodes (12): AgentProfileConfigProps, ImplementationAgentFieldsProps, NewAsk, NewProfile, NewTicket, ProfilePatch, AgentKnobs, AgentProfileConfigValues (+4 more)

### Community 53 - "Community 53"
Cohesion: 0.18
Nodes (9): TICKET_OPTION, TicketOptionsToggleGroup(), TicketOptionsToggleGroupProps, TicketOptionValues, ToggleGroup, ToggleGroupContext, ToggleGroupItem, Toggle (+1 more)

### Community 54 - "Community 54"
Cohesion: 0.18
Nodes (6): mapSlotRow(), mapWorktreeSessionRow(), enrichWorktreeSession(), BoardState, Slot, WorktreeSession

### Community 55 - "Community 55"
Cohesion: 0.35
Nodes (11): AgentCard(), projectBadgeStyle(), TicketCard(), TriageDot(), useTickTimer(), formatDuration(), formatRelativeDuration(), isStageAnimated() (+3 more)

### Community 56 - "Community 56"
Cohesion: 0.24
Nodes (7): Board(), BoardProps, normalize(), Toaster(), useBoard(), COLUMN_ORDER, COLUMNS

### Community 57 - "Community 57"
Cohesion: 0.27
Nodes (9): useTheme(), UseThemeResult, applyTheme(), getStoredTheme(), isTheme(), Theme, ThemeOption, THEMES (+1 more)

### Community 58 - "Community 58"
Cohesion: 0.22
Nodes (4): resolveBaseBranch(), FeasibilitySession, SqlUpdateBuilder, ProjectConfig

### Community 60 - "Community 60"
Cohesion: 0.25
Nodes (7): labelWithDefault(), TicketConfigSummary(), AGENT_EFFORT_LABELS, COMMIT_LANGUAGE_LABELS, IMPLEMENTER_LABELS, ProfileConfig, REVIEW_DEPTH_LABELS

### Community 61 - "Community 61"
Cohesion: 0.22
Nodes (6): FullscreenToggle(), FullscreenToggleProps, TerminalData, TerminalView(), TerminalViewProps, useFullscreenEscape()

### Community 62 - "Community 62"
Cohesion: 0.28
Nodes (7): StatsView(), useStats(), UseStatsResult, StatRecord, StatCard(), StatCardProps, StatEmpty()

### Community 63 - "Community 63"
Cohesion: 0.31
Nodes (8): createDatabase(), migrate(), PROFILE_MIGRATIONS, seedProfiles(), seedSlots(), TICKET_MIGRATIONS, DEFAULT_PROFILES, SLOT_COUNT

### Community 64 - "Community 64"
Cohesion: 0.48
Nodes (4): PrSelectRow(), PrSelectRowProps, isPrNeedsAttention(), OpenPr

### Community 65 - "Community 65"
Cohesion: 0.29
Nodes (5): SlotsBar(), SlotsBarProps, Stat(), StatProps, STATUS_LABELS

### Community 66 - "Community 66"
Cohesion: 0.33
Nodes (4): currentNow, startTicking(), subscribe(), subscribers

### Community 67 - "Community 67"
Cohesion: 0.40
Nodes (6): costByModel(), costByProject(), meanCostPerIssueUsd(), modelLabel(), totalSpendUsd(), withCost()

### Community 68 - "Community 68"
Cohesion: 0.40
Nodes (5): MIME_EXTENSIONS, resolveExtension(), SavedUpload, saveUpload(), serveUpload()

### Community 69 - "Community 69"
Cohesion: 0.33
Nodes (3): listeners, mcp, ReplyArgsSchema

### Community 70 - "Community 70"
Cohesion: 0.50
Nodes (3): emit(), refreshProfiles(), subscribers

### Community 71 - "Community 71"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 73 - "Community 73"
Cohesion: 0.50
Nodes (4): Claude binary resolution (KANBAN_CLAUDE_BINARY), Config split (config.json vs env), Databases (kanban.db / kanban-real.db), Electrobun desktop app

### Community 74 - "Community 74"
Cohesion: 0.50
Nodes (4): ClientHub (broadcasts board snapshots), No type casting convention, rows.ts (zod row validation), store.ts single DB mutation point

### Community 75 - "Community 75"
Cohesion: 1.00
Nodes (4): Dry-run safety model, FakeSystemAdapter, RealSystemAdapter, SystemAdapter (side-effect boundary)

### Community 76 - "Community 76"
Cohesion: 0.67
Nodes (3): mergePaths(), PATH_PROBE_COMMAND, repairPath()

## Knowledge Gaps
- **403 isolated node(s):** `log`, `legacyConfigSchema`, `LegacyConfig`, `LegacyModels`, `log` (+398 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Ticket` connect `Community 26` to `Community 0`, `Community 1`, `Community 2`, `Community 5`, `Community 6`, `Community 8`, `Community 10`, `Community 13`, `Community 21`, `Community 22`, `Community 29`, `Community 30`, `Community 32`, `Community 34`, `Community 35`, `Community 42`, `Community 47`, `Community 50`, `Community 54`, `Community 55`, `Community 56`, `Community 58`, `Community 60`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Why does `cn()` connect `Community 11` to `Community 13`, `Community 20`, `Community 21`, `Community 24`, `Community 25`, `Community 29`, `Community 34`, `Community 35`, `Community 39`, `Community 47`, `Community 48`, `Community 49`, `Community 51`, `Community 53`, `Community 55`, `Community 56`, `Community 61`, `Community 62`, `Community 64`, `Community 65`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Why does `RealSystemAdapter` connect `Community 9` to `Community 64`, `Community 18`, `Community 4`, `Community 15`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **What connects `log`, `legacyConfigSchema`, `LegacyConfig` to the rest of the system?**
  _406 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06744956338452274 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.05182443151771549 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.040437158469945354 - nodes in this community are weakly interconnected._