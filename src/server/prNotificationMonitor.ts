import { getErrorMessage } from "../shared/errors.ts";
import type { Store } from "./db/store.ts";
import type { ClientHub } from "./hub.ts";
import { createLogger } from "./logger.ts";
import type { Notifier } from "./notifier.ts";
import type { SystemAdapter } from "./system/types.ts";

const POLL_INTERVAL_MS = 15_000;
const MAX_BACKOFF_MS = 5 * 60_000;
const MAX_CONCURRENT_PROJECTS = 2;
const log = createLogger("pr-notifications");

export class PrNotificationMonitor {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private running: Promise<void> | null = null;
  private stopped = true;
  private readonly retries = new Map<string, { failures: number; nextAt: number; context: string }>();

  constructor(
    private readonly store: Store,
    private readonly system: Pick<SystemAdapter, "listReviewRequests">,
    private readonly hub: ClientHub,
    private readonly notifier: Notifier,
  ) {}

  start(): void {
    if (!this.stopped) return;
    this.stopped = false;
    this.schedule(0);
  }

  async stop(): Promise<void> {
    this.stopped = true;
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
    await this.running;
  }

  private schedule(delay: number): void {
    if (this.stopped) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.running = this.poll().catch((error: unknown) => {
        log.error("synchronisation des demandes de review échouée", { error: getErrorMessage(error) });
      }).finally(() => {
        this.running = null;
        this.schedule(POLL_INTERVAL_MS);
      });
    }, delay);
  }

  private async poll(): Promise<void> {
    const queue = this.store.listProjectKeys().filter((key) => {
      const project = this.store.getProjectRow(key);
      if (!project || project.hidden) return false;
      const retry = this.retries.get(key);
      if (retry?.context !== `${project.vcsProvider}:${project.repoPath}`) this.retries.delete(key);
      return (this.retries.get(key)?.nextAt ?? 0) <= Date.now();
    });
    const worker = async () => {
      while (!this.stopped) {
        const key = queue.shift();
        if (key === undefined) return;
        await this.syncProject(key);
      }
    };
    await Promise.all(Array.from({ length: MAX_CONCURRENT_PROJECTS }, worker));
    if (!this.stopped) this.hub.pushPrNotifications();
  }

  private async syncProject(key: string): Promise<void> {
    const project = this.store.getProjectRow(key);
    if (!project || project.hidden) return;
    try {
      const snapshot = await this.system.listReviewRequests(project.repoPath, project.vcsProvider);
      const latest = this.store.getProjectRow(key);
      if (this.stopped || !latest || latest.hidden || latest.repoPath !== project.repoPath || latest.vcsProvider !== project.vcsProvider) return;
      const detected = this.store.syncPrNotifications(key, project.repoPath, snapshot.identityKey, snapshot.prs);
      this.retries.delete(key);
      this.hub.pushPrNotifications();
      for (const notification of detected) {
        try {
          await this.notifier.notify("Nouvelle demande de review", `${project.label} · PR #${notification.prNumber} · ${notification.title}`, undefined, true, "pr");
        } catch (error) {
          log.warn("notification de review non délivrée", { project: key, error: getErrorMessage(error) });
        }
      }
    } catch (error) {
      const latest = this.store.getProjectRow(key);
      if (this.stopped || !latest || latest.hidden || latest.repoPath !== project.repoPath || latest.vcsProvider !== project.vcsProvider) return;
      const failures = (this.retries.get(key)?.failures ?? 0) + 1;
      this.retries.set(key, { failures, nextAt: Date.now() + Math.min(MAX_BACKOFF_MS, POLL_INTERVAL_MS * 2 ** failures), context: `${project.vcsProvider}:${project.repoPath}` });
      this.store.setPrNotificationError(key, project.repoPath, getErrorMessage(error));
      log.warn("demandes de review indisponibles", { project: key, error: getErrorMessage(error) });
      this.hub.pushPrNotifications();
    }
  }
}
