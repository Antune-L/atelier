export const COLUMNS = [
  "todo",
  "implementing",
  "prd",
  "to_review",
  "done",
  "merged",
  "reviewed",
  "answered",
  "failed",
  "abandoned",
] as const;
export type Column = (typeof COLUMNS)[number];

export const COLUMN_LABELS: Record<Column, string> = {
  todo: "TODO",
  implementing: "À implémenter",
  prd: "PRD",
  to_review: "À review",
  done: "Fini",
  merged: "PR mergée",
  reviewed: "PR reviewed",
  answered: "Répondu",
  failed: "Échec",
  abandoned: "Abandonnés",
};

export const COLUMN_ORDER: Column[] = [
  "todo",
  "implementing",
  "prd",
  "to_review",
  "done",
  "merged",
  "reviewed",
  "answered",
  "failed",
  "abandoned",
];

/** Field a sortable column ranks its tickets by; absent columns aren't sortable. */
export const COLUMN_SORT_FIELD: Partial<
  Record<Column, "createdAt" | "finishedAt">
> = {
  todo: "createdAt",
  implementing: "createdAt",
  prd: "createdAt",
  to_review: "createdAt",
  done: "finishedAt",
  merged: "finishedAt",
  reviewed: "createdAt",
  answered: "createdAt",
  failed: "createdAt",
  abandoned: "createdAt",
};

/** Implementation agent knobs the user can pick per ticket (CLI: --model / --effort). */
export const AGENT_MODELS = ["opus", "sonnet", "haiku", "fable"] as const;
export type AgentModel = (typeof AGENT_MODELS)[number];

export const AGENT_EFFORTS = ["low", "medium", "high", "xhigh", "max"] as const;
export type AgentEffort = (typeof AGENT_EFFORTS)[number];

export const AGENT_MODEL_LABELS: Record<AgentModel, string> = {
  opus: "O",
  sonnet: "S",
  haiku: "H",
  fable: "F",
};

export const AGENT_EFFORT_LABELS: Record<AgentEffort, string> = {
  low: "L",
  medium: "M",
  high: "H",
  xhigh: "XH",
  max: "MAX",
};

/** Who writes the implementation code (the CLI driver for the implementing stage). */
export const IMPLEMENTERS = ["claude", "composer", "codex"] as const;
export type Implementer = (typeof IMPLEMENTERS)[number];

export const IMPLEMENTER_LABELS: Record<Implementer, string> = {
  claude: "Claude",
  composer: "Composer 2.5",
  codex: "Codex",
};

/** Who pilots the full session (planning, review, tests, git, PR) — distinct from who writes the code. */
export const ORCHESTRATORS = ["claude", "codex"] as const;
export type Orchestrator = (typeof ORCHESTRATORS)[number];

export const ORCHESTRATOR_LABELS: Record<Orchestrator, string> = {
  claude: "Claude",
  codex: "Codex",
};

/**
 * Allowed orchestrator × implementer pairs. Codex orchestrates only itself (it has no Agent tool to
 * delegate); Claude orchestrates any implementer — a Codex implementer runs as a backend-delegated
 * child session (worker tool `delegate_implementation`).
 */
export function isAllowedAgentPair(orchestrator: Orchestrator, implementer: Implementer): boolean {
  return orchestrator === "codex" ? implementer === "codex" : true;
}

/** Language the agent writes commit messages and PR title/description in. */
export const COMMIT_LANGUAGES = ["en", "fr"] as const;
export type CommitLanguage = (typeof COMMIT_LANGUAGES)[number];

export const COMMIT_LANGUAGE_LABELS: Record<CommitLanguage, string> = {
  en: "Anglais",
  fr: "Français",
};

/** Default when the user has never picked one (stored in the `meta` table). */
export const DEFAULT_COMMIT_LANGUAGE: CommitLanguage = "en";

/** `meta` table key holding the persisted commit/PR language. */
export const COMMIT_LANGUAGE_META_KEY = "commit_language";

