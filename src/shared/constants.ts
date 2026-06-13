export const COLUMNS = [
  "todo",
  "implementing",
  "prd",
  "done",
  "merged",
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
  failed: "Échec",
  abandoned: "Abandonnés",
};

export const COLUMN_ORDER: Column[] = [
  "todo",
  "implementing",
  "prd",
  "done",
  "merged",
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

/** Implementability triage ("Analyser"): read-only, fast, user-initiated. */
export const TRIAGE_TIMEOUT_MS = 5 * 60 * 1000;
/** Max chars of raw CLI output stored as the report when triage fails to parse. */
export const TRIAGE_RAW_REPORT_MAX = 4000;

/** WebSocket channels. */
export const WS_PATH_CLIENT = "/ws";
export const WS_PATH_WORKER = "/workers";
