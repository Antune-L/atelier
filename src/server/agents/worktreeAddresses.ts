import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { WorktreeAddress } from "../../shared/schemas.ts";
import { getProject, isProjectKey, SLOTS_ROOT } from "../config.ts";

const OFFSET_FILE = ".wt-offset";
/** A `.wt-offset` holds a single non-negative integer (the per-worktree port offset). */
const OFFSET_PATTERN = /^\d+$/;

/**
 * Resolve the clickable addresses of a running standalone worktree session from the project's
 * `worktreePorts` config and the per-slot `.wt-offset` file. Self-contained to avoid an import cycle
 * with the store. Returns [] when the project has no ports or the offset file is missing/invalid.
 */
export function computeWorktreeAddresses(slotId: number, project: string): WorktreeAddress[] {
  if (!isProjectKey(project)) return [];
  const worktreePorts = getProject(project).worktreePorts;
  if (!worktreePorts || worktreePorts.length === 0) return [];

  let raw: string;
  try {
    raw = readFileSync(join(SLOTS_ROOT, `slot-${slotId}`, OFFSET_FILE), "utf8").trim();
  } catch {
    return [];
  }
  if (!OFFSET_PATTERN.test(raw)) return [];
  const offset = Number(raw);

  return worktreePorts.map((p) => ({ label: p.label, url: `http://localhost:${p.base + offset}` }));
}
