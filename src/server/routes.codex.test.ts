import { expect, test } from "bun:test";

import { capabilitiesSchema } from "../shared/schemas.ts";
import type { CodexRuntimeStatus } from "../shared/codexCapabilities.ts";
import { AgentCoordinator } from "./agents/coordinator.ts";
import { AutomationManager } from "./agents/automationManager.ts";
import { DelegationManager } from "./agents/delegationManager.ts";
import { FeasibilityBatchManager } from "./agents/feasibilityManager.ts";
import { ReformulateManager } from "./agents/reformulateManager.ts";
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
import type { ImportNotionOptions, ReformulateOptions } from "./system/types.ts";
import { UserTerminalManager } from "./userTerminalManager.ts";

class ActionSystem extends FakeSystemAdapter {
  calls: ReformulateOptions[] = [];
  runtimeChecks: boolean[] = [];
  runtimeStatus: CodexRuntimeStatus | null = null;

  override async checkCodexRuntime(refresh = false): Promise<CodexRuntimeStatus> {
    this.runtimeChecks.push(refresh);
    return this.runtimeStatus ?? super.checkCodexRuntime();
  }

  override async reformulate(options: ReformulateOptions): Promise<string> {
    this.calls.push(options);
    return "# PRD";
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
  const coordinator = new AgentCoordinator(store, hub, sessionHub, notifier, lifecycle, slots, triage, feasibility, split, delegation);
  const app = createApiRoutes({
    store, system, hub, sessionHub, lifecycle, triage, feasibility, split, slots, coordinator,
    reformulate: new ReformulateManager(store, system, hub, notifier),
    automations: new AutomationManager(store, system, hub),
    userTerminals: new UserTerminalManager(system), projectRoot: "/tmp", composerAvailable: true,
  });
  const post = (path: string, body: unknown) => app.handle(new Request(`http://localhost/api${path}`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
  }));
  try {
    const capabilities = await app.handle(new Request("http://localhost/api/capabilities?refresh=1"));
    expect(capabilities.status).toBe(200);
    const caps = capabilitiesSchema.parse(await capabilities.json());
    expect(caps.codex.models.map((model) => model.model)).toEqual(["gpt-6-astra", "gpt-5.6-sol", "gpt-5.6-luna", "gpt-5.6-terra"]);
    expect(caps.defaultCodexFast).toBe(false);
    const settingsResponse = await app.handle(new Request("http://localhost/api/settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ codexFast: true }),
    }));
    expect(settingsResponse.status).toBe(200);
    expect((await settingsResponse.json()).codexFast).toBe(true);
    expect((await post("/prd/generate", {
      description: "Un formulaire", orchestrator: "codex", codexModel: "gpt-6-astra", codexEffort: "ultra", codexFast: true,
    })).status).toBe(200);
    expect((await post("/notion/import", {
      url: "https://www.notion.so/0123456789abcdef0123456789abcdef", orchestrator: "codex", codexModel: "gpt-5.6-sol", codexEffort: "max",
    })).status).toBe(200);
    expect((await post("/prd/generate", { description: "Claude par défaut" })).status).toBe(200);
    expect((await post("/prd/generate", { description: "Ancien modèle", orchestrator: "codex", codexModel: "gpt-5.5" })).status).toBe(400);
    system.runtimeStatus = {
      status: "ready",
      models: [{ model: "gpt-5.6-terra", efforts: ["medium"], defaultEffort: "medium", serviceTiers: [], defaultServiceTier: null }],
      checkedAt: Date.now(),
      message: null,
    };
    expect((await post("/prd/generate", {
      description: "Modèle retiré du compte", orchestrator: "codex", codexModel: "gpt-6-astra", codexEffort: "ultra",
    })).status).toBe(502);
    expect(system.calls.map(({ provider, model, effort, serviceTier }) => ({ provider, model, effort, serviceTier }))).toEqual([
      { provider: "codex", model: "gpt-6-astra", effort: "ultra", serviceTier: "fast" },
      { provider: "codex", model: "gpt-5.6-sol", effort: "max", serviceTier: "default" },
      { provider: "claude", model: "sonnet", effort: "low", serviceTier: "default" },
    ]);
    expect(system.runtimeChecks).toEqual([true, true, true, true]);
    expect(store.listExecutionRuns().length).toBe(3);
    expect((await app.handle(new Request("http://localhost/api/stats"))).status).toBe(200);
  } finally {
    db.close();
  }
});
