import { expect, test } from "bun:test";

import { createDatabase } from "../server/db/schema.ts";
import { Store } from "../server/db/store.ts";
import { initProjectRegistry } from "../server/config.ts";

import { projectStatRecord } from "./statistics.ts";

test("mixed historical and captured usage retains old sessions without double counting", () => {
  const db = createDatabase(":memory:");
  const store = new Store(db);
  store.createProject("project", {
    label: "Test", repoPath: "/tmp/project", baseBranch: "main", commitTimeoutMs: 60_000,
    defaultAutoMerge: false, defaultAddScreenshots: false,
  });
  initProjectRegistry(store);
  try {
    db.query("INSERT INTO tickets (id, title, project, created_at, updated_at) VALUES ('ticket', 'Test', 'project', 1, 1)").run();
    const ticket = store.updateTicket("ticket", { sessionUsage: {
      old: { sonnet: { input_tokens: 1_000_000, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 } },
      current: { "gpt-6-astra": { input_tokens: 100, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 } },
    } });
    const run = store.startExecution({
      id: "run", generationId: "generation", ownerType: "ticket", ownerId: ticket.id,
      sessionId: "current", role: "orchestrator", orchestrator: "codex",
      effectiveModel: "gpt-6-astra", effectiveEffort: "medium",
    });
    expect(projectStatRecord(ticket, [run]).totalTokens).toBe(1_000_100);
    const completed = store.finalizeExecution({
      generationId: "generation", status: "completed", usageByModel: {
        "gpt-6-astra": { inputTokens: 100, outputTokens: 0, cacheReadTokens: 0, cacheCreationTokens: 0, costUsd: null },
      },
    });
    const stats = projectStatRecord(ticket, [completed]);
    expect(stats.totalTokens).toBe(1_000_100);
    expect(stats.costUsd).toBeNull();
    expect(stats.knownCostUsd).toBe(3);
    expect(stats.costPartial).toBe(true);
    const priced = projectStatRecord({ ...ticket, sessionUsage: { ...ticket.sessionUsage, current: {
      sonnet: { input_tokens: 100, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
    } } }, [{ ...completed, usageByModel: {
      sonnet: { inputTokens: 100, outputTokens: 0, cacheReadTokens: 0, cacheCreationTokens: 0, costUsd: 2 },
    } }]);
    expect(priced.costUsd).toBe(5);
    expect(priced.costPartial).toBe(false);
    const fast = projectStatRecord(ticket, [{
      ...completed,
      codexFast: false,
      configuredServiceTier: "priority",
      usageByModel: {
        "gpt-6-astra": { inputTokens: 100, outputTokens: 0, cacheReadTokens: 0, cacheCreationTokens: 0, costUsd: 2 },
      },
    }]);
    expect(fast.costUsd).toBeNull();
    expect(fast.knownCostUsd).toBe(3);
    expect(fast.costPartial).toBe(true);
    const resumed = projectStatRecord({ ...ticket, sessionUsage: { ...ticket.sessionUsage, current: {
      "gpt-6-astra": { input_tokens: 1_000, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
    } } }, [completed]);
    expect(resumed.totalTokens).toBe(1_001_000);
    expect(ticket.sessionUsage.current?.["gpt-6-astra"]?.input_tokens).toBe(100);
  } finally {
    db.close();
  }
});
