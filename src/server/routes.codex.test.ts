import { expect, test } from "bun:test";

import { capabilitiesSchema, triageResultSchema } from "../shared/schemas.ts";
import { initProjectRegistry } from "./config.ts";
import type { CodexRuntimeStatus } from "../shared/codexCapabilities.ts";
import { AtelierManager } from "./agents/atelierManager.ts";
import { AgentCoordinator } from "./agents/coordinator.ts";
import { AutomationManager } from "./agents/automationManager.ts";
import { DelegationManager } from "./agents/delegationManager.ts";
import { FeasibilityBatchManager } from "./agents/feasibilityManager.ts";
import { ReformulateManager } from "./agents/reformulateManager.ts";
import { FeasibilityAnswerManager } from "./agents/feasibilityAnswerManager.ts";
import { SessionHub } from "./agents/sessionHub.ts";
import { SlotManager } from "./agents/slotManager.ts";
import { SplitManager } from "./agents/splitManager.ts";
import { TriageManager } from "./agents/triageManager.ts";
import { createDatabase } from "./db/schema.ts";
import { Store } from "./db/store.ts";
import { ClientHub } from "./hub.ts";
import { TicketLifecycle } from "./lifecycle.ts";
import { Notifier } from "./notifier.ts";
import { createApiRoutes } from "./routes.ts";
import { FakeSystemAdapter } from "./system/fake.ts";
import type { ImportNotionOptions } from "./system/types.ts";

class ActionSystem extends FakeSystemAdapter {
  calls: ImportNotionOptions[] = [];
  runtimeChecks: boolean[] = [];
  runtimeStatus: CodexRuntimeStatus | null = null;

  override async checkCodexRuntime(refresh = false): Promise<CodexRuntimeStatus> {
    this.runtimeChecks.push(refresh);
    return this.runtimeStatus ?? super.checkCodexRuntime();
  }

  override async importNotion(options: ImportNotionOptions): Promise<string> {
    this.calls.push(options);
    return "# Notion";
  }
}

