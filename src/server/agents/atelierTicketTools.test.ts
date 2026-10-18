import { afterEach, describe, expect, spyOn, test } from "bun:test";

import { ATELIER_BOARD_TOOL_NAMES } from "../../shared/protocol.ts";
import type { WorkerToolName } from "../../shared/protocol.ts";
import type { Orchestrator } from "../../shared/constants.ts";
import { DEFAULT_RESEARCH_OPTIONS } from "../../shared/schemas.ts";
import { initProjectRegistry } from "../config.ts";
import { createDatabase } from "../db/schema.ts";
import { Store } from "../db/store.ts";
import { ClientHub } from "../hub.ts";
import { TicketLifecycle } from "../lifecycle.ts";
import { Notifier } from "../notifier.ts";
import { FakeSystemAdapter } from "../system/fake.ts";
import { workerToolsForRole } from "../system/sessionRolePolicy.ts";
import { createTicketOperations } from "../ticketOperations.ts";

import { ATELIER_BOARD_RESULT_PREFIX, AtelierTicketTools } from "./atelierTicketTools.ts";
import { SessionHub } from "./sessionHub.ts";
import { SlotManager } from "./slotManager.ts";

const PROJECT = "atelier-project";
const OTHER_PROJECT = "other-project";
const AUTHORIZATION = "Crée les cartes demandées puis lance-les.";
const closers: Array<() => void> = [];

afterEach(() => {
  for (const close of closers.splice(0)) close();
});

function setup(provider: Orchestrator = "claude") {
  const db = createDatabase(":memory:");
  const store = new Store(db);
  for (const key of [PROJECT, OTHER_PROJECT]) {
    store.createProject(key, { label: key, repoPath: `/tmp/${key}`, baseBranch: "main", commitTimeoutMs: 60_000, defaultAutoMerge: false, defaultAddScreenshots: false });
  }
  initProjectRegistry(store);
  const hub = new ClientHub(store);
  const system = new FakeSystemAdapter();
  const notifier = new Notifier(hub);
  const lifecycle = new TicketLifecycle(store, hub, notifier);
  const slots = new SlotManager(store, system, hub, new SessionHub(system), notifier, lifecycle, { projectRoot: "/tmp" });
  const start = spyOn(slots, "startTicket").mockResolvedValue(undefined);
  const operations = createTicketOperations({ store, hub, lifecycle, slots, feasibility: { start: async () => undefined } });
  const conversation = store.createConversation({ project: PROJECT, title: "Plan", orchestrator: provider, model: null, effort: null, codexModel: null, codexEffort: null, codexFast: false, researchEnabled: false, researchOptions: DEFAULT_RESEARCH_OPTIONS });
  const user = store.addConversationMessage({ conversationId: conversation.id, role: "user", content: AUTHORIZATION, turnId: "turn-1" });
  const tools = new AtelierTicketTools({ store, hub, operations });
  closers.push(() => { start.mockRestore(); db.close(); });
  return { store, operations, conversation, tools, user, start };
}

