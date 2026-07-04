import { homedir } from "node:os";

import type { AutomationRunStatus } from "../../shared/constants.ts";
import type { Automation } from "../../shared/schemas.ts";
import type { Store } from "../db/store.ts";
import type { ClientHub } from "../hub.ts";
import { createLogger } from "../logger.ts";
import type { SystemAdapter } from "../system/types.ts";

const log = createLogger("automation");

const MS_PER_MINUTE = 60_000;

/** Reason stamped on runs left `running` by a crash/shutdown, reconciled at the next boot. */
const STALE_RUN_REASON = "Interrompu par un redémarrage de l'application.";

/**
 * Owns the automation timers and orchestrates each background run + its history. Automations run a
 * free-text prompt from the user's home dir via the SystemAdapter one-shot query — they are NOT
 * routed through the slot/ticket pipeline.
 */
export class AutomationManager {
  private readonly timers = new Map<string, ReturnType<typeof setInterval>>();
  private readonly running = new Set<string>();
  private stopped = false;

  constructor(
    private readonly store: Store,
    private readonly system: SystemAdapter,
    private readonly hub: ClientHub,
  ) {}

  /** Called once at boot AFTER recovery: fire on_launch automations and schedule recurring ones. */
  start(): void {
    const swept = this.store.failStaleAutomationRuns(STALE_RUN_REASON);
    if (swept > 0) {
      log.info("exécutions orphelines marquées échouées", { swept });
      this.pushAutomations();
    }
    const automations = this.store.listAutomations();
    let launched = 0;
    let scheduled = 0;
    for (const automation of automations) {
      if (!automation.enabled) continue;
      if (automation.trigger === "on_launch") {
        launched += 1;
        void this.run(automation.id);
      } else if (automation.trigger === "recurring" && automation.intervalMinutes !== null) {
        this.schedule(automation);
        scheduled += 1;
      }
    }
    log.info("automations démarrées", { total: automations.length, launched, scheduled });
  }

  private schedule(automation: Automation): void {
    if (automation.intervalMinutes === null) return;
    this.unschedule(automation.id);
    const timer = setInterval(() => void this.run(automation.id), automation.intervalMinutes * MS_PER_MINUTE);
    this.timers.set(automation.id, timer);
  }

  /**
   * Re-sync a recurring automation's timer after a create/update/delete. Never re-fires an on_launch
   * automation: creating/enabling one only fires at the next app start, not retroactively.
   */
  reschedule(automationId: string): void {
    this.unschedule(automationId);
    const automation = this.store.getAutomation(automationId);
    if (!automation) return;
    if (automation.enabled && automation.trigger === "recurring" && automation.intervalMinutes !== null) {
      this.schedule(automation);
    }
  }

  unschedule(automationId: string): void {
    const timer = this.timers.get(automationId);
    if (timer !== undefined) {
      clearInterval(timer);
      this.timers.delete(automationId);
    }
  }

  /** Public entry point for the "run now" REST endpoint. */
  runNow(automationId: string): Promise<void> {
    return this.run(automationId);
  }

  private async run(automationId: string): Promise<void> {
    if (this.running.has(automationId)) {
      log.info("exécution ignorée (déjà en cours)", { automationId });
      return;
    }
    const automation = this.store.getAutomation(automationId);
    if (!automation || !automation.enabled) return;

    this.running.add(automationId);
    const run = this.store.startAutomationRun(automationId);
    this.pushAutomations();
    let status: AutomationRunStatus = "failure";
    let result = "";
    try {
      result = await this.system.runAutomation({
        cwd: homedir(),
        prompt: automation.prompt,
        model: automation.model,
        effort: automation.effort,
      });
      status = "success";
    } catch (err) {
      result = err instanceof Error ? err.message : String(err);
    } finally {
      this.running.delete(automationId);
    }
    // A shutdown during the in-flight query closes the DB; skip the write so we never touch a closed
    // store. The run stays `running` and is reconciled by failStaleAutomationRuns on the next boot.
    if (this.stopped) return;
    this.store.finishAutomationRun(run.id, status, result);
    this.pushAutomations();
  }

  private pushAutomations(): void {
    this.hub.pushAutomations(this.store.listAutomations());
  }

  stop(): void {
    this.stopped = true;
    for (const timer of this.timers.values()) clearInterval(timer);
    this.timers.clear();
  }
}