/**
 * Default language for the feasibility study (triage). Unlike commit messages,
 * the feasibility study defaults to French.
 */
export const DEFAULT_TRIAGE_LANGUAGE: CommitLanguage = "fr";

/** `meta` table key holding the persisted feasibility-study (triage) language. */
export const TRIAGE_LANGUAGE_META_KEY = "triage_language";

/** `meta` table key holding the persisted default implementation-agent model. */
export const IMPLEMENT_MODEL_META_KEY = "implement_model";
/** `meta` table key holding the persisted default triage model. */
export const TRIAGE_MODEL_META_KEY = "triage_model";
/** `meta` table key holding the persisted default implementation-agent reasoning effort. */
export const IMPLEMENT_EFFORT_META_KEY = "implement_effort";
/** `meta` table key holding the persisted default triage reasoning effort. */
export const TRIAGE_EFFORT_META_KEY = "triage_effort";
/** `meta` table key flagging that the legacy config.json has been migrated into the Store. */
export const CONFIG_MIGRATED_META_KEY = "config_migrated";

/** A reusable implementation-agent preset (orchestrator + implementer sub-agent knobs). */
export interface ProfileConfig {
  name: string;
  orchestrator: Orchestrator;
  model: AgentModel;
  effort: AgentEffort;
  /** Implementer sub-agent model (claude mode only). */
  implementerModel: AgentModel;
  /** Implementer sub-agent reasoning effort (claude mode only). */
  implementerEffort: AgentEffort;
  implementer: Implementer;
  /** Codex session model (codex orchestrator/implementer only). */
  codexModel: CodexModel;
  /** Codex session reasoning effort (codex orchestrator/implementer only). */
  codexEffort: CodexEffort;
}

/** The built-in Codex preset, also seeded once into pre-existing DBs (see schema.ts). */
export const CODEX_SEED_PROFILE: ProfileConfig = {
  name: "Codex",
  orchestrator: "codex",
  model: "opus",
  effort: "medium",
  implementerModel: "opus",
  implementerEffort: "low",
  implementer: "codex",
  codexModel: "gpt-5.5",
  codexEffort: "high",
};

/** Seeded into the DB on first boot; editable afterwards via the settings modal. */
export const DEFAULT_PROFILES: ProfileConfig[] = [
  {
    name: "Basique",
    orchestrator: "claude",
    model: "opus",
    effort: "medium",
    implementerModel: "opus",
    implementerEffort: "low",
    implementer: "claude",
    codexModel: "gpt-5.5",
    codexEffort: "medium",
  },
  {
    name: "Debug -",
    orchestrator: "claude",
    model: "opus",
    effort: "low",
    implementerModel: "opus",
    implementerEffort: "low",
    implementer: "claude",
    codexModel: "gpt-5.5",
    codexEffort: "medium",
  },
  {
    name: "Debug +",
    orchestrator: "claude",
    model: "opus",
    effort: "max",
    implementerModel: "opus",
    implementerEffort: "low",
    implementer: "claude",
    codexModel: "gpt-5.5",
    codexEffort: "medium",
  },
  {
    name: "Délégation",
    orchestrator: "claude",
    model: "opus",
    effort: "medium",
    implementerModel: "opus",
    implementerEffort: "low",
    implementer: "composer",
    codexModel: "gpt-5.5",
    codexEffort: "medium",
  },
  CODEX_SEED_PROFILE,
];

/** Sentinel "profile" shown when a ticket's knobs match no stored profile. */
export const CUSTOM_PROFILE_ID = "custom";
export const CUSTOM_PROFILE_LABEL = "Personnalisé";

/**
 * What a ticket delivers: a feature implementation (default), an autonomous PR review, a
 * read-only answer to a question about a project (ask — no branch, no PR, surfaces a comment), or
 * a PR cleaner (clean — triage a PR's reviewer feedback and apply only the pertinent fixes).
 */
export const KINDS = ["feature", "review", "ask", "clean"] as const;
export type Kind = (typeof KINDS)[number];

