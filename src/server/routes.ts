import { Elysia } from "elysia";
import { z } from "zod";

import { ACTIVE_STAGES } from "../shared/constants.ts";
import type { Stage } from "../shared/constants.ts";
import { getErrorMessage } from "../shared/errors.ts";
import {
  analyzeTicketsSchema,
  createAskSchema,
  createCleanSchema,
  createCommentSchema,
  createProfileSchema,
  createReviewSchema,
  createTerminalBodySchema,
  createTicketSchema,
  deriveTitleFromDescription,
  importTicketsSchema,
  moveTicketSchema,
  startWorktreeSessionBodySchema,
  updateAppSettingsSchema,
  updateProfileSchema,
  updateTicketSchema,
  usageByModelSchema,
  validatePrdSchema,
} from "../shared/schemas.ts";
import type { OpenPr, StatRecord, Ticket, UpdateMode } from "../shared/schemas.ts";
import { costOfSessions, totalTokensOfSessions } from "../shared/pricing.ts";
import { MODELS, PROJECT_KEYS, getProject, isProjectKey } from "./config.ts";

import { buildReformulatePrompt } from "./agents/reformulate.ts";
import type { ReformulateOptions } from "./system/types.ts";
import type { AgentCoordinator } from "./agents/coordinator.ts";
import type { SlotManager } from "./agents/slotManager.ts";
import type { FeasibilityBatchManager } from "./agents/feasibilityManager.ts";
import type { TriageManager } from "./agents/triageManager.ts";
import type { Store, TicketPatch } from "./db/store.ts";
import type { ClientHub } from "./hub.ts";
import type { TicketLifecycle } from "./lifecycle.ts";
import { createLogger } from "./logger.ts";
import { saveUpload } from "./uploads.ts";
import type { UserTerminalManager } from "./userTerminalManager.ts";

const log = createLogger("triage");

interface PaneReader {
  capturePane(sessionName: string): Promise<string>;
  listOpenPrs(repoPath: string): Promise<OpenPr[]>;
  listBranches(repoPath: string): Promise<string[]>;
  checkPrMerged(repoPath: string, prUrl: string): Promise<{ merged: boolean; state: string }>;
  // Desktop self-update guards + build runner (dev desktop only).
  gitCurrentBranch(repoPath: string): Promise<string>;
  gitStatusClean(repoPath: string): Promise<boolean>;
  gitPullFastForward(repoPath: string, baseBranch: string): Promise<{ ok: boolean; reason: string }>;
  runProjectScript(slotPath: string, command: string, timeoutMs: number): Promise<{ ok: boolean; output: string }>;
  reformulate(opts: ReformulateOptions): Promise<string>;
}

interface RouteDeps {
  store: Store;
  hub: ClientHub;
  lifecycle: TicketLifecycle;
  slots: SlotManager;
  coordinator: AgentCoordinator;
  system: PaneReader;
  triage: TriageManager;
  feasibility: FeasibilityBatchManager;
  userTerminals: UserTerminalManager;
  projectRoot: string;
  /** Probed once at boot: is the Cursor headless CLI (Composer driver) usable? */
  composerAvailable: boolean;
  /** The real checkout root, for the self-update git guards + rebuild (desktop dev only). */
  repoRoot?: string;
  /** Tear down the server (not tmux) and relaunch the desktop app. Set only in dev desktop. */
  onRequestUpdate?: () => void;
  /** Tear down tmux sessions + server and quit the desktop app. */
  onRequestQuit?: () => void;
}

/** Branch the self-update tracks; mismatch blocks the update (no auto-switch). */
const UPDATE_BASE_BRANCH = "main";
/** Generous bound for the pre-relaunch web + agents rebuild. */
const UPDATE_BUILD_TIMEOUT_MS = 300_000;
/** Let the {ok:true} response flush before tearing the server down + relaunching. */
const UPDATE_RELAUNCH_DELAY_MS = 200;
/** Keep only the tail of a failed build's output in the surfaced error. */
const BUILD_ERROR_TAIL = 600;
/** Timeout for lightweight git introspection commands (rev-parse, diff --name-only). */
const GIT_QUERY_TIMEOUT_MS = 5_000;
/**
 * Strict allowlist: only paths under src/web/ are considered frontend-only.
 * src/shared/** is excluded — it is consumed by the server at runtime, so a change there requires
 * a full relaunch. Any unrecognised path defaults conservatively to a full relaunch.
 */
function isWebOnlyPath(filePath: string): boolean {
  return filePath.startsWith("src/web/");
}

const stopHookSchema = z.object({
  ticketId: z.string(),
  sessionId: z.string().nullable().default(null),
  /** Token usage aggregated from this session's transcript (additive; omitted in dry-run). */
  usageByModel: usageByModelSchema.optional(),
});

const agentActiveSchema = z.object({
  ticketId: z.string(),
});

const HTTP_CREATED = 201;
const HTTP_BAD_REQUEST = 400;
const HTTP_NOT_FOUND = 404;
const HTTP_CONFLICT = 409;
const HTTP_INTERNAL_ERROR = 500;
const HTTP_BAD_GATEWAY = 502;

/** Markdown body shown on a review card, summarizing the target PR. */
function reviewDescription(pr: OpenPr): string {
  return [
    `Revue autonome (argus) de [PR #${pr.number}](${pr.url})`,
    "",
    `- **Titre** : ${pr.title}`,
    `- **Branche** : \`${pr.headBranch}\``,
    `- **Auteur** : ${pr.author}`,
    `- **Diff** : +${pr.additions} / -${pr.deletions}`,
  ].join("\n");
}

