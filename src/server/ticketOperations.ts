import { z } from "zod";

import { ACTIVE_STAGES, isAllowedAgentPair } from "../shared/constants.ts";
import type { Column } from "../shared/constants.ts";
import {
  columnSchema,
  deriveTitleFromDescription,
  externalUrlSchema,
  ticketBatchOptionsSchema,
  updateTicketSchema,
} from "../shared/schemas.ts";
import type { ProjectInfo, Ticket } from "../shared/schemas.ts";
import type { SlotManager } from "./agents/slotManager.ts";
import { getProject, isProjectKey, listProjectKeys, MODELS } from "./config.ts";
import { TicketCreationRequestConflictError } from "./db/store.ts";
import type { NewTicket, Store, TicketPatch } from "./db/store.ts";
import type { ClientHub } from "./hub.ts";
import type { TicketLifecycle } from "./lifecycle.ts";
import { createLogger } from "./logger.ts";

const DEFAULT_TICKET_LIST_LIMIT = 50;
const MAX_TICKET_LIST_LIMIT = 100;
const log = createLogger("ticket-operations");

export const createTodoTicketInputSchema = ticketBatchOptionsSchema
  .partial()
  .extend({
    project: z.string().min(1).describe("Clé d'un projet retourné par list_projects."),
    title: z.string().optional().describe("Titre optionnel, déduit de la description lorsqu'il est vide."),
    description: z.string().optional().describe("Description Markdown de la carte."),
    externalUrl: externalUrlSchema.optional().describe("URL HTTP(S) d'une carte externe, ou null."),
    prdEnabled: ticketBatchOptionsSchema.shape.prdEnabled.removeDefault().optional().describe("Préparer et faire valider un PRD avant l'implémentation."),
    prDraft: ticketBatchOptionsSchema.shape.prDraft.removeDefault().optional().describe("Ouvrir la pull request en brouillon."),
    autoMerge: ticketBatchOptionsSchema.shape.autoMerge.removeDefault().optional().describe("Fusionner automatiquement la pull request après validation."),
    stealth: ticketBatchOptionsSchema.shape.stealth.removeDefault().optional().describe("Implémenter sans ouvrir de pull request."),
    directPush: ticketBatchOptionsSchema.shape.directPush.removeDefault().optional().describe("Pousser directement sur la branche de base, sans pull request; désactive stealth et autoMerge."),
    addScreenshots: ticketBatchOptionsSchema.shape.addScreenshots.removeDefault().optional().describe("Ajouter des captures d'écran à la pull request."),
    verifyFeature: ticketBatchOptionsSchema.shape.verifyFeature.removeDefault().optional().describe("Exécuter une vérification fonctionnelle E2E (end-to-end) dans un navigateur réel."),
    argusMultiLoop: ticketBatchOptionsSchema.shape.argusMultiLoop.removeDefault().optional().describe("Répéter la revue Argus jusqu'à obtenir deux passes consécutives sans finding."),
    baseBranch: ticketBatchOptionsSchema.shape.baseBranch.removeDefault().optional().describe("Branche de départ et cible de pull request; null utilise celle du projet."),
    dependsOn: z.string().nullable().optional().describe("Identifiant d'une carte parente du même projet pour une pull request empilée."),
    model: ticketBatchOptionsSchema.shape.model.removeDefault().optional().describe("Modèle Claude de l'orchestrateur; null utilise le réglage serveur."),
    effort: ticketBatchOptionsSchema.shape.effort.removeDefault().optional().describe("Effort Claude de l'orchestrateur; null utilise le réglage serveur."),
    implementerModel: ticketBatchOptionsSchema.shape.implementerModel.removeDefault().optional().describe("Modèle Claude délégué à l'implémentation; null utilise le réglage serveur."),
    implementerEffort: ticketBatchOptionsSchema.shape.implementerEffort.removeDefault().optional().describe("Effort Claude délégué à l'implémentation; null utilise le réglage serveur."),
    orchestrator: ticketBatchOptionsSchema.shape.orchestrator.removeDefault().optional().describe("Fournisseur qui pilote tout le ticket."),
    implementer: ticketBatchOptionsSchema.shape.implementer.removeDefault().optional().describe("Agent qui écrit le code d'implémentation."),
    codexModel: ticketBatchOptionsSchema.shape.codexModel.removeDefault().optional().describe("Modèle Codex de l'orchestrateur; null utilise le réglage serveur."),
    codexEffort: ticketBatchOptionsSchema.shape.codexEffort.removeDefault().optional().describe("Effort Codex de l'orchestrateur; null utilise le réglage serveur."),
    codexFast: ticketBatchOptionsSchema.shape.codexFast.removeDefault().optional().describe("Activer le mode rapide de l'orchestrateur Codex."),
    codexImplementerModel: ticketBatchOptionsSchema.shape.codexImplementerModel.removeDefault().optional().describe("Modèle du sous-agent Codex d'implémentation; null utilise le réglage serveur."),
    codexImplementerEffort: ticketBatchOptionsSchema.shape.codexImplementerEffort.removeDefault().optional().describe("Effort du sous-agent Codex d'implémentation; null utilise le réglage serveur."),
    codexImplementerFast: ticketBatchOptionsSchema.shape.codexImplementerFast.removeDefault().optional().describe("Mode rapide du sous-agent Codex; null hérite de l'orchestrateur."),
    feasibilityEngine: ticketBatchOptionsSchema.shape.feasibilityEngine.removeDefault().optional().describe("Moteur utilisé pour l'analyse de faisabilité; null suit l'orchestrateur."),
    requestId: z.string().trim().min(1).describe("Identifiant idempotent persistant choisi par le client."),
  })
  .strict()
  .refine(
    (input) => (input.title ?? "").trim().length > 0 || (input.description ?? "").trim().length > 0,
    { message: "titre ou description requis", path: ["title"] },
  );