describe("Atelier project board operations", () => {
  for (const provider of ["claude", "codex"] satisfies Orchestrator[]) {
    test(`${provider} creates an idempotent TODO without starting and records authoritative outcomes`, async () => {
      const { tools, conversation, store, start, user } = setup(provider);
      const input = { requestId: "task-1", title: "Search", description: "Saved search", authorizationQuote: AUTHORIZATION };
      const first = await tools.handle(conversation.id, "atelier_create_todo", input, "call-1");
      expect(first.ok).toBe(true);
      const ticket = store.listTickets(false)[0];
      expect(ticket?.column).toBe("todo");
      expect(ticket?.orchestrator).toBe(provider);
      expect(ticket?.implementer).toBe(provider);
      expect(start).not.toHaveBeenCalled();
      const retry = await tools.handle(conversation.id, "atelier_create_todo", input, "call-2");
      expect(retry.ok).toBe(true);
      expect(retry.result).toContain('"created":false');
      expect(store.listTickets(false)).toHaveLength(1);
      const conflict = await tools.handle(conversation.id, "atelier_create_todo", { ...input, title: "Different" }, "call-3");
      expect(conflict.ok).toBe(false);
      const activities = store.listConversationMessages(conversation.id).filter((message) => message.role === "activity");
      expect(activities).toHaveLength(3);
      expect(activities[0]?.content).toStartWith(ATELIER_BOARD_RESULT_PREFIX);
      expect(activities[0]?.content).toContain(user.id);
      expect(activities[0]?.content).toContain(ticket?.id ?? "missing");
    });
  }

  test("scopes reads, creates, dependencies and starts to the conversation project", async () => {
    const { tools, conversation, operations, store, start } = setup();
    const foreign = operations.createTodoTicket({ project: OTHER_PROJECT, requestId: "foreign", title: "Foreign" }).ticket;
    const listed = await tools.handle(conversation.id, "atelier_list_tickets", {}, "list");
    expect(listed.ok).toBe(true);
    expect(listed.result).not.toContain(foreign.id);
    for (const name of ["atelier_get_ticket", "atelier_start_ticket"] satisfies readonly WorkerToolName[]) {
      const result = await tools.handle(conversation.id, name, { ticketId: foreign.id, ...(name === "atelier_start_ticket" ? { authorizationQuote: AUTHORIZATION } : {}) }, name);
      expect(result.ok).toBe(false);
      expect(result.result).not.toContain("Foreign");
    }
    const injectedProject = await tools.handle(conversation.id, "atelier_create_todo", { project: OTHER_PROJECT, requestId: "bad", title: "Bad", authorizationQuote: AUTHORIZATION }, "bad");
    expect(injectedProject.ok).toBe(false);
    const dependency = await tools.handle(conversation.id, "atelier_create_todo", { requestId: "dep", title: "Dependent", dependsOn: foreign.id, authorizationQuote: AUTHORIZATION }, "dep");
    expect(dependency.ok).toBe(false);
    expect(store.listTickets(false)).toHaveLength(1);
    expect(start).not.toHaveBeenCalled();
    expect((await tools.handle("missing", "atelier_list_tickets", {}, "missing")).ok).toBe(false);
  });

  test("rejects authority absent from the current user message and preserves independent successes", async () => {
    const { tools, conversation, store, start } = setup();
    const input = { requestId: "task", title: "Authorized", authorizationQuote: AUTHORIZATION };
    expect((await tools.handle(conversation.id, "atelier_create_todo", input, "authorized")).ok).toBe(true);
    store.addConversationMessage({ conversationId: conversation.id, role: "user", content: "Explique-moi ces cartes sans rien lancer.", turnId: "turn-2" });
    expect((await tools.handle(conversation.id, "atelier_create_todo", { ...input, requestId: "other" }, "stale")).ok).toBe(false);
    const ticket = store.listTickets(false)[0];
    expect(ticket).toBeDefined();
    expect((await tools.handle(conversation.id, "atelier_start_ticket", { ticketId: ticket?.id, authorizationQuote: AUTHORIZATION }, "stale-start")).ok).toBe(false);
    expect(store.listTickets(false)).toHaveLength(1);
    expect(start).not.toHaveBeenCalled();
  });

  test("starts only eligible cards and reports queued then already_started", async () => {
    const { tools, conversation, operations, store, start } = setup();
    const parent = operations.createTodoTicket({ project: PROJECT, requestId: "parent", title: "Parent" }).ticket;
    const child = operations.createTodoTicket({ project: PROJECT, requestId: "child", title: "Child", dependsOn: parent.id }).ticket;
    const args = { ticketId: child.id, authorizationQuote: AUTHORIZATION };
    expect((await tools.handle(conversation.id, "atelier_start_ticket", args, "blocked")).ok).toBe(false);
    const launched = await tools.handle(conversation.id, "atelier_start_ticket", { ...args, ticketId: parent.id }, "launch");
    expect(launched.ok).toBe(true);
    expect(launched.result).toContain('"status":"queued"');
    expect(start).toHaveBeenCalledTimes(1);
    expect(store.getTicket(parent.id)?.stage).toBe("queued");
    const repeated = await tools.handle(conversation.id, "atelier_start_ticket", { ...args, ticketId: parent.id }, "repeat");
    expect(repeated.result).toContain('"status":"already_started"');
    expect(start).toHaveBeenCalledTimes(1);
    store.updateTicket(child.id, { column: "done", dependsOn: null });
    expect((await tools.handle(conversation.id, "atelier_start_ticket", args, "done")).ok).toBe(false);
  });

  test("creation request identifiers are independent across conversations", async () => {
    const { tools, conversation, store } = setup();
    const second = store.createConversation({ ...conversation, title: "Second" });
    store.addConversationMessage({ conversationId: second.id, role: "user", content: AUTHORIZATION, turnId: "second" });
    const input = { requestId: "same", title: "Task", authorizationQuote: AUTHORIZATION };
    expect((await tools.handle(conversation.id, "atelier_create_todo", input, "first")).ok).toBe(true);
    expect((await tools.handle(second.id, "atelier_create_todo", input, "second")).ok).toBe(true);
    expect(store.listTickets(false)).toHaveLength(2);
  });

  test("only the Atelier worker role exposes board mutation tools", () => {
    for (const name of ATELIER_BOARD_TOOL_NAMES) {
      expect(workerToolsForRole("atelier")).toContain(name);
      expect(workerToolsForRole("scout")).not.toContain(name);
      expect(workerToolsForRole("orchestrator")).not.toContain(name);
    }
  });
});
