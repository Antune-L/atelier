import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { ATELIER_SLOT_ID, ORCHESTRATORS } from "../../shared/constants.ts";
import { DEFAULT_RESEARCH_OPTIONS, prdDocumentSchema } from "../../shared/schemas.ts";
import type { Conversation, PrdDocument } from "../../shared/schemas.ts";
import { initProjectRegistry } from "../config.ts";
import { createDatabase } from "../db/schema.ts";
import { Store } from "../db/store.ts";
import type { NewConversation } from "../db/store.ts";
import { ClientHub } from "../hub.ts";
import type { AgentImageInput, AgentSendOptions, AgentSessionEvent, AgentSessionHandle, AgentSessionOptions } from "../system/agentSession.ts";
import { FakeSystemAdapter } from "../system/fake.ts";
import { FIXTURE_PROJECT_KEY } from "../testing/fixtures.ts";

import { AtelierBusyError, AtelierManager, COMPACT_NO_SESSION_MESSAGE, COMPACT_RUNNING_MESSAGE, describeToolUse } from "./atelierManager.ts";
import { atelierSessionKey, parseAtelierSessionKey } from "./sessionConfig.ts";
import { SessionHub, STEER_PREFIX } from "./sessionHub.ts";

const TEMPLATE_PATH = join(import.meta.dir, "..", "..", "..", "vendor", "prd", "prd-template.json");

class CapturingSystem extends FakeSystemAdapter {
  readonly sessions: AgentSessionOptions[] = [];
  readonly sent: string[][] = [];
  readonly images: AgentImageInput[][][] = [];
  readonly sendOptions: Array<AgentSendOptions | undefined> = [];
  compacts = 0;
  compactError: string | null = null;
  failSend = false;