export type TicketOperationErrorCode = "INVALID_INPUT" | "NOT_FOUND" | "CONFLICT";

export class TicketOperationError extends Error {
  constructor(
    readonly code: TicketOperationErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "TicketOperationError";
  }
}

export interface TicketOperationsDeps {
  store: Store;
  hub: ClientHub;
  lifecycle: TicketLifecycle;
  slots: SlotManager;
  feasibility: FeasibilityStarter;
}

interface FeasibilityStarter {
  start(ticketIds: string[], projectKey: string): Promise<void>;
}

export interface ListTicketsInput {
  project?: string;
  column?: Column;
  limit?: number;
  offset?: number;
}

export interface CompactTicket {
  id: string;
  title: string;
  description: string;
  externalUrl: string | null;
  project: string;
  kind: Ticket["kind"];
  column: Column;
  stage: Ticket["stage"];
  error: string | null;
  dependsOn: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface TicketPage {
  tickets: CompactTicket[];
  total: number;
  nextOffset: number | null;
}

export type CreateTodoTicketInput = z.input<typeof createTodoTicketInputSchema>;

export interface CreateTodoTicketResult {
  created: boolean;
  ticket: CompactTicket;
}

export interface StartTicketResult {
  status: "queued" | "already_started";
  ticket: CompactTicket;
}

export type AnalyzeTicketRejectionReason = "not_found" | "busy";

export interface AnalyzeTicketsResult {
  started: number;
  startedIds: string[];
  rejected: Array<{ id: string; reason: AnalyzeTicketRejectionReason }>;
}

export interface UpdateTicketOptions {
  requireTodo?: boolean;
}

function compactTicket(ticket: Ticket): CompactTicket {
  return {
    id: ticket.id,
    title: ticket.title,
    description: ticket.description,
    externalUrl: ticket.externalUrl,
    project: ticket.project,
    kind: ticket.kind,
    column: ticket.column,
    stage: ticket.stage,
    error: ticket.error,
    dependsOn: ticket.dependsOn,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
  };
}

function isBlocked(ticket: Ticket, store: Store): boolean {
  if (ticket.dependsOn === null) return false;
  const parent = store.getTicket(ticket.dependsOn);
  if (!parent || parent.branch === null) return true;
  const splitMother = parent.branch.startsWith("split/") && parent.prUrl === null;
  return parent.prUrl === null && !splitMother;
}

function isActive(ticket: Ticket): boolean {
  if (ticket.column === "implementing" || ticket.column === "prd" || ticket.column === "to_review") return true;
  if (ticket.stage === "awaiting_answers") return true;
  return ticket.stage !== null && ACTIVE_STAGES.includes(ticket.stage);
}

function isProcessing(stage: Ticket["stage"]): boolean {
  if (stage === null) return false;
  if (stage === "awaiting_answers") return true;
  return ACTIVE_STAGES.includes(stage);
}

function normalizeCreateInput(input: CreateTodoTicketInput) {
  const parsed = createTodoTicketInputSchema.safeParse(input);
  if (!parsed.success) throw new TicketOperationError("INVALID_INPUT", parsed.error.issues[0]?.message ?? "entrée invalide");
  const title = parsed.data.title ?? "";
  const description = parsed.data.description ?? "";
  let externalUrl: string | null = parsed.data.externalUrl ?? null;
  if (externalUrl === "") externalUrl = null;
  const {
    project,
    requestId,
    title: _parsedTitle,
    description: _parsedDescription,
    externalUrl: _parsedExternalUrl,
    ...options
  } = parsed.data;
  return { project, title, description, externalUrl, requestId, ...options };
}

export function ticketDependencyError(
  store: Store,
  ticketId: string | null,
  dependsOn: string,
  project: string,
): string | null {
  const parent = store.getTicket(dependsOn);
  if (!parent) return "ticket dont il dépend introuvable";
  if (parent.project !== project) return "la dépendance doit être dans le même projet";
  const seen = new Set<string>();
  let cursor: Ticket | null = parent;
  while (cursor) {
    if (cursor.id === ticketId) return "dépendance circulaire interdite";
    if (seen.has(cursor.id)) break;
    seen.add(cursor.id);
    cursor = cursor.dependsOn ? store.getTicket(cursor.dependsOn) : null;
  }
  return null;
}

export class TicketOperations {
  constructor(private readonly deps: TicketOperationsDeps) {}

