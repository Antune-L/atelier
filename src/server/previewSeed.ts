import type { Column, Orchestrator, Stage } from "../shared/constants.ts";
import type { ExecutionUsageByModel, TriageVerdict } from "../shared/schemas.ts";

import type { NewTicket, Store } from "./db/store.ts";
import { createLogger } from "./logger.ts";

const log = createLogger("preview-seed");

export const PREVIEW_SEED_ENV = "KANBAN_PREVIEW_SEED";
const PREVIEW_SEED_ENABLED = "1";
const REAL_MODE = "0";
const PREVIEW_SEED_META_KEY = "preview_seed_version";
const PREVIEW_SEED_VERSION = "2";
const SEED_TITLE_PREFIX = "[seed]";
const SEED_PR_BASE_URL = "https://github.com/example/preview-demo/pull/";
const ORCHESTRATOR_ROLE = "orchestrator";
const CLAUDE_USAGE_MODEL = "claude-sonnet-5-5";
const CODEX_USAGE_MODEL = "gpt-6.1-sol";
const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const QUEUE_DELAY_MS = 5 * MINUTE_MS;
const MERGE_DELAY_MS = 2 * HOUR_MS;
const TOKENS_PER_MINUTE = 4_000;
const OUTPUT_TOKEN_RATIO = 0.1;
const CACHE_READ_TOKEN_RATIO = 3;
const COST_PER_MILLION_TOKENS_USD = 3;
const TOKENS_PER_MILLION = 1_000_000;

interface SeedExecution {
  startOffsetMs: number;
  durationMs: number;
  status: "completed" | "failed";
}

interface SeedTicket {
  title: string;
  description: string;
  column: Column;
  stage: Stage | null;
  orchestrator: Orchestrator;
  daysAgo: number;
  prNumber: number | null;
  executions: SeedExecution[];
  legacyDurationMs?: number;
  mergedAfterFinish?: boolean;
  error?: string;
  /** Finished feasibility study stored as the ticket's triage report. */
  feasibility?: SeedFeasibility;
}

interface SeedFeasibility {
  verdict: TriageVerdict;
  summary: string;
  reasons: string[];
  questions: { question: string; recommendedAnswer: string }[];
  files: string[];
}

