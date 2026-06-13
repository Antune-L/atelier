import { PROJECT_KEYS, getProject } from "./config.ts";

import type { Store } from "./db/store.ts";
import { slotPath } from "./agents/slotManager.ts";
import { createLogger } from "./logger.ts";
import type { SystemAdapter } from "./system/index.ts";
import { SLOT_COUNT } from "../shared/constants.ts";

const SETUP_DONE_KEY = "first_boot_setup";

const log = createLogger("boot");

/**
 * First-boot setup, gated behind KANBAN_SETUP=1. Side effects:
 *  - seed hasTrustDialogAccepted in ~/.claude.json for the 3 slot paths
 *  - add .claude/ and .mcp.json to each repo's .git/info/exclude
 * With the fake adapter (dry-run) these are no-ops that only log.
 */
export async function runFirstBootSetup(store: Store, system: SystemAdapter): Promise<void> {
  const enabled = process.env.KANBAN_SETUP === "1";
  if (!enabled) {
    log.info("setup premier-boot ignoré (KANBAN_SETUP=1 pour l'activer)");
    return;
  }
  if (store.getMeta(SETUP_DONE_KEY) === "1") {
    log.info("setup premier-boot déjà effectué");
    return;
  }

  const slotPaths = Array.from({ length: SLOT_COUNT }, (_, i) => slotPath(i + 1));
  await system.seedTrustForSlots(slotPaths);
  for (const key of PROJECT_KEYS) {
    await system.excludeAgentFilesInRepo(getProject(key).repoPath);
  }

  store.setMeta(SETUP_DONE_KEY, "1");
  log.info("setup premier-boot terminé");
}