  listProjects(): ProjectInfo[] {
    return listProjectKeys().map((key) => {
      const project = getProject(key);
      return {
        key,
        label: project.label,
        baseBranch: project.baseBranch,
        defaultAutoMerge: project.defaultAutoMerge,
        defaultAddScreenshots: project.defaultAddScreenshots,
        ...(project.color !== undefined ? { color: project.color } : {}),
      };
    });
  }

  listTickets(input: ListTicketsInput = {}): TicketPage {
    if (input.project !== undefined && !isProjectKey(input.project)) {
      throw new TicketOperationError("INVALID_INPUT", "projet inconnu");
    }
    if (input.column !== undefined && !columnSchema.safeParse(input.column).success) {
      throw new TicketOperationError("INVALID_INPUT", "colonne inconnue");
    }
    const limit = input.limit ?? DEFAULT_TICKET_LIST_LIMIT;
    const offset = input.offset ?? 0;
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_TICKET_LIST_LIMIT) {
      throw new TicketOperationError("INVALID_INPUT", `limit doit être compris entre 1 et ${MAX_TICKET_LIST_LIMIT}`);
    }
    if (!Number.isInteger(offset) || offset < 0) {
      throw new TicketOperationError("INVALID_INPUT", "offset doit être un entier positif ou nul");
    }
    const filtered = this.deps.store
      .listTickets(false)
      .filter((ticket) => input.project === undefined || ticket.project === input.project)
      .filter((ticket) => input.column === undefined || ticket.column === input.column);
    const tickets = filtered.slice(offset, offset + limit).map(compactTicket);
    const nextOffset = offset + tickets.length < filtered.length ? offset + tickets.length : null;
    return { tickets, total: filtered.length, nextOffset };
  }

