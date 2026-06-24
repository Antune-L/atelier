import { watch } from "node:fs";
import type { FSWatcher } from "node:fs";
import { join } from "node:path";

import { getErrorMessage } from "../../shared/errors.ts";
import { SLOTS_ROOT } from "../config.ts";
import { createLogger } from "../logger.ts";

import { OFFSET_FILE } from "./worktreeAddresses.ts";

/** Coalesce a burst of write events on `.wt-offset` into a single push. */
const DEBOUNCE_MS = 150;

const log = createLogger("wt-addr-watch");

interface SlotWatch {
  watcher: FSWatcher;
  timer: ReturnType<typeof setTimeout> | null;
}

/**
 * Watches the `.wt-offset` file of active standalone worktree session slots and fires a callback
 * when it appears or changes. The dev server writes `.wt-offset` AFTER the session is broadcast, so
 * without this the clickable addresses (derived from the offset) never reach already-connected
 * clients. The file may not exist when watching starts, so we watch the SLOT DIRECTORY and filter on
 * the offset filename rather than watching the file itself.
 */
export class WorktreeAddressWatcher {
  private readonly watches = new Map<number, SlotWatch>();

  constructor(private readonly onOffsetChange: () => void) {}

  /** Start (or restart) watching a slot's `.wt-offset`. Idempotent: replaces any existing watcher. */
  start(slotId: number): void {
    this.stop(slotId);
    const dir = join(SLOTS_ROOT, `slot-${slotId}`);
    try {
      const watcher = watch(dir, (_event, filename) => {
        // Some platforms report a null filename; over-firing is harmless (the re-read is cheap and
        // debounced), so only drop events explicitly naming a different file.
        if (filename != null && filename !== OFFSET_FILE) return;
        this.scheduleFire(slotId);
      });
      // A missing slot dir surfaces asynchronously as an error event rather than a throw; log and
      // drop the watcher instead of crashing the backend.
      watcher.on("error", (error) => {
        log.warn("watcher .wt-offset en erreur", { slotId, error: getErrorMessage(error) });
        this.stop(slotId);
      });
      this.watches.set(slotId, { watcher, timer: null });
    } catch (error) {
      log.warn("impossible de surveiller .wt-offset", { slotId, error: getErrorMessage(error) });
    }
  }

  /** Stop watching a slot and cancel any pending debounced fire. */
  stop(slotId: number): void {
    const entry = this.watches.get(slotId);
    if (!entry) return;
    if (entry.timer) clearTimeout(entry.timer);
    entry.watcher.close();
    this.watches.delete(slotId);
  }

  /** Tear down every watcher (app shutdown) so no fs watchers leak past window close. */
  stopAll(): void {
    for (const slotId of [...this.watches.keys()]) this.stop(slotId);
  }

  private scheduleFire(slotId: number): void {
    const entry = this.watches.get(slotId);
    if (!entry) return;
    if (entry.timer) clearTimeout(entry.timer);
    entry.timer = setTimeout(() => {
      entry.timer = null;
      // The callback runs in a bare timer context: an escaping throw (e.g. a failing ws.send) would
      // be an unhandled exception, so swallow and log it instead.
      try {
        this.onOffsetChange();
      } catch (error) {
        log.warn("push des adresses worktree échoué", { slotId, error: getErrorMessage(error) });
      }
    }, DEBOUNCE_MS);
  }
}