const SEED_TICKETS: SeedTicket[] = [
  {
    title: "Ticket mergé (Claude)",
    description: "Ticket livré et mergé, avec une exécution d'agent terminée.",
    column: "merged", stage: "done", orchestrator: "claude", daysAgo: 2, prNumber: 101, mergedAfterFinish: true,
    executions: [{ startOffsetMs: 0, durationMs: 2 * HOUR_MS + 15 * MINUTE_MS, status: "completed" }],
  },
  {
    title: "Ticket mergé (Codex)",
    description: "Ticket livré et mergé par une session Codex.",
    column: "merged", stage: "done", orchestrator: "codex", daysAgo: 9, prNumber: 102, mergedAfterFinish: true,
    executions: [{ startOffsetMs: 0, durationMs: 45 * MINUTE_MS, status: "completed" }],
  },
  {
    title: "Ticket mergé ancien",
    description: "Ticket mergé il y a plusieurs semaines, pour les graphiques hebdomadaires.",
    column: "merged", stage: "done", orchestrator: "claude", daysAgo: 16, prNumber: 103, mergedAfterFinish: true,
    executions: [{ startOffsetMs: 0, durationMs: 5 * HOUR_MS, status: "completed" }],
  },
  {
    title: "Ticket relancé avec PR ouverte",
    description: "Première exécution en échec, relance réussie, PR ouverte non mergée.",
    column: "done", stage: "done", orchestrator: "claude", daysAgo: 3, prNumber: 104,
    executions: [
      { startOffsetMs: 0, durationMs: 40 * MINUTE_MS, status: "failed" },
      { startOffsetMs: DAY_MS, durationMs: HOUR_MS + 10 * MINUTE_MS, status: "completed" },
    ],
  },
  {
    title: "Ticket hérité sans exécution",
    description: "Ticket mergé créé avant le suivi des exécutions : seul l'horodatage de colonne existe.",
    column: "merged", stage: "done", orchestrator: "claude", daysAgo: 20, prNumber: 105, mergedAfterFinish: true,
    executions: [], legacyDurationMs: 3 * HOUR_MS,
  },
  {
    title: "Ticket en échec",
    description: "Ticket dont l'agent a échoué.",
    column: "failed", stage: "failed", orchestrator: "codex", daysAgo: 5, prNumber: null, error: "Les tests du projet échouent après implémentation.",
    executions: [{ startOffsetMs: 0, durationMs: 25 * MINUTE_MS, status: "failed" }],
  },
  {
    title: "Ticket à faire",
    description: "Ticket en attente dans la colonne TODO.",
    column: "todo", stage: null, orchestrator: "claude", daysAgo: 1, prNumber: null,
    executions: [],
  },
  {
    title: "Ticket avec questions de faisabilité",
    description: "Ticket TODO dont l'étude de faisabilité est terminée et pose plusieurs questions avec réponses recommandées.",
    column: "todo", stage: null, orchestrator: "claude", daysAgo: 1, prNumber: null,
    executions: [],
    feasibility: {
      verdict: "implementable",
      summary: "La fonctionnalité est réalisable, mais quelques choix produit restent à confirmer avant l'implémentation.",
      reasons: [
        "Le composant concerné existe déjà et peut être étendu sans refonte.",
        "Plusieurs comportements d'interface ne sont pas précisés dans la description.",
      ],
      questions: [
        { question: "Le bouton doit-il rester visible pendant le défilement des questions ?", recommendedAnswer: "Oui, le fixer en bas du panneau pour qu'il reste accessible." },
        { question: "Faut-il demander une confirmation avant d'intégrer toutes les réponses ?", recommendedAnswer: "Non, l'action reste réversible en modifiant la description." },
        { question: "Les questions sans réponse doivent-elles bloquer l'intégration groupée ?", recommendedAnswer: "Non, seules les réponses remplies sont intégrées." },
        { question: "Doit-on afficher le nombre de réponses prises en compte ?", recommendedAnswer: "Oui, directement dans le libellé du bouton." },
        { question: "Les réponses recommandées doivent-elles pré-remplir les champs ?", recommendedAnswer: "Non, elles restent affichées comme suggestions à accepter." },
        { question: "Faut-il relancer l'étude après l'intégration des réponses ?", recommendedAnswer: "Oui, pour vérifier que les réponses lèvent les ambiguïtés." },
      ],
      files: ["src/web/src/components/ticket-detail/TriageSection.tsx"],
    },
  },
];

function newSeedTicket(project: string, seed: SeedTicket): NewTicket {
  const claude = seed.orchestrator === "claude";
  return {
    title: `${SEED_TITLE_PREFIX} ${seed.title}`, description: seed.description, externalUrl: null, project,
    prdEnabled: false, prDraft: false, autoMerge: false, addScreenshots: false, verifyFeature: false, argusMultiLoop: false,
    stealth: false, directPush: false, baseBranch: null, dependsOn: null,
    model: claude ? "sonnet" : null, effort: claude ? "medium" : null, implementerModel: null, implementerEffort: null,
    implementer: seed.orchestrator, orchestrator: seed.orchestrator,
    codexModel: claude ? null : "gpt-6.1-sol", codexEffort: claude ? null : "medium",
  };
}

function seedUsage(orchestrator: Orchestrator, durationMs: number): ExecutionUsageByModel {
  const inputTokens = Math.round((durationMs / MINUTE_MS) * TOKENS_PER_MINUTE);
  const outputTokens = Math.round(inputTokens * OUTPUT_TOKEN_RATIO);
  const cacheReadTokens = inputTokens * CACHE_READ_TOKEN_RATIO;
  const costUsd = ((inputTokens + outputTokens) / TOKENS_PER_MILLION) * COST_PER_MILLION_TOKENS_USD;
  const model = orchestrator === "claude" ? CLAUDE_USAGE_MODEL : CODEX_USAGE_MODEL;
  return { [model]: { inputTokens, outputTokens, cacheReadTokens, cacheCreationTokens: 0, costUsd } };
}

