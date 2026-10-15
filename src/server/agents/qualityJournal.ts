import { nanoid } from "nanoid";

import type { QualityAction, QualityActionInput } from "../../shared/qualityHistory.ts";
import type { Store } from "../db/store.ts";
import { minimizeQualityAction, redactSecrets } from "../system/secretRedaction.ts";

export interface QualityJournalOptions {
  secrets?: readonly string[];
  onFailure?: (error: Error) => void;
}

export type QualityActionStart = Omit<QualityActionInput, "status" | "actionId">;
export type QualityActionFinish = Partial<QualityActionInput> & { status: QualityAction["status"] };

export class QualityJournal {
  private failure: Error | null = null;
  private readonly open = new Map<string, QualityActionInput>();

  constructor(private readonly store: Store, readonly requestId: string, private readonly options: QualityJournalOptions = {}) {}

  get failed(): boolean {
    return this.failure !== null;
  }

  assertHealthy(): void {
    if (this.failure) throw this.failure;
  }

  redact(value: string): string {
    return redactSecrets(value, this.options.secrets);
  }

  private record(input: QualityActionInput): string | null {
    if (this.failure) return null;
    try {
      const action = this.store.appendQualityAction(this.requestId, minimizeQualityAction(input, this.options.secrets));
      return action?.actionId ?? null;
    } catch {
      this.failure = new Error("Quality action history could not be persisted");
      try {
        this.store.markQualityHistoryPartial(this.requestId);
      } catch {
        this.failure = new Error("Quality action history persistence and partial-state recording failed");
      }
      try {
        this.options.onFailure?.(this.failure);
      } catch {
        return null;
      }
      return null;
    }
  }

  start(input: QualityActionStart): string | null {
    const actionId = nanoid();
    const action = { ...input, actionId, status: "started" } satisfies QualityActionInput;
    const recorded = this.record(action);
    if (recorded) this.open.set(recorded, action);
    return recorded;
  }

  finish(actionId: string, input: QualityActionFinish): void {
    const previous = this.open.get(actionId);
    const kind = input.kind ?? previous?.kind ?? "observation";
    const summary = input.summary ?? "Action finished without an observed summary.";
    let status = input.status;
    if (!previous && status !== "denied" && status !== "interrupted") status = "unknown";
    this.record({ ...previous, ...input, actionId, kind, summary, status });
    this.open.delete(actionId);
  }

  observe(input: QualityActionInput): string | null {
    return this.record(input);
  }

  bindRun(runId: string): void {
    this.assertHealthy();
    try {
      this.store.bindQualityRequestRun(this.requestId, runId);
    } catch (error) {
      this.failure = new Error("Quality action history could not be associated with its run");
      this.options.onFailure?.(this.failure);
      throw error;
    }
  }
}
