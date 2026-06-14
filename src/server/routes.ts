import { Elysia } from "elysia";
import { z } from "zod";

import { ACTIVE_STAGES, TRIAGE_RAW_REPORT_MAX, TRIAGE_TIMEOUT_MS } from "../shared/constants.ts";
import type { Stage } from "../shared/constants.ts";
import {
  createCommentSchema,
  createProfileSchema,
  createReviewSchema,
  createTicketSchema,
  deriveTitleFromDescription,
  moveTicketSchema,
  updateAppSettingsSchema,
  updateProfileSchema,
  updateTicketSchema,
  validatePrdSchema,
} from "../shared/schemas.ts";
import type { OpenPr, Ticket } from "../shared/schemas.ts";
import { MODELS, PROJECT_KEYS, getProject, isProjectKey } from "./config.ts";

import type { AgentCoordinator } from "./agents/coordinator.ts";
import type { SlotManager } from "./agents/slotManager.ts";
import { buildTriagePrompt, parseTriageResult } from "./agents/triage.ts";
import type { Store, TicketPatch } from "./db/store.ts";
import type { ClientHub } from "./hub.ts";
import type { LiveLog } from "./liveLog.ts";
import { createLogger } from "./logger.ts";
import type { TriageOptions } from "./system/types.ts";
import { saveUpload } from "./uploads.ts";

const log = createLogger("triage");

interface TriageRunner {
  capturePane(sessionName: string): Promise<string>;
  runTriage(opts: TriageOptions): Promise<{ ok: boolean; output: string }>;
  listOpenPrs(repoPath: string): Promise<OpenPr[]>;
  listBranches(repoPath: string): Promise<string[]>;
  // Desktop self-update guards + build runner (dev desktop only).
  gitCurrentBranch(repoPath: string): Promise<string>;
  gitStatusClean(repoPath: string): Promise<boolean>;
  gitPullFastForward(repoPath: string, baseBranch: string): Promise<{ ok: boolean; reason: string }>;
  runProjectScript(slotPath: string, command: string, timeoutMs: number): Promise<{ ok: boolean; output: string }>;
}

interface RouteDeps {
  store: Store;
  hub: ClientHub;
  slots: SlotManager;
  coordinator: AgentCoordinator;
  system: TriageRunner;
  triageLog: LiveLog;
  projectRoot: string;
  /** Probed once at boot: is the Cursor headless CLI (Composer driver) usable? */
  composerAvailable: boolean;
  /** The real checkout root, for the self-update git guards + rebuild (desktop dev only). */
  repoRoot?: string;
  /** Tear down the server (not tmux) and relaunch the desktop app. Set only in dev desktop. */
  onRequestUpdate?: () => void;
}

/** Branch the self-update tracks; mismatch blocks the update (no auto-switch). */
const UPDATE_BASE_BRANCH = "main";
/** Generous bound for the pre-relaunch web + agents rebuild. */
const UPDATE_BUILD_TIMEOUT_MS = 300_000;
/** Let the {ok:true} response flush before tearing the server down + relaunching. */
const UPDATE_RELAUNCH_DELAY_MS = 200;
/** Keep only the tail of a failed build's output in the surfaced error. */
const BUILD_ERROR_TAIL = 600;

const stopHookSchema = z.object({
  ticketId: z.string(),
  sessionId: z.string().nullable().default(null),
});

const HTTP_BAD_REQUEST = 400;
const HTTP_NOT_FOUND = 404;
const HTTP_CONFLICT = 409;
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

/** Read-only triage: run the agent against the project repo, then persist + push the verdict. */
async function runTriageFlow(deps: RouteDeps, ticketId: string): Promise<void> {
  const { store, hub, system, triageLog } = deps;
  const ticket = store.getTicket(ticketId);
  if (!ticket || !isProjectKey(ticket.project)) return;
  const project = getProject(ticket.project);

  store.logEvent(ticketId, "triage_started", {});
  log.info("analyse démarrée", { ticketId, project: ticket.project });
  const prompt = buildTriagePrompt(ticket, project);
  const outcome = await system.runTriage({
    repoPath: project.repoPath,
    prompt,
    timeoutMs: TRIAGE_TIMEOUT_MS,
    onLine: (line) => triageLog.append(ticketId, line),
  });

  const parsed = outcome.ok ? parseTriageResult(outcome.output) : null;
  if (parsed) {
    const updated = store.updateTicket(ticketId, {
      triageStatus: "done",
      triageVerdict: parsed.verdict,
      triageReport: JSON.stringify(parsed),
    });
    hub.pushTicket(updated);
    store.logEvent(ticketId, "triage_done", { verdict: parsed.verdict });
    log.info("analyse terminée", { ticketId, verdict: parsed.verdict });
    return;
  }

  const updated = store.updateTicket(ticketId, {
    triageStatus: "failed",
    triageVerdict: null,
    triageReport: outcome.output.slice(0, TRIAGE_RAW_REPORT_MAX),
  });
  hub.pushTicket(updated);
  store.logEvent(ticketId, "triage_failed", { ok: outcome.ok });
  log.warn("analyse échouée", { ticketId, ok: outcome.ok });
}

