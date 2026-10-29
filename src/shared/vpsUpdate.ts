import { z } from "zod";

export const vpsUpdateSchema = z.object({
  phase: z.enum(["idle", "resolving", "running", "succeeded", "failed", "interrupted"]),
  target: z.string().regex(/^[0-9a-f]{40}$/).nullable(),
  progress: z.string().max(512),
  updatedAt: z.number(),
  exitCode: z.number().int().nullable(),
});
export type VpsUpdateStatus = z.infer<typeof vpsUpdateSchema>;
export type VpsUpdateAction = "status" | "start";