/** Local branch suffix for a clean (PR cleaner) worktree: keeps it distinct from the PR head branch (which may already be checked out in another worktree) while still pushing back to the PR head. */
export const CLEANER_BRANCH_SUFFIX = "-cleaner";

/** Local branch suffix for a read-only review worktree: the slot checks out the PR head commit so reviewers read/grep the PR state (not the base), without colliding with a worktree already on the PR head branch. Never pushed. */
export const REVIEWER_BRANCH_SUFFIX = "-reviewer";

/** The PR cleaner runs Opus at low effort: triaging reviewer feedback is light work that doesn't warrant a heavier reasoning budget. */
export const CLEANER_MODEL: AgentModel = "opus";
export const CLEANER_EFFORT: AgentEffort = "low";

/**
 * Codex models pickable per ticket (kept in sync with the live Codex model catalog; GPT-5.6 Sol is
 * excluded because the catalog does not expose it to this account). Requires codex CLI ≥ 0.144 for
 * the gpt-5.6-* models (older CLIs reject them with "requires a newer version of Codex").
 */
export const CODEX_MODELS = ["gpt-5.6-terra", "gpt-5.6-luna", "gpt-5.5", "gpt-5.4", "gpt-5.4-mini"] as const;
export type CodexModel = (typeof CODEX_MODELS)[number];

export const CODEX_MODEL_LABELS: Record<CodexModel, string> = {
  "gpt-5.6-terra": "5.6 Terra",
  "gpt-5.6-luna": "5.6 Luna",
  "gpt-5.5": "5.5",
  "gpt-5.4": "5.4",
  "gpt-5.4-mini": "5.4 mini",
};

/**
 * Reasoning effort levels exposed for Codex (distinct enum from AgentEffort). The full union across
 * models; per-model support is a PREFIX of this list (see CODEX_MODEL_EFFORTS). "minimal" stays
 * excluded: it is rejected outright by the API (400, unsupported_value) and breaks web_search.
 */
export const CODEX_EFFORTS = ["low", "medium", "high", "xhigh", "max", "ultra"] as const;
export type CodexEffort = (typeof CODEX_EFFORTS)[number];

export const CODEX_EFFORT_LABELS: Record<CodexEffort, string> = {
  low: "L",
  medium: "M",
  high: "H",
  xhigh: "XH",
  max: "Max",
  ultra: "Ultra",
};

/**
 * Efforts each Codex model accepts (from the live model catalog). Every entry is a prefix of
 * CODEX_EFFORTS: "max" needs a 5.6 model, "ultra" (multi-agent reasoning) is Terra-only.
 */
export const CODEX_MODEL_EFFORTS: Record<CodexModel, readonly CodexEffort[]> = {
  "gpt-5.6-terra": CODEX_EFFORTS,
  "gpt-5.6-luna": ["low", "medium", "high", "xhigh", "max"],
  "gpt-5.5": ["low", "medium", "high", "xhigh"],
  "gpt-5.4": ["low", "medium", "high", "xhigh"],
  "gpt-5.4-mini": ["low", "medium", "high", "xhigh"],
};

/**
 * Coerce an effort to something the model accepts after a model change: an unsupported effort clamps
 * to the model's strongest one (supported lists are prefixes, so "ultra" on Luna clamps to "max").
 */
export function pairedCodexEffort(model: CodexModel, effort: CodexEffort): CodexEffort {
  const supported = CODEX_MODEL_EFFORTS[model];
  if (supported.includes(effort)) return effort;
  return supported[supported.length - 1] ?? DEFAULT_CODEX_EFFORT;
}

/** Fallback Codex knobs when neither the ticket nor the persisted app settings pin them. */
export const DEFAULT_CODEX_MODEL: CodexModel = "gpt-5.6-terra";
export const DEFAULT_CODEX_EFFORT: CodexEffort = "medium";