/** Markdown body shown on a clean card, summarizing the target PR and the user-provided context. */
function cleanDescription(pr: OpenPr, context: string): string {
  return [
    `Nettoyage des retours de [PR #${pr.number}](${pr.url})`,
    "",
    `- **Titre** : ${pr.title}`,
    `- **Branche** : \`${pr.headBranch}\``,
    `- **Auteur** : ${pr.author}`,
    `- **Diff** : +${pr.additions} / -${pr.deletions}`,
    "",
    "## Contexte fourni",
    context.trim() || "(aucun)",
  ].join("\n");
}

function jsonError(set: { status?: number | string }, status: number, message: string): { error: string } {
  set.status = status;
  return { error: message };
}

/** A ticket is locked (only comments + abandon allowed) while it is being processed. */
function isProcessing(stage: Stage | null): boolean {
  if (stage === null) return false;
  if (stage === "awaiting_answers") return true;
  return ACTIVE_STAGES.includes(stage);
}

/** A ticket can't start while its dependency hasn't opened its PR yet (no branch/prUrl). */
function isBlocked(ticket: Ticket, store: Store): boolean {
  if (!ticket.dependsOn) return false;
  const parent = store.getTicket(ticket.dependsOn);
  return !parent || parent.prUrl === null || parent.branch === null;
}

/**
 * Validate a proposed dependsOn for `ticketId` (null on create): parent exists, same project, no
 * cycle. Returns an error message or null.
 */
function dependencyError(store: Store, ticketId: string | null, dependsOn: string, project: string): string | null {
  const parent = store.getTicket(dependsOn);
  if (!parent) return "ticket dont il dépend introuvable";
  if (parent.project !== project) return "la dépendance doit être dans le même projet";
  // Walk the parent chain; reaching ticketId (on edit) is a cycle.
  const seen = new Set<string>();
  let cursor: typeof parent | null = parent;
  while (cursor) {
    if (cursor.id === ticketId) return "dépendance circulaire interdite";
    if (seen.has(cursor.id)) break;
    seen.add(cursor.id);
    cursor = cursor.dependsOn ? store.getTicket(cursor.dependsOn) : null;
  }
  return null;
}

