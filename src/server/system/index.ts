import { FakeSystemAdapter } from "./fake.ts";
import { RealSystemAdapter } from "./real.ts";
import type { SystemAdapter } from "./types.ts";

export type { SystemAdapter } from "./types.ts";

/**
 * Dry-run is the DEFAULT. The real adapter only activates when the operator
 * explicitly sets KANBAN_DRY_RUN=0. This keeps the dev/test path side-effect free.
 */
export function createSystemAdapter(): SystemAdapter {
  const dryRun = process.env.KANBAN_DRY_RUN !== "0";
  if (dryRun) return new FakeSystemAdapter();
  return new RealSystemAdapter();
}
