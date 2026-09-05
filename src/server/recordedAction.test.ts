import { expect, test } from "bun:test";

import { createDatabase } from "./db/schema.ts";
import { Store } from "./db/store.ts";
import { initProjectRegistry } from "./config.ts";
import { ReformulateManager } from "./agents/reformulateManager.ts";
import { ClientHub } from "./hub.ts";
import { Notifier } from "./notifier.ts";
import { FakeSystemAdapter } from "./system/fake.ts";
import type { ReformulateOptions } from "./system/types.ts";
import { runRecordedAction } from "./recordedAction.ts";

test("standalone actions retain model, session and usage even when the action fails", async () => {
  const db = createDatabase(":memory:");
  const store = new Store(db);
  try {
    await expect(runRecordedAction(store, "notion-import", {
      provider: "codex", model: "gpt-6-astra", effort: "high", serviceTier: "fast", role: "one-shot",
    }, async (onEvent) => {
      onEvent({ type: "init", sessionId: "actual-thread", configuredServiceTier: "fast" });
      expect(store.listExecutionRuns("action", "notion-import")[0]?.sessionId).toBe("actual-thread");
      onEvent({ type: "turn_end", ok: false, subtype: "failed", sessionId: "actual-thread", usageByModel: {
        "gpt-6-astra": { inputTokens: 10, outputTokens: 5, cacheReadTokens: 0, cacheCreationTokens: 0, costUsd: null },
      } });
      throw new Error("Notion indisponible");
    })).rejects.toThrow("Notion indisponible");
    const run = store.listExecutionRuns("action", "notion-import")[0];
    expect(run?.effectiveModel).toBe("gpt-6-astra");
    expect(run?.effectiveEffort).toBe("high");
    expect(run?.codexFast).toBe(true);
    expect(run?.configuredServiceTier).toBe("fast");
    expect(run?.status).toBe("failed");
    expect(run?.usageByModel["gpt-6-astra"]?.inputTokens).toBe(10);
    expect(run?.usageByModel["gpt-6-astra"]?.costUsd).toBeNull();
  } finally {
    db.close();
  }
});

test("ticket reformulation persists its effective run and partial usage on failure", async () => {
  const db = createDatabase(":memory:");
  const store = new Store(db);
  store.createProject("reformulate-project", {
    label: "Test", repoPath: "/tmp/reformulate-project", baseBranch: "main", commitTimeoutMs: 60_000,
    defaultAutoMerge: false, defaultAddScreenshots: false,
  });
  initProjectRegistry(store);
  class FailedReformulation extends FakeSystemAdapter {
    override async reformulate(options: ReformulateOptions): Promise<string> {
      expect(options.provider).toBe("codex");
      expect(options.model).toBe("gpt-5.6-sol");
      expect(options.effort).toBe("max");
      options.onEvent?.({ type: "init", sessionId: "reformulate-session" });
      options.onEvent?.({ type: "turn_end", sessionId: "reformulate-session", ok: false, subtype: "failed", usageByModel: {
        "gpt-5.6-sol": { inputTokens: 12, outputTokens: 3, cacheReadTokens: 0, cacheCreationTokens: 0, costUsd: null },
      } });
      throw new Error("Échec contrôlé");
    }
  }
  try {
    db.query(`INSERT INTO tickets (id, title, project, orchestrator, codex_model, codex_effort, created_at, updated_at)
      VALUES ('reformulate-ticket', 'Test', 'reformulate-project', 'codex', 'gpt-5.6-sol', 'max', 1, 1)`).run();
    const hub = new ClientHub(store);
    new ReformulateManager(store, new FailedReformulation(), hub, new Notifier(hub)).start("reformulate-ticket");
    await Bun.sleep(0);
    const run = store.listExecutionRuns("ticket", "reformulate-ticket")[0];
    expect(run?.status).toBe("failed");
    expect(run?.sessionId).toBe("reformulate-session");
    expect(run?.effectiveModel).toBe("gpt-5.6-sol");
    expect(run?.usageByModel["gpt-5.6-sol"]?.inputTokens).toBe(12);
    expect(store.getTicket("reformulate-ticket")?.reformulateStatus).toBe("failed");
  } finally {
    db.close();
  }
});