/** `meta` table key holding the persisted default Codex model. */
export const CODEX_MODEL_META_KEY = "codex_model";
/** `meta` table key holding the persisted default Codex reasoning effort. */
export const CODEX_EFFORT_META_KEY = "codex_effort";
/** `meta` table key flagging that the built-in Codex profile has been seeded (once). */
export const CODEX_PROFILE_SEEDED_META_KEY = "codex_profile_seeded";
/**
 * `meta` table key flagging that the one-shot orchestrator backfill ran (implementer=codex →
 * orchestrator=codex on tickets and profiles). MUST stay one-shot: once cross-provider pairs are
 * allowed (PR2), re-running it would silently rewrite a claude-orchestrated codex-implementer ticket.
 */
export const ORCHESTRATOR_BACKFILL_META_KEY = "orchestrator_backfilled";

/** Argus review depth picked per review ticket (light = 4 reviewers, full = 6). */
export const REVIEW_DEPTHS = ["light", "full"] as const;
export type ReviewDepth = (typeof REVIEW_DEPTHS)[number];

export const REVIEW_DEPTH_LABELS: Record<ReviewDepth, string> = {
  light: "Light",
  full: "Complet",
};

export const STAGES = [
  "queued",
  "planning",
  "awaiting_answers",
  "implementing",
  "reviewing",
  "fixing",
  "testing",
  "opening_pr",
  "done",
  "failed",
  "interrupted",
  "stalled",
] as const;
export type Stage = (typeof STAGES)[number];

export const STAGE_LABELS: Record<Stage, string> = {
  queued: "En file",
  planning: "Planification",
  awaiting_answers: "En attente de réponse",
  implementing: "Implémentation",
  reviewing: "Revue",
  fixing: "Correction",
  testing: "Tests",
  opening_pr: "Ouverture PR",
  done: "Terminé",
  failed: "Échec",
  interrupted: "Interrompu",
  stalled: "Bloqué",
};

/** Stages where the pipeline has stopped: the run is over or dead (slot may still be held). */
export const TERMINAL_STAGES: Stage[] = [
  "done",
  "failed",
  "interrupted",
  "stalled",
];

/** Stages where the pipeline is actively running (not terminal, not waiting on user). */
export const ACTIVE_STAGES: Stage[] = [
  "queued",
  "planning",
  "implementing",
  "reviewing",
  "fixing",
  "testing",
  "opening_pr",
];

/** Triage feasibility verdicts an agent can return. */
export const TRIAGE_VERDICTS = [
  "implementable",
  "needs_info",
  "needs_rework",
] as const;

/** Columns whose tickets are counted as a successful outcome in the stats dashboard. */
export const SUCCESS_COLUMNS: Column[] = [
  "done",
  "merged",
  "reviewed",
  "answered",
];
/** Columns whose tickets are counted as a failed outcome in the stats dashboard. */
export const FAILURE_COLUMNS: Column[] = ["failed"];

export const COMMENT_AUTHORS = ["user", "agent", "system"] as const;
export type CommentAuthor = (typeof COMMENT_AUTHORS)[number];

const DEFAULT_SLOT_COUNT = 5;

function resolveSlotCount(): number {
  const env = typeof process !== "undefined" ? process.env : undefined;
  const raw = env?.KANBAN_SLOTS;
  if (!raw) return DEFAULT_SLOT_COUNT;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_SLOT_COUNT;
}

export const SLOT_COUNT = resolveSlotCount();
export const MAX_REVIEW_ROUNDS = 2;
export const WATCHDOG_TIMEOUT_MS = 45 * 60 * 1000;
export const AUTO_NUDGE_MAX = 1;
/** Max in-place relaunches of a dead/stalled session before giving up (preserves the worktree). */
export const AUTO_RECLAIM_MAX = 2;
/**
 * A turn can end without a protocol tool call yet not be stalled — the orchestrator routinely ends
 * its turn right after the `implementer` sub-agent hands work back (the sub-agent can't call done()).
 * The auto-nudge re-prompts it; only escalate to a session-killing reclaim once the turn has been
 * genuinely idle this long. Distinct from (and far shorter than) the 45-min soft watchdog: short
 * enough that a truly dead turn is reclaimed promptly, long enough that a normal hand-back + the
 * orchestrator's next-turn latency never trips it.
 */
