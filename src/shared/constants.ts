export const COLUMNS = [
  "todo",
  "implementing",
  "prd",
  "done",
  "merged",
  "reviewed",
  "failed",
  "abandoned",
] as const;
export type Column = (typeof COLUMNS)[number];

export const COLUMN_LABELS: Record<Column, string> = {
  todo: "TODO",
  implementing: "À implémenter",
  prd: "PRD à implémenter",
  done: "Fini",
  merged: "PR mergée",
  reviewed: "PR reviewed",
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
  "failed",
  "abandoned",
];

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
  { name: "Basique", model: "opus", effort: "medium", implementerModel: "opus", implementerEffort: "low", implementer: "claude" },
  { name: "Debug -", model: "opus", effort: "low", implementerModel: "opus", implementerEffort: "low", implementer: "claude" },
  { name: "Debug +", model: "opus", effort: "max", implementerModel: "opus", implementerEffort: "low", implementer: "claude" },
  { name: "Délégation", model: "opus", effort: "medium", implementerModel: "opus", implementerEffort: "low", implementer: "composer" },
];

/** Sentinel "profile" shown when a ticket's knobs match no stored profile. */
export const CUSTOM_PROFILE_ID = "custom";
export const CUSTOM_PROFILE_LABEL = "Personnalisé";

/** What a ticket delivers: a feature implementation (default) or an autonomous PR review. */
export const KINDS = ["feature", "review"] as const;
export type Kind = (typeof KINDS)[number];

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
export const TERMINAL_STAGES: Stage[] = ["done", "failed", "interrupted", "stalled"];

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
/** Audit event logged on each auto-reclaim; backs the reclaim counter (never logged by manual retries). */
export const AUTO_RECLAIM_EVENT = "auto_reclaim";

/** Implementability triage ("Analyser"): read-only, fast, user-initiated. */
export const TRIAGE_TIMEOUT_MS = 5 * 60 * 1000;
/**
 * SLOT_ID a triage worker identifies with: a triage runs in NO slot. The coordinator uses it to
 * recognize a triage session and bar it from the slot-pipeline tools (it may only submit_triage).
 */
export const TRIAGE_SLOT_ID = -1;
/** Max chars of raw CLI output stored as the report when triage fails to parse. */
export const TRIAGE_RAW_REPORT_MAX = 4000;

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