  createTodoTicket(input: CreateTodoTicketInput): CreateTodoTicketResult {
    const normalized = normalizeCreateInput(input);
    if (!isProjectKey(normalized.project)) {
      throw new TicketOperationError("INVALID_INPUT", "projet inconnu");
    }
    const orchestrator = normalized.orchestrator ?? "claude";
    const implementer = normalized.implementer ?? "claude";
    if (!isAllowedAgentPair(orchestrator, implementer)) {
      throw new TicketOperationError(
        "INVALID_INPUT",
        "Combinaison orchestrateur/implémenteur non supportée : Codex orchestre uniquement Codex (la délégation croisée arrive plus tard).",
      );
    }
    if (normalized.dependsOn !== undefined && normalized.dependsOn !== null) {
      const error = ticketDependencyError(this.deps.store, null, normalized.dependsOn, normalized.project);
      if (error !== null) throw new TicketOperationError("INVALID_INPUT", error);
    }
    const project = getProject(normalized.project);
    const title = normalized.title.trim() || deriveTitleFromDescription(normalized.description);
    const payload = JSON.stringify(normalized);
    const directPush = normalized.directPush ?? false;
    const stealth = directPush ? false : (normalized.stealth ?? false);
    const autoMerge = stealth || directPush
      ? false
      : (normalized.autoMerge ?? project.defaultAutoMerge);
    const ticketInput: NewTicket = {
      title,
      description: normalized.description,
      externalUrl: normalized.externalUrl,
      project: normalized.project,
      prdEnabled: normalized.prdEnabled ?? false,
      prDraft: normalized.prDraft ?? true,
      autoMerge,
      addScreenshots: normalized.addScreenshots ?? (!autoMerge && project.defaultAddScreenshots),
      verifyFeature: normalized.verifyFeature ?? false,
      argusMultiLoop: normalized.argusMultiLoop ?? false,
      stealth,
      directPush,
      baseBranch: normalized.baseBranch ?? null,
      dependsOn: normalized.dependsOn ?? null,
      model: normalized.model ?? null,
      effort: normalized.effort ?? null,
      implementerModel: normalized.implementerModel ?? null,
      implementerEffort: normalized.implementerEffort ?? null,
      implementer,
      orchestrator,
      codexModel: normalized.codexModel === undefined ? MODELS.codexModel : normalized.codexModel,
      codexEffort: normalized.codexEffort === undefined ? MODELS.codexEffort : normalized.codexEffort,
      codexFast: normalized.codexFast ?? MODELS.codexFast,
      codexImplementerModel: normalized.codexImplementerModel ?? null,
      codexImplementerEffort: normalized.codexImplementerEffort ?? null,
      codexImplementerFast: normalized.codexImplementerFast ?? null,
      feasibilityEngine: normalized.feasibilityEngine ?? null,
    };
    try {
      const result = this.deps.store.createTicketIdempotent(normalized.requestId, payload, ticketInput);
      if (result.created) this.deps.hub.pushTicket(result.ticket);
      return { created: result.created, ticket: compactTicket(result.ticket) };
    } catch (error) {
      if (error instanceof TicketCreationRequestConflictError) {
        throw new TicketOperationError("CONFLICT", error.message);
      }
      throw error;
    }
  }

  analyzeTickets(ids: string[]): AnalyzeTicketsResult {
    const startedIds: string[] = [];
    const rejected: AnalyzeTicketsResult["rejected"] = [];
    const idsByProject = new Map<string, string[]>();

    for (const id of ids) {
      const ticket = this.deps.store.getTicket(id);
      if (!ticket) {
        rejected.push({ id, reason: "not_found" });
        continue;
      }
      if (ticket.triageStatus === "running" || isProcessing(ticket.stage)) {
        rejected.push({ id, reason: "busy" });
        continue;
      }
      startedIds.push(id);
      const group = idsByProject.get(ticket.project) ?? [];
      group.push(id);
      idsByProject.set(ticket.project, group);
    }

    for (const [project, projectIds] of idsByProject) {
      void this.deps.feasibility.start(projectIds, project).catch((error: unknown) => {
        log.error("démarrage de l'analyse en lot échoué", {
          error: error instanceof Error ? error.message : String(error),
        });
      });
    }

    return { started: startedIds.length, startedIds, rejected };
  }