function insertSeedTicket(store: Store, project: string, seed: SeedTicket, now: number): void {
  const ticket = store.createTicket(newSeedTicket(project, seed));
  const createdAt = now - seed.daysAgo * DAY_MS;
  const startedAt = seed.column === "todo" ? null : createdAt + QUEUE_DELAY_MS;
  let finishedAt: number | null = null;
  for (const execution of seed.executions) {
    if (startedAt === null) break;
    const executionStart = startedAt + execution.startOffsetMs;
    const executionEnd = executionStart + execution.durationMs;
    const id = crypto.randomUUID();
    store.startExecution({
      id, ownerType: "ticket", ownerId: ticket.id, generationId: id, sessionId: null, role: ORCHESTRATOR_ROLE, orchestrator: seed.orchestrator,
      effectiveModel: seed.orchestrator === "claude" ? CLAUDE_USAGE_MODEL : CODEX_USAGE_MODEL, effectiveEffort: "medium", startedAt: executionStart,
    });
    store.finalizeExecution({ generationId: id, status: execution.status, usageByModel: seedUsage(seed.orchestrator, execution.durationMs), finishedAt: executionEnd });
    finishedAt = Math.max(finishedAt ?? executionEnd, executionEnd);
  }
  if (startedAt !== null && seed.legacyDurationMs !== undefined) finishedAt = startedAt + seed.legacyDurationMs;
  if (finishedAt !== null && seed.mergedAfterFinish) finishedAt += MERGE_DELAY_MS;
  store.updateTicket(ticket.id, {
    column: seed.column, stage: seed.stage, slotId: null,
    branch: seed.prNumber === null ? null : `feat/seed-${seed.prNumber}`,
    prUrl: seed.prNumber === null ? null : `${SEED_PR_BASE_URL}${seed.prNumber}`,
    error: seed.error ?? null,
  });
  if (seed.feasibility !== undefined) {
    store.updateTicket(ticket.id, { triageStatus: "done", triageVerdict: seed.feasibility.verdict, triageReport: JSON.stringify(seed.feasibility) });
  }
  store.setTicketTimeline(ticket.id, {
    createdAt, updatedAt: finishedAt ?? createdAt, implementingStartedAt: startedAt,
    implementationStartedAt: seed.legacyDurationMs === undefined ? startedAt : null, finishedAt,
  });
}

export function seedPreviewDemoData(store: Store): void {
  if (process.env[PREVIEW_SEED_ENV] !== PREVIEW_SEED_ENABLED) return;
  if (process.env.KANBAN_DRY_RUN === REAL_MODE) throw new Error(`${PREVIEW_SEED_ENV} n'est autorisé qu'en mode dry-run.`);
  if (store.getMeta(PREVIEW_SEED_META_KEY) === PREVIEW_SEED_VERSION) return;
  const project = store.listProjectKeys()[0];
  if (project === undefined) throw new Error(`${PREVIEW_SEED_ENV} exige au moins un projet configuré.`);
  const now = Date.now();
  store.transaction(() => {
    // Earlier seed versions already inserted some tickets: only add the missing ones.
    const existingTitles = new Set(store.listTickets(true).filter((ticket) => ticket.project === project).map((ticket) => ticket.title));
    for (const seed of SEED_TICKETS) {
      if (!existingTitles.has(`${SEED_TITLE_PREFIX} ${seed.title}`)) insertSeedTicket(store, project, seed, now);
    }
    store.setMeta(PREVIEW_SEED_META_KEY, PREVIEW_SEED_VERSION);
  });
  log.info("données de démonstration de preview insérées", { project, tickets: SEED_TICKETS.length });
}
