import { Elysia } from "elysia";
import { z } from "zod";

import { getErrorMessage } from "../shared/errors.ts";
import { createBranchPreviewSchema, preparePreviewSchema, previewBranchSchema, updatePreviewProjectSettingsSchema, updatePreviewSettingsSchema } from "../shared/preview.ts";

import type { PreviewManager } from "./previewManager.ts";

const HTTP_BAD_REQUEST = 400;
const HTTP_CONFLICT = 409;
const HTTP_ACCEPTED = 202;
const VALIDATION_INPUT_SCHEMA = z.object({ provider: z.enum(["claude", "codex"]) }).strict();

export function createPreviewRoutes({ previews }: { previews: PreviewManager }) {
  return new Elysia()
    .onError(({ error, set }) => {
      set.status = HTTP_CONFLICT;
      return { error: getErrorMessage(error) };
    })
    .get("/previews", () => ({ previews: previews.list() }))
    .get("/previews/:previewId", ({ params }) => ({ preview: previews.get(params.previewId) }))
    .get("/projects/:key/preview/readiness", async ({ params, query, set }) => {
      const branch = previewBranchSchema.optional().safeParse(query.branch);
      if (!branch.success) { set.status = HTTP_BAD_REQUEST; return { error: "Invalid preview branch." }; }
      return { readiness: await previews.readiness(params.key, branch.data) };
    })
    .post("/projects/:key/previews", async ({ params, body, set }) => {
      const parsed = createBranchPreviewSchema.safeParse(body);
      if (!parsed.success) { set.status = HTTP_BAD_REQUEST; return { error: "Select a remote branch for this preview." }; }
      const preview = await previews.createBranch(params.key, parsed.data.branch);
      set.status = HTTP_ACCEPTED;
      return { preview };
    })
    .post("/previews/:previewId/redeploy", async ({ params, set }) => {
      const preview = await previews.redeploy(params.previewId);
      set.status = HTTP_ACCEPTED;
      return { preview };
    })
    .get("/settings/previews", () => ({ settings: previews.settings }))
    .patch("/settings/previews", ({ body, set }) => {
      const parsed = updatePreviewSettingsSchema.safeParse(body);
      if (!parsed.success) { set.status = HTTP_BAD_REQUEST; return { error: "Invalid preview settings." }; }
      return { settings: previews.updateSettings(parsed.data) };
    })
    .post("/settings/previews/test", () => previews.testConnection())
    .get("/projects/:key/preview", ({ params }) => ({ settings: previews.projectSettings(params.key) }))
    .get("/projects/:key/preview/source", async ({ params }) => ({ resolution: await previews.githubSource(params.key) }))
    .patch("/projects/:key/preview", ({ params, body, set }) => {
      const parsed = updatePreviewProjectSettingsSchema.omit({ preparationTicketId: true }).safeParse(body);
      if (!parsed.success) { set.status = HTTP_BAD_REQUEST; return { error: "Invalid project preview settings." }; }
      return { settings: previews.updateProjectSettings(params.key, parsed.data) };
    })
    .post("/projects/:key/preview/prepare", ({ params, body, set }) => {
      const parsed = preparePreviewSchema.safeParse(body ?? {});
      if (!parsed.success) { set.status = HTTP_BAD_REQUEST; return { error: "Invalid preview preparation request." }; }
      return previews.prepare(params.key, parsed.data);
    })
    .get("/tickets/:id/preview", ({ params }) => previews.ticket(params.id))
    .post("/tickets/:id/preview", async ({ params, set }) => {
      const preview = await previews.create(params.id);
      set.status = HTTP_ACCEPTED;
      return { preview };
    })
    .delete("/previews/:previewId", async ({ params, set }) => {
      const preview = await previews.stop(params.previewId);
      set.status = HTTP_ACCEPTED;
      return { preview };
    })
    .post("/previews/:previewId/cleanup", async ({ params, set }) => {
      const preview = await previews.retryCleanup(params.previewId);
      set.status = HTTP_ACCEPTED;
      return { preview };
    })
    .post("/previews/:previewId/validate", async ({ params, body, set }) => {
      const parsed = VALIDATION_INPUT_SCHEMA.safeParse(body);
      if (!parsed.success) { set.status = HTTP_BAD_REQUEST; return { error: "Select Claude or Codex for preview validation." }; }
      const run = await previews.validate(params.previewId, parsed.data.provider);
      set.status = HTTP_ACCEPTED;
      return { run };
    });
}
