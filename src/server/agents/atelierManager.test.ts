import { afterEach, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { ATELIER_SLOT_ID } from "../../shared/constants.ts";
import { DEFAULT_RESEARCH_OPTIONS, prdDocumentSchema } from "../../shared/schemas.ts";
import type { PrdDocument } from "../../shared/schemas.ts";
import { initProjectRegistry } from "../config.ts";
import { createDatabase } from "../db/schema.ts";
import { Store } from "../db/store.ts";
import type { NewConversation } from "../db/store.ts";
import { ClientHub } from "../hub.ts";
import type { AgentSessionEvent, AgentSessionHandle, AgentSessionOptions } from "../system/agentSession.ts";
import { FakeSystemAdapter } from "../system/fake.ts";
import { FIXTURE_PROJECT_KEY } from "../testing/fixtures.ts";

import { AtelierManager, describeToolUse } from "./atelierManager.ts";
import { atelierSessionKey, parseAtelierSessionKey } from "./sessionConfig.ts";
import { SessionHub } from "./sessionHub.ts";

const TEMPLATE_PATH = join(import.meta.dir, "..", "..", "..", "vendor", "prd", "prd-template.json");

class CapturingSystem extends FakeSystemAdapter {
  readonly sessions: AgentSessionOptions[] = [];
  readonly sent: string[][] = [];

  override startAgentSession(opts: AgentSessionOptions): AgentSessionHandle {
    this.sessions.push(opts);
    const sent: string[] = [];
    this.sent.push(sent);
    return {
      ticketId: opts.ticketId,
      send: (content, messageId = crypto.randomUUID()) => {
        sent.push(content);
        return messageId;
      },
      interrupt: async () => undefined,
      close: async () => undefined,
    };
  }

  emit(event: AgentSessionEvent, index = this.sessions.length - 1): void {
    const session = this.sessions[index];
    if (!session) throw new Error("aucune session");
    session.onEvent(event);
  }
}

const TURN_END: AgentSessionEvent = { type: "turn_end", ok: true, subtype: "success", sessionId: "thread-1", usageByModel: {} };

const CLAUDE_CONVERSATION: NewConversation = {
  project: FIXTURE_PROJECT_KEY,
  title: "Recherches sauvegardées",
  orchestrator: "claude",
  model: "sonnet",
  effort: "low",
  codexModel: null,
  codexEffort: null,
  codexFast: false,
  researchEnabled: true,
  researchOptions: DEFAULT_RESEARCH_OPTIONS,
};

const CODEX_CONVERSATION: NewConversation = {
  ...CLAUDE_CONVERSATION,
  orchestrator: "codex",
  model: null,
  effort: null,
  codexModel: "gpt-5.6-terra",
  codexEffort: "medium",
};

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
  const manager = new AtelierManager({ store, hub, sessionHub, system, flushIntervalMs: 0 });
  closers.push(async () => {
    manager.stop();
    sessionHub.disconnectAll();
    await sessionHub.drainClosingSessions();
    db.close();
  });
  return { store, system, sessionHub, manager };
}

function loadTemplate(): PrdDocument {
  return prdDocumentSchema.parse(JSON.parse(readFileSync(TEMPLATE_PATH, "utf8")));
}