export function createApiRoutes(deps: RouteDeps) {
  const { store, hub, lifecycle, slots, coordinator } = deps;

  return new Elysia({ prefix: "/api" })
    .get("/projects", () =>
      PROJECT_KEYS.map((key) => {
        const project = getProject(key);
        return {
          key,
          label: project.label,
          baseBranch: project.baseBranch,
          defaultAutoMerge: project.defaultAutoMerge,
          defaultAddScreenshots: project.defaultAddScreenshots,
          color: project.color,
        };
      }),
    )
    .get("/projects/:key/prs", async ({ params, set }) => {
      if (!isProjectKey(params.key)) return jsonError(set, HTTP_NOT_FOUND, "projet inconnu");
      const project = getProject(params.key);
      try {
        return await deps.system.listOpenPrs(project.repoPath);
      } catch (error) {
        return jsonError(set, HTTP_BAD_GATEWAY, getErrorMessage(error, "échec gh pr list"));
      }
    })
    .get("/projects/:key/branches", async ({ params, set }) => {
      if (!isProjectKey(params.key)) return jsonError(set, HTTP_NOT_FOUND, "projet inconnu");
      const project = getProject(params.key);
      try {
        return await deps.system.listBranches(project.repoPath);
      } catch (error) {
        return jsonError(set, HTTP_BAD_GATEWAY, getErrorMessage(error, "échec listing branches"));
      }
    })
    .get("/capabilities", () => ({
      composerAvailable: deps.composerAvailable,
      defaultModel: MODELS.implement,
      defaultEffort: MODELS.implementEffort,
      defaultImplementerModel: MODELS.implementerModel,
      defaultImplementerEffort: MODELS.implementerEffort,
      canUpdate: deps.onRequestUpdate != null && deps.repoRoot != null,
      canQuit: deps.onRequestQuit != null,
    }))
    .get("/settings", () => store.getAppSettings())
    .patch("/settings", ({ body, set }) => {
      const parsed = updateAppSettingsSchema.safeParse(body);
      if (!parsed.success) return jsonError(set, HTTP_BAD_REQUEST, parsed.error.message);
      return store.updateAppSettings(parsed.data);
    })
    .get("/profiles", () => store.listProfiles())
    .post("/profiles", ({ body, set }) => {
      const parsed = createProfileSchema.safeParse(body);
      if (!parsed.success) return jsonError(set, HTTP_BAD_REQUEST, parsed.error.message);
      return store.createProfile(parsed.data);
    })
    .patch("/profiles/:id", ({ params, body, set }) => {
      if (!store.getProfile(params.id)) return jsonError(set, HTTP_NOT_FOUND, "profil introuvable");
      const parsed = updateProfileSchema.safeParse(body);
      if (!parsed.success) return jsonError(set, HTTP_BAD_REQUEST, parsed.error.message);
      return store.updateProfile(params.id, parsed.data);
    })
    .delete("/profiles/:id", ({ params, set }) => {
      if (!store.getProfile(params.id)) return jsonError(set, HTTP_NOT_FOUND, "profil introuvable");
      store.deleteProfile(params.id);
      return { ok: true };
    })
    .get("/tickets", ({ query }) => store.listTickets(query.archived === "true"))
    .get("/stats", () =>
      store.listTickets(true).map((t): StatRecord => {
        const hasUsage = Object.keys(t.sessionUsage).length > 0;
        return {
          id: t.id,
          project: t.project,
          kind: t.kind,
          column: t.column,
          stage: t.stage,
          model: t.model,
          effort: t.effort,
          implementer: t.implementer,
          createdAt: t.createdAt,
          implementingStartedAt: t.implementingStartedAt,
          implementationStartedAt: t.implementationStartedAt,
          finishedAt: t.finishedAt,
          costUsd: hasUsage ? costOfSessions(t.sessionUsage) : null,
          totalTokens: hasUsage ? totalTokensOfSessions(t.sessionUsage) : null,
        };
      }),
    )
    .get("/tickets/:id", ({ params, set }) => {
      const ticket = store.getTicket(params.id);
      if (!ticket) return jsonError(set, HTTP_NOT_FOUND, "ticket introuvable");
      return { ticket, comments: store.listComments(params.id) };
    })
    .post("/tickets", ({ body, set }) => {
      const parsed = createTicketSchema.safeParse(body);
      if (!parsed.success) return jsonError(set, HTTP_BAD_REQUEST, parsed.error.message);
      if (!isProjectKey(parsed.data.project)) return jsonError(set, HTTP_BAD_REQUEST, "projet inconnu");
      if (parsed.data.dependsOn !== null) {
        const depError = dependencyError(store, null, parsed.data.dependsOn, parsed.data.project);
        if (depError !== null) return jsonError(set, HTTP_BAD_REQUEST, depError);
      }
      // Title is optional: fall back to a slice of the description when left blank.
      const title =
        parsed.data.title.trim() || deriveTitleFromDescription(parsed.data.description);
      const ticket = store.createTicket({
        title,
        description: parsed.data.description,
        externalUrl: parsed.data.externalUrl,
        project: parsed.data.project,
        prdEnabled: parsed.data.prdEnabled,
        prDraft: parsed.data.prDraft,
        autoMerge: parsed.data.autoMerge,
        addScreenshots: parsed.data.addScreenshots,
        verifyFeature: parsed.data.verifyFeature,
        argusMultiLoop: parsed.data.argusMultiLoop,
        baseBranch: parsed.data.baseBranch,
        dependsOn: parsed.data.dependsOn,
        model: parsed.data.model,
        effort: parsed.data.effort,
        implementerModel: parsed.data.implementerModel,
        implementerEffort: parsed.data.implementerEffort,
        implementer: parsed.data.implementer,
      });
      // A blocked child stays in todo even with start=true: the parent's done() will auto-start it.
      if (!parsed.data.start || isBlocked(ticket, store)) {
        hub.pushTicket(ticket);
        return ticket;
      }
      const started = lifecycle.enqueue(ticket.id);
      // Slot launch does slow git worktree setup; don't block the HTTP response on it.
      // Kick it off in the background and let the board update live (mirrors the review path).
      void slots.startTicket(ticket.id).catch((e) => {
        log.error("démarrage du ticket échoué", {
          ticketId: ticket.id,
          error: getErrorMessage(e),
        });
      });
      return started;
    })
    .post("/tickets/import", ({ body, set }) => {
      const parsed = importTicketsSchema.safeParse(body);
      if (!parsed.success) return jsonError(set, HTTP_BAD_REQUEST, parsed.error.message);
      const input = parsed.data;
      if (!isProjectKey(input.project)) return jsonError(set, HTTP_BAD_REQUEST, "projet inconnu");
      // Server-side re-validation (never trust the client): every row needs a non-empty title.
      // All-or-nothing — reject the whole batch listing the offending rows before creating anything.
      const blankTitleRows = input.rows
        .map((row, index) => ({ row, line: index + 1 }))
        .filter(({ row }) => row.title.trim().length === 0)
        .map(({ line }) => line);
      if (blankTitleRows.length > 0) {
        return jsonError(set, HTTP_BAD_REQUEST, `titre manquant aux lignes : ${blankTitleRows.join(", ")}`);
      }

      const created: Ticket[] = [];
      for (const row of input.rows) {
        const ticket = store.createTicket({
          title: row.title.trim(),
          description: row.description,
          externalUrl: null,
          project: input.project,
          prdEnabled: input.prdEnabled,
          prDraft: input.prDraft,
          autoMerge: input.autoMerge,
          addScreenshots: input.addScreenshots,
          verifyFeature: input.verifyFeature,
          argusMultiLoop: input.argusMultiLoop,
          baseBranch: input.baseBranch,
          dependsOn: null,
          model: input.model,
          effort: input.effort,
          implementerModel: input.implementerModel,
          implementerEffort: input.implementerEffort,
          implementer: input.implementer,
        });
        hub.pushTicket(ticket);
        created.push(ticket);
      }

      if (!input.runFeasibility) return { created, feasibilityStarted: false };
      // Kick off the batch feasibility analysis in the background; it marks tickets running then
      // persists verdicts via the worker channel (mirrors the triage path).
      void deps.feasibility
        .start(created.map((ticket) => ticket.id), input.project)
        .catch((e) => {
          log.error("démarrage de la faisabilité échoué", {
            error: getErrorMessage(e),
          });
        });
      // The batch id is generated inside the manager; the client only needs to know the run started.
      return { created, feasibilityStarted: true };
    })
    .post("/tickets/analyze", ({ body, set }) => {
      const parsed = analyzeTicketsSchema.safeParse(body);
      if (!parsed.success) return jsonError(set, HTTP_BAD_REQUEST, parsed.error.message);
      // Re-run is allowed on any TODO ticket whose analysis isn't already live and which isn't processing.
      const eligible = parsed.data.ids
        .map((id) => store.getTicket(id))
        .filter((ticket): ticket is Ticket => ticket !== null)
        .filter((ticket) => ticket.triageStatus !== "running" && !isProcessing(ticket.stage));

      const idsByProject = new Map<string, string[]>();
      for (const ticket of eligible) {
        const group = idsByProject.get(ticket.project) ?? [];
        group.push(ticket.id);
        idsByProject.set(ticket.project, group);
      }

      // The manager marks each ticket running then persists/pushes verdicts via the worker channel.
      for (const [project, ids] of idsByProject) {
        void deps.feasibility.start(ids, project).catch((e) => {
          log.error("démarrage de l'analyse en lot échoué", {
            error: getErrorMessage(e),
          });
        });
      }

      return { started: eligible.length };
    })
    .post("/reviews", ({ body, set }) => {
      const parsed = createReviewSchema.safeParse(body);
      if (!parsed.success) return jsonError(set, HTTP_BAD_REQUEST, parsed.error.message);
      if (!isProjectKey(parsed.data.project)) return jsonError(set, HTTP_BAD_REQUEST, "projet inconnu");
      const created: Ticket[] = [];
      for (const pr of parsed.data.prs) {
        const ticket = store.createReview({
          title: `Review PR #${pr.number} — ${pr.title}`,
          description: reviewDescription(pr),
          project: parsed.data.project,
          prNumber: pr.number,
          prHeadBranch: pr.headBranch,
          prUrl: pr.url,
          // Explicit user override wins; otherwise use the PR's own detected target branch.
          baseBranch: parsed.data.baseBranch ?? pr.baseBranch,
          reviewDepth: parsed.data.depth,
          postComments: parsed.data.postComments,
          fixComments: parsed.data.fixComments,
        });
        hub.pushTicket(ticket);
        // Slot launch does slow git worktree setup; don't block the HTTP response on it
        // (it kept the dialog open). Kick it off in the background and let the board update live.
        void slots.startTicket(ticket.id).catch((e) => {
          log.error("démarrage de la review échoué", {
            ticketId: ticket.id,
            error: getErrorMessage(e),
          });
        });
        created.push(ticket);
      }
      return created;
    })
    .post("/cleaners", ({ body, set }) => {
      const parsed = createCleanSchema.safeParse(body);
      if (!parsed.success) return jsonError(set, HTTP_BAD_REQUEST, parsed.error.message);
      if (!isProjectKey(parsed.data.project)) return jsonError(set, HTTP_BAD_REQUEST, "projet inconnu");
      const created: Ticket[] = [];
      for (const pr of parsed.data.prs) {
        const ticket = store.createClean({
          title: `Clean PR #${pr.number} — ${pr.title}`,
          description: cleanDescription(pr, parsed.data.context),
          project: parsed.data.project,
          prNumber: pr.number,
          prHeadBranch: pr.headBranch,
          prUrl: pr.url,
        });
        hub.pushTicket(ticket);
        // Slot launch does slow git worktree setup; don't block the HTTP response on it (mirrors reviews).
        void slots.startTicket(ticket.id).catch((e) => {
          log.error("démarrage du nettoyage échoué", {
            ticketId: ticket.id,
            error: getErrorMessage(e),
          });
        });
        created.push(ticket);
      }
      return created;
    })
    .post("/asks", ({ body, set }) => {
      const parsed = createAskSchema.safeParse(body);
      if (!parsed.success) return jsonError(set, HTTP_BAD_REQUEST, parsed.error.message);
      if (!isProjectKey(parsed.data.project)) return jsonError(set, HTTP_BAD_REQUEST, "projet inconnu");
      // Title is optional: fall back to a slice of the question when left blank.
      const title = parsed.data.title.trim() || deriveTitleFromDescription(parsed.data.description);
      const ticket = store.createAsk({
        title,
        description: parsed.data.description,
        project: parsed.data.project,
        model: parsed.data.model,
        effort: parsed.data.effort,
      });
      hub.pushTicket(ticket);
      // Slot launch does slow git worktree setup; don't block the HTTP response on it (mirrors reviews).
      void slots.startTicket(ticket.id).catch((e) => {
        log.error("démarrage de l'ask échoué", {
          ticketId: ticket.id,
          error: getErrorMessage(e),
        });
      });
      return ticket;
    })
    .patch("/tickets/:id", ({ params, body, set }) => {
      const ticket = store.getTicket(params.id);
      if (!ticket) return jsonError(set, HTTP_NOT_FOUND, "ticket introuvable");
      if (isProcessing(ticket.stage)) return jsonError(set, HTTP_CONFLICT, "ticket verrouillé (en traitement)");
      if (ticket.triageStatus === "running") {
        return jsonError(set, HTTP_CONFLICT, "analyse en cours : attends le verdict avant de modifier");
      }
      const parsed = updateTicketSchema.safeParse(body);
      if (!parsed.success) return jsonError(set, HTTP_BAD_REQUEST, parsed.error.message);
      if (parsed.data.project !== undefined && parsed.data.project !== ticket.project) {
        // Key validity is independent of the card's column: reject an unknown
        // project (400) before the TODO-only transition rule (409).
        if (!isProjectKey(parsed.data.project)) {
          return jsonError(set, HTTP_BAD_REQUEST, "projet inconnu");
        }
        if (ticket.column !== "todo") {
          return jsonError(set, HTTP_CONFLICT, "le projet ne peut être changé que dans TODO");
        }
      }
      if (parsed.data.dependsOn !== undefined && parsed.data.dependsOn !== null) {
        const depError = dependencyError(store, ticket.id, parsed.data.dependsOn, parsed.data.project ?? ticket.project);
        if (depError !== null) return jsonError(set, HTTP_BAD_REQUEST, depError);
      }
      const patch: TicketPatch = { ...parsed.data };
      // A project change invalidates the saved base-branch override (it is
      // project-specific). Reset it unless the same request supplies a new one.
      if (
        parsed.data.project !== undefined &&
        parsed.data.project !== ticket.project &&
        parsed.data.baseBranch === undefined
      ) {
        patch.baseBranch = null;
      }
      // A blank title is not rejected: derive one from the (new or existing)
      // description so the title stays genuinely optional, as on creation.
      if (parsed.data.title !== undefined && parsed.data.title.trim() === "") {
        const derived = deriveTitleFromDescription(
          parsed.data.description ?? ticket.description,
        );
        // Never blank an existing title: fall back to it when nothing derivable.
        patch.title = derived || ticket.title;
      }
      const updated = store.updateTicket(params.id, patch);
      hub.pushTicket(updated);
      return updated;
    })
    .post("/tickets/:id/move", async ({ params, body, set }) => {
      const ticket = store.getTicket(params.id);
      if (!ticket) return jsonError(set, HTTP_NOT_FOUND, "ticket introuvable");
      const parsed = moveTicketSchema.safeParse(body);
      if (!parsed.success) return jsonError(set, HTTP_BAD_REQUEST, parsed.error.message);
      const target = parsed.data.column;

      if (isProcessing(ticket.stage) && target !== "abandoned") {
        return jsonError(set, HTTP_CONFLICT, "ticket en traitement : seul Abandonnés est autorisé");
      }
      if (target === "abandoned") {
        if (!parsed.data.confirmed) return jsonError(set, HTTP_CONFLICT, "confirmation requise");
        await slots.abandonTicket(params.id);
        return store.getTicket(params.id);
      }
      if (target === "implementing") {
        // A running triage holds a worker socket keyed by this ticketId; launching now would
        // collide the two sessions on that key. Wait for the verdict first.
        if (ticket.triageStatus === "running") {
          return jsonError(set, HTTP_CONFLICT, "analyse en cours : attends le verdict avant de lancer l'implémentation");
        }
        if (isBlocked(ticket, store)) {
          return jsonError(set, HTTP_CONFLICT, "en attente de la PR du ticket dont il dépend");
        }
        lifecycle.moveColumn(params.id, "implementing");
        // retry() relaunches a failed/stalled/interrupted ticket in its held slot;
        // for a fresh ticket (no slot) it falls through to a normal startTicket.
        await slots.retry(params.id);
        return store.getTicket(params.id);
      }
      return lifecycle.moveColumn(params.id, target);
    })
    .post("/tickets/:id/comments", ({ params, body, set }) => {
      const ticket = store.getTicket(params.id);
      if (!ticket) return jsonError(set, HTTP_NOT_FOUND, "ticket introuvable");
      if (ticket.column === "todo") {
        return jsonError(set, HTTP_CONFLICT, "commentaire inutile sur un ticket non démarré");
      }
      const parsed = createCommentSchema.safeParse(body);
      if (!parsed.success) return jsonError(set, HTTP_BAD_REQUEST, parsed.error.message);
      const comment = store.addComment(params.id, "user", parsed.data.body, parsed.data.questionId);
      hub.pushComment(comment);
      if (parsed.data.questionId) {
        coordinator.answerQuestion(params.id, parsed.data.questionId, parsed.data.body);
      } else {
        coordinator.forwardComment(params.id, parsed.data.body);
      }
      return comment;
    })
    .post("/tickets/:id/validate-prd", ({ params, body, set }) => {
      const ticket = store.getTicket(params.id);
      if (!ticket) return jsonError(set, HTTP_NOT_FOUND, "ticket introuvable");
      if (ticket.column !== "prd") return jsonError(set, HTTP_CONFLICT, "le ticket n'est pas en colonne PRD");
      const parsed = validatePrdSchema.safeParse(body ?? {});
      if (!parsed.success) return jsonError(set, HTTP_BAD_REQUEST, parsed.error.message);
      coordinator.validatePrd(params.id, parsed.data.note);
      return store.getTicket(params.id);
    })
    .post("/tickets/:id/merged", ({ params, set }) => {
      const ticket = store.getTicket(params.id);
      if (!ticket) return jsonError(set, HTTP_NOT_FOUND, "ticket introuvable");
      // Stamp the merge time so the board can order "PR mergée" newest-first.
      const merged = lifecycle.markMerged(params.id);
      return merged;
    })
    .post("/tickets/:id/check-merged", async ({ params, set }) => {
      const ticket = store.getTicket(params.id);
      if (!ticket) return jsonError(set, HTTP_NOT_FOUND, "ticket introuvable");
      if (ticket.column !== "done" || ticket.kind !== "feature") {
        return jsonError(set, HTTP_CONFLICT, "vérification réservée aux features en colonne Fini");
      }
      if (!ticket.prUrl) return jsonError(set, HTTP_CONFLICT, "aucune PR associée à cette carte");
      if (!isProjectKey(ticket.project)) return jsonError(set, HTTP_NOT_FOUND, "projet inconnu");
      const project = getProject(ticket.project);
      let result: { merged: boolean; state: string };
      try {
        result = await deps.system.checkPrMerged(project.repoPath, ticket.prUrl);
      } catch (error) {
        return jsonError(set, HTTP_BAD_GATEWAY, getErrorMessage(error, "échec gh pr view"));
      }
      if (!result.merged) return { merged: false, state: result.state };
      // Mirror /merged: stamp finishedAt so the board orders newest-first.
      const merged = lifecycle.markMerged(params.id);
      return { merged: true, state: result.state, ticket: merged };
    })
    .post("/tickets/:id/retry", async ({ params, set }) => {
      const ticket = store.getTicket(params.id);
      if (!ticket) return jsonError(set, HTTP_NOT_FOUND, "ticket introuvable");
      await slots.retry(params.id);
      return store.getTicket(params.id);
    })
    .post("/tickets/:id/resolve-conflicts", async ({ params, set }) => {
      const ticket = store.getTicket(params.id);
      if (!ticket) return jsonError(set, HTTP_NOT_FOUND, "ticket introuvable");
      // Only meaningful for an auto-merge that failed after opening the PR: the PR exists, the slot
      // is released, and a fresh session can rebase the branch and re-trigger the merge.
      const eligible =
        ticket.column === "failed" &&
        ticket.autoMerge &&
        ticket.kind !== "review" &&
        ticket.slotId === null &&
        ticket.prUrl !== null &&
        ticket.branch !== null;
      if (!eligible) {
        return jsonError(set, HTTP_CONFLICT, "résolution de conflits réservée aux PR dont le merge auto a échoué");
      }
      // Slow git worktree setup runs in the background; the board updates live over WS.
      void slots.resolveMergeConflicts(params.id).catch((e) => {
        log.error("résolution de conflits échouée", {
          ticketId: params.id,
          error: getErrorMessage(e),
        });
      });
      return store.getTicket(params.id);
    })
    .post("/tickets/:id/test", ({ params, set }) => {
      const ticket = store.getTicket(params.id);
      if (!ticket) return jsonError(set, HTTP_NOT_FOUND, "ticket introuvable");
      const eligible =
        ticket.kind === "feature" &&
        ticket.column === "done" &&
        ticket.slotId === null &&
        ticket.branch !== null &&
        !ticket.testing;
      if (!eligible) {
        return jsonError(set, HTTP_CONFLICT, "test réservé aux features terminées (colonne Fini) sans slot occupé");
      }
      // Slow git worktree setup + install runs in the background; the board updates live over WS.
      void slots.startTestSession(params.id).catch((e) => {
        log.error("démarrage session de test échoué", {
          ticketId: params.id,
          error: e instanceof Error ? e.message : String(e),
        });
      });
      return store.getTicket(params.id);
    })
    .post("/tickets/:id/stop-test", async ({ params, set }) => {
      const ticket = store.getTicket(params.id);
      if (!ticket) return jsonError(set, HTTP_NOT_FOUND, "ticket introuvable");
      if (!ticket.testing) return jsonError(set, HTTP_CONFLICT, "aucune session de test active");
      await slots.stopTestSession(params.id);
      return store.getTicket(params.id);
    })
    .post("/tickets/:id/relaunch", async ({ params, set }) => {
      const ticket = store.getTicket(params.id);
      if (!ticket) return jsonError(set, HTTP_NOT_FOUND, "ticket introuvable");
      if (ticket.column !== "implementing" || ticket.slotId === null) {
        return jsonError(set, HTTP_CONFLICT, "relance réservée aux cartes en cours d'implémentation dans un slot");
      }
      const relaunched = await slots.relaunch(params.id);
      if (!relaunched) return jsonError(set, HTTP_CONFLICT, "lancement déjà en cours");
      return store.getTicket(params.id);
    })
    .post("/tickets/:id/triage", ({ params, set }) => {
      const ticket = store.getTicket(params.id);
      if (!ticket) return jsonError(set, HTTP_NOT_FOUND, "ticket introuvable");
      if (isProcessing(ticket.stage)) return jsonError(set, HTTP_CONFLICT, "ticket verrouillé (en traitement)");
      // No running-guard: a stuck "running" analysis can be force-relaunched; start() tears the
      // previous session down first (mirrors the ticket-side "Relancer la session" force relaunch).
      const running = store.updateTicket(params.id, {
        triageStatus: "running",
        triageVerdict: null,
        triageReport: null,
      });
      hub.pushTicket(running);
      // Spawn the triage session in the background; persistence happens in TriageManager.complete.
      void deps.triage.start(params.id).catch((e) => {
        log.error("démarrage du triage échoué", {
          ticketId: params.id,
          error: getErrorMessage(e),
        });
      });
      return { started: true };
    })
    .post("/tickets/:id/triage-plus", ({ params, set }) => {
      const ticket = store.getTicket(params.id);
      if (!ticket) return jsonError(set, HTTP_NOT_FOUND, "ticket introuvable");
      if (isProcessing(ticket.stage)) return jsonError(set, HTTP_CONFLICT, "ticket verrouillé (en traitement)");
      const running = store.updateTicket(params.id, {
        triageStatus: "running",
        triageVerdict: null,
        triageReport: null,
      });
      hub.pushTicket(running);
      // Deep "Analyse +": fan-out feasibility/solutions analysis (opus/low) in the background.
      void deps.triage.start(params.id, { deep: true }).catch((e) => {
        log.error("démarrage de l'analyse + échoué", {
          ticketId: params.id,
          error: getErrorMessage(e),
        });
      });
      return { started: true };
    })
    .post("/tickets/:id/reformulate", async ({ params, set }) => {
      const ticket = store.getTicket(params.id);
      if (!ticket) return jsonError(set, HTTP_NOT_FOUND, "ticket introuvable");
      if (isProcessing(ticket.stage)) return jsonError(set, HTTP_CONFLICT, "ticket verrouillé (en traitement)");
      if (!isProjectKey(ticket.project)) return jsonError(set, HTTP_NOT_FOUND, "projet inconnu");
      const project = getProject(ticket.project);
      const prompt = buildReformulatePrompt(ticket);
      try {
        const markdown = await deps.system.reformulate({
          cwd: project.repoPath,
          prompt,
          model: MODELS.triage,
          effort: MODELS.triageEffort,
        });
        return { markdown };
      } catch (error) {
        return jsonError(set, HTTP_INTERNAL_ERROR, getErrorMessage(error, "échec de la reformulation"));
      }
    })
    .delete("/tickets/:id", ({ params, set }) => {
      const ticket = store.getTicket(params.id);
      if (!ticket) return jsonError(set, HTTP_NOT_FOUND, "ticket introuvable");
      if (ticket.slotId !== null) {
        return jsonError(set, HTTP_CONFLICT, "ticket occupe un slot : abandonne-le d'abord");
      }
      store.deleteTicket(params.id);
      hub.pushTicketRemoved(params.id);
      return { ok: true };
    })
    .get("/tickets/:id/terminal", async ({ params, set }) => {
      const ticket = store.getTicket(params.id);
      if (!ticket) return jsonError(set, HTTP_NOT_FOUND, "ticket introuvable");
      // A triage runs in no slot: fall back to its detached session, then to the
      // feasibility batch session this ticket belongs to (mirrors the WS terminal path).
      const sessionName =
        ticket.slotId !== null
          ? store.getSlot(ticket.slotId)?.tmuxSession ?? null
          : deps.triage.resolveSession(params.id) ?? deps.feasibility.resolveSessionForTicket(params.id);
      if (ticket.slotId === null && !sessionName) return jsonError(set, HTTP_CONFLICT, "aucun slot actif");
      const phase = slots.getSetupPhase(params.id);
      // Before the tmux session exists (worktree/install/spawn), surface the setup phase.
      if (!sessionName) return { output: "", phase };
      const output = await deps.system.capturePane(sessionName);
      return { output, phase };
    })
    .get("/terminals", async ({ query }) => {
      const projectKey = typeof query.projectKey === "string" ? query.projectKey : undefined;
      return deps.userTerminals.list(projectKey);
    })
    .post("/terminals", async ({ body, set }) => {
      const parsed = createTerminalBodySchema.safeParse(body);
      if (!parsed.success) return jsonError(set, HTTP_BAD_REQUEST, parsed.error.message);
      if (!isProjectKey(parsed.data.projectKey)) return jsonError(set, HTTP_NOT_FOUND, "projet inconnu");
      const descriptor = await deps.userTerminals.create(parsed.data.projectKey);
      set.status = HTTP_CREATED;
      return descriptor;
    })
    .delete("/terminals/:id", async ({ params }) => {
      // Idempotent: closing an unknown/already-dead terminal is a no-op.
      await deps.userTerminals.close(params.id);
      return { ok: true };
    })
    .get("/worktree-sessions", () => slots.listWorktreeSessions())
    .post("/worktree-sessions", ({ body, set }) => {
      const parsed = startWorktreeSessionBodySchema.safeParse(body);
      if (!parsed.success) return jsonError(set, HTTP_BAD_REQUEST, parsed.error.message);
      if (!isProjectKey(parsed.data.project)) return jsonError(set, HTTP_NOT_FOUND, "projet inconnu");
      if (!store.findFreeSlot()) return jsonError(set, HTTP_CONFLICT, "Aucun slot libre — réessaie une fois un slot libéré.");
      // Slow git worktree setup + install runs in the background; the board updates live over WS.
      void slots.startWorktreeSession(parsed.data).catch((e) => {
        log.error("démarrage session worktree échoué", { error: getErrorMessage(e) });
      });
      return { started: true };
    })
    .delete("/worktree-sessions/:slotId", async ({ params, set }) => {
      const slotId = Number(params.slotId);
      if (!Number.isInteger(slotId) || slotId <= 0) return jsonError(set, HTTP_BAD_REQUEST, "slotId invalide");
      await slots.stopWorktreeSession(slotId);
      return { ok: true };
    })
    .post("/worktree-sessions/:slotId/relaunch", async ({ params, set }) => {
      const slotId = Number(params.slotId);
      if (!Number.isInteger(slotId) || slotId <= 0) return jsonError(set, HTTP_BAD_REQUEST, "slotId invalide");
      await slots.relaunchWorktreeSession(slotId);
      return { ok: true };
    })
    .post("/uploads", async ({ body, set }) => {
      const file = body && typeof body === "object" && "file" in body ? body.file : null;
      if (!(file instanceof File)) return jsonError(set, HTTP_BAD_REQUEST, "fichier manquant");
      const saved = await saveUpload(deps.projectRoot, file);
      return { path: saved.path, url: saved.url };
    })
    .get("/slots", () => store.listSlots())
    .post("/internal/stop", ({ body }) => {
      const parsed = stopHookSchema.safeParse(body);
      if (!parsed.success) return { ok: false };
      const { ticketId, sessionId, usageByModel } = parsed.data;
      // Persist this session's cumulative usage (idempotent: each Stop overwrites its own
      // sessionId entry; total = sum across sessions, correct across auto-reclaim relaunches).
      if (usageByModel && sessionId) {
        const ticket = store.getTicket(ticketId);
        if (ticket) {
          store.updateTicket(ticketId, {
            sessionUsage: { ...ticket.sessionUsage, [sessionId]: usageByModel },
          });
        }
      }
      coordinator.handleStopHook(ticketId, sessionId);
      return { ok: true };
    })
    .post("/internal/active", ({ body }) => {
      const parsed = agentActiveSchema.safeParse(body);
      if (!parsed.success) return { ok: false };
      coordinator.handleAgentActive(parsed.data.ticketId);
      return { ok: true };
    })
    .post("/internal/update", async ({ set }) => {
      const { onRequestUpdate, repoRoot, system } = deps;
      if (!onRequestUpdate || !repoRoot) return jsonError(set, HTTP_CONFLICT, "mise à jour indisponible");

      // Guards: never touch a dirty or diverged tree.
      const branch = await system.gitCurrentBranch(repoRoot);
      if (branch !== UPDATE_BASE_BRANCH) {
        return jsonError(set, HTTP_BAD_REQUEST, `branche courante « ${branch || "?"} » ≠ ${UPDATE_BASE_BRANCH} : bascule dessus avant de mettre à jour`);
      }
      if (!(await system.gitStatusClean(repoRoot))) {
        return jsonError(set, HTTP_BAD_REQUEST, "arbre de travail sale : commite ou stashe tes changements avant de mettre à jour");
      }

      // Capture HEAD before the pull so we can diff what actually changed.
      const headResult = await system.runProjectScript(repoRoot, "git rev-parse HEAD", GIT_QUERY_TIMEOUT_MS);
      if (!headResult.ok) log.warn("git rev-parse HEAD a échoué, fallback relaunch", { repoRoot });
      const beforeHash = headResult.ok ? headResult.output.trim() : null;

      const pull = await system.gitPullFastForward(repoRoot, UPDATE_BASE_BRANCH);
      if (!pull.ok) return jsonError(set, HTTP_BAD_REQUEST, pull.reason);

      // Classify the pull: frontend-only (src/web/** exclusively) → soft reload; anything else → relaunch.
      let frontendOnly = false;
      if (beforeHash) {
        const diffResult = await system.runProjectScript(
          repoRoot,
          `git diff --name-only ${beforeHash} HEAD`,
          GIT_QUERY_TIMEOUT_MS,
        );
        if (!diffResult.ok) log.warn("git diff --name-only a échoué, fallback relaunch", { repoRoot, beforeHash });
        const changed = diffResult.ok ? diffResult.output.trim().split("\n").filter(Boolean) : [];
        frontendOnly = changed.length > 0 && changed.every(isWebOnlyPath);
      }

      try {
        const web = await system.runProjectScript(repoRoot, "bun run build:web", UPDATE_BUILD_TIMEOUT_MS);
        if (!web.ok) return jsonError(set, HTTP_BAD_GATEWAY, `build:web a échoué : ${web.output.trim().slice(-BUILD_ERROR_TAIL)}`);
        if (!frontendOnly) {
          const agents = await system.runProjectScript(repoRoot, "bun run build:agents", UPDATE_BUILD_TIMEOUT_MS);
          if (!agents.ok) return jsonError(set, HTTP_BAD_GATEWAY, `build:agents a échoué : ${agents.output.trim().slice(-BUILD_ERROR_TAIL)}`);
        }
      } catch (error) {
        return jsonError(set, HTTP_BAD_GATEWAY, `build interrompu : ${getErrorMessage(error)}`);
      }

      const mode: UpdateMode = frontendOnly ? "reload" : "relaunch";
      if (frontendOnly) {
        log.info("mise à jour frontend-only validée, soft-reload", { repoRoot, branch });
        return { ok: true, mode };
      }
      log.info("mise à jour validée, relance imminente", { repoRoot, branch });
      // Defer so this {ok:true} flushes before the server stops and the process exits.
      setTimeout(onRequestUpdate, UPDATE_RELAUNCH_DELAY_MS);
      return { ok: true, mode };
    })
    .post("/internal/quit", ({ set }) => {
      const { onRequestQuit } = deps;
      if (!onRequestQuit) return jsonError(set, HTTP_CONFLICT, "quitter indisponible");
      setTimeout(onRequestQuit, UPDATE_RELAUNCH_DELAY_MS);
      return { ok: true };
    });
}
