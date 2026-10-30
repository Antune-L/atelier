import { realpath } from "node:fs/promises";
import { basename, extname, isAbsolute, join, relative } from "node:path";

import { Elysia } from "elysia";
import { nanoid } from "nanoid";
import { z } from "zod";

import { getErrorMessage } from "../shared/errors.ts";
import { isRemoteTicket, needsRemoteApproval } from "../shared/startBlocker.ts";
import { createQualityFollowUpSchema, manualQualityEvidenceSchema, setQualityCriteriaSchema, startQualityIterationSchema, validateQualitySchema } from "../shared/quality.ts";

import type { QualityManager } from "./agents/qualityManager.ts";
import type { Store } from "./db/store.ts";
import { frozenAgentsOf, TicketOperationError } from "./ticketOperations.ts";
import type { TicketOperations } from "./ticketOperations.ts";

const manualStartSchema = validateQualitySchema.extend({ requestId: z.string().trim().min(1).max(200).optional() });
const historyQuerySchema = z.object({ afterSequence: z.coerce.number().int().nonnegative().optional(), limit: z.coerce.number().int().positive().max(200).optional() });

const requestQuerySchema = z.object({ beforeCreatedAt: z.coerce.number().int().nonnegative().optional(), beforeRequestId: z.string().min(1).optional(), limit: z.coerce.number().int().positive().max(200).optional() }).refine((value) => (value.beforeCreatedAt === undefined) === (value.beforeRequestId === undefined));

