import { z } from "zod";

export const DEPENDENCY_LAUNCH_EVENT = "dependency_launch";
export const DIRECT_PUSHED_EVENT = "direct_pushed";
export const dependencyLaunchSchema = z.object({
  version: z.literal(1),
  parentTicketId: z.string().min(1),
  baseBranch: z.string().min(1),
  branch: z.string().min(1),
  project: z.string().min(1),
});
export type DependencyLaunch = z.infer<typeof dependencyLaunchSchema>;
export const directPushedSchema = z.object({ baseBranch: z.string().min(1) });