export const RECLAIM_IDLE_MS = 10 * 60 * 1000;
/** Audit event logged when any ticket (feature/review/clean/ask) is first inserted. */
export const CREATED_EVENT = "created";
/** Audit event logged on each auto-reclaim; backs the reclaim counter (never logged by manual retries). */
export const AUTO_RECLAIM_EVENT = "auto_reclaim";
/** Audit event logged on each failed done() gate; backs the consecutive-failure loop guard. */
export const DONE_GATE_FAILED_EVENT = "done_gate_failed";
/**
 * Max automatic rebase/conflict-resolution sessions spawned when an auto-merge fails (branch behind
 * base / conflicts). Bounds the loop: the resolution session can itself reach a failing merge, which
 * would otherwise re-trigger resolution forever. Past this the card lands in "failed" for manual review.
 */
export const AUTO_MERGE_RESOLVE_MAX = 1;
/** Audit event logged on each auto-triggered merge-conflict resolution; backs the resolve counter. */
export const AUTO_MERGE_RESOLVE_EVENT = "auto_merge_resolve";
/**
 * Consecutive failed done() gates (no intervening protocol event — a tight within-turn loop)
 * tolerated before the card is treated as a real stall. Below this, a failure is a false positive:
 * done() returns the actionable reason and the still-alive agent corrects + retries, so the card
 * stays "opening_pr", not "Bloqué". Cross-turn retries are escalated by the Stop-hook/watchdog
 * instead (their auto_nudge event resets this trailing counter), so this only catches a runaway loop.
 */
export const DONE_GATE_MAX_FAILURES = 5;

/** Implementability triage ("Analyser"): read-only, user-initiated. Generous so large repos can be explored — the timer also covers claude boot + MCP connect (~2 min poll). */
export const TRIAGE_TIMEOUT_MS = 15 * 60 * 1000;
/**
 * SLOT_ID a triage worker identifies with: a triage runs in NO slot. The coordinator uses it to
 * recognize a triage session and bar it from the slot-pipeline tools (it may only submit_triage).
 */
export const TRIAGE_SLOT_ID = -1;
/** Max chars of raw CLI output stored as the report when triage fails to parse. */
export const TRIAGE_RAW_REPORT_MAX = 4000;

/** Ticket-split decomposition ("Découper"): read-only, user-initiated. Same generous bound as triage. */
export const SPLIT_TIMEOUT_MS = 15 * 60 * 1000;
/**
 * SLOT_ID a split worker identifies with (distinct from TRIAGE/FEASIBILITY slot ids): a split runs in
 * NO slot. The coordinator uses it to recognize a split session and bar it from the slot-pipeline
 * tools (it may only submit_split).
 */
export const SPLIT_SLOT_ID = -3;
/**
 * Prefix of a split mother's integration branch (`split/<motherId>-<slug>`). Identifies a split mother
 * by its branch alone: it lands in "done" with this branch set but no PR, and its children are allowed
 * to start despite the missing PR (see isBlocked in routes.ts).
 */
export const SPLIT_BRANCH_PREFIX = "split/";

/**
 * Batch feasibility analysis ("Import CSV"): ONE orchestrator session fans out X read-only
 * sub-agents (one per imported ticket), each returning a verdict reusing the triage fields.
 */
export const FEASIBILITY_TIMEOUT_MS = 20 * 60 * 1000;
/**
 * SLOT_ID a feasibility-batch worker identifies with (distinct from TRIAGE_SLOT_ID). The orchestrator
 * runs in NO slot on a synthetic batch id; the coordinator uses it to bar every pipeline tool but
 * submit_feasibility.
 */
export const FEASIBILITY_SLOT_ID = -2;

/**
 * SLOT_ID a delegated Codex implementation child identifies with: the child runs INSIDE the parent
 * ticket's slot worktree but has no worker tools of its own — if one of its calls ever reaches the
 * coordinator, this id bars every pipeline tool.
 */
