import {
  AGENT_EFFORTS,
  AGENT_EFFORT_LABELS,
  AGENT_MODELS,
  AGENT_MODEL_LABELS,
  CODEX_EFFORT_LABELS,
  CODEX_MODELS,
  CODEX_MODEL_EFFORTS,
  CODEX_MODEL_LABELS,
  FEASIBILITY_ENGINES,
  FEASIBILITY_ENGINE_LABELS,
  IMPLEMENTERS,
  IMPLEMENTER_LABELS,
  ORCHESTRATORS,
  ORCHESTRATOR_LABELS,
  STAGE_LABELS,
  type AgentEffort,
  type AgentModel,
  type CodexEffort,
  type CodexModel,
  type FeasibilityEngine,
  type Implementer,
  type Orchestrator,
  type Stage,
} from "@shared/constants";
import type { Ticket, TriageVerdict } from "@shared/schemas";
import { isCodexFastServiceTier, type CodexRuntimeStatus } from "@shared/codexCapabilities";

import type { TabOption } from "@/components/ui/tabs";

type BadgeVariant = "default" | "secondary" | "destructive" | "outline" | "warning" | "success" | "info";

/** Ready-made segmented-control options for the agent model picker. */
export const AGENT_MODEL_OPTIONS: TabOption<AgentModel>[] = AGENT_MODELS.map((m) => ({
  value: m,
  label: AGENT_MODEL_LABELS[m],
}));

/** Engine backing the feasibility analysis when the ticket carries no explicit choice. */
export const DEFAULT_FEASIBILITY_ENGINE: FeasibilityEngine = "sonnet";

/** Feasibility engines annotated with availability: Luna runs on Codex, so it needs a ready runtime. */
export function feasibilityEngineTabOptions(runtime: CodexRuntimeStatus): TabOption<FeasibilityEngine>[] {
  const codexReady = runtime.status === "ready";
  return FEASIBILITY_ENGINES.map((engine) => {
    const label = FEASIBILITY_ENGINE_LABELS[engine];
    const enabled = engine !== "luna" || codexReady;
    return {
      value: engine,
      label: enabled ? label : `${label} — indisponible`,
      disabled: !enabled,
    };
  });
}

/** Ready-made segmented-control options for the agent reasoning-effort picker. */
export const AGENT_EFFORT_OPTIONS: TabOption<AgentEffort>[] = AGENT_EFFORTS.map((e) => ({
  value: e,
  label: AGENT_EFFORT_LABELS[e],
}));

/** Ready-made segmented-control options for the Codex model picker. */
export const CODEX_MODEL_OPTIONS: TabOption<CodexModel>[] = CODEX_MODELS.map((m) => ({
  value: m,
  label: CODEX_MODEL_LABELS[m],
}));

/** Product models annotated with the current account/runtime availability. */
export function codexModelTabOptions(runtime: CodexRuntimeStatus): TabOption<CodexModel>[] {
  const available = new Set(runtime.models.map(({ model }) => model));
  return CODEX_MODELS.map((model) => {
    const enabled = runtime.status === "ready" && available.has(model);
    return {
      value: model,
      label: enabled ? CODEX_MODEL_LABELS[model] : `${CODEX_MODEL_LABELS[model]} — indisponible`,
      disabled: !enabled,
    };
  });
}

/** Codex reasoning-effort options for a given model: only the efforts that model accepts. */
export function codexEffortTabOptions(
  model: CodexModel,
  runtime?: CodexRuntimeStatus,
): TabOption<CodexEffort>[] {
  const runtimeModel = runtime?.models.find((entry) => entry.model === model);
  const available = new Set(runtimeModel?.efforts ?? []);
  return CODEX_MODEL_EFFORTS[model].map((effort) => {
    const disabled = runtime !== undefined && (runtime.status !== "ready" || !available.has(effort));
    return { value: effort, label: CODEX_EFFORT_LABELS[effort], disabled };
  });
}

/** Whether the authenticated runtime advertises the paid fast service tier for this model. */
export function isCodexFastAvailable(runtime: CodexRuntimeStatus, model: CodexModel): boolean {
  if (runtime.status !== "ready") return false;
  return runtime.models
    .find((entry) => entry.model === model)
    ?.serviceTiers.some((tier) => isCodexFastServiceTier(tier.id)) ?? false;
}

const USD_FORMATTER = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});

export function formatUsd(value: number): string {
  return USD_FORMATTER.format(value);
}

/** Orchestrator picker options; the Codex orchestrator is disabled (with a hint) when its CLI is absent. */
export function orchestratorTabOptions(codexAvailable: boolean): TabOption<Orchestrator>[] {
  return ORCHESTRATORS.map((o) => {
    if (o === "codex") {
      return {
        value: o,
        label: codexAvailable ? ORCHESTRATOR_LABELS[o] : `${ORCHESTRATOR_LABELS[o]} — Codex non détecté`,
        disabled: !codexAvailable,
      };
    }
    return { value: o, label: ORCHESTRATOR_LABELS[o] };
  });
}

