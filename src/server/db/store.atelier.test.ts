import { afterEach, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { prdDocumentSchema } from "../../shared/schemas.ts";
import type { PrdDocument } from "../../shared/schemas.ts";
import { DEFAULT_RESEARCH_OPTIONS } from "../../shared/schemas.ts";
import { initProjectRegistry } from "../config.ts";
import { FIXTURE_PROJECT_KEY, makeTicket } from "../testing/fixtures.ts";
import { removeDbFiles, tmpDbPath } from "../testing/tmpDb.ts";

import { createDatabase } from "./schema.ts";
import { Store } from "./store.ts";
import type { NewConversation } from "./store.ts";

const TEMPLATE_PATH = join(import.meta.dir, "..", "..", "..", "vendor", "prd", "prd-template.json");
const paths: string[] = [];

afterEach(() => {
  for (const path of paths.splice(0)) removeDbFiles(path);
});

function openStore(): Store {
  const path = tmpDbPath();
  paths.push(path);
  const store = new Store(createDatabase(path));
  store.createProject(FIXTURE_PROJECT_KEY, { label: "Test", repoPath: "/tmp/repo", baseBranch: "main", commitTimeoutMs: 60_000, defaultAutoMerge: false, defaultAddScreenshots: false });
  initProjectRegistry(store);
  return store;
}

function loadTemplate(): PrdDocument {
  return prdDocumentSchema.parse(JSON.parse(readFileSync(TEMPLATE_PATH, "utf8")));
}

const NEW_CONVERSATION: NewConversation = {
  project: FIXTURE_PROJECT_KEY,
  title: "Recherches sauvegardées",
  orchestrator: "codex",
  model: null,
  effort: null,
  codexModel: "gpt-5.6-terra",
  codexEffort: "medium",
  codexFast: true,
  researchEnabled: true,
  researchOptions: { ...DEFAULT_RESEARCH_OPTIONS, externalDocs: false },
};

describe("Store atelier", () => {
  test("creates, lists and updates conversations", () => {
    const store = openStore();
    const conversation = store.createConversation(NEW_CONVERSATION);
    expect(conversation.status).toBe("exploring");
    expect(conversation.sessionStatus).toBe("idle");
    expect(conversation.codexFast).toBe(true);
    expect(conversation.researchOptions.externalDocs).toBe(false);
    expect(store.listConversations(FIXTURE_PROJECT_KEY).map((entry) => entry.id)).toEqual([conversation.id]);
    expect(store.listConversations("autre")).toEqual([]);
    const updated = store.updateConversation(conversation.id, { status: "prd_draft", sessionStatus: "running", sessionId: "thread-1" });
    expect(updated.status).toBe("prd_draft");
    expect(updated.sessionId).toBe("thread-1");
  });

  test("appends and edits messages in order", () => {
    const store = openStore();
    const conversation = store.createConversation(NEW_CONVERSATION);
    const first = store.addConversationMessage({ conversationId: conversation.id, role: "user", content: "Bonjour", turnId: null });
    const second = store.addConversationMessage({ conversationId: conversation.id, role: "assistant", content: "Sal", turnId: "turn-1" });
    store.updateConversationMessage(second.id, { content: "Salut" });
    const messages = store.listConversationMessages(conversation.id);
    expect(messages.map((message) => message.id)).toEqual([first.id, second.id]);
    expect(messages[1]?.content).toBe("Salut");
    expect(messages[1]?.turnId).toBe("turn-1");
  });

  test("increments PRD revisions and forces document.revision", () => {
    const store = openStore();
    const conversation = store.createConversation(NEW_CONVERSATION);
    const first = store.createPrdDocument({ conversationId: conversation.id, document: loadTemplate() });
    const second = store.createPrdDocument({ conversationId: conversation.id, document: { ...loadTemplate(), revision: "42" } });
    expect(first.revision).toBe(1);
    expect(second.revision).toBe(2);
    expect(second.document.revision).toBe("2");
    expect(second.status).toBe("draft");
    expect(second.annotations).toEqual([]);
    const annotated = store.updatePrdDocument(second.id, { annotations: [{ id: "a1", quote: "saved", comment: "précise" }], generalNote: "RAS", status: "validated" });
    expect(annotated.annotations).toHaveLength(1);
    expect(annotated.generalNote).toBe("RAS");
    expect(annotated.status).toBe("validated");
    expect(store.listPrdDocuments(conversation.id).map((prd) => prd.revision)).toEqual([1, 2]);
  });

  test("deletes a conversation with its messages and PRD documents", () => {
    const store = openStore();
    const conversation = store.createConversation(NEW_CONVERSATION);
    store.addConversationMessage({ conversationId: conversation.id, role: "user", content: "Bonjour", turnId: null });
    const prd = store.createPrdDocument({ conversationId: conversation.id, document: loadTemplate() });
    store.deleteConversation(conversation.id);
    expect(store.getConversation(conversation.id)).toBeNull();
    expect(store.listConversationMessages(conversation.id)).toEqual([]);
    expect(store.getPrdDocument(prd.id)).toBeNull();
  });

  test("persists the PRD origin of a ticket", () => {
    const store = openStore();
    const ticket = store.createTicket({ ...makeTicket(), childOrder: null, sourcePrdId: "prd-1", sourcePrdTask: "T1", prdMarkdown: "# T1" });
    expect(ticket.sourcePrdId).toBe("prd-1");
    expect(ticket.sourcePrdTask).toBe("T1");
    expect(ticket.prdMarkdown).toBe("# T1");
    expect(store.updateTicket(ticket.id, { sourcePrdTask: null }).sourcePrdTask).toBeNull();
  });
});