describe("AtelierManager", () => {
  test("persists the user message, starts a read-only session and captures the Claude reply", async () => {
    const { store, system, manager } = setup();
    const conversation = store.createConversation(CLAUDE_CONVERSATION);

    const { message, delivered } = manager.postMessage(conversation.id, "Je veux sauvegarder des recherches.");
    await delivered;

    expect(message.role).toBe("user");
    expect(store.getConversation(conversation.id)?.sessionStatus).toBe("running");
    const session = system.sessions[0];
    expect(session?.ticketId).toBe(atelierSessionKey(conversation.id));
    expect(session?.slotId).toBe(ATELIER_SLOT_ID);
    expect(session?.role).toBe("atelier");
    expect(session?.allowedTools).toContain("WebSearch");
    expect(session?.disallowedTools).toContain("Edit");
    const firstTurn = system.sent[0]?.[0] ?? "";
    expect(firstTurn).toContain("### Réflexion préalable");
    expect(firstTurn).toContain("submit_prd_document");
    expect(firstTurn.endsWith("Je veux sauvegarder des recherches.")).toBe(true);

    system.emit({ type: "init", sessionId: "claude-session" });
    system.emit({ type: "tool_use", name: "Read", input: { file_path: "src/x.ts" } });
    system.emit({ type: "assistant_text", text: "Premier bloc." });
    system.emit({ type: "assistant_text", text: "Second bloc." });
    system.emit(TURN_END);

    const messages = store.listConversationMessages(conversation.id);
    expect(messages.map((entry) => [entry.role, entry.content])).toEqual([
      ["user", "Je veux sauvegarder des recherches."],
      ["activity", "Read src/x.ts"],
      ["assistant", "Premier bloc.\n\nSecond bloc."],
    ]);
    expect(new Set(messages.map((entry) => entry.turnId))).toEqual(new Set([message.turnId]));
    const updated = store.getConversation(conversation.id);
    expect(updated?.sessionStatus).toBe("idle");
    expect(updated?.sessionId).toBe("claude-session");
  });

  test("merges Codex deltas by item and sends later turns as raw chat", async () => {
    const { store, system, manager } = setup();
    const conversation = store.createConversation(CODEX_CONVERSATION);
    await manager.postMessage(conversation.id, "Bonjour").delivered;
    expect(system.sessions[0]?.provider).toBe("codex");
    expect(system.sessions[0]?.readOnly).toBe(true);

    system.emit({ type: "assistant_text", text: "Bon", stream: { itemId: "t1:i1", mode: "delta" } });
    system.emit({ type: "assistant_text", text: "jour", stream: { itemId: "t1:i1", mode: "delta" } });
    system.emit({ type: "assistant_text", text: "Bonjour !", stream: { itemId: "t1:i1", mode: "snapshot" } });
    system.emit(TURN_END);
    expect(store.listConversationMessages(conversation.id).at(-1)?.content).toBe("Bonjour !");

    await manager.postMessage(conversation.id, "Suite").delivered;
    expect(system.sessions.length).toBe(1);
    expect(system.sent[0]?.[1]).toBe("Suite");
  });

  test("relaunches with the history after a settings change and resumes nothing", async () => {
    const { store, system, manager } = setup();
    const conversation = store.createConversation(CODEX_CONVERSATION);
    await manager.postMessage(conversation.id, "Premier message").delivered;
    system.emit({ type: "init", sessionId: "thread-1" });
    system.emit({ type: "assistant_text", text: "Première réponse" });
    system.emit(TURN_END);

    manager.settingsChanged(conversation.id);
    expect(store.getConversation(conversation.id)?.sessionId).toBeNull();

    await manager.postMessage(conversation.id, "Deuxième message").delivered;
    expect(system.sessions.length).toBe(2);
    expect(system.sessions[1]?.resumeSessionId).toBeUndefined();
    const relaunch = system.sent[1]?.[0] ?? "";
    expect(relaunch).toContain("## Historique de la conversation");
    expect(relaunch).toContain("Première réponse");
    expect(relaunch.endsWith("Deuxième message")).toBe(true);
  });

  test("resumes the Codex thread after an idle close", async () => {
    const { store, system, sessionHub, manager } = setup();
    const conversation = store.createConversation(CODEX_CONVERSATION);
    await manager.postMessage(conversation.id, "Premier message").delivered;
    system.emit({ type: "init", sessionId: "thread-1" });
    system.emit(TURN_END);
    sessionHub.disconnect(atelierSessionKey(conversation.id), "completed");

    await manager.postMessage(conversation.id, "Retour").delivered;
    expect(system.sessions[1]?.resumeSessionId).toBe("thread-1");
    expect(system.sent[1]).toEqual(["Retour"]);
  });

  test("stores each submitted PRD as the next revision", () => {
    const { store, manager } = setup();
    const conversation = store.createConversation(CLAUDE_CONVERSATION);
    const document = loadTemplate();

    expect(manager.handleSubmitPrd(conversation.id, document)).toContain("PRD révision 1 enregistré");
    expect(manager.handleSubmitPrd(conversation.id, { ...document, revision: "7" })).toContain("PRD révision 2 enregistré");

    const revisions = store.listPrdDocuments(conversation.id);
    expect(revisions.map((record) => [record.revision, record.document.revision])).toEqual([[1, "1"], [2, "2"]]);
    expect(store.getConversation(conversation.id)?.status).toBe("prd_draft");
  });

  test("surfaces a session failure as a conversation error", async () => {
    const { store, system, manager } = setup();
    const conversation = store.createConversation(CLAUDE_CONVERSATION);
    await manager.postMessage(conversation.id, "Bonjour").delivered;
    system.emit({ type: "error", message: "processus claude mort" });
    const updated = store.getConversation(conversation.id);
    expect(updated?.sessionStatus).toBe("error");
    expect(updated?.error).toBe("processus claude mort");
  });

  test("session keys round-trip and tool traces stay one line", () => {
    expect(parseAtelierSessionKey(atelierSessionKey("abc"))).toBe("abc");
    expect(parseAtelierSessionKey("ticket-1")).toBeNull();
    expect(describeToolUse("command_execution", { command: "rg foo\nsrc" })).toBe("command_execution rg foo src");
    expect(describeToolUse("Glob", null)).toBe("Glob");
  });
});