const HTTP_ACCEPTED = 202;
const HTTP_BAD_REQUEST = 400;
const HTTP_NOT_FOUND = 404;
const HTTP_CONFLICT = 409;
const HTTP_UNAVAILABLE = 503;
const MAX_ARTIFACT_BYTES = 20 * 1024 * 1024;
const ARTIFACT_CONTENT_TYPES: Record<string, string> = {
  ".json": "application/json",
  ".txt": "text/plain; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

interface QualityRouteDeps {
  store: Store;
  quality?: QualityManager;
  qualityArtifactDirectory?: string;
  ticketOperations?: TicketOperations;
}

async function artifactResponse(directory: string, runId: string, artifactPath: string, set: { status?: number | string }): Promise<Response | { error: string }> {
  try {
    const qualityRoot = await realpath(directory);
    const artifactRoot = await realpath(join(directory, runId));
    const runWithinRoot = relative(qualityRoot, artifactRoot);
    if (runWithinRoot.startsWith("..") || isAbsolute(runWithinRoot) || !runWithinRoot) {
      set.status = HTTP_NOT_FOUND;
      return { error: "Evidence artifact is unavailable." };
    }
    const filePath = await realpath(artifactPath);
    const pathWithinRun = relative(artifactRoot, filePath);
    if (pathWithinRun.startsWith("..") || isAbsolute(pathWithinRun) || !pathWithinRun) {
      set.status = HTTP_NOT_FOUND;
      return { error: "Evidence artifact is unavailable." };
    }
    const file = Bun.file(filePath);
    if (file.size > MAX_ARTIFACT_BYTES) {
      set.status = HTTP_BAD_REQUEST;
      return { error: "Evidence artifact exceeds the download limit." };
    }
    const contentType = ARTIFACT_CONTENT_TYPES[extname(filePath).toLowerCase()];
    const disposition = contentType ? "inline" : "attachment";
    return new Response(file, {
      headers: {
        "content-type": contentType ?? "application/octet-stream",
        "content-disposition": `${disposition}; filename="${basename(filePath).replace(/[^a-zA-Z0-9._-]/g, "_")}"`,
        "x-content-type-options": "nosniff",
        "cache-control": "no-store",
      },
    });
  } catch {
    set.status = HTTP_NOT_FOUND;
    return { error: "Evidence artifact is unavailable." };
  }
}

export function createQualityRoutes({ store, quality, qualityArtifactDirectory, ticketOperations }: QualityRouteDeps) {
  const response = async (ticketId: string) => ({
    quality: quality?.get(ticketId),
    gate: await quality?.gate(ticketId, "reservations"),
    iterationActions: await quality?.iterationActions(ticketId),
  });

  return new Elysia({ prefix: "/tickets/:id/quality" })
    .onBeforeHandle(({ params, request, set }) => {
      if (!quality) {
        set.status = HTTP_UNAVAILABLE;
        return { error: "Quality validation is unavailable." };
      }
      const ticket = store.getTicket(params.id);
      if (!ticket) {
        set.status = HTTP_NOT_FOUND;
        return { error: "Ticket not found." };
      }
      if (ticket.kind !== "feature") {
        set.status = HTTP_BAD_REQUEST;
        return { error: "Quality validation is available for feature tickets only." };
      }
      // Quality planners and validators are not confined: unapproved remote text must not reach them.
      if (request.method !== "GET" && needsRemoteApproval(ticket)) {
        set.status = HTTP_CONFLICT;
        return { error: "Approve this remote card before running quality validation." };
      }
    })
    .onError(({ error, set }) => {
      set.status = HTTP_CONFLICT;
      return { error: getErrorMessage(error) };
    })
    .get("", ({ params }) => response(params.id))
    .get("/requests", ({ params, query, set }) => {
      const parsed = requestQuerySchema.safeParse(query);
      if (!parsed.success) { set.status = HTTP_BAD_REQUEST; return { error: "Invalid request pagination." }; }
      return store.listQualityRequestsPage(params.id, parsed.data);
    })
    .get("/requests/:requestId/actions", ({ params, query, set }) => {
      const request = store.getQualityRequest(params.requestId);
      const parsed = historyQuerySchema.safeParse(query);
      if (!request || request.ticketId !== params.id) { set.status = HTTP_NOT_FOUND; return { error: "Quality request not found." }; }
      if (!parsed.success) { set.status = HTTP_BAD_REQUEST; return { error: "Invalid history pagination." }; }
      return store.listQualityActions(params.id, { requestId: params.requestId, ...parsed.data });
    })
    .get("/runs/:runId/actions", ({ params, query, set }) => {
      const parsed = historyQuerySchema.safeParse(query);
      if (!parsed.success) { set.status = HTTP_BAD_REQUEST; return { error: "Invalid history pagination." }; }
      return store.listQualityActions(params.id, { runId: params.runId, ...parsed.data });
    })
    .get("/evidence/:evidenceId/artifact", async ({ params, set }) => {
      const evidence = quality?.get(params.id).evidence.find((item) => item.id === params.evidenceId);
      if (!evidence?.artifactPath || !qualityArtifactDirectory) {
        set.status = HTTP_NOT_FOUND;
        return { error: "Evidence artifact is unavailable." };
      }
      return artifactResponse(qualityArtifactDirectory, evidence.runId, evidence.artifactPath, set);
    })
    .get("/actions/:actionId/artifacts/:index", async ({ params, set }) => {
      const action = store.getQualityAction(params.id, params.actionId);
      const index = z.coerce.number().int().nonnegative().safeParse(params.index);
      const path = index.success ? action?.artifactPaths[index.data] : undefined;
      if (!action?.runId || !path || !qualityArtifactDirectory) { set.status = HTTP_NOT_FOUND; return { error: "Action artifact is unavailable." }; }
      return artifactResponse(qualityArtifactDirectory, action.runId, path, set);
    })
    .post("/criteria", async ({ params, body, set }) => {
      const parsed = setQualityCriteriaSchema.safeParse(body);
      if (!parsed.success) {
        set.status = HTTP_BAD_REQUEST;
        return { error: parsed.error.message };
      }
      quality?.setCriteria(params.id, parsed.data.criteria, "user", parsed.data.mode);
      return response(params.id);
    })
    .post("/preflight", ({ params }) => quality?.preflight(params.id))
    .post("/iterations", async ({ params, body, set }) => {
      const parsed = startQualityIterationSchema.safeParse(body);
      if (!parsed.success) {
        set.status = HTTP_BAD_REQUEST;
        return { error: parsed.error.message };
      }
      const iteration = await quality?.startQualityIteration(params.id, parsed.data);
      set.status = HTTP_ACCEPTED;
      return { iteration };
    })
    .post("/follow-ups", async ({ params, body, set }) => {
      const parsed = createQualityFollowUpSchema.safeParse(body);
      if (!parsed.success) {
        set.status = HTTP_BAD_REQUEST;
        return { error: parsed.error.message };
      }
      if (!quality) return;
      const draft = quality.followUpDraft(params.id, parsed.data);
      let followUp = draft.existing ? { created: false, ticketId: draft.existing.ticketId, title: draft.existing.title, project: draft.existing.project } : null;
      if (!followUp) {
        if (!ticketOperations) {
          set.status = HTTP_UNAVAILABLE;
          return { error: "Correction card creation is unavailable." };
        }
        try {
          const source = store.getTicket(params.id);
          const result = ticketOperations.createTodoTicket(
            { requestId: draft.requestId, title: draft.title, description: draft.description, project: draft.project },
            source !== null && isRemoteTicket(source) ? { origin: source.origin, frozenAgents: frozenAgentsOf(source) } : {},
          );
          followUp = { created: result.created, ticketId: result.ticket.id, title: result.ticket.title, project: result.ticket.project };
        } catch (error) {
          if (error instanceof TicketOperationError && error.code !== "CONFLICT") {
            set.status = error.code === "NOT_FOUND" ? HTTP_NOT_FOUND : HTTP_BAD_REQUEST;
            return { error: error.message };
          }
          throw error;
        }
      }
      return { ...await response(params.id), followUp };
    })
    .post("/checks", async ({ params, body, set }) => {
      const parsed = z.object({ requestId: z.string().trim().min(1).max(200).optional() }).safeParse(body ?? {});
      if (!parsed.success) { set.status = HTTP_BAD_REQUEST; return { error: "Invalid quality request." }; }
      const run = await quality?.manualStart(params.id, "checks", null, parsed.data.requestId ?? nanoid());
      set.status = HTTP_ACCEPTED;
      return { run };
    })
    .post("/validate", async ({ params, body, set }) => {
      const parsed = manualStartSchema.safeParse(body);
      if (!parsed.success) {
        set.status = HTTP_BAD_REQUEST;
        return { error: parsed.error.message };
      }
      const run = await quality?.manualStart(params.id, "behavior", parsed.data.provider, parsed.data.requestId ?? nanoid());
      set.status = HTTP_ACCEPTED;
      return { run };
    })
    .post("/verify", async ({ params, body, set }) => {
      const parsed = manualStartSchema.safeParse(body);
      if (!parsed.success) {
        set.status = HTTP_BAD_REQUEST;
        return { error: parsed.error.message };
      }
      const run = await quality?.manualStart(params.id, "full", parsed.data.provider, parsed.data.requestId ?? nanoid());
      set.status = HTTP_ACCEPTED;
      return { run };
    })
    .post("/combined", async ({ params, body, set }) => {
      const parsed = manualStartSchema.safeParse(body);
      if (!parsed.success) {
        set.status = HTTP_BAD_REQUEST;
        return { error: parsed.error.message };
      }
      const run = await quality?.manualStart(params.id, "combined", parsed.data.provider, parsed.data.requestId ?? nanoid());
      set.status = HTTP_ACCEPTED;
      return { run };
    })
    .post("/functional", async ({ params, body, set }) => {
      const parsed = manualStartSchema.safeParse(body);
      if (!parsed.success) {
        set.status = HTTP_BAD_REQUEST;
        return { error: parsed.error.message };
      }
      const run = await quality?.manualStart(params.id, "functional", parsed.data.provider, parsed.data.requestId ?? nanoid());
      set.status = HTTP_ACCEPTED;
      return { run };
    })
    .post("/cancel", async ({ params }) => {
      await quality?.cancel(params.id);
      return response(params.id);
    })
    .post("/evidence", async ({ params, body, set }) => {
      const parsed = manualQualityEvidenceSchema.safeParse(body);
      if (!parsed.success) {
        set.status = HTTP_BAD_REQUEST;
        return { error: parsed.error.message };
      }
      await quality?.recordManualEvidence(params.id, parsed.data);
      return response(params.id);
    });
}