/**
 * Implementer picker options for a given orchestrator. A Codex orchestrator pilots only itself, so
 * every non-codex implementer is disabled; under a Claude orchestrator, composer needs Cursor and
 * the codex implementer (backend-delegated child session) needs the Codex CLI.
 */
export function implementerTabOptions(
  orchestrator: Orchestrator,
  composerAvailable: boolean,
  codexAvailable: boolean,
): TabOption<Implementer>[] {
  return IMPLEMENTERS.map((i) => {
    if (orchestrator === "codex") {
      return { value: i, label: IMPLEMENTER_LABELS[i], disabled: i !== "codex" };
    }
    if (i === "composer") {
      return {
        value: i,
        label: composerAvailable ? IMPLEMENTER_LABELS[i] : `${IMPLEMENTER_LABELS[i]} — Cursor non détecté`,
        disabled: !composerAvailable,
      };
    }
    if (i === "codex") {
      return {
        value: i,
        label: codexAvailable ? `${IMPLEMENTER_LABELS[i]} — via délégation` : `${IMPLEMENTER_LABELS[i]} — Codex non détecté`,
        disabled: !codexAvailable,
      };
    }
    return { value: i, label: IMPLEMENTER_LABELS[i] };
  });
}

const TRIAGE_VERDICT_VARIANTS: Record<TriageVerdict, BadgeVariant> = {
  implementable: "success",
  needs_info: "warning",
  needs_rework: "destructive",
};

const TRIAGE_VERDICT_DOTS: Record<TriageVerdict, { glyph: string; className: string; title: string }> = {
  implementable: { glyph: "✓", className: "text-success", title: "Implémentable" },
  needs_info: { glyph: "?", className: "text-warning", title: "Questions à répondre" },
  needs_rework: { glyph: "✗", className: "text-destructive", title: "À retravailler" },
};

export function triageVerdictVariant(verdict: TriageVerdict): BadgeVariant {
  return TRIAGE_VERDICT_VARIANTS[verdict];
}

export function triageVerdictDot(verdict: TriageVerdict): { glyph: string; className: string; title: string } {
  return TRIAGE_VERDICT_DOTS[verdict];
}

const STAGE_VARIANTS: Record<Stage, BadgeVariant> = {
  queued: "secondary",
  planning: "info",
  awaiting_answers: "warning",
  implementing: "info",
  reviewing: "info",
  fixing: "warning",
  testing: "info",
  opening_pr: "info",
  done: "success",
  failed: "destructive",
  interrupted: "destructive",
  stalled: "destructive",
};

const ANIMATED_STAGES: Stage[] = [
  "planning",
  "implementing",
  "reviewing",
  "fixing",
  "testing",
  "opening_pr",
];

export function stageLabel(stage: Stage): string {
  return STAGE_LABELS[stage];
}

export function stageVariant(stage: Stage): BadgeVariant {
  return STAGE_VARIANTS[stage];
}

export function isStageAnimated(stage: Stage): boolean {
  return ANIMATED_STAGES.includes(stage);
}

const PROGRESS_STAGES: Stage[] = [
  "queued",
  "planning",
  "implementing",
  "reviewing",
  "fixing",
  "testing",
  "opening_pr",
  "done",
];

export type ProgressColor = "info" | "success" | "destructive" | "warning";

export type StageProgress = { percent: number; color: ProgressColor };

export function stageProgress(stage: Stage): StageProgress {
  if (stage === "failed" || stage === "interrupted" || stage === "stalled") {
    return { percent: 0, color: "destructive" };
  }
  if (stage === "awaiting_answers") {
    const planningIdx = PROGRESS_STAGES.indexOf("planning");
    return { percent: (planningIdx / (PROGRESS_STAGES.length - 1)) * 100, color: "warning" };
  }
  const idx = PROGRESS_STAGES.indexOf(stage);
  const percent = idx < 0 ? 0 : (idx / (PROGRESS_STAGES.length - 1)) * 100;
  const color: ProgressColor = stage === "done" ? "success" : "info";
  return { percent, color };
}

const TOKEN_FORMATTER = new Intl.NumberFormat("fr-FR");

/** Thousands-grouped token count (e.g. "1 234 567"). Shared by the ticket detail and stats charts. */
export function formatTokens(n: number): string {
  return TOKEN_FORMATTER.format(n);
}

const DATETIME_FORMAT: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeStyle: "short" };

export function formatDateTime(ms: number): string {
  return new Date(ms).toLocaleString("fr-FR", DATETIME_FORMAT);
}

const SECOND_MS = 1_000;
const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const LABEL_INSTANT = "à l'instant";

