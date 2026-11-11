import { z } from "zod";

import { previewBranchSchema, previewCleanupStatusSchema, previewDesiredStateSchema, previewStatusSchema } from "./preview.ts";

const MAX_REQUEST_ID_LENGTH = 200;

export const BRANCH_PREVIEW_ERROR_CODES = ["PROJECT_NOT_FOUND", "UNSUPPORTED_PROVIDER", "COOLIFY_NOT_CONFIGURED", "PREVIEWS_DISABLED", "RECIPE_NOT_READY", "READINESS_CHECK_FAILED", "REQUEST_CONFLICT"] as const;
export type BranchPreviewErrorCode = typeof BRANCH_PREVIEW_ERROR_CODES[number];

const requestIdSchema = z.string().trim().min(1).max(MAX_REQUEST_ID_LENGTH).describe("Stable caller identifier: repeating it returns the preview of its first call instead of creating another one.");

export const createBranchPreviewInputSchema = z.object({
  projectKey: z.string().min(1).describe("Key of a project returned by list_projects."),
  branch: previewBranchSchema.describe("Existing remote branch to deploy."),
  requestId: requestIdSchema,
}).strict();

export const getBranchPreviewInputSchema = z.object({
  previewId: z.string().min(1).optional().describe("Identifier returned by create_branch_preview."),
  requestId: requestIdSchema.optional(),
}).strict().refine((input) => (input.previewId === undefined) !== (input.requestId === undefined), "Provide exactly one of previewId or requestId.");

export const branchPreviewRequestSchema = z.object({ project: z.string().min(1), branch: previewBranchSchema, previewId: z.string().min(1) }).strict();
export type BranchPreviewRequest = z.infer<typeof branchPreviewRequestSchema>;

export const branchPreviewSchema = z.object({
  id: z.string(),
  project: z.string(),
  branch: z.string(),
  status: previewStatusSchema.describe("Deployment state; ready means the URL serves deployedSha. failed and interrupted carry the reason in error."),
  desiredState: previewDesiredStateSchema.describe("stopped once the preview was deleted, expired or replaced by a newer remote SHA."),
  url: z.string().nullable().describe("HTTPS preview URL, or null until Coolify assigns it."),
  requestedSha: z.string().describe("Remote branch commit pinned when the preview was launched."),
  deployedSha: z.string().nullable().describe("Commit Coolify confirmed as deployed, or null before confirmation."),
  error: z.string().nullable().describe("Failure reason, or null."),
  cleanupStatus: previewCleanupStatusSchema,
  expiresAt: z.number().nullable().describe("Epoch milliseconds when the preview is deleted automatically."),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export const branchPreviewOutputSchema = z.object({ preview: branchPreviewSchema.nullable(), dryRun: z.boolean() });
