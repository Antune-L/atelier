import { z } from "zod";

export const DEPENDENCY_LAUNCH_EVENT = "dependency_launch";
export const DEPENDENCY_PR_OBSERVATION_EVENT = "dependency_pr_observation";
export const DEPENDENCY_STATUS_EVENT = "dependency_status";
export const DIRECT_PUSHED_EVENT = "direct_pushed";
const dependencyLaunchFields = {
  parentTicketId: z.string().min(1),
  baseBranch: z.string().min(1),
  branch: z.string().min(1),
  project: z.string().min(1),
};
export const dependencyLaunchSchema = z.discriminatedUnion("version", [
  z.object({ version: z.literal(1), ...dependencyLaunchFields }),
  z.object({ version: z.literal(2), ...dependencyLaunchFields, forkSha: z.string().min(1) }),
]);
export type DependencyLaunch = z.infer<typeof dependencyLaunchSchema>;
export const dependencyPrObservationSchema = z.object({
  version: z.literal(1),
  prUrl: z.string().min(1),
  project: z.string().min(1),
  branch: z.string().nullable(),
  state: z.enum(["open", "merged", "closed"]),
  baseBranch: z.string().nullable(),
  mergedAt: z.string().nullable(),
  mergeCommitSha: z.string().nullable(),
  headSha: z.string().nullable(),
});
export type DependencyPrObservation = z.infer<typeof dependencyPrObservationSchema>;
export const dependencyStatusSchema = z.object({
  stale: z.boolean(),
  reason: z.string().nullable(),
  newBaseBranch: z.string().nullable(),
  manualCommand: z.string().nullable(),
});
export type DependencyStatus = z.infer<typeof dependencyStatusSchema>;
export const directPushedSchema = z.object({ baseBranch: z.string().min(1) });