test("HTTP contracts route GPT and Claude actions, reject retired models and persist the actual selection", async () => {
  const db = createDatabase(":memory:");
  const store = new Store(db);
  const system = new ActionSystem();
  const hub = new ClientHub(store);
  const sessionHub = new SessionHub(system);
  const notifier = new Notifier(hub);
  const lifecycle = new TicketLifecycle(store, hub, notifier);
  const triage = new TriageManager(store, system, sessionHub, hub, notifier);
  const feasibility = new FeasibilityBatchManager(store, system, sessionHub, hub, notifier);
  const split = new SplitManager(store, system, sessionHub);
  const slots = new SlotManager(store, system, hub, sessionHub, notifier, lifecycle, { projectRoot: "/tmp" });
  const delegation = new DelegationManager(store, system, sessionHub, hub);
  const atelier = new AtelierManager({ store, hub, sessionHub, system });
  const coordinator = new AgentCoordinator(store, hub, sessionHub, notifier, lifecycle, slots, triage, feasibility, split, delegation, atelier);
  const app = createApiRoutes({
    store, system, hub, sessionHub, lifecycle, triage, feasibility, split, slots, coordinator, atelier,
    reformulate: new ReformulateManager(store, system, hub, notifier),
    feasibilityAnswers: new FeasibilityAnswerManager(store, system, hub),
    automations: new AutomationManager(store, system, hub),
    projectRoot: "/tmp", composerAvailable: true,
  });
  const post = (path: string, body: unknown) => app.handle(new Request(`http://localhost/api${path}`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
  }));
  try {
    const capabilities = await app.handle(new Request("http://localhost/api/capabilities?refresh=1"));
    expect(capabilities.status).toBe(200);
    const caps = capabilitiesSchema.parse(await capabilities.json());
    expect(caps.codex.models.map((model) => model.model)).toEqual([
      "gpt-6.1-sol",
      "gpt-6-astra",
      "gpt-6-sol",
      "gpt-6-luna",
    ]);
    expect(caps.defaultCodexFast).toBe(false);
    const settingsResponse = await app.handle(new Request("http://localhost/api/settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ codexFast: true }),
    }));
    expect(settingsResponse.status).toBe(200);
    expect((await settingsResponse.json()).codexFast).toBe(true);
    expect((await post("/notion/import", {
      url: "https://www.notion.so/0123456789abcdef0123456789abcdef", orchestrator: "codex", codexModel: "gpt-6-astra", codexEffort: "ultra", codexFast: true,
    })).status).toBe(200);
    expect((await post("/notion/import", {
      url: "https://www.notion.so/0123456789abcdef0123456789abcdef", orchestrator: "codex", codexModel: "gpt-6-sol", codexEffort: "max",
    })).status).toBe(200);
    expect((await post("/notion/import", { url: "https://www.notion.so/0123456789abcdef0123456789abcdef" })).status).toBe(200);
    expect((await post("/notion/import", { url: "https://www.notion.so/0123456789abcdef0123456789abcdef", orchestrator: "codex", codexModel: "gpt-5.5" })).status).toBe(400);
    system.runtimeStatus = {
      status: "ready",
      models: [{ model: "gpt-6-sol", efforts: ["medium"], defaultEffort: "medium", serviceTiers: [], defaultServiceTier: null }],
      checkedAt: Date.now(),
      message: null,
    };
    expect((await post("/notion/import", {
      url: "https://www.notion.so/0123456789abcdef0123456789abcdef", orchestrator: "codex", codexModel: "gpt-6-astra", codexEffort: "ultra",
    })).status).toBe(502);
    expect(system.calls.map(({ provider, model, effort, serviceTier }) => ({ provider, model, effort, serviceTier }))).toEqual([
      { provider: "codex", model: "gpt-6-astra", effort: "ultra", serviceTier: "fast" },
      { provider: "codex", model: "gpt-6-sol", effort: "max", serviceTier: "default" },
      { provider: "claude", model: "sonnet", effort: "low", serviceTier: "default" },
    ]);
    expect(system.runtimeChecks).toEqual([true, true, true, true]);
    expect(store.listExecutionRuns().length).toBe(3);
    expect((await app.handle(new Request("http://localhost/api/stats"))).status).toBe(200);
    store.createProject("answers-http", { label: "Test", repoPath: "/tmp/answers-http", baseBranch: "main", commitTimeoutMs: 60000, defaultAutoMerge: false, defaultAddScreenshots: false });
    initProjectRegistry(store);
    db.query("INSERT INTO tickets (id, title, project, created_at, updated_at) VALUES ('answers-http-ticket', 'Test', 'answers-http', 1, 1)").run();
    const ticket = store.updateTicket("answers-http-ticket", {
      triageStatus: "done",
      triageReport: JSON.stringify(triageResultSchema.parse({ verdict: "needs_info", summary: "Test", reasons: [], questions: ["Colour?"], files: [] })),
    });
    const answerInput = { revision: ticket.feasibilityRevision, reportVersion: ticket.feasibilityReportVersion, questionIndex: 0, answer: "Blue" };
    const answerPath = "/tickets/answers-http-ticket/feasibility-answers";
    for (const body of [{ ...answerInput, answer: " " }, { ...answerInput, answer: "x".repeat(10001) }, { ...answerInput, questionIndex: -1 }, { answer: "Blue" }]) {
      expect((await post(answerPath, body)).status).toBe(400);
    }
    expect((await post("/tickets/missing/feasibility-answers", answerInput)).status).toBe(404);
    expect((await post(answerPath, { ...answerInput, revision: 0 })).status).toBe(409);
    expect((await post(answerPath, { ...answerInput, questionIndex: 1 })).status).toBe(409);
    const started = await post(answerPath, answerInput);
    expect(started.status).toBe(200);
    expect(await started.json()).toMatchObject({ started: true, id: expect.any(String) });
    expect((await post(answerPath, answerInput)).status).toBe(409);
    await Bun.sleep(0);
    expect(store.getTicket(ticket.id)?.feasibilityAnswers[0]?.status).toBe("done");
  } finally {
    db.close();
  }
});