  updateTicket(ticketId: string, input: unknown, options: UpdateTicketOptions = {}): Ticket {
    const ticket = this.deps.store.getTicket(ticketId);
    if (!ticket) throw new TicketOperationError("NOT_FOUND", "ticket introuvable");
    if (options.requireTodo && ticket.column !== "todo") {
      throw new TicketOperationError("CONFLICT", "seul un ticket TODO peut être modifié par MCP");
    }
    if (isProcessing(ticket.stage)) {
      throw new TicketOperationError("CONFLICT", "ticket verrouillé (en traitement)");
    }
    if (ticket.triageStatus === "running") {
      throw new TicketOperationError("CONFLICT", "analyse en cours : attends le verdict avant de modifier");
    }

    const parsed = updateTicketSchema.safeParse(input);
    if (!parsed.success) {
      throw new TicketOperationError("INVALID_INPUT", parsed.error.issues[0]?.message ?? "entrée invalide");
    }
    const project = parsed.data.project ?? ticket.project;
    if (parsed.data.project !== undefined && parsed.data.project !== ticket.project) {
      if (!isProjectKey(parsed.data.project)) {
        throw new TicketOperationError("INVALID_INPUT", "projet inconnu");
      }
      if (ticket.column !== "todo") {
        throw new TicketOperationError("CONFLICT", "le projet ne peut être changé que dans TODO");
      }
    }

    const effectiveDependsOn = parsed.data.dependsOn === undefined
      ? ticket.dependsOn
      : parsed.data.dependsOn;
    if (
      effectiveDependsOn !== null
      && (parsed.data.dependsOn !== undefined || project !== ticket.project)
    ) {
      const error = ticketDependencyError(this.deps.store, ticket.id, effectiveDependsOn, project);
      if (error !== null) throw new TicketOperationError("INVALID_INPUT", error);
    }

    if (parsed.data.orchestrator !== undefined || parsed.data.implementer !== undefined) {
      if (ticket.column !== "todo") {
        throw new TicketOperationError(
          "CONFLICT",
          "orchestrateur/implémenteur modifiables uniquement dans TODO",
        );
      }
      const orchestrator = parsed.data.orchestrator ?? ticket.orchestrator;
      const implementer = parsed.data.implementer ?? ticket.implementer;
      if (!isAllowedAgentPair(orchestrator, implementer)) {
        throw new TicketOperationError(
          "INVALID_INPUT",
          "Combinaison orchestrateur/implémenteur non supportée : Codex orchestre uniquement Codex (la délégation croisée arrive plus tard).",
        );
      }
    }

    const patch: TicketPatch = { ...parsed.data };
    const resultingDirectPush = parsed.data.directPush ?? ticket.directPush;
    if (resultingDirectPush) {
      patch.stealth = false;
      patch.autoMerge = false;
    } else if (parsed.data.stealth ?? ticket.stealth) {
      patch.autoMerge = false;
    }
    patch.directPush = resultingDirectPush;

    if (
      parsed.data.project !== undefined
      && parsed.data.project !== ticket.project
      && parsed.data.baseBranch === undefined
    ) {
      patch.baseBranch = null;
    }
    if (parsed.data.title !== undefined && parsed.data.title.trim() === "") {
      const derived = deriveTitleFromDescription(parsed.data.description ?? ticket.description);
      patch.title = derived || ticket.title;
    }

    const updated = this.deps.store.updateTicket(ticketId, patch);
    this.deps.hub.pushTicket(updated);
    return updated;
  }

  async startTicket(ticketId: string): Promise<StartTicketResult> {
    const ticket = this.deps.store.getTicket(ticketId);
    if (!ticket) throw new TicketOperationError("NOT_FOUND", "ticket introuvable");
    if (isActive(ticket)) return { status: "already_started", ticket: compactTicket(ticket) };
    if (ticket.column !== "todo") {
      throw new TicketOperationError("CONFLICT", "seul un ticket TODO peut être lancé");
    }
    if (ticket.triageStatus === "running") {
      throw new TicketOperationError("CONFLICT", "analyse en cours : attends le verdict avant de lancer l'implémentation");
    }
    if (isBlocked(ticket, this.deps.store)) {
      throw new TicketOperationError("CONFLICT", "en attente de la PR du ticket dont il dépend");
    }
    const queued = this.deps.lifecycle.enqueue(ticketId);
    void this.deps.slots.startTicket(ticketId).catch((error: unknown) => {
      log.error("démarrage du ticket échoué", {
        ticketId,
        error: error instanceof Error ? error.message : String(error),
      });
    });
    return { status: "queued", ticket: compactTicket(queued) };
  }
}

export function createTicketOperations(deps: TicketOperationsDeps): TicketOperations {
  return new TicketOperations(deps);
}
