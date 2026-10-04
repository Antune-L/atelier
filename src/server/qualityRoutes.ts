import { realpath } from "node:fs/promises";
import { basename, extname, isAbsolute, join, relative } from "node:path";

import { Elysia } from "elysia";

import { getErrorMessage } from "../shared/errors.ts";
import { createQualityFollowUpSchema, manualQualityEvidenceSchema, setQualityCriteriaSchema, startQualityIterationSchema, validateQualitySchema } from "../shared/quality.ts";

import type { QualityManager } from "./agents/qualityManager.ts";
import type { Store } from "./db/store.ts";
import { TicketOperationError } from "./ticketOperations.ts";
import type { TicketOperations } from "./ticketOperations.ts";

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

export function createQualityRoutes({ store, quality, qualityArtifactDirectory, ticketOperations }: QualityRouteDeps) {
  const response = async (ticketId: string) => ({
    quality: quality?.get(ticketId),
    gate: await quality?.gate(ticketId, "reservations"),
    iterationActions: await quality?.iterationActions(ticketId),
  });

  return new Elysia({ prefix: "/tickets/:id/quality" })
    .onBeforeHandle(({ params, set }) => {
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
    })
    .onError(({ error, set }) => {
      set.status = HTTP_CONFLICT;
      return { error: getErrorMessage(error) };
    })
    .get("", ({ params }) => response(params.id))
    .get("/evidence/:evidenceId/artifact", async ({ params, set }) => {
      const evidence = quality?.get(params.id).evidence.find((item) => item.id === params.evidenceId);
      if (!evidence?.artifactPath || !qualityArtifactDirectory) {
        set.status = HTTP_NOT_FOUND;
        return { error: "Evidence artifact is unavailable." };
      }
      try {
        const qualityRoot = await realpath(qualityArtifactDirectory);
        const artifactRoot = await realpath(join(qualityArtifactDirectory, evidence.runId));
        const runWithinRoot = relative(qualityRoot, artifactRoot);
        if (runWithinRoot.startsWith("..") || isAbsolute(runWithinRoot) || !runWithinRoot) {
          set.status = HTTP_NOT_FOUND;
          return { error: "Evidence artifact is unavailable." };
        }
        const filePath = await realpath(evidence.artifactPath);
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
          const result = ticketOperations.createTodoTicket({ requestId: draft.requestId, title: draft.title, description: draft.description, project: draft.project });
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
    .post("/checks", async ({ params, set }) => {
      const run = await quality?.runChecks(params.id);
      set.status = HTTP_ACCEPTED;
      return { run };
    })
    .post("/validate", async ({ params, body, set }) => {
      const parsed = validateQualitySchema.safeParse(body);
      if (!parsed.success) {
        set.status = HTTP_BAD_REQUEST;
        return { error: parsed.error.message };
      }
      const run = await quality?.validate(params.id, parsed.data.provider);
      set.status = HTTP_ACCEPTED;
      return { run };
    })
    .post("/verify", async ({ params, body, set }) => {
      const parsed = validateQualitySchema.safeParse(body);
      if (!parsed.success) {
        set.status = HTTP_BAD_REQUEST;
        return { error: parsed.error.message };
      }
      const run = await quality?.verify(params.id, parsed.data.provider);
      set.status = HTTP_ACCEPTED;
      return { run };
    })
    .post("/functional", async ({ params, body, set }) => {
      const parsed = validateQualitySchema.safeParse(body);
      if (!parsed.success) {
        set.status = HTTP_BAD_REQUEST;
        return { error: parsed.error.message };
      }
      const run = await quality?.testFeature(params.id, parsed.data.provider);
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
