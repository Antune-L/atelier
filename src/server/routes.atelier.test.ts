import { afterEach, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { conversationMessageSchema, conversationSchema, prdDocumentRecordSchema, prdDocumentSchema, ticketSchema } from "../shared/schemas.ts";
import type { PrdDocument } from "../shared/schemas.ts";
import type { Orchestrator } from "../shared/constants.ts";
import { z } from "zod";
import { AtelierManager } from "./agents/atelierManager.ts";
import { AgentCoordinator } from "./agents/coordinator.ts";
import { AutomationManager } from "./agents/automationManager.ts";
import { DelegationManager } from "./agents/delegationManager.ts";
import { FeasibilityBatchManager } from "./agents/feasibilityManager.ts";
import { ReformulateManager } from "./agents/reformulateManager.ts";
import { atelierSessionKey } from "./agents/sessionConfig.ts";
import { SessionHub } from "./agents/sessionHub.ts";
import { SlotManager } from "./agents/slotManager.ts";
import { SplitManager } from "./agents/splitManager.ts";
import { TriageManager } from "./agents/triageManager.ts";
import { initProjectRegistry } from "./config.ts";
import { createDatabase } from "./db/schema.ts";
import { Store } from "./db/store.ts";
import { ClientHub } from "./hub.ts";
import { TicketLifecycle } from "./lifecycle.ts";
import { Notifier } from "./notifier.ts";
import { PYTHON_BINARY } from "./prd/renderPrdHtml.ts";
import { createApiRoutes } from "./routes.ts";
import type { AgentSessionHandle, AgentSessionOptions } from "./system/agentSession.ts";
import { FakeSystemAdapter } from "./system/fake.ts";
import { FIXTURE_PROJECT_KEY } from "./testing/fixtures.ts";

const TEMPLATE_PATH = join(import.meta.dir, "..", "..", "vendor", "prd", "prd-template.json");
const HTTP_OK = 200;
const HTTP_BAD_REQUEST = 400;
const HTTP_NOT_FOUND = 404;
const HTTP_BAD_GATEWAY = 502;

const conversationDetailSchema = z.object({
  conversation: conversationSchema,
  messages: z.array(conversationMessageSchema),
  prds: z.array(prdDocumentRecordSchema),
});
const ticketsResponseSchema = z.object({ tickets: z.array(ticketSchema) });

class CapturingSystem extends FakeSystemAdapter {
  readonly sessions: AgentSessionOptions[] = [];

  override startAgentSession(opts: AgentSessionOptions): AgentSessionHandle {
    this.sessions.push(opts);
    return {
      ticketId: opts.ticketId,
      send: (_content, messageId = crypto.randomUUID()) => messageId,
      interrupt: async () => undefined,
      close: async () => undefined,
    };
  }
}

const closers: Array<() => Promise<void>> = [];

afterEach(async () => {
  for (const close of closers.splice(0)) await close();
});

function setup() {
  const db = createDatabase(":memory:");
  const store = new Store(db);
  store.createProject(FIXTURE_PROJECT_KEY, { label: "Test", repoPath: "/tmp/repo", baseBranch: "main", commitTimeoutMs: 60_000, defaultAutoMerge: false, defaultAddScreenshots: false });
  initProjectRegistry(store);
  const system = new CapturingSystem();
  const hub = new ClientHub(store);
  const sessionHub = new SessionHub(system);
  const notifier = new Notifier(hub);
  const lifecycle = new TicketLifecycle(store, hub, notifier);
  const triage = new TriageManager(store, system, sessionHub, hub, notifier);
  const feasibility = new FeasibilityBatchManager(store, system, sessionHub, hub, notifier);
  const split = new SplitManager(store, system, sessionHub);
  const slots = new SlotManager(store, system, hub, sessionHub, notifier, lifecycle, { projectRoot: "/tmp" });
  const delegation = new DelegationManager(store, system, sessionHub, hub);
  const atelier = new AtelierManager({ store, hub, sessionHub, system, flushIntervalMs: 0 });
  const coordinator = new AgentCoordinator(store, hub, sessionHub, notifier, lifecycle, slots, triage, feasibility, split, delegation, atelier);
  const app = createApiRoutes({
    store, system, hub, sessionHub, lifecycle, triage, feasibility, split, slots, coordinator, atelier,
    reformulate: new ReformulateManager(store, system, hub, notifier),
    automations: new AutomationManager(store, system, hub),
    projectRoot: "/tmp", composerAvailable: true,
  });
  closers.push(async () => {
    atelier.stop();
    sessionHub.disconnectAll();
    await sessionHub.drainClosingSessions();
    db.close();
  });
  const request = (method: string, path: string, body?: unknown) => app.handle(new Request(`http://localhost/api/atelier${path}`, {
    method,
    headers: { "content-type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }));
  return { store, system, sessionHub, request };
}

function loadTemplate(): PrdDocument {
  return prdDocumentSchema.parse(JSON.parse(readFileSync(TEMPLATE_PATH, "utf8")));
}

async function flushMicrotasks(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("Atelier routes", () => {
  for (const orchestrator of ["claude", "codex"] satisfies Orchestrator[]) {
    test(`a ${orchestrator} conversation seeds its session and accepts a PRD through the worker tool`, async () => {
      const { system, request } = setup();
      const created = await request("POST", "/conversations", {
        project: FIXTURE_PROJECT_KEY,
        orchestrator,
        seed: "Ajouter des recherches sauvegardées au catalogue",
      });
      expect(created.status).toBe(HTTP_OK);
      const conversation = conversationSchema.parse(await created.json());
      expect(conversation.title).toBe("Ajouter des recherches sauvegardées au catalogue");
      expect(conversation.sessionStatus).toBe("running");
      await flushMicrotasks();

      const session = system.sessions[0];
      if (!session) throw new Error("session atelier non démarrée");
      expect(session.provider).toBe(orchestrator);
      expect(session.ticketId).toBe(atelierSessionKey(conversation.id));

      const invalid = await session.onToolCall("submit_prd_document", { document: { schemaVersion: 2 } });
      expect(invalid.ok).toBe(false);
      expect(invalid.result).toContain("Document PRD invalide");
      expect(invalid.result).toContain("document.title");
      const refused = await session.onToolCall("done", { pr_url: "https://example.com/pr/1" });
      expect(refused.ok).toBe(false);

      const document = loadTemplate();
      expect((await session.onToolCall("submit_prd_document", { document })).result).toContain("révision 1");
      expect((await session.onToolCall("submit_prd_document", { document })).result).toContain("révision 2");

      const detail = conversationDetailSchema.parse(await (await request("GET", `/conversations/${conversation.id}`)).json());
      expect(detail.messages.map((message) => message.role)).toEqual(["user"]);
      expect(detail.prds.map((prd) => prd.revision)).toEqual([1, 2]);
      expect(detail.conversation.status).toBe("prd_draft");
    });
  }

  test("conversation CRUD, settings change and 404s", async () => {
    const { sessionHub, request } = setup();
    const conversation = conversationSchema.parse(await (await request("POST", "/conversations", { project: FIXTURE_PROJECT_KEY })).json());
    expect(conversation.title).toBe("Nouvelle conversation");
    expect((await request("POST", "/conversations", { project: "inconnu" })).status).toBe(HTTP_BAD_REQUEST);

    const posted = await request("POST", `/conversations/${conversation.id}/messages`, { content: "Bonjour" });
    expect(posted.status).toBe(HTTP_OK);
    await flushMicrotasks();
    expect(sessionHub.isConnected(atelierSessionKey(conversation.id))).toBe(true);

    const patched = conversationSchema.parse(await (await request("PATCH", `/conversations/${conversation.id}`, { model: "opus" })).json());
    expect(patched.model).toBe("opus");
    expect(sessionHub.isConnected(atelierSessionKey(conversation.id))).toBe(false);

    const listed = z.array(conversationSchema).parse(await (await request("GET", `/conversations?project=${FIXTURE_PROJECT_KEY}`)).json());
    expect(listed.map((entry) => entry.id)).toEqual([conversation.id]);

    expect((await request("POST", `/conversations/${conversation.id}/consolidate`, {})).status).toBe(HTTP_OK);
    expect((await request("POST", `/conversations/${conversation.id}/interrupt`)).status).toBe(HTTP_OK);
    expect((await request("DELETE", `/conversations/${conversation.id}`)).status).toBe(HTTP_OK);
    expect((await request("GET", `/conversations/${conversation.id}`)).status).toBe(HTTP_NOT_FOUND);
    expect((await request("POST", "/conversations/absent/messages", { content: "x" })).status).toBe(HTTP_NOT_FOUND);
    expect((await request("PATCH", "/prd/absent", { status: "validated" })).status).toBe(HTTP_NOT_FOUND);
  });

  test("PRD review, exports and cards chained in tasks mode", async () => {
    const { store, request } = setup();
    const conversation = conversationSchema.parse(await (await request("POST", "/conversations", { project: FIXTURE_PROJECT_KEY, orchestrator: "codex" })).json());
    const record = store.createPrdDocument({ conversationId: conversation.id, document: loadTemplate() });

    const validated = prdDocumentRecordSchema.parse(await (await request("PATCH", `/prd/${record.id}`, {
      status: "validated",
      annotations: [{ id: "a1", quote: "Saved", comment: "Préciser" }],
      generalNote: "RAS",
    })).json());
    expect(validated.status).toBe("validated");
    expect(store.getConversation(conversation.id)?.status).toBe("prd_validated");

    expect((await request("POST", `/prd/${record.id}/regenerate`)).status).toBe(HTTP_OK);
    const messages = store.listConversationMessages(conversation.id);
    expect(messages.at(-1)?.content).toContain("Concernant « Saved »");

    const json = await request("GET", `/prd/${record.id}/export.json`);
    expect(json.headers.get("content-disposition")).toBe(`attachment; filename="saved-searches-rev1.prd.json"`);
    expect(prdDocumentSchema.parse(await json.json()).id).toBe("saved-searches");

    const html = await request("GET", `/prd/${record.id}/export.html`);
    expect(html.status).toBe(Bun.which(PYTHON_BINARY) === null ? HTTP_BAD_GATEWAY : HTTP_OK);

    expect((await request("POST", `/prd/${record.id}/tickets`, { split: "tasks", selection: ["T9"] })).status).toBe(HTTP_BAD_REQUEST);
    const created = ticketsResponseSchema.parse(await (await request("POST", `/prd/${record.id}/tickets`, {
      split: "tasks",
      selection: ["T2", "T1"],
      options: { orchestrator: "codex", implementer: "codex" },
    })).json());
    const [first, second] = created.tickets;
    if (!first || !second) throw new Error("deux cartes attendues");
    expect(first.title).toBe("T1 — Persist saved searches");
    expect(first.dependsOn).toBeNull();
    expect(second.sourcePrdTask).toBe("T2");
    expect(second.dependsOn).toBe(first.id);
    expect(second.prdEnabled).toBe(false);
    expect(second.prdMarkdown).toContain("Saved catalogue searches");
    expect(second.sourcePrdId).toBe(record.id);
    expect(second.column).toBe("todo");
    expect(store.getConversation(conversation.id)?.status).toBe("cards_created");

    const single = ticketsResponseSchema.parse(await (await request("POST", `/prd/${record.id}/tickets`, { split: "single", selection: ["single"] })).json());
    expect(single.tickets.map((ticket) => ticket.title)).toEqual(["Saved catalogue searches"]);
    const axes = ticketsResponseSchema.parse(await (await request("POST", `/prd/${record.id}/tickets`, { split: "axes", selection: ["A2"] })).json());
    expect(axes.tickets.map((ticket) => [ticket.title, ticket.sourcePrdTask])).toEqual([["A2 — Restore a search accessibly", null]]);
  });
});
