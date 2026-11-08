import { z } from "zod";

export const applicationVersionInputSchema = z.object({}).strict();
export const applicationVersionSchema = z.object({
  installation: z.enum(["desktop", "source"]),
  installed: z.string().nullable(),
  available: z.string().nullable(),
  updatePageUrl: z.string().url().nullable(),
  installedUnavailableReason: z.literal("installed_metadata_unavailable").nullable(),
  targetUnavailableReason: z.enum(["target_authorization_required", "target_metadata_unavailable", "target_not_configured"]).nullable(),
});
export type ApplicationVersion = z.infer<typeof applicationVersionSchema>;
