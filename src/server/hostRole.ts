const CLOUD_HOST_ROLE = "cloud";

export const PR_ONLY_MESSAGE = "This cloud host only delivers pull requests: merging and direct pushes are disabled.";

export function isCloudHost(): boolean {
  return process.env.KANBAN_HOST_ROLE === CLOUD_HOST_ROLE;
}

export function deliveryPolicyError(input: { autoMerge?: boolean; directPush?: boolean; autonomous?: boolean; autonomousDelivery?: "pr_only" | "merge" | null }): string | null {
  if (!isCloudHost()) return null;
  if (input.autoMerge || input.directPush || (input.autonomous && input.autonomousDelivery === "merge")) return PR_ONLY_MESSAGE;
  return null;
}
