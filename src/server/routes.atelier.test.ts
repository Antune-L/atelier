import { afterEach, describe, expect, spyOn, test } from "bun:test";
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
import { FeasibilityAnswerManager } from "./agents/feasibilityAnswerManager.ts";
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
import { createTicketOperations } from "./ticketOperations.ts";
import { PYTHON_BINARY } from "./prd/renderPrdHtml.ts";
import { createApiRoutes } from "./routes.ts";
import type { AgentSessionHandle, AgentSessionOptions } from "./system/agentSession.ts";
import { FakeSystemAdapter } from "./system/fake.ts";
import { FIXTURE_PROJECT_KEY } from "./testing/fixtures.ts";

const TEMPLATE_PATH = join(import.meta.dir, "..", "..", "vendor", "prd", "prd-template.json");
const HTTP_OK = 200;
const HTTP_BAD_REQUEST = 400;
const HTTP_NOT_FOUND = 404;
const HTTP_CONFLICT = 409;
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
  return setupWith(new CapturingSystem());
}

function setupWith<System extends FakeSystemAdapter>(system: System) {
  const db = createDatabase(":memory:");
  const store = new Store(db);
  store.createProject(FIXTURE_PROJECT_KEY, { label: "Test", repoPath: "/tmp/repo", baseBranch: "main", commitTimeoutMs: 60_000, defaultAutoMerge: false, defaultAddScreenshots: false });
  initProjectRegistry(store);
  const hub = new ClientHub(store);
  const sessionHub = new SessionHub(system);
  const notifier = new Notifier(hub);
  const lifecycle = new TicketLifecycle(store, hub, notifier);
  const triage = new TriageManager(store, system, sessionHub, hub, notifier);
  const feasibility = new FeasibilityBatchManager(store, system, sessionHub, hub, notifier);
  const split = new SplitManager(store, system, sessionHub);
  const slots = new SlotManager(store, system, hub, sessionHub, notifier, lifecycle, { projectRoot: "/tmp" });
  const delegation = new DelegationManager(store, system, sessionHub, hub);
  const ticketOperations = createTicketOperations({ store, hub, lifecycle, slots, feasibility });
  const atelier = new AtelierManager({ store, hub, sessionHub, system, ticketOperations, flushIntervalMs: 0 });
  const coordinator = new AgentCoordinator(store, hub, sessionHub, notifier, lifecycle, slots, triage, feasibility, split, delegation, atelier);
  const app = createApiRoutes({
    store, system, hub, sessionHub, lifecycle, triage, feasibility, split, slots, coordinator, atelier,
    reformulate: new ReformulateManager(store, system, hub, notifier),
    feasibilityAnswers: new FeasibilityAnswerManager(store, system, hub),
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
  return { store, system, sessionHub, request, app, feasibility, slots };
}

test("fresh parked REST cards start feasibility while immediate creation and import opt-out do not", async () => {
  const { app, feasibility, slots } = setup();
  const analysis = spyOn(feasibility, "start").mockResolvedValue(undefined);
  const implementation = spyOn(slots, "startTicket").mockResolvedValue(undefined);
  const post = (path: string, body: unknown) => app.handle(new Request(`http://localhost/api${path}`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
  }));
  try {
    const options = { project: FIXTURE_PROJECT_KEY, title: "Fresh card", description: "Requirements", orchestrator: "codex", implementer: "codex", feasibilityEngine: "claude" };
    const parked = ticketSchema.parse(await (await post("/tickets", { ...options, start: false })).json());
    expect(parked).toMatchObject({ column: "todo", stage: null, feasibilityEngine: "claude" });
    expect(analysis.mock.calls).toEqual([[[parked.id], FIXTURE_PROJECT_KEY]]);
    expect((await post("/tickets", { ...options, start: true })).status).toBe(HTTP_OK);
    const blocked = ticketSchema.parse(await (await post("/tickets", { ...options, start: true, dependsOn: parked.id })).json());
    expect(blocked).toMatchObject({ column: "todo", stage: null, dependsOn: parked.id });
    expect(implementation).toHaveBeenCalledTimes(1);
    expect((await post("/tickets", { ...options, project: "missing", start: false })).status).toBe(HTTP_BAD_REQUEST);
    const rows = [{ title: "One", description: "First" }, { title: "Two", description: "Second" }];
    expect((await post("/tickets/import", { project: FIXTURE_PROJECT_KEY, rows, runFeasibility: false })).status).toBe(HTTP_OK);
    expect(analysis).toHaveBeenCalledTimes(1);
    const imported = z.object({ created: z.array(ticketSchema), feasibilityStarted: z.boolean() }).parse(await (await post("/tickets/import", { project: FIXTURE_PROJECT_KEY, rows, runFeasibility: true })).json());
    expect(imported.feasibilityStarted).toBe(true);
    expect(analysis.mock.calls[1]).toEqual([imported.created.map((ticket) => ticket.id), FIXTURE_PROJECT_KEY]);
    expect(analysis).toHaveBeenCalledTimes(2);
    analysis.mockRejectedValueOnce(new Error("Background startup failed"));
    expect((await post("/tickets", { ...options, start: false })).status).toBe(HTTP_OK);
    await Bun.sleep(0);
  } finally {
    analysis.mockRestore();
    implementation.mockRestore();
  }
});

function loadTemplate(): PrdDocument {
  return prdDocumentSchema.parse(JSON.parse(readFileSync(TEMPLATE_PATH, "utf8")));
}

async function flushMicrotasks(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

async function waitForIdle(store: Store, conversationId: string): Promise<void> {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    await flushMicrotasks();
    if (store.getConversation(conversationId)?.sessionStatus === "idle") return;
  }
  throw new Error("conversation toujours en cours");
}

describe("Atelier routes", () => {
  for (const orchestrator of ["claude", "codex"] satisfies Orchestrator[]) {
    test(`${orchestrator} routes scoped board tools through the real coordinator`, async () => {
      const { system, request, store, feasibility, slots } = setup();
      const analysis = spyOn(feasibility, "start").mockResolvedValue(undefined);
      const implementation = spyOn(slots, "startTicket").mockResolvedValue(undefined);
      const seed = "Crée une carte Recherche puis lance-la.";
      try {
        const response = await request("POST", "/conversations", { project: FIXTURE_PROJECT_KEY, orchestrator, seed });
        const conversation = conversationSchema.parse(await response.json());
        await flushMicrotasks();
        const session = system.sessions[0];
        if (!session) throw new Error("Atelier session did not start");
        expect((await session.onToolCall("atelier_list_tickets", {})).ok).toBe(true);
        const created = await session.onToolCall("atelier_create_todo", { requestId: "search", title: "Recherche", authorizationQuote: seed });
        expect(created.ok).toBe(true);
        const ticket = store.listTickets(false)[0];
        if (!ticket) throw new Error("Atelier card was not created");
        expect(ticket.project).toBe(conversation.project);
        expect(ticket.column).toBe("todo");
        expect(implementation).not.toHaveBeenCalled();
        expect((await session.onToolCall("atelier_get_ticket", { ticketId: ticket.id })).result).toContain(ticket.id);
        expect((await session.onToolCall("atelier_start_ticket", { ticketId: ticket.id, authorizationQuote: seed })).result).toContain('"status":"queued"');
        expect(implementation).toHaveBeenCalledTimes(1);
        expect((await session.onToolCall("done", { pr_url: "https://example.com/pr/1" })).ok).toBe(false);
        const actionResults = store.listConversationMessages(conversation.id).filter((message) => message.role === "activity");
        expect(actionResults).toHaveLength(2);
      } finally {
        analysis.mockRestore();
        implementation.mockRestore();
      }
    });
  }

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

  for (const orchestrator of ["claude", "codex"] satisfies Orchestrator[]) {
    test(`a live ${orchestrator} session reports its context and compacts it`, async () => {
      const { store, request } = setupWith(new FakeSystemAdapter());
      const conversation = conversationSchema.parse(await (await request("POST", "/conversations", { project: FIXTURE_PROJECT_KEY, orchestrator })).json());
      expect(conversation.contextTokens).toBeNull();
      expect((await request("POST", `/conversations/${conversation.id}/compact`)).status).toBe(HTTP_CONFLICT);

      await request("POST", `/conversations/${conversation.id}/messages`, { content: "Bonjour" });
      await waitForIdle(store, conversation.id);
      const before = store.getConversation(conversation.id);
      expect(before?.contextWindow).toBe(200_000);
      expect(before?.contextTokens).toBeGreaterThan(4_000);

      const compacted = await request("POST", `/conversations/${conversation.id}/compact`);
      expect(compacted.status).toBe(HTTP_OK);
      const body = z.object({ conversation: conversationSchema }).parse(await compacted.json());
      expect(body.conversation.sessionStatus).toBe("running");
      expect((await request("POST", `/conversations/${conversation.id}/compact`)).status).toBe(HTTP_CONFLICT);
      await waitForIdle(store, conversation.id);

      expect(store.getConversation(conversation.id)?.contextTokens).toBe(4_000);
      const contents = store.listConversationMessages(conversation.id).map((message) => [message.role, message.content]);
      expect(contents.slice(-2)).toEqual([
        ["user", "Compacter le contexte"],
        ["assistant", `Contexte compacté : ${(before?.contextTokens ?? 0).toLocaleString("fr-FR").replace(/\s/g, " ")} → 4 000 tokens.`],
      ]);
      expect((await request("POST", "/conversations/absent/compact")).status).toBe(HTTP_NOT_FOUND);
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
    const { store, request, feasibility, slots } = setup();
    const analysis = spyOn(feasibility, "start");
    const implementation = spyOn(slots, "startTicket").mockResolvedValue(undefined);
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
    expect(analysis.mock.calls).toEqual([[[first.id], FIXTURE_PROJECT_KEY], [[second.id], FIXTURE_PROJECT_KEY]]);
    expect(store.getConversation(conversation.id)?.status).toBe("cards_created");

    const single = ticketsResponseSchema.parse(await (await request("POST", `/prd/${record.id}/tickets`, { split: "single", selection: ["single"] })).json());
    expect(single.tickets.map((ticket) => ticket.title)).toEqual(["Saved catalogue searches"]);
    const axes = ticketsResponseSchema.parse(await (await request("POST", `/prd/${record.id}/tickets`, { split: "axes", selection: ["A2"] })).json());
    expect(axes.tickets.map((ticket) => [ticket.title, ticket.sourcePrdTask])).toEqual([["A2 — Restore a search accessibly", null]]);
    const immediate = ticketsResponseSchema.parse(await (await request("POST", `/prd/${record.id}/tickets`, { split: "tasks", selection: ["T1", "T2"], start: true })).json());
    expect(immediate.tickets.map((ticket) => ticket.column)).toEqual(["implementing", "todo"]);
    expect(analysis).toHaveBeenCalledTimes(4);
    expect(implementation).toHaveBeenCalledTimes(1);
    analysis.mockRestore();
    implementation.mockRestore();
  });
});