/** Returns a short human-readable duration since `startMs` (e.g. "2h", "3j", "à l'instant"). */
export function formatRelativeDuration(startMs: number, nowMs: number): string {
  const delta = nowMs - startMs;
  if (delta <= 0) return LABEL_INSTANT;
  if (delta < MINUTE_MS) return LABEL_INSTANT;
  if (delta < HOUR_MS) return `${Math.floor(delta / MINUTE_MS)}m`;
  if (delta < DAY_MS) return `${Math.floor(delta / HOUR_MS)}h`;
  return `${Math.floor(delta / DAY_MS)}j`;
}

/**
 * Epoch ms the card's elapsed timer should count from. In "À implémenter" it's when the
 * ticket entered that column (when work started); elsewhere it falls back to creation.
 */
export function ticketElapsedStart(ticket: Pick<Ticket, "column" | "implementingStartedAt" | "createdAt">): number {
  if (ticket.column === "implementing" && ticket.implementingStartedAt !== null) {
    return ticket.implementingStartedAt;
  }
  return ticket.createdAt;
}

/** Compact two-unit duration for a finished span (e.g. "45s", "12m", "2h 15m", "3j 4h"). */
export function formatDuration(ms: number): string {
  if (ms < MINUTE_MS) return `${Math.floor(ms / SECOND_MS)}s`;
  if (ms < HOUR_MS) return `${Math.floor(ms / MINUTE_MS)}m`;
  if (ms < DAY_MS) {
    const hours = Math.floor(ms / HOUR_MS);
    const minutes = Math.floor((ms % HOUR_MS) / MINUTE_MS);
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  const days = Math.floor(ms / DAY_MS);
  const hours = Math.floor((ms % DAY_MS) / HOUR_MS);
  return hours > 0 ? `${days}j ${hours}h` : `${days}j`;
}

/**
 * Wall-clock work duration in ms: from when the agent actually started (entering the
 * `implementing` stage, `implementationStartedAt`) to `finishedAt`. Falls back to
 * `implementingStartedAt` (column entry, queue-inclusive) for tickets created before the precise
 * stamp existed. Null when either bound is missing or the span is non-positive. Shared by the card
 * badge and the stats charts so both stay in sync.
 */
export function effectiveWorkDurationMs(span: {
  implementationStartedAt: number | null;
  implementingStartedAt: number | null;
  finishedAt: number | null;
}): number | null {
  const start = span.implementationStartedAt ?? span.implementingStartedAt;
  if (start === null || span.finishedAt === null) return null;
  const duration = span.finishedAt - start;
  return duration > 0 ? duration : null;
}

/** Card-badge duration: the agent's effective work time on a ticket. */
export function ticketImplementationDuration(
  ticket: Pick<Ticket, "implementationStartedAt" | "implementingStartedAt" | "finishedAt">,
): number | null {
  return effectiveWorkDurationMs(ticket);
}

const PR_URL_NUMBER_REGEX = /\/pull\/(\d+)/;

/** Extracts the PR number from a GitHub PR URL (e.g. ".../pull/123" → 123), or null. */
export function prNumberFromUrl(prUrl: string | null): number | null {
  if (prUrl === null) return null;
  const match = PR_URL_NUMBER_REGEX.exec(prUrl);
  if (match === null || match[1] === undefined) return null;
  return Number.parseInt(match[1], 10);
}

/** PR number to display on a card: stored `prNumber`, else parsed from `prUrl`. */
export function ticketPrNumber(ticket: Pick<Ticket, "prNumber" | "prUrl">): number | null {
  return ticket.prNumber ?? prNumberFromUrl(ticket.prUrl);
}

/** Columns a ticket can't serve as a dependency: only todo/implementing/prd are eligible. */
const NON_DEPENDABLE_COLUMNS: Ticket["column"][] = ["to_review", "done", "merged", "reviewed", "answered", "failed", "abandoned"];

/**
 * Tickets eligible to be picked as a dependency (PR-stack parent): same project, not the ticket
 * itself, and able to reach a PR. Shared by the creation dialog and the ticket detail editor.
 */
export function dependencyCandidates(
  tickets: Ticket[],
  project: string,
  selfId: string | null,
  currentDependsOn: string | null = null,
): Ticket[] {
  return tickets.filter(
    (t) =>
      t.project === project &&
      t.id !== selfId &&
      // The current dependsOn parent stays selectable even from a normally non-dependable column
      // (e.g. a split mother in "done"), so the select renders the real current value.
      (t.id === currentDependsOn || !NON_DEPENDABLE_COLUMNS.includes(t.column)),
  );
}

/** Verb describing how a ticket ended, for the finished-at line. */
export function finishedKindLabel(ticket: Pick<Ticket, "column" | "stage">): string {
  if (ticket.column === "merged") return "PR mergée";
  if (ticket.column === "reviewed") return "PR reviewed";
  if (ticket.column === "answered") return "Répondu";
  if (ticket.column === "done") return "Terminé";
  if (ticket.column === "abandoned") return "Abandonné";
  if (ticket.stage === "failed") return "Échec";
  if (ticket.stage === "stalled") return "Bloqué";
  if (ticket.stage === "interrupted") return "Interrompu";
  return "Terminé";
}