export function createApiRoutes(deps: RouteDeps) {
  const { store, hub, slots, coordinator } = deps;

  return new Elysia({ prefix: "/api" })
    .get("/projects", () =>
      PROJECT_KEYS.map((key) => {
        const project = getProject(key);
        return {
          key,
          label: project.label,
          baseBranch: project.baseBranch,
          defaultAutoMerge: project.defaultAutoMerge,
        };
      }),
    )
    .get("/projects/:key/prs", async ({ params, set }) => {
      if (!isProjectKey(params.key)) return jsonError(set, HTTP_NOT_FOUND, "projet inconnu");
      const project = getProject(params.key);
      try {
        return await deps.system.listOpenPrs(project.repoPath);
      } catch (error) {
        return jsonError(set, HTTP_BAD_GATEWAY, error instanceof Error ? error.message : "échec gh pr list");
      }
    })
    .get("/projects/:key/branches", async ({ params, set }) => {
      if (!isProjectKey(params.key)) return jsonError(set, HTTP_NOT_FOUND, "projet inconnu");
      const project = getProject(params.key);
      try {
        return await deps.system.listBranches(project.repoPath);
      } catch (error) {
        return jsonError(set, HTTP_BAD_GATEWAY, error instanceof Error ? error.message : "échec listing branches");
      }
    })
    .get("/capabilities", () => ({
      composerAvailable: deps.composerAvailable,
      defaultModel: MODELS.implement,
      defaultEffort: MODELS.implementEffort,
      canUpdate: deps.onRequestUpdate != null && deps.repoRoot != null,
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
    .get("/tickets/:id", ({ params, set }) => {
      const ticket = store.getTicket(params.id);
      if (!ticket) return jsonError(set, HTTP_NOT_FOUND, "ticket introuvable");
      return { ticket, comments: store.listComments(params.id) };
    })
    .post("/tickets", ({ body, set }) => {
      const parsed = createTicketSchema.safeParse(body);
      if (!parsed.success) return jsonError(set, HTTP_BAD_REQUEST, parsed.error.message);
      if (!isProjectKey(parsed.data.project)) return jsonError(set, HTTP_BAD_REQUEST, "projet inconnu");
      // Title is optional: fall back to a slice of the description when left blank.
      const title =
        parsed.data.title.trim() || deriveTitleFromDescription(parsed.data.description);
      const ticket = store.createTicket({
        title,
        description: parsed.data.description,
        project: parsed.data.project,
        prdEnabled: parsed.data.prdEnabled,
        prDraft: parsed.data.prDraft,
        autoMerge: parsed.data.autoMerge,
        baseBranch: parsed.data.baseBranch,
        model: parsed.data.model,
        effort: parsed.data.effort,
        implementer: parsed.data.implementer,
      });
      if (!parsed.data.start) {
        hub.pushTicket(ticket);
        return ticket;
      }
      const started = store.updateTicket(ticket.id, { column: "implementing", stage: "queued" });
      hub.pushTicket(started);
      // Slot launch does slow git worktree setup; don't block the HTTP response on it.
      // Kick it off in the background and let the board update live (mirrors the review path).
      void slots.startTicket(ticket.id).catch((e) => {
        log.error("démarrage du ticket échoué", {
          ticketId: ticket.id,
          error: e instanceof Error ? e.message : String(e),
        });
      });
      return started;
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
          reviewDepth: parsed.data.depth,
          postComments: parsed.data.postComments,
        });
        hub.pushTicket(ticket);
        // Slot launch does slow git worktree setup; don't block the HTTP response on it
        // (it kept the dialog open). Kick it off in the background and let the board update live.
        void slots.startTicket(ticket.id).catch((e) => {
          log.error("démarrage de la review échoué", {
            ticketId: ticket.id,
            error: e instanceof Error ? e.message : String(e),
          });
        });
        created.push(ticket);
      }
      return created;
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
      const patch: TicketPatch = { ...parsed.data };
      // A blank title is not rejected: derive one from the (new or existing)
      // description so the title stays genuinely optional, as on creation.
      if (parsed.data.title !== undefined && parsed.data.title.trim() === "") {
        const derived = deriveTitleFromDescription(
          parsed.data.description ?? ticket.description,
        );
        // Never blank an existing title: fall back to it when nothing derivable.
        patch.title = derived || ticket.title;
      }
      const textChanged =
        (parsed.data.title !== undefined && parsed.data.title !== ticket.title) ||
        (parsed.data.description !== undefined && parsed.data.description !== ticket.description);
      // An edited ticket invalidates any previous feasibility verdict.
      if (textChanged && ticket.triageStatus !== "none") {
        patch.triageStatus = "none";
        patch.triageVerdict = null;
        patch.triageReport = null;
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
        hub.pushTicket(store.updateTicket(params.id, { column: "implementing" }));
        // retry() relaunches a failed/stalled/interrupted ticket in its held slot;
        // for a fresh ticket (no slot) it falls through to a normal startTicket.
        await slots.retry(params.id);
        return store.getTicket(params.id);
      }
      const moved = store.updateTicket(params.id, { column: target });
      hub.pushTicket(moved);
      return moved;
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
      const merged = store.updateTicket(params.id, { column: "merged" });
      hub.pushTicket(merged);
      store.logEvent(params.id, "merged", {});
      return merged;
    })
    .post("/tickets/:id/retry", async ({ params, set }) => {
      const ticket = store.getTicket(params.id);
      if (!ticket) return jsonError(set, HTTP_NOT_FOUND, "ticket introuvable");
      await slots.retry(params.id);
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
      if (ticket.triageStatus === "running") return jsonError(set, HTTP_CONFLICT, "analyse déjà en cours");
      deps.triageLog.clear(params.id);
      const running = store.updateTicket(params.id, {
        triageStatus: "running",
        triageVerdict: null,
        triageReport: null,
      });
      hub.pushTicket(running);
      void runTriageFlow(deps, params.id);
      return { started: true };
    })
    .get("/tickets/:id/triage-output", ({ params, set }) => {
      const ticket = store.getTicket(params.id);
      if (!ticket) return jsonError(set, HTTP_NOT_FOUND, "ticket introuvable");
      return { output: deps.triageLog.get(params.id) };
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
      if (ticket.slotId === null) return jsonError(set, HTTP_CONFLICT, "aucun slot actif");
      const phase = slots.getSetupPhase(params.id);
      const slot = store.getSlot(ticket.slotId);
      // Before the tmux session exists (worktree/install/spawn), surface the setup phase.
      if (!slot?.tmuxSession) return { output: "", phase };
      const output = await deps.system.capturePane(slot.tmuxSession);
      return { output, phase };
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
      coordinator.handleStopHook(parsed.data.ticketId, parsed.data.sessionId);
      return { ok: true };
    })
    .post("/internal/update", async ({ set }) => {
      const { onRequestUpdate, repoRoot, system } = deps;
      if (!onRequestUpdate || !repoRoot) return jsonError(set, HTTP_CONFLICT, "mise à jour indisponible");

      // Guards: never touch a job. Wrong branch / dirty tree / non-ff pull all abort cleanly.
      const branch = await system.gitCurrentBranch(repoRoot);
      if (branch !== UPDATE_BASE_BRANCH) {
        return jsonError(set, HTTP_BAD_REQUEST, `branche courante « ${branch || "?"} » ≠ ${UPDATE_BASE_BRANCH} : bascule dessus avant de mettre à jour`);
      }
      if (!(await system.gitStatusClean(repoRoot))) {
        return jsonError(set, HTTP_BAD_REQUEST, "arbre de travail sale : commite ou stashe tes changements avant de mettre à jour");
      }
      const pull = await system.gitPullFastForward(repoRoot, UPDATE_BASE_BRANCH);
      if (!pull.ok) return jsonError(set, HTTP_BAD_REQUEST, pull.reason);

      // Rebuild before cutting the window: the relauncher only re-runs `electrobun dev`, which copies
      // these fresh artifacts into the new bundle (it does not run Vite itself). A build timeout
      // rejects (withTimeout), so wrap it: the curated 502 beats a generic 500, and no relaunch fires.
      try {
        const web = await system.runProjectScript(repoRoot, "bun run build:web", UPDATE_BUILD_TIMEOUT_MS);
        if (!web.ok) return jsonError(set, HTTP_BAD_GATEWAY, `build:web a échoué : ${web.output.trim().slice(-BUILD_ERROR_TAIL)}`);
        const agents = await system.runProjectScript(repoRoot, "bun run build:agents", UPDATE_BUILD_TIMEOUT_MS);
        if (!agents.ok) return jsonError(set, HTTP_BAD_GATEWAY, `build:agents a échoué : ${agents.output.trim().slice(-BUILD_ERROR_TAIL)}`);
      } catch (error) {
        return jsonError(set, HTTP_BAD_GATEWAY, `build interrompu : ${error instanceof Error ? error.message : String(error)}`);
      }

      log.info("mise à jour validée, relance imminente", { repoRoot, branch });
      // Defer so this {ok:true} flushes before the server stops and the process exits.
      setTimeout(() => onRequestUpdate(), UPDATE_RELAUNCH_DELAY_MS);
      return { ok: true };
    });
}