  override startAgentSession(opts: AgentSessionOptions): AgentSessionHandle {
    this.sessions.push(opts);
    const sent: string[] = [];
    this.sent.push(sent);
    const sentImages: AgentImageInput[][] = [];
    this.images.push(sentImages);
    return {
      ticketId: opts.ticketId,
      send: (content, messageId = crypto.randomUUID(), images = [], options = undefined) => {
        if (this.failSend) throw new Error("transport fermé");
        sent.push(content);
        sentImages.push([...images]);
        this.sendOptions.push(options);
        return messageId;
      },
      compact: async () => {
        if (this.compactError) throw new Error(this.compactError);
        this.compacts += 1;
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
  codexModel: "gpt-6-sol",
  codexEffort: "medium",
};

const closers: Array<() => Promise<void>> = [];

afterEach(async () => {
  for (const close of closers.splice(0)) await close();
});

function setup(idleTimeoutMs?: number, uploadsRoot?: string, subagentCeilingMs?: number, steerGraceMs?: number) {
  const db = createDatabase(":memory:");
  const store = new Store(db);
  store.createProject(FIXTURE_PROJECT_KEY, { label: "Test", repoPath: "/tmp/repo", baseBranch: "main", commitTimeoutMs: 60_000, defaultAutoMerge: false, defaultAddScreenshots: false });
  initProjectRegistry(store);
  const system = new CapturingSystem();
  const hub = new ClientHub(store);
  const sessionHub = new SessionHub(system);
  const pushedConversations: Conversation[] = [];
  const pushConversation = hub.pushConversation.bind(hub);
  hub.pushConversation = (conversation) => {
    pushedConversations.push(conversation);
    pushConversation(conversation);
  };
  const manager = new AtelierManager({
    store,
    hub,
    sessionHub,
    system,
    uploadsRoot,
    flushIntervalMs: 0,
    ...(idleTimeoutMs !== undefined ? { idleTimeoutMs } : {}),
    ...(subagentCeilingMs !== undefined ? { subagentCeilingMs } : {}),
    ...(steerGraceMs !== undefined ? { steerGraceMs } : {}),
  });
  closers.push(async () => {
    manager.stop();
    sessionHub.disconnectAll();
    await sessionHub.drainClosingSessions();
    db.close();
  });
  return { store, system, sessionHub, manager, pushedConversations };
}

function loadTemplate(): PrdDocument {
  return prdDocumentSchema.parse(JSON.parse(readFileSync(TEMPLATE_PATH, "utf8")));
}

describe("AtelierManager", () => {
  for (const orchestrator of ORCHESTRATORS) {
    test(`${orchestrator} rehydrates sources and native images for later turns, consolidation and session restart`, async () => {
      const uploadsRoot = mkdtempSync(join(realpathSync(tmpdir()), "atelier-manager-uploads-"));
      const imagePath = join(uploadsRoot, "screen.png");
      const documentPath = join(uploadsRoot, "brief.md");
      writeFileSync(imagePath, Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==", "base64"));
      writeFileSync(documentPath, "Le jalon 2 conserve l'historique des recherches.");
      const { store, system, sessionHub, manager } = setup(undefined, uploadsRoot);
      closers.push(async () => rmSync(uploadsRoot, { recursive: true, force: true }));
      const conversation = store.createConversation({ ...CLAUDE_CONVERSATION, orchestrator });
      await manager.postMessage(conversation.id, "Analyse ce besoin ![Écran](/uploads/screen.png) [Cahier des charges](/uploads/brief.md)").delivered;
      expect(system.images[0]?.[0]?.[0]?.path).toBe(imagePath);
      expect(system.sent[0]?.[0]).toContain("Le jalon 2 conserve l'historique des recherches.");
      system.emit({ type: "init", sessionId: `${orchestrator}-source-thread` });
      system.emit(TURN_END);
      await manager.postMessage(conversation.id, "Explique le second jalon.").delivered;
      expect(system.images[0]?.[1]?.[0]?.path).toBe(imagePath);
      expect(system.sent[0]?.[1]).toContain("Le jalon 2 conserve l'historique des recherches.");
      expect(system.sent[0]?.[1]).not.toContain("Analyse ce besoin");
      system.emit(TURN_END);
      await manager.consolidate(conversation.id).delivered;
      expect(system.images[0]?.[2]?.[0]?.path).toBe(imagePath);
      expect(system.sent[0]?.[2]).toContain("Consolider en PRD");
      system.emit(TURN_END);
      sessionHub.disconnect(atelierSessionKey(conversation.id), "completed");
      await manager.postMessage(conversation.id, "Reprenons les sources.").delivered;
      expect(system.images[1]?.[0]?.[0]?.path).toBe(imagePath);
      expect(system.sent[1]?.[0]).toContain("## Historique de la conversation");
      expect(system.sent[1]?.[0]).toContain("Le jalon 2 conserve l'historique des recherches.");
    });
  }

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

  test("a mockup split across Claude text parts around a tool use is persisted intact", async () => {
    const { store, system, manager } = setup();
    const conversation = store.createConversation(CLAUDE_CONVERSATION);
    await manager.postMessage(conversation.id, "Fais une maquette").delivered;

    system.emit({ type: "assistant_text", text: '<mockup title="Liste"><html><body>' });
    system.emit({ type: "tool_use", name: "Read", input: { file_path: "src/x.css" } });
    system.emit({ type: "assistant_text", text: "<p>x</p></body></html></mockup>" });
    system.emit(TURN_END);

    const assistant = store.listConversationMessages(conversation.id).filter((entry) => entry.role === "assistant");
    const content = assistant.map((entry) => entry.content).join("");
    expect(content.replace(/\s+/g, "")).toContain('<mockuptitle="Liste"><html><body><p>x</p></body></html></mockup>');
  });

  test("a mockup streamed as Codex deltas is merged by item", async () => {
    const { store, system, manager } = setup();
    const conversation = store.createConversation(CODEX_CONVERSATION);
    await manager.postMessage(conversation.id, "Fais une maquette").delivered;

    system.emit({ type: "assistant_text", text: '<mockup title="Liste"><html>', stream: { itemId: "t1:i1", mode: "delta" } });
    system.emit({ type: "assistant_text", text: "<body>x</body></html></mockup>", stream: { itemId: "t1:i1", mode: "delta" } });
    system.emit(TURN_END);

    expect(store.listConversationMessages(conversation.id).at(-1)?.content).toBe('<mockup title="Liste"><html><body>x</body></html></mockup>');
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

  test("a main-agent activity seals the current text segment", async () => {
    const { store, system, manager } = setup();
    const conversation = store.createConversation(CLAUDE_CONVERSATION);
    const { message, delivered } = manager.postMessage(conversation.id, "Analyse.");
    await delivered;
    system.emit({ type: "assistant_text", text: "Je regarde." });
    system.emit({ type: "tool_use", name: "Read", input: { file_path: "src/x.ts" } });
    system.emit({ type: "assistant_text", text: "Réponse finale." });
    system.emit(TURN_END);

    const messages = store.listConversationMessages(conversation.id);
    expect(messages.map((entry) => [entry.role, entry.content])).toEqual([
      ["user", "Analyse."],
      ["assistant", "Je regarde."],
      ["activity", "Read src/x.ts"],
      ["assistant", "Réponse finale."],
    ]);
    expect(new Set(messages.map((entry) => entry.turnId))).toEqual(new Set([message.turnId]));
  });

  test("keeps an unsaved text segment when its flush fails before an activity", async () => {
    const { store, system, manager } = setup();
    const conversation = store.createConversation(CLAUDE_CONVERSATION);
    await manager.postMessage(conversation.id, "Analyse.").delivered;
    const addMessage = store.addConversationMessage.bind(store);
    let failNextAssistant = true;
    store.addConversationMessage = (input) => {
      if (failNextAssistant && input.role === "assistant") {
        failNextAssistant = false;
        throw new Error("disque plein");
      }
      return addMessage(input);
    };
    system.emit({ type: "assistant_text", text: "Je regarde." });
    system.emit({ type: "tool_use", name: "Read", input: { file_path: "src/x.ts" } });
    system.emit({ type: "assistant_text", text: "Réponse finale." });
    system.emit(TURN_END);

    expect(store.listConversationMessages(conversation.id).map((entry) => [entry.role, entry.content])).toEqual([
      ["user", "Analyse."],
      ["activity", "Read src/x.ts"],
      ["assistant", "Je regarde.\n\nRéponse finale."],
    ]);
  });

  test("a sub-agent activity does not split the main reply", async () => {
    const { store, system, manager } = setup();
    const conversation = store.createConversation(CLAUDE_CONVERSATION);
    await manager.postMessage(conversation.id, "Analyse.").delivered;
    const subagent = { id: "agent-1", label: "Explorer le dépôt · Explore" };
    system.emit({ type: "assistant_text", text: "Début." });
    system.emit({ type: "tool_use", name: "Read", input: { file_path: "src/a.ts" }, subagent });
    system.emit({ type: "assistant_text", text: "Fin." });
    system.emit(TURN_END);

    const assistant = store.listConversationMessages(conversation.id).filter((entry) => entry.role === "assistant");
    expect(assistant.map((entry) => entry.content)).toEqual(["Début.\n\nFin."]);
  });

  test("merges Codex deltas within their segment and opens a new message after an activity", async () => {
    const { store, system, manager } = setup();
    const conversation = store.createConversation(CODEX_CONVERSATION);
    await manager.postMessage(conversation.id, "Bonjour").delivered;
    system.emit({ type: "assistant_text", text: "Je ", stream: { itemId: "t1:i1", mode: "delta" } });
    system.emit({ type: "assistant_text", text: "cherche.", stream: { itemId: "t1:i1", mode: "delta" } });
    system.emit({ type: "tool_use", name: "Read", input: { file_path: "src/x.ts" } });
    system.emit({ type: "assistant_text", text: "Voi", stream: { itemId: "t1:i2", mode: "delta" } });
    system.emit({ type: "assistant_text", text: "là.", stream: { itemId: "t1:i2", mode: "delta" } });
    system.emit(TURN_END);

    expect(store.listConversationMessages(conversation.id).map((entry) => [entry.role, entry.content])).toEqual([
      ["user", "Bonjour"],
      ["assistant", "Je cherche."],
      ["activity", "Read src/x.ts"],
      ["assistant", "Voilà."],
    ]);
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
    expect(system.sent[1]?.[0]).toContain("## Historique de la conversation");
    expect(system.sent[1]?.[0]).toContain("Premier message");
    expect(system.sent[1]?.[0]?.endsWith("Retour")).toBe(true);
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

  test("marks the conversation unread when a turn ends but not on interrupt", async () => {
    const { store, system, manager } = setup();
    const conversation = store.createConversation(CLAUDE_CONVERSATION);
    await manager.postMessage(conversation.id, "Bonjour").delivered;
    await manager.interrupt(conversation.id);
    expect(store.getConversation(conversation.id)?.unread).toBe(false);

    await manager.postMessage(conversation.id, "Encore").delivered;
    system.emit(TURN_END);
    expect(store.getConversation(conversation.id)?.unread).toBe(true);
  });

  test("posting a message reopens a settled conversation", async () => {
    const { store, manager } = setup();
    const conversation = store.createConversation(CLAUDE_CONVERSATION);
    store.updateConversation(conversation.id, { settled: true });
    await manager.postMessage(conversation.id, "Bonjour").delivered;
    expect(store.getConversation(conversation.id)?.settled).toBe(false);
  });

  test("a turn end keeps a conversation settled", async () => {
    const { store, system, manager } = setup();
    const conversation = store.createConversation(CLAUDE_CONVERSATION);
    await manager.postMessage(conversation.id, "Bonjour").delivered;
    store.updateConversation(conversation.id, { settled: true });
    system.emit(TURN_END);
    expect(store.getConversation(conversation.id)?.settled).toBe(true);
  });

  test("notifies only once the orchestrator finishes after its background sub-agents", async () => {
    const { store, system, manager } = setup();
    const conversation = store.createConversation(CLAUDE_CONVERSATION);
    await manager.postMessage(conversation.id, "Bonjour").delivered;
    const state = () => {
      const current = store.getConversation(conversation.id);
      return [current?.sessionStatus, current?.unread];
    };

    system.emit({ type: "background_tasks", activeTaskIds: ["t1", "t2"] });
    system.emit({ type: "assistant_text", text: "Revue lancée." });
    system.emit(TURN_END);
    expect(state()).toEqual(["running", false]);

    system.emit({ type: "background_tasks", activeTaskIds: ["t2"] });
    system.emit({ type: "assistant_text", text: "Premier retour." });
    system.emit(TURN_END);
    expect(state()).toEqual(["running", false]);

    system.emit({ type: "background_tasks", activeTaskIds: [] });
    expect(state()).toEqual(["running", false]);
    system.emit({ type: "assistant_text", text: "final" });
    system.emit(TURN_END);
    expect(state()).toEqual(["idle", true]);
    expect(store.listConversationMessages(conversation.id).at(-1)?.content).toBe("final");
  });

  test("a failed turn notifies immediately even while sub-agents run", async () => {
    const { store, system, manager } = setup();
    const conversation = store.createConversation(CLAUDE_CONVERSATION);
    await manager.postMessage(conversation.id, "Bonjour").delivered;
    system.emit({ type: "background_tasks", activeTaskIds: ["t1"] });
    system.emit({ ...TURN_END, ok: false, subtype: "error_during_execution" });
    const updated = store.getConversation(conversation.id);
    expect(updated?.sessionStatus).toBe("idle");
    expect(updated?.unread).toBe(true);
  });

  test("ignores background tasks reported by a sub-agent source", async () => {
    const { store, system, manager } = setup();
    const conversation = store.createConversation(CLAUDE_CONVERSATION);
    await manager.postMessage(conversation.id, "Bonjour").delivered;
    system.emit({ type: "background_tasks", activeTaskIds: ["t1"], sourceId: "agent-1" });
    system.emit(TURN_END);
    const updated = store.getConversation(conversation.id);
    expect(updated?.sessionStatus).toBe("idle");
    expect(updated?.unread).toBe(true);
  });

  test("the idle close settles a conversation whose sub-agents ended without a final turn", async () => {
    const { store, system, sessionHub, manager } = setup(20);
    const conversation = store.createConversation(CLAUDE_CONVERSATION);
    await manager.postMessage(conversation.id, "Bonjour").delivered;
    system.emit({ type: "background_tasks", activeTaskIds: ["t1"] });
    system.emit(TURN_END);
    await Bun.sleep(40);
    // No idle close while a sub-agent still runs.
    expect(sessionHub.isConnected(atelierSessionKey(conversation.id))).toBe(true);
    expect(store.getConversation(conversation.id)?.sessionStatus).toBe("running");

    system.emit({ type: "background_tasks", activeTaskIds: [] });
    await Bun.sleep(40);
    const updated = store.getConversation(conversation.id);
    expect(updated?.sessionStatus).toBe("idle");
    expect(updated?.unread).toBe(true);
    expect(sessionHub.isConnected(atelierSessionKey(conversation.id))).toBe(false);
  });

  test("interrupting while sub-agents run re-arms the idle close", async () => {
    const { store, system, sessionHub, manager } = setup(20);
    const conversation = store.createConversation(CLAUDE_CONVERSATION);
    await manager.postMessage(conversation.id, "Bonjour").delivered;
    system.emit({ type: "background_tasks", activeTaskIds: ["t1"] });
    system.emit(TURN_END);

    await manager.interrupt(conversation.id);
    system.emit({ type: "background_tasks", activeTaskIds: [] });
    await Bun.sleep(40);
    expect(store.getConversation(conversation.id)?.sessionStatus).toBe("idle");
    expect(sessionHub.isConnected(atelierSessionKey(conversation.id))).toBe(false);
  });

  test("a new session forgets the background tasks of the failed one", async () => {
    const { store, system, manager } = setup();
    const conversation = store.createConversation(CLAUDE_CONVERSATION);
    await manager.postMessage(conversation.id, "Bonjour").delivered;
    system.emit({ type: "background_tasks", activeTaskIds: ["t1"] });
    system.emit({ type: "error", message: "processus claude mort" });
    store.updateConversation(conversation.id, { unread: false });

    await manager.postMessage(conversation.id, "Encore").delivered;
    expect(system.sessions.length).toBe(2);
    system.emit(TURN_END);
    const updated = store.getConversation(conversation.id);
    expect(updated?.sessionStatus).toBe("idle");
    expect(updated?.unread).toBe(true);
  });

  test.each([
    ["claude", CLAUDE_CONVERSATION],
    ["codex", CODEX_CONVERSATION],
  ] as const)("compacts the live %s session and summarizes the result", async (_provider, input) => {
    const { store, system, manager } = setup();
    const conversation = store.createConversation(input);
    await manager.postMessage(conversation.id, "Bonjour").delivered;
    expect(system.sessions[0]?.reportContextUsage).toBe(true);
    system.emit({ type: "assistant_text", text: "Salut" });
    system.emit({ type: "context_usage", usedTokens: 85_000, maxTokens: 200_000 });
    system.emit(TURN_END);
    expect(store.getConversation(conversation.id)).toMatchObject({ contextTokens: 85_000, contextWindow: 200_000 });

    const outcome = await manager.compact(conversation.id);
    expect(outcome.ok).toBe(true);
    expect(system.compacts).toBe(1);
    expect(store.getConversation(conversation.id)?.sessionStatus).toBe("running");
    expect(await manager.compact(conversation.id)).toMatchObject({ ok: false, reason: "conflict", message: COMPACT_RUNNING_MESSAGE });

    system.emit({ type: "assistant_text", text: "Résumé interne du compactage" });
    system.emit({ type: "context_usage", usedTokens: 12_000, maxTokens: 200_000 });
    system.emit(TURN_END);

    const messages = store.listConversationMessages(conversation.id).map((entry) => [entry.role, entry.content]);
    expect(messages.slice(-2)).toEqual([
      ["user", "Compacter le contexte"],
      ["assistant", "Contexte compacté : 85 000 → 12 000 tokens."],
    ]);
    expect(store.getConversation(conversation.id)).toMatchObject({ sessionStatus: "idle", contextTokens: 12_000 });
  });

  test("a failed compaction turn is reported without an empty bubble", async () => {
    const { store, system, manager } = setup();
    const conversation = store.createConversation(CODEX_CONVERSATION);
    await manager.postMessage(conversation.id, "Bonjour").delivered;
    system.emit(TURN_END);
    await manager.compact(conversation.id);
    system.emit({ ...TURN_END, ok: false, subtype: "failed" });
    expect(store.listConversationMessages(conversation.id).at(-1)?.content).toBe("Échec du compactage du contexte.");
    expect(store.getConversation(conversation.id)?.sessionStatus).toBe("idle");
  });

  test("a compaction that fails to start keeps the idle close armed", async () => {
    const { store, system, sessionHub, manager } = setup(20);
    const conversation = store.createConversation(CODEX_CONVERSATION);
    await manager.postMessage(conversation.id, "Bonjour").delivered;
    system.emit({ type: "context_usage", usedTokens: 40_000, maxTokens: 200_000 });
    system.emit(TURN_END);

    system.compactError = "rpc refusé";
    expect(await manager.compact(conversation.id)).toMatchObject({ ok: false, reason: "failed", message: "rpc refusé" });
    expect(store.getConversation(conversation.id)).toMatchObject({ sessionStatus: "idle", error: "rpc refusé" });

    const key = atelierSessionKey(conversation.id);
    for (let attempt = 0; attempt < 100 && sessionHub.isConnected(key); attempt += 1) await Bun.sleep(5);
    expect(sessionHub.isConnected(key)).toBe(false);
    expect(store.getConversation(conversation.id)).toMatchObject({ contextTokens: null, contextWindow: null });
  });

  test("refuses to compact without a live session and clears the context when it closes", async () => {
    const { store, system, manager } = setup();
    const conversation = store.createConversation(CLAUDE_CONVERSATION);
    expect(await manager.compact("inconnue")).toMatchObject({ ok: false, reason: "not_found" });
    expect(await manager.compact(conversation.id)).toMatchObject({ ok: false, reason: "conflict", message: COMPACT_NO_SESSION_MESSAGE });

    await manager.postMessage(conversation.id, "Bonjour").delivered;
    system.emit({ type: "context_usage", usedTokens: 30_000, maxTokens: null });
    system.emit(TURN_END);
    expect(store.getConversation(conversation.id)).toMatchObject({ contextTokens: 30_000, contextWindow: null });

    manager.settingsChanged(conversation.id);
    expect(store.getConversation(conversation.id)).toMatchObject({ contextTokens: null, contextWindow: null });
    expect(await manager.compact(conversation.id)).toMatchObject({ ok: false, reason: "conflict" });

    await manager.postMessage(conversation.id, "Encore").delivered;
    system.emit({ type: "context_usage", usedTokens: 1_000, maxTokens: 200_000 });
    system.emit({ type: "error", message: "processus claude mort" });
    expect(store.getConversation(conversation.id)).toMatchObject({ contextTokens: null, contextWindow: null });

    store.updateConversation(conversation.id, { contextTokens: 5, contextWindow: 10, sessionStatus: "running" });
    manager.recoverStale();
    expect(store.getConversation(conversation.id)).toMatchObject({ contextTokens: null, contextWindow: null, sessionStatus: "idle" });
  });

  describe("sub-agents", () => {
    const SUBAGENT = { id: "agent-1", label: "Explorer le dépôt · Explore" };
    const STARTED: AgentSessionEvent = { type: "subagent_lifecycle", phase: "started", ...SUBAGENT };
    const ENDED: AgentSessionEvent = { type: "subagent_lifecycle", phase: "ended", ...SUBAGENT, status: "completed" };

    test.each([...ORCHESTRATORS])("%s sub-agent lines after the main turn keep the conversation idle", async (orchestrator) => {
      const { store, system, manager } = setup();
      const conversation = store.createConversation({ ...(orchestrator === "codex" ? CODEX_CONVERSATION : CLAUDE_CONVERSATION) });
      const { message, delivered } = manager.postMessage(conversation.id, "Bonjour");
      await delivered;
      system.emit({ type: "assistant_text", text: "Réponse principale." });
      system.emit(TURN_END);
      expect(store.getConversation(conversation.id)?.sessionStatus).toBe("idle");

      system.emit({ type: "tool_use", name: "Read", input: { file_path: "src/a.ts" }, subagent: SUBAGENT });
      system.emit({ type: "progress", kind: "subagent", message: "Analyse en cours", subagent: SUBAGENT });
      system.emit({ type: "assistant_text", text: "Texte du sous-agent", subagent: SUBAGENT });
      system.emit({ type: "assistant_text", text: "Texte sourcé", sourceId: "agent-1" });

      const messages = store.listConversationMessages(conversation.id);
      expect(messages.map((entry) => [entry.role, entry.content, entry.agentId, entry.agentLabel])).toEqual([
        ["user", "Bonjour", null, null],
        ["assistant", "Réponse principale.", null, null],
        ["activity", "Read src/a.ts", SUBAGENT.id, SUBAGENT.label],
        ["activity", "Analyse en cours", SUBAGENT.id, SUBAGENT.label],
      ]);
      expect(messages.at(-1)?.turnId).toBe(message.turnId);
      expect(store.getConversation(conversation.id)?.sessionStatus).toBe("idle");
    });

    test("lifecycle events maintain and push the active list", async () => {
      const { store, system, manager, pushedConversations } = setup();
      const conversation = store.createConversation(CLAUDE_CONVERSATION);
      await manager.postMessage(conversation.id, "Bonjour").delivered;
      system.emit(STARTED);
      system.emit({ ...STARTED, id: "agent-2", label: "Relire · Plan" });
      system.emit({ ...STARTED, label: "Renommé · Explore" });
      expect(store.getConversation(conversation.id)?.activeSubagents.map((entry) => [entry.id, entry.label])).toEqual([
        ["agent-1", "Renommé · Explore"],
        ["agent-2", "Relire · Plan"],
      ]);
      expect(pushedConversations.at(-1)?.activeSubagents.length).toBe(2);

      system.emit(ENDED);
      expect(store.getConversation(conversation.id)?.activeSubagents.map((entry) => entry.id)).toEqual(["agent-2"]);
      expect(pushedConversations.at(-1)?.activeSubagents.map((entry) => entry.id)).toEqual(["agent-2"]);
    });

    test.each(["failure", "interrupt", "close", "settingsChanged"] as const)("%s clears the active list", async (trigger) => {
      const { store, system, manager } = setup();
      const conversation = store.createConversation(CLAUDE_CONVERSATION);
      await manager.postMessage(conversation.id, "Bonjour").delivered;
      system.emit(STARTED);
      expect(store.getConversation(conversation.id)?.activeSubagents.length).toBe(1);
      if (trigger === "failure") system.emit({ type: "error", message: "processus mort" });
      else if (trigger === "interrupt") await manager.interrupt(conversation.id);
      else if (trigger === "close") manager.close(conversation.id);
      else manager.settingsChanged(conversation.id);
      expect(store.getConversation(conversation.id)?.activeSubagents).toEqual([]);
    });

    test("recoverStale clears the active list of an idle conversation", () => {
      const { store, manager } = setup();
      const conversation = store.createConversation(CLAUDE_CONVERSATION);
      store.updateConversation(conversation.id, { activeSubagents: [{ id: "agent-1", label: "x", startedAt: 1 }] });
      expect(store.getConversation(conversation.id)?.sessionStatus).toBe("idle");
      manager.recoverStale();
      expect(store.getConversation(conversation.id)?.activeSubagents).toEqual([]);
    });

    test("the idle close waits for the last active sub-agent", async () => {
      const { store, system, sessionHub, manager } = setup(20);
      const conversation = store.createConversation(CLAUDE_CONVERSATION);
      await manager.postMessage(conversation.id, "Bonjour").delivered;
      const key = atelierSessionKey(conversation.id);
      system.emit(STARTED);
      system.emit(TURN_END);
      await Bun.sleep(40);
      expect(sessionHub.isConnected(key)).toBe(true);
      expect(store.getConversation(conversation.id)?.sessionStatus).toBe("idle");

      system.emit(ENDED);
      for (let attempt = 0; attempt < 100 && sessionHub.isConnected(key); attempt += 1) await Bun.sleep(5);
      expect(sessionHub.isConnected(key)).toBe(false);
    });

    test("the ceiling closes the session and clears the active list", async () => {
      const { store, system, sessionHub, manager } = setup(10_000, undefined, 30);
      const conversation = store.createConversation(CLAUDE_CONVERSATION);
      await manager.postMessage(conversation.id, "Bonjour").delivered;
      const key = atelierSessionKey(conversation.id);
      system.emit(STARTED);
      system.emit({ type: "context_usage", usedTokens: 1_000, maxTokens: 200_000 });
      system.emit(TURN_END);
      for (let attempt = 0; attempt < 100 && sessionHub.isConnected(key); attempt += 1) await Bun.sleep(5);
      expect(sessionHub.isConnected(key)).toBe(false);
      expect(store.getConversation(conversation.id)).toMatchObject({ activeSubagents: [], sessionStatus: "idle", contextTokens: null });
    });
  });

  describe("steering", () => {
    const delta = (text: string, itemId: string): AgentSessionEvent => ({ type: "assistant_text", text, stream: { itemId, mode: "delta" } });

    async function running(steerGraceMs?: number, idleTimeoutMs?: number) {
      const context = setup(idleTimeoutMs, undefined, undefined, steerGraceMs);
      const conversation = context.store.createConversation(CODEX_CONVERSATION);
      const first = context.manager.postMessage(conversation.id, "Bonjour");
      await first.delivered;
      return { ...context, conversation, first: first.message };
    }
    const rows = (context: { store: Store }, conversationId: string) =>
      context.store.listConversationMessages(conversationId).map((entry) => [entry.role, entry.content, entry.turnId, entry.steering]);

    test("keeps fragments of the current item in place and opens the steer's bubble on the next item", async () => {
      const context = await running();
      const { store, system, conversation, first } = context;
      system.emit(delta("Début", "i1"));
      const steer = context.manager.postMessage(conversation.id, "Plutôt X");
      await steer.delivered;
      expect(steer.message.steering).toBe("pending");
      expect(steer.message.content).toBe("Plutôt X");
      expect(system.sent[0]?.at(-1)).toBe(`${STEER_PREFIX}Plutôt X`);
      expect(system.sendOptions.at(-1)).toEqual({ steer: true });
      expect(store.getConversation(conversation.id)?.sessionStatus).toBe("running");

      system.emit(delta(" suite", "i1"));
      system.emit(delta("Réponse à X", "i2"));
      system.emit(TURN_END);
      expect(rows(context, conversation.id)).toEqual([
        ["user", "Bonjour", first.turnId, null],
        ["assistant", "Début suite", first.turnId, null],
        ["user", "Plutôt X", steer.message.turnId, "pending"],
        ["assistant", "Réponse à X", steer.message.turnId, null],
      ]);
    });

    test("creates no empty bubble when nothing new follows the steer, and stays running at the turn end", async () => {
      const context = await running(10_000);
      const { store, system, conversation } = context;
      system.emit(delta("Début", "i1"));
      await context.manager.postMessage(conversation.id, "Plutôt X").delivered;
      system.emit(TURN_END);
      expect(store.listConversationMessages(conversation.id).map((entry) => entry.role)).toEqual(["user", "assistant", "user"]);
      expect(store.getConversation(conversation.id)?.sessionStatus).toBe("running");
    });

    test("an expired grace window marks the steers absorbed and idles", async () => {
      const context = await running(10);
      const { store, system, conversation } = context;
      const steer = context.manager.postMessage(conversation.id, "Plutôt X");
      await steer.delivered;
      system.emit(TURN_END);
      await Bun.sleep(30);
      expect(store.listConversationMessages(conversation.id).find((entry) => entry.id === steer.message.id)?.steering).toBe("steered");
      expect(store.getConversation(conversation.id)).toMatchObject({ sessionStatus: "idle", unread: true });
    });

    test("output after the turn end marks the steers queued under the last steer, then idles at the next turn end", async () => {
      const context = await running(10_000);
      const { store, system, conversation } = context;
      const one = context.manager.postMessage(conversation.id, "Un");
      const two = context.manager.postMessage(conversation.id, "Deux");
      await two.delivered;
      expect(system.sent[0]?.slice(-2)).toEqual([`${STEER_PREFIX}Un`, `${STEER_PREFIX}Deux`]);
      system.emit(TURN_END);
      system.emit({ type: "assistant_text", text: "Suite donnée" });
      await Bun.sleep(5);
      const messages = store.listConversationMessages(conversation.id);
      expect(messages.filter((entry) => entry.steering !== null).map((entry) => [entry.id, entry.steering])).toEqual([
        [one.message.id, "queued"],
        [two.message.id, "queued"],
      ]);
      expect(messages.at(-1)).toMatchObject({ role: "assistant", content: "Suite donnée", turnId: two.message.turnId });
      expect(store.getConversation(conversation.id)?.sessionStatus).toBe("running");
      system.emit(TURN_END);
      expect(store.getConversation(conversation.id)?.sessionStatus).toBe("idle");
    });

    test("a steer sent after the turn end settles the earlier steers as absorbed", async () => {
      const context = await running(10_000);
      const { store, system, conversation } = context;
      const one = context.manager.postMessage(conversation.id, "Un");
      await one.delivered;
      system.emit(TURN_END);
      const two = context.manager.postMessage(conversation.id, "Deux");
      await two.delivered;
      system.emit({ type: "assistant_text", text: "Réponse à Deux" });
      await Bun.sleep(5);
      const messages = store.listConversationMessages(conversation.id);
      expect(messages.filter((entry) => entry.steering !== null).map((entry) => [entry.id, entry.steering])).toEqual([
        [one.message.id, "steered"],
        [two.message.id, "queued"],
      ]);
      expect(messages.at(-1)).toMatchObject({ role: "assistant", content: "Réponse à Deux", turnId: two.message.turnId });
      system.emit(TURN_END);
      expect(store.getConversation(conversation.id)?.sessionStatus).toBe("idle");
    });

    test("restarting output clears the idle close", async () => {
      const { store, system, sessionHub, manager: atelier } = setup(20);
      const conversation = store.createConversation(CODEX_CONVERSATION);
      await atelier.postMessage(conversation.id, "Bonjour").delivered;
      system.emit(TURN_END);
      system.emit({ type: "assistant_text", text: "Encore" });
      expect(store.getConversation(conversation.id)?.sessionStatus).toBe("running");
      await Bun.sleep(40);
      expect(sessionHub.isConnected(atelierSessionKey(conversation.id))).toBe(true);
    });

    test("a steer that cannot be sent during a turn leaves an activity line and keeps the turn running", async () => {
      const context = await running();
      const { store, system, conversation } = context;
      system.failSend = true;
      const steer = context.manager.postMessage(conversation.id, "Plutôt X");
      await steer.delivered;
      const messages = store.listConversationMessages(conversation.id);
      expect(messages.find((entry) => entry.id === steer.message.id)?.steering).toBe("failed");
      expect(messages.at(-1)).toMatchObject({ role: "activity", turnId: steer.message.turnId });
      expect(messages.at(-1)?.content.startsWith("Message non transmis : ")).toBe(true);
      expect(store.getConversation(conversation.id)).toMatchObject({ sessionStatus: "running", error: null });
      system.emit(TURN_END);
      expect(store.getConversation(conversation.id)?.sessionStatus).toBe("idle");
    });

    test("a regular message that cannot be sent still reports an error", async () => {
      const { store, system, manager: atelier } = setup();
      const conversation = store.createConversation(CODEX_CONVERSATION);
      await atelier.postMessage(conversation.id, "Bonjour").delivered;
      system.emit(TURN_END);
      system.failSend = true;
      await atelier.postMessage(conversation.id, "Suite").delivered;
      expect(store.getConversation(conversation.id)?.sessionStatus).toBe("error");
    });

    test.each([
      ["interrupt", "interrompu"],
      ["settingsChanged", "réglages modifiés"],
      ["failure", "session en échec"],
    ] as const)("%s abandons the pending steers with one activity line", async (trigger, reason) => {
      const context = await running();
      const { store, system, conversation } = context;
      const one = context.manager.postMessage(conversation.id, "Un");
      const two = context.manager.postMessage(conversation.id, "Deux");
      await two.delivered;
      if (trigger === "interrupt") await context.manager.interrupt(conversation.id);
      else if (trigger === "settingsChanged") context.manager.settingsChanged(conversation.id);
      else system.emit({ type: "error", message: "processus mort" });
      const messages = store.listConversationMessages(conversation.id);
      expect([one.message.id, two.message.id].map((id) => messages.find((entry) => entry.id === id)?.steering)).toEqual(["abandoned", "abandoned"]);
      const lines = messages.filter((entry) => entry.content.startsWith("Aiguillage non traité"));
      expect(lines).toEqual([expect.objectContaining({ role: "activity", content: `Aiguillage non traité : ${reason}`, turnId: two.message.turnId })]);
      expect(store.getConversation(conversation.id)?.sessionStatus).not.toBe("running");
    });

    test("consolidation and regeneration are refused while a turn runs", async () => {
      const context = await running();
      const { store, conversation } = context;
      const before = store.listConversationMessages(conversation.id).length;
      expect(() => context.manager.consolidate(conversation.id)).toThrow(AtelierBusyError);
      const record = store.createPrdDocument({ conversationId: conversation.id, document: loadTemplate() });
      expect(() => context.manager.regenerate(record.id)).toThrow(AtelierBusyError);
      expect(store.listConversationMessages(conversation.id).length).toBe(before);
    });

    test("recoverStale abandons the steers left pending by a running conversation", () => {
      const { store, manager: atelier } = setup();
      const conversation = store.createConversation(CODEX_CONVERSATION);
      const steer = store.addConversationMessage({ conversationId: conversation.id, role: "user", content: "X", turnId: "t1", steering: "pending" });
      store.updateConversation(conversation.id, { sessionStatus: "running" });
      atelier.recoverStale();
      const messages = store.listConversationMessages(conversation.id);
      expect(messages.find((entry) => entry.id === steer.id)?.steering).toBe("abandoned");
      expect(messages.at(-1)).toMatchObject({ role: "activity", content: "Aiguillage non traité : redémarrage du backend", turnId: "t1" });
      expect(store.getConversation(conversation.id)?.sessionStatus).toBe("idle");
    });
  });

  test("session keys round-trip and tool traces stay one line", () => {
    expect(parseAtelierSessionKey(atelierSessionKey("abc"))).toBe("abc");
    expect(parseAtelierSessionKey("ticket-1")).toBeNull();
    expect(describeToolUse("command_execution", { command: "rg foo\nsrc" })).toBe("command_execution rg foo src");
    expect(describeToolUse("Glob", null)).toBe("Glob");
  });
});
