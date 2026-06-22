export const COLUMNS = [
  "todo",
  "implementing",
  "prd",
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
  done: "finishedAt",
  merged: "finishedAt",
  reviewed: "createdAt",
  answered: "createdAt",
  failed: "createdAt",
  abandoned: "createdAt",
};

/** Implementation agent knobs the user can pick per ticket (CLI: --model / --effort). */
export const AGENT_MODELS = ["opus", "sonnet", "haiku"] as const;
export type AgentModel = (typeof AGENT_MODELS)[number];

export const AGENT_EFFORTS = ["low", "medium", "high", "xhigh", "max"] as const;
export type AgentEffort = (typeof AGENT_EFFORTS)[number];

export const AGENT_MODEL_LABELS: Record<AgentModel, string> = {
  opus: "Opus",
  sonnet: "Sonnet",
  haiku: "Haiku",
};

export const AGENT_EFFORT_LABELS: Record<AgentEffort, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  xhigh: "Très haut",
  max: "Max",
};

/** Who writes the implementation code (the CLI driver for the implementing stage). */
export const IMPLEMENTERS = ["claude", "composer"] as const;
export type Implementer = (typeof IMPLEMENTERS)[number];

export const IMPLEMENTER_LABELS: Record<Implementer, string> = {
  claude: "Claude",
  composer: "Composer 2.5",
};

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

/** A reusable implementation-agent preset (orchestrator + implementer sub-agent knobs). */
export interface ProfileConfig {
  name: string;
  model: AgentModel;
  effort: AgentEffort;
  /** Implementer sub-agent model (claude mode only). */
  implementerModel: AgentModel;
  /** Implementer sub-agent reasoning effort (claude mode only). */
  implementerEffort: AgentEffort;
  implementer: Implementer;
}

/** Seeded into the DB on first boot; editable afterwards via the settings modal. */
export const DEFAULT_PROFILES: ProfileConfig[] = [
  {
    name: "Basique",
    model: "opus",
    effort: "medium",
    implementerModel: "opus",
    implementerEffort: "low",
    implementer: "claude",
  },
  {
    name: "Debug -",
    model: "opus",
    effort: "low",
    implementerModel: "opus",
    implementerEffort: "low",
    implementer: "claude",
  },
  {
    name: "Debug +",
    model: "opus",
    effort: "max",
    implementerModel: "opus",
    implementerEffort: "low",
    implementer: "claude",
  },
  {
    name: "Délégation",
    model: "opus",
    effort: "medium",
    implementerModel: "opus",
    implementerEffort: "low",
    implementer: "composer",
  },
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

/** The PR cleaner runs Opus at low effort: triaging reviewer feedback is light work that doesn't warrant a heavier reasoning budget. */
export const CLEANER_MODEL: AgentModel = "opus";
export const CLEANER_EFFORT: AgentEffort = "low";

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

/** WebSocket channels. */
export const WS_PATH_CLIENT = "/ws";
export const WS_PATH_WORKER = "/workers";
/** Interactive PTY stream for an agent's tmux pane (output + bidirectional input). */
export const WS_PATH_TERMINAL = "/ws/terminal";

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