export const DELEGATION_SLOT_ID = -4;
/** Prefix of the synthetic batch id a feasibility session identifies with (no real ticket). */
export const FEASIBILITY_BATCH_PREFIX = "feasibility-";
/**
 * Subagent type the orchestrator MUST fan out per ticket: a read-only scout WITHOUT the Task tool, so
 * it cannot recurse into further subagents. Defined inline via `--agents` (no write to the real repo);
 * `--tools` only bounds the top-level session, never the subagents it spawns.
 */
export const FEASIBILITY_SCOUT_AGENT_NAME = "feasibility-scout";
/**
 * Subagent type the "Analyse +" orchestrator fans out for solution/approach research (read-only,
 * no Task — cannot recurse). The orchestrator launches two instances with distinct angles.
 */
export const TRIAGE_PLUS_SOLUTIONS_SCOUT_AGENT_NAME = "triage-plus-solutions";
/** Max automatic batch relaunches before the imported tickets are finally marked failed. */
export const FEASIBILITY_AUTO_RELAUNCH_MAX = 1;
/** Audit event logged each time a stuck feasibility batch is automatically relaunched. */
export const FEASIBILITY_AUTO_RELAUNCH_EVENT = "feasibility_auto_relaunch";
/** Max rows a single CSV import may create (bounds a batch; average ~20). */
export const IMPORT_MAX_ROWS = 200;

// ---- Automations (background prompts on a trigger) ----

export const AUTOMATION_TRIGGERS = ["on_launch", "recurring"] as const;
export type AutomationTrigger = (typeof AUTOMATION_TRIGGERS)[number];

export const AUTOMATION_TRIGGER_LABELS: Record<AutomationTrigger, string> = {
  on_launch: "Au lancement",
  recurring: "Récurrent",
};

export const AUTOMATION_RUN_STATUSES = ["running", "success", "failure"] as const;
export type AutomationRunStatus = (typeof AUTOMATION_RUN_STATUSES)[number];

/** Max run-history entries kept/returned per automation. */
export const AUTOMATION_RUNS_LIMIT = 50;

/** Bounds on a recurring automation's interval (minutes). */
export const AUTOMATION_MIN_INTERVAL_MINUTES = 1;

/** Default HTTP/WS port when `process.env.PORT` is unset. Shared so any in-process caller (e.g. the
 * codexProvider worker MCP URL) can resolve the backend's own address without duplicating the
 * fallback. */
export const DEFAULT_PORT = 52817;

/** WebSocket channels. */
export const WS_PATH_CLIENT = "/ws";
/** Interactive PTY stream for a worktree/user shell tmux pane (output + bidirectional input). */
export const WS_PATH_TERMINAL = "/ws/terminal";
/** Streamable-HTTP MCP endpoint serving the worker tools to Codex sessions (see workerMcp.ts). */
export const HTTP_PATH_WORKER_MCP = "/mcp/worker";

/**
 * Default tmux pane size for a detached agent session. Spawn NARROW on purpose: a viewer almost
 * always attaches wider, and tmux reflows scrollback UP (widening) without wrapping. Spawning
 * wider than the viewer makes tmux wrap claude's right-aligned TUI lines when reflowing DOWN to
 * the viewer width — garbled history that no client-side fit can recover. 80 is claude's floor.
 */
export const TERMINAL_DEFAULT_COLS = 80;
export const TERMINAL_DEFAULT_ROWS = 32;

/** Minimum size (percent of its PanelGroup) a terminal split cell may be resized down to. */
export const TERMINAL_PANEL_MIN_PERCENT = 10;

/**
 * Scrollback prepended to a user-terminal seed (a plain shell, where past commands are worth
 * showing on reopen). The agent pane seeds from the visible frame only (0): its TUI reprints the
 * whole static log on every resize, so its scrollback stacks duplicate frames (see capturePaneAnsi).
 */
export const TERMINAL_SEED_HISTORY_LINES = 200;
